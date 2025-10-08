"""
Module Consolidation Multi-Sociétés WiseBook
Gestion groupes d'entreprises avec éliminations intercos selon cahier des charges 5.1.2
"""
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal
import uuid
from datetime import date

from apps.core.models import TimeStampedModel
from apps.accounting.models import Company, FiscalYear, ChartOfAccounts


class ConsolidationGroup(TimeStampedModel):
    """
    Groupe de consolidation
    Structure organisationnelle HOLDING → FILIALES selon cahier des charges
    """
    
    GROUP_TYPE_CHOICES = [
        ('HOLDING', 'Société holding'),
        ('OPERATIONAL', 'Groupe opérationnel'),
        ('FINANCIAL', 'Groupe financier'),
        ('MIXED', 'Groupe mixte'),
    ]
    
    CONSOLIDATION_METHOD_CHOICES = [
        ('FULL', 'Intégration globale'),
        ('PROPORTIONAL', 'Intégration proportionnelle'),
        ('EQUITY', 'Mise en équivalence'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Identification groupe
    group_code = models.CharField(max_length=50, unique=True, verbose_name="Code groupe")
    group_name = models.CharField(max_length=200, verbose_name="Nom du groupe")
    legal_form = models.CharField(max_length=100, blank=True, verbose_name="Forme juridique")
    group_type = models.CharField(max_length=20, choices=GROUP_TYPE_CHOICES)
    
    # Société mère
    parent_company = models.ForeignKey(
        Company, on_delete=models.CASCADE, related_name='consolidation_groups',
        verbose_name="Société consolidante"
    )
    
    # Configuration consolidation
    consolidation_method = models.CharField(
        max_length=20, choices=CONSOLIDATION_METHOD_CHOICES, default='FULL'
    )
    consolidation_currency = models.CharField(max_length=3, default='XAF', choices=[
        ('XAF', 'Franc CFA (CEMAC)'),
        ('XOF', 'Franc CFA (UEMOA)'),
        ('EUR', 'Euro'),
        ('USD', 'Dollar US'),
    ])
    
    # Exercice de référence
    fiscal_year_end = models.CharField(
        max_length=5, default='12-31', verbose_name="Fin exercice groupe (MM-DD)"
    )
    
    # Paramètres techniques
    elimination_threshold = models.DecimalField(
        max_digits=15, decimal_places=2, default=Decimal('1000'),
        verbose_name="Seuil élimination (montant minimum)"
    )
    materiality_threshold = models.DecimalField(
        max_digits=15, decimal_places=2, default=Decimal('10000'),
        verbose_name="Seuil de signification"
    )
    
    # Méthodes de conversion
    exchange_rate_method = models.CharField(max_length=20, choices=[
        ('CLOSING_RATE', 'Cours de clôture'),
        ('AVERAGE_RATE', 'Cours moyen'),
        ('HISTORICAL_RATE', 'Cours historique'),
    ], default='CLOSING_RATE')
    
    # Contrôles qualité
    auto_elimination = models.BooleanField(default=True, verbose_name="Éliminations automatiques")
    variance_control = models.BooleanField(default=True, verbose_name="Contrôle variances")
    
    # Statut
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'consolidation_groups'
        ordering = ['group_name']
        verbose_name = "Groupe de consolidation"
        verbose_name_plural = "Groupes de consolidation"
    
    def __str__(self):
        return f"{self.group_code} - {self.group_name}"


class ConsolidationEntity(TimeStampedModel):
    """
    Entités du périmètre de consolidation
    FILIALE 1, FILIALE 2, Établissements selon cahier des charges
    """
    
    ENTITY_TYPE_CHOICES = [
        ('SUBSIDIARY', 'Filiale'),
        ('BRANCH', 'Établissement'),
        ('JOINT_VENTURE', 'Coentreprise'),
        ('ASSOCIATE', 'Entreprise associée'),
        ('SPV', 'Société ad hoc'),
    ]
    
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('INACTIVE', 'Inactive'),
        ('DISPOSED', 'Cédée'),
        ('LIQUIDATED', 'Liquidée'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    consolidation_group = models.ForeignKey(
        ConsolidationGroup, on_delete=models.CASCADE, related_name='entities'
    )
    
    # Société WiseBook associée
    company = models.ForeignKey(
        Company, on_delete=models.CASCADE, related_name='consolidation_entities'
    )
    
    # Classification
    entity_type = models.CharField(max_length=20, choices=ENTITY_TYPE_CHOICES)
    
    # Participation
    ownership_percentage = models.DecimalField(
        max_digits=5, decimal_places=2,
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('100'))],
        verbose_name="Pourcentage de détention"
    )
    voting_percentage = models.DecimalField(
        max_digits=5, decimal_places=2,
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('100'))],
        verbose_name="Pourcentage droits vote"
    )
    
    # Méthode de consolidation
    consolidation_method = models.CharField(
        max_length=20, choices=ConsolidationGroup.CONSOLIDATION_METHOD_CHOICES
    )
    
    # Dates
    acquisition_date = models.DateField(verbose_name="Date d'acquisition")
    first_consolidation_date = models.DateField(verbose_name="Date première consolidation")
    disposal_date = models.DateField(null=True, blank=True, verbose_name="Date de cession")
    
    # Configuration spécifique
    chart_mapping_validated = models.BooleanField(
        default=False, verbose_name="Mapping plan comptable validé"
    )
    currency_conversion_method = models.CharField(max_length=20, choices=[
        ('CURRENT_RATE', 'Cours courant'),
        ('AVERAGE_RATE', 'Cours moyen'),
        ('HISTORICAL_RATE', 'Cours historique'),
    ], default='CURRENT_RATE')
    
    # Statut
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    
    class Meta:
        db_table = 'consolidation_entities'
        unique_together = [('consolidation_group', 'company')]
        indexes = [
            models.Index(fields=['consolidation_group', 'status']),
            models.Index(fields=['entity_type', 'ownership_percentage']),
        ]
        ordering = ['-ownership_percentage', 'company__name']
        verbose_name = "Entité consolidation"
        verbose_name_plural = "Entités consolidation"
    
    def __str__(self):
        return f"{self.company.name} ({self.ownership_percentage}%)"
    
    @property
    def control_type(self):
        """Détermine le type de contrôle selon pourcentages"""
        if self.ownership_percentage > 50:
            return 'EXCLUSIVE'
        elif self.ownership_percentage >= 20:
            return 'SIGNIFICANT_INFLUENCE'
        else:
            return 'MINORITY'


