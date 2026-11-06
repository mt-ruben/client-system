from .models import Cliente,Producto
from django.db.models import ProtectedError
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter, OpenApiTypes
from rest_framework.permissions import DjangoModelPermissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.generics import ListCreateAPIView
from .models import Cliente,Pedido
from .serializers import CambiarEstadoPedidoSerializer,ProductoActualizarSerializer,ProductoDetalleSerializer,ProductoListaSerializer,ClienteSerializer,PedidoSerializer,ProductoSerializer,ProductoCrearSerializer,ErrorResponseSerializer,ProductoListaPaginadaSerializer,PedidoListaPaginadaSerializer,ClienteListaPaginadaSerializer
from rest_framework.filters import OrderingFilter
from rest_framework.filters import SearchFilter
from .pagination import ClientePagination
from rest_framework.viewsets import ModelViewSet

from rest_framework.decorators import action
from rest_framework.generics import (
    ListCreateAPIView,
    RetrieveUpdateDestroyAPIView
)

from django_filters.rest_framework import DjangoFilterBackend
from .filters import ProductoFilter
from .permissions import IsStaffUser
from .filters import PedidoFilter
from rest_framework.exceptions import ValidationError
from rest_framework.generics import GenericAPIView
from rest_framework.mixins import (
    ListModelMixin,
    CreateModelMixin,
    RetrieveModelMixin,
    UpdateModelMixin,
    DestroyModelMixin
)
from .services import cancelar_pedido
from rest_framework.filters import OrderingFilter
@extend_schema_view(

    retrieve=extend_schema(
        summary="Consultar cliente",
        description="Obtiene la información de un cliente específico mediante su ID.",
        responses={
            200: ClienteSerializer,
            401: ErrorResponseSerializer,
            404: ErrorResponseSerializer,
        },
    ),

    list=extend_schema(
        summary="Listar clientes",
        description="Obtiene la lista paginada de clientes registrados.",
        responses={
            200: ClienteSerializer(many=True),
            401: ErrorResponseSerializer,
        },
    ),

    create=extend_schema(
        summary="Crear cliente",
        description="Crea un nuevo cliente. El sistema valida que el email sea válido y no esté registrado previamente, y valida los datos del teléfono y el estado del cliente.",
        responses={
            201: ClienteSerializer,
            400: OpenApiTypes.OBJECT,
            401: ErrorResponseSerializer,
            403: ErrorResponseSerializer,
        },
    ),

    update=extend_schema(
        summary="Actualizar cliente",
        description="Actualiza completamente los datos de un cliente existente.",
        responses={
            200: ClienteSerializer,
            400: OpenApiTypes.OBJECT,
            401: ErrorResponseSerializer,
            403: ErrorResponseSerializer,
            404: ErrorResponseSerializer,
        },
    ),

    partial_update=extend_schema(
        summary="Actualizar parcialmente cliente",
        description="Actualiza uno o varios datos de un cliente existente sin necesidad de enviar todos sus campos.",
        responses={
            200: ClienteSerializer,
            400: OpenApiTypes.OBJECT,
            401: ErrorResponseSerializer,
            403: ErrorResponseSerializer,
            404: ErrorResponseSerializer,
        },
    ),

    destroy=extend_schema(
        summary="Eliminar cliente",
        description="Elimina definitivamente un cliente existente mediante su ID.",
        responses={
            204: None,
            401: ErrorResponseSerializer,
            403: ErrorResponseSerializer,
            404: ErrorResponseSerializer,
        },
    ),
)

