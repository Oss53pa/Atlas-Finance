from django.db import models
from django.utils import timezone
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey
import json

from apps.core.models import Societe, AuditMixin
from apps.security.models import Utilisateur


class SystemHealth(models.Model):
    """État de santé du système."""
    
    COMPONENT_CHOICES = [
        ('database', 'Base de données'),
        ('cache', 'Cache Redis'),
        ('celery', 'Celery Workers'),
        ('storage', 'Stockage'),
        ('api_external', 'APIs externes'),
        ('banking', 'Connexions bancaires'),
        ('fiscal', 'APIs fiscales'),
    ]
    
    STATUS_CHOICES = [
        ('healthy', 'Sain'),
        ('warning', 'Attention'),
        ('critical', 'Critique'),
        ('down', 'Indisponible'),
    ]
    
    component = models.CharField(max_length=50, choices=COMPONENT_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    
    # Métriques
    response_time = models.FloatField(null=True, blank=True)  # en ms
    cpu_usage = models.FloatField(null=True, blank=True)  # en %
    memory_usage = models.FloatField(null=True, blank=True)  # en %
    disk_usage = models.FloatField(null=True, blank=True)  # en %
    
    # Détails
    message = models.TextField(blank=True)
    details = models.JSONField(default=dict)
    
    # Métadonnées
    timestamp = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'wisebook_system_health'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['component', 'timestamp']),
            models.Index(fields=['status', 'timestamp']),
        ]
    
    def __str__(self):
        return f"{self.get_component_display()} - {self.get_status_display()}"


class SystemMetrics(models.Model):
    """Métriques système."""
    
    METRIC_TYPES = [
        ('performance', 'Performance'),
        ('usage', 'Utilisation'),
        ('business', 'Métiers'),
        ('security', 'Sécurité'),
    ]
    
    name = models.CharField(max_length=100)
    type_metric = models.CharField(max_length=20, choices=METRIC_TYPES)
    value = models.FloatField()
    unit = models.CharField(max_length=20, blank=True)  # ms, %, count, etc.
    
    # Contexte
    societe = models.ForeignKey(
        Societe,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='metrics'
    )
    
    # Métadonnées
    timestamp = models.DateTimeField(default=timezone.now)
    metadata = models.JSONField(default=dict)
    
    class Meta:
        db_table = 'wisebook_system_metrics'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['name', 'timestamp']),
            models.Index(fields=['type_metric', 'timestamp']),
            models.Index(fields=['societe', 'timestamp']),
        ]
    
    def __str__(self):
        return f"{self.name}: {self.value} {self.unit}"


class MaintenanceTask(AuditMixin):
    """Tâches de maintenance système."""
    
    TYPE_CHOICES = [
        ('backup', 'Sauvegarde'),
        ('cleanup', 'Nettoyage'),
        ('optimization', 'Optimisation'),
        ('update', 'Mise à jour'),
        ('migration', 'Migration'),
        ('security', 'Sécurité'),
        ('custom', 'Personnalisée'),
    ]
    
    STATUS_CHOICES = [
        ('scheduled', 'Planifiée'),
        ('running', 'En cours'),
        ('completed', 'Terminée'),
        ('failed', 'Échec'),
        ('cancelled', 'Annulée'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Basse'),
        ('medium', 'Moyenne'),
        ('high', 'Haute'),
        ('critical', 'Critique'),
    ]
    
    nom = models.CharField(max_length=200)
    description = models.TextField()
    type_task = models.CharField(max_length=20, choices=TYPE_CHOICES)
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    
    # Planification
    scheduled_for = models.DateTimeField()
    estimated_duration = models.DurationField(null=True, blank=True)
    
    # Exécution
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Résultats
    success_message = models.TextField(blank=True)
    error_message = models.TextField(blank=True)
    logs = models.TextField(blank=True)
    
    # Configuration
    parameters = models.JSONField(default=dict)
    script_path = models.CharField(max_length=500, blank=True)
    
    # Responsable
    assigned_to = models.ForeignKey(
        Utilisateur,
        on_delete=models.SET_NULL,
        null=True,
        related_name='maintenance_tasks'
    )
    
    class Meta:
        db_table = 'wisebook_maintenance_tasks'
        ordering = ['-scheduled_for']
        indexes = [
            models.Index(fields=['status', 'scheduled_for']),
            models.Index(fields=['type_task', 'priority']),
        ]
    
    def __str__(self):
        return f"{self.nom} ({self.get_status_display()})"
    
    def get_duration(self):
        """Calcule la durée d'exécution."""
        if self.started_at and self.completed_at:
            return self.completed_at - self.started_at
        return None
    
    def is_overdue(self):
        """Vérifie si la tâche est en retard."""
        return (
            self.status == 'scheduled' and 
            self.scheduled_for < timezone.now()
        )


class DatabaseBackup(AuditMixin):
    """Sauvegardes de base de données."""
    
    TYPE_CHOICES = [
        ('full', 'Complète'),
        ('incremental', 'Incrémentale'),
        ('differential', 'Différentielle'),
    ]
    
    STATUS_CHOICES = [
        ('running', 'En cours'),
        ('completed', 'Terminée'),
        ('failed', 'Échec'),
    ]
    
    nom = models.CharField(max_length=200)
    type_backup = models.CharField(max_length=20, choices=TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    
    # Fichier
    file_path = models.CharField(max_length=1000)
    file_size = models.BigIntegerField(null=True, blank=True)  # en bytes
    compressed = models.BooleanField(default=True)
    
    # Timing
    started_at = models.DateTimeField()
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Détails
    tables_count = models.PositiveIntegerField(default=0)
    records_count = models.BigIntegerField(default=0)
    
    # Résultats
    success = models.BooleanField(default=False)
    error_message = models.TextField(blank=True)
    
    # Métadonnées
    checksum = models.CharField(max_length=64, blank=True)  # SHA256
    metadata = models.JSONField(default=dict)
    
    class Meta:
        db_table = 'wisebook_database_backups'
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['type_backup', 'started_at']),
            models.Index(fields=['status', 'success']),
        ]
    
    def __str__(self):
        return f"{self.nom} - {self.started_at.strftime('%Y-%m-%d %H:%M')}"
    
    def get_file_size_mb(self):
        """Retourne la taille du fichier en MB."""
        return self.file_size / (1024 * 1024) if self.file_size else 0
    
    def get_duration(self):
        """Calcule la durée de la sauvegarde."""
        if self.started_at and self.completed_at:
            return self.completed_at - self.started_at
        return None


