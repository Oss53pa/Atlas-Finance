"""
Module CRM Clients - Modèles de données WiseBook
Conforme au cahier des charges v2.0 - Architecture complète
"""
from django.db import models
from django.contrib.auth.models import User
from django.contrib.postgres.fields import JSONField, ArrayField
from django.core.validators import RegexValidator, MinValueValidator, MaxValueValidator
from decimal import Decimal
import uuid
from datetime import datetime, timedelta

from apps.core.models import TimeStampedModel
from apps.accounting.models import Company, ChartOfAccounts


class Client(TimeStampedModel):
    """
    Référentiel Client Principal - Onglet Identification
    Conforme section 4.1.1 du cahier des charges
    """

    FORME_JURIDIQUE_CHOICES = [
        ('SARL', 'SARL - Société à Responsabilité Limitée'),
        ('SAS', 'SAS - Société par Actions Simplifiée'),
        ('SA', 'SA - Société Anonyme'),
        ('SNC', 'SNC - Société en Nom Collectif'),
        ('EURL', 'EURL - Entreprise Unipersonnelle à Responsabilité Limitée'),
        ('SASU', 'SASU - Société par Actions Simplifiée Unipersonnelle'),
        ('EI', 'EI - Entreprise Individuelle'),
        ('MICRO', 'Micro-entreprise'),
        ('ASSOCIATION', 'Association'),
        ('AUTRE', 'Autre'),
    ]

    EFFECTIF_CHOICES = [
        ('0', 'Aucun salarié'),
        ('1-2', '1 à 2 salariés'),
        ('3-5', '3 à 5 salariés'),
        ('6-9', '6 à 9 salariés'),
        ('10-19', '10 à 19 salariés'),
        ('20-49', '20 à 49 salariés'),
        ('50-99', '50 à 99 salariés'),
        ('100-199', '100 à 199 salariés'),
        ('200-499', '200 à 499 salariés'),
        ('500+', '500 salariés et plus'),
    ]

    CA_CHOICES = [
        ('<100K', 'Moins de 100K€'),
        ('100K-500K', '100K€ à 500K€'),
        ('500K-2M', '500K€ à 2M€'),
        ('2M-10M', '2M€ à 10M€'),
        ('10M-50M', '10M€ à 50M€'),
        ('50M+', 'Plus de 50M€'),
    ]

    NOTATION_CHOICES = [
        ('A+', 'A+ - Excellent'),
        ('A', 'A - Très bon'),
        ('B+', 'B+ - Bon'),
        ('B', 'B - Acceptable'),
        ('C', 'C - Moyen'),
        ('D', 'D - Risqué'),
        ('E', 'E - Très risqué'),
    ]

    # Identification principale
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='clients')

    # Code client (généré automatiquement ou manuel)
    code_client = models.CharField(max_length=20, unique=True)

    # Informations légales obligatoires
    raison_sociale = models.CharField(max_length=200)
    nom_commercial = models.CharField(max_length=200, blank=True)

    # Groupe et hiérarchie
    groupe_appartenance = models.CharField(max_length=100, blank=True)
    client_parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True)

    # Forme juridique et capital
    forme_juridique = models.CharField(max_length=20, choices=FORME_JURIDIQUE_CHOICES)
    capital_social = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)

    # Identifiants légaux
    numero_rcs = models.CharField(max_length=20, blank=True)
    numero_rm = models.CharField(max_length=20, blank=True)

    # Validation SIRET avec contrôle de validité
    siret_validator = RegexValidator(
        regex=r'^\d{14}$',
        message='Le SIRET doit contenir exactement 14 chiffres'
    )
    numero_siret = models.CharField(
        max_length=14,
        validators=[siret_validator],
        blank=True
    )

    # TVA Intracommunautaire avec vérification VIES
    numero_tva = models.CharField(max_length=15, blank=True)
    tva_verifie_vies = models.BooleanField(default=False)

    # Code NAF/APE (référentiel INSEE)
    code_naf = models.CharField(max_length=6, blank=True)
    libelle_naf = models.CharField(max_length=200, blank=True)

    # Données sociétés
    date_creation_societe = models.DateField(null=True, blank=True)
    effectif = models.CharField(max_length=10, choices=EFFECTIF_CHOICES, blank=True)
    ca_annuel = models.CharField(max_length=20, choices=CA_CHOICES, blank=True)

    # Notation et scoring
    notation_interne = models.CharField(max_length=2, choices=NOTATION_CHOICES, default='B')
    score_risque = models.IntegerField(default=50, validators=[MinValueValidator(0), MaxValueValidator(100)])

    # Tags personnalisables
    tags = ArrayField(models.CharField(max_length=50), default=list, blank=True)

    # Statut
    is_active = models.BooleanField(default=True)
    is_prospect = models.BooleanField(default=False)
    date_premier_contact = models.DateField(null=True, blank=True)

    # Métadonnées
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='clients_created')

    class Meta:
        db_table = 'crm_clients'
        ordering = ['raison_sociale']
        verbose_name = 'Client'
        verbose_name_plural = 'Clients'
        indexes = [
            models.Index(fields=['code_client']),
            models.Index(fields=['raison_sociale']),
            models.Index(fields=['numero_siret']),
            models.Index(fields=['notation_interne']),
        ]

    def __str__(self):
        return f"{self.code_client} - {self.raison_sociale}"


