from rest_framework import serializers
from django.contrib.auth import authenticate
from django.utils import timezone
from decimal import Decimal

from apps.core.models import Societe, Devise
from apps.accounting.models import FiscalYear, ChartOfAccounts, JournalEntry, JournalEntryLine, Journal
# Alias pour compatibilité
Exercice = FiscalYear
CompteComptable = ChartOfAccounts
EcritureComptable = JournalEntry
LigneEcriture = JournalEntryLine
from apps.third_party.models import Client, Fournisseur, Facture
from apps.treasury.models import ComptesBancaires, MouvementTresorerie, Rapprochement
from apps.assets.models import Immobilisation, Amortissement
from apps.analytics.models import AxeAnalytique, SectionAnalytique, EcritureAnalytique
from apps.budget.models import Budget, LigneBudget, SimulationBudget
from apps.taxation.models import TVA, DeclarationFiscale
from apps.fund_calls.models import CampagneAppel, AppelFonds
from apps.reporting.models import Rapport, TableauBord
from apps.financial_analysis.models import AnalyseFinanciere, RatioFinancier
from apps.security.models import Utilisateur


class UtilisateurSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les utilisateurs."""
    
    class Meta:
        model = Utilisateur
        fields = [
            'id', 'email', 'nom', 'prenom', 'telephone',
            'is_active', 'date_joined', 'date_derniere_activite',
            'preferences', 'profil', 'role'
        ]
        read_only_fields = ['id', 'date_joined', 'date_derniere_activite']


class LoginSerializer(serializers.Serializer):
    """Sérialiseur pour l'authentification."""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    mfa_code = serializers.CharField(max_length=6, required=False)
    
    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        mfa_code = attrs.get('mfa_code')
        
        if email and password:
            user = authenticate(username=email, password=password)
            
            if not user:
                raise serializers.ValidationError('Identifiants invalides.')
            
            if not user.is_active:
                raise serializers.ValidationError('Compte utilisateur désactivé.')
            
            # Vérifier MFA si activé
            if user.mfa_active and not mfa_code:
                raise serializers.ValidationError('Code MFA requis.')
            
            if user.mfa_active and mfa_code:
                if not user.verifier_code_mfa(mfa_code):
                    raise serializers.ValidationError('Code MFA invalide.')
            
            attrs['user'] = user
            return attrs
        
        raise serializers.ValidationError('Email et mot de passe requis.')


class SocieteSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les sociétés."""
    
    class Meta:
        model = Societe
        fields = '__all__'
        read_only_fields = ['id', 'date_creation']


class ExerciceSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les exercices comptables."""
    
    class Meta:
        model = Exercice
        fields = '__all__'
        read_only_fields = ['id']


class DeviseSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les devises."""
    
    class Meta:
        model = Devise
        fields = '__all__'
        read_only_fields = ['id']


class CompteComptableSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les comptes comptables."""
    
    class Meta:
        model = CompteComptable
        fields = '__all__'
        read_only_fields = ['id', 'date_creation']


class LigneEcritureSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les lignes d'écriture."""
    compte_nom = serializers.CharField(source='compte.nom', read_only=True)
    
    class Meta:
        model = LigneEcriture
        fields = '__all__'
        read_only_fields = ['id']


class EcritureComptableSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les écritures comptables."""
    lignes = LigneEcritureSerializer(many=True, read_only=True)
    
    class Meta:
        model = EcritureComptable
        fields = '__all__'
        read_only_fields = ['id', 'date_creation', 'numero_piece']
    
    def validate(self, attrs):
        """Validation de l'équilibre des écritures."""
        if 'lignes' in attrs:
            total_debit = sum(ligne.get('montant_debit', 0) for ligne in attrs['lignes'])
            total_credit = sum(ligne.get('montant_credit', 0) for ligne in attrs['lignes'])
            
            if total_debit != total_credit:
                raise serializers.ValidationError(
                    'L\'écriture doit être équilibrée (débit = crédit).'
                )
        
        return attrs


class ClientSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les clients."""
    
    class Meta:
        model = Client
        fields = '__all__'
        read_only_fields = ['id', 'date_creation']


class FournisseurSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les fournisseurs."""
    
    class Meta:
        model = Fournisseur
        fields = '__all__'
        read_only_fields = ['id', 'date_creation']


class FactureSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les factures."""
    
    class Meta:
        model = Facture
        fields = '__all__'
        read_only_fields = ['id', 'date_creation', 'numero']


class ComptesBancairesSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les comptes bancaires."""
    
    class Meta:
        model = ComptesBancaires
        fields = '__all__'
        read_only_fields = ['id', 'date_creation']


class MouvementTresorerieSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les mouvements de trésorerie."""
    
    class Meta:
        model = MouvementTresorerie
        fields = '__all__'
        read_only_fields = ['id', 'date_creation']


class RapprochementSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les rapprochements bancaires."""
    
    class Meta:
        model = Rapprochement
        fields = '__all__'
        read_only_fields = ['id', 'date_creation']


class ImmobilisationSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les immobilisations."""
    
    class Meta:
        model = Immobilisation
        fields = '__all__'
        read_only_fields = ['id', 'date_acquisition']


class AmortissementSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les amortissements."""
    
    class Meta:
        model = Amortissement
        fields = '__all__'
        read_only_fields = ['id']


class AxeAnalytiqueSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les axes analytiques."""
    
    class Meta:
        model = AxeAnalytique
        fields = '__all__'
        read_only_fields = ['id']


class SectionAnalytiqueSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les sections analytiques."""
    
    class Meta:
        model = SectionAnalytique
        fields = '__all__'
        read_only_fields = ['id']


class EcritureAnalytiqueSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les écritures analytiques."""
    
    class Meta:
        model = EcritureAnalytique
        fields = '__all__'
        read_only_fields = ['id']


class BudgetSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les budgets."""
    
    class Meta:
        model = Budget
        fields = '__all__'
        read_only_fields = ['id', 'date_creation']


class LigneBudgetSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les lignes de budget."""
    
    class Meta:
        model = LigneBudget
        fields = '__all__'
        read_only_fields = ['id']


class SimulationBudgetSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les simulations budgétaires."""
    
    class Meta:
        model = SimulationBudget
        fields = '__all__'
        read_only_fields = ['id', 'date_creation']


class TVASerializer(serializers.ModelSerializer):
    """Sérialiseur pour la TVA."""
    
    class Meta:
        model = TVA
        fields = '__all__'
        read_only_fields = ['id']


class DeclarationFiscaleSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les déclarations fiscales."""
    
    class Meta:
        model = DeclarationFiscale
        fields = '__all__'
        read_only_fields = ['id', 'date_creation']


class CampagneAppelSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les campagnes d'appel."""
    
    class Meta:
        model = CampagneAppel
        fields = '__all__'
        read_only_fields = ['id', 'date_creation']


class AppelFondsSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les appels de fonds."""
    
    class Meta:
        model = AppelFonds
        fields = '__all__'
        read_only_fields = ['id', 'date_creation']


class RapportSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les rapports."""
    
    class Meta:
        model = Rapport
        fields = '__all__'
        read_only_fields = ['id', 'date_creation']


class TableauBordSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les tableaux de bord."""
    
    class Meta:
        model = TableauBord
        fields = '__all__'
        read_only_fields = ['id', 'date_creation']


class AnalyseFinanciereSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les analyses financières."""
    
    class Meta:
        model = AnalyseFinanciere
        fields = '__all__'
        read_only_fields = ['id', 'date_analyse']


class RatioFinancierSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les ratios financiers."""
    
    class Meta:
        model = RatioFinancier
        fields = '__all__'
        read_only_fields = ['id']