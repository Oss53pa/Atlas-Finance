"""
Module Budget WiseBook - Modèles de données
Gestion budgétaire intelligente avec IA et analyse prédictive
Conforme au cahier des charges complet
"""
from django.db import models
from django.contrib.auth.models import User
from django.contrib.postgres.fields import JSONField, ArrayField
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal
import uuid
from datetime import datetime, date

from apps.core.models import TimeStampedModel
from apps.accounting.models import Company, FiscalYear, ChartOfAccounts


class BudgetPlan(TimeStampedModel):
    """
    Plan budgétaire principal - Exercice fiscal
    Structure hiérarchique fondamentale selon cahier des charges
    """

    STATUS_CHOICES = [
        ('DRAFT', 'Brouillon'),
        ('IN_PROGRESS', 'En cours de saisie'),
        ('SUBMITTED', 'Soumis validation'),
        ('APPROVED', 'Approuvé'),
        ('LOCKED', 'Verrouillé'),
        ('CLOSED', 'Clôturé'),
    ]

    VERSION_TYPE_CHOICES = [
        ('INITIAL', 'Budget initial'),
        ('REVISED', 'Budget révisé'),
        ('FORECAST', 'Prévisions'),
        ('ACTUAL', 'Réalisé'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='budget_plans')
    fiscal_year = models.ForeignKey(FiscalYear, on_delete=models.CASCADE, related_name='budget_plans')

    # Identification
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    version = models.CharField(max_length=10, default='1.0')
    version_type = models.CharField(max_length=20, choices=VERSION_TYPE_CHOICES, default='INITIAL')

    # Période
    start_date = models.DateField()
    end_date = models.DateField()

    # Statut et workflow
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')

    # Responsables
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='budget_plans_created')
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='budget_plans_approved')
    locked_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='budget_plans_locked')

    # Dates importantes
    approval_date = models.DateTimeField(null=True, blank=True)
    lock_date = models.DateTimeField(null=True, blank=True)

    # Configuration IA
    use_ai_predictions = models.BooleanField(default=True)
    prediction_model = models.CharField(max_length=50, default='ARIMA')
    confidence_threshold = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('80.00'))

    # Métadonnées
    currency = models.CharField(max_length=3, default='EUR')
    template_used = models.CharField(max_length=100, blank=True)

    class Meta:
        db_table = 'budget_plans'
        unique_together = [('company', 'fiscal_year', 'version')]
        ordering = ['-created_at']
        verbose_name = 'Plan Budgétaire'
        verbose_name_plural = 'Plans Budgétaires'

    def __str__(self):
        return f"{self.name} - {self.fiscal_year.name} v{self.version}"


