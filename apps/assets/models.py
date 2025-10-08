"""
Modèles pour la gestion des immobilisations.
"""
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from decimal import Decimal
from datetime import date, timedelta
from apps.core.models import BaseModel, Societe, Devise
from apps.accounting.models import PlanComptable
from apps.third_party.models import Tiers


class CategorieImmobilisation(BaseModel):
    """Catégories d'immobilisations."""
    
    TYPE_CHOICES = [
        ('INCORPORELLE', 'Immobilisation incorporelle'),
        ('CORPORELLE', 'Immobilisation corporelle'),
        ('FINANCIERE', 'Immobilisation financière'),
    ]
    
    # Relations
    societe = models.ForeignKey(Societe, on_delete=models.CASCADE, related_name='categories_immobilisations')
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='children')
    
    # Informations de base
    code = models.CharField(max_length=20, db_index=True)
    libelle = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    type_immobilisation = models.CharField(max_length=20, choices=TYPE_CHOICES)
    
    # Configuration comptable
    compte_immobilisation = models.ForeignKey(
        PlanComptable, on_delete=models.PROTECT, related_name='categories_immo',
        help_text="Compte d'immobilisation (classe 2)"
    )
    compte_amortissement = models.ForeignKey(
        PlanComptable, on_delete=models.PROTECT, related_name='categories_amort', null=True, blank=True,
        help_text="Compte d'amortissement (classe 28)"
    )
    compte_dotation = models.ForeignKey(
        PlanComptable, on_delete=models.PROTECT, related_name='categories_dotation', null=True, blank=True,
        help_text="Compte de dotation aux amortissements (classe 68)"
    )
    
    # Paramètres d'amortissement par défaut
    duree_amortissement_defaut = models.PositiveIntegerField(
        default=5, help_text="Durée d'amortissement en années"
    )
    methode_amortissement_defaut = models.CharField(
        max_length=20,
        choices=[
            ('LINEAIRE', 'Linéaire'),
            ('DEGRESSIF', 'Dégressif'),
            ('UNITE_OEUVRE', 'Unité d\'œuvre'),
            ('EXCEPTIONNEL', 'Exceptionnel'),
        ],
        default='LINEAIRE'
    )
    taux_degressif = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
        help_text="Taux pour l'amortissement dégressif"
    )
    
    # Configuration
    amortissement_obligatoire = models.BooleanField(default=True)
    suivi_analytique = models.BooleanField(default=False)
    
    # Métadonnées
    is_active = models.BooleanField(default=True)
    ordre_affichage = models.PositiveIntegerField(default=0)
    
    class Meta:
        db_table = 'assets_categorie'
        unique_together = [('societe', 'code')]
        indexes = [
            models.Index(fields=['societe', 'type_immobilisation']),
            models.Index(fields=['parent']),
        ]
        verbose_name = "Catégorie d'immobilisation"
        verbose_name_plural = "Catégories d'immobilisations"
        ordering = ['ordre_affichage', 'libelle']
    
    def __str__(self):
        return f"{self.code} - {self.libelle}"
    
    @property
    def code_complet(self):
        """Retourne le code complet avec hiérarchie."""
        if self.parent:
            return f"{self.parent.code_complet}.{self.code}"
        return self.code


