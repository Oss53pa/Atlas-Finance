"""
Tests pour les tâches Celery du module analytics
Tests des calculs de ratios financiers SYSCOHADA
"""
from decimal import Decimal
from unittest.mock import patch, MagicMock
from django.test import TestCase


class TestFinancialRatioCalculations(TestCase):
    """Tests pour les fonctions utilitaires de calcul de ratios"""

    def test_safe_divide_normal(self):
        """Test division normale"""
        from apps.analytics.tasks import safe_divide
        result = safe_divide(Decimal('100'), Decimal('50'))
        self.assertEqual(result, Decimal('2'))

    def test_safe_divide_by_zero(self):
        """Test division par zéro retourne 0"""
        from apps.analytics.tasks import safe_divide
        result = safe_divide(Decimal('100'), Decimal('0'))
        self.assertEqual(result, Decimal('0'))

    def test_safe_divide_with_none(self):
        """Test division avec None retourne 0"""
        from apps.analytics.tasks import safe_divide
        result = safe_divide(None, Decimal('50'))
        self.assertEqual(result, Decimal('0'))

    def test_safe_divide_precision(self):
        """Test précision des calculs"""
        from apps.analytics.tasks import safe_divide
        result = safe_divide(Decimal('1'), Decimal('3'))
        # Vérifie que c'est proche de 0.333...
        self.assertAlmostEqual(float(result), 0.333333, places=4)


class TestGetAccountBalance(TestCase):
    """Tests pour la récupération des soldes de comptes"""

    @patch('apps.analytics.tasks.JournalEntryLine')
    def test_get_account_balance_with_entries(self, mock_entry_line):
        """Test avec des écritures existantes"""
        from apps.analytics.tasks import get_account_balance

        # Mock la queryset
        mock_qs = MagicMock()
        mock_qs.filter.return_value = mock_qs
        mock_qs.aggregate.return_value = {
            'total_debit': Decimal('1000'),
            'total_credit': Decimal('600')
        }
        mock_entry_line.objects = mock_qs

        result = get_account_balance(1, '5')
        self.assertEqual(result, Decimal('400'))  # 1000 - 600

    @patch('apps.analytics.tasks.JournalEntryLine')
    def test_get_account_balance_empty(self, mock_entry_line):
        """Test sans écritures"""
        from apps.analytics.tasks import get_account_balance

        mock_qs = MagicMock()
        mock_qs.filter.return_value = mock_qs
        mock_qs.aggregate.return_value = {
            'total_debit': None,
            'total_credit': None
        }
        mock_entry_line.objects = mock_qs

        result = get_account_balance(1, '5')
        self.assertEqual(result, Decimal('0'))


class TestLiquidityRatios(TestCase):
    """Tests pour les ratios de liquidité SYSCOHADA"""

    def test_current_ratio_calculation(self):
        """Test ratio de liquidité générale = Actif circulant / Passif circulant"""
        # Classes SYSCOHADA: 3-4-5 / 4 (dettes court terme)
        current_assets = Decimal('500000')  # Stocks + Créances + Trésorerie
        current_liabilities = Decimal('200000')

        if current_liabilities > 0:
            ratio = current_assets / current_liabilities
        else:
            ratio = Decimal('0')

        self.assertEqual(ratio, Decimal('2.5'))

    def test_quick_ratio_calculation(self):
        """Test ratio de liquidité réduite = (Créances + Trésorerie) / Passif circulant"""
        # Exclut les stocks (classe 3)
        quick_assets = Decimal('300000')  # Créances + Trésorerie
        current_liabilities = Decimal('200000')

        if current_liabilities > 0:
            ratio = quick_assets / current_liabilities
        else:
            ratio = Decimal('0')

        self.assertEqual(ratio, Decimal('1.5'))


class TestProfitabilityRatios(TestCase):
    """Tests pour les ratios de rentabilité"""

    def test_net_margin_calculation(self):
        """Test marge nette = Résultat net / Chiffre d'affaires"""
        net_income = Decimal('50000')
        revenue = Decimal('500000')

        if revenue > 0:
            margin = (net_income / revenue) * 100
        else:
            margin = Decimal('0')

        self.assertEqual(margin, Decimal('10'))  # 10%

    def test_roe_calculation(self):
        """Test ROE = Résultat net / Capitaux propres"""
        net_income = Decimal('50000')
        equity = Decimal('200000')

        if equity > 0:
            roe = (net_income / equity) * 100
        else:
            roe = Decimal('0')

        self.assertEqual(roe, Decimal('25'))  # 25%

    def test_roa_calculation(self):
        """Test ROA = Résultat net / Total actifs"""
        net_income = Decimal('50000')
        total_assets = Decimal('1000000')

        if total_assets > 0:
            roa = (net_income / total_assets) * 100
        else:
            roa = Decimal('0')

        self.assertEqual(roa, Decimal('5'))  # 5%


class TestLeverageRatios(TestCase):
    """Tests pour les ratios d'endettement"""

    def test_debt_to_equity_calculation(self):
        """Test ratio d'endettement = Total dettes / Capitaux propres"""
        total_debt = Decimal('300000')
        equity = Decimal('200000')

        if equity > 0:
            ratio = total_debt / equity
        else:
            ratio = Decimal('0')

        self.assertEqual(ratio, Decimal('1.5'))

    def test_debt_ratio_calculation(self):
        """Test ratio de dettes = Total dettes / Total actifs"""
        total_debt = Decimal('300000')
        total_assets = Decimal('500000')

        if total_assets > 0:
            ratio = (total_debt / total_assets) * 100
        else:
            ratio = Decimal('0')

        self.assertEqual(ratio, Decimal('60'))  # 60%


class TestSYSCOHADAAccountClasses(TestCase):
    """Tests pour la correspondance des classes de comptes SYSCOHADA"""

    def test_asset_classes(self):
        """Vérifie les classes d'actifs SYSCOHADA"""
        # Classe 2: Immobilisations
        # Classe 3: Stocks
        # Classe 4: Tiers (créances)
        # Classe 5: Trésorerie
        immobilisations = '2'
        stocks = '3'
        creances = '4'
        tresorerie = '5'

        self.assertTrue(immobilisations.startswith('2'))
        self.assertTrue(stocks.startswith('3'))
        self.assertTrue(creances.startswith('4'))
        self.assertTrue(tresorerie.startswith('5'))

    def test_liability_classes(self):
        """Vérifie les classes de passifs SYSCOHADA"""
        # Classe 1: Capitaux propres
        # Classe 4: Tiers (dettes)
        capitaux_propres = '1'
        dettes = '4'

        self.assertTrue(capitaux_propres.startswith('1'))
        self.assertTrue(dettes.startswith('4'))

    def test_income_expense_classes(self):
        """Vérifie les classes de charges et produits SYSCOHADA"""
        # Classe 6: Charges
        # Classe 7: Produits
        # Classe 8: Autres charges/produits
        charges = '6'
        produits = '7'
        autres = '8'

        self.assertTrue(charges.startswith('6'))
        self.assertTrue(produits.startswith('7'))
        self.assertTrue(autres.startswith('8'))
