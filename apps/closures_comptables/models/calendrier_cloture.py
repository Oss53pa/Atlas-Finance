"""
Calendrier de Clôture Intelligent WiseBook
Gestion multi-niveaux avec dépendances et notifications automatiques
"""
from django.db import models
from django.contrib.postgres.fields import JSONField, ArrayField
from django.contrib.auth.models import User
from django.utils import timezone
from decimal import Decimal
import uuid
from datetime import datetime, timedelta

from apps.core.models import TimeStampedModel
from apps.accounting.models import Company, FiscalYear


class CalendrierClotureIntelligent(TimeStampedModel):
    """
    Calendrier principal de clôture avec vue multi-niveaux
    """

    VUES_CALENDRIER = [
        ('JOUR', 'Vue Journalière'),
        ('SEMAINE', 'Vue Hebdomadaire'),
        ('MOIS', 'Vue Mensuelle'),
        ('TRIMESTRE', 'Vue Trimestrielle'),
        ('ANNEE', 'Vue Annuelle'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    societe = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='calendriers_cloture')
    exercice = models.ForeignKey(FiscalYear, on_delete=models.CASCADE, related_name='calendriers_cloture')

    # Configuration calendrier
    nom_calendrier = models.CharField(max_length=200, verbose_name="Nom du calendrier")
    description = models.TextField(blank=True)
    vue_par_defaut = models.CharField(max_length=20, choices=VUES_CALENDRIER, default='MOIS')

    # Paramètres généraux
    fuseau_horaire = models.CharField(max_length=50, default='Africa/Douala')
    jours_ouvres = ArrayField(
        models.CharField(max_length=10),
        default=list(['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI']),
        verbose_name="Jours ouvrés"
    )

    # Délais par défaut
    delai_mensuel_jours = models.PositiveIntegerField(default=5, verbose_name="Délai clôture mensuelle (J+)")
    delai_trimestriel_jours = models.PositiveIntegerField(default=15, verbose_name="Délai clôture trimestrielle (J+)")
    delai_annuel_jours = models.PositiveIntegerField(default=45, verbose_name="Délai clôture annuelle (J+)")

    # Notifications
    notifications_activees = models.BooleanField(default=True)
    rappels_automatiques = models.BooleanField(default=True)
    escalade_automatique = models.BooleanField(default=True)

    # Intégrations externes
    integration_outlook = models.BooleanField(default=False)
    integration_google_calendar = models.BooleanField(default=False)
    webhook_url = models.URLField(blank=True, verbose_name="URL webhook notifications")

    # Configuration avancée
    seuils_alerte = JSONField(default=dict, verbose_name="Seuils d'alerte personnalisés")
    regles_escalade = JSONField(default=dict, verbose_name="Règles d'escalade automatique")

    class Meta:
        db_table = 'calendrier_cloture_intelligent'
        unique_together = [('societe', 'exercice')]
        verbose_name = "Calendrier Clôture Intelligent"
        verbose_name_plural = "Calendriers Clôture Intelligents"


class TacheClotureCalendrier(TimeStampedModel):
    """
    Tâche individuelle dans le calendrier de clôture
    """

    TYPES_TACHE = [
        ('PROVISION', 'Calcul Provisions'),
        ('AMORTISSEMENT', 'Calcul Amortissements'),
        ('REGULARISATION', 'Régularisations'),
        ('RAPPROCHEMENT', 'Rapprochements'),
        ('CONTROLE', 'Contrôles'),
        ('VALIDATION', 'Validation'),
        ('APPROBATION', 'Approbation'),
        ('REPORTING', 'Génération États'),
        ('ARCHIVAGE', 'Archivage'),
        ('JALON', 'Jalon Important'),
        ('REUNION', 'Réunion'),
        ('DEADLINE', 'Échéance'),
    ]

    PRIORITES = [
        ('BASSE', 'Basse'),
        ('NORMALE', 'Normale'),
        ('HAUTE', 'Haute'),
        ('CRITIQUE', 'Critique'),
        ('BLOQUANTE', 'Bloquante'),
    ]

    STATUTS_TACHE = [
        ('PLANIFIEE', 'Planifiée'),
        ('EN_ATTENTE', 'En Attente'),
        ('EN_COURS', 'En Cours'),
        ('TERMINEE', 'Terminée'),
        ('EN_RETARD', 'En Retard'),
        ('ANNULEE', 'Annulée'),
        ('REPORTEE', 'Reportée'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    calendrier = models.ForeignKey(CalendrierClotureIntelligent, on_delete=models.CASCADE, related_name='taches')

    # Identification
    nom_tache = models.CharField(max_length=200)
    type_tache = models.CharField(max_length=20, choices=TYPES_TACHE)
    description = models.TextField(blank=True)
    priorite = models.CharField(max_length=20, choices=PRIORITES, default='NORMALE')

    # Planification
    date_debut_prevue = models.DateTimeField()
    date_fin_prevue = models.DateTimeField()
    duree_estimee_heures = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal('1'))

    # Exécution
    date_debut_reelle = models.DateTimeField(null=True, blank=True)
    date_fin_reelle = models.DateTimeField(null=True, blank=True)
    duree_reelle_heures = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)

    # État
    statut = models.CharField(max_length=20, choices=STATUTS_TACHE, default='PLANIFIEE')
    pourcentage_avancement = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0'))

    # Responsabilités
    responsable_principal = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='taches_assignees')
    intervenants = models.ManyToManyField(User, blank=True, related_name='taches_participees')
    delegue_a = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='taches_deleguees')

    # Dépendances et jalons
    dependances = models.ManyToManyField('self', blank=True, symmetrical=False, related_name='taches_dependantes')
    est_jalon = models.BooleanField(default=False)
    est_critique = models.BooleanField(default=False)  # Chemin critique

    # Notifications
    notifications_configurees = JSONField(default=dict, verbose_name="Configuration notifications")
    derniere_notification = models.DateTimeField(null=True, blank=True)

    # Résultats et validation
    resultats = JSONField(default=dict, verbose_name="Résultats de la tâche")
    validee_par = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='taches_validees')
    commentaires = models.TextField(blank=True)

    # Récurrence
    est_recurrente = models.BooleanField(default=False)
    pattern_recurrence = JSONField(default=dict, verbose_name="Modèle de récurrence")

    class Meta:
        db_table = 'taches_calendrier_cloture'
        indexes = [
            models.Index(fields=['calendrier', 'date_debut_prevue']),
            models.Index(fields=['responsable_principal', 'statut']),
            models.Index(fields=['priorite', 'est_critique']),
        ]
        ordering = ['date_debut_prevue', 'priorite']
        verbose_name = "Tâche Calendrier Clôture"
        verbose_name_plural = "Tâches Calendrier Clôture"


