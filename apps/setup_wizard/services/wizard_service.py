from django.db import transaction
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import date, timedelta
from typing import Dict, List, Any, Optional, Tuple
import json
import uuid
import logging

from ..models import (
    SetupWizardSession, SetupWizardStep, SetupTemplate, 
    SetupWizardFeedback, SetupWizardAnalytics
)
from apps.company.models import Company
from apps.accounting.models import ExerciceComptable, CompteComptable, Journal
from apps.taxation.models import RegimeFiscal, ConfigurationTVA

logger = logging.getLogger(__name__)


class WizardService:
    """
    Service principal pour l'assistant de configuration WiseBook
    Implémentation EXP-PAR-001: Assistant de Démarrage complet
    """
    
    def __init__(self):
        self.default_steps = {
            'initial_setup': 7,
            'company_setup': 5,
            'accounting_setup': 6,
            'fiscal_setup': 4,
            'banking_setup': 3,
            'user_setup': 4,
            'reporting_setup': 3,
            'integration_setup': 2
        }
    
    def demarrer_assistant(self, company_id: int, wizard_type: str, 
                          utilisateur_id: int) -> SetupWizardSession:
        """
        Démarre une nouvelle session d'assistant de configuration
        """
        session_id = f"wizard_{wizard_type}_{uuid.uuid4().hex[:8]}"
        
        with transaction.atomic():
            session = SetupWizardSession.objects.create(
                session_id=session_id,
                wizard_type=wizard_type,
                company_id=company_id,
                utilisateur_id=utilisateur_id,
                total_steps=self.default_steps.get(wizard_type, 5),
                status='started'
            )
            
            # Enregistrer l'événement analytics
            self._track_event('session_started', wizard_type, session_id)
            
            # Initialiser les étapes si elles n'existent pas
            self._initialiser_etapes(wizard_type)
        
        return session
    
    def _initialiser_etapes(self, wizard_type: str):
        """
        Initialise les étapes par défaut pour un type d'assistant
        """
        if SetupWizardStep.objects.filter(wizard_type=wizard_type).exists():
            return  # Étapes déjà initialisées
        
        etapes_config = self._get_etapes_config(wizard_type)
        
        for etape_config in etapes_config:
            SetupWizardStep.objects.create(
                wizard_type=wizard_type,
                **etape_config
            )
    
    def _get_etapes_config(self, wizard_type: str) -> List[Dict]:
        """
        Retourne la configuration des étapes selon le type d'assistant
        """
        configurations = {
            'initial_setup': self._get_initial_setup_steps(),
            'company_setup': self._get_company_setup_steps(),
            'accounting_setup': self._get_accounting_setup_steps(),
            'fiscal_setup': self._get_fiscal_setup_steps()
        }
        
        return configurations.get(wizard_type, [])
    
    def _get_initial_setup_steps(self) -> List[Dict]:
        """Configuration complète EXP-PAR-001"""
        return [
            {
                'step_number': 1,
                'step_name': 'enterprise_info',
                'title': 'Informations Entreprise',
                'description': 'Saisissez les informations légales et administratives de votre entreprise',
                'icon': 'building',
                'fields_config': [
                    {
                        'name': 'raison_sociale',
                        'type': 'text',
                        'label': 'Raison sociale',
                        'required': True,
                        'placeholder': 'Nom officiel de votre entreprise'
                    },
                    {
                        'name': 'forme_juridique',
                        'type': 'select',
                        'label': 'Forme juridique',
                        'required': True,
                        'options': [
                            {'value': 'SARL', 'label': 'Société à Responsabilité Limitée'},
                            {'value': 'SA', 'label': 'Société Anonyme'},
                            {'value': 'SAS', 'label': 'Société par Actions Simplifiée'},
                            {'value': 'EURL', 'label': 'Entreprise Unipersonnelle'},
                            {'value': 'EI', 'label': 'Entreprise Individuelle'}
                        ]
                    },
                    {
                        'name': 'rccm',
                        'type': 'text',
                        'label': 'Numéro RCCM',
                        'required': False,
                        'placeholder': 'CM-DLA-23-B-12345',
                        'pattern': r'^[A-Z]{2}-[A-Z]{3}-\d{2}-[AB]-\d{5}$'
                    },
                    {
                        'name': 'nif',
                        'type': 'text',
                        'label': 'Numéro NIF',
                        'required': False,
                        'placeholder': '123456789A',
                        'pattern': r'^\d{9}[A-Z]$'
                    },
                    {
                        'name': 'secteur_activite',
                        'type': 'select',
                        'label': 'Secteur d\\'activité',
                        'required': True,
                        'options': [
                            {'value': 'GENERAL', 'label': 'Activité Générale'},
                            {'value': 'COMMERCE', 'label': 'Commerce'},
                            {'value': 'INDUSTRIE', 'label': 'Industrie'},
                            {'value': 'SERVICES', 'label': 'Services'},
                            {'value': 'BTP', 'label': 'BTP'},
                            {'value': 'TRANSPORT', 'label': 'Transport'}
                        ]
                    }
                ],
                'validation_rules': {
                    'rccm_format': {
                        'type': 'pattern',
                        'field': 'rccm',
                        'pattern': r'^[A-Z]{2}-[A-Z]{3}-\d{2}-[AB]-\d{5}$',
                        'message': 'Format RCCM invalide'
                    }
                }
            },
            {
                'step_number': 2,
                'step_name': 'address_contact',
                'title': 'Adresse et Contact',
                'description': 'Coordonnées du siège social et informations de contact',
                'icon': 'map-marker',
                'fields_config': [
                    {
                        'name': 'adresse_ligne1',
                        'type': 'text',
                        'label': 'Adresse (ligne 1)',
                        'required': True,
                        'placeholder': 'Numéro et nom de rue'
                    },
                    {
                        'name': 'ville',
                        'type': 'text',
                        'label': 'Ville',
                        'required': True
                    },
                    {
                        'name': 'telephone',
                        'type': 'text',
                        'label': 'Téléphone principal',
                        'required': True,
                        'placeholder': '+237 6XX XX XX XX'
                    },
                    {
                        'name': 'email',
                        'type': 'email',
                        'label': 'Email principal',
                        'required': True,
                        'placeholder': 'contact@entreprise.com'
                    }
                ]
            },
            {
                'step_number': 3,
                'step_name': 'accounting_config',
                'title': 'Configuration Comptable',
                'description': 'Paramètres comptables SYSCOHADA et structure des comptes',
                'icon': 'calculator',
                'fields_config': [
                    {
                        'name': 'referentiel_syscohada',
                        'type': 'radio',
                        'label': 'Référentiel SYSCOHADA',
                        'required': True,
                        'options': [
                            {'value': 'NORMAL', 'label': 'Système Normal (CA > 100M FCFA)'},
                            {'value': 'ALLEGE', 'label': 'Système Allégé (10M < CA < 100M FCFA)'},
                            {'value': 'MINIMAL', 'label': 'Système Minimal (CA < 10M FCFA)'}
                        ]
                    },
                    {
                        'name': 'plan_sectoriel',
                        'type': 'select',
                        'label': 'Plan comptable sectoriel',
                        'required': True,
                        'options': [
                            {'value': 'GENERAL', 'label': 'Plan Général SYSCOHADA'},
                            {'value': 'BANQUE', 'label': 'Plan Bancaire'},
                            {'value': 'ASSURANCE', 'label': 'Plan Assurance'},
                            {'value': 'MICROFINANCE', 'label': 'Plan Microfinance'}
                        ]
                    },
                    {
                        'name': 'devise_principale',
                        'type': 'select',
                        'label': 'Devise principale',
                        'required': True,
                        'options': [
                            {'value': 'XAF', 'label': 'Franc CFA BEAC (XAF)'},
                            {'value': 'XOF', 'label': 'Franc CFA BCEAO (XOF)'},
                            {'value': 'EUR', 'label': 'Euro (EUR)'},
                            {'value': 'USD', 'label': 'Dollar US (USD)'}
                        ]
                    },
                    {
                        'name': 'comptabilite_analytique',
                        'type': 'boolean',
                        'label': 'Activer la comptabilité analytique',
                        'required': False
                    }
                ]
            },
            {
                'step_number': 4,
                'step_name': 'fiscal_year',
                'title': 'Exercice Comptable',
                'description': 'Configuration de votre premier exercice comptable',
                'icon': 'calendar',
                'fields_config': [
                    {
                        'name': 'date_debut_exercice',
                        'type': 'date',
                        'label': 'Date de début',
                        'required': True,
                        'default': f"{date.today().year}-01-01"
                    },
                    {
                        'name': 'date_fin_exercice',
                        'type': 'date',
                        'label': 'Date de fin',
                        'required': True,
                        'default': f"{date.today().year}-12-31"
                    },
                    {
                        'name': 'exercice_decale',
                        'type': 'boolean',
                        'label': 'Exercice décalé (différent de l\\'année civile)',
                        'required': False
                    }
                ]
            },
            {
                'step_number': 5,
                'step_name': 'journals_setup',
                'title': 'Journaux Comptables',
                'description': 'Configuration des journaux comptables obligatoires',
                'icon': 'book',
                'fields_config': [
                    {
                        'name': 'journaux_standards',
                        'type': 'checkbox',
                        'label': 'Journaux à créer',
                        'required': True,
                        'options': [
                            {'value': 'ACH', 'label': 'Journal des Achats', 'checked': True},
                            {'value': 'VTE', 'label': 'Journal des Ventes', 'checked': True},
                            {'value': 'BQ', 'label': 'Journal de Banque', 'checked': True},
                            {'value': 'CA', 'label': 'Journal de Caisse', 'checked': True},
                            {'value': 'OD', 'label': 'Journal des Opérations Diverses', 'checked': True},
                            {'value': 'AN', 'label': 'Journal des À-Nouveaux', 'checked': True}
                        ]
                    }
                ]
            },
            {
                'step_number': 6,
                'step_name': 'import_data',
                'title': 'Import de Données',
                'description': 'Importez vos données existantes (optionnel)',
                'icon': 'upload',
                'skippable': True,
                'fields_config': [
                    {
                        'name': 'importer_donnees',
                        'type': 'boolean',
                        'label': 'Souhaitez-vous importer des données existantes ?',
                        'required': False
                    },
                    {
                        'name': 'balance_ouverture',
                        'type': 'file',
                        'label': 'Balance d\\'ouverture (Excel/CSV)',
                        'required': False,
                        'accept': '.xlsx,.xls,.csv'
                    },
                    {
                        'name': 'fichier_tiers',
                        'type': 'file',
                        'label': 'Fichier des tiers (Excel/CSV)',
                        'required': False,
                        'accept': '.xlsx,.xls,.csv'
                    }
                ]
            },
            {
                'step_number': 7,
                'step_name': 'finalization',
                'title': 'Finalisation',
                'description': 'Validation et finalisation de la configuration',
                'icon': 'check-circle',
                'fields_config': [
                    {
                        'name': 'confirmation',
                        'type': 'boolean',
                        'label': 'Je confirme que les informations saisies sont correctes',
                        'required': True
                    },
                    {
                        'name': 'demarrer_utilisation',
                        'type': 'boolean',
                        'label': 'Démarrer immédiatement l\\'utilisation de WiseBook',
                        'required': False,
                        'default': True
                    }
                ]
            }
        ]
    
    def _get_company_setup_steps(self) -> List[Dict]:
        """Configuration entreprise simplifiée"""
        return []  # À implémenter selon les besoins
    
    def _get_accounting_setup_steps(self) -> List[Dict]:
        """Configuration comptable avancée"""
        return []  # À implémenter selon les besoins
    
    def _get_fiscal_setup_steps(self) -> List[Dict]:
        """Configuration fiscale"""
        return []  # À implémenter selon les besoins
    
    def get_etape_courante(self, session_id: str) -> Optional[SetupWizardStep]:
        """
        Récupère l'étape courante d'une session
        """
        try:
            session = SetupWizardSession.objects.get(session_id=session_id)
            return SetupWizardStep.objects.filter(
                wizard_type=session.wizard_type,
                step_number=session.current_step
            ).first()
        except SetupWizardSession.DoesNotExist:
            return None
    
    def valider_etape(self, session_id: str, donnees: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        Valide les données d'une étape
        """
        try:
            session = SetupWizardSession.objects.get(session_id=session_id)
            etape = SetupWizardStep.objects.get(
                wizard_type=session.wizard_type,
                step_number=session.current_step
            )
            
            # Valider les données
            est_valide, erreurs = etape.validate_step_data(donnees)
            
            if est_valide:
                # Sauvegarder les données
                session.add_step_data(etape.step_name, donnees)
                self._track_event('step_completed', session.wizard_type, session_id, {
                    'step_number': session.current_step,
                    'step_name': etape.step_name
                })
            
            return est_valide, erreurs
            
        except (SetupWizardSession.DoesNotExist, SetupWizardStep.DoesNotExist):
            return False, ['Session ou étape introuvable']
    
    def passer_etape_suivante(self, session_id: str) -> Optional[SetupWizardStep]:
        """
        Passe à l'étape suivante de l'assistant
        """
        try:
            session = SetupWizardSession.objects.get(session_id=session_id)
            
            if session.current_step < session.total_steps:
                session.current_step += 1
                session.save()
                
                return SetupWizardStep.objects.filter(
                    wizard_type=session.wizard_type,
                    step_number=session.current_step
                ).first()
            else:
                # Toutes les étapes terminées
                return self.finaliser_assistant(session_id)
                
        except SetupWizardSession.DoesNotExist:
            return None
    
    def ignorer_etape(self, session_id: str) -> Optional[SetupWizardStep]:
        """
        Ignore l'étape courante si elle est optionnelle
        """
        try:
            session = SetupWizardSession.objects.get(session_id=session_id)
            etape = SetupWizardStep.objects.get(
                wizard_type=session.wizard_type,
                step_number=session.current_step
            )
            
            if etape.skippable:
                self._track_event('step_skipped', session.wizard_type, session_id, {
                    'step_number': session.current_step,
                    'step_name': etape.step_name
                })
                return self.passer_etape_suivante(session_id)
            else:
                return None  # Étape non optionnelle
                
        except (SetupWizardSession.DoesNotExist, SetupWizardStep.DoesNotExist):
            return None
    
    def finaliser_assistant(self, session_id: str) -> Dict[str, Any]:
        """
        Finalise la configuration et applique tous les paramètres
        """
        try:
            session = SetupWizardSession.objects.get(session_id=session_id)
            
            with transaction.atomic():
                # Appliquer la configuration
                resultats = self._appliquer_configuration(session)
                
                # Marquer comme complétée
                session.status = 'completed'
                session.completed_at = timezone.now()
                session.configuration_applied = resultats
                session.save()
                
                self._track_event('session_completed', session.wizard_type, session_id, {
                    'duration_minutes': self._calculer_duree_session(session),
                    'steps_completed': session.current_step
                })
                
                return {
                    'success': True,
                    'configuration_applied': resultats,
                    'redirect_url': self._get_redirect_url(session.wizard_type)
                }
                
        except Exception as e:
            logger.error(f"Erreur lors de la finalisation: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _appliquer_configuration(self, session: SetupWizardSession) -> Dict[str, Any]:
        """
        Applique la configuration collectée pendant l'assistant
        """
        resultats = {'created': [], 'updated': [], 'errors': []}
        
        try:
            if session.wizard_type == 'initial_setup':
                resultats = self._appliquer_configuration_initiale(session)
                
        except Exception as e:
            resultats['errors'].append(str(e))
            logger.error(f"Erreur configuration {session.wizard_type}: {str(e)}")
        
        return resultats
    
    def _appliquer_configuration_initiale(self, session: SetupWizardSession) -> Dict[str, Any]:
        """
        Applique la configuration initiale complète
        """
        resultats = {'created': [], 'updated': [], 'errors': []}
        donnees = session.collected_data
        
        try:
            # 1. Mettre à jour les informations de l'entreprise
            if 'enterprise_info' in donnees:
                company = session.company
                info_entreprise = donnees['enterprise_info']
                
                # Mettre à jour les champs de base
                for field, value in info_entreprise.items():
                    if hasattr(company, field):
                        setattr(company, field, value)
                
                company.save()
                resultats['updated'].append('Company information')
            
            # 2. Créer l'exercice comptable
            if 'fiscal_year' in donnees:
                exercice_data = donnees['fiscal_year']
                exercice = ExerciceComptable.objects.create(
                    company=session.company,
                    nom=f"Exercice {exercice_data.get('date_debut_exercice', '')[:4]}",
                    date_debut=exercice_data.get('date_debut_exercice'),
                    date_fin=exercice_data.get('date_fin_exercice'),
                    statut='OUVERT'
                )
                resultats['created'].append(f'Exercice comptable: {exercice.nom}')
            
            # 3. Créer les journaux comptables
            if 'journals_setup' in donnees:
                journaux_data = donnees['journals_setup']
                journaux_a_creer = journaux_data.get('journaux_standards', [])
                
                journaux_config = {
                    'ACH': {'nom': 'Journal des Achats', 'type': 'ACHAT'},
                    'VTE': {'nom': 'Journal des Ventes', 'type': 'VENTE'},
                    'BQ': {'nom': 'Journal de Banque', 'type': 'TRESORERIE'},
                    'CA': {'nom': 'Journal de Caisse', 'type': 'TRESORERIE'},
                    'OD': {'nom': 'Journal des Opérations Diverses', 'type': 'OPERATIONS_DIVERSES'},
                    'AN': {'nom': 'Journal des À-Nouveaux', 'type': 'A_NOUVEAU'}
                }
                
                for code_journal in journaux_a_creer:
                    if code_journal in journaux_config:
                        config = journaux_config[code_journal]
                        journal = Journal.objects.create(
                            company=session.company,
                            code=code_journal,
                            nom=config['nom'],
                            type_journal=config['type']
                        )
                        resultats['created'].append(f'Journal: {journal.nom}')
            
            # 4. Créer le plan comptable SYSCOHADA
            if 'accounting_config' in donnees:
                nb_comptes = self._creer_plan_comptable_syscohada(
                    session.company,
                    donnees['accounting_config']
                )
                resultats['created'].append(f'Plan comptable: {nb_comptes} comptes créés')
            
            # 5. Traiter les imports de données
            if 'import_data' in donnees and donnees['import_data'].get('importer_donnees'):
                # Le traitement des imports sera fait de manière asynchrone
                resultats['created'].append('Imports de données planifiés')
        
        except Exception as e:
            resultats['errors'].append(str(e))
        
        return resultats
    
    def _creer_plan_comptable_syscohada(self, company: Company, config: Dict) -> int:
        """
        Crée le plan comptable SYSCOHADA selon la configuration
        """
        referentiel = config.get('referentiel_syscohada', 'NORMAL')
        plan_sectoriel = config.get('plan_sectoriel', 'GENERAL')
        
        # Plan comptable de base SYSCOHADA
        comptes_base = self._get_comptes_syscohada_base(referentiel, plan_sectoriel)
        
        nb_crees = 0
        for compte_data in comptes_base:
            compte, created = CompteComptable.objects.get_or_create(
                company=company,
                numero=compte_data['numero'],
                defaults={
                    'nom': compte_data['nom'],
                    'type_compte': compte_data.get('type', 'DETAIL'),
                    'actif': True
                }
            )
            if created:
                nb_crees += 1
        
        return nb_crees
    
    def _get_comptes_syscohada_base(self, referentiel: str, plan_sectoriel: str) -> List[Dict]:
        """
        Retourne la liste des comptes SYSCOHADA de base
        """
        # Plan comptable minimum requis
        comptes_base = [
            # Classe 1 - Capitaux
            {'numero': '10', 'nom': 'CAPITAL', 'type': 'SYNTHESE'},
            {'numero': '101', 'nom': 'Capital social', 'type': 'DETAIL'},
            {'numero': '11', 'nom': 'RESERVES', 'type': 'SYNTHESE'},
            {'numero': '110', 'nom': 'Réserve légale', 'type': 'DETAIL'},
            {'numero': '12', 'nom': 'REPORT A NOUVEAU', 'type': 'DETAIL'},
            {'numero': '13', 'nom': 'RESULTAT', 'type': 'DETAIL'},
            
            # Classe 2 - Immobilisations
            {'numero': '20', 'nom': 'CHARGES IMMOBILISEES', 'type': 'SYNTHESE'},
            {'numero': '21', 'nom': 'IMMOBILISATIONS INCORPORELLES', 'type': 'SYNTHESE'},
            {'numero': '211', 'nom': 'Frais de recherche et développement', 'type': 'DETAIL'},
            {'numero': '22', 'nom': 'TERRAINS', 'type': 'SYNTHESE'},
            {'numero': '221', 'nom': 'Terrains nus', 'type': 'DETAIL'},
            {'numero': '23', 'nom': 'BATIMENTS, INSTALLATIONS TECHNIQUES', 'type': 'SYNTHESE'},
            {'numero': '231', 'nom': 'Bâtiments industriels', 'type': 'DETAIL'},
            {'numero': '24', 'nom': 'MATERIEL', 'type': 'SYNTHESE'},
            {'numero': '241', 'nom': 'Matériel et outillage industriel', 'type': 'DETAIL'},
            {'numero': '244', 'nom': 'Matériel de transport', 'type': 'DETAIL'},
            {'numero': '245', 'nom': 'Matériel de bureau et informatique', 'type': 'DETAIL'},
            
            # Classe 3 - Stocks
            {'numero': '31', 'nom': 'MARCHANDISES', 'type': 'SYNTHESE'},
            {'numero': '311', 'nom': 'Marchandises A', 'type': 'DETAIL'},
            {'numero': '32', 'nom': 'MATIERES PREMIERES', 'type': 'SYNTHESE'},
            {'numero': '321', 'nom': 'Matières A', 'type': 'DETAIL'},
            
            # Classe 4 - Tiers
            {'numero': '40', 'nom': 'FOURNISSEURS ET COMPTES RATTACHES', 'type': 'SYNTHESE'},
            {'numero': '401', 'nom': 'Fournisseurs', 'type': 'COLLECTIF'},
            {'numero': '41', 'nom': 'CLIENTS ET COMPTES RATTACHES', 'type': 'SYNTHESE'},
            {'numero': '411', 'nom': 'Clients', 'type': 'COLLECTIF'},
            {'numero': '42', 'nom': 'PERSONNEL', 'type': 'SYNTHESE'},
            {'numero': '421', 'nom': 'Personnel - Avances et acomptes', 'type': 'DETAIL'},
            {'numero': '43', 'nom': 'ORGANISMES SOCIAUX', 'type': 'SYNTHESE'},
            {'numero': '431', 'nom': 'Sécurité sociale', 'type': 'DETAIL'},
            {'numero': '44', 'nom': 'ETAT ET COLLECTIVITES PUBLIQUES', 'type': 'SYNTHESE'},
            {'numero': '441', 'nom': 'État - Subventions à recevoir', 'type': 'DETAIL'},
            {'numero': '4431', 'nom': 'TVA collectée', 'type': 'DETAIL'},
            {'numero': '4432', 'nom': 'TVA déductible', 'type': 'DETAIL'},
            
            # Classe 5 - Trésorerie
            {'numero': '52', 'nom': 'BANQUES', 'type': 'SYNTHESE'},
            {'numero': '521', 'nom': 'Banques locales', 'type': 'DETAIL'},
            {'numero': '57', 'nom': 'CAISSE', 'type': 'SYNTHESE'},
            {'numero': '571', 'nom': 'Caisse principale', 'type': 'DETAIL'},
            
            # Classe 6 - Charges
            {'numero': '60', 'nom': 'ACHATS ET VARIATIONS DE STOCKS', 'type': 'SYNTHESE'},
            {'numero': '601', 'nom': 'Achats de marchandises', 'type': 'DETAIL'},
            {'numero': '602', 'nom': 'Achats de matières premières', 'type': 'DETAIL'},
            {'numero': '61', 'nom': 'TRANSPORTS', 'type': 'SYNTHESE'},
            {'numero': '611', 'nom': 'Transports sur achats', 'type': 'DETAIL'},
            {'numero': '62', 'nom': 'SERVICES EXTERIEURS A', 'type': 'SYNTHESE'},
            {'numero': '621', 'nom': 'Sous-traitance générale', 'type': 'DETAIL'},
            {'numero': '622', 'nom': 'Locations et charges locatives', 'type': 'DETAIL'},
            {'numero': '63', 'nom': 'SERVICES EXTERIEURS B', 'type': 'SYNTHESE'},
            {'numero': '631', 'nom': 'Frais bancaires', 'type': 'DETAIL'},
            {'numero': '64', 'nom': 'IMPOTS ET TAXES', 'type': 'SYNTHESE'},
            {'numero': '641', 'nom': 'Impôts et taxes directs', 'type': 'DETAIL'},
            {'numero': '66', 'nom': 'CHARGES DE PERSONNEL', 'type': 'SYNTHESE'},
            {'numero': '661', 'nom': 'Salaires', 'type': 'DETAIL'},
            {'numero': '67', 'nom': 'CHARGES FINANCIERES', 'type': 'SYNTHESE'},
            {'numero': '671', 'nom': 'Intérêts des emprunts', 'type': 'DETAIL'},
            
            # Classe 7 - Produits
            {'numero': '70', 'nom': 'VENTES', 'type': 'SYNTHESE'},
            {'numero': '701', 'nom': 'Ventes de marchandises', 'type': 'DETAIL'},
            {'numero': '702', 'nom': 'Ventes de produits finis', 'type': 'DETAIL'},
            {'numero': '76', 'nom': 'PRODUITS FINANCIERS', 'type': 'SYNTHESE'},
            {'numero': '761', 'nom': 'Revenus des titres de participation', 'type': 'DETAIL'}
        ]
        
        return comptes_base
    
    def _calculer_duree_session(self, session: SetupWizardSession) -> int:
        """Calcule la durée de la session en minutes"""
        if session.completed_at:
            duree = session.completed_at - session.started_at
            return int(duree.total_seconds() / 60)
        return 0
    
    def _get_redirect_url(self, wizard_type: str) -> str:
        """Retourne l'URL de redirection après finalisation"""
        urls = {
            'initial_setup': '/dashboard/',
            'company_setup': '/company/settings/',
            'accounting_setup': '/accounting/dashboard/',
            'fiscal_setup': '/taxation/dashboard/'
        }
        return urls.get(wizard_type, '/dashboard/')
    
    def _track_event(self, event_type: str, wizard_type: str, session_id: str, data: Dict = None):
        """Enregistre un événement analytics"""
        try:
            SetupWizardAnalytics.objects.create(
                event_type=event_type,
                wizard_type=wizard_type,
                session_id=session_id,
                event_data=data or {}
            )
        except Exception as e:
            logger.error(f"Erreur tracking event: {str(e)}")
    
    def get_templates_recommandes(self, company_id: int) -> List[SetupTemplate]:
        """
        Retourne les templates recommandés pour une société
        """
        try:
            company = Company.objects.get(id=company_id)
            templates = SetupTemplate.objects.filter(active=True)
            
            # Filtrer selon les critères de la société
            templates_matches = []
            for template in templates:
                if template.matches_criteria(company):
                    templates_matches.append(template)
            
            # Trier par popularité et featured
            return sorted(templates_matches, key=lambda t: (t.featured, t.popularity), reverse=True)[:5]
            
        except Company.DoesNotExist:
            return []
    
    def appliquer_template(self, session_id: str, template_id: int) -> bool:
        """
        Applique un template de configuration à une session
        """
        try:
            session = SetupWizardSession.objects.get(session_id=session_id)
            template = SetupTemplate.objects.get(id=template_id)
            
            # Appliquer les données du template
            for step_name, step_data in template.configuration_data.items():
                session.add_step_data(step_name, step_data)
            
            # Incrémenter l'usage du template
            template.increment_usage()
            
            self._track_event('template_applied', session.wizard_type, session_id, {
                'template_id': template_id,
                'template_name': template.nom
            })
            
            return True
            
        except (SetupWizardSession.DoesNotExist, SetupTemplate.DoesNotExist):
            return False