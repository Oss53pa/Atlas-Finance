"""
Service pour la gestion de la trésorerie.
"""
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.db.models import Q, Sum, Count, Avg, Max, Min
from typing import List, Dict, Any, Optional, Tuple
from datetime import date, timedelta
from ..models import (
    CompteBancaire, MouvementBancaire, RapprochementBancaire,
    PrevisionTresorerie, ConfigurationBancaire, JournalTresorerie
)
from apps.accounting.models import Ecriture, LigneEcriture, Journal
from apps.core.models import Societe, AuditLog
import json
import requests


class TresorerieService:
    """Service de gestion de la trésorerie."""
    
    def create_compte_bancaire(self, data: Dict[str, Any], user) -> CompteBancaire:
        """
        Crée un nouveau compte bancaire.
        
        Args:
            data: Données du compte
            user: Utilisateur créateur
            
        Returns:
            CompteBancaire: Le compte créé
        """
        with transaction.atomic():
            # Validation des données
            self._validate_compte_data(data)
            
            # Création du compte
            compte = CompteBancaire.objects.create(
                societe=data['societe'],
                banque=data['banque'],
                compte_comptable=data['compte_comptable'],
                devise=data['devise'],
                numero_compte=data['numero_compte'],
                iban=data.get('iban'),
                libelle=data['libelle'],
                type_compte=data.get('type_compte', 'COURANT'),
                solde_initial=data.get('solde_initial', 0),
                solde_minimum=data.get('solde_minimum', 0),
                autorisation_decouvert=data.get('autorisation_decouvert', 0),
                plafond_virement=data.get('plafond_virement'),
                plafond_retrait=data.get('plafond_retrait'),
                frais_tenue_compte=data.get('frais_tenue_compte', 0),
                taux_interet=data.get('taux_interet', 0),
                taux_decouvert=data.get('taux_decouvert', 0),
                date_ouverture=data.get('date_ouverture', timezone.now().date()),
                rapprochement_auto=data.get('rapprochement_auto', False),
                tolerance_rapprochement=data.get('tolerance_rapprochement', Decimal('0.01')),
                is_principal=data.get('is_principal', False),
                created_by=user
            )
            
            # Mise à jour du solde initial
            compte.solde_actuel = compte.solde_initial
            compte.save(update_fields=['solde_actuel'])
            
            # Écriture comptable d'ouverture si solde initial > 0
            if compte.solde_initial != 0:
                self._create_ecriture_ouverture(compte, user)
            
            # Log d'audit
            AuditLog.objects.create(
                table_name='CompteBancaire',
                operation='CREATE',
                record_id=str(compte.id),
                old_values={},
                new_values=self._compte_to_dict(compte),
                user=user,
                timestamp=timezone.now()
            )
            
            # Journal de trésorerie
            JournalTresorerie.objects.create(
                societe=compte.societe,
                compte_bancaire=compte,
                type_operation='SYNCHRONISATION',
                niveau='SUCCESS',
                message=f"Création du compte bancaire {compte.numero_compte}",
                utilisateur=user
            )
            
            return compte
    
    def synchroniser_mouvements(self, compte: CompteBancaire, user) -> Dict[str, Any]:
        """
        Synchronise les mouvements bancaires d'un compte.
        
        Args:
            compte: Compte à synchroniser
            user: Utilisateur
            
        Returns:
            Dict: Résultats de la synchronisation
        """
        result = {
            'mouvements_importes': 0,
            'mouvements_ignores': 0,
            'erreurs': [],
            'derniere_synchronisation': None
        }
        
        try:
            # Recherche de la configuration bancaire active
            config = compte.configurations.filter(
                is_active=True,
                synchronisation_auto=True
            ).first()
            
            if not config:
                raise ValidationError("Aucune configuration bancaire active trouvée")
            
            # Import des mouvements selon le type de connexion
            if config.type_connexion == 'PSD2':
                mouvements_data = self._import_via_psd2(config)
            elif config.type_connexion == 'EBICS':
                mouvements_data = self._import_via_ebics(config)
            elif config.type_connexion == 'API_PROPRIETE':
                mouvements_data = self._import_via_api(config)
            else:
                raise ValidationError(f"Type de connexion {config.type_connexion} non supporté")
            
            # Traitement des mouvements importés
            with transaction.atomic():
                for mouvement_data in mouvements_data:
                    try:
                        # Vérification des doublons
                        if not self._mouvement_exists(compte, mouvement_data['id_import']):
                            self._create_mouvement_from_import(compte, mouvement_data, config.type_connexion)
                            result['mouvements_importes'] += 1
                        else:
                            result['mouvements_ignores'] += 1
                    except Exception as e:
                        result['erreurs'].append({
                            'mouvement': mouvement_data.get('reference', 'Inconnu'),
                            'erreur': str(e)
                        })
                
                # Mise à jour de la configuration
                config.derniere_synchronisation = timezone.now()
                config.nb_tentatives_echec = 0
                config.derniere_erreur = None
                config.save()
                
                result['derniere_synchronisation'] = config.derniere_synchronisation
            
            # Journal de trésorerie
            JournalTresorerie.objects.create(
                societe=compte.societe,
                compte_bancaire=compte,
                type_operation='SYNCHRONISATION',
                niveau='SUCCESS' if not result['erreurs'] else 'WARNING',
                message=f"Synchronisation terminée: {result['mouvements_importes']} mouvements importés",
                details=result,
                utilisateur=user
            )
            
        except Exception as e:
            # Gestion des erreurs
            result['erreurs'].append({'general': str(e)})
            
            # Journal d'erreur
            JournalTresorerie.objects.create(
                societe=compte.societe,
                compte_bancaire=compte,
                type_operation='SYNCHRONISATION',
                niveau='ERROR',
                message=f"Erreur lors de la synchronisation: {str(e)}",
                details={'error': str(e)},
                utilisateur=user
            )
        
        return result
    
    def effectuer_rapprochement(self, compte: CompteBancaire, date_debut: date, 
                               date_fin: date, user) -> RapprochementBancaire:
        """
        Effectue un rapprochement bancaire.
        
        Args:
            compte: Compte à rapprocher
            date_debut: Date de début
            date_fin: Date de fin
            user: Utilisateur
            
        Returns:
            RapprochementBancaire: Le rapprochement créé
        """
        with transaction.atomic():
            # Calcul des soldes
            solde_comptable_debut = self._get_solde_comptable(compte, date_debut - timedelta(days=1))
            solde_comptable_fin = self._get_solde_comptable(compte, date_fin)
            solde_bancaire_debut = self._get_solde_bancaire(compte, date_debut - timedelta(days=1))
            solde_bancaire_fin = self._get_solde_bancaire(compte, date_fin)
            
            # Création du rapprochement
            periode = f"{date_debut.strftime('%m/%Y')}"
            rapprochement = RapprochementBancaire.objects.create(
                compte_bancaire=compte,
                date_debut=date_debut,
                date_fin=date_fin,
                periode=periode,
                solde_comptable_debut=solde_comptable_debut,
                solde_comptable_fin=solde_comptable_fin,
                solde_bancaire_debut=solde_bancaire_debut,
                solde_bancaire_fin=solde_bancaire_fin,
                ecart_initial=solde_bancaire_debut - solde_comptable_debut,
                ecart_final=solde_bancaire_fin - solde_comptable_fin,
                created_by=user
            )
            
            # Rapprochement automatique si activé
            if compte.rapprochement_auto:
                stats = self._rapprocher_automatiquement(rapprochement)
                rapprochement.nb_mouvements_rapproches = stats['rapproches']
                rapprochement.nb_mouvements_non_rapproches = stats['non_rapproches']
                rapprochement.montant_rapproche = stats['montant_rapproche']
                rapprochement.save()
            
            # Journal de trésorerie
            JournalTresorerie.objects.create(
                societe=compte.societe,
                compte_bancaire=compte,
                type_operation='RAPPROCHEMENT',
                niveau='SUCCESS',
                message=f"Rapprochement créé pour la période {periode}",
                details={
                    'ecart_final': float(rapprochement.ecart_final),
                    'nb_mouvements_rapproches': rapprochement.nb_mouvements_rapproches
                },
                utilisateur=user
            )
            
            return rapprochement
    
    def generer_previsions(self, societe: Societe, nb_jours: int = 90) -> Dict[str, Any]:
        """
        Génère des prévisions de trésorerie.
        
        Args:
            societe: Société concernée
            nb_jours: Nombre de jours de prévision
            
        Returns:
            Dict: Prévisions générées
        """
        date_debut = timezone.now().date()
        date_fin = date_debut + timedelta(days=nb_jours)
        
        # Récupération des prévisions existantes
        previsions = PrevisionTresorerie.objects.filter(
            societe=societe,
            date_prevue__gte=date_debut,
            date_prevue__lte=date_fin,
            statut__in=['PREVISIONNEL', 'CONFIRME']
        ).order_by('date_prevue')
        
        # Calcul des soldes initiaux par compte
        comptes_bancaires = CompteBancaire.objects.filter(
            societe=societe,
            statut='ACTIF'
        )
        
        soldes_par_compte = {}
        for compte in comptes_bancaires:
            compte.update_solde()
            soldes_par_compte[compte.id] = {
                'compte': compte,
                'solde_initial': compte.solde_actuel,
                'solde_previsionnel': compte.solde_actuel,
                'mouvements': []
            }
        
        # Projection jour par jour
        previsions_par_jour = {}
        date_courante = date_debut
        
        while date_courante <= date_fin:
            previsions_jour = previsions.filter(date_prevue=date_courante)
            
            solde_total_jour = Decimal('0')
            mouvements_jour = []
            
            for prevision in previsions_jour:
                compte_id = prevision.compte_bancaire.id
                montant_probable = prevision.montant * (prevision.probabilite / 100)
                
                if prevision.type_prevision == 'RECETTE':
                    soldes_par_compte[compte_id]['solde_previsionnel'] += montant_probable
                else:
                    soldes_par_compte[compte_id]['solde_previsionnel'] -= montant_probable
                
                mouvements_jour.append({
                    'prevision_id': prevision.id,
                    'libelle': prevision.libelle,
                    'type': prevision.type_prevision,
                    'montant': float(prevision.montant),
                    'montant_probable': float(montant_probable),
                    'probabilite': float(prevision.probabilite),
                    'compte': prevision.compte_bancaire.numero_compte
                })
            
            # Calcul du solde total
            for compte_data in soldes_par_compte.values():
                solde_total_jour += compte_data['solde_previsionnel']
            
            previsions_par_jour[date_courante.isoformat()] = {
                'date': date_courante.isoformat(),
                'solde_total': float(solde_total_jour),
                'mouvements': mouvements_jour,
                'soldes_par_compte': {
                    compte_data['compte'].numero_compte: float(compte_data['solde_previsionnel'])
                    for compte_data in soldes_par_compte.values()
                }
            }
            
            date_courante += timedelta(days=1)
        
        # Détection des alertes
        alertes = self._detecter_alertes_tresorerie(soldes_par_compte, previsions_par_jour)
        
        return {
            'periode': {
                'debut': date_debut.isoformat(),
                'fin': date_fin.isoformat()
            },
            'soldes_initiaux': {
                compte_data['compte'].numero_compte: float(compte_data['solde_initial'])
                for compte_data in soldes_par_compte.values()
            },
            'previsions_par_jour': previsions_par_jour,
            'alertes': alertes,
            'resume': {
                'nb_previsions': previsions.count(),
                'montant_total_recettes': float(
                    previsions.filter(type_prevision='RECETTE').aggregate(
                        total=Sum('montant')
                    )['total'] or 0
                ),
                'montant_total_depenses': float(
                    previsions.filter(type_prevision='DEPENSE').aggregate(
                        total=Sum('montant')
                    )['total'] or 0
                )
            }
        }
    
    def calculer_positions_bancaires(self, societe: Societe, date_reference: date = None) -> Dict[str, Any]:
        """
        Calcule les positions bancaires à une date donnée.
        
        Args:
            societe: Société concernée
            date_reference: Date de référence (défaut: aujourd'hui)
            
        Returns:
            Dict: Positions bancaires
        """
        if not date_reference:
            date_reference = timezone.now().date()
        
        comptes = CompteBancaire.objects.filter(
            societe=societe,
            statut='ACTIF'
        ).select_related('banque', 'devise')
        
        positions = []
        total_par_devise = {}
        
        for compte in comptes:
            # Calcul du solde à la date
            solde_comptable = self._get_solde_comptable(compte, date_reference)
            solde_bancaire = self._get_solde_bancaire(compte, date_reference)
            
            # Mouvements en cours
            mouvements_en_cours = MouvementBancaire.objects.filter(
                compte_bancaire=compte,
                statut='EN_COURS',
                date_operation__lte=date_reference
            ).aggregate(
                total=Sum('montant') or Decimal('0')
            )['total']
            
            # Position nette
            position_nette = solde_comptable + mouvements_en_cours
            
            # Découvert utilisé
            decouvert_utilise = max(0, -position_nette) if position_nette < 0 else 0
            decouvert_disponible = max(0, compte.autorisation_decouvert - decouvert_utilise)
            
            position = {
                'compte': {
                    'id': compte.id,
                    'numero': compte.numero_compte,
                    'libelle': compte.libelle,
                    'banque': compte.banque.nom,
                    'devise': compte.devise.code
                },
                'soldes': {
                    'comptable': float(solde_comptable),
                    'bancaire': float(solde_bancaire),
                    'ecart': float(solde_bancaire - solde_comptable)
                },
                'mouvements_en_cours': float(mouvements_en_cours),
                'position_nette': float(position_nette),
                'decouvert': {
                    'autorise': float(compte.autorisation_decouvert),
                    'utilise': float(decouvert_utilise),
                    'disponible': float(decouvert_disponible)
                },
                'liquidite_disponible': float(position_nette + decouvert_disponible),
                'is_decouvert': position_nette < 0,
                'alerte': position_nette < compte.solde_minimum
            }
            
            positions.append(position)
            
            # Cumul par devise
            devise_code = compte.devise.code
            if devise_code not in total_par_devise:
                total_par_devise[devise_code] = {
                    'position_nette': Decimal('0'),
                    'liquidite_disponible': Decimal('0'),
                    'decouvert_utilise': Decimal('0')
                }
            
            total_par_devise[devise_code]['position_nette'] += position_nette
            total_par_devise[devise_code]['liquidite_disponible'] += position_nette + decouvert_disponible
            total_par_devise[devise_code]['decouvert_utilise'] += decouvert_utilise
        
        return {
            'date_reference': date_reference.isoformat(),
            'positions': positions,
            'totaux_par_devise': {
                devise: {
                    'position_nette': float(totals['position_nette']),
                    'liquidite_disponible': float(totals['liquidite_disponible']),
                    'decouvert_utilise': float(totals['decouvert_utilise'])
                }
                for devise, totals in total_par_devise.items()
            },
            'nb_comptes': len(positions),
            'nb_comptes_decouverts': sum(1 for p in positions if p['is_decouvert']),
            'nb_alertes': sum(1 for p in positions if p['alerte'])
        }
    
    def _validate_compte_data(self, data: Dict[str, Any]) -> None:
        """Valide les données d'un compte bancaire."""
        required_fields = ['societe', 'banque', 'compte_comptable', 'devise', 'numero_compte', 'libelle']
        
        for field in required_fields:
            if field not in data or not data[field]:
                raise ValidationError(f"Le champ '{field}' est requis")
        
        # Vérification de l'unicité
        if CompteBancaire.objects.filter(
            societe=data['societe'],
            numero_compte=data['numero_compte'],
            banque=data['banque']
        ).exists():
            raise ValidationError("Ce numéro de compte existe déjà pour cette banque")
    
    def _create_ecriture_ouverture(self, compte: CompteBancaire, user) -> Ecriture:
        """Crée l'écriture comptable d'ouverture du compte."""
        # Recherche du journal de banque
        journal = Journal.objects.filter(
            type='TRE',
            societe=compte.societe,
            is_active=True
        ).first()
        
        if not journal:
            raise ValidationError("Aucun journal de trésorerie trouvé")
        
        # Données de l'écriture
        ecriture_data = {
            'journal': journal.code,
            'date_ecriture': compte.date_ouverture,
            'libelle': f"Ouverture compte {compte.numero_compte}",
            'lignes': [
                {
                    'compte': compte.compte_comptable.code,
                    'libelle': f"Solde d'ouverture",
                    'debit': float(compte.solde_initial) if compte.solde_initial > 0 else 0,
                    'credit': float(-compte.solde_initial) if compte.solde_initial < 0 else 0
                }
            ]
        }
        
        # Contrepartie (compte de report à nouveau ou capital)
        compte_contrepartie = compte.societe.plancomptable_set.filter(
            code__startswith='12'
        ).first()
        
        if compte_contrepartie:
            ecriture_data['lignes'].append({
                'compte': compte_contrepartie.code,
                'libelle': f"Contrepartie ouverture compte",
                'debit': float(-compte.solde_initial) if compte.solde_initial < 0 else 0,
                'credit': float(compte.solde_initial) if compte.solde_initial > 0 else 0
            })
        
        # Création via le service comptable
        from apps.accounting.services import EcritureService
        ecriture_service = EcritureService()
        
        return ecriture_service.create_ecriture(ecriture_data)
    
    def _import_via_psd2(self, config: ConfigurationBancaire) -> List[Dict]:
        """Importe les mouvements via PSD2."""
        # Simulation - À remplacer par l'implémentation réelle
        return []
    
    def _import_via_ebics(self, config: ConfigurationBancaire) -> List[Dict]:
        """Importe les mouvements via EBICS."""
        # Simulation - À remplacer par l'implémentation réelle
        return []
    
    def _import_via_api(self, config: ConfigurationBancaire) -> List[Dict]:
        """Importe les mouvements via API propriétaire."""
        # Simulation - À remplacer par l'implémentation réelle
        return []
    
    def _mouvement_exists(self, compte: CompteBancaire, id_import: str) -> bool:
        """Vérifie si un mouvement existe déjà."""
        return MouvementBancaire.objects.filter(
            compte_bancaire=compte,
            id_import=id_import
        ).exists()
    
    def _create_mouvement_from_import(self, compte: CompteBancaire, data: Dict, source: str) -> MouvementBancaire:
        """Crée un mouvement à partir de données d'import."""
        return MouvementBancaire.objects.create(
            compte_bancaire=compte,
            date_operation=data['date_operation'],
            date_valeur=data.get('date_valeur', data['date_operation']),
            type_mouvement=data.get('type_mouvement', 'AUTRE'),
            sens=data['sens'],
            montant=data['montant'],
            libelle=data['libelle'],
            reference=data.get('reference'),
            id_import=data['id_import'],
            source_import=source
        )
    
    def _get_solde_comptable(self, compte: CompteBancaire, date_ref: date) -> Decimal:
        """Calcule le solde comptable à une date donnée."""
        lignes = LigneEcriture.objects.filter(
            compte=compte.compte_comptable,
            ecriture__date_ecriture__lte=date_ref,
            ecriture__statut='VALIDE'
        ).aggregate(
            total_debit=Sum('debit') or Decimal('0'),
            total_credit=Sum('credit') or Decimal('0')
        )
        
        return compte.solde_initial + lignes['total_debit'] - lignes['total_credit']
    
    def _get_solde_bancaire(self, compte: CompteBancaire, date_ref: date) -> Decimal:
        """Calcule le solde bancaire à une date donnée."""
        mouvements = MouvementBancaire.objects.filter(
            compte_bancaire=compte,
            date_valeur__lte=date_ref,
            statut='REALISE'
        )
        
        solde = compte.solde_initial
        for mouvement in mouvements:
            if mouvement.sens == 'C':
                solde += mouvement.montant
            else:
                solde -= mouvement.montant
        
        return solde
    
    def _rapprocher_automatiquement(self, rapprochement: RapprochementBancaire) -> Dict[str, int]:
        """Effectue le rapprochement automatique."""
        stats = {
            'rapproches': 0,
            'non_rapproches': 0,
            'montant_rapproche': Decimal('0')
        }
        
        # Récupération des mouvements non rapprochés
        mouvements = MouvementBancaire.objects.filter(
            compte_bancaire=rapprochement.compte_bancaire,
            date_operation__gte=rapprochement.date_debut,
            date_operation__lte=rapprochement.date_fin,
            date_rapprochement__isnull=True
        )
        
        # Récupération des écritures comptables non rapprochées
        ecritures = LigneEcriture.objects.filter(
            compte=rapprochement.compte_bancaire.compte_comptable,
            ecriture__date_ecriture__gte=rapprochement.date_debut,
            ecriture__date_ecriture__lte=rapprochement.date_fin,
            ecriture__statut='VALIDE'
        ).filter(
            Q(ecriture__mouvementbancaire__isnull=True) |
            Q(ecriture__mouvementbancaire__date_rapprochement__isnull=True)
        )
        
        # Rapprochement par référence exacte
        for mouvement in mouvements:
            if mouvement.reference:
                ecriture_match = ecritures.filter(
                    ecriture__reference_externe=mouvement.reference,
                    Q(debit=mouvement.montant) | Q(credit=mouvement.montant)
                ).first()
                
                if ecriture_match:
                    mouvement.date_rapprochement = timezone.now().date()
                    mouvement.ecriture = ecriture_match.ecriture
                    mouvement.save()
                    
                    stats['rapproches'] += 1
                    stats['montant_rapproche'] += mouvement.montant
        
        # Calcul des non rapprochés
        stats['non_rapproches'] = mouvements.filter(date_rapprochement__isnull=True).count()
        
        return stats
    
    def _detecter_alertes_tresorerie(self, soldes_par_compte: Dict, previsions: Dict) -> List[Dict]:
        """Détecte les alertes de trésorerie."""
        alertes = []
        
        for compte_data in soldes_par_compte.values():
            compte = compte_data['compte']
            
            # Alerte découvert
            if compte_data['solde_previsionnel'] < 0:
                alertes.append({
                    'type': 'DECOUVERT',
                    'niveau': 'WARNING' if compte_data['solde_previsionnel'] > -compte.autorisation_decouvert else 'ERROR',
                    'compte': compte.numero_compte,
                    'message': f"Risque de découvert: {compte_data['solde_previsionnel']}",
                    'solde_previsionnel': float(compte_data['solde_previsionnel'])
                })
            
            # Alerte solde minimum
            if compte_data['solde_previsionnel'] < compte.solde_minimum:
                alertes.append({
                    'type': 'SOLDE_MINIMUM',
                    'niveau': 'WARNING',
                    'compte': compte.numero_compte,
                    'message': f"Solde sous le minimum: {compte_data['solde_previsionnel']} < {compte.solde_minimum}",
                    'solde_previsionnel': float(compte_data['solde_previsionnel']),
                    'solde_minimum': float(compte.solde_minimum)
                })
        
        return alertes
    
    def _compte_to_dict(self, compte: CompteBancaire) -> Dict[str, Any]:
        """Convertit un compte en dictionnaire pour l'audit."""
        return {
            'numero_compte': compte.numero_compte,
            'libelle': compte.libelle,
            'banque': compte.banque.nom,
            'solde_initial': float(compte.solde_initial),
            'statut': compte.statut
        }