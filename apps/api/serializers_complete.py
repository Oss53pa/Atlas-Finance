"""
Serializers complets pour WiseBook V3.0 API
Tous les modèles avec validation et relations
"""
from rest_framework import serializers
from rest_framework.validators import UniqueValidator, UniqueTogetherValidator
from django.contrib.auth import authenticate
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal
import re

from apps.core.models import Societe, Exercice, Devise, Periode, AuditLog
from apps.accounting.models import (
    CompteComptable, JournalComptable, EcritureComptable, 
    LigneEcriture, Balance, GrandLivre
)
from apps.third_party.models import Tiers, Contact, CompteClient, FactureTiers
from apps.treasury.models import (
    CompteBancaire, MouvementBancaire, Rapprochement, 
    PrevisionTresorerie
)
from apps.assets.models import Immobilisation, PlanAmortissement, InventaireActif
from apps.analytics.models import (
    AxeAnalytique, CentreAnalytique, RepartitionAnalytique
)
from apps.budgeting.models import Budget, LigneBudget, ControleBudgetaire
from apps.taxation.models import DeclarationFiscale, RegimeFiscal, TauxTaxe
from apps.reporting.models import Rapport, Dashboard, KPI
from apps.security.models import Utilisateur, Role, Permission, JournalSecurite


# ==================== BASE SERIALIZERS ====================

class BaseWiseBookSerializer(serializers.ModelSerializer):
    """Serializer de base avec champs d'audit."""
    
    def to_representation(self, instance):
        """Représentation personnalisée."""
        data = super().to_representation(instance)
        
        # Ajouter les informations d'audit si disponibles
        if hasattr(instance, 'date_creation'):
            data['date_creation'] = instance.date_creation
        if hasattr(instance, 'date_modification'):
            data['date_modification'] = instance.date_modification
            
        return data


# ==================== CORE SERIALIZERS ====================

class SocieteSerializer(BaseWiseBookSerializer):
    """Serializer pour les sociétés."""
    
    # Validation personnalisée pour SIRET/SIREN
    numero_siret = serializers.CharField(
        max_length=14, 
        required=False,
        validators=[
            lambda value: self.validate_siret(value) if value else None
        ]
    )
    
    class Meta:
        model = Societe
        fields = [
            'id', 'nom', 'sigle', 'forme_juridique', 'secteur_activite',
            'adresse', 'ville', 'code_postal', 'pays', 'region',
            'telephone', 'fax', 'email', 'site_web',
            'numero_siret', 'numero_rccm', 'numero_contribuable',
            'capital_social', 'effectif', 'chiffre_affaires',
            'monnaie_fonctionnelle', 'langue_defaut', 'fuseau_horaire',
            'active', 'date_creation', 'logo'
        ]
        read_only_fields = ['id', 'date_creation']
        
        validators = [
            UniqueValidator(
                queryset=Societe.objects.all(),
                fields=['numero_siret'],
                message="Ce numéro SIRET existe déjà."
            )
        ]
    
    def validate_email(self, value):
        """Validation de l'email."""
        if value and not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', value):
            raise serializers.ValidationError("Format d'email invalide.")
        return value
    
    def validate_siret(self, value):
        """Validation du SIRET."""
        if value and len(value) != 14:
            raise serializers.ValidationError("Le SIRET doit contenir 14 chiffres.")
        if value and not value.isdigit():
            raise serializers.ValidationError("Le SIRET ne peut contenir que des chiffres.")
        return value
    
    def validate_capital_social(self, value):
        """Validation du capital social."""
        if value is not None and value < 0:
            raise serializers.ValidationError("Le capital social ne peut pas être négatif.")
        return value