class BudgetDepartment(TimeStampedModel):
    """
    Départements pour structure budgétaire
    Dimension organisationnelle selon cahier des charges
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='budget_departments')

    # Identification
    code = models.CharField(max_length=20)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    # Hiérarchie
    parent_department = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='sub_departments'
    )
    level = models.IntegerField(default=1)

    # Responsables
    manager = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='managed_departments'
    )
    budget_responsible = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='budget_departments'
    )

    # Configuration
    is_active = models.BooleanField(default=True)
    is_cost_center = models.BooleanField(default=True)
    is_profit_center = models.BooleanField(default=False)

    # Centres de coûts/profit
    cost_center_code = models.CharField(max_length=20, blank=True)
    profit_center_code = models.CharField(max_length=20, blank=True)

    class Meta:
        db_table = 'budget_departments'
        unique_together = [('company', 'code')]
        ordering = ['level', 'code']
        verbose_name = 'Département Budgétaire'
        verbose_name_plural = 'Départements Budgétaires'

    def __str__(self):
        return f"{self.code} - {self.name}"


class BudgetLine(TimeStampedModel):
    """
    Ligne budgétaire détaillée - Cœur du système
    Structure multi-dimensionnelle selon cahier des charges
    """

    CATEGORY_CHOICES = [
        ('REVENUE', 'Revenus'),
        ('CHARGES', 'Charges'),
        ('INVESTMENT', 'Investissements'),
        ('FINANCING', 'Financement'),
    ]

    ENTRY_METHOD_CHOICES = [
        ('MANUAL', 'Saisie manuelle'),
        ('IMPORT', 'Import Excel/CSV'),
        ('AI_PREDICTION', 'Prédiction IA'),
        ('TEMPLATE', 'Template'),
        ('COPY_PREVIOUS', 'Copie période précédente'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    budget_plan = models.ForeignKey(BudgetPlan, on_delete=models.CASCADE, related_name='budget_lines')
    department = models.ForeignKey(BudgetDepartment, on_delete=models.CASCADE, related_name='budget_lines')
    account = models.ForeignKey(ChartOfAccounts, on_delete=models.CASCADE, related_name='budget_lines')

    # Période
    fiscal_year = models.IntegerField()
    month = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(12)])

    # Classification
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    subcategory = models.CharField(max_length=100, blank=True)

    # Montants principaux
    budget_initial = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    budget_revised = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    actual = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    committed = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    available = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))

    # Comparaisons historiques
    last_year_budget = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    last_year_actual = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))

    # Prévisions IA
    forecast_amount = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    forecast_method = models.CharField(max_length=50, blank=True)
    confidence_score = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))

    # Métadonnées de saisie
    entry_method = models.CharField(max_length=20, choices=ENTRY_METHOD_CHOICES, default='MANUAL')
    entry_source = models.CharField(max_length=100, blank=True)

    # Commentaires et justifications
    comments = models.TextField(blank=True)
    justification = models.TextField(blank=True)

    # Détails analytiques
    analytical_dimensions = JSONField(
        default=dict,
        help_text="Ventilation par projets, produits, zones géographiques"
    )

    # Versioning et audit
    version = models.CharField(max_length=10, default='1.0')
    previous_version = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='next_versions'
    )

    # Responsables
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='budget_lines_created')
    last_modified_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='budget_lines_modified')
    validated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='budget_lines_validated')

    # Dates de gestion
    validation_date = models.DateTimeField(null=True, blank=True)
    lock_date = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'budget_lines'
        unique_together = [('budget_plan', 'department', 'account', 'month')]
        ordering = ['fiscal_year', 'month', 'department__code', 'account__code']
        verbose_name = 'Ligne Budgétaire'
        verbose_name_plural = 'Lignes Budgétaires'
        indexes = [
            models.Index(fields=['fiscal_year', 'month']),
            models.Index(fields=['department', 'account']),
            models.Index(fields=['budget_plan', 'category']),
        ]

    def save(self, *args, **kwargs):
        # Calcul automatique du disponible
        self.available = self.budget_revised - self.actual - self.committed

        # Mise à jour version si modification
        if self.pk and self.tracker.has_changed('budget_revised'):
            self.version = self._increment_version()

        super().save(*args, **kwargs)

    def _increment_version(self) -> str:
        """Incrémente automatiquement la version"""
        try:
            major, minor = self.version.split('.')
            return f"{major}.{int(minor) + 1}"
        except:
            return "1.1"

    @property
    def variance_amount(self) -> Decimal:
        """Écart en montant vs budget"""
        return self.actual - self.budget_revised

    @property
    def variance_percent(self) -> Decimal:
        """Écart en pourcentage vs budget"""
        if self.budget_revised != 0:
            return (self.variance_amount / self.budget_revised * 100).quantize(Decimal('0.01'))
        return Decimal('0.00')

    @property
    def yoy_variance_percent(self) -> Decimal:
        """Variance Year-over-Year"""
        if self.last_year_actual != 0:
            return ((self.actual - self.last_year_actual) / self.last_year_actual * 100).quantize(Decimal('0.01'))
        return Decimal('0.00')

    def __str__(self):
        return f"{self.department.code} - {self.account.code} - {self.fiscal_year}/{self.month:02d}"


class BudgetComparison(TimeStampedModel):
    """
    Comparaisons budgétaires automatisées
    Support pour analyses YTD, N-1, variance analysis
    """

    COMPARISON_TYPE_CHOICES = [
        ('BUDGET_VS_ACTUAL', 'Budget vs Réel'),
        ('YTD_CURRENT', 'YTD Année courante'),
        ('YTD_PREVIOUS', 'YTD Année précédente'),
        ('YOY_BUDGET', 'Budget N vs N-1'),
        ('YOY_ACTUAL', 'Réel N vs N-1'),
        ('FORECAST_VS_BUDGET', 'Prévision vs Budget'),
        ('ROLLING_12M', 'Rolling 12 mois'),
    ]

    ALERT_LEVEL_CHOICES = [
        (1, 'Info'),
        (2, 'Attention'),
        (3, 'Alerte'),
        (4, 'Critique'),
        (5, 'Urgence'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    budget_line = models.ForeignKey(BudgetLine, on_delete=models.CASCADE, related_name='comparisons')

    # Type de comparaison
    comparison_type = models.CharField(max_length=30, choices=COMPARISON_TYPE_CHOICES)

    # Période de comparaison
    period_start = models.DateField()
    period_end = models.DateField()

    # Valeurs comparées
    value_1 = models.DecimalField(max_digits=15, decimal_places=2)
    value_2 = models.DecimalField(max_digits=15, decimal_places=2)
    variance_amount = models.DecimalField(max_digits=15, decimal_places=2)
    variance_percent = models.DecimalField(max_digits=5, decimal_places=2)

    # Alertes
    alert_triggered = models.BooleanField(default=False)
    alert_level = models.IntegerField(choices=ALERT_LEVEL_CHOICES, null=True, blank=True)
    alert_message = models.TextField(blank=True)

    # Métadonnées de calcul
    calculation_date = models.DateTimeField(auto_now_add=True)
    calculation_method = models.CharField(max_length=50, blank=True)

    class Meta:
        db_table = 'budget_comparisons'
        ordering = ['-calculation_date']
        verbose_name = 'Comparaison Budgétaire'
        verbose_name_plural = 'Comparaisons Budgétaires'
        indexes = [
            models.Index(fields=['budget_line', 'comparison_type']),
            models.Index(fields=['alert_triggered', 'alert_level']),
        ]


class BudgetForecast(TimeStampedModel):
    """
    Prévisions budgétaires avec IA
    Modèles ARIMA, LSTM, Prophet selon cahier des charges
    """

    MODEL_TYPE_CHOICES = [
        ('ARIMA', 'ARIMA - AutoRegressive Integrated Moving Average'),
        ('LSTM', 'LSTM - Long Short-Term Memory'),
        ('PROPHET', 'Prophet - Facebook Forecasting'),
        ('RANDOM_FOREST', 'Random Forest'),
        ('LINEAR_REGRESSION', 'Régression Linéaire'),
        ('ENSEMBLE', 'Modèle ensemble'),
    ]

    SEASONALITY_CHOICES = [
        ('NONE', 'Aucune'),
        ('MONTHLY', 'Mensuelle'),
        ('QUARTERLY', 'Trimestrielle'),
        ('ANNUAL', 'Annuelle'),
        ('CUSTOM', 'Personnalisée'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    budget_line = models.ForeignKey(BudgetLine, on_delete=models.CASCADE, related_name='forecasts')

    # Configuration du modèle
    model_type = models.CharField(max_length=30, choices=MODEL_TYPE_CHOICES)
    model_parameters = JSONField(default=dict, help_text="Paramètres spécifiques au modèle")

    # Données d'entrée
    historical_data = JSONField(default=list, help_text="Données historiques utilisées")
    external_factors = JSONField(default=dict, help_text="Facteurs externes (inflation, etc.)")

    # Résultats de prédiction
    predicted_values = JSONField(default=list, help_text="Valeurs prédites par mois")
    confidence_intervals = JSONField(default=dict, help_text="Intervalles de confiance")
    accuracy_metrics = JSONField(default=dict, help_text="Métriques de précision")

    # Saisonnalité détectée
    seasonality_type = models.CharField(max_length=20, choices=SEASONALITY_CHOICES, default='NONE')
    seasonality_factors = JSONField(default=dict, help_text="Facteurs de saisonnalité")

    # Ajustements et événements
    special_events = JSONField(default=list, help_text="Événements spéciaux prévus")
    manual_adjustments = JSONField(default=dict, help_text="Ajustements manuels")

    # Qualité de la prédiction
    overall_confidence = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    model_performance_score = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))

    # Métadonnées
    generated_at = models.DateTimeField(auto_now_add=True)
    generated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    model_version = models.CharField(max_length=10, default='1.0')

    class Meta:
        db_table = 'budget_forecasts'
        ordering = ['-generated_at']
        verbose_name = 'Prévision Budgétaire'
        verbose_name_plural = 'Prévisions Budgétaires'


class BudgetAlert(TimeStampedModel):
    """
    Système d'alertes budgétaires intelligentes
    Alertes configurables et prédictives selon cahier des charges
    """

    ALERT_TYPE_CHOICES = [
        ('THRESHOLD', 'Seuil dépassé'),
        ('VARIANCE', 'Écart significatif'),
        ('TREND', 'Tendance anormale'),
        ('PREDICTION', 'Prédiction risque'),
        ('PATTERN', 'Pattern inhabituel'),
        ('DEADLINE', 'Échéance proche'),
        ('APPROVAL', 'Validation requise'),
    ]

    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('ACKNOWLEDGED', 'Accusée réception'),
        ('IN_PROGRESS', 'En cours traitement'),
        ('RESOLVED', 'Résolue'),
        ('DISMISSED', 'Écartée'),
    ]

    PRIORITY_CHOICES = [
        (1, 'Très faible'),
        (2, 'Faible'),
        (3, 'Normale'),
        (4, 'Élevée'),
        (5, 'Critique'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    budget_line = models.ForeignKey(BudgetLine, on_delete=models.CASCADE, related_name='alerts')

    # Configuration alerte
    alert_type = models.CharField(max_length=20, choices=ALERT_TYPE_CHOICES)
    priority = models.IntegerField(choices=PRIORITY_CHOICES, default=3)

    # Déclenchement
    trigger_condition = models.CharField(max_length=200)
    trigger_value = models.DecimalField(max_digits=15, decimal_places=2)
    threshold_value = models.DecimalField(max_digits=15, decimal_places=2)

    # Message et description
    title = models.CharField(max_length=200)
    message = models.TextField()
    technical_details = JSONField(default=dict, help_text="Détails techniques pour debug")

    # Statut et suivi
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')

    # Notifications
    notification_sent = models.BooleanField(default=False)
    notification_channels = ArrayField(
        models.CharField(max_length=20),
        default=list,
        help_text="email, sms, dashboard, teams"
    )

    # Gestion
    assigned_to = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_alerts'
    )
    acknowledged_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='acknowledged_alerts'
    )
    acknowledged_at = models.DateTimeField(null=True, blank=True)

    # Résolution
    resolved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='resolved_alerts'
    )
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolution_notes = models.TextField(blank=True)

    # Auto-résolution
    auto_resolve_date = models.DateTimeField(null=True, blank=True)
    auto_resolve_condition = models.CharField(max_length=200, blank=True)

    class Meta:
        db_table = 'budget_alerts'
        ordering = ['-created_at']
        verbose_name = 'Alerte Budgétaire'
        verbose_name_plural = 'Alertes Budgétaires'
        indexes = [
            models.Index(fields=['status', 'priority']),
            models.Index(fields=['budget_line', 'alert_type']),
        ]

    def __str__(self):
        return f"Alerte {self.alert_type} - {self.budget_line}"


class BudgetTemplate(TimeStampedModel):
    """
    Templates de budget réutilisables
    Conforme fonctionnalités d'import et templates
    """

    TEMPLATE_TYPE_CHOICES = [
        ('DEPARTMENT', 'Par département'),
        ('ACCOUNT_GROUP', 'Par groupe de comptes'),
        ('FULL_BUDGET', 'Budget complet'),
        ('SCENARIO', 'Scénario spécifique'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='budget_templates')

    # Identification
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    template_type = models.CharField(max_length=20, choices=TEMPLATE_TYPE_CHOICES)

    # Scope du template
    departments = models.ManyToManyField(BudgetDepartment, blank=True)
    account_codes = ArrayField(models.CharField(max_length=20), default=list, blank=True)

    # Structure du template
    template_structure = JSONField(
        default=dict,
        help_text="Structure détaillée du template avec valeurs par défaut"
    )

    # Formules et calculs
    calculation_formulas = JSONField(
        default=dict,
        help_text="Formules de calcul automatique"
    )

    # Configuration IA
    use_ai_suggestions = models.BooleanField(default=True)
    learning_enabled = models.BooleanField(default=True)

    # Métadonnées
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    is_public = models.BooleanField(default=False)
    usage_count = models.IntegerField(default=0)

    class Meta:
        db_table = 'budget_templates'
        ordering = ['name']
        verbose_name = 'Template Budget'
        verbose_name_plural = 'Templates Budget'

    def __str__(self):
        return f"{self.name} ({self.template_type})"


class BudgetAnalytics(TimeStampedModel):
    """
    Analytics et métriques budgétaires
    Business Intelligence selon cahier des charges
    """

    METRIC_TYPE_CHOICES = [
        ('VARIANCE', 'Analyse de variance'),
        ('TREND', 'Analyse de tendance'),
        ('SEASONALITY', 'Analyse saisonnalité'),
        ('CORRELATION', 'Analyse corrélation'),
        ('OUTLIER', 'Détection anomalies'),
        ('PERFORMANCE', 'Performance globale'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='budget_analytics')

    # Scope de l'analyse
    fiscal_year = models.IntegerField()
    department = models.ForeignKey(
        BudgetDepartment,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='analytics'
    )
    account = models.ForeignKey(
        ChartOfAccounts,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='budget_analytics'
    )

    # Type d'analyse
    metric_type = models.CharField(max_length=20, choices=METRIC_TYPE_CHOICES)

    # Période d'analyse
    analysis_start_date = models.DateField()
    analysis_end_date = models.DateField()

    # Résultats calculés
    metric_value = models.DecimalField(max_digits=15, decimal_places=4)
    metric_details = JSONField(default=dict, help_text="Détails du calcul")

    # Insights IA
    ai_insights = JSONField(default=list, help_text="Insights générés par IA")
    recommendations = JSONField(default=list, help_text="Recommandations automatiques")

    # Confiance et qualité
    confidence_level = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    data_quality_score = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('100.00'))

    # Métadonnées
    calculation_timestamp = models.DateTimeField(auto_now_add=True)
    algorithm_version = models.CharField(max_length=20, default='1.0')

    class Meta:
        db_table = 'budget_analytics'
        ordering = ['-calculation_timestamp']
        verbose_name = 'Analyse Budgétaire'
        verbose_name_plural = 'Analyses Budgétaires'


class BudgetWorkflow(TimeStampedModel):
    """
    Workflow de validation budgétaire
    Circuit d'approbation configurable selon cahier des charges
    """

    WORKFLOW_TYPE_CHOICES = [
        ('CREATION', 'Création budget'),
        ('REVISION', 'Révision budget'),
        ('VALIDATION', 'Validation période'),
        ('CLOSURE', 'Clôture exercice'),
        ('EXCEPTIONAL', 'Dépassement exceptionnel'),
    ]

    STATUS_CHOICES = [
        ('PENDING', 'En attente'),
        ('IN_REVIEW', 'En cours de révision'),
        ('APPROVED', 'Approuvé'),
        ('REJECTED', 'Rejeté'),
        ('CANCELLED', 'Annulé'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    budget_plan = models.ForeignKey(BudgetPlan, on_delete=models.CASCADE, related_name='workflows')

    # Type et configuration
    workflow_type = models.CharField(max_length=20, choices=WORKFLOW_TYPE_CHOICES)
    workflow_config = JSONField(default=dict, help_text="Configuration du circuit")

    # Étapes de validation
    current_step = models.IntegerField(default=1)
    total_steps = models.IntegerField(default=1)

    # Statut
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')

    # Responsables actuels
    current_approvers = models.ManyToManyField(
        User,
        related_name='pending_budget_approvals',
        blank=True
    )

    # Historique des actions
    approval_history = JSONField(default=list, help_text="Historique des validations")

    # Délais
    started_at = models.DateTimeField(auto_now_add=True)
    due_date = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    # Commentaires
    initial_comments = models.TextField(blank=True)
    final_comments = models.TextField(blank=True)

    class Meta:
        db_table = 'budget_workflows'
        ordering = ['-started_at']
        verbose_name = 'Workflow Budget'
        verbose_name_plural = 'Workflows Budget'


class BudgetReport(TimeStampedModel):
    """
    Rapports budgétaires automatisés
    Génération et distribution selon cahier des charges
    """

    REPORT_TYPE_CHOICES = [
        ('MONTHLY', 'Rapport mensuel'),
        ('QUARTERLY', 'Rapport trimestriel'),
        ('ANNUAL', 'Rapport annuel'),
        ('VARIANCE', 'Analyse écarts'),
        ('FORECAST', 'Rapport prévisionnel'),
        ('EXECUTIVE', 'Synthèse direction'),
        ('DEPARTMENT', 'Rapport départemental'),
        ('CUSTOM', 'Rapport personnalisé'),
    ]

    FORMAT_CHOICES = [
        ('PDF', 'PDF'),
        ('EXCEL', 'Excel'),
        ('POWERPOINT', 'PowerPoint'),
        ('CSV', 'CSV'),
        ('JSON', 'JSON'),
        ('WEB', 'Dashboard web'),
    ]

    STATUS_CHOICES = [
        ('SCHEDULED', 'Programmé'),
        ('GENERATING', 'En cours génération'),
        ('READY', 'Prêt'),
        ('SENT', 'Envoyé'),
        ('ERROR', 'Erreur'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='budget_reports')

    # Configuration rapport
    report_type = models.CharField(max_length=20, choices=REPORT_TYPE_CHOICES)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    # Période couverte
    fiscal_year = models.IntegerField()
    period_start = models.DateField()
    period_end = models.DateField()

    # Scope du rapport
    departments = models.ManyToManyField(BudgetDepartment, blank=True)
    account_filters = JSONField(default=dict, help_text="Filtres sur comptes")

    # Format et contenu
    output_format = models.CharField(max_length=20, choices=FORMAT_CHOICES, default='PDF')
    report_template = models.CharField(max_length=100, blank=True)
    include_charts = models.BooleanField(default=True)
    include_details = models.BooleanField(default=True)
    include_predictions = models.BooleanField(default=False)

    # Génération automatique
    is_scheduled = models.BooleanField(default=False)
    schedule_frequency = models.CharField(max_length=20, blank=True)  # monthly, weekly, etc.
    next_generation = models.DateTimeField(null=True, blank=True)

    # Statut
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='SCHEDULED')

    # Distribution
    recipients = JSONField(default=list, help_text="Liste des destinataires")
    distribution_channels = ArrayField(
        models.CharField(max_length=20),
        default=list,
        help_text="email, portal, api"
    )

    # Fichier généré
    generated_file = models.FileField(upload_to='budget/reports/%Y/%m/', blank=True)
    file_size = models.PositiveIntegerField(null=True, blank=True)

    # Métadonnées
    generated_at = models.DateTimeField(null=True, blank=True)
    generated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    generation_time_seconds = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = 'budget_reports'
        ordering = ['-generated_at']
        verbose_name = 'Rapport Budgétaire'
        verbose_name_plural = 'Rapports Budgétaires'

    def __str__(self):
        return f"{self.name} - {self.fiscal_year}"


class BudgetImportLog(TimeStampedModel):
    """
    Journal des imports budgétaires
    Traçabilité complète des imports Excel/CSV
    """

    STATUS_CHOICES = [
        ('SUCCESS', 'Succès'),
        ('PARTIAL', 'Succès partiel'),
        ('FAILED', 'Échec'),
        ('PROCESSING', 'En cours'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='budget_imports')

    # Fichier source
    source_file = models.FileField(upload_to='budget/imports/%Y/%m/')
    file_name = models.CharField(max_length=200)
    file_size = models.PositiveIntegerField()
    file_type = models.CharField(max_length=20)

    # Configuration import
    mapping_config = JSONField(default=dict, help_text="Configuration mapping colonnes")
    validation_rules = JSONField(default=dict, help_text="Règles de validation")

    # Résultats
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PROCESSING')
    total_rows = models.IntegerField(default=0)
    successful_rows = models.IntegerField(default=0)
    failed_rows = models.IntegerField(default=0)
    warnings_count = models.IntegerField(default=0)

    # Détails erreurs et warnings
    error_details = JSONField(default=list, help_text="Détail des erreurs par ligne")
    warning_details = JSONField(default=list, help_text="Détail des warnings")

    # Métadonnées
    imported_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    import_started_at = models.DateTimeField(auto_now_add=True)
    import_completed_at = models.DateTimeField(null=True, blank=True)
    processing_time_seconds = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = 'budget_import_logs'
        ordering = ['-import_started_at']
        verbose_name = 'Log Import Budget'
        verbose_name_plural = 'Logs Import Budget'

    def __str__(self):
        return f"Import {self.file_name} - {self.status}"


# Vue matérialisée pour performance des requêtes YTD
class BudgetYTDSummary(models.Model):
    """
    Vue matérialisée pour calculs YTD optimisés
    Performance des dashboards temps réel
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    department = models.ForeignKey(BudgetDepartment, on_delete=models.CASCADE)
    account = models.ForeignKey(ChartOfAccounts, on_delete=models.CASCADE)

    # Période
    fiscal_year = models.IntegerField()
    month_current = models.IntegerField()

    # Agrégats YTD
    ytd_budget = models.DecimalField(max_digits=15, decimal_places=2)
    ytd_actual = models.DecimalField(max_digits=15, decimal_places=2)
    ytd_last_year = models.DecimalField(max_digits=15, decimal_places=2)

    # Calculs dérivés
    variance_amount = models.DecimalField(max_digits=15, decimal_places=2)
    variance_percent = models.DecimalField(max_digits=5, decimal_places=2)
    yoy_variance_percent = models.DecimalField(max_digits=5, decimal_places=2)

    # Métriques calculées
    execution_rate = models.DecimalField(max_digits=5, decimal_places=2)
    run_rate_projection = models.DecimalField(max_digits=15, decimal_places=2)

    # Timestamp
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'budget_ytd_summary'
        managed = False  # Vue matérialisée gérée en SQL
        unique_together = [('company', 'department', 'account', 'fiscal_year')]
        verbose_name = 'Résumé YTD Budget'
        verbose_name_plural = 'Résumés YTD Budget'