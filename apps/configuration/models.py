from django.db import models
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
import json

from apps.core.models import Societe, AuditMixin


class ConfigurationCategory(models.Model):
    """Catégories de configuration."""
    
    code = models.CharField(max_length=50, unique=True)
    nom = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    icone = models.CharField(max_length=50, default='settings')
    ordre = models.PositiveIntegerField(default=0)
    active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'wisebook_configuration_categories'
        ordering = ['ordre', 'nom']
        verbose_name = "Catégorie de configuration"
        verbose_name_plural = "Catégories de configuration"
    
    def __str__(self):
        return self.nom


class ConfigurationParameter(AuditMixin):
    """Paramètres de configuration du système."""
    
    TYPE_CHOICES = [
        ('string', 'Chaîne de caractères'),
        ('text', 'Texte long'),
        ('integer', 'Nombre entier'),
        ('decimal', 'Nombre décimal'),
        ('boolean', 'Booléen'),
        ('choice', 'Choix multiple'),
        ('date', 'Date'),
        ('datetime', 'Date et heure'),
        ('json', 'JSON'),
        ('file', 'Fichier'),
        ('color', 'Couleur'),
        ('email', 'Email'),
        ('url', 'URL'),
    ]
    
    SCOPE_CHOICES = [
        ('global', 'Global'),
        ('societe', 'Par société'),
        ('utilisateur', 'Par utilisateur'),
        ('module', 'Par module'),
    ]
    
    # Identification
    code = models.CharField(max_length=100)
    nom = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    category = models.ForeignKey(
        ConfigurationCategory,
        on_delete=models.CASCADE,
        related_name='parameters'
    )
    
    # Type et scope
    type_parametre = models.CharField(max_length=20, choices=TYPE_CHOICES)
    scope = models.CharField(max_length=20, choices=SCOPE_CHOICES, default='global')
    
    # Valeur par défaut et contraintes
    valeur_defaut = models.TextField(blank=True)
    valeurs_possibles = models.JSONField(default=dict, blank=True)  # Pour les choix
    contraintes = models.JSONField(default=dict, blank=True)  # min, max, pattern, etc.
    
    # Métadonnées
    obligatoire = models.BooleanField(default=False)
    modifiable = models.BooleanField(default=True)
    visible = models.BooleanField(default=True)
    ordre = models.PositiveIntegerField(default=0)
    
    # Aide et documentation
    aide = models.TextField(blank=True)
    exemples = models.JSONField(default=list, blank=True)
    
    # Système
    active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'wisebook_configuration_parameters'
        unique_together = ['code', 'scope']
        ordering = ['category__ordre', 'ordre', 'nom']
        indexes = [
            models.Index(fields=['code', 'scope']),
            models.Index(fields=['category', 'active']),
        ]
    
    def __str__(self):
        return f"{self.category.nom} > {self.nom}"
    
    def get_default_value(self):
        """Retourne la valeur par défaut typée."""
        if not self.valeur_defaut:
            return self._get_type_default()
        
        return self._convert_value(self.valeur_defaut)
    
    def _get_type_default(self):
        """Valeur par défaut selon le type."""
        defaults = {
            'string': '',
            'text': '',
            'integer': 0,
            'decimal': 0.0,
            'boolean': False,
            'choice': None,
            'date': None,
            'datetime': None,
            'json': {},
            'file': None,
            'color': '#000000',
            'email': '',
            'url': '',
        }
        return defaults.get(self.type_parametre)
    
    def _convert_value(self, value):
        """Convertit une valeur string selon le type."""
        if value is None or value == '':
            return self._get_type_default()
        
        try:
            if self.type_parametre == 'boolean':
                return str(value).lower() in ['true', '1', 'yes', 'on']
            elif self.type_parametre == 'integer':
                return int(value)
            elif self.type_parametre == 'decimal':
                return float(value)
            elif self.type_parametre == 'json':
                return json.loads(value) if isinstance(value, str) else value
            else:
                return str(value)
        except (ValueError, json.JSONDecodeError):
            return self._get_type_default()
    
    def validate_value(self, value):
        """Valide une valeur selon les contraintes."""
        errors = []
        
        # Vérification obligatoire
        if self.obligatoire and (value is None or value == ''):
            errors.append("Ce paramètre est obligatoire")
        
        if value is None or value == '':
            return errors
        
        # Validation selon le type
        if self.type_parametre == 'integer':
            try:
                int_value = int(value)
                if 'min' in self.contraintes and int_value < self.contraintes['min']:
                    errors.append(f"Valeur minimum : {self.contraintes['min']}")
                if 'max' in self.contraintes and int_value > self.contraintes['max']:
                    errors.append(f"Valeur maximum : {self.contraintes['max']}")
            except ValueError:
                errors.append("Doit être un nombre entier")
        
        elif self.type_parametre == 'decimal':
            try:
                decimal_value = float(value)
                if 'min' in self.contraintes and decimal_value < self.contraintes['min']:
                    errors.append(f"Valeur minimum : {self.contraintes['min']}")
                if 'max' in self.contraintes and decimal_value > self.contraintes['max']:
                    errors.append(f"Valeur maximum : {self.contraintes['max']}")
            except ValueError:
                errors.append("Doit être un nombre décimal")
        
        elif self.type_parametre == 'choice':
            if self.valeurs_possibles and value not in self.valeurs_possibles.get('options', []):
                errors.append("Valeur non autorisée")
        
        elif self.type_parametre == 'email':
            from django.core.validators import validate_email
            try:
                validate_email(value)
            except:
                errors.append("Format d'email invalide")
        
        elif self.type_parametre == 'url':
            from django.core.validators import URLValidator
            try:
                URLValidator()(value)
            except:
                errors.append("Format d'URL invalide")
        
        return errors


