"""
Service de calcul des KPIs clients en temps réel
Basé sur les données comptables SYSCOHADA
"""
from django.db.models import Sum, Q, Count, Avg
from django.utils import timezone
from decimal import Decimal
from datetime import datetime, timedelta

from apps.accounting.models import JournalEntryLine
from .models import Client


class ClientKPICalculator:
    """
    Calculateur de KPIs clients basé sur les écritures comptables
    Utilise les comptes clients 411xxx selon plan SYSCOHADA
    """

    def __init__(self, company, fiscal_year=None):
        self.company = company
        self.fiscal_year = fiscal_year

    def calculate_all_kpis(self):
        """
        Calcule tous les KPIs clients en une seule requête optimisée
        """
        return {
            'total_customers': self.get_total_customers(),
            'active_customers': self.get_active_customers(),
            'new_customers_month': self.get_new_customers_this_month(),
            'churn_rate': self.calculate_churn_rate(),
            'total_receivables': self.calculate_total_receivables(),
            'overdue_amount': self.calculate_overdue_amount(),
            'dso': self.calculate_dso(),
            'payment_on_time_rate': self.calculate_payment_on_time_rate(),
            'average_credit_limit': self.calculate_average_credit_limit(),
            'credit_utilization': self.calculate_credit_utilization()
        }

    def get_total_customers(self):
        """Nombre total de clients"""
        return Client.objects.filter(company=self.company).count()

    def get_active_customers(self):
        """Nombre de clients actifs"""
        return Client.objects.filter(
            company=self.company,
            is_active=True
        ).count()

    def get_new_customers_this_month(self):
        """Nouveaux clients ce mois"""
        current_month_start = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        return Client.objects.filter(
            company=self.company,
            created_at__gte=current_month_start
        ).count()

    def calculate_churn_rate(self):
        """
        Taux d'attrition (clients perdus / clients début période)
        Calcul sur les 12 derniers mois
        """
        twelve_months_ago = timezone.now() - timedelta(days=365)

        # Clients au début de la période
        clients_start = Client.objects.filter(
            company=self.company,
            created_at__lt=twelve_months_ago
        ).count()

        if clients_start == 0:
            return 0.0

        # Clients devenus inactifs durant la période
        churned_clients = Client.objects.filter(
            company=self.company,
            created_at__lt=twelve_months_ago,
            is_active=False,
            updated_at__gte=twelve_months_ago
        ).count()

        return round((churned_clients / clients_start) * 100, 2)

    def calculate_total_receivables(self):
        """
        Total des créances clients (comptes 411xxx)
        Solde débiteur des comptes clients
        """
        # Récupérer toutes les lignes d'écriture sur comptes clients (411)
        client_lines = JournalEntryLine.objects.filter(
            entry__company=self.company,
            account__code__startswith='411',
            entry__statut='VALIDE'
        )

        if self.fiscal_year:
            client_lines = client_lines.filter(entry__exercice=self.fiscal_year)

        # Calculer le solde (débit - crédit)
        totals = client_lines.aggregate(
            total_debit=Sum('montant_debit'),
            total_credit=Sum('montant_credit')
        )

        total_debit = totals['total_debit'] or Decimal('0')
        total_credit = totals['total_credit'] or Decimal('0')

        # Créances = solde débiteur
        receivables = total_debit - total_credit

        return float(receivables) if receivables > 0 else 0.0

    def calculate_overdue_amount(self):
        """
        Montant des créances en retard
        Basé sur la date d'échéance des factures
        """
        today = timezone.now().date()

        # Lignes d'écriture clients avec échéance dépassée
        overdue_lines = JournalEntryLine.objects.filter(
            entry__company=self.company,
            account__code__startswith='411',
            entry__statut='VALIDE',
            date_echeance__lt=today,
            # Seulement les lignes non lettrées (non payées)
            lettre__isnull=True
        )

        if self.fiscal_year:
            overdue_lines = overdue_lines.filter(entry__exercice=self.fiscal_year)

        totals = overdue_lines.aggregate(
            total_debit=Sum('montant_debit'),
            total_credit=Sum('montant_credit')
        )

        total_debit = totals['total_debit'] or Decimal('0')
        total_credit = totals['total_credit'] or Decimal('0')

        overdue = total_debit - total_credit

        return float(overdue) if overdue > 0 else 0.0

    def calculate_dso(self):
        """
        Days Sales Outstanding (DSO)
        DSO = (Créances clients / CA TTC) × Nombre de jours
        Calcul sur les 90 derniers jours
        """
        ninety_days_ago = timezone.now() - timedelta(days=90)

        # Créances clients actuelles
        receivables = Decimal(str(self.calculate_total_receivables()))

        # CA TTC sur 90 jours (comptes 70x - Ventes)
        sales_lines = JournalEntryLine.objects.filter(
            entry__company=self.company,
            account__code__startswith='70',
            entry__statut='VALIDE',
            entry__date__gte=ninety_days_ago
        )

        sales_total = sales_lines.aggregate(
            total_credit=Sum('montant_credit'),
            total_debit=Sum('montant_debit')
        )

        credit = sales_total['total_credit'] or Decimal('0')
        debit = sales_total['total_debit'] or Decimal('0')

        # CA = crédit - débit (pour comptes de produits)
        sales = credit - debit

        if sales <= 0:
            return 0

        # DSO = (Créances / CA) × 90 jours
        dso = (receivables / sales) * 90

        return round(float(dso), 1)

    def calculate_payment_on_time_rate(self):
        """
        Taux de paiement à temps
        % des factures payées avant ou à la date d'échéance
        Calcul sur les 6 derniers mois
        """
        six_months_ago = timezone.now() - timedelta(days=180)

        # Factures clients lettrées (payées) sur la période
        paid_invoices = JournalEntryLine.objects.filter(
            entry__company=self.company,
            account__code__startswith='411',
            entry__statut='VALIDE',
            entry__date__gte=six_months_ago,
            lettre__isnull=False,  # Factures lettrées = payées
            date_echeance__isnull=False
        )

        total_paid = paid_invoices.count()

        if total_paid == 0:
            return 0.0

        # Factures payées à temps (date lettrage <= date échéance)
        # Note: date_lettrage serait idéalement dans le modèle
        # Pour l'instant, on estime avec les factures non en retard
        on_time = paid_invoices.filter(
            date_echeance__gte=six_months_ago
        ).count()

        return round((on_time / total_paid) * 100, 1)

    def calculate_average_credit_limit(self):
        """
        Limite de crédit moyenne accordée aux clients
        """
        from .models import ClientFinancialInfo

        avg_limit = ClientFinancialInfo.objects.filter(
            client__company=self.company,
            limite_credit__gt=0
        ).aggregate(
            avg=Avg('limite_credit')
        )

        average = avg_limit['avg'] or Decimal('0')

        return float(average)

    def calculate_credit_utilization(self):
        """
        Taux d'utilisation du crédit
        (Total créances / Total limites de crédit) × 100
        """
        from .models import ClientFinancialInfo

        # Total des limites de crédit
        total_limits = ClientFinancialInfo.objects.filter(
            client__company=self.company,
            limite_credit__gt=0
        ).aggregate(
            total=Sum('limite_credit')
        )

        limits = total_limits['total'] or Decimal('0')

        if limits <= 0:
            return 0.0

        # Total créances
        receivables = Decimal(str(self.calculate_total_receivables()))

        utilization = (receivables / limits) * 100

        return round(float(utilization), 1)