class SystemAlert(AuditMixin):
    """Alertes système."""
    
    SEVERITY_CHOICES = [
        ('info', 'Information'),
        ('warning', 'Attention'),
        ('error', 'Erreur'),
        ('critical', 'Critique'),
    ]
    
    STATUS_CHOICES = [
        ('new', 'Nouvelle'),
        ('acknowledged', 'Accusée'),
        ('investigating', 'En cours'),
        ('resolved', 'Résolue'),
        ('closed', 'Fermée'),
    ]
    
    titre = models.CharField(max_length=200)
    description = models.TextField()
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    
    # Source
    component = models.CharField(max_length=100)
    source_ip = models.GenericIPAddressField(null=True, blank=True)
    
    # Contexte
    societe = models.ForeignKey(
        Societe,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='system_alerts'
    )
    utilisateur = models.ForeignKey(
        Utilisateur,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='triggered_alerts'
    )
    
    # Métadonnées
    metadata = models.JSONField(default=dict)
    
    # Gestion
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    acknowledged_by = models.ForeignKey(
        Utilisateur,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='acknowledged_alerts'
    )
    
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(
        Utilisateur,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='resolved_alerts'
    )
    
    resolution_notes = models.TextField(blank=True)
    
    class Meta:
        db_table = 'wisebook_system_alerts'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['severity', 'status']),
            models.Index(fields=['component', 'created_at']),
            models.Index(fields=['societe', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.get_severity_display()}: {self.titre}"
    
    def get_age(self):
        """Retourne l'âge de l'alerte."""
        return timezone.now() - self.created_at
    
    def is_critical_old(self):
        """Vérifie si l'alerte critique est ancienne (> 1h)."""
        return (
            self.severity == 'critical' and
            self.status in ['new', 'acknowledged'] and
            self.get_age().total_seconds() > 3600
        )


class UserActivity(models.Model):
    """Activité des utilisateurs pour l'administration."""
    
    ACTION_CHOICES = [
        ('login', 'Connexion'),
        ('logout', 'Déconnexion'),
        ('view', 'Consultation'),
        ('create', 'Création'),
        ('update', 'Modification'),
        ('delete', 'Suppression'),
        ('export', 'Export'),
        ('import', 'Import'),
        ('config_change', 'Changement config'),
    ]
    
    utilisateur = models.ForeignKey(
        Utilisateur,
        on_delete=models.CASCADE,
        related_name='activity_logs'
    )
    
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    
    # Objet concerné
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    object_id = models.PositiveIntegerField(null=True, blank=True)
    content_object = GenericForeignKey('content_type', 'object_id')
    object_repr = models.CharField(max_length=200, blank=True)
    
    # Contexte
    timestamp = models.DateTimeField(default=timezone.now)
    session_key = models.CharField(max_length=40, blank=True)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    
    # Détails
    changes = models.JSONField(default=dict, blank=True)  # Ancienne/nouvelle valeur
    extra_data = models.JSONField(default=dict, blank=True)
    
    class Meta:
        db_table = 'wisebook_user_activity'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['utilisateur', 'timestamp']),
            models.Index(fields=['action', 'timestamp']),
            models.Index(fields=['content_type', 'timestamp']),
        ]
    
    def __str__(self):
        return f"{self.utilisateur.email} - {self.get_action_display()} - {self.timestamp}"


