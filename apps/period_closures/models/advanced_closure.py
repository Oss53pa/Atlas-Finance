"""
Modèles Avancés pour Module Clôture Automatisée WiseBook
Gestion complète du cycle de clôture avec workflow BPMN et conformité SYSCOHADA
"""
from django.db import models
from django.contrib.postgres.fields import JSONField, ArrayField
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from decimal import Decimal
import uuid
from datetime import datetime, timedelta
from enum import Enum

from apps.core.models import TimeStampedModel
from apps.accounting.models import Company, FiscalYear, ChartOfAccounts


class ClosureType(models.TextChoices):
    """Types de clôture supportés"""
    DAILY = 'daily', 'Clôture Journalière'
    MONTHLY = 'monthly', 'Clôture Mensuelle'
    QUARTERLY = 'quarterly', 'Clôture Trimestrielle'
    SEMI_ANNUAL = 'semi_annual', 'Clôture Semestrielle'
    ANNUAL = 'annual', 'Clôture Annuelle'
    PROJECT = 'project', 'Clôture de Projet'
    ACQUISITION = 'acquisition', 'Clôture d\'Acquisition/Cession'


class WorkflowStepCategory(models.TextChoices):
    """Catégories d'étapes de workflow"""
    PREPARATION = 'preparation', 'Préparation'
    PROVISIONS = 'provisions', 'Provisions'
    DEPRECIATION = 'depreciation', 'Amortissements'
    REGULARIZATION = 'regularization', 'Régularisations'
    FINANCIAL_STATEMENTS = 'financial_statements', 'États Financiers'
    VALIDATION = 'validation', 'Validation'
    ARCHIVING = 'archiving', 'Archivage'


class ClosureStatus(models.TextChoices):
    """États d'une clôture"""
    OPEN = 'open', 'Ouverte'
    IN_PROGRESS = 'in_progress', 'En Cours'
    PENDING_APPROVAL = 'pending_approval', 'En Attente d\'Approbation'
    APPROVED = 'approved', 'Approuvée'
    CLOSED = 'closed', 'Clôturée'
    LOCKED = 'locked', 'Verrouillée'
    ERROR = 'error', 'Erreur'


