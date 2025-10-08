import uuid
from typing import Dict, List, Any, Optional, Tuple
from django.utils import timezone
from django.db import transaction
from datetime import timedelta
import logging

from .models import (
    SetupWizardSession, SetupWizardStep, SetupTemplate,
    SetupWizardFeedback, SetupWizardAnalytics
)
from apps.core.models import Societe
from apps.security.models import Utilisateur
from apps.configuration.services import ConfigurationService
from apps.configuration.models import ConfigurationTemplate

logger = logging.getLogger(__name__)


class SetupWizardService:
    """Service principal pour les assistants de configuration."""
    
    @staticmethod
    def start_wizard(
        wizard_type: str,
        societe: Societe,
        user: Utilisateur,
        initial_data: Dict = None
    ) -> SetupWizardSession:
        """Démarre un nouvel assistant de configuration."""
        try:
            # Générer un ID de session unique
            session_id = f"wizard_{wizard_type}_{uuid.uuid4().hex[:8]}"
            
            # Récupérer les étapes du wizard
            steps = SetupWizardStep.objects.filter(
                wizard_type=wizard_type,
                active=True
            ).order_by('step_number')
            
            if not steps.exists():
                raise ValueError(f"Aucune étape définie pour le wizard {wizard_type}")
            
            # Créer la session
            session = SetupWizardSession.objects.create(
                session_id=session_id,
                wizard_type=wizard_type,
                societe=societe,
                utilisateur=user,
                total_steps=steps.count(),
                collected_data=initial_data or {}
            )
            
            # Enregistrer l'événement analytics
            SetupWizardAnalytics.objects.create(
                event_type='session_started',
                wizard_type=wizard_type,
                session_id=session_id,
                event_data={
                    'user_id': user.id,
                    'societe_id': societe.id,
                    'total_steps': steps.count()
                }
            )
            
            logger.info(f"Wizard {wizard_type} démarré pour {societe.nom} par {user.email}")
            return session
            
        except Exception as e:
            logger.error(f"Erreur démarrage wizard: {str(e)}")
            raise
    
    @staticmethod
    def get_wizard_session(session_id: str) -> Optional[SetupWizardSession]:
        """Récupère une session de wizard."""
        try:
            session = SetupWizardSession.objects.select_related(
                'societe', 'utilisateur'
            ).get(session_id=session_id)
            
            # Vérifier si la session a expiré
            if session.is_expired() and session.status == 'in_progress':
                session.status = 'cancelled'
                session.errors.append({
                    'type': 'session_expired',
                    'message': 'Session expirée après 24h d\'inactivité'
                })
                session.save()
                
                # Analytics
                SetupWizardAnalytics.objects.create(
                    event_type='session_abandoned',
                    wizard_type=session.wizard_type,
                    session_id=session_id,
                    event_data={'reason': 'expired'}
                )
            
            return session
            
        except SetupWizardSession.DoesNotExist:
            return None
    
    @staticmethod
    def get_current_step(session: SetupWizardSession) -> Optional[SetupWizardStep]:
        """Récupère l'étape courante d'une session."""
        try:
            return SetupWizardStep.objects.get(
                wizard_type=session.wizard_type,
                step_number=session.current_step,
                active=True
            )
        except SetupWizardStep.DoesNotExist:
            return None
    
    @staticmethod
    def process_step_data(
        session: SetupWizardSession,
        step_data: Dict[str, Any]
    ) -> Tuple[bool, List[str], Optional[SetupWizardStep]]:
        """Traite les données d'une étape et passe à la suivante."""
        try:
            current_step = SetupWizardService.get_current_step(session)
            if not current_step:
                return False, ["Étape courante non trouvée"], None
            
            # Valider les données de l'étape
            is_valid, errors = current_step.validate_step_data(step_data)
            
            if not is_valid:
                # Analytics pour l'erreur
                SetupWizardAnalytics.objects.create(
                    event_type='error_occurred',
                    wizard_type=session.wizard_type,
                    session_id=session.session_id,
                    step_number=current_step.step_number,
                    event_data={
                        'errors': errors,
                        'step_data_keys': list(step_data.keys())
                    }
                )
                return False, errors, current_step
            
            # Sauvegarder les données de l'étape
            session.add_step_data(current_step.step_name, step_data)
            session.status = 'in_progress'
            
            # Analytics pour l'étape terminée
            SetupWizardAnalytics.objects.create(
                event_type='step_completed',
                wizard_type=session.wizard_type,
                session_id=session.session_id,
                step_number=current_step.step_number,
                event_data={
                    'step_name': current_step.step_name,
                    'data_collected': len(step_data)
                }
            )
            
            # Passer à l'étape suivante
            if session.current_step < session.total_steps:
                session.current_step += 1
                session.save()
                
                # Récupérer la prochaine étape
                next_step = SetupWizardService.get_current_step(session)
                return True, [], next_step
            else:
                # Wizard terminé
                success = SetupWizardService.complete_wizard(session)
                return success, [], None
            
        except Exception as e:
            logger.error(f"Erreur traitement étape: {str(e)}")
            
            # Analytics pour l'erreur
            SetupWizardAnalytics.objects.create(
                event_type='error_occurred',
                wizard_type=session.wizard_type,
                session_id=session.session_id,
                event_data={
                    'error': str(e),
                    'step_number': session.current_step
                }
            )
            
            return False, [str(e)], None
    
    @staticmethod
    def skip_step(session: SetupWizardSession) -> Tuple[bool, Optional[SetupWizardStep]]:
        """Passe une étape optionnelle."""
        try:
            current_step = SetupWizardService.get_current_step(session)
            if not current_step:
                return False, None
            
            if not current_step.skippable:
                return False, current_step
            
            # Analytics
            SetupWizardAnalytics.objects.create(
                event_type='step_skipped',
                wizard_type=session.wizard_type,
                session_id=session.session_id,
                step_number=current_step.step_number,
                event_data={'step_name': current_step.step_name}
            )
            
            # Passer à l'étape suivante
            if session.current_step < session.total_steps:
                session.current_step += 1
                session.save()
                return True, SetupWizardService.get_current_step(session)
            else:
                # Wizard terminé
                SetupWizardService.complete_wizard(session)
                return True, None
                
        except Exception as e:
            logger.error(f"Erreur saut d'étape: {str(e)}")
            return False, None
    
    @staticmethod
    def complete_wizard(session: SetupWizardSession) -> bool:
        """Termine un wizard et applique la configuration."""
        try:
            with transaction.atomic():
                # Appliquer la configuration collectée
                success = SetupWizardService._apply_wizard_configuration(session)
                
                if success:
                    session.status = 'completed'
                    session.completed_at = timezone.now()
                else:
                    session.status = 'failed'
                    session.errors.append({
                        'type': 'configuration_failed',
                        'message': 'Échec de l\'application de la configuration'
                    })
                
                session.save()
                
                # Analytics
                SetupWizardAnalytics.objects.create(
                    event_type='session_completed' if success else 'error_occurred',
                    wizard_type=session.wizard_type,
                    session_id=session.session_id,
                    event_data={
                        'success': success,
                        'steps_completed': len(session.step_history),
                        'duration_minutes': (timezone.now() - session.started_at).total_seconds() / 60
                    }
                )
                
                logger.info(f"Wizard {session.wizard_type} terminé pour {session.societe.nom}")
                return success
                
        except Exception as e:
            logger.error(f"Erreur finalisation wizard: {str(e)}")
            
            session.status = 'failed'
            session.errors.append({
                'type': 'completion_error',
                'message': str(e)
            })
            session.save()
            
            return False
    
    @staticmethod
    def _apply_wizard_configuration(session: SetupWizardSession) -> bool:
        """Applique la configuration collectée par le wizard."""
        try:
            applied_config = {}
            
            # Traiter selon le type de wizard
            if session.wizard_type == 'initial_setup':
                applied_config = SetupWizardService._apply_initial_setup(session)
            
            elif session.wizard_type == 'company_setup':
                applied_config = SetupWizardService._apply_company_setup(session)
            
            elif session.wizard_type == 'accounting_setup':
                applied_config = SetupWizardService._apply_accounting_setup(session)
            
            elif session.wizard_type == 'fiscal_setup':
                applied_config = SetupWizardService._apply_fiscal_setup(session)
            
            elif session.wizard_type == 'banking_setup':
                applied_config = SetupWizardService._apply_banking_setup(session)
            
            else:
                # Wizard générique
                applied_config = SetupWizardService._apply_generic_setup(session)
            
            session.configuration_applied = applied_config
            return True
            
        except Exception as e:
            logger.error(f"Erreur application configuration: {str(e)}")
            return False
    
    @staticmethod
    def _apply_initial_setup(session: SetupWizardSession) -> Dict:
        """Applique la configuration initiale complète."""
        applied = {}
        data = session.collected_data
        
        # Configuration générale
        if 'general_info' in data:
            general_data = data['general_info']
            
            # Mettre à jour les infos de la société
            societe = session.societe
            if 'company_name' in general_data:
                societe.nom = general_data['company_name']
            if 'siret' in general_data:
                societe.siret = general_data['siret']
            if 'address' in general_data:
                societe.adresse = general_data['address']
            if 'phone' in general_data:
                societe.telephone = general_data['phone']
            if 'email' in general_data:
                societe.email = general_data['email']
            
            societe.save()
            applied['company_info'] = 'updated'
        
        # Configuration comptable
        if 'accounting_config' in data:
            accounting_data = data['accounting_config']
            
            config_params = {
                'accounting_standard': accounting_data.get('standard', 'SYSCOHADA'),
                'default_currency': accounting_data.get('currency', 'XOF'),
                'decimal_precision': accounting_data.get('precision', 2),
                'auto_journal_numbering': accounting_data.get('auto_numbering', True)
            }
            
            for param, value in config_params.items():
                ConfigurationService.set_parameter_value(
                    code=param,
                    value=value,
                    societe=session.societe,
                    user=session.utilisateur,
                    reason=f"initial_setup_{session.session_id}"
                )
            
            applied['accounting_config'] = len(config_params)
        
        # Configuration fiscale
        if 'fiscal_config' in data:
            fiscal_data = data['fiscal_config']
            
            config_params = {
                'vat_rate_default': fiscal_data.get('vat_rate', 18.0),
                'fiscal_year_start': fiscal_data.get('fiscal_year_start', '01-01'),
                'auto_tax_calculation': fiscal_data.get('auto_tax_calc', True)
            }
            
            for param, value in config_params.items():
                ConfigurationService.set_parameter_value(
                    code=param,
                    value=value,
                    societe=session.societe,
                    user=session.utilisateur,
                    reason=f"initial_setup_{session.session_id}"
                )
            
            applied['fiscal_config'] = len(config_params)
        
        return applied
    
    @staticmethod
    def _apply_company_setup(session: SetupWizardSession) -> Dict:
        """Applique la configuration spécifique à la société."""
        applied = {}
        data = session.collected_data
        
        # Mise à jour des informations de la société
        societe = session.societe
        
        if 'company_details' in data:
            details = data['company_details']
            
            fields_mapping = {
                'legal_name': 'nom',
                'trade_name': 'nom_commercial',
                'siret': 'siret',
                'industry': 'secteur_activite',
                'website': 'site_web',
                'description': 'description'
            }
            
            updated_fields = []
            for wizard_field, model_field in fields_mapping.items():
                if wizard_field in details and hasattr(societe, model_field):
                    setattr(societe, model_field, details[wizard_field])
                    updated_fields.append(model_field)
            
            societe.save(update_fields=updated_fields)
            applied['company_details'] = len(updated_fields)
        
        # Configuration des préférences
        if 'preferences' in data:
            prefs = data['preferences']
            
            config_params = {
                'default_language': prefs.get('language', 'fr'),
                'default_timezone': prefs.get('timezone', 'Africa/Douala'),
                'company_logo': prefs.get('logo_url', '')
            }
            
            for param, value in config_params.items():
                if value:  # Ne pas définir les valeurs vides
                    ConfigurationService.set_parameter_value(
                        code=param,
                        value=value,
                        societe=session.societe,
                        user=session.utilisateur,
                        reason=f"company_setup_{session.session_id}"
                    )
            
            applied['preferences'] = len([v for v in config_params.values() if v])
        
        return applied
    
    @staticmethod
    def _apply_accounting_setup(session: SetupWizardSession) -> Dict:
        """Applique la configuration comptable."""
        applied = {}
        data = session.collected_data
        
        # Configuration de base
        if 'accounting_basics' in data:
            basics = data['accounting_basics']
            
            config_params = {
                'accounting_standard': basics.get('standard', 'SYSCOHADA'),
                'default_currency': basics.get('currency', 'XOF'),
                'decimal_precision': int(basics.get('precision', 2)),
                'auto_journal_numbering': basics.get('auto_numbering', True)
            }
            
            for param, value in config_params.items():
                ConfigurationService.set_parameter_value(
                    code=param,
                    value=value,
                    societe=session.societe,
                    user=session.utilisateur,
                    reason=f"accounting_setup_{session.session_id}"
                )
            
            applied['accounting_basics'] = len(config_params)
        
        # Configuration des journaux
        if 'journals_config' in data:
            journals = data['journals_config']
            
            # Ici on pourrait créer les journaux personnalisés
            # En fonction de la configuration choisie
            applied['journals_config'] = 'configured'
        
        return applied
    
    @staticmethod
    def _apply_fiscal_setup(session: SetupWizardSession) -> Dict:
        """Applique la configuration fiscale."""
        applied = {}
        data = session.collected_data
        
        if 'fiscal_config' in data:
            fiscal = data['fiscal_config']
            
            config_params = {
                'vat_rate_default': float(fiscal.get('vat_rate', 18.0)),
                'fiscal_year_start': fiscal.get('fiscal_year_start', '01-01'),
                'auto_tax_calculation': fiscal.get('auto_tax_calc', True)
            }
            
            for param, value in config_params.items():
                ConfigurationService.set_parameter_value(
                    code=param,
                    value=value,
                    societe=session.societe,
                    user=session.utilisateur,
                    reason=f"fiscal_setup_{session.session_id}"
                )
            
            applied['fiscal_config'] = len(config_params)
        
        return applied
    
    @staticmethod
    def _apply_banking_setup(session: SetupWizardSession) -> Dict:
        """Applique la configuration bancaire."""
        applied = {}
        data = session.collected_data
        
        if 'banking_config' in data:
            banking = data['banking_config']
            
            config_params = {
                'bank_sync_frequency': int(banking.get('sync_frequency', 5)),
                'auto_bank_reconciliation': banking.get('auto_reconciliation', True),
                'payment_terms_default': int(banking.get('default_payment_terms', 30))
            }
            
            for param, value in config_params.items():
                ConfigurationService.set_parameter_value(
                    code=param,
                    value=value,
                    societe=session.societe,
                    user=session.utilisateur,
                    reason=f"banking_setup_{session.session_id}"
                )
            
            applied['banking_config'] = len(config_params)
        
        # Ici on pourrait aussi créer les comptes bancaires
        # en fonction des données collectées
        
        return applied
    
    @staticmethod
    def _apply_generic_setup(session: SetupWizardSession) -> Dict:
        """Applique une configuration générique."""
        applied = {}
        data = session.collected_data
        
        # Parcourir toutes les données collectées et essayer
        # de les mapper à des paramètres de configuration
        for step_name, step_data in data.items():
            if isinstance(step_data, dict):
                step_applied = 0
                
                for key, value in step_data.items():
                    # Essayer de trouver un paramètre de configuration correspondant
                    success = ConfigurationService.set_parameter_value(
                        code=key,
                        value=value,
                        societe=session.societe,
                        user=session.utilisateur,
                        reason=f"{session.wizard_type}_{session.session_id}"
                    )
                    
                    if success:
                        step_applied += 1
                
                applied[step_name] = step_applied
        
        return applied
    
    @staticmethod
    def get_recommended_templates(societe: Societe) -> List[SetupTemplate]:
        """Récupère les templates recommandés pour une société."""
        try:
            # Récupérer tous les templates actifs
            all_templates = SetupTemplate.objects.filter(active=True)
            
            recommended = []
            for template in all_templates:
                if template.matches_criteria(societe):
                    recommended.append(template)
            
            # Trier par popularité et featured
            recommended.sort(key=lambda t: (t.featured, t.popularity), reverse=True)
            
            return recommended[:5]  # Top 5
            
        except Exception as e:
            logger.error(f"Erreur récupération templates: {str(e)}")
            return []
    
    @staticmethod
    def apply_template(
        template_id: int,
        societe: Societe,
        user: Utilisateur
    ) -> Tuple[bool, Dict]:
        """Applique un template de configuration."""
        try:
            template = SetupTemplate.objects.get(id=template_id, active=True)
            
            # Vérifier la compatibilité
            if not template.matches_criteria(societe):
                return False, {
                    'error': 'Template non compatible avec cette société'
                }
            
            # Appliquer la configuration du template
            applied_count = 0
            errors = []
            
            for param_code, param_value in template.configuration_data.items():
                success = ConfigurationService.set_parameter_value(
                    code=param_code,
                    value=param_value,
                    societe=societe,
                    user=user,
                    reason=f"template_{template.id}"
                )
                
                if success:
                    applied_count += 1
                else:
                    errors.append(f"Erreur application paramètre {param_code}")
            
            # Incrémenter le compteur d'utilisation
            template.increment_usage()
            
            # Analytics
            SetupWizardAnalytics.objects.create(
                event_type='template_applied',
                wizard_type='template_application',
                event_data={
                    'template_id': template.id,
                    'template_name': template.nom,
                    'societe_id': societe.id,
                    'user_id': user.id,
                    'parameters_applied': applied_count,
                    'errors_count': len(errors)
                }
            )
            
            return True, {
                'applied_count': applied_count,
                'errors': errors,
                'template_name': template.nom
            }
            
        except SetupTemplate.DoesNotExist:
            return False, {'error': 'Template non trouvé'}
        except Exception as e:
            logger.error(f"Erreur application template: {str(e)}")
            return False, {'error': str(e)}
    
    @staticmethod
    def cancel_wizard(session_id: str, reason: str = 'user_cancelled') -> bool:
        """Annule une session de wizard."""
        try:
            session = SetupWizardSession.objects.get(session_id=session_id)
            
            if session.status in ['completed', 'failed']:
                return False  # Déjà terminé
            
            session.status = 'cancelled'
            session.errors.append({
                'type': 'cancelled',
                'message': f'Session annulée: {reason}'
            })
            session.save()
            
            # Analytics
            SetupWizardAnalytics.objects.create(
                event_type='session_abandoned',
                wizard_type=session.wizard_type,
                session_id=session_id,
                event_data={'reason': reason}
            )
            
            return True
            
        except SetupWizardSession.DoesNotExist:
            return False