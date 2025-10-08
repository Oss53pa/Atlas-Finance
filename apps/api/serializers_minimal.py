"""
Serializers minimaux pour Phase 1 WiseBook API
N'utilise que les modèles existants
"""
from rest_framework import serializers
from django.contrib.auth import authenticate
from django.utils import timezone
from decimal import Decimal

from apps.core.models import Societe, Devise
from apps.accounting.models import (
    FiscalYear, Journal, ChartOfAccounts,
    JournalEntry, JournalEntryLine
)
from apps.third_party.models import Tiers, AdresseTiers, ContactTiers
from apps.authentication.models import User, Role, Permission


# ============================================================================
# AUTHENTICATION SERIALIZERS
# ============================================================================

class LoginSerializer(serializers.Serializer):
    """Sérialiseur pour l'authentification."""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')

        if email and password:
            user = authenticate(username=email, password=password)

            if not user:
                raise serializers.ValidationError('Identifiants invalides.')

            if not user.is_active:
                raise serializers.ValidationError('Compte utilisateur désactivé.')

            attrs['user'] = user
            return attrs

        raise serializers.ValidationError('Email et mot de passe requis.')


class UserSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les utilisateurs."""
    role_name = serializers.CharField(source='role.name', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'phone',
            'is_active', 'role', 'role_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
        extra_kwargs = {'password': {'write_only': True}}


class RoleSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les rôles."""

    class Meta:
        model = Role
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class PermissionSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les permissions."""

    class Meta:
        model = Permission
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


# ============================================================================
# CORE SERIALIZERS
# ============================================================================

class DeviseSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les devises."""

    class Meta:
        model = Devise
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class SocieteSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les sociétés."""

    class Meta:
        model = Societe
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


# ============================================================================
# ACCOUNTING SERIALIZERS
# ============================================================================

class FiscalYearSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les exercices comptables."""
    company_name = serializers.CharField(source='company.nom', read_only=True)

    class Meta:
        model = FiscalYear
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class JournalSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les journaux comptables."""
    company_name = serializers.CharField(source='company.nom', read_only=True)

    class Meta:
        model = Journal
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'last_number']


class ChartOfAccountsSerializer(serializers.ModelSerializer):
    """Sérialiseur pour le plan comptable."""
    company_name = serializers.CharField(source='company.nom', read_only=True)
    parent_name = serializers.CharField(source='parent_account.name', read_only=True)

    class Meta:
        model = ChartOfAccounts
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'level']


class JournalEntryLineSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les lignes d'écriture."""
    account_code = serializers.CharField(source='account.code', read_only=True)
    account_name = serializers.CharField(source='account.name', read_only=True)

    class Meta:
        model = JournalEntryLine
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, attrs):
        """Validation personnalisée."""
        debit = attrs.get('debit_amount', 0)
        credit = attrs.get('credit_amount', 0)

        if debit > 0 and credit > 0:
            raise serializers.ValidationError(
                "Une ligne ne peut pas avoir à la fois un débit et un crédit"
            )

        if debit == 0 and credit == 0:
            raise serializers.ValidationError(
                "Une ligne doit avoir soit un débit soit un crédit"
            )

        return attrs


class JournalEntrySerializer(serializers.ModelSerializer):
    """Sérialiseur pour les écritures comptables."""
    lines = JournalEntryLineSerializer(many=True, read_only=True)
    journal_code = serializers.CharField(source='journal.code', read_only=True)
    journal_name = serializers.CharField(source='journal.name', read_only=True)
    company_name = serializers.CharField(source='company.nom', read_only=True)

    class Meta:
        model = JournalEntry
        fields = '__all__'
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'piece_number',
            'total_debit', 'total_credit', 'is_balanced'
        ]

    def validate(self, attrs):
        """Validation de l'équilibre."""
        # La validation complète se fera après l'ajout des lignes
        return attrs


# ============================================================================
# THIRD PARTY SERIALIZERS
# ============================================================================

class AdresseTiersSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les adresses des tiers."""

    class Meta:
        model = AdresseTiers
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class ContactTiersSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les contacts des tiers."""

    class Meta:
        model = ContactTiers
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class TiersSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les tiers."""
    adresses = AdresseTiersSerializer(many=True, read_only=True)
    contacts = ContactTiersSerializer(many=True, read_only=True)
    compte_client_code = serializers.CharField(source='compte_client.code', read_only=True)
    compte_fournisseur_code = serializers.CharField(source='compte_fournisseur.code', read_only=True)

    class Meta:
        model = Tiers
        fields = '__all__'
        read_only_fields = [
            'id', 'created_at', 'updated_at',
            'encours_actuel', 'retard_moyen'
        ]


# ============================================================================
# ALIAS POUR COMPATIBILITÉ
# ============================================================================

# Alias pour compatibilité avec le code existant
ExerciceSerializer = FiscalYearSerializer
CompteComptableSerializer = ChartOfAccountsSerializer
EcritureComptableSerializer = JournalEntrySerializer
LigneEcritureSerializer = JournalEntryLineSerializer
JournalComptableSerializer = JournalSerializer
UtilisateurSerializer = UserSerializer
