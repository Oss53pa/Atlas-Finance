"""
Module Immobilisations WiseBook - Modèles IA avancés
Gestion des actifs avec IoT, maintenance prédictive et intégration Wise FM
Conforme au cahier des charges - Technologies de pointe
"""
from django.db import models
from django.conf import settings
from django.db.models import JSONField
from django.contrib.postgres.fields import ArrayField
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal
import uuid
from datetime import date, datetime, timedelta

from apps.core.models import TimeStampedModel, Societe
from apps.accounting.models import ChartOfAccounts, FiscalYear

# Alias pour rétrocompatibilité
Company = Societe


class AssetCategory(TimeStampedModel):
    """
    Catégories d'immobilisations avec classification hiérarchique
    Intelligence artificielle pour classification automatique
    """

    CATEGORY_TYPE_CHOICES = [
        ('INCORPOREAL', 'Immobilisations incorporelles'),
        ('CORPOREAL', 'Immobilisations corporelles'),
        ('FINANCIAL', 'Immobilisations financières'),
        ('INTANGIBLE', 'Actifs intangibles'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='asset_categories')

    # Hiérarchie
    parent_category = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='subcategories'
    )
    level = models.IntegerField(default=1)

    # Identification
    code = models.CharField(max_length=20)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    category_type = models.CharField(max_length=20, choices=CATEGORY_TYPE_CHOICES)

    # Classification IA
    ai_classification_enabled = models.BooleanField(default=True)
    classification_rules = JSONField(default=dict, help_text="Règles de classification automatique")

    # Paramètres par défaut
    default_depreciation_method = models.CharField(max_length=20, default='LINEAR')
    default_useful_life_years = models.IntegerField(default=5)
    default_residual_value_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('10.00'))

    # Maintenance et Wise FM
    requires_maintenance = models.BooleanField(default=False)
    wisefm_category_id = models.CharField(max_length=50, blank=True, help_text="ID catégorie dans Wise FM")
    maintenance_frequency_days = models.IntegerField(null=True, blank=True)

    # Métadonnées
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'assets_categories'
        unique_together = [('company', 'code')]
        ordering = ['level', 'code']
        verbose_name = 'Catégorie d\'Actif'
        verbose_name_plural = 'Catégories d\'Actifs'

    def __str__(self):
        return f"{self.code} - {self.name}"


class Asset(TimeStampedModel):
    """
    Registre central des actifs avec IA et IoT
    Conforme section 2.1.1 - Identification unique avancée
    """

    STATUS_CHOICES = [
        ('IN_SERVICE', 'En service'),
        ('UNDER_MAINTENANCE', 'En maintenance'),
        ('OUT_OF_ORDER', 'Hors service'),
        ('DISPOSED', 'Cédé'),
        ('SCRAPPED', 'Mis au rebut'),
        ('LOST', 'Perdu/Volé'),
        ('UNDER_CONSTRUCTION', 'En cours de construction'),
    ]

    CONDITION_CHOICES = [
        ('EXCELLENT', 'Excellent'),
        ('GOOD', 'Bon'),
        ('FAIR', 'Acceptable'),
        ('POOR', 'Mauvais'),
        ('CRITICAL', 'Critique'),
    ]

    ACQUISITION_TYPE_CHOICES = [
        ('PURCHASE', 'Achat'),
        ('LEASE', 'Crédit-bail'),
        ('DONATION', 'Don'),
        ('INTERNAL_PRODUCTION', 'Production interne'),
        ('CONTRIBUTION', 'Apport'),
        ('EXCHANGE', 'Échange'),
    ]

    # Identification unique avancée
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='assets')
    category = models.ForeignKey(AssetCategory, on_delete=models.PROTECT, related_name='assets')

    # Codes d'identification multiples
    asset_number = models.CharField(max_length=50, unique=True, help_text="Numéro d'immobilisation")
    internal_code = models.CharField(max_length=50, blank=True, help_text="Code interne entreprise")
    serial_number = models.CharField(max_length=100, blank=True, help_text="Numéro de série")
    manufacturer_code = models.CharField(max_length=100, blank=True, help_text="Code fabricant")

    # Technologies d'identification
    qr_code = models.CharField(max_length=200, blank=True, help_text="QR Code généré")
    rfid_tag = models.CharField(max_length=100, blank=True, help_text="Tag RFID")
    nfc_tag = models.CharField(max_length=100, blank=True, help_text="Tag NFC")
    iot_device_id = models.CharField(max_length=100, blank=True, help_text="ID dispositif IoT")

    # Description et caractéristiques
    name = models.CharField(max_length=200)
    description = models.TextField()
    brand = models.CharField(max_length=100, blank=True)
    model = models.CharField(max_length=100, blank=True)
    specifications = JSONField(default=dict, help_text="Spécifications techniques")

    # Données financières
    acquisition_type = models.CharField(max_length=20, choices=ACQUISITION_TYPE_CHOICES, default='PURCHASE')
    acquisition_date = models.DateField()
    acquisition_cost = models.DecimalField(max_digits=15, decimal_places=2)
    installation_cost = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    total_cost = models.DecimalField(max_digits=15, decimal_places=2, editable=False)

    # Amortissement
    depreciation_method = models.CharField(max_length=20, default='LINEAR')
    useful_life_years = models.IntegerField(default=5)
    useful_life_units = models.IntegerField(null=True, blank=True, help_text="Pour amortissement par unités")
    residual_value = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))

    # Valeurs calculées
    current_book_value = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    accumulated_depreciation = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    fair_value = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    replacement_cost = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)

    # Géolocalisation avancée
    building = models.CharField(max_length=100, blank=True)
    floor = models.CharField(max_length=50, blank=True)
    room = models.CharField(max_length=100, blank=True)
    zone = models.CharField(max_length=100, blank=True)

    # Coordonnées GPS
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    altitude = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)

    # Géofencing
    geofence_radius_meters = models.IntegerField(default=10, help_text="Rayon de géofencing")
    last_location_update = models.DateTimeField(null=True, blank=True)

    # État et condition
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='IN_SERVICE')
    condition = models.CharField(max_length=20, choices=CONDITION_CHOICES, default='GOOD')
    condition_score = models.IntegerField(
        default=80,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Score d'état calculé par IA"
    )

    # Responsabilité
    responsible_person = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assets_managed'
    )
    cost_center = models.CharField(max_length=50, blank=True)
    department = models.CharField(max_length=100, blank=True)

    # IoT et monitoring
    has_iot_sensors = models.BooleanField(default=False)
    iot_config = JSONField(default=dict, help_text="Configuration capteurs IoT")
    monitoring_enabled = models.BooleanField(default=False)
    last_sensor_data = JSONField(default=dict, help_text="Dernières données capteurs")

    # Intégration Wise FM
    wisefm_equipment_id = models.CharField(max_length=50, blank=True, help_text="ID équipement Wise FM")
    sync_with_wisefm = models.BooleanField(default=False)
    wisefm_last_sync = models.DateTimeField(null=True, blank=True)

    # Maintenance prédictive
    maintenance_score = models.IntegerField(
        default=100,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Score de maintenance prédictive"
    )
    next_maintenance_prediction = models.DateField(null=True, blank=True)
    failure_probability = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Probabilité de panne (%)"
    )

    # Utilisation et performance
    usage_hours_total = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    usage_cycles_total = models.IntegerField(default=0)
    efficiency_score = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('100.00'))

    # Garantie et assurance
    warranty_start_date = models.DateField(null=True, blank=True)
    warranty_end_date = models.DateField(null=True, blank=True)
    warranty_provider = models.CharField(max_length=200, blank=True)
    insurance_policy = models.CharField(max_length=100, blank=True)
    insurance_value = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)

    # Compte comptable associé
    accounting_account = models.ForeignKey(
        ChartOfAccounts,
        on_delete=models.PROTECT,
        related_name='assets',
        help_text="Compte d'immobilisation (2xx)"
    )

    # Métadonnées
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='assets_created')
    last_inventory_date = models.DateField(null=True, blank=True)
    tags = ArrayField(models.CharField(max_length=50), default=list, blank=True)

    class Meta:
        db_table = 'assets_management'
        ordering = ['asset_number']
        verbose_name = 'Immobilisation'
        verbose_name_plural = 'Immobilisations'
        indexes = [
            models.Index(fields=['asset_number']),
            models.Index(fields=['category', 'status']),
            models.Index(fields=['serial_number']),
            models.Index(fields=['wisefm_equipment_id']),
            models.Index(fields=['next_maintenance_prediction']),
        ]

    def save(self, *args, **kwargs):
        # Calcul coût total
        self.total_cost = self.acquisition_cost + self.installation_cost

        # Génération QR Code si non fourni
        if not self.qr_code:
            self.qr_code = f"ASSET-{self.asset_number}"

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.asset_number} - {self.name}"

    @property
    def age_in_years(self) -> float:
        """Âge de l'actif en années"""
        return (date.today() - self.acquisition_date).days / 365.25

    @property
    def depreciation_rate_annual(self) -> Decimal:
        """Taux d'amortissement annuel"""
        if self.useful_life_years > 0:
            return Decimal('100.00') / self.useful_life_years
        return Decimal('0.00')

    @property
    def is_warranty_valid(self) -> bool:
        """Vérifie si la garantie est encore valide"""
        return (
            self.warranty_end_date and
            self.warranty_end_date >= date.today()
        )

    @property
    def days_until_maintenance(self) -> int:
        """Jours jusqu'à la prochaine maintenance prédite"""
        if self.next_maintenance_prediction:
            return (self.next_maintenance_prediction - date.today()).days
        return 999


