"""
Modèles pour Gestion de Clôture Comptable Périodique WiseBook
Conforme cahier des charges : cycle complet, workflow, archivage
"""
from django.db import models
from django.db.models import JSONField
from django.contrib.postgres.fields import ArrayField
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from decimal import Decimal
import uuid
from datetime import datetime, timedelta

from apps.core.models import TimeStampedModel
from apps.accounting.models import Company, FiscalYear, ChartOfAccounts, JournalEntry


class PeriodicClosureConfiguration(TimeStampedModel):
    """
    Configuration globale des clôtures périodiques par société
    """

    CLOSURE_TYPES = [
        ('MONTHLY', 'Clôture Mensuelle'),
        ('QUARTERLY', 'Clôture Trimestrielle'),
        ('SEMI_ANNUAL', 'Clôture Semestrielle'),
        ('ANNUAL', 'Clôture Annuelle'),
        ('SPECIAL', 'Clôture Spéciale'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.OneToOneField(Company, on_delete=models.CASCADE, related_name='closure_config')

    # Configuration des délais
    monthly_deadline_days = models.PositiveIntegerField(default=5, verbose_name="Délai clôture mensuelle (J+)")
    quarterly_deadline_days = models.PositiveIntegerField(default=15, verbose_name="Délai clôture trimestrielle (J+)")
    annual_deadline_days = models.PositiveIntegerField(default=45, verbose_name="Délai clôture annuelle (J+)")

    # Seuils de matérialité
    materiality_threshold_amount = models.DecimalField(
        max_digits=15, decimal_places=2, default=Decimal('10000'),
        verbose_name="Seuil de matérialité (montant)"
    )
    materiality_threshold_percentage = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('5'),
        verbose_name="Seuil de matérialité (%)"
    )

    # Paramètres d'automatisation
    auto_provisions_enabled = models.BooleanField(default=True, verbose_name="Provisions automatiques")
    auto_depreciation_enabled = models.BooleanField(default=True, verbose_name="Amortissements automatiques")
    auto_accruals_enabled = models.BooleanField(default=True, verbose_name="Régularisations automatiques")

    # Configuration notifications
    notification_channels = ArrayField(
        models.CharField(max_length=20),
        default=list(['email']),
        verbose_name="Canaux de notification"
    )

    # Règles de validation
    validation_matrix = JSONField(default=dict, verbose_name="Matrice de validation")

    class Meta:
        db_table = 'periodic_closure_config'
        verbose_name = "Configuration Clôture Périodique"
        verbose_name_plural = "Configurations Clôture Périodique"


class ClosurePeriod(TimeStampedModel):
    """
    Période de clôture avec suivi complet du cycle
    """

    PERIOD_STATUS = [
        ('OPEN', 'Ouverte'),
        ('IN_PROGRESS', 'En Cours'),
        ('CONTROLS', 'Contrôles'),
        ('VALIDATION', 'Validation'),
        ('APPROVED', 'Approuvée'),
        ('CLOSED', 'Clôturée'),
        ('ARCHIVED', 'Archivée'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='closure_periods')
    fiscal_year = models.ForeignKey(FiscalYear, on_delete=models.CASCADE, related_name='closure_periods')

    # Identification
    period_type = models.CharField(max_length=20, choices=PeriodicClosureConfiguration.CLOSURE_TYPES)
    period_name = models.CharField(max_length=100, verbose_name="Nom de la période")
    period_code = models.CharField(max_length=20, verbose_name="Code période")

    # Dates
    period_start = models.DateField(verbose_name="Début de période")
    period_end = models.DateField(verbose_name="Fin de période")
    closure_deadline = models.DateField(verbose_name="Échéance de clôture")
    actual_closure_date = models.DateTimeField(null=True, blank=True, verbose_name="Date réelle de clôture")

    # État et progression
    status = models.CharField(max_length=20, choices=PERIOD_STATUS, default='OPEN')
    completion_percentage = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('0'),
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('100'))]
    )

    # Responsables
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='created_closure_periods')
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Responsable principal")
    controller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Contrôleur", related_name='controlled_periods')
    approver = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Approbateur", related_name='approved_periods')

    # Métriques
    total_entries_generated = models.PositiveIntegerField(default=0, verbose_name="Écritures générées")
    total_amount_processed = models.DecimalField(max_digits=20, decimal_places=2, default=Decimal('0'))
    controls_passed = models.PositiveIntegerField(default=0)
    controls_failed = models.PositiveIntegerField(default=0)

    # Paramètres spécifiques
    custom_parameters = JSONField(default=dict, verbose_name="Paramètres personnalisés")

    # Archivage
    archived_at = models.DateTimeField(null=True, blank=True)
    archive_location = models.CharField(max_length=500, blank=True)
    retention_until = models.DateField(null=True, blank=True)

    class Meta:
        db_table = 'closure_periods'
        unique_together = [('company', 'period_code', 'fiscal_year')]
        indexes = [
            models.Index(fields=['company', 'status', '-closure_deadline']),
            models.Index(fields=['fiscal_year', 'period_type']),
            models.Index(fields=['assigned_to', 'status']),
        ]
        ordering = ['-closure_deadline']
        verbose_name = "Période de Clôture"
        verbose_name_plural = "Périodes de Clôture"

    def __str__(self):
        return f"{self.company.name} - {self.period_name}"


