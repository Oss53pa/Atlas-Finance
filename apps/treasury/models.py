"""
Module Trésorerie SYSCOHADA Avancé pour WiseBook
Gestion position temps réel, appels de fonds et prévisions selon EXF-TR-001 à EXF-TR-005
"""
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator, RegexValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.db.models import Sum, F, Q
from decimal import Decimal
import uuid
from datetime import date, timedelta, datetime

from apps.core.models import TimeStampedModel
from apps.core.models import Societe
from apps.accounting.models import ChartOfAccounts, FiscalYear, JournalEntry


class Bank(TimeStampedModel):
    """
    Établissements bancaires avec protocoles de connexion
    Support multi-protocoles selon EXF-TR-004
    """
    
    BANK_TYPE_CHOICES = [
        ('COMMERCIAL', 'Banque commerciale'),
        ('INVESTMENT', 'Banque d\'investissement'),
        ('MICROFINANCE', 'Institution de microfinance'),
        ('COOPERATIVE', 'Banque coopérative'),
        ('CENTRAL', 'Banque centrale'),
        ('OTHER', 'Autre'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=20, unique=True, db_index=True)
    name = models.CharField(max_length=200, verbose_name="Nom de la banque")
    short_name = models.CharField(max_length=50, verbose_name="Nom court")
    bank_type = models.CharField(max_length=20, choices=BANK_TYPE_CHOICES, default='COMMERCIAL')
    
    # Codes internationaux
    bic_code = models.CharField(max_length=11, blank=True, verbose_name="Code BIC")
    swift_code = models.CharField(max_length=11, blank=True, verbose_name="Code SWIFT")
    license_number = models.CharField(max_length=50, blank=True, verbose_name="Numéro agrément")
    
    # Informations de contact
    address = models.TextField(verbose_name="Adresse")
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    website = models.URLField(blank=True)
    
    # Technologies supportées (EXF-TR-004)
    supports_psd2 = models.BooleanField(default=False, verbose_name="Support PSD2")
    supports_ebics = models.BooleanField(default=False, verbose_name="Support EBICS") 
    supports_swift = models.BooleanField(default=False, verbose_name="Support SWIFT")
    supports_iso20022 = models.BooleanField(default=False, verbose_name="Support ISO 20022")
    
    # APIs régionales (EXF-TR-004)
    supports_gimac = models.BooleanField(default=False, verbose_name="Support GIMAC (CEMAC)")
    supports_sica_uemoa = models.BooleanField(default=False, verbose_name="Support SICA-UEMOA")
    
    # Configuration technique
    api_endpoint = models.URLField(blank=True, verbose_name="Point d'accès API")
    api_version = models.CharField(max_length=10, blank=True)
    
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'treasury_banks'
        ordering = ['name']
        verbose_name = "Banque"
        verbose_name_plural = "Banques"
    
    def __str__(self):
        return f"{self.code} - {self.name}"


class BankAccount(TimeStampedModel):
    """
    Comptes bancaires avec gestion multi-devises et connexions directes
    Conforme EXF-TR-003 et EXF-TR-004
    """
    
    ACCOUNT_TYPE_CHOICES = [
        ('CHECKING', 'Compte courant'),
        ('SAVINGS', 'Compte épargne'),
        ('TERM_DEPOSIT', 'Dépôt à terme'),
        ('CREDIT_LINE', 'Ligne de crédit'),
        ('FOREIGN_CURRENCY', 'Compte devise'),
        ('OTHER', 'Autre'),
    ]
    
    STATUS_CHOICES = [
        ('ACTIVE', 'Actif'),
        ('SUSPENDED', 'Suspendu'),
        ('CLOSED', 'Clôturé'),
        ('BLOCKED', 'Bloqué'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey('core.Societe', on_delete=models.CASCADE, related_name='bank_accounts')
    bank = models.ForeignKey(Bank, on_delete=models.PROTECT, related_name='accounts')
    
    # Compte comptable associé (52x)
    accounting_account = models.ForeignKey(
        ChartOfAccounts, on_delete=models.PROTECT,
        limit_choices_to={'account_class': '5', 'code__startswith': '52'},
        related_name='bank_accounts'
    )
    
    # Informations du compte
    account_number = models.CharField(max_length=50, db_index=True, verbose_name="Numéro de compte")
    iban = models.CharField(max_length=34, blank=True, verbose_name="IBAN")
    label = models.CharField(max_length=200, verbose_name="Libellé")
    account_type = models.CharField(max_length=20, choices=ACCOUNT_TYPE_CHOICES, default='CHECKING')
    
    # Devise et montants
    currency = models.CharField(max_length=3, choices=[
        ('XAF', 'Franc CFA (CEMAC)'),
        ('XOF', 'Franc CFA (UEMOA)'),
        ('EUR', 'Euro'),
        ('USD', 'Dollar US'),
    ], default='XAF')
    
    # Soldes et limites
    initial_balance = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Solde initial"
    )
    current_balance = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Solde actuel", editable=False
    )
    minimum_balance = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Solde minimum"
    )
    overdraft_limit = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Autorisation découvert"
    )
    
    # Limites opérationnelles
    daily_transfer_limit = models.DecimalField(
        max_digits=20, decimal_places=2, null=True, blank=True,
        verbose_name="Plafond virement quotidien"
    )
    daily_withdrawal_limit = models.DecimalField(
        max_digits=20, decimal_places=2, null=True, blank=True,
        verbose_name="Plafond retrait quotidien"
    )
    
    # Frais et conditions
    account_fees = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal('0'),
        verbose_name="Frais de tenue de compte"
    )
    interest_rate = models.DecimalField(
        max_digits=5, decimal_places=4, default=Decimal('0'),
        verbose_name="Taux d'intérêt créditeur"
    )
    overdraft_rate = models.DecimalField(
        max_digits=5, decimal_places=4, default=Decimal('0'),
        verbose_name="Taux découvert"
    )
    
    # Dates importantes
    opening_date = models.DateField(verbose_name="Date d'ouverture")
    closing_date = models.DateField(null=True, blank=True, verbose_name="Date de clôture")
    last_sync_date = models.DateTimeField(null=True, blank=True, verbose_name="Dernière synchronisation")
    
    # Configuration rapprochement
    auto_reconciliation = models.BooleanField(default=False, verbose_name="Rapprochement automatique")
    reconciliation_tolerance = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal('0.01'),
        verbose_name="Tolérance rapprochement"
    )
    
    # Configuration bancaire technique
    bank_identifier = models.CharField(max_length=100, blank=True, verbose_name="Identifiant banque")
    connection_settings = models.JSONField(default=dict, verbose_name="Paramètres connexion")
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    is_main_account = models.BooleanField(default=False, verbose_name="Compte principal")
    
    class Meta:
        db_table = 'treasury_bank_accounts'
        unique_together = [('company', 'account_number', 'bank')]
        indexes = [
            models.Index(fields=['company', 'status']),
            models.Index(fields=['bank', 'account_number']),
            models.Index(fields=['iban']),
            models.Index(fields=['-current_balance']),
        ]
        ordering = ['bank__name', 'account_number']
        verbose_name = "Compte bancaire"
        verbose_name_plural = "Comptes bancaires"
    
    def __str__(self):
        return f"{self.account_number} - {self.label}"
    
    def clean(self):
        super().clean()
        
        # Validation IBAN si fourni
        if self.iban:
            iban_clean = self.iban.replace(' ', '').upper()
            if len(iban_clean) < 15 or len(iban_clean) > 34:
                raise ValidationError("Format IBAN invalide")
            self.iban = iban_clean
        
        # Un seul compte principal par société
        if self.is_main_account:
            existing_main = BankAccount.objects.filter(
                company=self.company,
                is_main_account=True
            ).exclude(id=self.id)
            
            if existing_main.exists():
                raise ValidationError("Il ne peut y avoir qu'un seul compte principal")
    
    @property
    def available_balance(self):
        """Solde disponible incluant découvert autorisé"""
        return self.current_balance + self.overdraft_limit
    
    @property
    def is_overdrawn(self):
        """Vérifie si le compte est en découvert"""
        return self.current_balance < 0
    
    def update_balance_from_entries(self):
        """
        Met à jour le solde depuis les écritures comptables validées
        """
        from apps.accounting.models import JournalEntryLine
        
        # Calcul solde depuis écritures
        aggregates = JournalEntryLine.objects.filter(
            account=self.accounting_account,
            entry__is_validated=True
        ).aggregate(
            total_debit=Sum('debit_amount') or Decimal('0'),
            total_credit=Sum('credit_amount') or Decimal('0')
        )
        
        # Solde = solde initial + débits - crédits
        new_balance = (
            self.initial_balance + 
            aggregates['total_debit'] - 
            aggregates['total_credit']
        )
        
        if self.current_balance != new_balance:
            self.current_balance = new_balance
            self.save(update_fields=['current_balance'])
        
        return new_balance


