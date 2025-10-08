from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator, RegexValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.contrib.auth.hashers import make_password
from decimal import Decimal
import uuid
import json
from datetime import datetime, timedelta

from apps.company.models import Company


class UserProfile(models.Model):
    """EXN-SEC-001: Profil utilisateur étendu pour la sécurité"""
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='security_profile'
    )
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='user_profiles'
    )
    
    # Informations personnelles
    phone_number = models.CharField(max_length=20, blank=True)
    department = models.CharField(max_length=100, blank=True)
    position = models.CharField(max_length=100, blank=True)
    employee_id = models.CharField(max_length=50, blank=True)
    
    # Paramètres de sécurité
    require_password_change = models.BooleanField(default=False)
    password_expires_at = models.DateTimeField(null=True, blank=True)
    account_expires_at = models.DateTimeField(null=True, blank=True)
    
    # Restrictions d'accès
    allowed_ip_addresses = models.JSONField(default=list, blank=True)
    access_schedule = models.JSONField(default=dict, blank=True)
    
    # Préférences
    language = models.CharField(max_length=10, default='fr')
    timezone = models.CharField(max_length=50, default='Europe/Paris')
    
    # Métadonnées
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'wisebook_user_profiles'
        indexes = [
            models.Index(fields=['company', 'user']),
            models.Index(fields=['employee_id']),
        ]
    
    def __str__(self):
        return f"{self.user.get_full_name()} - {self.company.nom}"


class MultiFactorAuth(models.Model):
    """EXN-SEC-001: Authentification multi-facteurs"""
    
    MFA_METHODS = [
        ('totp', 'TOTP (Authenticator App)'),
        ('sms', 'SMS'),
        ('email', 'Email'),
        ('backup_codes', 'Codes de récupération'),
    ]
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='mfa_methods'
    )
    
    method = models.CharField(max_length=20, choices=MFA_METHODS)
    is_enabled = models.BooleanField(default=False)
    is_primary = models.BooleanField(default=False)
    
    # Configuration TOTP
    secret_key = models.CharField(max_length=32, blank=True)
    
    # Configuration SMS/Email
    contact_info = models.CharField(max_length=255, blank=True)
    
    # Codes de récupération
    backup_codes = models.JSONField(default=list, blank=True)
    
    # Métadonnées
    created_at = models.DateTimeField(auto_now_add=True)
    last_used_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'wisebook_multi_factor_auth'
        unique_together = ['user', 'method']
        indexes = [
            models.Index(fields=['user', 'is_enabled']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.get_method_display()}"


class LoginAttempt(models.Model):
    """EXN-SEC-002: Tentatives de connexion pour audit"""
    
    ATTEMPT_TYPES = [
        ('success', 'Succès'),
        ('failed_password', 'Mot de passe incorrect'),
        ('failed_mfa', 'MFA échoué'),
        ('failed_blocked', 'Compte bloqué'),
        ('failed_expired', 'Compte expiré'),
    ]
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='login_attempts',
        null=True,
        blank=True
    )
    username_attempted = models.CharField(max_length=150)
    attempt_type = models.CharField(max_length=20, choices=ATTEMPT_TYPES)
    
    # Informations techniques
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    
    # Géolocalisation
    country = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)
    
    # Résultat
    successful = models.BooleanField(default=False)
    failure_reason = models.TextField(blank=True)
    
    # Timestamp
    attempted_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'wisebook_login_attempts'
        ordering = ['-attempted_at']
        indexes = [
            models.Index(fields=['user', 'attempted_at']),
            models.Index(fields=['ip_address', 'attempted_at']),
            models.Index(fields=['successful', 'attempted_at']),
        ]
    
    def __str__(self):
        return f"{self.username_attempted} - {self.get_attempt_type_display()} ({self.attempted_at})"


