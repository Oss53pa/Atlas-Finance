"""
Module Import et Migration de Données WiseBook
Support migration depuis Sage, SAP, Excel avec mapping intelligent
"""
from django.db import models
from django.core.validators import FileExtensionValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
import uuid
import json
from datetime import date

from apps.core.models import TimeStampedModel
from apps.accounting.models import Company, FiscalYear, ChartOfAccounts


class DataSourceConfiguration(TimeStampedModel):
    """
    Configuration des sources de données externes
    Support multi-ERP (Sage, SAP, Oracle, etc.)
    """
    
    SOURCE_TYPE_CHOICES = [
        ('SAGE', 'Sage (Comptabilité, Gestion)'),
        ('SAP', 'SAP ERP'),
        ('ORACLE', 'Oracle NetSuite'),
        ('QUICKBOOKS', 'QuickBooks'),
        ('CIEL', 'Ciel Compta'),
        ('EBP', 'EBP Comptabilité'),
        ('EXCEL', 'Fichiers Excel'),
        ('CSV', 'Fichiers CSV'),
        ('XML', 'Format XML'),
        ('TXT', 'Format texte délimité'),
        ('FEC', 'Fichier des Écritures Comptables'),
        ('OTHER', 'Autre système'),
    ]
    
    FORMAT_TYPE_CHOICES = [
        ('EXCEL', 'Excel (.xlsx, .xls)'),
        ('CSV', 'CSV délimité'),
        ('XML', 'XML structuré'),
        ('JSON', 'JSON'),
        ('TXT', 'Texte délimité'),
        ('SQL', 'Dump SQL'),
        ('API', 'API REST'),
        ('DATABASE', 'Connexion base directe'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='data_source_configs')
    
    # Identification de la source
    source_name = models.CharField(max_length=100, verbose_name="Nom de la source")
    source_type = models.CharField(max_length=20, choices=SOURCE_TYPE_CHOICES)
    source_version = models.CharField(max_length=20, blank=True, verbose_name="Version du logiciel source")
    
    # Configuration format
    file_format = models.CharField(max_length=20, choices=FORMAT_TYPE_CHOICES)
    encoding = models.CharField(max_length=20, default='utf-8', choices=[
        ('utf-8', 'UTF-8'),
        ('iso-8859-1', 'ISO-8859-1'),
        ('cp1252', 'Windows-1252'),
    ])
    
    # Paramètres spécifiques format
    csv_delimiter = models.CharField(max_length=5, default=';', verbose_name="Séparateur CSV")
    csv_quote_char = models.CharField(max_length=1, default='"', verbose_name="Délimiteur texte")
    has_header_row = models.BooleanField(default=True, verbose_name="Ligne d'en-tête")
    
    # Mapping des colonnes/champs
    field_mappings = models.JSONField(default=dict, verbose_name="Mapping des champs")
    account_mapping_rules = models.JSONField(default=dict, verbose_name="Règles mapping comptes")
    
    # Configuration validation
    validation_rules = models.JSONField(default=dict, verbose_name="Règles de validation")
    error_handling = models.CharField(max_length=20, choices=[
        ('STRICT', 'Strict - Arrêter sur erreur'),
        ('WARN', 'Avertir et continuer'),
        ('SKIP', 'Ignorer lignes avec erreurs'),
    ], default='WARN')
    
    # Historique et statistiques
    last_import_date = models.DateTimeField(null=True, blank=True)
    total_imports_count = models.PositiveIntegerField(default=0, editable=False)
    success_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=100, editable=False,
        verbose_name="Taux de succès (%)"
    )
    
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'data_import_source_config'
        unique_together = [('company', 'source_name')]
        ordering = ['source_name']
        verbose_name = "Configuration source données"
        verbose_name_plural = "Configurations sources données"
    
    def __str__(self):
        return f"{self.source_name} ({self.get_source_type_display()})"