class Payment(TimeStampedModel):
    """
    Gestion des Paiements Émis et Reçus
    Orchestration des Décaissements selon EXF-TR-001
    """
    
    PAYMENT_TYPE_CHOICES = [
        # Moyens de paiement sortants (EXF-TR-001)
        ('SEPA_TRANSFER', 'Virement SEPA'),
        ('SWIFT_TRANSFER', 'Virement SWIFT'),
        ('LOCAL_TRANSFER', 'Virement local (CEMAC/UEMOA)'),
        ('SUPPLIER_DEBIT', 'Prélèvement fournisseur'),
        ('CHECK', 'Chèque'),
        ('BUSINESS_CARD', 'Carte affaires'),
        ('CASH', 'Espèces'),
        
        # Moyens d'encaissement (EXF-TR-002)
        ('INCOMING_TRANSFER', 'Virement reçu'),
        ('DIRECT_DEBIT', 'Prélèvement émis'),
        ('CHECK_RECEIVED', 'Chèque reçu'),
        ('CASH_RECEIVED', 'Espèces reçues'),
        ('CARD_PAYMENT', 'Paiement carte'),
        ('MOBILE_MONEY', 'Mobile Money'),
        ('CUSTOMER_OFFSET', 'Compensation client'),
    ]
    
    STATUS_CHOICES = [
        ('DRAFT', 'Brouillon'),
        ('PENDING_APPROVAL', 'En attente approbation'),
        ('APPROVED', 'Approuvé'),
        ('EXECUTED', 'Exécuté'),
        ('CONFIRMED', 'Confirmé par banque'),
        ('FAILED', 'Échec'),
        ('CANCELLED', 'Annulé'),
    ]
    
    DIRECTION_CHOICES = [
        ('INBOUND', 'Entrant'),
        ('OUTBOUND', 'Sortant'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey('core.Societe', on_delete=models.CASCADE, related_name='payments')
    bank_account = models.ForeignKey(BankAccount, on_delete=models.CASCADE, related_name='payments')
    
    # Classification du paiement
    payment_type = models.CharField(max_length=30, choices=PAYMENT_TYPE_CHOICES)
    direction = models.CharField(max_length=10, choices=DIRECTION_CHOICES)
    
    # Référencement unique
    payment_reference = models.CharField(max_length=100, unique=True, verbose_name="Référence paiement")
    external_reference = models.CharField(max_length=100, blank=True, verbose_name="Référence externe")
    
    # Montants et devise
    amount = models.DecimalField(max_digits=20, decimal_places=2, verbose_name="Montant")
    currency = models.CharField(max_length=3, default="XAF")
    exchange_rate = models.DecimalField(
        max_digits=10, decimal_places=6, null=True, blank=True,
        verbose_name="Taux de change"
    )
    amount_in_base_currency = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="Montant en devise de base"
    )
    
    # Dates
    value_date = models.DateField(verbose_name="Date de valeur")
    execution_date = models.DateField(null=True, blank=True, verbose_name="Date d'exécution")
    confirmation_date = models.DateTimeField(null=True, blank=True, verbose_name="Date confirmation")
    
    # Description
    description = models.TextField(verbose_name="Description")
    beneficiary_name = models.CharField(max_length=200, blank=True, verbose_name="Nom bénéficiaire")
    beneficiary_account = models.CharField(max_length=50, blank=True, verbose_name="Compte bénéficiaire")
    beneficiary_bank = models.CharField(max_length=200, blank=True, verbose_name="Banque bénéficiaire")
    
    # Circuit de Validation selon montant (EXF-TR-001)
    required_signatures = models.PositiveIntegerField(default=1, verbose_name="Signatures requises")
    current_signatures = models.PositiveIntegerField(default=0, verbose_name="Signatures obtenues")
    
    # Workflow d'approbation
    approval_workflow = models.JSONField(default=list, verbose_name="Workflow d'approbation")
    current_approval_step = models.PositiveIntegerField(default=0)
    
    # Sécurité des Paiements (EXF-TR-001)
    requires_mfa = models.BooleanField(default=False, verbose_name="Double authentification requise")
    ip_restriction = models.GenericIPAddressField(null=True, blank=True, verbose_name="Restriction IP")
    user_limit_checked = models.BooleanField(default=True, verbose_name="Plafond utilisateur vérifié")
    
    # Liens comptables
    journal_entry = models.ForeignKey(
        JournalEntry, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='treasury_payments'
    )
    
    # Statut et suivi
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='DRAFT')
    
    # Frais associés
    bank_fees = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal('0'),
        verbose_name="Frais bancaires"
    )
    
    # Métadonnées
    notes = models.TextField(blank=True, verbose_name="Notes internes")
    
    class Meta:
        db_table = 'treasury_payments'
        indexes = [
            models.Index(fields=['company', 'direction', 'status']),
            models.Index(fields=['bank_account', '-value_date']),
            models.Index(fields=['payment_reference']),
            models.Index(fields=['-execution_date']),
        ]
        ordering = ['-value_date', '-created_at']
        verbose_name = "Paiement"
        verbose_name_plural = "Paiements"
    
    def __str__(self):
        return f"{self.payment_reference} - {self.amount} {self.currency}"
    
    def save(self, *args, **kwargs):
        # Calcul montant en devise de base si taux fourni
        if self.exchange_rate and self.currency != self.company.currency:
            self.amount_in_base_currency = self.amount * self.exchange_rate
        else:
            self.amount_in_base_currency = self.amount
        
        # Détermination nombre signatures selon montant (EXF-TR-001)
        if self.direction == 'OUTBOUND':
            if self.amount_in_base_currency >= 1000000:  # > 1M XAF
                self.required_signatures = 3
            elif self.amount_in_base_currency >= 100000:  # 100K-1M XAF
                self.required_signatures = 2
            else:  # < 100K XAF
                self.required_signatures = 1
        
        super().save(*args, **kwargs)
    
    def can_be_executed(self) -> bool:
        """Vérifie si le paiement peut être exécuté"""
        return (
            self.status == 'APPROVED' and
            self.current_signatures >= self.required_signatures and
            self.bank_account.available_balance >= self.amount_in_base_currency
        )


