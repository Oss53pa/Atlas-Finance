from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal
import uuid
import json

from apps.core.models import BaseModel, Company

# Constantes pour les niveaux de sévérité
NIVEAUX_SEVERITE = [
    ('FAIBLE', 'Faible'),
    ('MOYEN', 'Moyen'),
    ('ELEVE', 'Élevé'),
    ('CRITIQUE', 'Critique'),
]

class ModeleML(BaseModel):
    """
    Modèles de Machine Learning pour la détection d'anomalies
    """
    
    TYPES_MODELE = [
        ('ISOLATION_FOREST', 'Isolation Forest'),
        ('ONE_CLASS_SVM', 'One-Class SVM'),
        ('SVM', 'Support Vector Machine'),
        ('LOF', 'Local Outlier Factor'),
        ('AUTOENCODER', 'Autoencoder'),
        ('KMEANS', 'K-Means Clustering'),
        ('GAUSSIAN_MIXTURE', 'Gaussian Mixture Model'),
        ('DBSCAN', 'DBSCAN'),
        ('LSTM', 'LSTM Neural Network'),
        ('RANDOM_FOREST', 'Random Forest'),
        ('GRADIENT_BOOSTING', 'Gradient Boosting'),
        ('XGBOOST', 'XGBoost'),
        ('PROPHET', 'Prophet Time Series'),
        ('NETWORK_ANALYSIS', 'Network Analysis'),
        ('SYSCOHADA_COMPLIANCE', 'SYSCOHADA Compliance'),
        ('ENSEMBLE', 'Ensemble de modèles'),
        ('CUSTOM', 'Modèle personnalisé')
    ]
    
    DOMAINES_APPLICATION = [
        ('ECRITURES_COMPTABLES', 'Écritures comptables'),
        ('FLUX_TRESORERIE', 'Flux de trésorerie'),
        ('RATIOS_FINANCIERS', 'Ratios financiers'),
        ('TRANSACTIONS_BANCAIRES', 'Transactions bancaires'),
        ('DECLARATIONS_FISCALES', 'Déclarations fiscales'),
        ('FACTURES_CLIENTS', 'Factures clients'),
        ('FACTURES_FOURNISSEURS', 'Factures fournisseurs'),
        ('PAIE', 'Paie et charges sociales'),
        ('IMMOBILISATIONS', 'Immobilisations'),
        ('STOCKS', 'Gestion des stocks')
    ]
    
    STATUTS = [
        ('ENTRAINEMENT', 'En cours d\'entraînement'),
        ('PRET', 'Prêt à utiliser'),
        ('ERREUR', 'Erreur d\'entraînement'),
        ('OBSOLETE', 'Obsolète'),
        ('MAINTENANCE', 'Maintenance')
    ]
    
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='modeles_ml',
        null=True,
        blank=True,
        help_text="Null pour modèles globaux"
    )
    
    nom = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    type_modele = models.CharField(max_length=30, choices=TYPES_MODELE)
    domaine_application = models.CharField(max_length=30, choices=DOMAINES_APPLICATION)
    
    # Configuration du modèle
    parametres_modele = models.JSONField(
        default=dict,
        help_text="Paramètres spécifiques au modèle"
    )
    features_utilisees = models.JSONField(
        default=list,
        help_text="Liste des features/variables utilisées"
    )
    preprocessing_config = models.JSONField(
        default=dict,
        help_text="Configuration du preprocessing"
    )
    
    # Entraînement
    date_entrainement = models.DateTimeField(null=True, blank=True)
    donnees_entrainement_periode = models.JSONField(
        default=dict,
        help_text="Période des données d'entraînement"
    )
    taille_dataset = models.PositiveIntegerField(null=True, blank=True)
    
    # Performances
    score_performance = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        null=True,
        blank=True,
        help_text="Score de performance du modèle (0-1)"
    )
    metriques_evaluation = models.JSONField(
        default=dict,
        help_text="Métriques d'évaluation détaillées"
    )
    
    # Seuils de détection
    seuil_anomalie = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        default=Decimal('0.05'),
        help_text="Seuil de détection d'anomalie (0-1)"
    )
    seuil_alerte_critique = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        default=Decimal('0.01'),
        help_text="Seuil d'alerte critique (0-1)"
    )
    
    # État et maintenance
    statut = models.CharField(max_length=20, choices=STATUTS, default='ENTRAINEMENT')
    derniere_utilisation = models.DateTimeField(null=True, blank=True)
    nombre_predictions = models.PositiveIntegerField(default=0)
    
    # Réentraînement automatique
    reentrainement_auto = models.BooleanField(default=True)
    frequence_reentrainement = models.PositiveIntegerField(
        default=30,
        help_text="Fréquence de réentraînement en jours"
    )
    prochaine_reentrainement = models.DateTimeField(null=True, blank=True)
    
    # Métadonnées techniques
    version_modele = models.CharField(max_length=20, default='1.0')
    hash_modele = models.CharField(max_length=64, blank=True)
    taille_modele_mb = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )
    
    actif = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'apps_ml_detection_modeleml'
        verbose_name = 'Modèle ML'
        verbose_name_plural = 'Modèles ML'
        ordering = ['-date_entrainement']
        indexes = [
            models.Index(fields=['company', 'domaine_application', 'actif']),
            models.Index(fields=['statut', 'actif']),
        ]
    
    def __str__(self):
        return f"{self.nom} - {self.get_domaine_application_display()}"
    
    @property
    def besoin_reentrainement(self):
        """Vérifie si le modèle a besoin d'être réentraîné"""
        if not self.prochaine_reentrainement:
            return True
        return timezone.now() >= self.prochaine_reentrainement
    
    @property
    def age_jours(self):
        """Âge du modèle en jours depuis le dernier entraînement"""
        if self.date_entrainement:
            return (timezone.now() - self.date_entrainement).days
        return 0

