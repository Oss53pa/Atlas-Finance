"""
Serializers pour l'API comptabilité - SYSCOHADA compliant
"""
from rest_framework import serializers
from decimal import Decimal
from django.utils import timezone

from .models import (
    Company, FiscalYear, Journal, ChartOfAccounts,
    JournalEntry, JournalEntryLine
)
from apps.treasury.models import FundCall


class CompanySerializer(serializers.ModelSerializer):
    """Serializer pour les sociétés"""
    fiscal_years_count = serializers.SerializerMethodField()
    active_fiscal_year = serializers.SerializerMethodField()
    
    class Meta:
        model = Company
        fields = [
            'id', 'name', 'code', 'legal_form', 'activity_sector',
            'rccm_number', 'tax_number', 'address', 'city', 'country',
            'phone', 'email', 'website', 'currency', 'is_active',
            'fiscal_years_count', 'active_fiscal_year'
        ]
        read_only_fields = ['id']
    
    def get_fiscal_years_count(self, obj):
        return obj.fiscal_years.count()
    
    def get_active_fiscal_year(self, obj):
        active_year = obj.fiscal_years.filter(is_active=True).first()
        if active_year:
            return {
                'id': active_year.id,
                'code': active_year.code,
                'name': active_year.name,
                'start_date': active_year.start_date,
                'end_date': active_year.end_date
            }
        return None


class FiscalYearSerializer(serializers.ModelSerializer):
    """Serializer pour les exercices comptables"""
    company_name = serializers.CharField(source='company.name', read_only=True)
    is_current = serializers.SerializerMethodField()
    entries_count = serializers.SerializerMethodField()
    
    class Meta:
        model = FiscalYear
        fields = [
            'id', 'company', 'company_name', 'code', 'name',
            'start_date', 'end_date', 'is_closed', 'is_active',
            'is_current', 'entries_count'
        ]
        read_only_fields = ['id', 'company_name']
    
    def get_is_current(self, obj):
        today = timezone.now().date()
        return obj.start_date <= today <= obj.end_date
    
    def get_entries_count(self, obj):
        return obj.journal_entries.count()
    
    def validate(self, data):
        if data['start_date'] >= data['end_date']:
            raise serializers.ValidationError(
                "La date de fin doit être postérieure à la date de début"
            )
        return data


class JournalSerializer(serializers.ModelSerializer):
    """Serializer pour les journaux"""
    company_name = serializers.CharField(source='company.name', read_only=True)
    entries_count = serializers.SerializerMethodField()
    last_entry_date = serializers.SerializerMethodField()
    
    class Meta:
        model = Journal
        fields = [
            'id', 'company', 'company_name', 'code', 'name',
            'journal_type', 'description', 'is_active',
            'entries_count', 'last_entry_date'
        ]
        read_only_fields = ['id', 'company_name']
    
    def get_entries_count(self, obj):
        return obj.journal_entries.count()
    
    def get_last_entry_date(self, obj):
        last_entry = obj.journal_entries.order_by('-entry_date').first()
        return last_entry.entry_date if last_entry else None


class ChartOfAccountsSerializer(serializers.ModelSerializer):
    """Serializer pour le plan comptable"""
    company_name = serializers.CharField(source='company.name', read_only=True)
    parent_name = serializers.CharField(source='parent.name', read_only=True)
    children_count = serializers.SerializerMethodField()
    balance_info = serializers.SerializerMethodField()
    
    class Meta:
        model = ChartOfAccounts
        fields = [
            'id', 'company', 'company_name', 'account_number', 'name',
            'account_class', 'account_type', 'parent', 'parent_name',
            'is_analytical', 'is_active', 'description',
            'children_count', 'balance_info'
        ]
        read_only_fields = ['id', 'company_name', 'parent_name']
    
    def get_children_count(self, obj):
        return obj.children.count()
    
    def get_balance_info(self, obj):
        # Retourner les informations de base du solde
        # La balance détaillée sera calculée via l'endpoint dédié
        return {
            'has_movements': obj.entry_lines.exists(),
            'account_class': obj.account_class,
            'debit_nature': obj.account_class in ['1', '2', '3', '4', '6', '8']
        }