class MatriceResponsabilites(TimeStampedModel):
    """
    Matrice de responsabilités granulaire avec rôles et permissions
    """

    NIVEAUX_RESPONSABILITE = [
        ('SAISIE', 'Saisie'),
        ('CONTROLE', 'Contrôle'),
        ('VALIDATION', 'Validation'),
        ('APPROBATION', 'Approbation'),
        ('SIGNATURE', 'Signature'),
        ('ARCHIVAGE', 'Archivage'),
    ]

    TYPES_OPERATION = [
        ('PROVISIONS_CLIENTS', 'Provisions Clients'),
        ('PROVISIONS_STOCKS', 'Provisions Stocks'),
        ('PROVISIONS_RISQUES', 'Provisions Risques'),
        ('AMORTISSEMENTS', 'Amortissements'),
        ('REGULARISATIONS', 'Régularisations'),
        ('RAPPROCHEMENTS', 'Rapprochements'),
        ('ETATS_FINANCIERS', 'États Financiers'),
        ('CONSOLIDATION', 'Consolidation'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    societe = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='matrices_responsabilites')

    # Configuration
    niveau_responsabilite = models.CharField(max_length=20, choices=NIVEAUX_RESPONSABILITE)
    type_operation = models.CharField(max_length=30, choices=TYPES_OPERATION)

    # Utilisateurs autorisés
    utilisateurs_autorises = models.ManyToManyField(User, related_name='responsabilites_cloture')

    # Seuils de montants
    seuil_montant_min = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    seuil_montant_max = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)

    # Délégation
    delegation_autorisee = models.BooleanField(default=False)
    delegation_temporaire = models.BooleanField(default=False)
    duree_max_delegation_jours = models.PositiveIntegerField(default=7)

    # Conditions d'activation
    conditions_activation = JSONField(default=dict, verbose_name="Conditions d'activation du rôle")

    # Signature électronique
    signature_electronique_requise = models.BooleanField(default=False)
    certificat_requis = models.CharField(max_length=100, blank=True)

    class Meta:
        db_table = 'matrice_responsabilites_cloture'
        unique_together = [('societe', 'niveau_responsabilite', 'type_operation')]
        verbose_name = "Matrice Responsabilités"
        verbose_name_plural = "Matrices Responsabilités"