class FundCall(TimeStampedModel):
    """
    Appels de Fonds Bancaires - Transferts entre comptes
    Demande de fonds d'un compte bancaire vers un autre
    """

    FUND_TYPE_CHOICES = [
        ('INTER_ACCOUNT', 'Transfert inter-comptes'),
        ('CREDIT_LINE', 'Activation ligne de crédit'),
        ('OVERDRAFT', 'Demande de découvert'),
        ('EMERGENCY', 'Transfert d\'urgence'),
        ('LIQUIDITY', 'Apport de liquidité'),
    ]

    STATUS_CHOICES = [
        ('DRAFT', 'Brouillon'),
        ('PENDING_APPROVAL', 'Attente validation'),
        ('APPROVED', 'Approuvé'),
        ('INITIATED', 'Initié'),
        ('IN_TRANSIT', 'En transit'),
        ('COMPLETED', 'Terminé'),
        ('FAILED', 'Échec'),
        ('CANCELLED', 'Annulé'),
    ]
    
    JUSTIFICATION_TYPE_CHOICES = [
        ('SUPPLIER_PAYMENTS', 'Paiement fournisseurs'),
        ('PAYROLL', 'Paiement salaires'),
        ('TAX_PAYMENTS', 'Paiements fiscaux/sociaux'),
        ('LOAN_REPAYMENT', 'Remboursement emprunts'),
        ('INVESTMENT', 'Investissement'),
        ('WORKING_CAPITAL', 'Besoin en fonds de roulement'),
        ('EMERGENCY', 'Urgence opérationnelle'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey('core.Societe', on_delete=models.CASCADE, related_name='fund_calls')

    # Comptes bancaires concernés
    source_account = models.ForeignKey(
        BankAccount,
        on_delete=models.CASCADE,
        related_name='fund_calls_source',
        verbose_name="Compte source (qui donne les fonds)"
    )
    destination_account = models.ForeignKey(
        BankAccount,
        on_delete=models.CASCADE,
        related_name='fund_calls_destination',
        verbose_name="Compte destination (qui reçoit les fonds)"
    )

    # Identification de l'appel
    call_reference = models.CharField(max_length=50, unique=True, verbose_name="Référence appel")
    fund_type = models.CharField(max_length=30, choices=FUND_TYPE_CHOICES)

    # Justification du transfert
    justification_type = models.CharField(max_length=30, choices=JUSTIFICATION_TYPE_CHOICES)
    business_justification = models.TextField(verbose_name="Justification du transfert")
    urgency_level = models.CharField(max_length=10, choices=[
        ('LOW', 'Faible'),
        ('MEDIUM', 'Moyenne'),
        ('HIGH', 'Élevée'),
        ('CRITICAL', 'Critique'),
    ], default='MEDIUM')

    # Montants du transfert
    amount_requested = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="Montant demandé"
    )
    amount_transferred = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Montant transféré", editable=False
    )
    
    # Dates du transfert
    request_date = models.DateField(verbose_name="Date de demande", auto_now_add=True)
    needed_date = models.DateField(verbose_name="Date de besoin")
    execution_date = models.DateField(null=True, blank=True, verbose_name="Date d'exécution")

    # Frais de transfert
    transfer_fees = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal('0'),
        verbose_name="Frais de transfert"
    )

    # Workflow et validation
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='DRAFT')
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True,
        related_name='fund_calls_requested'
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='fund_calls_approved'
    )
    approval_date = models.DateTimeField(null=True, blank=True)

    # Référence de transfert bancaire
    bank_transfer_reference = models.CharField(
        max_length=100, blank=True,
        verbose_name="Référence du virement bancaire"
    )
    
    class Meta:
        db_table = 'treasury_fund_calls'
        indexes = [
            models.Index(fields=['company', 'status']),
            models.Index(fields=['-request_date']),
            models.Index(fields=['urgency_level', 'needed_date']),
        ]
        ordering = ['-request_date']
        verbose_name = "Appel de fonds"
        verbose_name_plural = "Appels de fonds"
    
    def __str__(self):
        return f"{self.call_reference} - {self.title}"
    
    @property
    def transfer_completion_rate(self):
        """Taux de complétion du transfert"""
        if self.amount_requested == 0:
            return Decimal('0')
        return (self.amount_transferred / self.amount_requested * 100).quantize(Decimal('0.1'))

    @property
    def remaining_amount(self):
        """Montant restant à transférer"""
        return self.amount_requested - self.amount_transferred

    @property
    def can_execute_transfer(self):
        """Vérifie si le transfert peut être exécuté"""
        return (
            self.status == 'APPROVED' and
            self.source_account.available_balance >= self.amount_requested and
            self.source_account.status == 'ACTIVE' and
            self.destination_account.status == 'ACTIVE'
        )
    
    @property
    def days_until_needed(self):
        """Jours avant date de besoin"""
        return (self.needed_date - date.today()).days

    @property
    def is_overdue(self):
        """Vérifie si le transfert est en retard"""
        return date.today() > self.needed_date and self.status not in ['COMPLETED', 'CANCELLED']

    def execute_transfer(self):
        """Exécution du transfert entre comptes"""
        if not self.can_execute_transfer:
            raise ValueError("Transfert non exécutable")

        with transaction.atomic():
            # Débiter compte source
            self.source_account.current_balance -= self.amount_requested
            self.source_account.save(update_fields=['current_balance'])

            # Créditer compte destination
            self.destination_account.current_balance += self.amount_requested
            self.destination_account.save(update_fields=['current_balance'])

            # Mise à jour statut
            self.amount_transferred = self.amount_requested
            self.status = 'COMPLETED'
            self.execution_date = date.today()
            self.save()

            return True