class JournalEntryLineSerializer(serializers.ModelSerializer):
    """Serializer pour les lignes d'écriture"""
    account_name = serializers.CharField(source='account.name', read_only=True)
    account_number = serializers.CharField(source='account.account_number', read_only=True)
    
    class Meta:
        model = JournalEntryLine
        fields = [
            'id', 'account', 'account_number', 'account_name',
            'description', 'debit_amount', 'credit_amount',
            'analytical_account', 'cost_center', 'reference'
        ]
        read_only_fields = ['id', 'account_name', 'account_number']
    
    def validate(self, data):
        debit = data.get('debit_amount', Decimal('0'))
        credit = data.get('credit_amount', Decimal('0'))
        
        if debit == 0 and credit == 0:
            raise serializers.ValidationError(
                "Le montant débit ou crédit doit être supérieur à 0"
            )
        
        if debit > 0 and credit > 0:
            raise serializers.ValidationError(
                "Une ligne ne peut avoir à la fois un montant débit et crédit"
            )
        
        return data


class JournalEntrySerializer(serializers.ModelSerializer):
    """Serializer pour les écritures comptables"""
    company_name = serializers.CharField(source='company.name', read_only=True)
    journal_name = serializers.CharField(source='journal.name', read_only=True)
    fiscal_year_name = serializers.CharField(source='fiscal_year.name', read_only=True)
    lines = JournalEntryLineSerializer(many=True)
    total_debit = serializers.SerializerMethodField()
    total_credit = serializers.SerializerMethodField()
    is_balanced = serializers.SerializerMethodField()
    
    class Meta:
        model = JournalEntry
        fields = [
            'id', 'company', 'company_name', 'journal', 'journal_name',
            'fiscal_year', 'fiscal_year_name', 'reference', 'entry_date',
            'description', 'status', 'validated_at', 'posted_at',
            'lines', 'total_debit', 'total_credit', 'is_balanced'
        ]
        read_only_fields = [
            'id', 'company_name', 'journal_name', 'fiscal_year_name',
            'validated_at', 'posted_at'
        ]
    
    def get_total_debit(self, obj):
        return sum(line.debit_amount for line in obj.lines.all())
    
    def get_total_credit(self, obj):
        return sum(line.credit_amount for line in obj.lines.all())
    
    def get_is_balanced(self, obj):
        total_debit = sum(line.debit_amount for line in obj.lines.all())
        total_credit = sum(line.credit_amount for line in obj.lines.all())
        return total_debit == total_credit
    
    def create(self, validated_data):
        lines_data = validated_data.pop('lines')
        entry = JournalEntry.objects.create(**validated_data)
        
        for line_data in lines_data:
            JournalEntryLine.objects.create(entry=entry, **line_data)
        
        return entry
    
    def update(self, instance, validated_data):
        lines_data = validated_data.pop('lines', None)
        
        # Mise à jour de l'écriture
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Mise à jour des lignes si fournies
        if lines_data is not None:
            # Supprimer les anciennes lignes
            instance.lines.all().delete()
            
            # Créer les nouvelles lignes
            for line_data in lines_data:
                JournalEntryLine.objects.create(entry=instance, **line_data)
        
        return instance
    
    def validate(self, data):
        lines_data = data.get('lines', [])
        
        if len(lines_data) < 2:
            raise serializers.ValidationError(
                "Une écriture doit avoir au moins 2 lignes"
            )
        
        # Vérification équilibre débit/crédit
        total_debit = sum(
            line.get('debit_amount', Decimal('0')) for line in lines_data
        )
        total_credit = sum(
            line.get('credit_amount', Decimal('0')) for line in lines_data
        )
        
        if total_debit != total_credit:
            raise serializers.ValidationError(
                f"L'écriture n'est pas équilibrée: Débit {total_debit}, Crédit {total_credit}"
            )
        
        return data


# class TrialBalanceSerializer(serializers.ModelSerializer):
#     """Serializer pour les balances générales - À implémenter"""
#     pass