class Immobilisation(BaseModel):
    """Modèle principal pour les immobilisations."""
    
    STATUT_CHOICES = [
        ('EN_SERVICE', 'En service'),
        ('HORS_SERVICE', 'Hors service'),
        ('EN_COURS', 'En cours d\'acquisition'),
        ('CEDE', 'Cédé'),
        ('REFORME', 'Réformé'),
        ('VOLE', 'Volé'),
        ('SINISTRE', 'Sinistré'),
    ]
    
    ETAT_CHOICES = [
        ('NEUF', 'Neuf'),
        ('BON', 'Bon état'),
        ('MOYEN', 'État moyen'),
        ('MAUVAIS', 'Mauvais état'),
        ('HS', 'Hors service'),
    ]
    
    # Relations
    societe = models.ForeignKey(Societe, on_delete=models.CASCADE, related_name='immobilisations')
    categorie = models.ForeignKey(CategorieImmobilisation, on_delete=models.PROTECT, related_name='immobilisations')
    fournisseur = models.ForeignKey(Tiers, on_delete=models.SET_NULL, null=True, blank=True, related_name='immobilisations_fournies')
    
    # Identification
    numero = models.CharField(max_length=50, db_index=True)
    code_barre = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    numero_serie = models.CharField(max_length=100, blank=True, null=True)
    numero_inventaire = models.CharField(max_length=50, blank=True, null=True)
    
    # Informations de base
    libelle = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    marque = models.CharField(max_length=100, blank=True, null=True)
    modele = models.CharField(max_length=100, blank=True, null=True)
    
    # Localisation
    site = models.CharField(max_length=100, blank=True, null=True)
    batiment = models.CharField(max_length=100, blank=True, null=True)
    etage = models.CharField(max_length=50, blank=True, null=True)
    bureau = models.CharField(max_length=50, blank=True, null=True)
    coordonnees_gps = models.CharField(max_length=100, blank=True, null=True)
    
    # Responsabilité
    responsable = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='immobilisations_responsable'
    )
    service = models.CharField(max_length=100, blank=True, null=True)
    
    # Informations financières
    devise = models.ForeignKey(Devise, on_delete=models.PROTECT)
    valeur_acquisition = models.DecimalField(
        max_digits=15, decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    valeur_acquisition_devise = models.DecimalField(
        max_digits=15, decimal_places=2, null=True, blank=True
    )
    taux_change_acquisition = models.DecimalField(
        max_digits=10, decimal_places=6, null=True, blank=True
    )
    frais_acquisition = models.DecimalField(
        max_digits=15, decimal_places=2, default=0
    )
    valeur_nette_comptable = models.DecimalField(
        max_digits=15, decimal_places=2, default=0, editable=False
    )
    valeur_residuelle = models.DecimalField(
        max_digits=15, decimal_places=2, default=0
    )
    
    # Dates importantes
    date_acquisition = models.DateField()
    date_mise_en_service = models.DateField(null=True, blank=True)
    date_fin_garantie = models.DateField(null=True, blank=True)
    date_fin_amortissement = models.DateField(null=True, blank=True, editable=False)
    date_derniere_revision = models.DateField(null=True, blank=True)
    date_prochaine_revision = models.DateField(null=True, blank=True)
    
    # Informations sur l'acquisition
    facture_numero = models.CharField(max_length=100, blank=True, null=True)
    facture_date = models.DateField(null=True, blank=True)
    bon_commande = models.CharField(max_length=100, blank=True, null=True)
    
    # Statut et état
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='EN_COURS')
    etat = models.CharField(max_length=20, choices=ETAT_CHOICES, default='BON')
    
    # Configuration d'amortissement
    amortissable = models.BooleanField(default=True)
    duree_amortissement = models.PositiveIntegerField(
        help_text="Durée d'amortissement en mois"
    )
    methode_amortissement = models.CharField(
        max_length=20,
        choices=[
            ('LINEAIRE', 'Linéaire'),
            ('DEGRESSIF', 'Dégressif'),
            ('UNITE_OEUVRE', 'Unité d\'œuvre'),
            ('EXCEPTIONNEL', 'Exceptionnel'),
        ],
        default='LINEAIRE'
    )
    taux_amortissement = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
        help_text="Taux d'amortissement annuel en %"
    )
    base_amortissement = models.DecimalField(
        max_digits=15, decimal_places=2, default=0,
        help_text="Base de calcul de l'amortissement"
    )
    
    # Suivi analytique
    centre_cout = models.CharField(max_length=50, blank=True, null=True)
    axe_analytique = models.JSONField(default=dict, blank=True)
    
    # Images et documents
    photo_principale = models.ImageField(upload_to='immobilisations/', blank=True, null=True)
    documents = models.JSONField(default=list, blank=True)
    
    # Métadonnées
    observations = models.TextField(blank=True, null=True)
    tags = models.JSONField(default=list, blank=True)
    
    class Meta:
        db_table = 'assets_immobilisation'
        unique_together = [('societe', 'numero')]
        indexes = [
            models.Index(fields=['societe', 'categorie']),
            models.Index(fields=['societe', 'statut']),
            models.Index(fields=['numero_serie']),
            models.Index(fields=['code_barre']),
            models.Index(fields=['date_acquisition']),
            models.Index(fields=['responsable']),
        ]
        verbose_name = "Immobilisation"
        verbose_name_plural = "Immobilisations"
        ordering = ['numero']
    
    def __str__(self):
        return f"{self.numero} - {self.libelle}"
    
    def clean(self):
        super().clean()
        
        # Validation des dates
        if self.date_mise_en_service and self.date_mise_en_service < self.date_acquisition:
            raise ValidationError("La date de mise en service ne peut pas être antérieure à l'acquisition")
        
        # Validation de la valeur résiduelle
        if self.valeur_residuelle >= self.valeur_acquisition:
            raise ValidationError("La valeur résiduelle doit être inférieure à la valeur d'acquisition")
    
    @property
    def valeur_brute(self):
        """Calcule la valeur brute (acquisition + frais)."""
        return self.valeur_acquisition + self.frais_acquisition
    
    @property
    def age_en_mois(self):
        """Calcule l'âge en mois depuis l'acquisition."""
        if not self.date_acquisition:
            return 0
        
        date_ref = self.date_mise_en_service or self.date_acquisition
        today = date.today()
        
        return (today.year - date_ref.year) * 12 + (today.month - date_ref.month)
    
    @property
    def taux_amortissement_mensuel(self):
        """Calcule le taux d'amortissement mensuel."""
        if not self.duree_amortissement or self.duree_amortissement == 0:
            return Decimal('0')
        
        return Decimal('100') / Decimal(str(self.duree_amortissement))
    
    def calculer_amortissement_theorique(self, date_calcul: date = None) -> Decimal:
        """Calcule l'amortissement théorique à une date donnée."""
        if not date_calcul:
            date_calcul = date.today()
        
        if not self.amortissable or not self.date_mise_en_service:
            return Decimal('0')
        
        if date_calcul < self.date_mise_en_service:
            return Decimal('0')
        
        # Calcul selon la méthode
        if self.methode_amortissement == 'LINEAIRE':
            return self._calculer_amortissement_lineaire(date_calcul)
        elif self.methode_amortissement == 'DEGRESSIF':
            return self._calculer_amortissement_degressif(date_calcul)
        else:
            return Decimal('0')
    
    def _calculer_amortissement_lineaire(self, date_calcul: date) -> Decimal:
        """Calcule l'amortissement linéaire."""
        mois_ecoules = (
            (date_calcul.year - self.date_mise_en_service.year) * 12 +
            (date_calcul.month - self.date_mise_en_service.month)
        )
        
        if mois_ecoules <= 0:
            return Decimal('0')
        
        mois_a_amortir = min(mois_ecoules, self.duree_amortissement)
        base = self.base_amortissement or (self.valeur_brute - self.valeur_residuelle)
        
        return (base * Decimal(str(mois_a_amortir))) / Decimal(str(self.duree_amortissement))
    
    def _calculer_amortissement_degressif(self, date_calcul: date) -> Decimal:
        """Calcule l'amortissement dégressif."""
        # Implémentation simplifiée - à développer selon les règles fiscales
        return self._calculer_amortissement_lineaire(date_calcul)
    
    def mettre_a_jour_valeur_nette(self):
        """Met à jour la valeur nette comptable."""
        amortissements = self.lignes_amortissement.aggregate(
            total=models.Sum('montant_amortissement')
        )['total'] or Decimal('0')
        
        self.valeur_nette_comptable = self.valeur_brute - amortissements
        self.save(update_fields=['valeur_nette_comptable'])


