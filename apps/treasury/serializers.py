"""
Serializers pour le module Treasury
Gestion de la conversion Decimal -> float avec précision
"""
from rest_framework import serializers
from decimal import Decimal, ROUND_HALF_UP
from .models import (
    Bank, BankAccount, Payment, FundCall,
    CashMovement, TreasuryAlert
)


def decimal_to_float(value):
    """Conversion sécurisée Decimal -> float avec arrondi à 2 décimales"""
    if value is None:
        return 0.0
    if isinstance(value, (int, float)):
        value = Decimal(str(value))
    return float(value.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))


class BankSerializer(serializers.ModelSerializer):
    """Serializer pour les banques"""

    class Meta:
        model = Bank
        fields = [
            'id', 'name', 'code', 'swift_code', 'country',
            'bank_type', 'contact_email', 'contact_phone',
            'api_enabled', 'api_protocol', 'is_active'
        ]


class BankAccountSerializer(serializers.ModelSerializer):
    """Serializer pour les comptes bancaires"""

    current_balance = serializers.SerializerMethodField()
    overdraft_limit = serializers.SerializerMethodField()
    available_balance = serializers.SerializerMethodField()
    bank_name = serializers.CharField(source='bank.name', read_only=True)

    def get_current_balance(self, obj):
        return decimal_to_float(obj.current_balance)

    def get_overdraft_limit(self, obj):
        return decimal_to_float(obj.overdraft_limit)

    def get_available_balance(self, obj):
        return decimal_to_float(obj.available_balance)

    class Meta:
        model = BankAccount
        fields = [
            'id', 'company', 'bank', 'bank_name', 'account_number',
            'label', 'iban', 'swift_code', 'currency',
            'current_balance', 'overdraft_limit', 'available_balance',
            'account_type', 'status', 'branch', 'opening_date',
            'last_reconciliation_date', 'is_main_account'
        ]
        read_only_fields = ['available_balance']


class PaymentSerializer(serializers.ModelSerializer):
    """Serializer pour les paiements"""

    amount = serializers.SerializerMethodField()
    amount_in_base_currency = serializers.SerializerMethodField()
    bank_fees = serializers.SerializerMethodField()
    can_be_executed = serializers.SerializerMethodField()
    bank_account_label = serializers.CharField(
        source='bank_account.label', read_only=True
    )

    def get_amount(self, obj):
        return decimal_to_float(obj.amount)

    def get_amount_in_base_currency(self, obj):
        return decimal_to_float(obj.amount_in_base_currency)

    def get_bank_fees(self, obj):
        return decimal_to_float(obj.bank_fees)

    def get_can_be_executed(self, obj):
        return obj.can_be_executed()

    class Meta:
        model = Payment
        fields = [
            'id', 'company', 'bank_account', 'bank_account_label',
            'payment_reference', 'external_reference',
            'payment_type', 'direction',
            'amount', 'currency', 'exchange_rate', 'amount_in_base_currency',
            'value_date', 'execution_date', 'confirmation_date',
            'description', 'beneficiary_name', 'beneficiary_account',
            'beneficiary_bank', 'required_signatures', 'current_signatures',
            'approval_workflow', 'current_approval_step',
            'requires_mfa', 'ip_restriction', 'user_limit_checked',
            'status', 'bank_fees', 'notes', 'can_be_executed',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['required_signatures', 'can_be_executed', 'created_at', 'updated_at']


class FundCallSerializer(serializers.ModelSerializer):
    """Serializer pour les appels de fonds"""

    amount_requested = serializers.SerializerMethodField()
    amount_transferred = serializers.SerializerMethodField()
    source_account = BankAccountSerializer(read_only=True)
    destination_account = BankAccountSerializer(read_only=True)
    source_account_id = serializers.UUIDField(write_only=True, required=False)
    destination_account_id = serializers.UUIDField(write_only=True, required=False)
    transfer_completion_rate = serializers.SerializerMethodField()

    def get_amount_requested(self, obj):
        return decimal_to_float(obj.amount_requested)

    def get_amount_transferred(self, obj):
        return decimal_to_float(obj.amount_transferred)

    def get_transfer_completion_rate(self, obj):
        return obj.transfer_completion_rate

    class Meta:
        model = FundCall
        fields = [
            'id', 'company', 'call_reference', 'fund_type',
            'amount_requested', 'amount_transferred', 'transfer_completion_rate',
            'source_account', 'destination_account',
            'source_account_id', 'destination_account_id',
            'request_date', 'needed_date', 'execution_date',
            'status', 'urgency_level', 'justification_type',
            'description', 'notes', 'requested_by', 'approved_by',
            'approval_date', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'call_reference', 'amount_transferred', 'transfer_completion_rate',
            'execution_date', 'created_at', 'updated_at'
        ]


class CashMovementSerializer(serializers.ModelSerializer):
    """Serializer pour les mouvements de trésorerie"""

    amount = serializers.SerializerMethodField()
    bank_account_label = serializers.CharField(
        source='bank_account.label', read_only=True
    )

    def get_amount(self, obj):
        return decimal_to_float(obj.amount)

    class Meta:
        model = CashMovement
        fields = [
            'id', 'company', 'bank_account', 'bank_account_label',
            'movement_type', 'direction', 'amount', 'currency',
            'scheduled_date', 'execution_date', 'execution_status',
            'description', 'related_document_type', 'related_document_id',
            'category', 'is_recurring', 'recurrence_pattern',
            'notes', 'created_at', 'updated_at'
        ]


class TreasuryAlertSerializer(serializers.ModelSerializer):
    """Serializer pour les alertes de trésorerie"""

    trigger_value = serializers.SerializerMethodField()
    threshold_value = serializers.SerializerMethodField()

    def get_trigger_value(self, obj):
        return decimal_to_float(obj.trigger_value)

    def get_threshold_value(self, obj):
        return decimal_to_float(obj.threshold_value)

    class Meta:
        model = TreasuryAlert
        fields = [
            'id', 'company', 'alert_type', 'severity',
            'trigger_condition', 'trigger_value', 'threshold_value',
            'message', 'triggered_at', 'is_acknowledged',
            'acknowledged_at', 'acknowledged_by', 'resolution_notes'
        ]
