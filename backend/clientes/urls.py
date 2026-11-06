from django.urls import path
from rest_framework.routers import DefaultRouter
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from .views import (
    ClienteDetalleGenericoAPIView,
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
    path(
        'api/clientes/<int:pk>/',
        ClienteDetalleGenericoAPIView.as_view(),
        name='cliente-detalle'
),
    ]
urlpatterns += router.urls