"""
Tests unitaires pour decimal_utils
Validation des calculs financiers avec précision Decimal
"""
import pytest
from decimal import Decimal, ROUND_HALF_UP
from apps.treasury.utils import MoneyDecimal, InterestCalculator, ExchangeRateCalculator


class TestMoneyDecimal:
    """Tests pour la classe MoneyDecimal"""

    def test_from_value_with_decimal(self):
        """Test conversion depuis Decimal"""
        value = Decimal('123.45')
        result = MoneyDecimal.from_value(value)
        assert result == Decimal('123.45')

    def test_from_value_with_float(self):
        """Test conversion depuis float"""
        result = MoneyDecimal.from_value(123.45)
        assert result == Decimal('123.45')

    def test_from_value_with_int(self):
        """Test conversion depuis int"""
        result = MoneyDecimal.from_value(123)
        assert result == Decimal('123')

    def test_from_value_with_string(self):
        """Test conversion depuis string"""
        result = MoneyDecimal.from_value('123.45')
        assert result == Decimal('123.45')

    def test_from_value_with_none(self):
        """Test conversion depuis None"""
        result = MoneyDecimal.from_value(None)
        assert result == Decimal('0.00')

    def test_normalize_default_decimals(self):
        """Test normalisation avec 2 décimales par défaut"""
        result = MoneyDecimal.normalize('123.456')
        assert result == Decimal('123.46')  # Arrondi HALF_UP

    def test_normalize_custom_decimals(self):
        """Test normalisation avec décimales personnalisées"""
        result = MoneyDecimal.normalize('123.456789', decimals=4)
        assert result == Decimal('123.4568')

    def test_normalize_round_half_up(self):
        """Test arrondi bancaire HALF_UP"""
        # 0.5 arrondi vers le haut
        result = MoneyDecimal.normalize('10.105')
        assert result == Decimal('10.11')

        result = MoneyDecimal.normalize('10.115')
        assert result == Decimal('10.12')

    def test_add_multiple_values(self):
        """Test addition de plusieurs valeurs"""
        result = MoneyDecimal.add(10.10, 20.20, 30.30)
        assert result == Decimal('60.60')

    def test_add_with_precision(self):
        """Test addition avec précision (évite erreurs float)"""
        # Problème classique avec float: 0.1 + 0.2 = 0.30000000000000004
        result = MoneyDecimal.add(0.1, 0.2)
        assert result == Decimal('0.30')  # Exact !

    def test_subtract(self):
        """Test soustraction"""
        result = MoneyDecimal.subtract(100.50, 50.25)
        assert result == Decimal('50.25')

    def test_subtract_negative_result(self):
        """Test soustraction avec résultat négatif"""
        result = MoneyDecimal.subtract(50, 100)
        assert result == Decimal('-50.00')

    def test_multiply(self):
        """Test multiplication"""
        result = MoneyDecimal.multiply(10, 1.5)
        assert result == Decimal('15.00')

    def test_multiply_with_rounding(self):
        """Test multiplication avec arrondi"""
        result = MoneyDecimal.multiply(10.10, 1.05)
        assert result == Decimal('10.61')  # Pas 10.605000000000002

    def test_divide(self):
        """Test division"""
        result = MoneyDecimal.divide(100, 3)
        assert result == Decimal('33.33')

    def test_divide_by_zero(self):
        """Test division par zéro"""
        result = MoneyDecimal.divide(100, 0)
        assert result == Decimal('0.00')

    def test_percentage(self):
        """Test calcul de pourcentage"""
        # 20% de 100 = 20
        result = MoneyDecimal.percentage(100, 20)
        assert result == Decimal('20.00')

    def test_percentage_complex(self):
        """Test pourcentage complexe"""
        # 18.5% de 456.78
        result = MoneyDecimal.percentage(456.78, 18.5)
        assert result == Decimal('84.50')

    def test_sum_list(self):
        """Test somme d'une liste"""
        values = [10.10, 20.20, 30.30, 40.40]
        result = MoneyDecimal.sum_list(values)
        assert result == Decimal('101.00')

    def test_sum_list_empty(self):
        """Test somme liste vide"""
        result = MoneyDecimal.sum_list([])
        assert result == Decimal('0.00')

    def test_average(self):
        """Test moyenne"""
        values = [10, 20, 30, 40]
        result = MoneyDecimal.average(values)
        assert result == Decimal('25.00')

    def test_average_empty(self):
        """Test moyenne liste vide"""
        result = MoneyDecimal.average([])
        assert result == Decimal('0.00')

    def test_max_value(self):
        """Test valeur maximale"""
        result = MoneyDecimal.max_value(10, 50, 30, 20)
        assert result == Decimal('50')

    def test_min_value(self):
        """Test valeur minimale"""
        result = MoneyDecimal.min_value(10, 50, 30, 20)
        assert result == Decimal('10')

    def test_abs_value_positive(self):
        """Test valeur absolue (positif)"""
        result = MoneyDecimal.abs_value(50)
        assert result == Decimal('50')

    def test_abs_value_negative(self):
        """Test valeur absolue (négatif)"""
        result = MoneyDecimal.abs_value(-50)
        assert result == Decimal('50')

    def test_is_positive(self):
        """Test détection valeur positive"""
        assert MoneyDecimal.is_positive(10) is True
        assert MoneyDecimal.is_positive(0) is False
        assert MoneyDecimal.is_positive(-10) is False

    def test_is_negative(self):
        """Test détection valeur négative"""
        assert MoneyDecimal.is_negative(-10) is True
        assert MoneyDecimal.is_negative(0) is False
        assert MoneyDecimal.is_negative(10) is False

    def test_is_zero(self):
        """Test détection zéro"""
        assert MoneyDecimal.is_zero(0) is True
        assert MoneyDecimal.is_zero(0.00) is True
        assert MoneyDecimal.is_zero(0.01) is False

    def test_compare_less_than(self):
        """Test comparaison (<)"""
        result = MoneyDecimal.compare(10, 20)
        assert result == -1

    def test_compare_equal(self):
        """Test comparaison (=)"""
        result = MoneyDecimal.compare(20, 20)
        assert result == 0

    def test_compare_greater_than(self):
        """Test comparaison (>)"""
        result = MoneyDecimal.compare(30, 20)
        assert result == 1

    def test_to_float(self):
        """Test conversion en float"""
        result = MoneyDecimal.to_float(Decimal('123.45'))
        assert isinstance(result, float)
        assert result == 123.45

    def test_format_currency_xof(self):
        """Test formatage devise XOF"""
        result = MoneyDecimal.format_currency(1234567.89, 'XOF')
        assert result == "1 234 567,89 XOF"

    def test_format_currency_eur(self):
        """Test formatage devise EUR"""
        result = MoneyDecimal.format_currency(1234.56, 'EUR')
        assert result == "1 234,56 EUR"