class ExerciceSerializer(BaseWiseBookSerializer):
    """Serializer pour les exercices comptables."""
    
    periodes = serializers.SerializerMethodField()
    nb_ecritures = serializers.SerializerMethodField()
    
    class Meta:
        model = Exercice
        fields = [
            'id', 'societe', 'annee', 'date_debut', 'date_fin',
            'statut', 'date_cloture', 'commentaire',
            'periodes', 'nb_ecritures', 'date_creation'
        ]
        read_only_fields = ['id', 'date_creation', 'periodes', 'nb_ecritures']
        
        validators = [
            UniqueTogetherValidator(
                queryset=Exercice.objects.all(),
                fields=['societe', 'annee'],
                message="Un exercice existe déjà pour cette année."
            )
        ]
    
    def validate(self, data):
        """Validation croisée des dates."""
        date_debut = data.get('date_debut')
        date_fin = data.get('date_fin')
        
        if date_debut and date_fin:
            if date_fin <= date_debut:
                raise serializers.ValidationError(
                    "La date de fin doit être postérieure à la date de début."
                )
            
            # Vérifier que l'exercice dure environ un an
            duree = (date_fin - date_debut).days
            if duree < 300 or duree > 400:
                raise serializers.ValidationError(
                    "Un exercice comptable doit durer environ 12 mois."
                )
        
        return data
    
    def get_periodes(self, obj):
        """Récupère les périodes de l'exercice."""
        return obj.periodes.count() if hasattr(obj, 'periodes') else 0
    
    def get_nb_ecritures(self, obj):
        """Nombre d'écritures dans l'exercice."""
        return EcritureComptable.objects.filter(exercice=obj).count()


class DeviseSerializer(BaseWiseBookSerializer):
    """Serializer pour les devises."""
    
    class Meta:
        model = Devise
        fields = [
            'id', 'code', 'nom', 'symbole', 'taux_change',
            'devise_reference', 'format_affichage', 'decimales',
            'active', 'date_creation', 'date_derniere_maj'
        ]
        read_only_fields = ['id', 'date_creation', 'date_derniere_maj']
        
        validators = [
            UniqueValidator(
                queryset=Devise.objects.all(),
                fields=['code'],
                message="Ce code devise existe déjà."
            )
        ]
    
    def validate_code(self, value):
        """Validation du code devise ISO."""
        if len(value) != 3:
            raise serializers.ValidationError("Le code devise doit contenir 3 caractères.")
        if not value.isupper():
            raise serializers.ValidationError("Le code devise doit être en majuscules.")
        return value
    
    def validate_taux_change(self, value):
        """Validation du taux de change."""
        if value <= 0:
            raise serializers.ValidationError("Le taux de change doit être positif.")
        return value


# ==================== ACCOUNTING SERIALIZERS ====================

class CompteComptableSerializer(BaseWiseBookSerializer):
    """Serializer pour les comptes comptables."""
    
    solde_debiteur = serializers.DecimalField(
        max_digits=15, decimal_places=2, read_only=True
    )
    solde_crediteur = serializers.DecimalField(
        max_digits=15, decimal_places=2, read_only=True
    )
    solde_net = serializers.DecimalField(
        max_digits=15, decimal_places=2, read_only=True
    )
    
    class Meta:
        model = CompteComptable
        fields = [
            'id', 'societe', 'numero', 'intitule', 'sens', 'classe',
            'collectif', 'compte_collectif', 'actif', 'lettrable',
            'pointable', 'tiers', 'devise', 'centre_analytique',
            'solde_debiteur', 'solde_crediteur', 'solde_net',
            'date_creation'
        ]
        read_only_fields = [
            'id', 'date_creation', 'solde_debiteur', 
            'solde_crediteur', 'solde_net'
        ]
        
        validators = [
            UniqueTogetherValidator(
                queryset=CompteComptable.objects.all(),
                fields=['societe', 'numero'],
                message="Ce numéro de compte existe déjà."
            )
        ]
    
    def validate_numero(self, value):
        """Validation du numéro de compte SYSCOHADA."""
        if not value:
            raise serializers.ValidationError("Le numéro de compte est requis.")
        
        if len(value) < 1 or len(value) > 8:
            raise serializers.ValidationError(
                "Le numéro de compte doit contenir entre 1 et 8 caractères."
            )
        
        if not value[0].isdigit():
            raise serializers.ValidationError(
                "Le numéro de compte doit commencer par un chiffre."
            )
        
        return value
    
    def validate(self, data):
        """Validation croisée."""
        numero = data.get('numero')
        classe = data.get('classe')
        
        if numero and classe:
            if int(numero[0]) != classe:
                raise serializers.ValidationError(
                    "La classe doit correspondre au premier chiffre du numéro."
                )
        
        return data


