"""
WiseBook Treasury - Advanced Rate Limiting
Throttling intelligent avec règles graduées selon criticité
"""

from rest_framework.throttling import UserRateThrottle, AnonRateThrottle
from django.core.cache import cache
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class TreasuryBaseThrottle(UserRateThrottle):
    """
    Throttle de base pour Treasury avec logging avancé
    """

    def throttle_failure(self):
        """Log des dépassements de limite"""
        logger.warning(
            f"Rate limit exceeded for {self.get_ident()}",
            extra={
                'scope': self.scope,
                'rate': self.rate,
                'ident': self.get_ident()
            }
        )
        return super().throttle_failure()


class TreasuryReadThrottle(TreasuryBaseThrottle):
    """
    Throttle pour lectures (GET, HEAD, OPTIONS)
    Limite: 1000 requêtes/heure par utilisateur
    """
    scope = 'treasury_read'
    rate = '1000/hour'


class TreasuryWriteThrottle(TreasuryBaseThrottle):
    """
    Throttle pour écritures (POST, PUT, PATCH, DELETE)
    Limite: 200 requêtes/heure par utilisateur
    """
    scope = 'treasury_write'
    rate = '200/hour'


class PaymentExecutionThrottle(TreasuryBaseThrottle):
    """
    Throttle strict pour exécution de paiements
    Limite: 50 exécutions/heure par utilisateur
    Protection contre abus et erreurs de masse
    """
    scope = 'payment_execution'
    rate = '50/hour'

    def allow_request(self, request, view):
        # Appliquer uniquement sur l'action 'execute'
        if hasattr(view, 'action') and view.action == 'execute':
            allowed = super().allow_request(request, view)

            if not allowed:
                logger.critical(
                    f"Payment execution throttled for user {request.user.id}",
                    extra={
                        'user_id': request.user.id,
                        'company_id': getattr(request.user, 'company_id', None),
                        'rate': self.rate
                    }
                )

            return allowed

        # Ne pas throttler les autres actions
        return True


class PaymentApprovalThrottle(TreasuryBaseThrottle):
    """
    Throttle pour approbations de paiements
    Limite: 100 approbations/heure
    """
    scope = 'payment_approval'
    rate = '100/hour'

    def allow_request(self, request, view):
        if hasattr(view, 'action') and view.action in ['approve', 'reject']:
            return super().allow_request(request, view)
        return True


class BankSyncThrottle(TreasuryBaseThrottle):
    """
    Throttle pour synchronisations bancaires
    Limite: 30 syncs/heure (protection API bancaires)
    """
    scope = 'bank_sync'
    rate = '30/hour'

    def allow_request(self, request, view):
        if hasattr(view, 'action') and view.action == 'sync':
            return super().allow_request(request, view)
        return True


class ReportGenerationThrottle(TreasuryBaseThrottle):
    """
    Throttle pour génération de rapports
    Limite: 20 rapports/heure (opérations CPU-intensive)
    """
    scope = 'report_generation'
    rate = '20/hour'


class AnonTreasuryThrottle(AnonRateThrottle):
    """
    Throttle très strict pour utilisateurs anonymes
    Limite: 10 requêtes/heure
    """
    scope = 'anon_treasury'
    rate = '10/hour'


class IPBasedThrottle(UserRateThrottle):
    """
    Throttle basé sur l'IP pour détecter les abus
    Limite: 5000 requêtes/jour par IP
    """
    scope = 'ip_based'
    rate = '5000/day'

    def get_cache_key(self, request, view):
        """Utiliser l'IP au lieu de l'utilisateur"""
        if request.user.is_authenticated:
            ident = request.user.pk
        else:
            ident = self.get_ident(request)

        return f'throttle_{self.scope}_{ident}'


# ============================================================================
# Throttling Gradué (Burst + Sustained)
# ============================================================================

class BurstRateThrottle(TreasuryBaseThrottle):
    """
    Throttle pour pics courts
    Limite: 100 requêtes/minute (burst)
    """
    scope = 'burst'
    rate = '100/minute'


class SustainedRateThrottle(TreasuryBaseThrottle):
    """
    Throttle pour utilisation soutenue
    Limite: 2000 requêtes/heure (sustained)
    """
    scope = 'sustained'
    rate = '2000/hour'


# ============================================================================
# Throttling Adaptatif (selon niveau utilisateur)
# ============================================================================

