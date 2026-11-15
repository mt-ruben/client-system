from django.contrib.auth.models import User

from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework_simplejwt.tokens import RefreshToken

from clientes.permissions import IsStaffUser

from .serializers import UsuarioSerializer, CambiarPasswordSerializer
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework_simplejwt.token_blacklist.models import (
    OutstandingToken,
    BlacklistedToken,
)
class UsuarioPagination(PageNumberPagination):
    page_size = 5
    page_size_query_param = 'page_size'
    max_page_size = 50

class UsuarioViewSet(ModelViewSet):
    serializer_class = UsuarioSerializer
    permission_classes = [IsAuthenticated, IsStaffUser]
    queryset = User.objects.filter(
        is_superuser=False
    ).order_by('username')
    pagination_class = UsuarioPagination
    filter_backends = [
        DjangoFilterBackend,
        SearchFilter,
        OrderingFilter,
    ]
    filterset_fields = ['is_active']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering_fields = ['username', 'email', 'is_active', 'is_staff']
    ordering = ['username']

    http_method_names = [
        'get', 'post', 'put', 'patch', 'head', 'options'
    ]
    
    @action(detail=True, methods=['post'])
    def desactivar(self, request, pk=None):
        with transaction.atomic():
            administradores_activos = list(
                User.objects.select_for_update().filter(
                    is_staff=True,
                    is_active=True,
                    is_superuser=False
                ).order_by('pk').values_list('pk', flat=True)
            )

            usuario = self.get_object()

            if usuario.pk == request.user.pk:
                return Response(
                    {'detail': 'No puedes desactivar tu propia cuenta.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if usuario.is_active and usuario.is_staff:
                if len(administradores_activos) <= 1:
                    return Response(
                        {'detail': 'No se puede desactivar al último administrador activo.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            usuario.is_active = False
            usuario.save(update_fields=['is_active'])

        return Response(
            {'detail': 'Usuario desactivado correctamente.'},
            status=status.HTTP_200_OK
        )


    @action(detail=True, methods=['post'])
    def activar(self, request, pk=None):
        usuario = self.get_object()

        if usuario.is_active:
            return Response(
                {'detail': 'El usuario ya se encuentra activo.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        usuario.is_active = True
        usuario.save(update_fields=['is_active'])

        return Response(
            {'detail': 'Usuario activado correctamente.'},
            status=status.HTTP_200_OK
        )


    @action(
        detail=False,
        methods=['post'],
        permission_classes=[IsAuthenticated]
    )
    def cambiar_password(self, request):
        serializer = CambiarPasswordSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)

        user = request.user

        with transaction.atomic():

            # Invalidar todos los refresh tokens registrados del usuario.
            tokens = OutstandingToken.objects.filter(user=user)

            for token in tokens:
                BlacklistedToken.objects.get_or_create(token=token)

            # Guardar la nueva contraseña utilizando el hash de Django.
            user.set_password(
                serializer.validated_data['contraseña_nueva']
            )
            user.save(update_fields=['password'])

        response = Response(
            {
                'detail': (
                    'Contraseña cambiada correctamente. '
                    'Inicia sesión nuevamente.'
                )
            },
            status=status.HTTP_200_OK
        )

        # Eliminar la cookie de renovación de la sesión actual.
        response.delete_cookie(
            'refresh_token',
            path='/api/',
            samesite='Lax'
        )

        return response