class SessionSecurity(models.Model):
    """EXN-SEC-002: Sécurité des sessions utilisateur"""
    
    DEVICE_TYPES = [
        ('desktop', 'Ordinateur de bureau'),
        ('laptop', 'Ordinateur portable'),
        ('mobile', 'Mobile'),
        ('tablet', 'Tablette'),
        ('api', 'API'),
    ]
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='security_sessions'
    )
    
    # Identifiants de session
    session_key = models.CharField(max_length=40, unique=True)
    
    # Informations de connexion
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    device_type = models.CharField(max_length=10, choices=DEVICE_TYPES)
    
    # Géolocalisation
    country = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)
    
    # État de la session
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField()
    
    # Sécurité
    is_suspicious = models.BooleanField(default=False)
    force_logout = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'wisebook_session_security'
        ordering = ['-last_activity']
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['session_key']),
            models.Index(fields=['ip_address']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.ip_address} ({self.created_at})"
    
    def is_expired(self):
        return timezone.now() > self.expires_at


class Permission(models.Model):
    """EXN-SEC-003: Permissions granulaires"""
    
    PERMISSION_TYPES = [
        ('module', 'Accès module'),
        ('action', 'Action spécifique'),
        ('data', 'Données spécifiques'),
        ('field', 'Champ spécifique'),
    ]
    
    code = models.CharField(max_length=100, unique=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    permission_type = models.CharField(max_length=20, choices=PERMISSION_TYPES)
    
    # Hiérarchie
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='children'
    )
    
    # Module/Contexte
    module = models.CharField(max_length=50, blank=True)
    context = models.JSONField(default=dict, blank=True)
    
    # État
    is_active = models.BooleanField(default=True)
    is_system = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'wisebook_permissions'
        ordering = ['module', 'name']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['module', 'permission_type']),
        ]
    
    def __str__(self):
        return f"{self.code} - {self.name}"


class Role(models.Model):
    """
    Rôles personnalisés pour la gestion des permissions WiseBook
    """
    
    TYPES_ROLE = [
        ('SYSTEM', 'Système'),
        ('SOCIETE', 'Société'),
        ('CUSTOM', 'Personnalisé')
    ]
    
    NIVEAUX_ACCES = [
        ('LECTURE', 'Lecture seule'),
        ('ECRITURE', 'Lecture et écriture'),
        ('VALIDATION', 'Lecture, écriture et validation'),
        ('ADMINISTRATION', 'Administration complète'),
        ('SUPER_ADMIN', 'Super administrateur')
    ]
    
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='roles',
        null=True,
        blank=True,
        help_text="Null pour les rôles système"
    )
    
    nom = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    type_role = models.CharField(max_length=10, choices=TYPES_ROLE, default='CUSTOM')
    niveau_acces = models.CharField(max_length=15, choices=NIVEAUX_ACCES, default='LECTURE')
    
    # Configuration des permissions
    permissions_modules = models.JSONField(
        default=dict,
        help_text="Permissions par module : {'accounting': ['read', 'write'], 'treasury': ['read']}"
    )
    permissions_donnees = models.JSONField(
        default=dict,
        help_text="Permissions sur les données spécifiques"
    )
    restrictions = models.JSONField(
        default=dict,
        help_text="Restrictions spéciales (IP, horaires, etc.)"
    )
    
    # Métadonnées
    couleur = models.CharField(max_length=7, default='#7A8B8E', help_text="Couleur d'affichage")
    icone = models.CharField(max_length=50, blank=True, help_text="Icône du rôle")
    ordre_affichage = models.PositiveIntegerField(default=1)
    
    # État
    actif = models.BooleanField(default=True)
    date_expiration = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'wisebook_security_roles'
        ordering = ['ordre_affichage', 'nom']
        unique_together = ['company', 'nom']
        indexes = [
            models.Index(fields=['company', 'type_role']),
            models.Index(fields=['actif', 'date_expiration']),
        ]
    
    def __str__(self):
        return f"{self.nom} ({self.company.nom if self.company else 'Système'})"
    
    @property
    def est_expire(self):
        """Vérifie si le rôle est expiré"""
        if self.date_expiration:
            return timezone.now() > self.date_expiration
        return False

