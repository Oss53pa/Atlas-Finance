from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal
import uuid
import json

from apps.company.models import Company
from apps.accounting.models import ExerciceComptable

class CategorieRapport(models.Model):
    """EXF-BI-002: Catégories de rapports SYSCOHADA"""
    """
    Catégories de rapports (Comptable, Fiscal, Financier, Analytique, etc.)
    """
    
    TYPES_CATEGORIE = [
        ('COMPTABLE', 'Comptable'),
        ('FISCAL', 'Fiscal'),
        ('FINANCIER', 'Financier'),
        ('ANALYTIQUE', 'Analytique'),
        ('BUDGETAIRE', 'Budgétaire'),
        ('TRESORERIE', 'Trésorerie'),
        ('IMMOBILISATIONS', 'Immobilisations'),
        ('TIERS', 'Tiers'),
        ('TABLEAU_DE_BORD', 'Tableau de Bord'),
        ('REGLEMENTAIRE', 'Réglementaire'),
        ('PERSONNALISE', 'Personnalisé')
    ]
    
    code = models.CharField(max_length=20, unique=True)
    libelle = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    type_categorie = models.CharField(max_length=20, choices=TYPES_CATEGORIE)
    icone = models.CharField(max_length=50, blank=True, help_text="Classe CSS de l'icône")
    couleur = models.CharField(max_length=7, default='#3B82F6', help_text="Couleur hexadécimale")
    ordre_affichage = models.PositiveIntegerField(default=1)
    actif = models.BooleanField(default=True)
    
    # Traçabilité
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'apps_reporting_categorierapport'
        verbose_name = 'Catégorie de Rapport'
        verbose_name_plural = 'Catégories de Rapport'
        ordering = ['ordre_affichage', 'libelle']
    
    def __str__(self):
        return f"{self.code} - {self.libelle}"

class ModeleRapport(models.Model):
    """EXF-BI-002: Modèles de rapports prédéfinis SYSCOHADA"""
    """
    Modèles de rapports prédéfinis et personnalisés
    """
    
    TYPES_RAPPORT = [
        ('BALANCE', 'Balance'),
        ('GRAND_LIVRE', 'Grand Livre'),
        ('JOURNAL', 'Journal'),
        ('BILAN', 'Bilan'),
        ('COMPTE_RESULTAT', 'Compte de Résultat'),
        ('TAFIRE', 'TAFIRE'),
        ('SOLDES_INTERMEDIAIRES', 'Soldes Intermédiaires de Gestion'),
        ('FLUX_TRESORERIE', 'Flux de Trésorerie'),
        ('BALANCE_AGEE', 'Balance Âgée'),
        ('RELEVE_COMPTE', 'Relevé de Compte'),
        ('DECLARATIONS_FISCALES', 'Déclarations Fiscales'),
        ('TABLEAU_BORD', 'Tableau de Bord'),
        ('RATIOS_FINANCIERS', 'Ratios Financiers'),
        ('BUDGET_REALISE', 'Budget vs Réalisé'),
        ('PERSONNALISE', 'Personnalisé')
    ]
    
    FORMATS_SORTIE = [
        ('PDF', 'PDF'),
        ('EXCEL', 'Excel'),
        ('CSV', 'CSV'),
        ('JSON', 'JSON'),
        ('HTML', 'HTML'),
        ('WORD', 'Word')
    ]
    
    FREQUENCES = [
        ('QUOTIDIEN', 'Quotidien'),
        ('HEBDOMADAIRE', 'Hebdomadaire'),
        ('MENSUEL', 'Mensuel'),
        ('TRIMESTRIEL', 'Trimestriel'),
        ('SEMESTRIEL', 'Semestriel'),
        ('ANNUEL', 'Annuel'),
        ('PONCTUEL', 'Ponctuel')
    ]
    
    company = models.ForeignKey(
        Company, 
        on_delete=models.CASCADE, 
        related_name='modeles_rapport',
        null=True, 
        blank=True,
        help_text="Null pour les modèles système"
    )
    categorie = models.ForeignKey(
        CategorieRapport, 
        on_delete=models.CASCADE, 
        related_name='modeles'
    )
    
    code = models.CharField(max_length=50, unique=True)
    nom = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    type_rapport = models.CharField(max_length=30, choices=TYPES_RAPPORT)
    
    # Configuration du rapport
    requete_sql = models.TextField(
        blank=True,
        help_text="Requête SQL pour générer le rapport"
    )
    colonnes_configuration = models.JSONField(
        default=dict,
        help_text="Configuration des colonnes du rapport"
    )
    filtres_disponibles = models.JSONField(
        default=list,
        help_text="Liste des filtres disponibles"
    )
    groupements_possibles = models.JSONField(
        default=list,
        help_text="Groupements possibles"
    )
    
    # Mise en forme
    template_html = models.TextField(
        blank=True,
        help_text="Template HTML pour la génération"
    )
    styles_css = models.TextField(
        blank=True,
        help_text="Styles CSS personnalisés"
    )
    format_defaut = models.CharField(max_length=10, choices=FORMATS_SORTIE, default='PDF')
    
    # Métadonnées
    est_systeme = models.BooleanField(default=False, help_text="Rapport système non modifiable")
    est_public = models.BooleanField(default=False, help_text="Visible par toutes les sociétés")
    necessite_validation = models.BooleanField(default=False)
    frequence_defaut = models.CharField(max_length=15, choices=FREQUENCES, default='PONCTUEL')
    
    # Paramètres avancés
    parametres_avances = models.JSONField(
        default=dict,
        help_text="Paramètres spécifiques au type de rapport"
    )
    
    actif = models.BooleanField(default=True)
    
    # Traçabilité
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)
    utilisateur_creation = models.ForeignKey(User, on_delete=models.CASCADE, related_name='modeles_crees')
    
    class Meta:
        db_table = 'apps_reporting_modelerapport'
        verbose_name = 'Modèle de Rapport'
        verbose_name_plural = 'Modèles de Rapport'
        ordering = ['categorie', 'nom']
    
    def __str__(self):
        return f"{self.code} - {self.nom}"

