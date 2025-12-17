"""
Serializers pour le module Budgeting
Gestion de la conversion Decimal -> float et agrégation des lignes budgétaires
"""
from rest_framework import serializers
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime
from .models import BudgetPlan, BudgetLine, BudgetAlert, BudgetCategory


def decimal_to_float(value):
    """Conversion sécurisée Decimal -> float avec arrondi à 2 décimales"""
    if value is None:
        return 0.0
    if isinstance(value, (int, float)):
        value = Decimal(str(value))
    return float(value.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))


class BudgetCategorySerializer(serializers.ModelSerializer):
    """Serializer pour les catégories budgétaires"""

    class Meta:
        model = BudgetCategory
        fields = [
            'id', 'code', 'name', 'category_type', 'parent',
            'description', 'is_active'
        ]


class BudgetPlanSerializer(serializers.ModelSerializer):
    """Serializer pour les plans budgétaires"""

    total_budget = serializers.SerializerMethodField()
    total_actual = serializers.SerializerMethodField()
    total_variance = serializers.SerializerMethodField()
    completion_rate = serializers.SerializerMethodField()

    def get_total_budget(self, obj):
        return decimal_to_float(obj.total_budget)

    def get_total_actual(self, obj):
        return decimal_to_float(obj.total_actual)

    def get_total_variance(self, obj):
        return decimal_to_float(obj.total_variance)

    def get_completion_rate(self, obj):
        return obj.completion_rate

    class Meta:
        model = BudgetPlan
        fields = [
            'id', 'company', 'fiscal_year', 'name', 'description',
            'budget_type', 'start_date', 'end_date', 'status',
            'total_budget', 'total_actual', 'total_variance',
            'completion_rate', 'is_active', 'version',
            'created_by', 'validated_by', 'validation_date',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'total_budget', 'total_actual', 'total_variance',
            'completion_rate', 'created_at', 'updated_at'
        ]


class BudgetLineSerializer(serializers.ModelSerializer):
    """Serializer pour les lignes budgétaires individuelles"""

    budget_revised = serializers.SerializerMethodField()
    actual = serializers.SerializerMethodField()
    committed = serializers.SerializerMethodField()
    available = serializers.SerializerMethodField()
    variance = serializers.SerializerMethodField()
    variance_rate = serializers.SerializerMethodField()
    forecast_amount = serializers.SerializerMethodField()
    category_name = serializers.CharField(source='category.name', read_only=True)
    account_number = serializers.CharField(source='account.account_number', read_only=True)

    def get_budget_revised(self, obj):
        return decimal_to_float(obj.budget_revised)

    def get_actual(self, obj):
        return decimal_to_float(obj.actual)

    def get_committed(self, obj):
        return decimal_to_float(obj.committed)

    def get_available(self, obj):
        return decimal_to_float(obj.available)

    def get_variance(self, obj):
        return decimal_to_float(obj.variance)

    def get_variance_rate(self, obj):
        return obj.variance_rate

    def get_forecast_amount(self, obj):
        return decimal_to_float(obj.forecast_amount)

    class Meta:
        model = BudgetLine
        fields = [
            'id', 'budget_plan', 'category', 'category_name',
            'account', 'account_number', 'department', 'month',
            'budget_revised', 'actual', 'committed', 'available',
            'variance', 'variance_rate', 'forecast_amount',
            'notes', 'version', 'previous_version',
            'created_by', 'last_modified_by',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['available', 'variance', 'variance_rate', 'created_at', 'updated_at']


class BudgetLineAggregatedSerializer(serializers.Serializer):
    """
    Serializer agrégé pour afficher une ligne budgétaire sur 12 mois
    Compatible avec l'attente frontend
    """

    category_id = serializers.IntegerField()
    category_name = serializers.CharField()
    category_code = serializers.CharField()
    account_id = serializers.IntegerField(allow_null=True)
    account_number = serializers.CharField(allow_null=True)
    department = serializers.CharField(allow_null=True)

    # Données mensuelles
    months = serializers.SerializerMethodField()

    # Totaux
    total_budget = serializers.SerializerMethodField()
    total_actual = serializers.SerializerMethodField()
    total_committed = serializers.SerializerMethodField()
    total_available = serializers.SerializerMethodField()
    total_variance = serializers.SerializerMethodField()
    completion_rate = serializers.SerializerMethodField()

    def get_months(self, obj):
        """Retourne un dictionnaire avec les 12 mois"""
        lines = obj.get('lines', [])

        months_data = {}
        for line in lines:
            month_key = line.month.strftime('%b').lower() if line.month else 'unknown'
            months_data[month_key] = {
                'budget': decimal_to_float(line.budget_revised),
                'actual': decimal_to_float(line.actual),
                'committed': decimal_to_float(line.committed),
                'available': decimal_to_float(line.available),
                'variance': decimal_to_float(line.variance),
                'forecast': decimal_to_float(line.forecast_amount) if line.forecast_amount else 0.0
            }

        # S'assurer que tous les mois sont présents
        all_months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun',
                      'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
        for month in all_months:
            if month not in months_data:
                months_data[month] = {
                    'budget': 0.0,
                    'actual': 0.0,
                    'committed': 0.0,
                    'available': 0.0,
                    'variance': 0.0,
                    'forecast': 0.0
                }

        return months_data

    def get_total_budget(self, obj):
        lines = obj.get('lines', [])
        total = sum(line.budget_revised for line in lines)
        return decimal_to_float(total)

    def get_total_actual(self, obj):
        lines = obj.get('lines', [])
        total = sum(line.actual for line in lines)
        return decimal_to_float(total)

    def get_total_committed(self, obj):
        lines = obj.get('lines', [])
        total = sum(line.committed for line in lines)
        return decimal_to_float(total)

    def get_total_available(self, obj):
        lines = obj.get('lines', [])
        total = sum(line.available for line in lines)
        return decimal_to_float(total)

    def get_total_variance(self, obj):
        lines = obj.get('lines', [])
        total = sum(line.variance for line in lines)
        return decimal_to_float(total)

    def get_completion_rate(self, obj):
        total_budget = self.get_total_budget(obj)
        total_actual = self.get_total_actual(obj)
        if total_budget == 0:
            return 0.0
        return round((total_actual / total_budget) * 100, 2)


class BudgetAlertSerializer(serializers.ModelSerializer):
    """Serializer pour les alertes budgétaires"""

    trigger_value = serializers.SerializerMethodField()
    threshold_value = serializers.SerializerMethodField()
    current_value = serializers.SerializerMethodField()
    budget_line_info = serializers.SerializerMethodField()

    def get_trigger_value(self, obj):
        return decimal_to_float(obj.trigger_value)

    def get_threshold_value(self, obj):
        return decimal_to_float(obj.threshold_value)

    def get_current_value(self, obj):
        return decimal_to_float(obj.current_value)

    def get_budget_line_info(self, obj):
        if obj.budget_line:
            return {
                'id': obj.budget_line.id,
                'category': obj.budget_line.category.name if obj.budget_line.category else None,
                'account': obj.budget_line.account.account_number if obj.budget_line.account else None,
                'month': obj.budget_line.month.strftime('%Y-%m') if obj.budget_line.month else None
            }
        return None

    class Meta:
        model = BudgetAlert
        fields = [
            'id', 'budget_line', 'budget_line_info', 'alert_type',
            'severity', 'trigger_condition', 'trigger_value',
            'threshold_value', 'current_value', 'message',
            'triggered_at', 'is_resolved', 'resolved_at',
            'resolved_by', 'resolution_notes'
        ]
