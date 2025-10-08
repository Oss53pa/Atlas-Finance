"""
Serializers pour le module Analyse Financière WiseBook
États financiers, SIG, ratios et TAFIRE SYSCOHADA
"""
from rest_framework import serializers
from decimal import Decimal
from django.db import transaction

from .models import (
    FinancialAnalysisConfiguration,
    TAFIREStatement,
    SIG,
    FunctionalBalanceSheet,
    CashFlowScenario,
    RatioFinancier
)
from apps.reporting.models.financial_statements import (
    BalanceSYSCOHADA,
    CompteResultatSYSCOHADA,
    TableauFluxTresorerieSYSCOHADA,
    FinancialStatementsSet
)


class FinancialAnalysisConfigurationSerializer(serializers.ModelSerializer):
    """Serializer pour la configuration d'analyse financière"""

    class Meta:
        model = FinancialAnalysisConfiguration
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at', 'last_calculation')


class BalanceSYSCOHADASerializer(serializers.ModelSerializer):
    """Serializer pour le Bilan SYSCOHADA"""

    # Champs calculés en lecture seule
    total_assets_calculated = serializers.SerializerMethodField()
    total_liabilities_calculated = serializers.SerializerMethodField()
    equity_ratio = serializers.SerializerMethodField()
    debt_ratio = serializers.SerializerMethodField()

    class Meta:
        model = BalanceSYSCOHADA
        fields = '__all__'
        read_only_fields = (
            'id', 'calculation_date',
            'intangible_assets_net', 'tangible_assets_net', 'financial_assets_net',
            'stocks_net', 'receivables_net',
            'total_fixed_assets', 'total_current_assets', 'total_treasury_assets',
            'total_assets', 'total_equity', 'total_financial_debts',
            'total_current_liabilities', 'total_treasury_liabilities', 'total_liabilities',
            'is_balanced', 'balance_difference'
        )

    def get_total_assets_calculated(self, obj):
        """Retourne le total actif calculé"""
        return obj.total_assets

    def get_total_liabilities_calculated(self, obj):
        """Retourne le total passif calculé"""
        return obj.total_liabilities

    def get_equity_ratio(self, obj):
        """Calcule le ratio d'autonomie financière"""
        if obj.total_liabilities > 0:
            return round(float(obj.total_equity / obj.total_liabilities * 100), 2)
        return 0

    def get_debt_ratio(self, obj):
        """Calcule le ratio d'endettement"""
        if obj.total_equity > 0:
            return round(float(obj.total_financial_debts / obj.total_equity * 100), 2)
        return 0

    def validate(self, data):
        """Validation des données du bilan"""
        # Vérification que les valeurs brutes >= amortissements/provisions
        if data.get('intangible_assets_gross', 0) < data.get('intangible_assets_depreciation', 0):
            raise serializers.ValidationError(
                "Les amortissements des immobilisations incorporelles ne peuvent pas être supérieurs à la valeur brute"
            )

        if data.get('tangible_assets_gross', 0) < data.get('tangible_assets_depreciation', 0):
            raise serializers.ValidationError(
                "Les amortissements des immobilisations corporelles ne peuvent pas être supérieurs à la valeur brute"
            )

        return data


class CompteResultatSYSCOHADASerializer(serializers.ModelSerializer):
    """Serializer pour le Compte de Résultat SYSCOHADA"""

    # Métriques calculées
    gross_margin = serializers.SerializerMethodField()
    operating_margin = serializers.SerializerMethodField()
    net_margin = serializers.SerializerMethodField()
    revenue_total = serializers.SerializerMethodField()

    class Meta:
        model = CompteResultatSYSCOHADA
        fields = '__all__'
        read_only_fields = (
            'id', 'calculation_date', 'total_expenses', 'total_income', 'calculated_net_result'
        )

    def get_gross_margin(self, obj):
        """Calcule la marge brute commerciale"""
        return obj.merchandise_sales - obj.merchandise_purchases

    def get_operating_margin(self, obj):
        """Calcule la marge d'exploitation"""
        total_operating_income = (
            obj.merchandise_sales + obj.production_sold +
            obj.operating_subsidies + obj.other_operating_income
        )
        total_operating_expenses = (
            obj.merchandise_purchases + obj.raw_materials_purchases +
            obj.other_purchases + obj.external_services +
            obj.taxes_and_duties + obj.staff_costs + obj.other_operating_expenses
        )
        return total_operating_income - total_operating_expenses

    def get_net_margin(self, obj):
        """Calcule la marge nette"""
        return obj.calculated_net_result

    def get_revenue_total(self, obj):
        """Calcule le chiffre d'affaires total"""
        return obj.merchandise_sales + obj.production_sold


