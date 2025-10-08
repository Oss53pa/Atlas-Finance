"""
Modèles pour le budget et contrôle de gestion.
"""
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from decimal import Decimal
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
from apps.core.models import BaseModel, Societe
from apps.accounting.models import PlanComptable
from apps.analytics.models import SectionAnalytique, AxeAnalytique


class ExerciceBudgetaire(BaseModel):
    """Exercices budgétaires."""
    
    STATUT_CHOICES = [
        ('PREPARATION', 'En préparation'),
        ('VALIDE', 'Validé'),
        ('ACTIF', 'Actif'),
        ('CLOTURE', 'Clôturé'),
        ('ARCHIVE', 'Archivé'),
    ]
    
    # Relations
    societe = models.ForeignKey(Societe, on_delete=models.CASCADE, related_name='exercices_budgetaires')
    
    # Informations de base
    code = models.CharField(max_length=20, db_index=True)
    libelle = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    
    # Dates
    date_debut = models.DateField()
    date_fin = models.DateField()
    nb_periodes = models.PositiveIntegerField(default=12, help_text="Nombre de périodes budgétaires")
    
    # Configuration
    devise_budget = models.ForeignKey(
        'core.Devise', on_delete=models.PROTECT, related_name='exercices_budgetaires'
    )
    axes_analytiques = models.ManyToManyField(
        AxeAnalytique, blank=True,
        help_text="Axes analytiques utilisés pour ce budget"
    )
    
    # Paramètres
    recalcul_auto = models.BooleanField(
        default=True, 
        help_text="Recalcul automatique des écarts"
    )
    alerte_depassement = models.BooleanField(
        default=True,
        help_text="Alertes en cas de dépassement budgétaire"
    )
    seuil_alerte = models.DecimalField(
        max_digits=5, decimal_places=2, default=10,
        help_text="Seuil d'alerte en pourcentage"
    )
    
    # Workflow
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='PREPARATION')
    date_validation = models.DateTimeField(null=True, blank=True)
    valide_par = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='budgets_valides'
    )
    
    # Totaux calculés
    total_produits_budgetes = models.DecimalField(
        max_digits=15, decimal_places=2, default=0, editable=False
    )
    total_charges_budgetees = models.DecimalField(
        max_digits=15, decimal_places=2, default=0, editable=False
    )
    resultat_budgete = models.DecimalField(
        max_digits=15, decimal_places=2, default=0, editable=False
    )
    
    class Meta:
        db_table = 'budget_exercice'
        unique_together = [('societe', 'code')]
        indexes = [
            models.Index(fields=['societe', 'statut']),
            models.Index(fields=['date_debut', 'date_fin']),
        ]
        verbose_name = "Exercice budgétaire"
        verbose_name_plural = "Exercices budgétaires"
        ordering = ['-date_debut']
    
    def __str__(self):
        return f"{self.code} - {self.libelle}"
    
    def clean(self):
        super().clean()
        
        if self.date_fin <= self.date_debut:
            raise ValidationError("La date de fin doit être postérieure à la date de début")
        
        # Vérification de chevauchement
        chevauchement = ExerciceBudgetaire.objects.filter(
            societe=self.societe,
            date_debut__lt=self.date_fin,
            date_fin__gt=self.date_debut
        ).exclude(id=self.id)
        
        if chevauchement.exists():
            raise ValidationError("Chevauchement avec un autre exercice budgétaire")
    
    @property
    def duree_mois(self):
        """Calcule la durée en mois."""
        return (self.date_fin.year - self.date_debut.year) * 12 + (self.date_fin.month - self.date_debut.month) + 1
    
    @property
    def is_current(self):
        """Vérifie si l'exercice est en cours."""
        today = date.today()
        return self.date_debut <= today <= self.date_fin and self.statut == 'ACTIF'
    
    def get_periode(self, date_ref: date = None):
        """Retourne la période budgétaire pour une date."""
        if not date_ref:
            date_ref = date.today()
        
        if not (self.date_debut <= date_ref <= self.date_fin):
            return None
        
        mois_ecoules = (date_ref.year - self.date_debut.year) * 12 + (date_ref.month - self.date_debut.month)
        return min(mois_ecoules + 1, self.nb_periodes)


