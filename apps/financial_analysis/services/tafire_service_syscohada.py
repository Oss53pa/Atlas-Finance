"""
Service pour le calcul du TAFIRE (Tableau Financier des Ressources et Emplois) SYSCOHADA.
Conforme au référentiel OHADA révisé 2017.
"""
from django.db import transaction, connection
from django.db.models import Q, F, Sum, Count, Case, When
from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, date, timedelta
import logging

from ..models import TAFIRE, ConfigurationTAFIRE, BilanFonctionnel, SoldeIntermediaireGestion
from ...accounting.models import CompteComptable, Ecriture, LigneEcriture
from ...core.models import Societe, Exercice
from ...core.services.base_service import BaseService

logger = logging.getLogger(__name__)


class TAFIREServiceSYSCOHADA(BaseService):
    """
    Service pour le calcul automatique du TAFIRE selon les normes SYSCOHADA.
    """
    
    def __init__(self, societe: Societe):
        super().__init__(societe)
        self.societe = societe
        
        # Configuration des comptes SYSCOHADA
        self.comptes_config = {
            # Comptes de résultat
            'ventes_marchandises': ['701', '702', '703'],
            'cout_achat_marchandises': ['601', '602', '603'],
            'production_vendue': ['704', '705', '706', '707', '708'],
            'production_stockee': ['713', '714'],
            'production_immobilisee': ['72'],
            'consommations_intermediaires': ['60', '61', '62'],
            'charges_personnel': ['66'],
            'impots_taxes': ['63'],
            'charges_financieres': ['67'],
            'produits_financiers': ['77'],
            'produits_hao': ['84'],
            'charges_hao': ['85'],
            'impot_resultat': ['891'],
            
            # Comptes de bilan
            'immobilisations': ['2'],
            'stocks': ['31', '32', '33', '34', '35', '36', '37', '38'],
            'creances_clients': ['411', '416', '418'],
            'autres_creances': ['40', '42', '43', '44', '45', '46', '47', '48'],
            'tresorerie_active': ['50', '51', '52', '53', '54', '57', '58'],
            'capitaux_propres': ['10', '11', '12', '13'],
            'dettes_financieres': ['16', '17', '18'],
            'dettes_fournisseurs': ['401', '408'],
            'autres_dettes': ['40', '42', '43', '44', '45', '46', '47', '48'],
            'tresorerie_passive': ['519', '559'],
            
            # Comptes de flux spécifiques
            'acquisitions_immobilisations': ['2'],  # Variations au débit
            'cessions_immobilisations': ['2'],     # Variations au crédit
            'dotations_amortissements': ['681', '691'],
            'dotations_provisions': ['691', '695', '697'],
            'reprises_provisions': ['781', '791'],
            'plus_values_cessions': ['82'],
            'moins_values_cessions': ['81'],
        }
    
    def calculer_tafire(
        self, 
        exercice: Exercice,
        periode_debut: date,
        periode_fin: date,
        methode_calcul: str = 'INDIRECTE',
        configuration: Optional[ConfigurationTAFIRE] = None
    ) -> TAFIRE:
        """
        Calcule le TAFIRE pour la période donnée.
        """
        try:
            with transaction.atomic():
                # Récupérer ou créer la configuration
                if not configuration:
                    configuration = self._get_or_create_configuration(exercice, methode_calcul)
                
                # Créer ou récupérer le TAFIRE
                tafire, created = TAFIRE.objects.get_or_create(
                    societe=self.societe,
                    exercice=exercice,
                    periode_debut=periode_debut,
                    periode_fin=periode_fin,
                    defaults={
                        'configuration': configuration,
                        'methode_calcul': methode_calcul,
                        'statut': 'BROUILLON'
                    }
                )
                
                # Calculer les composantes selon la méthode
                if methode_calcul == 'DIRECTE':
                    self._calculer_tafire_methode_directe(tafire, periode_debut, periode_fin)
                else:
                    self._calculer_tafire_methode_indirecte(tafire, periode_debut, periode_fin)
                
                # Marquer comme calculé
                tafire.statut = 'CALCULE'
                tafire.date_calcul = timezone.now()
                tafire.calcule_par = self.current_user if hasattr(self, 'current_user') else None
                tafire.save()
                
                logger.info(f"TAFIRE calculé pour {self.societe.raison_sociale} - {periode_debut}/{periode_fin}")
                return tafire
                
        except Exception as e:
            logger.error(f"Erreur calcul TAFIRE: {str(e)}")
            raise ValidationError(f"Impossible de calculer le TAFIRE: {str(e)}")
    
    def _calculer_tafire_methode_indirecte(self, tafire: TAFIRE, periode_debut: date, periode_fin: date):
        """
        Calcule le TAFIRE selon la méthode indirecte (à partir du résultat net).
        """
        # 1. CAPACITÉ D'AUTOFINANCEMENT (CAF)
        # Résultat net
        tafire.resultat_net = self._calculer_resultat_net(periode_debut, periode_fin)
        
        # Dotations aux amortissements et provisions
        tafire.dotations_amortissements = self._calculer_dotations_amortissements(periode_debut, periode_fin)
        tafire.dotations_provisions = self._calculer_dotations_provisions(periode_debut, periode_fin)
        
        # Reprises de provisions
        tafire.reprises_provisions = self._calculer_reprises_provisions(periode_debut, periode_fin)
        
        # Plus et moins-values de cession
        tafire.plus_values_cessions = self._calculer_plus_values_cessions(periode_debut, periode_fin)\n        tafire.moins_values_cessions = self._calculer_moins_values_cessions(periode_debut, periode_fin)
        
        # Autres ajustements
        tafire.autres_ajustements = self._calculer_autres_ajustements_caf(periode_debut, periode_fin)
        
        # 2. VARIATION DU BFR D'EXPLOITATION
        tafire.variation_stocks = self._calculer_variation_stocks(periode_debut, periode_fin)
        tafire.variation_creances_clients = self._calculer_variation_creances_clients(periode_debut, periode_fin)
        tafire.variation_autres_creances = self._calculer_variation_autres_creances(periode_debut, periode_fin)
        tafire.variation_dettes_fournisseurs = self._calculer_variation_dettes_fournisseurs(periode_debut, periode_fin)
        tafire.variation_autres_dettes = self._calculer_variation_autres_dettes(periode_debut, periode_fin)
        
        # 3. FLUX D'INVESTISSEMENT (FTI)
        tafire.acquisitions_immobilisations = self._calculer_acquisitions_immobilisations(periode_debut, periode_fin)
        tafire.cessions_immobilisations = self._calculer_cessions_immobilisations(periode_debut, periode_fin)
        tafire.variation_immo_financieres = self._calculer_variation_immo_financieres(periode_debut, periode_fin)
        tafire.subventions_investissement = self._calculer_subventions_investissement(periode_debut, periode_fin)
        tafire.autres_flux_investissement = self._calculer_autres_flux_investissement(periode_debut, periode_fin)
        
        # 4. FLUX DE FINANCEMENT (FTF)
        tafire.augmentation_capital = self._calculer_augmentation_capital(periode_debut, periode_fin)
        tafire.reduction_capital = self._calculer_reduction_capital(periode_debut, periode_fin)
        tafire.nouveaux_emprunts = self._calculer_nouveaux_emprunts(periode_debut, periode_fin)
        tafire.remboursements_emprunts = self._calculer_remboursements_emprunts(periode_debut, periode_fin)
        tafire.dividendes_verses = self._calculer_dividendes_verses(periode_debut, periode_fin)
        tafire.autres_flux_financement = self._calculer_autres_flux_financement(periode_debut, periode_fin)
        
        # 5. TRÉSORERIE
        tafire.tresorerie_debut_periode = self._calculer_tresorerie_debut_periode(periode_debut)
        
        # Enregistrer les données de calcul pour audit
        tafire.donnees_calcul = {
            'methode': 'INDIRECTE',
            'periode_calcul': {
                'debut': periode_debut.isoformat(),
                'fin': periode_fin.isoformat()
            },
            'date_calcul': timezone.now().isoformat(),
            'composantes_caf': {
                'resultat_net': float(tafire.resultat_net),
                'dotations_amortissements': float(tafire.dotations_amortissements),
                'dotations_provisions': float(tafire.dotations_provisions),
                'reprises_provisions': float(tafire.reprises_provisions),
                'plus_values_cessions': float(tafire.plus_values_cessions),
                'moins_values_cessions': float(tafire.moins_values_cessions),
                'autres_ajustements': float(tafire.autres_ajustements)
            },
            'variations_bfr': {
                'stocks': float(tafire.variation_stocks),
                'creances_clients': float(tafire.variation_creances_clients),
                'autres_creances': float(tafire.variation_autres_creances),
                'dettes_fournisseurs': float(tafire.variation_dettes_fournisseurs),
                'autres_dettes': float(tafire.variation_autres_dettes)
            }
        }
        
        tafire.save()  # Les totaux seront calculés automatiquement dans save()
    
    def _calculer_tafire_methode_directe(self, tafire: TAFIRE, periode_debut: date, periode_fin: date):
        """
        Calcule le TAFIRE selon la méthode directe (flux de trésorerie réels).
        """
        # Note: La méthode directe nécessite un suivi détaillé des encaissements/décaissements
        # Pour cette implémentation, nous utilisons une approche simplifiée
        
        # Encaissements d'exploitation
        encaissements_clients = self._calculer_encaissements_clients(periode_debut, periode_fin)
        autres_encaissements_exploitation = self._calculer_autres_encaissements_exploitation(periode_debut, periode_fin)
        
        # Décaissements d'exploitation
        decaissements_fournisseurs = self._calculer_decaissements_fournisseurs(periode_debut, periode_fin)
        decaissements_personnel = self._calculer_decaissements_personnel(periode_debut, periode_fin)
        decaissements_impots_taxes = self._calculer_decaissements_impots_taxes(periode_debut, periode_fin)
        autres_decaissements_exploitation = self._calculer_autres_decaissements_exploitation(periode_debut, periode_fin)
        
        # Calcul de l'ETE (Excédent de Trésorerie d'Exploitation)
        excedent_tresorerie_exploitation = (
            encaissements_clients + autres_encaissements_exploitation -
            decaissements_fournisseurs - decaissements_personnel - 
            decaissements_impots_taxes - autres_decaissements_exploitation
        )
        
        # Mise à jour du TAFIRE
        tafire.excedent_tresorerie_exploitation = excedent_tresorerie_exploitation
        
        # Les flux d'investissement et de financement restent identiques
        self._calculer_flux_investissement_financement_directe(tafire, periode_debut, periode_fin)
        
        # Trésorerie
        tafire.tresorerie_debut_periode = self._calculer_tresorerie_debut_periode(periode_debut)
        
        tafire.donnees_calcul = {
            'methode': 'DIRECTE',
            'encaissements_exploitation': {
                'clients': float(encaissements_clients),
                'autres': float(autres_encaissements_exploitation)
            },
            'decaissements_exploitation': {
                'fournisseurs': float(decaissements_fournisseurs),
                'personnel': float(decaissements_personnel),
                'impots_taxes': float(decaissements_impots_taxes),
                'autres': float(autres_decaissements_exploitation)
            }
        }
        
        tafire.save()
    
    # Méthodes de calcul des composantes individuelles
    
    def _calculer_resultat_net(self, periode_debut: date, periode_fin: date) -> Decimal:
        """Calcule le résultat net de l'exercice."""
        # Produits (classe 7)
        produits = self._calculer_solde_comptes(['7'], periode_debut, periode_fin, sens_attendu='CREDIT')
        
        # Charges (classe 6)
        charges = self._calculer_solde_comptes(['6'], periode_debut, periode_fin, sens_attendu='DEBIT')
        
        return produits - charges
    
    def _calculer_dotations_amortissements(self, periode_debut: date, periode_fin: date) -> Decimal:
        """Calcule les dotations aux amortissements."""
        return self._calculer_solde_comptes(['681'], periode_debut, periode_fin, sens_attendu='DEBIT')
    
    def _calculer_dotations_provisions(self, periode_debut: date, periode_fin: date) -> Decimal:
        """Calcule les dotations aux provisions."""
        return self._calculer_solde_comptes(['691', '695', '697'], periode_debut, periode_fin, sens_attendu='DEBIT')
    
    def _calculer_reprises_provisions(self, periode_debut: date, periode_fin: date) -> Decimal:
        """Calcule les reprises de provisions."""
        return self._calculer_solde_comptes(['781', '791'], periode_debut, periode_fin, sens_attendu='CREDIT')
    
    def _calculer_plus_values_cessions(self, periode_debut: date, periode_fin: date) -> Decimal:
        """Calcule les plus-values de cession."""
        return self._calculer_solde_comptes(['82'], periode_debut, periode_fin, sens_attendu='CREDIT')
    
    def _calculer_moins_values_cessions(self, periode_debut: date, periode_fin: date) -> Decimal:
        """Calcule les moins-values de cession."""
        return self._calculer_solde_comptes(['81'], periode_debut, periode_fin, sens_attendu='DEBIT')
    
    def _calculer_autres_ajustements_caf(self, periode_debut: date, periode_fin: date) -> Decimal:
        """Calcule les autres ajustements pour la CAF."""
        # Charges calculées non décaissables et produits calculés non encaissables
        # À personnaliser selon les besoins spécifiques de l'entreprise
        return Decimal('0')
    
    def _calculer_variation_stocks(self, periode_debut: date, periode_fin: date) -> Decimal:
        """Calcule la variation des stocks."""
        stock_debut = self._calculer_solde_comptes_a_date(self.comptes_config['stocks'], periode_debut)
        stock_fin = self._calculer_solde_comptes_a_date(self.comptes_config['stocks'], periode_fin)
        
        # Variation négative = augmentation du BFR (besoin de financement)
        return stock_fin - stock_debut
    
    def _calculer_variation_creances_clients(self, periode_debut: date, periode_fin: date) -> Decimal:
        """Calcule la variation des créances clients."""
        creances_debut = self._calculer_solde_comptes_a_date(self.comptes_config['creances_clients'], periode_debut)
        creances_fin = self._calculer_solde_comptes_a_date(self.comptes_config['creances_clients'], periode_fin)
        
        return creances_fin - creances_debut
    
    def _calculer_variation_autres_creances(self, periode_debut: date, periode_fin: date) -> Decimal:
        """Calcule la variation des autres créances d'exploitation."""
        autres_creances_debut = self._calculer_solde_comptes_a_date(self.comptes_config['autres_creances'], periode_debut)
        autres_creances_fin = self._calculer_solde_comptes_a_date(self.comptes_config['autres_creances'], periode_fin)
        
        return autres_creances_fin - autres_creances_debut
    
    def _calculer_variation_dettes_fournisseurs(self, periode_debut: date, periode_fin: date) -> Decimal:
        """Calcule la variation des dettes fournisseurs."""
        dettes_debut = self._calculer_solde_comptes_a_date(self.comptes_config['dettes_fournisseurs'], periode_debut)
        dettes_fin = self._calculer_solde_comptes_a_date(self.comptes_config['dettes_fournisseurs'], periode_fin)
        
        # Variation positive = réduction du besoin de financement
        return dettes_fin - dettes_debut
    
    def _calculer_variation_autres_dettes(self, periode_debut: date, periode_fin: date) -> Decimal:
        """Calcule la variation des autres dettes d'exploitation."""
        autres_dettes_debut = self._calculer_solde_comptes_a_date(self.comptes_config['autres_dettes'], periode_debut)
        autres_dettes_fin = self._calculer_solde_comptes_a_date(self.comptes_config['autres_dettes'], periode_fin)
        
        return autres_dettes_fin - autres_dettes_debut
    
    def _calculer_acquisitions_immobilisations(self, periode_debut: date, periode_fin: date) -> Decimal:
        """Calcule les acquisitions d'immobilisations."""
        # Mouvements débiteurs sur les comptes d'immobilisations
        return self._calculer_mouvements_comptes(['2'], periode_debut, periode_fin, sens='DEBIT')
    
    def _calculer_cessions_immobilisations(self, periode_debut: date, periode_fin: date) -> Decimal:
        """Calcule les cessions d'immobilisations (prix de cession)."""
        # Produits de cession d'immobilisations (compte 825)
        return self._calculer_solde_comptes(['825'], periode_debut, periode_fin, sens_attendu='CREDIT')
    
    def _calculer_variation_immo_financieres(self, periode_debut: date, periode_fin: date) -> Decimal:
        """Calcule la variation des immobilisations financières."""
        immo_fin_debut = self._calculer_solde_comptes_a_date(['26', '27'], periode_debut)
        immo_fin_fin = self._calculer_solde_comptes_a_date(['26', '27'], periode_fin)
        
        return immo_fin_fin - immo_fin_debut
    
    def _calculer_subventions_investissement(self, periode_debut: date, periode_fin: date) -> Decimal:
        """Calcule les subventions d'investissement reçues."""
        return self._calculer_solde_comptes(['14'], periode_debut, periode_fin, sens_attendu='CREDIT')
    
    def _calculer_autres_flux_investissement(self, periode_debut: date, periode_fin: date) -> Decimal:
        """Calcule les autres flux d'investissement."""
        # À personnaliser selon les besoins
        return Decimal('0')
    
    def _calculer_augmentation_capital(self, periode_debut: date, periode_fin: date) -> Decimal:
        """Calcule les augmentations de capital."""
        return self._calculer_variation_comptes(['101', '104'], periode_debut, periode_fin)
    
    def _calculer_reduction_capital(self, periode_debut: date, periode_fin: date) -> Decimal:
        """Calcule les réductions de capital."""
        # Mouvements débiteurs sur le capital
        return abs(self._calculer_mouvements_comptes(['101'], periode_debut, periode_fin, sens='DEBIT'))
    
    def _calculer_nouveaux_emprunts(self, periode_debut: date, periode_fin: date) -> Decimal:
        """Calcule les nouveaux emprunts."""
        return self._calculer_mouvements_comptes(['16', '17'], periode_debut, periode_fin, sens='CREDIT')
    
    def _calculer_remboursements_emprunts(self, periode_debut: date, periode_fin: date) -> Decimal:
        """Calcule les remboursements d'emprunts."""
        return self._calculer_mouvements_comptes(['16', '17'], periode_debut, periode_fin, sens='DEBIT')
    
    def _calculer_dividendes_verses(self, periode_debut: date, periode_fin: date) -> Decimal:
        """Calcule les dividendes versés."""
        return self._calculer_mouvements_comptes(['457'], periode_debut, periode_fin, sens='DEBIT')
    
    def _calculer_autres_flux_financement(self, periode_debut: date, periode_fin: date) -> Decimal:
        """Calcule les autres flux de financement."""
        return Decimal('0')
    
    def _calculer_tresorerie_debut_periode(self, date_debut: date) -> Decimal:
        """Calcule la trésorerie en début de période."""
        tresorerie_active = self._calculer_solde_comptes_a_date(self.comptes_config['tresorerie_active'], date_debut)
        tresorerie_passive = self._calculer_solde_comptes_a_date(self.comptes_config['tresorerie_passive'], date_debut)
        
        return tresorerie_active - tresorerie_passive
    
    # Méthodes utilitaires pour les calculs de base
    
    def _calculer_solde_comptes(
        self, 
        prefixes_comptes: List[str], 
        periode_debut: date, 
        periode_fin: date,
        sens_attendu: str = None
    ) -> Decimal:
        """
        Calcule le solde des comptes pour une période donnée.
        """
        comptes = CompteComptable.objects.filter(
            societe=self.societe,
            numero__startswith__in=prefixes_comptes
        )
        
        total = Decimal('0')
        
        for compte in comptes:
            lignes = LigneEcriture.objects.filter(
                compte=compte,
                ecriture__date_ecriture__gte=periode_debut,
                ecriture__date_ecriture__lte=periode_fin,
                ecriture__statut='VALIDEE'
            )
            
            solde_debit = lignes.filter(sens='DEBIT').aggregate(
                total=Sum('montant')
            )['total'] or Decimal('0')
            
            solde_credit = lignes.filter(sens='CREDIT').aggregate(
                total=Sum('montant')
            )['total'] or Decimal('0')
            
            if sens_attendu == 'DEBIT':
                total += solde_debit
            elif sens_attendu == 'CREDIT':
                total += solde_credit
            else:
                # Solde naturel du compte
                if compte.numero.startswith(('1', '2', '3', '6', '8')):  # Comptes à solde débiteur
                    total += solde_debit - solde_credit
                else:  # Comptes à solde créditeur
                    total += solde_credit - solde_debit
        
        return total
    
    def _calculer_solde_comptes_a_date(self, prefixes_comptes: List[str], date_arret: date) -> Decimal:
        """
        Calcule le solde des comptes à une date donnée.
        """
        comptes = CompteComptable.objects.filter(
            societe=self.societe,
            numero__startswith__in=prefixes_comptes
        )
        
        total = Decimal('0')
        
        for compte in comptes:
            lignes = LigneEcriture.objects.filter(
                compte=compte,
                ecriture__date_ecriture__lte=date_arret,
                ecriture__statut='VALIDEE'
            )
            
            solde_debit = lignes.filter(sens='DEBIT').aggregate(
                total=Sum('montant')
            )['total'] or Decimal('0')
            
            solde_credit = lignes.filter(sens='CREDIT').aggregate(
                total=Sum('montant')
            )['total'] or Decimal('0')
            
            # Solde naturel du compte
            if compte.numero.startswith(('1', '2', '3', '6', '8')):  # Comptes à solde débiteur
                total += solde_debit - solde_credit
            else:  # Comptes à solde créditeur
                total += solde_credit - solde_debit
        
        return total
    
    def _calculer_mouvements_comptes(
        self, 
        prefixes_comptes: List[str], 
        periode_debut: date, 
        periode_fin: date,
        sens: str
    ) -> Decimal:
        """
        Calcule les mouvements (débit ou crédit) des comptes pour une période.
        """
        comptes = CompteComptable.objects.filter(
            societe=self.societe,
            numero__startswith__in=prefixes_comptes
        )
        
        total = Decimal('0')
        
        for compte in comptes:
            montant = LigneEcriture.objects.filter(
                compte=compte,
                sens=sens,
                ecriture__date_ecriture__gte=periode_debut,
                ecriture__date_ecriture__lte=periode_fin,
                ecriture__statut='VALIDEE'
            ).aggregate(total=Sum('montant'))['total'] or Decimal('0')
            
            total += montant
        
        return total
    
    def _calculer_variation_comptes(self, prefixes_comptes: List[str], periode_debut: date, periode_fin: date) -> Decimal:
        """
        Calcule la variation des comptes entre deux dates.
        """
        solde_debut = self._calculer_solde_comptes_a_date(prefixes_comptes, periode_debut - timedelta(days=1))
        solde_fin = self._calculer_solde_comptes_a_date(prefixes_comptes, periode_fin)
        
        return solde_fin - solde_debut
    
    def _get_or_create_configuration(self, exercice: Exercice, methode_calcul: str) -> ConfigurationTAFIRE:
        """
        Récupère ou crée la configuration TAFIRE pour l'exercice.
        """
        configuration, created = ConfigurationTAFIRE.objects.get_or_create(
            societe=self.societe,
            exercice=exercice,
            defaults={
                'methode_calcul': methode_calcul,
                'is_active': True
            }
        )
        
        return configuration
    
    # Méthodes pour la méthode directe (flux de trésorerie)
    
    def _calculer_encaissements_clients(self, periode_debut: date, periode_fin: date) -> Decimal:
        """Calcule les encaissements clients (méthode directe)."""
        # Simplification: CA - variation créances clients
        ca = self._calculer_solde_comptes(['70'], periode_debut, periode_fin, sens_attendu='CREDIT')
        variation_creances = self._calculer_variation_creances_clients(periode_debut, periode_fin)
        
        return ca - variation_creances
    
    def _calculer_autres_encaissements_exploitation(self, periode_debut: date, periode_fin: date) -> Decimal:
        """Calcule les autres encaissements d'exploitation."""
        return self._calculer_solde_comptes(['75', '78'], periode_debut, periode_fin, sens_attendu='CREDIT')
    
    def _calculer_decaissements_fournisseurs(self, periode_debut: date, periode_fin: date) -> Decimal:
        """Calcule les décaissements fournisseurs."""
        achats = self._calculer_solde_comptes(['60', '61', '62'], periode_debut, periode_fin, sens_attendu='DEBIT')
        variation_dettes_fournisseurs = self._calculer_variation_dettes_fournisseurs(periode_debut, periode_fin)
        
        return achats - variation_dettes_fournisseurs
    
    def _calculer_decaissements_personnel(self, periode_debut: date, periode_fin: date) -> Decimal:
        """Calcule les décaissements de personnel."""
        return self._calculer_solde_comptes(['66'], periode_debut, periode_fin, sens_attendu='DEBIT')
    
    def _calculer_decaissements_impots_taxes(self, periode_debut: date, periode_fin: date) -> Decimal:
        """Calcule les décaissements d'impôts et taxes."""
        return self._calculer_solde_comptes(['63'], periode_debut, periode_fin, sens_attendu='DEBIT')
    
    def _calculer_autres_decaissements_exploitation(self, periode_debut: date, periode_fin: date) -> Decimal:
        """Calcule les autres décaissements d'exploitation."""
        return self._calculer_solde_comptes(['65'], periode_debut, periode_fin, sens_attendu='DEBIT')
    
    def _calculer_flux_investissement_financement_directe(self, tafire: TAFIRE, periode_debut: date, periode_fin: date):
        """Calcule les flux d'investissement et financement pour la méthode directe."""
        # Les flux d'investissement et de financement sont identiques dans les deux méthodes
        tafire.acquisitions_immobilisations = self._calculer_acquisitions_immobilisations(periode_debut, periode_fin)
        tafire.cessions_immobilisations = self._calculer_cessions_immobilisations(periode_debut, periode_fin)
        tafire.variation_immo_financieres = self._calculer_variation_immo_financieres(periode_debut, periode_fin)
        tafire.subventions_investissement = self._calculer_subventions_investissement(periode_debut, periode_fin)
        tafire.autres_flux_investissement = self._calculer_autres_flux_investissement(periode_debut, periode_fin)
        
        tafire.augmentation_capital = self._calculer_augmentation_capital(periode_debut, periode_fin)
        tafire.reduction_capital = self._calculer_reduction_capital(periode_debut, periode_fin)
        tafire.nouveaux_emprunts = self._calculer_nouveaux_emprunts(periode_debut, periode_fin)
        tafire.remboursements_emprunts = self._calculer_remboursements_emprunts(periode_debut, periode_fin)
        tafire.dividendes_verses = self._calculer_dividendes_verses(periode_debut, periode_fin)
        tafire.autres_flux_financement = self._calculer_autres_flux_financement(periode_debut, periode_fin)
    
    def generer_rapport_tafire(self, tafire: TAFIRE) -> Dict[str, Any]:
        """
        Génère un rapport détaillé du TAFIRE avec analyses et commentaires.
        """
        rapport = {
            'tafire_id': tafire.id,
            'societe': tafire.societe.raison_sociale,
            'exercice': tafire.exercice.libelle,
            'periode': f"{tafire.periode_debut} - {tafire.periode_fin}",
            'methode_calcul': tafire.methode_calcul,
            'date_calcul': tafire.date_calcul.isoformat() if tafire.date_calcul else None,
            
            # Structure du TAFIRE
            'flux_exploitation': {
                'capacite_autofinancement': float(tafire.capacite_autofinancement),
                'variation_bfr_exploitation': float(tafire.variation_bfr_exploitation),
                'excedent_tresorerie_exploitation': float(tafire.excedent_tresorerie_exploitation)
            },
            'flux_investissement': {
                'acquisitions_immobilisations': float(tafire.acquisitions_immobilisations),
                'cessions_immobilisations': float(tafire.cessions_immobilisations),
                'flux_net_investissement': float(tafire.flux_net_investissement)
            },
            'flux_financement': {
                'augmentation_capital': float(tafire.augmentation_capital),
                'nouveaux_emprunts': float(tafire.nouveaux_emprunts),
                'remboursements_emprunts': float(tafire.remboursements_emprunts),
                'dividendes_verses': float(tafire.dividendes_verses),
                'flux_net_financement': float(tafire.flux_net_financement)
            },
            'tresorerie': {
                'variation_tresorerie': float(tafire.variation_tresorerie),
                'tresorerie_debut_periode': float(tafire.tresorerie_debut_periode),
                'tresorerie_fin_periode': float(tafire.tresorerie_fin_periode),
                'free_cash_flow': float(tafire.free_cash_flow)
            },
            
            # Analyses
            'analyses': self._generer_analyses_tafire(tafire),
            'alertes': self._generer_alertes_tafire(tafire),
            'recommandations': self._generer_recommandations_tafire(tafire)
        }
        
        return rapport
    
    def _generer_analyses_tafire(self, tafire: TAFIRE) -> Dict[str, Any]:
        """Génère les analyses du TAFIRE."""
        analyses = {}
        
        # Analyse de la capacité d'autofinancement
        if tafire.capacite_autofinancement > 0:
            analyses['caf'] = {
                'evaluation': 'POSITIVE',
                'commentaire': 'La société génère une capacité d\'autofinancement positive.'
            }
        else:
            analyses['caf'] = {
                'evaluation': 'NEGATIVE',
                'commentaire': 'La capacité d\'autofinancement est négative, ce qui indique des difficultés.'
            }
        
        # Analyse de la trésorerie
        if tafire.variation_tresorerie > 0:
            analyses['tresorerie'] = {
                'evaluation': 'AMELIORATION',
                'commentaire': 'La trésorerie s\'améliore sur la période.'
            }
        else:
            analyses['tresorerie'] = {
                'evaluation': 'DEGRADATION',
                'commentaire': 'La trésorerie se dégrade sur la période.'
            }
        
        # Analyse du Free Cash Flow
        if tafire.free_cash_flow > 0:
            analyses['fcf'] = {
                'evaluation': 'POSITIF',
                'commentaire': 'Le Free Cash Flow est positif, la société dégage de la liquidité après investissements.'
            }
        else:
            analyses['fcf'] = {
                'evaluation': 'NEGATIF',
                'commentaire': 'Le Free Cash Flow est négatif, besoin de financement externe.'
            }
        
        return analyses
    
    def _generer_alertes_tafire(self, tafire: TAFIRE) -> List[Dict[str, str]]:
        """Génère les alertes basées sur le TAFIRE."""
        alertes = []
        
        if tafire.tresorerie_fin_periode < 0:
            alertes.append({
                'niveau': 'CRITIQUE',
                'message': 'Trésorerie négative en fin de période',
                'impact': 'Risque de difficultés de paiement'
            })
        
        if tafire.capacite_autofinancement < 0:
            alertes.append({
                'niveau': 'MAJEUR',
                'message': 'Capacité d\'autofinancement négative',
                'impact': 'Incapacité à financer la croissance et les investissements'
            })
        
        if abs(tafire.variation_bfr_exploitation) > tafire.capacite_autofinancement * Decimal('0.5'):
            alertes.append({
                'niveau': 'MINEUR',
                'message': 'Forte variation du BFR d\'exploitation',
                'impact': 'Impact significatif sur la trésorerie'
            })
        
        return alertes
    
    def _generer_recommandations_tafire(self, tafire: TAFIRE) -> List[str]:
        """Génère des recommandations basées sur l'analyse du TAFIRE."""
        recommandations = []
        
        if tafire.variation_bfr_exploitation > tafire.capacite_autofinancement * Decimal('0.3'):
            recommandations.append(
                "Optimiser la gestion du BFR (délais clients, rotation stocks, négociation fournisseurs)"
            )
        
        if tafire.flux_net_investissement > tafire.capacite_autofinancement:
            recommandations.append(
                "Les investissements dépassent la CAF, évaluer les sources de financement"
            )
        
        if tafire.free_cash_flow < 0:
            recommandations.append(
                "Améliorer la génération de cash-flow libre : optimiser la rentabilité et maîtriser les investissements"
            )
        
        return recommandations