class AssetDocument(TimeStampedModel):
    """
    Documentation associée aux actifs
    GED intelligente avec OCR et IA
    """

    DOCUMENT_TYPE_CHOICES = [
        ('INVOICE', 'Facture d\'achat'),
        ('CONTRACT', 'Contrat'),
        ('WARRANTY', 'Garantie'),
        ('MANUAL', 'Manuel utilisateur'),
        ('CERTIFICATE', 'Certificat'),
        ('INSURANCE', 'Assurance'),
        ('PHOTO', 'Photo'),
        ('TECHNICAL_SHEET', 'Fiche technique'),
        ('MAINTENANCE_LOG', 'Historique maintenance'),
        ('OTHER', 'Autre'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='documents')

    # Classification
    document_type = models.CharField(max_length=20, choices=DOCUMENT_TYPE_CHOICES)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    # Fichier
    file = models.FileField(upload_to='assets/documents/%Y/%m/')
    file_size = models.PositiveIntegerField()
    file_type = models.CharField(max_length=50)

    # OCR et extraction IA
    ocr_extracted_text = models.TextField(blank=True, help_text="Texte extrait par OCR")
    ai_extracted_data = JSONField(default=dict, help_text="Données extraites par IA")
    extraction_confidence = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))

    # Validité et expiration
    document_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    is_expired = models.BooleanField(default=False)

    # Métadonnées
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    is_confidential = models.BooleanField(default=False)

    class Meta:
        db_table = 'assets_documents'
        ordering = ['-created_at']
        verbose_name = 'Document Actif'
        verbose_name_plural = 'Documents Actifs'

    def __str__(self):
        return f"{self.asset.asset_number} - {self.title}"


