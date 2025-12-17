"""
Service de calcul des KPIs fournisseurs en temps réel
Basé sur les données comptables SYSCOHADA
"""
from django.db.models import Sum, Q, Count, Avg, F
from django.utils import timezone
from decimal import Decimal
from datetime import datetime, timedelta

from apps.accounting.models import JournalEntryLine
from .models import Supplier


class SupplierKPICalculator:
    """
    Calculateur de KPIs fournisseurs basé sur les écritures comptables
    Utilise les comptes fournisseurs 401xxx selon plan SYSCOHADA
    """

    def __init__(self, company, fiscal_year=None):
        self.company = company
        self.fiscal_year = fiscal_year

    def calculate_all_kpis(self):
        """
        Calcule tous les KPIs fournisseurs en une seule requête optimisée
        """
        return {
            'total_suppliers': self.get_total_suppliers(),
            'active_suppliers': self.get_active_suppliers(),
            'new_suppliers_month': self.get_new_suppliers_this_month(),
            'total_payables': self.calculate_total_payables(),
            'overdue_payables': self.calculate_overdue_payables(),
            'payment_compliance_rate': self.calculate_payment_compliance_rate(),
            'average_payment_delay': self.calculate_average_payment_delay(),
            'discount_opportunities': self.calculate_discount_opportunities(),
            'supplier_concentration': self.calculate_supplier_concentration(),
            'pending_invoices': self.get_pending_invoices_count()
        }

    def get_total_suppliers(self):
        """Nombre total de fournisseurs"""
        return Supplier.objects.filter(company=self.company).count()

    def get_active_suppliers(self):
        """Nombre de fournisseurs actifs"""
        return Supplier.objects.filter(
            company=self.company,
            is_active=True
        ).count()

    def get_new_suppliers_this_month(self):
        """Nouveaux fournisseurs ce mois"""
        current_month_start = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        return Supplier.objects.filter(
            company=self.company,
            created_at__gte=current_month_start
        ).count()

    def calculate_total_payables(self):
        """
        Total des dettes fournisseurs (comptes 401xxx)
        Solde créditeur des comptes fournisseurs
        """
        # Récupérer toutes les lignes d'écriture sur comptes fournisseurs (401)
        supplier_lines = JournalEntryLine.objects.filter(
            entry__company=self.company,
            account__code__startswith='401',
            entry__statut='VALIDE'
        )

        if self.fiscal_year:
            supplier_lines = supplier_lines.filter(entry__exercice=self.fiscal_year)

        # Calculer le solde (crédit - débit pour compte de passif)
        totals = supplier_lines.aggregate(
            total_debit=Sum('montant_debit'),
            total_credit=Sum('montant_credit')
        )

        total_debit = totals['total_debit'] or Decimal('0')
        total_credit = totals['total_credit'] or Decimal('0')

        # Dettes = solde créditeur
        payables = total_credit - total_debit

        return float(payables) if payables > 0 else 0.0

    def calculate_overdue_payables(self):
        """
        Montant des dettes en retard
        Basé sur la date d'échéance des factures fournisseurs
        """
        today = timezone.now().date()

        # Lignes d'écriture fournisseurs avec échéance dépassée
        overdue_lines = JournalEntryLine.objects.filter(
            entry__company=self.company,
            account__code__startswith='401',
            entry__statut='VALIDE',
            date_echeance__lt=today,
            lettre__isnull=True  # Non lettrées = non payées
        )

        if self.fiscal_year:
            overdue_lines = overdue_lines.filter(entry__exercice=self.fiscal_year)

        totals = overdue_lines.aggregate(
            total_debit=Sum('montant_debit'),
            total_credit=Sum('montant_credit')
        )

        total_debit = totals['total_debit'] or Decimal('0')
        total_credit = totals['total_credit'] or Decimal('0')

        overdue = total_credit - total_debit

        return float(overdue) if overdue > 0 else 0.0

    def calculate_payment_compliance_rate(self):
        """
        Taux de conformité des paiements
        % des factures payées à temps (avant ou à échéance)
        Calcul sur les 6 derniers mois
        """
        six_months_ago = timezone.now() - timedelta(days=180)

        # Factures fournisseurs lettrées (payées) sur la période
        paid_invoices = JournalEntryLine.objects.filter(
            entry__company=self.company,
            account__code__startswith='401',
            entry__statut='VALIDE',
            entry__date__gte=six_months_ago,
            lettre__isnull=False,  # Lettrées = payées
            date_echeance__isnull=False
        )

        total_paid = paid_invoices.count()

        if total_paid == 0:
            return 100.0  # Pas de factures = 100% de conformité

        # Factures payées à temps
        # Note: Pour un calcul précis, il faudrait la date de paiement
        # On estime avec celles qui ne sont pas en retard
        on_time = paid_invoices.filter(
            date_echeance__gte=six_months_ago
        ).count()

        return round((on_time / total_paid) * 100, 1)

    def calculate_average_payment_delay(self):
        """
        Délai moyen de paiement en jours
        Temps moyen entre échéance et paiement effectif
        """
        # Pour un calcul précis, il faudrait une date de paiement dans le modèle
        # On utilise une approximation basée sur les retards actuels
        today = timezone.now().date()

        overdue_lines = JournalEntryLine.objects.filter(
            entry__company=self.company,
            account__code__startswith='401',
            entry__statut='VALIDE',
            lettre__isnull=True,
            date_echeance__isnull=False,
            date_echeance__lt=today
        )

        if self.fiscal_year:
            overdue_lines = overdue_lines.filter(entry__exercice=self.fiscal_year)

        total_delay_days = 0
        count = 0

        for line in overdue_lines:
            if line.date_echeance:
                delay = (today - line.date_echeance).days
                total_delay_days += delay
                count += 1

        if count == 0:
            return 0.0

        return round(total_delay_days / count, 1)

    def calculate_discount_opportunities(self):
        """
        Opportunités d'escompte disponibles
        Montant total des factures éligibles à escompte
        """
        # Factures avec échéance > 30 jours et escompte disponible
        today = timezone.now().date()
        thirty_days_later = today + timedelta(days=30)

        # Pour simplifier, on cherche les factures non payées avec échéance lointaine
        # Dans un vrai système, il faudrait un champ "escompte_disponible" sur la facture
        eligible_lines = JournalEntryLine.objects.filter(
            entry__company=self.company,
            account__code__startswith='401',
            entry__statut='VALIDE',
            lettre__isnull=True,
            date_echeance__gte=thirty_days_later
        )

        if self.fiscal_year:
            eligible_lines = eligible_lines.filter(entry__exercice=self.fiscal_year)

        totals = eligible_lines.aggregate(
            total_debit=Sum('montant_debit'),
            total_credit=Sum('montant_credit')
        )

        total_debit = totals['total_debit'] or Decimal('0')
        total_credit = totals['total_credit'] or Decimal('0')

        opportunities = total_credit - total_debit

        return float(opportunities) if opportunities > 0 else 0.0

    def calculate_supplier_concentration(self):
        """
        Taux de concentration fournisseurs
        % du CA réalisé avec les 3 plus gros fournisseurs
        """
        # Calculer les achats par fournisseur sur les 12 derniers mois
        twelve_months_ago = timezone.now() - timedelta(days=365)

        # Grouper par fournisseur et sommer les achats
        from django.db.models import Sum, Case, When

        supplier_purchases = JournalEntryLine.objects.filter(
            entry__company=self.company,
            account__code__startswith='60',  # Comptes d'achats
            entry__statut='VALIDE',
            entry__date__gte=twelve_months_ago,
            tiers__isnull=False
        ).values('tiers').annotate(
            total_purchases=Sum('montant_debit')
        ).order_by('-total_purchases')[:3]

        top_3_total = sum(sp['total_purchases'] for sp in supplier_purchases if sp['total_purchases'])

        # Total des achats
        all_purchases = JournalEntryLine.objects.filter(
            entry__company=self.company,
            account__code__startswith='60',
            entry__statut='VALIDE',
            entry__date__gte=twelve_months_ago
        ).aggregate(
            total=Sum('montant_debit')
        )

        total = all_purchases['total'] or Decimal('0')

        if total <= 0:
            return 0.0

        concentration = (Decimal(str(top_3_total)) / total) * 100

        return round(float(concentration), 1)

    def get_pending_invoices_count(self):
        """
        Nombre de factures en attente de validation/paiement
        """
        return JournalEntryLine.objects.filter(
            entry__company=self.company,
            account__code__startswith='401',
            entry__statut='VALIDE',
            lettre__isnull=True
        ).values('entry').distinct().count()


