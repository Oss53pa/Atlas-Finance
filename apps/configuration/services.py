from typing import Dict, List, Any, Optional, Union
from django.db import transaction
from django.utils import timezone
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ValidationError
import json
import logging

from .models import (
    ConfigurationCategory,
    ConfigurationParameter, 
    ConfigurationValue,
    ConfigurationTemplate,
    ConfigurationAudit,
    ConfigurationExport,
    ConfigurationImport
)
from apps.core.models import Societe
from apps.security.models import Utilisateur

logger = logging.getLogger(__name__)


class ConfigurationService:
    """Service principal pour la gestion des configurations."""
    
    @staticmethod
    def get_parameter_value(
        code: str,
        societe: Societe = None,
        content_object: Any = None,
        default: Any = None
    ) -> Any:
        """Récupère la valeur d'un paramètre de configuration."""
        try:
            parameter = ConfigurationParameter.objects.get(code=code, active=True)
            
            # Construire la requête selon le scope
            query_filters = {'parameter': parameter}
            
            if parameter.scope == 'societe' and societe:
                query_filters['societe'] = societe
            elif parameter.scope == 'utilisateur' and content_object:
                content_type = ContentType.objects.get_for_model(content_object)
                query_filters.update({
                    'content_type': content_type,
                    'object_id': content_object.id
                })
            elif parameter.scope == 'module' and content_object:
                content_type = ContentType.objects.get_for_model(content_object)
                query_filters.update({
                    'content_type': content_type,
                    'object_id': content_object.id
                })
            
            # Rechercher la valeur
            config_value = ConfigurationValue.objects.filter(**query_filters).first()
            
            if config_value:
                return config_value.get_typed_value()
            
            # Valeur par défaut du paramètre
            if parameter.valeur_defaut:
                return parameter.get_default_value()
            
            # Valeur par défaut fournie
            if default is not None:
                return default
            
            # Valeur par défaut du type
            return parameter._get_type_default()
            
        except ConfigurationParameter.DoesNotExist:
            logger.warning(f"Paramètre de configuration non trouvé: {code}")
            return default
        except Exception as e:
            logger.error(f"Erreur récupération paramètre {code}: {str(e)}")
            return default
    
    @staticmethod
    def set_parameter_value(
        code: str,
        value: Any,
        societe: Societe = None,
        content_object: Any = None,
        user: Utilisateur = None,
        reason: str = "manual"
    ) -> bool:
        """Définit la valeur d'un paramètre de configuration."""
        try:
            parameter = ConfigurationParameter.objects.get(code=code, active=True)
            
            # Vérifier si le paramètre est modifiable
            if not parameter.modifiable:
                raise ValidationError(f"Le paramètre {code} n'est pas modifiable")
            
            # Valider la valeur
            errors = parameter.validate_value(value)
            if errors:
                raise ValidationError(f"Valeur invalide pour {code}: {', '.join(errors)}")
            
            # Préparer les filtres selon le scope
            query_filters = {'parameter': parameter}
            
            if parameter.scope == 'societe' and societe:
                query_filters['societe'] = societe
            elif parameter.scope in ['utilisateur', 'module'] and content_object:
                content_type = ContentType.objects.get_for_model(content_object)
                query_filters.update({
                    'content_type': content_type,
                    'object_id': content_object.id
                })
            
            # Récupérer l'ancienne valeur pour l'audit
            old_config_value = ConfigurationValue.objects.filter(**query_filters).first()
            old_value = old_config_value.valeur if old_config_value else ""
            
            # Créer ou mettre à jour la valeur
            with transaction.atomic():
                config_value, created = ConfigurationValue.objects.update_or_create(
                    **query_filters,
                    defaults={
                        'valeur': str(value),
                        'modifie_par': user
                    }
                )
                
                # Créer l'audit
                ConfigurationAudit.objects.create(
                    parameter=parameter,
                    societe=societe,
                    content_type=query_filters.get('content_type'),
                    object_id=query_filters.get('object_id'),
                    ancienne_valeur=old_value,
                    nouvelle_valeur=str(value),
                    modifie_par=user,
                    raison=reason
                )
            
            logger.info(f"Paramètre {code} mis à jour: {old_value} -> {value}")
            return True
            
        except ConfigurationParameter.DoesNotExist:
            logger.error(f"Paramètre de configuration non trouvé: {code}")
            return False
        except ValidationError as e:
            logger.error(f"Erreur validation paramètre {code}: {str(e)}")
            return False
        except Exception as e:
            logger.error(f"Erreur mise à jour paramètre {code}: {str(e)}")
            return False
    
    @staticmethod
    def get_all_parameters(
        societe: Societe = None,
        category: str = None,
        visible_only: bool = True
    ) -> Dict[str, Dict]:
        """Récupère tous les paramètres de configuration pour une société."""
        try:
            # Construire la requête
            query = ConfigurationParameter.objects.filter(active=True)
            
            if visible_only:
                query = query.filter(visible=True)
            
            if category:
                query = query.filter(category__code=category)
            
            query = query.select_related('category').order_by('category__ordre', 'ordre')
            
            result = {}
            
            for parameter in query:
                # Récupérer la valeur
                current_value = ConfigurationService.get_parameter_value(
                    parameter.code,
                    societe=societe
                )
                
                # Construire les infos du paramètre
                param_info = {
                    'nom': parameter.nom,
                    'description': parameter.description,
                    'type': parameter.type_parametre,
                    'scope': parameter.scope,
                    'valeur_courante': current_value,
                    'valeur_defaut': parameter.get_default_value(),
                    'obligatoire': parameter.obligatoire,
                    'modifiable': parameter.modifiable,
                    'contraintes': parameter.contraintes,
                    'valeurs_possibles': parameter.valeurs_possibles,
                    'aide': parameter.aide,
                    'exemples': parameter.exemples,
                    'category': {
                        'code': parameter.category.code,
                        'nom': parameter.category.nom,
                        'icone': parameter.category.icone
                    }
                }
                
                result[parameter.code] = param_info
            
            return result
            
        except Exception as e:
            logger.error(f"Erreur récupération paramètres: {str(e)}")
            return {}
    
    @staticmethod
    def bulk_update_parameters(
        parameters: Dict[str, Any],
        societe: Societe = None,
        user: Utilisateur = None,
        validate_all: bool = True
    ) -> Dict[str, Any]:
        """Mise à jour en lot des paramètres."""
        try:
            results = {
                'success': 0,
                'errors': 0,
                'details': {}
            }
            
            # Validation préalable si demandée
            if validate_all:
                validation_errors = {}
                for code, value in parameters.items():
                    try:
                        parameter = ConfigurationParameter.objects.get(code=code, active=True)
                        errors = parameter.validate_value(value)
                        if errors:
                            validation_errors[code] = errors
                    except ConfigurationParameter.DoesNotExist:
                        validation_errors[code] = ["Paramètre non trouvé"]
                
                if validation_errors:
                    return {
                        'success': 0,
                        'errors': len(validation_errors),
                        'details': validation_errors
                    }
            
            # Mise à jour en transaction
            with transaction.atomic():
                for code, value in parameters.items():
                    success = ConfigurationService.set_parameter_value(
                        code=code,
                        value=value,
                        societe=societe,
                        user=user,
                        reason="bulk_update"
                    )
                    
                    if success:
                        results['success'] += 1
                        results['details'][code] = "Mis à jour"
                    else:
                        results['errors'] += 1
                        results['details'][code] = "Erreur"
            
            return results
            
        except Exception as e:
            logger.error(f"Erreur mise à jour en lot: {str(e)}")
            return {
                'success': 0,
                'errors': len(parameters),
                'details': {'error': str(e)}
            }
    
    @staticmethod
    def apply_template(
        template_id: int,
        societe: Societe,
        overwrite: bool = False,
        user: Utilisateur = None
    ) -> Dict[str, Any]:
        """Applique un template de configuration."""
        try:
            template = ConfigurationTemplate.objects.get(id=template_id, active=True)
            
            # Vérifier les critères
            if not template.matches_criteria(societe):
                return {
                    'success': False,
                    'error': 'Ce template ne correspond pas aux critères de la société'
                }
            
            # Appliquer le template
            applied_count = 0
            errors = {}
            
            with transaction.atomic():
                for code_param, valeur in template.configuration_data.items():
                    success = ConfigurationService.set_parameter_value(
                        code=code_param,
                        value=valeur,
                        societe=societe,
                        user=user,
                        reason=f"template_{template.id}"
                    )
                    
                    if success:
                        applied_count += 1
                    else:
                        errors[code_param] = "Erreur application"
            
            return {
                'success': True,
                'applied_count': applied_count,
                'errors': errors,
                'template_name': template.nom
            }
            
        except ConfigurationTemplate.DoesNotExist:
            return {
                'success': False,
                'error': 'Template non trouvé'
            }
        except Exception as e:
            logger.error(f"Erreur application template: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    @staticmethod
    def export_configuration(
        societe: Societe,
        categories: List[str] = None,
        parameters: List[str] = None,
        user: Utilisateur = None
    ) -> Optional[ConfigurationExport]:
        """Exporte la configuration d'une société."""
        try:
            # Construire la requête
            query = ConfigurationParameter.objects.filter(active=True)
            
            if categories:
                query = query.filter(category__code__in=categories)
            
            if parameters:
                query = query.filter(code__in=parameters)
            
            # Récupérer les valeurs
            config_data = {}
            
            for parameter in query:
                value = ConfigurationService.get_parameter_value(
                    parameter.code,
                    societe=societe
                )
                config_data[parameter.code] = {
                    'value': value,
                    'type': parameter.type_parametre,
                    'category': parameter.category.code,
                    'nom': parameter.nom,
                    'description': parameter.description
                }
            
            # Créer l'export
            export = ConfigurationExport.objects.create(
                nom=f"Export {societe.nom} - {timezone.now().strftime('%Y-%m-%d %H:%M')}",
                societe=societe,
                configuration_data=config_data,
                exporte_par=user
            )
            
            # Ajouter les relations
            if categories:
                category_objects = ConfigurationCategory.objects.filter(code__in=categories)
                export.categories.set(category_objects)
            
            if parameters:
                parameter_objects = ConfigurationParameter.objects.filter(code__in=parameters)
                export.parameters.set(parameter_objects)
            
            return export
            
        except Exception as e:
            logger.error(f"Erreur export configuration: {str(e)}")
            return None
    
    @staticmethod
    def import_configuration(
        societe: Societe,
        source_export: ConfigurationExport = None,
        source_template: ConfigurationTemplate = None,
        overwrite: bool = False,
        user: Utilisateur = None
    ) -> ConfigurationImport:
        """Importe une configuration."""
        try:
            # Créer l'import
            import_obj = ConfigurationImport.objects.create(
                nom=f"Import {societe.nom} - {timezone.now().strftime('%Y-%m-%d %H:%M')}",
                societe=societe,
                source_export=source_export,
                source_template=source_template,
                overwrite_existing=overwrite,
                importe_par=user,
                status='processing'
            )
            
            # Déterminer les données à importer
            if source_export:
                config_data = source_export.configuration_data
            elif source_template:
                config_data = {
                    code: {'value': value, 'type': 'auto'}
                    for code, value in source_template.configuration_data.items()
                }
            else:
                import_obj.status = 'failed'
                import_obj.errors = ['Aucune source spécifiée']
                import_obj.save()
                return import_obj
            
            # Importer les paramètres
            imported_count = 0
            failed_count = 0
            errors = []
            
            for code_param, param_data in config_data.items():
                try:
                    value = param_data.get('value') if isinstance(param_data, dict) else param_data
                    
                    success = ConfigurationService.set_parameter_value(
                        code=code_param,
                        value=value,
                        societe=societe,
                        user=user,
                        reason=f"import_{import_obj.id}"
                    )
                    
                    if success:
                        imported_count += 1
                    else:
                        failed_count += 1
                        errors.append(f"{code_param}: Erreur importation")
                        
                except Exception as e:
                    failed_count += 1
                    errors.append(f"{code_param}: {str(e)}")
            
            # Mettre à jour l'import
            import_obj.parameters_imported = imported_count
            import_obj.parameters_failed = failed_count
            import_obj.errors = errors
            import_obj.status = 'completed' if failed_count == 0 else 'failed'
            import_obj.save()
            
            return import_obj
            
        except Exception as e:
            logger.error(f"Erreur import configuration: {str(e)}")
            
            # Mettre à jour l'import en cas d'erreur
            if 'import_obj' in locals():
                import_obj.status = 'failed'
                import_obj.errors = [str(e)]
                import_obj.save()
                return import_obj
            
            return None
    
    @staticmethod
    def get_configuration_history(
        parameter_code: str,
        societe: Societe = None,
        limit: int = 50
    ) -> List[Dict]:
        """Récupère l'historique des modifications d'un paramètre."""
        try:
            parameter = ConfigurationParameter.objects.get(code=parameter_code, active=True)
            
            query = ConfigurationAudit.objects.filter(parameter=parameter)
            
            if societe:
                query = query.filter(societe=societe)
            
            audit_logs = query.order_by('-date_modification')[:limit]
            
            history = []
            for log in audit_logs:
                history.append({
                    'date': log.date_modification,
                    'ancienne_valeur': log.ancienne_valeur,
                    'nouvelle_valeur': log.nouvelle_valeur,
                    'modifie_par': log.modifie_par.get_full_name() if log.modifie_par else 'Système',
                    'raison': log.raison,
                    'adresse_ip': log.adresse_ip
                })
            
            return history
            
        except ConfigurationParameter.DoesNotExist:
            return []
        except Exception as e:
            logger.error(f"Erreur historique configuration: {str(e)}")
            return []
    
    @staticmethod
    def reset_parameter(
        code: str,
        societe: Societe = None,
        user: Utilisateur = None
    ) -> bool:
        """Remet un paramètre à sa valeur par défaut."""
        try:
            parameter = ConfigurationParameter.objects.get(code=code, active=True)
            default_value = parameter.get_default_value()
            
            return ConfigurationService.set_parameter_value(
                code=code,
                value=default_value,
                societe=societe,
                user=user,
                reason="reset"
            )
            
        except Exception as e:
            logger.error(f"Erreur reset paramètre {code}: {str(e)}")
            return False
    
    @staticmethod
    def validate_configuration(societe: Societe) -> Dict[str, Any]:
        """Valide la configuration complète d'une société."""
        try:
            validation_results = {
                'valid': True,
                'warnings': [],
                'errors': [],
                'missing_required': []
            }
            
            # Récupérer tous les paramètres obligatoires
            required_parameters = ConfigurationParameter.objects.filter(
                active=True,
                obligatoire=True
            )
            
            for parameter in required_parameters:
                value = ConfigurationService.get_parameter_value(
                    parameter.code,
                    societe=societe
                )
                
                # Vérifier si le paramètre obligatoire est défini
                if value is None or value == '':
                    validation_results['missing_required'].append({
                        'code': parameter.code,
                        'nom': parameter.nom,
                        'category': parameter.category.nom
                    })
                    validation_results['valid'] = False
                else:
                    # Valider la valeur
                    errors = parameter.validate_value(value)
                    if errors:
                        validation_results['errors'].append({
                            'code': parameter.code,
                            'nom': parameter.nom,
                            'errors': errors
                        })
                        validation_results['valid'] = False
            
            return validation_results
            
        except Exception as e:
            logger.error(f"Erreur validation configuration: {str(e)}")
            return {
                'valid': False,
                'errors': [str(e)],
                'warnings': [],
                'missing_required': []
            }