class ConsolidationPeriod(TimeStampedModel):
    """
    Période de consolidation
    """
    
    STATUS_CHOICES = [
        ('DRAFT', 'Brouillon'),
        ('IN_PROGRESS', 'En cours'),
        ('COMPLETED', 'Terminée'),
        ('VALIDATED', 'Validée'),
        ('PUBLISHED', 'Publiée'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    consolidation_group = models.ForeignKey(
        ConsolidationGroup, on_delete=models.CASCADE, related_name='periods'
    )
    
    # Période
    period_name = models.CharField(max_length=100, verbose_name="Nom période")
    consolidation_date = models.DateField(verbose_name="Date consolidation")
    period_start = models.DateField(verbose_name="Début période")
    period_end = models.DateField(verbose_name="Fin période")
    
    # Configuration
    include_entities = models.ManyToManyField(
        ConsolidationEntity, related_name='consolidation_periods',
        verbose_name="Entités incluses"
    )
    
    # Taux de change
    exchange_rates = models.JSONField(default=dict, verbose_name="Taux de change période")
    
    # Statut workflow
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    
    # Métriques performance
    processing_start_time = models.DateTimeField(null=True, blank=True)
    processing_end_time = models.DateTimeField(null=True, blank=True)
    processing_duration_seconds = models.PositiveIntegerField(default=0, editable=False)
    
    # Validation
    validated_by = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True
    )
    validation_date = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'consolidation_periods'
        unique_together = [('consolidation_group', 'period_end')]
        indexes = [
            models.Index(fields=['consolidation_group', '-period_end']),
            models.Index(fields=['status']),
        ]
        ordering = ['-period_end']
        verbose_name = "Période de consolidation"
        verbose_name_plural = "Périodes de consolidation"
    
    def __str__(self):
        return f"{self.consolidation_group.group_name} - {self.period_name}"


class IntercompanyTransaction(TimeStampedModel):
    """
    Opérations intra-groupe à éliminer
    Éliminations intercos selon cahier des charges
    """
    
    TRANSACTION_TYPE_CHOICES = [
        ('SALES', 'Ventes intra-groupe'),
        ('PURCHASES', 'Achats intra-groupe'),
        ('LOANS', 'Prêts intra-groupe'),
        ('DIVIDENDS', 'Dividendes intra-groupe'),
        ('SERVICES', 'Prestations intra-groupe'),
        ('ASSETS_TRANSFER', 'Cession actifs intra-groupe'),
        ('ROYALTIES', 'Redevances intra-groupe'),
        ('INTEREST', 'Intérêts intra-groupe'),
    ]
    
    ELIMINATION_STATUS_CHOICES = [
        ('IDENTIFIED', 'Identifiée'),
        ('VALIDATED', 'Validée'),
        ('ELIMINATED', 'Éliminée'),
        ('PARTIALLY_ELIMINATED', 'Partiellement éliminée'),
        ('EXCEPTION', 'Exception'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    consolidation_period = models.ForeignKey(
        ConsolidationPeriod, on_delete=models.CASCADE, related_name='interco_transactions'
    )
    
    # Entités concernées
    entity_debtor = models.ForeignKey(
        ConsolidationEntity, on_delete=models.CASCADE, related_name='interco_debts'
    )
    entity_creditor = models.ForeignKey(
        ConsolidationEntity, on_delete=models.CASCADE, related_name='interco_receivables'
    )
    
    # Nature transaction
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPE_CHOICES)
    transaction_reference = models.CharField(max_length=100, verbose_name="Référence")
    description = models.TextField(verbose_name="Description")
    
    # Montants
    amount_original_currency = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="Montant devise origine"
    )
    currency = models.CharField(max_length=3, default='XAF')
    amount_group_currency = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="Montant devise groupe"
    )
    exchange_rate = models.DecimalField(
        max_digits=10, decimal_places=6, default=Decimal('1'),
        verbose_name="Taux de change"
    )
    
    # Élimination
    elimination_amount = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Montant éliminé"
    )
    elimination_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('100'),
        verbose_name="Taux élimination (%)"
    )
    elimination_status = models.CharField(
        max_length=30, choices=ELIMINATION_STATUS_CHOICES, default='IDENTIFIED'
    )
    
    # Comptes d'élimination
    elimination_debit_account = models.CharField(max_length=20, blank=True)
    elimination_credit_account = models.CharField(max_length=20, blank=True)
    
    # Dates
    transaction_date = models.DateField(verbose_name="Date transaction")
    elimination_date = models.DateField(null=True, blank=True)
    
    # Justification et contrôles
    justification = models.TextField(blank=True, verbose_name="Justification")
    is_reciprocal = models.BooleanField(default=True, verbose_name="Transaction réciproque")
    variance_amount = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Écart de réciprocité"
    )
    
    # Validation
    validated_by = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True
    )
    validation_date = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'consolidation_interco_transactions'
        indexes = [
            models.Index(fields=['consolidation_period', 'transaction_type']),
            models.Index(fields=['entity_debtor', 'entity_creditor']),
            models.Index(fields=['elimination_status']),
        ]
        ordering = ['-transaction_date', '-amount_group_currency']
        verbose_name = "Transaction intra-groupe"
        verbose_name_plural = "Transactions intra-groupe"
    
    def __str__(self):
        return f"{self.transaction_reference} - {self.amount_group_currency} {self.currency}"
    
    def save(self, *args, **kwargs):
        # Conversion automatique en devise groupe
        if self.exchange_rate and self.currency != self.consolidation_period.consolidation_group.consolidation_currency:
            self.amount_group_currency = self.amount_original_currency * self.exchange_rate
        else:
            self.amount_group_currency = self.amount_original_currency
        
        # Calcul montant élimination
        self.elimination_amount = self.amount_group_currency * self.elimination_rate / 100
        
        super().save(*args, **kwargs)