class AdvancedFiscalPeriod(TimeStampedModel):
    """
    Gestionnaire d'Exercices Comptables Avancé
    Gestion multi-sociétés avec dépendances et verrouillage granulaire
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='advanced_periods')

    # Identification
    name = models.CharField(max_length=100, verbose_name="Nom de la période")
    code = models.CharField(max_length=20, verbose_name="Code période")
    closure_type = models.CharField(max_length=20, choices=ClosureType.choices)

    # Dates et délais
    period_start = models.DateField(verbose_name="Début de période")
    period_end = models.DateField(verbose_name="Fin de période")
    closure_deadline = models.DateTimeField(verbose_name="Échéance de clôture")
    legal_deadline = models.DateTimeField(verbose_name="Échéance légale")

    # Exercice de rattachement
    fiscal_year = models.ForeignKey(FiscalYear, on_delete=models.CASCADE, related_name='closure_periods')
    parent_period = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, verbose_name="Période parent")

    # État et progression
    status = models.CharField(max_length=20, choices=ClosureStatus.choices, default=ClosureStatus.OPEN)
    completion_percentage = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('0'),
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('100'))]
    )

    # Conformité SYSCOHADA
    syscohada_compliance_score = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('0'),
        verbose_name="Score conformité SYSCOHADA (%)"
    )
    legal_requirements_met = models.BooleanField(default=False)
    audit_trail_complete = models.BooleanField(default=False)

    # Workflow et orchestration
    workflow_template = models.ForeignKey('WorkflowTemplate', on_delete=models.PROTECT, related_name='periods')
    current_step = models.ForeignKey('WorkflowStep', on_delete=models.SET_NULL, null=True, blank=True)

    # Responsabilités
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name='created_closures')
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Responsable")
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Approuvé par")
    locked_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Verrouillé par")

    # Dates importantes
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    locked_at = models.DateTimeField(null=True, blank=True)

    # Métriques et performance
    estimated_duration_hours = models.PositiveIntegerField(default=0)
    actual_duration_minutes = models.PositiveIntegerField(null=True, blank=True)
    entries_created = models.PositiveIntegerField(default=0)
    controls_passed = models.PositiveIntegerField(default=0)
    controls_failed = models.PositiveIntegerField(default=0)

    # Configuration régionale
    region = models.CharField(max_length=10, choices=[
        ('CEMAC', 'CEMAC'),
        ('UEMOA', 'UEMOA'),
    ], default='CEMAC')
    business_sector = models.CharField(max_length=20, choices=[
        ('COMMERCIAL', 'Commercial'),
        ('INDUSTRIAL', 'Industriel'),
        ('SERVICES', 'Services'),
        ('BANKING', 'Bancaire'),
        ('INSURANCE', 'Assurance'),
    ], default='COMMERCIAL')

    # Archivage et rétention
    retention_until = models.DateField(verbose_name="Conservation jusqu'au")
    archived = models.BooleanField(default=False)
    archive_location = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = 'advanced_fiscal_periods'
        unique_together = [('company', 'code', 'fiscal_year')]
        indexes = [
            models.Index(fields=['company', 'status', '-closure_deadline']),
            models.Index(fields=['fiscal_year', 'closure_type']),
            models.Index(fields=['assigned_to', 'status']),
        ]
        ordering = ['-closure_deadline']
        verbose_name = "Période de Clôture Avancée"
        verbose_name_plural = "Périodes de Clôture Avancées"

    def __str__(self):
        return f"{self.company.name} - {self.name} ({self.get_closure_type_display()})"


class WorkflowTemplate(TimeStampedModel):
    """
    Templates de workflow de clôture personnalisables
    Designer graphique BPMN 2.0 intégré
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='workflow_templates')

    # Identification
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    version = models.CharField(max_length=10, default='1.0')

    # Types applicables
    applicable_closure_types = ArrayField(
        models.CharField(max_length=20),
        default=list,
        verbose_name="Types de clôture applicables"
    )

    # Configuration BPMN
    bpmn_diagram = models.JSONField(verbose_name="Diagramme BPMN 2.0")
    workflow_definition = models.JSONField(verbose_name="Définition workflow")

    # Paramètres
    estimated_total_duration = models.PositiveIntegerField(verbose_name="Durée estimée (minutes)")
    required_roles = ArrayField(models.CharField(max_length=50), default=list)
    sla_hours = models.PositiveIntegerField(default=72, verbose_name="SLA en heures")

    # Conformité
    syscohada_certified = models.BooleanField(default=False)
    last_compliance_check = models.DateTimeField(null=True, blank=True)

    # Utilisation
    usage_count = models.PositiveIntegerField(default=0)
    success_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0'))

    # Versioning
    is_active = models.BooleanField(default=True)
    parent_template = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        db_table = 'workflow_templates'
        unique_together = [('company', 'name', 'version')]
        indexes = [
            models.Index(fields=['company', 'is_active']),
            models.Index(fields=['applicable_closure_types']),
        ]
        verbose_name = "Template de Workflow"
        verbose_name_plural = "Templates de Workflow"


