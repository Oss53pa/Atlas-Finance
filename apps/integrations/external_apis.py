import requests
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from decimal import Decimal
import logging
from dataclasses import dataclass
from abc import ABC, abstractmethod

from django.conf import settings
from django.utils import timezone
from django.core.cache import cache

logger = logging.getLogger(__name__)


@dataclass
class ExchangeRate:
    """Taux de change."""
    from_currency: str
    to_currency: str
    rate: Decimal
    date: datetime
    source: str


@dataclass
class CompanyInfo:
    """Informations entreprise depuis API externe."""
    siret: str
    siren: str
    nom: str
    forme_juridique: str
    adresse: str
    ville: str
    code_postal: str
    pays: str
    secteur_activite: str
    date_creation: datetime
    capital: Optional[Decimal] = None
    effectif: Optional[int] = None


class BaseExternalAPI(ABC):
    """Classe de base pour les APIs externes."""
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key
        self.base_url = ""
        self.timeout = 30
    
    @abstractmethod
    def authenticate(self) -> bool:
        """Authentifier auprès de l'API."""
        pass
    
    def _make_request(self, method: str, endpoint: str, **kwargs) -> requests.Response:
        """Faire une requête HTTP générique."""
        url = f"{self.base_url}{endpoint}"
        
        # Headers par défaut
        headers = {
            'User-Agent': 'WiseBook/3.0',
            'Accept': 'application/json',
        }
        
        if 'headers' in kwargs:
            headers.update(kwargs.pop('headers'))
        
        response = requests.request(
            method=method,
            url=url,
            headers=headers,
            timeout=self.timeout,
            **kwargs
        )
        
        response.raise_for_status()
        return response


class CurrencyExchangeAPI(BaseExternalAPI):
    """API pour les taux de change."""
    
    def __init__(self, api_key: str = None):
        super().__init__(api_key)
        self.base_url = "https://api.exchangerate-api.com/v4"
    
    def authenticate(self) -> bool:
        """L'API ExchangeRate-API ne nécessite pas d'authentification."""
        return True
    
    def get_exchange_rates(self, base_currency: str = "EUR") -> Dict[str, Decimal]:
        """Récupérer les taux de change."""
        try:
            cache_key = f"exchange_rates_{base_currency}"
            cached_rates = cache.get(cache_key)
            
            if cached_rates:
                return cached_rates
            
            response = self._make_request('GET', f"/latest/{base_currency}")
            data = response.json()
            
            rates = {}
            for currency, rate in data['rates'].items():
                rates[currency] = Decimal(str(rate))
            
            # Cache pour 1 heure
            cache.set(cache_key, rates, 3600)
            
            return rates
            
        except Exception as e:
            logger.error(f"Erreur récupération taux de change: {str(e)}")
            return {}
    
    def convert_currency(
        self, 
        amount: Decimal, 
        from_currency: str, 
        to_currency: str
    ) -> Optional[Decimal]:
        """Convertir une devise."""
        if from_currency == to_currency:
            return amount
        
        try:
            rates = self.get_exchange_rates(from_currency)
            if to_currency in rates:
                return amount * rates[to_currency]
            
            return None
            
        except Exception as e:
            logger.error(f"Erreur conversion devise: {str(e)}")
            return None


