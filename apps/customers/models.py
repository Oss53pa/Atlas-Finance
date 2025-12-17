"""
Module Clients SYSCOHADA pour WiseBook
Gestion avancÃ©e des clients selon EXF-CC-001 Ã  EXF-CC-004
"""
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator, RegexValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal
import uuid
from datetime import date, timedelta

from apps.core.models import TimeStampedModel, Societe
from apps.accounting.models import ChartOfAccounts, FiscalYear
from django.conf import settings

# Alias pour rÃ©trocompatibilitÃ©
Company = Societe


class Customer(TimeStampedModel):
    """
    ModÃ¨le Client SYSCOHADA complet
    Conforme aux spÃ©cifications EXF-CC-001: Fichier Clients Enrichi
    """
    
    CUSTOMER_TYPE_CHOICES = [
        ('INDIVIDUAL', 'Particulier'),
        ('COMPANY', 'Entreprise'),
        ('ADMINISTRATION', 'Administration'),
        ('ASSOCIATION', 'Association'),
        ('FOREIGN', 'Client Ã©tranger'),
    ]
    
    LEGAL_FORM_CHOICES = [
        ('SA', 'SociÃ©tÃ© Anonyme'),
        ('SARL', 'SARL'),
        ('SAS', 'SAS'),
        ('EI', 'Entreprise Individuelle'),
        ('GIE', 'GIE'),
        ('COOP', 'CoopÃ©rative'),
        ('ASSOC', 'Association'),
        ('OTHER', 'Autre'),
    ]
    
    PAYMENT_METHOD_CHOICES = [
        ('CASH', 'EspÃ¨ces'),
        ('CHECK', 'ChÃ¨que'),
        ('TRANSFER', 'Virement'),
        ('DIRECT_DEBIT', 'PrÃ©lÃ¨vement'),
        ('CARD', 'Carte bancaire'),
        ('BILL', 'Traite'),
        ('MOBILE_MONEY', 'Mobile Money'),
    ]
    
    STATUS_CHOICES = [
        ('ACTIVE', 'Actif'),
        ('BLOCKED', 'BloquÃ©'),
        ('SUSPENDED', 'Suspendu'),
        ('PROSPECT', 'Prospect'),
        ('ARCHIVED', 'ArchivÃ©'),
    ]
    
    RISK_LEVEL_CHOICES = [
        ('A', 'Excellent (A)'),
        ('B', 'Bon (B)'),
        ('C', 'Moyen (C)'),
        ('D', 'RisquÃ© (D)'),
        ('E', 'TrÃ¨s risquÃ© (E)'),
    ]
    
    # Identifiants
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='customers')
    
    # Code client selon cahier des charges: C + [Pays] + [NumÃ©ro sÃ©quentiel]
    code = models.CharField(
        max_length=20, 
        db_index=True,
        validators=[RegexValidator(r'^C[A-Z]{2}\d{5,}$', 'Format: CCM00001 (Client Cameroun 00001)')],
        help_text="Format: CCM00001 (Client Cameroun 00001)"
    )
    
    customer_type = models.CharField(max_length=20, choices=CUSTOMER_TYPE_CHOICES)
    
    # DonnÃ©es KYC Clients ComplÃ¨tes (EXF-CC-001)
    legal_name = models.CharField(max_length=255, verbose_name="Raison sociale")
    commercial_name = models.CharField(max_length=255, blank=True, verbose_name="Nom commercial")
    legal_form = models.CharField(max_length=10, choices=LEGAL_FORM_CHOICES, blank=True)
    
    # Identification lÃ©gale OHADA
    rccm = models.CharField(max_length=50, blank=True, verbose_name="RCCM")
    nif = models.CharField(max_length=50, blank=True, verbose_name="NIF")
    taxpayer_number = models.CharField(max_length=50, blank=True, verbose_name="NumÃ©ro contribuable")
    vat_number = models.CharField(max_length=50, blank=True, verbose_name="NumÃ©ro TVA")
    
    # Secteur d'activitÃ© et code NAF
    business_sector = models.CharField(max_length=100, blank=True, verbose_name="Secteur d'activitÃ©")
    naf_code = models.CharField(max_length=10, blank=True, verbose_name="Code NAF")
    
    # Adresses multi-sites (EXF-CC-001)
    main_address = models.TextField(verbose_name="Adresse principale")
    city = models.CharField(max_length=100, verbose_name="Ville")
    region = models.CharField(max_length=100, blank=True, verbose_name="RÃ©gion")
    country = models.CharField(max_length=50, default="Cameroun", verbose_name="Pays")
    postal_code = models.CharField(max_length=10, blank=True, verbose_name="Code postal")
    
    # Contact principal
    main_phone = models.CharField(max_length=20, blank=True, verbose_name="TÃ©lÃ©phone")
    mobile_phone = models.CharField(max_length=20, blank=True, verbose_name="Mobile")
    email = models.EmailField(blank=True, verbose_name="Email")
    website = models.URLField(blank=True, verbose_name="Site web")
    
    # ParamÃ¨tres Commerciaux Clients (EXF-CC-001)
    payment_terms = models.PositiveIntegerField(
        default=30,
        validators=[MinValueValidator(0), MaxValueValidator(365)],
        verbose_name="Conditions de paiement (0-90 jours)"
    )
    
    credit_limit = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        validators=[MinValueValidator(Decimal('0'))],
        verbose_name="Limite de crÃ©dit dynamique"
    )
    
    early_payment_discount = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('0'),
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('20'))],
        verbose_name="Taux escompte paiement anticipÃ© (%)"
    )
    
    preferred_payment_method = models.CharField(
        max_length=20, choices=PAYMENT_METHOD_CHOICES, default='TRANSFER',
        verbose_name="Mode de rÃ¨glement privilÃ©giÃ©"
    )
    
    billing_currency = models.CharField(max_length=3, choices=[
        ('XAF', 'Franc CFA (CEMAC)'),
        ('XOF', 'Franc CFA (UEMOA)'),
        ('EUR', 'Euro'),
        ('USD', 'Dollar US'),
    ], default='XAF', verbose_name="Devise de facturation")
    
    communication_language = models.CharField(max_length=5, choices=[
        ('fr', 'FranÃ§ais'),
        ('en', 'English'),
    ], default='fr', verbose_name="Langue de communication")
    
    # Conditions particuliÃ¨res de vente
    special_conditions = models.TextField(blank=True, verbose_name="Conditions particuliÃ¨res")
    
    # Scoring et Risk Management (EXF-CC-001)
    credit_score = models.PositiveIntegerField(
        default=500,
        validators=[MinValueValidator(0), MaxValueValidator(1000)],
        verbose_name="Score de crÃ©dit (0-1000)",
        help_text="Score calculÃ© automatiquement"
    )
    
    risk_level = models.CharField(
        max_length=1, choices=RISK_LEVEL_CHOICES, default='B',
        verbose_name="Niveau de risque"
    )
    
    # Historique des retards de paiement
    current_outstanding = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Encours actuel", editable=False
    )
    
    average_payment_delay = models.PositiveIntegerField(
        default=0, verbose_name="Retard moyen (jours)", editable=False
    )
    
    litigation_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('0'),
        verbose_name="Taux de litige (%)", editable=False
    )
    
    # PrÃ©diction de risque par IA (EXF-CC-001)
    ai_risk_prediction = models.CharField(max_length=20, choices=[
        ('VERY_LOW', 'TrÃ¨s faible'),
        ('LOW', 'Faible'),
        ('MEDIUM', 'Moyen'),
        ('HIGH', 'ÃlevÃ©'),
        ('CRITICAL', 'Critique'),
    ], default='LOW', verbose_name="PrÃ©diction IA")
    
    ai_risk_score = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('0'),
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('100'))],
        verbose_name="Score IA (%)"
    )
    
    last_risk_calculation = models.DateTimeField(
        null=True, blank=True, verbose_name="DerniÃ¨re analyse risque"
    )
    
    # Compte comptable associÃ©
    account = models.ForeignKey(
        ChartOfAccounts, on_delete=models.SET_NULL, null=True,
        limit_choices_to={'account_class': '4', 'code__startswith': '41'},
        related_name='customers', verbose_name="Compte client (41x)"
    )
    
    # Statut et contrÃ´les
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    blocking_reason = models.TextField(blank=True, verbose_name="Motif de blocage")
    blocking_date = models.DateTimeField(null=True, blank=True)
    blocked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='blocked_customers'
    )
    
    # Informations entreprise
    capital_amount = models.DecimalField(
        max_digits=20, decimal_places=2, null=True, blank=True,
        validators=[MinValueValidator(Decimal('0'))],
        verbose_name="Capital social"
    )
    annual_turnover = models.DecimalField(
        max_digits=20, decimal_places=2, null=True, blank=True,
        validators=[MinValueValidator(Decimal('0'))],
        verbose_name="CA annuel dÃ©clarÃ©"
    )
    employee_count = models.PositiveIntegerField(
        null=True, blank=True, verbose_name="Nombre d'employÃ©s"
    )
    
    # Dates importantes
    company_creation_date = models.DateField(null=True, blank=True, verbose_name="Date crÃ©ation")
    first_order_date = models.DateField(null=True, blank=True, verbose_name="PremiÃ¨re commande")
    last_order_date = models.DateField(null=True, blank=True, verbose_name="DerniÃ¨re commande", editable=False)
    last_payment_date = models.DateField(null=True, blank=True, verbose_name="Dernier paiement", editable=False)
    
    # MÃ©tadonnÃ©es
    notes = models.TextField(blank=True, verbose_name="Notes internes")
    tags = models.JSONField(default=list, blank=True, verbose_name="Tags")
    
    class Meta:
        db_table = 'customers'
        unique_together = [('company', 'code')]
        indexes = [
            models.Index(fields=['company', 'status']),
            models.Index(fields=['legal_name']),
            models.Index(fields=['credit_score']),
            models.Index(fields=['risk_level']),
            models.Index(fields=['-last_order_date']),
        ]
        ordering = ['code']
        verbose_name = "Client"
        verbose_name_plural = "Clients"
    
    def __str__(self):
        return f"{self.code} - {self.legal_name}"
    
    def clean(self):
        super().clean()
        
        # Validation compte client obligatoire
        if not self.account:
            raise ValidationError("Un compte client (classe 41) est obligatoire")
        
        # Validation format code client
        if not self.code.startswith('C'):
            raise ValidationError("Le code client doit commencer par 'C'")
    
    @property
    def display_name(self):
        if self.commercial_name:
            return f"{self.legal_name} ({self.commercial_name})"
        return self.legal_name
    
    @property
    def available_credit(self):
        """CrÃ©dit disponible = limite - encours"""
        return max(Decimal('0'), self.credit_limit - self.current_outstanding)
    
    @property
    def credit_utilization_rate(self):
        """Taux utilisation crÃ©dit en %"""
        if self.credit_limit == 0:
            return Decimal('0')
        return (self.current_outstanding / self.credit_limit * 100).quantize(Decimal('0.1'))
    
    @property
    def days_since_last_order(self):
        """Nombre de jours depuis derniÃ¨re commande"""
        if not self.last_order_date:
            return None
        return (date.today() - self.last_order_date).days
    
    def update_outstanding_balance(self):
        """
        Met Ã  jour l'encours client depuis les Ã©critures non lettrÃ©es
        Performance optimisÃ©e
        """
        from django.db.models import Sum
        from apps.accounting.models import JournalEntryLine
        
        if not self.account:
            return
        
        # Calcul encours = solde dÃ©biteur non lettrÃ© du compte client
        aggregates = JournalEntryLine.objects.filter(
            account=self.account,
            third_party=self,  # RÃ©fÃ©rence vers ce client
            entry__is_validated=True,
            is_reconciled=False  # Non lettrÃ©es
        ).aggregate(
            total_debit=Sum('debit_amount') or Decimal('0'),
            total_credit=Sum('credit_amount') or Decimal('0')
        )
        
        outstanding = max(Decimal('0'), 
                         aggregates['total_debit'] - aggregates['total_credit'])
        
        if self.current_outstanding != outstanding:
            self.current_outstanding = outstanding
            self.save(update_fields=['current_outstanding'])
        
        return outstanding
    
    def calculate_dso(self, period_days: int = 90):
        """
        Calcule le DSO (Days Sales Outstanding) du client
        """
        from django.db.models import Sum
        from apps.accounting.models import JournalEntryLine
        
        period_start = date.today() - timedelta(days=period_days)
        
        # CA sur la pÃ©riode (compte 70x)
        sales_amount = JournalEntryLine.objects.filter(
            third_party=self,
            account__account_class='7',
            entry__entry_date__gte=period_start,
            entry__is_validated=True
        ).aggregate(
            total=Sum('credit_amount') or Decimal('0')
        )['total']
        
        if sales_amount == 0:
            return 0
        
        # DSO = (Encours / CA) * PÃ©riode
        dso = (self.current_outstanding / sales_amount * period_days).quantize(Decimal('0.1'))
        return float(dso)
    
    def get_aging_analysis(self):
        """
        Analyse par anciennetÃ© des crÃ©ances (Balance ÃgÃ©e)
        """
        from django.db.models import Sum, Case, When, Q
        from apps.accounting.models import JournalEntryLine
        
        today = date.today()
        
        # Tranches d'anciennetÃ©
        aging = JournalEntryLine.objects.filter(
            account=self.account,
            third_party=self,
            entry__is_validated=True,
            is_reconciled=False
        ).aggregate(
            current=Sum(Case(
                When(entry__entry_date__gte=today - timedelta(days=30), 
                     then='debit_amount'),
                default=Decimal('0')
            )) or Decimal('0'),
            
            days_30_60=Sum(Case(
                When(Q(entry__entry_date__lt=today - timedelta(days=30)) &
                     Q(entry__entry_date__gte=today - timedelta(days=60)),
                     then='debit_amount'),
                default=Decimal('0')
            )) or Decimal('0'),
            
            days_60_90=Sum(Case(
                When(Q(entry__entry_date__lt=today - timedelta(days=60)) &
                     Q(entry__entry_date__gte=today - timedelta(days=90)),
                     then='debit_amount'),
                default=Decimal('0')
            )) or Decimal('0'),
            
            over_90=Sum(Case(
                When(entry__entry_date__lt=today - timedelta(days=90),
                     then='debit_amount'),
                default=Decimal('0')
            )) or Decimal('0')
        )
        
        total = sum(aging.values())
        
        return {
            'current': float(aging['current']),
            '30_60_days': float(aging['days_30_60']),
            '60_90_days': float(aging['days_60_90']),
            'over_90_days': float(aging['over_90']),
            'total': float(total),
            'percentages': {
                'current': float(aging['current'] / total * 100) if total > 0 else 0,
                '30_60': float(aging['days_30_60'] / total * 100) if total > 0 else 0,
                '60_90': float(aging['days_60_90'] / total * 100) if total > 0 else 0,
                'over_90': float(aging['over_90'] / total * 100) if total > 0 else 0,
            }
        }