class LigneAmortissement(BaseModel):
    """Lignes d'amortissement des immobilisations."""
    
    STATUT_CHOICES = [
        ('PREVISIONNEL', 'Prévisionnel'),
        ('REALISE', 'Réalisé'),
        ('AJUSTE', 'Ajusté'),
        ('ANNULE', 'Annulé'),
    ]
    
    # Relations
    immobilisation = models.ForeignKey(Immobilisation, on_delete=models.CASCADE, related_name='lignes_amortissement')
    
    # Informations de la ligne
    exercice = models.IntegerField()
    periode = models.CharField(max_length=7)  # Format YYYY-MM
    date_debut = models.DateField()
    date_fin = models.DateField()
    
    # Calculs
    base_amortissement = models.DecimalField(max_digits=15, decimal_places=2)
    taux_applique = models.DecimalField(max_digits=5, decimal_places=2)
    montant_amortissement = models.DecimalField(max_digits=15, decimal_places=2)
    cumul_amortissement = models.DecimalField(max_digits=15, decimal_places=2)
    valeur_nette_fin = models.DecimalField(max_digits=15, decimal_places=2)
    
    # Statut
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='PREVISIONNEL')
    
    # Écriture comptable associée
    ecriture_comptable = models.ForeignKey(
        'accounting.Ecriture', on_delete=models.SET_NULL, null=True, blank=True
    )
    
    # Métadonnées
    observations = models.TextField(blank=True, null=True)
    
    class Meta:
        db_table = 'assets_ligne_amortissement'
        unique_together = [('immobilisation', 'periode')]
        indexes = [
            models.Index(fields=['immobilisation', 'exercice']),
            models.Index(fields=['periode', 'statut']),
        ]
        verbose_name = "Ligne d'amortissement"
        verbose_name_plural = "Lignes d'amortissement"
        ordering = ['periode']
    
    def __str__(self):
        return f"{self.immobilisation.numero} - {self.periode} - {self.montant_amortissement}"