class TestInterestCalculator:
    """Tests pour InterestCalculator"""

    def test_simple_interest(self):
        """Test calcul intérêts simples"""
        # Principal: 100000, Taux: 5%, Jours: 30
        # Intérêts = 100000 × 0.05 × (30/360) = 416.67
        result = InterestCalculator.simple_interest(
            principal=100000,
            rate=5,
            days=30
        )
        assert result == Decimal('416.67')

    def test_simple_interest_one_year(self):
        """Test intérêts simples sur 1 an"""
        # Principal: 10000, Taux: 10%, Jours: 360
        # Intérêts = 10000 × 0.10 × (360/360) = 1000
        result = InterestCalculator.simple_interest(
            principal=10000,
            rate=10,
            days=360
        )
        assert result == Decimal('1000.00')

    def test_compound_interest(self):
        """Test calcul intérêts composés"""
        # Principal: 1000, Taux: 5%, Périodes: 2
        # Montant final = 1000 × (1.05)^2 = 1102.50
        # Intérêts = 1102.50 - 1000 = 102.50
        result = InterestCalculator.compound_interest(
            principal=1000,
            rate=5,
            periods=2
        )
        assert result == Decimal('102.50')

    def test_compound_interest_no_periods(self):
        """Test intérêts composés avec 0 périodes"""
        result = InterestCalculator.compound_interest(
            principal=1000,
            rate=5,
            periods=0
        )
        assert result == Decimal('0.00')


