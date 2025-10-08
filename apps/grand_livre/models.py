"""
Grand Livre Nouvelle Génération WiseBook
Modèles avancés pour consultation temps réel, analyses IA et collaboration
Conforme OHADA/SYSCOHADA avec performance < 1s pour 10M+ écritures
"""
from django.db import models
from django.contrib.postgres.indexes import GinIndex, BrinIndex
from django.contrib.postgres.fields import ArrayField, JSONField
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from decimal import Decimal
import uuid
import hashlib
from datetime import datetime, timedelta

from apps.core.models import TimeStampedModel
from apps.accounting.models import Company, FiscalYear, ChartOfAccounts, AccountingEntry


class GrandLivreConfiguration(TimeStampedModel):
    """
    Configuration avancée du Grand Livre par société
    Performance, sécurité et personnalisation
    """

    SEARCH_ENGINES = [
        ('NATIVE', 'PostgreSQL Full-Text'),
        ('ELASTICSEARCH', 'Elasticsearch'),
        ('OPENSEARCH', 'OpenSearch'),
    ]

    CACHE_STRATEGIES = [
        ('REDIS', 'Redis Cache'),
        ('MEMCACHED', 'Memcached'),
        ('DATABASE', 'Database Cache'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.OneToOneField(Company, on_delete=models.CASCADE, related_name='grand_livre_config')

    # Configuration performance
    search_engine = models.CharField(max_length=20, choices=SEARCH_ENGINES, default='NATIVE')
    cache_strategy = models.CharField(max_length=20, choices=CACHE_STRATEGIES, default='REDIS')
    cache_ttl_seconds = models.PositiveIntegerField(default=1800)  # 30 min

    # Limites et pagination
    max_results_per_page = models.PositiveIntegerField(default=100)
    max_export_entries = models.PositiveIntegerField(default=1000000)  # 1M
    search_timeout_seconds = models.PositiveIntegerField(default=30)

    # Fonctionnalités avancées
    enable_ai_search = models.BooleanField(default=True)
    enable_voice_search = models.BooleanField(default=False)
    enable_image_search = models.BooleanField(default=False)
    enable_collaborative_features = models.BooleanField(default=True)
    enable_real_time_notifications = models.BooleanField(default=True)

    # Sécurité et audit
    enable_blockchain_hash = models.BooleanField(default=False)
    require_entry_validation = models.BooleanField(default=True)
    audit_all_access = models.BooleanField(default=True)

    # Personnalisation interface
    default_view_mode = models.CharField(max_length=20, choices=[
        ('TABLE', 'Vue Tableau'),
        ('TIMELINE', 'Vue Chronologique'),
        ('TREE', 'Vue Hiérarchique'),
        ('ANALYTICS', 'Vue Analytique'),
        ('KANBAN', 'Vue Kanban'),
    ], default='TABLE')

    # Intégrations
    elasticsearch_url = models.URLField(blank=True, null=True)
    redis_url = models.CharField(max_length=255, blank=True)
    webhook_url = models.URLField(blank=True, null=True)

    class Meta:
        db_table = 'grand_livre_config'
        verbose_name = "Configuration Grand Livre"
        verbose_name_plural = "Configurations Grand Livre"


class LedgerEntryIndex(TimeStampedModel):
    """
    Index optimisé pour recherches ultra-rapides
    Dénormalisation contrôlée pour performance
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, db_index=True)
    entry = models.OneToOneField(AccountingEntry, on_delete=models.CASCADE, related_name='search_index')

    # Champs de recherche optimisés
    account_number = models.CharField(max_length=20, db_index=True)
    account_label = models.CharField(max_length=200, db_index=True)
    account_class = models.CharField(max_length=1, db_index=True)  # 1-8 SYSCOHADA

    # Dates optimisées pour recherche
    entry_date = models.DateField(db_index=True)
    entry_year = models.PositiveSmallIntegerField(db_index=True)
    entry_month = models.PositiveSmallIntegerField(db_index=True)
    entry_quarter = models.PositiveSmallIntegerField(db_index=True)

    # Montants pour filtrage rapide
    debit_amount = models.DecimalField(max_digits=20, decimal_places=2, default=Decimal('0'), db_index=True)
    credit_amount = models.DecimalField(max_digits=20, decimal_places=2, default=Decimal('0'), db_index=True)
    absolute_amount = models.DecimalField(max_digits=20, decimal_places=2, default=Decimal('0'), db_index=True)

    # Références pour navigation
    journal_code = models.CharField(max_length=10, db_index=True)
    document_reference = models.CharField(max_length=50, db_index=True)
    sequence_number = models.PositiveIntegerField(db_index=True)

    # Texte recherchable (Full-Text Search)
    searchable_text = models.TextField()  # Concaténation de tous les champs texte

    # Métadonnées pour analytics
    currency_code = models.CharField(max_length=3, db_index=True)
    analytical_axes = JSONField(default=dict)  # Axes analytiques
    tags = ArrayField(models.CharField(max_length=50), default=list, blank=True)

    # Performance tracking
    access_count = models.PositiveIntegerField(default=0)
    last_accessed = models.DateTimeField(auto_now=True)

    # Hash pour intégrité
    content_hash = models.CharField(max_length=64, db_index=True)

    class Meta:
        db_table = 'ledger_entry_index'
        indexes = [
            # Index composites pour recherches fréquentes
            models.Index(fields=['company', 'entry_date']),
            models.Index(fields=['company', 'account_number', 'entry_date']),
            models.Index(fields=['company', 'journal_code', 'entry_date']),
            models.Index(fields=['company', 'absolute_amount']),
            models.Index(fields=['account_class', 'entry_year', 'entry_month']),

            # Index BRIN pour grandes tables partitionnées
            BrinIndex(fields=['entry_date']),
            BrinIndex(fields=['absolute_amount']),

            # Index GIN pour recherche full-text
            GinIndex(fields=['searchable_text']),
            GinIndex(fields=['tags']),
            GinIndex(fields=['analytical_axes']),
        ]
        verbose_name = "Index Écriture Comptable"
        verbose_name_plural = "Index Écritures Comptables"

    def save(self, *args, **kwargs):
        # Mise à jour automatique des champs calculés
        self._update_computed_fields()
        super().save(*args, **kwargs)

    def _update_computed_fields(self):
        """Calcul automatique des champs optimisés"""
        if self.entry:
            # Dates décomposées
            self.entry_date = self.entry.date
            self.entry_year = self.entry.date.year
            self.entry_month = self.entry.date.month
            self.entry_quarter = (self.entry.date.month - 1) // 3 + 1

            # Montants
            self.debit_amount = self.entry.debit_amount or Decimal('0')
            self.credit_amount = self.entry.credit_amount or Decimal('0')
            self.absolute_amount = max(self.debit_amount, self.credit_amount)

            # Texte recherchable
            self.searchable_text = self._build_searchable_text()

            # Hash d'intégrité
            self.content_hash = self._calculate_hash()

    def _build_searchable_text(self):
        """Construction du texte recherchable"""
        texts = [
            self.account_number,
            self.account_label,
            self.entry.description or '',
            self.journal_code,
            self.document_reference,
            str(self.debit_amount) if self.debit_amount else '',
            str(self.credit_amount) if self.credit_amount else '',
        ]
        return ' '.join(filter(None, texts)).lower()

    def _calculate_hash(self):
        """Calcul du hash d'intégrité"""
        data = f"{self.entry.id}{self.entry.date}{self.debit_amount}{self.credit_amount}{self.entry.description}"
        return hashlib.sha256(data.encode()).hexdigest()


class SearchHistory(TimeStampedModel):
    """
    Historique des recherches pour ML et amélioration continue
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='search_history')
    company = models.ForeignKey(Company, on_delete=models.CASCADE)

    # Critères de recherche
    search_query = models.TextField()
    search_filters = JSONField(default=dict)
    search_type = models.CharField(max_length=20, choices=[
        ('QUICK', 'Recherche rapide'),
        ('ADVANCED', 'Recherche avancée'),
        ('VOICE', 'Recherche vocale'),
        ('IMAGE', 'Recherche par image'),
        ('AI', 'Recherche IA'),
    ], default='QUICK')

    # Résultats
    results_count = models.PositiveIntegerField(default=0)
    response_time_ms = models.PositiveIntegerField(default=0)
    was_successful = models.BooleanField(default=True)

    # Interaction utilisateur
    clicked_results = ArrayField(models.UUIDField(), default=list, blank=True)
    time_spent_seconds = models.PositiveIntegerField(default=0)
    exported_results = models.BooleanField(default=False)

    # Machine Learning features
    user_satisfaction_score = models.PositiveSmallIntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    search_context = JSONField(default=dict)  # Contexte pour ML

    class Meta:
        db_table = 'search_history'
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['company', 'search_type', '-created_at']),
        ]
        verbose_name = "Historique de Recherche"
        verbose_name_plural = "Historiques de Recherche"


class SavedSearch(TimeStampedModel):
    """
    Recherches sauvegardées et favoris utilisateur
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='saved_searches')
    company = models.ForeignKey(Company, on_delete=models.CASCADE)

    # Métadonnées
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    is_favorite = models.BooleanField(default=False)
    is_shared = models.BooleanField(default=False)

    # Critères sauvegardés
    search_criteria = JSONField()
    view_configuration = JSONField(default=dict)

    # Utilisation
    usage_count = models.PositiveIntegerField(default=0)
    last_used = models.DateTimeField(null=True, blank=True)

    # Partage
    shared_with_users = models.ManyToManyField(User, blank=True, related_name='shared_searches')
    share_permissions = JSONField(default=dict)

    class Meta:
        db_table = 'saved_searches'
        unique_together = [('user', 'company', 'name')]
        indexes = [
            models.Index(fields=['user', 'is_favorite']),
            models.Index(fields=['company', 'is_shared']),
        ]
        verbose_name = "Recherche Sauvegardée"
        verbose_name_plural = "Recherches Sauvegardées"


class LedgerAnnotation(TimeStampedModel):
    """
    Système d'annotations collaboratives sur les écritures
    """

    ANNOTATION_TYPES = [
        ('NOTE', 'Note simple'),
        ('QUESTION', 'Question'),
        ('CORRECTION', 'Correction'),
        ('VALIDATION', 'Validation'),
        ('ALERT', 'Alerte'),
        ('AUDIT', 'Note d\'audit'),
    ]

    PRIORITY_LEVELS = [
        ('LOW', 'Basse'),
        ('MEDIUM', 'Moyenne'),
        ('HIGH', 'Haute'),
        ('URGENT', 'Urgente'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    entry_index = models.ForeignKey(LedgerEntryIndex, on_delete=models.CASCADE, related_name='annotations')

    # Auteur et destinataires
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_annotations')
    mentioned_users = models.ManyToManyField(User, blank=True, related_name='mentioned_in_annotations')

    # Contenu
    annotation_type = models.CharField(max_length=20, choices=ANNOTATION_TYPES, default='NOTE')
    title = models.CharField(max_length=200, blank=True)
    content = models.TextField()
    priority = models.CharField(max_length=10, choices=PRIORITY_LEVELS, default='MEDIUM')

    # Pièces jointes
    attachments = JSONField(default=list)  # URLs vers fichiers

    # Workflow
    is_resolved = models.BooleanField(default=False)
    resolved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='resolved_annotations')
    resolved_at = models.DateTimeField(null=True, blank=True)

    # Threading
    parent_annotation = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')
    thread_root = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='thread_messages')

    # Notifications
    notification_sent = models.BooleanField(default=False)

    class Meta:
        db_table = 'ledger_annotations'
        indexes = [
            models.Index(fields=['entry_index', '-created_at']),
            models.Index(fields=['author', 'is_resolved']),
            models.Index(fields=['annotation_type', 'priority']),
        ]
        verbose_name = "Annotation d'Écriture"
        verbose_name_plural = "Annotations d'Écritures"


class LedgerExportTemplate(TimeStampedModel):
    """
    Templates d'export personnalisables
    """

    EXPORT_FORMATS = [
        ('PDF', 'PDF'),
        ('EXCEL', 'Excel'),
        ('CSV', 'CSV'),
        ('XML', 'XML'),
        ('JSON', 'JSON'),
        ('TXT', 'Texte'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='export_templates')
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)

    # Métadonnées
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    format_type = models.CharField(max_length=10, choices=EXPORT_FORMATS)

    # Configuration
    template_config = JSONField()  # Structure du template
    default_filters = JSONField(default=dict)
    column_mappings = JSONField(default=dict)

    # Options
    include_headers = models.BooleanField(default=True)
    include_footers = models.BooleanField(default=True)
    include_signatures = models.BooleanField(default=False)

    # Usage
    is_default = models.BooleanField(default=False)
    is_shared = models.BooleanField(default=False)
    usage_count = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'ledger_export_templates'
        unique_together = [('company', 'name')]
        indexes = [
            models.Index(fields=['company', 'format_type']),
            models.Index(fields=['created_by', 'is_default']),
        ]
        verbose_name = "Template d'Export"
        verbose_name_plural = "Templates d'Export"


class AIAnalysisResult(TimeStampedModel):
    """
    Résultats des analyses IA sur le Grand Livre
    """

    ANALYSIS_TYPES = [
        ('ANOMALY_DETECTION', 'Détection d\'anomalies'),
        ('PATTERN_RECOGNITION', 'Reconnaissance de motifs'),
        ('FRAUD_DETECTION', 'Détection de fraudes'),
        ('TREND_ANALYSIS', 'Analyse de tendances'),
        ('CORRELATION_ANALYSIS', 'Analyse de corrélations'),
        ('PREDICTIVE_ANALYSIS', 'Analyse prédictive'),
    ]

    CONFIDENCE_LEVELS = [
        ('LOW', 'Faible (< 60%)'),
        ('MEDIUM', 'Moyenne (60-80%)'),
        ('HIGH', 'Élevée (80-95%)'),
        ('VERY_HIGH', 'Très élevée (> 95%)'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='ai_analyses')

    # Type d'analyse
    analysis_type = models.CharField(max_length=30, choices=ANALYSIS_TYPES)
    model_version = models.CharField(max_length=20)

    # Scope d'analyse
    analyzed_entries = models.ManyToManyField(LedgerEntryIndex, related_name='ai_analyses')
    analysis_period_start = models.DateField()
    analysis_period_end = models.DateField()

    # Résultats
    findings = JSONField()  # Découvertes détaillées
    confidence_level = models.CharField(max_length=15, choices=CONFIDENCE_LEVELS)
    risk_score = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0'))

    # Recommandations
    recommendations = JSONField(default=list)
    action_required = models.BooleanField(default=False)
    priority_level = models.PositiveSmallIntegerField(default=1)

    # Suivi
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    review_date = models.DateTimeField(null=True, blank=True)
    review_notes = models.TextField(blank=True)
    is_false_positive = models.BooleanField(default=False)

    # Performance
    processing_time_seconds = models.PositiveIntegerField(default=0)
    data_points_analyzed = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'ai_analysis_results'
        indexes = [
            models.Index(fields=['company', 'analysis_type', '-created_at']),
            models.Index(fields=['confidence_level', 'risk_score']),
            models.Index(fields=['action_required', 'priority_level']),
        ]
        verbose_name = "Résultat d'Analyse IA"
        verbose_name_plural = "Résultats d'Analyses IA"


class LedgerAccessLog(TimeStampedModel):
    """
    Logs d'accès détaillés pour audit et compliance
    """

    ACCESS_TYPES = [
        ('VIEW', 'Consultation'),
        ('SEARCH', 'Recherche'),
        ('EXPORT', 'Export'),
        ('ANNOTATE', 'Annotation'),
        ('SHARE', 'Partage'),
        ('DOWNLOAD', 'Téléchargement'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ledger_access_logs')
    company = models.ForeignKey(Company, on_delete=models.CASCADE)

    # Détails de l'accès
    access_type = models.CharField(max_length=20, choices=ACCESS_TYPES)
    accessed_entries = models.ManyToManyField(LedgerEntryIndex, blank=True)
    search_criteria = JSONField(default=dict)

    # Contexte technique
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField()
    session_id = models.CharField(max_length=64)

    # Métadonnées
    duration_seconds = models.PositiveIntegerField(default=0)
    results_count = models.PositiveIntegerField(default=0)
    export_format = models.CharField(max_length=10, blank=True)

    # Géolocalisation (optionnelle)
    location_country = models.CharField(max_length=2, blank=True)
    location_city = models.CharField(max_length=100, blank=True)

    # Flags de sécurité
    is_suspicious = models.BooleanField(default=False)
    risk_score = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = 'ledger_access_logs'
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['company', 'access_type', '-created_at']),
            models.Index(fields=['ip_address', '-created_at']),
            models.Index(fields=['is_suspicious', 'risk_score']),
        ]
        verbose_name = "Log d'Accès Grand Livre"
        verbose_name_plural = "Logs d'Accès Grand Livre"


class CollaborativeWorkspace(TimeStampedModel):
    """
    Espaces de travail collaboratifs pour équipes
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='collaborative_workspaces')

    # Métadonnées
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    color_theme = models.CharField(max_length=7, default='#3B82F6')  # Hex color

    # Membres
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_workspaces')
    members = models.ManyToManyField(User, through='WorkspaceMembership', related_name='workspaces')

    # Contenu
    saved_searches = models.ManyToManyField(SavedSearch, blank=True)
    shared_templates = models.ManyToManyField(LedgerExportTemplate, blank=True)
    bookmarked_entries = models.ManyToManyField(LedgerEntryIndex, blank=True)

    # Configuration
    workspace_settings = JSONField(default=dict)
    default_permissions = JSONField(default=dict)

    # Activité
    last_activity = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'collaborative_workspaces'
        unique_together = [('company', 'name')]
        indexes = [
            models.Index(fields=['company', 'is_active']),
            models.Index(fields=['owner', '-last_activity']),
        ]
        verbose_name = "Espace de Travail Collaboratif"
        verbose_name_plural = "Espaces de Travail Collaboratifs"


class WorkspaceMembership(TimeStampedModel):
    """
    Appartenance aux espaces de travail avec permissions
    """

    ROLES = [
        ('VIEWER', 'Lecteur'),
        ('CONTRIBUTOR', 'Contributeur'),
        ('MODERATOR', 'Modérateur'),
        ('ADMIN', 'Administrateur'),
    ]

    workspace = models.ForeignKey(CollaborativeWorkspace, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)

    # Permissions
    role = models.CharField(max_length=20, choices=ROLES, default='VIEWER')
    custom_permissions = JSONField(default=dict)

    # Activité
    joined_at = models.DateTimeField(auto_now_add=True)
    last_active = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'workspace_memberships'
        unique_together = [('workspace', 'user')]
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['workspace', 'role']),
        ]
        verbose_name = "Appartenance Espace de Travail"
        verbose_name_plural = "Appartenances Espaces de Travail"


class PerformanceMetrics(TimeStampedModel):
    """
    Métriques de performance pour monitoring et optimisation
    """

    METRIC_TYPES = [
        ('SEARCH_PERFORMANCE', 'Performance recherche'),
        ('EXPORT_PERFORMANCE', 'Performance export'),
        ('DATABASE_PERFORMANCE', 'Performance base de données'),
        ('USER_EXPERIENCE', 'Expérience utilisateur'),
        ('SYSTEM_HEALTH', 'Santé du système'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='performance_metrics')

    # Type et période
    metric_type = models.CharField(max_length=30, choices=METRIC_TYPES)
    measurement_date = models.DateTimeField(default=timezone.now)
    period_start = models.DateTimeField()
    period_end = models.DateTimeField()

    # Métriques principales
    average_response_time_ms = models.PositiveIntegerField(default=0)
    p95_response_time_ms = models.PositiveIntegerField(default=0)
    p99_response_time_ms = models.PositiveIntegerField(default=0)

    # Volumétrie
    total_requests = models.PositiveIntegerField(default=0)
    successful_requests = models.PositiveIntegerField(default=0)
    failed_requests = models.PositiveIntegerField(default=0)

    # Détails par catégorie
    detailed_metrics = JSONField(default=dict)

    # Alertes
    has_performance_issues = models.BooleanField(default=False)
    alert_threshold_exceeded = models.BooleanField(default=False)

    class Meta:
        db_table = 'performance_metrics'
        indexes = [
            models.Index(fields=['company', 'metric_type', '-measurement_date']),
            models.Index(fields=['measurement_date', 'has_performance_issues']),
        ]
        verbose_name = "Métrique de Performance"
        verbose_name_plural = "Métriques de Performance"