class CentreBudgetaire(BaseModel):
    """Centres budgétaires (responsabilités budgétaires)."""
    
    TYPE_CENTRE_CHOICES = [
        ('RECETTES', 'Centre de recettes'),
        ('COUTS', 'Centre de coûts'),
        ('PROFIT', 'Centre de profit'),
        ('INVESTISSEMENT', 'Centre d\'investissement'),
    ]
    
    # Relations
    exercice_budgetaire = models.ForeignKey(
        ExerciceBudgetaire, on_delete=models.CASCADE, related_name='centres_budgetaires'
    )
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='centres_enfants')
    responsable = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True)
    section_analytique = models.ForeignKey(
        SectionAnalytique, on_delete=models.SET_NULL, null=True, blank=True,
        help_text="Section analytique associée"
    )
    
    # Informations de base
    code = models.CharField(max_length=50, db_index=True)
    libelle = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    type_centre = models.CharField(max_length=20, choices=TYPE_CENTRE_CHOICES)
    
    # Configuration
    budget_recettes = models.BooleanField(default=False)
    budget_charges = models.BooleanField(default=True)
    budget_investissements = models.BooleanField(default=False)
    
    # Objectifs
    objectif_ca = models.DecimalField(
        max_digits=15, decimal_places=2, default=0,
        help_text="Objectif de chiffre d'affaires"
    )
    objectif_marge = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
        help_text="Objectif de marge en %"
    )
    objectif_charges = models.DecimalField(
        max_digits=15, decimal_places=2, default=0,
        help_text="Objectif de charges"
    )
    
    # Métadonnées
    is_active = models.BooleanField(default=True)
    ordre_affichage = models.PositiveIntegerField(default=0)
    
    class Meta:
        db_table = 'budget_centre'
        unique_together = [('exercice_budgetaire', 'code')]
        indexes = [
            models.Index(fields=['exercice_budgetaire', 'type_centre']),
            models.Index(fields=['responsable']),
            models.Index(fields=['parent']),
        ]
        verbose_name = "Centre budgétaire"
        verbose_name_plural = "Centres budgétaires"
        ordering = ['ordre_affichage', 'libelle']
    
    def __str__(self):
        return f"{self.code} - {self.libelle}"


