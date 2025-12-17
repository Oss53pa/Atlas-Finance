"""
WiseBook Treasury - Secrets Management Service
Intégration avec HashiCorp Vault et AWS Secrets Manager
Gestion sécurisée des secrets (API keys, tokens, credentials)
"""

import os
import json
import logging
from typing import Optional, Dict, Any
from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from functools import lru_cache

try:
    import hvac  # HashiCorp Vault client
    VAULT_AVAILABLE = True
except ImportError:
    VAULT_AVAILABLE = False

try:
    import boto3  # AWS SDK
    from botocore.exceptions import ClientError
    AWS_AVAILABLE = True
except ImportError:
    AWS_AVAILABLE = False

from django.core.cache import cache
from django.conf import settings


logger = logging.getLogger(__name__)


class SecretsBackend(ABC):
    """Interface abstraite pour les backends de secrets"""

    @abstractmethod
    def get_secret(self, secret_name: str) -> Optional[str]:
        """Récupère un secret"""
        pass

    @abstractmethod
    def set_secret(self, secret_name: str, secret_value: str) -> bool:
        """Stocke un secret"""
        pass

    @abstractmethod
    def delete_secret(self, secret_name: str) -> bool:
        """Supprime un secret"""
        pass

    @abstractmethod
    def rotate_secret(self, secret_name: str, new_value: str) -> bool:
        """Effectue une rotation de secret"""
        pass


class VaultBackend(SecretsBackend):
    """Backend HashiCorp Vault"""

    def __init__(self):
        if not VAULT_AVAILABLE:
            raise ImportError("hvac library not installed. Run: pip install hvac")

        self.vault_url = os.getenv('VAULT_ADDR', 'http://localhost:8200')
        self.vault_token = os.getenv('VAULT_TOKEN')
        self.vault_namespace = os.getenv('VAULT_NAMESPACE', 'wisebook/treasury')

        if not self.vault_token:
            raise ValueError("VAULT_TOKEN environment variable not set")

        self.client = hvac.Client(
            url=self.vault_url,
            token=self.vault_token
        )

        if not self.client.is_authenticated():
            raise ConnectionError(f"Failed to authenticate with Vault at {self.vault_url}")

        logger.info(f"Connected to Vault at {self.vault_url}")

    def get_secret(self, secret_name: str) -> Optional[str]:
        """Récupère un secret depuis Vault"""
        try:
            secret_path = f"{self.vault_namespace}/{secret_name}"
            response = self.client.secrets.kv.v2.read_secret_version(
                path=secret_path
            )

            if response and 'data' in response and 'data' in response['data']:
                secret_value = response['data']['data'].get('value')
                logger.info(f"Secret retrieved: {secret_name}")
                return secret_value

            logger.warning(f"Secret not found: {secret_name}")
            return None

        except Exception as e:
            logger.error(f"Error retrieving secret {secret_name}: {str(e)}")
            return None

    def set_secret(self, secret_name: str, secret_value: str) -> bool:
        """Stocke un secret dans Vault"""
        try:
            secret_path = f"{self.vault_namespace}/{secret_name}"
            self.client.secrets.kv.v2.create_or_update_secret(
                path=secret_path,
                secret={'value': secret_value}
            )

            logger.info(f"Secret stored: {secret_name}")
            return True

        except Exception as e:
            logger.error(f"Error storing secret {secret_name}: {str(e)}")
            return False

    def delete_secret(self, secret_name: str) -> bool:
        """Supprime un secret de Vault"""
        try:
            secret_path = f"{self.vault_namespace}/{secret_name}"
            self.client.secrets.kv.v2.delete_metadata_and_all_versions(
                path=secret_path
            )

            logger.info(f"Secret deleted: {secret_name}")
            return True

        except Exception as e:
            logger.error(f"Error deleting secret {secret_name}: {str(e)}")
            return False

    def rotate_secret(self, secret_name: str, new_value: str) -> bool:
        """Effectue une rotation de secret avec versioning"""
        try:
            # Vault KV v2 gère automatiquement le versioning
            return self.set_secret(secret_name, new_value)

        except Exception as e:
            logger.error(f"Error rotating secret {secret_name}: {str(e)}")
            return False


