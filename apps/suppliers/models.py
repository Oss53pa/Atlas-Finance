"""
Module Fournisseurs SYSCOHADA pour WiseBook
Gestion avancée des fournisseurs selon EXF-CF-001 à EXF-CF-004
"""
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator, RegexValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.db.models import Sum, Q, F
from decimal import Decimal
import uuid
from datetime import date, timedelta

from apps.core.models import TimeStampedModel, Societe
from apps.accounting.models import ChartOfAccounts, FiscalYear
from django.conf import settings

# Alias pour rétrocompatibilité
Company = Societe


class Supplier(TimeStampedModel):
    """
    Modèle Fournisseur SYSCOHADA complet
    Conforme aux spécifications EXF-CF-001: Fichier Fournisseurs Complet
    """
    
    SUPPLIER_TYPE_CHOICES = [
        ('GOODS', 'Fournisseur de biens'),
        ('SERVICES', 'Fournisseur de services'),
        ('SUBCONTRACTOR', 'Sous-traitant'),
        ('CONSULTING', 'Conseil/Expertise'),
        ('MAINTENANCE', 'Maintenance'),
        ('TRANSPORT', 'Transport/Logistique'),
        ('UTILITIES', 'Services publics'),
        ('OTHER', 'Autre'),
    ]
    
    LEGAL_FORM_CHOICES = [
        ('SA', 'Société Anonyme'),
        ('SARL', 'SARL'),
        ('SAS', 'SAS'), 
        ('EI', 'Entreprise Individuelle'),
        ('GIE', 'GIE'),
        ('COOP', 'Coopérative'),
        ('FOREIGN', 'Société étrangère'),
        ('OTHER', 'Autre'),
    ]
    
    STATUS_CHOICES = [
        ('ACTIVE', 'Actif'),
        ('QUALIFIED', 'Qualifié'),
        ('BLOCKED', 'Bloqué'),
        ('SUSPENDED', 'Suspendu'),
        ('ARCHIVED', 'Archivé'),
        ('PROSPECT', 'Prospect'),
    ]
    
    RATING_CHOICES = [
        ('A', 'Excellent (A)'),
        ('B', 'Bon (B)'), 
        ('C', 'Moyen (C)'),
        ('D', 'Faible (D)'),
        ('E', 'Non recommandé (E)'),
    ]
    
    PAYMENT_METHOD_CHOICES = [
        ('TRANSFER', 'Virement bancaire'),
        ('CHECK', 'Chèque'),
        ('CASH', 'Espèces'),
        ('MOBILE_MONEY', 'Mobile Money'),
        ('COMPENSATION', 'Compensation'),
        ('OTHER', 'Autre'),
    ]
    
    # Identifiants
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='suppliers')
    
    # Code fournisseur: F + [Type] + [Numéro] (EXF-CF-001)
    code = models.CharField(
        max_length=20, 
        db_index=True,
        validators=[RegexValidator(r'^F[A-Z]{2,3}\d{4,}$', 'Format: FLO0001 (Fournisseur Local 0001)')],
        help_text="Format: FLO0001 (Fournisseur Local 0001)"
    )
    
    supplier_type = models.CharField(max_length=20, choices=SUPPLIER_TYPE_CHOICES)
    
    # Données Fournisseurs Structurées (EXF-CF-001)
    legal_name = models.CharField(max_length=255, verbose_name="Raison sociale")
    commercial_name = models.CharField(max_length=255, blank=True, verbose_name="Nom commercial")
    legal_form = models.CharField(max_length=20, choices=LEGAL_FORM_CHOICES, blank=True)
    
    # Identification légale complète
    rccm = models.CharField(max_length=50, blank=True, verbose_name="RCCM")
    nif = models.CharField(max_length=50, blank=True, verbose_name="NIF")
    taxpayer_number = models.CharField(max_length=50, blank=True, verbose_name="Numéro contribuable")
    vat_number = models.CharField(max_length=50, blank=True, verbose_name="Numéro TVA")
    
    # Catégorie fournisseur (Biens/Services/Sous-traitance)
    category = models.CharField(max_length=100, blank=True, verbose_name="Catégorie")
    business_sector = models.CharField(max_length=100, blank=True, verbose_name="Secteur d'activité")
    
    # Adresse principale
    main_address = models.TextField(verbose_name="Adresse principale")
    city = models.CharField(max_length=100, verbose_name="Ville")
    region = models.CharField(max_length=100, blank=True, verbose_name="Région")
    country = models.CharField(max_length=50, default="Cameroun", verbose_name="Pays")
    postal_code = models.CharField(max_length=10, blank=True, verbose_name="Code postal")
    
    # Contact principal
    main_phone = models.CharField(max_length=20, blank=True, verbose_name="Téléphone")
    mobile_phone = models.CharField(max_length=20, blank=True, verbose_name="Mobile")
    fax = models.CharField(max_length=20, blank=True, verbose_name="Fax")
    email = models.EmailField(blank=True, verbose_name="Email")
    website = models.URLField(blank=True, verbose_name="Site web")
    
    # Paramètres d'Achat (EXF-CF-001)
    payment_terms = models.PositiveIntegerField(
        default=30,
        validators=[MinValueValidator(0), MaxValueValidator(365)],
        verbose_name="Conditions de paiement négociées (jours)"
    )
    
    discount_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('0'),
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('50'))],
        verbose_name="Taux escompte obtenu (%)"
    )
    
    currency = models.CharField(max_length=3, choices=[
        ('XAF', 'Franc CFA (CEMAC)'),
        ('XOF', 'Franc CFA (UEMOA)'),
        ('EUR', 'Euro'),
        ('USD', 'Dollar US'),
    ], default='XAF', verbose_name="Devise de transaction")
    
    incoterms = models.CharField(max_length=10, choices=[
        ('EXW', 'EXW - Ex Works'),
        ('FCA', 'FCA - Free Carrier'),
        ('CPT', 'CPT - Carriage Paid To'),
        ('CIP', 'CIP - Carriage Insurance Paid'),
        ('DAT', 'DAT - Delivered At Terminal'),
        ('DAP', 'DAP - Delivered At Place'),
        ('DDP', 'DDP - Delivered Duty Paid'),
        ('FAS', 'FAS - Free Alongside Ship'),
        ('FOB', 'FOB - Free On Board'),
        ('CFR', 'CFR - Cost And Freight'),
        ('CIF', 'CIF - Cost Insurance Freight'),
    ], blank=True, verbose_name="Incoterms appliqués")
    
    preferred_payment_method = models.CharField(
        max_length=20, choices=PAYMENT_METHOD_CHOICES, default='TRANSFER',
        verbose_name="Mode de règlement convenu"
    )
    
    # Seuils et accords
    minimum_order_amount = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Seuil minimum de commande"
    )
    
    maximum_order_amount = models.DecimalField(
        max_digits=20, decimal_places=2, null=True, blank=True,
        verbose_name="Plafond commande autorisé"
    )
    
    has_framework_agreement = models.BooleanField(
        default=False, verbose_name="Accord cadre signé"
    )
    framework_agreement_ref = models.CharField(
        max_length=100, blank=True, verbose_name="Référence accord cadre"
    )
    framework_expiry_date = models.DateField(
        null=True, blank=True, verbose_name="Expiration accord"
    )
    
    # Coordonnées bancaires multiples (IBAN/BIC)
    iban = models.CharField(max_length=34, blank=True, verbose_name="IBAN")
    bic = models.CharField(max_length=11, blank=True, verbose_name="BIC/SWIFT")
    bank_name = models.CharField(max_length=100, blank=True, verbose_name="Banque")
    bank_address = models.TextField(blank=True, verbose_name="Adresse banque")
    
    # Compte comptable associé
    account = models.ForeignKey(
        ChartOfAccounts, on_delete=models.SET_NULL, null=True,
        limit_choices_to={'account_class': '4', 'code__startswith': '40'},
        related_name='suppliers', verbose_name="Compte fournisseur (40x)"
    )
    
    # Gestion des Risques Fournisseurs (EXF-CF-001)
    supplier_rating = models.CharField(
        max_length=1, choices=RATING_CHOICES, default='B',
        verbose_name="Notation fournisseur (A/B/C/D/E)"
    )
    
    current_outstanding = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Encours actuel", editable=False
    )
    
    litigation_count = models.PositiveIntegerField(
        default=0, verbose_name="Nombre de litiges", editable=False
    )
    
    service_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('100'),
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('100'))],
        verbose_name="Taux de service (%)", editable=False
    )
    
    average_delivery_delay = models.PositiveIntegerField(
        default=0, verbose_name="Délais moyens livraison (jours)", editable=False
    )
    
    document_compliance_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('100'),
        verbose_name="Taux conformité documentaire (%)", editable=False
    )
    
    # Certifications et agréments
    iso_certifications = models.JSONField(
        default=list, blank=True, verbose_name="Certifications ISO"
    )
    quality_certifications = models.JSONField(
        default=list, blank=True, verbose_name="Certifications qualité"
    )
    other_approvals = models.JSONField(
        default=list, blank=True, verbose_name="Autres agréments"
    )
    
    # Évaluation performance fournisseur
    quality_score = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('0'),
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('100'))],
        verbose_name="Score qualité (%)"
    )
    
    delivery_score = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('0'),
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('100'))],
        verbose_name="Score délais (%)"
    )
    
    price_competitiveness = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('0'),
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('100'))],
        verbose_name="Compétitivité prix (%)"
    )
    
    overall_performance = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('0'),
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('100'))],
        verbose_name="Performance globale (%)", editable=False
    )
    
    # Statut et contrôles
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    blocking_reason = models.TextField(blank=True, verbose_name="Motif de blocage")
    blocking_date = models.DateTimeField(null=True, blank=True)
    blocked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='blocked_suppliers'
    )
    
    # Informations contractuelles
    contract_start_date = models.DateField(null=True, blank=True, verbose_name="Début contrat")
    contract_end_date = models.DateField(null=True, blank=True, verbose_name="Fin contrat")
    auto_renewal = models.BooleanField(default=False, verbose_name="Reconduction automatique")
    
    # Dates importantes
    first_order_date = models.DateField(null=True, blank=True, verbose_name="Première commande")
    last_order_date = models.DateField(null=True, blank=True, verbose_name="Dernière commande", editable=False)
    last_payment_date = models.DateField(null=True, blank=True, verbose_name="Dernier paiement", editable=False)
    
    # Métadonnées
    notes = models.TextField(blank=True, verbose_name="Observations internes")
    tags = models.JSONField(default=list, blank=True, verbose_name="Tags")
    
    class Meta:
        db_table = 'suppliers'
        unique_together = [('company', 'code')]
        indexes = [
            models.Index(fields=['company', 'supplier_type']),
            models.Index(fields=['company', 'status']),
            models.Index(fields=['legal_name']),
            models.Index(fields=['supplier_rating']),
            models.Index(fields=['overall_performance']),
            models.Index(fields=['-last_order_date']),
        ]
        ordering = ['code']
        verbose_name = "Fournisseur"
        verbose_name_plural = "Fournisseurs"
    
    def __str__(self):
        return f"{self.code} - {self.legal_name}"
    
    def clean(self):
        super().clean()
        
        # Validation compte fournisseur obligatoire
        if not self.account:
            raise ValidationError("Un compte fournisseur (classe 40) est obligatoire")
        
        # Validation format code fournisseur
        if not self.code.startswith('F'):
            raise ValidationError("Le code fournisseur doit commencer par 'F'")
        
        # Validation dates contrat
        if (self.contract_start_date and self.contract_end_date and 
            self.contract_start_date >= self.contract_end_date):
            raise ValidationError("Date fin contrat doit être postérieure au début")
    
    @property
    def display_name(self):
        if self.commercial_name:
            return f"{self.legal_name} ({self.commercial_name})"
        return self.legal_name
    
    @property
    def contract_is_active(self):
        """Vérifie si le contrat est actif"""
        if not self.contract_start_date:
            return False
        
        today = date.today()
        
        if self.contract_end_date:
            return self.contract_start_date <= today <= self.contract_end_date
        
        return self.contract_start_date <= today
    
    @property
    def contract_expires_soon(self):
        """Alerte si contrat expire dans 30 jours"""
        if not self.contract_end_date:
            return False
        
        return (self.contract_end_date - date.today()).days <= 30
    
    def update_outstanding_balance(self):
        """
        Met à jour l'encours fournisseur depuis les écritures non lettrées
        """
        from apps.accounting.models import JournalEntryLine
        
        if not self.account:
            return
        
        # Encours = solde créditeur non lettré du compte fournisseur
        aggregates = JournalEntryLine.objects.filter(
            account=self.account,
            third_party=self,
            entry__is_validated=True,
            is_reconciled=False
        ).aggregate(
            total_debit=Sum('debit_amount') or Decimal('0'),
            total_credit=Sum('credit_amount') or Decimal('0')
        )
        
        outstanding = max(Decimal('0'), 
                         aggregates['total_credit'] - aggregates['total_debit'])
        
        if self.current_outstanding != outstanding:
            self.current_outstanding = outstanding
            self.save(update_fields=['current_outstanding'])
        
        return outstanding
    
    def calculate_dpo(self, period_days: int = 90):
        """
        Calcule le DPO (Days Payable Outstanding) du fournisseur
        """
        from apps.accounting.models import JournalEntryLine
        
        period_start = date.today() - timedelta(days=period_days)
        
        # Achats sur la période (compte 60x)
        purchases_amount = JournalEntryLine.objects.filter(
            third_party=self,
            account__account_class='6',
            entry__entry_date__gte=period_start,
            entry__is_validated=True
        ).aggregate(
            total=Sum('debit_amount') or Decimal('0')
        )['total']
        
        if purchases_amount == 0:
            return 0
        
        # DPO = (Encours / Achats) * Période
        dpo = (self.current_outstanding / purchases_amount * period_days).quantize(Decimal('0.1'))
        return float(dpo)
    
    def calculate_performance_metrics(self):
        """
        Calcule les métriques de performance automatiquement
        """
        # Score global = moyenne pondérée
        weights = {
            'quality': 0.4,      # 40% pour qualité
            'delivery': 0.3,     # 30% pour délais  
            'price': 0.2,        # 20% pour prix
            'compliance': 0.1,   # 10% pour conformité
        }
        
        self.overall_performance = (
            self.quality_score * Decimal(str(weights['quality'])) +
            self.delivery_score * Decimal(str(weights['delivery'])) +
            self.price_competitiveness * Decimal(str(weights['price'])) +
            self.document_compliance_rate * Decimal(str(weights['compliance']))
        ).quantize(Decimal('0.1'))
        
        # Mise à jour notation selon performance
        if self.overall_performance >= 90:
            self.supplier_rating = 'A'
        elif self.overall_performance >= 75:
            self.supplier_rating = 'B'
        elif self.overall_performance >= 60:
            self.supplier_rating = 'C'
        elif self.overall_performance >= 40:
            self.supplier_rating = 'D'
        else:
            self.supplier_rating = 'E'
        
        self.save(update_fields=['overall_performance', 'supplier_rating'])


