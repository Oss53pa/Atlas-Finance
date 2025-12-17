"""
Dashboard Models

Modèles pour le système de notifications et d'exports du dashboard.
"""
import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from apps.core.models import TimeStampedModel


class Notification(TimeStampedModel):
    """
    Notifications système pour les utilisateurs
    Gère les alertes, avertissements et informations critiques
    """

    SEVERITY_CHOICES = [
        ('info', 'Information'),
        ('low', 'Faible'),
        ('medium', 'Moyen'),
        ('high', 'Élevé'),
        ('critical', 'Critique'),
    ]

    CATEGORY_CHOICES = [
        ('treasury', 'Trésorerie'),
        ('receivables', 'Créances'),
        ('payables', 'Dettes'),
        ('accounting', 'Comptabilité'),
        ('tax', 'Fiscalité'),
        ('system', 'Système'),
    ]

    NOTIFICATION_TYPE_CHOICES = [
        ('alert', 'Alerte'),
        ('warning', 'Avertissement'),
        ('info', 'Information'),
        ('success', 'Succès'),
    ]

    STATUS_CHOICES = [
        ('new', 'Nouveau'),
        ('read', 'Lu'),
        ('archived', 'Archivé'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='dashboard_notifications',
        verbose_name='Utilisateur'
    )
    company = models.ForeignKey(
        'core.Societe',
        on_delete=models.CASCADE,
        related_name='dashboard_notifications',
        verbose_name='Société'
    )

    # Contenu de la notification
    title = models.CharField(max_length=200, verbose_name='Titre')
    message = models.TextField(verbose_name='Message')
    severity = models.CharField(
        max_length=10,
        choices=SEVERITY_CHOICES,
        default='info',
        verbose_name='Sévérité'
    )
    category = models.CharField(
        max_length=20,
        choices=CATEGORY_CHOICES,
        verbose_name='Catégorie'
    )
    notification_type = models.CharField(
        max_length=10,
        choices=NOTIFICATION_TYPE_CHOICES,
        default='info',
        verbose_name='Type'
    )

    # Statut et suivi
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default='new',
        verbose_name='Statut'
    )
    is_read = models.BooleanField(default=False, verbose_name='Lu')
    read_at = models.DateTimeField(null=True, blank=True, verbose_name='Lu le')
    is_archived = models.BooleanField(default=False, verbose_name='Archivé')
    archived_at = models.DateTimeField(null=True, blank=True, verbose_name='Archivé le')

    # Métadonnées et actions
    metadata = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Métadonnées',
        help_text='Données supplémentaires (métriques, seuils, etc.)'
    )
    action_url = models.CharField(
        max_length=500,
        blank=True,
        verbose_name='URL d\'action',
        help_text='Lien vers la page concernée'
    )

    class Meta:
        db_table = 'dashboard_notifications'
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status', '-created_at']),
            models.Index(fields=['company', 'severity', '-created_at']),
            models.Index(fields=['category', 'is_read']),
        ]

    def __str__(self):
        return f"{self.title} - {self.user.username} ({self.get_severity_display()})"

    def mark_as_read(self):
        """Marque la notification comme lue"""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.status = 'read'
            self.save(update_fields=['is_read', 'read_at', 'status', 'updated_at'])

    def archive(self):
        """Archive la notification"""
        if not self.is_archived:
            self.is_archived = True
            self.archived_at = timezone.now()
            self.status = 'archived'
            self.save(update_fields=['is_archived', 'archived_at', 'status', 'updated_at'])


class DashboardExport(TimeStampedModel):
    """
    Exports de données du dashboard (PDF, Excel, CSV)
    Stocke les fichiers générés et leur métadonnées
    """

    EXPORT_TYPE_CHOICES = [
        ('pdf', 'PDF'),
        ('excel', 'Excel'),
        ('csv', 'CSV'),
    ]

    EXPORT_STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('processing', 'En cours'),
        ('completed', 'Terminé'),
        ('failed', 'Échoué'),
        ('expired', 'Expiré'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='dashboard_exports',
        verbose_name='Utilisateur'
    )
    company = models.ForeignKey(
        'core.Societe',
        on_delete=models.CASCADE,
        related_name='dashboard_exports',
        verbose_name='Société'
    )

    # Type et fichier
    export_type = models.CharField(
        max_length=10,
        choices=EXPORT_TYPE_CHOICES,
        verbose_name='Type d\'export'
    )
    file = models.FileField(
        upload_to='exports/dashboard/%Y/%m/',
        blank=True,
        null=True,
        verbose_name='Fichier'
    )
    file_name = models.CharField(
        max_length=255,
        blank=True,
        verbose_name='Nom du fichier'
    )
    file_size = models.BigIntegerField(
        default=0,
        verbose_name='Taille (octets)'
    )

    # Statut
    status = models.CharField(
        max_length=20,
        choices=EXPORT_STATUS_CHOICES,
        default='pending',
        verbose_name='Statut'
    )
    error_message = models.TextField(
        blank=True,
        verbose_name='Message d\'erreur'
    )

    # Métadonnées
    filters = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='Filtres appliqués',
        help_text='Paramètres et filtres utilisés pour l\'export'
    )
    download_count = models.IntegerField(
        default=0,
        verbose_name='Nombre de téléchargements'
    )

    class Meta:
        db_table = 'dashboard_exports'
        verbose_name = 'Export Dashboard'
        verbose_name_plural = 'Exports Dashboard'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status', '-created_at']),
            models.Index(fields=['company', 'export_type', '-created_at']),
        ]

    def __str__(self):
        return f"{self.get_export_type_display()} - {self.user.username} ({self.status})"

    def mark_as_completed(self, file_path, file_size):
        """Marque l'export comme terminé"""
        self.status = 'completed'
        self.file = file_path
        self.file_size = file_size
        self.save(update_fields=['status', 'file', 'file_size', 'updated_at'])

    def mark_as_failed(self, error_message):
        """Marque l'export comme échoué"""
        self.status = 'failed'
        self.error_message = error_message
        self.save(update_fields=['status', 'error_message', 'updated_at'])