class UserExtended(models.Model):
    """
    Utilisateur étendu pour WiseBook avec sécurité renforcée
    """
    
    STATUTS = [
        ('ACTIF', 'Actif'),
        ('INACTIF', 'Inactif'),
        ('SUSPENDU', 'Suspendu'),
        ('BLOQUE', 'Bloqué'),
        ('EXPIRE', 'Expiré')
    ]
    
    TYPES_AUTHENTIFICATION = [
        ('PASSWORD', 'Mot de passe'),
        ('MFA', 'Authentification multi-facteurs'),
        ('SSO', 'Single Sign-On'),
        ('LDAP', 'LDAP/Active Directory'),
        ('API_KEY', 'Clé API')
    ]
    
    # Relation avec User Django
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='extended_profile'
    )
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='extended_users',
        null=True,
        blank=True
    )
    
    # Profil utilisateur
    telephone = models.CharField(max_length=20, blank=True)
    poste = models.CharField(max_length=100, blank=True)
    departement = models.CharField(max_length=100, blank=True)
    manager = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='equipe'
    )
    
    # Photo de profil
    photo = models.ImageField(upload_to='avatars/', null=True, blank=True)
    
    # Sécurité
    statut = models.CharField(max_length=10, choices=STATUTS, default='ACTIF')
    type_authentification = models.CharField(
        max_length=10,
        choices=TYPES_AUTHENTIFICATION,
        default='PASSWORD'
    )
    
    # Gestion des mots de passe
    mot_de_passe_expire = models.BooleanField(default=False)
    date_expiration_mdp = models.DateTimeField(null=True, blank=True)
    doit_changer_mdp = models.BooleanField(default=False)
    historique_mdp = models.JSONField(
        default=list,
        help_text="Historique des hashs des anciens mots de passe"
    )
    
    # Authentification multi-facteurs
    mfa_active = models.BooleanField(default=False)
    secret_mfa = models.CharField(max_length=32, blank=True)
    codes_recuperation = models.JSONField(
        default=list,
        help_text="Codes de récupération MFA"
    )
    
    # Sécurité des sessions
    force_deconnexion = models.BooleanField(default=False)
    sessions_actives_max = models.PositiveIntegerField(default=3)
    
    # Restrictions d'accès
    adresses_ip_autorisees = models.JSONField(
        default=list,
        help_text="Adresses IP autorisées (vide = toutes)"
    )
    horaires_acces = models.JSONField(
        default=dict,
        help_text="Plages horaires d'accès autorisées"
    )
    
    # Dates importantes
    date_derniere_connexion = models.DateTimeField(null=True, blank=True)
    date_derniere_activite = models.DateTimeField(null=True, blank=True)
    date_expiration_compte = models.DateTimeField(null=True, blank=True)
    
    # Tentatives de connexion
    tentatives_echec = models.PositiveIntegerField(default=0)
    derniere_tentative_echec = models.DateTimeField(null=True, blank=True)
    compte_verrouille_jusqu = models.DateTimeField(null=True, blank=True)
    
    # Préférences
    langue = models.CharField(max_length=10, default='fr')
    fuseau_horaire = models.CharField(max_length=50, default='Europe/Paris')
    preferences_interface = models.JSONField(
        default=dict,
        help_text="Préférences d'interface utilisateur"
    )
    
    # Métadonnées
    notes_admin = models.TextField(blank=True)
    
    class Meta:
        db_table = 'wisebook_user_extended'
        ordering = ['user__last_name', 'user__first_name']
        indexes = [
            models.Index(fields=['company', 'statut']),
            models.Index(fields=['user', 'mfa_active']),
            models.Index(fields=['date_derniere_connexion']),
        ]
    
    def __str__(self):
        return f"{self.user.get_full_name()} ({self.user.username})"
    
    def clean(self):
        """Validation des données utilisateur"""
        super().clean()
        
        # Vérifier l'unicité de l'email dans la société
        if self.company and self.user.email:
            existing = UserExtended.objects.filter(
                company=self.company,
                user__email=self.user.email
            ).exclude(pk=self.pk)
            
            if existing.exists():
                raise ValidationError("Cet email est déjà utilisé dans cette société")
    
    @property
    def est_actif_securite(self):
        """Vérifie si l'utilisateur peut se connecter (sécurité)"""
        if not self.user.is_active or self.statut != 'ACTIF':
            return False
        
        # Compte expiré
        if self.date_expiration_compte and timezone.now() > self.date_expiration_compte:
            return False
        
        # Compte verrouillé
        if self.compte_verrouille_jusqu and timezone.now() < self.compte_verrouille_jusqu:
            return False
        
        return True
    
    @property
    def mdp_expire(self):
        """Vérifie si le mot de passe est expiré"""
        if self.date_expiration_mdp:
            return timezone.now() > self.date_expiration_mdp
        return self.mot_de_passe_expire
    
    def incrementer_tentatives_echec(self):
        """Incrémente le compteur de tentatives d'échec"""
        self.tentatives_echec += 1
        self.derniere_tentative_echec = timezone.now()
        
        # Verrouiller le compte après 5 tentatives
        if self.tentatives_echec >= 5:
            self.compte_verrouille_jusqu = timezone.now() + timedelta(minutes=30)
        
        self.save()
    
    def reset_tentatives_echec(self):
        """Remet à zéro les tentatives d'échec"""
        self.tentatives_echec = 0
        self.derniere_tentative_echec = None
        self.compte_verrouille_jusqu = None
        self.save()

