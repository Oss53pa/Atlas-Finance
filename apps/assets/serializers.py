from rest_framework import serializers
from decimal import Decimal
from django.contrib.auth.models import User

from .models import (
    Immobilisation,
    PlanAmortissement, 
    EcritureAmortissement,
    CategorieImmobilisation,
    VirementPoste,
    Sortie,
    SortieComptable,
    Reparation,
    ReevaluationImmobilisation
)
from apps.accounting.models import CompteComptable, Fournisseur, Localisation


class CategorieImmobilisationSerializer(serializers.ModelSerializer):
    class Meta:
        model = CategorieImmobilisation
        fields = '__all__'


class ImmobilisationSerializer(serializers.ModelSerializer):
    categorie_nom = serializers.CharField(source='categorie.nom', read_only=True)
    compte_immobilisation_numero = serializers.CharField(source='compte_immobilisation.numero', read_only=True)
    compte_amortissement_numero = serializers.CharField(source='compte_amortissement.numero', read_only=True)
    fournisseur_nom = serializers.CharField(source='fournisseur.nom', read_only=True)
    localisation_nom = serializers.CharField(source='localisation.nom', read_only=True)
    responsable_nom = serializers.CharField(source='responsable.get_full_name', read_only=True)
    
    # Champs calculés
    valeur_nette_comptable = serializers.SerializerMethodField()
    cumul_amortissements = serializers.SerializerMethodField()
    taux_amortissement = serializers.SerializerMethodField()
    
    class Meta:
        model = Immobilisation
        fields = [
            'id', 'code', 'designation', 'categorie', 'categorie_nom',
            'valeur_acquisition', 'date_acquisition', 'date_mise_service',
            'duree_amortissement_annees', 'duree_amortissement_mois',
            'methode_amortissement', 'taux_amortissement_lineaire',
            'coefficient_degressif', 'valeur_residuelle',
            'compte_immobilisation', 'compte_immobilisation_numero',
            'compte_amortissement', 'compte_amortissement_numero',
            'fournisseur', 'fournisseur_nom', 'numero_facture', 'reference_facture',
            'localisation', 'localisation_nom', 'responsable', 'responsable_nom',
            'numero_serie', 'marque', 'modele', 'statut', 'observations',
            'amortissement_derogatoire', 'date_creation', 'date_modification',
            'valeur_nette_comptable', 'cumul_amortissements', 'taux_amortissement'
        ]
        
    def get_valeur_nette_comptable(self, obj):
        cumul = sum([p.cumul_amortissements for p in obj.plan_amortissements.all()])
        return obj.valeur_acquisition - Decimal(str(cumul))
        
    def get_cumul_amortissements(self, obj):
        return sum([p.cumul_amortissements for p in obj.plan_amortissements.all()])
        
    def get_taux_amortissement(self, obj):
        if obj.duree_amortissement_annees:
            return Decimal('100') / Decimal(str(obj.duree_amortissement_annees))
        return Decimal('0')


class PlanAmortissementSerializer(serializers.ModelSerializer):
    immobilisation_designation = serializers.CharField(source='immobilisation.designation', read_only=True)
    
    class Meta:
        model = PlanAmortissement
        fields = [
            'id', 'immobilisation', 'immobilisation_designation',
            'exercice', 'base_amortissements', 'dotation_annuelle',
            'cumul_amortissements', 'valeur_nette_comptable',
            'dotation_derogatoire', 'reprise_derogatoire'
        ]


class EcritureAmortissementSerializer(serializers.ModelSerializer):
    immobilisation_designation = serializers.CharField(source='immobilisation.designation', read_only=True)
    
    class Meta:
        model = EcritureAmortissement
        fields = [
            'id', 'immobilisation', 'immobilisation_designation',
            'date_ecriture', 'exercice', 'type_ecriture',
            'numero_piece', 'libelle', 'montant', 'compte_debit',
            'compte_credit', 'statut'
        ]


