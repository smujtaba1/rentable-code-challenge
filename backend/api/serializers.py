from rest_framework import serializers
from api.models import Tenant, Transaction

class TenantSerializer(serializers.ModelSerializer):
    # Declared explicitly because '__all__' covers model fields only, and this
    # is a queryset annotation. Wider than the 10 digits of a single amount,
    # since a balance sums many of them.
    balance = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Tenant
        fields = '__all__'

class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        # tenant is omitted: the ledger endpoint is already scoped to one.
        fields = ['id', 'date', 'description', 'type', 'amount']