class WorkflowStep(TimeStampedModel):
    """
    Étapes de workflow avec conditions dynamiques
    Gestion des dépendances et escalades automatiques
    """

    STEP_TYPES = [
        ('AUTOMATIC', 'Automatique'),
        ('MANUAL', 'Manuel'),
        ('APPROVAL', 'Approbation'),
        ('VALIDATION', 'Validation'),
        ('CALCULATION', 'Calcul'),
        ('CONTROL', 'Contrôle'),
        ('NOTIFICATION', 'Notification'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    closure_period = models.ForeignKey(AdvancedFiscalPeriod, on_delete=models.CASCADE, related_name='workflow_steps')
    template_step = models.ForeignKey('WorkflowStepTemplate', on_delete=models.PROTECT)

    # Exécution
    status = models.CharField(max_length=20, choices=[
        ('PENDING', 'En Attente'),
        ('IN_PROGRESS', 'En Cours'),
        ('COMPLETED', 'Terminé'),
        ('FAILED', 'Échoué'),
        ('SKIPPED', 'Ignoré'),
        ('REQUIRES_APPROVAL', 'Nécessite Approbation'),
    ], default='PENDING')

    # Responsabilité
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    executed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='executed_steps')

    # Timing
    scheduled_start = models.DateTimeField(null=True, blank=True)
    actual_start = models.DateTimeField(null=True, blank=True)
    actual_end = models.DateTimeField(null=True, blank=True)
    duration_minutes = models.PositiveIntegerField(null=True, blank=True)

    # Résultats
    result_data = models.JSONField(default=dict)
    entries_created = models.PositiveIntegerField(default=0)
    controls_passed = models.PositiveIntegerField(default=0)
    controls_failed = models.PositiveIntegerField(default=0)

    # Messages et logs
    execution_log = models.TextField(blank=True)
    error_message = models.TextField(blank=True)
    user_comments = models.TextField(blank=True)

    class Meta:
        db_table = 'workflow_steps'
        unique_together = [('closure_period', 'template_step')]
        indexes = [
            models.Index(fields=['closure_period', 'status']),
            models.Index(fields=['assigned_to', 'status']),
            models.Index(fields=['scheduled_start']),
        ]
        ordering = ['template_step__order']
        verbose_name = "Étape de Workflow"
        verbose_name_plural = "Étapes de Workflow"


class WorkflowStepTemplate(TimeStampedModel):
    """
    Templates d'étapes de workflow réutilisables
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workflow_template = models.ForeignKey(WorkflowTemplate, on_delete=models.CASCADE, related_name='step_templates')

    # Identification
    name = models.CharField(max_length=100)
    description = models.TextField()
    category = models.CharField(max_length=20, choices=WorkflowStepCategory.choices)
    step_type = models.CharField(max_length=20, choices=WorkflowStep.STEP_TYPES)

    # Ordre et dépendances
    order = models.PositiveIntegerField()
    dependencies = ArrayField(models.UUIDField(), default=list, blank=True)

    # Configuration
    is_mandatory = models.BooleanField(default=True)
    is_syscohada_required = models.BooleanField(default=False)
    estimated_duration_minutes = models.PositiveIntegerField(default=5)

    # Automatisation
    automation_script = models.TextField(blank=True, verbose_name="Script d'automatisation")
    auto_executable = models.BooleanField(default=False)
    requires_approval = models.BooleanField(default=False)
    approval_roles = ArrayField(models.CharField(max_length=50), default=list, blank=True)

    # Conditions dynamiques
    execution_conditions = models.JSONField(default=dict, verbose_name="Conditions d'exécution")
    escalation_rules = models.JSONField(default=dict, verbose_name="Règles d'escalade")

    # Documentation
    syscohada_reference = models.CharField(max_length=200, blank=True)
    documentation_url = models.URLField(blank=True)

    class Meta:
        db_table = 'workflow_step_templates'
        unique_together = [('workflow_template', 'order')]
        indexes = [
            models.Index(fields=['workflow_template', 'order']),
            models.Index(fields=['category', 'is_mandatory']),
        ]
        ordering = ['order']
        verbose_name = "Template d'Étape de Workflow"
        verbose_name_plural = "Templates d'Étapes de Workflow"


class RegularizationCenter(TimeStampedModel):
    """
    Centre de Régularisation Automatique
    Gestion des opérations de fin de période
    """

    REGULARIZATION_TYPES = [
        ('ACCRUED_EXPENSES', 'Charges à Payer'),
        ('ACCRUED_INCOME', 'Produits à Recevoir'),
        ('PREPAID_EXPENSES', 'Charges Constatées d\'Avance'),
        ('DEFERRED_INCOME', 'Produits Constatés d\'Avance'),
        ('CUTOFF_ADJUSTMENTS', 'Ajustements de Cut-off'),
        ('CURRENCY_ADJUSTMENTS', 'Ajustements de Change'),
        ('INTER_COMPANY', 'Éliminations Intra-Groupe'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    closure_period = models.ForeignKey(AdvancedFiscalPeriod, on_delete=models.CASCADE, related_name='regularizations')

    # Type et classification
    regularization_type = models.CharField(max_length=30, choices=REGULARIZATION_TYPES)
    account_class = models.CharField(max_length=1, verbose_name="Classe de compte concernée")

    # Calcul automatique
    calculation_method = models.CharField(max_length=50, verbose_name="Méthode de calcul")
    calculation_formula = models.TextField(verbose_name="Formule de calcul")
    base_amount = models.DecimalField(max_digits=20, decimal_places=2, default=Decimal('0'))
    calculated_amount = models.DecimalField(max_digits=20, decimal_places=2, default=Decimal('0'))

    # Comparaison historique
    previous_period_amount = models.DecimalField(max_digits=20, decimal_places=2, null=True, blank=True)
    variance_amount = models.DecimalField(max_digits=20, decimal_places=2, default=Decimal('0'))
    variance_percentage = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal('0'))

    # Justification et documentation
    justification = models.TextField(verbose_name="Justification de la régularisation")
    supporting_documents = ArrayField(models.CharField(max_length=255), default=list, blank=True)
    reviewer_notes = models.TextField(blank=True)

    # Validation
    is_validated = models.BooleanField(default=False)
    validated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='validated_regularizations')
    validation_date = models.DateTimeField(null=True, blank=True)

    # Écritures générées
    accounting_entries = models.ManyToManyField('accounting.AccountingEntry', blank=True)
    reversal_entries = models.ManyToManyField('accounting.AccountingEntry', blank=True, related_name='reversed_regularizations')

    class Meta:
        db_table = 'regularization_center'
        unique_together = [('closure_period', 'regularization_type', 'account_class')]
        indexes = [
            models.Index(fields=['closure_period', 'regularization_type']),
            models.Index(fields=['is_validated', 'validation_date']),
        ]
        verbose_name = "Régularisation de Clôture"
        verbose_name_plural = "Régularisations de Clôture"


class AdvancedProvisionEngine(TimeStampedModel):
    """
    Moteur de Provisions Avancé avec méthodes paramétrables
    """

    CALCULATION_METHODS = [
        ('STATISTICAL', 'Statistique (taux historiques)'),
        ('INDIVIDUAL', 'Individuelle (dossier par dossier)'),
        ('FLAT_RATE', 'Forfaitaire (pourcentages)'),
        ('AGING_ANALYSIS', 'Analyse par ancienneté'),
        ('ML_PREDICTION', 'Prédiction Machine Learning'),
    ]

    PROVISION_TYPES = [
        ('BAD_DEBT', 'Créances Douteuses'),
        ('INVENTORY_OBSOLESCENCE', 'Dépréciation Stocks'),
        ('WARRANTY', 'Garanties'),
        ('LITIGATION', 'Litiges'),
        ('RESTRUCTURING', 'Restructuration'),
        ('TAX_CONTINGENCY', 'Contingences Fiscales'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    closure_period = models.ForeignKey(AdvancedFiscalPeriod, on_delete=models.CASCADE, related_name='provisions')

    # Configuration
    provision_type = models.CharField(max_length=30, choices=PROVISION_TYPES)
    calculation_method = models.CharField(max_length=20, choices=CALCULATION_METHODS)

    # Paramètres de calcul
    calculation_parameters = models.JSONField(default=dict)
    historical_data_periods = models.PositiveIntegerField(default=12, verbose_name="Périodes d'historique")

    # Montants et calculs
    base_amount = models.DecimalField(max_digits=20, decimal_places=2, default=Decimal('0'))
    provision_rate = models.DecimalField(max_digits=8, decimal_places=4, default=Decimal('0'))
    calculated_provision = models.DecimalField(max_digits=20, decimal_places=2, default=Decimal('0'))
    manual_adjustment = models.DecimalField(max_digits=20, decimal_places=2, default=Decimal('0'))
    final_provision = models.DecimalField(max_digits=20, decimal_places=2, default=Decimal('0'))

    # Analyse et justification
    sensitivity_analysis = models.JSONField(default=dict)
    risk_assessment = models.TextField()
    documentation = models.TextField()

    # Suivi des mouvements
    opening_balance = models.DecimalField(max_digits=20, decimal_places=2, default=Decimal('0'))
    additions = models.DecimalField(max_digits=20, decimal_places=2, default=Decimal('0'))
    reversals = models.DecimalField(max_digits=20, decimal_places=2, default=Decimal('0'))
    utilizations = models.DecimalField(max_digits=20, decimal_places=2, default=Decimal('0'))
    closing_balance = models.DecimalField(max_digits=20, decimal_places=2, default=Decimal('0'))

    # Validation et approbation
    is_validated = models.BooleanField(default=False)
    validated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    validation_date = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'advanced_provision_engine'
        unique_together = [('closure_period', 'provision_type')]
        indexes = [
            models.Index(fields=['closure_period', 'provision_type']),
            models.Index(fields=['calculation_method', 'is_validated']),
        ]
        verbose_name = "Moteur de Provisions"
        verbose_name_plural = "Moteurs de Provisions"


class ClosureControlFramework(TimeStampedModel):
    """
    Framework de Contrôles de Clôture
    200+ contrôles prédéfinis avec règles métier
    """

    CONTROL_TYPES = [
        ('BALANCE_CHECK', 'Contrôle d\'Équilibre'),
        ('LEGAL_CHECK', 'Contrôle Légal'),
        ('SYSCOHADA_CHECK', 'Contrôle SYSCOHADA'),
        ('COMPLETENESS_CHECK', 'Contrôle d\'Exhaustivité'),
        ('ACCURACY_CHECK', 'Contrôle de Précision'),
        ('CUTOFF_CHECK', 'Contrôle de Cut-off'),
        ('ANALYTICAL_CHECK', 'Contrôle Analytique'),
    ]

    SEVERITY_LEVELS = [
        ('INFO', 'Information'),
        ('WARNING', 'Avertissement'),
        ('ERROR', 'Erreur'),
        ('BLOCKING', 'Bloquant'),
        ('CRITICAL', 'Critique'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='closure_controls')

    # Identification
    name = models.CharField(max_length=100)
    description = models.TextField()
    control_type = models.CharField(max_length=20, choices=CONTROL_TYPES)
    control_code = models.CharField(max_length=20, unique=True)

    # Configuration
    applicable_closure_types = ArrayField(models.CharField(max_length=20), default=list)
    execution_order = models.PositiveIntegerField(default=100)

    # Règles métier
    business_rules = models.JSONField(verbose_name="Règles métier (no-code)")
    sql_query = models.TextField(blank=True, verbose_name="Requête SQL de contrôle")
    expected_result = models.JSONField(default=dict)

    # Seuils et paramètres
    severity_level = models.CharField(max_length=10, choices=SEVERITY_LEVELS, default='WARNING')
    tolerance_threshold = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    is_auto_correctable = models.BooleanField(default=False)
    correction_script = models.TextField(blank=True)

    # Machine Learning
    ml_enabled = models.BooleanField(default=False)
    anomaly_detection_model = models.CharField(max_length=50, blank=True)
    prediction_accuracy = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)

    # Documentation
    syscohada_reference = models.CharField(max_length=200, blank=True)
    remediation_guide = models.TextField(blank=True)

    # Performance
    average_execution_time_ms = models.PositiveIntegerField(default=0)
    success_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('100'))

    class Meta:
        db_table = 'closure_control_framework'
        indexes = [
            models.Index(fields=['company', 'control_type']),
            models.Index(fields=['severity_level', 'execution_order']),
        ]
        verbose_name = "Framework de Contrôle"
        verbose_name_plural = "Frameworks de Contrôle"


class ClosureControlExecution(TimeStampedModel):
    """
    Exécution des contrôles avec résultats détaillés
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workflow_step = models.ForeignKey(WorkflowStep, on_delete=models.CASCADE, related_name='control_executions')
    control_framework = models.ForeignKey(ClosureControlFramework, on_delete=models.PROTECT)

    # Exécution
    execution_date = models.DateTimeField(auto_now_add=True)
    execution_time_ms = models.PositiveIntegerField(default=0)
    executed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    # Résultats
    passed = models.BooleanField(default=False)
    result_value = models.DecimalField(max_digits=20, decimal_places=2, null=True, blank=True)
    expected_value = models.DecimalField(max_digits=20, decimal_places=2, null=True, blank=True)
    variance = models.DecimalField(max_digits=20, decimal_places=2, null=True, blank=True)

    # Détails
    result_details = models.JSONField(default=dict)
    error_details = models.TextField(blank=True)
    recommendations = models.TextField(blank=True)

    # Actions correctives
    correction_applied = models.BooleanField(default=False)
    correction_details = models.TextField(blank=True)
    corrected_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='applied_corrections')

    class Meta:
        db_table = 'closure_control_executions'
        indexes = [
            models.Index(fields=['workflow_step', 'execution_date']),
            models.Index(fields=['control_framework', 'passed']),
        ]
        verbose_name = "Exécution de Contrôle"
        verbose_name_plural = "Exécutions de Contrôles"


