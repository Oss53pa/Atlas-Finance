"""
Utilitaires pour gestion précise des Decimal
Calculs financiers avec précision maximale
"""
from decimal import Decimal, ROUND_HALF_UP, ROUND_DOWN, ROUND_UP, getcontext
from typing import Union, List

# Configuration globale de la précision Decimal
getcontext().prec = 28  # Précision de 28 chiffres significatifs


class MoneyDecimal:
    """
    Classe pour calculs monétaires avec précision garantie
    Utilise toujours 2 décimales pour les montants en XOF/EUR
    """

    @staticmethod
    def from_value(value: Union[int, float, str, Decimal]) -> Decimal:
        """
        Convertit une valeur en Decimal avec précision
        """
        if isinstance(value, Decimal):
            return value
        if value is None:
            return Decimal('0.00')

        # Conversion via string pour éviter les erreurs de précision float
        return Decimal(str(value))

    @staticmethod
    def normalize(value: Union[int, float, str, Decimal], decimals: int = 2) -> Decimal:
        """
        Normalise un montant avec le nombre de décimales spécifié
        Arrondi HALF_UP (bancaire)
        """
        decimal_value = MoneyDecimal.from_value(value)
        quantize_value = Decimal('0.01') if decimals == 2 else Decimal(10) ** -decimals
        return decimal_value.quantize(quantize_value, rounding=ROUND_HALF_UP)

    @staticmethod
    def add(*values: Union[int, float, str, Decimal]) -> Decimal:
        """Addition de plusieurs montants avec précision"""
        result = Decimal('0.00')
        for value in values:
            result += MoneyDecimal.from_value(value)
        return MoneyDecimal.normalize(result)

    @staticmethod
    def subtract(minuend: Union[int, float, str, Decimal],
                 subtrahend: Union[int, float, str, Decimal]) -> Decimal:
        """Soustraction avec précision"""
        result = MoneyDecimal.from_value(minuend) - MoneyDecimal.from_value(subtrahend)
        return MoneyDecimal.normalize(result)

    @staticmethod
    def multiply(value: Union[int, float, str, Decimal],
                 multiplier: Union[int, float, str, Decimal]) -> Decimal:
        """Multiplication avec précision"""
        result = MoneyDecimal.from_value(value) * MoneyDecimal.from_value(multiplier)
        return MoneyDecimal.normalize(result)

    @staticmethod
    def divide(dividend: Union[int, float, str, Decimal],
               divisor: Union[int, float, str, Decimal],
               rounding=ROUND_HALF_UP) -> Decimal:
        """Division avec précision"""
        if MoneyDecimal.from_value(divisor) == Decimal('0'):
            return Decimal('0.00')

        result = MoneyDecimal.from_value(dividend) / MoneyDecimal.from_value(divisor)
        return result.quantize(Decimal('0.01'), rounding=rounding)

    @staticmethod
    def percentage(value: Union[int, float, str, Decimal],
                   percent: Union[int, float, str, Decimal]) -> Decimal:
        """Calcul d'un pourcentage"""
        decimal_value = MoneyDecimal.from_value(value)
        decimal_percent = MoneyDecimal.from_value(percent)
        result = (decimal_value * decimal_percent) / Decimal('100')
        return MoneyDecimal.normalize(result)

    @staticmethod
    def sum_list(values: List[Union[int, float, str, Decimal]]) -> Decimal:
        """Somme d'une liste de valeurs"""
        result = Decimal('0.00')
        for value in values:
            result += MoneyDecimal.from_value(value)
        return MoneyDecimal.normalize(result)

    @staticmethod
    def average(values: List[Union[int, float, str, Decimal]]) -> Decimal:
        """Moyenne d'une liste de valeurs"""
        if not values:
            return Decimal('0.00')

        total = MoneyDecimal.sum_list(values)
        return MoneyDecimal.divide(total, len(values))

    @staticmethod
    def max_value(*values: Union[int, float, str, Decimal]) -> Decimal:
        """Maximum parmi plusieurs valeurs"""
        if not values:
            return Decimal('0.00')

        decimal_values = [MoneyDecimal.from_value(v) for v in values]
        return max(decimal_values)

    @staticmethod
    def min_value(*values: Union[int, float, str, Decimal]) -> Decimal:
        """Minimum parmi plusieurs valeurs"""
        if not values:
            return Decimal('0.00')

        decimal_values = [MoneyDecimal.from_value(v) for v in values]
        return min(decimal_values)

    @staticmethod
    def abs_value(value: Union[int, float, str, Decimal]) -> Decimal:
        """Valeur absolue"""
        return abs(MoneyDecimal.from_value(value))

    @staticmethod
    def is_positive(value: Union[int, float, str, Decimal]) -> bool:
        """Vérifie si une valeur est positive"""
        return MoneyDecimal.from_value(value) > Decimal('0.00')

    @staticmethod
    def is_negative(value: Union[int, float, str, Decimal]) -> bool:
        """Vérifie si une valeur est négative"""
        return MoneyDecimal.from_value(value) < Decimal('0.00')

    @staticmethod
    def is_zero(value: Union[int, float, str, Decimal]) -> bool:
        """Vérifie si une valeur est zéro"""
        return MoneyDecimal.from_value(value) == Decimal('0.00')

    @staticmethod
    def compare(value1: Union[int, float, str, Decimal],
                value2: Union[int, float, str, Decimal]) -> int:
        """
        Compare deux valeurs
        Retourne: -1 si value1 < value2, 0 si égales, 1 si value1 > value2
        """
        decimal1 = MoneyDecimal.from_value(value1)
        decimal2 = MoneyDecimal.from_value(value2)

        if decimal1 < decimal2:
            return -1
        elif decimal1 > decimal2:
            return 1
        else:
            return 0

    @staticmethod
    def to_float(value: Union[int, float, str, Decimal]) -> float:
        """Convertit en float pour API JSON (avec perte de précision)"""
        decimal_value = MoneyDecimal.normalize(value)
        return float(decimal_value)

    @staticmethod
    def format_currency(value: Union[int, float, str, Decimal],
                        currency: str = 'XOF',
                        locale: str = 'fr_FR') -> str:
        """
        Formate un montant en devise
        Exemple: 1234567.89 → "1 234 567,89 XOF"
        """
        decimal_value = MoneyDecimal.normalize(value)

        # Format français (espace comme séparateur de milliers, virgule pour décimales)
        amount_str = f"{decimal_value:,.2f}".replace(',', ' ').replace('.', ',')

        return f"{amount_str} {currency}"


