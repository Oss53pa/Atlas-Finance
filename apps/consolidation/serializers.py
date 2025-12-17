"""
Serializers pour le module Consolidation Multi-Sociétés
"""
from rest_framework import serializers
from decimal import Decimal

from .models import (
    ConsolidationGroup,
    ConsolidationEntity,
    ConsolidationPeriod,
    IntercompanyTransaction,
    ConsolidationAdjustment,
    ConsolidatedFinancialStatement,
    ConsolidationWorkflow,
)


class ConsolidationGroupSerializer(serializers.ModelSerializer):
    """Serializer pour les groupes de consolidation."""

    parent_company_name = serializers.CharField(source='parent_company.nom', read_only=True)
    entities_count = serializers.SerializerMethodField()

    class Meta:
        model = ConsolidationGroup
        fields = [
            'id', 'group_code', 'group_name', 'legal_form', 'group_type',
            'parent_company', 'parent_company_name',
            'consolidation_method', 'consolidation_currency',
            'fiscal_year_end', 'elimination_threshold', 'materiality_threshold',
            'exchange_rate_method', 'auto_elimination', 'variance_control',
            'is_active', 'entities_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_entities_count(self, obj):
        return obj.entities.filter(status='ACTIVE').count()


class ConsolidationGroupListSerializer(serializers.ModelSerializer):
    """Serializer léger pour les listes de groupes."""

    parent_company_name = serializers.CharField(source='parent_company.nom', read_only=True)
    entities_count = serializers.SerializerMethodField()

    class Meta:
        model = ConsolidationGroup
        fields = [
            'id', 'group_code', 'group_name', 'group_type',
            'parent_company_name', 'consolidation_currency',
            'is_active', 'entities_count',
        ]

    def get_entities_count(self, obj):
        return obj.entities.filter(status='ACTIVE').count()


class ConsolidationEntitySerializer(serializers.ModelSerializer):
    """Serializer pour les entités du périmètre de consolidation."""

    company_name = serializers.CharField(source='company.nom', read_only=True)
    group_name = serializers.CharField(source='consolidation_group.group_name', read_only=True)
    control_type = serializers.CharField(read_only=True)

    class Meta:
        model = ConsolidationEntity
        fields = [
            'id', 'consolidation_group', 'group_name',
            'company', 'company_name', 'entity_type',
            'ownership_percentage', 'voting_percentage',
            'consolidation_method', 'control_type',
            'acquisition_date', 'first_consolidation_date', 'disposal_date',
            'chart_mapping_validated', 'currency_conversion_method',
            'status', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'control_type', 'created_at', 'updated_at']

    def validate_ownership_percentage(self, value):
        if value < 0 or value > 100:
            raise serializers.ValidationError("Le pourcentage doit être entre 0 et 100")
        return value


class ConsolidationEntityListSerializer(serializers.ModelSerializer):
    """Serializer léger pour les listes d'entités."""

    company_name = serializers.CharField(source='company.nom', read_only=True)
    control_type = serializers.CharField(read_only=True)

    class Meta:
        model = ConsolidationEntity
        fields = [
            'id', 'company', 'company_name', 'entity_type',
            'ownership_percentage', 'consolidation_method',
            'control_type', 'status',
        ]


class ConsolidationPeriodSerializer(serializers.ModelSerializer):
    """Serializer pour les périodes de consolidation."""

    group_name = serializers.CharField(source='consolidation_group.group_name', read_only=True)
    validated_by_name = serializers.CharField(source='validated_by.get_full_name', read_only=True)
    included_entities = ConsolidationEntityListSerializer(source='include_entities', many=True, read_only=True)
    included_entities_ids = serializers.PrimaryKeyRelatedField(
        queryset=ConsolidationEntity.objects.all(),
        source='include_entities',
        many=True,
        write_only=True,
        required=False
    )

    class Meta:
        model = ConsolidationPeriod
        fields = [
            'id', 'consolidation_group', 'group_name',
            'period_name', 'consolidation_date',
            'period_start', 'period_end',
            'included_entities', 'included_entities_ids',
            'exchange_rates', 'status',
            'processing_start_time', 'processing_end_time', 'processing_duration_seconds',
            'validated_by', 'validated_by_name', 'validation_date',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'processing_duration_seconds',
            'validated_by', 'validation_date',
            'created_at', 'updated_at',
        ]


class ConsolidationPeriodListSerializer(serializers.ModelSerializer):
    """Serializer léger pour les listes de périodes."""

    group_name = serializers.CharField(source='consolidation_group.group_name', read_only=True)
    entities_count = serializers.SerializerMethodField()

    class Meta:
        model = ConsolidationPeriod
        fields = [
            'id', 'group_name', 'period_name',
            'period_start', 'period_end', 'status',
            'entities_count', 'validation_date',
        ]

    def get_entities_count(self, obj):
        return obj.include_entities.count()


class IntercompanyTransactionSerializer(serializers.ModelSerializer):
    """Serializer pour les transactions intra-groupe."""

    entity_debtor_name = serializers.CharField(source='entity_debtor.company.nom', read_only=True)
    entity_creditor_name = serializers.CharField(source='entity_creditor.company.nom', read_only=True)
    validated_by_name = serializers.CharField(source='validated_by.get_full_name', read_only=True)

    class Meta:
        model = IntercompanyTransaction
        fields = [
            'id', 'consolidation_period',
            'entity_debtor', 'entity_debtor_name',
            'entity_creditor', 'entity_creditor_name',
            'transaction_type', 'transaction_reference', 'description',
            'amount_original_currency', 'currency', 'amount_group_currency',
            'exchange_rate', 'elimination_amount', 'elimination_rate',
            'elimination_status', 'elimination_debit_account', 'elimination_credit_account',
            'transaction_date', 'elimination_date',
            'justification', 'is_reciprocal', 'variance_amount',
            'validated_by', 'validated_by_name', 'validation_date',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'amount_group_currency', 'elimination_amount',
            'validated_by', 'validation_date',
            'created_at', 'updated_at',
        ]


class IntercompanyTransactionListSerializer(serializers.ModelSerializer):
    """Serializer léger pour les listes de transactions."""

    entity_debtor_name = serializers.CharField(source='entity_debtor.company.nom', read_only=True)
    entity_creditor_name = serializers.CharField(source='entity_creditor.company.nom', read_only=True)

    class Meta:
        model = IntercompanyTransaction
        fields = [
            'id', 'transaction_type', 'transaction_reference',
            'entity_debtor_name', 'entity_creditor_name',
            'amount_group_currency', 'currency',
            'elimination_status', 'transaction_date',
        ]


class ConsolidationAdjustmentSerializer(serializers.ModelSerializer):
    """Serializer pour les ajustements de consolidation."""

    entity_name = serializers.CharField(source='entity.company.nom', read_only=True)
    validated_by_name = serializers.CharField(source='validated_by.get_full_name', read_only=True)

    class Meta:
        model = ConsolidationAdjustment
        fields = [
            'id', 'consolidation_period',
            'adjustment_type', 'adjustment_name', 'description',
            'entity', 'entity_name',
            'debit_account', 'credit_account', 'adjustment_amount',
            'business_rationale', 'calculation_method',
            'is_automatic', 'is_recurring',
            'is_validated', 'validated_by', 'validated_by_name', 'validation_date',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'validated_by', 'validation_date',
            'created_at', 'updated_at',
        ]


class ConsolidatedFinancialStatementSerializer(serializers.ModelSerializer):
    """Serializer pour les états financiers consolidés."""

    period_name = serializers.CharField(source='consolidation_period.period_name', read_only=True)
    statement_type_display = serializers.CharField(source='get_statement_type_display', read_only=True)

    class Meta:
        model = ConsolidatedFinancialStatement
        fields = [
            'id', 'consolidation_period', 'period_name',
            'statement_type', 'statement_type_display', 'reporting_format',
            'consolidated_data', 'detailed_breakdown',
            'generation_date', 'generation_time_ms',
            'data_quality_score', 'control_results',
            'version', 'is_final',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'generation_date', 'generation_time_ms',
            'created_at', 'updated_at',
        ]


class ConsolidationWorkflowSerializer(serializers.ModelSerializer):
    """Serializer pour le workflow de consolidation."""

    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)

    class Meta:
        model = ConsolidationWorkflow
        fields = [
            'id', 'consolidation_period',
            'step_code', 'step_name', 'step_order',
            'is_automatic', 'estimated_duration_minutes',
            'assigned_to', 'assigned_to_name',
            'status', 'start_time', 'end_time', 'actual_duration_minutes',
            'result_data', 'error_messages',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'actual_duration_minutes',
            'created_at', 'updated_at',
        ]


# Serializers pour les actions spéciales

class StartConsolidationSerializer(serializers.Serializer):
    """Serializer pour démarrer une consolidation."""

    consolidation_group = serializers.UUIDField()
    period_start = serializers.DateField()
    period_end = serializers.DateField()
    include_entities = serializers.ListField(
        child=serializers.UUIDField(),
        required=False
    )
    exchange_rates = serializers.DictField(required=False)


class ValidateConsolidationSerializer(serializers.Serializer):
    """Serializer pour valider une consolidation."""

    period_id = serializers.UUIDField()
    validation_notes = serializers.CharField(required=False, allow_blank=True)


class EliminateTransactionSerializer(serializers.Serializer):
    """Serializer pour éliminer une transaction intra-groupe."""

    transaction_id = serializers.UUIDField()
    elimination_rate = serializers.DecimalField(
        max_digits=5, decimal_places=2,
        min_value=Decimal('0'), max_value=Decimal('100'),
        default=Decimal('100')
    )
    justification = serializers.CharField(required=False, allow_blank=True)