class CustomerContact(TimeStampedModel):
    """
    Contacts multiples avec rÃ´les (EXF-CC-001)
    Comptable/Acheteur/Direction
    """
    
    ROLE_CHOICES = [
        ('CEO', 'Dirigeant/PDG'),
        ('CFO', 'Directeur Financier'),
        ('ACCOUNTANT', 'Comptable'),
        ('BUYER', 'Acheteur'),
        ('SALES', 'Responsable Ventes'),
        ('TECHNICAL', 'Contact Technique'),
        ('LEGAL', 'Juridique'),
        ('OTHER', 'Autre'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='contacts')
    
    # Informations personnelles
    title = models.CharField(max_length=10, choices=[
        ('MR', 'M.'),
        ('MS', 'Mme'),
        ('DR', 'Dr'),
    ], blank=True)
    
    first_name = models.CharField(max_length=100, verbose_name="PrÃ©nom")
    last_name = models.CharField(max_length=100, verbose_name="Nom")
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, verbose_name="RÃ´le")
    job_title = models.CharField(max_length=100, blank=True, verbose_name="Titre/Fonction")
    department = models.CharField(max_length=100, blank=True, verbose_name="Service")
    
    # CoordonnÃ©es
    direct_phone = models.CharField(max_length=20, blank=True, verbose_name="TÃ©lÃ©phone direct")
    mobile = models.CharField(max_length=20, blank=True, verbose_name="Mobile")
    email = models.EmailField(blank=True, verbose_name="Email")
    
    # PrÃ©fÃ©rences communication
    preferred_contact = models.CharField(max_length=20, choices=[
        ('EMAIL', 'Email'),
        ('PHONE', 'TÃ©lÃ©phone'),
        ('MOBILE', 'Mobile'),
    ], default='EMAIL')
    
    # Autorisations
    can_approve_orders = models.BooleanField(default=False, verbose_name="Peut approuver commandes")
    can_receive_invoices = models.BooleanField(default=True, verbose_name="ReÃ§oit les factures")
    can_receive_statements = models.BooleanField(default=False, verbose_name="ReÃ§oit les relevÃ©s")
    
    is_primary = models.BooleanField(default=False, verbose_name="Contact principal")
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'customer_contacts'
        verbose_name = "Contact client"
        verbose_name_plural = "Contacts clients"
    
    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.customer.code})"
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"