class AdaptiveUserThrottle(UserRateThrottle):
    """
    Throttle adaptatif selon le rôle utilisateur

    Limites:
    - Administrateur: 10000/hour
    - Trésorier: 5000/hour
    - Comptable: 3000/hour
    - Utilisateur standard: 1000/hour
    """

    def get_rate(self):
        """Détermine le rate selon le rôle"""
        if not hasattr(self, 'request'):
            return '1000/hour'  # Default

        user = self.request.user

        if not user.is_authenticated:
            return '10/hour'

        # Administrateur
        if user.is_superuser or user.is_staff:
            return '10000/hour'

        # Vérifier les permissions Treasury
        if user.has_perm('treasury.execute_payment'):
            return '5000/hour'  # Trésorier

        if user.has_perm('treasury.approve_payment'):
            return '3000/hour'  # Approbateur

        return '1000/hour'  # Utilisateur standard

    def allow_request(self, request, view):
        """Injecte la requête pour accéder à l'utilisateur"""
        self.request = request
        self.rate = self.parse_rate(self.get_rate())
        self.num_requests, self.duration = self.rate
        return super().allow_request(request, view)


# ============================================================================
# Throttling par Endpoint (Customisable via Settings)
# ============================================================================

class ConfigurableThrottle(UserRateThrottle):
    """
    Throttle configurable via settings Django

    Settings exemple:
    TREASURY_THROTTLE_RATES = {
        'payment_create': '100/hour',
        'payment_list': '1000/hour',
        'dashboard': '500/hour',
    }
    """

    def get_rate(self):
        """Récupère le rate depuis settings"""
        if not hasattr(self, 'view') or not hasattr(self.view, 'action'):
            return '1000/hour'

        action = self.view.action
        throttle_rates = getattr(settings, 'TREASURY_THROTTLE_RATES', {})

        return throttle_rates.get(action, '1000/hour')

    def allow_request(self, request, view):
        """Injecte la view pour accéder à l'action"""
        self.view = view
        self.rate = self.parse_rate(self.get_rate())
        self.num_requests, self.duration = self.rate
        return super().allow_request(request, view)


# ============================================================================
# Throttling avec Whitelist IP
# ============================================================================

class WhitelistIPThrottle(UserRateThrottle):
    """
    Throttle avec whitelist d'IPs (pour partenaires, monitoring, etc.)

    Settings:
    THROTTLE_WHITELIST_IPS = ['10.0.0.1', '192.168.1.100']
    """

    def allow_request(self, request, view):
        """Bypass throttle pour IPs whitelistées"""
        whitelist = getattr(settings, 'THROTTLE_WHITELIST_IPS', [])

        client_ip = self.get_ident(request)

        if client_ip in whitelist:
            logger.debug(f"Throttle bypassed for whitelisted IP: {client_ip}")
            return True

        return super().allow_request(request, view)


# ============================================================================
# Utilitaires
# ============================================================================

def get_throttle_stats(user_id: int) -> dict:
    """
    Récupère les statistiques de throttling pour un utilisateur

    Returns:
        {
            'treasury_read': {'remaining': 800, 'limit': 1000},
            'treasury_write': {'remaining': 150, 'limit': 200},
            'payment_execution': {'remaining': 45, 'limit': 50}
        }
    """
    scopes = [
        'treasury_read',
        'treasury_write',
        'payment_execution',
        'payment_approval',
        'bank_sync',
        'report_generation'
    ]

    stats = {}

    for scope in scopes:
        cache_key = f'throttle_{scope}_{user_id}'
        history = cache.get(cache_key, [])

        # Déterminer la limite pour ce scope
        throttle_class = {
            'treasury_read': TreasuryReadThrottle,
            'treasury_write': TreasuryWriteThrottle,
            'payment_execution': PaymentExecutionThrottle,
            'payment_approval': PaymentApprovalThrottle,
            'bank_sync': BankSyncThrottle,
            'report_generation': ReportGenerationThrottle
        }.get(scope)

        if throttle_class:
            throttle = throttle_class()
            num_requests, duration = throttle.parse_rate(throttle.rate)

            stats[scope] = {
                'remaining': max(0, num_requests - len(history)),
                'limit': num_requests,
                'duration': duration,
                'current_usage': len(history)
            }

    return stats


def reset_throttle(user_id: int, scope: str = None):
    """
    Reset le throttle pour un utilisateur (admin only)

    Args:
        user_id: ID utilisateur
        scope: Scope spécifique ou None pour tous
    """
    if scope:
        cache_key = f'throttle_{scope}_{user_id}'
        cache.delete(cache_key)
        logger.info(f"Throttle reset for user {user_id}, scope {scope}")
    else:
        # Reset tous les scopes
        scopes = [
            'treasury_read', 'treasury_write', 'payment_execution',
            'payment_approval', 'bank_sync', 'report_generation'
        ]
        for s in scopes:
            cache_key = f'throttle_{s}_{user_id}'
            cache.delete(cache_key)

        logger.info(f"All throttles reset for user {user_id}")