class AssetDepreciation(TimeStampedModel):
    """
    Amortissements avec moteur de calcul intelligent
    Multi-méthodes et simulation what-if
    """

    DEPRECIATION_METHOD_CHOICES = [
        ('LINEAR', 'Linéaire'),
        ('DECLINING_BALANCE', 'Dégressif'),
        ('DOUBLE_DECLINING', 'Dégressif accéléré'),
        ('UNITS_OF_PRODUCTION', 'Unités de production'),
        ('SUM_OF_YEARS', 'Somme des chiffres'),
        ('HYBRID', 'Hybride (IA optimisé)'),
    ]

    FREQUENCY_CHOICES = [
        ('MONTHLY', 'Mensuelle'),
        ('QUARTERLY', 'Trimestrielle'),
        ('ANNUAL', 'Annuelle'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='depreciations')

    # Méthode et paramètres
    method = models.CharField(max_length=20, choices=DEPRECIATION_METHOD_CHOICES, default='LINEAR')
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES, default='MONTHLY')

    # Données de base
    depreciable_base = models.DecimalField(max_digits=15, decimal_places=2)
    useful_life_years = models.IntegerField()
    useful_life_units = models.IntegerField(null=True, blank=True)
    residual_value = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))

    # Calculs
    annual_depreciation_rate = models.DecimalField(max_digits=5, decimal_places=2)
    period_depreciation_amount = models.DecimalField(max_digits=15, decimal_places=2)

    # Période
    fiscal_year = models.ForeignKey(FiscalYear, on_delete=models.CASCADE, related_name='asset_depreciations')
    period_start = models.DateField()
    period_end = models.DateField()

    # Ajustements IA
    ai_adjustment_factor = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        default=Decimal('1.0000'),
        help_text="Facteur d'ajustement IA basé sur utilisation réelle"
    )
    usage_intensity_factor = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        default=Decimal('1.0000'),
        help_text="Facteur d'intensité d'utilisation"
    )

    # Montants calculés
    gross_depreciation = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    adjusted_depreciation = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    accumulated_depreciation = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))

    # Simulation et scénarios
    is_simulation = models.BooleanField(default=False)
    scenario_name = models.CharField(max_length=100, blank=True)

    # Comptes comptables
    depreciation_account = models.ForeignKey(
        ChartOfAccounts,
        on_delete=models.PROTECT,
        related_name='asset_depreciations',
        help_text="Compte d'amortissement (28x)"
    )
    expense_account = models.ForeignKey(
        ChartOfAccounts,
        on_delete=models.PROTECT,
        related_name='depreciation_expenses',
        help_text="Compte de dotation (681x)"
    )

    # Statut
    is_active = models.BooleanField(default=True)
    is_posted = models.BooleanField(default=False, help_text="Comptabilisé")

    class Meta:
        db_table = 'assets_depreciations'
        ordering = ['-period_start']
        verbose_name = 'Amortissement'
        verbose_name_plural = 'Amortissements'

    def calculate_depreciation(self):
        """Calcul intelligent de l'amortissement avec IA"""

        if self.method == 'LINEAR':
            self.gross_depreciation = self.depreciable_base / self.useful_life_years / 12
        elif self.method == 'DECLINING_BALANCE':
            rate = self.annual_depreciation_rate / 100
            remaining_value = self.asset.current_book_value
            self.gross_depreciation = remaining_value * rate / 12
        elif self.method == 'UNITS_OF_PRODUCTION':
            if self.useful_life_units and self.asset.usage_cycles_total:
                depreciation_per_unit = self.depreciable_base / self.useful_life_units
                # Unités utilisées dans la période (à calculer)
                units_period = 100  # Simulation
                self.gross_depreciation = depreciation_per_unit * units_period

        # Application facteur IA
        self.adjusted_depreciation = self.gross_depreciation * self.ai_adjustment_factor

        self.save(update_fields=['gross_depreciation', 'adjusted_depreciation'])

    def __str__(self):
        return f"{self.asset.asset_number} - {self.method} - {self.period_start}"


class AssetMovement(TimeStampedModel):
    """
    Mouvements et transferts d'actifs
    Traçabilité complète avec blockchain
    """

    MOVEMENT_TYPE_CHOICES = [
        ('ACQUISITION', 'Acquisition'),
        ('TRANSFER', 'Transfert'),
        ('RELOCATION', 'Déplacement'),
        ('DISPOSAL', 'Cession'),
        ('SCRAPPING', 'Mise au rebut'),
        ('LOSS', 'Perte/Vol'),
        ('MAINTENANCE_IN', 'Entrée maintenance'),
        ('MAINTENANCE_OUT', 'Sortie maintenance'),
        ('INVENTORY_ADJUSTMENT', 'Ajustement inventaire'),
    ]

    STATUS_CHOICES = [
        ('PENDING', 'En attente'),
        ('APPROVED', 'Approuvé'),
        ('IN_TRANSIT', 'En transit'),
        ('COMPLETED', 'Terminé'),
        ('CANCELLED', 'Annulé'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='movements')

    # Type et référence
    movement_type = models.CharField(max_length=20, choices=MOVEMENT_TYPE_CHOICES)
    reference_number = models.CharField(max_length=50, unique=True)

    # Dates
    movement_date = models.DateField()
    effective_date = models.DateField(null=True, blank=True)

    # Origine et destination
    from_location = JSONField(default=dict, help_text="Localisation d'origine")
    to_location = JSONField(default=dict, help_text="Localisation de destination")
    from_responsible = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='asset_movements_from'
    )
    to_responsible = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='asset_movements_to'
    )

    # Justification
    reason = models.TextField()
    supporting_documents = ArrayField(
        models.CharField(max_length=200),
        default=list,
        blank=True
    )

    # Statut
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')

    # Workflow de validation
    requires_approval = models.BooleanField(default=True)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='asset_movements_approved'
    )
    approval_date = models.DateTimeField(null=True, blank=True)

    # Blockchain et sécurité
    blockchain_hash = models.CharField(max_length=64, blank=True, help_text="Hash blockchain")
    digital_signature = models.TextField(blank=True)

    # Intégration Wise FM
    wisefm_work_order_id = models.CharField(max_length=50, blank=True)
    sync_with_wisefm = models.BooleanField(default=False)

    class Meta:
        db_table = 'assets_movements'
        ordering = ['-movement_date']
        verbose_name = 'Mouvement d\'Actif'
        verbose_name_plural = 'Mouvements d\'Actifs'

    def __str__(self):
        return f"{self.reference_number} - {self.asset.asset_number} - {self.movement_type}"