class Rapport(models.Model):
    """EXF-BI-002: Instance de rapport généré"""
    """
    Instance de rapport généré
    """
    
    STATUTS = [
        ('EN_COURS', 'En cours de génération'),
        ('GENERE', 'Généré'),
        ('ERREUR', 'Erreur'),
        ('EXPIRE', 'Expiré'),
        ('ANNULE', 'Annulé')
    ]
    
    company = models.ForeignKey(
        Company, 
        on_delete=models.CASCADE, 
        related_name='rapports'
    )
    exercice = models.ForeignKey(
        ExerciceComptable, 
        on_delete=models.CASCADE, 
        related_name='rapports',
        null=True,
        blank=True
    )
    modele = models.ForeignKey(
        ModeleRapport, 
        on_delete=models.CASCADE, 
        related_name='instances'
    )
    
    titre = models.CharField(max_length=200)
    statut = models.CharField(max_length=15, choices=STATUTS, default='EN_COURS')
    
    # Paramètres de génération
    date_debut = models.DateField(null=True, blank=True)
    date_fin = models.DateField(null=True, blank=True)
    filtres_appliques = models.JSONField(
        default=dict,
        help_text="Filtres appliqués lors de la génération"
    )
    groupements_appliques = models.JSONField(
        default=list,
        help_text="Groupements appliqués"
    )
    
    # Génération
    date_generation = models.DateTimeField(null=True, blank=True)
    duree_generation = models.PositiveIntegerField(
        null=True, 
        blank=True,
        help_text="Durée en secondes"
    )
    taille_donnees = models.PositiveIntegerField(
        null=True, 
        blank=True,
        help_text="Nombre de lignes de données"
    )
    
    # Fichiers générés
    fichier_pdf = models.FileField(upload_to='rapports/pdf/', null=True, blank=True)
    fichier_excel = models.FileField(upload_to='rapports/excel/', null=True, blank=True)
    fichier_csv = models.FileField(upload_to='rapports/csv/', null=True, blank=True)
    donnees_json = models.JSONField(
        null=True, 
        blank=True,
        help_text="Données en format JSON"
    )
    
    # Métadonnées
    hash_parametres = models.CharField(
        max_length=64, 
        blank=True,
        help_text="Hash MD5 des paramètres pour éviter la régénération"
    )
    nombre_consultations = models.PositiveIntegerField(default=0)
    derniere_consultation = models.DateTimeField(null=True, blank=True)
    date_expiration = models.DateTimeField(null=True, blank=True)
    
    # Erreurs
    message_erreur = models.TextField(blank=True)
    trace_erreur = models.TextField(blank=True)
    
    # Traçabilité
    date_creation = models.DateTimeField(auto_now_add=True)
    utilisateur_creation = models.ForeignKey(User, on_delete=models.CASCADE, related_name='rapports_crees')
    
    class Meta:
        db_table = 'apps_reporting_rapport'
        verbose_name = 'Rapport'
        verbose_name_plural = 'Rapports'
        ordering = ['-date_creation']
        indexes = [
            models.Index(fields=['societe', 'modele', 'date_creation']),
            models.Index(fields=['statut', 'date_expiration']),
            models.Index(fields=['hash_parametres']),
        ]
    
    def __str__(self):
        return f"{self.titre} - {self.date_creation.strftime('%d/%m/%Y %H:%M')}"
    
    @property
    def est_expire(self):
        """Vérifie si le rapport est expiré"""
        if self.date_expiration:
            return timezone.now() > self.date_expiration
        return False
    
    @property
    def peut_etre_regenere(self):
        """Vérifie si le rapport peut être régénéré"""
        return self.statut in ['GENERE', 'ERREUR', 'EXPIRE']

