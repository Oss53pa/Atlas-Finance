"""
Service pour la gestion du budget et contrôle de gestion.
"""
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.db.models import Q, Sum, Count, Avg, Max, Min
from typing import List, Dict, Any, Optional, Tuple
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
from ..models import (
    ExerciceBudgetaire, CentreBudgetaire, LigneBudgetaire,
    BudgetPeriodique, Engagement, AlerteBudgetaire,
    SimulationBudgetaire, TableauBordBudget
)
from apps.accounting.models import LigneEcriture, PlanComptable
from apps.core.models import Societe, AuditLog
import json
import numpy as np
from scipy import stats
import pandas as pd


class BudgetService:
    """Service de gestion budgétaire et contrôle de gestion."""
    
    def create_exercice_budgetaire(self, data: Dict[str, Any], user) -> ExerciceBudgetaire:
        """
        Crée un nouvel exercice budgétaire.
        
        Args:
            data: Données de l'exercice budgétaire
            user: Utilisateur créateur
            
        Returns:
            ExerciceBudgetaire: L'exercice créé
        """
        with transaction.atomic():
            # Validation des données
            self._validate_exercice_data(data)
            
            # Génération automatique du code si non fourni
            if not data.get('code'):
                data['code'] = self._generate_code_exercice(data['societe'], data['date_debut'])
            
            # Création de l'exercice
            exercice = ExerciceBudgetaire.objects.create(
                societe=data['societe'],
                code=data['code'],
                libelle=data['libelle'],
                description=data.get('description'),
                date_debut=data['date_debut'],
                date_fin=data['date_fin'],
                nb_periodes=data.get('nb_periodes', 12),
                devise_budget=data['devise_budget'],
                recalcul_auto=data.get('recalcul_auto', True),
                alerte_depassement=data.get('alerte_depassement', True),
                seuil_alerte=data.get('seuil_alerte', Decimal('10')),
                statut='PREPARATION',
                created_by=user
            )
            
            # Association des axes analytiques
            if data.get('axes_analytiques'):
                exercice.axes_analytiques.set(data['axes_analytiques'])
            
            # Création des centres budgétaires par défaut
            self._create_centres_defaut(exercice, user)
            
            # Log d'audit
            AuditLog.objects.create(
                table_name='ExerciceBudgetaire',
                operation='CREATE',
                record_id=str(exercice.id),
                old_values={},
                new_values=self._exercice_to_dict(exercice),
                user=user,
                timestamp=timezone.now()
            )
            
            return exercice
    
    def generer_budget_historique(self, exercice: ExerciceBudgetaire, 
                                 exercice_reference: int, user) -> Dict[str, Any]:
        """
        Génère un budget basé sur l'historique comptable.
        
        Args:
            exercice: Exercice budgétaire à alimenter
            exercice_reference: Année de référence pour l'historique
            user: Utilisateur
            
        Returns:
            Dict: Résultats de la génération
        """
        if exercice.statut != 'PREPARATION':
            raise ValidationError("Seuls les exercices en préparation peuvent être générés automatiquement")
        
        date_debut_ref = date(exercice_reference, 1, 1)
        date_fin_ref = date(exercice_reference, 12, 31)
        
        lignes_creees = 0
        montant_total = Decimal('0')
        
        with transaction.atomic():
            # Récupération des données historiques
            historique = LigneEcriture.objects.filter(
                ecriture__societe=exercice.societe,
                ecriture__date_ecriture__gte=date_debut_ref,
                ecriture__date_ecriture__lte=date_fin_ref,
                ecriture__statut='VALIDE'
            ).values(
                'compte'
            ).annotate(
                total_debit=Sum('debit'),
                total_credit=Sum('credit')
            )
            
            # Groupement par centre budgétaire (basé sur la classe de compte)
            for donnee in historique:
                compte = PlanComptable.objects.get(id=donnee['compte'])
                centre = self._get_centre_for_compte(exercice, compte)
                
                if not centre:
                    continue
                
                # Calcul du montant net
                montant_net = donnee['total_debit'] - donnee['total_credit']
                if compte.nature == 'CREDIT':
                    montant_net = -montant_net
                
                # Application d'un coefficient de croissance (paramétrable)
                coefficient_croissance = Decimal('1.05')  # 5% de croissance par défaut
                montant_budget = abs(montant_net) * coefficient_croissance
                
                if montant_budget > Decimal('100'):  # Seuil minimum
                    # Création de la ligne budgétaire
                    type_ligne = self._determine_type_ligne(compte)
                    
                    ligne = LigneBudgetaire.objects.create(
                        centre_budgetaire=centre,
                        compte=compte,
                        libelle=f"Budget {compte.libelle}",
                        description=f"Généré automatiquement depuis historique {exercice_reference}",
                        type_ligne=type_ligne,
                        montant_annuel=montant_budget,
                        methode_repartition='HISTORIQUE',
                        controlable=True,
                        created_by=user
                    )
                    
                    # Génération des budgets périodiques
                    self._generer_budgets_periodiques(ligne, exercice_reference, user)
                    
                    lignes_creees += 1
                    montant_total += montant_budget
            
            # Mise à jour des totaux de l'exercice
            self._calculer_totaux_exercice(exercice)
        
        return {
            'lignes_creees': lignes_creees,
            'montant_total': float(montant_total),
            'exercice_reference': exercice_reference,
            'message': f"Budget généré avec {lignes_creees} lignes pour un total de {montant_total}"
        }
    
    def calculer_realisations(self, exercice: ExerciceBudgetaire, 
                            periode: int = None, user = None) -> Dict[str, Any]:
        """
        Calcule les réalisations budgétaires vs budget.
        
        Args:
            exercice: Exercice budgétaire
            periode: Période spécifique (1-12) ou None pour toutes
            user: Utilisateur
            
        Returns:
            Dict: Résultats du calcul des réalisations
        """
        if periode:
            periodes = [periode]
        else:
            periode_actuelle = exercice.get_periode()
            if periode_actuelle:
                periodes = list(range(1, periode_actuelle + 1))
            else:
                periodes = list(range(1, exercice.nb_periodes + 1))
        
        budgets_maj = 0
        alertes_generees = 0
        
        with transaction.atomic():
            for num_periode in periodes:
                # Calcul des dates de la période
                date_debut = exercice.date_debut + relativedelta(months=num_periode-1)
                date_fin = date_debut + relativedelta(months=1) - timedelta(days=1)
                
                # Récupération des budgets périodiques
                budgets_periodiques = BudgetPeriodique.objects.filter(
                    ligne_budgetaire__centre_budgetaire__exercice_budgetaire=exercice,
                    periode=num_periode
                )
                
                for budget in budgets_periodiques:
                    # Calcul de la réalisation
                    realisation = self._calculer_realisation_ligne(
                        budget.ligne_budgetaire, date_debut, date_fin
                    )
                    
                    # Calcul des engagements
                    engagements = self._calculer_engagements_ligne(
                        budget.ligne_budgetaire, date_debut, date_fin
                    )
                    
                    # Mise à jour du budget périodique
                    old_realise = budget.montant_realise
                    budget.montant_realise = realisation
                    budget.montant_engage = engagements
                    budget.calculer_ecarts()
                    budget.save()
                    
                    budgets_maj += 1
                    
                    # Génération d'alertes si nécessaire
                    if self._doit_generer_alerte(budget):
                        self._generer_alerte_budgetaire(budget, user)
                        alertes_generees += 1
            
            # Mise à jour des totaux de l'exercice
            self._calculer_totaux_exercice(exercice)
        
        return {
            'exercice': exercice.code,
            'periodes_traitees': len(periodes),
            'budgets_maj': budgets_maj,
            'alertes_generees': alertes_generees,
            'derniere_maj': timezone.now().isoformat()
        }
    
    def analyser_ecarts_budgetaires(self, exercice: ExerciceBudgetaire, 
                                   config: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Analyse détaillée des écarts budgétaires.
        
        Args:
            exercice: Exercice budgétaire
            config: Configuration de l'analyse
            
        Returns:
            Dict: Analyse des écarts
        """
        if not config:
            config = {}
        
        # Paramètres d'analyse
        seuil_significatif = Decimal(str(config.get('seuil_significatif', 10)))
        inclure_previsions = config.get('inclure_previsions', True)
        grouper_par_centre = config.get('grouper_par_centre', True)
        
        # Récupération des budgets avec écarts
        budgets_query = BudgetPeriodique.objects.filter(
            ligne_budgetaire__centre_budgetaire__exercice_budgetaire=exercice
        ).select_related(
            'ligne_budgetaire', 'ligne_budgetaire__centre_budgetaire', 
            'ligne_budgetaire__compte'
        )
        
        ecarts_significatifs = []
        analyse_par_centre = {}
        tendances = {}
        
        for budget in budgets_query:
            if abs(budget.ecart_relatif) >= seuil_significatif:
                ecart_info = {
                    'centre': budget.ligne_budgetaire.centre_budgetaire.code,
                    'compte': budget.ligne_budgetaire.compte.code,
                    'compte_libelle': budget.ligne_budgetaire.compte.libelle,
                    'periode': budget.periode,
                    'budget': float(budget.montant_budget),
                    'realise': float(budget.montant_realise),
                    'ecart_absolu': float(budget.ecart_absolu),
                    'ecart_relatif': float(budget.ecart_relatif),
                    'statut': budget.statut_realisation,
                    'controlable': budget.ligne_budgetaire.controlable
                }
                
                ecarts_significatifs.append(ecart_info)
                
                # Groupement par centre
                centre_code = budget.ligne_budgetaire.centre_budgetaire.code
                if centre_code not in analyse_par_centre:
                    analyse_par_centre[centre_code] = {
                        'centre': {
                            'code': centre_code,
                            'libelle': budget.ligne_budgetaire.centre_budgetaire.libelle,
                            'responsable': budget.ligne_budgetaire.centre_budgetaire.responsable.get_full_name() 
                                         if budget.ligne_budgetaire.centre_budgetaire.responsable else None
                        },
                        'ecarts': [],
                        'synthese': {
                            'nb_ecarts_positifs': 0,
                            'nb_ecarts_negatifs': 0,
                            'ecart_total': Decimal('0'),
                            'impact_resultat': Decimal('0')
                        }
                    }
                
                analyse_par_centre[centre_code]['ecarts'].append(ecart_info)
                
                # Calcul de la synthèse
                if budget.ecart_absolu > 0:
                    analyse_par_centre[centre_code]['synthese']['nb_ecarts_positifs'] += 1
                else:
                    analyse_par_centre[centre_code]['synthese']['nb_ecarts_negatifs'] += 1
                
                analyse_par_centre[centre_code]['synthese']['ecart_total'] += budget.ecart_absolu
        
        # Analyse des tendances
        tendances = self._analyser_tendances_budgetaires(exercice)
        
        # Recommandations automatiques
        recommandations = self._generer_recommandations_budgetaires(
            ecarts_significatifs, analyse_par_centre
        )
        
        # Conversion des Decimal en float
        self._convert_decimals_to_float(analyse_par_centre)
        
        return {
            'exercice': {
                'code': exercice.code,
                'libelle': exercice.libelle,
                'periode_analyse': exercice.get_periode() or exercice.nb_periodes
            },
            'parametres': config,
            'ecarts_significatifs': ecarts_significatifs,
            'analyse_par_centre': analyse_par_centre,
            'tendances': tendances,
            'recommandations': recommandations,
            'resume': {
                'nb_ecarts_total': len(ecarts_significatifs),
                'nb_centres_impactes': len(analyse_par_centre),
                'ecart_total_absolu': sum(abs(e['ecart_absolu']) for e in ecarts_significatifs),
                'taux_ecart_moyen': sum(abs(e['ecart_relatif']) for e in ecarts_significatifs) / len(ecarts_significatifs) if ecarts_significatifs else 0
            }
        }
    
    def simuler_scenarios_budgetaires(self, exercice: ExerciceBudgetaire,
                                    scenarios: List[Dict], user) -> Dict[str, Any]:
        """
        Simule différents scénarios budgétaires.
        
        Args:
            exercice: Exercice budgétaire
            scenarios: Liste des scénarios à simuler
            user: Utilisateur
            
        Returns:
            Dict: Résultats des simulations
        """
        resultats_simulations = []
        
        for i, scenario in enumerate(scenarios):
            nom_scenario = scenario.get('nom', f'Scénario {i+1}')
            hypotheses = scenario.get('hypotheses', {})
            
            # Simulation du scénario
            resultat = self._simuler_scenario_individuel(exercice, hypotheses)
            
            # Enregistrement de la simulation
            simulation = SimulationBudgetaire.objects.create(
                exercice_budgetaire=exercice,
                nom_simulation=nom_scenario,
                description=scenario.get('description', ''),
                type_simulation='SCENARIO',
                parametres=scenario,
                resultats=resultat,
                executee_par=user
            )
            
            resultats_simulations.append({
                'simulation_id': simulation.id,
                'nom': nom_scenario,
                'hypotheses': hypotheses,
                'resultats': resultat
            })
        
        # Analyse comparative des scénarios
        analyse_comparative = self._comparer_scenarios(resultats_simulations)
        
        return {
            'exercice': exercice.code,
            'nb_scenarios': len(scenarios),
            'simulations': resultats_simulations,
            'analyse_comparative': analyse_comparative,
            'recommandations': self._recommander_scenario_optimal(resultats_simulations)
        }
    
    def generer_tableau_bord_budget(self, exercice: ExerciceBudgetaire,
                                   config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Génère un tableau de bord budgétaire.
        
        Args:
            exercice: Exercice budgétaire
            config: Configuration du tableau de bord
            
        Returns:
            Dict: Données du tableau de bord
        """
        # Indicateurs clés de performance
        kpis = self._calculer_kpis_budgetaires(exercice)
        
        # Graphiques et visualisations
        graphiques = self._generer_graphiques_budget(exercice, config)
        
        # Alertes actives
        alertes_actives = AlerteBudgetaire.objects.filter(
            exercice_budgetaire=exercice,
            statut='ACTIVE'
        ).order_by('-niveau', '-date_creation')[:10]
        
        # Engagements importants
        engagements_importants = Engagement.objects.filter(
            ligne_budgetaire__centre_budgetaire__exercice_budgetaire=exercice,
            statut='EN_COURS',
            montant_engage__gte=Decimal('100000')  # Seuil paramétrable
        ).order_by('-montant_engage')[:10]
        
        # Top des écarts
        top_ecarts = BudgetPeriodique.objects.filter(
            ligne_budgetaire__centre_budgetaire__exercice_budgetaire=exercice
        ).exclude(
            ecart_absolu=0
        ).order_by('-ecart_absolu')[:10]
        
        return {
            'exercice': {
                'code': exercice.code,
                'libelle': exercice.libelle,
                'statut': exercice.statut,
                'periode_actuelle': exercice.get_periode()
            },
            'kpis': kpis,
            'graphiques': graphiques,
            'alertes': [
                {
                    'id': alerte.id,
                    'titre': alerte.titre,
                    'niveau': alerte.niveau,
                    'message': alerte.message,
                    'date_creation': alerte.date_creation.isoformat(),
                    'centre': alerte.centre_budgetaire.libelle if alerte.centre_budgetaire else None
                }
                for alerte in alertes_actives
            ],
            'engagements_importants': [
                {
                    'numero': eng.numero,
                    'libelle': eng.libelle,
                    'montant': float(eng.montant_engage),
                    'tiers': eng.tiers.raison_sociale if eng.tiers else None,
                    'date_echeance': eng.date_echeance.isoformat() if eng.date_echeance else None
                }
                for eng in engagements_importants
            ],
            'top_ecarts': [
                {
                    'centre': budget.ligne_budgetaire.centre_budgetaire.libelle,
                    'compte': budget.ligne_budgetaire.compte.libelle,
                    'periode': budget.periode,
                    'ecart_absolu': float(budget.ecart_absolu),
                    'ecart_relatif': float(budget.ecart_relatif),
                    'statut': budget.statut_realisation
                }
                for budget in top_ecarts
            ],
            'derniere_maj': timezone.now().isoformat()
        }
    
    def _validate_exercice_data(self, data: Dict[str, Any]) -> None:
        """Valide les données d'un exercice budgétaire."""
        required_fields = ['societe', 'libelle', 'date_debut', 'date_fin', 'devise_budget']
        
        for field in required_fields:
            if field not in data or not data[field]:
                raise ValidationError(f"Le champ '{field}' est requis")
        
        if data['date_fin'] <= data['date_debut']:
            raise ValidationError("La date de fin doit être postérieure à la date de début")
        
        # Vérification de chevauchement avec d'autres exercices
        existing = ExerciceBudgetaire.objects.filter(
            societe=data['societe'],
            date_debut__lt=data['date_fin'],
            date_fin__gt=data['date_debut']
        )
        
        if existing.exists():
            raise ValidationError("Chevauchement avec un exercice budgétaire existant")
    
    def _generate_code_exercice(self, societe: Societe, date_debut: date) -> str:
        """Génère un code automatique pour l'exercice budgétaire."""
        return f"BUDGET-{date_debut.year}"
    
    def _create_centres_defaut(self, exercice: ExerciceBudgetaire, user) -> None:
        """Crée les centres budgétaires par défaut."""
        centres_defaut = [
            {
                'code': 'ADMIN',
                'libelle': 'Administration générale',
                'type_centre': 'COUTS',
                'budget_charges': True
            },
            {
                'code': 'COMMERCIAL',
                'libelle': 'Direction commerciale',
                'type_centre': 'PROFIT',
                'budget_recettes': True,
                'budget_charges': True
            },
            {
                'code': 'PRODUCTION',
                'libelle': 'Production',
                'type_centre': 'COUTS',
                'budget_charges': True
            }
        ]
        
        for centre_data in centres_defaut:
            CentreBudgetaire.objects.create(
                exercice_budgetaire=exercice,
                code=centre_data['code'],
                libelle=centre_data['libelle'],
                type_centre=centre_data['type_centre'],
                budget_recettes=centre_data.get('budget_recettes', False),
                budget_charges=centre_data.get('budget_charges', True),
                created_by=user
            )
    
    def _get_centre_for_compte(self, exercice: ExerciceBudgetaire, compte: PlanComptable) -> Optional[CentreBudgetaire]:
        """Détermine le centre budgétaire approprié pour un compte."""
        classe_compte = int(compte.code[0])
        
        # Règles de mapping par défaut
        if classe_compte == 6:  # Charges
            return exercice.centres_budgetaires.filter(
                budget_charges=True, type_centre__in=['COUTS', 'PROFIT']
            ).first()
        elif classe_compte == 7:  # Produits
            return exercice.centres_budgetaires.filter(
                budget_recettes=True, type_centre__in=['RECETTES', 'PROFIT']
            ).first()
        
        return exercice.centres_budgetaires.first()  # Par défaut
    
    def _determine_type_ligne(self, compte: PlanComptable) -> str:
        """Détermine le type de ligne budgétaire selon le compte."""
        classe_compte = int(compte.code[0])
        
        if classe_compte == 6:
            return 'CHARGE'
        elif classe_compte == 7:
            return 'PRODUIT'
        elif classe_compte == 2:
            return 'INVESTISSEMENT'
        else:
            return 'CHARGE'
    
    def _generer_budgets_periodiques(self, ligne: LigneBudgetaire, 
                                   exercice_reference: int, user) -> None:
        """Génère les budgets périodiques pour une ligne."""
        exercice = ligne.centre_budgetaire.exercice_budgetaire
        
        for periode in range(1, exercice.nb_periodes + 1):
            date_debut = exercice.date_debut + relativedelta(months=periode-1)
            date_fin = date_debut + relativedelta(months=1) - timedelta(days=1)
            
            montant_periode = ligne.get_montant_periode(periode)
            
            BudgetPeriodique.objects.create(
                ligne_budgetaire=ligne,
                exercice=exercice.date_debut.year,
                periode=periode,
                date_debut=date_debut,
                date_fin=date_fin,
                montant_budget=montant_periode,
                created_by=user
            )
    
    def _calculer_realisation_ligne(self, ligne: LigneBudgetaire, 
                                  date_debut: date, date_fin: date) -> Decimal:
        """Calcule la réalisation pour une ligne budgétaire."""
        lignes_comptables = LigneEcriture.objects.filter(
            compte=ligne.compte,
            ecriture__date_ecriture__gte=date_debut,
            ecriture__date_ecriture__lte=date_fin,
            ecriture__statut='VALIDE'
        )
        
        total_debit = lignes_comptables.aggregate(
            total=Sum('debit')
        )['total'] or Decimal('0')
        
        total_credit = lignes_comptables.aggregate(
            total=Sum('credit')
        )['total'] or Decimal('0')
        
        # Calcul selon la nature du compte
        if ligne.type_ligne == 'CHARGE':
            return total_debit - total_credit
        elif ligne.type_ligne == 'PRODUIT':
            return total_credit - total_debit
        else:
            return abs(total_debit - total_credit)
    
    def _calculer_engagements_ligne(self, ligne: LigneBudgetaire,
                                  date_debut: date, date_fin: date) -> Decimal:
        """Calcule les engagements pour une ligne budgétaire."""
        return ligne.engagements.filter(
            date_engagement__gte=date_debut,
            date_engagement__lte=date_fin,
            statut__in=['EN_COURS', 'FACTURE']
        ).aggregate(
            total=Sum('montant_restant')
        )['total'] or Decimal('0')
    
    def _calculer_totaux_exercice(self, exercice: ExerciceBudgetaire) -> None:
        """Calcule les totaux de l'exercice budgétaire."""
        lignes_produits = LigneBudgetaire.objects.filter(
            centre_budgetaire__exercice_budgetaire=exercice,
            type_ligne='PRODUIT'
        )
        
        lignes_charges = LigneBudgetaire.objects.filter(
            centre_budgetaire__exercice_budgetaire=exercice,
            type_ligne='CHARGE'
        )
        
        total_produits = lignes_produits.aggregate(
            total=Sum('montant_annuel')
        )['total'] or Decimal('0')
        
        total_charges = lignes_charges.aggregate(
            total=Sum('montant_annuel')
        )['total'] or Decimal('0')
        
        exercice.total_produits_budgetes = total_produits
        exercice.total_charges_budgetees = total_charges
        exercice.resultat_budgete = total_produits - total_charges
        exercice.save(update_fields=[
            'total_produits_budgetes', 'total_charges_budgetees', 'resultat_budgete'
        ])
    
    def _doit_generer_alerte(self, budget: BudgetPeriodique) -> bool:
        """Détermine si une alerte doit être générée."""
        return (
            budget.statut_realisation in ['DEPASSEMENT', 'ALERTE'] and
            not AlerteBudgetaire.objects.filter(
                ligne_budgetaire=budget.ligne_budgetaire,
                type_alerte='DEPASSEMENT',
                statut='ACTIVE'
            ).exists()
        )
    
    def _generer_alerte_budgetaire(self, budget: BudgetPeriodique, user) -> AlerteBudgetaire:
        """Génère une alerte budgétaire."""
        if budget.statut_realisation == 'DEPASSEMENT':
            niveau = 'ERROR'
            type_alerte = 'DEPASSEMENT'
            titre = f"Dépassement budgétaire - {budget.ligne_budgetaire.centre_budgetaire.libelle}"
            message = f"Dépassement de {budget.ecart_relatif}% sur {budget.ligne_budgetaire.compte.libelle}"
        else:
            niveau = 'WARNING'
            type_alerte = 'DERIVE'
            titre = f"Dérive budgétaire - {budget.ligne_budgetaire.centre_budgetaire.libelle}"
            message = f"Écart de {budget.ecart_relatif}% sur {budget.ligne_budgetaire.compte.libelle}"
        
        return AlerteBudgetaire.objects.create(
            exercice_budgetaire=budget.ligne_budgetaire.centre_budgetaire.exercice_budgetaire,
            centre_budgetaire=budget.ligne_budgetaire.centre_budgetaire,
            ligne_budgetaire=budget.ligne_budgetaire,
            type_alerte=type_alerte,
            niveau=niveau,
            titre=titre,
            message=message,
            valeur_actuelle=budget.montant_realise,
            valeur_seuil=budget.montant_budget,
            ecart_pourcentage=budget.ecart_relatif,
            created_by=user
        )
    
    def _analyser_tendances_budgetaires(self, exercice: ExerciceBudgetaire) -> Dict[str, Any]:
        """Analyse les tendances budgétaires."""
        # Implémentation simplifiée - à enrichir avec des analyses statistiques
        budgets = BudgetPeriodique.objects.filter(
            ligne_budgetaire__centre_budgetaire__exercice_budgetaire=exercice
        ).order_by('periode')
        
        tendances = {
            'ecart_moyen_par_periode': {},
            'evolution_globale': 'stable',
            'periodes_critiques': []
        }
        
        # Calcul des écarts moyens par période
        for periode in range(1, exercice.nb_periodes + 1):
            budgets_periode = budgets.filter(periode=periode)
            if budgets_periode.exists():
                ecart_moyen = budgets_periode.aggregate(
                    avg_ecart=Avg('ecart_relatif')
                )['avg_ecart'] or 0
                
                tendances['ecart_moyen_par_periode'][str(periode)] = float(ecart_moyen)
                
                if abs(ecart_moyen) > 15:  # Seuil critique
                    tendances['periodes_critiques'].append(periode)
        
        return tendances
    
    def _generer_recommandations_budgetaires(self, ecarts: List[Dict], 
                                          analyse_centres: Dict) -> List[Dict]:
        """Génère des recommandations automatiques."""
        recommandations = []
        
        # Analyse des écarts récurrents
        comptes_recurrents = {}
        for ecart in ecarts:
            compte = ecart['compte']
            if compte not in comptes_recurrents:
                comptes_recurrents[compte] = []
            comptes_recurrents[compte].append(ecart)
        
        for compte, ecarts_compte in comptes_recurrents.items():
            if len(ecarts_compte) >= 3:  # Écarts sur au moins 3 périodes
                recommandations.append({
                    'type': 'REVISION_BUDGET',
                    'priorite': 'HIGH',
                    'titre': f'Révision budgétaire recommandée - {compte}',
                    'description': f'Écarts récurrents détectés sur {len(ecarts_compte)} périodes',
                    'actions': [
                        'Analyser les causes des écarts',
                        'Réviser les hypothèses budgétaires',
                        'Mettre à jour les prévisions'
                    ]
                })
        
        return recommandations
    
    def _simuler_scenario_individuel(self, exercice: ExerciceBudgetaire, 
                                   hypotheses: Dict) -> Dict[str, Any]:
        """Simule un scénario budgétaire individuel."""
        # Implémentation simplifiée - à enrichir avec des modèles de simulation avancés
        resultats = {
            'total_produits': float(exercice.total_produits_budgetes),
            'total_charges': float(exercice.total_charges_budgetees),
            'resultat': float(exercice.resultat_budgete)
        }
        
        # Application des hypothèses
        if 'croissance_ca' in hypotheses:
            croissance = Decimal(str(hypotheses['croissance_ca'])) / 100
            resultats['total_produits'] *= float(1 + croissance)
        
        if 'evolution_charges' in hypotheses:
            evolution = Decimal(str(hypotheses['evolution_charges'])) / 100
            resultats['total_charges'] *= float(1 + evolution)
        
        resultats['resultat'] = resultats['total_produits'] - resultats['total_charges']
        resultats['marge'] = (resultats['resultat'] / resultats['total_produits']) * 100 if resultats['total_produits'] > 0 else 0
        
        return resultats
    
    def _comparer_scenarios(self, simulations: List[Dict]) -> Dict[str, Any]:
        """Compare les résultats des différents scénarios."""
        if not simulations:
            return {}
        
        # Analyse comparative simple
        resultats = [s['resultats'] for s in simulations]
        
        return {
            'meilleur_resultat': max(resultats, key=lambda x: x['resultat']),
            'pire_resultat': min(resultats, key=lambda x: x['resultat']),
            'resultat_moyen': sum(r['resultat'] for r in resultats) / len(resultats),
            'ecart_type': np.std([r['resultat'] for r in resultats]) if len(resultats) > 1 else 0
        }
    
    def _recommander_scenario_optimal(self, simulations: List[Dict]) -> Dict[str, Any]:
        """Recommande le scénario optimal."""
        if not simulations:
            return {}
        
        # Calcul de score composite (à enrichir selon les critères métier)
        meilleur_score = -float('inf')
        scenario_optimal = None
        
        for simulation in simulations:
            resultats = simulation['resultats']
            # Score simple basé sur le résultat et la marge
            score = resultats['resultat'] * 0.7 + resultats['marge'] * 0.3
            
            if score > meilleur_score:
                meilleur_score = score
                scenario_optimal = simulation
        
        return {
            'scenario_recommande': scenario_optimal['nom'] if scenario_optimal else None,
            'score': meilleur_score,
            'justification': 'Meilleur équilibre résultat/marge'
        }
    
    def _calculer_kpis_budgetaires(self, exercice: ExerciceBudgetaire) -> Dict[str, Any]:
        """Calcule les KPIs budgétaires."""
        periode_actuelle = exercice.get_periode() or exercice.nb_periodes
        
        # Calculs des réalisations cumulées
        budgets_periodiques = BudgetPeriodique.objects.filter(
            ligne_budgetaire__centre_budgetaire__exercice_budgetaire=exercice,
            periode__lte=periode_actuelle
        )
        
        totaux = budgets_periodiques.aggregate(
            budget_cumule=Sum('montant_budget'),
            realise_cumule=Sum('montant_realise'),
            engage_cumule=Sum('montant_engage')
        )
        
        budget_cumule = totaux['budget_cumule'] or Decimal('0')
        realise_cumule = totaux['realise_cumule'] or Decimal('0')
        engage_cumule = totaux['engage_cumule'] or Decimal('0')
        
        # Calcul des KPIs
        taux_execution = (realise_cumule / budget_cumule * 100) if budget_cumule > 0 else 0
        taux_engagement = (engage_cumule / budget_cumule * 100) if budget_cumule > 0 else 0
        
        return {
            'periode_actuelle': periode_actuelle,
            'budget_annuel': float(exercice.total_charges_budgetees + exercice.total_produits_budgetes),
            'budget_cumule': float(budget_cumule),
            'realise_cumule': float(realise_cumule),
            'engage_cumule': float(engage_cumule),
            'taux_execution': float(taux_execution),
            'taux_engagement': float(taux_engagement),
            'disponible': float(budget_cumule - engage_cumule),
            'resultat_previsionnel': float(exercice.resultat_budgete)
        }
    
    def _generer_graphiques_budget(self, exercice: ExerciceBudgetaire, 
                                 config: Dict[str, Any]) -> Dict[str, Any]:
        """Génère les données pour les graphiques budgétaires."""
        # Configuration des graphiques demandés
        graphiques = {}
        
        if config.get('evolution_mensuelle', True):
            graphiques['evolution_mensuelle'] = self._data_evolution_mensuelle(exercice)
        
        if config.get('repartition_centres', True):
            graphiques['repartition_centres'] = self._data_repartition_centres(exercice)
        
        if config.get('ecarts_significatifs', True):
            graphiques['ecarts_significatifs'] = self._data_ecarts_significatifs(exercice)
        
        return graphiques
    
    def _data_evolution_mensuelle(self, exercice: ExerciceBudgetaire) -> Dict[str, Any]:
        """Données pour le graphique d'évolution mensuelle."""
        data = {
            'labels': [],
            'datasets': [
                {'label': 'Budget', 'data': []},
                {'label': 'Réalisé', 'data': []},
                {'label': 'Engagé', 'data': []}
            ]
        }
        
        for periode in range(1, exercice.nb_periodes + 1):
            data['labels'].append(f'P{periode}')
            
            totaux = BudgetPeriodique.objects.filter(
                ligne_budgetaire__centre_budgetaire__exercice_budgetaire=exercice,
                periode=periode
            ).aggregate(
                budget=Sum('montant_budget'),
                realise=Sum('montant_realise'),
                engage=Sum('montant_engage')
            )
            
            data['datasets'][0]['data'].append(float(totaux['budget'] or 0))
            data['datasets'][1]['data'].append(float(totaux['realise'] or 0))
            data['datasets'][2]['data'].append(float(totaux['engage'] or 0))
        
        return data
    
    def _data_repartition_centres(self, exercice: ExerciceBudgetaire) -> Dict[str, Any]:
        """Données pour le graphique de répartition par centres."""
        centres_data = []
        
        for centre in exercice.centres_budgetaires.all():
            total_budget = centre.lignes_budget.aggregate(
                total=Sum('montant_annuel')
            )['total'] or Decimal('0')
            
            centres_data.append({
                'label': centre.libelle,
                'value': float(total_budget),
                'center_code': centre.code
            })
        
        return {
            'labels': [item['label'] for item in centres_data],
            'data': [item['value'] for item in centres_data],
            'details': centres_data
        }
    
    def _data_ecarts_significatifs(self, exercice: ExerciceBudgetaire) -> Dict[str, Any]:
        """Données pour le graphique des écarts significatifs."""
        budgets_avec_ecarts = BudgetPeriodique.objects.filter(
            ligne_budgetaire__centre_budgetaire__exercice_budgetaire=exercice
        ).exclude(ecart_absolu=0).order_by('-ecart_absolu')[:10]
        
        return {
            'labels': [f"{b.ligne_budgetaire.centre_budgetaire.code}-P{b.periode}" for b in budgets_avec_ecarts],
            'data': [float(b.ecart_absolu) for b in budgets_avec_ecarts],
            'colors': ['red' if b.ecart_absolu > 0 else 'green' for b in budgets_avec_ecarts]
        }
    
    def _exercice_to_dict(self, exercice: ExerciceBudgetaire) -> Dict[str, Any]:
        """Convertit un exercice en dictionnaire pour l'audit."""
        return {
            'code': exercice.code,
            'libelle': exercice.libelle,
            'date_debut': exercice.date_debut.isoformat(),
            'date_fin': exercice.date_fin.isoformat(),
            'statut': exercice.statut,
            'nb_periodes': exercice.nb_periodes
        }
    
    def _convert_decimals_to_float(self, obj):
        """Convertit récursivement les Decimal en float."""
        if isinstance(obj, dict):
            for key, value in obj.items():
                if isinstance(value, Decimal):
                    obj[key] = float(value)
                elif isinstance(value, (dict, list)):
                    self._convert_decimals_to_float(value)
        elif isinstance(obj, list):
            for i, item in enumerate(obj):
                if isinstance(item, Decimal):
                    obj[i] = float(item)
                elif isinstance(item, (dict, list)):
                    self._convert_decimals_to_float(item)