class ClienteViewSet(ModelViewSet):

    queryset = Cliente.objects.all()

    serializer_class = ClienteSerializer
    pagination_class = ClientePagination

    filter_backends = [
        SearchFilter,
        DjangoFilterBackend,
        OrderingFilter,
    ]

    search_fields = [
        'nombre',
        'empresa',
        'email',
    ]

    filterset_fields = [
        'estado',
    ]

    ordering_fields = [
        'nombre',
        'empresa',
        'email',
        'fecha_registro',
    ]

    ordering = ['id']
    def get_permissions(self):

        if self.action in [
            'create',
            'update',
            'partial_update',
            'destroy'
        ]:
            return [IsStaffUser()]

        return [IsAuthenticated()]
    @extend_schema(
        summary="Consultar pedidos de un cliente",
        description="Obtiene la lista paginada de pedidos asociados a un cliente específico. Permite realizar búsquedas por descripción y ordenar los resultados.",

        parameters=[
            OpenApiParameter(
                name="search",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                required=False,
                description="Filtra los pedidos utilizando una búsqueda parcial en la descripción."
            ),

            OpenApiParameter(
                name="ordering",
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                required=False,
                description="Campo utilizado para ordenar los pedidos. Puede utilizarse '-' para orden descendente."
            ),

            OpenApiParameter(
                name="page",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                required=False,
                description="Número de página que se desea consultar."
            ),

            OpenApiParameter(
                name="page_size",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                required=False,
                description="Cantidad de pedidos por página. Máximo permitido: 50."
            ),
        ],

        responses={
            200: PedidoListaPaginadaSerializer,
            401: ErrorResponseSerializer,
            404: ErrorResponseSerializer,
        },
    )
    @action(
        detail=True,
        methods=['get'],
        url_path='pedidos'
    )
    def pedidos(self, request, pk=None):

        cliente = self.get_object()

        pedidos = cliente.pedidos.all()

        # Búsqueda
        search = request.query_params.get('search')

        if search:
            pedidos = pedidos.filter(
                descripcion__icontains=search
            )

        # Ordenamiento
        ordering = request.query_params.get('ordering')

        if ordering:
            pedidos = pedidos.order_by(ordering)

        # Paginación
        paginator = ClientePagination()

        pagina = paginator.paginate_queryset(
            pedidos,
            request
        )

        serializer = PedidoSerializer(
            pagina,
            many=True
        )

        return paginator.get_paginated_response(
            serializer.data
        )
    

    
class ClienteDetalleGenericoAPIView(RetrieveUpdateDestroyAPIView):

    queryset = Cliente.objects.all()

    serializer_class = ClienteSerializer

    permission_classes = [IsAuthenticated]


from .services import (
    cancelar_pedido,
    cambiar_estado_pedido
)