class DetectionAnomalie(BaseModel):
    """
    Détections d'anomalies effectuées par les modèles ML
    """
    
    TYPES_ANOMALIE = [
        ('VALEUR_ABERRANTE', 'Valeur aberrante'),
        ('PATTERN_ANORMAL', 'Pattern anormal'),
        ('SEQUENCE_SUSPECTE', 'Séquence suspecte'),
        ('DEVIATION_TREND', 'Déviation de tendance'),
        ('OUTLIER_CONTEXTUEL', 'Outlier contextuel'),
        ('ANOMALIE_COLLECTIVE', 'Anomalie collective'),
        ('COMPORTEMENT_INHABITUEL', 'Comportement inhabituel')
    ]
    
    NIVEAUX_SEVERITE = [
        ('FAIBLE', 'Faible'),
        ('MOYEN', 'Moyen'),
        ('ELEVE', 'Élevé'),
        ('CRITIQUE', 'Critique')
    ]
    
    STATUTS = [
        ('DETECTEE', 'Détectée'),
        ('EN_COURS_ANALYSE', 'En cours d\'analyse'),
        ('VALIDEE', 'Validée (vraie anomalie)'),
        ('FAUX_POSITIF', 'Faux positif'),
        ('RESOLUE', 'Résolue'),
        ('IGNOREE', 'Ignorée')
    ]
    
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='detections_anomalies'
    )
    modele = models.ForeignKey(
        ModeleML,
        on_delete=models.CASCADE,
        related_name='detections'
    )
    
    # Informations de détection
    type_anomalie = models.CharField(max_length=30, choices=TYPES_ANOMALIE)
    titre = models.CharField(max_length=200)
    description = models.TextField()
    
    # Scores et métriques
    score_anomalie = models.DecimalField(
        max_digits=10,
        decimal_places=6,
        help_text="Score d'anomalie calculé par le modèle"
    )
    niveau_severite = models.CharField(max_length=10, choices=NIVEAUX_SEVERITE)
    niveau_confiance = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        help_text="Niveau de confiance du modèle (0-1)"
    )
    
    # Données concernées
    objet_type = models.CharField(max_length=100, help_text="Type d'objet concerné")
    objet_id = models.PositiveIntegerField(help_text="ID de l'objet concerné")
    donnees_contextuelles = models.JSONField(
        default=dict,
        help_text="Données contextuelles de l'anomalie"
    )
    features_impactees = models.JSONField(
        default=list,
        help_text="Features/variables ayant contribué à la détection"
    )
    
    # Localisation temporelle
    date_anomalie = models.DateTimeField(help_text="Date/heure de l'anomalie")
    periode_detection = models.JSONField(
        default=dict,
        help_text="Période couverte par la détection"
    )
    
    # Analyse et résolution
    statut = models.CharField(max_length=20, choices=STATUTS, default='DETECTEE')
    date_analyse = models.DateTimeField(null=True, blank=True)
    analyseur = models.ForeignKey(
        'auth.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='analyses_anomalies'
    )
    commentaire_analyse = models.TextField(blank=True)
    
    # Actions correctives
    actions_recommandees = models.JSONField(
        default=list,
        help_text="Actions recommandées pour traiter l'anomalie"
    )
    actions_realisees = models.JSONField(
        default=list,
        help_text="Actions réellement effectuées"
    )
    
    # Suivi
    date_resolution = models.DateTimeField(null=True, blank=True)
    impact_estime = models.TextField(blank=True)
    cout_impact = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Coût estimé de l'impact"
    )
    
    class Meta:
        db_table = 'apps_ml_detection_detectionanomalie'
        verbose_name = 'Détection d\'Anomalie'
        verbose_name_plural = 'Détections d\'Anomalies'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['company', 'statut', 'niveau_severite']),
            models.Index(fields=['date_anomalie', 'score_anomalie']),
            models.Index(fields=['objet_type', 'objet_id']),
        ]
    
    def __str__(self):
        return f"{self.titre} - {self.get_niveau_severite_display()}"
    
    @property
    def est_critique(self):
        """Vérifie si l'anomalie est critique"""
        return self.niveau_severite == 'CRITIQUE' or self.score_anomalie >= self.modele.seuil_alerte_critique
    
    @property
    def duree_non_resolue(self):
        """Durée depuis la détection sans résolution"""
        if self.statut in ['RESOLUE', 'FAUX_POSITIF', 'IGNOREE']:
            return 0
        return (timezone.now() - self.created_at).days

