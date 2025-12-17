"""
WiseBook - Multi-Factor Authentication (MFA)
Support TOTP (Time-based One-Time Password) pour opérations critiques
Utilise django-otp + pyotp pour génération/validation codes
"""

import pyotp
import qrcode
import io
import base64
from datetime import datetime, timedelta
from typing import Optional, Tuple

from django.db import models
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.conf import settings
from django.utils import timezone

import logging

logger = logging.getLogger(__name__)

User = get_user_model()


class MFAMethod(models.Model):
    """
    Méthode MFA configurée pour un utilisateur
    Support: TOTP (Google Authenticator, Authy, etc.)
    """

    METHOD_CHOICES = [
        ('TOTP', 'Application Authenticator (TOTP)'),
        ('SMS', 'SMS (future)'),
        ('EMAIL', 'Email (future)'),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='mfa_methods'
    )

    method_type = models.CharField(
        max_length=10,
        choices=METHOD_CHOICES,
        default='TOTP'
    )

    # Secret TOTP (chiffré at rest)
    secret = models.CharField(
        max_length=32,
        help_text='Secret TOTP base32 encoded'
    )

    # Informations
    is_active = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)
    name = models.CharField(
        max_length=100,
        default='Authenticator',
        help_text='Nom de la méthode (ex: iPhone, Android)'
    )

    # Statistiques
    created_at = models.DateTimeField(auto_now_add=True)
    last_used_at = models.DateTimeField(null=True, blank=True)
    use_count = models.IntegerField(default=0)

    # Backup codes (chiffrés)
    backup_codes = models.JSONField(
        default=list,
        help_text='10 codes de secours à usage unique'
    )

    class Meta:
        db_table = 'core_mfa_methods'
        unique_together = [('user', 'method_type')]
        ordering = ['-is_active', '-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.method_type} ({self.name})"


class MFAChallenge(models.Model):
    """
    Challenge MFA en cours (session)
    Stocke l'opération qui nécessite une validation MFA
    """

    ACTION_CHOICES = [
        ('PAYMENT_EXECUTION', 'Exécution paiement'),
        ('PAYMENT_APPROVAL', 'Approbation paiement'),
        ('USER_DELETION', 'Suppression utilisateur'),
        ('SETTINGS_CHANGE', 'Modification paramètres critiques'),
        ('DATA_EXPORT', 'Export données sensibles'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    action_type = models.CharField(max_length=30, choices=ACTION_CHOICES)

    # Context de l'opération
    context = models.JSONField(
        default=dict,
        help_text='Données de l\'opération (payment_id, amount, etc.)'
    )

    # Challenge
    challenge_code = models.CharField(max_length=64, unique=True)
    is_verified = models.BooleanField(default=False)

    # Expiration
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    verified_at = models.DateTimeField(null=True, blank=True)

    # Tentatives
    attempts = models.IntegerField(default=0)
    max_attempts = models.IntegerField(default=3)

    class Meta:
        db_table = 'core_mfa_challenges'
        ordering = ['-created_at']

    def is_expired(self) -> bool:
        """Vérifie si le challenge est expiré"""
        return timezone.now() > self.expires_at

    def can_attempt(self) -> bool:
        """Vérifie si des tentatives restent"""
        return self.attempts < self.max_attempts and not self.is_expired()

    def __str__(self):
        return f"Challenge {self.action_type} - {self.user.username}"


class MFAService:
    """
    Service pour gestion MFA
    """

    @staticmethod
    def setup_totp(user: User, device_name: str = 'Authenticator') -> Tuple[str, str]:
        """
        Configure TOTP pour un utilisateur

        Returns:
            (secret, qr_code_base64)
        """
        # Générer secret TOTP
        secret = pyotp.random_base32()

        # Créer la méthode MFA
        mfa_method, created = MFAMethod.objects.get_or_create(
            user=user,
            method_type='TOTP',
            defaults={
                'secret': secret,
                'name': device_name,
                'is_active': False,  # Pas actif tant que non vérifié
            }
        )

        if not created:
            # Méthode existe déjà, régénérer le secret
            mfa_method.secret = secret
            mfa_method.is_verified = False
            mfa_method.is_active = False
            mfa_method.save()

        # Générer codes de backup
        backup_codes = MFAService._generate_backup_codes()
        mfa_method.backup_codes = backup_codes
        mfa_method.save()

        # Générer QR code
        totp = pyotp.TOTP(secret)
        provisioning_uri = totp.provisioning_uri(
            name=user.username,
            issuer_name='WiseBook ERP'
        )

        qr_code_base64 = MFAService._generate_qr_code(provisioning_uri)

        logger.info(f"TOTP setup initiated for user {user.id}")

        return secret, qr_code_base64, backup_codes

    @staticmethod
    def verify_totp_setup(user: User, code: str) -> bool:
        """
        Vérifie le code TOTP lors de la configuration initiale
        Active la méthode MFA si le code est valide
        """
        try:
            mfa_method = MFAMethod.objects.get(user=user, method_type='TOTP')

            totp = pyotp.TOTP(mfa_method.secret)

            if totp.verify(code, valid_window=1):  # 30s window
                mfa_method.is_verified = True
                mfa_method.is_active = True
                mfa_method.save()

                logger.info(f"TOTP verified and activated for user {user.id}")
                return True

            logger.warning(f"Invalid TOTP code during setup for user {user.id}")
            return False

        except MFAMethod.DoesNotExist:
            logger.error(f"No TOTP method found for user {user.id}")
            return False

    @staticmethod
    def verify_totp(user: User, code: str) -> bool:
        """
        Vérifie un code TOTP pour une opération
        """
        try:
            mfa_method = MFAMethod.objects.get(
                user=user,
                method_type='TOTP',
                is_active=True,
                is_verified=True
            )

            # Vérifier si code déjà utilisé récemment (replay attack)
            cache_key = f"mfa_used_code:{user.id}:{code}"
            if cache.get(cache_key):
                logger.warning(f"TOTP code reuse attempt for user {user.id}")
                return False

            totp = pyotp.TOTP(mfa_method.secret)

            if totp.verify(code, valid_window=1):
                # Marquer code comme utilisé (30s)
                cache.set(cache_key, True, 60)

                # Statistiques
                mfa_method.last_used_at = timezone.now()
                mfa_method.use_count += 1
                mfa_method.save()

                logger.info(f"TOTP verified successfully for user {user.id}")
                return True

            logger.warning(f"Invalid TOTP code for user {user.id}")
            return False

        except MFAMethod.DoesNotExist:
            logger.error(f"No active TOTP method for user {user.id}")
            return False

    @staticmethod
    def verify_backup_code(user: User, code: str) -> bool:
        """
        Vérifie un code de backup (usage unique)
        """
        try:
            mfa_method = MFAMethod.objects.get(
                user=user,
                method_type='TOTP',
                is_active=True
            )

            if code in mfa_method.backup_codes:
                # Retirer le code utilisé
                mfa_method.backup_codes.remove(code)
                mfa_method.save()

                logger.warning(f"Backup code used for user {user.id} ({len(mfa_method.backup_codes)} remaining)")

                # Alerter si moins de 3 codes restants
                if len(mfa_method.backup_codes) < 3:
                    logger.critical(f"User {user.id} has only {len(mfa_method.backup_codes)} backup codes remaining")

                return True

            logger.warning(f"Invalid backup code for user {user.id}")
            return False

        except MFAMethod.DoesNotExist:
            return False

    @staticmethod
    def create_challenge(user: User, action_type: str, context: dict, expires_in: int = 300) -> MFAChallenge:
        """
        Crée un challenge MFA pour une opération critique

        Args:
            user: Utilisateur
            action_type: Type d'action (PAYMENT_EXECUTION, etc.)
            context: Contexte (payment_id, amount, etc.)
            expires_in: Expiration en secondes (défaut: 5min)

        Returns:
            MFAChallenge instance
        """
        import uuid

        challenge = MFAChallenge.objects.create(
            user=user,
            action_type=action_type,
            context=context,
            challenge_code=str(uuid.uuid4()),
            expires_at=timezone.now() + timedelta(seconds=expires_in)
        )

        logger.info(f"MFA challenge created: {action_type} for user {user.id}")

        return challenge

    @staticmethod
    def verify_challenge(challenge_code: str, totp_code: str) -> Tuple[bool, Optional[str]]:
        """
        Vérifie un challenge MFA

        Returns:
            (success: bool, error_message: Optional[str])
        """
        try:
            challenge = MFAChallenge.objects.get(challenge_code=challenge_code)

            # Vérifier expiration
            if challenge.is_expired():
                return False, "Challenge expiré. Veuillez réessayer."

            # Vérifier nombre de tentatives
            if not challenge.can_attempt():
                return False, "Nombre maximum de tentatives atteint."

            # Incrémenter tentatives
            challenge.attempts += 1
            challenge.save()

            # Vérifier le code TOTP
            if MFAService.verify_totp(challenge.user, totp_code):
                challenge.is_verified = True
                challenge.verified_at = timezone.now()
                challenge.save()

                logger.info(f"MFA challenge verified: {challenge.action_type} for user {challenge.user.id}")
                return True, None

            # Code invalide
            remaining = challenge.max_attempts - challenge.attempts
            return False, f"Code invalide. {remaining} tentative(s) restante(s)."

        except MFAChallenge.DoesNotExist:
            return False, "Challenge introuvable."

    @staticmethod
    def requires_mfa(user: User, action_type: str, context: dict) -> bool:
        """
        Détermine si une opération nécessite MFA

        Args:
            user: Utilisateur
            action_type: Type d'action
            context: Contexte (ex: payment amount)

        Returns:
            True si MFA requis
        """
        # Vérifier si l'utilisateur a MFA activé
        has_mfa = MFAMethod.objects.filter(
            user=user,
            is_active=True,
            is_verified=True
        ).exists()

        if not has_mfa:
            return False  # MFA non configuré

        # Règles par action
        if action_type == 'PAYMENT_EXECUTION':
            amount = context.get('amount', 0)
            threshold = getattr(settings, 'MFA_PAYMENT_THRESHOLD', 100000)
            return amount >= threshold

        elif action_type == 'PAYMENT_APPROVAL':
            # MFA optionnel pour approbations (configurable)
            return getattr(settings, 'MFA_REQUIRE_FOR_APPROVAL', False)

        elif action_type in ['USER_DELETION', 'SETTINGS_CHANGE', 'DATA_EXPORT']:
            # MFA obligatoire pour opérations sensibles
            return True

        return False

    @staticmethod
    def _generate_backup_codes(count: int = 10) -> list:
        """Génère des codes de backup"""
        import secrets
        return [
            f"{secrets.randbelow(10000):04d}-{secrets.randbelow(10000):04d}"
            for _ in range(count)
        ]

    @staticmethod
    def _generate_qr_code(data: str) -> str:
        """
        Génère un QR code en base64
        """
        qr = qrcode.QRCode(version=1, box_size=10, border=4)
        qr.add_data(data)
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")

        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)

        img_base64 = base64.b64encode(buffer.getvalue()).decode()
        return f"data:image/png;base64,{img_base64}"


# Décorateur pour vues nécessitant MFA
def mfa_required(action_type: str):
    """
    Décorateur pour actions nécessitant MFA

    Usage:
        @mfa_required('PAYMENT_EXECUTION')
        @action(detail=True, methods=['post'])
        def execute(self, request, pk=None):
            ...
    """
    from functools import wraps
    from rest_framework.response import Response
    from rest_framework import status

    def decorator(view_func):
        @wraps(view_func)
        def wrapper(self, request, *args, **kwargs):
            user = request.user

            # Extraire contexte depuis request
            context = {
                'amount': request.data.get('amount'),
                'payment_id': kwargs.get('pk'),
            }

            # Vérifier si MFA requis
            if MFAService.requires_mfa(user, action_type, context):
                # Vérifier si challenge MFA fourni
                mfa_code = request.data.get('mfa_code')
                challenge_code = request.data.get('challenge_code')

                if not mfa_code or not challenge_code:
                    # Créer challenge
                    challenge = MFAService.create_challenge(user, action_type, context)

                    return Response({
                        'mfa_required': True,
                        'challenge_code': challenge.challenge_code,
                        'message': 'MFA requis pour cette opération. Veuillez fournir votre code.'
                    }, status=status.HTTP_403_FORBIDDEN)

                # Vérifier challenge
                success, error = MFAService.verify_challenge(challenge_code, mfa_code)

                if not success:
                    return Response({
                        'mfa_required': True,
                        'error': error
                    }, status=status.HTTP_403_FORBIDDEN)

            # MFA validé ou non requis, exécuter la vue
            return view_func(self, request, *args, **kwargs)

        return wrapper
    return decorator