class SupplierContact(TimeStampedModel):
    """
    Contacts par service (Commercial/Comptable/SAV) - EXF-CF-001
    """
    
    ROLE_CHOICES = [
        ('CEO', 'Dirigeant'),
        ('SALES', 'Commercial'),
        ('ACCOUNTANT', 'Comptable'),
        ('TECHNICAL', 'Support technique'),
        ('DELIVERY', 'Livraison'),
        ('QUALITY', 'Qualité'),
        ('LEGAL', 'Juridique'),
        ('OTHER', 'Autre'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name='contacts')
    
    # Informations personnelles
    first_name = models.CharField(max_length=100, verbose_name="Prénom")
    last_name = models.CharField(max_length=100, verbose_name="Nom")
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, verbose_name="Rôle")
    department = models.CharField(max_length=100, blank=True, verbose_name="Service")
    job_title = models.CharField(max_length=100, blank=True, verbose_name="Fonction")
    
    # Coordonnées
    direct_phone = models.CharField(max_length=20, blank=True, verbose_name="Téléphone direct")
    mobile = models.CharField(max_length=20, blank=True, verbose_name="Mobile")
    email = models.EmailField(blank=True, verbose_name="Email")
    
    # Responsabilités
    handles_orders = models.BooleanField(default=False, verbose_name="Gère les commandes")
    handles_invoices = models.BooleanField(default=False, verbose_name="Gère la facturation")
    handles_delivery = models.BooleanField(default=False, verbose_name="Gère les livraisons")
    handles_quality = models.BooleanField(default=False, verbose_name="Gère la qualité")
    
    is_primary = models.BooleanField(default=False, verbose_name="Contact principal")
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'supplier_contacts'
        verbose_name = "Contact fournisseur"
        verbose_name_plural = "Contacts fournisseurs"
    
    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.supplier.code})"


