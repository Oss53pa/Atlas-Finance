"""
Serializers pour l'API d'Analyse Financière Avancée
TAFIRE, SIG, Bilan Fonctionnel et Ratios SYSCOHADA
"""
from rest_framework import serializers
from apps.financial_analysis.models import (
    TAFIREStatement, SIG, FunctionalBalanceSheet, 
    RatioFinancier, CashFlowScenario, FinancialAnalysisConfiguration
)
from apps.accounting.serializers import CompanySerializer, FiscalYearSerializer


class TAFIRESerializer(serializers.ModelSerializer):
    """
    Serializer pour les tableaux TAFIRE
    """
    company = CompanySerializer(read_only=True)
    fiscal_year = FiscalYearSerializer(read_only=True)
    
    # Champs calculés
    total_operating_flow = serializers.SerializerMethodField()
    total_investment_flow = serializers.SerializerMethodField()
    total_financing_flow = serializers.SerializerMethodField()
    cash_flow_quality_score = serializers.SerializerMethodField()
    
    class Meta:
        model = TAFIREStatement
        fields = [
            'id', 'company', 'fiscal_year', 'statement_date', 'calculation_method',
            
            # Flux d'exploitation
            'net_income', 'depreciation_provisions', 'provisions_reversal',
            'exceptional_items', 'self_financing_capacity', 'working_capital_variation',
            'operating_cash_surplus', 'total_operating_flow',
            
            # Flux d'investissement
            'fixed_assets_acquisitions', 'fixed_assets_disposals',
            'financial_investments_variation', 'investment_subsidies_received',
            'investment_cash_flow', 'total_investment_flow',
            
            # Flux de financement
            'capital_increase', 'new_borrowings', 'loan_repayments',
            'dividends_paid', 'financing_cash_flow', 'total_financing_flow',
            
            # Trésorerie
            'opening_cash_balance', 'closing_cash_balance', 'cash_variation',
            'free_cash_flow', 'operating_cash_flow_margin',
            
            # Métadonnées
            'calculation_date', 'calculation_time_ms', 'data_sources',
            'is_validated', 'validated_by', 'validation_date',
            'cash_flow_quality_score'
        ]
        read_only_fields = [
            'id', 'calculation_date', 'self_financing_capacity',
            'operating_cash_surplus', 'investment_cash_flow', 
            'financing_cash_flow', 'cash_variation', 'free_cash_flow',
            'operating_cash_flow_margin'
        ]
    
    def get_total_operating_flow(self, obj):
        """Flux d'exploitation total"""
        return float(obj.operating_cash_surplus)
    
    def get_total_investment_flow(self, obj):
        """Flux d'investissement total"""
        return float(obj.investment_cash_flow)
    
    def get_total_financing_flow(self, obj):
        """Flux de financement total"""
        return float(obj.financing_cash_flow)
    
    def get_cash_flow_quality_score(self, obj):
        """Score qualité du cash flow (0-100)"""
        score = 50
        
        # Bonus pour CAF positive
        if obj.self_financing_capacity > 0:
            score += 25
        
        # Bonus pour Free Cash Flow positif
        if obj.free_cash_flow > 0:
            score += 20
        
        # Bonus pour variation trésorerie positive
        if obj.cash_variation > 0:
            score += 5
        
        return min(100, score)