# Serializers pour les rapports
class BalanceSheetSerializer(serializers.Serializer):
    """Serializer pour le bilan SYSCOHADA"""
    company = serializers.CharField()
    fiscal_year = serializers.CharField()
    balance_date = serializers.DateField()
    
    # Actif
    actif_immobilise = serializers.DecimalField(max_digits=15, decimal_places=2)
    actif_circulant = serializers.DecimalField(max_digits=15, decimal_places=2)
    tresorerie_actif = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_actif = serializers.DecimalField(max_digits=15, decimal_places=2)
    
    # Passif
    capitaux_propres = serializers.DecimalField(max_digits=15, decimal_places=2)
    dettes_financieres = serializers.DecimalField(max_digits=15, decimal_places=2)
    dettes_circulantes = serializers.DecimalField(max_digits=15, decimal_places=2)
    tresorerie_passif = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_passif = serializers.DecimalField(max_digits=15, decimal_places=2)


class IncomeStatementSerializer(serializers.Serializer):
    """Serializer pour le compte de résultat SYSCOHADA"""
    company = serializers.CharField()
    fiscal_year = serializers.CharField()
    period_start = serializers.DateField()
    period_end = serializers.DateField()
    
    # Charges
    charges_exploitation = serializers.DecimalField(max_digits=15, decimal_places=2)
    charges_financieres = serializers.DecimalField(max_digits=15, decimal_places=2)
    charges_exceptionnelles = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_charges = serializers.DecimalField(max_digits=15, decimal_places=2)
    
    # Produits
    produits_exploitation = serializers.DecimalField(max_digits=15, decimal_places=2)
    produits_financiers = serializers.DecimalField(max_digits=15, decimal_places=2)
    produits_exceptionnels = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_produits = serializers.DecimalField(max_digits=15, decimal_places=2)
    
    # Résultats
    resultat_exploitation = serializers.DecimalField(max_digits=15, decimal_places=2)
    resultat_financier = serializers.DecimalField(max_digits=15, decimal_places=2)
    resultat_exceptionnel = serializers.DecimalField(max_digits=15, decimal_places=2)
    resultat_net = serializers.DecimalField(max_digits=15, decimal_places=2)


class FundCallSerializer(serializers.ModelSerializer):
    """Serializer pour les appels de fonds"""
    company_name = serializers.CharField(source='company.name', read_only=True)
    leveling_account_from_info = serializers.SerializerMethodField()
    leveling_account_to_info = serializers.SerializerMethodField()
    create_by_user = serializers.SerializerMethodField()

    class Meta:
        model = FundCall
        fields = [
            'id', 'company', 'company_name', 'reference', 'request_date',
            'leveling_account_from', 'leveling_account_from_info',
            'leveling_account_to', 'leveling_account_to_info',
            'amount_requested', 'is_mark_as_pre_approved',
            'comment', 'create_by_user', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'reference', 'company_name', 'created_at', 'updated_at']

    def get_leveling_account_from_info(self, obj):
        if obj.leveling_account_from:
            return {
                'id': obj.leveling_account_from.id,
                'account_number': obj.leveling_account_from.account_number,
                'french_description': obj.leveling_account_from.name
            }
        return None

    def get_leveling_account_to_info(self, obj):
        if obj.leveling_account_to:
            return {
                'id': obj.leveling_account_to.id,
                'account_number': obj.leveling_account_to.account_number,
                'french_description': obj.leveling_account_to.name
            }
        return None

    def get_create_by_user(self, obj):
        if obj.create_by_user:
            return {
                'id': obj.create_by_user.id,
                'fullname': f"{obj.create_by_user.first_name} {obj.create_by_user.last_name}".strip() or obj.create_by_user.username
            }
        return None


class FundCallCreateSerializer(serializers.ModelSerializer):
    """Serializer pour la création d'appels de fonds"""

    class Meta:
        model = FundCall
        fields = [
            'request_date', 'leveling_account_from', 'leveling_account_to',
            'amount_requested', 'comment'
        ]

    def validate(self, data):
        if data['leveling_account_from'] == data['leveling_account_to']:
            raise serializers.ValidationError(
                "Le compte de départ et d'arrivée ne peuvent pas être identiques"
            )

        if data['amount_requested'] <= 0:
            raise serializers.ValidationError(
                "Le montant doit être supérieur à 0"
            )

        return data