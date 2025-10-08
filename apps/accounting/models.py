"""
Modèles comptables complets SYSCOHADA pour WiseBook
Conformes aux normes OHADA révisées 2017
"""
from django.db import models
from django.core.validators import MinLengthValidator, MaxLengthValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal
import uuid
from datetime import date
from apps.core.models import TimeStampedModel


class FiscalYear(TimeStampedModel):
    """Exercice comptable"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey('core.Societe', on_delete=models.CASCADE, related_name='fiscal_years')
    code = models.CharField(max_length=10, help_text="Ex: 2024")
    name = models.CharField(max_length=100, help_text="Ex: Exercice 2024")
    start_date = models.DateField()
    end_date = models.DateField()
    is_closed = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'accounting_fiscal_years'
        unique_together = ['company', 'code']
        ordering = ['-start_date']

    def __str__(self):
        return f"{self.code} - {self.name}"

    def clean(self):
        if self.start_date >= self.end_date:
            raise ValidationError('La date de fin doit être postérieure à la date de début')


class Journal(TimeStampedModel):
    """Journaux comptables SYSCOHADA"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey('core.Societe', on_delete=models.CASCADE, related_name='journals')
    code = models.CharField(max_length=10, validators=[MinLengthValidator(2)])
    name = models.CharField(max_length=100)

    journal_type = models.CharField(max_length=10, choices=[
        ('AC', 'Achats'),
        ('VE', 'Ventes'),
        ('BQ', 'Banque'),
        ('CA', 'Caisse'),
        ('OD', 'Opérations Diverses'),
        ('AN', 'À-nouveaux'),
        ('SAL', 'Salaires'),
        ('DEC', 'Déclarations'),
        ('REG', 'Régularisations'),
        ('CLO', 'Clôture'),
    ], verbose_name="Type de journal")

    # Comptes par défaut
    default_debit_account = models.ForeignKey('ChartOfAccounts', on_delete=models.SET_NULL,
                                             null=True, blank=True, related_name='default_debit_journals')
    default_credit_account = models.ForeignKey('ChartOfAccounts', on_delete=models.SET_NULL,
                                              null=True, blank=True, related_name='default_credit_journals')

    # Paramètres de numérotation
    numbering_prefix = models.CharField(max_length=10, blank=True,
                                       help_text="Préfixe pour numérotation automatique")
    last_number = models.IntegerField(default=0, help_text="Dernier numéro utilisé")

    # Paramètres de validation
    require_validation = models.BooleanField(default=False, verbose_name="Validation obligatoire")
    require_attachment = models.BooleanField(default=False, verbose_name="Pièce justificative obligatoire")

    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'accounting_journals'
        unique_together = ['company', 'code']
        ordering = ['code']

    def __str__(self):
        return f"{self.code} - {self.name}"

    def get_next_number(self):
        """Génère le prochain numéro de pièce"""
        self.last_number += 1
        self.save(update_fields=['last_number'])
        return f"{self.numbering_prefix}{self.last_number:06d}"


