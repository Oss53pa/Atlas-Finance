"""
Modèles pour le module Paramètres WiseBook ERP V3.0
Configuration système et paramétrage avancé
"""
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from apps.core.models import BaseModel


class ParametreSysteme(BaseModel):
    """Paramètres généraux du système WiseBook"""
    
    CATEGORIES = [
        ('GENERAL', 'Général'),
        ('COMPTABILITE', 'Comptabilité'),
        ('FISCALITE', 'Fiscalité'),
        ('TRESORERIE', 'Trésorerie'),
        ('SECURITE', 'Sécurité'),
        ('INTEGRATION', 'Intégration'),
        ('NOTIFICATIONS', 'Notifications'),
        ('INTERFACE', 'Interface'),
    ]
    
    TYPE_CHOICES = [
        ('STRING', 'Texte'),
        ('INTEGER', 'Nombre entier'),
        ('DECIMAL', 'Nombre décimal'),
        ('BOOLEAN', 'Booléen'),
        ('DATE', 'Date'),
        ('EMAIL', 'Email'),
        ('URL', 'URL'),
        ('JSON', 'JSON'),
        ('COLOR', 'Couleur'),
    ]
    
    # Identification
    cle = models.CharField(max_length=100, unique=True, db_index=True)
    nom = models.CharField(max_length=255)
    description = models.TextField()
    categorie = models.CharField(max_length=20, choices=CATEGORIES, default='GENERAL')
    
    # Valeur
    type_valeur = models.CharField(max_length=20, choices=TYPE_CHOICES, default='STRING')
    valeur = models.TextField()
    valeur_par_defaut = models.TextField()
    
    # Contraintes
    requis = models.BooleanField(default=False)
    modifiable_runtime = models.BooleanField(default=True)
    visible_interface = models.BooleanField(default=True)
    
    # Validation
    regex_validation = models.CharField(max_length=500, blank=True)
    valeurs_autorisees = models.JSONField(default=list, blank=True)
    valeur_min = models.DecimalField(max_digits=20, decimal_places=6, null=True, blank=True)
    valeur_max = models.DecimalField(max_digits=20, decimal_places=6, null=True, blank=True)
    
    # Métadonnées
    groupe = models.CharField(max_length=100, blank=True)
    ordre = models.IntegerField(default=0)
    aide = models.TextField(blank=True)
    
    class Meta:
        db_table = 'parametres_systeme'
        verbose_name = 'Paramètre Système'
        verbose_name_plural = 'Paramètres Système'
        ordering = ['categorie', 'groupe', 'ordre', 'nom']
        indexes = [
            models.Index(fields=['categorie', 'groupe']),
            models.Index(fields=['cle']),
        ]
    
    def __str__(self):
        return f"{self.nom} ({self.cle})"
    
    def get_valeur_typee(self):
        """Retourne la valeur avec le bon type Python"""
        if self.type_valeur == 'BOOLEAN':
            return self.valeur.lower() in ('true', '1', 'oui', 'yes')
        elif self.type_valeur == 'INTEGER':
            return int(self.valeur) if self.valeur else 0
        elif self.type_valeur == 'DECIMAL':
            from decimal import Decimal
            return Decimal(self.valeur) if self.valeur else Decimal('0')
        elif self.type_valeur == 'JSON':
            import json
            return json.loads(self.valeur) if self.valeur else {}
        else:
            return self.valeur