class LigneBudgetaire(BaseModel):
    """Lignes budgétaires détaillées."""
    
    TYPE_LIGNE_CHOICES = [
        ('PRODUIT', 'Produit'),
        ('CHARGE', 'Charge'),
        ('INVESTISSEMENT', 'Investissement'),
    ]
    
    METHODE_REPARTITION_CHOICES = [
        ('LINEAIRE', 'Répartition linéaire'),
        ('SAISONNIERE', 'Répartition saisonnière'),
        ('HISTORIQUE', 'Basée sur historique'),
        ('PERSONNALISEE', 'Répartition personnalisée'),
    ]
    
    # Relations
    centre_budgetaire = models.ForeignKey(CentreBudgetaire, on_delete=models.CASCADE, related_name='lignes_budget')
    compte = models.ForeignKey(PlanComptable, on_delete=models.CASCADE, related_name='lignes_budget')
    
    # Informations de base
    libelle = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    type_ligne = models.CharField(max_length=20, choices=TYPE_LIGNE_CHOICES)
    
    # Montants budgétaires
    montant_annuel = models.DecimalField(max_digits=15, decimal_places=2)
    methode_repartition = models.CharField(
        max_length=20, choices=METHODE_REPARTITION_CHOICES, default='LINEAIRE'
    )
    coefficients_repartition = models.JSONField(
        default=list, blank=True,
        help_text="Coefficients de répartition par période [P1, P2, ..., P12]"
    )
    
    # Références
    reference_externe = models.CharField(max_length=100, blank=True, null=True)
    
    # Configuration
    controlable = models.BooleanField(
        default=True, help_text="Budget contrôlable par le responsable"
    )
    consolide = models.BooleanField(
        default=True, help_text="Inclus dans la consolidation"
    )
    
    # Alertes
    seuil_alerte_inf = models.DecimalField(
        max_digits=5, decimal_places=2, default=10,
        help_text="Seuil d'alerte inférieur en %"
    )
    seuil_alerte_sup = models.DecimalField(
        max_digits=5, decimal_places=2, default=10,
        help_text="Seuil d'alerte supérieur en %"
    )
    
    class Meta:
        db_table = 'budget_ligne'
        unique_together = [('centre_budgetaire', 'compte')]
        indexes = [
            models.Index(fields=['centre_budgetaire', 'type_ligne']),
            models.Index(fields=['compte']),
        ]
        verbose_name = "Ligne budgétaire"
        verbose_name_plural = "Lignes budgétaires"
    
    def __str__(self):
        return f"{self.centre_budgetaire.code} - {self.compte.code} - {self.libelle}"
    
    def get_montant_periode(self, periode: int) -> Decimal:
        """Calcule le montant budgété pour une période donnée."""
        if self.methode_repartition == 'LINEAIRE':
            return self.montant_annuel / self.centre_budgetaire.exercice_budgetaire.nb_periodes
        
        elif self.methode_repartition == 'PERSONNALISEE' and self.coefficients_repartition:
            if periode <= len(self.coefficients_repartition):
                coeff = Decimal(str(self.coefficients_repartition[periode - 1]))
                return (self.montant_annuel * coeff) / 100
        
        # Par défaut, répartition linéaire
        return self.montant_annuel / self.centre_budgetaire.exercice_budgetaire.nb_periodes


class BudgetPeriodique(BaseModel):
    """Budgets par période (mensuel, trimestriel, etc.)."""
    
    # Relations
    ligne_budgetaire = models.ForeignKey(LigneBudgetaire, on_delete=models.CASCADE, related_name='budgets_periodiques')
    
    # Période
    exercice = models.IntegerField()
    periode = models.PositiveIntegerField(help_text="Numéro de période (1-12)")
    date_debut = models.DateField()
    date_fin = models.DateField()
    
    # Montants
    montant_budget = models.DecimalField(max_digits=15, decimal_places=2)
    montant_realise = models.DecimalField(max_digits=15, decimal_places=2, default=0, editable=False)
    montant_engage = models.DecimalField(max_digits=15, decimal_places=2, default=0, editable=False)
    montant_disponible = models.DecimalField(max_digits=15, decimal_places=2, default=0, editable=False)
    
    # Écarts
    ecart_absolu = models.DecimalField(max_digits=15, decimal_places=2, default=0, editable=False)
    ecart_relatif = models.DecimalField(max_digits=5, decimal_places=2, default=0, editable=False)
    
    # Prévisions
    prevision_fin_periode = models.DecimalField(
        max_digits=15, decimal_places=2, default=0,
        help_text="Prévision de réalisation en fin de période"
    )
    
    # Statut
    statut_realisation = models.CharField(
        max_length=20,
        choices=[
            ('CONFORME', 'Conforme'),
            ('DEPASSEMENT', 'Dépassement'),
            ('SOUS_CONSOMME', 'Sous-consommé'),
            ('ALERTE', 'En alerte'),
        ],
        default='CONFORME',
        editable=False
    )
    
    # Métadonnées
    derniere_maj = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'budget_periodique'
        unique_together = [('ligne_budgetaire', 'periode')]
        indexes = [
            models.Index(fields=['exercice', 'periode']),
            models.Index(fields=['ligne_budgetaire', 'periode']),
            models.Index(fields=['statut_realisation']),
        ]
        verbose_name = "Budget périodique"
        verbose_name_plural = "Budgets périodiques"
        ordering = ['exercice', 'periode']
    
    def __str__(self):
        return f"{self.ligne_budgetaire} - P{self.periode}/{self.exercice}"
    
    def calculer_ecarts(self):
        """Calcule les écarts budgétaires."""
        self.ecart_absolu = self.montant_realise - self.montant_budget
        
        if self.montant_budget != 0:
            self.ecart_relatif = (self.ecart_absolu / self.montant_budget) * 100
        else:
            self.ecart_relatif = 0
        
        self.montant_disponible = self.montant_budget - self.montant_engage
        
        # Détermination du statut
        if abs(self.ecart_relatif) <= self.ligne_budgetaire.seuil_alerte_inf:
            self.statut_realisation = 'CONFORME'
        elif self.ecart_relatif > self.ligne_budgetaire.seuil_alerte_sup:
            self.statut_realisation = 'DEPASSEMENT'
        elif self.ecart_relatif < -self.ligne_budgetaire.seuil_alerte_inf:
            self.statut_realisation = 'SOUS_CONSOMME'
        else:
            self.statut_realisation = 'ALERTE'