class MouvementImmobilisation(BaseModel):
    """Mouvements sur les immobilisations."""
    
    TYPE_CHOICES = [
        ('ACQUISITION', 'Acquisition'),
        ('MISE_SERVICE', 'Mise en service'),
        ('TRANSFERT', 'Transfert'),
        ('REEVALUATION', 'Réévaluation'),
        ('CESSION', 'Cession'),
        ('REFORME', 'Réforme'),
        ('SORTIE', 'Sortie'),
        ('AMORTISSEMENT', 'Amortissement'),
        ('CORRECTION', 'Correction'),
    ]
    
    # Relations
    immobilisation = models.ForeignKey(Immobilisation, on_delete=models.CASCADE, related_name='mouvements')
    ecriture_comptable = models.ForeignKey(
        'accounting.Ecriture', on_delete=models.SET_NULL, null=True, blank=True
    )
    
    # Informations du mouvement
    type_mouvement = models.CharField(max_length=20, choices=TYPE_CHOICES)
    date_mouvement = models.DateField()
    libelle = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    
    # Valeurs
    valeur_avant = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    valeur_apres = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    montant_mouvement = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    # Références
    reference_externe = models.CharField(max_length=100, blank=True, null=True)
    piece_justificative = models.CharField(max_length=100, blank=True, null=True)
    
    # Métadonnées
    justification = models.TextField(blank=True, null=True)
    
    class Meta:
        db_table = 'assets_mouvement'
        indexes = [
            models.Index(fields=['immobilisation', 'date_mouvement']),
            models.Index(fields=['type_mouvement']),
        ]
        verbose_name = "Mouvement d'immobilisation"
        verbose_name_plural = "Mouvements d'immobilisations"
        ordering = ['-date_mouvement']
    
    def __str__(self):
        return f"{self.immobilisation.numero} - {self.get_type_mouvement_display()} - {self.date_mouvement}"


class InventaireImmobilisation(BaseModel):
    """Inventaires physiques des immobilisations."""
    
    STATUT_CHOICES = [
        ('EN_COURS', 'En cours'),
        ('VALIDE', 'Validé'),
        ('CLOTURE', 'Clôturé'),
        ('ANNULE', 'Annulé'),
    ]
    
    # Relations
    societe = models.ForeignKey(Societe, on_delete=models.CASCADE, related_name='inventaires_immobilisations')
    
    # Informations de l'inventaire
    code = models.CharField(max_length=50, db_index=True)
    libelle = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    
    # Périmètre
    date_inventaire = models.DateField()
    categories = models.ManyToManyField(CategorieImmobilisation, blank=True)
    sites = models.JSONField(default=list, blank=True)
    responsables = models.ManyToManyField('auth.User', blank=True)
    
    # Dates
    date_debut = models.DateTimeField()
    date_fin = models.DateTimeField(null=True, blank=True)
    date_validation = models.DateTimeField(null=True, blank=True)
    
    # Statut
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='EN_COURS')
    valide_par = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='inventaires_valides')
    
    # Statistiques
    nb_immobilisations_prevues = models.IntegerField(default=0)
    nb_immobilisations_inventoriees = models.IntegerField(default=0, editable=False)
    nb_ecarts = models.IntegerField(default=0, editable=False)
    
    # Configuration
    tolerance_valeur = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    saisie_mobile = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'assets_inventaire'
        unique_together = [('societe', 'code')]
        indexes = [
            models.Index(fields=['societe', 'date_inventaire']),
            models.Index(fields=['statut']),
        ]
        verbose_name = "Inventaire d'immobilisations"
        verbose_name_plural = "Inventaires d'immobilisations"
        ordering = ['-date_inventaire']
    
    def __str__(self):
        return f"{self.code} - {self.date_inventaire}"