class ConfigurationSociete(BaseModel):
    """Configuration spécifique par société"""
    
    societe = models.ForeignKey(
        'core.Company',
        on_delete=models.CASCADE,
        related_name='configurations'
    )
    
    # Informations légales
    forme_juridique = models.CharField(max_length=50, default='SARL')
    capital_social = models.DecimalField(max_digits=20, decimal_places=2, null=True, blank=True)
    numero_rccm = models.CharField(max_length=50, blank=True)
    numero_contribuable = models.CharField(max_length=50, blank=True)
    
    # Configuration comptable
    plan_comptable_type = models.CharField(
        max_length=20,
        choices=[
            ('SYSCOHADA_NORMAL', 'SYSCOHADA Normal'),
            ('SYSCOHADA_MINIMAL', 'SYSCOHADA Minimal'),
            ('SYSCOHADA_BANQUE', 'SYSCOHADA Bancaire'),
            ('SYSCOHADA_ASSURANCE', 'SYSCOHADA Assurance'),
        ],
        default='SYSCOHADA_NORMAL'
    )
    
    devise_principale = models.CharField(
        max_length=3,
        default='XAF',
        help_text='Code ISO 4217 de la devise (XAF, EUR, USD, etc.)'
    )
    
    nb_decimales = models.IntegerField(
        default=2,
        validators=[MinValueValidator(0), MaxValueValidator(6)]
    )
    
    # Exercice fiscal
    debut_exercice = models.CharField(
        max_length=5,
        default='01-01',
        help_text='Format MM-DD'
    )
    fin_exercice = models.CharField(
        max_length=5,
        default='12-31',
        help_text='Format MM-DD'
    )
    
    # Configuration fiscale
    regime_fiscal = models.CharField(
        max_length=20,
        choices=[
            ('REEL', 'Régime du Réel'),
            ('SIMPLIFIE', 'Régime Simplifié'),
            ('SYNTHETIQUE', 'Régime de Synthèse'),
        ],
        default='REEL'
    )
    
    assujetti_tva = models.BooleanField(default=True)
    taux_tva_defaut = models.DecimalField(max_digits=5, decimal_places=2, default=19.25)
    
    # Configuration de sécurité
    duree_session = models.IntegerField(default=60, help_text='Durée en minutes')
    tentatives_connexion_max = models.IntegerField(default=5)
    duree_blocage = models.IntegerField(default=30, help_text='Durée en minutes')
    
    # Configuration d'interface
    theme = models.CharField(
        max_length=20,
        choices=[
            ('TRINITY_LIGHT', 'Trinity Clair'),
            ('TRINITY_DARK', 'Trinity Sombre'),
            ('CLASSIC', 'Classique'),
        ],
        default='TRINITY_LIGHT'
    )
    
    langue_defaut = models.CharField(
        max_length=5,
        choices=[
            ('fr', 'Français'),
            ('en', 'Anglais'),
            ('es', 'Espagnol'),
        ],
        default='fr'
    )
    
    # Logo et branding
    logo = models.ImageField(upload_to='logos/', blank=True, null=True)
    couleur_principale = models.CharField(max_length=7, default='#7A8B8E')
    couleur_secondaire = models.CharField(max_length=7, default='#353A3B')
    
    class Meta:
        db_table = 'configurations_societe'
        verbose_name = 'Configuration Société'
        verbose_name_plural = 'Configurations Société'
        unique_together = ['societe']
    
    def __str__(self):
        return f"Configuration - {self.societe.nom}"


class JournalParametres(BaseModel):
    """Paramètres des journaux comptables"""
    
    TYPES_JOURNAL = [
        ('VENTES', 'Journal des Ventes'),
        ('ACHATS', 'Journal des Achats'),
        ('BANQUE', 'Journal de Banque'),
        ('CAISSE', 'Journal de Caisse'),
        ('OPERATIONS_DIVERSES', 'Journal des Opérations Diverses'),
        ('PAIE', 'Journal de Paie'),
        ('IMMOBILISATIONS', 'Journal des Immobilisations'),
    ]
    
    societe = models.ForeignKey(
        'core.Company',
        on_delete=models.CASCADE,
        related_name='journaux_parametres'
    )
    
    code = models.CharField(max_length=10)
    libelle = models.CharField(max_length=100)
    type_journal = models.CharField(max_length=30, choices=TYPES_JOURNAL)
    
    # Numérotation automatique
    numerotation_auto = models.BooleanField(default=True)
    prefixe = models.CharField(max_length=10, blank=True)
    suffixe = models.CharField(max_length=10, blank=True)
    compteur = models.IntegerField(default=1)
    nb_chiffres = models.IntegerField(default=6)
    
    # Configuration
    contrepartie_obligatoire = models.BooleanField(default=False)
    lettrage_auto = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'journaux_parametres'
        unique_together = ['societe', 'code']
        verbose_name = 'Paramètre Journal'
        verbose_name_plural = 'Paramètres Journaux'
    
    def __str__(self):
        return f"{self.code} - {self.libelle}"


class NotificationParametres(BaseModel):
    """Paramètres des notifications système"""
    
    TYPES_NOTIFICATION = [
        ('EMAIL', 'Email'),
        ('SMS', 'SMS'),
        ('PUSH', 'Notification Push'),
        ('SYSTEME', 'Notification Système'),
    ]
    
    EVENEMENTS = [
        ('CONNEXION_ECHEC', 'Échec de connexion'),
        ('SAUVEGARDE', 'Sauvegarde système'),
        ('CLOTURE_PERIODE', 'Clôture de période'),
        ('VALIDATION_ECRITURE', 'Validation d\'écriture'),
        ('RAPPEL_ECHEANCE', 'Rappel d\'échéance'),
        ('ERREUR_INTEGRATION', 'Erreur d\'intégration'),
        ('MISE_A_JOUR', 'Mise à jour système'),
    ]
    
    societe = models.ForeignKey(
        'core.Company',
        on_delete=models.CASCADE,
        related_name='notifications_parametres'
    )
    
    evenement = models.CharField(max_length=50, choices=EVENEMENTS)
    type_notification = models.CharField(max_length=20, choices=TYPES_NOTIFICATION)
    
    actif = models.BooleanField(default=True)
    destinataires = models.JSONField(default=list)
    modele_message = models.TextField()
    
    # Configuration avancée
    delai_envoi = models.IntegerField(default=0, help_text='Délai en minutes')
    frequence_max = models.IntegerField(default=1, help_text='Nombre max par jour')
    
    class Meta:
        db_table = 'notifications_parametres'
        unique_together = ['societe', 'evenement', 'type_notification']
        verbose_name = 'Paramètre Notification'
        verbose_name_plural = 'Paramètres Notifications'
    
    def __str__(self):
        return f"{self.evenement} - {self.type_notification}"