class AssetIoTSensor(TimeStampedModel):
    """
    Capteurs IoT associés aux actifs
    Monitoring temps réel avec IA
    """

    SENSOR_TYPE_CHOICES = [
        ('TEMPERATURE', 'Température'),
        ('HUMIDITY', 'Humidité'),
        ('VIBRATION', 'Vibration'),
        ('PRESSURE', 'Pression'),
        ('FLOW', 'Débit'),
        ('LEVEL', 'Niveau'),
        ('SPEED', 'Vitesse'),
        ('CURRENT', 'Courant électrique'),
        ('VOLTAGE', 'Tension'),
        ('GPS', 'Position GPS'),
        ('ACCELEROMETER', 'Accéléromètre'),
        ('GYROSCOPE', 'Gyroscope'),
    ]

    STATUS_CHOICES = [
        ('ACTIVE', 'Actif'),
        ('INACTIVE', 'Inactif'),
        ('ERROR', 'Erreur'),
        ('MAINTENANCE', 'Maintenance'),
        ('CALIBRATION', 'Étalonnage'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='iot_sensors')

    # Identification capteur
    sensor_id = models.CharField(max_length=100, unique=True)
    sensor_name = models.CharField(max_length=200)
    sensor_type = models.CharField(max_length=20, choices=SENSOR_TYPE_CHOICES)

    # Configuration technique
    manufacturer = models.CharField(max_length=100, blank=True)
    model = models.CharField(max_length=100, blank=True)
    firmware_version = models.CharField(max_length=50, blank=True)

    # Configuration réseau
    protocol = models.CharField(max_length=20, default='MQTT')
    endpoint_url = models.URLField(blank=True)
    api_key = models.CharField(max_length=200, blank=True)

    # Paramètres de mesure
    unit_of_measure = models.CharField(max_length=20)
    precision = models.DecimalField(max_digits=10, decimal_places=6)
    sampling_frequency_seconds = models.IntegerField(default=60)

    # Seuils et alertes
    min_threshold = models.DecimalField(max_digits=15, decimal_places=6, null=True, blank=True)
    max_threshold = models.DecimalField(max_digits=15, decimal_places=6, null=True, blank=True)
    critical_min = models.DecimalField(max_digits=15, decimal_places=6, null=True, blank=True)
    critical_max = models.DecimalField(max_digits=15, decimal_places=6, null=True, blank=True)

    # État actuel
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    last_reading = models.DecimalField(max_digits=15, decimal_places=6, null=True, blank=True)
    last_reading_time = models.DateTimeField(null=True, blank=True)

    # Calibration
    calibration_date = models.DateField(null=True, blank=True)
    next_calibration_date = models.DateField(null=True, blank=True)
    calibration_factor = models.DecimalField(max_digits=10, decimal_places=6, default=Decimal('1.000000'))

    # Wise FM integration
    wisefm_sensor_id = models.CharField(max_length=50, blank=True)
    sync_with_wisefm = models.BooleanField(default=True)

    class Meta:
        db_table = 'assets_iot_sensors'
        ordering = ['sensor_id']
        verbose_name = 'Capteur IoT'
        verbose_name_plural = 'Capteurs IoT'

    def __str__(self):
        return f"{self.sensor_id} - {self.asset.asset_number}"


class AssetMaintenanceRecord(TimeStampedModel):
    """
    Historique de maintenance avec prédictions IA
    Synchronisation native Wise FM
    """

    MAINTENANCE_TYPE_CHOICES = [
        ('PREVENTIVE', 'Préventive'),
        ('PREDICTIVE', 'Prédictive'),
        ('CORRECTIVE', 'Corrective'),
        ('EMERGENCY', 'Urgence'),
        ('UPGRADE', 'Amélioration'),
        ('CALIBRATION', 'Étalonnage'),
    ]

    STATUS_CHOICES = [
        ('SCHEDULED', 'Programmée'),
        ('IN_PROGRESS', 'En cours'),
        ('COMPLETED', 'Terminée'),
        ('CANCELLED', 'Annulée'),
        ('DEFERRED', 'Reportée'),
    ]

    PRIORITY_CHOICES = [
        ('LOW', 'Basse'),
        ('MEDIUM', 'Moyenne'),
        ('HIGH', 'Haute'),
        ('CRITICAL', 'Critique'),
        ('EMERGENCY', 'Urgence'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='maintenance_records')

    # Identification
    work_order_number = models.CharField(max_length=50, unique=True)
    maintenance_type = models.CharField(max_length=20, choices=MAINTENANCE_TYPE_CHOICES)
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='MEDIUM')

    # Planification
    scheduled_date = models.DateField()
    scheduled_duration_hours = models.DecimalField(max_digits=6, decimal_places=2)
    actual_start_date = models.DateTimeField(null=True, blank=True)
    actual_end_date = models.DateTimeField(null=True, blank=True)

    # Description
    description = models.TextField()
    problem_description = models.TextField(blank=True)
    work_performed = models.TextField(blank=True)

    # Ressources
    technician = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='maintenance_performed'
    )
    external_contractor = models.CharField(max_length=200, blank=True)

    # Coûts
    labor_cost = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    parts_cost = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    external_cost = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    total_cost = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))

    # Résultats
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='SCHEDULED')
    effectiveness_score = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Score d'efficacité de la maintenance"
    )

    # Prédictions IA
    predicted_by_ai = models.BooleanField(default=False)
    prediction_accuracy = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Précision de la prédiction IA (%)"
    )
    ml_model_version = models.CharField(max_length=20, blank=True)

    # Intégration Wise FM
    wisefm_work_order_id = models.CharField(max_length=50, blank=True)
    wisefm_intervention_id = models.CharField(max_length=50, blank=True)
    wisefm_status = models.CharField(max_length=50, blank=True)
    sync_with_wisefm = models.BooleanField(default=True)
    wisefm_last_sync = models.DateTimeField(null=True, blank=True)

    # Pièces détachées utilisées
    parts_used = JSONField(default=list, help_text="Liste des pièces utilisées")

    class Meta:
        db_table = 'assets_maintenance_records'
        ordering = ['-scheduled_date']
        verbose_name = 'Maintenance Actif'
        verbose_name_plural = 'Maintenances Actifs'

    def save(self, *args, **kwargs):
        # Calcul coût total
        self.total_cost = self.labor_cost + self.parts_cost + self.external_cost
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.work_order_number} - {self.asset.asset_number}"


