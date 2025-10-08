"""
Modèles de données principaux selon cahier des charges 7.1
Implémentation complète du schéma conceptuel SQL
"""

from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator, RegexValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal
import uuid


# ==================== MODÈLES PRINCIPAUX ====================

class PlanComptable(models.Model):
    """Table: Plans Comptables - Référentiel SYSCOHADA/IFRS"""
    
    TYPE_PLAN = [
        ('SYSCOHADA', 'Plan SYSCOHADA'),
        ('IFRS', 'Plan IFRS'),
        ('CUSTOM', 'Plan personnalisé'),
    ]
    
    NATURE_COMPTE = [
        ('DEBIT', 'Débiteur'),
        ('CREDIT', 'Créditeur'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(
        max_length=9, 
        unique=True,
        validators=[RegexValidator(r'^\d{1,9}$', 'Le code doit contenir uniquement des chiffres')]
    )
    libelle = models.CharField(max_length=255)
    type = models.CharField(max_length=10, choices=TYPE_PLAN, default='SYSCOHADA')
    classe = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(9)],
        help_text="Classe du compte (1-9)"
    )
    nature = models.CharField(max_length=10, choices=NATURE_COMPTE)
    
    # Hiérarchie
    compte_parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='sous_comptes'
    )
    
    # État
    actif = models.BooleanField(default=True)
    
    # Métadonnées
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'plan_comptable'
        ordering = ['code']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['classe', 'actif']),
            models.Index(fields=['compte_parent']),
        ]
    
    def __str__(self):
        return f"{self.code} - {self.libelle}"
    
    def clean(self):
        """Validation du compte"""
        if self.code and len(self.code) > 0:
            self.classe = int(self.code[0])
        
        # Vérifier la cohérence parent-enfant
        if self.compte_parent and self.compte_parent.code:
            if not self.code.startswith(self.compte_parent.code):
                raise ValidationError("Le code du sous-compte doit commencer par le code du compte parent")
    
    @property
    def est_compte_detail(self):
        """Vérifie si c'est un compte de détail (feuille)"""
        return not self.sous_comptes.exists()


class Devise(models.Model):
    """Table: Devises"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=3, unique=True)
    libelle = models.CharField(max_length=50)
    symbole = models.CharField(max_length=5, blank=True)
    taux_base = models.DecimalField(
        max_digits=20, 
        decimal_places=10, 
        default=Decimal('1.0'),
        help_text="Taux de conversion vers la devise de base"
    )
    actif = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'devises'
        ordering = ['code']
    
    def __str__(self):
        return f"{self.code} - {self.libelle}"


class Journal(models.Model):
    """Table: Journaux comptables"""
    
    TYPE_JOURNAL = [
        ('ACHAT', 'Journal des achats'),
        ('VENTE', 'Journal des ventes'),
        ('BANQUE', 'Journal de banque'),
        ('CAISSE', 'Journal de caisse'),
        ('OD', 'Opérations diverses'),
        ('AN', 'À nouveau'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=10, unique=True)
    libelle = models.CharField(max_length=100)
    type = models.CharField(max_length=10, choices=TYPE_JOURNAL)
    
    compte_contrepartie = models.ForeignKey(
        PlanComptable,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='journaux_contrepartie'
    )
    
    # Numérotation
    numerotation_auto = models.BooleanField(default=True)
    dernier_numero = models.IntegerField(default=0)
    prefixe = models.CharField(max_length=10, blank=True)
    
    actif = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'journaux'
        ordering = ['code']
    
    def __str__(self):
        return f"{self.code} - {self.libelle}"
    
    def get_prochain_numero(self):
        """Génère le prochain numéro de pièce"""
        if self.numerotation_auto:
            self.dernier_numero += 1
            self.save(update_fields=['dernier_numero'])
            return f"{self.prefixe}{self.dernier_numero:06d}"
        return None


class Exercice(models.Model):
    """Table: Exercices comptables"""
    
    STATUT_EXERCICE = [
        ('OUVERT', 'Ouvert'),
        ('CLOTURE', 'Clôturé'),
        ('ARCHIVE', 'Archivé'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=10, unique=True)
    libelle = models.CharField(max_length=100)
    date_debut = models.DateField()
    date_fin = models.DateField()
    
    statut = models.CharField(max_length=10, choices=STATUT_EXERCICE, default='OUVERT')
    date_cloture = models.DateTimeField(null=True, blank=True)
    cloture_par = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='exercices_clotures'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'exercices'
        ordering = ['-date_debut']
        indexes = [
            models.Index(fields=['statut', 'date_debut']),
        ]
    
    def __str__(self):
        return f"{self.code} - {self.libelle}"
    
    def clean(self):
        """Validation de l'exercice"""
        if self.date_debut and self.date_fin:
            if self.date_debut >= self.date_fin:
                raise ValidationError("La date de fin doit être postérieure à la date de début")
            
            # Vérifier les chevauchements
            overlapping = Exercice.objects.filter(
                date_debut__lte=self.date_fin,
                date_fin__gte=self.date_debut
            ).exclude(pk=self.pk)
            
            if overlapping.exists():
                raise ValidationError("Cet exercice chevauche avec un exercice existant")


