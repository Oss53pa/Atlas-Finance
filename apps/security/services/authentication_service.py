from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, logout
from django.conf import settings
from django.utils import timezone
from django.core.cache import cache
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
import pyotp
import qrcode
import io
import base64
import hashlib
import json
import logging
import ipaddress

from ..models import (
    UserProfile, LoginAttempt, SecurityAuditLog, 
    MultiFactorAuth, SessionSecurity
)

logger = logging.getLogger(__name__)


class AuthenticationService:
    """
    Service d'authentification avancée et sécurité
    Implémentation EXN-SEC-001: Authentification Forte
    """
    
    def __init__(self):
        self.max_login_attempts = getattr(settings, 'MAX_LOGIN_ATTEMPTS', 5)
        self.lockout_duration = getattr(settings, 'LOCKOUT_DURATION_MINUTES', 30)
        self.session_timeout = getattr(settings, 'SESSION_TIMEOUT_MINUTES', 60)
        
    def authenticate_user(self, username: str, password: str, 
                         request_ip: str = None, user_agent: str = None,
                         totp_code: str = None) -> Dict[str, Any]:
        """
        Authentification complète avec MFA et contrôles de sécurité
        """
        # 1. Vérifications préliminaires
        security_checks = self._verify_security_constraints(username, request_ip)
        if not security_checks['allowed']:
            return {
                'success': False,
                'error': security_checks['reason'],
                'locked_until': security_checks.get('locked_until')
            }
        
        # 2. Authentification de base
        user = authenticate(username=username, password=password)
        
        if not user:
            self._log_failed_attempt(username, request_ip, 'INVALID_CREDENTIALS', user_agent)
            return {
                'success': False,
                'error': 'Nom d\'utilisateur ou mot de passe incorrect',
                'attempts_remaining': self._get_remaining_attempts(username, request_ip)
            }
        
        # 3. Vérifications utilisateur actif
        if not user.is_active:
            self._log_failed_attempt(username, request_ip, 'ACCOUNT_DISABLED', user_agent)
            return {
                'success': False,
                'error': 'Compte désactivé'
            }
        
        # 4. Vérification MFA si activé
        user_profile = UserProfile.objects.filter(user=user).first()
        if user_profile and user_profile.mfa_enabled:
            mfa_result = self._verify_mfa(user, totp_code)
            if not mfa_result['valid']:
                self._log_failed_attempt(username, request_ip, 'MFA_FAILED', user_agent)
                return {
                    'success': False,
                    'error': 'Code d\'authentification à deux facteurs invalide',
                    'mfa_required': True
                }
        
        # 5. Authentification réussie
        self._log_successful_login(user, request_ip, user_agent)
        self._reset_failed_attempts(username, request_ip)
        
        # 6. Créer/mettre à jour la session sécurisée
        session_token = self._create_secure_session(user, request_ip, user_agent)
        
        return {
            'success': True,
            'user': user,
            'session_token': session_token,
            'mfa_required': user_profile.mfa_enabled if user_profile else False,
            'user_profile': user_profile
        }
    
    def _verify_security_constraints(self, username: str, request_ip: str) -> Dict[str, Any]:
        """
        Vérifie les contraintes de sécurité avant authentification
        """
        # 1. Vérifier le verrouillage par IP
        ip_lockout = self._check_ip_lockout(request_ip)
        if ip_lockout['locked']:
            return {
                'allowed': False,
                'reason': f'Adresse IP temporairement bloquée ({ip_lockout["attempts"]} tentatives)',
                'locked_until': ip_lockout['locked_until']
            }
        
        # 2. Vérifier le verrouillage par utilisateur
        user_lockout = self._check_user_lockout(username)
        if user_lockout['locked']:
            return {
                'allowed': False,
                'reason': f'Compte temporairement verrouillé ({user_lockout["attempts"]} tentatives)',
                'locked_until': user_lockout['locked_until']
            }
        
        # 3. Vérifier les restrictions géographiques (optionnel)
        geo_check = self._check_geographic_restrictions(request_ip)
        if not geo_check['allowed']:
            return {
                'allowed': False,
                'reason': 'Connexion depuis une région non autorisée'
            }
        
        return {'allowed': True}\n    \n    def _check_ip_lockout(self, ip_address: str) -> Dict[str, Any]:\n        \"\"\"Vérifie si l'IP est verrouillée\"\"\"\n        if not ip_address:\n            return {'locked': False}\n        \n        cache_key = f'failed_attempts_ip_{ip_address}'\n        attempts_data = cache.get(cache_key, {'count': 0, 'first_attempt': None})\n        \n        if attempts_data['count'] >= self.max_login_attempts:\n            lockout_time = attempts_data['first_attempt'] + timedelta(minutes=self.lockout_duration)\n            if timezone.now() < lockout_time:\n                return {\n                    'locked': True,\n                    'attempts': attempts_data['count'],\n                    'locked_until': lockout_time\n                }\n            else:\n                # Période de verrouillage expirée\n                cache.delete(cache_key)\n        \n        return {'locked': False}\n    \n    def _check_user_lockout(self, username: str) -> Dict[str, Any]:\n        \"\"\"Vérifie si l'utilisateur est verrouillé\"\"\"\n        cache_key = f'failed_attempts_user_{username}'\n        attempts_data = cache.get(cache_key, {'count': 0, 'first_attempt': None})\n        \n        if attempts_data['count'] >= self.max_login_attempts:\n            lockout_time = attempts_data['first_attempt'] + timedelta(minutes=self.lockout_duration)\n            if timezone.now() < lockout_time:\n                return {\n                    'locked': True,\n                    'attempts': attempts_data['count'],\n                    'locked_until': lockout_time\n                }\n            else:\n                cache.delete(cache_key)\n        \n        return {'locked': False}\n    \n    def _check_geographic_restrictions(self, ip_address: str) -> Dict[str, Any]:\n        \"\"\"Vérifie les restrictions géographiques\"\"\"\n        # Implémentation simple - peut être étendue avec des services de géolocalisation\n        # Pour l'instant, on accepte toutes les connexions\n        return {'allowed': True}\n    \n    def _verify_mfa(self, user: User, totp_code: str) -> Dict[str, Any]:\n        \"\"\"Vérifie le code TOTP pour l'authentification à deux facteurs\"\"\"\n        if not totp_code:\n            return {'valid': False, 'reason': 'Code TOTP requis'}\n        \n        try:\n            mfa_record = MultiFactorAuth.objects.get(user=user, is_active=True)\n            totp = pyotp.TOTP(mfa_record.secret_key)\n            \n            # Vérifier le code avec une fenêtre de tolérance\n            is_valid = totp.verify(totp_code, valid_window=1)\n            \n            if is_valid:\n                # Mettre à jour la dernière utilisation\n                mfa_record.last_used = timezone.now()\n                mfa_record.save(update_fields=['last_used'])\n                \n                return {'valid': True}\n            else:\n                return {'valid': False, 'reason': 'Code TOTP invalide'}\n                \n        except MultiFactorAuth.DoesNotExist:\n            return {'valid': False, 'reason': 'MFA non configuré'}\n        except Exception as e:\n            logger.error(f'Erreur vérification MFA pour {user.username}: {str(e)}')\n            return {'valid': False, 'reason': 'Erreur technique MFA'}\n    \n    def setup_totp_mfa(self, user: User, app_name: str = \"WiseBook\") -> Dict[str, Any]:\n        \"\"\"Configure l'authentification TOTP pour un utilisateur\"\"\"\n        try:\n            # Générer une clé secrète unique\n            secret_key = pyotp.random_base32()\n            \n            # Créer l'enregistrement MFA\n            mfa_record, created = MultiFactorAuth.objects.get_or_create(\n                user=user,\n                defaults={\n                    'secret_key': secret_key,\n                    'backup_codes': self._generate_backup_codes(),\n                    'is_active': False  # Sera activé après vérification\n                }\n            )\n            \n            if not created:\n                # Régénérer la clé si elle existe déjà\n                mfa_record.secret_key = secret_key\n                mfa_record.backup_codes = self._generate_backup_codes()\n                mfa_record.save()\n            \n            # Générer le QR code\n            totp = pyotp.TOTP(secret_key)\n            qr_uri = totp.provisioning_uri(\n                name=user.email or user.username,\n                issuer_name=app_name\n            )\n            \n            # Créer le QR code image\n            qr_code_image = self._generate_qr_code_image(qr_uri)\n            \n            return {\n                'success': True,\n                'secret_key': secret_key,\n                'qr_code_uri': qr_uri,\n                'qr_code_image': qr_code_image,\n                'backup_codes': mfa_record.backup_codes\n            }\n            \n        except Exception as e:\n            logger.error(f'Erreur configuration TOTP pour {user.username}: {str(e)}')\n            return {\n                'success': False,\n                'error': 'Erreur lors de la configuration MFA'\n            }\n    \n    def verify_and_activate_mfa(self, user: User, totp_code: str) -> Dict[str, Any]:\n        \"\"\"Vérifie et active le MFA pour un utilisateur\"\"\"\n        try:\n            mfa_record = MultiFactorAuth.objects.get(user=user)\n            \n            # Vérifier le code TOTP\n            totp = pyotp.TOTP(mfa_record.secret_key)\n            if totp.verify(totp_code, valid_window=1):\n                mfa_record.is_active = True\n                mfa_record.activated_at = timezone.now()\n                mfa_record.save()\n                \n                # Mettre à jour le profil utilisateur\n                user_profile, _ = UserProfile.objects.get_or_create(user=user)\n                user_profile.mfa_enabled = True\n                user_profile.save()\n                \n                self._log_security_event(user, 'MFA_ACTIVATED', 'MFA activé avec succès')\n                \n                return {'success': True, 'message': 'MFA activé avec succès'}\n            else:\n                return {'success': False, 'error': 'Code de vérification invalide'}\n                \n        except MultiFactorAuth.DoesNotExist:\n            return {'success': False, 'error': 'Configuration MFA non trouvée'}\n    \n    def disable_mfa(self, user: User, current_password: str) -> Dict[str, Any]:\n        \"\"\"Désactive le MFA après vérification du mot de passe\"\"\"\n        # Vérifier le mot de passe actuel\n        if not user.check_password(current_password):\n            return {'success': False, 'error': 'Mot de passe incorrect'}\n        \n        try:\n            mfa_record = MultiFactorAuth.objects.get(user=user)\n            mfa_record.is_active = False\n            mfa_record.save()\n            \n            # Mettre à jour le profil utilisateur\n            user_profile = UserProfile.objects.get(user=user)\n            user_profile.mfa_enabled = False\n            user_profile.save()\n            \n            self._log_security_event(user, 'MFA_DISABLED', 'MFA désactivé')\n            \n            return {'success': True, 'message': 'MFA désactivé avec succès'}\n            \n        except (MultiFactorAuth.DoesNotExist, UserProfile.DoesNotExist):\n            return {'success': False, 'error': 'Configuration MFA non trouvée'}\n    \n    def _generate_backup_codes(self, count: int = 10) -> List[str]:\n        \"\"\"Génère des codes de secours pour le MFA\"\"\"\n        codes = []\n        for _ in range(count):\n            # Code à 8 chiffres\n            code = f\"{pyotp.random_base32()[:8]}\"\n            codes.append(code)\n        return codes\n    \n    def _generate_qr_code_image(self, uri: str) -> str:\n        \"\"\"Génère une image QR code en base64\"\"\"\n        qr = qrcode.QRCode(version=1, box_size=10, border=5)\n        qr.add_data(uri)\n        qr.make(fit=True)\n        \n        img = qr.make_image(fill_color=\"black\", back_color=\"white\")\n        \n        # Convertir en base64\n        buffer = io.BytesIO()\n        img.save(buffer, format='PNG')\n        img_base64 = base64.b64encode(buffer.getvalue()).decode()\n        \n        return f\"data:image/png;base64,{img_base64}\"\n    \n    def _create_secure_session(self, user: User, ip_address: str, user_agent: str) -> str:\n        \"\"\"Crée une session sécurisée avec token\"\"\"\n        # Générer un token de session unique\n        session_data = f\"{user.id}:{timezone.now().timestamp()}:{ip_address}\"\n        session_token = hashlib.sha256(session_data.encode()).hexdigest()\n        \n        # Enregistrer la session\n        SessionSecurity.objects.create(\n            user=user,\n            session_token=session_token,\n            ip_address=ip_address,\n            user_agent=user_agent[:500],  # Limiter la longueur\n            expires_at=timezone.now() + timedelta(minutes=self.session_timeout)\n        )\n        \n        return session_token\n    \n    def validate_session(self, session_token: str, ip_address: str = None) -> Dict[str, Any]:\n        \"\"\"Valide une session existante\"\"\"\n        try:\n            session = SessionSecurity.objects.get(\n                session_token=session_token,\n                is_active=True,\n                expires_at__gt=timezone.now()\n            )\n            \n            # Vérifier l'IP si fournie (optionnel selon la configuration)\n            if ip_address and session.ip_address != ip_address:\n                # Log suspicious activity\n                self._log_security_event(\n                    session.user, \n                    'SESSION_IP_MISMATCH',\n                    f'Changement d\\'IP détecté: {session.ip_address} -> {ip_address}'\n                )\n                \n                # Selon la politique, on peut invalider la session ou juste alerter\n                # Pour l'instant, on alerte mais on continue\n            \n            # Prolonger la session si elle est valide\n            session.expires_at = timezone.now() + timedelta(minutes=self.session_timeout)\n            session.last_activity = timezone.now()\n            session.save()\n            \n            return {\n                'valid': True,\n                'user': session.user,\n                'session': session\n            }\n            \n        except SessionSecurity.DoesNotExist:\n            return {\n                'valid': False,\n                'reason': 'Session invalide ou expirée'\n            }\n    \n    def terminate_session(self, session_token: str) -> bool:\n        \"\"\"Termine une session spécifique\"\"\"\n        try:\n            session = SessionSecurity.objects.get(session_token=session_token)\n            session.is_active = False\n            session.terminated_at = timezone.now()\n            session.save()\n            \n            self._log_security_event(\n                session.user,\n                'SESSION_TERMINATED',\n                'Session terminée manuellement'\n            )\n            \n            return True\n        except SessionSecurity.DoesNotExist:\n            return False\n    \n    def terminate_all_user_sessions(self, user: User, except_token: str = None) -> int:\n        \"\"\"Termine toutes les sessions d'un utilisateur\"\"\"\n        sessions = SessionSecurity.objects.filter(\n            user=user,\n            is_active=True\n        )\n        \n        if except_token:\n            sessions = sessions.exclude(session_token=except_token)\n        \n        count = sessions.count()\n        sessions.update(\n            is_active=False,\n            terminated_at=timezone.now()\n        )\n        \n        self._log_security_event(\n            user,\n            'ALL_SESSIONS_TERMINATED',\n            f'{count} session(s) terminée(s)'\n        )\n        \n        return count\n    \n    def _log_failed_attempt(self, username: str, ip_address: str, \n                           reason: str, user_agent: str = None):\n        \"\"\"Enregistre une tentative de connexion échouée\"\"\"\n        # Enregistrer dans la base\n        LoginAttempt.objects.create(\n            username=username,\n            ip_address=ip_address,\n            user_agent=user_agent,\n            success=False,\n            failure_reason=reason\n        )\n        \n        # Incrémenter les compteurs en cache\n        self._increment_failed_attempts(username, ip_address)\n    \n    def _log_successful_login(self, user: User, ip_address: str, user_agent: str = None):\n        \"\"\"Enregistre une connexion réussie\"\"\"\n        LoginAttempt.objects.create(\n            username=user.username,\n            user=user,\n            ip_address=ip_address,\n            user_agent=user_agent,\n            success=True\n        )\n        \n        self._log_security_event(\n            user,\n            'LOGIN_SUCCESS',\n            f'Connexion réussie depuis {ip_address}'\n        )\n    \n    def _increment_failed_attempts(self, username: str, ip_address: str):\n        \"\"\"Incrémente les compteurs de tentatives échouées\"\"\"\n        now = timezone.now()\n        \n        # Compteur par utilisateur\n        user_key = f'failed_attempts_user_{username}'\n        user_data = cache.get(user_key, {'count': 0, 'first_attempt': now})\n        user_data['count'] += 1\n        if user_data['count'] == 1:\n            user_data['first_attempt'] = now\n        cache.set(user_key, user_data, timeout=self.lockout_duration * 60)\n        \n        # Compteur par IP\n        if ip_address:\n            ip_key = f'failed_attempts_ip_{ip_address}'\n            ip_data = cache.get(ip_key, {'count': 0, 'first_attempt': now})\n            ip_data['count'] += 1\n            if ip_data['count'] == 1:\n                ip_data['first_attempt'] = now\n            cache.set(ip_key, ip_data, timeout=self.lockout_duration * 60)\n    \n    def _reset_failed_attempts(self, username: str, ip_address: str):\n        \"\"\"Remet à zéro les compteurs après une connexion réussie\"\"\"\n        cache.delete(f'failed_attempts_user_{username}')\n        if ip_address:\n            cache.delete(f'failed_attempts_ip_{ip_address}')\n    \n    def _get_remaining_attempts(self, username: str, ip_address: str) -> int:\n        \"\"\"Calcule le nombre de tentatives restantes\"\"\"\n        user_data = cache.get(f'failed_attempts_user_{username}', {'count': 0})\n        ip_data = cache.get(f'failed_attempts_ip_{ip_address}', {'count': 0}) if ip_address else {'count': 0}\n        \n        max_attempts_user = max(0, self.max_login_attempts - user_data['count'])\n        max_attempts_ip = max(0, self.max_login_attempts - ip_data['count'])\n        \n        return min(max_attempts_user, max_attempts_ip)\n    \n    def _log_security_event(self, user: User, event_type: str, description: str, \n                           ip_address: str = None, metadata: Dict = None):\n        \"\"\"Enregistre un événement de sécurité\"\"\"\n        SecurityAuditLog.objects.create(\n            user=user,\n            event_type=event_type,\n            description=description,\n            ip_address=ip_address,\n            metadata=metadata or {}\n        )\n    \n    def get_user_sessions(self, user: User) -> List[Dict[str, Any]]:\n        \"\"\"Retourne toutes les sessions actives d'un utilisateur\"\"\"\n        sessions = SessionSecurity.objects.filter(\n            user=user,\n            is_active=True,\n            expires_at__gt=timezone.now()\n        ).order_by('-last_activity')\n        \n        session_list = []\n        for session in sessions:\n            session_list.append({\n                'token': session.session_token[:16] + '...',  # Masquer le token complet\n                'ip_address': session.ip_address,\n                'user_agent': session.user_agent,\n                'created_at': session.created_at,\n                'last_activity': session.last_activity,\n                'expires_at': session.expires_at,\n                'is_current': False  # À déterminer côté frontend\n            })\n        \n        return session_list\n    \n    def get_recent_login_attempts(self, user: User, days: int = 30) -> List[Dict[str, Any]]:\n        \"\"\"Retourne les tentatives de connexion récentes d'un utilisateur\"\"\"\n        since_date = timezone.now() - timedelta(days=days)\n        \n        attempts = LoginAttempt.objects.filter(\n            user=user,\n            timestamp__gte=since_date\n        ).order_by('-timestamp')\n        \n        return [{\n            'timestamp': attempt.timestamp,\n            'ip_address': attempt.ip_address,\n            'user_agent': attempt.user_agent,\n            'success': attempt.success,\n            'failure_reason': attempt.failure_reason\n        } for attempt in attempts]\n    \n    def cleanup_expired_sessions(self) -> int:\n        \"\"\"Nettoie les sessions expirées\"\"\"\n        expired_count = SessionSecurity.objects.filter(\n            expires_at__lt=timezone.now()\n        ).update(\n            is_active=False,\n            terminated_at=timezone.now()\n        )\n        \n        logger.info(f'Nettoyage: {expired_count} session(s) expirée(s) supprimée(s)')\n        return expired_count