"""
Module Analyse Financière Avancée WiseBook
TAFIRE SYSCOHADA, SIG et ratios financiers selon EXF-AF-001 à EXF-AF-007
"""
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal
import uuid
from datetime import date, timedelta

from apps.core.models import TimeStampedModel, Societe
from apps.accounting.models import ChartOfAccounts, FiscalYear

# Alias pour rétrocompatibilité
Company = Societe


class FinancialAnalysisConfiguration(TimeStampedModel):
    """
    Configuration du module d'analyse financière par société
    """
    
    TAFIRE_METHOD_CHOICES = [
        ('DIRECT', 'Méthode directe (encaissements/décaissements)'),
        ('INDIRECT', 'Méthode indirecte (à partir du résultat net)'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.OneToOneField(Company, on_delete=models.CASCADE, related_name='financial_analysis_config')
    
    # Configuration TAFIRE
    tafire_method = models.CharField(
        max_length=10, choices=TAFIRE_METHOD_CHOICES, default='INDIRECT',
        verbose_name="Méthode de calcul TAFIRE"
    )
    
    # Paramètres de calcul
    auto_calculation_enabled = models.BooleanField(
        default=True, verbose_name="Calcul automatique activé"
    )
    calculation_frequency = models.CharField(max_length=20, choices=[
        ('DAILY', 'Quotidien'),
        ('WEEKLY', 'Hebdomadaire'),
        ('MONTHLY', 'Mensuel'),
        ('QUARTERLY', 'Trimestriel'),
    ], default='MONTHLY')
    
    # Comptes de retraitement spécifiques
    working_capital_accounts = models.JSONField(
        default=list, verbose_name="Comptes BFR d'exploitation"
    )
    financial_accounts = models.JSONField(
        default=list, verbose_name="Comptes financiers"
    )
    exceptional_accounts = models.JSONField(
        default=list, verbose_name="Comptes exceptionnels"
    )
    
    # Benchmarks sectoriels
    industry_sector = models.CharField(max_length=100, blank=True, verbose_name="Secteur d'activité")
    benchmark_source = models.CharField(max_length=100, blank=True, verbose_name="Source benchmark")
    
    last_calculation = models.DateTimeField(null=True, blank=True, verbose_name="Dernier calcul")
    
    class Meta:
        db_table = 'financial_analysis_config'
        verbose_name = "Configuration analyse financière"
        verbose_name_plural = "Configurations analyse financière"
    
    def __str__(self):
        return f"Config analyse {self.company.name}"


class TAFIREStatement(TimeStampedModel):
    """
    Tableau Financier des Ressources et Emplois SYSCOHADA (EXF-AF-001)
    Conforme SYSCOHADA révisé 2017
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='tafire_statements')
    fiscal_year = models.ForeignKey(FiscalYear, on_delete=models.CASCADE, related_name='tafire_statements')
    
    # Métadonnées du tableau
    statement_date = models.DateField(verbose_name="Date du tableau")
    calculation_method = models.CharField(max_length=10, choices=[
        ('DIRECT', 'Méthode directe'),
        ('INDIRECT', 'Méthode indirecte'),
    ])
    
    # FLUX D'EXPLOITATION (FTE)
    # Capacité d'Autofinancement (CAF)
    net_income = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="Résultat net"
    )
    depreciation_provisions = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Dotations amortissements et provisions"
    )
    provisions_reversal = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Reprises provisions"
    )
    exceptional_items = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Éléments exceptionnels"
    )
    
    # CAF = Résultat Net + Dotations - Reprises + Éléments non cash
    self_financing_capacity = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="Capacité d'Autofinancement (CAF)", editable=False
    )
    
    # Variation BFR d'exploitation
    working_capital_variation = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Variation BFR exploitation"
    )
    
    # ETE = CAF - Variation BFR
    operating_cash_surplus = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="Excédent Trésorerie Exploitation (ETE)", editable=False
    )
    
    # FLUX D'INVESTISSEMENT (FTI)
    fixed_assets_acquisitions = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Acquisitions d'immobilisations"
    )
    fixed_assets_disposals = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Cessions d'immobilisations"
    )
    financial_investments_variation = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Variation immobilisations financières"
    )
    investment_subsidies_received = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Subventions d'investissement reçues"
    )
    
    # FTI = -Acquisitions + Cessions - Var. immo financières + Subventions
    investment_cash_flow = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="Flux Trésorerie Investissement (FTI)", editable=False
    )
    
    # FLUX DE FINANCEMENT (FTF)
    capital_increase = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Augmentation de capital"
    )
    new_borrowings = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Nouveaux emprunts"
    )
    loan_repayments = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Remboursements d'emprunts"
    )
    dividends_paid = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Dividendes versés"
    )
    
    # FTF = Augmentation capital + Nouveaux emprunts - Remboursements - Dividendes
    financing_cash_flow = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="Flux Trésorerie Financement (FTF)", editable=False
    )
    
    # VARIATION TOTALE DE TRÉSORERIE
    cash_variation = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="Variation de Trésorerie", editable=False
    )
    
    # Soldes d'ouverture et de clôture
    opening_cash_balance = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="Trésorerie ouverture"
    )
    closing_cash_balance = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="Trésorerie clôture"
    )
    
    # Analyses dérivées
    free_cash_flow = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="Free Cash Flow", editable=False
    )
    operating_cash_flow_margin = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('0'),
        verbose_name="Marge Cash Flow opérationnel (%)", editable=False
    )
    
    # Métadonnées calcul
    calculation_date = models.DateTimeField(auto_now_add=True)
    calculation_time_ms = models.PositiveIntegerField(default=0, verbose_name="Temps calcul (ms)")
    data_sources = models.JSONField(default=list, verbose_name="Sources de données")
    
    # Validation et approbation
    is_validated = models.BooleanField(default=False)
    validated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    validation_date = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'financial_tafire_statements'
        unique_together = [('company', 'fiscal_year', 'statement_date')]
        indexes = [
            models.Index(fields=['company', '-statement_date']),
            models.Index(fields=['fiscal_year', 'is_validated']),
        ]
        ordering = ['-statement_date']
        verbose_name = "TAFIRE SYSCOHADA"
        verbose_name_plural = "TAFIRE SYSCOHADA"
    
    def __str__(self):
        return f"TAFIRE {self.company.name} - {self.fiscal_year.name}"
    
    def save(self, *args, **kwargs):
        # Calcul automatique des flux consolidés
        self._calculate_cash_flows()
        super().save(*args, **kwargs)
    
    def _calculate_cash_flows(self):
        """Calcul automatique des flux de trésorerie"""
        # CAF = Résultat Net + Dotations - Reprises + Éléments exceptionnels
        self.self_financing_capacity = (
            self.net_income +
            self.depreciation_provisions -
            self.provisions_reversal +
            self.exceptional_items
        )
        
        # ETE = CAF - Variation BFR
        self.operating_cash_surplus = (
            self.self_financing_capacity - 
            self.working_capital_variation
        )
        
        # FTI = -Acquisitions + Cessions - Var immo financières + Subventions
        self.investment_cash_flow = (
            -self.fixed_assets_acquisitions +
            self.fixed_assets_disposals -
            self.financial_investments_variation +
            self.investment_subsidies_received
        )
        
        # FTF = Aug capital + Emprunts - Remboursements - Dividendes
        self.financing_cash_flow = (
            self.capital_increase +
            self.new_borrowings -
            self.loan_repayments -
            self.dividends_paid
        )
        
        # Variation totale = FTE + FTI + FTF
        self.cash_variation = (
            self.operating_cash_surplus +
            self.investment_cash_flow +
            self.financing_cash_flow
        )
        
        # Free Cash Flow = Flux d'exploitation + Flux d'investissement
        self.free_cash_flow = self.operating_cash_surplus + self.investment_cash_flow


class SIG(TimeStampedModel):
    """
    Soldes Intermédiaires de Gestion SYSCOHADA (EXF-AF-004)
    Calcul automatique des 9 soldes selon normes OHADA
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='sig_statements')
    fiscal_year = models.ForeignKey(FiscalYear, on_delete=models.CASCADE, related_name='sig_statements')
    
    # Métadonnées
    calculation_date = models.DateField(verbose_name="Date de calcul")
    period_end_date = models.DateField(verbose_name="Date fin de période")
    
    # 1. MARGE COMMERCIALE
    merchandise_sales = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Ventes de marchandises"
    )
    merchandise_cost = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Coût d'achat marchandises vendues"
    )
    commercial_margin = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="Marge commerciale", editable=False
    )
    
    # 2. PRODUCTION DE L'EXERCICE
    production_sold = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Production vendue"
    )
    production_stored = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Production stockée"
    )
    production_immobilized = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Production immobilisée"
    )
    period_production = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="Production de l'exercice", editable=False
    )
    
    # 3. VALEUR AJOUTÉE (VA)
    intermediate_consumption = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Consommations intermédiaires"
    )
    added_value = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="Valeur Ajoutée (VA)", editable=False
    )
    
    # 4. EXCÉDENT BRUT D'EXPLOITATION (EBE)
    operating_subsidies = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Subventions d'exploitation"
    )
    staff_costs = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Charges de personnel"
    )
    taxes_and_duties = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Impôts et taxes"
    )
    gross_operating_surplus = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="Excédent Brut d'Exploitation (EBE)", editable=False
    )
    
    # 5. RÉSULTAT D'EXPLOITATION (RE)
    other_operating_income = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Autres produits d'exploitation"
    )
    depreciation_provisions_dotations = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Dotations aux amortissements et provisions"
    )
    other_operating_expenses = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Autres charges d'exploitation"
    )
    operating_result = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="Résultat d'Exploitation (RE)", editable=False
    )
    
    # 6. RÉSULTAT FINANCIER (RF)
    financial_income = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Produits financiers"
    )
    financial_expenses = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Charges financières"
    )
    financial_result = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="Résultat Financier (RF)", editable=False
    )
    
    # 7. RÉSULTAT COURANT AVANT IMPÔTS (RCAI)
    current_result_before_tax = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="Résultat Courant Avant Impôts", editable=False
    )
    
    # 8. RÉSULTAT EXCEPTIONNEL
    exceptional_income = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Produits HAO"
    )
    exceptional_expenses = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Charges HAO"
    )
    exceptional_result = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="Résultat Exceptionnel", editable=False
    )
    
    # 9. RÉSULTAT NET (après impôts)
    income_tax = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Impôt sur le résultat"
    )
    final_net_result = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="Résultat Net Final", editable=False
    )
    
    # Métriques dérivées pour analyse
    added_value_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('0'),
        verbose_name="Taux de VA (%)", editable=False
    )
    operating_margin_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('0'),
        verbose_name="Taux de marge d'exploitation (%)", editable=False
    )
    net_margin_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('0'),
        verbose_name="Taux de marge nette (%)", editable=False
    )
    
    # Métadonnées calcul
    revenue_base = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="CA de référence pour taux"
    )
    calculation_time_ms = models.PositiveIntegerField(default=0)
    
    class Meta:
        db_table = 'financial_sig_statements'
        unique_together = [('company', 'fiscal_year', 'calculation_date')]
        indexes = [
            models.Index(fields=['company', '-calculation_date']),
            models.Index(fields=['fiscal_year']),
        ]
        ordering = ['-calculation_date']
        verbose_name = "SIG (Soldes Intermédiaires de Gestion)"
        verbose_name_plural = "SIG (Soldes Intermédiaires de Gestion)"
    
    def __str__(self):
        return f"SIG {self.company.name} - {self.calculation_date}"
    
    def save(self, *args, **kwargs):
        # Calcul automatique des soldes
        self._calculate_sig_values()
        super().save(*args, **kwargs)
    
    def _calculate_sig_values(self):
        """Calcul automatique des 9 soldes intermédiaires"""
        # 1. Marge commerciale = Ventes - Coût
        self.commercial_margin = self.merchandise_sales - self.merchandise_cost
        
        # 2. Production = Vendue + Stockée + Immobilisée  
        self.period_production = (
            self.production_sold + 
            self.production_stored + 
            self.production_immobilized
        )
        
        # 3. VA = Marge commerciale + Production - Consommations intermédiaires
        self.added_value = (
            self.commercial_margin + 
            self.period_production - 
            self.intermediate_consumption
        )
        
        # 4. EBE = VA + Subventions - Personnel - Impôts
        self.gross_operating_surplus = (
            self.added_value +
            self.operating_subsidies -
            self.staff_costs -
            self.taxes_and_duties
        )
        
        # 5. Résultat d'exploitation = EBE + Autres produits - Dotations - Autres charges
        self.operating_result = (
            self.gross_operating_surplus +
            self.other_operating_income -
            self.depreciation_provisions_dotations -
            self.other_operating_expenses
        )
        
        # 6. Résultat financier = Produits financiers - Charges financières
        self.financial_result = self.financial_income - self.financial_expenses
        
        # 7. RCAI = Résultat exploitation + Résultat financier
        self.current_result_before_tax = self.operating_result + self.financial_result
        
        # 8. Résultat exceptionnel = Produits HAO - Charges HAO
        self.exceptional_result = self.exceptional_income - self.exceptional_expenses
        
        # 9. Résultat net = RCAI + Exceptionnel - Impôts
        self.final_net_result = (
            self.current_result_before_tax +
            self.exceptional_result -
            self.income_tax
        )
        
        # Calcul des taux (si CA disponible)
        if self.revenue_base > 0:
            self.added_value_rate = (self.added_value / self.revenue_base * 100).quantize(Decimal('0.01'))
            self.operating_margin_rate = (self.operating_result / self.revenue_base * 100).quantize(Decimal('0.01'))
            self.net_margin_rate = (self.final_net_result / self.revenue_base * 100).quantize(Decimal('0.01'))


