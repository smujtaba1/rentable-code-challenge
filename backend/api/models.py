from django.db import models

# Create your models here.
# The candidate will define the Transaction model in this file.

class Tenant(models.Model):
    # The tenant's identifier in the PMS. Kept separate from the local primary
    # key so our relational integrity never depends on the vendor's numbering.
    # Nullable so a tenant can exist locally without a PMS counterpart.
    pms_tenant_id = models.IntegerField(unique=True, null=True, blank=True)
    name = models.CharField(max_length=255)
    unit = models.CharField(max_length=50, blank=True, null=True)

    def __str__(self):
        return self.name

class Transaction(models.Model):
    class Type(models.TextChoices):
        CHARGE = 'charge', 'Charge'
        PAYMENT = 'payment', 'Payment'

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='transactions')
    # The ledger entry's identifier in the PMS, used as the idempotency key when
    # importing. A CharField because the API sends it quoted, and a vendor id is
    # opaque. Nullable so transactions can also be created locally.
    pms_transaction_id = models.CharField(max_length=64, unique=True, null=True, blank=True)
    # Amounts arrive signed, so the balance is charges minus payments with each
    # amount's own sign preserved (a negative payment is a returned payment).
    type = models.CharField(max_length=16, choices=Type.choices)
    date = models.DateField()
    description = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.date} - {self.description} ({self.amount})" 