class SIRETValidationAPI(BaseExternalAPI):
    """API pour la validation SIRET."""
    
    def __init__(self, api_key: str):
        super().__init__(api_key)
        self.base_url = "https://api.insee.fr/entreprises/sirene/V3"
    
    def authenticate(self) -> bool:
        """Authentifier avec l'INSEE."""
        # L'INSEE utilise un token Bearer
        return bool(self.api_key)
    
    def validate_siret(self, siret: str) -> Optional[CompanyInfo]:
        """Valider et récupérer les informations d'un SIRET."""
        try:
            headers = {
                'Authorization': f'Bearer {self.api_key}',
            }
            
            response = self._make_request(
                'GET', 
                f"/siret/{siret}",
                headers=headers
            )
            
            data = response.json()
            
            if 'etablissement' in data:
                etab = data['etablissement']
                unite_legale = etab.get('uniteLegale', {})
                
                return CompanyInfo(
                    siret=etab['siret'],
                    siren=etab['siren'],
                    nom=unite_legale.get('denominationUniteLegale', ''),
                    forme_juridique=unite_legale.get('categorieJuridiqueUniteLegale', ''),
                    adresse=self._format_address(etab.get('adresseEtablissement', {})),
                    ville=etab.get('adresseEtablissement', {}).get('libelleCommuneEtablissement', ''),
                    code_postal=etab.get('adresseEtablissement', {}).get('codePostalEtablissement', ''),
                    pays='FR',
                    secteur_activite=etab.get('activitePrincipaleEtablissement', ''),
                    date_creation=self._parse_insee_date(unite_legale.get('dateCreationUniteLegale')),
                    effectif=self._parse_effectif(etab.get('trancheEffectifsEtablissement'))
                )
            
            return None
            
        except Exception as e:
            logger.error(f"Erreur validation SIRET: {str(e)}")
            return None
    
    def _format_address(self, address_data: Dict) -> str:
        """Formater l'adresse depuis les données INSEE."""
        parts = []
        
        if address_data.get('numeroVoieEtablissement'):
            parts.append(address_data['numeroVoieEtablissement'])
        
        if address_data.get('typeVoieEtablissement'):
            parts.append(address_data['typeVoieEtablissement'])
        
        if address_data.get('libelleVoieEtablissement'):
            parts.append(address_data['libelleVoieEtablissement'])
        
        return ' '.join(parts)
    
    def _parse_insee_date(self, date_str: str) -> Optional[datetime]:
        """Parser une date INSEE."""
        if not date_str:
            return None
        
        try:
            return datetime.strptime(date_str, '%Y-%m-%d')
        except ValueError:
            return None
    
    def _parse_effectif(self, tranche_effectif: str) -> Optional[int]:
        """Parser la tranche d'effectif INSEE."""
        # Mapping simplifié des tranches INSEE
        effectifs = {
            '00': 0,
            '01': 1,
            '02': 2,
            '03': 5,
            '11': 10,
            '12': 20,
            '21': 50,
            '22': 100,
            '31': 200,
            '32': 250,
            '41': 500,
            '42': 1000,
            '51': 2000,
            '52': 5000,
            '53': 10000,
        }
        
        return effectifs.get(tranche_effectif)


class AfricanBusinessAPI(BaseExternalAPI):
    """API pour les données d'entreprises africaines."""
    
    COUNTRY_APIS = {
        'CI': 'https://api.registre-commerce.ci/v1',
        'SN': 'https://api.apix.sn/v1',
        'CM': 'https://api.registre-commerce.cm/v1',
        'ML': 'https://api.mali-entreprises.ml/v1',
    }
    
    def __init__(self, country_code: str, api_key: str):
        super().__init__(api_key)
        self.country_code = country_code
        self.base_url = self.COUNTRY_APIS.get(country_code, '')
    
    def authenticate(self) -> bool:
        """Authentifier auprès de l'API du pays."""
        if not self.base_url:
            return False
        
        try:
            response = self._make_request(
                'POST',
                '/auth/token',
                json={'api_key': self.api_key}
            )
            
            data = response.json()
            self.access_token = data.get('access_token')
            
            return bool(self.access_token)
            
        except Exception as e:
            logger.error(f"Erreur authentification API africaine: {str(e)}")
            return False
    
    def validate_company_number(self, company_number: str) -> Optional[CompanyInfo]:
        """Valider un numéro d'entreprise africain."""
        try:
            headers = {
                'Authorization': f'Bearer {self.access_token}',
            }
            
            response = self._make_request(
                'GET',
                f'/entreprises/{company_number}',
                headers=headers
            )
            
            data = response.json()
            
            if data.get('status') == 'active':
                return CompanyInfo(
                    siret=company_number,
                    siren=company_number[:9] if len(company_number) >= 9 else company_number,
                    nom=data.get('denomination', ''),
                    forme_juridique=data.get('forme_juridique', ''),
                    adresse=data.get('adresse', ''),
                    ville=data.get('ville', ''),
                    code_postal=data.get('code_postal', ''),
                    pays=self.country_code,
                    secteur_activite=data.get('activite', ''),
                    date_creation=self._parse_date(data.get('date_creation')),
                    capital=Decimal(str(data.get('capital', 0))) if data.get('capital') else None
                )
            
            return None
            
        except Exception as e:
            logger.error(f"Erreur validation entreprise africaine: {str(e)}")
            return None
    
    def _parse_date(self, date_str: str) -> Optional[datetime]:
        """Parser une date depuis l'API."""
        if not date_str:
            return None
        
        try:
            return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        except ValueError:
            try:
                return datetime.strptime(date_str, '%Y-%m-%d')
            except ValueError:
                return None