class InterBankTransfer(TimeStampedModel):
    """
    Répartition et facturation interne des appels de fonds (EXF-CA-004)
    """
    
    CONTRIBUTOR_TYPE_CHOICES = [
        ('SHAREHOLDER', 'Actionnaire'),
        ('PARTNER', 'Associé'),
        ('PARENT_COMPANY', 'Société mère'),
        ('SUBSIDIARY', 'Filiale'),
        ('GROUP_ENTITY', 'Entité du groupe'),
    ]
    
    STATUS_CHOICES = [
        ('NOTIFIED', 'Notifié'),
        ('ACKNOWLEDGED', 'Accusé réception'),
        ('COMMITTED', 'Engagement reçu'),
        ('PARTIALLY_PAID', 'Partiellement payé'),
        ('FULLY_PAID', 'Entièrement payé'),
        ('REFUSED', 'Refusé'),
        ('OVERDUE', 'En retard'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    fund_call = models.ForeignKey(FundCall, on_delete=models.CASCADE, related_name='contributors')
    
    # Informations du contributeur
    contributor_name = models.CharField(max_length=200, verbose_name="Nom du contributeur")
    contributor_type = models.CharField(max_length=30, choices=CONTRIBUTOR_TYPE_CHOICES)
    contributor_code = models.CharField(max_length=50, verbose_name="Code contributeur")
    
    # Répartition selon capital (EXF-CA-004)
    ownership_percentage = models.DecimalField(
        max_digits=5, decimal_places=2,
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('100'))],
        verbose_name="Pourcentage de participation"
    )
    
    # Calcul quote-part
    allocated_amount = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="Montant alloué"
    )
    paid_amount = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Montant payé"
    )
    
    # Dates et suivi
    notification_date = models.DateTimeField(null=True, blank=True)
    commitment_date = models.DateTimeField(null=True, blank=True)
    expected_payment_date = models.DateField(null=True, blank=True)
    actual_payment_date = models.DateField(null=True, blank=True)
    
    # Coordonnées
    contact_email = models.EmailField(verbose_name="Email de contact")
    contact_phone = models.CharField(max_length=20, blank=True, verbose_name="Téléphone")
    
    # Statut et suivi
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='NOTIFIED')
    reminder_count = models.PositiveIntegerField(default=0, editable=False)
    last_reminder_date = models.DateTimeField(null=True, blank=True, editable=False)
    
    # Informations bancaires pour versement
    payment_iban = models.CharField(max_length=34, blank=True, verbose_name="IBAN de versement")
    payment_reference_code = models.CharField(max_length=100, blank=True)
    
    class Meta:
        db_table = 'treasury_fund_call_contributors'
        unique_together = [('fund_call', 'contributor_code')]
        indexes = [
            models.Index(fields=['fund_call', 'status']),
            models.Index(fields=['-notification_date']),
        ]
        ordering = ['-ownership_percentage']
        verbose_name = "Contributeur appel de fonds"
        verbose_name_plural = "Contributeurs appels de fonds"
    
    def __str__(self):
        return f"{self.contributor_name} - {self.fund_call.call_reference}"
    
    @property
    def remaining_amount(self):
        """Montant restant à payer"""
        return self.allocated_amount - self.paid_amount
    
    @property
    def payment_rate(self):
        """Taux de paiement actuel"""
        if self.allocated_amount == 0:
            return Decimal('100')
        return (self.paid_amount / self.allocated_amount * 100).quantize(Decimal('0.1'))
    
    def update_payment_status(self):
        """Met à jour le statut selon les paiements reçus"""
        if self.paid_amount >= self.allocated_amount:
            self.status = 'FULLY_PAID'
        elif self.paid_amount > 0:
            self.status = 'PARTIALLY_PAID'
        elif self.expected_payment_date and self.expected_payment_date < date.today():
            self.status = 'OVERDUE'
        
        self.save(update_fields=['status'])