class RegleDetection(BaseModel):
    """
    Règles de détection d'anomalies basées sur des seuils et conditions
    """
    
    TYPES_REGLE = [
        ('SEUIL_SIMPLE', 'Seuil simple'),
        ('SEUIL_DOUBLE', 'Seuil double (min/max)'),
        ('VARIATION_RELATIVE', 'Variation relative'),
        ('VARIATION_ABSOLUE', 'Variation absolue'),
        ('PATTERN_TEMPOREL', 'Pattern temporel'),
        ('CORRELATION', 'Corrélation'),
        ('RATIO', 'Ratio'),
        ('SEQUENCE', 'Séquence'),
        ('FREQUENCE', 'Fréquence'),
        ('COMPOSITE', 'Règle composite')
    ]
    
    OPERATEURS = [
        ('GT', 'Supérieur à (>)'),
        ('GTE', 'Supérieur ou égal (>=)'),
        ('LT', 'Inférieur à (<)'),
        ('LTE', 'Inférieur ou égal (<=)'),
        ('EQ', 'Égal à (=)'),
        ('NEQ', 'Différent de (!=)'),
        ('BETWEEN', 'Entre deux valeurs'),
        ('NOT_BETWEEN', 'Pas entre deux valeurs'),
        ('IN', 'Dans une liste'),
        ('NOT_IN', 'Pas dans une liste'),
        ('CONTAINS', 'Contient'),
        ('REGEX', 'Expression régulière')
    ]
    
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='regles_detection'
    )
    
    nom = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    type_regle = models.CharField(max_length=20, choices=TYPES_REGLE)
    
    # Configuration de la règle
    champ_cible = models.CharField(
        max_length=100,
        help_text="Champ ou métrique à analyser"
    )
    operateur = models.CharField(max_length=15, choices=OPERATEURS)
    valeur_seuil = models.DecimalField(
        max_digits=15,
        decimal_places=6,
        null=True,
        blank=True
    )
    valeur_seuil_max = models.DecimalField(
        max_digits=15,
        decimal_places=6,
        null=True,
        blank=True,
        help_text="Pour les seuils doubles"
    )
    
    # Conditions avancées
    conditions_sql = models.TextField(
        blank=True,
        help_text="Conditions SQL additionnelles"
    )
    parametres_avances = models.JSONField(
        default=dict,
        help_text="Paramètres spécifiques au type de règle"
    )
    
    # Période d'application
    periode_analyse = models.CharField(
        max_length=20,
        choices=[
            ('TEMPS_REEL', 'Temps réel'),
            ('QUOTIDIEN', 'Quotidien'),
            ('HEBDOMADAIRE', 'Hebdomadaire'),
            ('MENSUEL', 'Mensuel'),
            ('PERSONNALISE', 'Personnalisé')
        ],
        default='QUOTIDIEN'
    )
    fenetre_temporelle = models.PositiveIntegerField(
        default=1,
        help_text="Taille de la fenêtre temporelle (en unités de période)"
    )
    
    # Criticité et actions
    severite_defaut = models.CharField(
        max_length=10,
        choices=NIVEAUX_SEVERITE,
        default='MOYEN'
    )
    message_alerte = models.CharField(max_length=500, blank=True)
    actions_automatiques = models.JSONField(
        default=list,
        help_text="Actions à déclencher automatiquement"
    )
    
    # Gestion des faux positifs
    tolerance_faux_positifs = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        default=Decimal('0.05'),
        help_text="Seuil de tolérance aux faux positifs"
    )
    apprentissage_actif = models.BooleanField(
        default=True,
        help_text="Ajustement automatique basé sur les feedbacks"
    )
    
    # État
    actif = models.BooleanField(default=True)
    derniere_execution = models.DateTimeField(null=True, blank=True)
    prochaine_execution = models.DateTimeField(null=True, blank=True)
    nombre_detections = models.PositiveIntegerField(default=0)
    taux_faux_positifs = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        default=0
    )
    
    class Meta:
        db_table = 'apps_ml_detection_regledetection'
        verbose_name = 'Règle de Détection'
        verbose_name_plural = 'Règles de Détection'
        ordering = ['nom']
    
    def __str__(self):
        return f"{self.nom} - {self.get_type_regle_display()}"

