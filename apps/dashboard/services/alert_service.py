"""
Service de génération d'alertes automatiques
Détecte les situations critiques et génère des alertes
"""
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal


class AlertService:
    """Génère des alertes basées sur les données réelles"""

    def __init__(self, company=None):
        self.company = company
        self.alerts = []

    def check_all_alerts(self):
        """Vérifie toutes les conditions d'alerte"""
        self.check_cash_alerts()
        self.check_receivables_alerts()
        self.check_payables_alerts()
        self.check_operational_alerts()
        return self.alerts

    def check_cash_alerts(self):
        """Vérifie les alertes de trésorerie"""
        from apps.treasury.models import BankAccount

        # Vérifier les comptes avec solde faible
        low_balance_accounts = BankAccount.objects.filter(
            company=self.company,
            current_balance__lt=10000,  # Seuil de 10k
            is_active=True
        )

        for account in low_balance_accounts:
            self.alerts.append({
                'severity': 'high' if account.current_balance < 5000 else 'medium',
                'category': 'treasury',
                'title': f'Solde faible - {account.account_name}',
                'message': f'Le solde du compte {account.account_name} est de {account.current_balance} {account.currency}',
                'metric_value': float(account.current_balance),
                'threshold': 10000.0,
                'timestamp': timezone.now().isoformat(),
                'action_required': 'Vérifier les prévisions de trésorerie',
                'impact': 'Risque de découvert'
            })

        # Vérifier les comptes à découvert
        overdrawn_accounts = BankAccount.objects.filter(
            company=self.company,
            current_balance__lt=0,
            is_active=True
        )

        for account in overdrawn_accounts:
            self.alerts.append({
                'severity': 'critical',
                'category': 'treasury',
                'title': f'Découvert - {account.account_name}',
                'message': f'Le compte {account.account_name} est à découvert de {abs(account.current_balance)} {account.currency}',
                'metric_value': float(account.current_balance),
                'threshold': 0.0,
                'timestamp': timezone.now().isoformat(),
                'action_required': 'Appel de fonds urgent',
                'impact': 'Frais bancaires et pénalités'
            })

    def check_receivables_alerts(self):
        """Vérifie les alertes sur les créances clients"""
        from apps.accounting.models import ChartOfAccounts

        # Comptes clients (411)
        client_accounts = ChartOfAccounts.objects.filter(
            company=self.company,
            code__startswith='411'
        )

        total_receivables = Decimal('0')
        overdue_amount = Decimal('0')

        for account in client_accounts:
            balance = account.entry_lines.aggregate(
                debit=sum('debit_amount'),
                credit=sum('credit_amount')
            )
            account_balance = (balance['debit'] or 0) - (balance['credit'] or 0)
            if account_balance > 0:
                total_receivables += account_balance

                # Chercher les écritures en retard (> 60 jours)
                cutoff_date = timezone.now().date() - timedelta(days=60)
                old_entries = account.entry_lines.filter(
                    entry__entry_date__lt=cutoff_date,
                    debit_amount__gt=0
                )
                for line in old_entries:
                    overdue_amount += line.debit_amount

        # Alerte si plus de 30% des créances sont en retard
        if total_receivables > 0:
            overdue_ratio = float(overdue_amount / total_receivables)
            if overdue_ratio > 0.3:
                self.alerts.append({
                    'severity': 'high' if overdue_ratio > 0.5 else 'medium',
                    'category': 'receivables',
                    'title': 'Créances clients en retard',
                    'message': f'{overdue_ratio*100:.1f}% des créances sont en retard (+60 jours)',
                    'metric_value': overdue_ratio * 100,
                    'threshold': 30.0,
                    'timestamp': timezone.now().isoformat(),
                    'action_required': 'Relancer les clients en retard',
                    'impact': 'Impact sur la trésorerie'
                })

    def check_payables_alerts(self):
        """Vérifie les alertes sur les dettes fournisseurs"""
        from apps.suppliers.models import SupplierInvoice

        # Factures fournisseurs en retard
        today = timezone.now().date()
        overdue_invoices = SupplierInvoice.objects.filter(
            supplier__company=self.company,
            payment_status__in=['PENDING', 'PARTIAL'],
            due_date__lt=today
        )

        overdue_count = overdue_invoices.count()
        overdue_total = overdue_invoices.aggregate(
            total=sum('amount_due')
        )['total'] or Decimal('0')

        if overdue_count > 0:
            self.alerts.append({
                'severity': 'high' if overdue_count > 10 else 'medium',
                'category': 'payables',
                'title': f'{overdue_count} factures fournisseurs en retard',
                'message': f'Montant total en retard: {overdue_total} XAF',
                'metric_value': float(overdue_total),
                'threshold': 0.0,
                'timestamp': timezone.now().isoformat(),
                'action_required': 'Planifier les paiements',
                'impact': 'Risque de pénalités et dégradation relation fournisseur'
            })

    def check_operational_alerts(self):
        """Vérifie les alertes opérationnelles"""
        from apps.accounting.models import JournalEntry

        # Vérifier les écritures déséquilibrées
        unbalanced_entries = JournalEntry.objects.filter(
            company=self.company,
            is_balanced=False,
            is_validated=False
        ).count()

        if unbalanced_entries > 0:
            self.alerts.append({
                'severity': 'medium',
                'category': 'accounting',
                'title': f'{unbalanced_entries} écritures déséquilibrées',
                'message': f'{unbalanced_entries} écritures comptables ne sont pas équilibrées',
                'metric_value': float(unbalanced_entries),
                'threshold': 0.0,
                'timestamp': timezone.now().isoformat(),
                'action_required': 'Corriger les écritures',
                'impact': 'Comptabilité incorrecte'
            })

        # Vérifier l'activité comptable (pas d'écritures depuis X jours)
        last_entry = JournalEntry.objects.filter(
            company=self.company
        ).order_by('-entry_date').first()

        if last_entry:
            days_since_last_entry = (timezone.now().date() - last_entry.entry_date).days
            if days_since_last_entry > 7:
                self.alerts.append({
                    'severity': 'low',
                    'category': 'accounting',
                    'title': 'Pas d\'activité comptable récente',
                    'message': f'Aucune écriture depuis {days_since_last_entry} jours',
                    'metric_value': float(days_since_last_entry),
                    'threshold': 7.0,
                    'timestamp': timezone.now().isoformat(),
                    'action_required': 'Vérifier la saisie comptable',
                    'impact': 'Comptabilité pas à jour'
                })

    def get_alert_summary(self):
        """Retourne un résumé des alertes par sévérité"""
        alerts = self.check_all_alerts()
        summary = {
            'total': len(alerts),
            'critical': len([a for a in alerts if a['severity'] == 'critical']),
            'high': len([a for a in alerts if a['severity'] == 'high']),
            'medium': len([a for a in alerts if a['severity'] == 'medium']),
            'low': len([a for a in alerts if a['severity'] == 'low']),
        }
        return summary