class JournalComptableSerializer(BaseWiseBookSerializer):
    """Serializer pour les journaux comptables."""
    
    nb_ecritures = serializers.SerializerMethodField()
    
    class Meta:
        model = JournalComptable
        fields = [
            'id', 'societe', 'code', 'libelle', 'type',
            'compte_contrepartie', 'numerotation_auto', 'actif',
            'nb_ecritures', 'date_creation'
        ]
        read_only_fields = ['id', 'date_creation', 'nb_ecritures']
        
        validators = [
            UniqueTogetherValidator(
                queryset=JournalComptable.objects.all(),
                fields=['societe', 'code'],
                message="Ce code journal existe déjà."
            )
        ]
    
    def validate_code(self, value):
        """Validation du code journal."""
        if len(value) > 5:
            raise serializers.ValidationError(
                "Le code journal ne peut dépasser 5 caractères."
            )
        if not value.isalnum():
            raise serializers.ValidationError(
                "Le code journal ne peut contenir que des lettres et chiffres."
            )
        return value.upper()
    
    def get_nb_ecritures(self, obj):
        """Nombre d'écritures dans ce journal."""
        return EcritureComptable.objects.filter(journal=obj).count()


class LigneEcritureSerializer(BaseWiseBookSerializer):
    """Serializer pour les lignes d'écriture."""
    
    compte_numero = serializers.CharField(source='compte.numero', read_only=True)
    compte_intitule = serializers.CharField(source='compte.intitule', read_only=True)
    
    class Meta:
        model = LigneEcriture
        fields = [
            'id', 'ecriture', 'compte', 'compte_numero', 'compte_intitule',
            'libelle', 'montant_debit', 'montant_credit', 'devise',
            'taux_change', 'montant_devise', 'numero_piece',
            'date_echeance', 'centre_analytique', 'lettrage',
            'ordre_ligne'
        ]
        read_only_fields = ['id', 'compte_numero', 'compte_intitule']
    
    def validate(self, data):
        """Validation des montants."""
        montant_debit = data.get('montant_debit', 0)
        montant_credit = data.get('montant_credit', 0)
        
        if montant_debit < 0:
            raise serializers.ValidationError(
                "Le montant débit ne peut pas être négatif."
            )
        
        if montant_credit < 0:
            raise serializers.ValidationError(
                "Le montant crédit ne peut pas être négatif."
            )
        
        if montant_debit > 0 and montant_credit > 0:
            raise serializers.ValidationError(
                "Une ligne ne peut avoir à la fois un débit et un crédit."
            )
        
        if montant_debit == 0 and montant_credit == 0:
            raise serializers.ValidationError(
                "Une ligne doit avoir soit un débit soit un crédit."
            )
        
        return data


