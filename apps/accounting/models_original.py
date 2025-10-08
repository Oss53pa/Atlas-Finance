"""
Modèles pour le module Comptabilité Générale.
"""
import uuid
from decimal import Decimal
from django.db import models, transaction
from django.core.validators import MinValueValidator, MaxValueValidator, RegexValidator
from django.utils import timezone
from mptt.models import MPTTModel, TreeForeignKey
from apps.core.models import BaseModel, Societe, Devise, Exercice, Periode


class PlanComptable(MPTTModel, BaseModel):
    """Plan comptable SYSCOHADA hiérarchique."""
    
    ACCOUNT_TYPES = [
        ('SYSCOHADA', 'SYSCOHADA Standard'),
        ('BANK', 'Plan Bancaire'),
        ('INSURANCE', 'Plan Assurance'),
        ('MICROFINANCE', 'Plan Microfinance'),
        ('CUSTOM', 'Personnalisé'),
    ]
    
    NATURE_CHOICES = [
        ('DEBIT', 'Débit'),
        ('CREDIT', 'Crédit'),
    ]
    
    # Structure hiérarchique
    code = models.CharField(
        max_length=9,
        validators=[RegexValidator(r'^[1-9]\d{0,8}$', 'Code invalide')],
        db_index=True
    )
    libelle = models.CharField(max_length=255)
    libelle_court = models.CharField(max_length=50, blank=True)
    
    # Classification
    type_plan = models.CharField(max_length=20, choices=ACCOUNT_TYPES, default='SYSCOHADA')
    classe = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(9)])
    nature = models.CharField(max_length=10, choices=NATURE_CHOICES)
    parent = TreeForeignKey('self', on_delete=models.CASCADE, null=True, blank=True)
    
    # Paramètres comptables
    lettrable = models.BooleanField(default=False)
    pointable = models.BooleanField(default=False)
    collectif = models.BooleanField(default=False)
    analytique_obligatoire = models.BooleanField(default=False)
    devise_autorisee = models.BooleanField(default=False)
    
    # Correspondance IFRS
    compte_ifrs = models.CharField(max_length=20, blank=True)
    retraitement_auto = models.BooleanField(default=False)
    formule_retraitement = models.TextField(blank=True)
    
    # Société
    societe = models.ForeignKey(
        Societe,
        on_delete=models.CASCADE,
        related_name='plan_comptable'
    )
    
    class Meta:
        db_table = 'plan_comptable'
        unique_together = ['societe', 'code']
        indexes = [
            models.Index(fields=['societe', 'code']),
            models.Index(fields=['societe', 'classe', 'nature']),
            models.Index(fields=['compte_ifrs']),
        ]
        ordering = ['code']
        
    class MPTTMeta:
        order_insertion_by = ['code']
    
    def __str__(self):
        return f"{self.code} - {self.libelle}"
    
    @property
    def code_complet(self):
        """Retourne le code complet avec padding."""
        return self.code.ljust(9, '0')
    
    def has_movements(self):
        """Vérifie si le compte a des mouvements."""
        return self.lignes_ecriture.exists()
    
    def get_solde(self, date_fin=None):
        """Calcule le solde du compte à une date donnée."""
        from django.db.models import Sum, Q
        
        queryset = self.lignes_ecriture.filter(
            ecriture__statut='VALIDE'
        )
        
        if date_fin:
            queryset = queryset.filter(ecriture__date_ecriture__lte=date_fin)
        
        aggregates = queryset.aggregate(
            total_debit=Sum('debit', default=0),
            total_credit=Sum('credit', default=0)
        )
        
        solde = aggregates['total_debit'] - aggregates['total_credit']
        
        # Inverser pour les comptes de nature crédit
        if self.nature == 'CREDIT':
            solde = -solde
            
        return solde