class SupplierEvaluation(TimeStampedModel):
    """
    Évaluations périodiques des fournisseurs
    """
    
    EVALUATION_TYPE_CHOICES = [
        ('QUARTERLY', 'Trimestrielle'),
        ('ANNUAL', 'Annuelle'),
        ('PROJECT', 'Projet spécifique'),
        ('INCIDENT', 'Suite à incident'),
        ('AUDIT', 'Audit qualité'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name='evaluations')
    
    evaluation_type = models.CharField(max_length=20, choices=EVALUATION_TYPE_CHOICES)
    evaluation_period_start = models.DateField(verbose_name="Début période")
    evaluation_period_end = models.DateField(verbose_name="Fin période")
    
    # Scores détaillés
    quality_score = models.DecimalField(
        max_digits=5, decimal_places=2,
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('100'))],
        verbose_name="Score qualité (%)"
    )
    
    delivery_score = models.DecimalField(
        max_digits=5, decimal_places=2,
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('100'))],
        verbose_name="Score délais (%)"
    )
    
    service_score = models.DecimalField(
        max_digits=5, decimal_places=2,
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('100'))],
        verbose_name="Score service (%)"
    )
    
    price_score = models.DecimalField(
        max_digits=5, decimal_places=2,
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('100'))],
        verbose_name="Score compétitivité prix (%)"
    )
    
    compliance_score = models.DecimalField(
        max_digits=5, decimal_places=2,
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('100'))],
        verbose_name="Score conformité (%)"
    )
    
    # Score global calculé
    overall_score = models.DecimalField(
        max_digits=5, decimal_places=2, editable=False,
        verbose_name="Score global (%)"
    )
    
    # Recommandations
    strengths = models.TextField(blank=True, verbose_name="Points forts")
    weaknesses = models.TextField(blank=True, verbose_name="Points d'amélioration")
    action_plan = models.TextField(blank=True, verbose_name="Plan d'action")
    
    # Décision
    recommendation = models.CharField(max_length=20, choices=[
        ('CONTINUE', 'Continuer collaboration'),
        ('DEVELOP', 'Développer partenariat'),
        ('MONITOR', 'Surveiller performance'),
        ('REDUCE', 'Réduire collaboration'),
        ('TERMINATE', 'Arrêter collaboration'),
    ], verbose_name="Recommandation")
    
    # Métadonnées
    evaluator = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    evaluation_date = models.DateField(default=date.today)
    
    class Meta:
        db_table = 'supplier_evaluations'
        ordering = ['-evaluation_date']
        verbose_name = "Évaluation fournisseur"
        verbose_name_plural = "Évaluations fournisseurs"
    
    def save(self, *args, **kwargs):
        # Calcul score global automatique
        self.overall_score = (
            self.quality_score * Decimal('0.3') +
            self.delivery_score * Decimal('0.25') +
            self.service_score * Decimal('0.2') +
            self.price_score * Decimal('0.15') +
            self.compliance_score * Decimal('0.1')
        ).quantize(Decimal('0.1'))
        
        super().save(*args, **kwargs)
        
        # Mise à jour des scores dans le fournisseur
        self.supplier.quality_score = self.quality_score
        self.supplier.delivery_score = self.delivery_score
        self.supplier.price_competitiveness = self.price_score
        self.supplier.document_compliance_rate = self.compliance_score
        self.supplier.calculate_performance_metrics()


