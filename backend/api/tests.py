import csv
from decimal import Decimal
from io import StringIO
from unittest.mock import patch

from django.core.management import call_command
from django.test import TestCase

from api.models import Tenant, Transaction

# Mirrors the real PMS response, trimmed to what the assertions need. Tenant
# ids deliberately do not line up with local primary keys, and the ledgers
# include a negative charge and a negative payment, which are the cases the
# sign handling turns on.
PMS_RESPONSE = [
    {
        'tenant_id': 1,
        'name': 'Alice Wonderland',
        'unit': 'A101',
        'ledger': [
            {'id': '1', 'date': '2023-01-01', 'description': 'Rent Charge',
             'type': 'charge', 'amount': 1500.0},
            {'id': '2', 'date': '2023-01-05', 'description': 'Rent Payment',
             'type': 'payment', 'amount': 1500.0},
            {'id': '3', 'date': '2023-02-01', 'description': 'Late Fee Waived',
             'type': 'charge', 'amount': -50.0},
            {'id': '4', 'date': '2023-02-05', 'description': 'Returned Payment - NSF',
             'type': 'payment', 'amount': -200.0},
        ],
    },
    {
        'tenant_id': 2,
        'name': 'Bob The Builder',
        'unit': 'B205',
        'ledger': [
            {'id': '5', 'date': '2023-01-01', 'description': 'Rent Charge',
             'type': 'charge', 'amount': 1000.0},
        ],
    },
]


def run_import():
    """Runs the import against PMS_RESPONSE instead of the live API."""
    with patch('api.management.commands.import_transactions.requests.get') as mock_get:
        mock_get.return_value.json.return_value = PMS_RESPONSE
        mock_get.return_value.raise_for_status.return_value = None
        call_command('import_transactions', stdout=StringIO())
    return mock_get


class ImportTransactionsTests(TestCase):
    def test_requests_the_ledgers(self):
        """The ledger key is absent unless includeLedgers is asked for.

        Omitting it is what made the original command import zero rows while
        reporting success, so this pins that specific failure.
        """
        mock_get = run_import()

        self.assertEqual(
            mock_get.call_args.kwargs['params'], {'includeLedgers': 'true'}
        )

    def test_imports_tenants_and_ledgers(self):
        run_import()

        self.assertEqual(Tenant.objects.count(), 2)
        self.assertEqual(Transaction.objects.count(), 5)

    def test_matches_tenants_by_pms_id_not_primary_key(self):
        """A tenant already present under a different local id is updated,
        not duplicated, and keeps its own ledger.

        The original command looked tenants up by primary key, so PMS tenant 3
        would have been attached to whichever local row happened to be id 3.
        """
        existing = Tenant.objects.create(
            pms_tenant_id=2, name='Stale Name', unit='OLD'
        )

        run_import()

        self.assertEqual(Tenant.objects.count(), 2)
        existing.refresh_from_db()
        self.assertEqual(existing.name, 'Bob The Builder')
        self.assertEqual(existing.unit, 'B205')
        self.assertEqual(existing.transactions.count(), 1)

    def test_is_idempotent(self):
        run_import()
        run_import()

        self.assertEqual(Tenant.objects.count(), 2)
        self.assertEqual(Transaction.objects.count(), 5)

    def test_stores_the_transaction_type(self):
        """type is what the balance depends on, and the original model had no
        column for it."""
        run_import()

        self.assertEqual(Transaction.objects.filter(type='charge').count(), 3)
        self.assertEqual(Transaction.objects.filter(type='payment').count(), 2)

    def test_keeps_pms_ids_out_of_local_primary_keys(self):
        run_import()

        entry = Transaction.objects.get(pms_transaction_id='1')
        self.assertEqual(entry.description, 'Rent Charge')
        # The PMS id lives in its own column rather than being forced into the
        # autoincrement primary key.
        self.assertNotEqual(entry.pk, '1')

    def test_amounts_avoid_float_error(self):
        run_import()

        entry = Transaction.objects.get(pms_transaction_id='1')
        self.assertEqual(entry.amount, Decimal('1500.00'))


class TenantListTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        run_import()

    def test_balance_covers_all_four_sign_cases(self):
        """Amounts arrive signed, so type alone does not decide direction:

            charge  +1500 -> +1500   rent owed
            payment +1500 -> -1500   rent paid
            charge    -50 ->   -50   a waiver reduces what is owed
            payment  -200 -> +200    a returned payment adds it back
        """
        response = self.client.get('/api/tenants/')
        balances = {t['name']: t['balance'] for t in response.json()}

        self.assertEqual(balances['Alice Wonderland'], '150.00')
        self.assertEqual(balances['Bob The Builder'], '1000.00')

    def test_balance_is_zero_without_transactions(self):
        """SUM over no rows is NULL, which Coalesce turns into 0.00."""
        Tenant.objects.create(pms_tenant_id=99, name='New Tenant', unit='Z001')

        response = self.client.get('/api/tenants/')
        balances = {t['name']: t['balance'] for t in response.json()}

        self.assertEqual(balances['New Tenant'], '0.00')

    def test_balances_cost_one_query(self):
        """Annotated rather than aggregated per tenant, so the query count does
        not grow with the number of tenants."""
        with self.assertNumQueries(1):
            self.client.get('/api/tenants/')


class TenantTransactionsTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        run_import()
        cls.alice = Tenant.objects.get(pms_tenant_id=1)

    def test_returns_only_that_tenants_ledger(self):
        response = self.client.get(f'/api/tenants/{self.alice.pk}/transactions/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 4)

    def test_is_ordered_oldest_first(self):
        response = self.client.get(f'/api/tenants/{self.alice.pk}/transactions/')

        dates = [entry['date'] for entry in response.json()]
        self.assertEqual(dates, sorted(dates))

    def test_unknown_tenant_is_not_found(self):
        """404 rather than an empty list, so a missing tenant reads differently
        from a real one with no transactions."""
        response = self.client.get('/api/tenants/99999/transactions/')

        self.assertEqual(response.status_code, 404)


class TenantTransactionsCsvTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        run_import()
        cls.alice = Tenant.objects.get(pms_tenant_id=1)

    def get_csv(self):
        response = self.client.get(f'/api/tenants/{self.alice.pk}/transactions/csv/')
        content = response.content.decode()
        return response, list(csv.DictReader(content.splitlines()))

    def test_is_served_as_a_download(self):
        response, _ = self.get_csv()

        self.assertEqual(response['Content-Type'], 'text/csv')
        self.assertEqual(
            response['Content-Disposition'],
            'attachment; filename="ledger-alice-wonderland.csv"'
        )

    def test_amount_column_sums_to_the_balance(self):
        """The export carries the signed effect, so summing the column in a
        spreadsheet reproduces the closing balance."""
        _, rows = self.get_csv()

        total = sum(Decimal(row['Amount']) for row in rows)
        self.assertEqual(total, Decimal('150.00'))
        self.assertEqual(Decimal(rows[-1]['Balance']), Decimal('150.00'))

    def test_figures_are_bare_decimals(self):
        """Excel reads $1,500.00 as text. Formatting here would defeat the
        point of the export."""
        _, rows = self.get_csv()

        self.assertEqual(rows[0]['Amount'], '1500.00')

    def test_unknown_tenant_is_not_found(self):
        response = self.client.get('/api/tenants/99999/transactions/csv/')

        self.assertEqual(response.status_code, 404)
