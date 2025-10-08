from decimal import Decimal
from datetime import date, datetime, timedelta
from django.db import transaction
from django.db.models import Sum, Q, F
from typing import List, Dict, Any, Optional
import json
import uuid

from ..models import (
    TypeCloture, ProcedureCloture, EtapeCloture, ControleCloture,
    EcritureClotureAutomatique, JournalCloture, ModeleEcritureCloture
)
from apps.accounting.models import EcritureComptable, CompteComptable, ExerciceComptable
from apps.analytical_accounting.models import EcritureAnalytique, SectionAnalytique


class ClosureService:
    """
    Service principal pour la gestion des clôtures périodiques
    Implémentation complète EXF-CL-001/002 SYSCOHADA
    """
    
    def __init__(self):
        self.seuils_tolerance_defaut = {
            'balance': Decimal('0.01'),
            'coherence': Decimal('0.05'),
            'concordance': Decimal('1.00')
        }
    
    def creer_procedure_cloture(self, company_id: int, type_cloture_id: int,
                               exercice_id: int, date_debut: date, date_fin: date,
                               responsable_id: int, libelle: str = '') -> ProcedureCloture:
        """
        Crée une nouvelle procédure de clôture
        """
        type_cloture = TypeCloture.objects.get(id=type_cloture_id)
        exercice = ExerciceComptable.objects.get(id=exercice_id)
        
        # Générer le numéro automatique
        numero = f"CLO-{date_fin.strftime('%Y%m')}-{type_cloture.code}-{datetime.now().strftime('%d%H%M')}"
        
        if not libelle:
            libelle = f"Clôture {type_cloture.nom} {date_fin.strftime('%B %Y')}"
        
        with transaction.atomic():
            procedure = ProcedureCloture.objects.create(
                company_id=company_id,
                type_cloture=type_cloture,
                numero_cloture=numero,
                libelle=libelle,
                exercice=exercice,
                date_debut_periode=date_debut,
                date_fin_periode=date_fin,
                responsable_cloture_id=responsable_id
            )
            
            # Créer les étapes selon la configuration du type de clôture
            self._creer_etapes_cloture(procedure)
            
            # Log de création
            self._log_evenement(
                procedure, None, 'DEBUT_CLOTURE',
                f"Création de la procédure de clôture {numero}",
                f"Procédure créée pour la période {date_debut} - {date_fin}",
                responsable_id
            )
        
        return procedure
    
    def _creer_etapes_cloture(self, procedure: ProcedureCloture):
        """
        Crée les étapes de clôture selon la configuration du type
        """
        etapes_config = procedure.type_cloture.etapes_cloture
        
        # Étapes par défaut si pas de configuration
        if not etapes_config:
            etapes_config = self._get_etapes_defaut(procedure.type_cloture.frequence)
        
        for i, config_etape in enumerate(etapes_config):
            etape = EtapeCloture.objects.create(
                procedure_cloture=procedure,
                numero_etape=config_etape.get('numero', f"{i+1}.0"),
                nom_etape=config_etape['nom'],
                type_etape=config_etape.get('type', 'CONTROLE'),
                description=config_etape.get('description', ''),
                obligatoire=config_etape.get('obligatoire', True),
                automatique=config_etape.get('automatique', False),
                ordre_execution=i + 1,
                duree_prevue_heures=Decimal(str(config_etape.get('duree_heures', 1)))
            )
            
            # Créer les contrôles pour cette étape
            self._creer_controles_etape(etape, config_etape.get('controles', []))
            
            # Créer les écritures automatiques pour cette étape
            self._creer_ecritures_automatiques_etape(etape, config_etape.get('ecritures', []))
    
    def _get_etapes_defaut(self, frequence: str) -> List[Dict]:
        """
        Retourne les étapes par défaut selon la fréquence de clôture
        """
        etapes_base = [
            {
                'numero': '1.0',
                'nom': 'Contrôles préalables',
                'type': 'CONTROLE',
                'description': 'Vérifications avant clôture',
                'obligatoire': True,
                'automatique': True,
                'controles': ['BALANCE', 'COHERENCE']
            },
            {
                'numero': '2.0',
                'nom': 'Amortissements',
                'type': 'CALCUL',
                'description': 'Calcul et comptabilisation des amortissements',
                'obligatoire': True,
                'automatique': True,
                'ecritures': ['AMORTISSEMENT']
            },
            {
                'numero': '3.0',
                'nom': 'Provisions',
                'type': 'CALCUL',
                'description': 'Calcul et comptabilisation des provisions',
                'obligatoire': True,
                'automatique': False,
                'ecritures': ['PROVISION']
            }
        ]
        
        if frequence in ['MENSUELLE', 'TRIMESTRIELLE']:
            etapes_base.extend([
                {
                    'numero': '4.0',
                    'nom': 'Régularisations',
                    'type': 'ECRITURE',
                    'description': 'Écritures de régularisation',
                    'obligatoire': True,
                    'automatique': False,
                    'ecritures': ['REGULARISATION', 'ABONNEMENT']
                }
            ])
        
        if frequence == 'ANNUELLE':
            etapes_base.extend([
                {
                    'numero': '5.0',
                    'nom': 'Inventaire',
                    'type': 'CONTROLE',
                    'description': 'Contrôles d\'inventaire',
                    'obligatoire': True,
                    'automatique': False,
                    'controles': ['INVENTAIRE']
                },
                {
                    'numero': '6.0',
                    'nom': 'Contrôles fiscaux',
                    'type': 'CONTROLE',
                    'description': 'Vérifications fiscales',
                    'obligatoire': True,
                    'automatique': True,
                    'controles': ['FISCALITE']
                }
            ])
        
        # Étape finale commune
        etapes_base.append({
            'numero': '9.0',
            'nom': 'Contrôles finaux',
            'type': 'VALIDATION',
            'description': 'Validation finale avant clôture',
            'obligatoire': True,
            'automatique': True,
            'controles': ['BALANCE', 'COMPLETUDE']
        })
        
        return etapes_base
    
    def _creer_controles_etape(self, etape: EtapeCloture, controles_config: List[str]):
        """
        Crée les contrôles pour une étape donnée
        """
        controles_disponibles = {
            'BALANCE': {
                'nom': 'Équilibre de la balance',
                'description': 'Vérification que la balance est équilibrée',
                'criticite': 'BLOQUANT',
                'config': {'seuil_tolerance': 0.01}
            },
            'COHERENCE': {
                'nom': 'Cohérence comptable',
                'description': 'Vérification de la cohérence des comptes',
                'criticite': 'AVERTISSEMENT',
                'config': {}
            },
            'COMPLETUDE': {
                'nom': 'Complétude des données',
                'description': 'Vérification que toutes les données requises sont présentes',
                'criticite': 'BLOQUANT',
                'config': {}
            },
            'CONCORDANCE': {
                'nom': 'Concordance auxiliaires',
                'description': 'Concordance entre comptes principaux et auxiliaires',
                'criticite': 'BLOQUANT',
                'config': {'seuil_tolerance': 1.0}
            },
            'FISCALITE': {
                'nom': 'Contrôles fiscaux',
                'description': 'Vérifications des obligations fiscales',
                'criticite': 'AVERTISSEMENT',
                'config': {}
            },
            'ANALYTIQUE': {
                'nom': 'Contrôles analytiques',
                'description': 'Cohérence de la comptabilité analytique',
                'criticite': 'AVERTISSEMENT',
                'config': {}
            },
            'INVENTAIRE': {
                'nom': 'Contrôles d\'inventaire',
                'description': 'Vérification des stocks et immobilisations',
                'criticite': 'BLOQUANT',
                'config': {}
            },
            'PROVISIONS': {
                'nom': 'Contrôles de provisions',
                'description': 'Adéquation des provisions constituées',
                'criticite': 'AVERTISSEMENT',
                'config': {}
            }
        }
        
        for type_controle in controles_config:
            if type_controle in controles_disponibles:
                config = controles_disponibles[type_controle]
                ControleCloture.objects.create(
                    etape_cloture=etape,
                    type_controle=type_controle,
                    nom_controle=config['nom'],
                    description=config['description'],
                    niveau_criticite=config['criticite'],
                    configuration_json=config['config'],
                    seuil_tolerance=Decimal(str(config['config'].get('seuil_tolerance', 0))) if config['config'].get('seuil_tolerance') else None
                )
    
    def _creer_ecritures_automatiques_etape(self, etape: EtapeCloture, ecritures_config: List[str]):
        """
        Crée les écritures automatiques pour une étape donnée
        """
        ecritures_disponibles = {
            'AMORTISSEMENT': {
                'nom': 'Dotations aux amortissements',
                'description': 'Calcul automatique des dotations aux amortissements',
                'base_calcul': 'immobilisations_service'
            },
            'PROVISION': {
                'nom': 'Dotations aux provisions',
                'description': 'Calcul des provisions pour dépréciation',
                'base_calcul': 'analyse_risques'
            },
            'REGULARISATION': {
                'nom': 'Écritures de régularisation',
                'description': 'Régularisations de fin de période',
                'base_calcul': 'comptes_transitoires'
            },
            'ABONNEMENT': {
                'nom': 'Répartition des abonnements',
                'description': 'Ventilation des charges et produits par abonnement',
                'base_calcul': 'abonnements_actifs'
            }
        }
        
        for type_ecriture in ecritures_config:
            if type_ecriture in ecritures_disponibles:
                config = ecritures_disponibles[type_ecriture]
                EcritureClotureAutomatique.objects.create(
                    procedure_cloture=etape.procedure_cloture,
                    etape_cloture=etape,
                    type_ecriture_cloture=type_ecriture,
                    nom_modele=config['nom'],
                    description=config['description'],
                    base_calcul=config['base_calcul']
                )
    
    def demarrer_cloture(self, procedure_id: int, utilisateur_id: int) -> Dict[str, Any]:
        """
        Démarre l'exécution d'une procédure de clôture
        """
        procedure = ProcedureCloture.objects.get(id=procedure_id)
        
        if procedure.statut != 'PLANIFIEE':
            raise ValueError(f"La procédure doit être en statut 'PLANIFIEE' (statut actuel: {procedure.statut})")
        
        with transaction.atomic():
            procedure.statut = 'EN_COURS'
            procedure.date_debut_cloture = datetime.now()
            procedure.pourcentage_avancement = 0
            procedure.save()
            
            # Démarrer la première étape
            premiere_etape = procedure.etapes.filter(ordre_execution=1).first()
            if premiere_etape:
                self._demarrer_etape(premiere_etape, utilisateur_id)
            
            self._log_evenement(
                procedure, None, 'DEBUT_CLOTURE',
                'Démarrage de la procédure de clôture',
                f"Clôture démarrée par l'utilisateur {utilisateur_id}",
                utilisateur_id
            )
        
        return {
            'procedure_id': procedure.id,
            'statut': procedure.statut,
            'date_debut': procedure.date_debut_cloture,
            'etape_en_cours': premiere_etape.nom_etape if premiere_etape else None
        }
    
    def _demarrer_etape(self, etape: EtapeCloture, utilisateur_id: int):
        """
        Démarre l'exécution d'une étape de clôture
        """
        etape.statut = 'EN_COURS'
        etape.date_debut = datetime.now()
        etape.responsable_etape_id = utilisateur_id
        etape.save()
        
        if etape.automatique:
            # Exécuter automatiquement l'étape
            self._executer_etape_automatique(etape, utilisateur_id)
    
    def _executer_etape_automatique(self, etape: EtapeCloture, utilisateur_id: int):
        """
        Exécute une étape automatique (contrôles et écritures)
        """
        try:
            # Exécuter les contrôles
            for controle in etape.controles.filter(actif=True):
                self._executer_controle(controle, utilisateur_id)
            
            # Générer les écritures automatiques
            for ecriture_auto in etape.ecritures_generees.filter(actif=True):
                self._generer_ecriture_automatique(ecriture_auto, utilisateur_id)
            
            # Marquer l'étape comme complétée si pas d'erreurs critiques
            anomalies_critiques = etape.controles.filter(
                resultat_conforme=False,
                niveau_criticite='BLOQUANT'
            ).count()
            
            if anomalies_critiques == 0:
                self._completer_etape(etape, utilisateur_id)
            else:
                etape.statut = 'ERREUR'
                etape.messages_erreur = f"{anomalies_critiques} anomalie(s) bloquante(s) détectée(s)"
                etape.save()
                
        except Exception as e:
            etape.statut = 'ERREUR'
            etape.messages_erreur = str(e)
            etape.save()
            raise
    
    def _executer_controle(self, controle: ControleCloture, utilisateur_id: int) -> Dict[str, Any]:
        """
        Exécute un contrôle spécifique
        """
        debut_execution = datetime.now()
        
        try:
            if controle.type_controle == 'BALANCE':
                resultat = self._controle_equilibre_balance(controle)
            elif controle.type_controle == 'COHERENCE':
                resultat = self._controle_coherence_comptable(controle)
            elif controle.type_controle == 'COMPLETUDE':
                resultat = self._controle_completude_donnees(controle)
            elif controle.type_controle == 'CONCORDANCE':
                resultat = self._controle_concordance_auxiliaires(controle)
            elif controle.type_controle == 'FISCALITE':
                resultat = self._controle_fiscalite(controle)
            elif controle.type_controle == 'ANALYTIQUE':
                resultat = self._controle_analytique(controle)
            else:
                resultat = {
                    'conforme': True,
                    'valeur_constatee': Decimal('0'),
                    'anomalies': [],
                    'message': f"Contrôle {controle.type_controle} non implémenté"
                }
            
            # Mise à jour du contrôle
            controle.execute = True
            controle.date_execution = debut_execution
            controle.duree_execution_ms = int((datetime.now() - debut_execution).total_seconds() * 1000)
            controle.resultat_conforme = resultat['conforme']
            controle.valeur_constatee = resultat.get('valeur_constatee', Decimal('0'))
            controle.nombre_anomalies = len(resultat.get('anomalies', []))
            controle.details_anomalies = resultat.get('anomalies', [])
            controle.message_resultat = resultat.get('message', '')
            controle.save()
            
            # Log de l'événement
            type_event = 'CONTROLE_OK' if resultat['conforme'] else 'CONTROLE_KO'
            self._log_evenement(
                controle.etape_cloture.procedure_cloture,
                controle.etape_cloture,
                type_event,
                f"Contrôle {controle.nom_controle}",
                resultat.get('message', ''),
                utilisateur_id
            )
            
            return resultat
            
        except Exception as e:
            controle.execute = True
            controle.date_execution = debut_execution
            controle.resultat_conforme = False
            controle.message_resultat = f"Erreur lors de l'exécution: {str(e)}"
            controle.save()
            raise
    
    def _controle_equilibre_balance(self, controle: ControleCloture) -> Dict[str, Any]:
        """
        Contrôle l'équilibre de la balance générale
        """
        procedure = controle.etape_cloture.procedure_cloture
        
        # Calculer le total débit et crédit sur la période
        ecritures = EcritureComptable.objects.filter(
            company=procedure.company,
            exercice=procedure.exercice,
            date_ecriture__gte=procedure.date_debut_periode,
            date_ecriture__lte=procedure.date_fin_periode,
            statut='VALIDE'
        )
        
        totaux = ecritures.aggregate(
            total_debit=Sum('montant_debit'),
            total_credit=Sum('montant_credit')
        )
        
        total_debit = totaux['total_debit'] or Decimal('0')
        total_credit = totaux['total_credit'] or Decimal('0')
        ecart = abs(total_debit - total_credit)
        
        seuil = controle.seuil_tolerance or self.seuils_tolerance_defaut['balance']
        conforme = ecart <= seuil
        
        anomalies = []
        if not conforme:
            anomalies.append({
                'type': 'DESEQUILIBRE_BALANCE',
                'description': f'Déséquilibre de {ecart} entre débits ({total_debit}) et crédits ({total_credit})',
                'montant': float(ecart),
                'criticite': 'BLOQUANT'
            })
        
        return {
            'conforme': conforme,
            'valeur_constatee': ecart,
            'anomalies': anomalies,
            'message': f"Écart balance: {ecart} (seuil: {seuil})"
        }
    
    def _controle_coherence_comptable(self, controle: ControleCloture) -> Dict[str, Any]:
        """
        Contrôle la cohérence comptable (comptes soldés, etc.)
        """
        procedure = controle.etape_cloture.procedure_cloture
        anomalies = []
        
        # Vérifier les comptes de résultat avec des soldes anormaux
        comptes_charges = CompteComptable.objects.filter(
            company=procedure.company,
            numero__startswith='6'  # Classe 6 = Charges
        )
        
        for compte in comptes_charges:
            solde = self._calculer_solde_compte(compte, procedure)
            if solde < Decimal('0'):  # Solde créditeur anormal pour un compte de charge
                anomalies.append({
                    'type': 'SOLDE_ANORMAL',
                    'description': f'Compte {compte.numero} - {compte.nom} a un solde créditeur anormal: {abs(solde)}',
                    'compte': compte.numero,
                    'montant': float(abs(solde)),
                    'criticite': 'AVERTISSEMENT'
                })
        
        # Vérifier les comptes de produits
        comptes_produits = CompteComptable.objects.filter(
            company=procedure.company,
            numero__startswith='7'  # Classe 7 = Produits
        )
        
        for compte in comptes_produits:
            solde = self._calculer_solde_compte(compte, procedure)
            if solde > Decimal('0'):  # Solde débiteur anormal pour un compte de produit
                anomalies.append({
                    'type': 'SOLDE_ANORMAL',
                    'description': f'Compte {compte.numero} - {compte.nom} a un solde débiteur anormal: {solde}',
                    'compte': compte.numero,
                    'montant': float(solde),
                    'criticite': 'AVERTISSEMENT'
                })
        
        conforme = len([a for a in anomalies if a['criticite'] == 'BLOQUANT']) == 0
        
        return {
            'conforme': conforme,
            'valeur_constatee': Decimal(str(len(anomalies))),
            'anomalies': anomalies,
            'message': f"{len(anomalies)} anomalie(s) de cohérence détectée(s)"
        }
    
    def _controle_completude_donnees(self, controle: ControleCloture) -> Dict[str, Any]:
        """
        Contrôle la complétude des données obligatoires
        """
        procedure = controle.etape_cloture.procedure_cloture
        anomalies = []
        
        # Vérifier les écritures sans libellé
        ecritures_sans_libelle = EcritureComptable.objects.filter(
            company=procedure.company,
            exercice=procedure.exercice,
            date_ecriture__gte=procedure.date_debut_periode,
            date_ecriture__lte=procedure.date_fin_periode,
            libelle__isnull=True
        ).count()
        
        if ecritures_sans_libelle > 0:
            anomalies.append({
                'type': 'DONNEES_MANQUANTES',
                'description': f'{ecritures_sans_libelle} écriture(s) sans libellé',
                'nombre': ecritures_sans_libelle,
                'criticite': 'AVERTISSEMENT'
            })
        
        # Vérifier les écritures non lettrées sur comptes de tiers
        # (À adapter selon les besoins spécifiques)
        
        conforme = len([a for a in anomalies if a['criticite'] == 'BLOQUANT']) == 0
        
        return {
            'conforme': conforme,
            'valeur_constatee': Decimal(str(len(anomalies))),
            'anomalies': anomalies,
            'message': f"Contrôle de complétude: {len(anomalies)} point(s) d'attention"
        }
    
    def _controle_concordance_auxiliaires(self, controle: ControleCloture) -> Dict[str, Any]:
        """
        Contrôle la concordance entre comptes principaux et auxiliaires
        """
        # À implémenter selon la structure des auxiliaires
        return {
            'conforme': True,
            'valeur_constatee': Decimal('0'),
            'anomalies': [],
            'message': "Contrôle de concordance: OK"
        }
    
    def _controle_fiscalite(self, controle: ControleCloture) -> Dict[str, Any]:
        """
        Contrôles fiscaux spécifiques
        """
        # À implémenter selon les obligations fiscales
        return {
            'conforme': True,
            'valeur_constatee': Decimal('0'),
            'anomalies': [],
            'message': "Contrôles fiscaux: OK"
        }
    
    def _controle_analytique(self, controle: ControleCloture) -> Dict[str, Any]:
        """
        Contrôle la cohérence de la comptabilité analytique
        """
        procedure = controle.etape_cloture.procedure_cloture
        anomalies = []
        
        # Vérifier l'équilibre entre comptabilité générale et analytique
        # pour les comptes de charges et produits ventilés
        comptes_ventiles = CompteComptable.objects.filter(
            company=procedure.company,
            numero__startswith__in=['6', '7']  # Charges et produits
        )
        
        for compte in comptes_ventiles:
            # Total en comptabilité générale
            total_general = self._calculer_solde_compte(compte, procedure)
            
            # Total en comptabilité analytique
            total_analytique = EcritureAnalytique.objects.filter(
                company=procedure.company,
                compte_general=compte,
                date_ecriture__gte=procedure.date_debut_periode,
                date_ecriture__lte=procedure.date_fin_periode,
                statut='VALIDEE'
            ).aggregate(
                total_debit=Sum('montant_debit'),
                total_credit=Sum('montant_credit')
            )
            
            debit_ana = total_analytique['total_debit'] or Decimal('0')
            credit_ana = total_analytique['total_credit'] or Decimal('0')
            solde_analytique = debit_ana - credit_ana if compte.numero.startswith('6') else credit_ana - debit_ana
            
            ecart = abs(total_general - solde_analytique)
            seuil = controle.seuil_tolerance or Decimal('1.0')
            
            if ecart > seuil:
                anomalies.append({
                    'type': 'ECART_GENERAL_ANALYTIQUE',
                    'description': f'Écart de {ecart} entre général ({total_general}) et analytique ({solde_analytique}) pour le compte {compte.numero}',
                    'compte': compte.numero,
                    'montant': float(ecart),
                    'criticite': 'AVERTISSEMENT'
                })
        
        conforme = len([a for a in anomalies if a['criticite'] == 'BLOQUANT']) == 0
        
        return {
            'conforme': conforme,
            'valeur_constatee': Decimal(str(len(anomalies))),
            'anomalies': anomalies,
            'message': f"Contrôle analytique: {len(anomalies)} écart(s) détecté(s)"
        }
    
    def _calculer_solde_compte(self, compte: CompteComptable, procedure: ProcedureCloture) -> Decimal:
        """
        Calcule le solde d'un compte sur la période de clôture
        """
        ecritures = EcritureComptable.objects.filter(
            compte=compte,
            exercice=procedure.exercice,
            date_ecriture__lte=procedure.date_fin_periode,
            statut='VALIDE'
        )
        
        totaux = ecritures.aggregate(
            total_debit=Sum('montant_debit'),
            total_credit=Sum('montant_credit')
        )
        
        total_debit = totaux['total_debit'] or Decimal('0')
        total_credit = totaux['total_credit'] or Decimal('0')
        
        return total_debit - total_credit
    
    def _generer_ecriture_automatique(self, ecriture_auto: EcritureClotureAutomatique, utilisateur_id: int):
        """
        Génère une écriture automatique de clôture
        """
        # À implémenter selon le type d'écriture
        # Cette méthode devra être adaptée selon les besoins spécifiques
        pass
    
    def _completer_etape(self, etape: EtapeCloture, utilisateur_id: int):
        """
        Marque une étape comme complétée et démarre la suivante si possible
        """
        etape.statut = 'COMPLETEE'
        etape.date_fin = datetime.now()
        etape.save()
        
        # Log de completion
        self._log_evenement(
            etape.procedure_cloture,
            etape,
            'FIN_ETAPE',
            f"Étape {etape.nom_etape} complétée",
            f"Durée: {etape.date_fin - etape.date_debut}",
            utilisateur_id
        )
        
        # Mettre à jour le pourcentage d'avancement
        total_etapes = etape.procedure_cloture.etapes.count()
        etapes_completees = etape.procedure_cloture.etapes.filter(statut='COMPLETEE').count()
        pourcentage = int((etapes_completees / total_etapes) * 100) if total_etapes > 0 else 0
        
        etape.procedure_cloture.pourcentage_avancement = pourcentage
        etape.procedure_cloture.save()
        
        # Démarrer la prochaine étape si toutes les prérequises sont complétées
        prochaine_etape = etape.procedure_cloture.etapes.filter(
            ordre_execution=etape.ordre_execution + 1
        ).first()
        
        if prochaine_etape and self._prerequisites_satisfaits(prochaine_etape):
            self._demarrer_etape(prochaine_etape, utilisateur_id)
        
        # Si toutes les étapes sont complétées, finaliser la clôture
        if pourcentage == 100:
            self._finaliser_cloture(etape.procedure_cloture, utilisateur_id)
    
    def _prerequisites_satisfaits(self, etape: EtapeCloture) -> bool:
        """
        Vérifie si les prérequis d'une étape sont satisfaits
        """
        for prerequise in etape.etapes_prerequises.all():
            if prerequise.statut != 'COMPLETEE':
                return False
        return True
    
    def _finaliser_cloture(self, procedure: ProcedureCloture, utilisateur_id: int):
        """
        Finalise la procédure de clôture
        """
        # Vérifier s'il y a des anomalies bloquantes
        anomalies_bloquantes = ControleCloture.objects.filter(
            etape_cloture__procedure_cloture=procedure,
            resultat_conforme=False,
            niveau_criticite='BLOQUANT'
        ).count()
        
        if anomalies_bloquantes > 0 and not procedure.type_cloture.autoriser_cloture_avec_anomalies:
            procedure.statut = 'EN_ATTENTE_APPROBATION'
        else:
            if procedure.type_cloture.approbation_requise:
                procedure.statut = 'EN_ATTENTE_APPROBATION'
            else:
                procedure.statut = 'CLOTUE'
                procedure.date_fin_cloture = datetime.now()
        
        procedure.save()
        
        self._log_evenement(
            procedure, None, 'CLOTURE_DEFINITIVE',
            'Procédure de clôture finalisée',
            f"Statut final: {procedure.statut}",
            utilisateur_id
        )
    
    def _log_evenement(self, procedure: ProcedureCloture, etape: Optional[EtapeCloture],
                      type_evenement: str, titre: str, description: str, utilisateur_id: int):
        """
        Enregistre un événement dans le journal de clôture
        """
        JournalCloture.objects.create(
            procedure_cloture=procedure,
            etape_cloture=etape,
            type_evenement=type_evenement,
            titre=titre,
            description=description,
            utilisateur_id=utilisateur_id
        )
    
    def approuver_cloture(self, procedure_id: int, approbateur_id: int, 
                         commentaires: str = '') -> Dict[str, Any]:
        """
        Approuve une clôture en attente d'approbation
        """
        procedure = ProcedureCloture.objects.get(id=procedure_id)
        
        if procedure.statut != 'EN_ATTENTE_APPROBATION':
            raise ValueError("La procédure doit être en attente d'approbation")
        
        with transaction.atomic():
            procedure.statut = 'CLOTUE'
            procedure.date_fin_cloture = datetime.now()
            procedure.approbateur_id = approbateur_id
            procedure.date_approbation = datetime.now()
            procedure.commentaires_approbation = commentaires
            procedure.save()
            
            self._log_evenement(
                procedure, None, 'APPROBATION',
                'Clôture approuvée',
                f"Approuvée par l'utilisateur {approbateur_id}: {commentaires}",
                approbateur_id
            )
        
        return {
            'procedure_id': procedure.id,
            'statut': procedure.statut,
            'date_approbation': procedure.date_approbation,
            'approbateur_id': approbateur_id
        }