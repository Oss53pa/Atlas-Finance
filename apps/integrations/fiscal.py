import requests
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from decimal import Decimal
import logging
import json
from dataclasses import dataclass

from django.conf import settings
from django.utils import timezone
from django.core.cache import cache

from apps.taxation.models import DeclarationFiscale
from apps.core.models import Societe

logger = logging.getLogger(__name__)


@dataclass
class FiscalDeclaration:
    """Représentation d'une déclaration fiscale."""
    type_declaration: str
    periode: str
    montant_du: Decimal
    date_limite: datetime
    statut: str
    reference: Optional[str] = None
    metadonnees: Optional[Dict] = None


class BaseFiscalConnector:
    """Connecteur fiscal de base."""
    
    def __init__(self, societe: Societe):
        self.societe = societe
        self.config = societe.configuration_fiscale or {}
        
    def authenticate(self) -> bool:
        """Authentification auprès de l'administration fiscale."""
        raise NotImplementedError
    
    def submit_declaration(self, declaration: DeclarationFiscale) -> Dict:
        """Soumettre une déclaration fiscale."""
        raise NotImplementedError
    
    def get_declaration_status(self, reference: str) -> Dict:
        """Récupérer le statut d'une déclaration."""
        raise NotImplementedError
    
    def get_tax_calendar(self, annee: int) -> List[Dict]:
        """Récupérer le calendrier fiscal."""
        raise NotImplementedError