class ImportSession(TimeStampedModel):
    """
    Session d'import avec suivi complet du processus
    """
    
    STATUS_CHOICES = [
        ('CREATED', 'Créée'),
        ('UPLOADING', 'Upload en cours'),
        ('PARSING', 'Analyse du fichier'),
        ('MAPPING', 'Configuration mapping'),
        ('VALIDATING', 'Validation des données'),
        ('PREVIEWING', 'Prévisualisation'),
        ('IMPORTING', 'Import en cours'),
        ('COMPLETED', 'Terminée avec succès'),
        ('FAILED', 'Échec'),
        ('CANCELLED', 'Annulée'),
    ]
    
    DATA_TYPE_CHOICES = [
        ('CHART_OF_ACCOUNTS', 'Plan comptable'),
        ('OPENING_BALANCE', 'Balance d\'ouverture'),
        ('JOURNAL_ENTRIES', 'Écritures comptables'),
        ('CUSTOMERS', 'Fichier clients'),
        ('SUPPLIERS', 'Fichier fournisseurs'),
        ('FIXED_ASSETS', 'Immobilisations'),
        ('BUDGETS', 'Données budgétaires'),
        ('FULL_MIGRATION', 'Migration complète'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='import_sessions')
    source_config = models.ForeignKey(DataSourceConfiguration, on_delete=models.CASCADE, related_name='import_sessions')
    
    # Informations de la session
    session_name = models.CharField(max_length=200, verbose_name="Nom de la session")
    data_type = models.CharField(max_length=30, choices=DATA_TYPE_CHOICES)
    fiscal_year = models.ForeignKey(FiscalYear, on_delete=models.CASCADE, null=True, blank=True)
    
    # Fichier source
    source_file = models.FileField(
        upload_to='imports/%Y/%m/',
        validators=[FileExtensionValidator(['xlsx', 'xls', 'csv', 'txt', 'xml', 'json'])],
        verbose_name="Fichier source"
    )
    file_size = models.PositiveIntegerField(verbose_name="Taille fichier (bytes)", editable=False)
    file_checksum = models.CharField(max_length=64, verbose_name="Empreinte MD5", editable=False)
    
    # Statut et progression
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='CREATED')
    progress_percent = models.PositiveIntegerField(default=0, verbose_name="Progression (%)")
    current_step = models.CharField(max_length=100, blank=True, verbose_name="Étape courante")
    
    # Statistiques de traitement
    total_rows_detected = models.PositiveIntegerField(default=0, verbose_name="Lignes détectées")
    total_rows_processed = models.PositiveIntegerField(default=0, verbose_name="Lignes traitées")
    total_rows_imported = models.PositiveIntegerField(default=0, verbose_name="Lignes importées")
    total_rows_errors = models.PositiveIntegerField(default=0, verbose_name="Lignes en erreur")
    
    # Résultats mapping
    mapping_configuration = models.JSONField(default=dict, verbose_name="Configuration mapping")
    detected_structure = models.JSONField(default=dict, verbose_name="Structure détectée")
    validation_results = models.JSONField(default=dict, verbose_name="Résultats validation")
    
    # Temps et performance
    start_time = models.DateTimeField(null=True, blank=True)
    end_time = models.DateTimeField(null=True, blank=True)
    processing_duration = models.DurationField(null=True, blank=True, verbose_name="Durée traitement")
    
    # Utilisateur et audit
    created_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True)
    import_notes = models.TextField(blank=True, verbose_name="Notes d'import")
    
    # Logs détaillés
    processing_log = models.JSONField(default=list, verbose_name="Journal de traitement")
    error_summary = models.JSONField(default=dict, verbose_name="Résumé des erreurs")
    
    class Meta:
        db_table = 'data_import_sessions'
        indexes = [
            models.Index(fields=['company', 'status', '-created_at']),
            models.Index(fields=['data_type', '-created_at']),
        ]
        ordering = ['-created_at']
        verbose_name = "Session d'import"
        verbose_name_plural = "Sessions d'import"
    
    def __str__(self):
        return f"{self.session_name} - {self.get_status_display()}"
    
    @property
    def success_rate(self):
        """Taux de succès de l'import"""
        if self.total_rows_processed == 0:
            return 0
        return (self.total_rows_imported / self.total_rows_processed * 100)
    
    @property
    def error_rate(self):
        """Taux d'erreur de l'import"""
        if self.total_rows_processed == 0:
            return 0
        return (self.total_rows_errors / self.total_rows_processed * 100)