class PlanificationRapport(models.Model):
    """EXF-BI-002: Planification automatique de rapports"""
    """
    Planification automatique de génération de rapports
    """
    
    FREQUENCES = [
        ('QUOTIDIEN', 'Quotidien'),
        ('HEBDOMADAIRE', 'Hebdomadaire'),
        ('MENSUEL', 'Mensuel'),
        ('TRIMESTRIEL', 'Trimestriel'),
        ('SEMESTRIEL', 'Semestriel'),
        ('ANNUEL', 'Annuel')
    ]
    
    JOURS_SEMAINE = [
        (1, 'Lundi'),
        (2, 'Mardi'),
        (3, 'Mercredi'),
        (4, 'Jeudi'),
        (5, 'Vendredi'),
        (6, 'Samedi'),
        (7, 'Dimanche')
    ]
    
    STATUTS = [
        ('ACTIF', 'Actif'),
        ('INACTIF', 'Inactif'),
        ('SUSPENDU', 'Suspendu'),
        ('ERREUR', 'En erreur')
    ]
    
    company = models.ForeignKey(
        Company, 
        on_delete=models.CASCADE, 
        related_name='planifications_rapport'
    )
    modele = models.ForeignKey(
        ModeleRapport, 
        on_delete=models.CASCADE, 
        related_name='planifications'
    )
    
    nom = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    
    # Récurrence
    frequence = models.CharField(max_length=15, choices=FREQUENCES)
    jour_semaine = models.PositiveSmallIntegerField(
        choices=JOURS_SEMAINE, 
        null=True, 
        blank=True,
        help_text="Pour fréquence hebdomadaire"
    )
    jour_mois = models.PositiveSmallIntegerField(
        null=True, 
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(31)],
        help_text="Pour fréquence mensuelle"
    )
    heure_execution = models.TimeField(default='08:00:00')
    
    # Paramètres par défaut
    filtres_defaut = models.JSONField(
        default=dict,
        help_text="Filtres à appliquer automatiquement"
    )
    formats_generation = models.JSONField(
        default=list,
        help_text="Formats à générer automatiquement"
    )
    
    # Notification et distribution
    destinataires_email = models.JSONField(
        default=list,
        help_text="Liste des emails pour envoi automatique"
    )
    objet_email = models.CharField(max_length=200, blank=True)
    message_email = models.TextField(blank=True)
    
    # État
    statut = models.CharField(max_length=15, choices=STATUTS, default='ACTIF')
    derniere_execution = models.DateTimeField(null=True, blank=True)
    prochaine_execution = models.DateTimeField(null=True, blank=True)
    nombre_executions = models.PositiveIntegerField(default=0)
    nombre_erreurs = models.PositiveIntegerField(default=0)
    
    # Traçabilité
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)
    utilisateur_creation = models.ForeignKey(User, on_delete=models.CASCADE, related_name='planifications_creees')
    
    class Meta:
        db_table = 'apps_reporting_planificationrapport'
        verbose_name = 'Planification de Rapport'
        verbose_name_plural = 'Planifications de Rapport'
        ordering = ['nom']
    
    def __str__(self):
        return f"{self.nom} - {self.frequence}"
    
    def calculer_prochaine_execution(self):
        """Calcule la prochaine date d'exécution"""
        from datetime import datetime, timedelta
        import calendar
        
        maintenant = timezone.now()
        
        if self.frequence == 'QUOTIDIEN':
            prochaine = maintenant.replace(hour=self.heure_execution.hour, 
                                         minute=self.heure_execution.minute, 
                                         second=0, microsecond=0)
            if prochaine <= maintenant:
                prochaine += timedelta(days=1)
        
        elif self.frequence == 'HEBDOMADAIRE' and self.jour_semaine:
            jours_jusqu_prochain = (self.jour_semaine - maintenant.weekday()) % 7
            if jours_jusqu_prochain == 0 and maintenant.time() >= self.heure_execution:
                jours_jusqu_prochain = 7
            prochaine = maintenant + timedelta(days=jours_jusqu_prochain)
            prochaine = prochaine.replace(hour=self.heure_execution.hour,
                                        minute=self.heure_execution.minute,
                                        second=0, microsecond=0)
        
        elif self.frequence == 'MENSUEL' and self.jour_mois:
            if maintenant.day < self.jour_mois:
                prochaine = maintenant.replace(day=self.jour_mois,
                                             hour=self.heure_execution.hour,
                                             minute=self.heure_execution.minute,
                                             second=0, microsecond=0)
            else:
                # Mois suivant
                if maintenant.month == 12:
                    prochaine = maintenant.replace(year=maintenant.year + 1, month=1)
                else:
                    prochaine = maintenant.replace(month=maintenant.month + 1)
                
                # Ajuster le jour si nécessaire
                dernier_jour_mois = calendar.monthrange(prochaine.year, prochaine.month)[1]
                jour = min(self.jour_mois, dernier_jour_mois)
                
                prochaine = prochaine.replace(day=jour,
                                            hour=self.heure_execution.hour,
                                            minute=self.heure_execution.minute,
                                            second=0, microsecond=0)
        
        else:
            # Fréquences plus rares, calcul simplifié
            prochaine = maintenant + timedelta(days=30)  # Par défaut
        
        self.prochaine_execution = prochaine
        return prochaine

