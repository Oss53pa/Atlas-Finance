from django.db import models
from django.contrib.auth.models import User
from decimal import Decimal
from datetime import date
import uuid

from apps.accounting.models import CompteComptable, ExerciceComptable, Devise
from apps.company.models import Company
from apps.analytical_accounting.models import SectionAnalytique, AxeAnalytique


class VersionBudget(models.Model):
    """
    EXF-BG-001: Gestion des versions de budget
    Permet le suivi des modifications et la comparaison entre versions
    """
    TYPES_BUDGET = [
        ('INITIAL', 'Budget Initial'),
        ('RECTIFICATIF', 'Budget Rectificatif'),
        ('GLISSANT', 'Budget Glissant'),
        ('ZERO_BASED', 'Budget Base Zéro'),
        ('FLEXIBLE', 'Budget Flexible'),
        ('OPERATIONNEL', 'Budget Opérationnel'),
        ('INVESTISSEMENT', 'Budget d\'Investissement')
    ]
    
    STATUTS = [
        ('BROUILLARD', 'Brouillard'),
        ('EN_COURS', 'En Cours d\'Élaboration'),
        ('VALIDE', 'Validé'),
        ('APPROUVE', 'Approuvé'),
        ('REJETE', 'Rejeté'),
        ('ARCHIVE', 'Archivé')
    ]
    
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    code = models.CharField(max_length=15, unique=True)
    nom = models.CharField(max_length=100)
    version = models.CharField(max_length=10, default='1.0')  # ex: 1.0, 1.1, 2.0
    type_budget = models.CharField(max_length=20, choices=TYPES_BUDGET)
    
    # Période budgétaire
    exercice = models.ForeignKey(ExerciceComptable, on_delete=models.CASCADE)
    date_debut = models.DateField()
    date_fin = models.DateField()
    
    # Devise et paramètres
    devise = models.ForeignKey(Devise, on_delete=models.CASCADE)
    
    # Granularité temporelle
    granularite = models.CharField(max_length=15, choices=[
        ('ANNUEL', 'Annuel'),
        ('SEMESTRIEL', 'Semestriel'),
        ('TRIMESTRIEL', 'Trimestriel'),
        ('MENSUEL', 'Mensuel')
    ], default='MENSUEL')
    
    # Périmètre analytique
    sections_incluses = models.ManyToManyField(SectionAnalytique, blank=True)
    axes_inclus = models.ManyToManyField(AxeAnalytique, blank=True)
    comptes_inclus = models.ManyToManyField(CompteComptable, blank=True)
    
    # Workflow d'approbation
    statut = models.CharField(max_length=15, choices=STATUTS, default='BROUILLARD')
    responsable_budget = models.ForeignKey(User, on_delete=models.CASCADE, related_name='budgets_responsable')
    valideur = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='budgets_valideur')
    date_validation = models.DateTimeField(null=True, blank=True)
    commentaires_validation = models.TextField(blank=True)
    
    # Version précédente pour traçabilité
    version_precedente = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL)
    motif_modification = models.TextField(blank=True)
    
    # Métadonnées
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)
    utilisateur_creation = models.ForeignKey(User, on_delete=models.CASCADE, related_name='budgets_crees')
    
    class Meta:
        db_table = 'budget_versions'
        ordering = ['-date_creation', '-version']
        unique_together = ['company', 'code', 'version']
    
    def __str__(self):
        return f"{self.code} v{self.version} - {self.nom}"


