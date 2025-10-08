"""
Service de gestion des paramètres WiseBook ERP V3.0
"""
from typing import Any, Dict, List, Optional
from django.core.cache import cache
from django.db import transaction
from ..models import ParametreSysteme, ConfigurationSociete, JournalParametres


class ParametersService:
    """Service principal pour la gestion des paramètres système"""
    
    CACHE_PREFIX = "wb_param_"
    CACHE_TIMEOUT = 3600  # 1 heure
    
    @classmethod
    def get_parametre(cls, cle: str, defaut: Any = None) -> Any:
        """Récupère un paramètre système avec mise en cache"""
        cache_key = f"{cls.CACHE_PREFIX}{cle}"
        valeur = cache.get(cache_key)
        
        if valeur is None:
            try:
                param = ParametreSysteme.objects.get(cle=cle)
                valeur = param.get_valeur_typee()
                cache.set(cache_key, valeur, cls.CACHE_TIMEOUT)
            except ParametreSysteme.DoesNotExist:
                valeur = defaut
        
        return valeur
    
    @classmethod
    def set_parametre(cls, cle: str, valeur: Any) -> bool:
        """Définit un paramètre système"""
        try:
            with transaction.atomic():
                param, created = ParametreSysteme.objects.get_or_create(
                    cle=cle,
                    defaults={'valeur': str(valeur), 'nom': cle}
                )
                
                if not created:
                    param.valeur = str(valeur)
                    param.save()
                
                # Invalider le cache
                cache_key = f"{cls.CACHE_PREFIX}{cle}"
                cache.delete(cache_key)
                
                return True
        except Exception:
            return False
    
    @classmethod
    def get_parametres_categorie(cls, categorie: str) -> Dict[str, Any]:
        """Récupère tous les paramètres d'une catégorie"""
        parametres = ParametreSysteme.objects.filter(
            categorie=categorie,
            visible_interface=True
        ).order_by('groupe', 'ordre', 'nom')
        
        result = {}
        for param in parametres:
            result[param.cle] = {
                'valeur': param.get_valeur_typee(),
                'nom': param.nom,
                'description': param.description,
                'type': param.type_valeur,
                'requis': param.requis,
                'modifiable': param.modifiable_runtime,
                'groupe': param.groupe,
                'aide': param.aide
            }
        
        return result
    
    @classmethod
    def initialiser_parametres_defaut(cls) -> None:
        """Initialise les paramètres par défaut du système"""
        parametres_defaut = [
            # Paramètres généraux
            {
                'cle': 'SOCIETE_NOM',
                'nom': 'Nom de la société',
                'description': 'Nom de la société principal',
                'categorie': 'GENERAL',
                'type_valeur': 'STRING',
                'valeur': 'WiseBook ERP',
                'requis': True,
                'groupe': 'Informations générales'
            },
            {
                'cle': 'SYSTEME_VERSION',
                'nom': 'Version du système',
                'description': 'Version actuelle de WiseBook',
                'categorie': 'GENERAL',
                'type_valeur': 'STRING',
                'valeur': '3.0.0',
                'requis': True,
                'modifiable_runtime': False,
                'groupe': 'Système'
            },
            
            # Paramètres comptables
            {
                'cle': 'COMPTABILITE_DECIMALES',
                'nom': 'Nombre de décimales',
                'description': 'Nombre de décimales pour les montants',
                'categorie': 'COMPTABILITE',
                'type_valeur': 'INTEGER',
                'valeur': '2',
                'valeur_min': 0,
                'valeur_max': 6,
                'requis': True,
                'groupe': 'Affichage'
            },
            {
                'cle': 'COMPTABILITE_DEVISE_DEFAUT',
                'nom': 'Devise par défaut',
                'description': 'Code de la devise par défaut',
                'categorie': 'COMPTABILITE',
                'type_valeur': 'STRING',
                'valeur': 'XAF',
                'requis': True,
                'groupe': 'Configuration'
            },
            
            # Paramètres de sécurité
            {
                'cle': 'SECURITE_SESSION_DUREE',
                'nom': 'Durée des sessions',
                'description': 'Durée d\'inactivité avant déconnexion (minutes)',
                'categorie': 'SECURITE',
                'type_valeur': 'INTEGER',
                'valeur': '60',
                'valeur_min': 5,
                'valeur_max': 480,
                'requis': True,
                'groupe': 'Sessions'
            },
            {
                'cle': 'SECURITE_TENTATIVES_MAX',
                'nom': 'Tentatives de connexion max',
                'description': 'Nombre maximum de tentatives avant blocage',
                'categorie': 'SECURITE',
                'type_valeur': 'INTEGER',
                'valeur': '5',
                'valeur_min': 3,
                'valeur_max': 10,
                'requis': True,
                'groupe': 'Authentification'
            },
            
            # Paramètres d'interface
            {
                'cle': 'INTERFACE_THEME',
                'nom': 'Thème par défaut',
                'description': 'Thème d\'interface par défaut',
                'categorie': 'INTERFACE',
                'type_valeur': 'STRING',
                'valeur': 'TRINITY_LIGHT',
                'valeurs_autorisees': ['TRINITY_LIGHT', 'TRINITY_DARK', 'CLASSIC'],
                'requis': True,
                'groupe': 'Apparence'
            },
            {
                'cle': 'INTERFACE_LANGUE',
                'nom': 'Langue par défaut',
                'description': 'Langue d\'interface par défaut',
                'categorie': 'INTERFACE',
                'type_valeur': 'STRING',
                'valeur': 'fr',
                'valeurs_autorisees': ['fr', 'en', 'es'],
                'requis': True,
                'groupe': 'Localisation'
            },
            
            # Paramètres de notification
            {
                'cle': 'NOTIFICATIONS_EMAIL_ACTIVES',
                'nom': 'Notifications email',
                'description': 'Activer les notifications par email',
                'categorie': 'NOTIFICATIONS',
                'type_valeur': 'BOOLEAN',
                'valeur': 'true',
                'requis': False,
                'groupe': 'Email'
            },
        ]
        
        for param_data in parametres_defaut:
            ParametreSysteme.objects.get_or_create(
                cle=param_data['cle'],
                defaults=param_data
            )


