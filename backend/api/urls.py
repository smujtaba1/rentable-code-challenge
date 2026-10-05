from django.urls import path
from .views import tenant_list, tenant_transactions

urlpatterns = [
    path('tenants/', tenant_list, name='tenant_list'),
    path(
        'tenants/<int:tenant_id>/transactions/',
        tenant_transactions,
        name='tenant_transactions',
    ),
]
