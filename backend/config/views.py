from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status, serializers
from rest_framework.exceptions import ValidationError
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from drf_spectacular.utils import extend_schema
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from django.contrib.auth.models import User
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django.conf import settings
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework_simplejwt.exceptions import TokenError
from config.token_utils import obtener_huella_password
import secrets

class LoginSerializer(TokenObtainPairSerializer):

    def validate(self, attrs):
        data = super().validate(attrs)

        if not self.user.is_active:
            raise serializers.ValidationError({
                'detail': 'El usuario está desactivado. No puede iniciar sesión.'
            })

        huella = obtener_huella_password(self.user)

        refresh = RefreshToken(data['refresh'])
        refresh['password_version'] = huella

        data['refresh'] = str(refresh)
        data['access'] = str(refresh.access_token)

        return data


class CustomTokenRefreshSerializer(TokenRefreshSerializer):

    def validate(self, attrs):
        try:
            refresh = RefreshToken(attrs['refresh'])
            user_id = refresh.payload.get('user_id')
            user = User.objects.get(pk=user_id)

        except (TokenError, User.DoesNotExist):
            raise serializers.ValidationError({
                'detail': 'La sesión de renovación no es válida.'
            })

        if not user.is_active:
            raise serializers.ValidationError({
                'detail': 'El usuario está desactivado. No puede renovar la sesión.'
            })

        version_token = refresh.get('password_version')
        huella_actual = obtener_huella_password(user)

        if (
            not version_token
            or not secrets.compare_digest(
                str(version_token),
                huella_actual
            )
        ):
            raise serializers.ValidationError({
                'detail': 'La sesión no es válida. Inicia sesión nuevamente.'
            })

        return super().validate(attrs)


class LoginResponseSerializer(serializers.Serializer):
    access = serializers.CharField()

class LogoutResponseSerializer(serializers.Serializer):
    mensaje = serializers.CharField()

class CSRFCookieResponseSerializer(serializers.Serializer):
    mensaje = serializers.CharField()
class LogoutErrorSerializer(serializers.Serializer):
    error = serializers.CharField()

@method_decorator(csrf_protect, name="dispatch")
class LogoutAPIView(APIView):

    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Cerrar sesión",
        description="Invalida el refresh token y elimina la cookie de sesión.",
        request=None,
        responses={
            205: LogoutResponseSerializer,
            400: LogoutErrorSerializer,
        },
    )
    def post(self, request):

        refresh_token = request.COOKIES.get("refresh_token")

        if not refresh_token:
            return Response(
                {"error": "No existe una sesión activa."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()

        except TokenError:
            response = Response(
                {"error": "Refresh Token inválido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

            response.delete_cookie(
                key="refresh_token",
                path="/api/",
                samesite="Lax",
            )

            return response

        response = Response(
            {"mensaje": "Sesión cerrada correctamente."},
            status=status.HTTP_205_RESET_CONTENT,
        )

        response.delete_cookie(
            key="refresh_token",
            path="/api/",
            samesite="Lax",
        )

        return response

class LoginAPIView(APIView):

    permission_classes = [AllowAny]

    @extend_schema(
        summary="Iniciar sesión",
        description="Autentica al usuario y devuelve el access token. El refresh token se almacena en una cookie HttpOnly.",
        request=LoginSerializer,
        responses={
            200: LoginResponseSerializer,
        },
    )
    def post(self, request):

        serializer = LoginSerializer(data=request.data)

        serializer.is_valid(raise_exception=True)

        access_token = serializer.validated_data["access"]
        refresh_token = serializer.validated_data["refresh"]

        response = Response(
            {
                "access": access_token,
            },
            status=status.HTTP_200_OK,
        )

        response.set_cookie(
            key="refresh_token",
            value=refresh_token,
            httponly=True,
            secure=settings.SECURE_COOKIES,
            samesite="Lax",
            path="/api/",
            max_age=60 * 60 * 24 * 7,
        )

        return response

@method_decorator(csrf_protect, name="dispatch")
class RefreshTokenAPIView(APIView):

    permission_classes = [AllowAny]

    @extend_schema(
        summary="Renovar access token",
        description="Utiliza el refresh token almacenado en una cookie HttpOnly para generar un nuevo access token.",
        request=None,
        responses={
            200: LoginResponseSerializer,
        },
    )
    def post(self, request):

        refresh_token = request.COOKIES.get("refresh_token")

        if not refresh_token:
            return Response(
                {"detail": "No existe una sesión de renovación."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        serializer = CustomTokenRefreshSerializer(
            data={"refresh": refresh_token}
        )

        try:
            serializer.is_valid(raise_exception=True)

        except ValidationError:
            response = Response(
                {"detail": "La sesión ha expirado o no es válida. Inicia sesión nuevamente."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

            response.delete_cookie(
                key="refresh_token",
                path="/api/",
                samesite="Lax",
            )

            return response

        access_token = serializer.validated_data["access"]

        response = Response(
            {
                "access": access_token,
            },
            status=status.HTTP_200_OK,
        )

        # Si SimpleJWT rota el refresh, actualizamos la cookie.
        nuevo_refresh = serializer.validated_data.get("refresh")

        if nuevo_refresh:
            response.set_cookie(
                key="refresh_token",
                value=nuevo_refresh,
                httponly=True,
                secure=settings.SECURE_COOKIES,
                samesite="Lax",
                path="/api/",
                max_age=60 * 60 * 24 * 7,
            )

        return response

@method_decorator(ensure_csrf_cookie, name="dispatch")
class CSRFCookieAPIView(APIView):

    permission_classes = [AllowAny]
    @extend_schema(
        responses=CSRFCookieResponseSerializer
    )
    def get(self, request):
        return Response(
            {"mensaje": "Cookie CSRF configurada."},
            status=status.HTTP_200_OK,
        )