class Journal(BaseModel):
    """Journaux comptables."""
    
    JOURNAL_TYPES = [
        ('ACH', 'Achats'),
        ('VTE', 'Ventes'),
        ('TRE', 'Trésorerie'),
        ('OD', 'Opérations Diverses'),
        ('AN', 'À-nouveaux'),
        ('SAL', 'Salaires'),
        ('DEC', 'Déclarations'),
    ]
    
    # Identification
    societe = models.ForeignKey(Societe, on_delete=models.CASCADE, related_name='journaux')
    code = models.CharField(max_length=10)
    libelle = models.CharField(max_length=100)
    type = models.CharField(max_length=3, choices=JOURNAL_TYPES)
    
    # Paramètres
    compte_contrepartie = models.ForeignKey(
        PlanComptable,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='journaux_contrepartie'
    )
    
    # Numérotation
    numerotation_auto = models.BooleanField(default=True)
    prefixe_numero = models.CharField(max_length=10, default='')
    dernier_numero = models.IntegerField(default=0)
    format_numero = models.CharField(
        max_length=50,
        default='{prefix}{year}{month:02d}{number:05d}'
    )
    
    # Workflow
    validation_requise = models.BooleanField(default=True)
    niveau_validation = models.IntegerField(default=1)
    piece_obligatoire = models.BooleanField(default=True)
    
    # Sécurité
    groupes_autorises = models.ManyToManyField('auth.Group', blank=True)
    signature_electronique = models.BooleanField(default=False)
    
    # État
    date_cloture = models.DateField(null=True, blank=True)
    
    class Meta:
        db_table = 'journaux'
        unique_together = ['societe', 'code']
        indexes = [
            models.Index(fields=['societe', 'type']),
            models.Index(fields=['code']),
        ]
    
    def __str__(self):
        return f"{self.code} - {self.libelle}"
    
    def get_next_number(self):
        """Génère le prochain numéro de pièce."""
        if not self.numerotation_auto:
            return None
            
        with transaction.atomic():
            # Verrouiller la ligne pour éviter les doublons
            journal = Journal.objects.select_for_update().get(id=self.id)
            journal.dernier_numero += 1
            journal.save(update_fields=['dernier_numero'])
            
            now = timezone.now()
            return self.format_numero.format(
                prefix=self.prefixe_numero,
                year=now.year,
                month=now.month,
                number=journal.dernier_numero
            )
    
    def can_be_closed(self):
        """Vérifie si le journal peut être clôturé."""
        # Vérifier s'il y a des écritures en brouillon
        return not self.ecritures.filter(statut='BROUILLON').exists()


class Ecriture(BaseModel):
    """Écritures comptables."""
    
    STATUTS = [
        ('BROUILLON', 'Brouillon'),
        ('VALIDE', 'Validé'),
        ('CLOTURE', 'Clôturé'),
    ]
    
    # Identification
    societe = models.ForeignKey(Societe, on_delete=models.CASCADE, related_name='ecritures')
    numero_piece = models.CharField(max_length=50)
    date_ecriture = models.DateField(db_index=True)
    date_valeur = models.DateField(null=True, blank=True)
    
    # Relations
    journal = models.ForeignKey(Journal, on_delete=models.PROTECT, related_name='ecritures')
    exercice = models.ForeignKey(Exercice, on_delete=models.PROTECT, related_name='ecritures')
    periode = models.ForeignKey(Periode, on_delete=models.PROTECT, related_name='ecritures')
    
    # Données
    libelle = models.TextField()
    reference_externe = models.CharField(max_length=100, blank=True, db_index=True)
    
    # État
    statut = models.CharField(max_length=10, choices=STATUTS, default='BROUILLON')
    
    # Validation
    validated_by = models.ForeignKey(
        'authentication.User',
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name='ecritures_validees'
    )
    validated_at = models.DateTimeField(null=True, blank=True)
    
    # Montants calculés
    total_debit = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    total_credit = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    is_balanced = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'ecritures'
        unique_together = ['societe', 'numero_piece']
        indexes = [
            models.Index(fields=['societe', 'date_ecriture', 'journal']),
            models.Index(fields=['exercice', 'periode']),
            models.Index(fields=['statut', 'created_at']),
            models.Index(fields=['reference_externe']),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(total_debit__gte=0),
                name='total_debit_positive'
            ),
            models.CheckConstraint(
                check=models.Q(total_credit__gte=0),
                name='total_credit_positive'
            ),
        ]
        ordering = ['-date_ecriture', '-created_at']
    
    def __str__(self):
        return f"{self.numero_piece} - {self.libelle[:50]}"
    
    def save(self, *args, **kwargs):
        # Générer le numéro de pièce si nécessaire
        if not self.numero_piece and self.journal.numerotation_auto:
            self.numero_piece = self.journal.get_next_number()
        
        # Calculer les totaux
        self.calculate_totals()
        
        super().save(*args, **kwargs)
    
    def calculate_totals(self):
        """Recalcule les totaux débit/crédit."""
        if self.pk:
            totals = self.lignes.aggregate(
                total_debit=models.Sum('debit', default=0),
                total_credit=models.Sum('credit', default=0)
            )
            self.total_debit = totals['total_debit']
            self.total_credit = totals['total_credit']
            self.is_balanced = abs(self.total_debit - self.total_credit) < Decimal('0.01')
    
    def validate_ecriture(self, user):
        """Valide l'écriture."""
        if self.statut != 'BROUILLON':
            raise ValueError("Seules les écritures en brouillon peuvent être validées")
        
        if not self.is_balanced:
            raise ValueError("L'écriture n'est pas équilibrée")
        
        if self.lignes.count() < 2:
            raise ValueError("Une écriture doit avoir au moins 2 lignes")
        
        self.statut = 'VALIDE'
        self.validated_by = user
        self.validated_at = timezone.now()
        self.save()
    
    def can_be_modified(self):
        """Vérifie si l'écriture peut être modifiée."""
        return self.statut == 'BROUILLON'
    
    def can_be_deleted(self):
        """Vérifie si l'écriture peut être supprimée."""
        return self.statut == 'BROUILLON'