class SupplierDocument(TimeStampedModel):
    """
    Documents contractuels fournisseurs (EXF-CF-001)
    """
    
    DOCUMENT_TYPE_CHOICES = [
        ('KBIS', 'Extrait Kbis'),
        ('RCCM', 'RCCM'),
        ('TAX_CERT', 'Attestation fiscale'),
        ('VAT_CERT', 'Attestation TVA'),
        ('INSURANCE', 'Attestation assurance'),
        ('BANK_CERT', 'Attestation bancaire'),
        ('ISO_CERT', 'Certificat ISO'),
        ('QUALITY_CERT', 'Certificat qualité'),
        ('CONTRACT', 'Contrat'),
        ('FRAMEWORK', 'Accord cadre'),
        ('CATALOG', 'Catalogue produits'),
        ('PRICE_LIST', 'Liste prix'),
        ('OTHER', 'Autre'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name='documents')
    
    document_type = models.CharField(max_length=20, choices=DOCUMENT_TYPE_CHOICES)
    title = models.CharField(max_length=200, verbose_name="Titre")
    description = models.TextField(blank=True, verbose_name="Description")
    
    # Fichier
    file_path = models.CharField(max_length=500, blank=True)
    file_size = models.PositiveIntegerField(null=True, blank=True)
    file_type = models.CharField(max_length=20, blank=True)
    
    # Métadonnées document
    document_date = models.DateField(verbose_name="Date document")
    expiry_date = models.DateField(null=True, blank=True, verbose_name="Date expiration")
    reference_number = models.CharField(max_length=100, blank=True, verbose_name="Numéro")
    
    # Validation
    is_verified = models.BooleanField(default=False, verbose_name="Vérifié")
    verified_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    verification_date = models.DateTimeField(null=True, blank=True)
    
    # Alertes
    alert_before_expiry = models.PositiveIntegerField(
        default=30, verbose_name="Alerte X jours avant expiration"
    )
    
    is_expired = models.BooleanField(default=False, editable=False)
    
    class Meta:
        db_table = 'supplier_documents'
        ordering = ['-document_date']
        indexes = [
            models.Index(fields=['supplier', 'document_type']),
            models.Index(fields=['-expiry_date']),
        ]
        verbose_name = "Document fournisseur"
        verbose_name_plural = "Documents fournisseurs"
    
    def __str__(self):
        return f"{self.supplier.code} - {self.title}"
    
    @property
    def expires_soon(self):
        """Vérifie si le document expire bientôt"""
        if not self.expiry_date:
            return False
        
        days_until_expiry = (self.expiry_date - date.today()).days
        return 0 <= days_until_expiry <= self.alert_before_expiry
    
    def save(self, *args, **kwargs):
        # Vérification expiration automatique
        if self.expiry_date and self.expiry_date <= date.today():
            self.is_expired = True
        
        super().save(*args, **kwargs)


class SupplierInvoice(TimeStampedModel):
    """
    Interface avec Wise Procure - EXF-CF-002
    Suivi des factures fournisseurs et workflow de validation
    """
    
    STATUS_CHOICES = [
        ('RECEIVED', 'Reçue'),
        ('VALIDATED', 'Validée technique'),
        ('ACCOUNTING_OK', 'Validée comptable'),
        ('APPROVED', 'Approuvée paiement'),
        ('PAID', 'Payée'),
        ('DISPUTED', 'Contestée'),
        ('REJECTED', 'Rejetée'),
    ]
    
    VALIDATION_STATUS_CHOICES = [
        ('PENDING', 'En attente'),
        ('APPROVED', 'Approuvée'),
        ('REJECTED', 'Rejetée'),
        ('REQUIRES_INFO', 'Info demandée'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name='invoices')
    
    # Identification facture
    invoice_number = models.CharField(max_length=100, verbose_name="Numéro facture")
    invoice_date = models.DateField(verbose_name="Date facture")
    due_date = models.DateField(verbose_name="Date échéance")
    
    # Montants
    amount_excl_tax = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="Montant HT"
    )
    vat_amount = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="Montant TVA"
    )
    amount_incl_tax = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="Montant TTC"
    )
    
    # Références croisées Wise Procure
    purchase_order_ref = models.CharField(
        max_length=100, blank=True, verbose_name="Référence bon de commande"
    )
    delivery_receipt_ref = models.CharField(
        max_length=100, blank=True, verbose_name="Référence bon de livraison"
    )
    wise_procure_id = models.CharField(
        max_length=100, blank=True, verbose_name="ID Wise Procure"
    )
    
    # Workflow de validation (EXF-CF-003)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='RECEIVED')
    
    technical_validation = models.CharField(
        max_length=20, choices=VALIDATION_STATUS_CHOICES, default='PENDING'
    )
    technical_validator = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='technical_validations'
    )
    technical_validation_date = models.DateTimeField(null=True, blank=True)
    technical_comments = models.TextField(blank=True)
    
    accounting_validation = models.CharField(
        max_length=20, choices=VALIDATION_STATUS_CHOICES, default='PENDING'
    )
    accounting_validator = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='accounting_validations'
    )
    accounting_validation_date = models.DateTimeField(null=True, blank=True)
    accounting_comments = models.TextField(blank=True)
    
    # OCR et extraction automatique
    ocr_extracted_data = models.JSONField(default=dict, blank=True)
    ocr_confidence_score = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('0'),
        verbose_name="Score confiance OCR (%)"
    )
    
    # Contrôles automatiques
    duplicate_check_passed = models.BooleanField(default=True, verbose_name="Pas de doublon")
    amount_check_passed = models.BooleanField(default=True, verbose_name="Montant cohérent")
    po_match_passed = models.BooleanField(default=True, verbose_name="Correspondance BC")
    
    # Paiement
    payment_date = models.DateField(null=True, blank=True, verbose_name="Date paiement")
    payment_amount = models.DecimalField(
        max_digits=20, decimal_places=2, null=True, blank=True,
        verbose_name="Montant payé"
    )
    payment_reference = models.CharField(max_length=100, blank=True, verbose_name="Référence paiement")
    
    # Liens vers écritures comptables
    journal_entry = models.ForeignKey(
        'accounting.JournalEntry', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='supplier_invoices'
    )
    
    class Meta:
        db_table = 'supplier_invoices'
        unique_together = [('supplier', 'invoice_number')]
        indexes = [
            models.Index(fields=['supplier', 'status']),
            models.Index(fields=['-invoice_date']),
            models.Index(fields=['-due_date']),
        ]
        ordering = ['-invoice_date']
        verbose_name = "Facture fournisseur"
        verbose_name_plural = "Factures fournisseurs"
    
    def __str__(self):
        return f"{self.supplier.code} - {self.invoice_number}"
    
    @property
    def days_until_due(self):
        """Jours avant échéance"""
        return (self.due_date - date.today()).days
    
    @property
    def is_overdue(self):
        """Facture en retard"""
        return self.due_date < date.today() and self.status != 'PAID'
    
    def create_accounting_entry(self):
        """
        Génère l'écriture comptable automatique (EXF-CF-003)
        """
        from apps.accounting.services.ecriture_service import EcritureService
        from apps.accounting.models import Journal
        
        if self.journal_entry:
            return self.journal_entry  # Déjà comptabilisée
        
        # Journal des achats
        purchases_journal = Journal.objects.get(
            company=self.supplier.company,
            journal_type='AC'
        )
        
        # Données de l'écriture
        entry_data = {
            'entry_date': self.invoice_date,
            'description': f"Facture {self.invoice_number} - {self.supplier.legal_name}",
            'reference': self.invoice_number,
            'source_document': f"Facture {self.invoice_number}",
        }
        
        # Lignes d'écriture selon SYSCOHADA
        lines_data = [
            {
                'account_code': '601',  # Achats (à adapter selon nature)
                'label': f"Achat {self.supplier.legal_name}",
                'debit_amount': float(self.amount_excl_tax),
                'credit_amount': 0,
            },
        ]
        
        # TVA déductible si applicable
        if self.vat_amount > 0:
            lines_data.append({
                'account_code': '445',  # TVA déductible
                'label': "TVA déductible",
                'debit_amount': float(self.vat_amount),
                'credit_amount': 0,
            })
        
        # Compte fournisseur
        lines_data.append({
            'account_code': self.supplier.account.code,
            'label': f"Fournisseur {self.supplier.legal_name}",
            'debit_amount': 0,
            'credit_amount': float(self.amount_incl_tax),
        })
        
        # Création de l'écriture
        journal_entry = EcritureService.create_journal_entry(
            company=self.supplier.company,
            journal=purchases_journal,
            fiscal_year=self.supplier.company.current_fiscal_year,
            entry_data=entry_data,
            lines_data=lines_data,
            auto_validate=True
        )
        
        # Liaison
        self.journal_entry = journal_entry
        self.save(update_fields=['journal_entry'])
        
        return journal_entry