class UserRole(models.Model):
    """EXN-SEC-003: Association utilisateur-rôle avec période de validité"""
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='assigned_roles'
    )
    role = models.ForeignKey(
        Role,
        on_delete=models.CASCADE,
        related_name='assigned_users'
    )
    
    # Période de validité
    date_debut = models.DateTimeField(default=timezone.now)
    date_fin = models.DateTimeField(null=True, blank=True)
    
    # Attribution
    assigned_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='role_assignments'
    )
    assignment_reason = models.TextField(blank=True)
    
    # État
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'wisebook_user_roles'
        unique_together = ['user', 'role']
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['role', 'date_debut', 'date_fin']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.role.nom}"
    
    @property
    def est_valide(self):
        """Vérifie si l'attribution est encore valide"""
        maintenant = timezone.now()
        
        if not self.is_active:
            return False
        
        if maintenant < self.date_debut:
            return False
        
        if self.date_fin and maintenant > self.date_fin:
            return False
        
        return True

class ActiveSession(models.Model):
    """EXN-SEC-002: Sessions actives des utilisateurs pour le contrôle de sécurité"""
    
    DEVICE_TYPES = [
        ('desktop', 'Ordinateur de bureau'),
        ('laptop', 'Ordinateur portable'),
        ('mobile', 'Mobile'),
        ('tablet', 'Tablette'),
        ('api', 'API'),
        ('other', 'Autre')
    ]
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='active_sessions'
    )
    
    # Identifiants de session
    session_key = models.CharField(max_length=40, unique=True)
    token_jwt = models.TextField(blank=True)
    
    # Informations de connexion
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField()
    device_type = models.CharField(max_length=10, choices=DEVICE_TYPES)
    
    # Géolocalisation (optionnelle)
    country = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, blank=True)
    
    # Dates
    created_at = models.DateTimeField(default=timezone.now)
    last_activity = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField()
    
    # État
    is_active = models.BooleanField(default=True)
    force_logout = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'wisebook_active_sessions'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['session_key']),
            models.Index(fields=['ip_address', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.ip_address} ({self.created_at})"
    
    @property
    def is_expired(self):
        """Vérifie si la session est expirée"""
        return timezone.now() > self.expires_at
    
    def extend_session(self, duration_minutes=480):  # 8 heures par défaut
        """Prolonge la session"""
        self.expires_at = timezone.now() + timedelta(minutes=duration_minutes)
        self.last_activity = timezone.now()
        self.save()

class SecurityAuditLog(models.Model):
    """EXN-SEC-004: Journal des événements de sécurité et d'audit"""
    
    TYPES_EVENEMENT = [
        # Authentification
        ('LOGIN_SUCCESS', 'Connexion réussie'),
        ('LOGIN_FAILED', 'Tentative de connexion échouée'),
        ('LOGOUT', 'Déconnexion'),
        ('LOGOUT_FORCED', 'Déconnexion forcée'),
        
        # Gestion des comptes
        ('ACCOUNT_CREATED', 'Compte créé'),
        ('ACCOUNT_MODIFIED', 'Compte modifié'),
        ('ACCOUNT_DELETED', 'Compte supprimé'),
        ('ACCOUNT_LOCKED', 'Compte verrouillé'),
        ('ACCOUNT_UNLOCKED', 'Compte déverrouillé'),
        ('PASSWORD_CHANGED', 'Mot de passe changé'),
        ('PASSWORD_RESET', 'Réinitialisation mot de passe'),
        
        # Permissions et rôles
        ('ROLE_ASSIGNED', 'Rôle attribué'),
        ('ROLE_REVOKED', 'Rôle révoqué'),
        ('PERMISSION_GRANTED', 'Permission accordée'),
        ('PERMISSION_DENIED', 'Permission refusée'),
        
        # Accès aux données
        ('DATA_ACCESSED', 'Données consultées'),
        ('DATA_MODIFIED', 'Données modifiées'),
        ('DATA_DELETED', 'Données supprimées'),
        ('DATA_EXPORTED', 'Données exportées'),
        
        # Sécurité
        ('SUSPICIOUS_ACTIVITY', 'Activité suspecte'),
        ('BRUTE_FORCE_ATTEMPT', 'Tentative de force brute'),
        ('UNAUTHORIZED_ACCESS', 'Accès non autorisé'),
        ('PRIVILEGE_ESCALATION', 'Élévation de privilèges'),
        
        # Système
        ('SYSTEM_CONFIG_CHANGED', 'Configuration système modifiée'),
        ('BACKUP_CREATED', 'Sauvegarde créée'),
        ('BACKUP_RESTORED', 'Sauvegarde restaurée'),
        ('MAINTENANCE_MODE', 'Mode maintenance'),
    ]
    
    NIVEAUX_GRAVITE = [
        ('INFO', 'Information'),
        ('WARNING', 'Avertissement'),
        ('ERROR', 'Erreur'),
        ('CRITICAL', 'Critique')
    ]
    
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='security_audit_logs',
        null=True,
        blank=True
    )
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audited_actions'
    )
    
    # Événement
    type_evenement = models.CharField(max_length=30, choices=TYPES_EVENEMENT)
    niveau_gravite = models.CharField(max_length=10, choices=NIVEAUX_GRAVITE, default='INFO')
    
    # Description
    titre = models.CharField(max_length=200)
    description = models.TextField()
    
    # Contexte technique
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    requested_url = models.CharField(max_length=500, blank=True)
    http_method = models.CharField(max_length=10, blank=True)
    
    # Données affectées
    object_type = models.CharField(max_length=100, blank=True)
    object_id = models.CharField(max_length=100, blank=True)
    data_before = models.JSONField(null=True, blank=True)
    data_after = models.JSONField(null=True, blank=True)
    
    # Métadonnées
    metadata = models.JSONField(
        default=dict,
        help_text="Informations supplémentaires contextuelles"
    )
    
    # Traitement
    is_processed = models.BooleanField(default=False)
    processed_at = models.DateTimeField(null=True, blank=True)
    processed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='processed_security_events'
    )
    processing_notes = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'wisebook_security_audit_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['company', 'type_evenement', 'created_at']),
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['niveau_gravite', 'is_processed']),
            models.Index(fields=['ip_address', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.get_type_evenement_display()} - {self.titre}"

class SecurityConfiguration(models.Model):
    """EXN-SEC-004: Configuration de sécurité par société"""
    
    company = models.OneToOneField(
        Company,
        on_delete=models.CASCADE,
        related_name='security_config'
    )
    
    # Politique des mots de passe
    mdp_longueur_min = models.PositiveIntegerField(default=8)
    mdp_longueur_max = models.PositiveIntegerField(default=128)
    mdp_majuscules_requises = models.BooleanField(default=True)
    mdp_minuscules_requises = models.BooleanField(default=True)
    mdp_chiffres_requis = models.BooleanField(default=True)
    mdp_caracteres_speciaux_requis = models.BooleanField(default=True)
    mdp_historique_taille = models.PositiveIntegerField(
        default=5,
        help_text="Nombre d'anciens mots de passe mémorisés"
    )
    mdp_duree_validite_jours = models.PositiveIntegerField(
        default=90,
        help_text="Durée de validité du mot de passe en jours"
    )
    
    # Verrouillage de compte
    tentatives_max_echec = models.PositiveIntegerField(default=5)
    duree_verrouillage_minutes = models.PositiveIntegerField(default=30)
    verrouillage_auto_active = models.BooleanField(default=True)
    
    # Sessions
    duree_session_minutes = models.PositiveIntegerField(default=480)  # 8 heures
    sessions_concurrentes_max = models.PositiveIntegerField(default=3)
    deconnexion_auto_inactivite = models.BooleanField(default=True)
    duree_inactivite_minutes = models.PositiveIntegerField(default=60)
    
    # Authentification multi-facteurs
    mfa_obligatoire = models.BooleanField(default=False)
    mfa_obligatoire_admin = models.BooleanField(default=True)
    mfa_methodes_autorisees = models.JSONField(
        default=list,
        help_text="Méthodes MFA autorisées: ['totp', 'sms', 'email']"
    )
    
    # Restrictions d'accès
    restriction_ip_active = models.BooleanField(default=False)
    plages_ip_autorisees = models.JSONField(
        default=list,
        help_text="Plages d'adresses IP autorisées"
    )
    restriction_horaire_active = models.BooleanField(default=False)
    horaires_acces_defaut = models.JSONField(
        default=dict,
        help_text="Horaires d'accès par défaut"
    )
    
    # Audit et journalisation
    audit_complet_active = models.BooleanField(default=True)
    retention_logs_jours = models.PositiveIntegerField(default=365)
    notification_evenements_critiques = models.BooleanField(default=True)
    emails_notification = models.JSONField(
        default=list,
        help_text="Emails pour les notifications de sécurité"
    )
    
    # Chiffrement et protection des données
    chiffrement_donnees_sensibles = models.BooleanField(default=True)
    masquage_donnees_logs = models.BooleanField(default=True)
    anonymisation_export = models.BooleanField(default=False)
    
    # Politique de sauvegarde
    sauvegarde_auto_active = models.BooleanField(default=True)
    frequence_sauvegarde_heures = models.PositiveIntegerField(default=24)
    retention_sauvegardes_jours = models.PositiveIntegerField(default=30)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'wisebook_security_configurations'
        indexes = [
            models.Index(fields=['company']),
        ]
    
    def __str__(self):
        return f"Config sécurité - {self.company.nom}"

class APIKey(models.Model):
    """EXN-SEC-003: Clés API pour l'accès programmatique"""
    
    KEY_TYPES = [
        ('read', 'Lecture seule'),
        ('write', 'Lecture et écriture'),
        ('admin', 'Administration'),
        ('integration', 'Intégration externe'),
        ('webhook', 'Webhook')
    ]
    
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='api_keys'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='api_keys'
    )
    
    # Identifiants
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    public_key = models.CharField(max_length=64, unique=True, blank=True)
    secret_key_hash = models.CharField(max_length=128, blank=True)  # Hashée
    
    # Configuration
    key_type = models.CharField(max_length=15, choices=KEY_TYPES, default='read')
    permissions = models.JSONField(
        default=dict,
        help_text="Permissions spécifiques de la clé API"
    )
    
    # Limitations
    limite_requetes_jour = models.PositiveIntegerField(
        default=1000,
        help_text="Nombre maximum de requêtes par jour"
    )
    limite_requetes_heure = models.PositiveIntegerField(
        default=100,
        help_text="Nombre maximum de requêtes par heure"
    )
    
    # Restrictions
    allowed_ip_addresses = models.JSONField(
        default=list,
        help_text="Adresses IP autorisées pour cette clé"
    )
    allowed_domains = models.JSONField(
        default=list,
        help_text="Domaines autorisés (CORS)"
    )
    
    # Dates
    expires_at = models.DateTimeField(null=True, blank=True)
    last_used_at = models.DateTimeField(null=True, blank=True)
    
    # Statistiques
    total_requests = models.PositiveIntegerField(default=0)
    requests_today = models.PositiveIntegerField(default=0)
    requests_this_hour = models.PositiveIntegerField(default=0)
    
    # État
    is_active = models.BooleanField(default=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'wisebook_api_keys'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['company', 'is_active']),
            models.Index(fields=['user', 'key_type']),
            models.Index(fields=['public_key']),
        ]
    
    def __str__(self):
        return f"{self.name} - {self.company.nom}"
    
    def save(self, *args, **kwargs):
        if not self.public_key:
            import secrets
            self.public_key = f"wb_{secrets.token_urlsafe(32)}"
        super().save(*args, **kwargs)
    
    @property
    def is_expired(self):
        """Vérifie si la clé API est expirée"""
        if self.expires_at:
            return timezone.now() > self.expires_at
        return False
    
    @property
    def is_rate_limited(self):
        """Vérifie si les limites sont atteintes"""
        return (
            self.requests_today >= self.limite_requetes_jour or
            self.requests_this_hour >= self.limite_requetes_heure
        )


