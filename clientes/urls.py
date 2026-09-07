from django.urls import path
from .views import ListaClientes,RegistrarClientes,EditarCliente,EliminarCliente,ClienteAPIView,ClienteDetalleAPIView,ClienteDetalleGenericoAPIView,ClienteGenericoAPIView,ClienteViewSet,ProductoListaAPIView,ProductoDetalleAPIView,ProductoActualizarAPIView,ProductoEliminarAPIView,ProductoListaCrearAPIView
from rest_framework.routers import DefaultRouter
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from .views import (
    ClienteViewSet,
    PedidoViewSet,
    ProductoViewSet
)


router = DefaultRouter()

router.register(
    'clientes',
    ClienteViewSet,
    basename='cliente'
)
router.register(
    'pedidos',
    PedidoViewSet,
    basename='pedido'
)


router.register(
    'productos',
    ProductoViewSet,
    basename='producto'
)
urlpatterns = [
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),   
    path('cliente_list/', ListaClientes.as_view(), name='cliente_list'),
    path('crear/', RegistrarClientes.as_view(), name='crear_cliente'),
    path('editar/<int:pk>', EditarCliente.as_view(), name='editar_cliente'),
    path('eliminar/<int:pk>', EliminarCliente.as_view(), name='eliminar_cliente'),

    path('api/clientes/',ClienteGenericoAPIView.as_view(), name='clientes' ),

    
    path(
        'api/clientes/<int:pk>/',
        ClienteDetalleGenericoAPIView.as_view(),
        name='cliente-detalle'
),

path(
    'productos-prueba/',
    ProductoListaAPIView.as_view()
),
path(
    'productos-prueba/<int:pk>/',
    ProductoDetalleAPIView.as_view()
),
path(
    'productos-prueba/<int:pk>/editar/',
    ProductoActualizarAPIView.as_view()
),
path(
    'productos-prueba/<int:pk>/eliminar/',
    ProductoEliminarAPIView.as_view()
),
path(
    'productos-prueba/',
    ProductoListaCrearAPIView.as_view()
),

path(
    'productos-prueba/<int:pk>/',
    ProductoDetalleAPIView.as_view()
),
    ]
urlpatterns += router.urls