class ClosureTask(TimeStampedModel):
    """
    Tâche individuelle dans le processus de clôture
    """

    TASK_TYPES = [
        ('PROVISION', 'Calcul Provisions'),
        ('DEPRECIATION', 'Calcul Amortissements'),
        ('ACCRUAL', 'Régularisations'),
        ('RECONCILIATION', 'Rapprochements'),
        ('CONTROL', 'Contrôles'),
        ('VALIDATION', 'Validation'),
        ('REPORTING', 'États Financiers'),
        ('ARCHIVING', 'Archivage'),
    ]

    TASK_STATUS = [
        ('PENDING', 'En Attente'),
        ('IN_PROGRESS', 'En Cours'),
        ('COMPLETED', 'Terminée'),
        ('REJECTED', 'Rejetée'),
        ('SKIPPED', 'Ignorée'),
    ]

    PRIORITY_LEVELS = [
        ('LOW', 'Basse'),
        ('MEDIUM', 'Moyenne'),
        ('HIGH', 'Haute'),
        ('CRITICAL', 'Critique'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    closure_period = models.ForeignKey(ClosurePeriod, on_delete=models.CASCADE, related_name='tasks')

    # Identification
    task_name = models.CharField(max_length=200, verbose_name="Nom de la tâche")
    task_type = models.CharField(max_length=20, choices=TASK_TYPES)
    description = models.TextField(blank=True)

    # Planification
    scheduled_start = models.DateTimeField(verbose_name="Début programmé")
    scheduled_end = models.DateTimeField(verbose_name="Fin programmée")
    actual_start = models.DateTimeField(null=True, blank=True)
    actual_end = models.DateTimeField(null=True, blank=True)

    # État et priorité
    status = models.CharField(max_length=20, choices=TASK_STATUS, default='PENDING')
    priority = models.CharField(max_length=10, choices=PRIORITY_LEVELS, default='MEDIUM')

    # Responsabilité
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    completed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='completed_tasks')

    # Dépendances
    depends_on = models.ManyToManyField('self', blank=True, symmetrical=False, related_name='dependent_tasks')

    # Paramètres et résultats
    task_parameters = JSONField(default=dict, verbose_name="Paramètres de la tâche")
    task_results = JSONField(default=dict, verbose_name="Résultats de la tâche")

    # Écritures générées
    generated_entries = models.ManyToManyField(JournalEntry, blank=True, related_name='closure_tasks')

    # Commentaires et validation
    comments = models.TextField(blank=True)
    rejection_reason = models.TextField(blank=True)

    class Meta:
        db_table = 'closure_tasks'
        indexes = [
            models.Index(fields=['closure_period', 'status']),
            models.Index(fields=['assigned_to', 'priority']),
            models.Index(fields=['scheduled_start', 'scheduled_end']),
        ]
        ordering = ['priority', 'scheduled_start']
        verbose_name = "Tâche de Clôture"
        verbose_name_plural = "Tâches de Clôture"


class AutomaticRegularization(TimeStampedModel):
    """
    Règles de régularisation automatique paramétrables
    """

    REGULARIZATION_TYPES = [
        ('ACCRUED_EXPENSES', 'Charges à Payer'),
        ('ACCRUED_INCOME', 'Produits à Recevoir'),
        ('PREPAID_EXPENSES', 'Charges Constatées d\'Avance'),
        ('DEFERRED_INCOME', 'Produits Constatés d\'Avance'),
        ('PROVISIONS_CLIENTS', 'Provisions Créances Clients'),
        ('PROVISIONS_STOCKS', 'Provisions Dépréciation Stocks'),
        ('DEPRECIATION', 'Amortissements'),
        ('CURRENCY_ADJUSTMENT', 'Ajustements de Change'),
    ]

    CALCULATION_METHODS = [
        ('PERCENTAGE', 'Pourcentage'),
        ('AMOUNT', 'Montant Fixe'),
        ('FORMULA', 'Formule Personnalisée'),
        ('HISTORICAL', 'Basé sur Historique'),
        ('SYSCOHADA_STANDARD', 'Barème SYSCOHADA'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='regularization_rules')

    # Identification
    rule_name = models.CharField(max_length=100, verbose_name="Nom de la règle")
    regularization_type = models.CharField(max_length=30, choices=REGULARIZATION_TYPES)
    is_active = models.BooleanField(default=True)

    # Conditions d'application
    applicable_periods = ArrayField(
        models.CharField(max_length=20),
        default=list,
        verbose_name="Périodes applicables"
    )
    account_filters = JSONField(default=dict, verbose_name="Filtres sur comptes")
    amount_threshold = models.DecimalField(
        max_digits=15, decimal_places=2, null=True, blank=True,
        verbose_name="Seuil de montant"
    )

    # Méthode de calcul
    calculation_method = models.CharField(max_length=20, choices=CALCULATION_METHODS)
    calculation_formula = models.TextField(blank=True, verbose_name="Formule de calcul")
    reference_accounts = ArrayField(
        models.CharField(max_length=20),
        default=list,
        verbose_name="Comptes de référence"
    )

    # Paramètres SYSCOHADA
    syscohada_rate = models.DecimalField(
        max_digits=8, decimal_places=4, null=True, blank=True,
        verbose_name="Taux SYSCOHADA"
    )
    syscohada_reference = models.CharField(max_length=100, blank=True)

    # Comptes comptables pour les écritures
    debit_account = models.ForeignKey(
        ChartOfAccounts, on_delete=models.PROTECT,
        related_name='regularizations_as_debit'
    )
    credit_account = models.ForeignKey(
        ChartOfAccounts, on_delete=models.PROTECT,
        related_name='regularizations_as_credit'
    )

    # Validation
    requires_approval = models.BooleanField(default=False)
    approval_threshold = models.DecimalField(
        max_digits=15, decimal_places=2, null=True, blank=True
    )

    # Usage et performance
    usage_count = models.PositiveIntegerField(default=0)
    last_execution = models.DateTimeField(null=True, blank=True)
    average_amount = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))

    class Meta:
        db_table = 'automatic_regularizations'
        unique_together = [('company', 'rule_name')]
        indexes = [
            models.Index(fields=['company', 'regularization_type', 'is_active']),
        ]
        verbose_name = "Règle de Régularisation"
        verbose_name_plural = "Règles de Régularisation"