class TestExchangeRateCalculator:
    """Tests pour ExchangeRateCalculator"""

    def test_convert(self):
        """Test conversion avec taux de change"""
        # 100 EUR × 655.957 = 65595.70 XOF
        result = ExchangeRateCalculator.convert(
            amount=100,
            exchange_rate=655.957
        )
        assert result == Decimal('65595.70')

    def test_convert_with_decimals(self):
        """Test conversion avec décimales personnalisées"""
        result = ExchangeRateCalculator.convert(
            amount=100,
            exchange_rate=1.234567,
            decimals=4
        )
        assert result == Decimal('123.4567')

    def test_reverse_convert(self):
        """Test conversion inverse"""
        # 65595.70 XOF / 655.957 = 100 EUR
        result = ExchangeRateCalculator.reverse_convert(
            amount=65595.70,
            exchange_rate=655.957
        )
        assert result == Decimal('100.00')

    def test_reverse_convert_zero_rate(self):
        """Test conversion inverse avec taux = 0"""
        result = ExchangeRateCalculator.reverse_convert(
            amount=100,
            exchange_rate=0
        )
        assert result == Decimal('0.00')


class TestRealWorldScenarios:
    """Tests de scénarios réels"""

    def test_invoice_with_vat(self):
        """Test calcul facture avec TVA"""
        # Montant HT
        amount_ht = Decimal('1000.00')

        # TVA 20%
        vat_amount = MoneyDecimal.percentage(amount_ht, 20)
        assert vat_amount == Decimal('200.00')

        # Montant TTC
        amount_ttc = MoneyDecimal.add(amount_ht, vat_amount)
        assert amount_ttc == Decimal('1200.00')

    def test_payment_with_bank_fees(self):
        """Test paiement avec frais bancaires"""
        payment_amount = Decimal('50000.00')

        # Frais 0.5%
        fees = MoneyDecimal.percentage(payment_amount, 0.5)
        assert fees == Decimal('250.00')

        # Total à débiter
        total = MoneyDecimal.add(payment_amount, fees)
        assert total == Decimal('50250.00')

    def test_currency_conversion_roundtrip(self):
        """Test conversion devise aller-retour"""
        eur_amount = Decimal('100.00')
        eur_to_xof = Decimal('655.957')

        # EUR → XOF
        xof_amount = ExchangeRateCalculator.convert(eur_amount, eur_to_xof)
        assert xof_amount == Decimal('65595.70')

        # XOF → EUR (retour)
        eur_back = ExchangeRateCalculator.reverse_convert(xof_amount, eur_to_xof)
        assert eur_back == Decimal('100.00')

    def test_loan_interest_calculation(self):
        """Test calcul intérêts prêt"""
        principal = Decimal('100000.00')
        annual_rate = Decimal('12')  # 12% par an
        months = 12

        # Intérêts mensuels
        monthly_rate = MoneyDecimal.divide(annual_rate, 12)
        assert monthly_rate == Decimal('1.00')

        # Intérêts composés sur 12 mois
        total_interest = InterestCalculator.compound_interest(
            principal=principal,
            rate=monthly_rate,
            periods=months
        )

        # Vérifie que les intérêts sont cohérents
        assert total_interest > Decimal('12000.00')  # Plus que les intérêts simples
        assert total_interest < Decimal('13000.00')  # Moins du double


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