class TableauBord(models.Model):
    """EXF-BI-001: Tableaux de bord Clarity UI"""
    """
    Tableaux de bord personnalisables
    """
    
    TYPES_TABLEAU = [
        ('DIRECTION', 'Direction'),
        ('COMPTABLE', 'Comptable'),
        ('FINANCIER', 'Financier'),
        ('COMMERCIAL', 'Commercial'),
        ('OPERATIONNEL', 'Opérationnel'),
        ('PERSONNALISE', 'Personnalisé')
    ]
    
    company = models.ForeignKey(
        Company, 
        on_delete=models.CASCADE, 
        related_name='tableaux_bord'
    )
    
    nom = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    type_tableau = models.CharField(max_length=15, choices=TYPES_TABLEAU)
    
    # Configuration
    configuration_widgets = models.JSONField(
        default=list,
        help_text="Configuration des widgets du tableau de bord"
    )
    layout_configuration = models.JSONField(
        default=dict,
        help_text="Configuration de la mise en page"
    )
    filtres_globaux = models.JSONField(
        default=dict,
        help_text="Filtres appliqués à tous les widgets"
    )
    
    # Métadonnées
    est_defaut = models.BooleanField(default=False)
    est_public = models.BooleanField(default=False)
    ordre_affichage = models.PositiveIntegerField(default=1)
    
    # Rafraîchissement
    auto_refresh = models.BooleanField(default=True)
    interval_refresh = models.PositiveIntegerField(
        default=300,
        help_text="Intervalle de rafraîchissement en secondes"
    )
    derniere_actualisation = models.DateTimeField(null=True, blank=True)
    
    actif = models.BooleanField(default=True)
    
    # Traçabilité
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)
    utilisateur_creation = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tableaux_crees')
    
    class Meta:
        db_table = 'apps_reporting_tableaubord'
        verbose_name = 'Tableau de Bord'
        verbose_name_plural = 'Tableaux de Bord'
        ordering = ['ordre_affichage', 'nom']
    
    def __str__(self):
        return f"{self.nom} - {self.type_tableau}"