@extend_schema_view(
    list=extend_schema(
        summary="Listar pedidos",
        description="Obtiene la lista paginada de pedidos registrados.",
        responses={
            200: PedidoSerializer(many=True),
            401: ErrorResponseSerializer,
        },
),
retrieve=extend_schema(
    summary="Consultar pedido",
    description="Obtiene la información detallada de un pedido específico mediante su ID.",
    responses={
        200: PedidoSerializer,
        401: ErrorResponseSerializer,
        404: ErrorResponseSerializer,
    },
),
create=extend_schema(
    summary="Crear pedido",
    description="Crea un nuevo pedido. El sistema valida el cliente, los productos y el stock disponible, calcula los subtotales y el total, y descuenta automáticamente el stock.",
    responses={
        201: PedidoSerializer,
        400: OpenApiTypes.OBJECT,
        401: ErrorResponseSerializer,
        403: ErrorResponseSerializer,
    },
),
update=extend_schema(
    summary="Actualizar pedido",
    description="Actualiza completamente un pedido, incluyendo sus productos y cantidades. El sistema restaura el stock anterior, valida los nuevos productos y cantidades, recalcula los subtotales y el total, y ajusta el stock disponible. Requiere permisos de usuario staff.",
    responses={
        200: PedidoSerializer,
        400: OpenApiTypes.OBJECT,
        401: ErrorResponseSerializer,
        403: ErrorResponseSerializer,
        404: ErrorResponseSerializer,
    },
),
partial_update=extend_schema(
    summary="Actualizar parcialmente un pedido",
    description="Actualiza parcialmente un pedido, permitiendo modificar sus datos, productos y cantidades. El sistema valida los nuevos datos, ajusta el stock y recalcula los subtotales y el total. Requiere permisos de usuario staff.",
    responses={
        200: PedidoSerializer,
        400: OpenApiTypes.OBJECT,
        401: ErrorResponseSerializer,
        403: ErrorResponseSerializer,
        404: ErrorResponseSerializer,
    },
),
destroy=extend_schema(
    summary="Eliminar pedido",
    description="Los pedidos no pueden eliminarse. Para mantener la trazabilidad del pedido, se debe utilizar la opción de cancelar el pedido.",
    responses={
        405: ErrorResponseSerializer,
        401: ErrorResponseSerializer,
        403: ErrorResponseSerializer,
        404: ErrorResponseSerializer,
    },
),
cancelar=extend_schema(
    summary="Cancelar pedido",
    description="Cancela un pedido y restaura automáticamente el stock de los productos asociados. Requiere permisos de usuario staff.",
    responses={
        200: PedidoSerializer,
        400: ErrorResponseSerializer,
        401: ErrorResponseSerializer,
        403: ErrorResponseSerializer,
        404: ErrorResponseSerializer,
    },
),
cambiar_estado=extend_schema(
    summary="Cambiar estado del pedido",
    description="Cambia el estado de un pedido de acuerdo con las transiciones permitidas por el sistema. Requiere permisos de usuario staff.",
    responses={
        200: PedidoSerializer,
        400: OpenApiTypes.OBJECT,
        401: ErrorResponseSerializer,
        403: ErrorResponseSerializer,
        404: ErrorResponseSerializer,
    },
),
activos=extend_schema(
    summary="Listar pedidos activos",
    description=(
        "Obtiene los pedidos que no se encuentran cancelados. "
        "Permite filtrar por cliente, estado, total y fecha, "
        "además de ordenar los resultados."
    ),
    parameters=[
        OpenApiParameter(
            name='cliente',
            type=OpenApiTypes.INT,
            location=OpenApiParameter.QUERY,
            description='ID del cliente.'
        ),
        OpenApiParameter(
            name='estado',
            type=OpenApiTypes.STR,
            location=OpenApiParameter.QUERY,
            description='Estado del pedido.'
        ),
        OpenApiParameter(
            name='total',
            type=OpenApiTypes.NUMBER,
            location=OpenApiParameter.QUERY,
            description='Total exacto del pedido.'
        ),
        OpenApiParameter(
            name='total__gte',
            type=OpenApiTypes.NUMBER,
            location=OpenApiParameter.QUERY,
            description='Total mínimo.'
        ),
        OpenApiParameter(
            name='total__lte',
            type=OpenApiTypes.NUMBER,
            location=OpenApiParameter.QUERY,
            description='Total máximo.'
        ),
        OpenApiParameter(
            name='fecha',
            type=OpenApiTypes.DATE,
            location=OpenApiParameter.QUERY,
            description='Fecha exacta.'
        ),
        OpenApiParameter(
            name='fecha__gte',
            type=OpenApiTypes.DATE,
            location=OpenApiParameter.QUERY,
            description='Fecha inicial.'
        ),
        OpenApiParameter(
            name='fecha__lte',
            type=OpenApiTypes.DATE,
            location=OpenApiParameter.QUERY,
            description='Fecha final.'
        ),
        OpenApiParameter(
            name='ordering',
            type=OpenApiTypes.STR,
            location=OpenApiParameter.QUERY,
            description='Ordenar por total o fecha. Use - para descendente.'
        ),
    ],
    responses={
        200: PedidoSerializer(many=True),
        401: ErrorResponseSerializer,
    },
),
)
class PedidoViewSet(ModelViewSet):

    queryset = (
        Pedido.objects
        .select_related('cliente')
        .prefetch_related(
            'detalles__producto'
        )
    )

    serializer_class = PedidoSerializer
    pagination_class = ClientePagination

    filter_backends = [
        DjangoFilterBackend,
        OrderingFilter,
    ]

    filterset_class = PedidoFilter

    ordering_fields = [
        'total',
        'fecha',
    ]

    ordering = ['id']

    def get_permissions(self):
        if self.action in [
            'create',
            'update',
            'partial_update',
            'destroy',
            'cancelar',
            'cambiar_estado',
        ]:
            return [
                IsAuthenticated(),
                IsStaffUser()
            ]

        return [IsAuthenticated()]
        
    def get_queryset(self):
        return super().get_queryset()
  
    @action(detail=True, methods=['post'])
    def cancelar(self, request, pk=None):
        pedido = self.get_object()
        pedido = cancelar_pedido(pedido)
        serializer = self.get_serializer(pedido)
        return Response(serializer.data)
    @action(
        detail=False,
        methods=['get']
    )
    def activos(self, request):

        queryset = self.get_queryset().exclude(
            estado='cancelado'
        )

        queryset = self.filter_queryset(queryset)

        page = self.paginate_queryset(queryset)

        if page is not None:
            serializer = self.get_serializer(
                page,
                many=True
            )

            return self.get_paginated_response(
                serializer.data
            )

        serializer = self.get_serializer(
            queryset,
            many=True
        )

        return Response(serializer.data)
    @action(detail=True, methods=['post'])
    def cambiar_estado(self, request, pk=None):
        pedido = self.get_object()

        serializer = CambiarEstadoPedidoSerializer(
            data=request.data
        )

        serializer.is_valid(raise_exception=True)

        nuevo_estado = serializer.validated_data['estado']

        pedido = cambiar_estado_pedido(
            pedido,
            nuevo_estado
        )

        serializer_respuesta = self.get_serializer(pedido)

        return Response(serializer_respuesta.data)
    def destroy(self, request, *args, **kwargs):
            return Response(
                {
                    'detail':
                    'Los pedidos no pueden eliminarse. '
                    'Utilice la opción de cancelar el pedido.'
                },
                status=405
            )
