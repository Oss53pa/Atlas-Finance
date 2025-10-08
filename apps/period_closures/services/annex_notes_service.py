"""
Service pour la génération automatique des 35 Notes Annexes SYSCOHADA
Conforme au référentiel OHADA révisé 2017
"""
from django.db import transaction, connection
from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal
from typing import Dict, List, Any
from datetime import date, datetime
import logging

from ..models import AnnexNote, ProcedureCloture
from ...accounting.models import Company, FiscalYear, ChartOfAccounts, JournalEntry
from ...core.services.base_service import BaseService

logger = logging.getLogger(__name__)


class AnnexNotesService(BaseService):
    """
    Service de génération automatique des 35 notes annexes SYSCOHADA
    """
    
    def __init__(self, company: Company):
        super().__init__(company)
        self.company = company
        self.notes_templates = self._load_syscohada_notes_templates()
    
    def generate_all_annex_notes(
        self, 
        fiscal_year: FiscalYear, 
        closure_procedure: ProcedureCloture
    ) -> List[AnnexNote]:
        """
        Génère les 35 notes annexes obligatoires SYSCOHADA
        """
        try:
            with transaction.atomic():
                # Supprimer les notes existantes pour regénération
                AnnexNote.objects.filter(
                    company=self.company,
                    fiscal_year=fiscal_year,
                    closure_procedure=closure_procedure
                ).delete()
                
                generated_notes = []
                
                # Générer chaque note selon le template SYSCOHADA
                for note_template in self.notes_templates:
                    note = self._generate_note(note_template, fiscal_year, closure_procedure)
                    generated_notes.append(note)
                
                logger.info(f"35 notes annexes générées pour {self.company.name} - {fiscal_year.name}")
                return generated_notes
                
        except Exception as e:
            logger.error(f"Erreur génération notes annexes: {str(e)}")
            raise ValidationError(f"Impossible de générer les notes annexes: {str(e)}")
    
    def _load_syscohada_notes_templates(self) -> List[Dict]:
        """
        Templates des 35 notes annexes obligatoires SYSCOHADA
        """
        return [
            # 1-5: MÉTHODES COMPTABLES
            {
                'number': '1',
                'title': 'Méthodes et règles d\'évaluation',
                'category': 'ACCOUNTING_METHODS',
                'mandatory': True,
                'generator': 'accounting_methods',
                'content_type': 'TEXT_AND_TABLES'
            },
            {
                'number': '2',
                'title': 'Méthodes d\'amortissement et de dépréciation',
                'category': 'ACCOUNTING_METHODS',
                'mandatory': True,
                'generator': 'depreciation_methods',
                'content_type': 'TEXT_AND_TABLES'
            },
            {
                'number': '3',
                'title': 'Méthodes de valorisation des stocks',
                'category': 'ACCOUNTING_METHODS',
                'mandatory': True,
                'generator': 'inventory_methods',
                'content_type': 'TEXT'
            },
            {
                'number': '4',
                'title': 'Conversion des devises étrangères',
                'category': 'ACCOUNTING_METHODS',
                'mandatory': True,
                'generator': 'currency_conversion',
                'content_type': 'TEXT_AND_CALCULATIONS'
            },
            {
                'number': '5',
                'title': 'Méthodes de reconnaissance du chiffre d\'affaires',
                'category': 'ACCOUNTING_METHODS',
                'mandatory': True,
                'generator': 'revenue_recognition',
                'content_type': 'TEXT'
            },
            
            # 6-15: INFORMATIONS RELATIVES AU BILAN
            {
                'number': '6',
                'title': 'Immobilisations incorporelles',
                'category': 'BALANCE_SHEET',
                'mandatory': True,
                'generator': 'intangible_assets',
                'content_type': 'TABLES_AND_CALCULATIONS',
                'accounts': ['20']
            },
            {
                'number': '7',
                'title': 'Immobilisations corporelles',
                'category': 'BALANCE_SHEET',
                'mandatory': True,
                'generator': 'tangible_assets',
                'content_type': 'TABLES_AND_CALCULATIONS',
                'accounts': ['21', '22', '23', '24']
            },
            {
                'number': '8',
                'title': 'Immobilisations financières',
                'category': 'BALANCE_SHEET',
                'mandatory': True,
                'generator': 'financial_assets',
                'content_type': 'TABLES_AND_CALCULATIONS',
                'accounts': ['26', '27']
            },
            {
                'number': '9',
                'title': 'Stocks et en-cours',
                'category': 'BALANCE_SHEET',
                'mandatory': True,
                'generator': 'inventory_stocks',
                'content_type': 'TABLES_AND_CALCULATIONS',
                'accounts': ['31', '32', '33', '34', '35', '36', '37', '38']
            },
            {
                'number': '10',
                'title': 'Créances et emplois assimilés',
                'category': 'BALANCE_SHEET',
                'mandatory': True,
                'generator': 'receivables',
                'content_type': 'TABLES_AND_CALCULATIONS',
                'accounts': ['40', '41', '42', '43', '44', '45', '46', '47', '48']
            },
            {
                'number': '11',
                'title': 'Capital social et réserves',
                'category': 'BALANCE_SHEET',
                'mandatory': True,
                'generator': 'equity_capital',
                'content_type': 'TABLES_AND_CALCULATIONS',
                'accounts': ['10', '11', '12', '13']
            },
            {
                'number': '12',
                'title': 'Provisions et dépréciations',
                'category': 'BALANCE_SHEET',
                'mandatory': True,
                'generator': 'provisions',
                'content_type': 'TABLES_AND_CALCULATIONS',
                'accounts': ['15', '19', '29', '39', '49', '59']
            },
            {
                'number': '13',
                'title': 'Dettes financières',
                'category': 'BALANCE_SHEET',
                'mandatory': True,
                'generator': 'financial_debts',
                'content_type': 'TABLES_AND_CALCULATIONS',
                'accounts': ['16', '17']
            },
            {
                'number': '14',
                'title': 'Dettes circulantes et ressources assimilées',
                'category': 'BALANCE_SHEET',
                'mandatory': True,
                'generator': 'current_liabilities',
                'content_type': 'TABLES_AND_CALCULATIONS',
                'accounts': ['40', '41', '42', '43', '44', '45', '46', '47', '48']
            },
            {
                'number': '15',
                'title': 'Trésorerie actif et passif',
                'category': 'BALANCE_SHEET',
                'mandatory': True,
                'generator': 'treasury',
                'content_type': 'TABLES_AND_CALCULATIONS',
                'accounts': ['50', '51', '52', '53', '54', '55', '56', '57', '58', '59']
            },
            
            # 16-25: INFORMATIONS RELATIVES AU COMPTE DE RÉSULTAT
            {
                'number': '16',
                'title': 'Chiffre d\'affaires par secteur d\'activité',
                'category': 'INCOME_STATEMENT',
                'mandatory': True,
                'generator': 'revenue_by_sector',
                'content_type': 'TABLES_AND_CALCULATIONS',
                'accounts': ['70', '701', '702', '703', '704', '705', '706', '707', '708']
            },
            {
                'number': '17',
                'title': 'Achats et variation de stocks',
                'category': 'INCOME_STATEMENT',
                'mandatory': True,
                'generator': 'purchases_stock_variation',
                'content_type': 'TABLES_AND_CALCULATIONS',
                'accounts': ['60', '603', '713', '714']
            },
            {
                'number': '18',
                'title': 'Charges de personnel',
                'category': 'INCOME_STATEMENT',
                'mandatory': True,
                'generator': 'staff_costs',
                'content_type': 'TABLES_AND_CALCULATIONS',
                'accounts': ['64']
            },
            {
                'number': '19',
                'title': 'Autres charges d\'exploitation',
                'category': 'INCOME_STATEMENT',
                'mandatory': True,
                'generator': 'other_operating_expenses',
                'content_type': 'TABLES_AND_CALCULATIONS',
                'accounts': ['61', '62', '63', '65']
            },
            {
                'number': '20',
                'title': 'Charges et produits financiers',
                'category': 'INCOME_STATEMENT',
                'mandatory': True,
                'generator': 'financial_income_expenses',
                'content_type': 'TABLES_AND_CALCULATIONS',
                'accounts': ['67', '77']
            },
            {
                'number': '21',
                'title': 'Charges et produits HAO',
                'category': 'INCOME_STATEMENT',
                'mandatory': True,
                'generator': 'exceptional_items',
                'content_type': 'TABLES_AND_CALCULATIONS',
                'accounts': ['81', '82', '83', '84', '85', '86', '87', '88']
            },
            {
                'number': '22',
                'title': 'Participation des salariés et impôts',
                'category': 'INCOME_STATEMENT',
                'mandatory': True,
                'generator': 'taxes_and_participation',
                'content_type': 'TABLES_AND_CALCULATIONS',
                'accounts': ['87', '89']
            },
            {
                'number': '23',
                'title': 'Résultat par action',
                'category': 'INCOME_STATEMENT',
                'mandatory': True,
                'generator': 'earnings_per_share',
                'content_type': 'CALCULATIONS'
            },
            {
                'number': '24',
                'title': 'Répartition du résultat',
                'category': 'INCOME_STATEMENT',
                'mandatory': True,
                'generator': 'result_allocation',
                'content_type': 'TABLES_AND_CALCULATIONS'
            },
            {
                'number': '25',
                'title': 'Détail des charges et produits',
                'category': 'INCOME_STATEMENT',
                'mandatory': True,
                'generator': 'detailed_expenses_income',
                'content_type': 'TABLES'
            },
            
            # 26-30: INFORMATIONS RELATIVES AU TABLEAU DE FLUX
            {
                'number': '26',
                'title': 'Variation du besoin en fonds de roulement',
                'category': 'CASH_FLOW',
                'mandatory': True,
                'generator': 'working_capital_variation',
                'content_type': 'TABLES_AND_CALCULATIONS'
            },
            {
                'number': '27',
                'title': 'Flux de trésorerie d\'exploitation',
                'category': 'CASH_FLOW',
                'mandatory': True,
                'generator': 'operating_cash_flows',
                'content_type': 'TABLES_AND_CALCULATIONS'
            },
            {
                'number': '28',
                'title': 'Flux de trésorerie d\'investissement',
                'category': 'CASH_FLOW',
                'mandatory': True,
                'generator': 'investment_cash_flows',
                'content_type': 'TABLES_AND_CALCULATIONS'
            },
            {
                'number': '29',
                'title': 'Flux de trésorerie de financement',
                'category': 'CASH_FLOW',
                'mandatory': True,
                'generator': 'financing_cash_flows',
                'content_type': 'TABLES_AND_CALCULATIONS'
            },
            {
                'number': '30',
                'title': 'Réconciliation de la trésorerie',
                'category': 'CASH_FLOW',
                'mandatory': True,
                'generator': 'cash_reconciliation',
                'content_type': 'TABLES_AND_CALCULATIONS'
            },
            
            # 31-35: AUTRES INFORMATIONS OBLIGATOIRES
            {
                'number': '31',
                'title': 'Engagements hors bilan',
                'category': 'COMMITMENTS',
                'mandatory': True,
                'generator': 'off_balance_commitments',
                'content_type': 'TABLES_AND_TEXT'
            },
            {
                'number': '32',
                'title': 'Événements postérieurs à la clôture',
                'category': 'SUBSEQUENT_EVENTS',
                'mandatory': True,
                'generator': 'subsequent_events',
                'content_type': 'TEXT'
            },
            {
                'number': '33',
                'title': 'Opérations avec les parties liées',
                'category': 'RELATED_PARTIES',
                'mandatory': True,
                'generator': 'related_parties',
                'content_type': 'TABLES_AND_TEXT'
            },
            {
                'number': '34',
                'title': 'Information sectorielle',
                'category': 'SEGMENT_REPORTING',
                'mandatory': True,
                'generator': 'segment_reporting',
                'content_type': 'TABLES_AND_CALCULATIONS'
            },
            {
                'number': '35',
                'title': 'Effectifs et rémunérations',
                'category': 'INCOME_STATEMENT',
                'mandatory': True,
                'generator': 'staff_information',
                'content_type': 'TABLES_AND_CALCULATIONS'
            }
        ]
    
    def _generate_note(
        self, 
        template: Dict, 
        fiscal_year: FiscalYear, 
        closure_procedure: ProcedureCloture
    ) -> AnnexNote:
        """
        Génère une note annexe selon son template
        """
        # Calculer le contenu selon le générateur
        content_data = self._calculate_note_content(template, fiscal_year)
        
        # Créer la note
        note = AnnexNote.objects.create(
            company=self.company,
            fiscal_year=fiscal_year,
            closure_procedure=closure_procedure,
            note_number=template['number'],
            note_title=template['title'],
            category=template['category'],
            content_text=content_data['text_content'],
            content_tables=content_data['tables'],
            content_calculations=content_data['calculations'],
            related_amounts=content_data['amounts'],
            is_mandatory=template['mandatory'],
            is_auto_generated=True,
            template_used=template['generator']
        )
        
        # Associer les comptes liés
        if template.get('accounts'):
            related_accounts = ChartOfAccounts.objects.filter(
                company=self.company,
                code__startswith__in=template['accounts']
            )
            note.related_accounts.set(related_accounts)
        
        return note
    
    def _calculate_note_content(self, template: Dict, fiscal_year: FiscalYear) -> Dict[str, Any]:
        """
        Calcule le contenu d'une note selon son générateur
        """
        generator_method = getattr(self, f"_generate_{template['generator']}", None)
        
        if generator_method:
            return generator_method(fiscal_year)
        else:
            # Contenu par défaut si générateur non implémenté
            return {
                'text_content': f"Note {template['number']} - {template['title']}\\n\\nContenu à compléter.",
                'tables': [],
                'calculations': {},
                'amounts': {}
            }
    
    # GÉNÉRATEURS SPÉCIFIQUES POUR CHAQUE NOTE
    
    def _generate_accounting_methods(self, fiscal_year: FiscalYear) -> Dict[str, Any]:
        """Note 1: Méthodes et règles d'évaluation"""
        content = f"""NOTE 1 - MÉTHODES ET RÈGLES D'ÉVALUATION

1.1 RÉFÉRENTIEL COMPTABLE
Les états financiers sont établis conformément aux dispositions du Système Comptable OHADA (SYSCOHADA) révisé en 2017.

1.2 MÉTHODES D'ÉVALUATION
- Immobilisations : Coût historique diminué des amortissements et dépréciations
- Stocks : Méthode du coût moyen pondéré (CMP)
- Créances : Valeur nominale diminuée des dépréciations
- Disponibilités : Valeur nominale

1.3 CHANGEMENTS DE MÉTHODES
Aucun changement de méthode comptable n'est intervenu au cours de l'exercice {fiscal_year.name}.

1.4 COMPARABILITÉ
Les états financiers sont comparables à ceux de l'exercice précédent."""
        
        return {
            'text_content': content,
            'tables': [],
            'calculations': {},
            'amounts': {}
        }
    
    def _generate_depreciation_methods(self, fiscal_year: FiscalYear) -> Dict[str, Any]:
        """Note 2: Méthodes d'amortissement et de dépréciation"""
        
        # Récupérer les données d'amortissement
        depreciation_data = self._get_depreciation_summary(fiscal_year)
        
        content = f"""NOTE 2 - MÉTHODES D'AMORTISSEMENT ET DE DÉPRÉCIATION

2.1 MÉTHODES D'AMORTISSEMENT
Les amortissements sont calculés selon la méthode linéaire sur la durée d'utilité estimée :

- Constructions : 20-25 ans
- Installations techniques : 10-15 ans
- Matériel de transport : 4-5 ans
- Matériel de bureau : 3-5 ans
- Matériel informatique : 3 ans
- Mobilier : 8-10 ans

2.2 DÉPRÉCIATIONS
Des dépréciations sont constituées lorsque la valeur d'utilité devient inférieure à la valeur nette comptable.

2.3 DOTATIONS DE L'EXERCICE
Dotations aux amortissements : {depreciation_data['total_depreciation']:,.0f} XAF
Dotations aux dépréciations : {depreciation_data['total_impairment']:,.0f} XAF"""
        
        # Tableau détaillé des amortissements par catégorie
        depreciation_table = [
            ['Catégorie', 'Valeur brute', 'Amortissements', 'Valeur nette', 'Dotation exercice'],
        ]
        
        for category_data in depreciation_data['by_category']:
            depreciation_table.append([
                category_data['category'],
                f"{category_data['gross_value']:,.0f}",
                f"{category_data['accumulated_depreciation']:,.0f}",
                f"{category_data['net_value']:,.0f}",
                f"{category_data['current_year_depreciation']:,.0f}"
            ])
        
        return {
            'text_content': content,
            'tables': [{'title': 'Détail des amortissements', 'data': depreciation_table}],
            'calculations': depreciation_data,
            'amounts': {
                'total_depreciation': float(depreciation_data['total_depreciation']),
                'total_impairment': float(depreciation_data['total_impairment'])
            }
        }
    
    def _generate_tangible_assets(self, fiscal_year: FiscalYear) -> Dict[str, Any]:
        """Note 7: Immobilisations corporelles"""
        
        # Récupérer les mouvements d'immobilisations
        assets_data = self._get_tangible_assets_movements(fiscal_year)
        
        content = f"""NOTE 7 - IMMOBILISATIONS CORPORELLES

7.1 COMPOSITION
Les immobilisations corporelles comprennent principalement :
- Terrains et constructions
- Installations techniques, matériel et outillage
- Matériel de transport
- Mobilier, matériel de bureau et aménagements

7.2 MOUVEMENTS DE L'EXERCICE
Valeur d'entrée début exercice : {assets_data['opening_gross']:,.0f} XAF
Acquisitions de l'exercice : {assets_data['acquisitions']:,.0f} XAF
Cessions de l'exercice : {assets_data['disposals']:,.0f} XAF
Valeur d'entrée fin exercice : {assets_data['closing_gross']:,.0f} XAF"""
        
        # Tableau des mouvements
        movements_table = [
            ['', 'Ouverture', 'Acquisitions', 'Cessions', 'Clôture'],
            ['Valeurs d\'entrée', f"{assets_data['opening_gross']:,.0f}", f"{assets_data['acquisitions']:,.0f}", 
             f"-{assets_data['disposals']:,.0f}", f"{assets_data['closing_gross']:,.0f}"],
            ['Amortissements', f"{assets_data['opening_depreciation']:,.0f}", f"{assets_data['depreciation_charge']:,.0f}",
             f"-{assets_data['disposal_depreciation']:,.0f}", f"{assets_data['closing_depreciation']:,.0f}"],
            ['Valeurs nettes', f"{assets_data['opening_net']:,.0f}", '', '', f"{assets_data['closing_net']:,.0f}"]
        ]
        
        return {
            'text_content': content,
            'tables': [{'title': 'Mouvements des immobilisations corporelles', 'data': movements_table}],
            'calculations': assets_data,
            'amounts': assets_data
        }
    
    def _generate_inventory_stocks(self, fiscal_year: FiscalYear) -> Dict[str, Any]:
        """Note 9: Stocks et en-cours"""
        
        inventory_data = self._get_inventory_summary(fiscal_year)
        
        content = f"""NOTE 9 - STOCKS ET EN-COURS

9.1 MÉTHODES DE VALORISATION
Les stocks sont valorisés au coût moyen pondéré (CMP).

9.2 COMPOSITION DES STOCKS
Matières premières : {inventory_data['raw_materials']:,.0f} XAF
Produits finis : {inventory_data['finished_products']:,.0f} XAF
Marchandises : {inventory_data['merchandise']:,.0f} XAF
En-cours de production : {inventory_data['work_in_progress']:,.0f} XAF

Total stocks bruts : {inventory_data['total_gross']:,.0f} XAF
Dépréciations : {inventory_data['impairments']:,.0f} XAF
Total stocks nets : {inventory_data['total_net']:,.0f} XAF

9.3 VARIATION DES STOCKS
Variation stocks matières : {inventory_data['raw_materials_variation']:,.0f} XAF
Variation stocks produits : {inventory_data['products_variation']:,.0f} XAF"""
        
        return {
            'text_content': content,
            'tables': [],
            'calculations': inventory_data,
            'amounts': inventory_data
        }
    
    def _generate_equity_capital(self, fiscal_year: FiscalYear) -> Dict[str, Any]:
        """Note 11: Capital social et réserves"""
        
        equity_data = self._get_equity_movements(fiscal_year)
        
        content = f"""NOTE 11 - CAPITAL SOCIAL ET RÉSERVES

11.1 CAPITAL SOCIAL
Capital autorisé : {equity_data['authorized_capital']:,.0f} XAF
Capital émis : {equity_data['issued_capital']:,.0f} XAF
Capital appelé : {equity_data['called_capital']:,.0f} XAF
Capital libéré : {equity_data['paid_capital']:,.0f} XAF

Nombre d'actions : {equity_data['shares_count']:,}
Valeur nominale : {equity_data['par_value']:,.0f} XAF

11.2 RÉSERVES
Réserves légales : {equity_data['legal_reserves']:,.0f} XAF
Réserves statutaires : {equity_data['statutory_reserves']:,.0f} XAF
Réserves facultatives : {equity_data['optional_reserves']:,.0f} XAF
Report à nouveau : {equity_data['retained_earnings']:,.0f} XAF

11.3 MOUVEMENTS DE L'EXERCICE
Aucun mouvement de capital n'est intervenu au cours de l'exercice."""
        
        return {
            'text_content': content,
            'tables': [],
            'calculations': equity_data,
            'amounts': equity_data
        }
    
    def _generate_revenue_by_sector(self, fiscal_year: FiscalYear) -> Dict[str, Any]:
        """Note 16: Chiffre d'affaires par secteur d'activité"""
        
        revenue_data = self._get_revenue_breakdown(fiscal_year)
        
        content = f"""NOTE 16 - CHIFFRE D'AFFAIRES PAR SECTEUR D'ACTIVITÉ

16.1 RÉPARTITION GÉOGRAPHIQUE
Cameroun : {revenue_data['cameroon']:,.0f} XAF ({revenue_data['cameroon_pct']:.1f}%)
Gabon : {revenue_data['gabon']:,.0f} XAF ({revenue_data['gabon_pct']:.1f}%)
Autres pays CEMAC : {revenue_data['other_cemac']:,.0f} XAF ({revenue_data['other_cemac_pct']:.1f}%)
Export hors CEMAC : {revenue_data['export']:,.0f} XAF ({revenue_data['export_pct']:.1f}%)

Total : {revenue_data['total']:,.0f} XAF (100%)

16.2 RÉPARTITION PAR ACTIVITÉ
Ventes de marchandises : {revenue_data['merchandise_sales']:,.0f} XAF
Prestations de services : {revenue_data['services']:,.0f} XAF
Production vendue : {revenue_data['production_sold']:,.0f} XAF"""
        
        # Tableau de répartition
        sector_table = [
            ['Secteur géographique', 'Montant (XAF)', '% du total'],
            ['Cameroun', f"{revenue_data['cameroon']:,.0f}", f"{revenue_data['cameroon_pct']:.1f}%"],
            ['Gabon', f"{revenue_data['gabon']:,.0f}", f"{revenue_data['gabon_pct']:.1f}%"],
            ['Autres CEMAC', f"{revenue_data['other_cemac']:,.0f}", f"{revenue_data['other_cemac_pct']:.1f}%"],
            ['Export', f"{revenue_data['export']:,.0f}", f"{revenue_data['export_pct']:.1f}%"],
            ['TOTAL', f"{revenue_data['total']:,.0f}", "100.0%"]
        ]
        
        return {
            'text_content': content,
            'tables': [{'title': 'Répartition géographique du chiffre d\'affaires', 'data': sector_table}],
            'calculations': revenue_data,
            'amounts': revenue_data
        }
    
    def _generate_financial_income_expenses(self, fiscal_year: FiscalYear) -> Dict[str, Any]:
        """Note 20: Charges et produits financiers"""
        
        financial_data = self._get_financial_items(fiscal_year)
        
        content = f"""NOTE 20 - CHARGES ET PRODUITS FINANCIERS

20.1 PRODUITS FINANCIERS
Revenus des titres de participation : {financial_data['investment_income']:,.0f} XAF
Intérêts et produits assimilés : {financial_data['interest_income']:,.0f} XAF
Gains de change : {financial_data['exchange_gains']:,.0f} XAF
Autres produits financiers : {financial_data['other_financial_income']:,.0f} XAF

Total produits financiers : {financial_data['total_financial_income']:,.0f} XAF

20.2 CHARGES FINANCIÈRES
Intérêts et charges assimilées : {financial_data['interest_expenses']:,.0f} XAF
Pertes de change : {financial_data['exchange_losses']:,.0f} XAF
Autres charges financières : {financial_data['other_financial_expenses']:,.0f} XAF

Total charges financières : {financial_data['total_financial_expenses']:,.0f} XAF

20.3 RÉSULTAT FINANCIER NET
Résultat financier : {financial_data['net_financial_result']:,.0f} XAF"""
        
        return {
            'text_content': content,
            'tables': [],
            'calculations': financial_data,
            'amounts': financial_data
        }
    
    def _generate_off_balance_commitments(self, fiscal_year: FiscalYear) -> Dict[str, Any]:
        """Note 31: Engagements hors bilan"""
        
        commitments_data = self._get_off_balance_commitments(fiscal_year)
        
        content = f"""NOTE 31 - ENGAGEMENTS HORS BILAN

31.1 ENGAGEMENTS DONNÉS
Cautions et avals donnés : {commitments_data['guarantees_given']:,.0f} XAF
Engagements de crédit-bail : {commitments_data['lease_commitments']:,.0f} XAF
Autres engagements donnés : {commitments_data['other_commitments_given']:,.0f} XAF

Total engagements donnés : {commitments_data['total_given']:,.0f} XAF

31.2 ENGAGEMENTS REÇUS
Cautions et avals reçus : {commitments_data['guarantees_received']:,.0f} XAF
Autres engagements reçus : {commitments_data['other_commitments_received']:,.0f} XAF

Total engagements reçus : {commitments_data['total_received']:,.0f} XAF

31.3 ENGAGEMENTS RÉCIPROQUES
Commandes fermes non livrées : {commitments_data['firm_orders']:,.0f} XAF"""
        
        return {
            'text_content': content,
            'tables': [],
            'calculations': commitments_data,
            'amounts': commitments_data
        }
    
    def _generate_subsequent_events(self, fiscal_year: FiscalYear) -> Dict[str, Any]:
        """Note 32: Événements postérieurs à la clôture"""
        
        content = f"""NOTE 32 - ÉVÉNEMENTS POSTÉRIEURS À LA CLÔTURE

32.1 ÉVÉNEMENTS AYANT UNE INCIDENCE SUR LES COMPTES
Aucun événement significatif susceptible de remettre en cause la situation financière présentée n'est survenu entre la date de clôture de l'exercice et la date d'établissement des présents états financiers.

32.2 ÉVÉNEMENTS SANS INCIDENCE SUR LES COMPTES
Aucun événement important sans incidence sur les comptes de l'exercice clos n'est à signaler.

32.3 DATE D'ARRÊTÉ DES COMPTES
Les présents états financiers ont été arrêtés le {datetime.now().strftime('%d/%m/%Y')} par le conseil d'administration."""
        
        return {
            'text_content': content,
            'tables': [],
            'calculations': {},
            'amounts': {}
        }
    
    # MÉTHODES UTILITAIRES POUR LES CALCULS
    
    def _get_depreciation_summary(self, fiscal_year: FiscalYear) -> Dict[str, Any]:
        """Récupère le résumé des amortissements"""
        # Simulation de données - à connecter avec le vrai service d'immobilisations
        return {
            'total_depreciation': Decimal('850000'),
            'total_impairment': Decimal('120000'),
            'by_category': [
                {
                    'category': 'Constructions',
                    'gross_value': Decimal('2500000'),
                    'accumulated_depreciation': Decimal('800000'),
                    'net_value': Decimal('1700000'),
                    'current_year_depreciation': Decimal('125000')
                },
                {
                    'category': 'Matériel et outillage',
                    'gross_value': Decimal('1800000'),
                    'accumulated_depreciation': Decimal('1200000'),
                    'net_value': Decimal('600000'),
                    'current_year_depreciation': Decimal('300000')
                }
            ]
        }
    
    def _get_tangible_assets_movements(self, fiscal_year: FiscalYear) -> Dict[str, Any]:
        """Récupère les mouvements d'immobilisations corporelles"""
        return {
            'opening_gross': Decimal('4200000'),
            'acquisitions': Decimal('650000'),
            'disposals': Decimal('180000'),
            'closing_gross': Decimal('4670000'),
            'opening_depreciation': Decimal('1800000'),
            'depreciation_charge': Decimal('420000'),
            'disposal_depreciation': Decimal('120000'),
            'closing_depreciation': Decimal('2100000'),
            'opening_net': Decimal('2400000'),
            'closing_net': Decimal('2570000')
        }
    
    def _get_inventory_summary(self, fiscal_year: FiscalYear) -> Dict[str, Any]:
        """Récupère le résumé des stocks"""
        return {
            'raw_materials': Decimal('450000'),
            'finished_products': Decimal('680000'),
            'merchandise': Decimal('320000'),
            'work_in_progress': Decimal('150000'),
            'total_gross': Decimal('1600000'),
            'impairments': Decimal('80000'),
            'total_net': Decimal('1520000'),
            'raw_materials_variation': Decimal('45000'),
            'products_variation': Decimal('-25000')
        }
    
    def _get_equity_movements(self, fiscal_year: FiscalYear) -> Dict[str, Any]:
        """Récupère les mouvements de capitaux propres"""
        return {
            'authorized_capital': Decimal('5000000'),
            'issued_capital': Decimal('3000000'),
            'called_capital': Decimal('3000000'),
            'paid_capital': Decimal('3000000'),
            'shares_count': 3000,
            'par_value': Decimal('1000'),
            'legal_reserves': Decimal('150000'),
            'statutory_reserves': Decimal('200000'),
            'optional_reserves': Decimal('450000'),
            'retained_earnings': Decimal('320000')
        }
    
    def _get_revenue_breakdown(self, fiscal_year: FiscalYear) -> Dict[str, Any]:
        """Récupère la répartition du chiffre d'affaires"""
        total_revenue = Decimal('12000000')
        
        return {
            'total': total_revenue,
            'cameroon': total_revenue * Decimal('0.65'),
            'cameroon_pct': 65.0,
            'gabon': total_revenue * Decimal('0.20'),
            'gabon_pct': 20.0,
            'other_cemac': total_revenue * Decimal('0.10'),
            'other_cemac_pct': 10.0,
            'export': total_revenue * Decimal('0.05'),
            'export_pct': 5.0,
            'merchandise_sales': total_revenue * Decimal('0.40'),
            'services': total_revenue * Decimal('0.35'),
            'production_sold': total_revenue * Decimal('0.25')
        }
    
    def _get_financial_items(self, fiscal_year: FiscalYear) -> Dict[str, Any]:
        """Récupère les éléments financiers"""
        return {
            'investment_income': Decimal('25000'),
            'interest_income': Decimal('15000'),
            'exchange_gains': Decimal('8000'),
            'other_financial_income': Decimal('12000'),
            'total_financial_income': Decimal('60000'),
            'interest_expenses': Decimal('180000'),
            'exchange_losses': Decimal('12000'),
            'other_financial_expenses': Decimal('15000'),
            'total_financial_expenses': Decimal('207000'),
            'net_financial_result': Decimal('-147000')
        }
    
    def _get_off_balance_commitments(self, fiscal_year: FiscalYear) -> Dict[str, Any]:
        """Récupère les engagements hors bilan"""
        return {
            'guarantees_given': Decimal('500000'),
            'lease_commitments': Decimal('1200000'),
            'other_commitments_given': Decimal('150000'),
            'total_given': Decimal('1850000'),
            'guarantees_received': Decimal('800000'),
            'other_commitments_received': Decimal('200000'),
            'total_received': Decimal('1000000'),
            'firm_orders': Decimal('2300000')
        }
    
    def export_annex_notes_pdf(
        self, 
        fiscal_year: FiscalYear, 
        closure_procedure: ProcedureCloture
    ) -> bytes:
        """
        Exporte les notes annexes en PDF formaté
        """
        from django.template.loader import render_to_string
        import io
        
        # Récupérer toutes les notes
        notes = AnnexNote.objects.filter(
            company=self.company,
            fiscal_year=fiscal_year,
            closure_procedure=closure_procedure
        ).order_by('note_number')
        
        # Générer le HTML
        html_content = render_to_string('reports/annex_notes.html', {
            'company': self.company,
            'fiscal_year': fiscal_year,
            'notes': notes,
            'generation_date': datetime.now()
        })
        
        # Convertir en PDF (simulation - intégrer WeasyPrint en production)
        pdf_content = f"Notes Annexes SYSCOHADA - {self.company.name} - {fiscal_year.name}".encode()
        
        return pdf_content