class JournalOperationsRegulariser(TimeStampedModel):
    """
    Journal temps réel des opérations à régulariser
    """

    STATUTS_OPERATION = [
        ('IDENTIFIEE', 'Identifiée'),
        ('ANALYSEE', 'Analysée'),
        ('EN_COURS', 'En Cours'),
        ('VALIDEE', 'Validée'),
        ('TERMINEE', 'Terminée'),
        ('REJETEE', 'Rejetée'),
    ]

    IMPACTS_FINANCIERS = [
        ('FAIBLE', 'Faible (< 10K)'),
        ('MOYEN', 'Moyen (10K-100K)'),
        ('FORT', 'Fort (100K-1M)'),
        ('CRITIQUE', 'Critique (> 1M)'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    societe = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='operations_a_regulariser')
    exercice = models.ForeignKey(FiscalYear, on_delete=models.CASCADE)

    # Identification
    numero_operation = models.CharField(max_length=20, unique=True)
    nom_operation = models.CharField(max_length=200)
    description_detaillee = models.TextField()

    # Classification
    type_regularisation = models.CharField(max_length=50)
    compte_concerne = models.CharField(max_length=20, verbose_name="Numéro de compte")
    periode_concernee = models.CharField(max_length=20)

    # Impact et priorité
    montant_estime = models.DecimalField(max_digits=15, decimal_places=2)
    impact_financier = models.CharField(max_length=20, choices=IMPACTS_FINANCIERS)
    priorite_calculee = models.PositiveIntegerField(default=50, verbose_name="Priorité (1-100)")

    # État et suivi
    statut = models.CharField(max_length=20, choices=STATUTS_OPERATION, default='IDENTIFIEE')
    date_identification = models.DateTimeField(auto_now_add=True)
    date_echeance = models.DateTimeField()
    date_realisation = models.DateTimeField(null=True, blank=True)

    # Responsabilités
    identifiee_par = models.ForeignKey(User, on_delete=models.PROTECT, related_name='operations_identifiees')
    assignee_a = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='operations_assignees')
    validee_par = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='operations_validees')

    # Documentation
    pieces_justificatives = ArrayField(
        models.CharField(max_length=500),
        default=list,
        blank=True,
        verbose_name="Pièces justificatives"
    )
    commentaires = models.TextField(blank=True)
    notes_validation = models.TextField(blank=True)

    # Liens comptables
    ecriture_generee = models.ForeignKey(
        'accounting.JournalEntry',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='operations_regularisation'
    )

    # Suivi automatique
    derniere_mise_a_jour = models.DateTimeField(auto_now=True)
    notifications_envoyees = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'journal_operations_regulariser'
        indexes = [
            models.Index(fields=['societe', 'statut', '-priorite_calculee']),
            models.Index(fields=['assignee_a', 'date_echeance']),
            models.Index(fields=['impact_financier', 'date_identification']),
        ]
        ordering = ['-priorite_calculee', 'date_echeance']
        verbose_name = "Opération à Régulariser"
        verbose_name_plural = "Opérations à Régulariser"


