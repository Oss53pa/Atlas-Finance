from rest_framework import serializers
from django.contrib.auth import get_user_model
from decimal import Decimal
from datetime import date

from .models import (
    RegimeFiscal, TypeDeclaration, DeclarationFiscale,
    LigneDeclaration, EvenementFiscal, ObligationFiscale,
    PlanificationDeclaration, ControlesFiscaux, DocumentFiscal, AlerteFiscale
)
from ..accounting.models import PlanComptable, FiscalYear as Exercice

class RegimeFiscalSerializer(serializers.ModelSerializer):
    """Serializer pour les régimes fiscaux."""
    
    class Meta:
        model = RegimeFiscal
        fields = [
            'id', 'code', 'libelle', 'description', 'type_regime',
            'taux_is', 'taux_tva_standard', 'taux_tva_reduit',
            'seuil_ca_annual', 'plafond_deduc_charges',
            'declarations_obligatoires', 'date_debut_validite', 
            'date_fin_validite', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def validate(self, data):
        """Validation des données du régime fiscal."""
        if data.get('date_fin_validite') and data.get('date_debut_validite'):
            if data['date_fin_validite'] <= data['date_debut_validite']:
                raise serializers.ValidationError(
                    "La date de fin doit être postérieure à la date de début"
                )
        return data

class TypeDeclarationSerializer(serializers.ModelSerializer):
    """Serializer pour les types de déclarations."""
    
    comptes_base_calcul = serializers.PrimaryKeyRelatedField(
        queryset=PlanComptable.objects.all(),
        many=True,
        required=False
    )
    comptes_detail = serializers.SerializerMethodField()
    
    class Meta:
        model = TypeDeclaration
        fields = [
            'id', 'code', 'libelle', 'description', 'frequence', 'statut',
            'jour_echeance', 'mois_offset', 'formule_calcul', 'comptes_base_calcul',
            'comptes_detail', 'taux_penalite_retard', 'penalite_fixe',
            'is_active', 'ordre_affichage', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'comptes_detail']
    
    def get_comptes_detail(self, obj):
        """Détail des comptes de base de calcul."""
        return [
            {
                'id': compte.id,
                'numero': compte.numero,
                'intitule': compte.intitule
            }
            for compte in obj.comptes_base_calcul.all()
        ]

class LigneDeclarationSerializer(serializers.ModelSerializer):
    """Serializer pour les lignes de déclaration."""
    
    compte_detail = serializers.SerializerMethodField()
    
    class Meta:
        model = LigneDeclaration
        fields = [
            'id', 'code_ligne', 'libelle', 'description',
            'montant_base', 'taux_applique', 'montant_calcule',
            'obligatoire', 'calculee_auto', 'formule', 'ordre',
            'compte', 'compte_detail', 'created_at', 'updated_at'
        ]
        read_only_fields = ['montant_calcule', 'created_at', 'updated_at', 'compte_detail']
    
    def get_compte_detail(self, obj):
        """Détail du compte comptable associé."""
        if obj.compte:
            return {
                'numero': obj.compte.numero,
                'intitule': obj.compte.intitule
            }
        return None

class DeclarationFiscaleSerializer(serializers.ModelSerializer):
    """Serializer pour les déclarations fiscales."""
    
    type_declaration_detail = TypeDeclarationSerializer(source='type_declaration', read_only=True)
    regime_fiscal_detail = RegimeFiscalSerializer(source='regime_fiscal', read_only=True)
    valide_par_detail = serializers.SerializerMethodField()
    transmise_par_detail = serializers.SerializerMethodField()
    lignes = LigneDeclarationSerializer(many=True, read_only=True)
    is_en_retard = serializers.ReadOnlyField()
    jours_retard = serializers.ReadOnlyField()
    
    class Meta:
        model = DeclarationFiscale
        fields = [
            'id', 'numero_declaration', 'reference_administration',
            'exercice', 'periode_debut', 'periode_fin',
            'date_limite_depot', 'date_limite_paiement',
            'base_imposable', 'montant_impot', 'credit_impot',
            'acompte_verse', 'montant_du', 'penalite_retard', 'majorations',
            'statut', 'date_validation', 'date_transmission', 'date_paiement',
            'valide_par', 'transmise_par', 'valide_par_detail', 'transmise_par_detail',
            'fichier_declaration', 'accuse_reception', 'donnees_declaration',
            'observations', 'commentaires_administration',
            'type_declaration', 'regime_fiscal', 'type_declaration_detail',
            'regime_fiscal_detail', 'lignes', 'is_en_retard', 'jours_retard',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'montant_du', 'is_en_retard', 'jours_retard',
            'created_at', 'updated_at'
        ]
    
    def get_valide_par_detail(self, obj):
        """Détail de l'utilisateur validateur."""
        if obj.valide_par:
            return {
                'username': obj.valide_par.username,
                'email': obj.valide_par.email
            }
        return None
    
    def get_transmise_par_detail(self, obj):
        """Détail de l'utilisateur transmetteur."""
        if obj.transmise_par:
            return {
                'username': obj.transmise_par.username,
                'email': obj.transmise_par.email
            }
        return None

class DeclarationCreateSerializer(serializers.Serializer):
    """Serializer pour la création de déclarations automatiques."""
    
    type_declaration = serializers.PrimaryKeyRelatedField(
        queryset=TypeDeclaration.objects.all()
    )
    exercice = serializers.PrimaryKeyRelatedField(
        queryset=Exercice.objects.all()
    )
    periode_debut = serializers.DateField()
    periode_fin = serializers.DateField()
    
    def validate(self, data):
        """Validation des données de création."""
        if data['periode_fin'] <= data['periode_debut']:
            raise serializers.ValidationError(
                "La période de fin doit être postérieure à la période de début"
            )
        return data

class EvenementFiscalSerializer(serializers.ModelSerializer):
    """Serializer pour les événements fiscaux"""
    declaration_numero = serializers.CharField(source='declaration.numero_declaration', read_only=True)
    
    class Meta:
        model = EvenementFiscal
        fields = [
            'id', 'type_evenement', 'description', 'date_evenement',
            'declaration', 'declaration_numero', 'montant', 'date_creation'
        ]
        read_only_fields = ['date_creation']

class ObligationFiscaleSerializer(serializers.ModelSerializer):
    """Serializer pour les obligations fiscales"""
    jours_restants = serializers.SerializerMethodField()
    en_retard = serializers.SerializerMethodField()
    
    class Meta:
        model = ObligationFiscale
        fields = [
            'id', 'type_obligation', 'description', 'date_echeance',
            'statut', 'priorite', 'montant_estime', 'jours_restants', 'en_retard',
            'date_creation'
        ]
        read_only_fields = ['date_creation']
    
    def get_jours_restants(self, obj):
        """Calcule le nombre de jours restants"""
        from django.utils import timezone
        if obj.date_echeance:
            delta = obj.date_echeance - timezone.now().date()
            return delta.days
        return None
    
    def get_en_retard(self, obj):
        """Indique si l'obligation est en retard"""
        from django.utils import timezone
        if obj.date_echeance:
            return obj.date_echeance < timezone.now().date() and obj.statut != 'TERMINEE'
        return False

class PlanificationDeclarationSerializer(serializers.ModelSerializer):
    """Serializer pour la planification des déclarations"""
    type_declaration_libelle = serializers.CharField(source='type_declaration.libelle', read_only=True)
    
    class Meta:
        model = PlanificationDeclaration
        fields = [
            'id', 'type_declaration', 'type_declaration_libelle', 'date_prevue',
            'periode_debut', 'periode_fin', 'statut', 'automatique',
            'date_creation', 'date_execution'
        ]
        read_only_fields = ['date_creation', 'date_execution']

class ControlesFiscauxSerializer(serializers.ModelSerializer):
    """Serializer pour les contrôles fiscaux"""
    duree_controle = serializers.SerializerMethodField()
    
    class Meta:
        model = ControlesFiscaux
        fields = [
            'id', 'type_controle', 'organisme_controleur', 'date_debut', 'date_fin',
            'periode_controlee_debut', 'periode_controlee_fin', 'statut',
            'montant_redressement', 'montant_penalites', 'duree_controle',
            'observations', 'date_creation'
        ]
        read_only_fields = ['date_creation']
    
    def get_duree_controle(self, obj):
        """Calcule la durée du contrôle"""
        if obj.date_debut and obj.date_fin:
            return (obj.date_fin - obj.date_debut).days
        return None

class DocumentFiscalSerializer(serializers.ModelSerializer):
    """Serializer pour les documents fiscaux"""
    
    class Meta:
        model = DocumentFiscal
        fields = [
            'id', 'type_document', 'numero_document', 'date_document',
            'statut', 'fichier', 'description', 'date_creation'
        ]
        read_only_fields = ['date_creation']

class AlerteFiscaleSerializer(serializers.ModelSerializer):
    """Serializer pour les alertes fiscales"""
    jours_depuis_creation = serializers.SerializerMethodField()
    
    class Meta:
        model = AlerteFiscale
        fields = [
            'id', 'type_alerte', 'niveau_priorite', 'message',
            'resolu', 'date_creation', 'date_resolution',
            'jours_depuis_creation'
        ]
        read_only_fields = ['date_creation', 'date_resolution']
    
    def get_jours_depuis_creation(self, obj):
        """Calcule le nombre de jours depuis la création"""
        from django.utils import timezone
        delta = timezone.now().date() - obj.date_creation.date()
        return delta.days

# Serializers pour les statistiques et rapports

class StatistiquesFiscalesSerializer(serializers.Serializer):
    """Serializer pour les statistiques fiscales"""
    periode_debut = serializers.DateField()
    periode_fin = serializers.DateField()
    total_declarations = serializers.IntegerField()
    declarations_en_cours = serializers.IntegerField()
    declarations_deposees = serializers.IntegerField()
    declarations_en_retard = serializers.IntegerField()
    montant_total_impots = serializers.DecimalField(max_digits=15, decimal_places=2)
    montant_penalites = serializers.DecimalField(max_digits=15, decimal_places=2)
    score_conformite = serializers.FloatField()
    alertes_actives = serializers.IntegerField()

class RapportConformiteSerializer(serializers.Serializer):
    """Serializer pour le rapport de conformité"""
    periode = serializers.DictField()
    societe = serializers.CharField()
    regime_fiscal = serializers.CharField()
    declarations = serializers.ListField()
    obligations_respectees = serializers.IntegerField()
    obligations_en_retard = serializers.IntegerField()
    montant_penalites = serializers.DecimalField(max_digits=15, decimal_places=2)
    score_conformite = serializers.FloatField()
    recommandations = serializers.ListField()

class CalculImpotRequestSerializer(serializers.Serializer):
    """Serializer pour les requêtes de calcul d'impôt"""
    type_impot = serializers.ChoiceField(choices=[
        ('TVA', 'TVA'),
        ('IS', 'Impôt sur les Sociétés'),
        ('PATENTE', 'Patente'),
        ('CENTIMES_ADDITIONNELS', 'Centimes Additionnels')
    ])
    base_calcul = serializers.DecimalField(max_digits=15, decimal_places=2)
    periode = serializers.DateField()
    parametres_specifiques = serializers.DictField(required=False)

class CalculImpotResponseSerializer(serializers.Serializer):
    """Serializer pour les réponses de calcul d'impôt"""
    montant = serializers.DecimalField(max_digits=15, decimal_places=2)
    details = serializers.DictField()
    date_calcul = serializers.DateTimeField()
    regime = serializers.CharField()