from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.tokens import RefreshToken
from drf_spectacular.utils import extend_schema
from rest_framework import serializers

class LogoutResponseSerializer(serializers.Serializer):
    mensaje = serializers.CharField()


class LogoutErrorSerializer(serializers.Serializer):
    error = serializers.CharField()
class LogoutAPIView(APIView):

    permission_classes = [IsAuthenticated]
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Cerrar sesión",
        description="Invalida el Refresh Token del usuario y finaliza su sesión.",
        request=None,
        responses={
            205: LogoutResponseSerializer,
            400: LogoutErrorSerializer,
            
        },
    )
    def post(self, request):

        try:

            refresh_token = request.data["refresh"]

            token = RefreshToken(refresh_token)

            token.blacklist()

            return Response(
                {
                    "mensaje":
                    "Sesión cerrada correctamente."
                },
                status=status.HTTP_205_RESET_CONTENT
            )

        except Exception:

            return Response(
                {
                    "error":
                    "Refresh Token inválido."
                },
                status=status.HTTP_400_BAD_REQUEST
            )