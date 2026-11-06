from django.contrib import admin
from clientes.models import Producto,Pedido,Cliente,DetallePedido
# Register your models here.
admin.site.register(Producto)
admin.site.register(DetallePedido)
admin.site.register(Cliente)
admin.site.register(Pedido)