class ConfigurationValue(AuditMixin):
    """Valeurs des paramètres de configuration."""
    
    parameter = models.ForeignKey(
        ConfigurationParameter,
        on_delete=models.CASCADE,
        related_name='values'
    )
    
    # Scope de la valeur
    societe = models.ForeignKey(
        Societe,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='configuration_values'
    )
    
    # Pour les scopes plus spécifiques
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )
    object_id = models.PositiveIntegerField(null=True, blank=True)
    content_object = GenericForeignKey('content_type', 'object_id')
    
    # Valeur
    valeur = models.TextField()
    
    # Métadonnées
    date_modification = models.DateTimeField(auto_now=True)
    modifie_par = models.ForeignKey(
        'security.Utilisateur',
        on_delete=models.SET_NULL,
        null=True,
        related_name='configurations_modifiees'
    )
    
    class Meta:
        db_table = 'wisebook_configuration_values'
        unique_together = [
            ['parameter', 'societe', 'content_type', 'object_id']
        ]
        indexes = [
            models.Index(fields=['parameter', 'societe']),
            models.Index(fields=['content_type', 'object_id']),
        ]
    
    def __str__(self):
        scope_info = ""
        if self.societe:
            scope_info = f" ({self.societe.nom})"
        elif self.content_object:
            scope_info = f" ({self.content_object})"
        
        return f"{self.parameter.nom}{scope_info}"
    
    def get_typed_value(self):
        """Retourne la valeur typée."""
        return self.parameter._convert_value(self.valeur)
    
    def clean(self):
        """Validation des données."""
        errors = self.parameter.validate_value(self.valeur)
        if errors:
            from django.core.exceptions import ValidationError
            raise ValidationError({'valeur': errors})


class ConfigurationTemplate(AuditMixin):
    """Templates de configuration prédéfinis."""
    
    TYPE_CHOICES = [
        ('secteur', 'Par secteur d\'activité'),
        ('taille', 'Par taille d\'entreprise'),
        ('pays', 'Par pays'),
        ('custom', 'Personnalisé'),
    ]
    
    nom = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    type_template = models.CharField(max_length=20, choices=TYPE_CHOICES)
    
    # Critères d'application
    criteres = models.JSONField(default=dict)  # secteur, pays, effectif, etc.
    
    # Configuration
    configuration_data = models.JSONField(default=dict)  # code_param: valeur
    
    # Métadonnées
    active = models.BooleanField(default=True)
    ordre = models.PositiveIntegerField(default=0)
    
    class Meta:
        db_table = 'wisebook_configuration_templates'
        ordering = ['type_template', 'ordre', 'nom']
    
    def __str__(self):
        return f"{self.get_type_template_display()} - {self.nom}"
    
    def matches_criteria(self, societe):
        """Vérifie si le template correspond aux critères de la société."""
        if not self.criteres:
            return True
        
        # Vérifier le pays
        if 'pays' in self.criteres and societe.pays not in self.criteres['pays']:
            return False
        
        # Vérifier le secteur
        if 'secteur' in self.criteres and societe.secteur_activite not in self.criteres['secteur']:
            return False
        
        # Vérifier la taille (effectif)
        if 'effectif_min' in self.criteres and societe.effectif < self.criteres['effectif_min']:
            return False
        
        if 'effectif_max' in self.criteres and societe.effectif > self.criteres['effectif_max']:
            return False
        
        return True
    
    def apply_to_societe(self, societe, overwrite=False):
        """Applique le template à une société."""
        applied_count = 0
        
        for code_param, valeur in self.configuration_data.items():
            try:
                parameter = ConfigurationParameter.objects.get(code=code_param, active=True)
                
                # Vérifier si la valeur existe déjà
                existing_value = ConfigurationValue.objects.filter(
                    parameter=parameter,
                    societe=societe
                ).first()
                
                if existing_value and not overwrite:
                    continue  # Ne pas écraser les valeurs existantes
                
                # Valider la valeur
                errors = parameter.validate_value(valeur)
                if errors:
                    continue  # Ignorer les valeurs invalides
                
                # Créer ou mettre à jour la valeur
                ConfigurationValue.objects.update_or_create(
                    parameter=parameter,
                    societe=societe,
                    defaults={
                        'valeur': str(valeur),
                        'modifie_par': None  # Template application
                    }
                )
                applied_count += 1
                
            except ConfigurationParameter.DoesNotExist:
                continue  # Ignorer les paramètres inexistants
        
        return applied_count