class CashFlowForecast(TimeStampedModel):
    """
    Prévisions de Trésorerie avec ML (EXF-TR-003)
    """
    
    FORECAST_TYPE_CHOICES = [
        ('DAILY', 'Quotidienne'),
        ('WEEKLY', 'Hebdomadaire'), 
        ('MONTHLY', 'Mensuelle'),
        ('SCENARIO', 'Scénario'),
    ]
    
    SCENARIO_TYPE_CHOICES = [
        ('OPTIMISTIC', 'Optimiste'),
        ('REALISTIC', 'Réaliste'),
        ('PESSIMISTIC', 'Pessimiste'),
        ('STRESS_TEST', 'Test de stress'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey('core.Societe', on_delete=models.CASCADE, related_name='cash_forecasts')
    
    # Paramètres de la prévision
    forecast_type = models.CharField(max_length=20, choices=FORECAST_TYPE_CHOICES)
    scenario_type = models.CharField(max_length=20, choices=SCENARIO_TYPE_CHOICES, default='REALISTIC')
    
    # Période de prévision
    forecast_date = models.DateField(verbose_name="Date de prévision")
    period_start = models.DateField(verbose_name="Début période")
    period_end = models.DateField(verbose_name="Fin période")
    
    # Prévisions encaissements (consolidation créances)
    expected_receivables = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="Encaissements prévus"
    )
    receivables_confidence = models.DecimalField(
        max_digits=5, decimal_places=2, verbose_name="Confiance encaissements (%)"
    )
    
    # Prévisions décaissements (consolidation dettes)
    expected_payables = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="Décaissements prévus"
    )
    payables_confidence = models.DecimalField(
        max_digits=5, decimal_places=2, verbose_name="Confiance décaissements (%)"
    )
    
    # Autres flux
    other_inflows = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Autres entrées"
    )
    other_outflows = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Autres sorties"
    )
    
    # Position calculée
    opening_balance = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="Solde d'ouverture"
    )
    projected_balance = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="Solde projeté"
    )
    
    # Cash flow net
    net_cash_flow = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="Cash flow net"
    )
    
    # Indicateurs de risque
    liquidity_ratio = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('0'),
        verbose_name="Ratio de liquidité"
    )
    coverage_days = models.PositiveIntegerField(
        default=0, verbose_name="Jours de couverture"
    )
    
    # Métadonnées ML
    ml_model_version = models.CharField(max_length=20, blank=True)
    confidence_score = models.DecimalField(
        max_digits=5, decimal_places=2, verbose_name="Score confiance global"
    )
    calculation_time_ms = models.PositiveIntegerField(
        default=0, verbose_name="Temps calcul (ms)"
    )
    
    # Données détaillées
    detailed_forecast = models.JSONField(default=dict, verbose_name="Prévision détaillée")
    assumptions = models.JSONField(default=dict, verbose_name="Hypothèses")
    
    class Meta:
        db_table = 'treasury_cash_flow_forecasts'
        unique_together = [('company', 'forecast_date', 'forecast_type', 'scenario_type')]
        indexes = [
            models.Index(fields=['company', '-forecast_date']),
            models.Index(fields=['forecast_type', 'scenario_type']),
        ]
        ordering = ['-forecast_date']
        verbose_name = "Prévision de trésorerie"
        verbose_name_plural = "Prévisions de trésorerie"
    
    def __str__(self):
        return f"Prévision {self.company.name} - {self.forecast_date}"


