"""
Serializers pour le module Third Party (Tiers)
"""
from rest_framework import serializers
from .models import Tiers, AdresseTiers, ContactTiers, CategorieAnalytique


class ContactTiersSerializer(serializers.ModelSerializer):
    nom_complet = serializers.ReadOnlyField()

    class Meta:
        model = ContactTiers
        fields = [
            'id', 'civilite', 'nom', 'prenom', 'nom_complet', 'fonction', 'titre',
            'telephone_fixe', 'telephone_mobile', 'email', 'preference_contact',
            'is_principal', 'is_active', 'observations'
        ]


class AdresseTiersSerializer(serializers.ModelSerializer):
    adresse_complete = serializers.ReadOnlyField()

    class Meta:
        model = AdresseTiers
        fields = [
            'id', 'type_adresse', 'libelle', 'ligne1', 'ligne2', 'ligne3',
            'code_postal', 'ville', 'region', 'pays', 'latitude', 'longitude',
            'telephone', 'email', 'is_default', 'is_active', 'adresse_complete'
        ]


class TiersListSerializer(serializers.ModelSerializer):
    """Serializer simplifié pour les listes"""
    nom_complet = serializers.ReadOnlyField()
    disponible_credit = serializers.ReadOnlyField()

    class Meta:
        model = Tiers
        fields = [
            'id', 'code', 'type_tiers', 'raison_sociale', 'nom_complet',
            'email', 'telephone', 'statut', 'encours_actuel',
            'limite_credit', 'disponible_credit', 'score_credit'
        ]


class TiersDetailSerializer(serializers.ModelSerializer):
    """Serializer complet pour le détail"""
    contacts = ContactTiersSerializer(many=True, read_only=True)
    adresses = AdresseTiersSerializer(many=True, read_only=True)
    nom_complet = serializers.ReadOnlyField()
    disponible_credit = serializers.ReadOnlyField()
    is_client = serializers.ReadOnlyField()
    is_fournisseur = serializers.ReadOnlyField()

    class Meta:
        model = Tiers
        fields = '__all__'
        read_only_fields = ['encours_actuel', 'retard_moyen', 'date_derniere_commande', 'date_dernier_paiement']


class TiersCreateSerializer(serializers.ModelSerializer):
    """Serializer pour la création"""

    class Meta:
        model = Tiers
        fields = [
            'societe', 'code', 'type_tiers', 'raison_sociale', 'nom_commercial',
            'sigle', 'forme_juridique', 'rccm', 'nif', 'niu', 'numero_tva',
            'email', 'telephone', 'mobile', 'fax', 'site_web',
            'compte_client', 'compte_fournisseur', 'conditions_paiement',
            'mode_reglement', 'devise', 'limite_credit', 'plafond_escompte',
            'taux_remise', 'taux_escompte', 'exonere_tva', 'numero_exoneration_tva',
            'iban', 'bic', 'domiciliation', 'secteur_activite', 'effectif',
            'capital', 'chiffre_affaires', 'date_creation_entreprise',
            'date_premiere_relation', 'observations', 'tags'
        ]


class CategorieAnalytiqueSerializer(serializers.ModelSerializer):
    class Meta:
        model = CategorieAnalytique
        fields = ['id', 'code', 'libelle', 'description', 'is_active']