class LigneInventaire(BaseModel):
    """Lignes d'inventaire des immobilisations."""
    
    STATUT_CHOICES = [
        ('NON_INVENTORIE', 'Non inventorié'),
        ('TROUVE', 'Trouvé conforme'),
        ('ECART_LOCALISATION', 'Écart de localisation'),
        ('ECART_ETAT', 'Écart d\'état'),
        ('ECART_RESPONSABLE', 'Écart de responsable'),
        ('NON_TROUVE', 'Non trouvé'),
        ('NOUVEAU', 'Nouveau (non répertorié)'),
    ]
    
    # Relations
    inventaire = models.ForeignKey(InventaireImmobilisation, on_delete=models.CASCADE, related_name='lignes')
    immobilisation = models.ForeignKey(Immobilisation, on_delete=models.CASCADE, related_name='lignes_inventaire')
    
    # Données théoriques (issues de la comptabilité)
    localisation_theorique = models.CharField(max_length=200, blank=True, null=True)
    responsable_theorique = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='lignes_inventaire_theorique'
    )
    etat_theorique = models.CharField(max_length=20, blank=True, null=True)
    
    # Données réelles (saisies lors de l'inventaire)
    localisation_reelle = models.CharField(max_length=200, blank=True, null=True)
    responsable_reel = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='lignes_inventaire_reel'
    )
    etat_reel = models.CharField(max_length=20, blank=True, null=True)
    
    # Statut et dates
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='NON_INVENTORIE')
    date_inventorie = models.DateTimeField(null=True, blank=True)
    inventorie_par = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='inventaires_effectues'
    )
    
    # Observations
    observations = models.TextField(blank=True, null=True)
    photo_inventaire = models.ImageField(upload_to='inventaires/', blank=True, null=True)
    
    # Géolocalisation
    latitude = models.DecimalField(max_digits=10, decimal_places=8, null=True, blank=True)
    longitude = models.DecimalField(max_digits=11, decimal_places=8, null=True, blank=True)
    
    class Meta:
        db_table = 'assets_ligne_inventaire'
        unique_together = [('inventaire', 'immobilisation')]
        indexes = [
            models.Index(fields=['inventaire', 'statut']),
            models.Index(fields=['immobilisation']),
            models.Index(fields=['date_inventorie']),
        ]
        verbose_name = "Ligne d'inventaire"
        verbose_name_plural = "Lignes d'inventaire"
    
    def __str__(self):
        return f"{self.inventaire.code} - {self.immobilisation.numero}"
    
    @property
    def has_ecart(self):
        """Vérifie s'il y a des écarts."""
        return self.statut in ['ECART_LOCALISATION', 'ECART_ETAT', 'ECART_RESPONSABLE']


class MaintenanceImmobilisation(BaseModel):
    """Suivi de la maintenance des immobilisations."""
    
    TYPE_CHOICES = [
        ('PREVENTIVE', 'Maintenance préventive'),
        ('CORRECTIVE', 'Maintenance corrective'),
        ('REVISION', 'Révision'),
        ('REPARATION', 'Réparation'),
        ('CONTROLE', 'Contrôle réglementaire'),
        ('AUTRE', 'Autre'),
    ]
    
    STATUT_CHOICES = [
        ('PLANIFIEE', 'Planifiée'),
        ('EN_COURS', 'En cours'),
        ('TERMINEE', 'Terminée'),
        ('REPORTEE', 'Reportée'),
        ('ANNULEE', 'Annulée'),
    ]
    
    # Relations
    immobilisation = models.ForeignKey(Immobilisation, on_delete=models.CASCADE, related_name='maintenances')
    prestataire = models.ForeignKey(Tiers, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Informations de base
    type_maintenance = models.CharField(max_length=20, choices=TYPE_CHOICES)
    libelle = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    
    # Planification
    date_prevue = models.DateField()
    date_realisee = models.DateField(null=True, blank=True)
    duree_prevue = models.PositiveIntegerField(help_text="Durée en heures")
    duree_reelle = models.PositiveIntegerField(null=True, blank=True, help_text="Durée en heures")
    
    # Coûts
    cout_prevu = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    cout_reel = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    # Récurrence
    est_recurrente = models.BooleanField(default=False)
    periodicite = models.PositiveIntegerField(null=True, blank=True, help_text="Périodicité en jours")
    prochaine_maintenance = models.DateField(null=True, blank=True)
    
    # Statut
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='PLANIFIEE')
    
    # Résultats
    compte_rendu = models.TextField(blank=True, null=True)
    pieces_changees = models.JSONField(default=list, blank=True)
    
    # Documents
    facture_numero = models.CharField(max_length=100, blank=True, null=True)
    documents = models.JSONField(default=list, blank=True)
    
    class Meta:
        db_table = 'assets_maintenance'
        indexes = [
            models.Index(fields=['immobilisation', 'date_prevue']),
            models.Index(fields=['statut', 'date_prevue']),
            models.Index(fields=['prestataire']),
        ]
        verbose_name = "Maintenance d'immobilisation"
        verbose_name_plural = "Maintenances d'immobilisations"
        ordering = ['date_prevue']
    
    def __str__(self):
        return f"{self.immobilisation.numero} - {self.libelle} - {self.date_prevue}"