class AssetInventory(TimeStampedModel):
    """
    Inventaire intelligent automatisé
    Drones, scanners, réconciliation IA
    """

    INVENTORY_TYPE_CHOICES = [
        ('ANNUAL', 'Inventaire annuel'),
        ('ROLLING', 'Inventaire tournant'),
        ('SPOT_CHECK', 'Contrôle ponctuel'),
        ('AUTOMATED', 'Inventaire automatisé'),
        ('EMERGENCY', 'Inventaire d\'urgence'),
    ]

    METHOD_CHOICES = [
        ('MANUAL', 'Manuel'),
        ('RFID_SCAN', 'Scan RFID'),
        ('QR_SCAN', 'Scan QR Code'),
        ('DRONE', 'Drone automatisé'),
        ('COMPUTER_VISION', 'Vision par ordinateur'),
        ('HYBRID', 'Hybride'),
    ]

    STATUS_CHOICES = [
        ('PLANNED', 'Planifié'),
        ('IN_PROGRESS', 'En cours'),
        ('COMPLETED', 'Terminé'),
        ('RECONCILED', 'Réconcilié'),
        ('DISPUTED', 'En litige'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='asset_inventories')

    # Configuration inventaire
    inventory_number = models.CharField(max_length=50, unique=True)
    inventory_type = models.CharField(max_length=20, choices=INVENTORY_TYPE_CHOICES)
    inventory_method = models.CharField(max_length=20, choices=METHOD_CHOICES, default='MANUAL')

    # Scope
    inventory_date = models.DateField()
    location_filter = JSONField(default=dict, help_text="Filtres de localisation")
    category_filter = models.ManyToManyField(AssetCategory, blank=True)

    # Assets inclus
    assets_expected = models.ManyToManyField(Asset, related_name='inventories_expected', blank=True)
    assets_found = models.ManyToManyField(Asset, related_name='inventories_found', blank=True)

    # Résultats
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PLANNED')
    completion_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))

    # Statistiques
    total_assets_expected = models.IntegerField(default=0)
    total_assets_found = models.IntegerField(default=0)
    total_assets_missing = models.IntegerField(default=0)
    total_assets_extra = models.IntegerField(default=0)

    # Écarts détectés par IA
    discrepancies_detected = JSONField(default=list, help_text="Écarts détectés par IA")
    ai_confidence_score = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))

    # Performance
    inventory_duration_hours = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    cost_of_inventory = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))

    # Responsables
    inventory_manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='inventories_managed'
    )
    counters = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='inventories_counted', blank=True)

    # Wise FM sync
    wisefm_inventory_id = models.CharField(max_length=50, blank=True)

    class Meta:
        db_table = 'assets_inventories'
        ordering = ['-inventory_date']
        verbose_name = 'Inventaire d\'Actifs'
        verbose_name_plural = 'Inventaires d\'Actifs'

    def __str__(self):
        return f"{self.inventory_number} - {self.inventory_date}"


class AssetPerformanceMetrics(TimeStampedModel):
    """
    Métriques de performance des actifs
    Analytics et IA pour optimisation
    """

    METRIC_TYPE_CHOICES = [
        ('UTILIZATION', 'Taux d\'utilisation'),
        ('EFFICIENCY', 'Efficacité'),
        ('AVAILABILITY', 'Disponibilité'),
        ('RELIABILITY', 'Fiabilité'),
        ('MAINTAINABILITY', 'Maintenabilité'),
        ('TCO', 'Coût total de possession'),
        ('ROI', 'Retour sur investissement'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='performance_metrics')

    # Métrique
    metric_type = models.CharField(max_length=20, choices=METRIC_TYPE_CHOICES)
    metric_name = models.CharField(max_length=200)

    # Période de mesure
    measurement_date = models.DateField()
    period_start = models.DateField()
    period_end = models.DateField()

    # Valeurs
    target_value = models.DecimalField(max_digits=15, decimal_places=4, null=True, blank=True)
    actual_value = models.DecimalField(max_digits=15, decimal_places=4)
    variance = models.DecimalField(max_digits=15, decimal_places=4, default=Decimal('0.0000'))
    variance_percent = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))

    # Unité et contexte
    unit = models.CharField(max_length=20)
    calculation_method = models.TextField(blank=True)

    # Données détaillées
    raw_data = JSONField(default=dict, help_text="Données brutes de calcul")
    context_data = JSONField(default=dict, help_text="Données contextuelles")

    # Prédictions IA
    predicted_next_value = models.DecimalField(max_digits=15, decimal_places=4, null=True, blank=True)
    prediction_confidence = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))

    # Wise FM correlation
    wisefm_metric_id = models.CharField(max_length=50, blank=True)
    maintenance_correlation = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Corrélation avec maintenance Wise FM"
    )

    class Meta:
        db_table = 'assets_performance_metrics'
        ordering = ['-measurement_date']
        verbose_name = 'Métrique de Performance'
        verbose_name_plural = 'Métriques de Performance'

    def calculate_variance(self):
        """Calcul automatique des écarts"""
        if self.target_value:
            self.variance = self.actual_value - self.target_value
            self.variance_percent = (self.variance / self.target_value * 100) if self.target_value != 0 else Decimal('0.00')

        self.save(update_fields=['variance', 'variance_percent'])

    def __str__(self):
        return f"{self.asset.asset_number} - {self.metric_name} - {self.measurement_date}"


class AssetComponent(TimeStampedModel):
    """
    Composants associés aux actifs
    Gestion détaillée des composants d'un équipement
    """

    COMPONENT_STATE_CHOICES = [
        ('NEUF', 'Neuf'),
        ('BON', 'Bon état'),
        ('USAGE', 'Usagé'),
        ('DEFECTUEUX', 'Défectueux'),
        ('HORS_SERVICE', 'Hors service'),
        ('REMPLACE', 'Remplacé'),
    ]

    COMPONENT_CATEGORY_CHOICES = [
        ('MECANIQUE', 'Mécanique'),
        ('ELECTRIQUE', 'Électrique'),
        ('ELECTRONIQUE', 'Électronique'),
        ('HYDRAULIQUE', 'Hydraulique'),
        ('PNEUMATIQUE', 'Pneumatique'),
        ('INFORMATIQUE', 'Informatique'),
        ('STRUCTURE', 'Structure'),
        ('AUTRE', 'Autre'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='components')

    # Identification du composant
    code = models.CharField(max_length=50, help_text="Code unique du composant")
    name = models.CharField(max_length=200, help_text="Nom du composant")
    description = models.TextField(help_text="Description détaillée du composant")

    # État et catégorie
    etat = models.CharField(
        max_length=20,
        choices=COMPONENT_STATE_CHOICES,
        default='NEUF',
        help_text="État actuel du composant"
    )
    categorie = models.CharField(
        max_length=20,
        choices=COMPONENT_CATEGORY_CHOICES,
        default='AUTRE',
        help_text="Catégorie technique du composant"
    )

    # Date d'installation
    date_installation = models.DateField(
        help_text="Date d'installation du composant"
    )

    # Localisation
    localisation = models.CharField(
        max_length=200,
        blank=True,
        help_text="Localisation spécifique du composant dans l'équipement"
    )

    # Informations complémentaires
    serial_number = models.CharField(max_length=100, blank=True, help_text="Numéro de série du composant")
    manufacturer = models.CharField(max_length=100, blank=True, help_text="Fabricant du composant")
    model = models.CharField(max_length=100, blank=True, help_text="Modèle du composant")

    # Durée de vie et maintenance
    expected_lifetime_years = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Durée de vie prévue en années"
    )
    last_maintenance_date = models.DateField(null=True, blank=True)
    next_maintenance_date = models.DateField(null=True, blank=True)

    # Coût
    purchase_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Coût d'achat du composant"
    )
    replacement_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Coût estimé de remplacement"
    )

    # Criticalité
    is_critical = models.BooleanField(
        default=False,
        help_text="Composant critique pour le fonctionnement"
    )

    # Notes
    component_notes = models.TextField(blank=True, help_text="Notes additionnelles")

    # Métadonnées
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'assets_components'
        ordering = ['asset', 'code']
        unique_together = [('asset', 'code')]
        verbose_name = 'Composant d\'Actif'
        verbose_name_plural = 'Composants d\'Actifs'

    def __str__(self):
        return f"{self.asset.asset_number} - {self.code} - {self.name}"