class FinancialStatementsGenerator(TimeStampedModel):
    """
    Générateur d'États Financiers SYSCOHADA Automatisé
    """

    STATEMENT_TYPES = [
        ('BALANCE_SHEET', 'Bilan (Actif/Passif)'),
        ('INCOME_STATEMENT', 'Compte de Résultat'),
        ('CASH_FLOW', 'TAFIRE'),
        ('NOTES', 'État Annexé'),
        ('DIRECTORS_REPORT', 'Rapport de Gestion'),
        ('CONSOLIDATED', 'Comptes Consolidés'),
    ]

    SYSCOHADA_FORMATS = [
        ('SYSTEM_NORMAL', 'Système Normal'),
        ('SYSTEM_ALLEGE', 'Système Allégé'),
        ('SYSTEM_MINIMAL', 'Système Minimal'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    closure_period = models.ForeignKey(AdvancedFiscalPeriod, on_delete=models.CASCADE, related_name='generated_statements')

    # Configuration
    statement_type = models.CharField(max_length=20, choices=STATEMENT_TYPES)
    syscohada_format = models.CharField(max_length=20, choices=SYSCOHADA_FORMATS, default='SYSTEM_NORMAL')
    generation_template = models.ForeignKey('StatementTemplate', on_delete=models.PROTECT)

    # Génération
    generation_date = models.DateTimeField(auto_now_add=True)
    generated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    generation_duration_ms = models.PositiveIntegerField(default=0)

    # Contenu
    statement_data = models.JSONField(verbose_name="Données de l'état")
    statement_html = models.TextField(verbose_name="Rendu HTML")
    statement_pdf_path = models.CharField(max_length=500, blank=True)

    # Validation
    is_validated = models.BooleanField(default=False)
    validated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='validated_statements')
    validation_date = models.DateTimeField(null=True, blank=True)

    # Signature électronique
    is_signed = models.BooleanField(default=False)
    digital_signature = models.TextField(blank=True)
    signature_certificate = models.TextField(blank=True)

    # Archivage
    archived = models.BooleanField(default=False)
    archive_path = models.CharField(max_length=500, blank=True)
    retention_until = models.DateField()

    class Meta:
        db_table = 'financial_statements_generator'
        unique_together = [('closure_period', 'statement_type', 'syscohada_format')]
        indexes = [
            models.Index(fields=['closure_period', 'statement_type']),
            models.Index(fields=['is_validated', 'is_signed']),
        ]
        verbose_name = "Générateur d'États Financiers"
        verbose_name_plural = "Générateurs d'États Financiers"


class StatementTemplate(TimeStampedModel):
    """
    Templates d'états financiers personnalisables
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='statement_templates')

    # Identification
    name = models.CharField(max_length=100)
    statement_type = models.CharField(max_length=20, choices=FinancialStatementsGenerator.STATEMENT_TYPES)
    version = models.CharField(max_length=10, default='1.0')

    # Configuration
    template_structure = models.JSONField(verbose_name="Structure du template")
    calculation_formulas = models.JSONField(default=dict)
    formatting_rules = models.JSONField(default=dict)

    # Conformité
    syscohada_compliant = models.BooleanField(default=True)
    last_compliance_check = models.DateTimeField(null=True, blank=True)

    # Usage
    is_default = models.BooleanField(default=False)
    usage_count = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'statement_templates'
        unique_together = [('company', 'name', 'version')]
        verbose_name = "Template d'État Financier"
        verbose_name_plural = "Templates d'États Financiers"


class ClosureAuditTrail(TimeStampedModel):
    """
    Piste d'audit complète pour conformité
    """

    ACTION_TYPES = [
        ('STEP_START', 'Début d\'étape'),
        ('STEP_COMPLETE', 'Fin d\'étape'),
        ('CONTROL_EXECUTE', 'Exécution contrôle'),
        ('VALIDATION', 'Validation'),
        ('APPROVAL', 'Approbation'),
        ('CORRECTION', 'Correction'),
        ('LOCK', 'Verrouillage'),
        ('UNLOCK', 'Déverrouillage'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    closure_period = models.ForeignKey(AdvancedFiscalPeriod, on_delete=models.CASCADE, related_name='audit_trail')

    # Action
    action_type = models.CharField(max_length=20, choices=ACTION_TYPES)
    action_description = models.TextField()
    object_type = models.CharField(max_length=50)  # Type d'objet modifié
    object_id = models.UUIDField()  # ID de l'objet modifié

    # Utilisateur et contexte
    user = models.ForeignKey(User, on_delete=models.PROTECT)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField()
    session_id = models.CharField(max_length=64)

    # Données
    before_state = models.JSONField(null=True, blank=True)
    after_state = models.JSONField(null=True, blank=True)
    changes_summary = models.TextField(blank=True)

    # Hash d'intégrité
    integrity_hash = models.CharField(max_length=64, db_index=True)

    class Meta:
        db_table = 'closure_audit_trail'
        indexes = [
            models.Index(fields=['closure_period', '-created_at']),
            models.Index(fields=['user', 'action_type']),
            models.Index(fields=['object_type', 'object_id']),
        ]
        verbose_name = "Piste d'Audit de Clôture"
        verbose_name_plural = "Pistes d'Audit de Clôture"


class ClosureNotification(TimeStampedModel):
    """
    Système de notifications avancé
    """

    NOTIFICATION_TYPES = [
        ('DEADLINE_WARNING', 'Alerte Échéance'),
        ('STEP_COMPLETION', 'Étape Terminée'),
        ('APPROVAL_REQUEST', 'Demande d\'Approbation'),
        ('ERROR_ALERT', 'Alerte Erreur'),
        ('ESCALATION', 'Escalade'),
        ('REMINDER', 'Rappel'),
    ]

    CHANNELS = [
        ('EMAIL', 'Email'),
        ('SMS', 'SMS'),
        ('PUSH', 'Notification Push'),
        ('SLACK', 'Slack'),
        ('TEAMS', 'Microsoft Teams'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    closure_period = models.ForeignKey(AdvancedFiscalPeriod, on_delete=models.CASCADE, related_name='notifications')

    # Configuration
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    recipient = models.ForeignKey(User, on_delete=models.CASCADE)
    channel = models.CharField(max_length=10, choices=CHANNELS, default='EMAIL')

    # Contenu
    title = models.CharField(max_length=200)
    message = models.TextField()
    priority = models.CharField(max_length=10, choices=[
        ('LOW', 'Basse'),
        ('MEDIUM', 'Moyenne'),
        ('HIGH', 'Haute'),
        ('URGENT', 'Urgente'),
    ], default='MEDIUM')

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
    action_details = models.TextField(blank=True)

    class Meta:
        db_table = 'closure_notifications'
        indexes = [
            models.Index(fields=['closure_period', 'notification_type']),
            models.Index(fields=['recipient', 'delivery_status']),
            models.Index(fields=['scheduled_for', 'sent_at']),
        ]
        verbose_name = "Notification de Clôture"
        verbose_name_plural = "Notifications de Clôture"