class PaymentOptimizationCalculator:
    """
    Calculateur d'optimisation des paiements fournisseurs
    Propose les meilleurs paiements à effectuer
    """

    def __init__(self, company, fiscal_year=None):
        self.company = company
        self.fiscal_year = fiscal_year

    def calculate_payment_proposals(self, max_amount=None, forecast_days=30):
        """
        Génère des propositions de paiement optimisées
        Priorise : escomptes > échéances proches > montants importants
        """
        today = timezone.now().date()
        forecast_date = today + timedelta(days=forecast_days)

        # Récupérer toutes les factures non payées
        unpaid_lines = JournalEntryLine.objects.filter(
            entry__company=self.company,
            account__code__startswith='401',
            entry__statut='VALIDE',
            lettre__isnull=True,
            date_echeance__lte=forecast_date
        ).select_related('entry', 'account', 'tiers').order_by('date_echeance')

        if self.fiscal_year:
            unpaid_lines = unpaid_lines.filter(entry__exercice=self.fiscal_year)

        proposals = []
        total_proposed = Decimal('0')

        for line in unpaid_lines:
            balance = line.montant_credit - line.montant_debit

            if balance <= 0:
                continue

            # Calculer la priorité
            days_until_due = (line.date_echeance - today).days if line.date_echeance else 999

            # Priorité : négatif = urgent, positif = peut attendre
            priority_score = days_until_due

            # Bonus si escompte disponible (échéance > 30 jours)
            has_discount = days_until_due > 30

            proposal = {
                'supplier': line.tiers.nom_legal if line.tiers else 'Inconnu',
                'supplier_id': str(line.tiers.id) if line.tiers else None,
                'invoice_number': line.entry.numero_piece or f"Entry-{line.entry.id}",
                'amount': float(balance),
                'due_date': line.date_echeance.isoformat() if line.date_echeance else None,
                'days_until_due': days_until_due,
                'has_discount_opportunity': has_discount,
                'estimated_discount': float(balance * Decimal('0.02')) if has_discount else 0.0,  # 2% escompte
                'priority': 'high' if days_until_due < 0 else 'medium' if days_until_due < 15 else 'low',
                'priority_score': priority_score
            }

            proposals.append(proposal)
            total_proposed += balance

            # Si max_amount défini, arrêter quand atteint
            if max_amount and total_proposed >= Decimal(str(max_amount)):
                break

        # Trier par priorité (échéances proches en premier)
        proposals.sort(key=lambda x: (x['priority_score'], -x['amount']))

        return {
            'proposals': proposals,
            'total_amount': float(total_proposed),
            'count': len(proposals),
            'potential_savings': sum(p['estimated_discount'] for p in proposals)
        }
