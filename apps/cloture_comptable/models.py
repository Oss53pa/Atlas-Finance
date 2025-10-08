"""
Module de Gestion de Clôture Comptable Périodique WiseBook
Modèles conformes au cahier des charges - Intégration système existant
"""
from django.db import models
from django.contrib.postgres.fields import JSONField, ArrayField
from django.contrib.auth.models import User
from django.utils import timezone
from decimal import Decimal
import uuid

from apps.core.models import TimeStampedModel
from apps.accounting.models import Company, FiscalYear, ChartOfAccounts, JournalEntry, Journal


class ClotureComptablePeriodique(TimeStampedModel):
    """
    Période de clôture intégrée au système comptable existant
    """

    TYPES_CLOTURE = [
        ('MENSUELLE', 'Clôture mensuelle'),
        ('TRIMESTRIELLE', 'Clôture trimestrielle'),
        ('SEMESTRIELLE', 'Clôture semestrielle'),
        ('ANNUELLE', 'Clôture annuelle'),
        ('SPECIALE', 'Clôtures spéciales'),
    ]

    STATUTS_CLOTURE = [
        ('PLANIFIEE', 'Planifiée'),
        ('EN_COURS', 'En cours'),
        ('CONTROLE', 'En contrôle'),
        ('VALIDATION', 'En validation'),
        ('APPROUVEE', 'Approuvée'),
        ('TERMINEE', 'Terminée'),
        ('ARCHIVEE', 'Archivée'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='clotures')
    fiscal_year = models.ForeignKey(FiscalYear, on_delete=models.CASCADE, related_name='clotures')

    # Configuration de base selon cahier des charges
    type_cloture = models.CharField(max_length=20, choices=TYPES_CLOTURE)
    nom_periode = models.CharField(max_length=200)
    date_debut = models.DateField()
    date_fin = models.DateField()
    date_echeance = models.DateField()

    # Responsables selon matrice de responsabilités
    responsable_principal = models.ForeignKey(User, on_delete=models.PROTECT, related_name='clotures_responsable')
    intervenants = models.ManyToManyField(User, related_name='clotures_intervenant')

    # Paramétrage selon cahier des charges
    seuils_materialite = JSONField(default=dict)
    configuration_devises = JSONField(default=dict)

    # État et progression
    statut = models.CharField(max_length=20, choices=STATUTS_CLOTURE, default='PLANIFIEE')
    progression_pourcentage = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0'))

    # Métriques de performance
    delai_realisation_jours = models.PositiveIntegerField(null=True, blank=True)
    nombre_operations = models.PositiveIntegerField(default=0)
    taux_erreur = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0'))

    class Meta:
        db_table = 'clotures_comptables_periodiques'
        unique_together = [('company', 'fiscal_year', 'type_cloture', 'date_fin')]
        ordering = ['-date_fin']
        verbose_name = "Clôture Comptable Périodique"
        verbose_name_plural = "Clôtures Comptables Périodiques"


class OperationRegularisation(TimeStampedModel):
    """
    Journal des Opérations à Régulariser selon cahier des charges
    """

    TYPES_OPERATION = [
        ('PROVISION_CLIENTS', 'Provisions clients douteux'),
        ('PROVISION_CONGES', 'Provisions congés payés'),
        ('AMORTISSEMENT_LINEAIRE', 'Amortissements linéaires'),
        ('AMORTISSEMENT_DEGRESSIF', 'Amortissements dégressifs'),
        ('CHARGES_A_PAYER', 'Charges à payer'),
        ('PRODUITS_A_RECEVOIR', 'Produits à recevoir'),
        ('REGULARISATION_STOCKS', 'Régularisations de stocks'),
    ]

    IMPACTS_FINANCIERS = [
        ('FAIBLE', 'Faible'),
        ('MOYEN', 'Moyen'),
        ('FORT', 'Fort'),
        ('CRITIQUE', 'Critique'),
    ]

    STATUTS_OPERATION = [
        ('IDENTIFIEE', 'Identifiée'),
        ('EN_COURS', 'En cours'),
        ('VALIDEE', 'Validée'),
        ('REJETEE', 'Rejetée'),
        ('TERMINEE', 'Terminée'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cloture = models.ForeignKey(ClotureComptablePeriodique, on_delete=models.CASCADE, related_name='operations')

    # Identification selon cahier des charges
    numero_operation = models.CharField(max_length=20, unique=True)
    type_operation = models.CharField(max_length=30, choices=TYPES_OPERATION)
    description = models.TextField()

    # Compte concerné du plan comptable existant
    compte_concerne = models.ForeignKey(ChartOfAccounts, on_delete=models.CASCADE, related_name='operations_regularisation')

    # Impact et priorisation automatique
    montant_estime = models.DecimalField(max_digits=15, decimal_places=2)
    impact_financier = models.CharField(max_length=10, choices=IMPACTS_FINANCIERS)
    priorite_calculee = models.PositiveIntegerField(default=50)  # 1-100

    # Workflow selon cahier des charges
    statut = models.CharField(max_length=20, choices=STATUTS_OPERATION, default='IDENTIFIEE')
    responsable = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    # Pièces justificatives et commentaires
    commentaires = models.TextField(blank=True)
    pieces_justificatives = ArrayField(models.CharField(max_length=500), default=list, blank=True)

    # Lien vers écriture générée
    ecriture_generee = models.ForeignKey(JournalEntry, on_delete=models.SET_NULL, null=True, blank=True)

    # Traçabilité complète
    date_identification = models.DateTimeField(auto_now_add=True)
    date_echeance = models.DateTimeField()
    date_realisation = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'operations_regularisation'
        ordering = ['-priorite_calculee', 'date_echeance']
        verbose_name = "Opération de Régularisation"
        verbose_name_plural = "Opérations de Régularisation"


class WorkflowValidation(TimeStampedModel):
    """
    Workflow de validation avancé selon cahier des charges
    """

    NIVEAUX_VALIDATION = [
        ('SAISIE', 'Saisie'),
        ('CONTROLE', 'Contrôle'),
        ('VALIDATION', 'Validation'),
        ('APPROBATION', 'Approbation'),
        ('SIGNATURE', 'Signature électronique'),
    ]

    ACTIONS_WORKFLOW = [
        ('APPROUVER', 'Approuver'),
        ('REJETER', 'Rejeter'),
        ('DELEGUER', 'Déléguer'),
        ('ESCALADER', 'Escalader'),
        ('MODIFIER', 'Modifier'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    operation = models.ForeignKey(OperationRegularisation, on_delete=models.CASCADE, related_name='validations')

    # Circuit configurable selon cahier des charges
    niveau_validation = models.CharField(max_length=20, choices=NIVEAUX_VALIDATION)
    utilisateur = models.ForeignKey(User, on_delete=models.CASCADE)
    action_effectuee = models.CharField(max_length=20, choices=ACTIONS_WORKFLOW)

    # Seuils de montants selon cahier des charges
    seuil_montant_min = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    seuil_montant_max = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)

    # Signature électronique avec certificats
    signature_electronique = models.TextField(blank=True)
    certificat_numerique = models.CharField(max_length=200, blank=True)

    # Historique complet avec géolocalisation
    date_action = models.DateTimeField(auto_now_add=True)
    adresse_ip = models.GenericIPAddressField()
    localisation = models.CharField(max_length=200, blank=True)

    # Délégation temporaire
    delegue_a = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='delegations_recues')
    duree_delegation_jours = models.PositiveIntegerField(null=True, blank=True)

    # Commentaires et justifications
    commentaires = models.TextField(blank=True)

    class Meta:
        db_table = 'workflow_validations'
        ordering = ['-date_action']
        verbose_name = "Validation Workflow"
        verbose_name_plural = "Validations Workflow"


class RapprochementBancaire(TimeStampedModel):
    """
    Rapprochements bancaires automatisés selon cahier des charges
    """

    STATUTS_RAPPROCHEMENT = [
        ('EN_COURS', 'En cours'),
        ('RAPPROCHE', 'Rapproché'),
        ('ECART_IDENTIFIE', 'Écart identifié'),
        ('VALIDE', 'Validé'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cloture = models.ForeignKey(ClotureComptablePeriodique, on_delete=models.CASCADE, related_name='rapprochements')

    # Compte bancaire du plan comptable existant
    compte_banque = models.ForeignKey(ChartOfAccounts, on_delete=models.CASCADE, related_name='rapprochements')

    # Données rapprochement
    solde_comptable = models.DecimalField(max_digits=15, decimal_places=2)
    solde_releve_bancaire = models.DecimalField(max_digits=15, decimal_places=2)
    ecart = models.DecimalField(max_digits=15, decimal_places=2)

    # Import des relevés selon cahier des charges
    fichier_releve_import = models.CharField(max_length=500, blank=True)
    format_import = models.CharField(max_length=20, choices=[
        ('SWIFT_MT940', 'SWIFT MT940'),
        ('CSV', 'CSV'),
        ('EXCEL', 'Excel'),
        ('PDF', 'PDF'),
    ], default='SWIFT_MT940')

    # État et validation
    statut = models.CharField(max_length=20, choices=STATUTS_RAPPROCHEMENT, default='EN_COURS')
    valide_par = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    date_validation = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'rapprochements_bancaires'
        unique_together = [('cloture', 'compte_banque')]
        verbose_name = "Rapprochement Bancaire"
        verbose_name_plural = "Rapprochements Bancaires"


class CalendrierCloture(TimeStampedModel):
    """
    Calendrier de clôture intelligent selon cahier des charges
    """

    VUES_CALENDRIER = [
        ('JOUR', 'Vue journalière'),
        ('SEMAINE', 'Vue hebdomadaire'),
        ('MOIS', 'Vue mensuelle'),
        ('TRIMESTRE', 'Vue trimestrielle'),
        ('ANNEE', 'Vue annuelle'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cloture = models.ForeignKey(ClotureComptablePeriodique, on_delete=models.CASCADE, related_name='calendrier')

    # Configuration multi-niveaux selon cahier des charges
    vue_par_defaut = models.CharField(max_length=20, choices=VUES_CALENDRIER, default='MOIS')

    # Échéances personnalisables (J+05, J+07, etc.)
    echeances_personnalisees = JSONField(default=dict)

    # Dépendances entre tâches
    dependances_taches = JSONField(default=dict)

    # Jalons configurables avec notifications
    jalons_configurables = JSONField(default=dict)

    # Intégration calendriers externes selon cahier des charges
    integration_outlook = models.BooleanField(default=False)
    integration_google_calendar = models.BooleanField(default=False)

    # Gestion jours fériés et congés
    jours_feries = ArrayField(models.DateField(), default=list, blank=True)
    periodes_conges = JSONField(default=dict)

    class Meta:
        db_table = 'calendriers_cloture'
        verbose_name = "Calendrier de Clôture"
        verbose_name_plural = "Calendriers de Clôture"


class IndicateurPerformance(TimeStampedModel):
    """
    Indicateurs de performance selon cahier des charges section F
    """

    TYPES_INDICATEUR = [
        ('PROGRESSION_GLOBALE', 'Progression globale en temps réel (%)'),
        ('DELAIS_MOYENS', 'Délais moyens par étape et par utilisateur'),
        ('TAUX_ERREUR', 'Taux d\'erreur et de rejet'),
        ('RESPECT_ECHEANCES', 'Respect des échéances'),
        ('CHARGE_TRAVAIL', 'Charge de travail par équipe'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cloture = models.ForeignKey(ClotureComptablePeriodique, on_delete=models.CASCADE, related_name='indicateurs')

    # Type et valeur selon cahier des charges
    type_indicateur = models.CharField(max_length=30, choices=TYPES_INDICATEUR)
    valeur = models.DecimalField(max_digits=10, decimal_places=2)
    unite = models.CharField(max_length=20)  # %, jours, nombre

    # Contexte utilisateur/équipe
    utilisateur_concerne = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    etape_concernee = models.CharField(max_length=100, blank=True)

    # Seuils d'alerte selon cahier des charges
    seuil_alerte = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    seuil_critique = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    # Données pour visualisations avancées
    donnees_graphiques = JSONField(default=dict)

    # Timestamp pour temps réel
    date_mesure = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'indicateurs_performance_cloture'
        ordering = ['-date_mesure']
        verbose_name = "Indicateur de Performance"
        verbose_name_plural = "Indicateurs de Performance"


class ArchivageCloture(TimeStampedModel):
    """
    Archivage selon cahier des charges section G
    """

    TYPES_ARCHIVAGE = [
        ('AUTOMATIQUE', 'Archivage automatique avec compression'),
        ('MANUEL', 'Archivage manuel'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cloture = models.ForeignKey(ClotureComptablePeriodique, on_delete=models.CASCADE, related_name='archives')

    # Configuration selon cahier des charges
    type_archivage = models.CharField(max_length=20, choices=TYPES_ARCHIVAGE, default='AUTOMATIQUE')

    # Chiffrement AES-256 selon cahier des charges
    chiffrement_aes256 = models.BooleanField(default=True)
    cle_chiffrement = models.CharField(max_length=100, blank=True)

    # Compression selon cahier des charges
    taux_compression = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0'))
    taille_originale_mb = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0'))
    taille_compressee_mb = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0'))

    # Rétention selon obligations légales
    date_archivage = models.DateTimeField(auto_now_add=True)
    date_expiration_retention = models.DateField()
    duree_retention_annees = models.PositiveIntegerField(default=10)

    # Localisation stockage
    chemin_archive = models.CharField(max_length=500)
    checksum_md5 = models.CharField(max_length=32, blank=True)

    # Sauvegarde selon cahier des charges
    sauvegarde_incrementale = models.BooleanField(default=True)
    sauvegarde_differentielle = models.BooleanField(default=True)

    class Meta:
        db_table = 'archivages_cloture'
        ordering = ['-date_archivage']
        verbose_name = "Archivage Clôture"
        verbose_name_plural = "Archivages Clôture"