class ContratImmobilisation(BaseModel):
    """Contrats liés aux immobilisations."""
    
    TYPE_CHOICES = [
        ('ACHAT', 'Contrat d\'achat'),
        ('LOCATION', 'Contrat de location'),
        ('LEASING', 'Contrat de leasing'),
        ('MAINTENANCE', 'Contrat de maintenance'),
        ('ASSURANCE', 'Contrat d\'assurance'),
        ('GARANTIE', 'Garantie'),
        ('AUTRE', 'Autre'),
    ]
    
    STATUT_CHOICES = [
        ('EN_COURS', 'En cours'),
        ('EXPIRE', 'Expiré'),
        ('RESILIE', 'Résilié'),
        ('SUSPENDU', 'Suspendu'),
    ]
    
    # Relations
    immobilisation = models.ForeignKey(Immobilisation, on_delete=models.CASCADE, related_name='contrats')
    tiers = models.ForeignKey(Tiers, on_delete=models.PROTECT, related_name='contrats_immobilisations')
    
    # Informations du contrat
    type_contrat = models.CharField(max_length=20, choices=TYPE_CHOICES)
    numero_contrat = models.CharField(max_length=100, db_index=True)
    libelle = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    
    # Dates
    date_debut = models.DateField()
    date_fin = models.DateField()
    date_resiliation = models.DateField(null=True, blank=True)
    
    # Conditions financières
    montant_mensuel = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    montant_total = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    devise = models.ForeignKey(Devise, on_delete=models.PROTECT)
    
    # Renouvellement
    renouvelable = models.BooleanField(default=False)
    duree_renouvellement = models.PositiveIntegerField(null=True, blank=True, help_text="En mois")
    reconduction_tacite = models.BooleanField(default=False)
    preavis_resiliation = models.PositiveIntegerField(default=30, help_text="En jours")
    
    # Statut
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='EN_COURS')
    
    # Documents
    document_contrat = models.FileField(upload_to='contrats/', blank=True, null=True)
    documents_annexes = models.JSONField(default=list, blank=True)
    
    # Alertes
    alerte_expiration = models.BooleanField(default=True)
    delai_alerte = models.PositiveIntegerField(default=30, help_text="Nombre de jours avant expiration")
    
    class Meta:
        db_table = 'assets_contrat'
        unique_together = [('immobilisation', 'numero_contrat')]
        indexes = [
            models.Index(fields=['immobilisation', 'type_contrat']),
            models.Index(fields=['tiers', 'statut']),
            models.Index(fields=['date_fin', 'statut']),
        ]
        verbose_name = "Contrat d'immobilisation"
        verbose_name_plural = "Contrats d'immobilisations"
        ordering = ['date_fin']
    
    def __str__(self):
        return f"{self.numero_contrat} - {self.immobilisation.numero}"
    
    @property
    def jours_avant_expiration(self):
        """Calcule le nombre de jours avant expiration."""
        if self.statut != 'EN_COURS':
            return None
        
        today = date.today()
        if self.date_fin <= today:
            return 0
        
        return (self.date_fin - today).days
    
    @property
    def necessite_alerte(self):
        """Vérifie si une alerte est nécessaire."""
        if not self.alerte_expiration or self.statut != 'EN_COURS':
            return False
        
        jours_restants = self.jours_avant_expiration
        return jours_restants is not None and jours_restants <= self.delai_alerte