class ClientAddress(TimeStampedModel):
    """
    Adresses Clients - Gestion multi-adresses
    Conforme section 4.1.1 - Onglet Adresses
    """

    TYPE_ADRESSE_CHOICES = [
        ('SIEGE', 'Siège social'),
        ('FACTURATION', 'Facturation'),
        ('LIVRAISON', 'Livraison'),
        ('CORRESPONDANCE', 'Correspondance'),
        ('AUTRE', 'Autre'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='addresses')

    # Type et priorité
    type_adresse = models.CharField(max_length=20, choices=TYPE_ADRESSE_CHOICES)
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    # Adresse complète
    nom_destinataire = models.CharField(max_length=100, blank=True)
    ligne_1 = models.CharField(max_length=100)
    ligne_2 = models.CharField(max_length=100, blank=True)
    ligne_3 = models.CharField(max_length=100, blank=True)
    code_postal = models.CharField(max_length=10)
    ville = models.CharField(max_length=100)
    pays = models.CharField(max_length=100, default='France')

    # Géolocalisation automatique
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    geocodage_valide = models.BooleanField(default=False)

    # Validation postale
    adresse_validee = models.BooleanField(default=False)
    source_validation = models.CharField(max_length=50, blank=True)

    # Zones et secteurs
    zone_livraison = models.CharField(max_length=50, blank=True)
    secteur_commercial = models.CharField(max_length=50, blank=True)

    class Meta:
        db_table = 'crm_client_addresses'
        unique_together = [('client', 'type_adresse', 'is_default')]
        verbose_name = 'Adresse Client'
        verbose_name_plural = 'Adresses Clients'


class Contact(TimeStampedModel):
    """
    Contacts Clients - Gestion avancée
    Conforme section 4.2.1 - Fiche Contact Enrichie
    """

    CIVILITE_CHOICES = [
        ('M', 'Monsieur'),
        ('MME', 'Madame'),
        ('MLLE', 'Mademoiselle'),
        ('DR', 'Docteur'),
        ('PROF', 'Professeur'),
    ]

    CANAL_PREFERE_CHOICES = [
        ('EMAIL', 'Email'),
        ('TELEPHONE', 'Téléphone'),
        ('SMS', 'SMS'),
        ('POSTAL', 'Courrier postal'),
        ('WHATSAPP', 'WhatsApp'),
        ('TEAMS', 'Microsoft Teams'),
    ]

    LANGUE_CHOICES = [
        ('FR', 'Français'),
        ('EN', 'Anglais'),
        ('ES', 'Espagnol'),
        ('DE', 'Allemand'),
        ('IT', 'Italien'),
        ('AR', 'Arabe'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='contacts')

    # Informations personnelles
    civilite = models.CharField(max_length=10, choices=CIVILITE_CHOICES)
    prenom = models.CharField(max_length=50)
    nom = models.CharField(max_length=50)
    fonction = models.CharField(max_length=100)
    service = models.CharField(max_length=100, blank=True)

    # Contact principal
    is_primary = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    # Coordonnées
    email_principal = models.EmailField()
    email_secondaire = models.EmailField(blank=True)
    telephone_fixe = models.CharField(max_length=20, blank=True)
    telephone_mobile = models.CharField(max_length=20, blank=True)
    telephone_direct = models.CharField(max_length=20, blank=True)

    # Photo/Avatar
    photo = models.ImageField(upload_to='contacts/photos/', blank=True)

    # Réseaux sociaux professionnels
    linkedin_url = models.URLField(blank=True)
    twitter_handle = models.CharField(max_length=50, blank=True)

    # Préférences communication
    canal_prefere = models.CharField(max_length=20, choices=CANAL_PREFERE_CHOICES, default='EMAIL')
    horaires_preferes = models.CharField(max_length=100, blank=True)
    langue_preferee = models.CharField(max_length=2, choices=LANGUE_CHOICES, default='FR')
    ne_pas_contacter_jusqu = models.DateTimeField(null=True, blank=True)

    # Informations personnelles (RGPD)
    date_anniversaire = models.DateField(null=True, blank=True)
    centres_interet_pro = ArrayField(models.CharField(max_length=50), default=list, blank=True)
    formation = models.CharField(max_length=200, blank=True)

    # Mobilité et télétravail
    pourcentage_teletravail = models.IntegerField(default=0, validators=[MinValueValidator(0), MaxValueValidator(100)])
    jours_presence = ArrayField(
        models.CharField(max_length=10),
        default=list,
        blank=True,
        help_text="Ex: ['LUNDI', 'MARDI', 'MERCREDI']"
    )

    # Relations et influence
    pouvoir_decision = models.IntegerField(
        default=3,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="1=Faible à 5=Très fort"
    )
    niveau_interet = models.IntegerField(
        default=3,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="1=Faible à 5=Très fort"
    )

    # Scoring engagement
    score_engagement = models.IntegerField(default=50, validators=[MinValueValidator(0), MaxValueValidator(100)])

    # Données RGPD
    consentement_rgpd = models.BooleanField(default=False)
    date_consentement = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'crm_contacts'
        ordering = ['nom', 'prenom']
        verbose_name = 'Contact'
        verbose_name_plural = 'Contacts'
        indexes = [
            models.Index(fields=['client', 'is_primary']),
            models.Index(fields=['email_principal']),
            models.Index(fields=['nom', 'prenom']),
        ]

    def __str__(self):
        return f"{self.prenom} {self.nom} - {self.client.raison_sociale}"


class ClientFinancialInfo(TimeStampedModel):
    """
    Informations Financières Client
    Conforme section 4.1.1 - Onglet Financier
    """

    TYPE_ECHEANCE_CHOICES = [
        ('DATE_FACTURE', 'Date de facture'),
        ('FIN_MOIS', 'Fin de mois'),
        ('FIN_MOIS_CIVIL', 'Fin de mois civil'),
        ('JOUR_FIXE', 'Jour fixe du mois'),
    ]

    MODE_REGLEMENT_CHOICES = [
        ('VIREMENT', 'Virement bancaire'),
        ('CHEQUE', 'Chèque'),
        ('PRELEVEMENT', 'Prélèvement automatique'),
        ('CARTE_BANCAIRE', 'Carte bancaire'),
        ('ESPECES', 'Espèces'),
        ('LCR', 'Lettre de change relevé'),
        ('SEPA', 'SEPA'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    client = models.OneToOneField(Client, on_delete=models.CASCADE, related_name='financial_info')

    # Conditions de paiement standards
    delai_paiement = models.IntegerField(default=30, help_text="Délai en jours")
    type_echeance = models.CharField(max_length=20, choices=TYPE_ECHEANCE_CHOICES, default='DATE_FACTURE')
    jour_paiement_fixe = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(31)])

    # Escompte pour paiement anticipé
    taux_escompte = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    delai_escompte = models.IntegerField(default=0, help_text="Délai pour escompte en jours")

    # Modes de règlement (JSON pour priorités multiples)
    modes_reglement = JSONField(default=dict, help_text="Modes acceptés avec priorités")

    # Coordonnées bancaires pour prélèvement
    iban = models.CharField(max_length=34, blank=True)
    bic = models.CharField(max_length=11, blank=True)
    mandat_sepa_numero = models.CharField(max_length=35, blank=True)
    mandat_sepa_date = models.DateField(null=True, blank=True)

    # Gestion des risques
    plafond_encours = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    encours_actuel = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))

    # Assurance crédit
    assurance_credit_montant = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    assurance_credit_assureur = models.CharField(max_length=100, blank=True)
    assurance_credit_police = models.CharField(max_length=50, blank=True)

    # Garanties
    garanties = JSONField(default=list, help_text="Liste des garanties avec détails")

    # Historique incidents
    nombre_incidents_6m = models.IntegerField(default=0)
    nombre_incidents_12m = models.IntegerField(default=0)
    dernier_incident = models.DateField(null=True, blank=True)

    # Paramètres facturation
    periodicite_facturation = models.CharField(max_length=20, default='MENSUELLE')
    regroupement_commandes = models.BooleanField(default=False)
    format_facture = models.CharField(max_length=20, default='PDF')
    mentions_speciales = models.TextField(blank=True)

    class Meta:
        db_table = 'crm_client_financial_info'
        verbose_name = 'Information Financière Client'
        verbose_name_plural = 'Informations Financières Clients'


