from django.urls import path
from .views import tenant_list, tenant_transactions, tenant_transactions_csv

urlpatterns = [
    path('tenants/', tenant_list, name='tenant_list'),
    path(
        'tenants/<int:tenant_id>/transactions/',
        tenant_transactions,
        name='tenant_transactions',
    ),
    path(
        'tenants/<int:tenant_id>/transactions/csv/',
        tenant_transactions_csv,
        name='tenant_transactions_csv',
    ),
]
