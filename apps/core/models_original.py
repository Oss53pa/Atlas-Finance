"""
Core models for WiseBook application.
"""
import uuid
from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils.translation import gettext_lazy as _


class TimeStampedModel(models.Model):
    """Abstract model with created_at and updated_at fields."""
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        abstract = True


class UUIDModel(models.Model):
    """Abstract model with UUID primary key."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    class Meta:
        abstract = True


class BaseModel(UUIDModel, TimeStampedModel):
    """Base model with UUID, timestamps, and common fields."""
    created_by = models.ForeignKey(
        'authentication.User',
        on_delete=models.PROTECT,
        related_name='%(class)s_created',
        null=True,
        blank=True
    )
    updated_by = models.ForeignKey(
        'authentication.User',
        on_delete=models.PROTECT,
        related_name='%(class)s_updated',
        null=True,
        blank=True
    )
    is_active = models.BooleanField(default=True)
    
    class Meta:
        abstract = True


class Societe(BaseModel):
    """Company/Entity model for multi-tenant support."""
    
    FORMES_JURIDIQUES = [
        ('SA', 'Société Anonyme'),
        ('SARL', 'Société à Responsabilité Limitée'),
        ('SAS', 'Société par Actions Simplifiée'),
        ('EI', 'Entreprise Individuelle'),
        ('ASSOCIATION', 'Association'),
        ('AUTRE', 'Autre'),
    ]
    
    # Basic information
    code = models.CharField(max_length=10, unique=True)
    raison_sociale = models.CharField(max_length=255)
    nom_commercial = models.CharField(max_length=255, blank=True)
    forme_juridique = models.CharField(max_length=20, choices=FORMES_JURIDIQUES)
    
    # Legal identifiers
    rccm = models.CharField(max_length=50, unique=True, null=True, blank=True)
    nif = models.CharField(max_length=50, unique=True, null=True, blank=True)
    niu = models.CharField(max_length=50, blank=True)
    
    # Financial info
    capital = models.DecimalField(max_digits=20, decimal_places=2, null=True, blank=True)
    devise_principale = models.ForeignKey(
        'Devise',
        on_delete=models.PROTECT,
        related_name='societes_principales'
    )
    
    # Contact information
    adresse = models.TextField()
    telephone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    site_web = models.URLField(blank=True)
    
    # Business information
    secteur_activite = models.CharField(max_length=100)
    effectif = models.IntegerField(null=True, blank=True)
    
    # Logo
    logo = models.ImageField(upload_to='logos/', blank=True, null=True)
    
    # Parent company for consolidation
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='filiales'
    )
    
    class Meta:
        db_table = 'societes'
        verbose_name = 'Société'
        verbose_name_plural = 'Sociétés'
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['rccm']),
            models.Index(fields=['nif']),
        ]
    
    def __str__(self):
        return f"{self.code} - {self.raison_sociale}"


class Devise(BaseModel):
    """Currency model."""
    code = models.CharField(max_length=3, unique=True)  # XAF, EUR, USD
    libelle = models.CharField(max_length=50)
    symbole = models.CharField(max_length=5)
    decimales = models.IntegerField(
        default=2,
        validators=[MinValueValidator(0), MaxValueValidator(6)]
    )
    
    # Configuration
    taux_fixe = models.BooleanField(default=False)
    taux_fixe_valeur = models.DecimalField(
        max_digits=20,
        decimal_places=10,
        null=True,
        blank=True
    )
    
    class Meta:
        db_table = 'devises'
        verbose_name = 'Devise'
        verbose_name_plural = 'Devises'
    
    def __str__(self):
        return f"{self.code} - {self.libelle}"


class CoursDevise(BaseModel):
    """Exchange rates model."""
    devise = models.ForeignKey(Devise, on_delete=models.CASCADE, related_name='cours')
    date_cours = models.DateField(db_index=True)
    
    # Exchange rates
    taux_achat = models.DecimalField(max_digits=20, decimal_places=10)
    taux_vente = models.DecimalField(max_digits=20, decimal_places=10)
    taux_moyen = models.DecimalField(max_digits=20, decimal_places=10)
    
    # Source of the rate
    source = models.CharField(max_length=50, default='MANUAL')
    
    class Meta:
        db_table = 'cours_devises'
        unique_together = ['devise', 'date_cours']
        indexes = [
            models.Index(fields=['devise', '-date_cours']),
            models.Index(fields=['date_cours']),
        ]
        ordering = ['-date_cours']
    
    def __str__(self):
        return f"{self.devise.code} - {self.date_cours} - {self.taux_moyen}"


class Exercice(BaseModel):
    """Fiscal year model."""
    societe = models.ForeignKey(Societe, on_delete=models.CASCADE, related_name='exercices')
    code = models.CharField(max_length=10)
    libelle = models.CharField(max_length=100)
    
    date_debut = models.DateField()
    date_fin = models.DateField()
    
    # Status
    statut = models.CharField(
        max_length=20,
        choices=[
            ('OUVERT', 'Ouvert'),
            ('CLOTURE', 'Clôturé'),
            ('ARCHIVE', 'Archivé'),
        ],
        default='OUVERT'
    )
    
    date_cloture = models.DateTimeField(null=True, blank=True)
    cloture_par = models.ForeignKey(
        'authentication.User',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='exercices_clotures'
    )
    
    class Meta:
        db_table = 'exercices'
        unique_together = ['societe', 'code']
        indexes = [
            models.Index(fields=['societe', 'statut']),
            models.Index(fields=['date_debut', 'date_fin']),
        ]
        ordering = ['-date_debut']
    
    def __str__(self):
        return f"{self.societe.code} - {self.code}"
    
    @property
    def is_current(self):
        """Check if this is the current fiscal year."""
        from django.utils import timezone
        today = timezone.now().date()
        return self.date_debut <= today <= self.date_fin


class Periode(BaseModel):
    """Accounting period model."""
    exercice = models.ForeignKey(Exercice, on_delete=models.CASCADE, related_name='periodes')
    code = models.CharField(max_length=10)
    libelle = models.CharField(max_length=100)
    
    date_debut = models.DateField()
    date_fin = models.DateField()
    
    # Status
    statut = models.CharField(
        max_length=20,
        choices=[
            ('OUVERT', 'Ouvert'),
            ('CLOTURE', 'Clôturé'),
        ],
        default='OUVERT'
    )
    
    date_cloture = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'periodes'
        unique_together = ['exercice', 'code']
        indexes = [
            models.Index(fields=['exercice', 'statut']),
            models.Index(fields=['date_debut', 'date_fin']),
        ]
        ordering = ['date_debut']
    
    def __str__(self):
        return f"{self.exercice.code} - {self.code}"


class AuditLog(BaseModel):
    """Audit log for tracking all user actions."""
    
    ACTION_CHOICES = [
        ('CREATE', 'Création'),
        ('UPDATE', 'Modification'),
        ('DELETE', 'Suppression'),
        ('LOGIN', 'Connexion'),
        ('LOGOUT', 'Déconnexion'),
        ('VIEW', 'Consultation'),
        ('EXPORT', 'Export'),
        ('PRINT', 'Impression'),
        ('APPROVE', 'Approbation'),
        ('REJECT', 'Rejet'),
        ('VALIDATE', 'Validation'),
        ('CLOSE', 'Clôture'),
        ('OPEN', 'Ouverture'),
    ]
    
    # User and session info
    user = models.ForeignKey(
        'authentication.User',
        on_delete=models.PROTECT,
        null=True,
        blank=True
    )
    session_id = models.CharField(max_length=40, blank=True)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    
    # Action details
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    model_name = models.CharField(max_length=100, blank=True)
    object_id = models.CharField(max_length=255, blank=True)
    object_repr = models.CharField(max_length=200, blank=True)
    
    # Change details
    changes = models.JSONField(default=dict, blank=True)
    additional_data = models.JSONField(default=dict, blank=True)
    
    # Request details
    path = models.CharField(max_length=500, blank=True)
    method = models.CharField(max_length=10, blank=True)
    
    # Result
    success = models.BooleanField(default=True)
    error_message = models.TextField(blank=True)
    
    class Meta:
        db_table = 'audit_logs'
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['action', '-created_at']),
            models.Index(fields=['model_name', 'object_id']),
            models.Index(fields=['-created_at']),
            models.Index(fields=['ip_address']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user} - {self.action} - {self.created_at}"


class Configuration(BaseModel):
    """System configuration model."""
    societe = models.ForeignKey(
        Societe,
        on_delete=models.CASCADE,
        related_name='configurations',
        null=True,
        blank=True
    )
    
    # Configuration key-value pairs
    cle = models.CharField(max_length=100)
    valeur = models.TextField()
    description = models.TextField(blank=True)
    
    # Data type for proper serialization
    type_donnee = models.CharField(
        max_length=20,
        choices=[
            ('STRING', 'Chaîne'),
            ('INTEGER', 'Entier'),
            ('FLOAT', 'Décimal'),
            ('BOOLEAN', 'Booléen'),
            ('JSON', 'JSON'),
            ('DATE', 'Date'),
            ('DATETIME', 'Date et heure'),
        ],
        default='STRING'
    )
    
    # Access control
    is_system = models.BooleanField(default=False)
    is_encrypted = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'configurations'
        unique_together = ['societe', 'cle']
        indexes = [
            models.Index(fields=['societe', 'cle']),
            models.Index(fields=['cle']),
        ]
    
    def __str__(self):
        return f"{self.cle} = {self.valeur[:50]}"
    
    def get_value(self):
        """Get the properly typed value."""
        if self.type_donnee == 'INTEGER':
            return int(self.valeur)
        elif self.type_donnee == 'FLOAT':
            return float(self.valeur)
        elif self.type_donnee == 'BOOLEAN':
            return self.valeur.lower() in ('true', '1', 'yes', 'on')
        elif self.type_donnee == 'JSON':
            import json
            return json.loads(self.valeur)
        elif self.type_donnee == 'DATE':
            from django.utils.dateparse import parse_date
            return parse_date(self.valeur)
        elif self.type_donnee == 'DATETIME':
            from django.utils.dateparse import parse_datetime
            return parse_datetime(self.valeur)
        else:
            return self.valeur


class Notification(BaseModel):
    """User notification model."""
    
    TYPE_CHOICES = [
        ('INFO', 'Information'),
        ('SUCCESS', 'Succès'),
        ('WARNING', 'Avertissement'),
        ('ERROR', 'Erreur'),
        ('TASK', 'Tâche'),
    ]
    
    PRIORITY_CHOICES = [
        ('LOW', 'Faible'),
        ('NORMAL', 'Normale'),
        ('HIGH', 'Élevée'),
        ('URGENT', 'Urgente'),
    ]
    
    # Recipients
    user = models.ForeignKey(
        'authentication.User',
        on_delete=models.CASCADE,
        related_name='notifications',
        null=True,
        blank=True
    )
    group = models.ForeignKey(
        'auth.Group',
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )
    
    # Notification details
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='NORMAL')
    title = models.CharField(max_length=200)
    message = models.TextField()
    
    # Links and actions
    url = models.CharField(max_length=500, blank=True)
    action_data = models.JSONField(default=dict, blank=True)
    
    # Status
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    
    # Expiry
    expires_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'notifications'
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['group', '-created_at']),
            models.Index(fields=['is_read', '-created_at']),
            models.Index(fields=['priority', '-created_at']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        recipient = self.user or self.group
        return f"{recipient} - {self.title}"