class ClosureCalendar(TimeStampedModel):
    """
    Calendrier intelligent des clôtures avec gestion des échéances
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='closure_calendars')
    fiscal_year = models.ForeignKey(FiscalYear, on_delete=models.CASCADE)

    # Événement
    event_name = models.CharField(max_length=200)
    event_type = models.CharField(max_length=30, choices=[
        ('DEADLINE', 'Échéance'),
        ('MILESTONE', 'Jalon'),
        ('REMINDER', 'Rappel'),
        ('HOLIDAY', 'Jour Férié'),
        ('MEETING', 'Réunion'),
    ], default='DEADLINE')

    # Dates
    event_date = models.DateField()
    event_time = models.TimeField(null=True, blank=True)
    reminder_days_before = models.PositiveIntegerField(default=2)

    # Détails
    description = models.TextField(blank=True)
    location = models.CharField(max_length=200, blank=True)

    # Participants
    assigned_users = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True, related_name='closure_calendar_events')

    # Récurrence
    is_recurring = models.BooleanField(default=False)
    recurrence_pattern = JSONField(default=dict, verbose_name="Modèle de récurrence")

    # Notifications
    notification_sent = models.BooleanField(default=False)
    notification_date = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'closure_calendar'
        indexes = [
            models.Index(fields=['company', 'event_date']),
            models.Index(fields=['event_type', 'notification_sent']),
        ]
        ordering = ['event_date', 'event_time']
        verbose_name = "Événement Calendrier Clôture"
        verbose_name_plural = "Événements Calendrier Clôture"


class ValidationWorkflow(TimeStampedModel):
    """
    Workflow de validation multi-niveaux configurable
    """

    VALIDATION_LEVELS = [
        ('LEVEL_1', 'Niveau 1 - Saisie'),
        ('LEVEL_2', 'Niveau 2 - Contrôle'),
        ('LEVEL_3', 'Niveau 3 - Validation'),
        ('LEVEL_4', 'Niveau 4 - Approbation'),
        ('LEVEL_5', 'Niveau 5 - Signature'),
    ]

    ACTION_TYPES = [
        ('VALIDATE', 'Valider'),
        ('REJECT', 'Rejeter'),
        ('REQUEST_INFO', 'Demander Information'),
        ('DELEGATE', 'Déléguer'),
        ('ESCALATE', 'Escalader'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    closure_period = models.ForeignKey(ClosurePeriod, on_delete=models.CASCADE, related_name='validations')
    closure_task = models.ForeignKey(ClosureTask, on_delete=models.CASCADE, related_name='validations')

    # Niveau de validation
    validation_level = models.CharField(max_length=10, choices=VALIDATION_LEVELS)
    required_role = models.CharField(max_length=50, verbose_name="Rôle requis")

    # Utilisateur et action
    validator = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    action_taken = models.CharField(max_length=20, choices=ACTION_TYPES)
    validation_date = models.DateTimeField(auto_now_add=True)

    # Détails
    comments = models.TextField(blank=True)
    attached_documents = ArrayField(
        models.CharField(max_length=500),
        default=list,
        blank=True
    )

    # Signature électronique
    digital_signature = models.TextField(blank=True)
    signature_certificate = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    # Délégation
    delegated_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='delegated_validations'
    )
    delegation_reason = models.TextField(blank=True)

    class Meta:
        db_table = 'validation_workflow'
        indexes = [
            models.Index(fields=['closure_period', 'validation_level']),
            models.Index(fields=['validator', 'validation_date']),
        ]
        verbose_name = "Validation Workflow"
        verbose_name_plural = "Validations Workflow"


class ClosureControl(TimeStampedModel):
    """
    Contrôles automatiques et manuels de clôture
    """

    CONTROL_TYPES = [
        ('BALANCE_CHECK', 'Contrôle d\'Équilibre'),
        ('COHERENCE_CHECK', 'Contrôle de Cohérence'),
        ('COMPLETENESS_CHECK', 'Contrôle d\'Exhaustivité'),
        ('ACCURACY_CHECK', 'Contrôle de Précision'),
        ('RECONCILIATION_CHECK', 'Contrôle de Rapprochement'),
        ('SYSCOHADA_CHECK', 'Contrôle SYSCOHADA'),
        ('ANALYTICAL_CHECK', 'Contrôle Analytique'),
    ]

    SEVERITY_LEVELS = [
        ('INFO', 'Information'),
        ('WARNING', 'Avertissement'),
        ('ERROR', 'Erreur'),
        ('BLOCKING', 'Bloquant'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    closure_period = models.ForeignKey(ClosurePeriod, on_delete=models.CASCADE, related_name='controls')

    # Identification
    control_name = models.CharField(max_length=200)
    control_type = models.CharField(max_length=30, choices=CONTROL_TYPES)
    control_code = models.CharField(max_length=20, unique=True)

    # Configuration
    is_automatic = models.BooleanField(default=True)
    execution_order = models.PositiveIntegerField(default=100)
    is_mandatory = models.BooleanField(default=True)

    # Règles de contrôle
    control_sql = models.TextField(blank=True, verbose_name="Requête SQL de contrôle")
    expected_result = JSONField(default=dict, verbose_name="Résultat attendu")
    tolerance_threshold = models.DecimalField(
        max_digits=15, decimal_places=2, null=True, blank=True
    )

    # Exécution
    execution_date = models.DateTimeField(null=True, blank=True)
    executed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    execution_time_ms = models.PositiveIntegerField(default=0)

    # Résultats
    passed = models.BooleanField(default=False)
    severity_level = models.CharField(max_length=10, choices=SEVERITY_LEVELS, default='INFO')
    result_value = models.TextField(blank=True)
    error_message = models.TextField(blank=True)

    # Documentation
    syscohada_reference = models.CharField(max_length=200, blank=True)
    remediation_guide = models.TextField(blank=True)

    class Meta:
        db_table = 'closure_controls'
        indexes = [
            models.Index(fields=['closure_period', 'control_type']),
            models.Index(fields=['execution_order', 'is_mandatory']),
        ]
        ordering = ['execution_order']
        verbose_name = "Contrôle de Clôture"
        verbose_name_plural = "Contrôles de Clôture"


class ClosureAuditLog(TimeStampedModel):
    """
    Journal d'audit inaltérable pour traçabilité complète
    """

    ACTION_TYPES = [
        ('CREATE', 'Création'),
        ('UPDATE', 'Modification'),
        ('DELETE', 'Suppression'),
        ('VALIDATE', 'Validation'),
        ('APPROVE', 'Approbation'),
        ('REJECT', 'Rejet'),
        ('ARCHIVE', 'Archivage'),
        ('EXPORT', 'Export'),
        ('VIEW', 'Consultation'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    closure_period = models.ForeignKey(ClosurePeriod, on_delete=models.CASCADE, related_name='audit_logs')

    # Action
    action_type = models.CharField(max_length=20, choices=ACTION_TYPES)
    action_description = models.TextField()
    object_type = models.CharField(max_length=100)
    object_id = models.UUIDField()

    # Utilisateur et contexte
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField()
    session_id = models.CharField(max_length=100)

    # Données
    before_state = JSONField(null=True, blank=True)
    after_state = JSONField(null=True, blank=True)

    # Géolocalisation
    location_country = models.CharField(max_length=2, blank=True)
    location_city = models.CharField(max_length=100, blank=True)

    # Intégrité
    hash_signature = models.CharField(max_length=128, db_index=True)
    previous_hash = models.CharField(max_length=128, blank=True)

    # Conformité
    is_gdpr_compliant = models.BooleanField(default=True)
    retention_until = models.DateField()

    class Meta:
        db_table = 'closure_audit_logs'
        indexes = [
            models.Index(fields=['closure_period', '-created_at']),
            models.Index(fields=['user', 'action_type']),
            models.Index(fields=['object_type', 'object_id']),
            models.Index(fields=['hash_signature']),
        ]
        ordering = ['-created_at']
        verbose_name = "Log d'Audit Clôture"
        verbose_name_plural = "Logs d'Audit Clôture"


class ClosureArchive(TimeStampedModel):
    """
    Archivage sécurisé avec chiffrement et rétention légale
    """

    ARCHIVE_TYPES = [
        ('FULL_PERIOD', 'Période Complète'),
        ('FINANCIAL_STATEMENTS', 'États Financiers'),
        ('SUPPORTING_DOCUMENTS', 'Pièces Justificatives'),
        ('AUDIT_TRAIL', 'Piste d\'Audit'),
    ]

    ENCRYPTION_LEVELS = [
        ('AES_128', 'AES-128'),
        ('AES_256', 'AES-256'),
        ('RSA_2048', 'RSA-2048'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    closure_period = models.ForeignKey(ClosurePeriod, on_delete=models.CASCADE, related_name='archives')

    # Configuration archivage
    archive_type = models.CharField(max_length=30, choices=ARCHIVE_TYPES)
    archive_name = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    # Localisation
    storage_location = models.CharField(max_length=500)
    backup_location = models.CharField(max_length=500, blank=True)
    cloud_location = models.URLField(blank=True)

    # Sécurité
    encryption_level = models.CharField(max_length=10, choices=ENCRYPTION_LEVELS, default='AES_256')
    encryption_key_id = models.CharField(max_length=100, blank=True)
    checksum_md5 = models.CharField(max_length=32, blank=True)
    checksum_sha256 = models.CharField(max_length=64, blank=True)

    # Métadonnées
    file_size_bytes = models.PositiveBigIntegerField(default=0)
    compression_ratio = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0'))

    # Rétention
    retention_period_years = models.PositiveIntegerField(default=10)
    retention_until = models.DateField()
    auto_delete_enabled = models.BooleanField(default=False)

    # Accès
    access_count = models.PositiveIntegerField(default=0)
    last_accessed = models.DateTimeField(null=True, blank=True)
    last_accessed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)

    # Statut
    is_verified = models.BooleanField(default=False)
    verification_date = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'closure_archives'
        indexes = [
            models.Index(fields=['closure_period', 'archive_type']),
            models.Index(fields=['retention_until', 'auto_delete_enabled']),
        ]
        verbose_name = "Archive de Clôture"
        verbose_name_plural = "Archives de Clôture"


class ClosureNotification(TimeStampedModel):
    """
    Système de notifications avancé pour le processus de clôture
    """

    NOTIFICATION_TYPES = [
        ('DEADLINE_REMINDER', 'Rappel Échéance'),
        ('TASK_ASSIGNED', 'Tâche Assignée'),
        ('VALIDATION_REQUEST', 'Demande de Validation'),
        ('APPROVAL_REQUEST', 'Demande d\'Approbation'),
        ('CONTROL_FAILED', 'Contrôle Échoué'),
        ('CLOSURE_COMPLETED', 'Clôture Terminée'),
        ('ESCALATION', 'Escalade'),
    ]

    CHANNELS = [
        ('EMAIL', 'Email'),
        ('SMS', 'SMS'),
        ('PUSH', 'Notification Push'),
        ('TEAMS', 'Microsoft Teams'),
        ('SLACK', 'Slack'),
        ('WEBHOOK', 'Webhook'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    closure_period = models.ForeignKey(ClosurePeriod, on_delete=models.CASCADE, related_name='notifications')

    # Configuration
    notification_type = models.CharField(max_length=30, choices=NOTIFICATION_TYPES)
    channel = models.CharField(max_length=20, choices=CHANNELS)
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

    # Contenu
    subject = models.CharField(max_length=200)
    message = models.TextField()
    priority = models.CharField(max_length=10, choices=[
        ('LOW', 'Basse'),
        ('NORMAL', 'Normale'),
        ('HIGH', 'Haute'),
        ('URGENT', 'Urgente'),
    ], default='NORMAL')

    # Planification
    scheduled_for = models.DateTimeField()
    sent_at = models.DateTimeField(null=True, blank=True)
    delivery_status = models.CharField(max_length=20, choices=[
        ('PENDING', 'En Attente'),
        ('SENT', 'Envoyé'),
        ('DELIVERED', 'Délivré'),
        ('FAILED', 'Échec'),
        ('READ', 'Lu'),
    ], default='PENDING')

    # Interaction
    read_at = models.DateTimeField(null=True, blank=True)
    action_taken = models.BooleanField(default=False)
    response_data = JSONField(default=dict)

    # Tentatives
    retry_count = models.PositiveIntegerField(default=0)
    max_retries = models.PositiveIntegerField(default=3)

    class Meta:
        db_table = 'closure_notifications'
        indexes = [
            models.Index(fields=['closure_period', 'notification_type']),
            models.Index(fields=['recipient', 'delivery_status']),
            models.Index(fields=['scheduled_for', 'sent_at']),
        ]
        verbose_name = "Notification de Clôture"
        verbose_name_plural = "Notifications de Clôture"