class EcritureComptableSerializer(BaseWiseBookSerializer):
    """Serializer pour les écritures comptables."""
    
    lignes = LigneEcritureSerializer(many=True, required=False)
    journal_code = serializers.CharField(source='journal.code', read_only=True)
    total_debit = serializers.SerializerMethodField()
    total_credit = serializers.SerializerMethodField()
    equilibree = serializers.SerializerMethodField()
    
    class Meta:
        model = EcritureComptable
        fields = [
            'id', 'societe', 'journal', 'journal_code', 'numero',
            'date_ecriture', 'date_valeur', 'libelle', 'reference_externe',
            'montant_total', 'statut', 'exercice', 'periode',
            'utilisateur', 'date_validation', 'lignes',
            'total_debit', 'total_credit', 'equilibree', 'date_creation'
        ]
        read_only_fields = [
            'id', 'date_creation', 'journal_code', 'date_validation',
            'total_debit', 'total_credit', 'equilibree'
        ]
        
        validators = [
            UniqueTogetherValidator(
                queryset=EcritureComptable.objects.all(),
                fields=['societe', 'journal', 'numero'],
                message="Ce numéro d'écriture existe déjà dans ce journal."
            )
        ]
    
    def validate(self, data):
        """Validation de l'écriture."""
        date_ecriture = data.get('date_ecriture')
        exercice = data.get('exercice')
        
        if date_ecriture and exercice:
            if not (exercice.date_debut <= date_ecriture <= exercice.date_fin):
                raise serializers.ValidationError(
                    "La date d'écriture doit être dans la période de l'exercice."
                )
        
        return data
    
    def create(self, validated_data):
        """Création avec lignes d'écriture."""
        lignes_data = validated_data.pop('lignes', [])
        ecriture = EcritureComptable.objects.create(**validated_data)
        
        for ligne_data in lignes_data:
            LigneEcriture.objects.create(ecriture=ecriture, **ligne_data)
        
        return ecriture
    
    def get_total_debit(self, obj):
        """Total des débits."""
        return sum(ligne.montant_debit for ligne in obj.lignes.all())
    
    def get_total_credit(self, obj):
        """Total des crédits."""
        return sum(ligne.montant_credit for ligne in obj.lignes.all())
    
    def get_equilibree(self, obj):
        """Vérifie si l'écriture est équilibrée."""
        return self.get_total_debit(obj) == self.get_total_credit(obj)


# ==================== THIRD PARTY SERIALIZERS ====================

class ContactSerializer(BaseWiseBookSerializer):
    """Serializer pour les contacts."""
    
    class Meta:
        model = Contact
        fields = [
            'id', 'tiers', 'civilite', 'nom', 'prenom',
            'fonction', 'telephone', 'mobile', 'email',
            'adresse', 'ville', 'code_postal', 'pays',
            'langue', 'principal', 'actif', 'date_creation'
        ]
        read_only_fields = ['id', 'date_creation']
    
    def validate_email(self, value):
        """Validation de l'email."""
        if value and not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', value):
            raise serializers.ValidationError("Format d'email invalide.")
        return value


class TiersSerializer(BaseWiseBookSerializer):
    """Serializer pour les tiers."""
    
    contacts = ContactSerializer(many=True, read_only=True)
    solde_courant = serializers.DecimalField(
        max_digits=15, decimal_places=2, read_only=True
    )
    nb_factures = serializers.SerializerMethodField()
    
    class Meta:
        model = Tiers
        fields = [
            'id', 'societe', 'type', 'nom', 'code', 'forme_juridique',
            'secteur_activite', 'activite', 'adresse', 'ville',
            'code_postal', 'pays', 'region', 'telephone', 'fax',
            'email', 'site_web', 'numero_identification', 'numero_tva',
            'devise_defaut', 'mode_reglement', 'delai_reglement',
            'plafond_credit', 'remise_defaut', 'bloque',
            'date_blocage', 'motif_blocage', 'actif',
            'contacts', 'solde_courant', 'nb_factures', 'date_creation'
        ]
        read_only_fields = [
            'id', 'date_creation', 'contacts', 'solde_courant', 'nb_factures'
        ]
        
        validators = [
            UniqueTogetherValidator(
                queryset=Tiers.objects.all(),
                fields=['societe', 'code'],
                message="Ce code tiers existe déjà."
            )
        ]
    
    def validate_code(self, value):
        """Validation du code tiers."""
        if len(value) > 20:
            raise serializers.ValidationError(
                "Le code tiers ne peut dépasser 20 caractères."
            )
        return value.upper()
    
    def validate_plafond_credit(self, value):
        """Validation du plafond de crédit."""
        if value is not None and value < 0:
            raise serializers.ValidationError(
                "Le plafond de crédit ne peut pas être négatif."
            )
        return value
    
    def get_nb_factures(self, obj):
        """Nombre de factures du tiers."""
        return getattr(obj, 'factures', []).count() if hasattr(obj, 'factures') else 0


