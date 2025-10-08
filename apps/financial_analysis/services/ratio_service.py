from django.db import transaction
from django.db.models import Sum, Case, When, F
from django.core.exceptions import ValidationError
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, List, Optional, Tuple, Any
import logging
from datetime import date

from ..models import (
    RatioFinancier, AnalyseBilan, ScoreFinancier, AlerteFinanciere,
    SoldesIntermediairesGestion
)
from ...core.models import Societe, Exercice
from ...core.services.base_service import BaseService
from ...accounting.models import LigneEcriture

logger = logging.getLogger(__name__)

class RatioService(BaseService):
    """
    Service pour le calcul et l'analyse des ratios financiers.
    Calcule automatiquement tous les ratios standards selon les normes comptables.
    """
    
    def __init__(self, societe: Societe):
        super().__init__(societe)
        self.societe = societe
        self.ratios_config = self._load_ratios_configuration()
    
    def calculer_tous_ratios(self, exercice: Exercice, exercice_precedent: Optional[Exercice] = None) -> Dict[str, RatioFinancier]:
        """
        Calcule tous les ratios financiers pour un exercice donné.
        """
        try:
            with transaction.atomic():
                # Supprimer les anciens ratios
                RatioFinancier.objects.filter(
                    societe=self.societe,
                    exercice=exercice
                ).delete()
                
                ratios = {}
                
                # Récupérer les données comptables nécessaires
                donnees = self._recuperer_donnees_comptables(exercice)
                donnees_n1 = None
                if exercice_precedent:
                    donnees_n1 = self._recuperer_donnees_comptables(exercice_precedent)
                
                # Calculer ratios de structure
                ratios.update(self._calculer_ratios_structure(exercice, donnees, donnees_n1))
                
                # Calculer ratios de liquidité
                ratios.update(self._calculer_ratios_liquidite(exercice, donnees, donnees_n1))
                
                # Calculer ratios d'activité
                ratios.update(self._calculer_ratios_activite(exercice, donnees, donnees_n1))
                
                # Calculer ratios de rentabilité
                ratios.update(self._calculer_ratios_rentabilite(exercice, donnees, donnees_n1))
                
                # Calculer ratios de solvabilité
                ratios.update(self._calculer_ratios_solvabilite(exercice, donnees, donnees_n1))
                
                # Analyser les ratios et générer des alertes
                self._analyser_ratios_et_alertes(ratios, exercice)
                
                logger.info(f"Calcul de {len(ratios)} ratios pour l'exercice {exercice.libelle}")
                return ratios
                
        except Exception as e:
            logger.error(f"Erreur calcul ratios: {str(e)}")
            raise ValidationError(f"Impossible de calculer les ratios: {str(e)}")
    
    def _recuperer_donnees_comptables(self, exercice: Exercice) -> Dict[str, Decimal]:
        """Récupère les données comptables nécessaires aux calculs de ratios."""
        
        donnees = {}
        
        # Actif
        donnees['actif_immobilise'] = self._solde_comptes_fin('2', exercice)
        donnees['stocks'] = self._solde_comptes_fin('3', exercice)
        donnees['creances'] = (
            self._solde_comptes_fin('411', exercice) +  # Clients
            self._solde_comptes_fin('416', exercice) +  # Clients douteux
            self._solde_comptes_fin('43', exercice)     # Débiteurs divers
        )
        donnees['disponibilites'] = self._solde_comptes_fin('5', exercice)
        donnees['total_actif'] = (
            donnees['actif_immobilise'] + 
            donnees['stocks'] + 
            donnees['creances'] + 
            donnees['disponibilites']
        )
        
        # Passif
        donnees['capitaux_propres'] = self._solde_comptes_fin('1', exercice)
        donnees['dettes_financieres'] = (
            self._solde_comptes_fin('16', exercice) +   # Emprunts
            self._solde_comptes_fin('17', exercice)     # Dettes rattachées
        )
        donnees['dettes_exploitation'] = (
            self._solde_comptes_fin('401', exercice) +  # Fournisseurs
            self._solde_comptes_fin('43', exercice) +   # Créditeurs divers
            self._solde_comptes_fin('44', exercice)     # État et organismes
        )
        
        # Résultat et activité (pour l'exercice)
        donnees['chiffre_affaires'] = self._calculer_ca_exercice(exercice)
        donnees['resultat_net'] = self._calculer_resultat_net_exercice(exercice)
        donnees['charges_financieres'] = self._calculer_charges_financieres(exercice)
        donnees['charges_personnel'] = self._calculer_charges_personnel(exercice)
        
        # EBE et autres indicateurs
        sig = SoldesIntermediairesGestion.objects.filter(
            societe=self.societe,
            exercice=exercice
        ).first()
        
        if sig:
            donnees['excedent_brut_exploitation'] = sig.excedent_brut_exploitation
            donnees['valeur_ajoutee'] = sig.valeur_ajoutee
            donnees['resultat_exploitation'] = sig.resultat_exploitation
        else:
            donnees['excedent_brut_exploitation'] = Decimal('0')
            donnees['valeur_ajoutee'] = Decimal('0')
            donnees['resultat_exploitation'] = Decimal('0')
        
        return donnees
    
    def _calculer_ratios_structure(
        self, 
        exercice: Exercice, 
        donnees: Dict[str, Decimal],
        donnees_n1: Optional[Dict[str, Decimal]]
    ) -> Dict[str, RatioFinancier]:
        """Calcule les ratios de structure financière."""
        
        ratios = {}
        
        # Autonomie financière
        if donnees['total_actif'] > 0:
            valeur = (donnees['capitaux_propres'] / donnees['total_actif']) * 100
            valeur_n1 = None
            if donnees_n1 and donnees_n1['total_actif'] > 0:
                valeur_n1 = (donnees_n1['capitaux_propres'] / donnees_n1['total_actif']) * 100
            
            ratios['AUTONOMIE_FINANCIERE'] = self._creer_ratio(
                exercice=exercice,
                type_ratio='AUTONOMIE_FINANCIERE',
                categorie='STRUCTURE',
                libelle='Autonomie financière',
                valeur=valeur,
                unite='POURCENTAGE',
                numerateur=donnees['capitaux_propres'],
                denominateur=donnees['total_actif'],
                formule='Capitaux Propres / Total Actif × 100',
                valeur_n1=valeur_n1,
                valeur_reference=Decimal('33.33'),  # Seuil de 1/3
                interpretation=self._interpreter_autonomie_financiere(valeur)
            )
        
        # Endettement global
        total_dettes = donnees['dettes_financieres'] + donnees['dettes_exploitation']
        if donnees['total_actif'] > 0:
            valeur = (total_dettes / donnees['total_actif']) * 100
            valeur_n1 = None
            if donnees_n1 and donnees_n1['total_actif'] > 0:
                total_dettes_n1 = donnees_n1['dettes_financieres'] + donnees_n1['dettes_exploitation']
                valeur_n1 = (total_dettes_n1 / donnees_n1['total_actif']) * 100
            
            ratios['ENDETTEMENT_GLOBAL'] = self._creer_ratio(
                exercice=exercice,
                type_ratio='ENDETTEMENT_GLOBAL',
                categorie='STRUCTURE',
                libelle='Endettement global',
                valeur=valeur,
                unite='POURCENTAGE',
                numerateur=total_dettes,
                denominateur=donnees['total_actif'],
                formule='Total Dettes / Total Actif × 100',
                valeur_n1=valeur_n1,
                valeur_reference=Decimal('66.67'),  # Seuil de 2/3
                interpretation=self._interpreter_endettement(valeur)
            )
        
        # Capacité de remboursement
        if donnees['excedent_brut_exploitation'] > 0:
            valeur = donnees['dettes_financieres'] / donnees['excedent_brut_exploitation']
            valeur_n1 = None
            if donnees_n1 and donnees_n1['excedent_brut_exploitation'] > 0:
                valeur_n1 = donnees_n1['dettes_financieres'] / donnees_n1['excedent_brut_exploitation']
            
            ratios['CAPACITE_REMBOURSEMENT'] = self._creer_ratio(
                exercice=exercice,
                type_ratio='CAPACITE_REMBOURSEMENT',
                categorie='STRUCTURE',
                libelle='Capacité de remboursement',
                valeur=valeur,
                unite='FOIS',
                numerateur=donnees['dettes_financieres'],
                denominateur=donnees['excedent_brut_exploitation'],
                formule='Dettes Financières / EBE',
                valeur_n1=valeur_n1,
                valeur_reference=Decimal('3'),  # Maximum 3 ans
                interpretation=self._interpreter_capacite_remboursement(valeur)
            )
        
        return ratios
    
    def _calculer_ratios_liquidite(
        self, 
        exercice: Exercice, 
        donnees: Dict[str, Decimal],
        donnees_n1: Optional[Dict[str, Decimal]]
    ) -> Dict[str, RatioFinancier]:
        """Calcule les ratios de liquidité."""
        
        ratios = {}
        
        # Actif circulant
        actif_circulant = donnees['stocks'] + donnees['creances'] + donnees['disponibilites']
        
        # Liquidité générale
        if donnees['dettes_exploitation'] > 0:
            valeur = actif_circulant / donnees['dettes_exploitation']
            valeur_n1 = None
            if donnees_n1 and donnees_n1['dettes_exploitation'] > 0:
                actif_circulant_n1 = donnees_n1['stocks'] + donnees_n1['creances'] + donnees_n1['disponibilites']
                valeur_n1 = actif_circulant_n1 / donnees_n1['dettes_exploitation']
            
            ratios['LIQUIDITE_GENERALE'] = self._creer_ratio(
                exercice=exercice,
                type_ratio='LIQUIDITE_GENERALE',
                categorie='LIQUIDITE',
                libelle='Liquidité générale',
                valeur=valeur,
                unite='FOIS',
                numerateur=actif_circulant,
                denominateur=donnees['dettes_exploitation'],
                formule='Actif Circulant / Dettes à Court Terme',
                valeur_n1=valeur_n1,
                valeur_reference=Decimal('1'),  # Minimum 1
                interpretation=self._interpreter_liquidite_generale(valeur)
            )
        
        # Liquidité réduite
        actif_liquide = donnees['creances'] + donnees['disponibilites']
        if donnees['dettes_exploitation'] > 0:
            valeur = actif_liquide / donnees['dettes_exploitation']
            valeur_n1 = None
            if donnees_n1 and donnees_n1['dettes_exploitation'] > 0:
                actif_liquide_n1 = donnees_n1['creances'] + donnees_n1['disponibilites']
                valeur_n1 = actif_liquide_n1 / donnees_n1['dettes_exploitation']
            
            ratios['LIQUIDITE_REDUITE'] = self._creer_ratio(
                exercice=exercice,
                type_ratio='LIQUIDITE_REDUITE',
                categorie='LIQUIDITE',
                libelle='Liquidité réduite',
                valeur=valeur,
                unite='FOIS',
                numerateur=actif_liquide,
                denominateur=donnees['dettes_exploitation'],
                formule='(Créances + Disponibilités) / Dettes à Court Terme',
                valeur_n1=valeur_n1,
                valeur_reference=Decimal('0.7'),  # Minimum 0,7
                interpretation=self._interpreter_liquidite_reduite(valeur)
            )
        
        # Liquidité immédiate
        if donnees['dettes_exploitation'] > 0:
            valeur = donnees['disponibilites'] / donnees['dettes_exploitation']
            valeur_n1 = None
            if donnees_n1 and donnees_n1['dettes_exploitation'] > 0:
                valeur_n1 = donnees_n1['disponibilites'] / donnees_n1['dettes_exploitation']
            
            ratios['LIQUIDITE_IMMEDIATE'] = self._creer_ratio(
                exercice=exercice,
                type_ratio='LIQUIDITE_IMMEDIATE',
                categorie='LIQUIDITE',
                libelle='Liquidité immédiate',
                valeur=valeur,
                unite='FOIS',
                numerateur=donnees['disponibilites'],
                denominateur=donnees['dettes_exploitation'],
                formule='Disponibilités / Dettes à Court Terme',
                valeur_n1=valeur_n1,
                valeur_reference=Decimal('0.2'),  # Minimum 0,2
                interpretation=self._interpreter_liquidite_immediate(valeur)
            )
        
        return ratios
    
    def _calculer_ratios_activite(
        self, 
        exercice: Exercice, 
        donnees: Dict[str, Decimal],
        donnees_n1: Optional[Dict[str, Decimal]]
    ) -> Dict[str, RatioFinancier]:
        """Calcule les ratios d'activité."""
        
        ratios = {}
        
        # Rotation des stocks
        if donnees['stocks'] > 0 and donnees['chiffre_affaires'] > 0:
            valeur = (donnees['stocks'] * 365) / donnees['chiffre_affaires']
            valeur_n1 = None
            if donnees_n1 and donnees_n1['stocks'] > 0 and donnees_n1['chiffre_affaires'] > 0:
                valeur_n1 = (donnees_n1['stocks'] * 365) / donnees_n1['chiffre_affaires']
            
            ratios['ROTATION_STOCKS'] = self._creer_ratio(
                exercice=exercice,
                type_ratio='ROTATION_STOCKS',
                categorie='ACTIVITE',
                libelle='Rotation des stocks',
                valeur=valeur,
                unite='JOURS',
                numerateur=donnees['stocks'] * 365,
                denominateur=donnees['chiffre_affaires'],
                formule='(Stocks × 365) / Chiffre d\'Affaires',
                valeur_n1=valeur_n1,
                valeur_reference=Decimal('60'),  # 60 jours de référence
                interpretation=self._interpreter_rotation_stocks(valeur)
            )
        
        # Délai clients
        creances_clients = self._solde_comptes_fin('411', exercice)
        if creances_clients > 0 and donnees['chiffre_affaires'] > 0:
            valeur = (creances_clients * 365) / donnees['chiffre_affaires']
            valeur_n1 = None
            if donnees_n1:
                creances_clients_n1 = self._solde_comptes_fin('411', exercice, date_exercice_precedent=True)
                if creances_clients_n1 > 0 and donnees_n1['chiffre_affaires'] > 0:
                    valeur_n1 = (creances_clients_n1 * 365) / donnees_n1['chiffre_affaires']
            
            ratios['DELAI_CLIENTS'] = self._creer_ratio(
                exercice=exercice,
                type_ratio='DELAI_CLIENTS',
                categorie='ACTIVITE',
                libelle='Délai clients',
                valeur=valeur,
                unite='JOURS',
                numerateur=creances_clients * 365,
                denominateur=donnees['chiffre_affaires'],
                formule='(Créances Clients × 365) / Chiffre d\'Affaires',
                valeur_n1=valeur_n1,
                valeur_reference=Decimal('45'),  # 45 jours de référence
                interpretation=self._interpreter_delai_clients(valeur)
            )
        
        # Délai fournisseurs
        dettes_fournisseurs = self._solde_comptes_fin('401', exercice)
        achats = self._calculer_achats_exercice(exercice)
        if dettes_fournisseurs > 0 and achats > 0:
            valeur = (dettes_fournisseurs * 365) / achats
            valeur_n1 = None
            if donnees_n1:
                dettes_fournisseurs_n1 = self._solde_comptes_fin('401', exercice, date_exercice_precedent=True)
                achats_n1 = self._calculer_achats_exercice(exercice, exercice_precedent=True)
                if dettes_fournisseurs_n1 > 0 and achats_n1 > 0:
                    valeur_n1 = (dettes_fournisseurs_n1 * 365) / achats_n1
            
            ratios['DELAI_FOURNISSEURS'] = self._creer_ratio(
                exercice=exercice,
                type_ratio='DELAI_FOURNISSEURS',
                categorie='ACTIVITE',
                libelle='Délai fournisseurs',
                valeur=valeur,
                unite='JOURS',
                numerateur=dettes_fournisseurs * 365,
                denominateur=achats,
                formule='(Dettes Fournisseurs × 365) / Achats',
                valeur_n1=valeur_n1,
                valeur_reference=Decimal('60'),  # 60 jours de référence
                interpretation=self._interpreter_delai_fournisseurs(valeur)
            )
        
        return ratios
    
    def _calculer_ratios_rentabilite(
        self, 
        exercice: Exercice, 
        donnees: Dict[str, Decimal],
        donnees_n1: Optional[Dict[str, Decimal]]
    ) -> Dict[str, RatioFinancier]:
        """Calcule les ratios de rentabilité."""
        
        ratios = {}
        
        # Marge nette
        if donnees['chiffre_affaires'] > 0:
            valeur = (donnees['resultat_net'] / donnees['chiffre_affaires']) * 100
            valeur_n1 = None
            if donnees_n1 and donnees_n1['chiffre_affaires'] > 0:
                valeur_n1 = (donnees_n1['resultat_net'] / donnees_n1['chiffre_affaires']) * 100
            
            ratios['MARGE_NETTE'] = self._creer_ratio(
                exercice=exercice,
                type_ratio='MARGE_NETTE',
                categorie='RENTABILITE',
                libelle='Marge nette',
                valeur=valeur,
                unite='POURCENTAGE',
                numerateur=donnees['resultat_net'],
                denominateur=donnees['chiffre_affaires'],
                formule='Résultat Net / Chiffre d\'Affaires × 100',
                valeur_n1=valeur_n1,
                valeur_reference=Decimal('5'),  # 5% de référence
                interpretation=self._interpreter_marge_nette(valeur)
            )
        
        # Return on Equity (ROE)
        if donnees['capitaux_propres'] > 0:
            valeur = (donnees['resultat_net'] / donnees['capitaux_propres']) * 100
            valeur_n1 = None
            if donnees_n1 and donnees_n1['capitaux_propres'] > 0:
                valeur_n1 = (donnees_n1['resultat_net'] / donnees_n1['capitaux_propres']) * 100
            
            ratios['ROE'] = self._creer_ratio(
                exercice=exercice,
                type_ratio='ROE',
                categorie='RENTABILITE',
                libelle='Return on Equity (ROE)',
                valeur=valeur,
                unite='POURCENTAGE',
                numerateur=donnees['resultat_net'],
                denominateur=donnees['capitaux_propres'],
                formule='Résultat Net / Capitaux Propres × 100',
                valeur_n1=valeur_n1,
                valeur_reference=Decimal('10'),  # 10% de référence
                interpretation=self._interpreter_roe(valeur)
            )
        
        # Return on Assets (ROA)
        if donnees['total_actif'] > 0:
            valeur = (donnees['resultat_net'] / donnees['total_actif']) * 100
            valeur_n1 = None
            if donnees_n1 and donnees_n1['total_actif'] > 0:
                valeur_n1 = (donnees_n1['resultat_net'] / donnees_n1['total_actif']) * 100
            
            ratios['ROA'] = self._creer_ratio(
                exercice=exercice,
                type_ratio='ROA',
                categorie='RENTABILITE',
                libelle='Return on Assets (ROA)',
                valeur=valeur,
                unite='POURCENTAGE',
                numerateur=donnees['resultat_net'],
                denominateur=donnees['total_actif'],
                formule='Résultat Net / Total Actif × 100',
                valeur_n1=valeur_n1,
                valeur_reference=Decimal('5'),  # 5% de référence
                interpretation=self._interpreter_roa(valeur)
            )
        
        return ratios
    
    def _calculer_ratios_solvabilite(
        self, 
        exercice: Exercice, 
        donnees: Dict[str, Decimal],
        donnees_n1: Optional[Dict[str, Decimal]]
    ) -> Dict[str, RatioFinancier]:
        """Calcule les ratios de solvabilité."""
        
        ratios = {}
        
        # Couverture des intérêts
        if donnees['charges_financieres'] > 0:
            valeur = donnees['excedent_brut_exploitation'] / donnees['charges_financieres']
            valeur_n1 = None
            if donnees_n1 and donnees_n1['charges_financieres'] > 0:
                valeur_n1 = donnees_n1['excedent_brut_exploitation'] / donnees_n1['charges_financieres']
            
            ratios['COUVERTURE_INTERETS'] = self._creer_ratio(
                exercice=exercice,
                type_ratio='COUVERTURE_INTERETS',
                categorie='SOLVABILITE',
                libelle='Couverture des intérêts',
                valeur=valeur,
                unite='FOIS',
                numerateur=donnees['excedent_brut_exploitation'],
                denominateur=donnees['charges_financieres'],
                formule='EBE / Charges Financières',
                valeur_n1=valeur_n1,
                valeur_reference=Decimal('3'),  # Minimum 3 fois
                interpretation=self._interpreter_couverture_interets(valeur)
            )
        
        # Dette / EBITDA
        if donnees['excedent_brut_exploitation'] > 0:
            valeur = donnees['dettes_financieres'] / donnees['excedent_brut_exploitation']
            valeur_n1 = None
            if donnees_n1 and donnees_n1['excedent_brut_exploitation'] > 0:
                valeur_n1 = donnees_n1['dettes_financieres'] / donnees_n1['excedent_brut_exploitation']
            
            ratios['DETTE_EBITDA'] = self._creer_ratio(
                exercice=exercice,
                type_ratio='DETTE_EBITDA',
                categorie='SOLVABILITE',
                libelle='Dette / EBITDA',
                valeur=valeur,
                unite='FOIS',
                numerateur=donnees['dettes_financieres'],
                denominateur=donnees['excedent_brut_exploitation'],
                formule='Dettes Financières / EBE',
                valeur_n1=valeur_n1,
                valeur_reference=Decimal('4'),  # Maximum 4 fois
                interpretation=self._interpreter_dette_ebitda(valeur)
            )
        
        return ratios
    
    # Méthodes helper
    
    def _solde_comptes_fin(self, prefix_compte: str, exercice: Exercice, date_exercice_precedent: bool = False) -> Decimal:
        """Calcule le solde des comptes à la fin d'exercice."""
        date_fin = exercice.date_debut if date_exercice_precedent else exercice.date_fin
        
        solde = LigneEcriture.objects.filter(
            ecriture__societe=self.societe,
            ecriture__date_ecriture__lte=date_fin,
            ecriture__statut='VALIDEE',
            compte__numero__startswith=prefix_compte
        ).aggregate(
            solde=Sum(
                Case(
                    When(sens='DEBIT', then='montant'),
                    When(sens='CREDIT', then=F('montant') * -1),
                    default=0
                )
            )
        )['solde'] or Decimal('0')
        
        return abs(solde)  # Prendre la valeur absolue pour les calculs
    
    def _calculer_ca_exercice(self, exercice: Exercice) -> Decimal:
        """Calcule le chiffre d'affaires de l'exercice."""
        return LigneEcriture.objects.filter(
            ecriture__societe=self.societe,
            ecriture__date_ecriture__range=[exercice.date_debut, exercice.date_fin],
            ecriture__statut='VALIDEE',
            compte__numero__startswith='70',  # Ventes
            sens='CREDIT'
        ).aggregate(total=Sum('montant'))['total'] or Decimal('0')
    
    def _calculer_resultat_net_exercice(self, exercice: Exercice) -> Decimal:
        """Calcule le résultat net de l'exercice."""
        # Produits (classe 7)
        produits = LigneEcriture.objects.filter(
            ecriture__societe=self.societe,
            ecriture__date_ecriture__range=[exercice.date_debut, exercice.date_fin],
            ecriture__statut='VALIDEE',
            compte__numero__startswith='7',
            sens='CREDIT'
        ).aggregate(total=Sum('montant'))['total'] or Decimal('0')
        
        # Charges (classe 6)
        charges = LigneEcriture.objects.filter(
            ecriture__societe=self.societe,
            ecriture__date_ecriture__range=[exercice.date_debut, exercice.date_fin],
            ecriture__statut='VALIDEE',
            compte__numero__startswith='6',
            sens='DEBIT'
        ).aggregate(total=Sum('montant'))['total'] or Decimal('0')
        
        return produits - charges
    
    def _calculer_charges_financieres(self, exercice: Exercice) -> Decimal:
        """Calcule les charges financières."""
        return LigneEcriture.objects.filter(
            ecriture__societe=self.societe,
            ecriture__date_ecriture__range=[exercice.date_debut, exercice.date_fin],
            ecriture__statut='VALIDEE',
            compte__numero__startswith='67',  # Charges financières
            sens='DEBIT'
        ).aggregate(total=Sum('montant'))['total'] or Decimal('0')
    
    def _calculer_charges_personnel(self, exercice: Exercice) -> Decimal:
        """Calcule les charges de personnel."""
        return LigneEcriture.objects.filter(
            ecriture__societe=self.societe,
            ecriture__date_ecriture__range=[exercice.date_debut, exercice.date_fin],
            ecriture__statut='VALIDEE',
            compte__numero__startswith='64',  # Charges de personnel
            sens='DEBIT'
        ).aggregate(total=Sum('montant'))['total'] or Decimal('0')
    
    def _calculer_achats_exercice(self, exercice: Exercice, exercice_precedent: bool = False) -> Decimal:
        """Calcule les achats de l'exercice."""
        if exercice_precedent:
            # Logique pour exercice précédent
            pass
            
        return LigneEcriture.objects.filter(
            ecriture__societe=self.societe,
            ecriture__date_ecriture__range=[exercice.date_debut, exercice.date_fin],
            ecriture__statut='VALIDEE',
            compte__numero__startswith='60',  # Achats
            sens='DEBIT'
        ).aggregate(total=Sum('montant'))['total'] or Decimal('0')
    
    def _creer_ratio(
        self,
        exercice: Exercice,
        type_ratio: str,
        categorie: str,
        libelle: str,
        valeur: Decimal,
        unite: str,
        numerateur: Decimal,
        denominateur: Decimal,
        formule: str,
        valeur_n1: Optional[Decimal] = None,
        valeur_reference: Optional[Decimal] = None,
        interpretation: str = ''
    ) -> RatioFinancier:
        """Crée un ratio financier."""
        
        # Calculer les variations
        variation_absolue = None
        variation_relative = None
        if valeur_n1 is not None:
            variation_absolue = valeur - valeur_n1
            if valeur_n1 != 0:
                variation_relative = ((valeur - valeur_n1) / abs(valeur_n1)) * 100
        
        # Calculer l'écart à la référence
        ecart_reference = None
        if valeur_reference is not None:
            ecart_reference = valeur - valeur_reference
        
        # Déterminer les alertes
        alerte, niveau_alerte = self._determiner_alerte_ratio(type_ratio, valeur, valeur_reference)
        
        ratio = RatioFinancier.objects.create(
            societe=self.societe,
            exercice=exercice,
            categorie=categorie,
            type_ratio=type_ratio,
            libelle=libelle,
            valeur=valeur.quantize(Decimal('0.0001'), rounding=ROUND_HALF_UP),
            unite=unite,
            numerateur=numerateur,
            denominateur=denominateur,
            formule=formule,
            valeur_reference=valeur_reference,
            ecart_reference=ecart_reference,
            valeur_n1=valeur_n1,
            variation_absolue=variation_absolue,
            variation_relative=variation_relative,
            interpretation=interpretation,
            alerte=alerte,
            niveau_alerte=niveau_alerte
        )
        
        return ratio
    
    def _determiner_alerte_ratio(self, type_ratio: str, valeur: Decimal, reference: Optional[Decimal]) -> Tuple[bool, str]:
        """Détermine s'il faut créer une alerte pour un ratio."""
        if reference is None:
            return False, ''
        
        # Configuration des seuils d'alerte par type de ratio
        seuils_alerte = {
            'AUTONOMIE_FINANCIERE': {'danger': 20, 'attention': 30},
            'LIQUIDITE_GENERALE': {'danger': 0.8, 'attention': 1.0},
            'MARGE_NETTE': {'danger': 0, 'attention': 2},
            'ROE': {'danger': 0, 'attention': 5},
        }
        
        if type_ratio in seuils_alerte:
            seuils = seuils_alerte[type_ratio]
            if valeur < seuils['danger']:
                return True, 'DANGER'
            elif valeur < seuils['attention']:
                return True, 'ATTENTION'
        
        return False, ''
    
    def _analyser_ratios_et_alertes(self, ratios: Dict[str, RatioFinancier], exercice: Exercice):
        """Analyse les ratios et génère des alertes si nécessaire."""
        alertes_a_creer = []
        
        for type_ratio, ratio in ratios.items():
            if ratio.alerte:
                alertes_a_creer.append({
                    'type_alerte': self._mapper_type_alerte_ratio(type_ratio),
                    'niveau': ratio.niveau_alerte,
                    'titre': f"Alerte sur {ratio.libelle}",
                    'description': f"Le ratio {ratio.libelle} est de {ratio.valeur}{ratio.get_unite_display()}, ce qui est {ratio.interpretation}",
                    'indicateur': ratio.libelle,
                    'valeur_actuelle': ratio.valeur,
                    'valeur_seuil': ratio.valeur_reference,
                    'ecart': ratio.ecart_reference
                })
        
        # Créer les alertes
        for alerte_data in alertes_a_creer:
            AlerteFinanciere.objects.create(
                societe=self.societe,
                exercice=exercice,
                **alerte_data,
                actions_recommandees=self._generer_recommandations_ratio(alerte_data['type_alerte'])
            )
    
    def _mapper_type_alerte_ratio(self, type_ratio: str) -> str:
        """Mappe le type de ratio vers le type d'alerte."""
        mapping = {
            'AUTONOMIE_FINANCIERE': 'SOLVABILITE',
            'ENDETTEMENT_GLOBAL': 'ENDETTEMENT',
            'LIQUIDITE_GENERALE': 'LIQUIDITE',
            'LIQUIDITE_REDUITE': 'LIQUIDITE',
            'LIQUIDITE_IMMEDIATE': 'LIQUIDITE',
            'MARGE_NETTE': 'RENTABILITE',
            'ROE': 'RENTABILITE',
            'ROA': 'RENTABILITE',
        }
        return mapping.get(type_ratio, 'RATIO')
    
    def _generer_recommandations_ratio(self, type_alerte: str) -> List[str]:
        """Génère des recommandations selon le type d'alerte."""
        recommandations = {
            'LIQUIDITE': [
                'Améliorer le recouvrement des créances',
                'Optimiser la gestion des stocks',
                'Renégocier les délais fournisseurs',
                'Étudier des solutions de financement court terme'
            ],
            'SOLVABILITE': [
                'Renforcer les fonds propres',
                'Réduire l\'endettement',
                'Améliorer la rentabilité',
                'Céder des actifs non stratégiques'
            ],
            'RENTABILITE': [
                'Analyser la structure des coûts',
                'Optimiser les marges',
                'Développer l\'activité',
                'Améliorer l\'efficacité opérationnelle'
            ],
            'ENDETTEMENT': [
                'Réduire l\'endettement',
                'Augmenter les fonds propres',
                'Améliorer la capacité d\'autofinancement',
                'Renégocier les conditions d\'endettement'
            ]
        }
        return recommandations.get(type_alerte, [])
    
    # Méthodes d'interprétation des ratios
    
    def _interpreter_autonomie_financiere(self, valeur: Decimal) -> str:
        if valeur >= 50:
            return "Très bonne autonomie financière"
        elif valeur >= 33:
            return "Autonomie financière satisfaisante"
        elif valeur >= 20:
            return "Autonomie financière faible"
        else:
            return "Autonomie financière critique"
    
    def _interpreter_liquidite_generale(self, valeur: Decimal) -> str:
        if valeur >= 1.5:
            return "Excellente liquidité"
        elif valeur >= 1.2:
            return "Bonne liquidité"
        elif valeur >= 1.0:
            return "Liquidité satisfaisante"
        else:
            return "Problème de liquidité"
    
    def _interpreter_marge_nette(self, valeur: Decimal) -> str:
        if valeur >= 10:
            return "Excellente rentabilité"
        elif valeur >= 5:
            return "Bonne rentabilité"
        elif valeur >= 2:
            return "Rentabilité correcte"
        elif valeur >= 0:
            return "Faible rentabilité"
        else:
            return "Entreprise déficitaire"
    
    # Méthodes à implémenter pour les autres interprétations...
    def _interpreter_endettement(self, valeur: Decimal) -> str:
        return "Analyse endettement"
    
    def _interpreter_capacite_remboursement(self, valeur: Decimal) -> str:
        return "Analyse capacité remboursement"
    
    def _interpreter_liquidite_reduite(self, valeur: Decimal) -> str:
        return "Analyse liquidité réduite"
    
    def _interpreter_liquidite_immediate(self, valeur: Decimal) -> str:
        return "Analyse liquidité immédiate"
    
    def _interpreter_rotation_stocks(self, valeur: Decimal) -> str:
        return "Analyse rotation stocks"
    
    def _interpreter_delai_clients(self, valeur: Decimal) -> str:
        return "Analyse délai clients"
    
    def _interpreter_delai_fournisseurs(self, valeur: Decimal) -> str:
        return "Analyse délai fournisseurs"
    
    def _interpreter_roe(self, valeur: Decimal) -> str:
        return "Analyse ROE"
    
    def _interpreter_roa(self, valeur: Decimal) -> str:
        return "Analyse ROA"
    
    def _interpreter_couverture_interets(self, valeur: Decimal) -> str:
        return "Analyse couverture intérêts"
    
    def _interpreter_dette_ebitda(self, valeur: Decimal) -> str:
        return "Analyse dette/EBITDA"
    
    def _load_ratios_configuration(self) -> Dict:
        """Charge la configuration des ratios."""
        return {}  # À implémenter selon les besoins