class AWSSecretsBackend(SecretsBackend):
    """Backend AWS Secrets Manager"""

    def __init__(self):
        if not AWS_AVAILABLE:
            raise ImportError("boto3 library not installed. Run: pip install boto3")

        self.region = os.getenv('AWS_REGION', 'eu-west-1')
        self.prefix = os.getenv('AWS_SECRETS_PREFIX', 'wisebook/treasury')

        self.client = boto3.client(
            'secretsmanager',
            region_name=self.region
        )

        logger.info(f"Connected to AWS Secrets Manager in {self.region}")

    def get_secret(self, secret_name: str) -> Optional[str]:
        """Récupère un secret depuis AWS"""
        try:
            full_name = f"{self.prefix}/{secret_name}"
            response = self.client.get_secret_value(SecretId=full_name)

            if 'SecretString' in response:
                logger.info(f"Secret retrieved: {secret_name}")
                return response['SecretString']

            logger.warning(f"Secret not found: {secret_name}")
            return None

        except ClientError as e:
            if e.response['Error']['Code'] == 'ResourceNotFoundException':
                logger.warning(f"Secret not found: {secret_name}")
            else:
                logger.error(f"Error retrieving secret {secret_name}: {str(e)}")
            return None

    def set_secret(self, secret_name: str, secret_value: str) -> bool:
        """Stocke un secret dans AWS"""
        try:
            full_name = f"{self.prefix}/{secret_name}"

            # Tenter de créer le secret
            try:
                self.client.create_secret(
                    Name=full_name,
                    SecretString=secret_value
                )
                logger.info(f"Secret created: {secret_name}")
            except ClientError as e:
                if e.response['Error']['Code'] == 'ResourceExistsException':
                    # Le secret existe déjà, le mettre à jour
                    self.client.update_secret(
                        SecretId=full_name,
                        SecretString=secret_value
                    )
                    logger.info(f"Secret updated: {secret_name}")
                else:
                    raise

            return True

        except Exception as e:
            logger.error(f"Error storing secret {secret_name}: {str(e)}")
            return False

    def delete_secret(self, secret_name: str) -> bool:
        """Supprime un secret d'AWS"""
        try:
            full_name = f"{self.prefix}/{secret_name}"
            self.client.delete_secret(
                SecretId=full_name,
                ForceDeleteWithoutRecovery=False  # Permet une période de récupération
            )

            logger.info(f"Secret deleted: {secret_name}")
            return True

        except Exception as e:
            logger.error(f"Error deleting secret {secret_name}: {str(e)}")
            return False

    def rotate_secret(self, secret_name: str, new_value: str) -> bool:
        """Effectue une rotation de secret"""
        try:
            full_name = f"{self.prefix}/{secret_name}"
            self.client.rotate_secret(
                SecretId=full_name,
                ClientRequestToken=None  # Auto-généré
            )

            # Mettre à jour avec la nouvelle valeur
            self.client.update_secret(
                SecretId=full_name,
                SecretString=new_value
            )

            logger.info(f"Secret rotated: {secret_name}")
            return True

        except Exception as e:
            logger.error(f"Error rotating secret {secret_name}: {str(e)}")
            return False


class EnvironmentBackend(SecretsBackend):
    """Backend fallback utilisant les variables d'environnement (dev only)"""

    def get_secret(self, secret_name: str) -> Optional[str]:
        value = os.getenv(secret_name)
        if value:
            logger.warning(f"Secret retrieved from environment: {secret_name} (NOT SECURE for production)")
        return value

    def set_secret(self, secret_name: str, secret_value: str) -> bool:
        logger.error("Cannot set secrets in environment backend")
        return False

    def delete_secret(self, secret_name: str) -> bool:
        logger.error("Cannot delete secrets in environment backend")
        return False

    def rotate_secret(self, secret_name: str, new_value: str) -> bool:
        logger.error("Cannot rotate secrets in environment backend")
        return False