class VirementPosteSerializer(serializers.ModelSerializer):
    immobilisation_designation = serializers.CharField(source='immobilisation.designation', read_only=True)
    ancien_compte_numero = serializers.CharField(source='ancien_compte.numero', read_only=True)
    nouveau_compte_numero = serializers.CharField(source='nouveau_compte.numero', read_only=True)
    
    class Meta:
        model = VirementPoste
        fields = [
            'id', 'immobilisation', 'immobilisation_designation',
            'date_virement', 'ancien_compte', 'ancien_compte_numero',
            'nouveau_compte', 'nouveau_compte_numero', 'motif',
            'numero_piece', 'valeur_transfert'
        ]


class SortieSerializer(serializers.ModelSerializer):
    immobilisation_designation = serializers.CharField(source='immobilisation.designation', read_only=True)
    
    class Meta:
        model = Sortie
        fields = [
            'id', 'immobilisation', 'immobilisation_designation',
            'date_sortie', 'motif_sortie', 'prix_vente', 'acquereur',
            'numero_piece', 'observations', 'valeur_nette_comptable_sortie'
        ]


class SortieComptableSerializer(serializers.ModelSerializer):
    sortie_info = serializers.CharField(source='sortie.immobilisation.designation', read_only=True)
    compte_debit_numero = serializers.CharField(source='compte_debit.numero', read_only=True)
    compte_credit_numero = serializers.CharField(source='compte_credit.numero', read_only=True)
    
    class Meta:
        model = SortieComptable
        fields = [
            'id', 'sortie', 'sortie_info', 'type_ecriture',
            'compte_debit', 'compte_debit_numero', 'compte_credit',
            'compte_credit_numero', 'montant', 'libelle'
        ]


class ReparationSerializer(serializers.ModelSerializer):
    immobilisation_designation = serializers.CharField(source='immobilisation.designation', read_only=True)
    fournisseur_nom = serializers.CharField(source='fournisseur.nom', read_only=True)
    
    class Meta:
        model = Reparation
        fields = [
            'id', 'immobilisation', 'immobilisation_designation',
            'date_reparation', 'type_reparation', 'description',
            'fournisseur', 'fournisseur_nom', 'cout_reparation',
            'duree_intervention', 'numero_facture', 'garantie'
        ]


class ReevaluationImmobilisationSerializer(serializers.ModelSerializer):
    immobilisation_designation = serializers.CharField(source='immobilisation.designation', read_only=True)
    utilisateur_nom = serializers.CharField(source='utilisateur.get_full_name', read_only=True)
    
    class Meta:
        model = ReevaluationImmobilisation
        fields = [
            'id', 'immobilisation', 'immobilisation_designation',
            'date_reevaluation', 'ancienne_valeur', 'nouvelle_valeur',
            'methode_reevaluation', 'commentaire', 'utilisateur',
            'utilisateur_nom'
        ]


# Serializers pour les simulations et calculs
class AmortissementSimulationSerializer(serializers.Serializer):
    methode = serializers.CharField()
    tableau_amortissement = serializers.ListField()
    economie_impot = serializers.DecimalField(max_digits=15, decimal_places=2)
    vnc_finale = serializers.DecimalField(max_digits=15, decimal_places=2)
    cumul_amortissement = serializers.DecimalField(max_digits=15, decimal_places=2)
    
    class Meta:
        fields = ['methode', 'tableau_amortissement', 'economie_impot', 'vnc_finale', 'cumul_amortissement']


class AmortissementCalculResultSerializer(serializers.Serializer):
    plans_crees = serializers.IntegerField()
    total_amortissements = serializers.DecimalField(max_digits=15, decimal_places=2)
    amortissement_derogatoire = serializers.DecimalField(max_digits=15, decimal_places=2)
    methode_utilisee = serializers.CharField()
    
    class Meta:
        fields = ['plans_crees', 'total_amortissements', 'amortissement_derogatoire', 'methode_utilisee']