class LigneBudget(models.Model):
    """
    Lignes budgétaires détaillées par compte et section analytique
    """
    TYPES_LIGNE = [
        ('CHARGES', 'Charges'),
        ('PRODUITS', 'Produits'),
        ('INVESTISSEMENT', 'Investissement'),
        ('FINANCEMENT', 'Financement'),
        ('TRESORERIE', 'Trésorerie')
    ]
    
    version_budget = models.ForeignKey(VersionBudget, on_delete=models.CASCADE, related_name='lignes')
    
    # Identification
    numero_ligne = models.CharField(max_length=20)
    libelle = models.CharField(max_length=200)
    type_ligne = models.CharField(max_length=20, choices=TYPES_LIGNE)
    
    # Imputation comptable
    compte_comptable = models.ForeignKey(CompteComptable, on_delete=models.CASCADE)
    section_analytique = models.ForeignKey(SectionAnalytique, null=True, blank=True, on_delete=models.CASCADE)
    axes_analytiques = models.JSONField(default=dict)  # {axe_id: section_id}
    
    # Montants budgétaires mensuels
    montant_janvier = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))
    montant_fevrier = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))
    montant_mars = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))
    montant_avril = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))
    montant_mai = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))
    montant_juin = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))
    montant_juillet = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))
    montant_aout = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))
    montant_septembre = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))
    montant_octobre = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))
    montant_novembre = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))
    montant_decembre = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))
    
    # Montant total annuel
    montant_total_annuel = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))
    
    # Paramètres de calcul
    base_calcul = models.CharField(max_length=50, blank=True)  # CA, effectifs, m², etc.
    coefficient_application = models.DecimalField(max_digits=8, decimal_places=4, default=Decimal('1'))
    
    # Commentaires et justifications
    commentaire = models.TextField(blank=True)
    hypotheses = models.TextField(blank=True)
    
    # Flags de contrôle
    ligne_calculee = models.BooleanField(default=False)  # Ligne calculée automatiquement
    ligne_consolidee = models.BooleanField(default=False)  # Ligne de consolidation
    
    class Meta:
        db_table = 'budget_lines'
        ordering = ['numero_ligne']
        unique_together = ['version_budget', 'numero_ligne']
    
    def __str__(self):
        return f"{self.numero_ligne} - {self.libelle} ({self.montant_total_annuel})"
    
    def save(self, *args, **kwargs):
        # Recalculer le total annuel
        self.montant_total_annuel = (
            self.montant_janvier + self.montant_fevrier + self.montant_mars + self.montant_avril +
            self.montant_mai + self.montant_juin + self.montant_juillet + self.montant_aout +
            self.montant_septembre + self.montant_octobre + self.montant_novembre + self.montant_decembre
        )
        super().save(*args, **kwargs)
    
    def get_montant_mois(self, mois: int) -> Decimal:
        """Retourne le montant budgété pour un mois donné (1-12)"""
        montants = [
            self.montant_janvier, self.montant_fevrier, self.montant_mars, self.montant_avril,
            self.montant_mai, self.montant_juin, self.montant_juillet, self.montant_aout,
            self.montant_septembre, self.montant_octobre, self.montant_novembre, self.montant_decembre
        ]
        if 1 <= mois <= 12:
            return montants[mois - 1]
        return Decimal('0')
    
    def set_montant_mois(self, mois: int, montant: Decimal):
        """Définit le montant budgété pour un mois donné"""
        if mois == 1: self.montant_janvier = montant
        elif mois == 2: self.montant_fevrier = montant
        elif mois == 3: self.montant_mars = montant
        elif mois == 4: self.montant_avril = montant
        elif mois == 5: self.montant_mai = montant
        elif mois == 6: self.montant_juin = montant
        elif mois == 7: self.montant_juillet = montant
        elif mois == 8: self.montant_aout = montant
        elif mois == 9: self.montant_septembre = montant
        elif mois == 10: self.montant_octobre = montant
        elif mois == 11: self.montant_novembre = montant
        elif mois == 12: self.montant_decembre = montant


