"""
Dashboard Financial Calculator

Calcule les métriques financières réelles depuis les écritures comptables
selon le plan comptable SYSCOHADA.

SYSCOHADA Classes:
- Classe 1: Comptes de capitaux (Equity) - Crédit normal
- Classe 2: Immobilisations (Fixed Assets) - Débit normal
- Classe 3: Stocks (Inventory) - Débit normal
- Classe 4: Comptes de tiers (Receivables/Payables) - Mixte
- Classe 5: Trésorerie (Cash) - Débit normal
- Classe 6: Charges (Expenses) - Débit normal
- Classe 7: Produits (Revenue) - Crédit normal
"""
from django.db.models import Sum, Q, F, Case, When, DecimalField
from django.db.models.functions import TruncMonth, TruncDate
from decimal import Decimal
from datetime import datetime, timedelta
from apps.accounting.models import ChartOfAccounts, JournalEntryLine, JournalEntry
# Note: ChartOfAccounts model exists in apps.accounting.models


class FinancialCalculator:
    """Calculateur de métriques financières SYSCOHADA"""

    def __init__(self, company_id=None, fiscal_year_id=None):
        self.company_id = company_id
        self.fiscal_year_id = fiscal_year_id

    def _get_entries_queryset(self):
        """Base queryset pour les écritures"""
        qs = JournalEntry.objects.filter(is_validated=True)

        if self.company_id:
            qs = qs.filter(company_id=self.company_id)

        if self.fiscal_year_id:
            qs = qs.filter(fiscal_year_id=self.fiscal_year_id)

        return qs

    def _get_lines_queryset(self):
        """Base queryset pour les lignes d'écriture"""
        entry_ids = self._get_entries_queryset().values_list('id', flat=True)
        return JournalEntryLine.objects.filter(entry_id__in=entry_ids)

    def _calculate_balance_by_class(self, account_class):
        """
        Calcule le solde pour une classe de comptes.

        Retourne: balance (Debit - Credit)
        - Positif = solde débiteur
        - Négatif = solde créditeur
        """
        lines = self._get_lines_queryset().filter(
            account__account_class=account_class
        ).aggregate(
            total_debit=Sum('debit_amount'),
            total_credit=Sum('credit_amount')
        )

        total_debit = lines['total_debit'] or Decimal('0')
        total_credit = lines['total_credit'] or Decimal('0')

        return total_debit - total_credit

    def _calculate_balance_by_account_pattern(self, pattern):
        """
        Calcule le solde pour un pattern de compte (ex: '41' pour clients).

        Retourne: balance (Debit - Credit)
        """
        lines = self._get_lines_queryset().filter(
            account__code__startswith=pattern
        ).aggregate(
            total_debit=Sum('debit_amount'),
            total_credit=Sum('credit_amount')
        )

        total_debit = lines['total_debit'] or Decimal('0')
        total_credit = lines['total_credit'] or Decimal('0')

        return total_debit - total_credit

    # ==========================================================================
    # BILAN (Balance Sheet)
    # ==========================================================================

    def calculate_total_assets(self):
        """
        Actif Total = Classe 2 + Classe 3 + Classe 4 (débiteurs) + Classe 5

        Retourne le montant en valeur absolue
        """
        # Immobilisations (Classe 2) - débit normal
        fixed_assets = self._calculate_balance_by_class('2')

        # Stocks (Classe 3) - débit normal
        inventory = self._calculate_balance_by_class('3')

        # Trésorerie (Classe 5) - débit normal
        cash = self._calculate_balance_by_class('5')

        # Clients et autres débiteurs (Classe 4 débiteur)
        # Comptes 41, 42, 43, 44, 45, 46, 47
        receivables = self._calculate_balance_by_account_pattern('41')  # Clients
        receivables += self._calculate_balance_by_account_pattern('42')  # Personnel
        receivables += self._calculate_balance_by_account_pattern('43')  # Sécurité sociale
        receivables += self._calculate_balance_by_account_pattern('44')  # État
        receivables += self._calculate_balance_by_account_pattern('45')  # Groupe
        receivables += self._calculate_balance_by_account_pattern('46')  # Débiteurs divers
        receivables += self._calculate_balance_by_account_pattern('47')  # Comptes transitoires

        # Filtre pour ne garder que les soldes débiteurs (actif)
        receivables = max(receivables, Decimal('0'))

        total_assets = fixed_assets + inventory + cash + receivables

        return abs(total_assets)

    def calculate_total_liabilities(self):
        """
        Passif Total (Dettes) = Classe 4 (créditeurs) + Classe 16, 17, 18

        Retourne le montant en valeur absolue
        """
        # Emprunts et dettes financières (16, 17, 18)
        financial_debt = abs(self._calculate_balance_by_account_pattern('16'))  # Emprunts
        financial_debt += abs(self._calculate_balance_by_account_pattern('17'))  # Dettes de crédit-bail
        financial_debt += abs(self._calculate_balance_by_account_pattern('18'))  # Dettes liées

        # Fournisseurs et autres créditeurs (Classe 4 créditeur)
        # Comptes 40, 48, 49
        payables = self._calculate_balance_by_account_pattern('40')  # Fournisseurs
        payables += self._calculate_balance_by_account_pattern('48')  # Créditeurs divers
        payables += self._calculate_balance_by_account_pattern('49')  # Comptes de régularisation

        # Filtre pour ne garder que les soldes créditeurs (passif)
        payables = abs(min(payables, Decimal('0')))

        total_liabilities = financial_debt + payables

        return abs(total_liabilities)

    def calculate_equity(self):
        """
        Capitaux propres = Classe 1 (solde créditeur)

        Retourne le montant en valeur absolue
        """
        equity = self._calculate_balance_by_class('1')

        # Les capitaux propres ont normalement un solde créditeur (négatif dans notre calcul)
        return abs(equity)

    def calculate_cash_position(self):
        """
        Trésorerie = Classe 5 (Banques + Caisses)

        Retourne le solde (peut être négatif si découvert)
        """
        return self._calculate_balance_by_class('5')

    # ==========================================================================
    # COMPTE DE RÉSULTAT (Income Statement)
    # ==========================================================================

    def calculate_revenue(self):
        """
        Produits (Revenue) = Classe 7 (solde créditeur)

        Retourne le montant en valeur absolue
        """
        revenue = self._calculate_balance_by_class('7')

        # Les produits ont un solde créditeur (négatif dans notre calcul)
        return abs(revenue)

    def calculate_expenses(self):
        """
        Charges (Expenses) = Classe 6 (solde débiteur)

        Retourne le montant en valeur absolue
        """
        expenses = self._calculate_balance_by_class('6')

        # Les charges ont un solde débiteur (positif dans notre calcul)
        return abs(expenses)

    def calculate_net_income(self):
        """
        Résultat Net = Produits - Charges = Classe 7 - Classe 6

        Retourne le résultat (positif = bénéfice, négatif = perte)
        """
        revenue = self.calculate_revenue()
        expenses = self.calculate_expenses()

        return revenue - expenses

    def calculate_ebitda(self):
        """
        EBITDA (approximation) = Résultat + Amortissements + Intérêts

        Comptes:
        - Amortissements: 681
        - Intérêts: 67
        """
        net_income = self.calculate_net_income()

        # Dotations aux amortissements (compte 681)
        depreciation = abs(self._calculate_balance_by_account_pattern('681'))

        # Charges d'intérêts (compte 67)
        interest = abs(self._calculate_balance_by_account_pattern('67'))

        ebitda = net_income + depreciation + interest

        return ebitda

    # ==========================================================================
    # RATIOS FINANCIERS
    # ==========================================================================

    def calculate_working_capital(self):
        """
        Fonds de roulement = Capitaux permanents - Actif immobilisé
        = (Classe 1 + Dettes LT) - Classe 2
        """
        equity = self.calculate_equity()
        long_term_debt = abs(self._calculate_balance_by_account_pattern('16'))
        fixed_assets = abs(self._calculate_balance_by_class('2'))

        working_capital = (equity + long_term_debt) - fixed_assets

        return working_capital

    def calculate_current_ratio(self):
        """
        Ratio de liquidité générale = Actif circulant / Passif circulant
        """
        # Actif circulant = Stocks + Créances + Trésorerie
        current_assets = abs(self._calculate_balance_by_class('3'))  # Stocks
        current_assets += abs(max(self._calculate_balance_by_account_pattern('41'), Decimal('0')))  # Clients
        current_assets += abs(self._calculate_balance_by_class('5'))  # Trésorerie

        # Passif circulant = Dettes à court terme
        current_liabilities = abs(min(self._calculate_balance_by_account_pattern('40'), Decimal('0')))  # Fournisseurs

        if current_liabilities == 0:
            return Decimal('0')

        return current_assets / current_liabilities

    def calculate_quick_ratio(self):
        """
        Ratio de liquidité réduite = (Actif circulant - Stocks) / Passif circulant
        """
        # Actif circulant sans stocks
        quick_assets = abs(max(self._calculate_balance_by_account_pattern('41'), Decimal('0')))  # Clients
        quick_assets += abs(self._calculate_balance_by_class('5'))  # Trésorerie

        # Passif circulant
        current_liabilities = abs(min(self._calculate_balance_by_account_pattern('40'), Decimal('0')))  # Fournisseurs

        if current_liabilities == 0:
            return Decimal('0')

        return quick_assets / current_liabilities

    def calculate_debt_to_equity(self):
        """
        Ratio d'endettement = Total Dettes / Capitaux propres
        """
        total_debt = self.calculate_total_liabilities()
        equity = self.calculate_equity()

        if equity == 0:
            return Decimal('0')

        return total_debt / equity

    def calculate_roe(self):
        """
        ROE (Return on Equity) = Résultat Net / Capitaux propres × 100
        """
        net_income = self.calculate_net_income()
        equity = self.calculate_equity()

        if equity == 0:
            return Decimal('0')

        return (net_income / equity) * 100

    def calculate_roa(self):
        """
        ROA (Return on Assets) = Résultat Net / Total Actif × 100
        """
        net_income = self.calculate_net_income()
        total_assets = self.calculate_total_assets()

        if total_assets == 0:
            return Decimal('0')

        return (net_income / total_assets) * 100

    # ==========================================================================
    # CRÉANCES & DETTES
    # ==========================================================================

    def calculate_receivables(self):
        """
        Créances clients = Compte 411 (Clients)
        """
        return max(self._calculate_balance_by_account_pattern('411'), Decimal('0'))

    def calculate_payables(self):
        """
        Dettes fournisseurs = Compte 401 (Fournisseurs)
        """
        return abs(min(self._calculate_balance_by_account_pattern('401'), Decimal('0')))

    # ==========================================================================
    # MÉTHODE PRINCIPALE
    # ==========================================================================

    def calculate_all_metrics(self):
        """
        Calcule toutes les métriques financières en une seule fois.
        Optimisé pour minimiser les requêtes DB.
        """
        return {
            # Balance Sheet
            'total_assets': float(self.calculate_total_assets()),
            'total_liabilities': float(self.calculate_total_liabilities()),
            'equity': float(self.calculate_equity()),
            'cash_position': float(self.calculate_cash_position()),
            'working_capital': float(self.calculate_working_capital()),

            # Income Statement
            'revenue': float(self.calculate_revenue()),
            'expenses': float(self.calculate_expenses()),
            'net_income': float(self.calculate_net_income()),
            'ebitda': float(self.calculate_ebitda()),

            # Ratios
            'current_ratio': float(self.calculate_current_ratio()),
            'quick_ratio': float(self.calculate_quick_ratio()),
            'debt_to_equity': float(self.calculate_debt_to_equity()),
            'roe': float(self.calculate_roe()),
            'roa': float(self.calculate_roa()),

            # Receivables/Payables
            'receivables': float(self.calculate_receivables()),
            'payables': float(self.calculate_payables()),
        }