class ConfigurationAudit(models.Model):
    """Audit des modifications de configuration."""
    
    parameter = models.ForeignKey(
        ConfigurationParameter,
        on_delete=models.CASCADE,
        related_name='audit_logs'
    )
    
    # Scope
    societe = models.ForeignKey(
        Societe,
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )
    object_id = models.PositiveIntegerField(null=True, blank=True)
    
    # Changement
    ancienne_valeur = models.TextField(blank=True)
    nouvelle_valeur = models.TextField()
    
    # Audit
    date_modification = models.DateTimeField(default=timezone.now)
    modifie_par = models.ForeignKey(
        'security.Utilisateur',
        on_delete=models.SET_NULL,
        null=True
    )
    adresse_ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    # Contexte
    raison = models.CharField(max_length=200, blank=True)  # template, manual, api, etc.
    
    class Meta:
        db_table = 'wisebook_configuration_audit'
        ordering = ['-date_modification']
        indexes = [
            models.Index(fields=['parameter', 'date_modification']),
            models.Index(fields=['societe', 'date_modification']),
        ]
    
    def __str__(self):
        return f"{self.parameter.nom} - {self.date_modification}"


class ConfigurationExport(AuditMixin):
    """Exports de configuration."""
    
    nom = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    
    # Scope de l'export
    societe = models.ForeignKey(
        Societe,
        on_delete=models.CASCADE,
        related_name='configuration_exports'
    )
    
    # Filtres d'export
    categories = models.ManyToManyField(
        ConfigurationCategory,
        blank=True,
        related_name='exports'
    )
    parameters = models.ManyToManyField(
        ConfigurationParameter,
        blank=True,
        related_name='exports'
    )
    
    # Données exportées
    configuration_data = models.JSONField()
    
    # Métadonnées
    date_export = models.DateTimeField(default=timezone.now)
    exporte_par = models.ForeignKey(
        'security.Utilisateur',
        on_delete=models.SET_NULL,
        null=True
    )
    
    class Meta:
        db_table = 'wisebook_configuration_exports'
        ordering = ['-date_export']
    
    def __str__(self):
        return f"{self.nom} - {self.societe.nom}"


class ConfigurationImport(AuditMixin):
    """Imports de configuration."""
    
    nom = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    
    # Destination
    societe = models.ForeignKey(
        Societe,
        on_delete=models.CASCADE,
        related_name='configuration_imports'
    )
    
    # Source
    source_export = models.ForeignKey(
        ConfigurationExport,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='imports'
    )
    source_template = models.ForeignKey(
        ConfigurationTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='imports'
    )
    
    # Options d'import
    overwrite_existing = models.BooleanField(default=False)
    
    # Résultats
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'En attente'),
            ('processing', 'En cours'),
            ('completed', 'Terminé'),
            ('failed', 'Échec'),
        ],
        default='pending'
    )
    
    parameters_imported = models.PositiveIntegerField(default=0)
    parameters_failed = models.PositiveIntegerField(default=0)
    errors = models.JSONField(default=list)
    
    # Métadonnées
    date_import = models.DateTimeField(default=timezone.now)
    importe_par = models.ForeignKey(
        'security.Utilisateur',
        on_delete=models.SET_NULL,
        null=True
    )
    
    class Meta:
        db_table = 'wisebook_configuration_imports'
        ordering = ['-date_import']
    
    def __str__(self):
        return f"{self.nom} - {self.societe.nom} ({self.get_status_display()})"