class VersionBudget(BaseModel):
    """Versions et révisions budgétaires."""
    
    TYPE_VERSION_CHOICES = [
        ('INITIAL', 'Budget initial'),
        ('REVISE', 'Budget révisé'),
        ('RECTIFICATIF', 'Budget rectificatif'),
        ('ACTUALISE', 'Budget actualisé'),
    ]
    
    # Relations
    exercice_budgetaire = models.ForeignKey(
        ExerciceBudgetaire, on_delete=models.CASCADE, related_name='versions'
    )
    
    # Informations de base
    numero_version = models.CharField(max_length=20)
    libelle = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    type_version = models.CharField(max_length=20, choices=TYPE_VERSION_CHOICES)
    
    # Dates
    date_creation = models.DateTimeField(auto_now_add=True)
    date_validation = models.DateTimeField(null=True, blank=True)
    
    # Statut
    is_active = models.BooleanField(default=False)
    is_baseline = models.BooleanField(
        default=False, help_text="Version de référence pour les comparaisons"
    )
    
    # Métadonnées
    cree_par = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True)
    valide_par = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='versions_budget_validees'
    )
    
    # Commentaires et justifications
    commentaires = models.TextField(blank=True, null=True)
    motif_revision = models.TextField(
        blank=True, null=True,
        help_text="Motif de la révision budgétaire"
    )
    
    class Meta:
        db_table = 'budget_version'
        unique_together = [('exercice_budgetaire', 'numero_version')]
        indexes = [
            models.Index(fields=['exercice_budgetaire', 'is_active']),
            models.Index(fields=['type_version']),
        ]
        verbose_name = "Version budgétaire"
        verbose_name_plural = "Versions budgétaires"
        ordering = ['-date_creation']
    
    def __str__(self):
        return f"{self.exercice_budgetaire.code} - {self.numero_version}"