class InterestCalculator:
    """Calculateur d'intérêts avec précision"""

    @staticmethod
    def simple_interest(principal: Decimal, rate: Decimal, days: int) -> Decimal:
        """
        Calcul d'intérêts simples
        Formule: Principal × Taux × (Jours / 360)
        """
        principal_dec = MoneyDecimal.from_value(principal)
        rate_dec = MoneyDecimal.from_value(rate) / Decimal('100')  # Taux en %
        days_dec = Decimal(str(days))

        interest = (principal_dec * rate_dec * days_dec) / Decimal('360')
        return MoneyDecimal.normalize(interest)

    @staticmethod
    def compound_interest(principal: Decimal, rate: Decimal, periods: int) -> Decimal:
        """
        Calcul d'intérêts composés
        Formule: Principal × (1 + Taux)^Périodes - Principal
        """
        principal_dec = MoneyDecimal.from_value(principal)
        rate_dec = MoneyDecimal.from_value(rate) / Decimal('100')
        periods_dec = Decimal(str(periods))

        # Calcul avec puissance
        multiplier = (Decimal('1') + rate_dec) ** periods_dec
        final_amount = principal_dec * multiplier
        interest = final_amount - principal_dec

        return MoneyDecimal.normalize(interest)


class ExchangeRateCalculator:
    """Calculateur de taux de change avec précision"""

    @staticmethod
    def convert(amount: Decimal, exchange_rate: Decimal, decimals: int = 2) -> Decimal:
        """
        Convertit un montant avec un taux de change
        """
        amount_dec = MoneyDecimal.from_value(amount)
        rate_dec = MoneyDecimal.from_value(exchange_rate)

        result = amount_dec * rate_dec
        return MoneyDecimal.normalize(result, decimals=decimals)

    @staticmethod
    def reverse_convert(amount: Decimal, exchange_rate: Decimal, decimals: int = 2) -> Decimal:
        """
        Conversion inverse (division par le taux)
        """
        amount_dec = MoneyDecimal.from_value(amount)
        rate_dec = MoneyDecimal.from_value(exchange_rate)

        if rate_dec == Decimal('0'):
            return Decimal('0.00')

        result = amount_dec / rate_dec
        return MoneyDecimal.normalize(result, decimals=decimals)


# Exports principaux
__all__ = [
    'MoneyDecimal',
    'InterestCalculator',
    'ExchangeRateCalculator'
]
