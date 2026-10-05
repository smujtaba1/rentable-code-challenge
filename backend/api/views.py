import csv
from decimal import Decimal

from django.db.models import Case, DecimalField, F, Sum, Value, When
from django.db.models.functions import Coalesce
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils.text import slugify
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from api.models import Tenant, Transaction
from api.serializers import TenantSerializer, TransactionSerializer

# Create your views here.

# What the tenant owes: charges add, payments subtract, each keeping its own
# sign so a returned payment increases the balance. Coalesce covers a tenant
# with no transactions, where SUM would otherwise be NULL.
BALANCE = Coalesce(
    Sum(
        Case(
            When(transactions__type='charge', then=F('transactions__amount')),
            default=-F('transactions__amount'),
            output_field=DecimalField(max_digits=12, decimal_places=2),
        )
    ),
    Value(Decimal('0.00')),
    output_field=DecimalField(max_digits=12, decimal_places=2),
)

@api_view(['GET'])
def welcome_message(request):
    """
    A simple view to test the API.
    """
    return Response({'message': 'Welcome to the Rentable Code Challenge!'})

@api_view(['GET'])
def tenant_list(request):
    """
    Returns a list of all tenants with their balances.
    """
    # Annotated so all balances come back in one query rather than one
    # aggregate per tenant.
    tenants = Tenant.objects.annotate(balance=BALANCE)
    serializer = TenantSerializer(tenants, many=True)
    return Response(serializer.data)

@api_view(['GET'])
def tenant_transactions(request, tenant_id):
    """
    Returns one tenant's ledger, oldest first.
    """
    # 404s on an unknown tenant, so that reads differently from a real tenant
    # whose ledger happens to be empty.
    tenant = get_object_or_404(Tenant, pk=tenant_id)
    serializer = TransactionSerializer(tenant.transactions.all(), many=True)
    return Response(serializer.data) 

# Deliberately not an @api_view: this returns a file, not a representation to
# be content-negotiated, and DRF's renderer machinery only gets in the way.
def tenant_transactions_csv(request, tenant_id):
    """
    Returns one tenant's ledger as CSV, matching the columns on screen.
    """
    tenant = get_object_or_404(Tenant, pk=tenant_id)

    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = (
        f'attachment; filename="ledger-{slugify(tenant.name)}.csv"'
    )

    writer = csv.writer(response)
    writer.writerow(['Date', 'Description', 'Type', 'Amount', 'Balance'])

    running = Decimal('0.00')
    for entry in tenant.transactions.all():
        # The signed effect, so the Amount column sums to the balance in a
        # spreadsheet. Written as bare decimals, not formatted currency, or
        # Excel reads them as text.
        effect = (
            entry.amount
            if entry.type == Transaction.Type.CHARGE
            else -entry.amount
        )
        running += effect
        writer.writerow([
            entry.date, entry.description, entry.type, effect, running,
        ])

    return response