class SIGSerializer(serializers.ModelSerializer):
    """
    Serializer pour les Soldes Intermédiaires de Gestion
    """
    company = CompanySerializer(read_only=True)
    fiscal_year = FiscalYearSerializer(read_only=True)
    
    # Analyses dérivées
    profitability_analysis = serializers.SerializerMethodField()
    margin_structure = serializers.SerializerMethodField()
    
    class Meta:
        model = SIG
        fields = [
            'id', 'company', 'fiscal_year', 'calculation_date', 'period_end_date',
            
            # Soldes SYSCOHADA
            'merchandise_sales', 'merchandise_cost', 'commercial_margin',
            'production_sold', 'production_stored', 'production_immobilized', 'period_production',
            'intermediate_consumption', 'added_value',
            'operating_subsidies', 'staff_costs', 'taxes_and_duties', 'gross_operating_surplus',
            'other_operating_income', 'depreciation_provisions_dotations', 'other_operating_expenses', 'operating_result',
            'financial_income', 'financial_expenses', 'financial_result',
            'current_result_before_tax',
            'exceptional_income', 'exceptional_expenses', 'exceptional_result',
            'income_tax', 'final_net_result',
            
            # Taux
            'added_value_rate', 'operating_margin_rate', 'net_margin_rate',
            'revenue_base', 'calculation_time_ms',
            
            # Analyses
            'profitability_analysis', 'margin_structure'
        ]
        read_only_fields = [
            'id', 'calculation_date', 'commercial_margin', 'period_production',
            'added_value', 'gross_operating_surplus', 'operating_result',
            'financial_result', 'current_result_before_tax', 'exceptional_result',
            'final_net_result', 'added_value_rate', 'operating_margin_rate', 'net_margin_rate'
        ]
    
    def get_profitability_analysis(self, obj):
        """Analyse de rentabilité"""
        return {
            'profitability_level': 'HIGH' if obj.net_margin_rate > 10 else 'MEDIUM' if obj.net_margin_rate > 5 else 'LOW',
            'operating_efficiency': 'GOOD' if obj.operating_margin_rate > 15 else 'AVERAGE' if obj.operating_margin_rate > 8 else 'POOR',
            'value_creation': 'STRONG' if obj.added_value_rate > 45 else 'MODERATE' if obj.added_value_rate > 35 else 'WEAK'
        }
    
    def get_margin_structure(self, obj):
        """Structure des marges"""
        total_revenue = obj.revenue_base or 1
        return {
            'commercial_margin_pct': float((obj.commercial_margin / total_revenue) * 100),
            'added_value_pct': float(obj.added_value_rate),
            'ebe_pct': float((obj.gross_operating_surplus / total_revenue) * 100),
            'operating_result_pct': float(obj.operating_margin_rate),
            'net_result_pct': float(obj.net_margin_rate)
        }


class FunctionalBalanceSerializer(serializers.ModelSerializer):
    """
    Serializer pour le Bilan Fonctionnel
    """
    company = CompanySerializer(read_only=True)
    fiscal_year = FiscalYearSerializer(read_only=True)
    
    # Analyses calculées
    equilibrium_analysis = serializers.SerializerMethodField()
    structure_quality = serializers.SerializerMethodField()
    
    class Meta:
        model = FunctionalBalanceSheet
        fields = [
            'id', 'company', 'fiscal_year', 'statement_date', 'calculation_date',
            
            # Structure fonctionnelle
            'gross_fixed_assets', 'deferred_charges', 'stable_uses',
            'equity_capital', 'depreciation_provisions_total', 'financial_debts_long_term', 'stable_resources',
            'working_capital_fund',
            
            # BFR
            'operating_inventory', 'operating_receivables', 'operating_prepaid_expenses', 'operating_current_assets',
            'operating_payables', 'operating_deferred_income', 'operating_current_liabilities',
            'operating_working_capital_need',
            'non_operating_current_assets', 'non_operating_current_liabilities', 'non_operating_working_capital_need',
            'total_working_capital_need',
            
            # Trésorerie
            'active_treasury', 'passive_treasury', 'net_treasury',
            
            # Ratios
            'frng_coverage_ratio', 'bfr_rotation_days', 'treasury_autonomy_days',
            'revenue_base', 'calculation_time_ms', 'data_sources',
            
            # Validation
            'is_validated', 'validated_by', 'validation_date',
            
            # Analyses
            'equilibrium_analysis', 'structure_quality'
        ]
        read_only_fields = [
            'id', 'calculation_date', 'stable_uses', 'stable_resources',
            'working_capital_fund', 'operating_current_assets', 'operating_current_liabilities',
            'operating_working_capital_need', 'non_operating_working_capital_need',
            'total_working_capital_need', 'net_treasury', 'frng_coverage_ratio',
            'bfr_rotation_days', 'treasury_autonomy_days'
        ]
    
    def get_equilibrium_analysis(self, obj):
        """Analyse de l'équilibre financier"""
        frng = obj.working_capital_fund
        bfr = obj.total_working_capital_need
        tn = obj.net_treasury
        
        if frng > 0 and bfr > 0 and tn > 0:
            equilibrium_type = "EQUILIBRE_SAIN"
        elif frng > 0 and bfr > 0 and tn < 0:
            equilibrium_type = "EQUILIBRE_PRECAIRE"
        elif frng > 0 and bfr < 0 and tn > 0:
            equilibrium_type = "EQUILIBRE_EXCELLENT"
        elif frng < 0:
            equilibrium_type = "DESEQUILIBRE"
        else:
            equilibrium_type = "EQUILIBRE_ATYPIQUE"
        
        return {
            'type': equilibrium_type,
            'frng_status': 'POSITIVE' if frng > 0 else 'NEGATIVE',
            'bfr_status': 'NORMAL' if obj.bfr_rotation_days and obj.bfr_rotation_days < 60 else 'HIGH',
            'treasury_status': 'POSITIVE' if tn > 0 else 'NEGATIVE',
            'global_assessment': 'GOOD' if equilibrium_type in ['EQUILIBRE_SAIN', 'EQUILIBRE_EXCELLENT'] else 'ATTENTION'
        }
    
    def get_structure_quality(self, obj):
        """Qualité de la structure financière"""
        score = 100
        
        # Pénalités
        if obj.working_capital_fund < 0:
            score -= 40
        if obj.net_treasury < 0:
            score -= 25
        if obj.frng_coverage_ratio < 100:
            score -= 20
        if obj.bfr_rotation_days and obj.bfr_rotation_days > 90:
            score -= 15
        
        return {
            'score': max(0, score),
            'coverage_adequacy': 'GOOD' if obj.frng_coverage_ratio >= 100 else 'INSUFFICIENT',
            'bfr_efficiency': 'GOOD' if obj.bfr_rotation_days and obj.bfr_rotation_days < 45 else 'AVERAGE',
            'treasury_safety': 'GOOD' if obj.treasury_autonomy_days and obj.treasury_autonomy_days > 15 else 'LOW'
        }