class OHADAFiscalConnector(BaseFiscalConnector):
    """Connecteur pour les administrations fiscales OHADA."""
    
    COUNTRY_APIS = {
        'CI': {  # Côte d'Ivoire
            'name': 'DGI Côte d\'Ivoire',
            'base_url': 'https://edeclaration.dgi.gouv.ci/api',
            'tax_codes': {
                'TVA': 'TVA_MENSUELLE',
                'IS': 'IMPOT_SOCIETES',
                'CNI': 'CONTRIBUTION_NATIONALE',
            }
        },
        'SN': {  # Sénégal
            'name': 'DGI Sénégal',
            'base_url': 'https://sigtas.dgimpots.sn/api',
            'tax_codes': {
                'TVA': 'TVA_MENSUELLE',
                'IS': 'IMPOT_SOCIETES',
            }
        },
        'ML': {  # Mali
            'name': 'DGI Mali',
            'base_url': 'https://mali.dgi.gouv.ml/api',
            'tax_codes': {
                'TVA': 'TVA_MENSUELLE',
                'IS': 'IMPOT_SOCIETES',
            }
        },
        'BF': {  # Burkina Faso
            'name': 'DGI Burkina Faso',
            'base_url': 'https://e-impots.bf/api',
            'tax_codes': {
                'TVA': 'TVA_MENSUELLE',
                'IS': 'IMPOT_SOCIETES',
            }
        },
        'CM': {  # Cameroun
            'name': 'DGI Cameroun',
            'base_url': 'https://impots.cm/api',
            'tax_codes': {
                'TVA': 'TVA_MENSUELLE',
                'IS': 'IMPOT_SOCIETES',
            }
        },
    }
    
    def __init__(self, societe: Societe):
        super().__init__(societe)
        self.country_code = societe.pays
        self.api_config = self.COUNTRY_APIS.get(self.country_code, {})
        self.base_url = self.api_config.get('base_url')
        self.nif = societe.numero_fiscal  # Numéro d'Identification Fiscale
        self.access_token = None
    
    def authenticate(self) -> bool:
        """Authentification auprès de la DGI OHADA."""
        try:
            if not self.base_url:
                logger.error(f"API fiscale non configurée pour le pays: {self.country_code}")
                return False
            
            auth_url = f"{self.base_url}/auth/login"
            
            headers = {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'WiseBook/3.0'
            }
            
            # Utiliser les identifiants de la société
            credentials = {
                'nif': self.nif,
                'password': self.config.get('password_fiscal'),
                'type_declarant': 'ENTREPRISE'
            }
            
            response = requests.post(
                auth_url,
                headers=headers,
                json=credentials,
                timeout=30
            )
            
            if response.status_code == 200:
                auth_data = response.json()
                self.access_token = auth_data.get('access_token')
                
                # Cache du token
                cache_key = f"fiscal_token_{self.societe.id}_{self.country_code}"
                cache.set(cache_key, self.access_token, auth_data.get('expires_in', 3600))
                
                logger.info(f"Authentification fiscale réussie pour {self.societe.nom}")
                return True
            else:
                logger.error(f"Erreur authentification fiscale: {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Erreur authentification fiscale: {str(e)}")
            return False
    
    def submit_declaration(self, declaration: DeclarationFiscale) -> Dict:
        """Soumettre une déclaration fiscale OHADA."""
        if not self.access_token:
            if not self.authenticate():
                raise Exception("Authentification fiscale échouée")
        
        try:
            declaration_url = f"{self.base_url}/declarations"
            
            headers = {
                'Authorization': f'Bearer {self.access_token}',
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
            
            # Préparer les données de la déclaration
            declaration_data = self._prepare_declaration_data(declaration)
            
            response = requests.post(
                declaration_url,
                headers=headers,
                json=declaration_data,
                timeout=60
            )
            
            if response.status_code in [200, 201, 202]:
                result = response.json()
                
                # Mettre à jour la déclaration avec la référence
                declaration.reference_externe = result.get('numero_depot')
                declaration.statut = 'deposee'
                declaration.date_depot = timezone.now()
                declaration.save()
                
                return {
                    'success': True,
                    'reference': result.get('numero_depot'),
                    'statut': result.get('statut'),
                    'message': result.get('message', 'Déclaration déposée avec succès')
                }
            else:
                logger.error(f"Erreur dépôt déclaration: {response.text}")
                return {
                    'success': False,
                    'error': response.json().get('message', 'Erreur inconnue')
                }
                
        except Exception as e:
            logger.error(f"Erreur dépôt déclaration fiscale: {str(e)}")
            raise
    
    def get_declaration_status(self, reference: str) -> Dict:
        """Récupérer le statut d'une déclaration OHADA."""
        if not self.access_token:
            if not self.authenticate():
                raise Exception("Authentification fiscale échouée")
        
        try:
            status_url = f"{self.base_url}/declarations/{reference}/status"
            
            headers = {
                'Authorization': f'Bearer {self.access_token}',
                'Accept': 'application/json'
            }
            
            response = requests.get(status_url, headers=headers, timeout=30)
            
            if response.status_code == 200:
                status_data = response.json()
                return {
                    'success': True,
                    'statut': status_data.get('statut'),
                    'date_traitement': status_data.get('date_traitement'),
                    'observations': status_data.get('observations', []),
                    'montant_paye': status_data.get('montant_paye'),
                    'solde_restant': status_data.get('solde_restant')
                }
            
            return {'success': False, 'error': 'Référence non trouvée'}
            
        except Exception as e:
            logger.error(f"Erreur statut déclaration: {str(e)}")
            raise
    
    def get_tax_calendar(self, annee: int) -> List[Dict]:
        """Récupérer le calendrier fiscal OHADA."""
        if not self.access_token:
            if not self.authenticate():
                raise Exception("Authentification fiscale échouée")
        
        try:
            calendar_url = f"{self.base_url}/calendrier/{annee}"
            
            headers = {
                'Authorization': f'Bearer {self.access_token}',
                'Accept': 'application/json'
            }
            
            response = requests.get(calendar_url, headers=headers, timeout=30)
            
            if response.status_code == 200:
                calendar_data = response.json()
                
                obligations = []
                for item in calendar_data.get('obligations', []):
                    obligations.append({
                        'type_declaration': item.get('type_declaration'),
                        'libelle': item.get('libelle'),
                        'periodicite': item.get('periodicite'),
                        'date_limite': datetime.fromisoformat(item.get('date_limite')),
                        'penalites': item.get('penalites', {}),
                        'obligatoire': item.get('obligatoire', True)
                    })
                
                return obligations
            
            return []
            
        except Exception as e:
            logger.error(f"Erreur calendrier fiscal: {str(e)}")
            return []
    
    def _prepare_declaration_data(self, declaration: DeclarationFiscale) -> Dict:
        """Préparer les données de déclaration au format OHADA."""
        data = {
            'nif': self.nif,
            'type_declaration': self._map_declaration_type(declaration.type_declaration),
            'periode': {
                'annee': declaration.periode_debut.year,
                'mois': declaration.periode_debut.month if declaration.type_declaration == 'TVA' else None,
                'trimestre': self._get_trimestre(declaration.periode_debut) if 'TRIMESTRE' in declaration.type_declaration else None
            },
            'donnees_declaration': declaration.donnees_declaration,
            'montant_du': str(declaration.montant_du),
            'devise': declaration.societe.devise_principale.code,
            'date_declaration': declaration.date_declaration.isoformat(),
            'declarant': {
                'nom': declaration.cree_par.nom,
                'prenom': declaration.cree_par.prenom,
                'fonction': declaration.cree_par.profil
            }
        }
        
        # Ajouter les détails spécifiques selon le type
        if declaration.type_declaration == 'TVA':
            data['details_tva'] = self._prepare_tva_details(declaration)
        elif declaration.type_declaration == 'IS':
            data['details_is'] = self._prepare_is_details(declaration)
        
        return data
    
    def _prepare_tva_details(self, declaration: DeclarationFiscale) -> Dict:
        """Préparer les détails TVA."""
        donnees = declaration.donnees_declaration
        
        return {
            'chiffre_affaires_ht': donnees.get('ca_ht', 0),
            'tva_collectee': donnees.get('tva_collectee', 0),
            'tva_deductible': donnees.get('tva_deductible', 0),
            'tva_due': donnees.get('tva_due', 0),
            'credit_precedent': donnees.get('credit_precedent', 0),
            'ventilation_par_taux': donnees.get('ventilation_taux', [])
        }
    
    def _prepare_is_details(self, declaration: DeclarationFiscale) -> Dict:
        """Préparer les détails Impôt sur les Sociétés."""
        donnees = declaration.donnees_declaration
        
        return {
            'resultat_comptable': donnees.get('resultat_comptable', 0),
            'resultat_fiscal': donnees.get('resultat_fiscal', 0),
            'impot_du': donnees.get('impot_du', 0),
            'acomptes_verses': donnees.get('acomptes_verses', 0),
            'solde_a_payer': donnees.get('solde_a_payer', 0)
        }
    
    def _map_declaration_type(self, type_wb: str) -> str:
        """Mapper le type WiseBook vers le code OHADA."""
        mapping = {
            'TVA': 'TVA_MENSUELLE',
            'IS': 'IMPOT_SOCIETES',
            'CNI': 'CONTRIBUTION_NATIONALE',
            'PATENTE': 'PATENTE',
            'FOPROLOS': 'FOPROLOS'
        }
        return mapping.get(type_wb, type_wb)
    
    def _get_trimestre(self, date: datetime) -> int:
        """Obtenir le numéro de trimestre."""
        return (date.month - 1) // 3 + 1


class CEDEAOFiscalConnector(BaseFiscalConnector):
    """Connecteur pour les échanges fiscaux CEDEAO."""
    
    def __init__(self, societe: Societe):
        super().__init__(societe)
        self.base_url = 'https://fiscalite.cedeao.int/api'
        self.api_key = self.config.get('cedeao_api_key')
    
    def get_exchange_rates(self) -> Dict[str, Decimal]:
        """Récupérer les taux de change officiels CEDEAO."""
        try:
            rates_url = f"{self.base_url}/taux-change/officiel"
            
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Accept': 'application/json'
            }
            
            response = requests.get(rates_url, headers=headers, timeout=30)
            
            if response.status_code == 200:
                rates_data = response.json()
                
                rates = {}
                for rate in rates_data.get('taux', []):
                    rates[rate['devise']] = Decimal(rate['taux'])
                
                return rates
            
            return {}
            
        except Exception as e:
            logger.error(f"Erreur taux de change CEDEAO: {str(e)}")
            return {}
    
    def get_fiscal_conventions(self) -> List[Dict]:
        """Récupérer les conventions fiscales CEDEAO."""
        try:
            conventions_url = f"{self.base_url}/conventions-fiscales"
            
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Accept': 'application/json'
            }
            
            response = requests.get(conventions_url, headers=headers, timeout=30)
            
            if response.status_code == 200:
                return response.json().get('conventions', [])
            
            return []
            
        except Exception as e:
            logger.error(f"Erreur conventions fiscales: {str(e)}")
            return []