class Engagement(BaseModel):
    """Engagements budgétaires (commandes, contrats, etc.)."""
    
    TYPE_ENGAGEMENT_CHOICES = [
        ('COMMANDE', 'Bon de commande'),
        ('CONTRAT', 'Contrat'),
        ('CONVENTION', 'Convention'),
        ('AUTRE', 'Autre engagement'),
    ]
    
    STATUT_CHOICES = [
        ('EN_COURS', 'En cours'),
        ('FACTURE', 'Facturé'),
        ('PAYE', 'Payé'),
        ('ANNULE', 'Annulé'),
    ]
    
    # Relations
    ligne_budgetaire = models.ForeignKey(LigneBudgetaire, on_delete=models.CASCADE, related_name='engagements')
    tiers = models.ForeignKey(
        'third_party.Tiers', on_delete=models.SET_NULL, null=True, blank=True
    )
    
    # Informations de base
    numero = models.CharField(max_length=100, db_index=True)
    libelle = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    type_engagement = models.CharField(max_length=20, choices=TYPE_ENGAGEMENT_CHOICES)
    
    # Montants
    montant_engage = models.DecimalField(max_digits=15, decimal_places=2)
    montant_facture = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    montant_paye = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    montant_restant = models.DecimalField(max_digits=15, decimal_places=2, default=0, editable=False)
    
    # Dates
    date_engagement = models.DateField()
    date_echeance = models.DateField(null=True, blank=True)
    date_facture = models.DateField(null=True, blank=True)
    date_paiement = models.DateField(null=True, blank=True)
    
    # Références
    reference_externe = models.CharField(max_length=100, blank=True, null=True)
    numero_facture = models.CharField(max_length=100, blank=True, null=True)
    
    # Statut
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='EN_COURS')
    
    # Métadonnées
    observations = models.TextField(blank=True, null=True)
    
    class Meta:
        db_table = 'budget_engagement'
        unique_together = [('ligne_budgetaire', 'numero')]
        indexes = [
            models.Index(fields=['ligne_budgetaire', 'statut']),
            models.Index(fields=['date_engagement']),
            models.Index(fields=['date_echeance']),
            models.Index(fields=['tiers']),
        ]
        verbose_name = "Engagement budgétaire"
        verbose_name_plural = "Engagements budgétaires"
        ordering = ['-date_engagement']
    
    def __str__(self):
        return f"{self.numero} - {self.libelle}"
    
    def save(self, *args, **kwargs):
        # Calcul automatique du montant restant
        self.montant_restant = self.montant_engage - self.montant_facture
        super().save(*args, **kwargs)


class TableauBordBudget(BaseModel):
    """Tableaux de bord budgétaires personnalisés."""
    
    # Relations
    exercice_budgetaire = models.ForeignKey(
        ExerciceBudgetaire, on_delete=models.CASCADE, related_name='tableaux_bord'
    )
    centres_inclus = models.ManyToManyField(CentreBudgetaire, blank=True)
    
    # Informations de base
    code = models.CharField(max_length=50)
    libelle = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    
    # Configuration
    periodicite = models.CharField(
        max_length=20,
        choices=[
            ('MENSUELLE', 'Mensuelle'),
            ('TRIMESTRIELLE', 'Trimestrielle'),
            ('SEMESTRIELLE', 'Semestrielle'),
            ('ANNUELLE', 'Annuelle'),
        ],
        default='MENSUELLE'
    )
    
    indicateurs = models.JSONField(
        default=list,
        help_text="Configuration des indicateurs à afficher"
    )
    
    # Paramètres d'affichage
    graphiques_config = models.JSONField(default=dict, blank=True)
    colonnes_affichees = models.JSONField(default=list, blank=True)
    
    # Permissions
    public = models.BooleanField(default=False)
    destinataires = models.ManyToManyField(
        'auth.User', blank=True,
        help_text="Utilisateurs ayant accès à ce tableau de bord"
    )
    
    # Configuration des alertes
    alertes_actives = models.BooleanField(default=True)
    frequence_alertes = models.CharField(
        max_length=20,
        choices=[
            ('TEMPS_REEL', 'Temps réel'),
            ('QUOTIDIENNE', 'Quotidienne'),
            ('HEBDOMADAIRE', 'Hebdomadaire'),
        ],
        default='QUOTIDIENNE'
    )
    
    class Meta:
        db_table = 'budget_tableau_bord'
        unique_together = [('exercice_budgetaire', 'code')]
        verbose_name = "Tableau de bord budgétaire"
        verbose_name_plural = "Tableaux de bord budgétaires"
    
    def __str__(self):
        return f"{self.exercice_budgetaire.code} - {self.libelle}"