class AgingAnalysisCalculator:
    """
    Calculateur de balance âgée des créances clients
    """

    def __init__(self, company, fiscal_year=None):
        self.company = company
        self.fiscal_year = fiscal_year

    def calculate_aging_analysis(self, include_details=False):
        """
        Calcule la balance âgée par tranches de retard
        """
        today = timezone.now().date()

        # Récupérer toutes les lignes clients non lettrées
        client_lines = JournalEntryLine.objects.filter(
            entry__company=self.company,
            account__code__startswith='411',
            entry__statut='VALIDE',
            lettre__isnull=True,  # Non lettrées = non payées
            date_echeance__isnull=False
        ).select_related('entry', 'account', 'tiers')

        if self.fiscal_year:
            client_lines = client_lines.filter(entry__exercice=self.fiscal_year)

        # Initialiser les totaux
        summary = {
            'current': Decimal('0'),
            'overdue_30': Decimal('0'),
            'overdue_60': Decimal('0'),
            'overdue_90': Decimal('0'),
            'overdue_120_plus': Decimal('0')
        }

        details = []

        # Grouper par client si détails demandés
        if include_details:
            from collections import defaultdict
            client_balances = defaultdict(lambda: {
                'customer': '',
                'current': Decimal('0'),
                'overdue_30': Decimal('0'),
                'overdue_60': Decimal('0'),
                'overdue_90': Decimal('0'),
                'overdue_120_plus': Decimal('0'),
                'total': Decimal('0')
            })

        for line in client_lines:
            # Calculer le solde de la ligne
            balance = line.montant_debit - line.montant_credit

            if balance <= 0:
                continue

            # Calculer le nombre de jours de retard
            if line.date_echeance:
                days_overdue = (today - line.date_echeance).days
            else:
                days_overdue = 0

            # Classer par tranche
            if days_overdue <= 0:
                bucket = 'current'
            elif days_overdue <= 30:
                bucket = 'overdue_30'
            elif days_overdue <= 60:
                bucket = 'overdue_60'
            elif days_overdue <= 90:
                bucket = 'overdue_90'
            else:
                bucket = 'overdue_120_plus'

            summary[bucket] += balance

            # Ajouter aux détails par client si demandé
            if include_details and line.tiers:
                client_key = str(line.tiers.id)
                if not client_balances[client_key]['customer']:
                    client_balances[client_key]['customer'] = line.tiers.nom_legal

                client_balances[client_key][bucket] += balance
                client_balances[client_key]['total'] += balance

        # Convertir en float pour JSON
        summary_float = {k: float(v) for k, v in summary.items()}

        result = {'summary': summary_float}

        if include_details:
            details = [
                {
                    'customer': data['customer'],
                    'current': float(data['current']),
                    'overdue_30': float(data['overdue_30']),
                    'overdue_60': float(data['overdue_60']),
                    'overdue_90': float(data['overdue_90']),
                    'overdue_120_plus': float(data['overdue_120_plus']),
                    'total': float(data['total']),
                    'status': self._get_status(data)
                }
                for data in client_balances.values()
            ]
            result['details'] = sorted(details, key=lambda x: x['total'], reverse=True)

        return result

    def _get_status(self, client_data):
        """Détermine le status basé sur les retards"""
        if client_data['overdue_120_plus'] > 0:
            return 'critical'
        elif client_data['overdue_90'] > 0:
            return 'warning'
        elif client_data['overdue_60'] > 0:
            return 'attention'
        elif client_data['overdue_30'] > 0:
            return 'watch'
        else:
            return 'ok'
