"""
Service de calcul des KPIs financiers réels
Calcule DSO, DPO, CCC et autres métriques financières
"""
from django.db.models import Sum, Avg, F, Q, Count
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal


class FinancialCalculator:
    """Calcule les KPIs financiers à partir des données réelles"""

    def __init__(self, company=None):
        self.company = company

    def calculate_dso(self, days=365):
        """
        Calcule DSO (Days Sales Outstanding) - Délai moyen de paiement clients
        Formula: (Accounts Receivable / Total Credit Sales) × Number of Days
        """
        from apps.crm_clients.models import Client
        from apps.accounting.models import JournalEntry

        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)

        # Calculer le total des ventes à crédit (factures clients)
        entries = JournalEntry.objects.filter(
            company=self.company,
            entry_date__range=[start_date, end_date],
            journal__journal_type='VE'  # Journal des ventes
        )

        total_credit_sales = entries.aggregate(
            total=Sum('total_debit')
        )['total'] or Decimal('0')

        if total_credit_sales == 0:
            return 0

        # Calculer les créances clients actuelles (encours)
        # On cherche les comptes clients (classe 4) avec solde débiteur
        from apps.accounting.models import ChartOfAccounts

        client_accounts = ChartOfAccounts.objects.filter(
            company=self.company,
            account_class='4',
            code__startswith='411'  # Comptes clients
        )

        # Calculer le solde total des comptes clients
        accounts_receivable = Decimal('0')
        for account in client_accounts:
            # Somme des débits - somme des crédits
            account_balance = account.entry_lines.aggregate(
                debit=Sum('debit_amount'),
                credit=Sum('credit_amount')
            )
            debit_val = account_balance['debit'] or Decimal('0')
            credit_val = account_balance['credit'] or Decimal('0')
            balance = debit_val - credit_val
            if balance > 0:
                accounts_receivable += balance

        # DSO = (Accounts Receivable / Total Credit Sales) × Number of Days
        dso = float((accounts_receivable / total_credit_sales) * days)

        return round(dso, 1)

    def calculate_dpo(self, days=365):
        """
        Calcule DPO (Days Payable Outstanding) - Délai moyen de paiement fournisseurs
        Formula: (Accounts Payable / Total Credit Purchases) × Number of Days
        """
        from apps.suppliers.models import Supplier
        from apps.accounting.models import JournalEntry

        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)

        # Calculer le total des achats à crédit (factures fournisseurs)
        entries = JournalEntry.objects.filter(
            company=self.company,
            entry_date__range=[start_date, end_date],
            journal__journal_type='AC'  # Journal des achats
        )

        total_credit_purchases = entries.aggregate(
            total=Sum('total_credit')
        )['total'] or Decimal('0')

        if total_credit_purchases == 0:
            return 0

        # Calculer les dettes fournisseurs actuelles
        from apps.accounting.models import ChartOfAccounts

        supplier_accounts = ChartOfAccounts.objects.filter(
            company=self.company,
            account_class='4',
            code__startswith='401'  # Comptes fournisseurs
        )

        # Calculer le solde total des comptes fournisseurs
        accounts_payable = Decimal('0')
        for account in supplier_accounts:
            account_balance = account.entry_lines.aggregate(
                debit=Sum('debit_amount'),
                credit=Sum('credit_amount')
            )
            debit_val = account_balance['debit'] or Decimal('0')
            credit_val = account_balance['credit'] or Decimal('0')
            balance = credit_val - debit_val
            if balance > 0:
                accounts_payable += balance

        # DPO = (Accounts Payable / Total Credit Purchases) × Number of Days
        dpo = float((accounts_payable / total_credit_purchases) * days)

        return round(dpo, 1)

    def calculate_dio(self, days=365):
        """
        Calcule DIO (Days Inventory Outstanding) - Durée moyenne de stockage
        Formula: (Average Inventory / COGS) × Number of Days
        """
        from apps.accounting.models import ChartOfAccounts

        # Comptes de stocks (classe 3)
        stock_accounts = ChartOfAccounts.objects.filter(
            company=self.company,
            account_class='3'
        )

        # Calculer la valeur moyenne du stock
        total_inventory = Decimal('0')
        for account in stock_accounts:
            account_balance = account.entry_lines.aggregate(
                debit=Sum('debit_amount'),
                credit=Sum('credit_amount')
            )
            debit_val = account_balance['debit'] or Decimal('0')
            credit_val = account_balance['credit'] or Decimal('0')
            balance = debit_val - credit_val
            if balance > 0:
                total_inventory += balance

        # COGS (Coût des marchandises vendues) - Compte 60
        cogs_accounts = ChartOfAccounts.objects.filter(
            company=self.company,
            code__startswith='60'
        )

        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)

        cogs = Decimal('0')
        for account in cogs_accounts:
            cogs += account.entry_lines.filter(
                entry__entry_date__range=[start_date, end_date]
            ).aggregate(
                total=Sum('debit_amount')
            )['total'] or Decimal('0')

        if cogs == 0:
            return 0

        # DIO = (Average Inventory / COGS) × Number of Days
        dio = float((total_inventory / cogs) * days)

        return round(dio, 1)

    def calculate_ccc(self):
        """
        Calcule CCC (Cash Conversion Cycle) - Cycle de conversion de trésorerie
        Formula: CCC = DSO + DIO - DPO
        """
        dso = self.calculate_dso()
        dio = self.calculate_dio()
        dpo = self.calculate_dpo()

        ccc = dso + dio - dpo

        return round(ccc, 1)

    def calculate_working_capital_metrics(self):
        """Calcule tous les métriques de besoin en fonds de roulement"""
        return {
            'dso': self.calculate_dso(),
            'dpo': self.calculate_dpo(),
            'dio': self.calculate_dio(),
            'cash_conversion_cycle': self.calculate_ccc()
        }

    def calculate_operational_metrics(self):
        """Calcule les métriques opérationnelles réelles"""
        from apps.suppliers.models import SupplierInvoice
        from apps.crm_clients.models import Client

        # Taux de réalisation des commandes (basé sur les factures payées)
        total_invoices = SupplierInvoice.objects.filter(
            supplier__company=self.company
        ).count()

        paid_invoices = SupplierInvoice.objects.filter(
            supplier__company=self.company,
            payment_status='PAID'
        ).count()

        order_fulfillment_rate = (paid_invoices / total_invoices * 100) if total_invoices > 0 else 0

        # Rotation des stocks (DIO inversé)
        dio = self.calculate_dio()
        inventory_turnover = (365 / dio) if dio > 0 else 0

        # Taux de satisfaction client (basé sur le scoring)
        avg_client_score = Client.objects.filter(
            company=self.company,
            is_active=True
        ).aggregate(
            avg_score=Avg('score_risque')
        )['avg_score'] or 0

        # Convertir le score de risque en satisfaction (inverse)
        customer_satisfaction = 5.0 - (float(avg_client_score) / 20)

        # Productivité système (basé sur le nombre de transactions)
        from apps.accounting.models import JournalEntry

        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=30)

        recent_entries = JournalEntry.objects.filter(
            company=self.company,
            entry_date__range=[start_date, end_date]
        ).count()

        # Calculer un taux de productivité basé sur l'activité
        productivity_rate = min(100, recent_entries / 10)  # 1000 écritures = 100%

        return {
            'order_fulfillment_rate': round(order_fulfillment_rate, 1),
            'inventory_turnover': round(inventory_turnover, 1),
            'productivity_rate': round(productivity_rate, 1),
            'customer_satisfaction': round(customer_satisfaction, 1),
            'employee_productivity': round(productivity_rate * 0.95, 1),  # Approximation
            'system_uptime': 99.5  # À connecter à un vrai monitoring
        }
