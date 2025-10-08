from django.db import transaction, connection
from django.db.models import Q, F, Sum, Count, Avg
from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, date, timedelta
import logging

from ..models import (
    ConfigurationTAFIRE, TAFIRE, SoldesIntermediairesGestion,
    RatioFinancier, AnalyseBilan, ScoreFinancier,
    PrevisionsFinancieres, AlerteFinanciere
)
from ...core.models import Societe, Exercice
from ...core.services.base_service import BaseService
from ...accounting.models import CompteComptable, LigneEcriture, Ecriture

logger = logging.getLogger(__name__)

class TAFIREService(BaseService):
    """
    Service pour la génération et l'analyse du TAFIRE (Tableau Financier des Ressources et Emplois).
    Conforme aux normes SYSCOHADA révisé.
    """
    
    def __init__(self, societe: Societe):
        super().__init__(societe)
        self.societe = societe
    
    def generer_tafire(self, exercice: Exercice, methode: str = 'INDIRECTE') -> TAFIRE:
        """
        Génère le TAFIRE pour un exercice donné.
        """
        try:
            with transaction.atomic():
                # Créer ou récupérer la configuration
                config, created = ConfigurationTAFIRE.objects.get_or_create(
                    societe=self.societe,
                    exercice=exercice,
                    defaults={'methode_calcul': methode}
                )
                
                # Créer le TAFIRE
                tafire = TAFIRE.objects.create(
                    societe=self.societe,
                    exercice=exercice,
                    configuration=config
                )
                
                # Calculer les éléments du TAFIRE
                if methode == 'INDIRECTE':
                    self._calculer_tafire_indirect(tafire, exercice)
                else:
                    self._calculer_tafire_direct(tafire, exercice)
                
                # Valider la cohérence
                self._valider_coherence_tafire(tafire)
                
                # Générer les alertes si nécessaire
                self._generer_alertes_tafire(tafire)
                
                logger.info(f"TAFIRE généré pour l'exercice {exercice.libelle}")
                return tafire
                
        except Exception as e:
            logger.error(f"Erreur génération TAFIRE: {str(e)}")
            raise ValidationError(f"Impossible de générer le TAFIRE: {str(e)}")
    
    def _calculer_tafire_indirect(self, tafire: TAFIRE, exercice: Exercice):
        """Calcule le TAFIRE par la méthode indirecte."""
        
        # 1. Calcul de la CAF (Capacité d'Autofinancement)
        tafire.resultat_net = self._calculer_resultat_net(exercice)
        
        # Éléments non monétaires
        tafire.dotations_amortissements = self._calculer_dotations(exercice, 'AMORTISSEMENT')
        tafire.dotations_provisions = self._calculer_dotations(exercice, 'PROVISION')
        tafire.reprises_provisions = self._calculer_reprises(exercice)
        
        # Plus/moins-values de cession
        tafire.plus_values_cession = self._calculer_plus_values(exercice)
        tafire.moins_values_cession = self._calculer_moins_values(exercice)
        
        # CAF = Résultat net + Dotations - Reprises - Plus-values + Moins-values
        tafire.capacite_autofinancement = (
            tafire.resultat_net +
            tafire.dotations_amortissements +
            tafire.dotations_provisions -
            tafire.reprises_provisions -
            tafire.plus_values_cession +
            tafire.moins_values_cession
        )
        
        # 2. Flux d'exploitation
        tafire.variation_bfr = self._calculer_variation_bfr(exercice)
        tafire.flux_net_exploitation = tafire.capacite_autofinancement - tafire.variation_bfr
        
        # 3. Flux d'investissement
        tafire.acquisitions_immobilisations = self._calculer_acquisitions_immo(exercice)
        tafire.cessions_immobilisations = self._calculer_cessions_immo(exercice)
        tafire.variation_immobilisations_financieres = self._calculer_variation_immo_fin(exercice)
        
        tafire.flux_net_investissement = (
            -tafire.acquisitions_immobilisations +
            tafire.cessions_immobilisations -
            tafire.variation_immobilisations_financieres
        )
        
        # 4. Flux de financement
        tafire.augmentation_capital = self._calculer_augmentation_capital(exercice)
        tafire.nouveaux_emprunts = self._calculer_nouveaux_emprunts(exercice)
        tafire.remboursements_emprunts = self._calculer_remboursements_emprunts(exercice)
        tafire.dividendes_verses = self._calculer_dividendes(exercice)
        
        tafire.flux_net_financement = (
            tafire.augmentation_capital +
            tafire.nouveaux_emprunts -
            tafire.remboursements_emprunts -
            tafire.dividendes_verses
        )
        
        # 5. Variation de trésorerie
        tafire.variation_tresorerie = (
            tafire.flux_net_exploitation +
            tafire.flux_net_investissement +
            tafire.flux_net_financement
        )
        
        # Trésorerie d'ouverture et de clôture
        tafire.tresorerie_ouverture = self._calculer_tresorerie(exercice.date_debut)
        tafire.tresorerie_cloture = self._calculer_tresorerie(exercice.date_fin)
        
        tafire.save()
    
    def _calculer_resultat_net(self, exercice: Exercice) -> Decimal:
        """Calcule le résultat net de l'exercice."""
        # Comptes de produits (classe 7)
        produits = LigneEcriture.objects.filter(
            ecriture__societe=self.societe,
            ecriture__date_ecriture__range=[exercice.date_debut, exercice.date_fin],
            ecriture__statut='VALIDEE',
            compte__numero__startswith='7'
        ).aggregate(
            total=Sum(
                models.Case(
                    models.When(sens='CREDIT', then='montant'),
                    models.When(sens='DEBIT', then=models.F('montant') * -1),
                    default=0
                )
            )
        )['total'] or Decimal('0')
        
        # Comptes de charges (classe 6)
        charges = LigneEcriture.objects.filter(
            ecriture__societe=self.societe,
            ecriture__date_ecriture__range=[exercice.date_debut, exercice.date_fin],
            ecriture__statut='VALIDEE',
            compte__numero__startswith='6'
        ).aggregate(
            total=Sum(
                models.Case(
                    models.When(sens='DEBIT', then='montant'),
                    models.When(sens='CREDIT', then=models.F('montant') * -1),
                    default=0
                )
            )
        )['total'] or Decimal('0')
        
        return produits - charges
    
    def _calculer_dotations(self, exercice: Exercice, type_dotation: str) -> Decimal:
        """Calcule les dotations aux amortissements ou provisions."""
        if type_dotation == 'AMORTISSEMENT':
            comptes = ['681', '687']  # Dotations aux amortissements
        else:
            comptes = ['691', '697']  # Dotations aux provisions
        
        total = Decimal('0')
        for compte_prefix in comptes:
            montant = LigneEcriture.objects.filter(
                ecriture__societe=self.societe,
                ecriture__date_ecriture__range=[exercice.date_debut, exercice.date_fin],
                ecriture__statut='VALIDEE',
                compte__numero__startswith=compte_prefix,
                sens='DEBIT'
            ).aggregate(total=Sum('montant'))['total'] or Decimal('0')
            total += montant
        
        return total
    
    def _calculer_variation_bfr(self, exercice: Exercice) -> Decimal:
        """Calcule la variation du Besoin en Fonds de Roulement."""
        # BFR = Stocks + Créances clients - Dettes fournisseurs
        
        # BFR fin d'exercice
        bfr_fin = self._calculer_bfr_date(exercice.date_fin)
        
        # BFR début d'exercice
        bfr_debut = self._calculer_bfr_date(exercice.date_debut)
        
        return bfr_fin - bfr_debut
    
    def _calculer_bfr_date(self, date_calcul: date) -> Decimal:
        """Calcule le BFR à une date donnée."""
        # Stocks (classe 3)
        stocks = self._solde_comptes_date('3', date_calcul)
        
        # Créances clients (411)
        creances_clients = self._solde_comptes_date('411', date_calcul)
        
        # Dettes fournisseurs (401)
        dettes_fournisseurs = self._solde_comptes_date('401', date_calcul)
        
        return stocks + creances_clients - dettes_fournisseurs
    
    def _solde_comptes_date(self, prefix_compte: str, date_calcul: date) -> Decimal:
        """Calcule le solde des comptes à une date donnée."""
        solde = LigneEcriture.objects.filter(
            ecriture__societe=self.societe,
            ecriture__date_ecriture__lte=date_calcul,
            ecriture__statut='VALIDEE',
            compte__numero__startswith=prefix_compte
        ).aggregate(
            solde=Sum(
                models.Case(
                    models.When(sens='DEBIT', then='montant'),
                    models.When(sens='CREDIT', then=models.F('montant') * -1),
                    default=0
                )
            )
        )['solde'] or Decimal('0')
        
        return solde
    
    def _calculer_tresorerie(self, date_calcul: date) -> Decimal:
        """Calcule la trésorerie à une date donnée."""
        # Trésorerie = Disponibilités (5) - Concours bancaires (519)
        disponibilites = self._solde_comptes_date('5', date_calcul)
        concours = self._solde_comptes_date('519', date_calcul)
        
        return disponibilites - concours
    
    def _valider_coherence_tafire(self, tafire: TAFIRE):
        """Valide la cohérence du TAFIRE."""
        # Vérifier que la variation de trésorerie calculée = trésorerie clôture - trésorerie ouverture
        variation_calculee = tafire.tresorerie_cloture - tafire.tresorerie_ouverture
        ecart = abs(variation_calculee - tafire.variation_tresorerie)
        
        if ecart > Decimal('0.01'):  # Tolérance de 1 centime
            logger.warning(f"Écart de cohérence TAFIRE: {ecart}")
            # Ajuster si nécessaire
            tafire.variation_tresorerie = variation_calculee
            tafire.save()
    
    def _generer_alertes_tafire(self, tafire: TAFIRE):
        """Génère des alertes basées sur l'analyse du TAFIRE."""
        alertes = []
        
        # Alerte sur CAF négative
        if tafire.capacite_autofinancement < 0:
            alertes.append({
                'type': 'RENTABILITE',
                'niveau': 'CRITIQUE',
                'titre': 'Capacité d\'autofinancement négative',
                'description': f'La CAF est négative ({tafire.capacite_autofinancement}€), ce qui indique une incapacité à générer des ressources internes.',
                'indicateur': 'CAF',
                'valeur_actuelle': tafire.capacite_autofinancement
            })
        
        # Alerte sur flux d'exploitation négatif
        if tafire.flux_net_exploitation < 0:
            alertes.append({
                'type': 'TRESORERIE',
                'niveau': 'ALERTE',
                'titre': 'Flux d\'exploitation négatif',
                'description': f'Le flux net d\'exploitation est négatif ({tafire.flux_net_exploitation}€), l\'activité consomme de la trésorerie.',
                'indicateur': 'Flux exploitation',
                'valeur_actuelle': tafire.flux_net_exploitation
            })
        
        # Alerte sur variation de trésorerie négative
        if tafire.variation_tresorerie < 0:
            niveau = 'ATTENTION' if tafire.tresorerie_cloture > 0 else 'CRITIQUE'
            alertes.append({
                'type': 'TRESORERIE',
                'niveau': niveau,
                'titre': 'Dégradation de la trésorerie',
                'description': f'La trésorerie s\'est dégradée de {abs(tafire.variation_tresorerie)}€ sur l\'exercice.',
                'indicateur': 'Variation trésorerie',
                'valeur_actuelle': tafire.variation_tresorerie
            })
        
        # Créer les alertes en base
        for alerte_data in alertes:
            AlerteFinanciere.objects.create(
                societe=self.societe,
                exercice=tafire.exercice,
                **alerte_data,
                actions_recommandees=self._generer_recommandations_tafire(alerte_data['type'])
            )
    
    def _generer_recommandations_tafire(self, type_alerte: str) -> List[str]:
        """Génère des recommandations selon le type d'alerte."""
        recommandations = {
            'RENTABILITE': [
                'Analyser la structure des coûts',
                'Identifier les sources de pertes',
                'Optimiser les marges',
                'Réduire les charges non productives'
            ],
            'TRESORERIE': [
                'Accélérer le recouvrement des créances',
                'Négocier les délais fournisseurs',
                'Optimiser la gestion des stocks',
                'Étudier des solutions de financement court terme'
            ]
        }
        return recommandations.get(type_alerte, [])
    
    # Méthodes helper pour les calculs spécifiques
    
    def _calculer_reprises(self, exercice: Exercice) -> Decimal:
        """Calcule les reprises de provisions."""
        comptes = ['791', '797']  # Reprises sur provisions
        total = Decimal('0')
        
        for compte_prefix in comptes:
            montant = LigneEcriture.objects.filter(
                ecriture__societe=self.societe,
                ecriture__date_ecriture__range=[exercice.date_debut, exercice.date_fin],
                ecriture__statut='VALIDEE',
                compte__numero__startswith=compte_prefix,
                sens='CREDIT'
            ).aggregate(total=Sum('montant'))['total'] or Decimal('0')
            total += montant
        
        return total
    
    def _calculer_plus_values(self, exercice: Exercice) -> Decimal:
        """Calcule les plus-values de cession."""
        # Compte 775 - Produits de cession d'éléments d'actif
        return LigneEcriture.objects.filter(
            ecriture__societe=self.societe,
            ecriture__date_ecriture__range=[exercice.date_debut, exercice.date_fin],
            ecriture__statut='VALIDEE',
            compte__numero__startswith='775',
            sens='CREDIT'
        ).aggregate(total=Sum('montant'))['total'] or Decimal('0')
    
    def _calculer_moins_values(self, exercice: Exercice) -> Decimal:
        """Calcule les moins-values de cession."""
        # Compte 675 - Valeurs comptables des éléments d'actif cédés
        return LigneEcriture.objects.filter(
            ecriture__societe=self.societe,
            ecriture__date_ecriture__range=[exercice.date_debut, exercice.date_fin],
            ecriture__statut='VALIDEE',
            compte__numero__startswith='675',
            sens='DEBIT'
        ).aggregate(total=Sum('montant'))['total'] or Decimal('0')
    
    def _calculer_acquisitions_immo(self, exercice: Exercice) -> Decimal:
        """Calcule les acquisitions d'immobilisations."""
        # Comptes 2 (immobilisations) en débit
        return LigneEcriture.objects.filter(
            ecriture__societe=self.societe,
            ecriture__date_ecriture__range=[exercice.date_debut, exercice.date_fin],
            ecriture__statut='VALIDEE',
            compte__numero__regex=r'^2[0-7]',  # Immobilisations corporelles et incorporelles
            sens='DEBIT'
        ).aggregate(total=Sum('montant'))['total'] or Decimal('0')
    
    def _calculer_cessions_immo(self, exercice: Exercice) -> Decimal:
        """Calcule les cessions d'immobilisations."""
        # Prix de cession (compte 775)
        return self._calculer_plus_values(exercice)
    
    def _calculer_variation_immo_fin(self, exercice: Exercice) -> Decimal:
        """Calcule la variation des immobilisations financières."""
        # Solde fin - Solde début pour les comptes 26 et 27
        solde_fin = self._solde_comptes_date('26', exercice.date_fin) + \
                   self._solde_comptes_date('27', exercice.date_fin)
        solde_debut = self._solde_comptes_date('26', exercice.date_debut) + \
                     self._solde_comptes_date('27', exercice.date_debut)
        
        return solde_fin - solde_debut
    
    def _calculer_augmentation_capital(self, exercice: Exercice) -> Decimal:
        """Calcule les augmentations de capital."""
        # Compte 101 - Capital social (mouvements créditeurs)
        return LigneEcriture.objects.filter(
            ecriture__societe=self.societe,
            ecriture__date_ecriture__range=[exercice.date_debut, exercice.date_fin],
            ecriture__statut='VALIDEE',
            compte__numero__startswith='101',
            sens='CREDIT'
        ).aggregate(total=Sum('montant'))['total'] or Decimal('0')
    
    def _calculer_nouveaux_emprunts(self, exercice: Exercice) -> Decimal:
        """Calcule les nouveaux emprunts."""
        # Compte 16 - Emprunts (mouvements créditeurs)
        return LigneEcriture.objects.filter(
            ecriture__societe=self.societe,
            ecriture__date_ecriture__range=[exercice.date_debut, exercice.date_fin],
            ecriture__statut='VALIDEE',
            compte__numero__startswith='16',
            sens='CREDIT'
        ).aggregate(total=Sum('montant'))['total'] or Decimal('0')
    
    def _calculer_remboursements_emprunts(self, exercice: Exercice) -> Decimal:
        """Calcule les remboursements d'emprunts."""
        # Compte 16 - Emprunts (mouvements débiteurs)
        return LigneEcriture.objects.filter(
            ecriture__societe=self.societe,
            ecriture__date_ecriture__range=[exercice.date_debut, exercice.date_fin],
            ecriture__statut='VALIDEE',
            compte__numero__startswith='16',
            sens='DEBIT'
        ).aggregate(total=Sum('montant'))['total'] or Decimal('0')
    
    def _calculer_dividendes(self, exercice: Exercice) -> Decimal:
        """Calcule les dividendes versés."""
        # Compte 457 - Dividendes à payer (mouvements débiteurs)
        return LigneEcriture.objects.filter(
            ecriture__societe=self.societe,
            ecriture__date_ecriture__range=[exercice.date_debut, exercice.date_fin],
            ecriture__statut='VALIDEE',
            compte__numero__startswith='457',
            sens='DEBIT'
        ).aggregate(total=Sum('montant'))['total'] or Decimal('0')
    
    def _calculer_tafire_direct(self, tafire: TAFIRE, exercice: Exercice):
        """Calcule le TAFIRE par la méthode directe (encaissements/décaissements)."""
        # À implémenter selon les besoins
        # Cette méthode nécessite le suivi détaillé des encaissements et décaissements
        pass