class Widget(models.Model):
    """EXF-BI-001: Widgets interactifs pour dashboards"""
    """
    Widgets pour les tableaux de bord
    """
    
    TYPES_WIDGET = [
        ('METRIC', 'Métrique'),
        ('CHART_LINE', 'Graphique Linéaire'),
        ('CHART_BAR', 'Graphique en Barres'),
        ('CHART_PIE', 'Graphique Circulaire'),
        ('CHART_AREA', 'Graphique d\'Aires'),
        ('TABLE', 'Tableau'),
        ('GAUGE', 'Jauge'),
        ('PROGRESS', 'Barre de Progression'),
        ('LIST', 'Liste'),
        ('CALENDAR', 'Calendrier'),
        ('MAP', 'Carte'),
        ('IFRAME', 'IFrame'),
        ('HTML', 'HTML Personnalisé')
    ]
    
    TAILLES = [
        ('XS', 'Très Petit (1x1)'),
        ('SM', 'Petit (2x1)'),
        ('MD', 'Moyen (2x2)'),
        ('LG', 'Grand (3x2)'),
        ('XL', 'Très Grand (4x2)'),
        ('FULL', 'Largeur Complète')
    ]
    
    company = models.ForeignKey(
        Company, 
        on_delete=models.CASCADE, 
        related_name='widgets'
    )
    tableau_bord = models.ForeignKey(
        TableauBord, 
        on_delete=models.CASCADE, 
        related_name='widgets',
        null=True,
        blank=True
    )
    
    nom = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    type_widget = models.CharField(max_length=20, choices=TYPES_WIDGET)
    taille = models.CharField(max_length=5, choices=TAILLES, default='MD')
    
    # Position sur le tableau
    position_x = models.PositiveSmallIntegerField(default=0)
    position_y = models.PositiveSmallIntegerField(default=0)
    largeur = models.PositiveSmallIntegerField(default=2)
    hauteur = models.PositiveSmallIntegerField(default=2)
    
    # Configuration des données
    source_donnees = models.TextField(
        help_text="Requête SQL ou configuration de source"
    )
    parametres_widget = models.JSONField(
        default=dict,
        help_text="Paramètres spécifiques au type de widget"
    )
    filtres_widget = models.JSONField(
        default=dict,
        help_text="Filtres spécifiques à ce widget"
    )
    
    # Apparence
    titre = models.CharField(max_length=200, blank=True)
    sous_titre = models.CharField(max_length=200, blank=True)
    couleur_primaire = models.CharField(max_length=7, default='#3B82F6')
    couleur_secondaire = models.CharField(max_length=7, default='#EFF6FF')
    
    # Cache
    donnees_cache = models.JSONField(null=True, blank=True)
    date_cache = models.DateTimeField(null=True, blank=True)
    duree_cache = models.PositiveIntegerField(
        default=300,
        help_text="Durée du cache en secondes"
    )
    
    actif = models.BooleanField(default=True)
    
    # Traçabilité
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)
    utilisateur_creation = models.ForeignKey(User, on_delete=models.CASCADE, related_name='widgets_crees')
    
    class Meta:
        db_table = 'apps_reporting_widget'
        verbose_name = 'Widget'
        verbose_name_plural = 'Widgets'
        ordering = ['tableau_bord', 'position_y', 'position_x']
    
    def __str__(self):
        return f"{self.nom} - {self.type_widget}"
    
    @property
    def cache_expire(self):
        """Vérifie si le cache est expiré"""
        if not self.date_cache:
            return True
        return timezone.now() > self.date_cache + timezone.timedelta(seconds=self.duree_cache)

class FavoriRapport(models.Model):
    """Rapports favoris des utilisateurs"""
    """
    Rapports favoris des utilisateurs
    """
    
    utilisateur = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='rapports_favoris'
    )
    modele = models.ForeignKey(
        ModeleRapport,
        on_delete=models.CASCADE,
        related_name='favoris'
    )
    
    # Paramètres favoris
    filtres_favoris = models.JSONField(
        default=dict,
        help_text="Filtres par défaut pour ce favori"
    )
    nom_favori = models.CharField(
        max_length=200,
        blank=True,
        help_text="Nom personnalisé du favori"
    )
    
    ordre = models.PositiveIntegerField(default=1)
    
    # Traçabilité
    date_creation = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'apps_reporting_favorrapport'
        verbose_name = 'Favori de Rapport'
        verbose_name_plural = 'Favoris de Rapport'
        unique_together = ['utilisateur', 'modele']
        ordering = ['ordre', 'nom_favori']
    
    def __str__(self):
        return f"{self.utilisateur.username} - {self.nom_favori or self.modele.nom}"

class CommentaireRapport(models.Model):
    """Commentaires et annotations sur les rapports"""
    """
    Commentaires et annotations sur les rapports
    """
    
    utilisateur = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='commentaires_rapport'
    )
    rapport = models.ForeignKey(
        Rapport,
        on_delete=models.CASCADE,
        related_name='commentaires'
    )
    
    commentaire = models.TextField()
    page = models.PositiveIntegerField(null=True, blank=True)
    position_x = models.PositiveIntegerField(null=True, blank=True)
    position_y = models.PositiveIntegerField(null=True, blank=True)
    
    # Métadonnées
    couleur = models.CharField(max_length=7, default='#FBBF24')
    prive = models.BooleanField(default=False)
    
    # Traçabilité
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'apps_reporting_commentairerapport'
        verbose_name = 'Commentaire de Rapport'
        verbose_name_plural = 'Commentaires de Rapport'
        ordering = ['-date_creation']
    
    def __str__(self):
        return f"{self.utilisateur.username} - {self.commentaire[:50]}..."