class SupplierPayment(TimeStampedModel):
    """
    Optimisation des Paiements Fournisseurs (EXF-CF-004)
    """
    
    PAYMENT_TYPE_CHOICES = [
        ('STANDARD', 'Paiement standard'),
        ('EARLY_DISCOUNT', 'Paiement anticipé avec escompte'),
        ('GROUPED', 'Paiement groupé'),
        ('PARTIAL', 'Paiement partiel'),
        ('COMPENSATION', 'Compensation'),
    ]
    
    STATUS_CHOICES = [
        ('PROPOSED', 'Proposé'),
        ('APPROVED', 'Approuvé'),
        ('EXECUTED', 'Exécuté'),
        ('FAILED', 'Échec'),
        ('CANCELLED', 'Annulé'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name='payments')
    
    # Référence au règlement
    payment_reference = models.CharField(max_length=100, unique=True)
    payment_date = models.DateField(verbose_name="Date paiement")
    
    # Montants
    gross_amount = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="Montant brut"
    )
    discount_amount = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Montant escompte"
    )
    net_amount = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="Montant net"
    )
    
    # Type et optimisation
    payment_type = models.CharField(max_length=20, choices=PAYMENT_TYPE_CHOICES)
    early_payment_days = models.PositiveIntegerField(
        default=0, verbose_name="Jours d'anticipation"
    )
    discount_rate_applied = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('0'),
        verbose_name="Taux escompte appliqué (%)"
    )
    
    # Statut et suivi
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PROPOSED')
    
    # Workflow d'approbation
    proposed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='proposed_payments'
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='approved_payments'
    )
    approval_date = models.DateTimeField(null=True, blank=True)
    
    # Exécution bancaire
    bank_transaction_id = models.CharField(max_length=100, blank=True)
    execution_date = models.DateTimeField(null=True, blank=True)
    
    # Factures concernées
    related_invoices = models.ManyToManyField(
        SupplierInvoice, blank=True, related_name='payments'
    )
    
    class Meta:
        db_table = 'supplier_payments'
        ordering = ['-payment_date']
        indexes = [
            models.Index(fields=['supplier', 'status']),
            models.Index(fields=['-payment_date']),
        ]
        verbose_name = "Paiement fournisseur"
        verbose_name_plural = "Paiements fournisseurs"
    
    def __str__(self):
        return f"{self.supplier.code} - {self.payment_reference}"
    
    def save(self, *args, **kwargs):
        # Calcul montant net automatique
        self.net_amount = self.gross_amount - self.discount_amount
        super().save(*args, **kwargs)


