"""
Modèles pour les États Financiers SYSCOHADA
Bilan, Compte de Résultat et TAFIRE selon normes OHADA révisées 2017
"""
from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal
import uuid
from datetime import date

from apps.core.models import TimeStampedModel
from apps.accounting.models import Company, FiscalYear


class BalanceSYSCOHADA(TimeStampedModel):
    """
    Bilan SYSCOHADA selon modèle officiel OHADA
    Structure Actif/Passif conforme au référentiel 2017
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='balance_sheets')
    fiscal_year = models.ForeignKey(FiscalYear, on_delete=models.CASCADE, related_name='balance_sheets')
    
    # Métadonnées
    statement_date = models.DateField(verbose_name="Date d'arrêté")
    calculation_date = models.DateTimeField(auto_now_add=True)
    
    # ==================== ACTIF ====================
    
    # ACTIF IMMOBILISE
    # Immobilisations incorporelles (20)
    intangible_assets_gross = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Immobilisations incorporelles - Valeur brute"
    )
    intangible_assets_depreciation = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Immobilisations incorporelles - Amortissements"
    )
    intangible_assets_net = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Immobilisations incorporelles - Valeur nette", editable=False
    )
    
    # Immobilisations corporelles (21-24)
    tangible_assets_gross = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Immobilisations corporelles - Valeur brute"
    )
    tangible_assets_depreciation = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Immobilisations corporelles - Amortissements"
    )
    tangible_assets_net = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Immobilisations corporelles - Valeur nette", editable=False
    )
    
    # Avances et acomptes versés sur immobilisations (25)
    advances_on_fixed_assets = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Avances et acomptes versés sur immobilisations"
    )
    
    # Immobilisations financières (26-27)
    financial_assets_gross = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Immobilisations financières - Valeur brute"
    )
    financial_assets_provisions = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Immobilisations financières - Provisions"
    )
    financial_assets_net = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Immobilisations financières - Valeur nette", editable=False
    )
    
    # Total ACTIF IMMOBILISE
    total_fixed_assets = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="TOTAL ACTIF IMMOBILISE", editable=False
    )
    
    # ACTIF CIRCULANT
    # Actif circulant HAO (28)
    hao_current_assets = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Actif circulant HAO"
    )
    
    # Stocks et en-cours (31-38)
    stocks_gross = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Stocks - Valeur brute"
    )
    stocks_provisions = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Stocks - Provisions"
    )
    stocks_net = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Stocks - Valeur nette", editable=False
    )
    
    # Créances et emplois assimilés (40-48)
    receivables_gross = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Créances et emplois assimilés - Valeur brute"
    )
    receivables_provisions = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Créances - Provisions"
    )
    receivables_net = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Créances et emplois assimilés - Valeur nette", editable=False
    )
    
    # Total ACTIF CIRCULANT
    total_current_assets = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="TOTAL ACTIF CIRCULANT", editable=False
    )
    
    # TRESORERIE-ACTIF
    # Titres de placement (50)
    marketable_securities = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Titres de placement"
    )
    
    # Valeurs à encaisser (51)
    values_to_collect = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Valeurs à encaisser"
    )
    
    # Banques, chèques postaux, caisse (52-58)
    cash_and_banks = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Banques, chèques postaux, caisse"
    )
    
    # Total TRESORERIE-ACTIF
    total_treasury_assets = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="TOTAL TRESORERIE-ACTIF", editable=False
    )
    
    # Écart de conversion-Actif (59)
    currency_translation_diff_assets = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Écart de conversion-Actif"
    )
    
    # TOTAL GENERAL ACTIF
    total_assets = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="TOTAL GENERAL ACTIF", editable=False
    )
    
    # ==================== PASSIF ====================
    
    # CAPITAUX PROPRES ET RESSOURCES ASSIMILEES
    # Capital (101-109)
    share_capital = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Capital"
    )
    
    # Actionnaires, capital souscrit non appelé (109)
    uncalled_share_capital = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Actionnaires, capital souscrit non appelé"
    )
    
    # Primes et réserves (11)
    premiums_and_reserves = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Primes et réserves"
    )
    
    # Écarts de réévaluation (12)
    revaluation_differences = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Écarts de réévaluation"
    )
    
    # Résultat net (13/119/129)
    net_result = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Résultat net de l'exercice"
    )
    
    # Autres capitaux propres (14)
    other_equity = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Autres capitaux propres"
    )
    
    # Total CAPITAUX PROPRES
    total_equity = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="TOTAL CAPITAUX PROPRES", editable=False
    )
    
    # DETTES FINANCIERES ET RESSOURCES ASSIMILEES
    # Subventions d'investissement (15)
    investment_subsidies = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Subventions d'investissement"
    )
    
    # Provisions réglementées (151)
    regulated_provisions = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Provisions réglementées"
    )
    
    # Emprunts et dettes financières (16-17)
    financial_debts = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Emprunts et dettes financières"
    )
    
    # Provisions financières pour risques et charges (19)
    financial_provisions = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Provisions financières pour risques et charges"
    )
    
    # Total DETTES FINANCIERES
    total_financial_debts = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="TOTAL DETTES FINANCIERES", editable=False
    )
    
    # PASSIF CIRCULANT
    # Dettes circulantes HAO (48)
    hao_current_liabilities = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Dettes circulantes HAO"
    )
    
    # Clients, avances reçues (41)
    customer_advances = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Clients, avances reçues"
    )
    
    # Fournisseurs et comptes rattachés (40+408)
    suppliers_and_related = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Fournisseurs et comptes rattachés"
    )
    
    # Dettes fiscales et sociales (42-44)
    tax_and_social_debts = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Dettes fiscales et sociales"
    )
    
    # Autres dettes (45-47)
    other_debts = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Autres dettes"
    )
    
    # Provisions pour risques à court terme (499)
    short_term_provisions = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Provisions pour risques à court terme"
    )
    
    # Total PASSIF CIRCULANT
    total_current_liabilities = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="TOTAL PASSIF CIRCULANT", editable=False
    )
    
    # TRESORERIE-PASSIF
    # Banques, crédits d'escompte (52+565)
    bank_overdrafts = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Banques, crédits d'escompte"
    )
    
    # Total TRESORERIE-PASSIF
    total_treasury_liabilities = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="TOTAL TRESORERIE-PASSIF", editable=False
    )
    
    # Écart de conversion-Passif (59)
    currency_translation_diff_liabilities = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Écart de conversion-Passif"
    )
    
    # TOTAL GENERAL PASSIF
    total_liabilities = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="TOTAL GENERAL PASSIF", editable=False
    )
    
    # Contrôles
    is_balanced = models.BooleanField(default=False, verbose_name="Bilan équilibré", editable=False)
    balance_difference = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Écart d'équilibre", editable=False
    )
    
    # Validation
    is_validated = models.BooleanField(default=False)
    validated_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True)
    validation_date = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'financial_balance_sheets_syscohada'
        unique_together = [('company', 'fiscal_year', 'statement_date')]
        indexes = [
            models.Index(fields=['company', '-statement_date']),
            models.Index(fields=['fiscal_year', 'is_validated']),
        ]
        ordering = ['-statement_date']
        verbose_name = "Bilan SYSCOHADA"
        verbose_name_plural = "Bilans SYSCOHADA"
    
    def __str__(self):
        return f"Bilan {self.company.name} - {self.statement_date}"
    
    def save(self, *args, **kwargs):
        # Calculs automatiques
        self._calculate_totals()
        self._check_balance()
        super().save(*args, **kwargs)
    
    def _calculate_totals(self):
        """Calcule automatiquement les totaux"""
        # Calculs nets
        self.intangible_assets_net = self.intangible_assets_gross - self.intangible_assets_depreciation
        self.tangible_assets_net = self.tangible_assets_gross - self.tangible_assets_depreciation
        self.financial_assets_net = self.financial_assets_gross - self.financial_assets_provisions
        self.stocks_net = self.stocks_gross - self.stocks_provisions
        self.receivables_net = self.receivables_gross - self.receivables_provisions
        
        # Total actif immobilisé
        self.total_fixed_assets = (
            self.intangible_assets_net +
            self.tangible_assets_net +
            self.advances_on_fixed_assets +
            self.financial_assets_net
        )
        
        # Total actif circulant
        self.total_current_assets = (
            self.hao_current_assets +
            self.stocks_net +
            self.receivables_net
        )
        
        # Total trésorerie actif
        self.total_treasury_assets = (
            self.marketable_securities +
            self.values_to_collect +
            self.cash_and_banks
        )
        
        # Total général actif
        self.total_assets = (
            self.total_fixed_assets +
            self.total_current_assets +
            self.total_treasury_assets +
            self.currency_translation_diff_assets
        )
        
        # Total capitaux propres
        self.total_equity = (
            self.share_capital -
            self.uncalled_share_capital +
            self.premiums_and_reserves +
            self.revaluation_differences +
            self.net_result +
            self.other_equity
        )
        
        # Total dettes financières
        self.total_financial_debts = (
            self.investment_subsidies +
            self.regulated_provisions +
            self.financial_debts +
            self.financial_provisions
        )
        
        # Total passif circulant
        self.total_current_liabilities = (
            self.hao_current_liabilities +
            self.customer_advances +
            self.suppliers_and_related +
            self.tax_and_social_debts +
            self.other_debts +
            self.short_term_provisions
        )
        
        # Total trésorerie passif
        self.total_treasury_liabilities = self.bank_overdrafts
        
        # Total général passif
        self.total_liabilities = (
            self.total_equity +
            self.total_financial_debts +
            self.total_current_liabilities +
            self.total_treasury_liabilities +
            self.currency_translation_diff_liabilities
        )
    
    def _check_balance(self):
        """Vérifie l'équilibre du bilan"""
        self.balance_difference = abs(self.total_assets - self.total_liabilities)
        self.is_balanced = self.balance_difference <= Decimal('0.01')