class SuiviBudgetaire(models.Model):
    """
    EXF-BG-002: Suivi budgétaire et contrôle des écarts
    Comparaison budget/réalisé avec calcul d'écarts
    """
    version_budget = models.ForeignKey(VersionBudget, on_delete=models.CASCADE)
    
    # Période d'analyse
    periode = models.DateField()  # Premier jour du mois/trimestre analysé
    type_periode = models.CharField(max_length=15, choices=[
        ('MENSUEL', 'Mensuel'),
        ('TRIMESTRIEL', 'Trimestriel'),
        ('SEMESTRIEL', 'Semestriel'),
        ('ANNUEL', 'Annuel')
    ])
    
    # Périmètre
    section_analytique = models.ForeignKey(SectionAnalytique, null=True, blank=True, on_delete=models.CASCADE)
    compte_comptable = models.ForeignKey(CompteComptable, null=True, blank=True, on_delete=models.CASCADE)
    
    # Montants
    budget_periode = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))
    budget_cumule = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))
    realise_periode = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))
    realise_cumule = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))
    
    # Écarts
    ecart_periode = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))
    ecart_cumule = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))
    ecart_periode_pct = models.DecimalField(max_digits=8, decimal_places=3, default=Decimal('0'))
    ecart_cumule_pct = models.DecimalField(max_digits=8, decimal_places=3, default=Decimal('0'))
    
    # Prévisions actualisées
    prevision_fin_annee = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))
    ecart_previsionnel = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))
    
    # Analyse
    commentaire_ecart = models.TextField(blank=True)
    actions_correctives = models.TextField(blank=True)
    
    # Alertes
    seuil_alerte_depasse = models.BooleanField(default=False)
    niveau_alerte = models.CharField(max_length=10, choices=[
        ('VERT', 'Vert'),
        ('ORANGE', 'Orange'),
        ('ROUGE', 'Rouge')
    ], default='VERT')
    
    date_calcul = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'budget_monitoring'
        ordering = ['-periode']
        unique_together = ['version_budget', 'periode', 'section_analytique', 'compte_comptable']
    
    def __str__(self):
        return f"Suivi {self.version_budget.code} - {self.periode.strftime('%Y-%m')}"


class AlerteBudgetaire(models.Model):
    """
    Système d'alertes automatiques sur dépassements budgétaires
    """
    TYPES_ALERTE = [
        ('DEPASSEMENT', 'Dépassement Budgétaire'),
        ('SOUS_CONSOMMATION', 'Sous-Consommation'),
        ('DERIVE_TENDANCIELLE', 'Dérive Tendancielle'),
        ('SEUIL_CRITIQUE', 'Seuil Critique Atteint')
    ]
    
    NIVEAUX_CRITICITE = [
        ('INFO', 'Information'),
        ('ATTENTION', 'Attention'),
        ('ALERTE', 'Alerte'),
        ('CRITIQUE', 'Critique')
    ]
    
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    version_budget = models.ForeignKey(VersionBudget, on_delete=models.CASCADE)
    
    # Type et niveau d'alerte
    type_alerte = models.CharField(max_length=20, choices=TYPES_ALERTE)
    niveau_criticite = models.CharField(max_length=10, choices=NIVEAUX_CRITICITE)
    
    # Périmètre concerné
    section_analytique = models.ForeignKey(SectionAnalytique, null=True, blank=True, on_delete=models.CASCADE)
    compte_comptable = models.ForeignKey(CompteComptable, null=True, blank=True, on_delete=models.CASCADE)
    
    # Détails de l'alerte
    message = models.TextField()
    valeur_seuil = models.DecimalField(max_digits=8, decimal_places=3, null=True, blank=True)  # Seuil en %
    valeur_constatee = models.DecimalField(max_digits=15, decimal_places=2)
    ecart_pct = models.DecimalField(max_digits=8, decimal_places=3)
    
    # Dates
    date_detection = models.DateTimeField(auto_now_add=True)
    periode_concernee = models.DateField()
    
    # Gestion de l'alerte
    traitee = models.BooleanField(default=False)
    date_traitement = models.DateTimeField(null=True, blank=True)
    utilisateur_traitement = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    commentaire_traitement = models.TextField(blank=True)
    
    # Destinataires
    destinataires = models.ManyToManyField(User, related_name='alertes_budgetaires')
    
    class Meta:
        db_table = 'budget_alerts'
        ordering = ['-date_detection']
    
    def __str__(self):
        return f"{self.type_alerte} - {self.niveau_criticite} ({self.date_detection.strftime('%Y-%m-%d')})"


