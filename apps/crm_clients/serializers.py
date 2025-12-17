"""
Serializers pour Module CRM Clients WiseBook
API REST complète selon cahier des charges
"""
from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from django.contrib.auth import get_user_model
from .models import (
    Client, ClientAddress, Contact, ClientFinancialInfo,
    ClientComptableInfo, ClientDocument, ClientHistorique, ClientScoring
)


class ClientAddressSerializer(serializers.ModelSerializer):
    """Serializer pour adresses clients"""

    class Meta:
        model = ClientAddress
        fields = [
            'id', 'type_adresse', 'is_default', 'is_active',
            'nom_destinataire', 'ligne_1', 'ligne_2', 'ligne_3',
            'code_postal', 'ville', 'pays',
            'latitude', 'longitude', 'geocodage_valide',
            'adresse_validee', 'zone_livraison', 'secteur_commercial'
        ]


class ContactSerializer(serializers.ModelSerializer):
    """Serializer pour contacts clients"""

    nom_complet = serializers.SerializerMethodField()

    class Meta:
        model = Contact
        fields = [
            'id', 'civilite', 'prenom', 'nom', 'nom_complet',
            'fonction', 'service', 'is_primary', 'is_active',
            'email_principal', 'email_secondaire',
            'telephone_fixe', 'telephone_mobile', 'telephone_direct',
            'linkedin_url', 'canal_prefere', 'horaires_preferes',
            'langue_preferee', 'pourcentage_teletravail',
            'pouvoir_decision', 'niveau_interet', 'score_engagement',
            'consentement_rgpd'
        ]

    def get_nom_complet(self, obj):
        return f"{obj.prenom} {obj.nom}"


class ClientFinancialInfoSerializer(serializers.ModelSerializer):
    """Serializer pour informations financières"""

    class Meta:
        model = ClientFinancialInfo
        fields = [
            'delai_paiement', 'type_echeance', 'jour_paiement_fixe',
            'taux_escompte', 'delai_escompte', 'modes_reglement',
            'iban', 'bic', 'mandat_sepa_numero', 'mandat_sepa_date',
            'plafond_encours', 'encours_actuel',
            'assurance_credit_montant', 'assurance_credit_assureur',
            'garanties', 'nombre_incidents_6m', 'nombre_incidents_12m',
            'periodicite_facturation', 'regroupement_commandes'
        ]


class ClientComptableInfoSerializer(serializers.ModelSerializer):
    """Serializer pour informations comptables"""

    class Meta:
        model = ClientComptableInfo
        fields = [
            'compte_collectif', 'sections_analytiques',
            'regime_tva', 'taux_tva_defaut', 'exonerations_tva',
            'auto_liquidation', 'code_journal_ventes',
            'centre_profit', 'devise_compte'
        ]


class ClientDocumentSerializer(serializers.ModelSerializer):
    """Serializer pour documents clients"""

    uploaded_by_name = serializers.CharField(source='uploaded_by.get_full_name', read_only=True)
    taille_fichier_mb = serializers.SerializerMethodField()

    class Meta:
        model = ClientDocument
        fields = [
            'id', 'type_document', 'titre', 'description',
            'fichier', 'taille_fichier', 'taille_fichier_mb',
            'type_mime', 'version', 'date_expiration',
            'uploaded_by_name', 'is_confidentiel', 'tags',
            'created_at'
        ]

    def get_taille_fichier_mb(self, obj):
        return round(obj.taille_fichier / (1024 * 1024), 2)


class ClientHistoriqueSerializer(serializers.ModelSerializer):
    """Serializer pour historique client"""

    utilisateur_nom = serializers.CharField(source='utilisateur.get_full_name', read_only=True)

    class Meta:
        model = ClientHistorique
        fields = [
            'id', 'type_evenement', 'titre', 'description',
            'utilisateur_nom', 'date_evenement', 'niveau_importance',
            'donnees_json'
        ]