class FiscalService:
    """Service principal pour la gestion fiscale."""
    
    @staticmethod
    def get_connector(societe: Societe, connector_type: str = 'ohada') -> BaseFiscalConnector:
        """Factory pour créer le bon connecteur fiscal."""
        if connector_type == 'ohada':
            return OHADAFiscalConnector(societe)
        elif connector_type == 'cedeao':
            return CEDEAOFiscalConnector(societe)
        else:
            raise ValueError(f"Type de connecteur fiscal non supporté: {connector_type}")
    
    @staticmethod
    def submit_declaration(declaration: DeclarationFiscale) -> Dict[str, Any]:
        """Soumettre une déclaration fiscale."""
        try:
            connector = FiscalService.get_connector(declaration.societe)
            
            # Valider la déclaration avant soumission
            validation_result = FiscalService.validate_declaration(declaration)
            if not validation_result['valid']:
                return {
                    'success': False,
                    'error': 'Déclaration invalide',
                    'details': validation_result['errors']
                }
            
            # Soumettre la déclaration
            result = connector.submit_declaration(declaration)
            
            # Enregistrer l'historique
            if result.get('success'):
                declaration.historique.append({
                    'action': 'depot',
                    'date': timezone.now().isoformat(),
                    'utilisateur': declaration.cree_par.email,
                    'reference': result.get('reference'),
                    'statut': result.get('statut')
                })
                declaration.save()
            
            return result
            
        except Exception as e:
            logger.error(f"Erreur soumission déclaration: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    @staticmethod
    def validate_declaration(declaration: DeclarationFiscale) -> Dict[str, Any]:
        """Valider une déclaration fiscale."""
        errors = []
        
        # Validation de base
        if not declaration.donnees_declaration:
            errors.append("Données de déclaration manquantes")
        
        if declaration.montant_du < 0:
            errors.append("Le montant dû ne peut pas être négatif")
        
        # Validation spécifique par type
        if declaration.type_declaration == 'TVA':
            errors.extend(FiscalService._validate_tva_declaration(declaration))
        elif declaration.type_declaration == 'IS':
            errors.extend(FiscalService._validate_is_declaration(declaration))
        
        return {
            'valid': len(errors) == 0,
            'errors': errors
        }
    
    @staticmethod
    def _validate_tva_declaration(declaration: DeclarationFiscale) -> List[str]:
        """Valider une déclaration TVA."""
        errors = []
        donnees = declaration.donnees_declaration
        
        # Vérifier l'équilibre TVA
        tva_collectee = Decimal(donnees.get('tva_collectee', 0))
        tva_deductible = Decimal(donnees.get('tva_deductible', 0))
        tva_due = Decimal(donnees.get('tva_due', 0))
        
        tva_due_calculee = tva_collectee - tva_deductible
        
        if abs(tva_due - tva_due_calculee) > Decimal('0.01'):
            errors.append(f"Incohérence TVA due: {tva_due} vs {tva_due_calculee} calculée")
        
        # Vérifier les taux de TVA
        for ventilation in donnees.get('ventilation_taux', []):
            taux = Decimal(ventilation.get('taux', 0))
            if taux not in [Decimal('0'), Decimal('18')]:  # Taux OHADA standards
                errors.append(f"Taux de TVA non conforme: {taux}%")
        
        return errors
    
    @staticmethod
    def _validate_is_declaration(declaration: DeclarationFiscale) -> List[str]:
        """Valider une déclaration IS."""
        errors = []
        donnees = declaration.donnees_declaration
        
        # Vérifier la cohérence des résultats
        resultat_comptable = Decimal(donnees.get('resultat_comptable', 0))
        resultat_fiscal = Decimal(donnees.get('resultat_fiscal', 0))
        
        # Le résultat fiscal doit généralement être proche du résultat comptable
        if abs(resultat_fiscal - resultat_comptable) > resultat_comptable * Decimal('0.5'):
            errors.append("Écart important entre résultat comptable et fiscal")
        
        return errors
    
    @staticmethod
    def synchronize_tax_calendar(societe: Societe) -> Dict[str, Any]:
        """Synchroniser le calendrier fiscal."""
        try:
            connector = FiscalService.get_connector(societe)
            
            if not connector.authenticate():
                raise Exception("Authentification fiscale échouée")
            
            # Récupérer le calendrier de l'année courante et suivante
            current_year = timezone.now().year
            calendar_current = connector.get_tax_calendar(current_year)
            calendar_next = connector.get_tax_calendar(current_year + 1)
            
            all_obligations = calendar_current + calendar_next
            
            # Mettre à jour les déclarations planifiées
            nouvelles_obligations = 0
            for obligation in all_obligations:
                # Créer ou mettre à jour l'obligation
                defaults = {
                    'libelle': obligation.get('libelle', ''),
                    'periodicite': obligation.get('periodicite', 'MENSUELLE'),
                    'date_limite': obligation['date_limite'],
                    'obligatoire': obligation.get('obligatoire', True),
                    'penalites': obligation.get('penalites', {})
                }
                
                created = False
                try:
                    # Logique de création/mise à jour des obligations
                    # À implémenter selon le modèle d'obligation fiscale
                    nouvelles_obligations += 1 if created else 0
                except Exception as e:
                    logger.error(f"Erreur création obligation: {str(e)}")
            
            return {
                'success': True,
                'total_obligations': len(all_obligations),
                'nouvelles_obligations': nouvelles_obligations
            }
            
        except Exception as e:
            logger.error(f"Erreur synchronisation calendrier: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    @staticmethod
    def calculate_penalties(declaration: DeclarationFiscale) -> Dict[str, Decimal]:
        """Calculer les pénalités de retard."""
        if declaration.date_depot and declaration.date_limite_depot:
            retard_jours = (declaration.date_depot.date() - declaration.date_limite_depot).days
            
            if retard_jours > 0:
                # Pénalités OHADA standard
                penalite_base = declaration.montant_du * Decimal('0.05')  # 5%
                penalite_retard = declaration.montant_du * Decimal('0.01') * retard_jours  # 1% par jour
                
                return {
                    'penalite_base': penalite_base,
                    'penalite_retard': penalite_retard,
                    'total_penalites': penalite_base + penalite_retard,
                    'jours_retard': retard_jours
                }
        
        return {
            'penalite_base': Decimal('0'),
            'penalite_retard': Decimal('0'),
            'total_penalites': Decimal('0'),
            'jours_retard': 0
        }