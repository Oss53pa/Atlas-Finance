"""
WiseBook Treasury - Field-Level Encryption
Encryption at rest pour les données sensibles (IBAN, comptes bancaires, etc.)
Utilise Fernet (AES-128 CBC) avec rotation de clés
"""

import os
import base64
import logging
from typing import Optional, Union
from datetime import datetime, timedelta

from cryptography.fernet import Fernet, MultiFernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend

from django.conf import settings
from django.db import models
from django.core.exceptions import ImproperlyConfigured


logger = logging.getLogger(__name__)


class EncryptionService:
    """
    Service de chiffrement pour données sensibles

    Fonctionnalités:
    - Chiffrement AES-256 via Fernet
    - Rotation de clés automatique
    - Support multi-clés pour déchiffrement legacy
    - Dérivation de clés via PBKDF2
    """

    _instance = None
    _fernet = None
    _initialized = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        self._initialized = True
        self._initialize_keys()

    def _initialize_keys(self):
        """Initialise les clés de chiffrement"""
        # Clé primaire (active)
        primary_key = self._get_or_create_key('ENCRYPTION_KEY_PRIMARY')

        # Clés secondaires (pour rotation - legacy keys)
        secondary_keys = []
        for i in range(1, 4):  # Support jusqu'à 3 anciennes clés
            key_name = f'ENCRYPTION_KEY_SECONDARY_{i}'
            key = os.getenv(key_name)
            if key:
                try:
                    secondary_keys.append(Fernet(key.encode()))
                except Exception as e:
                    logger.warning(f"Invalid secondary key {key_name}: {e}")

        # MultiFernet permet de déchiffrer avec plusieurs clés
        # (utile lors de la rotation)
        all_keys = [Fernet(primary_key.encode())] + secondary_keys

        if len(all_keys) > 1:
            self._fernet = MultiFernet(all_keys)
            logger.info(f"Encryption initialized with {len(all_keys)} keys (rotation support)")
        else:
            self._fernet = Fernet(primary_key.encode())
            logger.info("Encryption initialized with single key")

    def _get_or_create_key(self, key_name: str) -> str:
        """Récupère ou génère une clé de chiffrement"""
        key = os.getenv(key_name)

        if not key:
            # Générer une nouvelle clé
            key = Fernet.generate_key().decode()
            logger.warning(
                f"{key_name} not found in environment. Generated new key: {key[:10]}..."
                f"\nADD THIS TO YOUR .env: {key_name}={key}"
            )

        return key

    def encrypt(self, plaintext: Union[str, bytes]) -> str:
        """
        Chiffre une valeur

        Args:
            plaintext: Texte clair (str ou bytes)

        Returns:
            Texte chiffré encodé en base64
        """
        if plaintext is None:
            return None

        if isinstance(plaintext, str):
            plaintext = plaintext.encode('utf-8')

        encrypted = self._fernet.encrypt(plaintext)
        return base64.urlsafe_b64encode(encrypted).decode('utf-8')

    def decrypt(self, ciphertext: str) -> Optional[str]:
        """
        Déchiffre une valeur

        Args:
            ciphertext: Texte chiffré (base64)

        Returns:
            Texte clair déchiffré
        """
        if ciphertext is None:
            return None

        try:
            encrypted = base64.urlsafe_b64decode(ciphertext.encode('utf-8'))
            decrypted = self._fernet.decrypt(encrypted)
            return decrypted.decode('utf-8')
        except Exception as e:
            logger.error(f"Decryption failed: {str(e)}")
            return None

    def rotate(self, ciphertext: str) -> str:
        """
        Effectue une rotation de clé (re-chiffre avec la nouvelle clé primaire)

        Args:
            ciphertext: Texte chiffré avec l'ancienne clé

        Returns:
            Texte chiffré avec la nouvelle clé
        """
        if ciphertext is None:
            return None

        # Déchiffrer avec l'ancienne clé
        plaintext = self.decrypt(ciphertext)

        if plaintext is None:
            raise ValueError("Cannot rotate: decryption failed")

        # Re-chiffrer avec la nouvelle clé primaire
        return self.encrypt(plaintext)


# Instance singleton globale
encryption_service = EncryptionService()


class EncryptedTextField(models.TextField):
    """
    Champ Django TextField chiffré automatiquement

    Usage:
        class BankAccount(models.Model):
            iban = EncryptedTextField(max_length=34)
            account_number = EncryptedTextField(max_length=20)
    """

    description = "Encrypted text field"

    def __init__(self, *args, **kwargs):
        # Force blank=True pour permettre les valeurs None
        kwargs.setdefault('blank', True)
        super().__init__(*args, **kwargs)

    def get_prep_value(self, value):
        """Chiffre avant sauvegarde en DB"""
        if value is None or value == '':
            return None

        # Si déjà chiffré, ne pas re-chiffrer
        if self._is_encrypted(value):
            return value

        encrypted = encryption_service.encrypt(value)
        return encrypted

    def from_db_value(self, value, expression, connection):
        """Déchiffre après lecture depuis DB"""
        if value is None:
            return None

        return encryption_service.decrypt(value)

    def to_python(self, value):
        """Conversion Python (formulaires, etc.)"""
        if value is None:
            return None

        # Si déjà en clair, retourner tel quel
        if not self._is_encrypted(value):
            return value

        return encryption_service.decrypt(value)

    def _is_encrypted(self, value: str) -> bool:
        """Détecte si une valeur est déjà chiffrée (heuristique)"""
        if not value:
            return False

        # Les valeurs chiffrées Fernet commencent par "gAAAAA"
        # après encodage base64
        try:
            decoded = base64.urlsafe_b64decode(value)
            return decoded.startswith(b'\x80\x00\x00\x00')  # Fernet version
        except Exception:
            return False


