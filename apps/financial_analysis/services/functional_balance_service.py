"""
Service pour le Bilan Fonctionnel SYSCOHADA (EXF-AF-003)
Retraitement fonctionnel du bilan comptable selon normes OHADA
"""
from django.db import transaction, connection
from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, List, Optional, Any
from datetime import date, datetime
import logging

from ..models import FunctionalBalanceSheet, TAFIREStatement
from ...core.models import Societe, Exercice
from ...core.services.base_service import BaseService
from ...accounting.models import CompteComptable, LigneEcriture, Ecriture

logger = logging.getLogger(__name__)


class FunctionalBalanceService(BaseService):
    """
    Service pour le calcul et l'analyse du bilan fonctionnel SYSCOHADA
    """
    
    def __init__(self, societe: Societe):
        super().__init__(societe)
        self.societe = societe
        
        # Configuration des comptes pour retraitement fonctionnel
        self.compte_mapping = {
            # Emplois stables
            'immobilisations_corporelles': ['21', '22', '23', '24'],
            'immobilisations_incorporelles': ['20'],
            'immobilisations_financieres': ['26', '27'],
            'charges_repartir': ['481'],
            
            # Ressources stables
            'capitaux_propres': ['10', '11', '12', '13'],
            'amortissements': ['28'],
            'provisions': ['29', '15', '19'],
            'dettes_financieres': ['16', '17'],
            'cbc_passif': ['519', '559'],  # Concours bancaires courants
            
            # Actif circulant d'exploitation
            'stocks_exploitation': ['31', '32', '33', '34', '35', '36', '37', '38'],
            'creances_clients': ['411', '416'],
            'autres_creances_exploitation': ['4086', '4456', '4457', '4458'],
            'charges_constatees_avance_exp': ['4091'],
            
            # Passif circulant d'exploitation
            'dettes_fournisseurs': ['401', '408'],
            'dettes_fiscales_sociales': ['43', '44'],
            'autres_dettes_exploitation': ['4017', '4456'],
            'produits_constates_avance_exp': ['4771'],
            
            # Actif circulant hors exploitation
            'autres_creances_he': ['45', '46', '47', '48'],
            'vmp': ['50', '503'],  # Valeurs mobilières de placement
            
            # Passif circulant hors exploitation
            'autres_dettes_he': ['45', '46', '47', '48'],
            'dividendes_payer': ['457'],
            
            # Trésorerie
            'disponibilites': ['51', '52', '53', '54', '58'],
        }
    
    def calculer_bilan_fonctionnel(
        self, 
        exercice: Exercice, 
        date_arret: Optional[date] = None,
        force_recalcul: bool = False
    ) -> FunctionalBalanceSheet:
        """
        Calcule le bilan fonctionnel pour un exercice donné
        """
        try:
            with transaction.atomic():
                if not date_arret:
                    date_arret = exercice.date_fin
                
                # Vérifier si un bilan fonctionnel existe déjà
                if not force_recalcul:
                    bilan_existant = FunctionalBalanceSheet.objects.filter(
                        company=self.societe,
                        fiscal_year=exercice,
                        statement_date=date_arret
                    ).first()
                    
                    if bilan_existant:
                        return bilan_existant
                
                # Créer le bilan fonctionnel
                bilan_fonctionnel = FunctionalBalanceSheet(
                    company=self.societe,
                    fiscal_year=exercice,
                    statement_date=date_arret
                )
                
                # Calculer les composantes
                self._calculer_emplois_stables(bilan_fonctionnel, date_arret)
                self._calculer_ressources_stables(bilan_fonctionnel, date_arret)
                self._calculer_actif_circulant_exploitation(bilan_fonctionnel, date_arret)
                self._calculer_passif_circulant_exploitation(bilan_fonctionnel, date_arret)
                self._calculer_elements_hors_exploitation(bilan_fonctionnel, date_arret)
                self._calculer_tresorerie(bilan_fonctionnel, date_arret)
                self._calculer_chiffre_affaires_reference(bilan_fonctionnel, exercice)
                
                # Sauvegarder (les calculs automatiques se feront dans save())
                bilan_fonctionnel.save()
                
                logger.info(f"Bilan fonctionnel calculé pour {self.societe.raison_sociale} - {date_arret}")
                return bilan_fonctionnel
                
        except Exception as e:
            logger.error(f"Erreur calcul bilan fonctionnel: {str(e)}")
            raise ValidationError(f"Impossible de calculer le bilan fonctionnel: {str(e)}")
    
    def _calculer_emplois_stables(self, bilan: FunctionalBalanceSheet, date_arret: date):
        """Calcule les emplois stables"""
        
        # Actif immobilisé brut (avant amortissements)
        immobilisations_brut = Decimal('0')
        
        # Immobilisations corporelles et incorporelles (valeur brute)
        for prefix in ['20', '21', '22', '23', '24']:
            immobilisations_brut += self._solde_comptes_brut(prefix, date_arret)
        
        # Immobilisations financières
        for prefix in ['26', '27']:
            immobilisations_brut += self._solde_comptes_brut(prefix, date_arret)
        
        bilan.gross_fixed_assets = immobilisations_brut
        
        # Charges à répartir
        bilan.deferred_charges = self._solde_comptes_a_date(['481'], date_arret)
    
    def _calculer_ressources_stables(self, bilan: FunctionalBalanceSheet, date_arret: date):
        """Calcule les ressources stables"""
        
        # Capitaux propres
        bilan.equity_capital = self._solde_comptes_a_date(['10', '11', '12', '13'], date_arret)
        
        # Amortissements et provisions (total)
        amortissements = self._solde_comptes_a_date(['28'], date_arret)  # Amortissements
        provisions = self._solde_comptes_a_date(['15', '19', '29'], date_arret)  # Provisions
        bilan.depreciation_provisions_total = amortissements + provisions
        
        # Dettes financières (hors CBC)
        dettes_financieres = self._solde_comptes_a_date(['16', '17'], date_arret)
        # Exclure les concours bancaires courants qui sont en trésorerie passive
        bilan.financial_debts_long_term = dettes_financieres
    
    def _calculer_actif_circulant_exploitation(self, bilan: FunctionalBalanceSheet, date_arret: date):
        """Calcule l'actif circulant d'exploitation (ACE)"""
        
        # Stocks d'exploitation
        bilan.operating_inventory = self._solde_comptes_a_date(['31', '32', '33', '34', '35', '36', '37', '38'], date_arret)
        
        # Créances d'exploitation
        creances_clients = self._solde_comptes_a_date(['411', '416'], date_arret)
        autres_creances_exp = self._solde_comptes_a_date(['4086', '4456', '4457', '4458'], date_arret)
        bilan.operating_receivables = creances_clients + autres_creances_exp
        
        # Charges constatées d'avance exploitation
        bilan.operating_prepaid_expenses = self._solde_comptes_a_date(['4091'], date_arret)
    
    def _calculer_passif_circulant_exploitation(self, bilan: FunctionalBalanceSheet, date_arret: date):
        """Calcule le passif circulant d'exploitation (PCE)"""
        
        # Dettes d'exploitation
        dettes_fournisseurs = self._solde_comptes_a_date(['401', '408'], date_arret)
        dettes_fiscales_sociales = self._solde_comptes_a_date(['43', '44'], date_arret)
        autres_dettes_exp = self._solde_comptes_a_date(['4017', '4456'], date_arret)
        bilan.operating_payables = dettes_fournisseurs + dettes_fiscales_sociales + autres_dettes_exp
        
        # Produits constatés d'avance exploitation
        bilan.operating_deferred_income = self._solde_comptes_a_date(['4771'], date_arret)
    
    def _calculer_elements_hors_exploitation(self, bilan: FunctionalBalanceSheet, date_arret: date):
        """Calcule les éléments hors exploitation"""
        
        # Actif circulant hors exploitation
        autres_creances_he = self._solde_comptes_a_date(['45', '46', '47', '48'], date_arret)
        vmp = self._solde_comptes_a_date(['50', '503'], date_arret)
        bilan.non_operating_current_assets = autres_creances_he + vmp
        
        # Passif circulant hors exploitation
        autres_dettes_he = self._solde_comptes_a_date(['45', '46', '47', '48'], date_arret)
        dividendes_a_payer = self._solde_comptes_a_date(['457'], date_arret)
        bilan.non_operating_current_liabilities = autres_dettes_he + dividendes_a_payer
    
    def _calculer_tresorerie(self, bilan: FunctionalBalanceSheet, date_arret: date):
        """Calcule la trésorerie active et passive"""
        
        # Trésorerie active (disponibilités)
        bilan.active_treasury = self._solde_comptes_a_date(['51', '52', '53', '54', '58'], date_arret)
        
        # Trésorerie passive (concours bancaires courants)
        bilan.passive_treasury = self._solde_comptes_a_date(['519', '559'], date_arret)
    
    def _calculer_chiffre_affaires_reference(self, bilan: FunctionalBalanceSheet, exercice: Exercice):
        """Calcule le CA de référence pour les ratios"""
        ca = LigneEcriture.objects.filter(
            ecriture__societe=self.societe,
            ecriture__date_ecriture__range=[exercice.date_debut, exercice.date_fin],
            ecriture__statut='VALIDEE',
            compte__numero__startswith='70',  # Ventes
            sens='CREDIT'
        ).aggregate(total=models.Sum('montant'))['total'] or Decimal('0')
        
        bilan.revenue_base = ca
    
    def _solde_comptes_a_date(self, prefixes: List[str], date_arret: date) -> Decimal:
        """Calcule le solde des comptes à une date donnée"""
        total = Decimal('0')
        
        for prefix in prefixes:
            solde = LigneEcriture.objects.filter(
                ecriture__societe=self.societe,
                ecriture__date_ecriture__lte=date_arret,
                ecriture__statut='VALIDEE',
                compte__numero__startswith=prefix
            ).aggregate(
                solde=models.Sum(
                    models.Case(
                        models.When(sens='DEBIT', then='montant'),
                        models.When(sens='CREDIT', then=models.F('montant') * -1),
                        default=0
                    )
                )
            )['solde'] or Decimal('0')
            
            # Prendre valeur absolue pour les calculs fonctionnels
            total += abs(solde)
        
        return total
    
    def _solde_comptes_brut(self, prefix: str, date_arret: date) -> Decimal:
        """Calcule la valeur brute des immobilisations (avant amortissements)"""
        # Pour les immobilisations, on veut la valeur brute (avant amortissements)
        solde_brut = LigneEcriture.objects.filter(
            ecriture__societe=self.societe,
            ecriture__date_ecriture__lte=date_arret,
            ecriture__statut='VALIDEE',
            compte__numero__startswith=prefix,
            sens='DEBIT'  # Seulement les débits pour valeur d'acquisition
        ).aggregate(total=models.Sum('montant'))['total'] or Decimal('0')
        
        return solde_brut
    
    def analyser_equilibre_fonctionnel(self, bilan: FunctionalBalanceSheet) -> Dict[str, Any]:
        """
        Analyse l'équilibre financier fonctionnel
        """
        analyse = {
            'equilibre_financier': {},
            'structure_financiere': {},
            'gestion_bfr': {},
            'alertes': [],
            'recommandations': [],
            'ratios_cles': {},
        }
        
        # 1. Analyse de l'équilibre financier
        frng = bilan.working_capital_fund
        bfr = bilan.total_working_capital_need
        tn = bilan.net_treasury
        
        # Vérification équation fondamentale: FRNG = BFR + TN
        equilibre_ok = abs((frng) - (bfr + tn)) <= Decimal('0.01')
        
        analyse['equilibre_financier'] = {
            'frng': float(frng),
            'bfr_total': float(bfr),
            'tresorerie_nette': float(tn),
            'equilibre_respecte': equilibre_ok,
            'type_equilibre': self._determiner_type_equilibre(frng, bfr, tn)
        }
        
        # 2. Structure financière
        emplois_stables = bilan.stable_uses
        ressources_stables = bilan.stable_resources
        
        if emplois_stables > 0:
            taux_couverture_emplois = (ressources_stables / emplois_stables * 100).quantize(Decimal('0.01'))
        else:
            taux_couverture_emplois = Decimal('100')
        
        analyse['structure_financiere'] = {
            'emplois_stables': float(emplois_stables),
            'ressources_stables': float(ressources_stables),
            'taux_couverture_emplois': float(taux_couverture_emplois),
            'adequation': 'BONNE' if taux_couverture_emplois >= 100 else 'INSUFFISANTE'
        }
        
        # 3. Gestion du BFR
        bfre = bilan.operating_working_capital_need
        bfrhe = bilan.non_operating_working_capital_need
        
        analyse['gestion_bfr'] = {
            'bfr_exploitation': float(bfre),
            'bfr_hors_exploitation': float(bfrhe),
            'poids_bfre': float((bfre / bfr * 100).quantize(Decimal('0.01'))) if bfr != 0 else 0,
            'rotation_bfr_jours': float(bilan.bfr_rotation_days) if bilan.bfr_rotation_days else 0
        }
        
        # 4. Ratios clés
        if bilan.revenue_base > 0:
            analyse['ratios_cles'] = {
                'frng_ca_jours': float((frng * 365 / bilan.revenue_base).quantize(Decimal('0.01'))),
                'bfr_ca_jours': float(bilan.bfr_rotation_days),
                'tn_ca_jours': float(bilan.treasury_autonomy_days) if bilan.treasury_autonomy_days else 0,
                'frng_ca_pct': float((frng / bilan.revenue_base * 100).quantize(Decimal('0.01')))
            }
        
        # 5. Génération d'alertes
        self._generer_alertes_bilan_fonctionnel(analyse, bilan)
        
        # 6. Recommandations
        self._generer_recommandations_bilan_fonctionnel(analyse, bilan)
        
        return analyse
    
    def _determiner_type_equilibre(self, frng: Decimal, bfr: Decimal, tn: Decimal) -> str:
        """Détermine le type d'équilibre financier"""
        
        if frng > 0 and bfr > 0 and tn > 0:
            return "EQUILIBRE_SAIN"  # Situation idéale
        elif frng > 0 and bfr > 0 and tn < 0:
            return "EQUILIBRE_PRECAIRE"  # BFR > FRNG
        elif frng > 0 and bfr < 0 and tn > 0:
            return "EQUILIBRE_EXCELLENT"  # Ressource de financement
        elif frng < 0:
            return "DESEQUILIBRE"  # Situation critique
        else:
            return "EQUILIBRE_ATYPIQUE"
    
    def _generer_alertes_bilan_fonctionnel(self, analyse: Dict, bilan: FunctionalBalanceSheet):
        """Génère des alertes basées sur l'analyse du bilan fonctionnel"""
        alertes = []
        
        # Alerte FRNG négatif
        if bilan.working_capital_fund < 0:
            alertes.append({
                'niveau': 'CRITIQUE',
                'titre': 'FRNG négatif',
                'description': f'Le fonds de roulement net global est négatif ({bilan.working_capital_fund:,.0f}), les emplois stables ne sont pas entièrement financés.',
                'impact': 'Risque de déséquilibre financier structurel'
            })
        
        # Alerte trésorerie nette négative
        if bilan.net_treasury < 0:
            niveau = 'CRITIQUE' if abs(bilan.net_treasury) > bilan.working_capital_fund else 'ALERTE'
            alertes.append({
                'niveau': niveau,
                'titre': 'Trésorerie nette négative',
                'description': f'La trésorerie nette est négative ({bilan.net_treasury:,.0f}), besoin de financement à court terme.',
                'impact': 'Difficultés de paiement potentielles'
            })
        
        # Alerte BFR élevé
        if bilan.revenue_base > 0:
            bfr_jours = bilan.bfr_rotation_days
            if bfr_jours > 90:  # Plus de 3 mois de CA
                alertes.append({
                    'niveau': 'ATTENTION',
                    'titre': 'BFR élevé',
                    'description': f'Le BFR représente {bfr_jours:.0f} jours de CA, ce qui est élevé.',
                    'impact': 'Consommation importante de trésorerie'
                })
        
        # Alerte couverture des emplois stables insuffisante
        if analyse['structure_financiere']['taux_couverture_emplois'] < 100:
            alertes.append({
                'niveau': 'MAJEUR',
                'titre': 'Couverture emplois stables insuffisante',
                'description': f"Les emplois stables ne sont couverts qu'à {analyse['structure_financiere']['taux_couverture_emplois']:.1f}%",
                'impact': 'Structure financière déséquilibrée'
            })
        
        analyse['alertes'] = alertes
    
    def _generer_recommandations_bilan_fonctionnel(self, analyse: Dict, bilan: FunctionalBalanceSheet):
        """Génère des recommandations basées sur l'analyse"""
        recommandations = []
        
        # Recommandations selon le type d'équilibre
        type_equilibre = analyse['equilibre_financier']['type_equilibre']
        
        if type_equilibre == "DESEQUILIBRE":
            recommandations.extend([
                "Renforcer urgentement les fonds propres (augmentation capital, incorporation réserves)",
                "Négocier des financements long terme pour couvrir les investissements",
                "Céder des actifs non stratégiques pour améliorer la structure financière"
            ])
        
        elif type_equilibre == "EQUILIBRE_PRECAIRE":
            recommandations.extend([
                "Optimiser la gestion du BFR (délais clients, rotation stocks, négociation fournisseurs)",
                "Mettre en place des lignes de crédit court terme",
                "Surveiller étroitement la trésorerie quotidienne"
            ])
        
        # Recommandations BFR
        if analyse['gestion_bfr']['rotation_bfr_jours'] > 60:
            recommandations.extend([
                "Accélérer le recouvrement des créances clients",
                "Optimiser la gestion des stocks (juste-à-temps, réduction stocks dormants)",
                "Renégocier les délais de paiement fournisseurs"
            ])
        
        # Recommandations trésorerie
        if bilan.net_treasury < 0:
            recommandations.extend([
                "Négocier des facilités de caisse avec les banques",
                "Étudier des solutions d'affacturage pour améliorer les flux",
                "Planifier rigoureusement les flux de trésorerie"
            ])
        
        # Recommandations structure
        if analyse['structure_financiere']['adequation'] == 'INSUFFISANTE':
            recommandations.extend([
                "Augmenter les fonds propres par apport des associés",
                "Transformer des comptes courants d'associés en capital",
                "Négocier des prêts long terme pour financer les investissements"
            ])
        
        analyse['recommandations'] = recommandations
    
    def generer_tableau_bord_fonctionnel(
        self, 
        bilan: FunctionalBalanceSheet,
        exercice_precedent: Optional[FunctionalBalanceSheet] = None
    ) -> Dict[str, Any]:
        """
        Génère un tableau de bord complet du bilan fonctionnel
        """
        dashboard = {
            'kpis': {},
            'graphiques': {},
            'evolution': {},
            'benchmark': {},
            'synthese': {}
        }
        
        # KPIs principaux
        dashboard['kpis'] = {
            'frng': {
                'valeur': float(bilan.working_capital_fund),
                'unite': 'montant',
                'interpretation': 'POSITIF' if bilan.working_capital_fund > 0 else 'NEGATIF',
                'alerte': bilan.working_capital_fund < 0
            },
            'bfr': {
                'valeur': float(bilan.total_working_capital_need),
                'unite': 'montant',
                'jours_ca': float(bilan.bfr_rotation_days) if bilan.bfr_rotation_days else 0,
                'interpretation': 'ELEVE' if bilan.bfr_rotation_days and bilan.bfr_rotation_days > 60 else 'CORRECT'
            },
            'tresorerie_nette': {
                'valeur': float(bilan.net_treasury),
                'unite': 'montant',
                'autonomie_jours': float(bilan.treasury_autonomy_days) if bilan.treasury_autonomy_days else 0,
                'alerte': bilan.net_treasury < 0
            },
            'couverture_emplois': {
                'valeur': float(bilan.frng_coverage_ratio),
                'unite': 'pourcentage',
                'interpretation': 'BON' if bilan.frng_coverage_ratio >= 100 else 'INSUFFISANT',
                'alerte': bilan.frng_coverage_ratio < 100
            }
        }
        
        # Données pour graphiques
        dashboard['graphiques'] = {
            'repartition_emplois': {
                'immobilisations_brutes': float(bilan.gross_fixed_assets),
                'charges_repartir': float(bilan.deferred_charges)
            },
            'repartition_ressources': {
                'capitaux_propres': float(bilan.equity_capital),
                'amortissements_provisions': float(bilan.depreciation_provisions_total),
                'dettes_financieres': float(bilan.financial_debts_long_term)
            },
            'analyse_bfr': {
                'bfr_exploitation': float(bilan.operating_working_capital_need),
                'bfr_hors_exploitation': float(bilan.non_operating_working_capital_need)
            },
            'structure_tresorerie': {
                'tresorerie_active': float(bilan.active_treasury),
                'tresorerie_passive': float(bilan.passive_treasury)
            }
        }
        
        # Évolution si exercice précédent disponible
        if exercice_precedent:
            dashboard['evolution'] = {
                'frng': {
                    'n': float(bilan.working_capital_fund),
                    'n1': float(exercice_precedent.working_capital_fund),
                    'variation': float(bilan.working_capital_fund - exercice_precedent.working_capital_fund),
                    'variation_pct': float((bilan.working_capital_fund - exercice_precedent.working_capital_fund) / abs(exercice_precedent.working_capital_fund) * 100) if exercice_precedent.working_capital_fund != 0 else 0
                },
                'bfr': {
                    'n': float(bilan.total_working_capital_need),
                    'n1': float(exercice_precedent.total_working_capital_need),
                    'variation': float(bilan.total_working_capital_need - exercice_precedent.total_working_capital_need)
                },
                'tresorerie': {
                    'n': float(bilan.net_treasury),
                    'n1': float(exercice_precedent.net_treasury),
                    'variation': float(bilan.net_treasury - exercice_precedent.net_treasury)
                }
            }
        
        # Benchmark sectoriel (données simulées - à connecter avec vraie base)
        dashboard['benchmark'] = {
            'frng_ca_jours': {'valeur': float(bilan.working_capital_fund * 365 / bilan.revenue_base) if bilan.revenue_base > 0 else 0, 'benchmark': 45, 'percentile': 65},
            'bfr_ca_jours': {'valeur': float(bilan.bfr_rotation_days) if bilan.bfr_rotation_days else 0, 'benchmark': 60, 'percentile': 72},
            'couverture_emplois': {'valeur': float(bilan.frng_coverage_ratio), 'benchmark': 110, 'percentile': 58}
        }
        
        # Synthèse exécutive
        analyse_equilibre = self.analyser_equilibre_fonctionnel(bilan)
        dashboard['synthese'] = {
            'type_equilibre': analyse_equilibre['equilibre_financier']['type_equilibre'],
            'score_global': self._calculer_score_equilibre(bilan),
            'points_forts': self._identifier_points_forts(bilan),
            'points_vigilance': self._identifier_points_vigilance(bilan),
            'priorites_action': analyse_equilibre['recommandations'][:3]  # Top 3
        }
        
        return dashboard
    
    def _calculer_score_equilibre(self, bilan: FunctionalBalanceSheet) -> int:
        """Calcule un score global d'équilibre financier sur 100"""
        score = 100
        
        # Pénalités selon les indicateurs
        if bilan.working_capital_fund < 0:
            score -= 40  # FRNG négatif = très grave
        
        if bilan.net_treasury < 0:
            score -= 25  # Trésorerie négative
        
        if bilan.frng_coverage_ratio < 100:
            score -= 20  # Emplois non couverts
        
        if bilan.bfr_rotation_days and bilan.bfr_rotation_days > 90:
            score -= 15  # BFR excessif
        
        return max(0, score)  # Minimum 0
    
    def _identifier_points_forts(self, bilan: FunctionalBalanceSheet) -> List[str]:
        """Identifie les points forts de la structure financière"""
        points_forts = []
        
        if bilan.working_capital_fund > 0:
            points_forts.append("FRNG positif - Structure financière saine")
        
        if bilan.net_treasury > 0:
            points_forts.append("Trésorerie nette positive - Solvabilité assurée")
        
        if bilan.frng_coverage_ratio >= 110:
            points_forts.append("Excellente couverture des emplois stables")
        
        if bilan.bfr_rotation_days and bilan.bfr_rotation_days < 45:
            points_forts.append("BFR maîtrisé - Bonne gestion du cycle d'exploitation")
        
        return points_forts
    
    def _identifier_points_vigilance(self, bilan: FunctionalBalanceSheet) -> List[str]:
        """Identifie les points de vigilance"""
        points_vigilance = []
        
        if bilan.working_capital_fund < 0:
            points_vigilance.append("FRNG négatif - Déséquilibre structurel")
        
        if bilan.net_treasury < 0:
            points_vigilance.append("Trésorerie négative - Risque de liquidité")
        
        if bilan.bfr_rotation_days and bilan.bfr_rotation_days > 75:
            points_vigilance.append("BFR élevé - Consommation de trésorerie importante")
        
        if bilan.frng_coverage_ratio < 100:
            points_vigilance.append("Couverture emplois insuffisante - Financer les investissements")
        
        return points_vigilance