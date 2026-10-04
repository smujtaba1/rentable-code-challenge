from datetime import datetime
from decimal import Decimal

import requests
from django.core.management.base import BaseCommand
from django.db import transaction as db_transaction

from api.models import Tenant, Transaction


class Command(BaseCommand):
    help = 'Imports tenants and their transaction ledgers from the PMS integration API.'

    def handle(self, *args, **options):
        self.stdout.write('Starting transaction import...')

        integration_api_url = "https://kpsaflrfjmhwomxiqrtiplvqem0hfmec.lambda-url.us-east-2.on.aws/api/simulated-pms-integration-api/tenants/"
        try:
            # The ledger is omitted from the response unless this is requested.
            response = requests.get(
                integration_api_url,
                params={'includeLedgers': 'true'},
                timeout=60,
            )
            response.raise_for_status()
            tenants_data = response.json()
        except requests.exceptions.RequestException as e:
            self.stderr.write(f'Error fetching data from integration API: {e}')
            return

        tenant_count = transaction_count = 0

        with db_transaction.atomic():
            for tenant_data in tenants_data:
                # Matched on the PMS identifier rather than our primary key, so
                # local ids stay independent of the vendor's numbering.
                tenant, _ = Tenant.objects.update_or_create(
                    pms_tenant_id=tenant_data['tenant_id'],
                    defaults={
                        'name': tenant_data['name'],
                        'unit': tenant_data['unit'],
                    },
                )
                tenant_count += 1

                for entry in tenant_data['ledger']:
                    # Keyed on the PMS id so re-running the import updates rows
                    # in place instead of duplicating them.
                    Transaction.objects.update_or_create(
                        pms_transaction_id=entry['id'],
                        defaults={
                            'tenant': tenant,
                            'type': entry['type'],
                            'date': datetime.strptime(entry['date'], '%Y-%m-%d').date(),
                            'description': entry['description'],
                            # Via str() because the API sends a JSON float, and
                            # float to Decimal carries binary rounding error.
                            'amount': Decimal(str(entry['amount'])),
                        },
                    )
                    transaction_count += 1

        self.stdout.write(
            f'Successfully imported {tenant_count} tenants and {transaction_count} transactions.'
        )
