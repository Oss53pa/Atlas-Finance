from django.db import models
from django.contrib.auth.models import User
from django.core.validators import RegexValidator, MinValueValidator, MaxValueValidator
from django.utils import timezone
from django.contrib.contenttypes.models import ContentType
from decimal import Decimal
import json
import uuid

from apps.company.models import Company
from apps.accounting.models import ExerciceComptable, CompteComptable


class SetupWizardSession(models.Model):
    """EXP-PAR-001: Session d'assistant de configuration WiseBook"""
    """Session d'assistant de configuration."""
    
    TYPE_CHOICES = [
        ('initial_setup', 'Configuration initiale'),
        ('company_setup', 'Configuration société'),
        ('accounting_setup', 'Configuration comptable'),
        ('fiscal_setup', 'Configuration fiscale'),
        ('banking_setup', 'Configuration bancaire'),
        ('user_setup', 'Configuration utilisateurs'),
        ('reporting_setup', 'Configuration reporting'),
        ('integration_setup', 'Configuration intégrations'),
    ]
    
    STATUS_CHOICES = [
        ('started', 'Démarré'),
        ('in_progress', 'En cours'),
        ('completed', 'Terminé'),
        ('cancelled', 'Annulé'),
        ('failed', 'Échec'),
    ]
    
    # Identification
    session_id = models.CharField(max_length=100, unique=True)
    wizard_type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='started')
    
    # Contexte
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='setup_sessions'
    )
    utilisateur = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='setup_sessions'
    )
    
    # Progression
    current_step = models.PositiveIntegerField(default=1)
    total_steps = models.PositiveIntegerField(default=1)
    
    # Données collectées
    collected_data = models.JSONField(default=dict)
    step_history = models.JSONField(default=list)
    
    # Résultats
    configuration_applied = models.JSONField(default=dict)
    errors = models.JSONField(default=list)
    
    # Timing
    started_at = models.DateTimeField(default=timezone.now)
    completed_at = models.DateTimeField(null=True, blank=True)
    last_activity = models.DateTimeField(auto_now=True)
    
    # Traçabilité
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'wisebook_setup_wizard_sessions'
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['session_id']),
            models.Index(fields=['societe', 'wizard_type']),
            models.Index(fields=['status', 'started_at']),
        ]
    
    def __str__(self):
        return f"{self.get_wizard_type_display()} - {self.company.nom}"
    
    def get_progress_percentage(self):
        """Calcule le pourcentage de progression."""
        if self.total_steps == 0:
            return 0
        return min(100, (self.current_step / self.total_steps) * 100)
    
    def is_expired(self):
        """Vérifie si la session a expiré (24h sans activité)."""
        from datetime import timedelta
        expiry_time = self.last_activity + timedelta(hours=24)
        return timezone.now() > expiry_time
    
    def add_step_data(self, step_name: str, data: dict):
        """Ajoute les données d'une étape."""
        self.collected_data[step_name] = data
        
        # Ajouter à l'historique
        self.step_history.append({
            'step': step_name,
            'step_number': self.current_step,
            'timestamp': timezone.now().isoformat(),
            'data_keys': list(data.keys())
        })
        
        self.save()