class CampagneEntrainement(BaseModel):
    """
    Campagnes d'entraînement des modèles ML
    """
    
    TYPES_CAMPAGNE = [
        ('INITIAL', 'Entraînement initial'),
        ('REENTRAINEMENT', 'Réentraînement'),
        ('MISE_A_JOUR', 'Mise à jour'),
        ('OPTIMISATION', 'Optimisation'),
        ('VALIDATION_CROISEE', 'Validation croisée'),
        ('HYPERPARAMETRES', 'Optimisation hyperparamètres')
    ]
    
    STATUTS = [
        ('PLANIFIEE', 'Planifiée'),
        ('EN_COURS', 'En cours'),
        ('TERMINEE', 'Terminée'),
        ('ECHEC', 'Échec'),
        ('ANNULEE', 'Annulée')
    ]
    
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='campagnes_entrainement'
    )
    modele = models.ForeignKey(
        ModeleML,
        on_delete=models.CASCADE,
        related_name='campagnes_entrainement'
    )
    
    nom = models.CharField(max_length=200)
    type_campagne = models.CharField(max_length=20, choices=TYPES_CAMPAGNE)
    
    # Configuration
    periode_donnees_debut = models.DateField()
    periode_donnees_fin = models.DateField()
    taille_echantillon = models.PositiveIntegerField(null=True, blank=True)
    strategie_echantillonnage = models.CharField(
        max_length=20,
        choices=[
            ('ALEATOIRE', 'Aléatoire'),
            ('STRATIFIE', 'Stratifié'),
            ('TEMPORAL', 'Temporel'),
            ('COMPLET', 'Dataset complet')
        ],
        default='TEMPORAL'
    )
    
    # Paramètres d'entraînement
    parametres_entrainement = models.JSONField(
        default=dict,
        help_text="Paramètres spécifiques à l'entraînement"
    )
    validation_split = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=Decimal('0.20'),
        help_text="Proportion des données pour validation (0-1)"
    )
    
    # Exécution
    statut = models.CharField(max_length=15, choices=STATUTS, default='PLANIFIEE')
    date_debut = models.DateTimeField(null=True, blank=True)
    date_fin = models.DateTimeField(null=True, blank=True)
    duree_minutes = models.PositiveIntegerField(null=True, blank=True)
    
    # Résultats
    score_final = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        null=True,
        blank=True
    )
    metriques_finales = models.JSONField(
        default=dict,
        help_text="Métriques finales de performance"
    )
    modele_precedent_score = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        null=True,
        blank=True,
        help_text="Score du modèle précédent pour comparaison"
    )
    amelioration = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        null=True,
        blank=True,
        help_text="Amélioration par rapport au modèle précédent"
    )
    
    # Logs et diagnostics
    log_execution = models.TextField(blank=True)
    erreurs = models.TextField(blank=True)
    ressources_utilisees = models.JSONField(
        default=dict,
        help_text="CPU, mémoire, temps, etc."
    )
    
    # Validation
    modele_valide = models.BooleanField(default=False)
    commentaires_validation = models.TextField(blank=True)
    deploye = models.BooleanField(default=False)
    date_deploiement = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'apps_ml_detection_campagneentrainement'
        verbose_name = 'Campagne d\'Entraînement'
        verbose_name_plural = 'Campagnes d\'Entraînement'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.nom} - {self.modele.nom}"
    
    @property
    def taux_amelioration(self):
        """Calcule le taux d'amélioration en pourcentage"""
        if self.amelioration is not None and self.modele_precedent_score:
            return (self.amelioration / self.modele_precedent_score) * 100
        return 0