class ConsolidationAdjustment(TimeStampedModel):
    """
    Ajustements de consolidation
    Retraitements et homogénéisation
    """
    
    ADJUSTMENT_TYPE_CHOICES = [
        ('HOMOGENIZATION', 'Homogénéisation méthodes comptables'),
        ('RESTATEMENT', 'Retraitement IFRS'),
        ('CURRENCY_CONVERSION', 'Conversion devise'),
        ('ELIMINATION', 'Élimination intra-groupe'),
        ('GOODWILL', 'Écart de première consolidation'),
        ('MINORITY_INTEREST', 'Intérêts minoritaires'),
        ('OTHER', 'Autre ajustement'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    consolidation_period = models.ForeignKey(
        ConsolidationPeriod, on_delete=models.CASCADE, related_name='adjustments'
    )
    
    # Type ajustement
    adjustment_type = models.CharField(max_length=30, choices=ADJUSTMENT_TYPE_CHOICES)
    adjustment_name = models.CharField(max_length=200, verbose_name="Nom ajustement")
    description = models.TextField(verbose_name="Description")
    
    # Entité concernée
    entity = models.ForeignKey(
        ConsolidationEntity, on_delete=models.CASCADE, null=True, blank=True,
        related_name='consolidation_adjustments'
    )
    
    # Comptes impactés
    debit_account = models.CharField(max_length=20, verbose_name="Compte débit")
    credit_account = models.CharField(max_length=20, verbose_name="Compte crédit")
    
    # Montant
    adjustment_amount = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="Montant ajustement"
    )
    
    # Justification
    business_rationale = models.TextField(verbose_name="Justification métier")
    calculation_method = models.TextField(verbose_name="Méthode de calcul")
    
    # Contrôles
    is_automatic = models.BooleanField(default=False, verbose_name="Ajustement automatique")
    is_recurring = models.BooleanField(default=False, verbose_name="Récurrent")
    
    # Validation
    is_validated = models.BooleanField(default=False)
    validated_by = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True
    )
    validation_date = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'consolidation_adjustments'
        indexes = [
            models.Index(fields=['consolidation_period', 'adjustment_type']),
            models.Index(fields=['entity']),
        ]
        ordering = ['adjustment_type', 'adjustment_name']
        verbose_name = "Ajustement consolidation"
        verbose_name_plural = "Ajustements consolidation"
    
    def __str__(self):
        return f"{self.adjustment_name} - {self.adjustment_amount}"