@extend_schema_view(
    retrieve=extend_schema(
        summary="Consultar producto",
        description="Obtiene la información de un producto específico mediante su ID.",
        responses={
            200: ProductoDetalleSerializer,
            401: ErrorResponseSerializer,
            404: ErrorResponseSerializer,
        },
    ),

    list=extend_schema(
        summary="Listar productos",
        description="Obtiene la lista paginada de productos.",
        responses={
            200: ProductoListaPaginadaSerializer,
            401: ErrorResponseSerializer,
        },
    ),
    activos=extend_schema(
        summary="Listar productos activos",
        description="Obtiene la lista paginada de productos que se encuentran activos.",
        responses={
            200: ProductoListaPaginadaSerializer,
            401: ErrorResponseSerializer,
        },
    ),
    activar=extend_schema(
    summary="Activar producto",
    description="Activa un producto que se encuentra inactivo. Requiere permisos de usuario staff.",
    responses={
        200: ProductoDetalleSerializer,
        400: ErrorResponseSerializer,
        401: ErrorResponseSerializer,
        403: ErrorResponseSerializer,
        404: ErrorResponseSerializer,
    },
),
desactivar=extend_schema(
    summary="Desactivar producto",
    description="Desactiva un producto que se encuentra activo. Requiere permisos de usuario staff.",
    responses={
        200: ProductoDetalleSerializer,
        400: ErrorResponseSerializer,
        401: ErrorResponseSerializer,
        403: ErrorResponseSerializer,
        404: ErrorResponseSerializer,
    },
),
    create=extend_schema(
        summary="Crear producto",
        description="Crea un nuevo producto. Esta operación requiere permisos de usuario staff.",
        responses={
            201: ProductoCrearSerializer,
            400: ErrorResponseSerializer,
            401: ErrorResponseSerializer,
            403: ErrorResponseSerializer,
        },
    ),
      update=extend_schema(
        summary="Actualizar producto",
        description="Actualiza completamente los datos permitidos de un producto. Requiere permisos de usuario staff.",
        responses={
            200: ProductoActualizarSerializer,
            400: ErrorResponseSerializer,
            401: ErrorResponseSerializer,
            403: ErrorResponseSerializer,
            404: ErrorResponseSerializer,
        },
    ),

    partial_update=extend_schema(
        summary="Actualizar parcialmente un producto",
        description="Actualiza uno o varios datos permitidos de un producto. Requiere permisos de usuario staff.",
        responses={
            200: ProductoActualizarSerializer,
            400: ErrorResponseSerializer,
            401: ErrorResponseSerializer,
            403: ErrorResponseSerializer,
            404: ErrorResponseSerializer,
        },
    ),
    destroy=extend_schema(
    summary="Eliminar producto",
    description="Elimina un producto. Requiere permisos de usuario staff.",
    responses={
        204: None,
        400: ErrorResponseSerializer,
        401: ErrorResponseSerializer,
        403: ErrorResponseSerializer,
        404: ErrorResponseSerializer,
    },
),

)