class SetupWizardStep(models.Model):
    """Définition des étapes des assistants."""
    
    FIELD_TYPES = [
        ('text', 'Texte'),
        ('textarea', 'Texte long'),
        ('email', 'Email'),
        ('number', 'Nombre'),
        ('decimal', 'Décimal'),
        ('boolean', 'Oui/Non'),
        ('select', 'Sélection'),
        ('multiselect', 'Sélection multiple'),
        ('radio', 'Choix radio'),
        ('checkbox', 'Cases à cocher'),
        ('date', 'Date'),
        ('file', 'Fichier'),
        ('color', 'Couleur'),
    ]
    
    # Identification
    wizard_type = models.CharField(max_length=30, choices=SetupWizardSession.TYPE_CHOICES)
    step_number = models.PositiveIntegerField()
    step_name = models.CharField(max_length=100)
    
    # Affichage
    title = models.CharField(max_length=200)
    description = models.TextField()
    icon = models.CharField(max_length=50, default='settings')
    
    # Configuration
    fields_config = models.JSONField(default=list)  # Configuration des champs
    validation_rules = models.JSONField(default=dict)  # Règles de validation
    conditional_logic = models.JSONField(default=dict)  # Logique conditionnelle
    
    # Métadonnées
    required = models.BooleanField(default=True)
    skippable = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)
    active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'wisebook_setup_wizard_steps'
        unique_together = ['wizard_type', 'step_number']
        ordering = ['wizard_type', 'step_number']
    
    def __str__(self):
        return f"{self.get_wizard_type_display()} - Étape {self.step_number}: {self.title}"
    
    def get_field_by_name(self, field_name: str):
        """Récupère la configuration d'un champ par son nom."""
        for field_config in self.fields_config:
            if field_config.get('name') == field_name:
                return field_config
        return None
    
    def validate_step_data(self, data: dict) -> tuple[bool, list]:
        """Valide les données d'une étape."""
        errors = []
        
        # Validation des champs requis
        for field_config in self.fields_config:
            field_name = field_config.get('name')
            field_required = field_config.get('required', False)
            
            if field_required and (field_name not in data or not data[field_name]):
                errors.append(f"Le champ '{field_config.get('label', field_name)}' est requis")
        
        # Validation des règles personnalisées
        for rule_name, rule_config in self.validation_rules.items():
            if not self._apply_validation_rule(rule_name, rule_config, data):
                errors.append(rule_config.get('message', f'Erreur de validation: {rule_name}'))
        
        return len(errors) == 0, errors
    
    def _apply_validation_rule(self, rule_name: str, rule_config: dict, data: dict) -> bool:
        """Applique une règle de validation."""
        # Implémentation simplifiée - à étendre selon les besoins
        rule_type = rule_config.get('type')
        
        if rule_type == 'min_length':
            field_name = rule_config.get('field')
            min_length = rule_config.get('value', 0)
            field_value = data.get(field_name, '')
            return len(str(field_value)) >= min_length
        
        elif rule_type == 'email_format':
            field_name = rule_config.get('field')
            field_value = data.get(field_name, '')
            import re
            email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            return re.match(email_pattern, field_value) is not None
        
        elif rule_type == 'numeric_range':
            field_name = rule_config.get('field')
            min_val = rule_config.get('min')
            max_val = rule_config.get('max')
            field_value = data.get(field_name)
            
            try:
                num_value = float(field_value)
                if min_val is not None and num_value < min_val:
                    return False
                if max_val is not None and num_value > max_val:
                    return False
                return True
            except (TypeError, ValueError):
                return False
        
        return True