class ImportMapping(TimeStampedModel):
    """
    Mapping entre champs source et cibles WiseBook
    Support mapping intelligent avec IA
    """
    
    FIELD_TYPE_CHOICES = [
        ('ACCOUNT_CODE', 'Code compte'),
        ('ACCOUNT_NAME', 'Libellé compte'),
        ('DATE', 'Date'),
        ('AMOUNT_DEBIT', 'Montant débit'),
        ('AMOUNT_CREDIT', 'Montant crédit'),
        ('DESCRIPTION', 'Description/Libellé'),
        ('REFERENCE', 'Référence'),
        ('THIRD_PARTY_CODE', 'Code tiers'),
        ('THIRD_PARTY_NAME', 'Nom tiers'),
        ('CURRENCY', 'Devise'),
        ('JOURNAL_CODE', 'Code journal'),
        ('ANALYTICAL_CODE', 'Code analytique'),
        ('OTHER', 'Autre champ'),
    ]
    
    TRANSFORMATION_CHOICES = [
        ('NONE', 'Aucune'),
        ('UPPERCASE', 'Majuscules'),
        ('LOWERCASE', 'Minuscules'),
        ('TRIM', 'Suppression espaces'),
        ('DATE_FORMAT', 'Format date'),
        ('AMOUNT_FORMAT', 'Format montant'),
        ('ACCOUNT_MAPPING', 'Mapping compte'),
        ('REGEX_REPLACE', 'Remplacement regex'),
        ('CUSTOM_FUNCTION', 'Fonction personnalisée'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    import_session = models.ForeignKey(ImportSession, on_delete=models.CASCADE, related_name='mappings')
    
    # Mapping source → cible
    source_column = models.CharField(max_length=100, verbose_name="Colonne source")
    target_field = models.CharField(max_length=30, choices=FIELD_TYPE_CHOICES, verbose_name="Champ cible")
    
    # Configuration mapping
    is_required = models.BooleanField(default=False, verbose_name="Champ obligatoire")
    default_value = models.CharField(max_length=200, blank=True, verbose_name="Valeur par défaut")
    
    # Transformations
    transformations = models.JSONField(default=list, verbose_name="Transformations à appliquer")
    validation_rules = models.JSONField(default=dict, verbose_name="Règles de validation")
    
    # Statistiques mapping
    confidence_score = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
        verbose_name="Score confiance mapping IA (%)"
    )
    sample_values = models.JSONField(default=list, verbose_name="Échantillon valeurs détectées")
    
    # Statut
    is_active = models.BooleanField(default=True)
    mapping_errors = models.JSONField(default=list, verbose_name="Erreurs de mapping")
    
    class Meta:
        db_table = 'data_import_mappings'
        unique_together = [('import_session', 'source_column')]
        ordering = ['target_field', 'source_column']
        verbose_name = "Mapping import"
        verbose_name_plural = "Mappings import"
    
    def __str__(self):
        return f"{self.source_column} → {self.get_target_field_display()}"


class AccountMappingRule(TimeStampedModel):
    """
    Règles de mapping des comptes entre systèmes
    Intelligence pour conversion automatique
    """
    
    RULE_TYPE_CHOICES = [
        ('EXACT_MATCH', 'Correspondance exacte'),
        ('PREFIX_MATCH', 'Correspondance préfixe'),
        ('PATTERN_MATCH', 'Pattern/Regex'),
        ('RANGE_MATCH', 'Plage de comptes'),
        ('CONDITIONAL', 'Règle conditionnelle'),
        ('AI_SUGGESTION', 'Suggestion IA'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    source_config = models.ForeignKey(DataSourceConfiguration, on_delete=models.CASCADE, related_name='account_mapping_rules')
    
    # Règle de mapping
    rule_name = models.CharField(max_length=100, verbose_name="Nom de la règle")
    rule_type = models.CharField(max_length=20, choices=RULE_TYPE_CHOICES)
    
    # Pattern source
    source_account_pattern = models.CharField(max_length=100, verbose_name="Pattern compte source")
    source_account_regex = models.CharField(max_length=200, blank=True, verbose_name="Regex compte source")
    
    # Compte cible WiseBook
    target_account = models.ForeignKey(
        ChartOfAccounts, on_delete=models.CASCADE, null=True, blank=True,
        verbose_name="Compte cible WiseBook"
    )
    target_account_code = models.CharField(max_length=20, blank=True, verbose_name="Code compte cible")
    
    # Conditions additionnelles
    conditions = models.JSONField(default=dict, verbose_name="Conditions d'application")
    
    # Gestion des conflits
    priority = models.PositiveIntegerField(default=100, verbose_name="Priorité (1-1000)")
    conflict_resolution = models.CharField(max_length=20, choices=[
        ('FIRST_MATCH', 'Premier match'),
        ('BEST_SCORE', 'Meilleur score'),
        ('MANUAL_REVIEW', 'Révision manuelle'),
    ], default='BEST_SCORE')
    
    # Statistiques d'usage
    usage_count = models.PositiveIntegerField(default=0, editable=False)
    success_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=100, editable=False
    )
    
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'data_import_account_mapping_rules'
        unique_together = [('source_config', 'rule_name')]
        ordering = ['priority', 'rule_name']
        verbose_name = "Règle mapping compte"
        verbose_name_plural = "Règles mapping comptes"
    
    def __str__(self):
        return f"{self.rule_name}: {self.source_account_pattern} → {self.target_account_code}"


class ImportValidationError(TimeStampedModel):
    """
    Erreurs et avertissements détectés lors de l'import
    """
    
    ERROR_TYPE_CHOICES = [
        ('STRUCTURE', 'Erreur de structure'),
        ('MAPPING', 'Erreur de mapping'),
        ('VALIDATION', 'Erreur de validation'),
        ('BUSINESS', 'Erreur métier'),
        ('DATA', 'Erreur de données'),
        ('FORMAT', 'Erreur de format'),
    ]
    
    SEVERITY_CHOICES = [
        ('INFO', 'Information'),
        ('WARNING', 'Avertissement'),
        ('ERROR', 'Erreur'),
        ('CRITICAL', 'Erreur critique'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    import_session = models.ForeignKey(ImportSession, on_delete=models.CASCADE, related_name='validation_errors')
    
    # Classification erreur
    error_type = models.CharField(max_length=20, choices=ERROR_TYPE_CHOICES)
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES)
    
    # Localisation dans fichier
    row_number = models.PositiveIntegerField(verbose_name="Numéro de ligne")
    column_name = models.CharField(max_length=100, blank=True, verbose_name="Colonne concernée")
    
    # Description erreur
    error_code = models.CharField(max_length=50, verbose_name="Code erreur")
    error_message = models.TextField(verbose_name="Message d'erreur")
    
    # Données problématiques
    source_data = models.JSONField(default=dict, verbose_name="Données source")
    suggested_fix = models.TextField(blank=True, verbose_name="Correction suggérée")
    
    # Résolution
    is_resolved = models.BooleanField(default=False)
    resolution_action = models.CharField(max_length=20, choices=[
        ('IGNORE', 'Ignorer'),
        ('FIX_AUTO', 'Correction automatique'),
        ('FIX_MANUAL', 'Correction manuelle'),
        ('SKIP_ROW', 'Ignorer ligne'),
    ], blank=True)
    resolution_notes = models.TextField(blank=True)
    
    class Meta:
        db_table = 'data_import_validation_errors'
        indexes = [
            models.Index(fields=['import_session', 'severity']),
            models.Index(fields=['error_type', 'is_resolved']),
        ]
        ordering = ['-severity', 'row_number']
        verbose_name = "Erreur validation import"
        verbose_name_plural = "Erreurs validation import"
    
    def __str__(self):
        return f"Ligne {self.row_number}: {self.error_message}"


class MigrationTemplate(TimeStampedModel):
    """
    Templates de migration prédéfinis pour systèmes courants
    Accelerateurs pour Sage, SAP, etc.
    """
    
    TEMPLATE_TYPE_CHOICES = [
        ('SAGE_STANDARD', 'Sage Standard'),
        ('SAGE_EXPORT_FEC', 'Sage Export FEC'),
        ('SAP_STANDARD', 'SAP Standard Export'),
        ('EXCEL_GENERIC', 'Excel Générique'),
        ('CIEL_EXPORT', 'Ciel Export'),
        ('EBP_EXPORT', 'EBP Export'),
        ('CUSTOM', 'Template personnalisé'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Identification template
    template_name = models.CharField(max_length=100, verbose_name="Nom du template")
    template_type = models.CharField(max_length=20, choices=TEMPLATE_TYPE_CHOICES)
    description = models.TextField(verbose_name="Description")
    version = models.CharField(max_length=20, default="1.0")
    
    # Configuration pré-définie
    source_configuration = models.JSONField(verbose_name="Configuration source")
    field_mappings = models.JSONField(verbose_name="Mappings par défaut")
    account_mappings = models.JSONField(verbose_name="Correspondances comptes")
    validation_rules = models.JSONField(verbose_name="Règles validation")
    
    # Templates spécialisés Sage
    sage_chart_mapping = models.JSONField(default=dict, verbose_name="Mapping plan Sage → SYSCOHADA")
    sage_journal_mapping = models.JSONField(default=dict, verbose_name="Mapping journaux Sage")
    
    # Métadonnées
    is_public = models.BooleanField(default=True, verbose_name="Template public")
    usage_count = models.PositiveIntegerField(default=0, editable=False)
    success_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=100, editable=False
    )
    
    # Support et documentation
    documentation_url = models.URLField(blank=True, verbose_name="URL documentation")
    support_notes = models.TextField(blank=True, verbose_name="Notes support")
    
    class Meta:
        db_table = 'data_import_migration_templates'
        unique_together = [('template_name', 'version')]
        ordering = ['template_type', 'template_name']
        verbose_name = "Template de migration"
        verbose_name_plural = "Templates de migration"
    
    def __str__(self):
        return f"{self.template_name} v{self.version}"


class ImportPreview(TimeStampedModel):
    """
    Prévisualisation des données avant import final
    Permet validation utilisateur
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    import_session = models.OneToOneField(ImportSession, on_delete=models.CASCADE, related_name='preview')
    
    # Échantillon de données transformées
    sample_data = models.JSONField(verbose_name="Échantillon données transformées")
    sample_size = models.PositiveIntegerField(default=100, verbose_name="Taille échantillon")
    
    # Statistiques prévisualisation
    accounts_to_create = models.PositiveIntegerField(default=0, verbose_name="Comptes à créer")
    accounts_to_update = models.PositiveIntegerField(default=0, verbose_name="Comptes à mettre à jour")
    entries_to_create = models.PositiveIntegerField(default=0, verbose_name="Écritures à créer")
    third_parties_to_create = models.PositiveIntegerField(default=0, verbose_name="Tiers à créer")
    
    # Impact estimé
    estimated_processing_time = models.DurationField(verbose_name="Temps traitement estimé")
    estimated_disk_space = models.PositiveIntegerField(verbose_name="Espace disque estimé (MB)")
    
    # Validation utilisateur
    user_approved = models.BooleanField(default=False, verbose_name="Approuvé par utilisateur")
    approval_date = models.DateTimeField(null=True, blank=True)
    approval_notes = models.TextField(blank=True, verbose_name="Notes d'approbation")
    
    class Meta:
        db_table = 'data_import_previews'
        verbose_name = "Prévisualisation import"
        verbose_name_plural = "Prévisualisations import"
    
    def __str__(self):
        return f"Prévisualisation {self.import_session.session_name}"


class ImportResult(TimeStampedModel):
    """
    Résultats détaillés d'un import terminé
    Audit trail et métriques de succès
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    import_session = models.OneToOneField(ImportSession, on_delete=models.CASCADE, related_name='result')
    
    # Résultats par type d'objet
    accounts_created = models.PositiveIntegerField(default=0)
    accounts_updated = models.PositiveIntegerField(default=0)
    entries_created = models.PositiveIntegerField(default=0)
    entries_failed = models.PositiveIntegerField(default=0)
    third_parties_created = models.PositiveIntegerField(default=0)
    third_parties_updated = models.PositiveIntegerField(default=0)
    
    # Métriques qualité
    data_quality_score = models.DecimalField(
        max_digits=5, decimal_places=2, default=100,
        verbose_name="Score qualité données (%)"
    )
    business_rules_compliance = models.DecimalField(
        max_digits=5, decimal_places=2, default=100,
        verbose_name="Conformité règles métier (%)"
    )
    
    # Intégrité des données
    balance_verification = models.JSONField(default=dict, verbose_name="Vérification balances")
    referential_integrity = models.JSONField(default=dict, verbose_name="Intégrité référentielle")
    
    # Impact système
    database_size_impact = models.PositiveIntegerField(default=0, verbose_name="Impact taille DB (MB)")
    performance_impact = models.JSONField(default=dict, verbose_name="Impact performance")
    
    # Actions post-import
    post_import_actions = models.JSONField(default=list, verbose_name="Actions post-import")
    cleanup_required = models.BooleanField(default=False, verbose_name="Nettoyage requis")
    
    # Rollback
    rollback_possible = models.BooleanField(default=True, verbose_name="Rollback possible")
    rollback_data = models.JSONField(default=dict, verbose_name="Données pour rollback")
    
    class Meta:
        db_table = 'data_import_results'
        ordering = ['-created_at']
        verbose_name = "Résultat import"
        verbose_name_plural = "Résultats import"
    
    def __str__(self):
        return f"Résultat {self.import_session.session_name}"


class MigrationProject(TimeStampedModel):
    """
    Projet de migration globale multi-sessions
    Orchestration migration complète ERP → WiseBook
    """
    
    STATUS_CHOICES = [
        ('PLANNING', 'Planification'),
        ('IN_PROGRESS', 'En cours'),
        ('TESTING', 'Phase de test'),
        ('VALIDATION', 'Validation utilisateur'),
        ('COMPLETED', 'Terminée'),
        ('ROLLBACK', 'Rollback en cours'),
        ('FAILED', 'Échec'),
    ]
    
    MIGRATION_TYPE_CHOICES = [
        ('FULL_MIGRATION', 'Migration complète'),
        ('PARTIAL_MIGRATION', 'Migration partielle'),
        ('DATA_SYNC', 'Synchronisation données'),
        ('PILOT_TEST', 'Test pilote'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='migration_projects')
    
    # Informations projet
    project_name = models.CharField(max_length=200, verbose_name="Nom du projet")
    migration_type = models.CharField(max_length=20, choices=MIGRATION_TYPE_CHOICES)
    source_system = models.CharField(max_length=100, verbose_name="Système source")
    
    # Planning
    planned_start_date = models.DateField(verbose_name="Date début prévue")
    planned_end_date = models.DateField(verbose_name="Date fin prévue")
    actual_start_date = models.DateField(null=True, blank=True, verbose_name="Date début réelle")
    actual_end_date = models.DateField(null=True, blank=True, verbose_name="Date fin réelle")
    
    # Configuration migration
    migration_scope = models.JSONField(default=list, verbose_name="Périmètre migration")
    cutoff_date = models.DateField(verbose_name="Date de coupure")
    
    # Statut et progression
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PLANNING')
    overall_progress = models.PositiveIntegerField(default=0, verbose_name="Progression globale (%)")
    
    # Équipe projet
    project_manager = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True)
    technical_lead = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='led_migrations'
    )
    business_users = models.ManyToManyField('auth.User', blank=True, related_name='participated_migrations')
    
    # Risques et contingences
    identified_risks = models.JSONField(default=list, verbose_name="Risques identifiés")
    mitigation_plans = models.JSONField(default=list, verbose_name="Plans de mitigation")
    
    # Communication
    stakeholder_notifications = models.JSONField(default=dict, verbose_name="Notifications parties prenantes")
    
    class Meta:
        db_table = 'data_import_migration_projects'
        ordering = ['-created_at']
        verbose_name = "Projet de migration"
        verbose_name_plural = "Projets de migration"
    
    def __str__(self):
        return f"{self.project_name} - {self.get_status_display()}"


class DataTransformationLog(TimeStampedModel):
    """
    Log détaillé des transformations appliquées
    Audit trail complet pour traçabilité
    """
    
    ACTION_CHOICES = [
        ('PARSE', 'Analyse fichier'),
        ('MAP', 'Mapping champ'),
        ('TRANSFORM', 'Transformation donnée'),
        ('VALIDATE', 'Validation'),
        ('CREATE', 'Création objet'),
        ('UPDATE', 'Mise à jour objet'),
        ('ERROR', 'Erreur traitement'),
        ('SKIP', 'Ligne ignorée'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    import_session = models.ForeignKey(ImportSession, on_delete=models.CASCADE, related_name='transformation_logs')
    
    # Action et contexte
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    step_name = models.CharField(max_length=100, verbose_name="Nom de l'étape")
    
    # Localisation
    source_row = models.PositiveIntegerField(verbose_name="Ligne source")
    target_object_type = models.CharField(max_length=50, blank=True, verbose_name="Type objet cible")
    target_object_id = models.UUIDField(null=True, blank=True, verbose_name="ID objet créé")
    
    # Données transformation
    input_data = models.JSONField(default=dict, verbose_name="Données entrée")
    output_data = models.JSONField(default=dict, verbose_name="Données sortie")
    transformation_rules = models.JSONField(default=list, verbose_name="Règles appliquées")
    
    # Performance
    processing_time_ms = models.PositiveIntegerField(default=0, verbose_name="Temps traitement (ms)")
    
    # Messages
    log_message = models.TextField(blank=True, verbose_name="Message log")
    warnings = models.JSONField(default=list, verbose_name="Avertissements")
    
    class Meta:
        db_table = 'data_import_transformation_logs'
        indexes = [
            models.Index(fields=['import_session', 'action', '-created_at']),
            models.Index(fields=['target_object_type', 'target_object_id']),
        ]
        ordering = ['source_row', 'created_at']
        verbose_name = "Log transformation"
        verbose_name_plural = "Logs transformation"
    
    def __str__(self):
        return f"{self.action} - Ligne {self.source_row}"