class LigneEcriture(BaseModel):
    """Lignes d'écriture comptable."""
    
    # Relations
    ecriture = models.ForeignKey(
        Ecriture,
        on_delete=models.CASCADE,
        related_name='lignes'
    )
    numero_ligne = models.IntegerField()
    
    # Compte et tiers
    compte = models.ForeignKey(
        PlanComptable,
        on_delete=models.PROTECT,
        related_name='lignes_ecriture'
    )
    tiers = models.ForeignKey(
        'third_party.Tiers',
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name='lignes_ecriture'
    )
    
    # Libellé spécifique à la ligne
    libelle = models.CharField(max_length=255, blank=True)
    
    # Montants
    debit = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    credit = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    
    # Multi-devises
    devise = models.ForeignKey(Devise, on_delete=models.PROTECT)
    montant_devise = models.DecimalField(
        max_digits=20,
        decimal_places=2,
        null=True,
        blank=True
    )
    taux_change = models.DecimalField(
        max_digits=10,
        decimal_places=6,
        null=True,
        blank=True
    )
    
    # Lettrage
    lettrage = models.CharField(max_length=20, blank=True, db_index=True)
    date_lettrage = models.DateField(null=True, blank=True)
    
    # Comptabilité analytique
    section_analytique = models.JSONField(default=dict, blank=True)
    
    # Références
    piece_justificative = models.CharField(max_length=100, blank=True)
    
    class Meta:
        db_table = 'lignes_ecritures'
        unique_together = ['ecriture', 'numero_ligne']
        indexes = [
            models.Index(fields=['compte', 'ecriture__date_ecriture']),
            models.Index(fields=['tiers', 'compte']),
            models.Index(fields=['lettrage'], condition=models.Q(lettrage__gt='')),
            models.Index(fields=['ecriture__exercice', 'compte']),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(debit__gte=0),
                name='ligne_debit_positive'
            ),
            models.CheckConstraint(
                check=models.Q(credit__gte=0),
                name='ligne_credit_positive'
            ),
            models.CheckConstraint(
                check=~(models.Q(debit__gt=0) & models.Q(credit__gt=0)),
                name='ligne_debit_or_credit'
            ),
        ]
        ordering = ['ecriture', 'numero_ligne']
    
    def __str__(self):
        montant = self.debit if self.debit > 0 else self.credit
        sens = 'D' if self.debit > 0 else 'C'
        return f"{self.compte.code} - {montant} {sens}"
    
    def save(self, *args, **kwargs):
        # Auto-incrémentation du numéro de ligne
        if not self.numero_ligne:
            max_ligne = self.ecriture.lignes.aggregate(
                max_ligne=models.Max('numero_ligne')
            )['max_ligne'] or 0
            self.numero_ligne = max_ligne + 1
        
        # Utiliser la devise de la société par défaut
        if not self.devise_id:
            self.devise = self.ecriture.societe.devise_principale
        
        super().save(*args, **kwargs)
        
        # Recalculer les totaux de l'écriture
        if self.ecriture_id:
            self.ecriture.calculate_totals()
            self.ecriture.save(update_fields=['total_debit', 'total_credit', 'is_balanced'])
    
    def get_montant(self):
        """Retourne le montant de la ligne (débit ou crédit)."""
        return self.debit if self.debit > 0 else self.credit
    
    def get_sens(self):
        """Retourne le sens de l'écriture."""
        return 'D' if self.debit > 0 else 'C'
    
    def is_lettrable(self):
        """Vérifie si la ligne peut être lettrée."""
        return self.compte.lettrable and not self.lettrage
    
    def lettrer_avec(self, autres_lignes, code_lettrage=None):
        """Lettre la ligne avec d'autres lignes."""
        from apps.accounting.services import LettrageService
        
        service = LettrageService()
        return service.lettrer_lignes([self] + list(autres_lignes), code_lettrage)