class ProductoViewSet(ModelViewSet):

    queryset = Producto.objects.all()
    serializer_class = ProductoSerializer
    filter_backends = [
        DjangoFilterBackend,
        OrderingFilter,
    ]

    filterset_class = ProductoFilter
    ordering_fields = [
        'nombre',
        'precio',
        'stock',
    ]

    ordering = ['id']
    def get_permissions(self):

        if self.action in [
            'create',
            'update',
            'partial_update',
            'destroy',
            'activar',
            'desactivar',
        ]:
            return [
                IsAuthenticated(),
                IsStaffUser()
            ]

        return [
            IsAuthenticated()
        ]
    def get_serializer_class(self):

        if self.action in ['list', 'activos']:
            return ProductoListaSerializer

        if self.action == 'retrieve':
            return ProductoDetalleSerializer

        if self.action == 'create':
            return ProductoCrearSerializer

        if self.action in ['update', 'partial_update']:
            return ProductoActualizarSerializer

        return ProductoSerializer
    def get_queryset(self):

        queryset = Producto.objects.all()


        ordering = self.request.query_params.get('ordering')


        if ordering:

            campos_permitidos = [
                'nombre',
                'precio',
                'stock',
                '-nombre',
                '-precio',
                '-stock'
            ]

            if ordering not in campos_permitidos:
                raise ValidationError({
                    'ordering': 'El campo de ordenamiento no es válido.'
                })

            queryset = queryset.order_by(ordering)

        return queryset
    @action(
        detail=False,
        methods=['get']
    )
    def activos(self, request):

        queryset = self.get_queryset().filter(
            estado=True
        )

        queryset = self.filter_queryset(queryset)

        page = self.paginate_queryset(queryset)

        if page is not None:
            serializer = self.get_serializer(
                page,
                many=True
            )

            return self.get_paginated_response(
                serializer.data
            )

        serializer = self.get_serializer(
            queryset,
            many=True
        )

        return Response(serializer.data)

    @action(
        detail=True,
        methods=['post'],
        permission_classes=[IsAuthenticated, IsStaffUser]
    )
    def activar(self, request, pk=None):

        producto = self.get_object()

        if producto.estado:
            return Response(
                {
                    'detail': 'El producto ya está activo.'
                },
                status=400
            )

        producto.estado = True
        producto.save(update_fields=['estado'])

        serializer = self.get_serializer(producto)

        return Response(serializer.data)
    @action(
        detail=True,
        methods=['post'],
        permission_classes=[IsAuthenticated, IsStaffUser]
    )
    def desactivar(self, request, pk=None):

        producto = self.get_object()

        if not producto.estado:
            return Response(
                {
                    'detail': 'El producto ya está inactivo.'
                },
                status=400
            )

        producto.estado = False
        producto.save(update_fields=['estado'])

        serializer = self.get_serializer(producto)

        return Response(serializer.data)
    def destroy(self, request, *args, **kwargs):
        producto = self.get_object()

        try:
            producto.delete()

        except ProtectedError:
            return Response(
                {
                    'detail':
                    'No se puede eliminar el producto porque '
                    'está asociado a uno o más pedidos.'
                },
                status=400
            )

        return Response(
            status=204
    )
from rest_framework.generics import GenericAPIView
from rest_framework.mixins import (
    ListModelMixin,
    CreateModelMixin
)