# Modèles GDPR/RGPD pour la conformité
class GDPRConsent(models.Model):
    """EXN-SEC-004: Gestion des consentements GDPR"""
    
    CONSENT_TYPES = [
        ('data_processing', 'Traitement des données'),
        ('marketing', 'Marketing et communication'),
        ('analytics', 'Analyses et statistiques'),
        ('cookies', 'Cookies et traceurs'),
        ('third_party', 'Partage avec des tiers'),
    ]
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='gdpr_consents'
    )
    consent_type = models.CharField(max_length=30, choices=CONSENT_TYPES)
    
    # Consentement
    is_granted = models.BooleanField(default=False)
    granted_at = models.DateTimeField(null=True, blank=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    
    # Contexte légal
    legal_basis = models.CharField(max_length=200, blank=True)
    purpose_description = models.TextField()
    data_retention_period = models.CharField(max_length=100, blank=True)
    
    # Traçabilité
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'wisebook_gdpr_consents'
        unique_together = ['user', 'consent_type']
        indexes = [
            models.Index(fields=['user', 'consent_type']),
            models.Index(fields=['is_granted', 'granted_at']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.get_consent_type_display()}"


class DataProcessingRecord(models.Model):
    """EXN-SEC-004: Registre des traitements de données (Art. 30 RGPD)"""
    
    PROCESSING_PURPOSES = [
        ('accounting', 'Comptabilité et gestion financière'),
        ('hr', 'Gestion des ressources humaines'),
        ('customer_management', 'Gestion de la relation client'),
        ('marketing', 'Marketing et communication'),
        ('legal_compliance', 'Conformité légale'),
        ('security', 'Sécurité des systèmes'),
    ]
    
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='processing_records'
    )
    
    # Description du traitement
    name = models.CharField(max_length=200)
    purpose = models.CharField(max_length=30, choices=PROCESSING_PURPOSES)
    description = models.TextField()
    
    # Base légale
    legal_basis = models.CharField(max_length=200)
    legitimate_interest = models.TextField(blank=True)
    
    # Catégories de données
    data_categories = models.JSONField(default=list)
    data_subjects = models.JSONField(default=list)
    
    # Destinataires
    internal_recipients = models.JSONField(default=list)
    external_recipients = models.JSONField(default=list)
    third_country_transfers = models.JSONField(default=list)
    
    # Rétention
    retention_period = models.CharField(max_length=100)
    retention_criteria = models.TextField()
    
    # Mesures de sécurité
    security_measures = models.JSONField(default=list)
    
    # Statut
    is_active = models.BooleanField(default=True)
    last_review_date = models.DateField(null=True, blank=True)
    next_review_date = models.DateField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'wisebook_data_processing_records'
        ordering = ['name']
        indexes = [
            models.Index(fields=['company', 'purpose']),
            models.Index(fields=['is_active', 'next_review_date']),
        ]
    
    def __str__(self):
        return f"{self.name} - {self.company.nom}"