class SupplierAnalytics(TimeStampedModel):
    """
    Analytics et métriques fournisseurs
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    supplier = models.OneToOneField(
        Supplier, on_delete=models.CASCADE, related_name='analytics'
    )
    
    # Métriques de volume
    total_orders_count = models.PositiveIntegerField(default=0)
    total_invoices_count = models.PositiveIntegerField(default=0)
    total_amount_ordered = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0')
    )
    total_amount_invoiced = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0')
    )
    total_amount_paid = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0')
    )
    
    # Métriques de performance
    average_delivery_time = models.DecimalField(
        max_digits=10, decimal_places=1, default=Decimal('0'),
        verbose_name="Temps livraison moyen (jours)"
    )
    
    on_time_delivery_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('100'),
        verbose_name="Taux livraison à temps (%)"
    )
    
    quality_defect_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('0'),
        verbose_name="Taux défauts qualité (%)"
    )
    
    invoice_accuracy_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('100'),
        verbose_name="Taux justesse factures (%)"
    )
    
    # Économies réalisées
    total_savings_discount = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Économies escomptes"
    )
    
    total_savings_negotiation = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Économies négociation"
    )
    
    # Fréquence et régularité
    last_12m_orders = models.PositiveIntegerField(default=0)
    last_12m_amount = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0')
    )
    
    average_order_frequency = models.DecimalField(
        max_digits=10, decimal_places=1, default=Decimal('0'),
        verbose_name="Fréquence commandes (jours)"
    )
    
    # Dernière mise à jour
    last_calculation = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'supplier_analytics'
        verbose_name = "Analytics fournisseur"
        verbose_name_plural = "Analytics fournisseurs"
    
    def __str__(self):
        return f"Analytics {self.supplier.code}"
    
    def refresh_metrics(self):
        """Recalcule toutes les métriques automatiquement"""
        from apps.accounting.models import JournalEntryLine
        
        # Période 12 mois
        one_year_ago = date.today() - timedelta(days=365)
        
        # Agrégats sur les factures
        invoice_stats = self.supplier.invoices.filter(
            invoice_date__gte=one_year_ago
        ).aggregate(
            count=models.Count('id'),
            total_ht=Sum('amount_excl_tax') or Decimal('0'),
            total_ttc=Sum('amount_incl_tax') or Decimal('0'),
        )
        
        # Mise à jour
        self.last_12m_orders = invoice_stats['count']
        self.last_12m_amount = invoice_stats['total_ttc']
        self.total_amount_invoiced = invoice_stats['total_ttc']
        
        self.save()