class CompteResultatSYSCOHADA(TimeStampedModel):
    """
    Compte de Résultat SYSCOHADA selon modèle officiel OHADA
    Structure par nature conforme au référentiel 2017
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='income_statements')
    fiscal_year = models.ForeignKey(FiscalYear, on_delete=models.CASCADE, related_name='income_statements')
    
    # Métadonnées
    statement_date = models.DateField(verbose_name="Date d'arrêté")
    calculation_date = models.DateTimeField(auto_now_add=True)
    
    # ==================== CHARGES ====================
    
    # ACTIVITE D'EXPLOITATION
    # Achats de marchandises (601)
    merchandise_purchases = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Achats de marchandises"
    )
    
    # Variation stocks marchandises (6031)
    merchandise_stock_variation = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Variation stocks marchandises"
    )
    
    # Achats de matières premières (602)
    raw_materials_purchases = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Achats de matières premières"
    )
    
    # Variation stocks matières (6032)
    raw_materials_stock_variation = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Variation stocks matières"
    )
    
    # Autres achats (604-608)
    other_purchases = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Autres achats"
    )
    
    # Services extérieurs (61-62)
    external_services = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Services extérieurs"
    )
    
    # Impôts, taxes et versements assimilés (63)
    taxes_and_duties = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Impôts, taxes et versements assimilés"
    )
    
    # Charges de personnel (64)
    staff_costs = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Charges de personnel"
    )
    
    # Autres charges (65)
    other_operating_expenses = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Autres charges"
    )
    
    # ACTIVITE FINANCIERE
    # Charges financières (67)
    financial_expenses = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Charges financières"
    )
    
    # ACTIVITE EXCEPTIONNELLE
    # Charges HAO (81-85)
    exceptional_expenses = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Charges exceptionnelles (HAO)"
    )
    
    # Participation des salariés (87)
    employee_participation = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Participation des salariés"
    )
    
    # Impôts sur le résultat (89)
    income_tax = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Impôts sur le résultat"
    )
    
    # TOTAL CHARGES
    total_expenses = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="TOTAL CHARGES", editable=False
    )
    
    # ==================== PRODUITS ====================
    
    # ACTIVITE D'EXPLOITATION
    # Ventes de marchandises (701)
    merchandise_sales = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Ventes de marchandises"
    )
    
    # Production vendue (702-708)
    production_sold = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Production vendue"
    )
    
    # Production stockée (713-714)
    production_stored = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Production stockée"
    )
    
    # Production immobilisée (72)
    production_immobilized = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Production immobilisée"
    )
    
    # Subventions d'exploitation (74)
    operating_subsidies = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Subventions d'exploitation"
    )
    
    # Autres produits (75)
    other_operating_income = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Autres produits"
    )
    
    # Reprises de provisions (781-791)
    provisions_reversals = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Reprises de provisions"
    )
    
    # ACTIVITE FINANCIERE
    # Produits financiers (77)
    financial_income = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Produits financiers"
    )
    
    # ACTIVITE EXCEPTIONNELLE
    # Produits HAO (82-88)
    exceptional_income = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Produits exceptionnels (HAO)"
    )
    
    # TOTAL PRODUITS
    total_income = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="TOTAL PRODUITS", editable=False
    )
    
    # RESULTAT NET (calculé)
    calculated_net_result = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="RESULTAT NET (calculé)", editable=False
    )
    
    # Validation
    is_validated = models.BooleanField(default=False)
    validated_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True)
    validation_date = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'financial_income_statements_syscohada'
        unique_together = [('company', 'fiscal_year', 'statement_date')]
        indexes = [
            models.Index(fields=['company', '-statement_date']),
            models.Index(fields=['fiscal_year', 'is_validated']),
        ]
        ordering = ['-statement_date']
        verbose_name = "Compte de Résultat SYSCOHADA"
        verbose_name_plural = "Comptes de Résultat SYSCOHADA"
    
    def __str__(self):
        return f"Compte de Résultat {self.company.name} - {self.statement_date}"
    
    def save(self, *args, **kwargs):
        # Calculs automatiques
        self._calculate_totals()
        super().save(*args, **kwargs)
    
    def _calculate_totals(self):
        """Calcule automatiquement les totaux"""
        # Total charges
        self.total_expenses = (
            self.merchandise_purchases +
            self.merchandise_stock_variation +
            self.raw_materials_purchases +
            self.raw_materials_stock_variation +
            self.other_purchases +
            self.external_services +
            self.taxes_and_duties +
            self.staff_costs +
            self.other_operating_expenses +
            self.financial_expenses +
            self.exceptional_expenses +
            self.employee_participation +
            self.income_tax
        )
        
        # Total produits
        self.total_income = (
            self.merchandise_sales +
            self.production_sold +
            self.production_stored +
            self.production_immobilized +
            self.operating_subsidies +
            self.other_operating_income +
            self.provisions_reversals +
            self.financial_income +
            self.exceptional_income
        )
        
        # Résultat net calculé
        self.calculated_net_result = self.total_income - self.total_expenses


class TableauFluxTresorerieSYSCOHADA(TimeStampedModel):
    """
    Tableau des Flux de Trésorerie SYSCOHADA (TAFIRE)
    Conforme au modèle officiel OHADA 2017
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='cash_flow_statements')
    fiscal_year = models.ForeignKey(FiscalYear, on_delete=models.CASCADE, related_name='cash_flow_statements')
    
    # Métadonnées
    statement_date = models.DateField(verbose_name="Date d'arrêté")
    calculation_method = models.CharField(max_length=10, choices=[
        ('DIRECT', 'Méthode directe'),
        ('INDIRECT', 'Méthode indirecte'),
    ], default='INDIRECT')
    calculation_date = models.DateTimeField(auto_now_add=True)
    
    # ==================== FLUX D'EXPLOITATION ====================
    
    # Méthode indirecte - à partir du résultat net
    net_result_for_cash_flow = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Résultat net de l'exercice"
    )
    
    # Éléments sans incidence sur la trésorerie
    depreciation_and_provisions = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Dotations amortissements et provisions"
    )
    
    provisions_reversals = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Reprises de provisions"
    )
    
    value_adjustments = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Plus et moins-values de cession"
    )
    
    # Capacité d'autofinancement (CAF)
    self_financing_capacity = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Capacité d'autofinancement", editable=False
    )
    
    # Variation du besoin en fonds de roulement lié à l'activité
    working_capital_variation = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Variation du BFR d'exploitation"
    )
    
    # Flux net de trésorerie généré par l'activité
    operating_cash_flow = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Flux net de trésorerie d'exploitation", editable=False
    )
    
    # ==================== FLUX D'INVESTISSEMENT ====================
    
    # Acquisitions d'immobilisations
    fixed_assets_acquisitions = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Acquisitions d'immobilisations corporelles et incorporelles"
    )
    
    # Cessions d'immobilisations
    fixed_assets_disposals = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Cessions d'immobilisations corporelles et incorporelles"
    )
    
    # Acquisitions d'immobilisations financières
    financial_assets_acquisitions = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Acquisitions d'immobilisations financières"
    )
    
    # Cessions d'immobilisations financières
    financial_assets_disposals = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Cessions d'immobilisations financières"
    )
    
    # Flux net de trésorerie lié aux opérations d'investissement
    investment_cash_flow = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Flux net de trésorerie d'investissement", editable=False
    )
    
    # ==================== FLUX DE FINANCEMENT ====================
    
    # Augmentation de capital
    capital_increase = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Augmentation de capital en numéraire"
    )
    
    # Subventions d'investissement reçues
    investment_subsidies_received = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Subventions d'investissement reçues"
    )
    
    # Nouveaux emprunts
    new_borrowings = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Nouveaux emprunts"
    )
    
    # Remboursements d'emprunts
    loan_repayments = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Remboursements d'emprunts"
    )
    
    # Dividendes versés
    dividends_paid = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Dividendes versés"
    )
    
    # Flux net de trésorerie lié aux opérations de financement
    financing_cash_flow = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Flux net de trésorerie de financement", editable=False
    )
    
    # ==================== VARIATION DE TRESORERIE ====================
    
    # Variation de trésorerie
    cash_flow_variation = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Variation de trésorerie", editable=False
    )
    
    # Trésorerie d'ouverture
    opening_cash_balance = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Trésorerie d'ouverture"
    )
    
    # Trésorerie de clôture
    closing_cash_balance = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Trésorerie de clôture"
    )
    
    # Contrôle
    cash_variation_control = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Contrôle variation (Clôture - Ouverture)", editable=False
    )
    
    is_cash_flow_balanced = models.BooleanField(
        default=False, verbose_name="Flux équilibrés", editable=False
    )
    
    # Validation
    is_validated = models.BooleanField(default=False)
    validated_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True)
    validation_date = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'financial_cash_flow_statements_syscohada'
        unique_together = [('company', 'fiscal_year', 'statement_date')]
        indexes = [
            models.Index(fields=['company', '-statement_date']),
            models.Index(fields=['fiscal_year', 'is_validated']),
        ]
        ordering = ['-statement_date']
        verbose_name = "Tableau de Flux de Trésorerie SYSCOHADA"
        verbose_name_plural = "Tableaux de Flux de Trésorerie SYSCOHADA"
    
    def __str__(self):
        return f"TAFIRE {self.company.name} - {self.statement_date}"
    
    def save(self, *args, **kwargs):
        # Calculs automatiques
        self._calculate_cash_flows()
        self._verify_cash_flow_consistency()
        super().save(*args, **kwargs)
    
    def _calculate_cash_flows(self):
        """Calcule automatiquement les flux de trésorerie"""
        # CAF = Résultat net + Dotations - Reprises ± Plus/moins-values
        self.self_financing_capacity = (
            self.net_result_for_cash_flow +
            self.depreciation_and_provisions -
            self.provisions_reversals +
            self.value_adjustments
        )
        
        # Flux d'exploitation = CAF - Variation BFR
        self.operating_cash_flow = (
            self.self_financing_capacity - 
            self.working_capital_variation
        )
        
        # Flux d'investissement = Cessions - Acquisitions
        self.investment_cash_flow = (
            self.fixed_assets_disposals +
            self.financial_assets_disposals -
            self.fixed_assets_acquisitions -
            self.financial_assets_acquisitions
        )
        
        # Flux de financement
        self.financing_cash_flow = (
            self.capital_increase +
            self.investment_subsidies_received +
            self.new_borrowings -
            self.loan_repayments -
            self.dividends_paid
        )
        
        # Variation totale de trésorerie
        self.cash_flow_variation = (
            self.operating_cash_flow +
            self.investment_cash_flow +
            self.financing_cash_flow
        )
    
    def _verify_cash_flow_consistency(self):
        """Vérifie la cohérence des flux de trésorerie"""
        # Contrôle : Variation calculée = Trésorerie clôture - Trésorerie ouverture
        self.cash_variation_control = self.closing_cash_balance - self.opening_cash_balance
        
        # Vérification cohérence (tolérance 0.01)
        difference = abs(self.cash_flow_variation - self.cash_variation_control)
        self.is_cash_flow_balanced = difference <= Decimal('0.01')