class Tiers(models.Model):
    """Table: Tiers (Clients, Fournisseurs, Autres)"""
    
    TYPE_TIERS = [
        ('CLIENT', 'Client'),
        ('FOURNISSEUR', 'Fournisseur'),
        ('AUTRE', 'Autre tiers'),
    ]
    
    FORME_JURIDIQUE = [
        ('SA', 'Société Anonyme'),
        ('SARL', 'SARL'),
        ('SAS', 'SAS'),
        ('EI', 'Entreprise Individuelle'),
        ('ASSOCIATION', 'Association'),
        ('AUTRE', 'Autre'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=20, unique=True)
    type = models.CharField(max_length=15, choices=TYPE_TIERS)
    
    # Informations générales
    raison_sociale = models.CharField(max_length=255)
    nom_commercial = models.CharField(max_length=255, blank=True)
    forme_juridique = models.CharField(max_length=20, choices=FORME_JURIDIQUE, blank=True)
    capital = models.DecimalField(max_digits=20, decimal_places=2, null=True, blank=True)
    
    # Identifiants légaux
    rccm = models.CharField(max_length=50, blank=True, verbose_name="N° RCCM")
    nif = models.CharField(max_length=50, blank=True, verbose_name="N° NIF")
    
    # Contact
    email = models.EmailField(blank=True)
    telephone = models.CharField(max_length=20, blank=True)
    fax = models.CharField(max_length=20, blank=True)
    site_web = models.URLField(blank=True)
    
    # Adresse
    adresse_ligne1 = models.CharField(max_length=255, blank=True)
    adresse_ligne2 = models.CharField(max_length=255, blank=True)
    code_postal = models.CharField(max_length=10, blank=True)
    ville = models.CharField(max_length=100, blank=True)
    pays = models.CharField(max_length=2, default='CI')
    
    # Comptabilité
    compte_comptable = models.ForeignKey(
        PlanComptable,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tiers'
    )
    
    # Conditions commerciales
    conditions_paiement = models.IntegerField(
        default=30,
        help_text="Délai de paiement en jours"
    )
    limite_credit = models.DecimalField(
        max_digits=20, 
        decimal_places=2,
        null=True,
        blank=True
    )
    devise = models.ForeignKey(
        Devise,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    
    # Informations bancaires
    iban = models.CharField(max_length=34, blank=True)
    bic = models.CharField(max_length=11, blank=True)
    
    # Score et risque
    score_credit = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    
    # État
    actif = models.BooleanField(default=True)
    
    # Métadonnées
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='tiers_crees'
    )
    
    class Meta:
        db_table = 'tiers'
        ordering = ['raison_sociale']
        indexes = [
            models.Index(fields=['type', 'actif']),
            models.Index(fields=['code']),
            models.Index(fields=['nif']),
            models.Index(fields=['rccm']),
        ]
    
    def __str__(self):
        return f"{self.code} - {self.raison_sociale}"
    
    @property
    def encours_client(self):
        """Calcule l'encours pour un client"""
        if self.type != 'CLIENT':
            return Decimal('0')
        
        from django.db.models import Sum
        return self.ecritures.filter(
            lettrage__isnull=True,
            statut='VALIDE'
        ).aggregate(
            total=Sum('debit') - Sum('credit')
        )['total'] or Decimal('0')


class EcritureComptable(models.Model):
    """Table: Écritures Comptables"""
    
    STATUT_ECRITURE = [
        ('BROUILLON', 'Brouillon'),
        ('VALIDE', 'Validée'),
        ('CLOTURE', 'Clôturée'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    numero_piece = models.CharField(max_length=50)
    
    # Dates
    date_ecriture = models.DateField()
    date_valeur = models.DateField(null=True, blank=True)
    
    # Références
    journal = models.ForeignKey(
        Journal,
        on_delete=models.PROTECT,
        related_name='ecritures'
    )
    exercice = models.ForeignKey(
        Exercice,
        on_delete=models.PROTECT,
        related_name='ecritures'
    )
    compte = models.ForeignKey(
        PlanComptable,
        on_delete=models.PROTECT,
        related_name='ecritures'
    )
    tiers = models.ForeignKey(
        Tiers,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ecritures'
    )
    
    # Libellé et montants
    libelle = models.TextField()
    debit = models.DecimalField(
        max_digits=20,
        decimal_places=4,
        default=Decimal('0'),
        validators=[MinValueValidator(Decimal('0'))]
    )
    credit = models.DecimalField(
        max_digits=20,
        decimal_places=4,
        default=Decimal('0'),
        validators=[MinValueValidator(Decimal('0'))]
    )
    
    # Devise
    devise = models.ForeignKey(
        Devise,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    montant_devise = models.DecimalField(
        max_digits=20,
        decimal_places=4,
        null=True,
        blank=True
    )
    taux_change = models.DecimalField(
        max_digits=10,
        decimal_places=6,
        null=True,
        blank=True
    )
    
    # Références externes
    reference_externe = models.CharField(max_length=100, blank=True)
    
    # Lettrage
    lettrage = models.CharField(max_length=20, blank=True, db_index=True)
    date_lettrage = models.DateField(null=True, blank=True)
    
    # Statut
    statut = models.CharField(max_length=10, choices=STATUT_ECRITURE, default='BROUILLON')
    
    # Pièces jointes
    piece_jointe = models.FileField(
        upload_to='ecritures/pieces_jointes/',
        null=True,
        blank=True
    )
    
    # Audit
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='ecritures_creees'
    )
    validated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ecritures_validees'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'ecritures'
        ordering = ['-date_ecriture', '-created_at']
        indexes = [
            models.Index(fields=['date_ecriture']),
            models.Index(fields=['compte', 'date_ecriture']),
            models.Index(fields=['tiers', 'date_ecriture']),
            models.Index(fields=['lettrage']),
            models.Index(fields=['exercice', 'statut']),
            models.Index(fields=['journal', 'date_ecriture']),
        ]
        constraints = [
            models.CheckConstraint(
                check=(
                    models.Q(debit__gt=0, credit=0) |
                    models.Q(debit=0, credit__gt=0)
                ),
                name='debit_ou_credit_non_nul'
            )
        ]
    
    def __str__(self):
        return f"{self.numero_piece} - {self.libelle[:50]}"
    
    def clean(self):
        """Validation de l'écriture"""
        if self.debit > 0 and self.credit > 0:
            raise ValidationError("Une écriture ne peut pas avoir à la fois un débit et un crédit")
        
        if self.debit == 0 and self.credit == 0:
            raise ValidationError("Une écriture doit avoir soit un débit soit un crédit")
        
        # Vérifier la période de l'exercice
        if self.date_ecriture and self.exercice:
            if not (self.exercice.date_debut <= self.date_ecriture <= self.exercice.date_fin):
                raise ValidationError("La date de l'écriture n'est pas dans la période de l'exercice")
    
    @property
    def montant(self):
        """Retourne le montant (débit ou crédit)"""
        return self.debit if self.debit > 0 else self.credit
    
    @property
    def sens(self):
        """Retourne le sens de l'écriture"""
        return 'D' if self.debit > 0 else 'C'


class CategorieImmobilisation(models.Model):
    """Table: Catégories d'immobilisations"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=20, unique=True)
    libelle = models.CharField(max_length=100)
    
    # Comptes par défaut
    compte_immo = models.ForeignKey(
        PlanComptable,
        on_delete=models.SET_NULL,
        null=True,
        related_name='categories_immo'
    )
    compte_amortissement = models.ForeignKey(
        PlanComptable,
        on_delete=models.SET_NULL,
        null=True,
        related_name='categories_amort'
    )
    compte_dotation = models.ForeignKey(
        PlanComptable,
        on_delete=models.SET_NULL,
        null=True,
        related_name='categories_dotation'
    )
    
    # Paramètres d'amortissement par défaut
    duree_amortissement = models.IntegerField(
        default=5,
        help_text="Durée d'amortissement par défaut en années"
    )
    taux_amortissement = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True
    )
    
    actif = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'categories_immo'
        ordering = ['code']
    
    def __str__(self):
        return f"{self.code} - {self.libelle}"


class Immobilisation(models.Model):
    """Table: Immobilisations"""
    
    METHODE_AMORTISSEMENT = [
        ('LINEAIRE', 'Linéaire'),
        ('DEGRESSIF', 'Dégressif'),
        ('PROGRESSIF', 'Progressif'),
    ]
    
    STATUT_IMMO = [
        ('EN_COURS', 'En cours d\'acquisition'),
        ('EN_SERVICE', 'En service'),
        ('CEDE', 'Cédée'),
        ('REFORME', 'Mise au rebut'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=50, unique=True)
    libelle = models.CharField(max_length=255)
    
    categorie = models.ForeignKey(
        CategorieImmobilisation,
        on_delete=models.PROTECT,
        related_name='immobilisations'
    )
    
    # Dates
    date_acquisition = models.DateField()
    date_mise_service = models.DateField(null=True, blank=True)
    
    # Valeurs
    valeur_acquisition = models.DecimalField(
        max_digits=20,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0'))]
    )
    valeur_residuelle = models.DecimalField(
        max_digits=20,
        decimal_places=2,
        default=Decimal('0'),
        validators=[MinValueValidator(Decimal('0'))]
    )
    
    # Amortissement
    duree_amortissement = models.IntegerField(
        validators=[MinValueValidator(1)],
        help_text="Durée en années"
    )
    methode_amortissement = models.CharField(
        max_length=10,
        choices=METHODE_AMORTISSEMENT,
        default='LINEAIRE'
    )
    taux_amortissement = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True
    )
    
    # Comptes comptables
    compte_immo = models.ForeignKey(
        PlanComptable,
        on_delete=models.PROTECT,
        related_name='immobilisations'
    )
    compte_amort = models.ForeignKey(
        PlanComptable,
        on_delete=models.PROTECT,
        related_name='amortissements'
    )
    compte_dotation = models.ForeignKey(
        PlanComptable,
        on_delete=models.PROTECT,
        related_name='dotations'
    )
    
    # Localisation et responsable
    localisation = models.CharField(max_length=255, blank=True)
    responsable = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='immobilisations_gerees'
    )
    
    # Statut
    statut = models.CharField(max_length=10, choices=STATUT_IMMO, default='EN_COURS')
    
    # Métadonnées
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='immobilisations_creees'
    )
    
    class Meta:
        db_table = 'immobilisations'
        ordering = ['code']
        indexes = [
            models.Index(fields=['categorie', 'statut']),
            models.Index(fields=['date_acquisition']),
            models.Index(fields=['responsable']),
        ]
    
    def __str__(self):
        return f"{self.code} - {self.libelle}"
    
    def clean(self):
        """Validation de l'immobilisation"""
        if self.valeur_residuelle > self.valeur_acquisition:
            raise ValidationError("La valeur résiduelle ne peut pas être supérieure à la valeur d'acquisition")
        
        if self.date_mise_service and self.date_acquisition:
            if self.date_mise_service < self.date_acquisition:
                raise ValidationError("La date de mise en service ne peut pas être antérieure à la date d'acquisition")
    
    @property
    def valeur_nette_comptable(self):
        """Calcule la valeur nette comptable"""
        from django.db.models import Sum
        total_amortissement = self.amortissements.aggregate(
            total=Sum('montant')
        )['total'] or Decimal('0')
        
        return self.valeur_acquisition - total_amortissement
    
    def calculer_dotation_annuelle(self):
        """Calcule la dotation annuelle aux amortissements"""
        if self.methode_amortissement == 'LINEAIRE':
            base_amortissable = self.valeur_acquisition - self.valeur_residuelle
            return base_amortissable / self.duree_amortissement
        
        # Autres méthodes à implémenter
        return Decimal('0')