# ==================== TREASURY SERIALIZERS ====================

class CompteBancaireSerializer(BaseWiseBookSerializer):
    """Serializer pour les comptes bancaires."""
    
    solde_actuel = serializers.DecimalField(
        max_digits=15, decimal_places=2, read_only=True
    )
    nb_mouvements = serializers.SerializerMethodField()
    
    class Meta:
        model = CompteBancaire
        fields = [
            'id', 'societe', 'nom', 'banque', 'agence',
            'numero_compte', 'cle_rib', 'iban', 'bic',
            'devise', 'solde_initial', 'date_ouverture',
            'date_fermeture', 'plafond_debiteur', 'frais_tenue',
            'actif', 'solde_actuel', 'nb_mouvements', 'date_creation'
        ]
        read_only_fields = ['id', 'date_creation', 'solde_actuel', 'nb_mouvements']
        
        validators = [
            UniqueTogetherValidator(
                queryset=CompteBancaire.objects.all(),
                fields=['societe', 'numero_compte'],
                message="Ce numéro de compte bancaire existe déjà."
            )
        ]
    
    def validate_iban(self, value):
        """Validation IBAN."""
        if value and len(value) < 15:
            raise serializers.ValidationError("L'IBAN doit contenir au moins 15 caractères.")
        return value
    
    def get_nb_mouvements(self, obj):
        """Nombre de mouvements."""
        return MouvementBancaire.objects.filter(compte_bancaire=obj).count()


class MouvementBancaireSerializer(BaseWiseBookSerializer):
    """Serializer pour les mouvements bancaires."""
    
    compte_nom = serializers.CharField(source='compte_bancaire.nom', read_only=True)
    
    class Meta:
        model = MouvementBancaire
        fields = [
            'id', 'compte_bancaire', 'compte_nom', 'date_mouvement',
            'date_valeur', 'type_mouvement', 'numero_operation',
            'libelle', 'reference_interne', 'reference_banque',
            'montant', 'solde_apres', 'devise', 'taux_change',
            'statut', 'ecriture_comptable', 'date_creation'
        ]
        read_only_fields = ['id', 'date_creation', 'compte_nom']
    
    def validate_montant(self, value):
        """Validation du montant."""
        if value == 0:
            raise serializers.ValidationError("Le montant ne peut pas être nul.")
        return value


# ==================== ASSETS SERIALIZERS ====================

class ImmobilisationSerializer(BaseWiseBookSerializer):
    """Serializer pour les immobilisations."""
    
    valeur_nette = serializers.DecimalField(
        max_digits=15, decimal_places=2, read_only=True
    )
    taux_amortissement = serializers.DecimalField(
        max_digits=5, decimal_places=2, read_only=True
    )
    
    class Meta:
        model = Immobilisation
        fields = [
            'id', 'societe', 'designation', 'numero_inventaire',
            'categorie', 'fournisseur', 'date_acquisition',
            'valeur_acquisition', 'valeur_residuelle', 'duree_amortissement',
            'methode_amortissement', 'compte_immobilisation',
            'compte_amortissement', 'compte_dotation', 'localisation',
            'etat', 'mise_rebut', 'date_mise_rebut',
            'valeur_nette', 'taux_amortissement', 'date_creation'
        ]
        read_only_fields = ['id', 'date_creation', 'valeur_nette', 'taux_amortissement']
    
    def validate_duree_amortissement(self, value):
        """Validation de la durée d'amortissement."""
        if value <= 0:
            raise serializers.ValidationError(
                "La durée d'amortissement doit être positive."
            )
        if value > 600:  # 50 ans maximum
            raise serializers.ValidationError(
                "La durée d'amortissement ne peut dépasser 600 mois."
            )
        return value
    
    def validate(self, data):
        """Validation croisée."""
        valeur_acquisition = data.get('valeur_acquisition')
        valeur_residuelle = data.get('valeur_residuelle', 0)
        
        if valeur_acquisition and valeur_residuelle:
            if valeur_residuelle >= valeur_acquisition:
                raise serializers.ValidationError(
                    "La valeur résiduelle doit être inférieure à la valeur d'acquisition."
                )
        
        return data