class ConfigurationService:
    """Service de gestion des configurations par société"""
    
    @classmethod
    def get_configuration_societe(cls, societe_id: int) -> Optional[ConfigurationSociete]:
        """Récupère la configuration d'une société"""
        try:
            return ConfigurationSociete.objects.get(societe_id=societe_id)
        except ConfigurationSociete.DoesNotExist:
            return None
    
    @classmethod
    def initialiser_configuration_defaut(cls, societe_id: int) -> ConfigurationSociete:
        """Initialise une configuration par défaut pour une société"""
        from apps.core.models import Company, Devise
        
        try:
            societe = Company.objects.get(id=societe_id)
            devise_xaf = Devise.objects.get_or_create(
                code='XAF',
                defaults={
                    'libelle': 'Franc CFA BEAC',
                    'symbole': 'FCFA',
                    'decimales': 2
                }
            )[0]
            
            config, created = ConfigurationSociete.objects.get_or_create(
                societe=societe,
                defaults={
                    'devise_principale': devise_xaf,
                    'plan_comptable_type': 'SYSCOHADA_NORMAL',
                    'regime_fiscal': 'REEL',
                    'theme': 'TRINITY_LIGHT',
                    'langue_defaut': 'fr'
                }
            )
            
            return config
        except Exception as e:
            raise Exception(f"Erreur lors de l'initialisation de la configuration: {e}")
    
    @classmethod
    def sauvegarder_configuration(cls, societe_id: int, donnees: Dict[str, Any]) -> bool:
        """Sauvegarde la configuration d'une société"""
        try:
            with transaction.atomic():
                config = cls.get_configuration_societe(societe_id)
                if not config:
                    config = cls.initialiser_configuration_defaut(societe_id)
                
                # Mettre à jour les champs
                for champ, valeur in donnees.items():
                    if hasattr(config, champ):
                        setattr(config, champ, valeur)
                
                config.save()
                return True
        except Exception:
            return False


class JournalService:
    """Service de gestion des paramètres des journaux"""
    
    @classmethod
    def get_journaux_societe(cls, societe_id: int) -> List[JournalParametres]:
        """Récupère tous les journaux d'une société"""
        return JournalParametres.objects.filter(societe_id=societe_id).order_by('code')
    
    @classmethod
    def initialiser_journaux_defaut(cls, societe_id: int) -> None:
        """Initialise les journaux par défaut pour une société"""
        journaux_defaut = [
            {
                'code': 'VE',
                'libelle': 'Journal des Ventes',
                'type_journal': 'VENTES',
                'prefixe': 'VE',
                'numerotation_auto': True
            },
            {
                'code': 'AC',
                'libelle': 'Journal des Achats',
                'type_journal': 'ACHATS',
                'prefixe': 'AC',
                'numerotation_auto': True
            },
            {
                'code': 'BQ',
                'libelle': 'Journal de Banque',
                'type_journal': 'BANQUE',
                'prefixe': 'BQ',
                'numerotation_auto': True
            },
            {
                'code': 'CA',
                'libelle': 'Journal de Caisse',
                'type_journal': 'CAISSE',
                'prefixe': 'CA',
                'numerotation_auto': True
            },
            {
                'code': 'OD',
                'libelle': 'Journal des Opérations Diverses',
                'type_journal': 'OPERATIONS_DIVERSES',
                'prefixe': 'OD',
                'numerotation_auto': True
            },
        ]
        
        from apps.core.models import Company
        societe = Company.objects.get(id=societe_id)
        
        for journal_data in journaux_defaut:
            JournalParametres.objects.get_or_create(
                societe=societe,
                code=journal_data['code'],
                defaults=journal_data
            )