class RatioSerializer(serializers.ModelSerializer):
    """
    Serializer pour les Ratios Financiers
    """
    company = CompanySerializer(read_only=True)
    fiscal_year = FiscalYearSerializer(read_only=True)
    
    # Analyses
    performance_vs_reference = serializers.SerializerMethodField()
    performance_vs_sector = serializers.SerializerMethodField()
    trend_analysis = serializers.SerializerMethodField()
    
    class Meta:
        model = RatioFinancier
        fields = [
            'id', 'company', 'fiscal_year', 'category', 'type_ratio', 'libelle',
            'valeur', 'unite', 'numerateur', 'denominateur', 'formule',
            'valeur_reference', 'ecart_reference',
            'valeur_n1', 'variation_absolue', 'variation_relative',
            'benchmark_sector_value', 'sector_percentile',
            'interpretation', 'alerte', 'niveau_alerte',
            'calculation_date', 'calculation_method', 'data_quality_score',
            
            # Analyses
            'performance_vs_reference', 'performance_vs_sector', 'trend_analysis'
        ]
        read_only_fields = ['id', 'calculation_date']
    
    def get_performance_vs_reference(self, obj):
        """Performance vs référence"""
        if not obj.valeur_reference:
            return None
        
        performance_ratio = float(obj.valeur / obj.valeur_reference)
        
        return {
            'performance_ratio': performance_ratio,
            'status': 'ABOVE' if performance_ratio > 1.1 else 'BELOW' if performance_ratio < 0.9 else 'NEAR',
            'gap_percentage': float((obj.valeur - obj.valeur_reference) / obj.valeur_reference * 100)
        }
    
    def get_performance_vs_sector(self, obj):
        """Performance vs secteur"""
        if not obj.benchmark_sector_value:
            return None
        
        return {
            'vs_sector_ratio': float(obj.valeur / obj.benchmark_sector_value),
            'percentile': obj.sector_percentile,
            'relative_position': 'TOP_QUARTILE' if obj.sector_percentile and obj.sector_percentile > 75 else
                               'ABOVE_MEDIAN' if obj.sector_percentile and obj.sector_percentile > 50 else
                               'BELOW_MEDIAN'
        }
    
    def get_trend_analysis(self, obj):
        """Analyse de tendance"""
        if obj.variation_relative is None:
            return None
        
        return {
            'trend': 'IMPROVING' if obj.variation_relative > 5 else 'DECLINING' if obj.variation_relative < -5 else 'STABLE',
            'variation_strength': 'STRONG' if abs(obj.variation_relative) > 20 else 'MODERATE' if abs(obj.variation_relative) > 10 else 'WEAK',
            'momentum': 'POSITIVE' if obj.variation_relative > 0 else 'NEGATIVE' if obj.variation_relative < 0 else 'NEUTRAL'
        }