class SecretsManager:
    """
    Gestionnaire centralisé de secrets avec cache et fallback

    Usage:
        secrets = SecretsManager()
        api_key = secrets.get('BANK_API_KEY')
        secrets.rotate('BANK_API_KEY', new_value)
    """

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if hasattr(self, '_initialized'):
            return

        self._initialized = True
        self.backend = self._get_backend()
        self.cache_ttl = int(os.getenv('SECRETS_CACHE_TTL', 300))  # 5 minutes

        logger.info(f"SecretsManager initialized with {self.backend.__class__.__name__}")

    def _get_backend(self) -> SecretsBackend:
        """Sélectionne le backend approprié selon la configuration"""
        backend_type = os.getenv('SECRETS_BACKEND', 'environment').lower()

        if backend_type == 'vault' and VAULT_AVAILABLE:
            try:
                return VaultBackend()
            except Exception as e:
                logger.error(f"Failed to initialize Vault backend: {e}")
                logger.warning("Falling back to environment backend")
                return EnvironmentBackend()

        elif backend_type == 'aws' and AWS_AVAILABLE:
            try:
                return AWSSecretsBackend()
            except Exception as e:
                logger.error(f"Failed to initialize AWS backend: {e}")
                logger.warning("Falling back to environment backend")
                return EnvironmentBackend()

        else:
            if backend_type != 'environment':
                logger.warning(f"Unknown or unavailable backend: {backend_type}. Using environment backend")
            return EnvironmentBackend()

    def get(self, secret_name: str, use_cache: bool = True) -> Optional[str]:
        """
        Récupère un secret avec cache optionnel

        Args:
            secret_name: Nom du secret
            use_cache: Utiliser le cache Redis (défaut: True)

        Returns:
            Valeur du secret ou None
        """
        # Vérifier le cache
        if use_cache:
            cache_key = f"secret:{secret_name}"
            cached_value = cache.get(cache_key)
            if cached_value:
                logger.debug(f"Secret retrieved from cache: {secret_name}")
                return cached_value

        # Récupérer depuis le backend
        secret_value = self.backend.get_secret(secret_name)

        # Mettre en cache si trouvé
        if secret_value and use_cache:
            cache_key = f"secret:{secret_name}"
            cache.set(cache_key, secret_value, self.cache_ttl)

        return secret_value

    def set(self, secret_name: str, secret_value: str) -> bool:
        """Stocke un secret et invalide le cache"""
        success = self.backend.set_secret(secret_name, secret_value)

        if success:
            # Invalider le cache
            cache_key = f"secret:{secret_name}"
            cache.delete(cache_key)

        return success

    def delete(self, secret_name: str) -> bool:
        """Supprime un secret et invalide le cache"""
        success = self.backend.delete_secret(secret_name)

        if success:
            # Invalider le cache
            cache_key = f"secret:{secret_name}"
            cache.delete(cache_key)

        return success

    def rotate(self, secret_name: str, new_value: str) -> bool:
        """
        Effectue une rotation de secret

        Args:
            secret_name: Nom du secret
            new_value: Nouvelle valeur

        Returns:
            True si succès
        """
        success = self.backend.rotate_secret(secret_name, new_value)

        if success:
            # Invalider le cache
            cache_key = f"secret:{secret_name}"
            cache.delete(cache_key)

            logger.info(f"Secret rotated successfully: {secret_name}")

        return success

    def get_database_url(self) -> str:
        """Récupère l'URL de la base de données"""
        return self.get('DATABASE_URL') or os.getenv('DATABASE_URL', '')

    def get_redis_url(self) -> str:
        """Récupère l'URL Redis"""
        return self.get('REDIS_URL') or os.getenv('REDIS_URL', 'redis://localhost:6379/0')

    def get_bank_api_credentials(self, bank_code: str) -> Dict[str, str]:
        """
        Récupère les credentials API bancaire

        Args:
            bank_code: Code banque (ex: 'bnp', 'societe_generale')

        Returns:
            Dict avec api_key, api_secret, etc.
        """
        api_key = self.get(f'BANK_{bank_code.upper()}_API_KEY')
        api_secret = self.get(f'BANK_{bank_code.upper()}_API_SECRET')

        return {
            'api_key': api_key,
            'api_secret': api_secret,
            'base_url': self.get(f'BANK_{bank_code.upper()}_BASE_URL')
        }

    def get_jwt_secret(self) -> str:
        """Récupère la clé JWT"""
        return self.get('JWT_SECRET_KEY') or settings.SECRET_KEY


# Instance globale singleton
secrets_manager = SecretsManager()


# Utilitaires pour migration depuis .env
def migrate_secrets_to_vault():
    """
    Script de migration des secrets depuis .env vers Vault/AWS

    Usage:
        python manage.py shell
        >>> from apps.core.secrets_manager import migrate_secrets_to_vault
        >>> migrate_secrets_to_vault()
    """
    secrets_to_migrate = [
        'DATABASE_URL',
        'REDIS_URL',
        'SECRET_KEY',
        'JWT_SECRET_KEY',
        'BANK_BNI_API_KEY',
        'BANK_BNI_API_SECRET',
        'BANK_SG_API_KEY',
        'BANK_SG_API_SECRET',
        'AWS_ACCESS_KEY_ID',
        'AWS_SECRET_ACCESS_KEY',
        'SENTRY_DSN',
        'SMTP_PASSWORD'
    ]

    manager = SecretsManager()
    migrated = 0

    for secret_name in secrets_to_migrate:
        value = os.getenv(secret_name)
        if value:
            success = manager.set(secret_name, value)
            if success:
                migrated += 1
                logger.info(f"Migrated: {secret_name}")
            else:
                logger.error(f"Failed to migrate: {secret_name}")
        else:
            logger.warning(f"Secret not found in environment: {secret_name}")

    logger.info(f"Migration complete: {migrated}/{len(secrets_to_migrate)} secrets migrated")
    return migrated
