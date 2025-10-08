"""
Service pour la comptabilité analytique multi-axes.
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
    AxeAnalytique, SectionAnalytique, VentilationAnalytique,
    ModeleVentilation, BalanceAnalytique, RepartitionAutomatique,
    LigneRepartition, TableauBord, CleRepartition
)
from apps.accounting.models import LigneEcriture, PlanComptable, Ecriture, Journal
from apps.core.models import Societe, AuditLog


class AnalytiqueService:
    """Service de gestion de la comptabilité analytique."""
    
    def ventiler_ecriture(self, ligne_ecriture: LigneEcriture, ventilations: List[Dict], user) -> List[VentilationAnalytique]:
        """
        Ventile une ligne d'écriture sur plusieurs sections analytiques.
        
        Args:
            ligne_ecriture: Ligne d'écriture à ventiler
            ventilations: Liste des ventilations [{section_id, pourcentage, montant}]
            user: Utilisateur
            
        Returns:
            List[VentilationAnalytique]: Ventilations créées
        """
        # Validation de l'équilibrage
        total_pourcentage = sum(v.get('pourcentage', 0) for v in ventilations)
        if abs(total_pourcentage - 100) > Decimal('0.01'):
            raise ValidationError(f"La ventilation doit totaliser 100% (actuel: {total_pourcentage}%)")
        
        montant_base = ligne_ecriture.debit or ligne_ecriture.credit
        total_montant = sum(v.get('montant', 0) for v in ventilations)
        if abs(total_montant - montant_base) > Decimal('0.01'):
            raise ValidationError(f"Le total des montants ventilés ({total_montant}) doit égaler le montant de base ({montant_base})")
        
        with transaction.atomic():
            # Suppression des ventilations existantes
            ligne_ecriture.ventilations.all().delete()
            
            # Création des nouvelles ventilations
            ventilations_creees = []
            for ventilation_data in ventilations:
                section = SectionAnalytique.objects.get(id=ventilation_data['section_id'])
                
                # Validation que la section appartient à un axe autorisé pour ce compte
                if section.axe.comptes_concernes.exists():
                    if ligne_ecriture.compte not in section.axe.comptes_concernes.all():
                        continue  # Skip si le compte n'est pas concerné par cet axe
                
                ventilation = VentilationAnalytique.objects.create(
                    ligne_ecriture=ligne_ecriture,
                    section=section,
                    montant=ventilation_data['montant'],
                    pourcentage=ventilation_data['pourcentage'],
                    libelle=ventilation_data.get('libelle'),
                    reference=ventilation_data.get('reference'),
                    created_by=user
                )
                ventilations_creees.append(ventilation)
            
            # Mise à jour de la section analytique dans la ligne d'écriture
            self._update_ligne_section_analytique(ligne_ecriture)
            
            return ventilations_creees
    
    def appliquer_modele_ventilation(self, ligne_ecriture: LigneEcriture, modele: ModeleVentilation, user) -> List[VentilationAnalytique]:
        """
        Applique un modèle de ventilation à une ligne d'écriture.
        
        Args:
            ligne_ecriture: Ligne d'écriture
            modele: Modèle de ventilation
            user: Utilisateur
            
        Returns:
            List[VentilationAnalytique]: Ventilations créées
        """
        ventilations = []
        montant_base = ligne_ecriture.debit or ligne_ecriture.credit
        
        for axe_code, sections_data in modele.ventilations_defaut.items():
            try:
                axe = AxeAnalytique.objects.get(
                    societe=modele.societe,
                    code=axe_code,
                    is_active=True
                )
            except AxeAnalytique.DoesNotExist:
                continue
            
            for section_data in sections_data:
                section_code = section_data['section_code']
                pourcentage = Decimal(str(section_data['pourcentage']))
                
                try:
                    section = SectionAnalytique.objects.get(
                        axe=axe,
                        code=section_code,
                        is_active=True
                    )
                    
                    montant = (montant_base * pourcentage) / 100
                    
                    ventilations.append({
                        'section_id': section.id,
                        'pourcentage': float(pourcentage),
                        'montant': float(montant),
                        'libelle': section_data.get('libelle', f"Ventilation {section.libelle}")
                    })
                    
                except SectionAnalytique.DoesNotExist:
                    continue
        
        if ventilations:
            return self.ventiler_ecriture(ligne_ecriture, ventilations, user)
        
        return []
    
    def calculer_balances_analytiques(self, societe: Societe, exercice: int, 
                                    periode: str = None, user = None) -> Dict[str, Any]:
        """
        Calcule les balances analytiques pour une période.
        
        Args:
            societe: Société concernée
            exercice: Exercice comptable
            periode: Période spécifique (format YYYY-MM) ou None pour tout l'exercice
            user: Utilisateur
            
        Returns:
            Dict: Résultats du calcul
        """
        if periode:
            date_debut = date(exercice, int(periode.split('-')[1]), 1)
            date_fin = date_debut + relativedelta(months=1) - timedelta(days=1)
            periode_key = periode
        else:
            date_debut = date(exercice, 1, 1)
            date_fin = date(exercice, 12, 31)
            periode_key = str(exercice)
        
        # Suppression des balances existantes pour cette période
        BalanceAnalytique.objects.filter(
            societe=societe,
            exercice=exercice,
            periode=periode_key
        ).delete()
        
        balances_creees = 0
        
        with transaction.atomic():
            # Récupération de toutes les ventilations de la période
            ventilations = VentilationAnalytique.objects.filter(
                ligne_ecriture__ecriture__societe=societe,
                ligne_ecriture__ecriture__date_ecriture__gte=date_debut,
                ligne_ecriture__ecriture__date_ecriture__lte=date_fin,
                ligne_ecriture__ecriture__statut='VALIDE'
            ).select_related('section', 'ligne_ecriture', 'ligne_ecriture__compte')
            
            # Groupement par section et compte
            balances_temp = {}
            
            for ventilation in ventilations:
                key = (ventilation.section.id, ventilation.ligne_ecriture.compte.id)
                
                if key not in balances_temp:
                    balances_temp[key] = {
                        'section': ventilation.section,
                        'compte': ventilation.ligne_ecriture.compte,
                        'mouvement_debit': Decimal('0'),
                        'mouvement_credit': Decimal('0'),
                        'nb_mouvements': 0
                    }
                
                # Détermination du sens du mouvement
                if ventilation.ligne_ecriture.debit > 0:
                    balances_temp[key]['mouvement_debit'] += ventilation.montant
                else:
                    balances_temp[key]['mouvement_credit'] += ventilation.montant
                
                balances_temp[key]['nb_mouvements'] += 1
            
            # Création des enregistrements de balance
            for balance_data in balances_temp.values():
                solde_final = balance_data['mouvement_debit'] - balance_data['mouvement_credit']
                
                if solde_final > 0:
                    type_solde = 'DEBIT'
                elif solde_final < 0:
                    type_solde = 'CREDIT'
                else:
                    type_solde = 'EQUILIBRE'
                
                BalanceAnalytique.objects.create(
                    societe=societe,
                    section=balance_data['section'],
                    compte=balance_data['compte'],
                    exercice=exercice,
                    periode=periode_key,
                    date_debut=date_debut,
                    date_fin=date_fin,
                    mouvement_debit=balance_data['mouvement_debit'],
                    mouvement_credit=balance_data['mouvement_credit'],
                    solde_final=abs(solde_final),
                    type_solde=type_solde,
                    nb_mouvements=balance_data['nb_mouvements'],
                    created_by=user
                )
                balances_creees += 1
        
        return {
            'exercice': exercice,
            'periode': periode_key,
            'date_debut': date_debut.isoformat(),
            'date_fin': date_fin.isoformat(),
            'balances_creees': balances_creees
        }
    
    def executer_repartition_automatique(self, repartition: RepartitionAutomatique, 
                                       date_execution: date, user) -> Dict[str, Any]:
        """
        Exécute une répartition automatique.
        
        Args:
            repartition: Règle de répartition
            date_execution: Date d'exécution
            user: Utilisateur
            
        Returns:
            Dict: Résultats de l'exécution
        """
        if not repartition.is_active:
            raise ValidationError("La répartition n'est pas active")
        
        if date_execution < repartition.date_debut:
            raise ValidationError("Date d'exécution antérieure à la date de début")
        
        if repartition.date_fin and date_execution > repartition.date_fin:
            raise ValidationError("Date d'exécution postérieure à la date de fin")
        
        # Détermination de la période
        if repartition.frequence == 'MENSUELLE':
            date_debut = date_execution.replace(day=1)
            date_fin = date_debut + relativedelta(months=1) - timedelta(days=1)
        elif repartition.frequence == 'TRIMESTRIELLE':
            mois_debut = ((date_execution.month - 1) // 3) * 3 + 1
            date_debut = date_execution.replace(month=mois_debut, day=1)
            date_fin = date_debut + relativedelta(months=3) - timedelta(days=1)
        elif repartition.frequence == 'SEMESTRIELLE':
            mois_debut = 1 if date_execution.month <= 6 else 7
            date_debut = date_execution.replace(month=mois_debut, day=1)
            date_fin = date_debut + relativedelta(months=6) - timedelta(days=1)
        else:  # ANNUELLE
            date_debut = date_execution.replace(month=1, day=1)
            date_fin = date_execution.replace(month=12, day=31)
        
        # Calcul du montant total à répartir
        montant_total = self._calculer_montant_repartition(
            repartition, date_debut, date_fin
        )
        
        if montant_total == 0:
            return {
                'montant_total': 0,
                'ecritures_creees': 0,
                'message': 'Aucun montant à répartir'
            }
        
        ecritures_creees = 0
        
        with transaction.atomic():
            # Création de l'écriture de répartition
            ecriture = self._creer_ecriture_repartition(
                repartition, montant_total, date_execution, user
            )
            
            if ecriture:
                ecritures_creees = 1
            
            # Mise à jour de la date d'exécution
            repartition.derniere_execution = timezone.now()
            repartition.save(update_fields=['derniere_execution'])
        
        return {
            'montant_total': float(montant_total),
            'ecritures_creees': ecritures_creees,
            'ecriture_id': ecriture.id if ecriture else None,
            'date_debut': date_debut.isoformat(),
            'date_fin': date_fin.isoformat()
        }
    
    def generer_rapport_analytique(self, societe: Societe, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Génère un rapport analytique personnalisé.
        
        Args:
            societe: Société concernée
            config: Configuration du rapport
            
        Returns:
            Dict: Données du rapport
        """
        # Configuration par défaut
        exercice = config.get('exercice', date.today().year)
        axes_analyses = config.get('axes', [])
        comptes_inclus = config.get('comptes', [])
        date_debut = config.get('date_debut')
        date_fin = config.get('date_fin')
        
        if not date_debut:
            date_debut = date(exercice, 1, 1)
        if not date_fin:
            date_fin = date(exercice, 12, 31)
        
        # Récupération des balances analytiques
        balances_query = BalanceAnalytique.objects.filter(
            societe=societe,
            date_debut__gte=date_debut,
            date_fin__lte=date_fin
        )
        
        if axes_analyses:
            balances_query = balances_query.filter(section__axe__code__in=axes_analyses)
        
        if comptes_inclus:
            balances_query = balances_query.filter(compte__code__in=comptes_inclus)
        
        balances = balances_query.select_related('section', 'section__axe', 'compte')
        
        # Structuration des données
        donnees = {
            'config': config,
            'periode': {
                'debut': date_debut.isoformat(),
                'fin': date_fin.isoformat()
            },
            'axes': {},
            'totaux': {
                'total_debit': Decimal('0'),
                'total_credit': Decimal('0'),
                'solde_net': Decimal('0')
            }
        }
        
        # Groupement par axe et section
        for balance in balances:
            axe_code = balance.section.axe.code
            section_code = balance.section.code
            
            if axe_code not in donnees['axes']:
                donnees['axes'][axe_code] = {
                    'axe': {
                        'code': axe_code,
                        'libelle': balance.section.axe.libelle,
                        'type': balance.section.axe.type_axe
                    },
                    'sections': {},
                    'totaux': {
                        'debit': Decimal('0'),
                        'credit': Decimal('0'),
                        'solde': Decimal('0')
                    }
                }
            
            if section_code not in donnees['axes'][axe_code]['sections']:
                donnees['axes'][axe_code]['sections'][section_code] = {
                    'section': {
                        'code': section_code,
                        'libelle': balance.section.libelle,
                        'responsable': balance.section.responsable.get_full_name() if balance.section.responsable else None
                    },
                    'comptes': [],
                    'totaux': {
                        'debit': Decimal('0'),
                        'credit': Decimal('0'),
                        'solde': Decimal('0')
                    }
                }
            
            # Ajout du compte
            solde_compte = balance.solde_final if balance.type_solde == 'DEBIT' else -balance.solde_final
            
            donnees['axes'][axe_code]['sections'][section_code]['comptes'].append({
                'compte': {
                    'code': balance.compte.code,
                    'libelle': balance.compte.libelle
                },
                'mouvement_debit': float(balance.mouvement_debit),
                'mouvement_credit': float(balance.mouvement_credit),
                'solde': float(solde_compte),
                'nb_mouvements': balance.nb_mouvements
            })
            
            # Mise à jour des totaux
            donnees['axes'][axe_code]['sections'][section_code]['totaux']['debit'] += balance.mouvement_debit
            donnees['axes'][axe_code]['sections'][section_code]['totaux']['credit'] += balance.mouvement_credit
            donnees['axes'][axe_code]['sections'][section_code]['totaux']['solde'] += solde_compte
            
            donnees['axes'][axe_code]['totaux']['debit'] += balance.mouvement_debit
            donnees['axes'][axe_code]['totaux']['credit'] += balance.mouvement_credit
            donnees['axes'][axe_code]['totaux']['solde'] += solde_compte
            
            donnees['totaux']['total_debit'] += balance.mouvement_debit
            donnees['totaux']['total_credit'] += balance.mouvement_credit
            donnees['totaux']['solde_net'] += solde_compte
        
        # Conversion des Decimal en float pour la sérialisation JSON
        self._convert_decimals_to_float(donnees)
        
        return donnees
    
    def analyser_rentabilite_sections(self, societe: Societe, axe: AxeAnalytique, 
                                    exercice: int) -> Dict[str, Any]:
        """
        Analyse la rentabilité des sections d'un axe analytique.
        
        Args:
            societe: Société concernée
            axe: Axe analytique à analyser
            exercice: Exercice comptable
            
        Returns:
            Dict: Analyse de rentabilité
        """
        date_debut = date(exercice, 1, 1)
        date_fin = date(exercice, 12, 31)
        
        # Récupération des balances pour l'axe
        balances = BalanceAnalytique.objects.filter(
            societe=societe,
            section__axe=axe,
            exercice=exercice
        ).select_related('section', 'compte')
        
        # Analyse par section
        sections_analyse = {}
        
        for balance in balances:
            section_code = balance.section.code
            
            if section_code not in sections_analyse:
                sections_analyse[section_code] = {
                    'section': {
                        'code': section_code,
                        'libelle': balance.section.libelle,
                        'responsable': balance.section.responsable.get_full_name() if balance.section.responsable else None,
                        'budget_annuel': float(balance.section.budget_annuel)
                    },
                    'chiffre_affaires': Decimal('0'),
                    'charges': Decimal('0'),
                    'resultat': Decimal('0'),
                    'marge_brute': Decimal('0'),
                    'taux_marge': 0,
                    'ecart_budget': 0,
                    'nb_operations': 0
                }
            
            # Classification des comptes
            classe_compte = int(balance.compte.code[0])
            montant = balance.solde_final if balance.type_solde == 'CREDIT' else -balance.solde_final
            
            if classe_compte == 7:  # Produits
                sections_analyse[section_code]['chiffre_affaires'] += montant
            elif classe_compte == 6:  # Charges
                sections_analyse[section_code]['charges'] += montant
            
            sections_analyse[section_code]['nb_operations'] += balance.nb_mouvements
        
        # Calculs de rentabilité
        for section_data in sections_analyse.values():
            ca = section_data['chiffre_affaires']
            charges = section_data['charges']
            
            section_data['resultat'] = ca - charges
            section_data['marge_brute'] = ca - charges  # Simplification
            section_data['taux_marge'] = float(section_data['marge_brute'] / ca * 100) if ca > 0 else 0
            
            # Écart budgétaire
            budget = section_data['section']['budget_annuel']
            if budget > 0:
                section_data['ecart_budget'] = float((section_data['resultat'] / Decimal(str(budget)) - 1) * 100)
        
        # Classement par rentabilité
        sections_triees = sorted(
            sections_analyse.values(),
            key=lambda x: x['resultat'],
            reverse=True
        )
        
        # Conversion des Decimal
        self._convert_decimals_to_float(sections_analyse)
        
        return {
            'axe': {
                'code': axe.code,
                'libelle': axe.libelle,
                'type': axe.type_axe
            },
            'exercice': exercice,
            'analyse_sections': list(sections_triees),
            'resume': {
                'nb_sections': len(sections_analyse),
                'ca_total': sum(s['chiffre_affaires'] for s in sections_triees),
                'charges_totales': sum(s['charges'] for s in sections_triees),
                'resultat_total': sum(s['resultat'] for s in sections_triees),
                'taux_marge_moyen': sum(s['taux_marge'] for s in sections_triees) / len(sections_triees) if sections_triees else 0
            }
        }
    
    def _update_ligne_section_analytique(self, ligne_ecriture: LigneEcriture) -> None:
        """Met à jour le champ section_analytique de la ligne d'écriture."""
        ventilations = ligne_ecriture.ventilations.all()
        
        section_analytique = {}
        for ventilation in ventilations:
            axe_code = ventilation.section.axe.code
            section_analytique[axe_code] = ventilation.section.code
        
        ligne_ecriture.section_analytique = section_analytique
        ligne_ecriture.save(update_fields=['section_analytique'])
    
    def _calculer_montant_repartition(self, repartition: RepartitionAutomatique,
                                    date_debut: date, date_fin: date) -> Decimal:
        """Calcule le montant total à répartir pour une période."""
        # Récupération du solde du compte source
        lignes = LigneEcriture.objects.filter(
            compte=repartition.compte_source,
            ecriture__date_ecriture__gte=date_debut,
            ecriture__date_ecriture__lte=date_fin,
            ecriture__statut='VALIDE'
        )
        
        if repartition.type_repartition == 'FIXE':
            # Montant fixe défini dans les paramètres
            return Decimal(str(repartition.parametres.get('montant_fixe', 0)))
        
        elif repartition.type_repartition == 'PRORATA':
            # Calcul basé sur le solde du compte de base
            if repartition.compte_base:
                lignes_base = LigneEcriture.objects.filter(
                    compte=repartition.compte_base,
                    ecriture__date_ecriture__gte=date_debut,
                    ecriture__date_ecriture__lte=date_fin,
                    ecriture__statut='VALIDE'
                )
                
                solde_base = lignes_base.aggregate(
                    total=Sum('debit') - Sum('credit')
                )['total'] or Decimal('0')
                
                return abs(solde_base)
        
        # Par défaut, utilise le solde du compte source
        solde_source = lignes.aggregate(
            total=Sum('debit') - Sum('credit')
        )['total'] or Decimal('0')
        
        return abs(solde_source)
    
    def _creer_ecriture_repartition(self, repartition: RepartitionAutomatique,
                                   montant_total: Decimal, date_execution: date, user) -> Ecriture:
        """Crée l'écriture comptable de répartition."""
        # Recherche du journal d'OD
        journal = Journal.objects.filter(
            type='OD',
            societe=repartition.societe,
            is_active=True
        ).first()
        
        if not journal:
            raise ValidationError("Aucun journal d'opérations diverses trouvé")
        
        # Création des lignes d'écriture
        lignes = []
        
        # Ligne de crédit sur le compte source
        lignes.append({
            'compte': repartition.compte_source.code,
            'libelle': f"Répartition {repartition.libelle}",
            'debit': 0,
            'credit': float(montant_total)
        })
        
        # Lignes de débit sur les sections de destination
        for ligne_repartition in repartition.lignes.all():
            if ligne_repartition.pourcentage > 0:
                montant_ligne = (montant_total * ligne_repartition.pourcentage) / 100
                
                # Utilisation d'un compte de charges réparties (à définir selon le plan comptable)
                compte_destination = repartition.parametres.get('compte_destination', '60')
                
                lignes.append({
                    'compte': compte_destination,
                    'libelle': f"Répartition {ligne_repartition.section_destination.libelle}",
                    'debit': float(montant_ligne),
                    'credit': 0,
                    'analytique': {
                        ligne_repartition.section_destination.axe.code: ligne_repartition.section_destination.code
                    }
                })
        
        # Création de l'écriture
        ecriture_data = {
            'journal': journal.code,
            'date_ecriture': date_execution,
            'libelle': f"Répartition automatique: {repartition.libelle}",
            'lignes': lignes
        }
        
        # Utilisation du service comptable
        from apps.accounting.services import EcritureService
        ecriture_service = EcritureService()
        
        return ecriture_service.create_ecriture(ecriture_data)
    
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