class SetupTemplate(models.Model):
    """EXP-PAR-001: Templates de configuration prêts à l'emploi"""
    """Templates de configuration prêts à l'emploi."""
    
    CATEGORY_CHOICES = [
        ('business_type', 'Type d\'entreprise'),
        ('industry', 'Secteur d\'activité'),
        ('country', 'Pays'),
        ('size', 'Taille d\'entreprise'),
    ]
    
    nom = models.CharField(max_length=200)
    description = models.TextField()
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    
    # Critères d'application
    applicable_countries = models.JSONField(default=list)
    business_types = models.JSONField(default=list)
    industries = models.JSONField(default=list)
    company_size_range = models.JSONField(default=dict)  # min_employees, max_employees
    
    # Configuration incluse
    configuration_data = models.JSONField(default=dict)
    wizard_config = models.JSONField(default=dict)  # Configuration des assistants
    
    # Métadonnées
    popularity = models.PositiveIntegerField(default=0)  # Nombre d'utilisations
    rating = models.FloatField(default=0.0)  # Note moyenne
    tags = models.JSONField(default=list)
    
    active = models.BooleanField(default=True)
    featured = models.BooleanField(default=False)
    
    # Traçabilité
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'wisebook_setup_templates'
        ordering = ['-featured', '-popularity', 'nom']
        indexes = [
            models.Index(fields=['category', 'active']),
            models.Index(fields=['featured', 'active']),
        ]
    
    def __str__(self):
        return f"{self.nom} ({self.get_category_display()})"
    
    def matches_criteria(self, company: Company) -> bool:
        """Vérifie si le template correspond aux critères de la société."""
        # Vérifier le pays
        if self.applicable_countries and company.pays not in self.applicable_countries:
            return False
        
        # Vérifier le secteur
        if self.industries and hasattr(company, 'secteur_activite') and company.secteur_activite not in self.industries:
            return False
        
        # Vérifier la taille
        if self.company_size_range:
            min_employees = self.company_size_range.get('min_employees')
            max_employees = self.company_size_range.get('max_employees')
            
            if min_employees and hasattr(company, 'effectif') and company.effectif < min_employees:
                return False
            if max_employees and hasattr(company, 'effectif') and company.effectif > max_employees:
                return False
        
        return True
    
    def increment_usage(self):
        """Incrémente le compteur d'utilisation."""
        self.popularity += 1
        self.save(update_fields=['popularity'])


class SetupWizardFeedback(models.Model):
    """Feedback des utilisateurs sur les assistants."""
    
    session = models.ForeignKey(
        SetupWizardSession,
        on_delete=models.CASCADE,
        related_name='feedbacks'
    )
    
    # Évaluation
    rating = models.PositiveIntegerField(choices=[(i, i) for i in range(1, 6)])  # 1-5 étoiles
    ease_of_use = models.PositiveIntegerField(choices=[(i, i) for i in range(1, 6)])
    completeness = models.PositiveIntegerField(choices=[(i, i) for i in range(1, 6)])
    
    # Commentaires
    what_worked_well = models.TextField(blank=True)
    what_could_improve = models.TextField(blank=True)
    missing_features = models.TextField(blank=True)
    
    # Recommandation
    would_recommend = models.BooleanField()
    
    # Métadonnées
    submitted_at = models.DateTimeField(default=timezone.now)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    
    class Meta:
        db_table = 'wisebook_setup_wizard_feedback'
        ordering = ['-submitted_at']
    
    def __str__(self):
        return f"Feedback {self.session.wizard_type} - {self.rating}⭐"


class SetupWizardAnalytics(models.Model):
    """Analytics des assistants de configuration."""
    
    EVENT_TYPES = [
        ('session_started', 'Session démarrée'),
        ('step_completed', 'Étape terminée'),
        ('step_skipped', 'Étape ignorée'),
        ('session_abandoned', 'Session abandonnée'),
        ('session_completed', 'Session terminée'),
        ('error_occurred', 'Erreur survenue'),
        ('template_applied', 'Template appliqué'),
    ]
    
    # Événement
    event_type = models.CharField(max_length=30, choices=EVENT_TYPES)
    timestamp = models.DateTimeField(default=timezone.now)
    
    # Contexte
    wizard_type = models.CharField(max_length=30, choices=SetupWizardSession.TYPE_CHOICES)
    session_id = models.CharField(max_length=100, null=True, blank=True)
    step_number = models.PositiveIntegerField(null=True, blank=True)
    
    # Métadonnées
    user_agent = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    duration_seconds = models.PositiveIntegerField(null=True, blank=True)
    
    # Données événement
    event_data = models.JSONField(default=dict)
    
    class Meta:
        db_table = 'wisebook_setup_wizard_analytics'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['event_type', 'timestamp']),
            models.Index(fields=['wizard_type', 'timestamp']),
            models.Index(fields=['session_id']),
        ]
    
    def __str__(self):
        return f"{self.get_event_type_display()} - {self.get_wizard_type_display()}"