class MaintenanceServiceContract(TimeStampedModel):
    """
    Contrats de maintenance de service
    Section "Données de maintenance" du formulaire Asset Master Data
    """

    CONTRACT_TYPE_CHOICES = [
        ('FULL_SERVICE', 'Service complet'),
        ('PREVENTIVE', 'Préventif'),
        ('ON_DEMAND', 'À la demande'),
        ('WARRANTY', 'Garantie'),
        ('SLA', 'Contrat de niveau de service'),
    ]

    CONTRACT_OBJECT_CHOICES = [
        ('EQUIPMENT', 'Équipement'),
        ('FACILITY', 'Installation'),
        ('SYSTEM', 'Système'),
        ('BUILDING', 'Bâtiment'),
        ('FLEET', 'Flotte'),
    ]

    PAYMENT_METHOD_CHOICES = [
        ('VIREMENT', 'Virement'),
        ('CHEQUE', 'Chèque'),
        ('PRELEVEMENT', 'Prélèvement'),
        ('CARTE', 'Carte bancaire'),
        ('ESPECES', 'Espèces'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='maintenance_contracts')

    # Basic contract information
    contract_name = models.CharField(max_length=200, help_text="Nom du contrat")
    vendor = models.CharField(max_length=200, help_text="Fournisseur")
    edtci = models.CharField(max_length=100, blank=True, help_text="EDTCI")
    parent_site_reference = models.CharField(max_length=100, blank=True, help_text="Référence site parent")
    contract_type = models.CharField(max_length=20, choices=CONTRACT_TYPE_CHOICES, help_text="Type de contrat")
    contract_object = models.CharField(max_length=20, choices=CONTRACT_OBJECT_CHOICES, help_text="Objet du contrat")
    vendor_number = models.CharField(max_length=50, blank=True, help_text="Numéro fournisseur")
    gla_m2 = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="GLA (m²)")
    code_contract = models.CharField(max_length=50, unique=True, help_text="Code contrat")

    # Contracted parties information - Structure
    structure_name = models.CharField(max_length=200, help_text="Structure")
    legal_signatory = models.CharField(max_length=200, help_text="Signataire légal")
    structure_edtci = models.CharField(max_length=100, blank=True, help_text="EDTCI Structure")
    structure_address = models.TextField(help_text="Adresse structure")
    structure_phone_number = models.CharField(max_length=20, help_text="Téléphone structure")
    structure_email_address = models.EmailField(help_text="Email structure")
    structure_id_reg = models.CharField(max_length=100, blank=True, help_text="ID/Immatriculation structure")

    # Contracted parties information - Vendor
    vendor_name = models.CharField(max_length=200, help_text="Nom du fournisseur")
    vendor_address = models.TextField(help_text="Adresse fournisseur")
    vendor_phone_number = models.CharField(max_length=20, help_text="Téléphone fournisseur")
    vendor_email_address = models.EmailField(help_text="Email fournisseur")
    vendor_id_reg = models.CharField(max_length=100, blank=True, help_text="ID/Immatriculation fournisseur")

    # Creation information
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='maintenance_contracts_created')
    creation_date = models.DateField(auto_now_add=True)

    # Price & payment terms
    contract_obligation = models.TextField(blank=True, help_text="Obligations contractuelles")
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('20.00'), help_text="Taux de TVA")
    payment_term = models.CharField(max_length=100, help_text="Conditions de paiement")
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default='VIREMENT')

    # Total amount (will be calculated from price list items)
    total_amount_excl_vat = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))

    # Contract key dates
    contract_start_date = models.DateField(help_text="Date de début du contrat")
    contract_end_date = models.DateField(help_text="Date de fin du contrat")
    contract_duration = models.CharField(max_length=50, blank=True, help_text="Durée du contrat")
    commencement_date = models.DateField(help_text="Date de commencement")
    contract_expiry_date = models.DateField(help_text="Date d'expiration du contrat")

    # Status
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'assets_maintenance_contracts'
        ordering = ['-contract_start_date']
        verbose_name = 'Contrat de Maintenance'
        verbose_name_plural = 'Contrats de Maintenance'

    def __str__(self):
        return f"{self.code_contract} - {self.contract_name} - {self.vendor}"

    def save(self, *args, **kwargs):
        # Calculate duration if not set
        if self.contract_start_date and self.contract_end_date and not self.contract_duration:
            delta = self.contract_end_date - self.contract_start_date
            years = delta.days // 365
            months = (delta.days % 365) // 30
            days = (delta.days % 365) % 30

            duration_parts = []
            if years:
                duration_parts.append(f"{years} an{'s' if years > 1 else ''}")
            if months:
                duration_parts.append(f"{months} mois")
            if days:
                duration_parts.append(f"{days} jour{'s' if days > 1 else ''}")

            self.contract_duration = " ".join(duration_parts) if duration_parts else "0 jour"

        super().save(*args, **kwargs)