class PieceJustificative(BaseModel):
    """Pièces justificatives attachées aux écritures."""
    
    TYPES_PIECES = [
        ('FACTURE', 'Facture'),
        ('RELEVE', 'Relevé bancaire'),
        ('CONTRAT', 'Contrat'),
        ('JUSTIF', 'Justificatif'),
        ('AUTRE', 'Autre'),
    ]
    
    # Identification
    societe = models.ForeignKey(Societe, on_delete=models.CASCADE)
    reference = models.CharField(max_length=50)
    type_piece = models.CharField(max_length=20, choices=TYPES_PIECES)
    
    # Fichier
    fichier = models.FileField(upload_to='pieces/%Y/%m/')
    nom_original = models.CharField(max_length=255)
    taille = models.BigIntegerField()
    mime_type = models.CharField(max_length=100)
    
    # Traçabilité et sécurité
    hash_sha256 = models.CharField(max_length=64, unique=True)
    
    # OCR
    ocr_processed = models.BooleanField(default=False)
    ocr_data = models.JSONField(default=dict, blank=True)
    ocr_confidence = models.FloatField(null=True, blank=True)
    
    # Signature électronique
    is_signed = models.BooleanField(default=False)
    signature_data = models.JSONField(default=dict, blank=True)
    
    # Relations
    ecritures = models.ManyToManyField(
        Ecriture,
        related_name='pieces_jointes',
        blank=True
    )
    
    class Meta:
        db_table = 'pieces_justificatives'
        unique_together = ['societe', 'reference']
        indexes = [
            models.Index(fields=['societe', 'type_piece']),
            models.Index(fields=['hash_sha256']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.reference} - {self.nom_original}"
    
    def save(self, *args, **kwargs):
        if not self.pk and self.fichier:
            # Calcul du hash SHA256
            import hashlib
            
            sha256 = hashlib.sha256()
            for chunk in self.fichier.chunks():
                sha256.update(chunk)
            self.hash_sha256 = sha256.hexdigest()
            
            # Métadonnées du fichier
            self.taille = self.fichier.size
            self.nom_original = self.fichier.name
            
        super().save(*args, **kwargs)
    
    def process_ocr(self):
        """Lance le traitement OCR de manière asynchrone."""
        from apps.accounting.tasks import process_ocr_task
        if not self.ocr_processed:
            process_ocr_task.delay(self.id)


# Modèles pour l'import/export
class ImportEcriture(BaseModel):
    """Historique des imports d'écritures."""
    
    STATUTS_IMPORT = [
        ('EN_COURS', 'En cours'),
        ('TERMINE', 'Terminé'),
        ('ERREUR', 'Erreur'),
    ]
    
    societe = models.ForeignKey(Societe, on_delete=models.CASCADE)
    fichier = models.FileField(upload_to='imports/%Y/%m/')
    nom_fichier = models.CharField(max_length=255)
    statut = models.CharField(max_length=10, choices=STATUTS_IMPORT, default='EN_COURS')
    
    # Statistiques
    nb_lignes_total = models.IntegerField(default=0)
    nb_lignes_importees = models.IntegerField(default=0)
    nb_lignes_erreur = models.IntegerField(default=0)
    
    # Détails
    erreurs = models.JSONField(default=list, blank=True)
    mapping = models.JSONField(default=dict, blank=True)  # Mapping colonnes
    
    # Résultats
    ecritures_creees = models.ManyToManyField(Ecriture, blank=True)
    
    class Meta:
        db_table = 'imports_ecritures'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Import {self.nom_fichier} - {self.statut}"