class CustomerDeliveryAddress(TimeStampedModel):
    """
    CoordonnÃ©es multi-sites de livraison (EXF-CC-001)
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='delivery_addresses')
    
    label = models.CharField(max_length=100, verbose_name="LibellÃ© du site")
    
    # Adresse complÃ¨te
    address_line1 = models.CharField(max_length=100, verbose_name="Ligne 1")
    address_line2 = models.CharField(max_length=100, blank=True, verbose_name="Ligne 2")
    city = models.CharField(max_length=100, verbose_name="Ville")
    region = models.CharField(max_length=100, blank=True, verbose_name="RÃ©gion")
    postal_code = models.CharField(max_length=10, blank=True, verbose_name="Code postal")
    country = models.CharField(max_length=50, default="Cameroun", verbose_name="Pays")
    
    # Contact sur site
    contact_person = models.CharField(max_length=100, blank=True, verbose_name="Contact sur site")
    phone = models.CharField(max_length=20, blank=True, verbose_name="TÃ©lÃ©phone")
    email = models.EmailField(blank=True, verbose_name="Email")
    
    # Instructions spÃ©ciales
    delivery_instructions = models.TextField(blank=True, verbose_name="Instructions de livraison")
    access_instructions = models.TextField(blank=True, verbose_name="Instructions d'accÃ¨s")
    
    # Horaires
    opening_hours = models.JSONField(default=dict, blank=True, verbose_name="Horaires d'ouverture")
    
    # GÃ©olocalisation
    latitude = models.DecimalField(max_digits=10, decimal_places=8, null=True, blank=True)
    longitude = models.DecimalField(max_digits=11, decimal_places=8, null=True, blank=True)
    
    is_default = models.BooleanField(default=False, verbose_name="Site par dÃ©faut")
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'customer_delivery_addresses'
        verbose_name = "Adresse de livraison"
        verbose_name_plural = "Adresses de livraison"
    
    def __str__(self):
        return f"{self.customer.code} - {self.label}"
    
    @property
    def formatted_address(self):
        lines = [self.address_line1]
        if self.address_line2:
            lines.append(self.address_line2)
        
        city_line = self.city
        if self.postal_code:
            city_line = f"{self.postal_code} {self.city}"
        lines.append(city_line)
        
        if self.region:
            lines.append(self.region)
        
        return "\n".join(lines)


class CustomerDocument(TimeStampedModel):
    """
    Documents lÃ©gaux clients (EXF-CC-001)
    Kbis, Attestations, etc.
    """
    
    DOCUMENT_TYPE_CHOICES = [
        ('KBIS', 'Extrait Kbis'),
        ('RCCM', 'RCCM'),
        ('TAX_CERT', 'Attestation fiscale'),
        ('VAT_CERT', 'Attestation TVA'),
        ('INSURANCE', 'Attestation assurance'),
        ('BANK_RIB', 'RIB'),
        ('CONTRACT', 'Contrat cadre'),
        ('ID_CARD', 'PiÃ¨ce d\'identitÃ©'),
        ('OTHER', 'Autre'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='documents')
    
    document_type = models.CharField(max_length=20, choices=DOCUMENT_TYPE_CHOICES)
    title = models.CharField(max_length=200, verbose_name="Titre du document")
    description = models.TextField(blank=True, verbose_name="Description")
    
    # Stockage du document
    file_path = models.CharField(max_length=500, blank=True, verbose_name="Chemin fichier")
    file_size = models.PositiveIntegerField(null=True, blank=True, verbose_name="Taille (bytes)")
    file_type = models.CharField(max_length=10, blank=True, verbose_name="Type fichier")
    
    # MÃ©tadonnÃ©es du document
    document_date = models.DateField(verbose_name="Date du document")
    expiry_date = models.DateField(null=True, blank=True, verbose_name="Date d'expiration")
    reference_number = models.CharField(max_length=100, blank=True, verbose_name="NumÃ©ro de rÃ©fÃ©rence")
    
    # Validation et conformitÃ©
    is_verified = models.BooleanField(default=False, verbose_name="VÃ©rifiÃ©")
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        verbose_name="VÃ©rifiÃ© par"
    )
    verification_date = models.DateTimeField(null=True, blank=True)
    
    is_expired = models.BooleanField(default=False, verbose_name="ExpirÃ©")
    
    class Meta:
        db_table = 'customer_documents'
        ordering = ['-document_date']
        verbose_name = "Document client"
        verbose_name_plural = "Documents clients"
    
    def __str__(self):
        return f"{self.customer.code} - {self.title}"
    
    def save(self, *args, **kwargs):
        # VÃ©rification automatique expiration
        if self.expiry_date and self.expiry_date <= date.today():
            self.is_expired = True
        
        super().save(*args, **kwargs)


class CustomerPaymentPromise(TimeStampedModel):
    """
    Gestion des Promesses de Paiement (EXF-CC-003)
    """
    
    STATUS_CHOICES = [
        ('PENDING', 'En attente'),
        ('RESPECTED', 'RespectÃ©e'),
        ('BROKEN', 'Non respectÃ©e'),
        ('PARTIAL', 'Partiellement respectÃ©e'),
        ('CANCELLED', 'AnnulÃ©e'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='payment_promises')
    
    # RÃ©fÃ©rences
    promise_reference = models.CharField(max_length=50, verbose_name="RÃ©fÃ©rence promesse")
    related_invoice = models.CharField(max_length=50, blank=True, verbose_name="Facture concernÃ©e")
    
    # Engagement du client
    promised_amount = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="Montant promis"
    )
    promised_date = models.DateField(verbose_name="Date promise")
    payment_method = models.CharField(
        max_length=20, choices=Customer.PAYMENT_METHOD_CHOICES,
        verbose_name="Mode de paiement promis"
    )
    
    # Suivi de la promesse
    actual_amount = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Montant rÃ©ellement payÃ©"
    )
    actual_payment_date = models.DateField(null=True, blank=True, verbose_name="Date paiement rÃ©el")
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    
    # MÃ©tadonnÃ©es
    notes = models.TextField(blank=True, verbose_name="Notes")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    
    # Suivi automatique
    reminder_sent = models.BooleanField(default=False, verbose_name="Rappel envoyÃ©")
    reminder_date = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'customer_payment_promises'
        ordering = ['-promised_date']
        indexes = [
            models.Index(fields=['customer', 'status']),
            models.Index(fields=['-promised_date']),
        ]
        verbose_name = "Promesse de paiement"
        verbose_name_plural = "Promesses de paiement"
    
    def __str__(self):
        return f"{self.customer.code} - {self.promised_amount} - {self.promised_date}"
    
    @property
    def days_overdue(self):
        """Nombre de jours de retard sur la promesse"""
        if self.status in ['RESPECTED', 'CANCELLED']:
            return 0
        
        if self.promised_date < date.today():
            return (date.today() - self.promised_date).days
        return 0
    
    @property
    def respect_rate(self):
        """Taux de respect de la promesse en %"""
        if self.promised_amount == 0:
            return Decimal('0')
        
        return (self.actual_amount / self.promised_amount * 100).quantize(Decimal('0.1'))
    
    def check_fulfillment(self):
        """
        VÃ©rifie automatiquement si la promesse a Ã©tÃ© tenue
        """
        if self.status != 'PENDING':
            return
        
        if self.actual_payment_date:
            if self.actual_amount >= self.promised_amount:
                self.status = 'RESPECTED'
            elif self.actual_amount > 0:
                self.status = 'PARTIAL'
            
            self.save(update_fields=['status'])
        
        elif self.promised_date < date.today():
            self.status = 'BROKEN'
            self.save(update_fields=['status'])


class CustomerReminderHistory(TimeStampedModel):
    """
    Historique des Relances Multi-Niveaux (EXF-CC-003)
    """
    
    REMINDER_LEVEL_CHOICES = [
        ('LEVEL_1', 'Niveau 1 - Rappel courtois (J+5)'),
        ('LEVEL_2', 'Niveau 2 - Email + SMS ferme (J+15)'),
        ('LEVEL_3', 'Niveau 3 - Lettre recommandÃ©e (J+30)'),
        ('LEVEL_4', 'Niveau 4 - Mise en demeure (J+45)'),
        ('LEVEL_5', 'Niveau 5 - Transfert contentieux (J+60)'),
    ]
    
    CHANNEL_CHOICES = [
        ('EMAIL', 'Email'),
        ('SMS', 'SMS'),
        ('PHONE', 'Appel tÃ©lÃ©phonique'),
        ('POST', 'Courrier postal'),
        ('REGISTERED', 'Lettre recommandÃ©e'),
        ('LEGAL', 'ProcÃ©dure lÃ©gale'),
    ]
    
    STATUS_CHOICES = [
        ('SENT', 'EnvoyÃ©e'),
        ('DELIVERED', 'LivrÃ©e'),
        ('READ', 'Lue'),
        ('RESPONDED', 'RÃ©ponse reÃ§ue'),
        ('FAILED', 'Ãchec envoi'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='reminders')
    
    # Classification de la relance
    reminder_level = models.CharField(max_length=10, choices=REMINDER_LEVEL_CHOICES)
    channel = models.CharField(max_length=20, choices=CHANNEL_CHOICES)
    
    # Contenu
    subject = models.CharField(max_length=200, verbose_name="Objet")
    message = models.TextField(verbose_name="Message")
    
    # Cibles
    target_contact = models.ForeignKey(
        CustomerContact, on_delete=models.SET_NULL, null=True, blank=True,
        verbose_name="Contact ciblÃ©"
    )
    target_email = models.EmailField(blank=True)
    target_phone = models.CharField(max_length=20, blank=True)
    
    # Suivi
    sent_date = models.DateTimeField(auto_now_add=True)
    delivery_date = models.DateTimeField(null=True, blank=True)
    read_date = models.DateTimeField(null=True, blank=True)
    response_date = models.DateTimeField(null=True, blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='SENT')
    
    # RÃ©sultats
    response_received = models.BooleanField(default=False)
    payment_promised = models.BooleanField(default=False)
    promise_date = models.DateField(null=True, blank=True)
    promise_amount = models.DecimalField(
        max_digits=20, decimal_places=2, null=True, blank=True
    )
    
    # MÃ©tadonnÃ©es
    sent_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    
    class Meta:
        db_table = 'customer_reminder_history'
        ordering = ['-sent_date']
        indexes = [
            models.Index(fields=['customer', '-sent_date']),
            models.Index(fields=['reminder_level']),
        ]
        verbose_name = "Historique relance"
        verbose_name_plural = "Historique relances"
    
    def __str__(self):
        return f"{self.customer.code} - {self.reminder_level} - {self.sent_date}"


class CustomerAnalytics(TimeStampedModel):
    """
    Analytics et mÃ©triques clients
    Historique complet de la relation (EXF-CC-001)
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.OneToOneField(
        Customer, on_delete=models.CASCADE, related_name='analytics'
    )
    
    # MÃ©triques calculÃ©es automatiquement
    total_orders_count = models.PositiveIntegerField(default=0, verbose_name="Nombre total commandes")
    total_invoices_count = models.PositiveIntegerField(default=0, verbose_name="Nombre total factures")
    total_amount_invoiced = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Montant total facturÃ©"
    )
    total_amount_paid = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Montant total payÃ©"
    )
    
    # Moyennes et tendances
    average_order_amount = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Montant moyen commande"
    )
    average_payment_delay = models.DecimalField(
        max_digits=10, decimal_places=1, default=Decimal('0'),
        verbose_name="DÃ©lai moyen paiement (jours)"
    )
    
    # Taux de performance
    on_time_payment_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('100'),
        verbose_name="Taux paiement Ã  temps (%)"
    )
    promise_respect_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('100'),
        verbose_name="Taux respect promesses (%)"
    )
    
    # FrÃ©quence des commandes
    last_12m_orders = models.PositiveIntegerField(default=0, verbose_name="Commandes 12 derniers mois")
    last_12m_amount = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="CA 12 derniers mois"
    )
    
    # Tendances (calcul automatique)
    trend_orders = models.CharField(max_length=10, choices=[
        ('UP', 'Croissante'),
        ('STABLE', 'Stable'),
        ('DOWN', 'DÃ©croissante'),
    ], default='STABLE', verbose_name="Tendance commandes")
    
    trend_amount = models.CharField(max_length=10, choices=[
        ('UP', 'Croissante'),
        ('STABLE', 'Stable'),
        ('DOWN', 'DÃ©croissante'),
    ], default='STABLE', verbose_name="Tendance montants")
    
    # DerniÃ¨re mise Ã  jour
    last_calculation = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'customer_analytics'
        verbose_name = "Analytics client"
        verbose_name_plural = "Analytics clients"
    
    def __str__(self):
        return f"Analytics {self.customer.code}"
    
    def refresh_metrics(self):
        """
        Recalcule toutes les mÃ©triques du client
        Performance optimisÃ©e avec requÃªtes groupÃ©es
        """
        from django.db.models import Sum, Count, Avg
        from apps.accounting.models import JournalEntryLine
        
        if not self.customer.account:
            return
        
        # PÃ©riode de calcul (12 mois)
        one_year_ago = date.today() - timedelta(days=365)
        
        # RequÃªtes optimisÃ©es groupÃ©es
        transactions = JournalEntryLine.objects.filter(
            account=self.customer.account,
            third_party=self.customer,
            entry__is_validated=True,
            entry__entry_date__gte=one_year_ago
        )
        
        # Calculs d'agrÃ©gats
        stats = transactions.aggregate(
            total_invoiced=Sum('debit_amount') or Decimal('0'),
            total_paid=Sum('credit_amount') or Decimal('0'),
            invoice_count=Count('id', distinct=True),
            avg_amount=Avg('debit_amount') or Decimal('0')
        )
        
        # Mise Ã  jour des mÃ©triques
        self.last_12m_amount = stats['total_invoiced']
        self.total_amount_invoiced = stats['total_invoiced']
        self.total_amount_paid = stats['total_paid']
        self.total_invoices_count = stats['invoice_count']
        self.average_order_amount = stats['avg_amount']
        
        # Calcul du taux de paiement Ã  temps
        on_time_payments = transactions.filter(
            is_reconciled=True,
            reconciliation_date__lte=F('entry__entry_date') + timedelta(days=self.customer.payment_terms)
        ).count()
        
        total_payments = transactions.filter(is_reconciled=True).count()
        
        if total_payments > 0:
            self.on_time_payment_rate = (on_time_payments / total_payments * 100)
        
        self.save()