class MoteurReglesParametrable(TimeStampedModel):
    """
    Moteur de règles métier paramétrable pour automatisation
    """

    TYPES_REGLES = [
        ('PROVISION_AUTO', 'Provision Automatique'),
        ('AMORTISSEMENT_AUTO', 'Amortissement Automatique'),
        ('REGULARISATION_AUTO', 'Régularisation Automatique'),
        ('CONTROLE_AUTO', 'Contrôle Automatique'),
        ('NOTIFICATION_AUTO', 'Notification Automatique'),
        ('ESCALADE_AUTO', 'Escalade Automatique'),
    ]

    METHODES_CALCUL = [
        ('POURCENTAGE', 'Pourcentage Fixe'),
        ('BAREME', 'Barème SYSCOHADA'),
        ('FORMULE', 'Formule Personnalisée'),
        ('HISTORIQUE', 'Basé sur Historique'),
        ('SEUIL', 'Par Seuils'),
        ('CONDITIONNEL', 'Conditionnel'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    societe = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='regles_automatisation')

    # Identification
    nom_regle = models.CharField(max_length=200)
    code_regle = models.CharField(max_length=50, unique=True)
    type_regle = models.CharField(max_length=30, choices=TYPES_REGLES)
    description = models.TextField()

    # Configuration
    est_active = models.BooleanField(default=True)
    methode_calcul = models.CharField(max_length=20, choices=METHODES_CALCUL)
    formule_calcul = models.TextField(blank=True, verbose_name="Formule de calcul")

    # Conditions d'application
    conditions_application = JSONField(default=dict, verbose_name="Conditions d'application")
    comptes_concernes = ArrayField(
        models.CharField(max_length=20),
        default=list,
        verbose_name="Comptes concernés"
    )
    periodes_applicables = ArrayField(
        models.CharField(max_length=20),
        default=list,
        verbose_name="Périodes applicables"
    )

    # Paramètres de calcul
    parametres_calcul = JSONField(default=dict, verbose_name="Paramètres de calcul")
    seuils_declenchement = JSONField(default=dict, verbose_name="Seuils de déclenchement")

    # Comptes comptables pour écritures automatiques
    compte_debit_defaut = models.CharField(max_length=20, blank=True)
    compte_credit_defaut = models.CharField(max_length=20, blank=True)

    # Validation et approbation
    validation_requise = models.BooleanField(default=True)
    approbation_requise = models.BooleanField(default=False)
    seuil_approbation = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)

    # Historique d'utilisation
    nombre_utilisations = models.PositiveIntegerField(default=0)
    derniere_utilisation = models.DateTimeField(null=True, blank=True)
    taux_succes = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('100'))

    # Documentation
    reference_syscohada = models.CharField(max_length=200, blank=True)
    documentation_interne = models.TextField(blank=True)

    class Meta:
        db_table = 'moteur_regles_parametrable'
        indexes = [
            models.Index(fields=['societe', 'type_regle', 'est_active']),
            models.Index(fields=['code_regle']),
        ]
        verbose_name = "Règle Paramétrable"
        verbose_name_plural = "Règles Paramétrables"


