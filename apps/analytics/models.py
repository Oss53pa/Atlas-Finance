"""
Modèles pour la comptabilité analytique multi-axes.
"""
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from decimal import Decimal
from apps.core.models import BaseModel, Societe
from apps.accounting.models import PlanComptable, Ecriture, LigneEcriture


class AxeAnalytique(BaseModel):
    """Axes d'analyse pour la comptabilité analytique."""
    
    TYPE_CHOICES = [
        ('ACTIVITE', 'Activité/Division'),
        ('CENTRE_COUT', 'Centre de coûts'),
        ('CENTRE_PROFIT', 'Centre de profit'),
        ('PROJET', 'Projet'),
        ('PRODUIT', 'Produit/Service'),
        ('CLIENT', 'Client'),
        ('GEOGRAPHIE', 'Zone géographique'),
        ('RESPONSABLE', 'Responsable'),
        ('AUTRE', 'Autre'),
    ]
    
    # Relations
    societe = models.ForeignKey(Societe, on_delete=models.CASCADE, related_name='axes_analytiques')
    
    # Informations de base
    code = models.CharField(max_length=20, db_index=True)
    libelle = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    type_axe = models.CharField(max_length=20, choices=TYPE_CHOICES)
    
    # Configuration
    obligatoire = models.BooleanField(default=False, help_text="Ventilation obligatoire pour cet axe")
    ventilation_totale = models.BooleanField(default=True, help_text="Ventilation à 100% obligatoire")
    comptes_concernes = models.ManyToManyField(
        PlanComptable, blank=True,
        help_text="Comptes pour lesquels cet axe est obligatoire"
    )
    
    # Hiérarchie
    hierarchique = models.BooleanField(default=False)
    profondeur_max = models.PositiveIntegerField(default=5)
    
    # Métadonnées
    is_active = models.BooleanField(default=True)
    ordre_affichage = models.PositiveIntegerField(default=0)
    couleur = models.CharField(max_length=7, default='#007bff', help_text="Couleur d'affichage (hex)")
    
    class Meta:
        db_table = 'analytics_axe'
        unique_together = [('societe', 'code')]
        indexes = [
            models.Index(fields=['societe', 'type_axe']),
            models.Index(fields=['ordre_affichage']),
        ]
        verbose_name = "Axe analytique"
        verbose_name_plural = "Axes analytiques"
        ordering = ['ordre_affichage', 'libelle']
    
    def __str__(self):
        return f"{self.code} - {self.libelle}"


class SectionAnalytique(BaseModel):
    """Sections analytiques pour chaque axe."""
    
    # Relations
    axe = models.ForeignKey(AxeAnalytique, on_delete=models.CASCADE, related_name='sections')
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='children')
    responsable = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Informations de base
    code = models.CharField(max_length=50, db_index=True)
    libelle = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    
    # Configuration budgétaire
    budgetaire = models.BooleanField(default=False, help_text="Section avec budget")
    budget_annuel = models.DecimalField(
        max_digits=15, decimal_places=2, default=0,
        help_text="Budget annuel de la section"
    )
    
    # Dates d'activité
    date_debut = models.DateField(null=True, blank=True)
    date_fin = models.DateField(null=True, blank=True)
    
    # Paramètres de répartition
    coefficients_repartition = models.JSONField(
        default=dict, blank=True,
        help_text="Coefficients pour la répartition automatique"
    )
    
    # Métadonnées
    is_active = models.BooleanField(default=True)
    ordre_affichage = models.PositiveIntegerField(default=0)
    couleur = models.CharField(max_length=7, blank=True, null=True)
    
    class Meta:
        db_table = 'analytics_section'
        unique_together = [('axe', 'code')]
        indexes = [
            models.Index(fields=['axe', 'parent']),
            models.Index(fields=['responsable']),
            models.Index(fields=['budgetaire']),
        ]
        verbose_name = "Section analytique"
        verbose_name_plural = "Sections analytiques"
        ordering = ['ordre_affichage', 'libelle']
    
    def __str__(self):
        return f"{self.code} - {self.libelle}"
    
    def clean(self):
        super().clean()
        
        # Validation de la hiérarchie
        if self.parent:
            if self.parent.axe != self.axe:
                raise ValidationError("Le parent doit appartenir au même axe")
            
            # Éviter les cycles
            current = self.parent
            while current:
                if current == self:
                    raise ValidationError("Cycle détecté dans la hiérarchie")
                current = current.parent
        
        # Validation des dates
        if self.date_debut and self.date_fin and self.date_fin <= self.date_debut:
            raise ValidationError("La date de fin doit être postérieure à la date de début")
    
    @property
    def code_complet(self):
        """Retourne le code complet avec hiérarchie."""
        if self.parent:
            return f"{self.parent.code_complet}.{self.code}"
        return f"{self.axe.code}.{self.code}"
    
    @property
    def niveau(self):
        """Retourne le niveau dans la hiérarchie."""
        level = 0
        current = self.parent
        while current:
            level += 1
            current = current.parent
        return level
    
    def get_descendants(self, include_self=False):
        """Retourne tous les descendants de cette section."""
        descendants = []
        if include_self:
            descendants.append(self)
        
        for child in self.children.all():
            descendants.extend(child.get_descendants(include_self=True))
        
        return descendants