class TableauFluxTresorerieSYSCOHADASerializer(serializers.ModelSerializer):
    """Serializer pour le Tableau de Flux de Trésorerie SYSCOHADA"""

    # Ratios de flux
    operating_cash_margin = serializers.SerializerMethodField()
    cash_conversion_ratio = serializers.SerializerMethodField()
    free_cash_flow = serializers.SerializerMethodField()

    class Meta:
        model = TableauFluxTresorerieSYSCOHADA
        fields = '__all__'
        read_only_fields = (
            'id', 'calculation_date',
            'self_financing_capacity', 'operating_cash_flow',
            'investment_cash_flow', 'financing_cash_flow',
            'cash_flow_variation', 'cash_variation_control',
            'is_cash_flow_balanced'
        )

    def get_operating_cash_margin(self, obj):
        """Calcul de la marge de flux opérationnel"""
        # Nécessite le CA depuis le compte de résultat associé
        return 0  # À implémenter avec relation

    def get_cash_conversion_ratio(self, obj):
        """Ratio de conversion cash"""
        if obj.net_result_for_cash_flow != 0:
            return round(float(obj.operating_cash_flow / obj.net_result_for_cash_flow), 2)
        return 0

    def get_free_cash_flow(self, obj):
        """Free Cash Flow = Flux d'exploitation + Flux d'investissement"""
        return obj.operating_cash_flow + obj.investment_cash_flow


class SIGSerializer(serializers.ModelSerializer):
    """Serializer pour les Soldes Intermédiaires de Gestion"""

    # Évolution par rapport à l'exercice précédent
    evolution_data = serializers.SerializerMethodField()

    class Meta:
        model = SIG
        fields = '__all__'
        read_only_fields = (
            'id', 'calculation_date',
            'commercial_margin', 'period_production', 'added_value',
            'gross_operating_surplus', 'operating_result', 'financial_result',
            'current_result_before_tax', 'exceptional_result', 'final_net_result',
            'added_value_rate', 'operating_margin_rate', 'net_margin_rate',
            'calculation_time_ms'
        )

    def get_evolution_data(self, obj):
        """Données d'évolution des SIG"""
        # Récupération du SIG de l'exercice précédent
        try:
            previous_sig = SIG.objects.filter(
                company=obj.company,
                calculation_date__lt=obj.calculation_date
            ).order_by('-calculation_date').first()

            if previous_sig:
                return {
                    'previous_period': previous_sig.calculation_date.isoformat(),
                    'commercial_margin_evolution': float(obj.commercial_margin - previous_sig.commercial_margin),
                    'added_value_evolution': float(obj.added_value - previous_sig.added_value),
                    'operating_result_evolution': float(obj.operating_result - previous_sig.operating_result),
                    'net_result_evolution': float(obj.final_net_result - previous_sig.final_net_result)
                }
        except:
            pass

        return None