class WorkflowValidationMultiNiveaux(TimeStampedModel):
    """
    Workflow de validation configurable avec circuit multi-niveaux
    """

    NIVEAUX_VALIDATION = [
        ('NIVEAU_1', 'Niveau 1 - Saisie'),
        ('NIVEAU_2', 'Niveau 2 - Contrôle'),
        ('NIVEAU_3', 'Niveau 3 - Validation'),
        ('NIVEAU_4', 'Niveau 4 - Approbation'),
        ('NIVEAU_5', 'Niveau 5 - Signature'),
    ]

    ACTIONS_POSSIBLES = [
        ('APPROUVER', 'Approuver'),
        ('REJETER', 'Rejeter'),
        ('DEMANDER_INFO', 'Demander Information'),
        ('DELEGUER', 'Déléguer'),
        ('ESCALADER', 'Escalader'),
        ('MODIFIER', 'Modifier'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    societe = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='workflows_validation')

    # Configuration du workflow
    nom_workflow = models.CharField(max_length=200)
    type_operation = models.CharField(max_length=50)
    niveau_validation = models.CharField(max_length=20, choices=NIVEAUX_VALIDATION)

    # Utilisateur et action
    utilisateur = models.ForeignKey(User, on_delete=models.CASCADE)
    action_effectuee = models.CharField(max_length=20, choices=ACTIONS_POSSIBLES)
    date_action = models.DateTimeField(auto_now_add=True)

    # Objet validé
    objet_type = models.CharField(max_length=100)  # Type d'objet (période, opération, etc.)
    objet_id = models.UUIDField()  # ID de l'objet

    # Détails de l'action
    commentaires = models.TextField(blank=True)
    pieces_jointes = ArrayField(
        models.CharField(max_length=500),
        default=list,
        blank=True
    )

    # Signature électronique
    signature_electronique = models.TextField(blank=True)
    certificat_numerique = models.TextField(blank=True)
    horodatage_certifie = models.DateTimeField(null=True, blank=True)

    # Géolocalisation et sécurité
    adresse_ip = models.GenericIPAddressField(null=True, blank=True)
    agent_utilisateur = models.TextField(blank=True)
    pays_connexion = models.CharField(max_length=2, blank=True)
    ville_connexion = models.CharField(max_length=100, blank=True)

    # Délégation
    delegue_a = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='validations_deleguees')
    raison_delegation = models.TextField(blank=True)
    duree_delegation = models.PositiveIntegerField(null=True, blank=True, verbose_name="Durée délégation (jours)")

    # Escalade automatique
    escalade_automatique = models.BooleanField(default=False)
    delai_escalade_heures = models.PositiveIntegerField(null=True, blank=True)
    niveau_escalade = models.CharField(max_length=20, blank=True)

    class Meta:
        db_table = 'workflow_validation_multi_niveaux'
        indexes = [
            models.Index(fields=['societe', 'type_operation', 'niveau_validation']),
            models.Index(fields=['utilisateur', 'date_action']),
            models.Index(fields=['objet_type', 'objet_id']),
        ]
        ordering = ['-date_action']
        verbose_name = "Workflow Validation"
        verbose_name_plural = "Workflows Validation"


