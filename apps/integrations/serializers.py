"""
Integration Serializers
Serializers for banking and fiscal integration API responses.
"""
from rest_framework import serializers


class BankConnectionSerializer(serializers.Serializer):
    """Bank connection information"""
    id = serializers.CharField()
    bank_name = serializers.CharField()
    account_number = serializers.CharField()
    account_type = serializers.CharField()
    currency = serializers.CharField()
    balance = serializers.DecimalField(max_digits=15, decimal_places=2)
    is_active = serializers.BooleanField()
    last_sync = serializers.DateTimeField(allow_null=True)
    created_at = serializers.DateTimeField()
    status = serializers.CharField(required=False)
    message = serializers.CharField(required=False)
    auth_url = serializers.CharField(required=False)


class BankTransactionSerializer(serializers.Serializer):
    """Bank transaction information"""
    reference = serializers.CharField()
    date_valeur = serializers.DateTimeField()
    date_operation = serializers.DateTimeField()
    montant = serializers.DecimalField(max_digits=15, decimal_places=2)
    libelle = serializers.CharField()
    type_operation = serializers.CharField()
    solde_apres = serializers.DecimalField(max_digits=15, decimal_places=2, allow_null=True)


class SyncResultSerializer(serializers.Serializer):
    """Sync operation result"""
    connection_id = serializers.CharField()
    status = serializers.ChoiceField(choices=['success', 'partial', 'failed'])
    transactions_imported = serializers.IntegerField()
    transactions_total = serializers.IntegerField()
    last_sync = serializers.DateTimeField()
    errors = serializers.ListField(child=serializers.CharField(), required=False)


class FiscalIntegrationSerializer(serializers.Serializer):
    """Fiscal integration information"""
    company_id = serializers.CharField()
    is_configured = serializers.BooleanField()
    country = serializers.CharField()
    tax_id = serializers.CharField(allow_null=True)
    fiscal_year = serializers.CharField(allow_null=True)
    next_declaration_date = serializers.DateField(allow_null=True)
    pending_declarations = serializers.IntegerField()


class FiscalDeclarationSubmissionSerializer(serializers.Serializer):
    """Fiscal declaration submission result"""
    status = serializers.ChoiceField(choices=['submitted', 'pending', 'rejected'])
    reference = serializers.CharField()
    message = serializers.CharField()
    submission_date = serializers.DateTimeField()
    errors = serializers.ListField(child=serializers.CharField(), required=False)