class ClientScoringSerializer(serializers.ModelSerializer):
    """Serializer pour scoring client"""

    class Meta:
        model = ClientScoring
        fields = [
            'score_global', 'score_paiement', 'score_rentabilite',
            'score_potentiel', 'score_risque', 'probabilite_churn',
            'customer_lifetime_value', 'segment_ia', 'persona_client',
            'derniere_mise_a_jour'
        ]


class ClientListSerializer(serializers.ModelSerializer):
    """Serializer pour liste des clients (vue simplifiée)"""

    contact_principal = ContactSerializer(read_only=True)
    adresse_principale = ClientAddressSerializer(read_only=True)

    class Meta:
        model = Client
        fields = [
            'id', 'code_client', 'raison_sociale', 'nom_commercial',
            'forme_juridique', 'numero_siret', 'notation_interne',
            'score_risque', 'is_active', 'is_prospect',
            'contact_principal', 'adresse_principale',
            'created_at', 'updated_at'
        ]


class ClientDetailSerializer(serializers.ModelSerializer):
    """Serializer complet pour détail client"""

    addresses = ClientAddressSerializer(many=True, read_only=True)
    contacts = ContactSerializer(many=True, read_only=True)
    financial_info = ClientFinancialInfoSerializer(read_only=True)
    comptable_info = ClientComptableInfoSerializer(read_only=True)
    documents = ClientDocumentSerializer(many=True, read_only=True)
    historique = ClientHistoriqueSerializer(many=True, read_only=True)
    scoring = ClientScoringSerializer(read_only=True)

    # Contact et adresse principaux
    contact_principal = serializers.SerializerMethodField()
    adresse_principale = serializers.SerializerMethodField()

    # Statistiques calculées
    nombre_contacts = serializers.SerializerMethodField()
    nombre_adresses = serializers.SerializerMethodField()
    anciennete_jours = serializers.SerializerMethodField()

    class Meta:
        model = Client
        fields = [
            # Identification
            'id', 'code_client', 'raison_sociale', 'nom_commercial',
            'groupe_appartenance', 'forme_juridique', 'capital_social',

            # Identifiants légaux
            'numero_rcs', 'numero_rm', 'numero_siret', 'numero_tva',
            'tva_verifie_vies', 'code_naf', 'libelle_naf',

            # Données société
            'date_creation_societe', 'effectif', 'ca_annuel',
            'notation_interne', 'score_risque', 'tags',

            # Statut
            'is_active', 'is_prospect', 'date_premier_contact',

            # Relations
            'addresses', 'contacts', 'financial_info', 'comptable_info',
            'documents', 'historique', 'scoring',

            # Données calculées
            'contact_principal', 'adresse_principale',
            'nombre_contacts', 'nombre_adresses', 'anciennete_jours',

            # Timestamps
            'created_at', 'updated_at'
        ]

    def get_contact_principal(self, obj):
        contact = obj.contacts.filter(is_primary=True, is_active=True).first()
        return ContactSerializer(contact).data if contact else None

    def get_adresse_principale(self, obj):
        adresse = obj.addresses.filter(type_adresse='SIEGE', is_active=True).first()
        if not adresse:
            adresse = obj.addresses.filter(is_default=True, is_active=True).first()
        return ClientAddressSerializer(adresse).data if adresse else None

    def get_nombre_contacts(self, obj):
        return obj.contacts.filter(is_active=True).count()

    def get_nombre_adresses(self, obj):
        return obj.addresses.filter(is_active=True).count()

    def get_anciennete_jours(self, obj):
        if obj.created_at:
            from django.utils import timezone
            return (timezone.now().date() - obj.created_at.date()).days
        return 0


class ClientCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer pour création/modification client"""

    # Validation SIRET
    numero_siret = serializers.CharField(
        required=False,
        allow_blank=True,
        validators=[
            UniqueValidator(queryset=Client.objects.all(), message="Ce SIRET existe déjà")
        ]
    )

    class Meta:
        model = Client
        fields = [
            'code_client', 'raison_sociale', 'nom_commercial',
            'groupe_appartenance', 'forme_juridique', 'capital_social',
            'numero_rcs', 'numero_rm', 'numero_siret', 'numero_tva',
            'code_naf', 'libelle_naf', 'date_creation_societe',
            'effectif', 'ca_annuel', 'notation_interne', 'tags',
            'is_active', 'is_prospect', 'date_premier_contact'
        ]

    def validate_numero_siret(self, value):
        """Validation du SIRET"""
        if value and len(value) != 14:
            raise serializers.ValidationError("Le SIRET doit contenir exactement 14 chiffres")
        if value and not value.isdigit():
            raise serializers.ValidationError("Le SIRET ne doit contenir que des chiffres")
        return value

    def validate(self, data):
        """Validations croisées"""

        # Génération automatique du code client si non fourni
        if not data.get('code_client'):
            # Logique de génération automatique
            last_client = Client.objects.order_by('-code_client').first()
            if last_client and last_client.code_client.startswith('CLI'):
                try:
                    last_number = int(last_client.code_client[3:])
                    data['code_client'] = f'CLI{last_number + 1:06d}'
                except:
                    data['code_client'] = 'CLI000001'
            else:
                data['code_client'] = 'CLI000001'

        return data


class ClientSearchSerializer(serializers.Serializer):
    """Serializer pour recherche avancée clients"""

    query = serializers.CharField(required=False, allow_blank=True)
    notation_interne = serializers.MultipleChoiceField(
        choices=Client.NOTATION_CHOICES,
        required=False
    )
    forme_juridique = serializers.MultipleChoiceField(
        choices=Client.FORME_JURIDIQUE_CHOICES,
        required=False
    )
    effectif = serializers.MultipleChoiceField(
        choices=Client.EFFECTIF_CHOICES,
        required=False
    )
    ca_annuel = serializers.MultipleChoiceField(
        choices=Client.CA_CHOICES,
        required=False
    )
    tags = serializers.ListField(
        child=serializers.CharField(max_length=50),
        required=False
    )
    is_active = serializers.BooleanField(required=False)
    is_prospect = serializers.BooleanField(required=False)
    score_risque_min = serializers.IntegerField(min_value=0, max_value=100, required=False)
    score_risque_max = serializers.IntegerField(min_value=0, max_value=100, required=False)
    ville = serializers.CharField(required=False, allow_blank=True)
    code_postal = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        """Validation des critères de recherche"""
        if data.get('score_risque_min') and data.get('score_risque_max'):
            if data['score_risque_min'] > data['score_risque_max']:
                raise serializers.ValidationError(
                    "Le score minimum ne peut pas être supérieur au score maximum"
                )
        return data


class ClientImportSerializer(serializers.Serializer):
    """Serializer pour import en masse de clients"""

    fichier = serializers.FileField()
    format_fichier = serializers.ChoiceField(
        choices=[('CSV', 'CSV'), ('EXCEL', 'Excel'), ('JSON', 'JSON')]
    )
    mapping_colonnes = serializers.JSONField(required=False)
    ignorer_erreurs = serializers.BooleanField(default=False)
    mise_a_jour_existants = serializers.BooleanField(default=False)

    def validate_fichier(self, value):
        """Validation du fichier d'import"""
        max_size = 10 * 1024 * 1024  # 10 MB
        if value.size > max_size:
            raise serializers.ValidationError("Le fichier ne peut pas dépasser 10 MB")

        allowed_extensions = {'.csv', '.xlsx', '.xls', '.json'}
        file_extension = value.name.split('.')[-1].lower()
        if f'.{file_extension}' not in allowed_extensions:
            raise serializers.ValidationError(
                f"Extension non supportée. Utilisez: {', '.join(allowed_extensions)}"
            )

        return value


class ClientExportSerializer(serializers.Serializer):
    """Serializer pour export de clients"""

    format_export = serializers.ChoiceField(
        choices=[('CSV', 'CSV'), ('EXCEL', 'Excel'), ('JSON', 'JSON'), ('PDF', 'PDF')]
    )
    colonnes = serializers.ListField(
        child=serializers.CharField(),
        required=False
    )
    filtres = serializers.JSONField(required=False)
    inclure_contacts = serializers.BooleanField(default=False)
    inclure_adresses = serializers.BooleanField(default=False)
    inclure_documents = serializers.BooleanField(default=False)