class IndicateursPerformanceCloture(TimeStampedModel):
    """
    Indicateurs de performance pour tableau de bord temps réel
    """

    TYPES_INDICATEUR = [
        ('PROGRESSION', 'Progression Globale'),
        ('DELAIS', 'Délais par Étape'),
        ('TAUX_ERREUR', 'Taux d\'Erreur'),
        ('RESPECT_ECHEANCES', 'Respect Échéances'),
        ('CHARGE_TRAVAIL', 'Charge de Travail'),
        ('QUALITE', 'Qualité des Données'),
        ('SATISFACTION', 'Satisfaction Utilisateurs'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    societe = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='indicateurs_performance')

    # Période de mesure
    date_mesure = models.DateTimeField(auto_now_add=True)
    periode_reference = models.CharField(max_length=50)

    # Type et valeur
    type_indicateur = models.CharField(max_length=30, choices=TYPES_INDICATEUR)
    nom_indicateur = models.CharField(max_length=200)
    valeur_numerique = models.DecimalField(max_digits=15, decimal_places=4)
    unite_mesure = models.CharField(max_length=20)  # %, jours, nombre, etc.

    # Contexte
    utilisateur_concerne = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    etape_concernee = models.CharField(max_length=100, blank=True)

    # Objectifs et seuils
    valeur_cible = models.DecimalField(max_digits=15, decimal_places=4, null=True, blank=True)
    seuil_alerte = models.DecimalField(max_digits=15, decimal_places=4, null=True, blank=True)
    seuil_critique = models.DecimalField(max_digits=15, decimal_places=4, null=True, blank=True)

    # Évolution
    valeur_precedente = models.DecimalField(max_digits=15, decimal_places=4, null=True, blank=True)
    evolution_pourcentage = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    tendance = models.CharField(max_length=20, choices=[
        ('AMELIORATION', 'Amélioration'),
        ('DEGRADATION', 'Dégradation'),
        ('STABLE', 'Stable'),
    ], blank=True)

    # Métadonnées
    donnees_detaillees = JSONField(default=dict, verbose_name="Données détaillées")
    calcul_automatique = models.BooleanField(default=True)

    class Meta:
        db_table = 'indicateurs_performance_cloture'
        indexes = [
            models.Index(fields=['societe', 'type_indicateur', '-date_mesure']),
            models.Index(fields=['periode_reference', 'nom_indicateur']),
        ]
        ordering = ['-date_mesure']
        verbose_name = "Indicateur Performance"
        verbose_name_plural = "Indicateurs Performance"


class NotificationMultiCanaux(TimeStampedModel):
    """
    Système de notifications multi-canaux automatisées
    """

    TYPES_NOTIFICATION = [
        ('ECHEANCE_PROCHE', 'Échéance Proche'),
        ('RETARD_DETECTE', 'Retard Détecté'),
        ('TACHE_ASSIGNEE', 'Tâche Assignée'),
        ('VALIDATION_REQUISE', 'Validation Requise'),
        ('ERREUR_DETECTEE', 'Erreur Détectée'),
        ('CLOTURE_TERMINEE', 'Clôture Terminée'),
        ('RAPPORT_DISPONIBLE', 'Rapport Disponible'),
    ]

    CANAUX_NOTIFICATION = [
        ('EMAIL', 'Email'),
        ('SMS', 'SMS'),
        ('PUSH_WEB', 'Notification Push Web'),
        ('TEAMS', 'Microsoft Teams'),
        ('SLACK', 'Slack'),
        ('WEBHOOK', 'Webhook Personnalisé'),
        ('APPLI_MOBILE', 'Application Mobile'),
    ]

    PRIORITES = [
        ('BASSE', 'Basse'),
        ('NORMALE', 'Normale'),
        ('HAUTE', 'Haute'),
        ('URGENTE', 'Urgente'),
        ('CRITIQUE', 'Critique'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    societe = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='notifications_cloture')

    # Configuration
    type_notification = models.CharField(max_length=30, choices=TYPES_NOTIFICATION)
    canal = models.CharField(max_length=20, choices=CANAUX_NOTIFICATION)
    priorite = models.CharField(max_length=20, choices=PRIORITES, default='NORMALE')

    # Destinataire
    destinataire = models.ForeignKey(User, on_delete=models.CASCADE)
    adresse_destination = models.CharField(max_length=200, verbose_name="Email, téléphone ou URL")

    # Contenu
    titre = models.CharField(max_length=200)
    message = models.TextField()
    donnees_contexte = JSONField(default=dict, verbose_name="Données contextuelles")

    # Planification
    programmee_pour = models.DateTimeField()
    envoyee_le = models.DateTimeField(null=True, blank=True)
    statut_livraison = models.CharField(max_length=20, choices=[
        ('EN_ATTENTE', 'En Attente'),
        ('ENVOYEE', 'Envoyée'),
        ('LIVREE', 'Livrée'),
        ('ECHEC', 'Échec'),
        ('LUE', 'Lue'),
        ('ACTIONNEE', 'Actionnée'),
    ], default='EN_ATTENTE')

    # Interaction
    lue_le = models.DateTimeField(null=True, blank=True)
    action_prise = models.BooleanField(default=False)
    reponse_utilisateur = models.TextField(blank=True)

    # Récurrence et retry
    est_recurrente = models.BooleanField(default=False)
    tentatives_envoi = models.PositiveIntegerField(default=0)
    max_tentatives = models.PositiveIntegerField(default=3)

    class Meta:
        db_table = 'notifications_multi_canaux'
        indexes = [
            models.Index(fields=['societe', 'type_notification', '-programmee_pour']),
            models.Index(fields=['destinataire', 'statut_livraison']),
            models.Index(fields=['canal', 'priorite']),
        ]
        ordering = ['-programmee_pour']
        verbose_name = "Notification Multi-Canaux"
        verbose_name_plural = "Notifications Multi-Canaux"