class FeedbackAnomalie(BaseModel):
    """
    Feedbacks des utilisateurs sur les détections d'anomalies
    """
    
    TYPES_FEEDBACK = [
        ('VRAI_POSITIF', 'Vrai positif - Anomalie confirmée'),
        ('FAUX_POSITIF', 'Faux positif - Pas d\'anomalie'),
        ('VRAI_NEGATIF', 'Vrai négatif - Absence confirmée'),
        ('FAUX_NEGATIF', 'Faux négatif - Anomalie manquée'),
        ('INCERTAIN', 'Incertain - Nécessite investigation')
    ]
    
    detection = models.ForeignKey(
        DetectionAnomalie,
        on_delete=models.CASCADE,
        related_name='feedbacks'
    )
    utilisateur = models.ForeignKey(
        'auth.User',
        on_delete=models.CASCADE,
        related_name='feedbacks_anomalies'
    )
    
    type_feedback = models.CharField(max_length=15, choices=TYPES_FEEDBACK)
    commentaire = models.TextField(blank=True)
    
    # Informations additionnelles
    cause_identifiee = models.TextField(blank=True)
    solution_appliquee = models.TextField(blank=True)
    prevention_future = models.TextField(blank=True)
    
    # Évaluation de la pertinence
    pertinence_detection = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Pertinence de 1 (pas du tout) à 5 (très pertinente)"
    )
    utilite_alerte = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Utilité de l'alerte de 1 (inutile) à 5 (très utile)"
    )
    
    # Amélioration suggérée
    suggestions_amelioration = models.TextField(blank=True)
    
    class Meta:
        db_table = 'apps_ml_detection_feedbackanomalie'
        verbose_name = 'Feedback Anomalie'
        verbose_name_plural = 'Feedbacks Anomalies'
        ordering = ['-created_at']
        unique_together = ['detection', 'utilisateur']
    
    def __str__(self):
        return f"Feedback {self.get_type_feedback_display()} - {self.detection.titre}"

class StatistiqueDetection(BaseModel):
    """
    Statistiques agrégées des détections d'anomalies
    """
    
    PERIODES = [
        ('JOUR', 'Journalière'),
        ('SEMAINE', 'Hebdomadaire'),
        ('MOIS', 'Mensuelle'),
        ('TRIMESTRE', 'Trimestrielle'),
        ('ANNEE', 'Annuelle')
    ]
    
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='statistiques_detection'
    )
    modele = models.ForeignKey(
        ModeleML,
        on_delete=models.CASCADE,
        related_name='statistiques',
        null=True,
        blank=True,
        help_text="Null pour statistiques globales"
    )
    
    periode = models.CharField(max_length=10, choices=PERIODES)
    date_periode = models.DateField()
    
    # Compteurs de détections
    total_detections = models.PositiveIntegerField(default=0)
    detections_critiques = models.PositiveIntegerField(default=0)
    detections_elevees = models.PositiveIntegerField(default=0)
    detections_moyennes = models.PositiveIntegerField(default=0)
    detections_faibles = models.PositiveIntegerField(default=0)
    
    # Résolutions
    detections_resolues = models.PositiveIntegerField(default=0)
    faux_positifs = models.PositiveIntegerField(default=0)
    vrais_positifs = models.PositiveIntegerField(default=0)
    en_attente = models.PositiveIntegerField(default=0)
    
    # Temps de traitement
    temps_moyen_resolution_heures = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )
    temps_max_resolution_heures = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )
    
    # Coûts estimés
    cout_total_impact = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True
    )
    cout_moyen_par_anomalie = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True
    )
    
    # Métriques de qualité
    taux_faux_positifs = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        default=0
    )
    precision_modele = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        null=True,
        blank=True
    )
    rappel_modele = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        null=True,
        blank=True
    )
    f1_score = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        null=True,
        blank=True
    )
    
    class Meta:
        db_table = 'apps_ml_detection_statistiquedetection'
        verbose_name = 'Statistique de Détection'
        verbose_name_plural = 'Statistiques de Détection'
        ordering = ['-date_periode']
        unique_together = ['company', 'modele', 'periode', 'date_periode']
    
    def __str__(self):
        modele_nom = self.modele.nom if self.modele else "Global"
        return f"Stats {modele_nom} - {self.date_periode}"