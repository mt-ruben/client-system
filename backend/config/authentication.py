
import secrets

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed

from config.token_utils import obtener_huella_password


class ActiveJWTAuthentication(JWTAuthentication):
    """Rechaza usuarios desactivados y tokens anteriores al cambio de contraseña."""

    def get_user(self, validated_token):
        user = super().get_user(validated_token)

        if not user.is_active:
            raise AuthenticationFailed(
                'Usuario desactivado. No tiene acceso al sistema.',
                code='user_inactive',
            )

        version_token = validated_token.get('password_version')

        huella_actual = obtener_huella_password(user)

        if (
            not version_token
            or not secrets.compare_digest(
                str(version_token),
                huella_actual
            )
        ):
            raise AuthenticationFailed(
                'La sesión no es válida. Inicia sesión nuevamente.',
                code='password_changed',
            )

        return user