# ==================== ANALYTICS SERIALIZERS ====================

class AxeAnalytiqueSerializer(BaseWiseBookSerializer):
    """Serializer pour les axes analytiques."""
    
    nb_centres = serializers.SerializerMethodField()
    
    class Meta:
        model = AxeAnalytique
        fields = [
            'id', 'societe', 'code', 'libelle', 'type',
            'obligatoire', 'ordre_affichage', 'actif',
            'nb_centres', 'date_creation'
        ]
        read_only_fields = ['id', 'date_creation', 'nb_centres']
    
    def get_nb_centres(self, obj):
        """Nombre de centres analytiques."""
        return CentreAnalytique.objects.filter(axe=obj).count()


class CentreAnalytiqueSerializer(BaseWiseBookSerializer):
    """Serializer pour les centres analytiques."""
    
    axe_libelle = serializers.CharField(source='axe.libelle', read_only=True)
    
    class Meta:
        model = CentreAnalytique
        fields = [
            'id', 'axe', 'axe_libelle', 'code', 'libelle',
            'description', 'responsable', 'budget_alloue',
            'parent', 'niveau', 'actif', 'date_creation'
        ]
        read_only_fields = ['id', 'date_creation', 'axe_libelle', 'niveau']


# ==================== SECURITY SERIALIZERS ====================

class PermissionSerializer(serializers.ModelSerializer):
    """Serializer pour les permissions."""
    
    class Meta:
        model = Permission
        fields = ['id', 'code', 'nom', 'module', 'description', 'actif']
        read_only_fields = ['id']


class RoleSerializer(BaseWiseBookSerializer):
    """Serializer pour les rôles."""
    
    permissions = PermissionSerializer(many=True, read_only=True)
    nb_utilisateurs = serializers.SerializerMethodField()
    
    class Meta:
        model = Role
        fields = [
            'id', 'nom', 'code', 'description', 'permissions',
            'actif', 'nb_utilisateurs', 'date_creation'
        ]
        read_only_fields = ['id', 'date_creation', 'nb_utilisateurs']
    
    def get_nb_utilisateurs(self, obj):
        """Nombre d'utilisateurs ayant ce rôle."""
        return obj.utilisateurs.count() if hasattr(obj, 'utilisateurs') else 0