class BankingDataAPI(BaseExternalAPI):
    """API pour les données bancaires."""
    
    def __init__(self, api_key: str):
        super().__init__(api_key)
        self.base_url = "https://api.iban-validation.com/v1"
    
    def authenticate(self) -> bool:
        """L'API IBAN ne nécessite pas d'authentification."""
        return True
    
    def validate_iban(self, iban: str) -> Dict[str, Any]:
        """Valider un IBAN."""
        try:
            response = self._make_request(
                'GET',
                f'/validate/{iban.replace(" ", "")}'
            )
            
            data = response.json()
            
            return {
                'valid': data.get('valid', False),
                'country': data.get('country'),
                'bank_name': data.get('bank_name'),
                'branch': data.get('branch'),
                'account': data.get('account'),
                'check_digits': data.get('check_digits')
            }
            
        except Exception as e:
            logger.error(f"Erreur validation IBAN: {str(e)}")
            return {'valid': False, 'error': str(e)}
    
    def validate_bic(self, bic: str) -> Dict[str, Any]:
        """Valider un BIC/SWIFT."""
        try:
            response = self._make_request(
                'GET',
                f'/validate-bic/{bic}'
            )
            
            data = response.json()
            
            return {
                'valid': data.get('valid', False),
                'bank_name': data.get('bank_name'),
                'country': data.get('country'),
                'city': data.get('city')
            }
            
        except Exception as e:
            logger.error(f"Erreur validation BIC: {str(e)}")
            return {'valid': False, 'error': str(e)}


class EconomicDataAPI(BaseExternalAPI):
    """API pour les données économiques."""
    
    def __init__(self, api_key: str):
        super().__init__(api_key)
        self.base_url = "https://api.worldbank.org/v2"
    
    def authenticate(self) -> bool:
        """L'API World Bank ne nécessite pas d'authentification."""
        return True
    
    def get_gdp_growth(self, country_code: str, years: List[int]) -> Dict[int, Optional[Decimal]]:
        """Récupérer la croissance du PIB."""
        try:
            years_str = ':'.join(map(str, years))
            
            response = self._make_request(
                'GET',
                f'/country/{country_code}/indicator/NY.GDP.MKTP.KD.ZG',
                params={
                    'date': years_str,
                    'format': 'json',
                    'per_page': 100
                }
            )
            
            data = response.json()
            
            if isinstance(data, list) and len(data) > 1:
                gdp_data = {}
                for item in data[1]:  # Les données sont dans le 2ème élément
                    if item['value']:
                        gdp_data[int(item['date'])] = Decimal(str(item['value']))
                    else:
                        gdp_data[int(item['date'])] = None
                
                return gdp_data
            
            return {}
            
        except Exception as e:
            logger.error(f"Erreur données PIB: {str(e)}")
            return {}
    
    def get_inflation_rate(self, country_code: str, years: List[int]) -> Dict[int, Optional[Decimal]]:
        """Récupérer le taux d'inflation."""
        try:
            years_str = ':'.join(map(str, years))
            
            response = self._make_request(
                'GET',
                f'/country/{country_code}/indicator/FP.CPI.TOTL.ZG',
                params={
                    'date': years_str,
                    'format': 'json',
                    'per_page': 100
                }
            )
            
            data = response.json()
            
            if isinstance(data, list) and len(data) > 1:
                inflation_data = {}
                for item in data[1]:
                    if item['value']:
                        inflation_data[int(item['date'])] = Decimal(str(item['value']))
                    else:
                        inflation_data[int(item['date'])] = None
                
                return inflation_data
            
            return {}
            
        except Exception as e:
            logger.error(f"Erreur données inflation: {str(e)}")
            return {}