class SystemConfiguration(AuditMixin):
    """Configuration système avancée."""
    
    CATEGORY_CHOICES = [
        ('performance', 'Performance'),
        ('security', 'Sécurité'),
        ('logging', 'Journalisation'),
        ('integration', 'Intégrations'),
        ('maintenance', 'Maintenance'),
        ('monitoring', 'Monitoring'),
    ]
    
    key = models.CharField(max_length=100, unique=True)
    value = models.TextField()
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    
    description = models.TextField()
    data_type = models.CharField(
        max_length=20,
        choices=[
            ('string', 'Chaîne'),
            ('integer', 'Entier'),
            ('float', 'Décimal'),
            ('boolean', 'Booléen'),
            ('json', 'JSON'),
        ],
        default='string'
    )
    
    # Sécurité
    sensitive = models.BooleanField(default=False)  # Valeur sensible (masquée)
    editable = models.BooleanField(default=True)
    
    # Validation
    min_value = models.FloatField(null=True, blank=True)
    max_value = models.FloatField(null=True, blank=True)
    allowed_values = models.JSONField(default=list, blank=True)
    
    class Meta:
        db_table = 'wisebook_system_configuration'
        ordering = ['category', 'key']
        indexes = [
            models.Index(fields=['category']),
            models.Index(fields=['editable']),
        ]
    
    def __str__(self):
        return f"{self.key} ({self.get_category_display()})"
    
    def get_typed_value(self):
        """Retourne la valeur typée."""
        if self.data_type == 'boolean':
            return self.value.lower() in ['true', '1', 'yes']
        elif self.data_type == 'integer':
            return int(self.value)
        elif self.data_type == 'float':
            return float(self.value)
        elif self.data_type == 'json':
            return json.loads(self.value)
        else:
            return self.value
    
    def set_typed_value(self, value):
        """Définit la valeur typée."""
        if self.data_type == 'json':
            self.value = json.dumps(value)
        else:
            self.value = str(value)


class LicenseInfo(models.Model):
    """Informations de licence WiseBook."""
    
    TYPE_CHOICES = [
        ('trial', 'Essai'),
        ('starter', 'Starter'),
        ('professional', 'Professionnel'),
        ('enterprise', 'Entreprise'),
        ('custom', 'Personnalisée'),
    ]
    
    societe = models.OneToOneField(
        Societe,
        on_delete=models.CASCADE,
        related_name='license'
    )
    
    # Licence
    license_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    license_key = models.CharField(max_length=255, unique=True)
    
    # Validité
    valid_from = models.DateField()
    valid_until = models.DateField()
    is_active = models.BooleanField(default=True)
    
    # Limites
    max_users = models.PositiveIntegerField(default=5)
    max_companies = models.PositiveIntegerField(default=1)
    max_transactions_per_month = models.PositiveIntegerField(default=1000)
    
    # Modules autorisés
    modules_enabled = models.JSONField(default=list)
    features_enabled = models.JSONField(default=list)
    
    # Support
    support_level = models.CharField(
        max_length=20,
        choices=[
            ('community', 'Communauté'),
            ('email', 'Email'),
            ('priority', 'Prioritaire'),
            ('dedicated', 'Dédié'),
        ],
        default='community'
    )
    
    # Métadonnées
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'wisebook_license_info'
        ordering = ['societe__nom']
    
    def __str__(self):
        return f"{self.societe.nom} - {self.get_license_type_display()}"
    
    def is_expired(self):
        """Vérifie si la licence est expirée."""
        from datetime import date
        return date.today() > self.valid_until
    
    def days_remaining(self):
        """Jours restants avant expiration."""
        from datetime import date
        if self.is_expired():
            return 0
        return (self.valid_until - date.today()).days
    
    def is_module_enabled(self, module_name):
        """Vérifie si un module est autorisé."""
        return module_name in self.modules_enabled
    
    def is_feature_enabled(self, feature_name):
        """Vérifie si une fonctionnalité est autorisée."""
        return feature_name in self.features_enabled