class UtilisateurSerializer(BaseWiseBookSerializer):
    """Serializer pour les utilisateurs."""
    
    roles = RoleSerializer(many=True, read_only=True)
    societe_nom = serializers.CharField(source='societe.nom', read_only=True)
    
    class Meta:
        model = Utilisateur
        fields = [
            'id', 'username', 'email', 'nom', 'prenom',
            'telephone', 'fonction', 'societe', 'societe_nom',
            'is_active', 'is_staff', 'date_joined',
            'date_derniere_connexion', 'preferences',
            'langue', 'fuseau_horaire', 'roles'
        ]
        read_only_fields = [
            'id', 'date_joined', 'date_derniere_connexion',
            'societe_nom', 'roles'
        ]
        extra_kwargs = {
            'password': {'write_only': True}
        }
    
    def create(self, validated_data):
        """Création d'utilisateur avec mot de passe hashé."""
        password = validated_data.pop('password', None)
        user = Utilisateur.objects.create(**validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user


# ==================== REPORTING SERIALIZERS ====================

class RapportSerializer(BaseWiseBookSerializer):
    """Serializer pour les rapports."""
    
    class Meta:
        model = Rapport
        fields = [
            'id', 'nom', 'description', 'type', 'module',
            'requete_sql', 'parametres', 'format_export',
            'planifie', 'frequence', 'destinataires',
            'actif', 'date_creation', 'derniere_execution'
        ]
        read_only_fields = ['id', 'date_creation', 'derniere_execution']


class DashboardSerializer(BaseWiseBookSerializer):
    """Serializer pour les tableaux de bord."""
    
    class Meta:
        model = Dashboard
        fields = [
            'id', 'nom', 'description', 'layout', 'widgets',
            'filtre_defaut', 'actualisation_auto', 'partage',
            'actif', 'date_creation'
        ]
        read_only_fields = ['id', 'date_creation']


# ==================== BUDGETING SERIALIZERS ====================

class BudgetSerializer(BaseWiseBookSerializer):
    """Serializer pour les budgets."""
    
    total_prevu = serializers.SerializerMethodField()
    total_realise = serializers.SerializerMethodField()
    ecart = serializers.SerializerMethodField()
    
    class Meta:
        model = Budget
        fields = [
            'id', 'societe', 'exercice', 'nom', 'description',
            'type', 'statut', 'version', 'date_debut', 'date_fin',
            'responsable', 'total_prevu', 'total_realise',
            'ecart', 'date_creation'
        ]
        read_only_fields = [
            'id', 'date_creation', 'total_prevu', 
            'total_realise', 'ecart'
        ]
    
    def get_total_prevu(self, obj):
        """Montant total prévu."""
        return sum(ligne.montant_prevu for ligne in obj.lignes.all()) if hasattr(obj, 'lignes') else 0
    
    def get_total_realise(self, obj):
        """Montant total réalisé."""
        return sum(ligne.montant_realise for ligne in obj.lignes.all()) if hasattr(obj, 'lignes') else 0
    
    def get_ecart(self, obj):
        """Écart budgétaire."""
        return self.get_total_realise(obj) - self.get_total_prevu(obj)


# ==================== TAXATION SERIALIZERS ====================

class DeclarationFiscaleSerializer(BaseWiseBookSerializer):
    """Serializer pour les déclarations fiscales."""
    
    class Meta:
        model = DeclarationFiscale
        fields = [
            'id', 'societe', 'type_declaration', 'periode',
            'exercice', 'date_limite', 'statut', 'montant_declare',
            'montant_paye', 'numero_declaration', 'fichier_xml',
            'date_soumission', 'date_creation'
        ]
        read_only_fields = ['id', 'date_creation', 'date_soumission']


# ==================== AUTHENTICATION SERIALIZERS ====================

class LoginSerializer(serializers.Serializer):
    """Serializer pour l'authentification."""
    
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    remember_me = serializers.BooleanField(default=False)
    
    def validate(self, attrs):
        """Validation des identifiants."""
        username = attrs.get('username')
        password = attrs.get('password')
        
        if username and password:
            user = authenticate(username=username, password=password)
            
            if not user:
                raise serializers.ValidationError('Identifiants invalides.')
            
            if not user.is_active:
                raise serializers.ValidationError('Compte utilisateur désactivé.')
            
            attrs['user'] = user
            return attrs
        else:
            raise serializers.ValidationError('Nom d\'utilisateur et mot de passe requis.')


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer pour le changement de mot de passe."""
    
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        """Validation du changement de mot de passe."""
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError(
                "Les mots de passe ne correspondent pas."
            )
        return attrs
    
    def validate_new_password(self, value):
        """Validation de la complexité du mot de passe."""
        if len(value) < 8:
            raise serializers.ValidationError(
                "Le mot de passe doit contenir au moins 8 caractères."
            )
        
        if not any(c.isupper() for c in value):
            raise serializers.ValidationError(
                "Le mot de passe doit contenir au moins une majuscule."
            )
        
        if not any(c.islower() for c in value):
            raise serializers.ValidationError(
                "Le mot de passe doit contenir au moins une minuscule."
            )
        
        if not any(c.isdigit() for c in value):
            raise serializers.ValidationError(
                "Le mot de passe doit contenir au moins un chiffre."
            )
        
        return value