class CashFlowScenarioSerializer(serializers.ModelSerializer):
    """
    Serializer pour les scénarios de Cash Flow
    """
    company = CompanySerializer(read_only=True)
    created_by = serializers.StringRelatedField(read_only=True)
    
    # Analyses des scénarios
    risk_assessment = serializers.SerializerMethodField()
    scenario_quality = serializers.SerializerMethodField()
    
    class Meta:
        model = CashFlowScenario
        fields = [
            'id', 'company', 'name', 'scenario_type', 'description',
            'start_date', 'end_date',
            'revenue_growth_rate', 'cost_inflation_rate',
            'collection_period_days', 'payment_period_days',
            'monthly_forecasts', 'sensitivity_analysis', 'monte_carlo_results',
            'average_monthly_cash_flow', 'cash_flow_volatility',
            'minimum_cash_position', 'burn_rate_monthly', 'cash_runway_months',
            'status', 'confidence_level', 'created_by', 'last_updated',
            'risk_assessment', 'scenario_quality'
        ]
        read_only_fields = ['id', 'last_updated']
    
    def get_risk_assessment(self, obj):
        """Évaluation des risques du scénario"""
        risk_level = 'LOW'
        
        if obj.minimum_cash_position < 0:
            risk_level = 'HIGH'
        elif obj.cash_runway_months < 3:
            risk_level = 'MEDIUM'
        
        return {
            'risk_level': risk_level,
            'liquidity_risk': 'HIGH' if obj.minimum_cash_position < 0 else 'LOW',
            'runway_adequacy': 'GOOD' if obj.cash_runway_months > 6 else 'CONCERNING',
            'volatility_level': 'HIGH' if obj.cash_flow_volatility > 30 else 'MODERATE' if obj.cash_flow_volatility > 15 else 'LOW'
        }
    
    def get_scenario_quality(self, obj):
        """Qualité du scénario"""
        quality_score = float(obj.confidence_level)
        
        # Ajustements selon la cohérence
        if obj.scenario_type == 'MONTE_CARLO' and obj.monte_carlo_results:
            quality_score += 10
        
        return {
            'quality_score': min(100, quality_score),
            'data_completeness': len(obj.monthly_forecasts) if obj.monthly_forecasts else 0,
            'scenario_robustness': 'HIGH' if obj.monte_carlo_results else 'MEDIUM'
        }


class FinancialAnalysisConfigSerializer(serializers.ModelSerializer):
    """
    Serializer pour la configuration d'analyse financière
    """
    company = CompanySerializer(read_only=True)
    
    class Meta:
        model = FinancialAnalysisConfiguration
        fields = [
            'id', 'company', 'tafire_method', 'auto_calculation_enabled',
            'calculation_frequency', 'working_capital_accounts',
            'financial_accounts', 'exceptional_accounts',
            'industry_sector', 'benchmark_source', 'last_calculation'
        ]
        read_only_fields = ['id', 'last_calculation']


class FinancialDashboardSerializer(serializers.Serializer):
    """
    Serializer pour le dashboard d'analyse financière complète
    """
    fiscal_year = FiscalYearSerializer()
    tafire = TAFIRESerializer()
    sig = SIGSerializer()
    functional_balance = FunctionalBalanceSerializer()
    ratios = RatioSerializer(many=True)
    
    # Métriques globales
    global_financial_score = serializers.IntegerField()
    risk_level = serializers.CharField()
    key_insights = serializers.ListField(child=serializers.CharField())
    priority_actions = serializers.ListField(child=serializers.CharField())
    
    # Comparaisons temporelles
    year_over_year_comparison = serializers.DictField()
    
    # Prévisions
    cash_flow_forecast = serializers.DictField()
    scenario_analysis = serializers.DictField()


class FinancialReportExportSerializer(serializers.Serializer):
    """
    Serializer pour l'export de rapports financiers
    """
    fiscal_year_id = serializers.UUIDField()
    format = serializers.ChoiceField(choices=['PDF', 'EXCEL', 'WORD'], default='PDF')
    include_graphs = serializers.BooleanField(default=True)
    include_analysis = serializers.BooleanField(default=True)
    include_recommendations = serializers.BooleanField(default=True)
    language = serializers.ChoiceField(choices=['FR', 'EN'], default='FR')
    
    # Options avancées
    comparison_year_id = serializers.UUIDField(required=False)
    custom_logo = serializers.ImageField(required=False)
    custom_template = serializers.CharField(required=False)