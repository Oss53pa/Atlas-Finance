"""
Modèles pour le module Workspaces WiseBook ERP V3.0
Gestion des espaces de travail personnalisés par rôle
"""
from django.db import models
from django.conf import settings
from apps.core.models import BaseModel
import uuid


class WorkspaceRole(models.TextChoices):
    """Rôles disponibles pour les workspaces"""
    ADMIN = 'admin', 'Administrateur'
    MANAGER = 'manager', 'Manager'
    COMPTABLE = 'comptable', 'Comptable'
    CONTROLLER = 'controller', 'Contrôleur'
    VIEWER = 'viewer', 'Visualiseur'


class Workspace(BaseModel):
    """Configuration d'un workspace par rôle"""

    role = models.CharField(
        max_length=20,
        choices=WorkspaceRole.choices,
        unique=True,
        db_index=True
    )
    name = models.CharField(max_length=100)
    description = models.TextField()
    icon = models.CharField(max_length=50, default='Briefcase')
    color = models.CharField(max_length=7, default='#6A8A82')
    is_active = models.BooleanField(default=True)
    order = models.IntegerField(default=0)

    class Meta:
        db_table = 'workspaces'
        verbose_name = 'Workspace'
        verbose_name_plural = 'Workspaces'
        ordering = ['order', 'name']

    def __str__(self):
        return f"{self.name} ({self.get_role_display()})"


class WorkspaceWidget(BaseModel):
    """Widgets/Raccourcis disponibles dans un workspace"""

    WIDGET_TYPES = [
        ('stat', 'Statistique'),
        ('chart', 'Graphique'),
        ('list', 'Liste'),
        ('action', 'Action rapide'),
        ('link', 'Lien rapide'),
        ('notification', 'Notification'),
    ]

    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name='widgets'
    )

    widget_type = models.CharField(max_length=20, choices=WIDGET_TYPES)
    title = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, default='Square')
    color = models.CharField(max_length=7, default='#6A8A82')

    # Configuration du widget (JSON)
    config = models.JSONField(default=dict, blank=True)

    # URL ou action
    url = models.CharField(max_length=255, blank=True)
    api_endpoint = models.CharField(max_length=255, blank=True)

    # Position et affichage
    order = models.IntegerField(default=0)
    width = models.IntegerField(default=1)  # Largeur en colonnes (1-4)
    height = models.IntegerField(default=1)  # Hauteur en lignes
    is_visible = models.BooleanField(default=True)
    is_required = models.BooleanField(default=False)  # Ne peut pas être caché

    class Meta:
        db_table = 'workspace_widgets'
        verbose_name = 'Widget Workspace'
        verbose_name_plural = 'Widgets Workspace'
        ordering = ['workspace', 'order']
        indexes = [
            models.Index(fields=['workspace', 'order']),
        ]

    def __str__(self):
        return f"{self.title} - {self.workspace.name}"


class UserWorkspacePreference(BaseModel):
    """Préférences utilisateur pour son workspace"""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='workspace_preferences'
    )

    default_workspace = models.ForeignKey(
        Workspace,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='users_default'
    )

    # Widgets masqués par l'utilisateur (liste d'IDs)
    hidden_widgets = models.JSONField(default=list, blank=True)

    # Ordre personnalisé des widgets
    custom_widget_order = models.JSONField(default=dict, blank=True)

    # Layout personnalisé
    custom_layout = models.JSONField(default=dict, blank=True)

    # Paramètres d'affichage
    show_welcome_message = models.BooleanField(default=True)
    compact_mode = models.BooleanField(default=False)

    class Meta:
        db_table = 'user_workspace_preferences'
        verbose_name = 'Préférence Workspace Utilisateur'
        verbose_name_plural = 'Préférences Workspace Utilisateur'

    def __str__(self):
        return f"Préférences de {self.user.username}"


class WorkspaceStatistic(BaseModel):
    """Statistiques pré-calculées pour les dashboards workspace"""

    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name='statistics'
    )

    stat_key = models.CharField(max_length=100, db_index=True)
    stat_label = models.CharField(max_length=100)
    stat_value = models.CharField(max_length=255)
    stat_type = models.CharField(
        max_length=20,
        choices=[
            ('number', 'Nombre'),
            ('currency', 'Montant'),
            ('percentage', 'Pourcentage'),
            ('text', 'Texte'),
        ],
        default='number'
    )

    # Variation/tendance
    trend = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    trend_direction = models.CharField(
        max_length=10,
        choices=[('up', 'Hausse'), ('down', 'Baisse'), ('stable', 'Stable')],
        null=True,
        blank=True
    )

    # Comparaison avec objectif
    target_value = models.CharField(max_length=255, blank=True)
    progress = models.IntegerField(null=True, blank=True)

    # Données additionnelles
    metadata = models.JSONField(default=dict, blank=True)

    # Cache
    cache_duration = models.IntegerField(default=300)  # 5 minutes par défaut
    last_calculated = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'workspace_statistics'
        verbose_name = 'Statistique Workspace'
        verbose_name_plural = 'Statistiques Workspace'
        unique_together = ['workspace', 'stat_key']
        indexes = [
            models.Index(fields=['workspace', 'stat_key']),
            models.Index(fields=['last_calculated']),
        ]

    def __str__(self):
        return f"{self.stat_label} - {self.workspace.name}"


class WorkspaceQuickAction(BaseModel):
    """Actions rapides disponibles dans un workspace"""

    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name='quick_actions'
    )

    label = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, default='Zap')
    color = models.CharField(max_length=7, default='#6A8A82')

    # Action
    action_type = models.CharField(
        max_length=20,
        choices=[
            ('navigate', 'Navigation'),
            ('modal', 'Ouvrir modal'),
            ('api_call', 'Appel API'),
            ('external', 'Lien externe'),
        ]
    )
    action_target = models.CharField(max_length=255)

    # Permissions requises
    required_permission = models.CharField(max_length=100, blank=True)

    # Position
    order = models.IntegerField(default=0)
    is_visible = models.BooleanField(default=True)

    # Badge (ex: nombre d'items en attente)
    show_badge = models.BooleanField(default=False)
    badge_api_endpoint = models.CharField(max_length=255, blank=True)

    class Meta:
        db_table = 'workspace_quick_actions'
        verbose_name = 'Action Rapide Workspace'
        verbose_name_plural = 'Actions Rapides Workspace'
        ordering = ['workspace', 'order']

    def __str__(self):
        return f"{self.label} - {self.workspace.name}"