class ConsolidatedFinancialStatement(TimeStampedModel):
    """
    États financiers consolidés générés
    """
    
    STATEMENT_TYPE_CHOICES = [
        ('BALANCE_SHEET', 'Bilan consolidé'),
        ('INCOME_STATEMENT', 'Compte résultat consolidé'),
        ('CASH_FLOW', 'Tableau flux trésorerie consolidé'),
        ('EQUITY_CHANGES', 'Tableau variation capitaux propres'),
        ('NOTES', 'Annexes consolidées'),
    ]
    
    FORMAT_CHOICES = [
        ('SYSCOHADA', 'Format SYSCOHADA'),
        ('IFRS', 'Format IFRS'),
        ('US_GAAP', 'Format US GAAP'),
        ('CUSTOM', 'Format personnalisé'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    consolidation_period = models.ForeignKey(
        ConsolidationPeriod, on_delete=models.CASCADE, related_name='financial_statements'
    )
    
    # Type et format
    statement_type = models.CharField(max_length=20, choices=STATEMENT_TYPE_CHOICES)
    reporting_format = models.CharField(max_length=20, choices=FORMAT_CHOICES, default='SYSCOHADA')
    
    # Données consolidées
    consolidated_data = models.JSONField(verbose_name="Données consolidées")
    detailed_breakdown = models.JSONField(default=dict, verbose_name="Détail par entité")
    
    # Métriques génération
    generation_date = models.DateTimeField(auto_now_add=True)
    generation_time_ms = models.PositiveIntegerField(default=0)
    
    # Qualité et contrôles
    data_quality_score = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('100'),
        verbose_name="Score qualité données"
    )
    control_results = models.JSONField(default=dict, verbose_name="Résultats contrôles")
    
    # Version et historique
    version = models.CharField(max_length=20, default='1.0')
    is_final = models.BooleanField(default=False, verbose_name="Version finale")
    
    class Meta:
        db_table = 'consolidation_financial_statements'
        unique_together = [('consolidation_period', 'statement_type', 'version')]
        indexes = [
            models.Index(fields=['consolidation_period', 'statement_type']),
            models.Index(fields=['-generation_date']),
        ]
        ordering = ['-generation_date']
        verbose_name = "État financier consolidé"
        verbose_name_plural = "États financiers consolidés"
    
    def __str__(self):
        return f"{self.get_statement_type_display()} - {self.consolidation_period.period_name}"


class ConsolidationWorkflow(TimeStampedModel):
    """
    Workflow de consolidation avec étapes
    """
    
    STEP_STATUS_CHOICES = [
        ('PENDING', 'En attente'),
        ('IN_PROGRESS', 'En cours'),
        ('COMPLETED', 'Terminée'),
        ('FAILED', 'Échec'),
        ('SKIPPED', 'Ignorée'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    consolidation_period = models.ForeignKey(
        ConsolidationPeriod, on_delete=models.CASCADE, related_name='workflow_steps'
    )
    
    # Étape
    step_code = models.CharField(max_length=50, verbose_name="Code étape")
    step_name = models.CharField(max_length=200, verbose_name="Nom étape")
    step_order = models.PositiveIntegerField(verbose_name="Ordre exécution")
    
    # Configuration
    is_automatic = models.BooleanField(default=False)
    estimated_duration_minutes = models.PositiveIntegerField(default=10)
    
    # Responsabilité
    assigned_to = models.ForeignKey(
        'auth.User', on_delete=models.SET_NULL, null=True, blank=True
    )
    
    # Exécution
    status = models.CharField(max_length=20, choices=STEP_STATUS_CHOICES, default='PENDING')
    start_time = models.DateTimeField(null=True, blank=True)
    end_time = models.DateTimeField(null=True, blank=True)
    actual_duration_minutes = models.PositiveIntegerField(default=0, editable=False)
    
    # Résultats
    result_data = models.JSONField(default=dict, verbose_name="Données résultat")
    error_messages = models.JSONField(default=list, verbose_name="Messages erreur")
    
    class Meta:
        db_table = 'consolidation_workflow'
        unique_together = [('consolidation_period', 'step_code')]
        ordering = ['step_order']
        verbose_name = "Étape workflow consolidation"
        verbose_name_plural = "Étapes workflow consolidation"
    
    def __str__(self):
        return f"{self.step_name} - {self.get_status_display()}"