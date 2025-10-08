"""
Service pour le calcul des amortissements selon les méthodes SYSCOHADA.
Conforme aux normes comptables OHADA.
"""
from django.db import transaction, models
from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, date, timedelta
from dateutil.relativedelta import relativedelta
import logging
import math

from ..models import Immobilisation, LigneAmortissement, CategorieImmobilisation
from ...accounting.models import Ecriture, LigneEcriture, CompteComptable
from ...core.models import Societe, Exercice
from ...core.services.base_service import BaseService

logger = logging.getLogger(__name__)


class AmortissementService(BaseService):
    """
    Service pour le calcul des amortissements selon les méthodes SYSCOHADA.
    Gère les 4 méthodes : Linéaire, Dégressif, Progressif, Unités d'œuvre.
    """
    
    def __init__(self, societe: Societe):
        super().__init__(societe)
        self.societe = societe
        
        # Coefficients dégressifs selon la durée (OHADA)
        self.coefficients_degressifs = {
            3: 1.25,    # 3-4 ans
            4: 1.25,
            5: 1.75,    # 5-6 ans
            6: 1.75,
            7: 2.25,    # Plus de 6 ans
            8: 2.25,
            9: 2.25,
            10: 2.25,
            # Au-delà de 10 ans, coefficient de 2.25
        }
    
    def calculer_plan_amortissement(
        self, 
        immobilisation: Immobilisation,
        date_debut: date = None,
        force_recalcul: bool = False
    ) -> List[LigneAmortissement]:
        """
        Calcule et génère le plan d'amortissement complet d'une immobilisation.
        """
        try:
            with transaction.atomic():
                if not date_debut:
                    date_debut = immobilisation.date_mise_en_service or immobilisation.date_acquisition
                
                if not immobilisation.amortissable:
                    return []
                
                # Supprimer les lignes existantes si recalcul forcé
                if force_recalcul:
                    immobilisation.lignes_amortissement.filter(statut='PREVISIONNEL').delete()
                
                # Calculer selon la méthode
                if immobilisation.methode_amortissement == 'LINEAIRE':
                    lignes = self._calculer_amortissement_lineaire(immobilisation, date_debut)
                elif immobilisation.methode_amortissement == 'DEGRESSIF':
                    lignes = self._calculer_amortissement_degressif(immobilisation, date_debut)
                elif immobilisation.methode_amortissement == 'PROGRESSIF':
                    lignes = self._calculer_amortissement_progressif(immobilisation, date_debut)
                elif immobilisation.methode_amortissement == 'UNITE_OEUVRE':
                    lignes = self._calculer_amortissement_unite_oeuvre(immobilisation, date_debut)
                else:
                    raise ValidationError(f"Méthode d'amortissement non supportée: {immobilisation.methode_amortissement}")
                
                # Sauvegarder les lignes
                LigneAmortissement.objects.bulk_create(lignes)
                
                # Calculer la date de fin d'amortissement
                if lignes:
                    immobilisation.date_fin_amortissement = lignes[-1].date_fin
                    immobilisation.save(update_fields=['date_fin_amortissement'])
                
                logger.info(f"Plan d'amortissement calculé pour {immobilisation.numero} - {len(lignes)} lignes générées")
                return lignes
                
        except Exception as e:
            logger.error(f"Erreur calcul plan amortissement {immobilisation.numero}: {str(e)}")
            raise ValidationError(f"Impossible de calculer le plan d'amortissement: {str(e)}")
    
    def _calculer_amortissement_lineaire(
        self, 
        immobilisation: Immobilisation, 
        date_debut: date
    ) -> List[LigneAmortissement]:
        """
        Calcule l'amortissement linéaire (méthode constante).
        """
        lignes = []
        
        base_amortissement = self._calculer_base_amortissement(immobilisation)
        duree_mois = immobilisation.duree_amortissement
        
        if duree_mois <= 0:
            return lignes
        
        # Amortissement mensuel
        amortissement_mensuel = base_amortissement / Decimal(str(duree_mois))
        
        date_courante = date_debut
        cumul_amortissement = Decimal('0')
        
        for mois in range(duree_mois):
            # Dates de la période
            date_debut_periode = date_courante
            date_fin_periode = self._dernier_jour_mois(date_courante)
            
            # Calcul au prorata pour le premier et dernier mois
            if mois == 0:
                # Premier mois : prorata temporis
                jours_mois = (date_fin_periode - date_debut_periode).days + 1
                jours_total_mois = self._jours_dans_mois(date_courante)
                coefficient_prorata = Decimal(str(jours_mois)) / Decimal(str(jours_total_mois))
                montant_periode = amortissement_mensuel * coefficient_prorata
            elif mois == duree_mois - 1:
                # Dernier mois : solde restant
                montant_periode = base_amortissement - cumul_amortissement
            else:
                # Mois complets
                montant_periode = amortissement_mensuel
            
            # Arrondir à 2 décimales
            montant_periode = montant_periode.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            cumul_amortissement += montant_periode
            
            valeur_nette = immobilisation.valeur_brute - cumul_amortissement
            
            ligne = LigneAmortissement(
                immobilisation=immobilisation,
                exercice=date_courante.year,
                periode=date_courante.strftime('%Y-%m'),
                date_debut=date_debut_periode,
                date_fin=date_fin_periode,
                base_amortissement=base_amortissement,
                taux_applique=immobilisation.taux_amortissement,
                montant_amortissement=montant_periode,
                cumul_amortissement=cumul_amortissement,
                valeur_nette_fin=valeur_nette,
                statut='PREVISIONNEL'
            )
            
            lignes.append(ligne)
            
            # Passer au mois suivant
            date_courante = self._mois_suivant(date_courante)
        
        return lignes
    
    def _calculer_amortissement_degressif(
        self, 
        immobilisation: Immobilisation, 
        date_debut: date
    ) -> List[LigneAmortissement]:
        """
        Calcule l'amortissement dégressif selon les règles OHADA.
        """
        lignes = []
        
        base_amortissement = self._calculer_base_amortissement(immobilisation)
        duree_annees = immobilisation.duree_amortissement // 12
        
        if duree_annees <= 0:
            return self._calculer_amortissement_lineaire(immobilisation, date_debut)
        
        # Coefficient dégressif selon la durée
        coefficient = self._get_coefficient_degressif(duree_annees)
        taux_degressif = (Decimal('100') / Decimal(str(duree_annees))) * Decimal(str(coefficient))
        taux_lineaire_equivalent = Decimal('100') / Decimal(str(duree_annees))
        
        date_courante = date_debut
        valeur_residuelle_comptable = base_amortissement
        cumul_amortissement = Decimal('0')
        passage_lineaire = False
        
        for annee in range(duree_annees):
            # Calcul dégressif pour cette année
            amortissement_degressif = valeur_residuelle_comptable * taux_degressif / Decimal('100')
            
            # Calcul linéaire pour le reste de la durée
            annees_restantes = duree_annees - annee
            if annees_restantes > 0:
                amortissement_lineaire = valeur_residuelle_comptable / Decimal(str(annees_restantes))
            else:
                amortissement_lineaire = valeur_residuelle_comptable
            
            # Choisir le plus élevé (ou continuer en linéaire si déjà basculé)
            if passage_lineaire or amortissement_lineaire >= amortissement_degressif:
                montant_annuel = amortissement_lineaire
                passage_lineaire = True
            else:
                montant_annuel = amortissement_degressif
            
            # Répartir sur 12 mois
            for mois in range(12):
                if annee * 12 + mois >= immobilisation.duree_amortissement:
                    break
                
                date_debut_periode = date_courante
                date_fin_periode = self._dernier_jour_mois(date_courante)
                
                # Prorata pour le premier et dernier mois
                if annee == 0 and mois == 0:
                    jours_mois = (date_fin_periode - date_debut_periode).days + 1
                    jours_total_mois = self._jours_dans_mois(date_courante)
                    coefficient_prorata = Decimal(str(jours_mois)) / Decimal(str(jours_total_mois))
                    montant_mensuel = (montant_annuel / Decimal('12')) * coefficient_prorata
                else:
                    montant_mensuel = montant_annuel / Decimal('12')
                
                # Ajuster le dernier amortissement pour éviter les dépassements
                if cumul_amortissement + montant_mensuel > base_amortissement:
                    montant_mensuel = base_amortissement - cumul_amortissement
                
                montant_mensuel = montant_mensuel.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
                cumul_amortissement += montant_mensuel
                valeur_nette = immobilisation.valeur_brute - cumul_amortissement
                
                ligne = LigneAmortissement(
                    immobilisation=immobilisation,
                    exercice=date_courante.year,
                    periode=date_courante.strftime('%Y-%m'),
                    date_debut=date_debut_periode,
                    date_fin=date_fin_periode,
                    base_amortissement=base_amortissement,
                    taux_applique=taux_degressif if not passage_lineaire else taux_lineaire_equivalent,
                    montant_amortissement=montant_mensuel,
                    cumul_amortissement=cumul_amortissement,
                    valeur_nette_fin=valeur_nette,
                    statut='PREVISIONNEL'
                )
                
                lignes.append(ligne)
                
                if cumul_amortissement >= base_amortissement:
                    break
                
                date_courante = self._mois_suivant(date_courante)
            
            # Mettre à jour la valeur résiduelle pour l'année suivante
            valeur_residuelle_comptable -= montant_annuel
            if valeur_residuelle_comptable <= 0:
                break
        
        return lignes
    
    def _calculer_amortissement_progressif(
        self, 
        immobilisation: Immobilisation, 
        date_debut: date
    ) -> List[LigneAmortissement]:
        """
        Calcule l'amortissement progressif (croissant).
        """
        lignes = []
        
        base_amortissement = self._calculer_base_amortissement(immobilisation)
        duree_mois = immobilisation.duree_amortissement
        
        if duree_mois <= 0:
            return lignes
        
        # Calcul de la progression (suite arithmétique)
        # Somme = n * (premier_terme + dernier_terme) / 2
        # Pour une progression de 1 à n: somme = n * (n + 1) / 2
        somme_coefficients = Decimal(str(duree_mois * (duree_mois + 1) // 2))
        
        date_courante = date_debut
        cumul_amortissement = Decimal('0')
        
        for mois in range(duree_mois):
            # Coefficient progressif (mois + 1)
            coefficient = Decimal(str(mois + 1))
            
            # Dates de la période
            date_debut_periode = date_courante
            date_fin_periode = self._dernier_jour_mois(date_courante)
            
            # Calcul du montant proportionnel
            montant_periode = (base_amortissement * coefficient) / somme_coefficients
            
            # Prorata temporis pour le premier mois si nécessaire
            if mois == 0:
                jours_mois = (date_fin_periode - date_debut_periode).days + 1
                jours_total_mois = self._jours_dans_mois(date_courante)
                coefficient_prorata = Decimal(str(jours_mois)) / Decimal(str(jours_total_mois))
                montant_periode *= coefficient_prorata
            
            montant_periode = montant_periode.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            cumul_amortissement += montant_periode
            
            # Ajustement pour le dernier mois
            if mois == duree_mois - 1:
                montant_periode = base_amortissement - (cumul_amortissement - montant_periode)
                cumul_amortissement = base_amortissement
            
            valeur_nette = immobilisation.valeur_brute - cumul_amortissement
            
            # Calcul du taux effectif
            taux_effectif = (montant_periode * Decimal('1200')) / base_amortissement
            
            ligne = LigneAmortissement(
                immobilisation=immobilisation,
                exercice=date_courante.year,
                periode=date_courante.strftime('%Y-%m'),
                date_debut=date_debut_periode,
                date_fin=date_fin_periode,
                base_amortissement=base_amortissement,
                taux_applique=taux_effectif,
                montant_amortissement=montant_periode,
                cumul_amortissement=cumul_amortissement,
                valeur_nette_fin=valeur_nette,
                statut='PREVISIONNEL'
            )
            
            lignes.append(ligne)
            date_courante = self._mois_suivant(date_courante)
        
        return lignes
    
    def _calculer_amortissement_unite_oeuvre(
        self, 
        immobilisation: Immobilisation, 
        date_debut: date
    ) -> List[LigneAmortissement]:
        """
        Calcule l'amortissement aux unités d'œuvre.
        Note: Nécessite un suivi des unités produites/consommées.
        """
        lignes = []
        
        # Pour cette implémentation, nous utilisons une répartition linéaire
        # En production, il faudrait intégrer avec un système de suivi de production
        
        base_amortissement = self._calculer_base_amortissement(immobilisation)
        duree_mois = immobilisation.duree_amortissement
        
        # Configuration par défaut : unités totales estimées
        unites_totales_estimees = getattr(immobilisation, 'unites_totales_estimees', 100000)
        
        if duree_mois <= 0 or unites_totales_estimees <= 0:
            return self._calculer_amortissement_lineaire(immobilisation, date_debut)
        
        # Coût par unité
        cout_par_unite = base_amortissement / Decimal(str(unites_totales_estimees))
        
        # Répartition mensuelle estimée
        unites_mensuelles_estimees = unites_totales_estimees / duree_mois
        
        date_courante = date_debut
        cumul_amortissement = Decimal('0')
        
        for mois in range(duree_mois):
            date_debut_periode = date_courante
            date_fin_periode = self._dernier_jour_mois(date_courante)
            
            # En l'absence de données réelles, utiliser l'estimation
            unites_periode = Decimal(str(unites_mensuelles_estimees))
            
            # Prorata pour le premier mois
            if mois == 0:
                jours_mois = (date_fin_periode - date_debut_periode).days + 1
                jours_total_mois = self._jours_dans_mois(date_courante)
                coefficient_prorata = Decimal(str(jours_mois)) / Decimal(str(jours_total_mois))
                unites_periode *= coefficient_prorata
            
            montant_periode = cout_par_unite * unites_periode
            montant_periode = montant_periode.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            
            cumul_amortissement += montant_periode
            
            # Ajustement pour le dernier mois
            if mois == duree_mois - 1:
                montant_periode = base_amortissement - (cumul_amortissement - montant_periode)
                cumul_amortissement = base_amortissement
            
            valeur_nette = immobilisation.valeur_brute - cumul_amortissement
            
            ligne = LigneAmortissement(
                immobilisation=immobilisation,
                exercice=date_courante.year,
                periode=date_courante.strftime('%Y-%m'),
                date_debut=date_debut_periode,
                date_fin=date_fin_periode,
                base_amortissement=base_amortissement,
                taux_applique=Decimal('0'),  # Pas de taux fixe pour cette méthode
                montant_amortissement=montant_periode,
                cumul_amortissement=cumul_amortissement,
                valeur_nette_fin=valeur_nette,
                statut='PREVISIONNEL',
                observations=f"Basé sur {float(unites_periode)} unités d'œuvre"
            )
            
            lignes.append(ligne)
            date_courante = self._mois_suivant(date_courante)
        
        return lignes
    
    def calculer_amortissement_derogatoire(
        self, 
        immobilisation: Immobilisation,
        methode_fiscale: str,
        duree_fiscale: int
    ) -> Dict[str, Any]:
        """
        Calcule l'amortissement dérogatoire (écart entre fiscal et comptable).
        """
        try:
            # Plan d'amortissement comptable (existant)
            plan_comptable = list(immobilisation.lignes_amortissement.filter(
                statut__in=['PREVISIONNEL', 'REALISE']
            ).order_by('periode'))
            
            # Créer une immobilisation fictive pour le calcul fiscal
            immo_fiscale = Immobilisation(
                valeur_acquisition=immobilisation.valeur_acquisition,
                frais_acquisition=immobilisation.frais_acquisition,
                valeur_residuelle=immobilisation.valeur_residuelle,
                date_mise_en_service=immobilisation.date_mise_en_service,
                duree_amortissement=duree_fiscale,
                methode_amortissement=methode_fiscale,
                amortissable=True
            )
            
            # Calculer le plan fiscal
            plan_fiscal = self._calculer_plan_temporaire(immo_fiscale, immobilisation.date_mise_en_service or immobilisation.date_acquisition)
            
            # Calculer les écarts
            ecarts = []
            for i, ligne_comptable in enumerate(plan_comptable):
                if i < len(plan_fiscal):
                    ligne_fiscale = plan_fiscal[i]
                    ecart = ligne_fiscale['montant_amortissement'] - ligne_comptable.montant_amortissement
                    
                    ecarts.append({
                        'periode': ligne_comptable.periode,
                        'amortissement_comptable': float(ligne_comptable.montant_amortissement),
                        'amortissement_fiscal': float(ligne_fiscale['montant_amortissement']),
                        'ecart_derogatoire': float(ecart),
                        'cumul_ecart': float(sum(e['ecart_derogatoire'] for e in ecarts))
                    })
            
            return {
                'immobilisation_id': immobilisation.id,
                'methode_fiscale': methode_fiscale,
                'duree_fiscale': duree_fiscale,
                'ecarts_detailles': ecarts,
                'ecart_total': float(sum(e['ecart_derogatoire'] for e in ecarts)),
                'date_calcul': timezone.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Erreur calcul amortissement dérogatoire: {str(e)}")
            raise ValidationError(f"Impossible de calculer l'amortissement dérogatoire: {str(e)}")
    
    def generer_ecritures_amortissement(
        self, 
        periode: str, 
        exercice: int,
        lignes_ids: List[int] = None
    ) -> List[Ecriture]:
        """
        Génère les écritures comptables d'amortissement pour une période.
        """
        try:
            with transaction.atomic():
                ecritures = []
                
                # Récupérer les lignes à traiter
                query = LigneAmortissement.objects.filter(
                    immobilisation__societe=self.societe,
                    periode=periode,
                    statut='PREVISIONNEL'
                )
                
                if lignes_ids:
                    query = query.filter(id__in=lignes_ids)
                
                lignes = query.select_related('immobilisation', 'immobilisation__categorie')
                
                # Regrouper par catégorie pour les écritures
                by_categorie = {}
                for ligne in lignes:
                    categorie = ligne.immobilisation.categorie
                    if categorie not in by_categorie:
                        by_categorie[categorie] = []
                    by_categorie[categorie].append(ligne)
                
                # Générer une écriture par catégorie
                for categorie, lignes_categorie in by_categorie.items():
                    montant_total = sum(ligne.montant_amortissement for ligne in lignes_categorie)
                    
                    if montant_total <= 0:
                        continue
                    
                    # Créer l'écriture
                    ecriture = Ecriture.objects.create(
                        societe=self.societe,
                        journal_code='OD',  # À adapter selon la configuration
                        date_ecriture=date.today(),
                        libelle=f'Dotations amortissements {categorie.libelle} - {periode}',
                        reference=f'AMORT-{periode}-{categorie.code}',
                        montant_total=montant_total,
                        statut='VALIDEE'
                    )
                    
                    # Ligne de débit (dotation)
                    if categorie.compte_dotation:
                        LigneEcriture.objects.create(
                            ecriture=ecriture,
                            compte=categorie.compte_dotation,
                            libelle=f'Dotation amortissement {categorie.libelle}',
                            montant=montant_total,
                            sens='DEBIT'
                        )
                    
                    # Ligne de crédit (amortissement)
                    if categorie.compte_amortissement:
                        LigneEcriture.objects.create(
                            ecriture=ecriture,
                            compte=categorie.compte_amortissement,
                            libelle=f'Amortissement {categorie.libelle}',
                            montant=montant_total,
                            sens='CREDIT'
                        )
                    
                    # Marquer les lignes comme réalisées
                    for ligne in lignes_categorie:
                        ligne.statut = 'REALISE'
                        ligne.ecriture_comptable = ecriture
                        ligne.save()
                    
                    ecritures.append(ecriture)
                
                logger.info(f"Écritures d'amortissement générées pour {periode}: {len(ecritures)} écritures")
                return ecritures
                
        except Exception as e:
            logger.error(f"Erreur génération écritures amortissement: {str(e)}")
            raise ValidationError(f"Impossible de générer les écritures: {str(e)}")
    
    def simuler_changement_methode(
        self, 
        immobilisation: Immobilisation,
        nouvelle_methode: str,
        nouvelle_duree: int = None
    ) -> Dict[str, Any]:
        """
        Simule l'impact d'un changement de méthode d'amortissement.
        """
        try:
            # Plan actuel
            plan_actuel = list(immobilisation.lignes_amortissement.filter(
                statut__in=['PREVISIONNEL', 'REALISE']
            ).order_by('periode'))
            
            # Créer immobilisation fictive avec nouvelle méthode
            immo_simulation = Immobilisation(
                valeur_acquisition=immobilisation.valeur_acquisition,
                frais_acquisition=immobilisation.frais_acquisition,
                valeur_residuelle=immobilisation.valeur_residuelle,
                date_mise_en_service=immobilisation.date_mise_en_service,
                duree_amortissement=nouvelle_duree or immobilisation.duree_amortissement,
                methode_amortissement=nouvelle_methode,
                amortissable=True
            )
            
            # Calculer nouveau plan
            nouveau_plan = self._calculer_plan_temporaire(
                immo_simulation, 
                immobilisation.date_mise_en_service or immobilisation.date_acquisition
            )
            
            # Comparer les plans
            comparaison = []
            for i in range(max(len(plan_actuel), len(nouveau_plan))):
                ligne_actuelle = plan_actuel[i] if i < len(plan_actuel) else None
                ligne_nouvelle = nouveau_plan[i] if i < len(nouveau_plan) else None
                
                comparaison.append({
                    'periode': ligne_actuelle.periode if ligne_actuelle else ligne_nouvelle['periode'],
                    'montant_actuel': float(ligne_actuelle.montant_amortissement) if ligne_actuelle else 0,
                    'montant_nouveau': float(ligne_nouvelle['montant_amortissement']) if ligne_nouvelle else 0,
                    'ecart': float(
                        (ligne_nouvelle['montant_amortissement'] if ligne_nouvelle else Decimal('0')) -
                        (ligne_actuelle.montant_amortissement if ligne_actuelle else Decimal('0'))
                    )
                })
            
            # Calculs de synthèse
            total_actuel = sum(float(ligne.montant_amortissement) for ligne in plan_actuel)
            total_nouveau = sum(float(ligne['montant_amortissement']) for ligne in nouveau_plan)
            
            return {
                'immobilisation_id': immobilisation.id,
                'methode_actuelle': immobilisation.methode_amortissement,
                'methode_nouvelle': nouvelle_methode,
                'duree_actuelle': immobilisation.duree_amortissement,
                'duree_nouvelle': nouvelle_duree or immobilisation.duree_amortissement,
                'total_amortissement_actuel': total_actuel,
                'total_amortissement_nouveau': total_nouveau,
                'ecart_total': total_nouveau - total_actuel,
                'comparaison_detaillee': comparaison,
                'date_simulation': timezone.now().isoformat(),
                'recommandation': self._generer_recommandation_changement_methode(
                    immobilisation, nouvelle_methode, total_actuel, total_nouveau
                )
            }
            
        except Exception as e:
            logger.error(f"Erreur simulation changement méthode: {str(e)}")
            raise ValidationError(f"Impossible de simuler le changement: {str(e)}")
    
    # Méthodes utilitaires
    
    def _calculer_base_amortissement(self, immobilisation: Immobilisation) -> Decimal:
        """Calcule la base d'amortissement."""
        if immobilisation.base_amortissement > 0:
            return immobilisation.base_amortissement
        
        return immobilisation.valeur_brute - immobilisation.valeur_residuelle
    
    def _get_coefficient_degressif(self, duree_annees: int) -> float:
        """Récupère le coefficient dégressif selon la durée."""
        if duree_annees in self.coefficients_degressifs:
            return self.coefficients_degressifs[duree_annees]
        elif duree_annees <= 4:
            return 1.25
        elif duree_annees <= 6:
            return 1.75
        else:
            return 2.25
    
    def _jours_dans_mois(self, date_ref: date) -> int:
        """Calcule le nombre de jours dans un mois."""
        if date_ref.month == 12:
            mois_suivant = date_ref.replace(year=date_ref.year + 1, month=1, day=1)
        else:
            mois_suivant = date_ref.replace(month=date_ref.month + 1, day=1)
        
        dernier_jour = mois_suivant - timedelta(days=1)
        return dernier_jour.day
    
    def _dernier_jour_mois(self, date_ref: date) -> date:
        """Retourne le dernier jour du mois."""
        if date_ref.month == 12:
            return date_ref.replace(year=date_ref.year + 1, month=1, day=1) - timedelta(days=1)
        else:
            return date_ref.replace(month=date_ref.month + 1, day=1) - timedelta(days=1)
    
    def _mois_suivant(self, date_ref: date) -> date:
        """Retourne le premier jour du mois suivant."""
        return (date_ref.replace(day=1) + relativedelta(months=1))
    
    def _calculer_plan_temporaire(self, immobilisation_fictive, date_debut: date) -> List[Dict]:
        """Calcule un plan d'amortissement temporaire pour simulation."""
        # Adapter selon la méthode
        if immobilisation_fictive.methode_amortissement == 'LINEAIRE':
            lignes = self._calculer_amortissement_lineaire(immobilisation_fictive, date_debut)
        elif immobilisation_fictive.methode_amortissement == 'DEGRESSIF':
            lignes = self._calculer_amortissement_degressif(immobilisation_fictive, date_debut)
        elif immobilisation_fictive.methode_amortissement == 'PROGRESSIF':
            lignes = self._calculer_amortissement_progressif(immobilisation_fictive, date_debut)
        else:
            lignes = self._calculer_amortissement_unite_oeuvre(immobilisation_fictive, date_debut)
        
        # Convertir en dictionnaire
        return [
            {
                'periode': ligne.periode,
                'montant_amortissement': ligne.montant_amortissement,
                'cumul_amortissement': ligne.cumul_amortissement,
                'valeur_nette_fin': ligne.valeur_nette_fin
            }
            for ligne in lignes
        ]
    
    def _generer_recommandation_changement_methode(
        self, 
        immobilisation: Immobilisation,
        nouvelle_methode: str,
        total_actuel: float,
        total_nouveau: float
    ) -> str:
        """Génère une recommandation pour le changement de méthode."""
        ecart_pct = ((total_nouveau - total_actuel) / total_actuel) * 100 if total_actuel > 0 else 0
        
        if abs(ecart_pct) < 5:
            return f"L'impact du changement vers {nouvelle_methode} est faible ({ecart_pct:.1f}%)"
        elif ecart_pct > 0:
            return f"Le passage à {nouvelle_methode} augmente les amortissements de {ecart_pct:.1f}%, permettant une optimisation fiscale"
        else:
            return f"Le passage à {nouvelle_methode} réduit les amortissements de {abs(ecart_pct):.1f}%, à évaluer selon la stratégie fiscale"