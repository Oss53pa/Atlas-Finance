"""
Service de Report à-Nouveaux Automatique N+1 (EXF-CL-002)
Gestion du passage d'exercice et ouverture automatique
"""
from django.db import transaction, connection
from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal
from typing import Dict, List, Any
from datetime import date, datetime
import logging

from ..models import CarryForwardBalance, ResultAllocation, ContinuityControl
from ...accounting.models import Company, FiscalYear, ChartOfAccounts, JournalEntry, JournalEntryLine, Journal
from ...core.services.base_service import BaseService

logger = logging.getLogger(__name__)


class CarryForwardService(BaseService):
    """
    Service de gestion du report à-nouveaux et passage d'exercice
    """
    
    def __init__(self, company: Company):
        super().__init__(company)
        self.company = company
    
    def generate_carry_forward_balances(
        self, 
        closing_fiscal_year: FiscalYear,
        opening_fiscal_year: FiscalYear,
        force_regenerate: bool = False
    ) -> List[CarryForwardBalance]:
        """
        Génère automatiquement les reports à-nouveaux pour le passage d'exercice
        """
        try:
            with transaction.atomic():
                # Vérifier que l'exercice de clôture est clôturé
                if closing_fiscal_year.status != 'CLOSED':
                    raise ValidationError(f"L'exercice {closing_fiscal_year.name} doit être clôturé")
                
                # Supprimer les reports existants si regénération forcée
                if force_regenerate:
                    CarryForwardBalance.objects.filter(
                        company=self.company,
                        closing_fiscal_year=closing_fiscal_year,
                        opening_fiscal_year=opening_fiscal_year
                    ).delete()
                
                carry_forwards = []
                
                # Récupérer tous les comptes de bilan avec solde non nul
                balance_accounts = self._get_balance_accounts_with_balance(closing_fiscal_year)
                
                for account_data in balance_accounts:
                    account = account_data['account']
                    debit_balance = account_data['debit_balance']
                    credit_balance = account_data['credit_balance']
                    
                    # Créer le report à-nouveaux
                    carry_forward = CarryForwardBalance.objects.create(
                        company=self.company,
                        closing_fiscal_year=closing_fiscal_year,
                        opening_fiscal_year=opening_fiscal_year,
                        account=account,
                        third_party=account_data.get('third_party'),
                        closing_balance_debit=debit_balance,
                        closing_balance_credit=credit_balance,
                        processed_by=self.current_user if hasattr(self, 'current_user') else None
                    )
                    
                    carry_forwards.append(carry_forward)
                
                logger.info(f"Report à-nouveaux généré: {len(carry_forwards)} comptes")
                return carry_forwards
                
        except Exception as e:
            logger.error(f"Erreur génération reports à-nouveaux: {str(e)}")
            raise ValidationError(f"Impossible de générer les reports: {str(e)}")
    
    def create_opening_entries(
        self, 
        opening_fiscal_year: FiscalYear,
        user=None
    ) -> JournalEntry:
        """
        Crée les écritures d'ouverture N+1 automatiquement
        """
        try:
            with transaction.atomic():
                # Récupérer tous les reports à-nouveaux validés
                carry_forwards = CarryForwardBalance.objects.filter(
                    company=self.company,
                    opening_fiscal_year=opening_fiscal_year,
                    is_validated=True,
                    net_balance__gt=Decimal('0.01')  # Seulement les soldes significatifs
                )
                
                if not carry_forwards.exists():
                    raise ValidationError("Aucun report à-nouveaux validé trouvé")
                
                # Créer le journal d'ouverture si nécessaire
                opening_journal, created = Journal.objects.get_or_create(
                    company=self.company,
                    code='OUVERTURE',
                    defaults={
                        'name': 'Journal d\'ouverture',
                        'journal_type': 'OPENING',
                        'is_active': True
                    }
                )
                
                # Créer l'écriture d'ouverture globale
                opening_entry = JournalEntry.objects.create(
                    company=self.company,
                    journal=opening_journal,
                    fiscal_year=opening_fiscal_year,
                    entry_date=opening_fiscal_year.start_date,
                    reference=f"OUVERT-{opening_fiscal_year.name}",
                    description=f"Écritures d'ouverture exercice {opening_fiscal_year.name}",
                    is_validated=True,
                    created_by=user
                )
                
                total_debit = Decimal('0')
                total_credit = Decimal('0')
                
                # Créer les lignes d'écriture pour chaque report
                for carry_forward in carry_forwards:
                    if carry_forward.balance_side == 'DEBIT':
                        # Compte débiteur
                        JournalEntryLine.objects.create(
                            entry=opening_entry,
                            account=carry_forward.account,
                            third_party=carry_forward.third_party,
                            description=f"Report à nouveau - {carry_forward.account.name}",
                            debit_amount=carry_forward.net_balance,
                            credit_amount=Decimal('0')
                        )
                        total_debit += carry_forward.net_balance
                        
                    elif carry_forward.balance_side == 'CREDIT':
                        # Compte créditeur
                        JournalEntryLine.objects.create(
                            entry=opening_entry,
                            account=carry_forward.account,
                            third_party=carry_forward.third_party,
                            description=f"Report à nouveau - {carry_forward.account.name}",
                            debit_amount=Decimal('0'),
                            credit_amount=carry_forward.net_balance
                        )
                        total_credit += carry_forward.net_balance
                    
                    # Marquer le report comme traité
                    carry_forward.opening_entry = opening_entry
                    carry_forward.save()
                
                # Mettre à jour les totaux de l'écriture
                opening_entry.total_debit = total_debit
                opening_entry.total_credit = total_credit
                opening_entry.save()
                
                # Vérifier l'équilibre
                if abs(total_debit - total_credit) > Decimal('0.01'):
                    raise ValidationError(f"Déséquilibre des écritures d'ouverture: {total_debit - total_credit}")
                
                logger.info(f"Écritures d'ouverture créées: {opening_entry.reference}")
                return opening_entry
                
        except Exception as e:
            logger.error(f"Erreur création écritures d'ouverture: {str(e)}")
            raise ValidationError(f"Impossible de créer les écritures d'ouverture: {str(e)}")
    
    def process_result_allocation(
        self,
        fiscal_year: FiscalYear,
        allocation_data: Dict[str, Any],
        user=None
    ) -> ResultAllocation:
        """
        Traite l'affectation du résultat selon les décisions d'AG
        """
        try:
            with transaction.atomic():
                # Récupérer le résultat net de l'exercice
                net_result = self._calculate_net_result(fiscal_year)
                
                # Créer l'affectation
                allocation = ResultAllocation.objects.create(
                    company=self.company,
                    fiscal_year=fiscal_year,
                    closure_procedure=allocation_data['closure_procedure'],
                    assembly_date=allocation_data['assembly_date'],
                    assembly_minutes_ref=allocation_data.get('assembly_minutes_ref', ''),
                    net_result=net_result,
                    legal_reserves_amount=allocation_data.get('legal_reserves_amount', Decimal('0')),
                    statutory_reserves_amount=allocation_data.get('statutory_reserves_amount', Decimal('0')),
                    optional_reserves_amount=allocation_data.get('optional_reserves_amount', Decimal('0')),
                    dividends_amount=allocation_data.get('dividends_amount', Decimal('0')),
                    capital_amount=self._get_current_capital()
                )
                
                # Valider la conformité légale
                errors = allocation.validate_legal_compliance()
                if errors:
                    raise ValidationError(f"Erreurs de conformité: {'; '.join(errors)}")
                
                # Générer les écritures comptables d'affectation
                if allocation_data.get('generate_entries', True):
                    self._generate_allocation_entries(allocation, user)
                
                logger.info(f"Affectation résultat créée: {allocation.id}")
                return allocation
                
        except Exception as e:
            logger.error(f"Erreur affectation résultat: {str(e)}")
            raise ValidationError(f"Impossible de traiter l'affectation: {str(e)}")
    
    def generate_continuity_controls(
        self,
        fiscal_year: FiscalYear,
        closure_procedure
    ) -> List[ContinuityControl]:
        """
        Génère les contrôles de continuité d'exploitation
        """
        try:
            controls = []
            
            # 1. Contrôle de liquidité
            liquidity_control = self._create_liquidity_control(fiscal_year, closure_procedure)
            controls.append(liquidity_control)
            
            # 2. Contrôle de solvabilité
            solvency_control = self._create_solvency_control(fiscal_year, closure_procedure)
            controls.append(solvency_control)
            
            # 3. Contrôle de rentabilité
            profitability_control = self._create_profitability_control(fiscal_year, closure_procedure)
            controls.append(profitability_control)
            
            # 4. Contrôle flux de trésorerie
            cash_flow_control = self._create_cash_flow_control(fiscal_year, closure_procedure)
            controls.append(cash_flow_control)
            
            # 5. Contrôle des covenants
            debt_covenant_control = self._create_debt_covenant_control(fiscal_year, closure_procedure)
            controls.append(debt_covenant_control)
            
            # 6. Contrôle global de continuité
            going_concern_control = self._create_going_concern_control(fiscal_year, closure_procedure)
            controls.append(going_concern_control)
            
            logger.info(f"Contrôles de continuité générés: {len(controls)}")
            return controls
            
        except Exception as e:
            logger.error(f"Erreur génération contrôles continuité: {str(e)}")
            raise ValidationError(f"Impossible de générer les contrôles: {str(e)}")
    
    def _get_balance_accounts_with_balance(self, fiscal_year: FiscalYear) -> List[Dict]:
        """
        Récupère tous les comptes de bilan avec solde non nul
        """
        sql = """
        WITH account_balances AS (
            SELECT 
                ca.id,
                ca.code,
                ca.name,
                ca.account_class,
                tp.id as third_party_id,
                COALESCE(SUM(jel.debit_amount), 0) as total_debit,
                COALESCE(SUM(jel.credit_amount), 0) as total_credit,
                COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0) as net_balance
            FROM accounting_chartofaccounts ca
            LEFT JOIN accounting_journalentryline jel ON ca.id = jel.account_id
            LEFT JOIN accounting_journalentry je ON jel.entry_id = je.id
            LEFT JOIN core_thirdparty tp ON jel.third_party_id = tp.id
            WHERE ca.company_id = %s 
            AND je.fiscal_year_id = %s
            AND je.is_validated = true
            AND ca.account_class IN ('1', '2', '3', '4', '5')  -- Comptes de bilan uniquement
            GROUP BY ca.id, ca.code, ca.name, ca.account_class, tp.id
            HAVING ABS(COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0)) > 0.01
        )
        SELECT 
            id, code, name, account_class, third_party_id,
            CASE WHEN net_balance > 0 THEN net_balance ELSE 0 END as debit_balance,
            CASE WHEN net_balance < 0 THEN ABS(net_balance) ELSE 0 END as credit_balance
        FROM account_balances
        ORDER BY code
        """
        
        with connection.cursor() as cursor:
            cursor.execute(sql, [self.company.id, fiscal_year.id])
            
            results = []
            for row in cursor.fetchall():
                account_id, code, name, account_class, third_party_id, debit_balance, credit_balance = row
                
                account = ChartOfAccounts.objects.get(id=account_id)
                third_party = None
                
                if third_party_id:
                    from apps.core.models import ThirdParty
                    try:
                        third_party = ThirdParty.objects.get(id=third_party_id)
                    except ThirdParty.DoesNotExist:
                        pass
                
                results.append({
                    'account': account,
                    'third_party': third_party,
                    'debit_balance': Decimal(str(debit_balance)),
                    'credit_balance': Decimal(str(credit_balance))
                })
            
            return results
    
    def _calculate_net_result(self, fiscal_year: FiscalYear) -> Decimal:
        """Calcule le résultat net de l'exercice"""
        
        # Résultat = Total Produits (classe 7) - Total Charges (classe 6)
        sql = """
        SELECT 
            COALESCE(SUM(CASE WHEN ca.account_class = '7' THEN jel.credit_amount - jel.debit_amount ELSE 0 END), 0) as total_income,
            COALESCE(SUM(CASE WHEN ca.account_class = '6' THEN jel.debit_amount - jel.credit_amount ELSE 0 END), 0) as total_expenses
        FROM accounting_journalentryline jel
        JOIN accounting_journalentry je ON jel.entry_id = je.id
        JOIN accounting_chartofaccounts ca ON jel.account_id = ca.id
        WHERE je.company_id = %s 
        AND je.fiscal_year_id = %s
        AND je.is_validated = true
        AND ca.account_class IN ('6', '7')
        """
        
        with connection.cursor() as cursor:
            cursor.execute(sql, [self.company.id, fiscal_year.id])
            row = cursor.fetchone()
            
            if row:
                total_income, total_expenses = row
                return Decimal(str(total_income)) - Decimal(str(total_expenses))
            
            return Decimal('0')
    
    def _get_current_capital(self) -> Decimal:
        """Récupère le montant du capital social actuel"""
        try:
            capital_account = ChartOfAccounts.objects.get(
                company=self.company, 
                code='101'  # Capital social
            )
            return capital_account.get_current_balance()
        except ChartOfAccounts.DoesNotExist:
            return Decimal('0')
    
    def _generate_allocation_entries(self, allocation: ResultAllocation, user=None):
        """
        Génère les écritures comptables d'affectation du résultat
        """
        # Journal des opérations diverses
        od_journal = Journal.objects.get(company=self.company, code='OD')
        
        # Écriture d'affectation du résultat
        allocation_entry = JournalEntry.objects.create(
            company=self.company,
            journal=od_journal,
            fiscal_year=allocation.fiscal_year,
            entry_date=allocation.assembly_date,
            reference=f"AFFECT-{allocation.fiscal_year.name}",
            description=f"Affectation résultat exercice {allocation.fiscal_year.name}",
            is_validated=True,
            created_by=user
        )
        
        # Solde du compte résultat (120 - Résultat de l'exercice)
        if allocation.net_result > 0:
            # Résultat bénéficiaire - Débiter le compte résultat
            JournalEntryLine.objects.create(
                entry=allocation_entry,
                account=ChartOfAccounts.objects.get(company=self.company, code='120'),
                description="Affectation résultat bénéficiaire",
                debit_amount=allocation.net_result,
                credit_amount=Decimal('0')
            )
        else:
            # Résultat déficitaire - Créditer le compte résultat
            JournalEntryLine.objects.create(
                entry=allocation_entry,
                account=ChartOfAccounts.objects.get(company=self.company, code='120'),
                description="Affectation résultat déficitaire",
                debit_amount=Decimal('0'),
                credit_amount=abs(allocation.net_result)
            )
        
        # Dotation aux réserves légales
        if allocation.legal_reserves_amount > 0:
            JournalEntryLine.objects.create(
                entry=allocation_entry,
                account=ChartOfAccounts.objects.get(company=self.company, code='1061'),
                description="Dotation réserves légales",
                debit_amount=Decimal('0'),
                credit_amount=allocation.legal_reserves_amount
            )
        
        # Dotation aux réserves statutaires
        if allocation.statutory_reserves_amount > 0:
            JournalEntryLine.objects.create(
                entry=allocation_entry,
                account=ChartOfAccounts.objects.get(company=self.company, code='1062'),
                description="Dotation réserves statutaires",
                debit_amount=Decimal('0'),
                credit_amount=allocation.statutory_reserves_amount
            )
        
        # Dotation aux réserves facultatives
        if allocation.optional_reserves_amount > 0:
            JournalEntryLine.objects.create(
                entry=allocation_entry,
                account=ChartOfAccounts.objects.get(company=self.company, code='1063'),
                description="Dotation réserves facultatives",
                debit_amount=Decimal('0'),
                credit_amount=allocation.optional_reserves_amount
            )
        
        # Dividendes à distribuer
        if allocation.dividends_amount > 0:
            JournalEntryLine.objects.create(
                entry=allocation_entry,
                account=ChartOfAccounts.objects.get(company=self.company, code='457'),
                description="Dividendes à distribuer",
                debit_amount=Decimal('0'),
                credit_amount=allocation.dividends_amount
            )
        
        # Report à nouveau
        if allocation.carried_forward_amount != 0:
            if allocation.carried_forward_amount > 0:
                # Report bénéficiaire
                JournalEntryLine.objects.create(
                    entry=allocation_entry,
                    account=ChartOfAccounts.objects.get(company=self.company, code='110'),
                    description="Report à nouveau bénéficiaire",
                    debit_amount=Decimal('0'),
                    credit_amount=allocation.carried_forward_amount
                )
            else:
                # Report déficitaire
                JournalEntryLine.objects.create(
                    entry=allocation_entry,
                    account=ChartOfAccounts.objects.get(company=self.company, code='119'),
                    description="Report à nouveau déficitaire",
                    debit_amount=abs(allocation.carried_forward_amount),
                    credit_amount=Decimal('0')
                )
        
        # Marquer l'affectation comme comptabilisée
        allocation.is_recorded = True
        allocation.recording_date = timezone.now()
        allocation.journal_entries = [allocation_entry.id]
        allocation.save()
        
        return allocation_entry
    
    def _create_liquidity_control(self, fiscal_year: FiscalYear, closure_procedure) -> ContinuityControl:
        """Contrôle de liquidité"""
        
        # Calculer le ratio de liquidité générale
        current_assets = self._get_account_class_balance('3', fiscal_year) + self._get_account_class_balance('4', fiscal_year) + self._get_account_class_balance('5', fiscal_year)
        current_liabilities = self._get_specific_accounts_balance(['40', '41', '42', '43', '44'], fiscal_year)
        
        liquidity_ratio = current_assets / current_liabilities if current_liabilities > 0 else Decimal('999')
        
        return ContinuityControl.objects.create(
            company=self.company,
            fiscal_year=fiscal_year,
            closure_procedure=closure_procedure,
            control_type='LIQUIDITY',
            control_name='Ratio de liquidité générale',
            description='Contrôle de la capacité à honorer les dettes à court terme',
            metric_name='CURRENT_RATIO',
            current_value=liquidity_ratio,
            threshold_value=Decimal('1.2'),
            critical_threshold=Decimal('1.0'),
            calculation_method='Actif circulant / Passif circulant',
            data_sources=['Balance générale']
        )
    
    def _create_solvency_control(self, fiscal_year: FiscalYear, closure_procedure) -> ContinuityControl:
        """Contrôle de solvabilité"""
        
        # Calculer le ratio d'autonomie financière
        equity = self._get_account_class_balance('1', fiscal_year)
        total_assets = sum([
            self._get_account_class_balance(str(i), fiscal_year) 
            for i in range(1, 6)
        ])
        
        autonomy_ratio = (equity / total_assets * 100) if total_assets > 0 else Decimal('0')
        
        return ContinuityControl.objects.create(
            company=self.company,
            fiscal_year=fiscal_year,
            closure_procedure=closure_procedure,
            control_type='SOLVENCY',
            control_name='Ratio d\'autonomie financière',
            description='Contrôle de l\'indépendance financière de l\'entreprise',
            metric_name='EQUITY_RATIO',
            current_value=autonomy_ratio,
            threshold_value=Decimal('30'),
            critical_threshold=Decimal('20'),
            calculation_method='Capitaux propres / Total actif × 100',
            data_sources=['Balance générale']
        )
    
    def _create_profitability_control(self, fiscal_year: FiscalYear, closure_procedure) -> ContinuityControl:
        """Contrôle de rentabilité"""
        
        # Calculer la marge nette
        net_result = self._calculate_net_result(fiscal_year)
        revenue = self._get_account_class_balance('7', fiscal_year)
        
        net_margin = (net_result / revenue * 100) if revenue > 0 else Decimal('0')
        
        return ContinuityControl.objects.create(
            company=self.company,
            fiscal_year=fiscal_year,
            closure_procedure=closure_procedure,
            control_type='PROFITABILITY',
            control_name='Marge nette',
            description='Contrôle de la rentabilité de l\'activité',
            metric_name='NET_MARGIN',
            current_value=net_margin,
            threshold_value=Decimal('3'),
            critical_threshold=Decimal('0'),
            calculation_method='Résultat net / Chiffre d\'affaires × 100',
            data_sources=['Compte de résultat']
        )
    
    def _create_cash_flow_control(self, fiscal_year: FiscalYear, closure_procedure) -> ContinuityControl:
        """Contrôle flux de trésorerie"""
        
        # Récupérer les données TAFIRE si disponibles
        from apps.financial_analysis.models import TAFIREStatement
        
        tafire = TAFIREStatement.objects.filter(
            company=self.company,
            fiscal_year=fiscal_year
        ).order_by('-calculation_date').first()
        
        if tafire:
            operating_cash_flow = tafire.operating_cash_surplus
        else:
            # Calcul simplifié si pas de TAFIRE
            operating_cash_flow = self._calculate_net_result(fiscal_year)  # Approximation
        
        return ContinuityControl.objects.create(
            company=self.company,
            fiscal_year=fiscal_year,
            closure_procedure=closure_procedure,
            control_type='CASH_FLOW',
            control_name='Flux de trésorerie d\'exploitation',
            description='Contrôle de la génération de trésorerie par l\'activité',
            metric_name='OPERATING_CASH_FLOW',
            current_value=operating_cash_flow,
            threshold_value=Decimal('0'),
            critical_threshold=Decimal('-500000'),
            calculation_method='Flux de trésorerie d\'exploitation (TAFIRE)',
            data_sources=['TAFIRE']
        )
    
    def _create_debt_covenant_control(self, fiscal_year: FiscalYear, closure_procedure) -> ContinuityControl:
        """Contrôle des covenants bancaires"""
        
        # Calculer le ratio d'endettement
        financial_debt = self._get_specific_accounts_balance(['16', '17'], fiscal_year)
        equity = self._get_account_class_balance('1', fiscal_year)
        
        debt_to_equity = (financial_debt / equity) if equity > 0 else Decimal('999')
        
        return ContinuityControl.objects.create(
            company=self.company,
            fiscal_year=fiscal_year,
            closure_procedure=closure_procedure,
            control_type='DEBT_COVENANT',
            control_name='Ratio d\'endettement',
            description='Contrôle du respect des covenants bancaires',
            metric_name='DEBT_TO_EQUITY',
            current_value=debt_to_equity,
            threshold_value=Decimal('2'),
            critical_threshold=Decimal('3'),
            calculation_method='Dettes financières / Capitaux propres',
            data_sources=['Balance générale']
        )
    
    def _create_going_concern_control(self, fiscal_year: FiscalYear, closure_procedure) -> ContinuityControl:
        """Contrôle global de continuité d'exploitation"""
        
        # Score global basé sur plusieurs critères
        liquidity_score = 25 if self._get_account_class_balance('5', fiscal_year) > 0 else 0
        profitability_score = 25 if self._calculate_net_result(fiscal_year) > 0 else 0
        equity_score = 25 if self._get_account_class_balance('1', fiscal_year) > 0 else 0
        activity_score = 25 if self._get_account_class_balance('7', fiscal_year) > 0 else 0
        
        global_score = liquidity_score + profitability_score + equity_score + activity_score
        
        return ContinuityControl.objects.create(
            company=self.company,
            fiscal_year=fiscal_year,
            closure_procedure=closure_procedure,
            control_type='GOING_CONCERN',
            control_name='Score global de continuité',
            description='Évaluation globale de la continuité d\'exploitation',
            metric_name='GOING_CONCERN_SCORE',
            current_value=Decimal(str(global_score)),
            threshold_value=Decimal('75'),
            critical_threshold=Decimal('50'),
            calculation_method='Score composite (liquidité + rentabilité + structure + activité)',
            data_sources=['Ensemble des états financiers']
        )
    
    def _get_account_class_balance(self, account_class: str, fiscal_year: FiscalYear) -> Decimal:
        """Récupère le solde d'une classe de comptes"""
        
        sql = """
        SELECT COALESCE(SUM(jel.debit_amount - jel.credit_amount), 0) as balance
        FROM accounting_journalentryline jel
        JOIN accounting_journalentry je ON jel.entry_id = je.id
        JOIN accounting_chartofaccounts ca ON jel.account_id = ca.id
        WHERE je.company_id = %s 
        AND je.fiscal_year_id = %s
        AND je.is_validated = true
        AND ca.account_class = %s
        """
        
        with connection.cursor() as cursor:
            cursor.execute(sql, [self.company.id, fiscal_year.id, account_class])
            row = cursor.fetchone()
            
            if row and row[0]:
                return abs(Decimal(str(row[0])))
            
            return Decimal('0')
    
    def _get_specific_accounts_balance(self, account_prefixes: List[str], fiscal_year: FiscalYear) -> Decimal:
        """Récupère le solde de comptes spécifiques"""
        
        placeholders = ','.join(['%s'] * len(account_prefixes))
        sql = f"""
        SELECT COALESCE(SUM(ABS(jel.debit_amount - jel.credit_amount)), 0) as balance
        FROM accounting_journalentryline jel
        JOIN accounting_journalentry je ON jel.entry_id = je.id
        JOIN accounting_chartofaccounts ca ON jel.account_id = ca.id
        WHERE je.company_id = %s 
        AND je.fiscal_year_id = %s
        AND je.is_validated = true
        AND ca.code SIMILAR TO '({"|".join(account_prefixes)})%'
        """
        
        with connection.cursor() as cursor:
            cursor.execute(sql, [self.company.id, fiscal_year.id])
            row = cursor.fetchone()
            
            if row and row[0]:
                return Decimal(str(row[0]))
            
            return Decimal('0')
    
    def validate_carry_forward_consistency(
        self, 
        closing_fiscal_year: FiscalYear,
        opening_fiscal_year: FiscalYear
    ) -> Dict[str, Any]:
        """
        Valide la cohérence des reports à-nouveaux
        """
        validation_result = {
            'is_valid': True,
            'errors': [],
            'warnings': [],
            'summary': {}
        }
        
        # Vérifier que tous les comptes de bilan ont un report
        balance_accounts = ChartOfAccounts.objects.filter(
            company=self.company,
            account_class__in=['1', '2', '3', '4', '5'],
            is_active=True
        )
        
        for account in balance_accounts:
            balance = account.get_balance(closing_fiscal_year)
            
            if abs(balance) > Decimal('0.01'):  # Seulement les soldes significatifs
                carry_forward = CarryForwardBalance.objects.filter(
                    company=self.company,
                    closing_fiscal_year=closing_fiscal_year,
                    opening_fiscal_year=opening_fiscal_year,
                    account=account
                ).first()
                
                if not carry_forward:
                    validation_result['errors'].append(
                        f"Aucun report trouvé pour le compte {account.code} (solde: {balance})"
                    )
                    validation_result['is_valid'] = False
        
        # Calculer le résumé
        carry_forwards = CarryForwardBalance.objects.filter(
            company=self.company,
            closing_fiscal_year=closing_fiscal_year,
            opening_fiscal_year=opening_fiscal_year
        )
        
        validation_result['summary'] = {
            'total_accounts': carry_forwards.count(),
            'total_debit': sum(cf.net_balance for cf in carry_forwards if cf.balance_side == 'DEBIT'),
            'total_credit': sum(cf.net_balance for cf in carry_forwards if cf.balance_side == 'CREDIT'),
            'validated_count': carry_forwards.filter(is_validated=True).count()
        }
        
        return validation_result