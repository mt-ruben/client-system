from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError

from rest_framework import serializers


class UserRoleField(serializers.Field):

    def to_representation(self, value):
        return 'administrador' if value else 'responsable'

    def to_internal_value(self, data):

        roles = {
            'administrador': True,
            'responsable': False,
        }

        if data not in roles:
            raise serializers.ValidationError(
                'El rol debe ser administrador o responsable.'
            )

        return roles[data]


class UsuarioSerializer(serializers.ModelSerializer):

    rol = UserRoleField(source='is_staff')

    password = serializers.CharField(
        write_only=True,
        required=False,
        trim_whitespace=False
    )

    class Meta:
        model = User

        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'rol',
            'is_active',
            'password',
        ]

        read_only_fields = [
            'id',
            'is_active',
        ]

    def validate(self, attrs):

        password = attrs.get('password')

        if self.instance is None:

            if not password:
                raise serializers.ValidationError({
                    'password': 'La contraseña es obligatoria.'
                })

            try:
                validate_password(password)

            except DjangoValidationError as error:
                raise serializers.ValidationError({
                    'password': error.messages
                })

        elif password is not None:

            raise serializers.ValidationError({
                'password':
                'La contraseña se gestiona mediante una operación específica.'
            })

        # Evitar que se desactive el último administrador activo.
        if (
            self.instance
            and self.instance.is_active
            and self.instance.is_staff
            and attrs.get('is_staff') is False
        ):

            administradores_activos = User.objects.filter(
                is_staff=True,
                is_active=True,
                is_superuser=False
            ).count()

            if administradores_activos <= 1:
                raise serializers.ValidationError({
                    'rol':
                    'No se puede cambiar el rol del último administrador activo.'
                })

        return attrs

    def create(self, validated_data):

        password = validated_data.pop('password', None)

        return User.objects.create_user(
            password=password,
            is_superuser=False,
            is_active=True,
            **validated_data
        )


class CambiarPasswordSerializer(serializers.Serializer):
    """Serializer para cambiar la contraseña del usuario autenticado."""

    contraseña_actual = serializers.CharField(
        required=True,
        trim_whitespace=False,
        write_only=True,
        style={'input_type': 'password'},
    )
    contraseña_nueva = serializers.CharField(
        required=True,
        trim_whitespace=False,
        write_only=True,
        style={'input_type': 'password'},
    )
    confirmar_contraseña = serializers.CharField(
        required=True,
        trim_whitespace=False,
        write_only=True,
        style={'input_type': 'password'},
    )

    def validate_contraseña_actual(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError(
                'La contraseña actual no es correcta.'
            )
        return value

    def validate_contraseña_nueva(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as error:
            raise serializers.ValidationError(error.messages)

        contraseña_actual = self.initial_data.get('contraseña_actual')
        if value == contraseña_actual:
            raise serializers.ValidationError(
                'La nueva contraseña no puede ser igual a la actual.'
            )
        return value

    def validate_confirmar_contraseña(self, value):
        contraseña_nueva = self.initial_data.get('contraseña_nueva')
        if value != contraseña_nueva:
            raise serializers.ValidationError(
                'Las contraseñas nuevas no coinciden.'
            )
        return value