class ChartOfAccounts(TimeStampedModel):
    """Plan comptable SYSCOHADA complet"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey('core.Societe', on_delete=models.CASCADE, related_name='accounts')
    code = models.CharField(max_length=9, validators=[MinLengthValidator(1)])
    name = models.CharField(max_length=255, verbose_name="Libellé")

    # Classification SYSCOHADA
    account_class = models.CharField(max_length=1, default='1', choices=[
        ('1', 'Classe 1 - Comptes de capitaux'),
        ('2', 'Classe 2 - Comptes d\'immobilisations'),
        ('3', 'Classe 3 - Comptes de stocks'),
        ('4', 'Classe 4 - Comptes de tiers'),
        ('5', 'Classe 5 - Comptes de trésorerie'),
        ('6', 'Classe 6 - Comptes de charges'),
        ('7', 'Classe 7 - Comptes de produits'),
        ('8', 'Classe 8 - Comptes spéciaux'),
        ('9', 'Classe 9 - Comptabilité analytique'),
    ])

    account_type = models.CharField(max_length=20, choices=[
        ('DETAIL', 'Compte de détail'),
        ('TOTAL', 'Compte de total'),
        ('AUXILIARY', 'Compte auxiliaire'),
    ], default='DETAIL')

    # Hiérarchie
    parent_account = models.ForeignKey('self', on_delete=models.CASCADE,
                                      null=True, blank=True, related_name='sub_accounts')
    level = models.IntegerField(default=0, help_text="Niveau hiérarchique")

    # Propriétés comptables
    normal_balance = models.CharField(max_length=6, default='DEBIT', choices=[
        ('DEBIT', 'Débit'),
        ('CREDIT', 'Crédit'),
    ])

    is_reconcilable = models.BooleanField(default=False, verbose_name="Lettrable")
    is_auxiliary = models.BooleanField(default=False, verbose_name="Compte auxiliaire")
    allow_direct_entry = models.BooleanField(default=True, verbose_name="Saisie directe autorisée")

    # Multi-devises
    is_multi_currency = models.BooleanField(default=False, verbose_name="Multi-devises")
    default_currency = models.CharField(max_length=3, blank=True)

    # Correspondances IFRS
    ifrs_mapping = models.CharField(max_length=20, blank=True, verbose_name="Correspondance IFRS")

    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'accounting_chart_of_accounts'
        unique_together = ['company', 'code']
        ordering = ['code']

    def __str__(self):
        return f"{self.code} - {self.name}"

    def save(self, *args, **kwargs):
        # Auto-remplissage de la classe
        if self.code:
            self.account_class = self.code[0]
            self.level = len(self.code)
        super().save(*args, **kwargs)

    @property
    def full_path(self):
        """Chemin complet du compte"""
        if self.parent_account:
            return f"{self.parent_account.full_path} > {self.name}"
        return self.name


class JournalEntry(TimeStampedModel):
    """En-tête d'écriture comptable"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey('core.Societe', on_delete=models.CASCADE, related_name='journal_entries')
    fiscal_year = models.ForeignKey(FiscalYear, on_delete=models.CASCADE, related_name='entries')
    journal = models.ForeignKey(Journal, on_delete=models.CASCADE, related_name='entries')

    # Identification
    piece_number = models.CharField(max_length=50, verbose_name="Numéro de pièce")
    reference = models.CharField(max_length=100, blank=True, verbose_name="Référence externe")

    # Dates
    entry_date = models.DateField(verbose_name="Date d'écriture")
    value_date = models.DateField(null=True, blank=True, verbose_name="Date de valeur")

    # Description
    description = models.TextField(verbose_name="Libellé")

    # Montants (calculés automatiquement)
    total_debit = models.DecimalField(max_digits=20, decimal_places=2, default=Decimal('0'))
    total_credit = models.DecimalField(max_digits=20, decimal_places=2, default=Decimal('0'))

    # États
    is_balanced = models.BooleanField(default=False, verbose_name="Équilibrée")
    is_validated = models.BooleanField(default=False, verbose_name="Validée")
    validation_date = models.DateTimeField(null=True, blank=True)
    validated_by = models.ForeignKey('authentication.User', on_delete=models.SET_NULL, null=True, blank=True,
                                    related_name='validated_entries')

    # Métadonnées
    source_document = models.CharField(max_length=100, blank=True, verbose_name="Document source")
    attachment_count = models.IntegerField(default=0, verbose_name="Nombre de pièces jointes")

    class Meta:
        db_table = 'accounting_journal_entries'
        unique_together = ['company', 'fiscal_year', 'journal', 'piece_number']
        ordering = ['-entry_date', '-piece_number']
        verbose_name = "Écriture comptable"
        verbose_name_plural = "Écritures comptables"

    def __str__(self):
        return f"{self.journal.code}-{self.piece_number} - {self.description[:50]}"

    def save(self, *args, **kwargs):
        # Génération automatique du numéro de pièce si nécessaire
        if not self.piece_number:
            self.piece_number = self.journal.get_next_number()

        # Calcul des totaux
        self.calculate_totals()

        super().save(*args, **kwargs)

    def calculate_totals(self):
        """Recalcule les totaux débit/crédit"""
        lines = self.lines.all()
        self.total_debit = sum(line.debit_amount for line in lines)
        self.total_credit = sum(line.credit_amount for line in lines)
        self.is_balanced = (self.total_debit == self.total_credit and self.total_debit > 0)

    def validate_entry(self, user):
        """Valide l'écriture comptable"""
        if not self.is_balanced:
            raise ValidationError("L'écriture doit être équilibrée avant validation")

        self.is_validated = True
        self.validation_date = timezone.now()
        self.validated_by = user
        self.save()


class JournalEntryLine(TimeStampedModel):
    """Ligne d'écriture comptable"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    entry = models.ForeignKey(JournalEntry, on_delete=models.CASCADE, related_name='lines')
    account = models.ForeignKey(ChartOfAccounts, on_delete=models.CASCADE, related_name='entry_lines')

    # Montants
    debit_amount = models.DecimalField(max_digits=20, decimal_places=2, default=Decimal('0'))
    credit_amount = models.DecimalField(max_digits=20, decimal_places=2, default=Decimal('0'))

    # Description
    label = models.CharField(max_length=255, verbose_name="Libellé")

    # Tiers (optionnel)
    third_party = models.ForeignKey('third_party.Tiers', on_delete=models.SET_NULL,
                                    null=True, blank=True, related_name='entry_lines')

    # Multi-devises
    currency = models.CharField(max_length=3, blank=True)
    currency_amount = models.DecimalField(max_digits=20, decimal_places=2, null=True, blank=True)
    exchange_rate = models.DecimalField(max_digits=10, decimal_places=6, null=True, blank=True)

    # Lettrage
    reconciliation_code = models.CharField(max_length=20, blank=True, verbose_name="Code lettrage")
    is_reconciled = models.BooleanField(default=False, verbose_name="Lettrée")
    reconciliation_date = models.DateField(null=True, blank=True)

    # Numéro de ligne pour l'ordre
    line_number = models.IntegerField(default=1)

    class Meta:
        db_table = 'accounting_journal_entry_lines'
        ordering = ['entry', 'line_number']
        verbose_name = "Ligne d'écriture"
        verbose_name_plural = "Lignes d'écriture"

    def __str__(self):
        return f"{self.entry.piece_number}-{self.line_number}: {self.account.code} - {self.label}"

    def clean(self):
        # Validation : soit débit soit crédit, pas les deux
        if (self.debit_amount > 0 and self.credit_amount > 0):
            raise ValidationError("Une ligne ne peut pas avoir à la fois un débit et un crédit")

        if (self.debit_amount == 0 and self.credit_amount == 0):
            raise ValidationError("Une ligne doit avoir soit un débit soit un crédit")

    @property
    def amount(self):
        """Montant de la ligne (débit positif, crédit négatif)"""
        return self.debit_amount - self.credit_amount

    @property
    def sense(self):
        """Sens de la ligne"""
        return 'DEBIT' if self.debit_amount > 0 else 'CREDIT'


# Alias pour compatibilité
PlanComptable = ChartOfAccounts
CompteComptable = ChartOfAccounts
EcritureComptable = JournalEntry
LigneEcriture = JournalEntryLine
JournalComptable = Journal
Exercice = FiscalYear