class ReglementBudgetaire(models.Model):
    """
    Configuration des règles budgétaires et seuils d'alerte
    """
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    nom = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    
    # Périmètre d'application
    sections_concernees = models.ManyToManyField(SectionAnalytique, blank=True)
    comptes_concernes = models.ManyToManyField(CompteComptable, blank=True)
    
    # Seuils d'alerte
    seuil_alerte_orange = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal('80'))  # 80%
    seuil_alerte_rouge = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal('100'))  # 100%
    seuil_sous_consommation = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal('50'))  # 50%
    
    # Contrôles automatiques
    controle_depassement = models.BooleanField(default=True)
    controle_sous_consommation = models.BooleanField(default=False)
    controle_derive_tendancielle = models.BooleanField(default=True)
    
    # Workflow d'approbation pour dépassements
    approbation_requise = models.BooleanField(default=True)
    approbateurs = models.ManyToManyField(User, related_name='reglements_budgetaires_approbateurs')
    
    # Périodicité des contrôles
    frequence_controle = models.CharField(max_length=15, choices=[
        ('QUOTIDIEN', 'Quotidien'),
        ('HEBDOMADAIRE', 'Hebdomadaire'),
        ('MENSUEL', 'Mensuel')
    ], default='MENSUEL')
    
    actif = models.BooleanField(default=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'budget_rules'
        ordering = ['nom']
        unique_together = ['company', 'nom']
    
    def __str__(self):
        return self.nom


class ReportingBudgetaire(models.Model):
    """
    Rapports budgétaires automatisés et tableaux de bord
    """
    TYPES_REPORT = [
        ('SYNTHESE_DIRECTION', 'Synthèse Direction'),
        ('DETAIL_SECTION', 'Détail par Section'),
        ('ECARTS_SIGNIFICATIFS', 'Écarts Significatifs'),
        ('TENDANCES', 'Analyse des Tendances'),
        ('CASH_FLOW', 'Cash-Flow Prévisionnel'),
        ('PERFORMANCE_KPI', 'KPIs de Performance')
    ]
    
    FREQUENCES = [
        ('MENSUEL', 'Mensuel'),
        ('TRIMESTRIEL', 'Trimestriel'),
        ('SEMESTRIEL', 'Semestriel'),
        ('ANNUEL', 'Annuel'),
        ('A_LA_DEMANDE', 'À la Demande')
    ]
    
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    nom = models.CharField(max_length=100)
    type_report = models.CharField(max_length=25, choices=TYPES_REPORT)
    
    # Configuration
    version_budget = models.ForeignKey(VersionBudget, on_delete=models.CASCADE)
    frequence = models.CharField(max_length=15, choices=FREQUENCES)
    
    # Périmètre et filtres
    sections_incluses = models.ManyToManyField(SectionAnalytique, blank=True)
    comptes_inclus = models.ManyToManyField(CompteComptable, blank=True)
    
    # Paramètres d'affichage
    configuration_json = models.JSONField(default=dict)  # Colonnes, graphiques, KPIs, etc.
    template_personnalise = models.TextField(blank=True)  # Template HTML/CSS personnalisé
    
    # Destinataires et diffusion
    destinataires = models.ManyToManyField(User, related_name='reports_budgetaires')
    envoi_automatique = models.BooleanField(default=False)
    prochaine_generation = models.DateTimeField(null=True, blank=True)
    
    # Propriétaire
    proprietaire = models.ForeignKey(User, on_delete=models.CASCADE)
    public = models.BooleanField(default=False)
    
    actif = models.BooleanField(default=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'budget_reports'
        ordering = ['nom']
    
    def __str__(self):
        return f"{self.nom} ({self.type_report})"