class FunctionalBalanceSheetSerializer(serializers.ModelSerializer):
    """Serializer pour le Bilan Fonctionnel"""

    # Ratios fonctionnels calculés
    financial_structure_ratios = serializers.SerializerMethodField()
    working_capital_analysis = serializers.SerializerMethodField()

    class Meta:
        model = FunctionalBalanceSheet
        fields = '__all__'
        read_only_fields = (
            'id', 'calculation_date',
            'stable_uses', 'stable_resources', 'working_capital_fund',
            'operating_current_assets', 'operating_current_liabilities',
            'operating_working_capital_need', 'non_operating_working_capital_need',
            'total_working_capital_need', 'net_treasury',
            'frng_coverage_ratio', 'bfr_rotation_days', 'treasury_autonomy_days',
            'calculation_time_ms'
        )

    def get_financial_structure_ratios(self, obj):
        """Ratios de structure financière"""
        ratios = {}

        if obj.stable_uses > 0:
            ratios['frng_coverage'] = round(float(obj.working_capital_fund / obj.stable_uses * 100), 2)

        if obj.stable_resources > 0:
            ratios['equity_financing'] = round(float(obj.equity_capital / obj.stable_resources * 100), 2)
            ratios['debt_financing'] = round(float(obj.financial_debts_long_term / obj.stable_resources * 100), 2)

        return ratios

    def get_working_capital_analysis(self, obj):
        """Analyse du besoin en fonds de roulement"""
        analysis = {
            'frng_status': 'positive' if obj.working_capital_fund > 0 else 'negative',
            'bfr_status': 'positive' if obj.total_working_capital_need > 0 else 'negative',
            'treasury_status': 'positive' if obj.net_treasury > 0 else 'negative'
        }

        # Équilibre financier
        if obj.working_capital_fund > obj.total_working_capital_need:
            analysis['financial_equilibrium'] = 'healthy'
        elif obj.working_capital_fund > 0:
            analysis['financial_equilibrium'] = 'acceptable'
        else:
            analysis['financial_equilibrium'] = 'risky'

        return analysis


class RatioFinancierSerializer(serializers.ModelSerializer):
    """Serializer pour les Ratios Financiers"""

    # Interprétation automatique
    ratio_interpretation = serializers.SerializerMethodField()
    benchmark_comparison = serializers.SerializerMethodField()

    class Meta:
        model = RatioFinancier
        fields = '__all__'
        read_only_fields = ('id', 'calculation_date', 'data_quality_score')

    def get_ratio_interpretation(self, obj):
        """Interprétation automatique du ratio"""
        interpretations = {
            'AUTONOMIE_FINANCIERE': {
                'excellent': (50, 100),
                'bon': (30, 50),
                'moyen': (15, 30),
                'faible': (0, 15)
            },
            'LIQUIDITE_GENERALE': {
                'excellent': (2, 10),
                'bon': (1.5, 2),
                'moyen': (1, 1.5),
                'faible': (0, 1)
            },
            'RENTABILITE_ECONOMIQUE': {
                'excellent': (15, 100),
                'bon': (10, 15),
                'moyen': (5, 10),
                'faible': (0, 5)
            }
        }

        ratio_thresholds = interpretations.get(obj.type_ratio, {})
        value = float(obj.valeur)

        for level, (min_val, max_val) in ratio_thresholds.items():
            if min_val <= value < max_val:
                return level

        return 'non_classé'

    def get_benchmark_comparison(self, obj):
        """Comparaison avec les benchmarks"""
        comparison = {}

        if obj.valeur_reference:
            diff = float(obj.valeur - obj.valeur_reference)
            comparison['vs_reference'] = {
                'difference': diff,
                'performance': 'above' if diff > 0 else 'below' if diff < 0 else 'equal'
            }

        if obj.benchmark_sector_value:
            diff = float(obj.valeur - obj.benchmark_sector_value)
            comparison['vs_sector'] = {
                'difference': diff,
                'performance': 'above' if diff > 0 else 'below' if diff < 0 else 'equal',
                'percentile': obj.sector_percentile
            }

        return comparison


class CashFlowScenarioSerializer(serializers.ModelSerializer):
    """Serializer pour les Scénarios de Cash Flow"""

    # Métriques de risque
    risk_metrics = serializers.SerializerMethodField()
    scenario_summary = serializers.SerializerMethodField()

    class Meta:
        model = CashFlowScenario
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at', 'last_updated')

    def get_risk_metrics(self, obj):
        """Métriques de risque du scénario"""
        return {
            'volatility': float(obj.cash_flow_volatility),
            'minimum_position': float(obj.minimum_cash_position),
            'runway_months': float(obj.cash_runway_months),
            'confidence_level': float(obj.confidence_level)
        }

    def get_scenario_summary(self, obj):
        """Résumé du scénario"""
        period_months = (obj.end_date - obj.start_date).days / 30.44

        return {
            'period_months': round(period_months, 1),
            'average_monthly_flow': float(obj.average_monthly_cash_flow),
            'total_projected_flow': float(obj.average_monthly_cash_flow * Decimal(str(period_months))),
            'scenario_type_display': obj.get_scenario_type_display(),
            'status_display': obj.get_status_display()
        }