class FunctionalBalanceSheet(TimeStampedModel):
    """
    Bilan Fonctionnel SYSCOHADA (EXF-AF-003)
    Retraitement du bilan comptable en approche fonctionnelle
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='functional_balance_sheets')
    fiscal_year = models.ForeignKey(FiscalYear, on_delete=models.CASCADE, related_name='functional_balance_sheets')
    
    # Métadonnées
    statement_date = models.DateField(verbose_name="Date du bilan fonctionnel")
    calculation_date = models.DateTimeField(auto_now_add=True)
    
    # EMPLOIS STABLES
    gross_fixed_assets = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Actif immobilisé brut"
    )
    deferred_charges = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Charges à répartir"
    )
    stable_uses = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="Total Emplois Stables", editable=False
    )
    
    # RESSOURCES STABLES
    equity_capital = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Capitaux propres"
    )
    depreciation_provisions_total = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Amortissements et provisions"
    )
    financial_debts_long_term = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Dettes financières (hors CBC)"
    )
    stable_resources = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="Total Ressources Stables", editable=False
    )
    
    # FONDS DE ROULEMENT NET GLOBAL (FRNG)
    working_capital_fund = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="FRNG", editable=False
    )
    
    # ACTIF CIRCULANT D'EXPLOITATION (ACE)
    operating_inventory = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Stocks d'exploitation"
    )
    operating_receivables = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Créances d'exploitation"
    )
    operating_prepaid_expenses = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Charges constatées d'avance exploitation"
    )
    operating_current_assets = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="ACE Total", editable=False
    )
    
    # PASSIF CIRCULANT D'EXPLOITATION (PCE)
    operating_payables = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Dettes d'exploitation"
    )
    operating_deferred_income = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Produits constatés d'avance exploitation"
    )
    operating_current_liabilities = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="PCE Total", editable=False
    )
    
    # BESOIN EN FONDS DE ROULEMENT D'EXPLOITATION (BFRE)
    operating_working_capital_need = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="BFRE", editable=False
    )
    
    # ACTIF CIRCULANT HORS EXPLOITATION (ACHE)
    non_operating_current_assets = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Actif circulant hors exploitation"
    )
    
    # PASSIF CIRCULANT HORS EXPLOITATION (PCHE)
    non_operating_current_liabilities = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Passif circulant hors exploitation"
    )
    
    # BESOIN EN FONDS DE ROULEMENT HORS EXPLOITATION (BFRHE)
    non_operating_working_capital_need = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="BFRHE", editable=False
    )
    
    # BFR TOTAL
    total_working_capital_need = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="BFR Total", editable=False
    )
    
    # TRÉSORERIE
    active_treasury = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Trésorerie Active"
    )
    passive_treasury = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Trésorerie Passive"
    )
    net_treasury = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="Trésorerie Nette", editable=False
    )
    
    # Ratios de structure fonctionnelle
    frng_coverage_ratio = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('0'),
        verbose_name="Taux de couverture FRNG (%)", editable=False
    )
    bfr_rotation_days = models.DecimalField(
        max_digits=8, decimal_places=2, default=Decimal('0'),
        verbose_name="BFR en jours de CA", editable=False
    )
    treasury_autonomy_days = models.DecimalField(
        max_digits=8, decimal_places=2, default=Decimal('0'),
        verbose_name="Autonomie trésorerie (jours)", editable=False
    )
    
    # Métadonnées calcul
    revenue_base = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="CA de référence pour ratios"
    )
    calculation_time_ms = models.PositiveIntegerField(default=0)
    data_sources = models.JSONField(default=list, verbose_name="Sources de données")
    
    # Validation
    is_validated = models.BooleanField(default=False)
    validated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    validation_date = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'financial_functional_balance_sheets'
        unique_together = [('company', 'fiscal_year', 'statement_date')]
        indexes = [
            models.Index(fields=['company', '-statement_date']),
            models.Index(fields=['fiscal_year', 'is_validated']),
        ]
        ordering = ['-statement_date']
        verbose_name = "Bilan Fonctionnel"
        verbose_name_plural = "Bilans Fonctionnels"
    
    def __str__(self):
        return f"Bilan Fonctionnel {self.company.name} - {self.statement_date}"
    
    def save(self, *args, **kwargs):
        # Calcul automatique des totaux et ratios
        self._calculate_functional_balance()
        super().save(*args, **kwargs)
    
    def _calculate_functional_balance(self):
        """Calcul automatique du bilan fonctionnel"""
        # Emplois stables
        self.stable_uses = self.gross_fixed_assets + self.deferred_charges
        
        # Ressources stables
        self.stable_resources = (
            self.equity_capital + 
            self.depreciation_provisions_total + 
            self.financial_debts_long_term
        )
        
        # FRNG = Ressources stables - Emplois stables
        self.working_capital_fund = self.stable_resources - self.stable_uses
        
        # Actif circulant d'exploitation (ACE)
        self.operating_current_assets = (
            self.operating_inventory + 
            self.operating_receivables + 
            self.operating_prepaid_expenses
        )
        
        # Passif circulant d'exploitation (PCE)
        self.operating_current_liabilities = (
            self.operating_payables + 
            self.operating_deferred_income
        )
        
        # BFRE = ACE - PCE
        self.operating_working_capital_need = (
            self.operating_current_assets - self.operating_current_liabilities
        )
        
        # BFRHE = ACHE - PCHE
        self.non_operating_working_capital_need = (
            self.non_operating_current_assets - self.non_operating_current_liabilities
        )
        
        # BFR Total
        self.total_working_capital_need = (
            self.operating_working_capital_need + self.non_operating_working_capital_need
        )
        
        # Trésorerie nette
        self.net_treasury = self.active_treasury - self.passive_treasury
        
        # Vérification équilibre: FRNG - BFR = Trésorerie Nette
        equilibrium_check = self.working_capital_fund - self.total_working_capital_need
        if abs(equilibrium_check - self.net_treasury) > Decimal('0.01'):
            # Log warning mais on garde les calculs
            from django.utils import timezone
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Déséquilibre bilan fonctionnel: FRNG-BFR≠TN ({equilibrium_check} vs {self.net_treasury})")
        
        # Calcul des ratios si CA disponible
        if self.revenue_base > 0:
            # Taux de couverture FRNG
            if self.stable_uses > 0:
                self.frng_coverage_ratio = (self.working_capital_fund / self.stable_uses * 100).quantize(Decimal('0.01'))
            
            # BFR en jours de CA
            self.bfr_rotation_days = (self.total_working_capital_need * 365 / self.revenue_base).quantize(Decimal('0.01'))
            
            # Autonomie trésorerie en jours de CA
            if self.net_treasury > 0:
                self.treasury_autonomy_days = (self.net_treasury * 365 / self.revenue_base).quantize(Decimal('0.01'))


class CashFlowScenario(TimeStampedModel):
    """
    Scénarios de Cash Flow Prévisionnel (EXF-AF-002)
    Modélisation avancée avec simulation Monte Carlo
    """
    
    SCENARIO_TYPES = [
        ('OPTIMISTIC', 'Optimiste'),
        ('PESSIMISTIC', 'Pessimiste'),
        ('REALISTIC', 'Réaliste'),
        ('MONTE_CARLO', 'Monte Carlo'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='cash_flow_scenarios')
    
    # Métadonnées du scénario
    name = models.CharField(max_length=200, verbose_name="Nom du scénario")
    scenario_type = models.CharField(max_length=20, choices=SCENARIO_TYPES, verbose_name="Type de scénario")
    description = models.TextField(blank=True, verbose_name="Description")
    
    # Période de prévision
    start_date = models.DateField(verbose_name="Date début")
    end_date = models.DateField(verbose_name="Date fin")
    
    # Hypothèses du scénario
    revenue_growth_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('0'),
        verbose_name="Taux croissance CA (%)"
    )
    cost_inflation_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('0'),
        verbose_name="Taux inflation coûts (%)"
    )
    collection_period_days = models.PositiveIntegerField(
        default=45, verbose_name="Délai encaissement (jours)"
    )
    payment_period_days = models.PositiveIntegerField(
        default=60, verbose_name="Délai règlement (jours)"
    )
    
    # Données prévisionnelles détaillées (JSON)
    monthly_forecasts = models.JSONField(
        default=dict, verbose_name="Prévisions mensuelles"
    )
    sensitivity_analysis = models.JSONField(
        default=dict, verbose_name="Analyse de sensibilité"
    )
    monte_carlo_results = models.JSONField(
        default=dict, verbose_name="Résultats Monte Carlo"
    )
    
    # Métriques calculées
    average_monthly_cash_flow = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Cash flow mensuel moyen"
    )
    cash_flow_volatility = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('0'),
        verbose_name="Volatilité cash flow (%)"
    )
    minimum_cash_position = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Position cash minimum"
    )
    burn_rate_monthly = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Burn rate mensuel"
    )
    cash_runway_months = models.DecimalField(
        max_digits=5, decimal_places=1, default=Decimal('0'),
        verbose_name="Runway trésorerie (mois)"
    )
    
    # Statut et validation
    status = models.CharField(max_length=20, choices=[
        ('DRAFT', 'Brouillon'),
        ('ACTIVE', 'Actif'),
        ('ARCHIVED', 'Archivé'),
    ], default='DRAFT')
    
    confidence_level = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('50'),
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('100'))],
        verbose_name="Niveau de confiance (%)"
    )
    
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    last_updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'financial_cash_flow_scenarios'
        indexes = [
            models.Index(fields=['company', '-created_at']),
            models.Index(fields=['scenario_type', 'status']),
        ]
        ordering = ['-created_at']
        verbose_name = "Scénario Cash Flow"
        verbose_name_plural = "Scénarios Cash Flow"
    
    def __str__(self):
        return f"{self.name} ({self.get_scenario_type_display()})"


class RatioFinancier(TimeStampedModel):
    """
    Ratios Financiers SYSCOHADA (EXF-AF-005)
    Bibliothèque complète des ratios avec benchmarks
    """
    
    RATIO_CATEGORIES = [
        ('STRUCTURE', 'Structure Financière'),
        ('LIQUIDITE', 'Liquidité'),
        ('ACTIVITE', 'Activité et Gestion'),
        ('RENTABILITE', 'Rentabilité'),
        ('SOLVABILITE', 'Solvabilité'),
        ('OHADA', 'Spécifiques OHADA'),
    ]
    
    UNITE_CHOICES = [
        ('POURCENTAGE', '%'),
        ('RATIO', 'Ratio'),
        ('FOIS', 'Fois'),
        ('JOURS', 'Jours'),
        ('MONTANT', 'Montant'),
    ]
    
    ALERT_LEVELS = [
        ('', 'Aucune'),
        ('INFO', 'Information'),
        ('ATTENTION', 'Attention'),
        ('DANGER', 'Danger'),
        ('CRITIQUE', 'Critique'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='financial_ratios')
    fiscal_year = models.ForeignKey(FiscalYear, on_delete=models.CASCADE, related_name='financial_ratios')
    
    # Classification du ratio
    category = models.CharField(max_length=20, choices=RATIO_CATEGORIES, verbose_name="Catégorie")
    type_ratio = models.CharField(max_length=50, verbose_name="Type de ratio", db_index=True)
    libelle = models.CharField(max_length=200, verbose_name="Libellé")
    
    # Valeur et métadonnées
    valeur = models.DecimalField(max_digits=15, decimal_places=4, verbose_name="Valeur")
    unite = models.CharField(max_length=15, choices=UNITE_CHOICES, verbose_name="Unité")
    
    # Formule de calcul
    numerateur = models.DecimalField(max_digits=20, decimal_places=2, verbose_name="Numérateur")
    denominateur = models.DecimalField(max_digits=20, decimal_places=2, verbose_name="Dénominateur")
    formule = models.CharField(max_length=500, verbose_name="Formule de calcul")
    
    # Références et comparaisons
    valeur_reference = models.DecimalField(
        max_digits=15, decimal_places=4, null=True, blank=True,
        verbose_name="Valeur de référence"
    )
    ecart_reference = models.DecimalField(
        max_digits=15, decimal_places=4, null=True, blank=True,
        verbose_name="Écart à la référence"
    )
    
    # Évolution temporelle
    valeur_n1 = models.DecimalField(
        max_digits=15, decimal_places=4, null=True, blank=True,
        verbose_name="Valeur N-1"
    )
    variation_absolue = models.DecimalField(
        max_digits=15, decimal_places=4, null=True, blank=True,
        verbose_name="Variation absolue"
    )
    variation_relative = models.DecimalField(
        max_digits=8, decimal_places=2, null=True, blank=True,
        verbose_name="Variation relative (%)"
    )
    
    # Benchmark sectoriel
    benchmark_sector_value = models.DecimalField(
        max_digits=15, decimal_places=4, null=True, blank=True,
        verbose_name="Benchmark sectoriel"
    )
    sector_percentile = models.PositiveSmallIntegerField(
        null=True, blank=True,
        validators=[MaxValueValidator(100)],
        verbose_name="Percentile sectoriel"
    )
    
    # Interprétation et alertes
    interpretation = models.TextField(blank=True, verbose_name="Interprétation")
    alerte = models.BooleanField(default=False, verbose_name="Alerte active")
    niveau_alerte = models.CharField(
        max_length=20, choices=ALERT_LEVELS, blank=True,
        verbose_name="Niveau d'alerte"
    )
    
    # Métadonnées de calcul
    calculation_date = models.DateTimeField(auto_now_add=True)
    calculation_method = models.CharField(max_length=100, blank=True, verbose_name="Méthode de calcul")
    data_quality_score = models.PositiveSmallIntegerField(
        default=100,
        validators=[MaxValueValidator(100)],
        verbose_name="Score qualité données"
    )
    
    class Meta:
        db_table = 'financial_analysis_ratios'
        unique_together = [('company', 'fiscal_year', 'type_ratio')]
        indexes = [
            models.Index(fields=['company', 'category', '-calculation_date']),
            models.Index(fields=['type_ratio', 'alerte']),
            models.Index(fields=['fiscal_year', 'niveau_alerte']),
        ]
        ordering = ['category', 'type_ratio']
        verbose_name = "Ratio Financier"
        verbose_name_plural = "Ratios Financiers"
    
    def __str__(self):
        return f"{self.libelle} - {self.valeur}{self.get_unite_display()}"