class VentilationAnalytique(BaseModel):
    """Ventilations analytiques des écritures comptables."""
    
    # Relations
    ligne_ecriture = models.ForeignKey(LigneEcriture, on_delete=models.CASCADE, related_name='ventilations')
    section = models.ForeignKey(SectionAnalytique, on_delete=models.CASCADE, related_name='ventilations')
    
    # Montants
    montant = models.DecimalField(max_digits=15, decimal_places=2)
    pourcentage = models.DecimalField(
        max_digits=5, decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    
    # Informations complémentaires
    libelle = models.CharField(max_length=200, blank=True, null=True)
    reference = models.CharField(max_length=100, blank=True, null=True)
    
    class Meta:
        db_table = 'analytics_ventilation'
        indexes = [
            models.Index(fields=['ligne_ecriture']),
            models.Index(fields=['section']),
            models.Index(fields=['ligne_ecriture', 'section']),
        ]
        verbose_name = "Ventilation analytique"
        verbose_name_plural = "Ventilations analytiques"
    
    def __str__(self):
        return f"{self.section.code_complet} - {self.montant}"
    
    def clean(self):
        super().clean()

        # Validation de cohérence montant/pourcentage
        if self.ligne_ecriture:
            montant_base = self.ligne_ecriture.debit_amount or self.ligne_ecriture.credit_amount
            montant_calcule = (montant_base * self.pourcentage) / 100

            if abs(self.montant - montant_calcule) > Decimal('0.01'):
                raise ValidationError("Le montant ne correspond pas au pourcentage appliqué")


class ModeleVentilation(BaseModel):
    """Modèles de ventilation prédéfinis."""
    
    # Relations
    societe = models.ForeignKey(Societe, on_delete=models.CASCADE, related_name='modeles_ventilation')
    compte = models.ForeignKey(PlanComptable, on_delete=models.CASCADE, related_name='modeles_ventilation')
    
    # Informations de base
    code = models.CharField(max_length=50)
    libelle = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    
    # Configuration
    ventilations_defaut = models.JSONField(
        default=dict,
        help_text="Structure: {axe_code: [{section_code: pourcentage}]}"
    )
    
    # Conditions d'application
    conditions = models.JSONField(
        default=dict, blank=True,
        help_text="Conditions pour l'application automatique"
    )
    
    # Métadonnées
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'analytics_modele_ventilation'
        unique_together = [('societe', 'code')]
        indexes = [
            models.Index(fields=['compte']),
            models.Index(fields=['societe', 'is_active']),
        ]
        verbose_name = "Modèle de ventilation"
        verbose_name_plural = "Modèles de ventilation"
    
    def __str__(self):
        return f"{self.code} - {self.libelle}"


class BalanceAnalytique(BaseModel):
    """Soldes analytiques calculés."""
    
    TYPE_SOLDE_CHOICES = [
        ('DEBIT', 'Solde débiteur'),
        ('CREDIT', 'Solde créditeur'),
        ('EQUILIBRE', 'Équilibré'),
    ]
    
    # Relations
    societe = models.ForeignKey(Societe, on_delete=models.CASCADE, related_name='balances_analytiques')
    section = models.ForeignKey(SectionAnalytique, on_delete=models.CASCADE, related_name='balances')
    compte = models.ForeignKey(PlanComptable, on_delete=models.CASCADE, related_name='balances_analytiques')
    
    # Période
    exercice = models.IntegerField()
    periode = models.CharField(max_length=7, help_text="Format YYYY-MM")
    date_debut = models.DateField()
    date_fin = models.DateField()
    
    # Soldes
    solde_initial = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    mouvement_debit = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    mouvement_credit = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    solde_final = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    type_solde = models.CharField(max_length=10, choices=TYPE_SOLDE_CHOICES, default='EQUILIBRE')
    
    # Statistiques
    nb_mouvements = models.IntegerField(default=0)
    
    # Métadonnées
    date_calcul = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'analytics_balance'
        unique_together = [('section', 'compte', 'periode')]
        indexes = [
            models.Index(fields=['societe', 'exercice', 'periode']),
            models.Index(fields=['section', 'periode']),
            models.Index(fields=['compte', 'periode']),
        ]
        verbose_name = "Balance analytique"
        verbose_name_plural = "Balances analytiques"
        ordering = ['-periode', 'section__code', 'compte__code']
    
    def __str__(self):
        return f"{self.section.code} - {self.compte.code} - {self.periode}"


class RepartitionAutomatique(BaseModel):
    """Règles de répartition automatique."""
    
    TYPE_REPARTITION_CHOICES = [
        ('FIXE', 'Pourcentage fixe'),
        ('PRORATA', 'Prorata d\'une base'),
        ('CLE_REPARTITION', 'Clé de répartition'),
        ('HISTORIQUE', 'Basé sur l\'historique'),
    ]
    
    FREQUENCE_CHOICES = [
        ('MENSUELLE', 'Mensuelle'),
        ('TRIMESTRIELLE', 'Trimestrielle'),
        ('SEMESTRIELLE', 'Semestrielle'),
        ('ANNUELLE', 'Annuelle'),
    ]
    
    # Relations
    societe = models.ForeignKey(Societe, on_delete=models.CASCADE, related_name='repartitions_auto')
    compte_source = models.ForeignKey(
        PlanComptable, on_delete=models.CASCADE, related_name='repartitions_source'
    )
    sections_destination = models.ManyToManyField(
        SectionAnalytique, through='LigneRepartition'
    )
    
    # Informations de base
    code = models.CharField(max_length=50)
    libelle = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    
    # Configuration
    type_repartition = models.CharField(max_length=20, choices=TYPE_REPARTITION_CHOICES)
    frequence = models.CharField(max_length=20, choices=FREQUENCE_CHOICES)
    
    # Paramètres spécifiques
    compte_base = models.ForeignKey(
        PlanComptable, on_delete=models.SET_NULL, null=True, blank=True,
        help_text="Compte de base pour le prorata"
    )
    parametres = models.JSONField(default=dict, blank=True)
    
    # Dates
    date_debut = models.DateField()
    date_fin = models.DateField(null=True, blank=True)
    derniere_execution = models.DateTimeField(null=True, blank=True)
    
    # Configuration
    is_active = models.BooleanField(default=True)
    execution_auto = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'analytics_repartition_auto'
        unique_together = [('societe', 'code')]
        indexes = [
            models.Index(fields=['compte_source']),
            models.Index(fields=['frequence', 'is_active']),
            models.Index(fields=['derniere_execution']),
        ]
        verbose_name = "Répartition automatique"
        verbose_name_plural = "Répartitions automatiques"
    
    def __str__(self):
        return f"{self.code} - {self.libelle}"


class LigneRepartition(BaseModel):
    """Lignes de répartition pour les règles automatiques."""
    
    # Relations
    repartition = models.ForeignKey(RepartitionAutomatique, on_delete=models.CASCADE, related_name='lignes')
    section_destination = models.ForeignKey(SectionAnalytique, on_delete=models.CASCADE)
    
    # Configuration
    pourcentage = models.DecimalField(
        max_digits=5, decimal_places=2,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    montant_fixe = models.DecimalField(
        max_digits=15, decimal_places=2, default=0,
        help_text="Montant fixe (si applicable)"
    )
    
    # Conditions
    conditions = models.JSONField(default=dict, blank=True)
    
    # Métadonnées
    ordre = models.PositiveIntegerField(default=0)
    
    class Meta:
        db_table = 'analytics_ligne_repartition'
        unique_together = [('repartition', 'section_destination')]
        indexes = [
            models.Index(fields=['repartition', 'ordre']),
            models.Index(fields=['section_destination']),
        ]
        verbose_name = "Ligne de répartition"
        verbose_name_plural = "Lignes de répartition"
        ordering = ['ordre']
    
    def __str__(self):
        return f"{self.repartition.code} - {self.section_destination.code} - {self.pourcentage}%"


class TableauBord(BaseModel):
    """Tableaux de bord analytiques personnalisables."""
    
    TYPE_GRAPHIQUE_CHOICES = [
        ('BAR', 'Barres'),
        ('LINE', 'Lignes'),
        ('PIE', 'Secteurs'),
        ('AREA', 'Aires'),
        ('SCATTER', 'Nuage de points'),
        ('TABLE', 'Tableau'),
    ]
    
    # Relations
    societe = models.ForeignKey(Societe, on_delete=models.CASCADE, related_name='tableaux_bord_analytiques')
    axes_analyses = models.ManyToManyField(AxeAnalytique, blank=True)
    
    # Informations de base
    code = models.CharField(max_length=50)
    libelle = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    
    # Configuration d'affichage
    configuration = models.JSONField(
        default=dict,
        help_text="Configuration des widgets et filtres"
    )
    
    # Permissions
    public = models.BooleanField(default=False)
    utilisateurs_autorises = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True)
    
    # Métadonnées
    is_active = models.BooleanField(default=True)
    favori = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'analytics_tableau_bord'
        unique_together = [('societe', 'code')]
        indexes = [
            models.Index(fields=['societe', 'is_active']),
            models.Index(fields=['public']),
        ]
        verbose_name = "Tableau de bord"
        verbose_name_plural = "Tableaux de bord"
    
    def __str__(self):
        return f"{self.code} - {self.libelle}"


class WidgetTableauBord(BaseModel):
    """Widgets des tableaux de bord."""
    
    # Relations
    tableau_bord = models.ForeignKey(TableauBord, on_delete=models.CASCADE, related_name='widgets')
    
    # Configuration
    titre = models.CharField(max_length=200)
    type_graphique = models.CharField(max_length=20, choices=TableauBord.TYPE_GRAPHIQUE_CHOICES)
    requete = models.JSONField(help_text="Configuration de la requête de données")
    
    # Positionnement
    position_x = models.IntegerField(default=0)
    position_y = models.IntegerField(default=0)
    largeur = models.IntegerField(default=6)
    hauteur = models.IntegerField(default=4)
    
    # Mise en forme
    couleurs = models.JSONField(default=list, blank=True)
    options_graphique = models.JSONField(default=dict, blank=True)
    
    # Métadonnées
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'analytics_widget'
        indexes = [
            models.Index(fields=['tableau_bord']),
        ]
        verbose_name = "Widget"
        verbose_name_plural = "Widgets"
        ordering = ['position_y', 'position_x']
    
    def __str__(self):
        return f"{self.tableau_bord.code} - {self.titre}"


class CleRepartition(BaseModel):
    """Clés de répartition pour les imputations automatiques."""
    
    # Relations
    societe = models.ForeignKey(Societe, on_delete=models.CASCADE, related_name='cles_repartition')
    axe = models.ForeignKey(AxeAnalytique, on_delete=models.CASCADE, related_name='cles_repartition')
    
    # Informations de base
    code = models.CharField(max_length=50)
    libelle = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    
    # Configuration
    coefficients = models.JSONField(
        default=dict,
        help_text="Coefficients par section: {section_code: coefficient}"
    )
    
    # Période de validité
    date_debut = models.DateField()
    date_fin = models.DateField(null=True, blank=True)
    
    # Métadonnées
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'analytics_cle_repartition'
        unique_together = [('societe', 'code')]
        indexes = [
            models.Index(fields=['axe']),
            models.Index(fields=['date_debut', 'date_fin']),
        ]
        verbose_name = "Clé de répartition"
        verbose_name_plural = "Clés de répartition"
    
    def __str__(self):
        return f"{self.code} - {self.libelle}"
    
    def clean(self):
        super().clean()
        
        if self.date_fin and self.date_fin <= self.date_debut:
            raise ValidationError("La date de fin doit être postérieure à la date de début")
        
        # Validation de la somme des coefficients
        total_coefficients = sum(self.coefficients.values()) if self.coefficients else 0
        if abs(total_coefficients - 100) > 0.01:
            raise ValidationError("La somme des coefficients doit être égale à 100%")