class EncryptedCharField(models.CharField):
    """
    Champ Django CharField chiffré

    Note: max_length s'applique à la version CHIFFRÉE (plus longue)
    Règle approximative: max_length_encrypted = max_length_plain * 2
    """

    description = "Encrypted char field"

    def __init__(self, *args, **kwargs):
        kwargs.setdefault('blank', True)

        # Ajuster max_length pour tenir compte du chiffrement
        if 'max_length' in kwargs:
            original_max = kwargs['max_length']
            # Fernet ajoute ~50 bytes + overhead base64
            kwargs['max_length'] = original_max * 2 + 100

        super().__init__(*args, **kwargs)

    def get_prep_value(self, value):
        if value is None or value == '':
            return None

        if self._is_encrypted(value):
            return value

        return encryption_service.encrypt(value)

    def from_db_value(self, value, expression, connection):
        if value is None:
            return None

        return encryption_service.decrypt(value)

    def to_python(self, value):
        if value is None:
            return None

        if not self._is_encrypted(value):
            return value

        return encryption_service.decrypt(value)

    def _is_encrypted(self, value: str) -> bool:
        if not value:
            return False

        try:
            decoded = base64.urlsafe_b64decode(value)
            return decoded.startswith(b'\x80\x00\x00\x00')
        except Exception:
            return False


# Utilitaires de migration
def encrypt_existing_data(model_class, field_names: list):
    """
    Chiffre les données existantes dans la base

    Usage:
        from apps.treasury.models import BankAccount
        encrypt_existing_data(BankAccount, ['iban', 'account_number'])

    WARNING: Faire un backup avant!
    """
    logger.info(f"Starting encryption of {model_class.__name__}.{field_names}")

    count = 0
    errors = 0

    for instance in model_class.objects.all():
        try:
            for field_name in field_names:
                value = getattr(instance, field_name)

                if value and not _is_encrypted_value(value):
                    # Chiffrer et sauvegarder
                    encrypted = encryption_service.encrypt(value)
                    setattr(instance, field_name, encrypted)

            instance.save(update_fields=field_names)
            count += 1

        except Exception as e:
            logger.error(f"Error encrypting {instance.pk}: {e}")
            errors += 1

    logger.info(f"Encryption complete: {count} records encrypted, {errors} errors")
    return count, errors


def decrypt_existing_data(model_class, field_names: list):
    """
    Déchiffre les données (rollback)

    WARNING: Use only for emergency rollback!
    """
    logger.warning(f"Decrypting {model_class.__name__}.{field_names} (ROLLBACK)")

    count = 0
    errors = 0

    for instance in model_class.objects.all():
        try:
            for field_name in field_names:
                value = getattr(instance, field_name)

                if value and _is_encrypted_value(value):
                    # Déchiffrer et sauvegarder en clair
                    decrypted = encryption_service.decrypt(value)
                    setattr(instance, field_name, decrypted)

            instance.save(update_fields=field_names)
            count += 1

        except Exception as e:
            logger.error(f"Error decrypting {instance.pk}: {e}")
            errors += 1

    logger.info(f"Decryption complete: {count} records decrypted, {errors} errors")
    return count, errors


def rotate_encryption_keys(model_class, field_names: list):
    """
    Effectue une rotation de clés de chiffrement

    Processus:
    1. Ajouter la nouvelle clé comme ENCRYPTION_KEY_PRIMARY
    2. Déplacer l'ancienne clé vers ENCRYPTION_KEY_SECONDARY_1
    3. Exécuter cette fonction pour re-chiffrer toutes les données
    """
    logger.info(f"Starting key rotation for {model_class.__name__}.{field_names}")

    count = 0
    errors = 0

    for instance in model_class.objects.all():
        try:
            for field_name in field_names:
                value = getattr(instance, field_name)

                if value and _is_encrypted_value(value):
                    # Rotation: déchiffre puis re-chiffre avec nouvelle clé
                    rotated = encryption_service.rotate(value)
                    setattr(instance, field_name, rotated)

            instance.save(update_fields=field_names)
            count += 1

            if count % 100 == 0:
                logger.info(f"Rotated {count} records...")

        except Exception as e:
            logger.error(f"Error rotating {instance.pk}: {e}")
            errors += 1

    logger.info(f"Key rotation complete: {count} records rotated, {errors} errors")
    return count, errors


def _is_encrypted_value(value: str) -> bool:
    """Détecte si une valeur est chiffrée"""
    if not value:
        return False

    try:
        decoded = base64.urlsafe_b64decode(value)
        return decoded.startswith(b'\x80\x00\x00\x00')
    except Exception:
        return False


# Middleware pour automatic key rotation (optionnel)
class EncryptionRotationMiddleware:
    """
    Middleware Django pour effectuer des rotations de clés automatiques

    Ajouter à settings.py:
        MIDDLEWARE = [
            ...
            'apps.core.encryption.EncryptionRotationMiddleware',
        ]
    """

    def __init__(self, get_response):
        self.get_response = get_response
        self.last_rotation_check = datetime.now()

    def __call__(self, request):
        # Vérifier la rotation toutes les 24h
        if (datetime.now() - self.last_rotation_check) > timedelta(days=1):
            self._check_rotation_needed()
            self.last_rotation_check = datetime.now()

        response = self.get_response(request)
        return response

    def _check_rotation_needed(self):
        """Vérifie si une rotation est nécessaire"""
        rotation_policy = getattr(settings, 'ENCRYPTION_ROTATION_DAYS', 90)

        # TODO: Implémenter la logique de vérification
        # Par exemple, stocker la date de dernière rotation dans un modèle
        pass