class PriceListSummaryItem(TimeStampedModel):
    """
    Lignes de tarification du contrat de maintenance
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contract = models.ForeignKey(MaintenanceServiceContract, on_delete=models.CASCADE, related_name='price_list_items')

    year = models.IntegerField(help_text="Année")
    item_description = models.CharField(max_length=200, help_text="Description de l'élément")
    amount = models.DecimalField(max_digits=15, decimal_places=2, help_text="Montant HT")

    class Meta:
        db_table = 'assets_maintenance_price_items'
        ordering = ['year', 'id']
        verbose_name = 'Ligne tarifaire'
        verbose_name_plural = 'Lignes tarifaires'

    def __str__(self):
        return f"Année {self.year} - {self.item_description}: {self.amount}€"


class MaintenanceHistory(TimeStampedModel):
    """
    Historique de maintenance détaillé
    """

    INTERVENTION_TYPE_CHOICES = [
        ('PREVENTIVE', 'Maintenance préventive'),
        ('CORRECTIVE', 'Maintenance corrective'),
        ('PREDICTIVE', 'Maintenance prédictive'),
        ('INSPECTION', 'Inspection'),
        ('REPAIR', 'Réparation'),
        ('REPLACEMENT', 'Remplacement'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='maintenance_history')
    contract = models.ForeignKey(MaintenanceServiceContract, on_delete=models.SET_NULL, null=True, blank=True, related_name='history_entries')

    # Intervention details
    intervention_date = models.DateField(help_text="Date d'intervention")
    intervention_type = models.CharField(max_length=20, choices=INTERVENTION_TYPE_CHOICES)
    description = models.TextField(help_text="Description de l'intervention")

    # Technician info
    technician_name = models.CharField(max_length=200, help_text="Nom du technicien")
    technician_company = models.CharField(max_length=200, blank=True, help_text="Société du technicien")

    # Duration and cost
    duration_hours = models.DecimalField(max_digits=6, decimal_places=2, help_text="Durée en heures")
    labor_cost = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    parts_cost = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    total_cost = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))

    # Results
    issues_found = models.TextField(blank=True, help_text="Problèmes identifiés")
    actions_taken = models.TextField(help_text="Actions entreprises")
    recommendations = models.TextField(blank=True, help_text="Recommandations")

    # Next maintenance
    next_maintenance_date = models.DateField(null=True, blank=True, help_text="Prochaine maintenance recommandée")

    # Documents
    work_order_number = models.CharField(max_length=50, blank=True, help_text="Numéro d'ordre de travail")
    report_file = models.FileField(upload_to='maintenance/reports/%Y/%m/', null=True, blank=True)

    class Meta:
        db_table = 'assets_maintenance_history'
        ordering = ['-intervention_date']
        verbose_name = 'Historique de Maintenance'
        verbose_name_plural = 'Historiques de Maintenance'

    def save(self, *args, **kwargs):
        # Calculate total cost
        self.total_cost = self.labor_cost + self.parts_cost
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.asset.asset_number} - {self.intervention_date} - {self.intervention_type}"


class AssetAttachment(TimeStampedModel):
    """
    Pièces jointes associées aux actifs
    Section Attachments du formulaire Asset Master Data
    """

    ATTACHMENT_TYPE_CHOICES = [
        ('INVOICE', 'Facture'),
        ('CONTRACT', 'Contrat'),
        ('MANUAL', 'Manuel'),
        ('TECHNICAL_SHEET', 'Fiche technique'),
        ('WARRANTY', 'Garantie'),
        ('CERTIFICATE', 'Certificat'),
        ('PHOTO', 'Photo'),
        ('PLAN', 'Plan'),
        ('REPORT', 'Rapport'),
        ('OTHER', 'Autre'),
    ]

    FILE_CATEGORY_CHOICES = [
        ('ADMINISTRATIVE', 'Administratif'),
        ('TECHNICAL', 'Technique'),
        ('FINANCIAL', 'Financier'),
        ('LEGAL', 'Légal'),
        ('MAINTENANCE', 'Maintenance'),
        ('SECURITY', 'Sécurité'),
        ('COMPLIANCE', 'Conformité'),
        ('OTHER', 'Autre'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='attachments')

    # File information
    file_name = models.CharField(max_length=255, help_text="Nom du fichier")
    file = models.FileField(upload_to='assets/attachments/%Y/%m/%d/')
    file_size = models.PositiveIntegerField(help_text="Taille du fichier en octets")
    file_type = models.CharField(max_length=50, help_text="Type MIME du fichier")

    # Metadata
    attachment_type = models.CharField(max_length=20, choices=ATTACHMENT_TYPE_CHOICES, default='OTHER')
    category = models.CharField(max_length=20, choices=FILE_CATEGORY_CHOICES, default='OTHER')
    title = models.CharField(max_length=200, help_text="Titre du document")
    description = models.TextField(blank=True, help_text="Description du document")

    # Version control
    version = models.CharField(max_length=20, default='1.0', help_text="Version du document")
    is_latest_version = models.BooleanField(default=True)
    previous_version = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='next_versions')

    # Validity
    valid_from = models.DateField(null=True, blank=True, help_text="Date de début de validité")
    valid_until = models.DateField(null=True, blank=True, help_text="Date de fin de validité")
    is_expired = models.BooleanField(default=False)

    # Security
    is_confidential = models.BooleanField(default=False, help_text="Document confidentiel")
    access_level = models.CharField(max_length=50, blank=True, help_text="Niveau d'accès requis")

    # Tags and search
    tags = ArrayField(models.CharField(max_length=50), default=list, blank=True, help_text="Tags pour recherche")
    keywords = models.TextField(blank=True, help_text="Mots-clés pour recherche")

    # Upload information
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='asset_attachments_uploaded')
    upload_date = models.DateTimeField(auto_now_add=True)

    # Reference
    external_reference = models.CharField(max_length=100, blank=True, help_text="Référence externe")
    source = models.CharField(max_length=200, blank=True, help_text="Source du document")

    class Meta:
        db_table = 'assets_attachments'
        ordering = ['-upload_date']
        verbose_name = 'Pièce jointe'
        verbose_name_plural = 'Pièces jointes'
        indexes = [
            models.Index(fields=['asset', '-upload_date']),
            models.Index(fields=['attachment_type']),
        ]

    def save(self, *args, **kwargs):
        # Check expiration
        if self.valid_until:
            from datetime import date
            self.is_expired = self.valid_until < date.today()

        # Update previous version if needed
        if self.is_latest_version and self.previous_version:
            self.previous_version.is_latest_version = False
            self.previous_version.save(update_fields=['is_latest_version'])

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.asset.asset_number} - {self.title} - v{self.version}"


class AssetNote(TimeStampedModel):
    """
    Notes et commentaires sur les actifs
    Section Notes du formulaire Asset Master Data
    """

    NOTE_TYPE_CHOICES = [
        ('GENERAL', 'Note générale'),
        ('TECHNICAL', 'Note technique'),
        ('MAINTENANCE', 'Note de maintenance'),
        ('INCIDENT', 'Incident'),
        ('OBSERVATION', 'Observation'),
        ('WARNING', 'Avertissement'),
        ('REMINDER', 'Rappel'),
        ('INSTRUCTION', 'Instruction'),
        ('HISTORY', 'Historique'),
        ('OTHER', 'Autre'),
    ]

    PRIORITY_CHOICES = [
        ('LOW', 'Basse'),
        ('MEDIUM', 'Moyenne'),
        ('HIGH', 'Haute'),
        ('CRITICAL', 'Critique'),
    ]

    VISIBILITY_CHOICES = [
        ('PUBLIC', 'Public'),
        ('INTERNAL', 'Interne'),
        ('RESTRICTED', 'Restreint'),
        ('CONFIDENTIAL', 'Confidentiel'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='notes')

    # Note content
    note_type = models.CharField(max_length=20, choices=NOTE_TYPE_CHOICES, default='GENERAL')
    subject = models.CharField(max_length=200, help_text="Sujet de la note")
    content = models.TextField(help_text="Contenu de la note")

    # Classification
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='MEDIUM')
    visibility = models.CharField(max_length=20, choices=VISIBILITY_CHOICES, default='INTERNAL')

    # Related information
    related_contract = models.ForeignKey(MaintenanceServiceContract, null=True, blank=True, on_delete=models.SET_NULL, related_name='notes')
    related_maintenance = models.ForeignKey(MaintenanceHistory, null=True, blank=True, on_delete=models.SET_NULL, related_name='notes')
    related_component = models.ForeignKey(AssetComponent, null=True, blank=True, on_delete=models.SET_NULL, related_name='notes')

    # Follow-up
    requires_action = models.BooleanField(default=False, help_text="Nécessite une action")
    action_due_date = models.DateField(null=True, blank=True, help_text="Date limite d'action")
    action_assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='asset_notes_assigned')
    action_completed = models.BooleanField(default=False)
    action_completed_date = models.DateTimeField(null=True, blank=True)

    # Note validity
    is_active = models.BooleanField(default=True)
    valid_from = models.DateField(null=True, blank=True)
    valid_until = models.DateField(null=True, blank=True)

    # Notification settings
    send_notification = models.BooleanField(default=False)
    notification_recipients = ArrayField(models.EmailField(), default=list, blank=True)
    notification_sent = models.BooleanField(default=False)
    notification_sent_date = models.DateTimeField(null=True, blank=True)

    # Tags
    tags = ArrayField(models.CharField(max_length=50), default=list, blank=True)

    # Author information
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='asset_notes_created')
    last_modified_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='asset_notes_modified')

    # Parent/child relationship for note threads
    parent_note = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='replies')

    # Attachments reference
    has_attachments = models.BooleanField(default=False)
    attachment_count = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'assets_notes'
        ordering = ['-created_at', '-priority']
        verbose_name = 'Note'
        verbose_name_plural = 'Notes'
        indexes = [
            models.Index(fields=['asset', '-created_at']),
            models.Index(fields=['requires_action', 'action_completed']),
            models.Index(fields=['note_type', 'priority']),
        ]

    def save(self, *args, **kwargs):
        # Check if note is still valid
        if self.valid_until:
            from datetime import date
            if self.valid_until < date.today():
                self.is_active = False

        # Send notification if needed
        if self.send_notification and not self.notification_sent:
            # Here you would implement notification logic
            pass

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.asset.asset_number} - {self.subject} - {self.note_type}"

    @property
    def is_overdue(self):
        """Check if action is overdue"""
        if self.requires_action and self.action_due_date and not self.action_completed:
            from datetime import date
            return self.action_due_date < date.today()
        return False


class WiseFMIntegration(TimeStampedModel):
    """
    Configuration d'intégration avec Wise FM
    APIs et synchronisation bidirectionnelle
    """

    SYNC_TYPE_CHOICES = [
        ('MASTER_DATA', 'Données de référence'),
        ('WORK_ORDERS', 'Ordres de travail'),
        ('INTERVENTIONS', 'Interventions'),
        ('SENSORS_DATA', 'Données capteurs'),
        ('COSTS', 'Coûts maintenance'),
        ('PLANNING', 'Planification'),
    ]

    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('INACTIVE', 'Inactive'),
        ('ERROR', 'Erreur'),
        ('MAINTENANCE', 'Maintenance'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='wisefm_integrations')

    # Configuration connexion
    wisefm_instance_url = models.URLField(help_text="URL instance Wise FM")
    api_key = models.CharField(max_length=200, help_text="Clé API Wise FM")
    client_id = models.CharField(max_length=100, blank=True)
    client_secret = models.CharField(max_length=200, blank=True)

    # Types de synchronisation activés
    sync_types_enabled = ArrayField(
        models.CharField(max_length=20),
        default=list,
        help_text="Types de sync activés"
    )

    # Configuration synchronisation
    sync_frequency_minutes = models.IntegerField(default=60)
    last_sync_date = models.DateTimeField(null=True, blank=True)
    next_sync_date = models.DateTimeField(null=True, blank=True)

    # Statut
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='INACTIVE')
    connection_test_passed = models.BooleanField(default=False)

    # Statistiques
    total_syncs = models.IntegerField(default=0)
    successful_syncs = models.IntegerField(default=0)
    failed_syncs = models.IntegerField(default=0)
    last_error = models.TextField(blank=True)

    # Configuration avancée
    webhook_url = models.URLField(blank=True, help_text="Webhook pour événements temps réel")
    realtime_enabled = models.BooleanField(default=False)

    # Mapping des champs
    field_mapping = JSONField(default=dict, help_text="Mapping des champs Assets <-> Wise FM")

    class Meta:
        db_table = 'assets_wisefm_integration'
        verbose_name = 'Intégration Wise FM'
        verbose_name_plural = 'Intégrations Wise FM'

    def __str__(self):
        return f"Wise FM - {self.company.name} - {self.status}"

    def test_connection(self) -> bool:
        """Test de connexion avec Wise FM"""
        try:
            import requests
            response = requests.get(
                f"{self.wisefm_instance_url}/api/health",
                headers={'Authorization': f'Bearer {self.api_key}'},
                timeout=10
            )

            self.connection_test_passed = response.status_code == 200
            self.save(update_fields=['connection_test_passed'])

            return self.connection_test_passed
        except Exception as e:
            self.last_error = str(e)
            self.connection_test_passed = False
            self.save(update_fields=['connection_test_passed', 'last_error'])
            return False