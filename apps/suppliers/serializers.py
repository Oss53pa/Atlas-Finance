"""
Serializers pour le module fournisseurs SYSCOHADA
"""
from rest_framework import serializers
from decimal import Decimal
from .models import (
    Supplier, SupplierContact, SupplierEvaluation, SupplierDocument,
    SupplierInvoice, SupplierPayment, SupplierAnalytics
)


def decimal_to_float(value):
    """Conversion sécurisée Decimal -> float"""
    if value is None:
        return 0.0
    return float(value)


class SupplierContactSerializer(serializers.ModelSerializer):
    """Serializer pour les contacts fournisseurs"""

    full_name = serializers.SerializerMethodField()

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"

    class Meta:
        model = SupplierContact
        fields = [
            'id', 'supplier', 'first_name', 'last_name', 'full_name',
            'role', 'department', 'job_title',
            'direct_phone', 'mobile', 'email',
            'handles_orders', 'handles_invoices', 'handles_delivery', 'handles_quality',
            'is_primary', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class SupplierEvaluationSerializer(serializers.ModelSerializer):
    """Serializer pour les évaluations fournisseurs"""

    evaluator_name = serializers.CharField(
        source='evaluator.get_full_name', read_only=True, allow_null=True
    )
    quality_score = serializers.SerializerMethodField()
    delivery_score = serializers.SerializerMethodField()
    service_score = serializers.SerializerMethodField()
    price_score = serializers.SerializerMethodField()
    compliance_score = serializers.SerializerMethodField()
    overall_score = serializers.SerializerMethodField()

    def get_quality_score(self, obj):
        return decimal_to_float(obj.quality_score)

    def get_delivery_score(self, obj):
        return decimal_to_float(obj.delivery_score)

    def get_service_score(self, obj):
        return decimal_to_float(obj.service_score)

    def get_price_score(self, obj):
        return decimal_to_float(obj.price_score)

    def get_compliance_score(self, obj):
        return decimal_to_float(obj.compliance_score)

    def get_overall_score(self, obj):
        return decimal_to_float(obj.overall_score)

    class Meta:
        model = SupplierEvaluation
        fields = [
            'id', 'supplier', 'evaluation_type',
            'evaluation_period_start', 'evaluation_period_end',
            'quality_score', 'delivery_score', 'service_score',
            'price_score', 'compliance_score', 'overall_score',
            'strengths', 'weaknesses', 'action_plan', 'recommendation',
            'evaluator', 'evaluator_name', 'evaluation_date',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'overall_score']


class SupplierDocumentSerializer(serializers.ModelSerializer):
    """Serializer pour les documents fournisseurs"""

    expires_soon = serializers.BooleanField(read_only=True)

    class Meta:
        model = SupplierDocument
        fields = [
            'id', 'supplier', 'document_type', 'title', 'description',
            'file_path', 'file_size', 'file_type',
            'document_date', 'expiry_date', 'reference_number',
            'is_verified', 'verified_by', 'verification_date',
            'alert_before_expiry', 'is_expired', 'expires_soon',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'is_expired']


class SupplierInvoiceSerializer(serializers.ModelSerializer):
    """Serializer pour les factures fournisseurs"""

    supplier_code = serializers.CharField(source='supplier.code', read_only=True)
    supplier_name = serializers.CharField(source='supplier.legal_name', read_only=True)
    amount_excl_tax = serializers.SerializerMethodField()
    vat_amount = serializers.SerializerMethodField()
    amount_incl_tax = serializers.SerializerMethodField()
    payment_amount = serializers.SerializerMethodField()
    days_until_due = serializers.IntegerField(read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)

    def get_amount_excl_tax(self, obj):
        return decimal_to_float(obj.amount_excl_tax)

    def get_vat_amount(self, obj):
        return decimal_to_float(obj.vat_amount)

    def get_amount_incl_tax(self, obj):
        return decimal_to_float(obj.amount_incl_tax)

    def get_payment_amount(self, obj):
        return decimal_to_float(obj.payment_amount)

    class Meta:
        model = SupplierInvoice
        fields = [
            'id', 'supplier', 'supplier_code', 'supplier_name',
            'invoice_number', 'invoice_date', 'due_date',
            'amount_excl_tax', 'vat_amount', 'amount_incl_tax',
            'purchase_order_ref', 'delivery_receipt_ref', 'wise_procure_id',
            'status', 'technical_validation', 'technical_validator',
            'technical_validation_date', 'technical_comments',
            'accounting_validation', 'accounting_validator',
            'accounting_validation_date', 'accounting_comments',
            'ocr_extracted_data', 'ocr_confidence_score',
            'duplicate_check_passed', 'amount_check_passed', 'po_match_passed',
            'payment_date', 'payment_amount', 'payment_reference',
            'journal_entry', 'days_until_due', 'is_overdue',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class SupplierPaymentSerializer(serializers.ModelSerializer):
    """Serializer pour les paiements fournisseurs"""

    supplier_code = serializers.CharField(source='supplier.code', read_only=True)
    supplier_name = serializers.CharField(source='supplier.legal_name', read_only=True)
    proposed_by_name = serializers.CharField(
        source='proposed_by.get_full_name', read_only=True, allow_null=True
    )
    approved_by_name = serializers.CharField(
        source='approved_by.get_full_name', read_only=True, allow_null=True
    )
    gross_amount = serializers.SerializerMethodField()
    discount_amount = serializers.SerializerMethodField()
    net_amount = serializers.SerializerMethodField()
    discount_rate_applied = serializers.SerializerMethodField()

    def get_gross_amount(self, obj):
        return decimal_to_float(obj.gross_amount)

    def get_discount_amount(self, obj):
        return decimal_to_float(obj.discount_amount)

    def get_net_amount(self, obj):
        return decimal_to_float(obj.net_amount)

    def get_discount_rate_applied(self, obj):
        return decimal_to_float(obj.discount_rate_applied)

    class Meta:
        model = SupplierPayment
        fields = [
            'id', 'supplier', 'supplier_code', 'supplier_name',
            'payment_reference', 'payment_date',
            'gross_amount', 'discount_amount', 'net_amount',
            'payment_type', 'early_payment_days', 'discount_rate_applied',
            'status', 'proposed_by', 'proposed_by_name',
            'approved_by', 'approved_by_name', 'approval_date',
            'bank_transaction_id', 'execution_date',
            'related_invoices',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'net_amount']


class SupplierAnalyticsSerializer(serializers.ModelSerializer):
    """Serializer pour les analytics fournisseurs"""

    supplier_code = serializers.CharField(source='supplier.code', read_only=True)
    supplier_name = serializers.CharField(source='supplier.legal_name', read_only=True)
    total_amount_ordered = serializers.SerializerMethodField()
    total_amount_invoiced = serializers.SerializerMethodField()
    total_amount_paid = serializers.SerializerMethodField()
    average_delivery_time = serializers.SerializerMethodField()
    on_time_delivery_rate = serializers.SerializerMethodField()
    quality_defect_rate = serializers.SerializerMethodField()
    invoice_accuracy_rate = serializers.SerializerMethodField()
    total_savings_discount = serializers.SerializerMethodField()
    total_savings_negotiation = serializers.SerializerMethodField()
    last_12m_amount = serializers.SerializerMethodField()
    average_order_frequency = serializers.SerializerMethodField()

    def get_total_amount_ordered(self, obj):
        return decimal_to_float(obj.total_amount_ordered)

    def get_total_amount_invoiced(self, obj):
        return decimal_to_float(obj.total_amount_invoiced)

    def get_total_amount_paid(self, obj):
        return decimal_to_float(obj.total_amount_paid)

    def get_average_delivery_time(self, obj):
        return decimal_to_float(obj.average_delivery_time)

    def get_on_time_delivery_rate(self, obj):
        return decimal_to_float(obj.on_time_delivery_rate)

    def get_quality_defect_rate(self, obj):
        return decimal_to_float(obj.quality_defect_rate)

    def get_invoice_accuracy_rate(self, obj):
        return decimal_to_float(obj.invoice_accuracy_rate)

    def get_total_savings_discount(self, obj):
        return decimal_to_float(obj.total_savings_discount)

    def get_total_savings_negotiation(self, obj):
        return decimal_to_float(obj.total_savings_negotiation)

    def get_last_12m_amount(self, obj):
        return decimal_to_float(obj.last_12m_amount)

    def get_average_order_frequency(self, obj):
        return decimal_to_float(obj.average_order_frequency)

    class Meta:
        model = SupplierAnalytics
        fields = [
            'id', 'supplier', 'supplier_code', 'supplier_name',
            'total_orders_count', 'total_invoices_count',
            'total_amount_ordered', 'total_amount_invoiced', 'total_amount_paid',
            'average_delivery_time', 'on_time_delivery_rate',
            'quality_defect_rate', 'invoice_accuracy_rate',
            'total_savings_discount', 'total_savings_negotiation',
            'last_12m_orders', 'last_12m_amount', 'average_order_frequency',
            'last_calculation',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'last_calculation']


class SupplierSerializer(serializers.ModelSerializer):
    """Serializer principal pour les fournisseurs"""

    company_name = serializers.CharField(source='company.name', read_only=True)
    account_code = serializers.CharField(source='account.code', read_only=True, allow_null=True)
    blocked_by_name = serializers.CharField(
        source='blocked_by.get_full_name', read_only=True, allow_null=True
    )
    display_name = serializers.CharField(read_only=True)
    contract_is_active = serializers.BooleanField(read_only=True)
    contract_expires_soon = serializers.BooleanField(read_only=True)

    # Montants convertis en float
    payment_terms = serializers.IntegerField()
    discount_rate = serializers.SerializerMethodField()
    minimum_order_amount = serializers.SerializerMethodField()
    maximum_order_amount = serializers.SerializerMethodField()
    current_outstanding = serializers.SerializerMethodField()
    service_rate = serializers.SerializerMethodField()
    quality_score = serializers.SerializerMethodField()
    delivery_score = serializers.SerializerMethodField()
    price_competitiveness = serializers.SerializerMethodField()
    overall_performance = serializers.SerializerMethodField()

    # Relations nested
    contacts = SupplierContactSerializer(many=True, read_only=True)
    recent_evaluations = serializers.SerializerMethodField()

    def get_discount_rate(self, obj):
        return decimal_to_float(obj.discount_rate)

    def get_minimum_order_amount(self, obj):
        return decimal_to_float(obj.minimum_order_amount)

    def get_maximum_order_amount(self, obj):
        return decimal_to_float(obj.maximum_order_amount)

    def get_current_outstanding(self, obj):
        return decimal_to_float(obj.current_outstanding)

    def get_service_rate(self, obj):
        return decimal_to_float(obj.service_rate)

    def get_quality_score(self, obj):
        return decimal_to_float(obj.quality_score)

    def get_delivery_score(self, obj):
        return decimal_to_float(obj.delivery_score)

    def get_price_competitiveness(self, obj):
        return decimal_to_float(obj.price_competitiveness)

    def get_overall_performance(self, obj):
        return decimal_to_float(obj.overall_performance)

    def get_recent_evaluations(self, obj):
        evaluations = obj.evaluations.order_by('-evaluation_date')[:3]
        return SupplierEvaluationSerializer(evaluations, many=True).data

    class Meta:
        model = Supplier
        fields = [
            'id', 'company', 'company_name', 'code', 'supplier_type',
            'legal_name', 'commercial_name', 'legal_form', 'display_name',
            'rccm', 'nif', 'taxpayer_number', 'vat_number',
            'category', 'business_sector',
            'main_address', 'city', 'region', 'country', 'postal_code',
            'main_phone', 'mobile_phone', 'fax', 'email', 'website',
            'payment_terms', 'discount_rate', 'currency', 'incoterms',
            'preferred_payment_method',
            'minimum_order_amount', 'maximum_order_amount',
            'has_framework_agreement', 'framework_agreement_ref', 'framework_expiry_date',
            'iban', 'bic', 'bank_name', 'bank_address',
            'account', 'account_code',
            'supplier_rating', 'current_outstanding', 'litigation_count',
            'service_rate', 'average_delivery_delay', 'document_compliance_rate',
            'iso_certifications', 'quality_certifications', 'other_approvals',
            'quality_score', 'delivery_score', 'price_competitiveness', 'overall_performance',
            'status', 'blocking_reason', 'blocking_date', 'blocked_by', 'blocked_by_name',
            'contract_start_date', 'contract_end_date', 'auto_renewal',
            'contract_is_active', 'contract_expires_soon',
            'first_order_date', 'last_order_date', 'last_payment_date',
            'notes', 'tags',
            'contacts', 'recent_evaluations',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'created_at', 'updated_at', 'current_outstanding',
            'litigation_count', 'service_rate', 'average_delivery_delay',
            'document_compliance_rate', 'overall_performance',
            'last_order_date', 'last_payment_date'
        ]

    def validate(self, data):
        """Validation personnalisée"""
        # Validation des dates de contrat
        if 'contract_start_date' in data and 'contract_end_date' in data:
            if data['contract_start_date'] and data['contract_end_date']:
                if data['contract_start_date'] >= data['contract_end_date']:
                    raise serializers.ValidationError(
                        "La date de fin de contrat doit être postérieure à la date de début"
                    )

        return data


class SupplierListSerializer(serializers.ModelSerializer):
    """Serializer simplifié pour les listes de fournisseurs"""

    company_name = serializers.CharField(source='company.name', read_only=True)
    display_name = serializers.CharField(read_only=True)
    current_outstanding = serializers.SerializerMethodField()
    overall_performance = serializers.SerializerMethodField()

    def get_current_outstanding(self, obj):
        return decimal_to_float(obj.current_outstanding)

    def get_overall_performance(self, obj):
        return decimal_to_float(obj.overall_performance)

    class Meta:
        model = Supplier
        fields = [
            'id', 'code', 'legal_name', 'commercial_name', 'display_name',
            'company', 'company_name', 'supplier_type', 'status',
            'supplier_rating', 'current_outstanding', 'overall_performance',
            'email', 'main_phone', 'city', 'country',
            'last_order_date', 'created_at'
        ]
        read_only_fields = ['created_at', 'current_outstanding', 'overall_performance', 'last_order_date']