class AlerteBudgetaire(BaseModel):
    """Alertes budgétaires automatiques."""
    
    TYPE_ALERTE_CHOICES = [
        ('DEPASSEMENT', 'Dépassement budgétaire'),
        ('SOUS_CONSOMMATION', 'Sous-consommation'),
        ('ECHEANCE', 'Échéance proche'),
        ('ENGAGEMENT_IMPORTANT', 'Engagement important'),
        ('DERIVE', 'Dérive budgétaire'),
    ]
    
    NIVEAU_CHOICES = [
        ('INFO', 'Information'),
        ('WARNING', 'Avertissement'),
        ('ERROR', 'Erreur'),
        ('CRITICAL', 'Critique'),
    ]
    
    STATUT_CHOICES = [
        ('ACTIVE', 'Active'),
        ('ACQUITTEE', 'Acquittée'),
        ('RESOLUE', 'Résolue'),
        ('IGNOREE', 'Ignorée'),
    ]
    
    # Relations
    exercice_budgetaire = models.ForeignKey(
        ExerciceBudgetaire, on_delete=models.CASCADE, related_name='alertes'
    )
    centre_budgetaire = models.ForeignKey(
        CentreBudgetaire, on_delete=models.CASCADE, null=True, blank=True
    )
    ligne_budgetaire = models.ForeignKey(
        LigneBudgetaire, on_delete=models.CASCADE, null=True, blank=True
    )
    
    # Informations de l'alerte
    type_alerte = models.CharField(max_length=30, choices=TYPE_ALERTE_CHOICES)
    niveau = models.CharField(max_length=10, choices=NIVEAU_CHOICES)
    titre = models.CharField(max_length=200)
    message = models.TextField()
    
    # Données contextuelles
    valeur_actuelle = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    valeur_seuil = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    ecart_pourcentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    
    # Gestion
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='ACTIVE')
    date_creation = models.DateTimeField(auto_now_add=True)
    date_acquittement = models.DateTimeField(null=True, blank=True)
    acquittee_par = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True
    )
    
    # Actions
    actions_recommandees = models.JSONField(default=list, blank=True)
    commentaires = models.TextField(blank=True, null=True)
    
    class Meta:
        db_table = 'budget_alerte'
        indexes = [
            models.Index(fields=['exercice_budgetaire', 'statut']),
            models.Index(fields=['type_alerte', 'niveau']),
            models.Index(fields=['date_creation']),
        ]
        verbose_name = "Alerte budgétaire"
        verbose_name_plural = "Alertes budgétaires"
        ordering = ['-date_creation']
    
    def __str__(self):
        return f"{self.titre} - {self.get_niveau_display()}"


class SimulationBudgetaire(BaseModel):
    """Simulations et scénarios budgétaires."""
    
    TYPE_SIMULATION_CHOICES = [
        ('PREVISIONNEL', 'Simulation prévisionnelle'),
        ('SCENARIO', 'Analyse de scénario'),
        ('SENSIBILITE', 'Analyse de sensibilité'),
        ('MONTE_CARLO', 'Simulation Monte Carlo'),
    ]
    
    # Relations
    exercice_budgetaire = models.ForeignKey(
        ExerciceBudgetaire, on_delete=models.CASCADE, related_name='simulations'
    )
    
    # Informations de base
    nom_simulation = models.CharField(max_length=200)
    description = models.TextField()
    type_simulation = models.CharField(max_length=20, choices=TYPE_SIMULATION_CHOICES)
    
    # Paramètres de simulation
    parametres = models.JSONField(
        default=dict,
        help_text="Paramètres de la simulation (variables, hypothèses, etc.)"
    )
    variables_analysees = models.JSONField(default=list, blank=True)
    
    # Résultats
    resultats = models.JSONField(
        default=dict, blank=True,
        help_text="Résultats de la simulation"
    )
    
    # Métadonnées
    date_execution = models.DateTimeField(auto_now_add=True)
    executee_par = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True)
    duree_execution = models.PositiveIntegerField(null=True, blank=True, help_text="Durée en millisecondes")
    
    class Meta:
        db_table = 'budget_simulation'
        indexes = [
            models.Index(fields=['exercice_budgetaire', 'type_simulation']),
            models.Index(fields=['date_execution']),
        ]
        verbose_name = "Simulation budgétaire"
        verbose_name_plural = "Simulations budgétaires"
        ordering = ['-date_execution']
    
    def __str__(self):
        return f"{self.nom_simulation} - {self.get_type_simulation_display()}"