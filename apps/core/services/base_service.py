"""
Service de base pour tous les services métier WiseBook
"""
from typing import Optional, Dict, Any, List
from django.db.models import QuerySet, Model
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class BaseService:
    """Service de base abstrait pour tous les services métier"""

    def __init__(self, company=None, user=None, fiscal_year=None):
        """
        Initialisation du service

        Args:
            company: Société en cours
            user: Utilisateur connecté
            fiscal_year: Exercice comptable en cours
        """
        self.company = company
        self.user = user
        self.fiscal_year = fiscal_year
        self._errors: List[str] = []
        self._warnings: List[str] = []

    @property
    def errors(self) -> List[str]:
        """Liste des erreurs accumulées"""
        return self._errors

    @property
    def warnings(self) -> List[str]:
        """Liste des avertissements accumulés"""
        return self._warnings

    def add_error(self, message: str) -> None:
        """Ajoute une erreur"""
        self._errors.append(message)
        logger.error(f"[{self.__class__.__name__}] {message}")

    def add_warning(self, message: str) -> None:
        """Ajoute un avertissement"""
        self._warnings.append(message)
        logger.warning(f"[{self.__class__.__name__}] {message}")

    def clear_messages(self) -> None:
        """Efface tous les messages"""
        self._errors.clear()
        self._warnings.clear()

    def has_errors(self) -> bool:
        """Vérifie s'il y a des erreurs"""
        return len(self._errors) > 0

    def validate(self, data: Dict[str, Any]) -> bool:
        """
        Validation des données (à surcharger)

        Args:
            data: Données à valider

        Returns:
            True si les données sont valides
        """
        return True

    def get_queryset(self) -> Optional[QuerySet]:
        """Retourne le queryset de base (à surcharger)"""
        return None

    def get_by_id(self, pk: Any) -> Optional[Model]:
        """Récupère un objet par son ID"""
        queryset = self.get_queryset()
        if queryset is not None:
            try:
                return queryset.get(pk=pk)
            except Exception:
                return None
        return None

    def create(self, data: Dict[str, Any]) -> Optional[Model]:
        """Crée un nouvel objet (à surcharger)"""
        raise NotImplementedError("La méthode create() doit être implémentée")

    def update(self, instance: Model, data: Dict[str, Any]) -> Optional[Model]:
        """Met à jour un objet (à surcharger)"""
        raise NotImplementedError("La méthode update() doit être implémentée")

    def delete(self, instance: Model) -> bool:
        """Supprime un objet"""
        try:
            instance.delete()
            return True
        except Exception as e:
            self.add_error(f"Erreur lors de la suppression: {str(e)}")
            return False

    def get_company_filter(self) -> Dict[str, Any]:
        """Retourne le filtre pour la société courante"""
        if self.company:
            return {'company': self.company}
        return {}

    def get_fiscal_year_filter(self) -> Dict[str, Any]:
        """Retourne le filtre pour l'exercice courant"""
        if self.fiscal_year:
            return {'fiscal_year': self.fiscal_year}
        return {}

    def log_action(self, action: str, details: Dict[str, Any] = None) -> None:
        """Enregistre une action dans les logs"""
        log_data = {
            'service': self.__class__.__name__,
            'action': action,
            'user': str(self.user) if self.user else 'system',
            'company': str(self.company) if self.company else 'N/A',
        }
        if details:
            log_data.update(details)
        logger.info(f"Action: {log_data}")