class ExternalAPIService:
    """Service principal pour la gestion des APIs externes."""
    
    @staticmethod
    def get_exchange_rates(base_currency: str = "EUR") -> Dict[str, Decimal]:
        """Récupérer les taux de change."""
        api = CurrencyExchangeAPI()
        return api.get_exchange_rates(base_currency)
    
    @staticmethod
    def convert_currency(amount: Decimal, from_currency: str, to_currency: str) -> Optional[Decimal]:
        """Convertir une devise."""
        api = CurrencyExchangeAPI()
        return api.convert_currency(amount, from_currency, to_currency)
    
    @staticmethod
    def validate_siret(siret: str) -> Optional[CompanyInfo]:
        """Valider un SIRET."""
        api_key = getattr(settings, 'INSEE_API_KEY', None)
        if not api_key:
            logger.warning("Clé API INSEE non configurée")
            return None
        
        api = SIRETValidationAPI(api_key)
        return api.validate_siret(siret)
    
    @staticmethod
    def validate_african_company(country_code: str, company_number: str) -> Optional[CompanyInfo]:
        """Valider une entreprise africaine."""
        api_key = getattr(settings, f'{country_code}_BUSINESS_API_KEY', None)
        if not api_key:
            logger.warning(f"Clé API {country_code} non configurée")
            return None
        
        api = AfricanBusinessAPI(country_code, api_key)
        if api.authenticate():
            return api.validate_company_number(company_number)
        
        return None
    
    @staticmethod
    def validate_iban(iban: str) -> Dict[str, Any]:
        """Valider un IBAN."""
        api = BankingDataAPI('')
        return api.validate_iban(iban)
    
    @staticmethod
    def validate_bic(bic: str) -> Dict[str, Any]:
        """Valider un BIC."""
        api = BankingDataAPI('')
        return api.validate_bic(bic)
    
    @staticmethod
    def get_economic_indicators(country_code: str, years: List[int]) -> Dict[str, Any]:
        """Récupérer les indicateurs économiques."""
        api = EconomicDataAPI('')
        
        return {
            'gdp_growth': api.get_gdp_growth(country_code, years),
            'inflation_rate': api.get_inflation_rate(country_code, years)
        }
    
    @staticmethod
    def enrich_company_data(company_data: Dict[str, Any]) -> Dict[str, Any]:
        """Enrichir les données d'une entreprise."""
        enriched_data = company_data.copy()
        
        # Valider le SIRET si présent
        if 'siret' in company_data and company_data['siret']:
            siret_info = ExternalAPIService.validate_siret(company_data['siret'])
            if siret_info:
                enriched_data.update({
                    'siret_valid': True,
                    'forme_juridique_insee': siret_info.forme_juridique,
                    'secteur_activite_insee': siret_info.secteur_activite,
                    'date_creation_insee': siret_info.date_creation,
                    'effectif_insee': siret_info.effectif
                })
            else:
                enriched_data['siret_valid'] = False
        
        # Valider l'IBAN si présent
        if 'iban' in company_data and company_data['iban']:
            iban_info = ExternalAPIService.validate_iban(company_data['iban'])
            enriched_data.update({
                'iban_valid': iban_info.get('valid', False),
                'bank_name': iban_info.get('bank_name'),
                'bank_country': iban_info.get('country')
            })
        
        return enriched_data
    
    @staticmethod
    def schedule_data_refresh(societe_id: int, refresh_type: str):
        """Planifier un rafraîchissement des données externes."""
        from django_rq import get_queue
        
        queue = get_queue('default')
        
        if refresh_type == 'exchange_rates':
            queue.enqueue(
                'apps.integrations.external_apis.refresh_exchange_rates',
                societe_id,
                job_timeout='5m'
            )
        elif refresh_type == 'economic_data':
            queue.enqueue(
                'apps.integrations.external_apis.refresh_economic_data',
                societe_id,
                job_timeout='10m'
            )


# Tâches asynchrones (pour django-rq)

def refresh_exchange_rates(societe_id: int):
    """Tâche de rafraîchissement des taux de change."""
    try:
        from apps.core.models import Societe, Devise
        
        societe = Societe.objects.get(id=societe_id)
        
        # Récupérer les taux pour toutes les devises utilisées
        devises = Devise.objects.filter(societes=societe)
        
        for devise in devises:
            rates = ExternalAPIService.get_exchange_rates(devise.code)
            
            # Mettre à jour les taux en base
            for target_currency, rate in rates.items():
                # Logique de mise à jour des taux de change
                # À implémenter selon le modèle de taux de change
                pass
        
        logger.info(f"Taux de change rafraîchis pour {societe.nom}")
        
    except Exception as e:
        logger.error(f"Erreur rafraîchissement taux de change: {str(e)}")


def refresh_economic_data(societe_id: int):
    """Tâche de rafraîchissement des données économiques."""
    try:
        from apps.core.models import Societe
        
        societe = Societe.objects.get(id=societe_id)
        
        # Récupérer les indicateurs économiques du pays
        current_year = datetime.now().year
        years = [current_year - 2, current_year - 1, current_year]
        
        indicators = ExternalAPIService.get_economic_indicators(societe.pays, years)
        
        # Sauvegarder les indicateurs
        # À implémenter selon le modèle d'indicateurs économiques
        
        logger.info(f"Données économiques rafraîchies pour {societe.nom}")
        
    except Exception as e:
        logger.error(f"Erreur rafraîchissement données économiques: {str(e)}")