class ClientComptableInfo(TimeStampedModel):
    """
    Informations Comptables Client
    Conforme section 4.1.1 - Onglet Comptable
    """

    REGIME_TVA_CHOICES = [
        ('NORMAL', 'Régime normal'),
        ('SIMPLIFIE', 'Régime simplifié'),
        ('REEL', 'Régime réel'),
        ('FRANCHISE', 'Franchise de TVA'),
        ('INTRACOM', 'Intracommunautaire'),
        ('EXPORT', 'Export'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    client = models.OneToOneField(Client, on_delete=models.CASCADE, related_name='comptable_info')

    # Plan comptable
    compte_collectif = models.ForeignKey(
        ChartOfAccounts,
        on_delete=models.PROTECT,
        related_name='clients_collectif'
    )
    comptes_analytiques = models.ManyToManyField(
        ChartOfAccounts,
        related_name='clients_analytique',
        blank=True
    )

    # Sections analytiques multiples
    sections_analytiques = JSONField(default=dict, help_text="Sections avec répartition")

    # Paramètres TVA
    regime_tva = models.CharField(max_length=20, choices=REGIME_TVA_CHOICES, default='NORMAL')
    taux_tva_defaut = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('20.00'))
    exonerations_tva = ArrayField(models.CharField(max_length=50), default=list, blank=True)
    auto_liquidation = models.BooleanField(default=False)

    # Paramètres comptables
    code_journal_ventes = models.CharField(max_length=10, default='VTE')
    modele_ecriture = models.CharField(max_length=50, blank=True)
    centre_profit = models.CharField(max_length=50, blank=True)
    devise_compte = models.CharField(max_length=3, default='EUR')

    class Meta:
        db_table = 'crm_client_comptable_info'
        verbose_name = 'Information Comptable Client'
        verbose_name_plural = 'Informations Comptables Clients'


class ClientDocument(TimeStampedModel):
    """
    Documents Clients - GED intégrée
    Conforme section 4.1.1 - Onglet Documents
    """

    TYPE_DOCUMENT_CHOICES = [
        ('KBIS', 'Extrait Kbis'),
        ('RIB', 'RIB - Relevé d\'Identité Bancaire'),
        ('CGV', 'Conditions Générales de Vente signées'),
        ('CONTRAT', 'Contrat commercial'),
        ('ASSURANCE', 'Attestation d\'assurance'),
        ('MANDAT', 'Mandat SEPA'),
        ('IDENTITE', 'Pièce d\'identité dirigeant'),
        ('AUTRE', 'Autre document'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='documents')

    # Classification
    type_document = models.CharField(max_length=20, choices=TYPE_DOCUMENT_CHOICES)
    titre = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    # Fichier
    fichier = models.FileField(upload_to='clients/documents/%Y/%m/')
    taille_fichier = models.PositiveIntegerField()
    type_mime = models.CharField(max_length=100)

    # Versioning
    version = models.CharField(max_length=10, default='1.0')
    document_parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True)

    # Gestion expiration
    date_expiration = models.DateField(null=True, blank=True)
    alerte_expiration_jours = models.IntegerField(default=30)

    # OCR et extraction
    contenu_ocr = models.TextField(blank=True, help_text="Contenu extrait par OCR")
    donnees_extraites = JSONField(default=dict, help_text="Données structurées extraites")
    ocr_effectue = models.BooleanField(default=False)

    # Métadonnées
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    is_confidentiel = models.BooleanField(default=False)
    tags = ArrayField(models.CharField(max_length=50), default=list, blank=True)

    class Meta:
        db_table = 'crm_client_documents'
        ordering = ['-created_at']
        verbose_name = 'Document Client'
        verbose_name_plural = 'Documents Clients'


class ClientHistorique(TimeStampedModel):
    """
    Historique Client - Timeline complète
    Conforme section 4.1.1 - Onglet Historique
    """

    TYPE_EVENEMENT_CHOICES = [
        ('CREATION', 'Création client'),
        ('MODIFICATION', 'Modification fiche'),
        ('CONTACT', 'Contact commercial'),
        ('COMMANDE', 'Nouvelle commande'),
        ('FACTURE', 'Facturation'),
        ('PAIEMENT', 'Paiement reçu'),
        ('RELANCE', 'Relance envoyée'),
        ('INCIDENT', 'Incident de paiement'),
        ('LITIGE', 'Litige ouvert'),
        ('RESOLUTION', 'Résolution litige'),
        ('DOCUMENT', 'Document ajouté'),
        ('NOTE', 'Note interne'),
        ('AUTRE', 'Autre événement'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='historique')

    # Événement
    type_evenement = models.CharField(max_length=20, choices=TYPE_EVENEMENT_CHOICES)
    titre = models.CharField(max_length=200)
    description = models.TextField()

    # Contexte
    utilisateur = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    date_evenement = models.DateTimeField(auto_now_add=True)

    # Liens et références
    objet_lie_type = models.CharField(max_length=50, blank=True)
    objet_lie_id = models.CharField(max_length=50, blank=True)

    # Données complémentaires
    donnees_json = JSONField(default=dict, help_text="Données contextuelles")

    # Importance
    niveau_importance = models.IntegerField(
        default=1,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="1=Info à 5=Critique"
    )

    class Meta:
        db_table = 'crm_client_historique'
        ordering = ['-date_evenement']
        verbose_name = 'Historique Client'
        verbose_name_plural = 'Historiques Clients'
        indexes = [
            models.Index(fields=['client', '-date_evenement']),
            models.Index(fields=['type_evenement']),
        ]


class ClientScoring(TimeStampedModel):
    """
    Scoring et Évaluation Client
    Support pour analyses prédictives
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    client = models.OneToOneField(Client, on_delete=models.CASCADE, related_name='scoring')

    # Scores calculés
    score_global = models.IntegerField(default=50, validators=[MinValueValidator(0), MaxValueValidator(100)])
    score_paiement = models.IntegerField(default=50, validators=[MinValueValidator(0), MaxValueValidator(100)])
    score_rentabilite = models.IntegerField(default=50, validators=[MinValueValidator(0), MaxValueValidator(100)])
    score_potentiel = models.IntegerField(default=50, validators=[MinValueValidator(0), MaxValueValidator(100)])
    score_risque = models.IntegerField(default=50, validators=[MinValueValidator(0), MaxValueValidator(100)])

    # Prédictions IA
    probabilite_churn = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    customer_lifetime_value = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    prochaine_commande_estimee = models.DateField(null=True, blank=True)

    # Segmentation automatique
    segment_ia = models.CharField(max_length=50, blank=True)
    persona_client = models.CharField(max_length=50, blank=True)

    # Métadonnées calcul
    derniere_mise_a_jour = models.DateTimeField(auto_now=True)
    version_algorithme = models.CharField(max_length=10, default='1.0')

    class Meta:
        db_table = 'crm_client_scoring'
        verbose_name = 'Scoring Client'
        verbose_name_plural = 'Scorings Clients'