class FinancialStatementsSet(TimeStampedModel):
    """
    Ensemble complet des états financiers SYSCOHADA
    Regroupe Bilan + Compte de Résultat + TAFIRE
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='financial_statements_sets')
    fiscal_year = models.ForeignKey(FiscalYear, on_delete=models.CASCADE, related_name='financial_statements_sets')
    
    # Références vers les états
    balance_sheet = models.OneToOneField(
        BalanceSYSCOHADA, on_delete=models.CASCADE, related_name='statements_set'
    )
    income_statement = models.OneToOneField(
        CompteResultatSYSCOHADA, on_delete=models.CASCADE, related_name='statements_set'
    )
    cash_flow_statement = models.OneToOneField(
        TableauFluxTresorerieSYSCOHADA, on_delete=models.CASCADE, related_name='statements_set'
    )
    
    # Métadonnées
    statement_date = models.DateField(verbose_name="Date d'arrêté commune")
    preparation_date = models.DateTimeField(auto_now_add=True)
    
    # Cohérence inter-états
    inter_statements_consistency = models.JSONField(
        default=dict, verbose_name="Contrôles de cohérence inter-états"
    )
    
    # Validation globale
    all_statements_validated = models.BooleanField(
        default=False, verbose_name="Tous les états validés", editable=False
    )
    
    # Approbation finale
    is_approved = models.BooleanField(default=False, verbose_name="États approuvés")
    approved_by = models.ForeignKey('auth.User', on_delete=models.SET_NULL, null=True, blank=True)
    approval_date = models.DateTimeField(null=True, blank=True)
    
    # Publication
    is_published = models.BooleanField(default=False, verbose_name="États publiés")
    publication_date = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'financial_statements_sets'
        unique_together = [('company', 'fiscal_year', 'statement_date')]
        indexes = [
            models.Index(fields=['company', '-statement_date']),
            models.Index(fields=['fiscal_year', 'is_approved']),
        ]
        ordering = ['-statement_date']
        verbose_name = "Jeu d'États Financiers"
        verbose_name_plural = "Jeux d'États Financiers"
    
    def __str__(self):
        return f"États Financiers {self.company.name} - {self.statement_date}"
    
    def save(self, *args, **kwargs):
        # Vérifier la cohérence entre les états
        self._check_inter_statements_consistency()
        super().save(*args, **kwargs)
    
    def _check_inter_statements_consistency(self):
        """Vérifie la cohérence entre les différents états financiers"""
        consistency_checks = {}
        
        # Cohérence Bilan / Compte de Résultat
        if self.balance_sheet and self.income_statement:
            # Le résultat du bilan doit égaler celui du compte de résultat
            balance_result = getattr(self.balance_sheet, 'net_result', Decimal('0'))
            income_result = getattr(self.income_statement, 'calculated_net_result', Decimal('0'))
            
            result_difference = abs(balance_result - income_result)
            consistency_checks['balance_income_consistency'] = {
                'is_consistent': result_difference <= Decimal('0.01'),
                'balance_result': float(balance_result),
                'income_result': float(income_result),
                'difference': float(result_difference)
            }
        
        # Cohérence Bilan / TAFIRE
        if self.balance_sheet and self.cash_flow_statement:
            # La variation de trésorerie du TAFIRE doit correspondre au bilan
            balance_cash_variation = (
                getattr(self.balance_sheet, 'total_treasury_assets', Decimal('0')) -
                getattr(self.balance_sheet, 'total_treasury_liabilities', Decimal('0'))
            )
            tafire_cash_variation = getattr(self.cash_flow_statement, 'cash_flow_variation', Decimal('0'))
            
            cash_difference = abs(balance_cash_variation - tafire_cash_variation)
            consistency_checks['balance_tafire_consistency'] = {
                'is_consistent': cash_difference <= Decimal('0.01'),
                'balance_cash': float(balance_cash_variation),
                'tafire_cash': float(tafire_cash_variation),
                'difference': float(cash_difference)
            }
        
        # Cohérence Compte de Résultat / TAFIRE
        if self.income_statement and self.cash_flow_statement:
            # Le résultat net doit être cohérent
            income_result = getattr(self.income_statement, 'calculated_net_result', Decimal('0'))
            tafire_result = getattr(self.cash_flow_statement, 'net_result_for_cash_flow', Decimal('0'))
            
            result_difference = abs(income_result - tafire_result)
            consistency_checks['income_tafire_consistency'] = {
                'is_consistent': result_difference <= Decimal('0.01'),
                'income_result': float(income_result),
                'tafire_result': float(tafire_result),
                'difference': float(result_difference)
            }
        
        self.inter_statements_consistency = consistency_checks
        
        # Statut global de validation
        self.all_statements_validated = all([
            getattr(self.balance_sheet, 'is_validated', False),
            getattr(self.income_statement, 'is_validated', False),
            getattr(self.cash_flow_statement, 'is_validated', False)
        ]) if all([self.balance_sheet, self.income_statement, self.cash_flow_statement]) else False