class FinancialStatementsSetSerializer(serializers.ModelSerializer):
    """Serializer pour l'ensemble complet des états financiers"""

    # États financiers détaillés
    balance_sheet_detail = BalanceSYSCOHADASerializer(source='balance_sheet', read_only=True)
    income_statement_detail = CompteResultatSYSCOHADASerializer(source='income_statement', read_only=True)
    cash_flow_statement_detail = TableauFluxTresorerieSYSCOHADASerializer(source='cash_flow_statement', read_only=True)

    # Analyses consolidées
    consolidated_analysis = serializers.SerializerMethodField()
    consistency_report = serializers.SerializerMethodField()

    class Meta:
        model = FinancialStatementsSet
        fields = '__all__'
        read_only_fields = (
            'id', 'preparation_date', 'all_statements_validated',
            'balance_sheet_detail', 'income_statement_detail', 'cash_flow_statement_detail'
        )

    def get_consolidated_analysis(self, obj):
        """Analyse consolidée des états financiers"""
        analysis = {}

        if obj.balance_sheet and obj.income_statement:
            # Calcul des ratios principaux
            total_assets = obj.balance_sheet.total_assets
            revenue = obj.income_statement.merchandise_sales + obj.income_statement.production_sold
            net_result = obj.income_statement.calculated_net_result
            equity = obj.balance_sheet.total_equity

            if total_assets > 0:
                analysis['roa'] = round(float(net_result / total_assets * 100), 2)  # ROA

            if equity > 0:
                analysis['roe'] = round(float(net_result / equity * 100), 2)  # ROE

            if revenue > 0:
                analysis['net_margin'] = round(float(net_result / revenue * 100), 2)  # Marge nette
                analysis['asset_turnover'] = round(float(revenue / total_assets), 2)  # Rotation actifs

        return analysis

    def get_consistency_report(self, obj):
        """Rapport de cohérence entre les états"""
        return obj.inter_statements_consistency

    @transaction.atomic
    def create(self, validated_data):
        """Création d'un jeu d'états financiers complet"""
        # Cette méthode peut être étendue pour créer automatiquement
        # les états liés si nécessaire
        return super().create(validated_data)

    def validate(self, data):
        """Validation de la cohérence des états financiers"""
        if 'balance_sheet' in data and 'income_statement' in data:
            balance_sheet = data['balance_sheet']
            income_statement = data['income_statement']

            # Vérification que les dates correspondent
            if hasattr(balance_sheet, 'statement_date') and hasattr(income_statement, 'statement_date'):
                if balance_sheet.statement_date != income_statement.statement_date:
                    raise serializers.ValidationError(
                        "Les dates d'arrêté du bilan et du compte de résultat doivent être identiques"
                    )

        return data


# Serializers spécialisés pour les APIs de création/calcul

class FinancialStatementCalculationSerializer(serializers.Serializer):
    """Serializer pour déclencher le calcul des états financiers"""

    statement_date = serializers.DateField()
    calculation_method = serializers.ChoiceField(
        choices=[('AUTO', 'Automatique'), ('MANUAL', 'Manuel')],
        default='AUTO'
    )
    include_sig = serializers.BooleanField(default=True)
    include_functional_balance = serializers.BooleanField(default=True)
    include_ratios = serializers.BooleanField(default=True)

    def validate_statement_date(self, value):
        """Validation de la date d'arrêté"""
        from django.utils import timezone

        if value > timezone.now().date():
            raise serializers.ValidationError("La date d'arrêté ne peut pas être dans le futur")

        return value


class RatioCalculationRequestSerializer(serializers.Serializer):
    """Serializer pour le calcul de ratios financiers"""

    ratio_categories = serializers.MultipleChoiceField(
        choices=RatioFinancier.RATIO_CATEGORIES,
        default=['STRUCTURE', 'LIQUIDITE', 'RENTABILITE']
    )
    include_benchmarks = serializers.BooleanField(default=True)
    reference_period = serializers.DateField(required=False)
    sector_comparison = serializers.BooleanField(default=False)

    def validate(self, data):
        """Validation des paramètres de calcul"""
        if data.get('sector_comparison') and not data.get('include_benchmarks'):
            raise serializers.ValidationError(
                "La comparaison sectorielle nécessite l'inclusion des benchmarks"
            )

        return data