class TreasuryPosition(TimeStampedModel):
    """
    Position de Trésorerie Temps Réel (EXF-TR-003)
    Vue Consolidée Multi-Banques
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey('core.Societe', on_delete=models.CASCADE, related_name='treasury_positions')
    
    # Position du jour
    position_date = models.DateField(verbose_name="Date position")
    position_time = models.DateTimeField(auto_now_add=True, verbose_name="Heure calcul")
    
    # Soldes début de journée
    opening_balance_total = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="Solde début total"
    )
    
    # Mouvements du jour
    inflows_today = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Encaissements du jour"
    )
    outflows_today = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Décaissements du jour"
    )
    
    # Position actuelle
    current_balance_total = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="Solde actuel total"
    )
    
    # Lignes de crédit disponibles
    total_credit_lines = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Lignes crédit disponibles"
    )
    
    # Prévisions à 7 jours (EXF-TR-003)
    forecast_7d_inflows = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="Encaissements 7j"
    )
    forecast_7d_outflows = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="Décaissements 7j"
    )
    forecast_7d_position = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="Position 7j"
    )
    
    # Indicateurs de liquidité
    liquidity_needs = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Besoins de liquidité"
    )
    liquidity_surplus = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Excédent de liquidité"
    )
    
    # Répartition par devise
    currency_breakdown = models.JSONField(default=dict, verbose_name="Répartition devises")
    
    # Alertes automatiques
    alerts_generated = models.JSONField(default=list, verbose_name="Alertes générées")
    
    class Meta:
        db_table = 'treasury_positions'
        unique_together = [('company', 'position_date')]
        indexes = [
            models.Index(fields=['company', '-position_date']),
            models.Index(fields=['-position_time']),
        ]
        ordering = ['-position_date', '-position_time']
        verbose_name = "Position de trésorerie"
        verbose_name_plural = "Positions de trésorerie"
    
    def __str__(self):
        return f"Position {self.company.name} - {self.position_date}"


class TreasuryAlert(TimeStampedModel):
    """
    Système d'alertes automatiques trésorerie
    """
    
    ALERT_TYPE_CHOICES = [
        ('LOW_BALANCE', 'Solde faible'),
        ('OVERDRAFT', 'Découvert'),
        ('PAYMENT_DUE', 'Échéance paiement'),
        ('FUND_CALL_NEEDED', 'Appel de fonds requis'),
        ('CURRENCY_EXPOSURE', 'Exposition devises'),
        ('LIMIT_EXCEEDED', 'Limite dépassée'),
        ('FORECAST_NEGATIVE', 'Prévision négative'),
    ]
    
    SEVERITY_CHOICES = [
        ('INFO', 'Information'),
        ('WARNING', 'Avertissement'),
        ('ERROR', 'Erreur'),
        ('CRITICAL', 'Critique'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey('core.Societe', on_delete=models.CASCADE, related_name='treasury_alerts')
    
    alert_type = models.CharField(max_length=30, choices=ALERT_TYPE_CHOICES)
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES)
    
    title = models.CharField(max_length=200, verbose_name="Titre")
    message = models.TextField(verbose_name="Message")
    
    # Contexte de l'alerte
    related_account = models.ForeignKey(
        BankAccount, on_delete=models.CASCADE, null=True, blank=True
    )
    related_fund_call = models.ForeignKey(
        FundCall, on_delete=models.CASCADE, null=True, blank=True
    )
    
    # Valeurs numériques
    threshold_value = models.DecimalField(
        max_digits=20, decimal_places=2, null=True, blank=True
    )
    current_value = models.DecimalField(
        max_digits=20, decimal_places=2, null=True, blank=True
    )
    
    # Suivi
    is_acknowledged = models.BooleanField(default=False)
    acknowledged_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    
    is_resolved = models.BooleanField(default=False)
    resolution_notes = models.TextField(blank=True)
    
    # Actions automatiques déclenchées
    auto_actions_triggered = models.JSONField(default=list)
    
    class Meta:
        db_table = 'treasury_alerts'
        indexes = [
            models.Index(fields=['company', 'severity', '-created_at']),
            models.Index(fields=['alert_type', 'is_resolved']),
        ]
        ordering = ['-created_at']
        verbose_name = "Alerte trésorerie"
        verbose_name_plural = "Alertes trésorerie"
    
    def __str__(self):
        return f"{self.title} - {self.severity}"


class BankConnection(TimeStampedModel):
    """
    Connexions Bancaires Directes (EXF-TR-004)
    Multi-Protocoles avec performance optimisée
    """
    
    PROTOCOL_CHOICES = [
        # Protocoles internationaux
        ('SWIFT_MT940', 'SWIFT MT940/942'),
        ('SWIFT_MT101', 'SWIFT MT101/103'),
        ('EBICS_T', 'EBICS T/TS'),
        ('EBICS_A', 'EBICS A/E/H'),
        ('PSD2_AISP', 'PSD2 AISP'),
        ('PSD2_PISP', 'PSD2 PISP'),
        ('ISO20022_CAMT', 'ISO 20022 CAMT'),
        ('ISO20022_PAIN', 'ISO 20022 PAIN'),
        
        # Protocoles régionaux
        ('GIMAC', 'GIMAC (Zone CEMAC)'),
        ('SICA_UEMOA', 'SICA-UEMOA'),
        ('LOCAL_API', 'API bancaire locale'),
    ]
    
    CONNECTION_STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('INACTIVE', 'Inactive'),
        ('ERROR', 'Erreur'),
        ('MAINTENANCE', 'Maintenance'),
        ('EXPIRED', 'Expirée'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    bank_account = models.ForeignKey(BankAccount, on_delete=models.CASCADE, related_name='connections')
    
    # Configuration connexion
    connection_name = models.CharField(max_length=100, verbose_name="Nom connexion")
    protocol = models.CharField(max_length=20, choices=PROTOCOL_CHOICES)
    
    # Paramètres techniques
    endpoint_url = models.URLField(verbose_name="URL point d'accès")
    user_id = models.CharField(max_length=100, verbose_name="Identifiant utilisateur")
    partner_id = models.CharField(max_length=100, blank=True, verbose_name="ID partenaire")
    
    # Certificats et sécurité
    client_certificate = models.TextField(blank=True, verbose_name="Certificat client")
    bank_certificate = models.TextField(blank=True, verbose_name="Certificat banque")
    encryption_key = models.TextField(blank=True, verbose_name="Clé de chiffrement")
    
    # Configuration synchronisation
    auto_sync_enabled = models.BooleanField(default=True, verbose_name="Sync automatique")
    sync_frequency_minutes = models.PositiveIntegerField(
        default=60, verbose_name="Fréquence sync (minutes)"
    )
    
    # Fonctionnalités activées (EXF-TR-004)
    can_retrieve_statements = models.BooleanField(default=True, verbose_name="Récupération relevés")
    can_initiate_payments = models.BooleanField(default=False, verbose_name="Initiation virements")
    can_get_realtime_status = models.BooleanField(default=False, verbose_name="Statut temps réel")
    can_manage_mandates = models.BooleanField(default=False, verbose_name="Gestion mandats")
    can_download_documents = models.BooleanField(default=True, verbose_name="Téléchargement docs")
    
    # État de la connexion
    status = models.CharField(max_length=20, choices=CONNECTION_STATUS_CHOICES, default='INACTIVE')
    last_successful_sync = models.DateTimeField(null=True, blank=True)
    last_error = models.TextField(blank=True)
    error_count = models.PositiveIntegerField(default=0)
    
    # Statistiques performance
    average_response_time_ms = models.PositiveIntegerField(default=0)
    success_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('100')
    )
    
    class Meta:
        db_table = 'treasury_bank_connections'
        unique_together = [('bank_account', 'protocol')]
        indexes = [
            models.Index(fields=['bank_account', 'status']),
            models.Index(fields=['-last_successful_sync']),
        ]
        verbose_name = "Connexion bancaire"
        verbose_name_plural = "Connexions bancaires"
    
    def __str__(self):
        return f"{self.connection_name} - {self.protocol}"


class CashMovement(TimeStampedModel):
    """
    Mouvements de trésorerie unifiés (entrées/sorties)
    """
    
    MOVEMENT_TYPE_CHOICES = [
        # Entrées de cash
        ('CUSTOMER_PAYMENT', 'Paiement client'),
        ('LOAN_RECEIPT', 'Réception prêt'),
        ('FUND_CALL_RECEIPT', 'Réception appel de fonds'),
        ('INVESTMENT_INCOME', 'Revenus placement'),
        ('OTHER_INCOME', 'Autres recettes'),
        
        # Sorties de cash  
        ('SUPPLIER_PAYMENT', 'Paiement fournisseur'),
        ('PAYROLL', 'Paiement salaires'),
        ('TAX_PAYMENT', 'Paiement taxes'),
        ('LOAN_REPAYMENT', 'Remboursement prêt'),
        ('INVESTMENT', 'Investissement'),
        ('OTHER_EXPENSE', 'Autres dépenses'),
    ]
    
    EXECUTION_STATUS_CHOICES = [
        ('SCHEDULED', 'Programmé'),
        ('PENDING', 'En attente'),
        ('PROCESSING', 'En cours'),
        ('EXECUTED', 'Exécuté'),
        ('CONFIRMED', 'Confirmé'),
        ('FAILED', 'Échec'),
        ('CANCELLED', 'Annulé'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey('core.Societe', on_delete=models.CASCADE, related_name='cash_movements')
    bank_account = models.ForeignKey(BankAccount, on_delete=models.CASCADE, related_name='cash_movements')
    
    # Type et classification
    movement_type = models.CharField(max_length=30, choices=MOVEMENT_TYPE_CHOICES)
    direction = models.CharField(max_length=10, choices=[
        ('INFLOW', 'Entrée'),
        ('OUTFLOW', 'Sortie'),
    ])
    
    # Identification
    movement_reference = models.CharField(max_length=100, unique=True, verbose_name="Référence mouvement")
    external_reference = models.CharField(max_length=100, blank=True, verbose_name="Référence externe")
    
    # Montant et devise
    amount = models.DecimalField(max_digits=20, decimal_places=2, verbose_name="Montant")
    currency = models.CharField(max_length=3, default="XAF")
    
    # Dates
    scheduled_date = models.DateField(verbose_name="Date programmée")
    value_date = models.DateField(verbose_name="Date de valeur")
    execution_date = models.DateField(null=True, blank=True, verbose_name="Date d'exécution")
    
    # Description et contexte
    description = models.TextField(verbose_name="Description")
    counterpart_name = models.CharField(max_length=200, blank=True, verbose_name="Contrepartie")
    counterpart_account = models.CharField(max_length=50, blank=True, verbose_name="Compte contrepartie")
    
    # Liens vers autres objets
    related_payment = models.ForeignKey(
        Payment, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='cash_movements'
    )
    related_fund_call = models.ForeignKey(
        FundCall, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='cash_movements'
    )
    journal_entry = models.ForeignKey(
        JournalEntry, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='cash_movements'
    )
    
    # Statut et suivi
    execution_status = models.CharField(max_length=20, choices=EXECUTION_STATUS_CHOICES, default='SCHEDULED')
    
    # Impact sur position
    balance_before = models.DecimalField(
        max_digits=20, decimal_places=2, null=True, blank=True,
        verbose_name="Solde avant"
    )
    balance_after = models.DecimalField(
        max_digits=20, decimal_places=2, null=True, blank=True,
        verbose_name="Solde après"
    )
    
    class Meta:
        db_table = 'treasury_cash_movements'
        indexes = [
            models.Index(fields=['company', 'direction', '-scheduled_date']),
            models.Index(fields=['bank_account', '-value_date']),
            models.Index(fields=['movement_type', 'execution_status']),
            models.Index(fields=['-execution_date']),
        ]
        ordering = ['-scheduled_date', '-created_at']
        verbose_name = "Mouvement de trésorerie"
        verbose_name_plural = "Mouvements de trésorerie"
    
    def __str__(self):
        return f"{self.movement_reference} - {self.direction} - {self.amount}"