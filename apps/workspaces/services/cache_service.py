"""
Service de cache pour le module Workspaces
Utilise Redis pour optimiser les performances
"""
from django.core.cache import cache
from django.conf import settings
from typing import Optional, Any, Dict
import json
from datetime import timedelta


class WorkspaceCacheService:
    """Service de gestion du cache pour les workspaces"""

    # Préfixes de clés
    PREFIX_WORKSPACE = 'workspace'
    PREFIX_DASHBOARD = 'dashboard'
    PREFIX_STATISTICS = 'statistics'
    PREFIX_WIDGETS = 'widgets'
    PREFIX_ACTIONS = 'actions'

    # Durées de cache par défaut (en secondes)
    CACHE_WORKSPACE = 3600  # 1 heure
    CACHE_DASHBOARD = 300   # 5 minutes
    CACHE_STATISTICS = 180  # 3 minutes
    CACHE_WIDGETS = 600     # 10 minutes
    CACHE_ACTIONS = 600     # 10 minutes

    @staticmethod
    def _make_key(*parts: str) -> str:
        """Génère une clé de cache unique"""
        return ':'.join(str(part) for part in parts)

    @classmethod
    def get_workspace(cls, workspace_id: str) -> Optional[Dict]:
        """Récupère un workspace depuis le cache"""
        key = cls._make_key(cls.PREFIX_WORKSPACE, workspace_id)
        return cache.get(key)

    @classmethod
    def set_workspace(cls, workspace_id: str, data: Dict, timeout: Optional[int] = None) -> bool:
        """Stocke un workspace dans le cache"""
        key = cls._make_key(cls.PREFIX_WORKSPACE, workspace_id)
        timeout = timeout or cls.CACHE_WORKSPACE
        return cache.set(key, data, timeout)

    @classmethod
    def get_workspace_by_role(cls, role: str) -> Optional[Dict]:
        """Récupère un workspace par rôle depuis le cache"""
        key = cls._make_key(cls.PREFIX_WORKSPACE, 'role', role)
        return cache.get(key)

    @classmethod
    def set_workspace_by_role(cls, role: str, data: Dict, timeout: Optional[int] = None) -> bool:
        """Stocke un workspace par rôle dans le cache"""
        key = cls._make_key(cls.PREFIX_WORKSPACE, 'role', role)
        timeout = timeout or cls.CACHE_WORKSPACE
        return cache.set(key, data, timeout)

    @classmethod
    def get_dashboard(cls, workspace_id: str, user_id: Optional[str] = None) -> Optional[Dict]:
        """Récupère un dashboard depuis le cache"""
        parts = [cls.PREFIX_DASHBOARD, workspace_id]
        if user_id:
            parts.append(f'user_{user_id}')
        key = cls._make_key(*parts)
        return cache.get(key)

    @classmethod
    def set_dashboard(
        cls,
        workspace_id: str,
        data: Dict,
        user_id: Optional[str] = None,
        timeout: Optional[int] = None
    ) -> bool:
        """Stocke un dashboard dans le cache"""
        parts = [cls.PREFIX_DASHBOARD, workspace_id]
        if user_id:
            parts.append(f'user_{user_id}')
        key = cls._make_key(*parts)
        timeout = timeout or cls.CACHE_DASHBOARD
        return cache.set(key, data, timeout)

    @classmethod
    def get_statistics(cls, workspace_id: str) -> Optional[list]:
        """Récupère les statistiques depuis le cache"""
        key = cls._make_key(cls.PREFIX_STATISTICS, workspace_id)
        return cache.get(key)

    @classmethod
    def set_statistics(cls, workspace_id: str, data: list, timeout: Optional[int] = None) -> bool:
        """Stocke les statistiques dans le cache"""
        key = cls._make_key(cls.PREFIX_STATISTICS, workspace_id)
        timeout = timeout or cls.CACHE_STATISTICS
        return cache.set(key, data, timeout)

    @classmethod
    def get_widgets(cls, workspace_id: str) -> Optional[list]:
        """Récupère les widgets depuis le cache"""
        key = cls._make_key(cls.PREFIX_WIDGETS, workspace_id)
        return cache.get(key)

    @classmethod
    def set_widgets(cls, workspace_id: str, data: list, timeout: Optional[int] = None) -> bool:
        """Stocke les widgets dans le cache"""
        key = cls._make_key(cls.PREFIX_WIDGETS, workspace_id)
        timeout = timeout or cls.CACHE_WIDGETS
        return cache.set(key, data, timeout)

    @classmethod
    def get_quick_actions(cls, workspace_id: str) -> Optional[list]:
        """Récupère les actions rapides depuis le cache"""
        key = cls._make_key(cls.PREFIX_ACTIONS, workspace_id)
        return cache.get(key)

    @classmethod
    def set_quick_actions(cls, workspace_id: str, data: list, timeout: Optional[int] = None) -> bool:
        """Stocke les actions rapides dans le cache"""
        key = cls._make_key(cls.PREFIX_ACTIONS, workspace_id)
        timeout = timeout or cls.CACHE_ACTIONS
        return cache.set(key, data, timeout)

    @classmethod
    def invalidate_workspace(cls, workspace_id: str) -> None:
        """Invalide tous les caches liés à un workspace"""
        keys = [
            cls._make_key(cls.PREFIX_WORKSPACE, workspace_id),
            cls._make_key(cls.PREFIX_DASHBOARD, workspace_id),
            cls._make_key(cls.PREFIX_STATISTICS, workspace_id),
            cls._make_key(cls.PREFIX_WIDGETS, workspace_id),
            cls._make_key(cls.PREFIX_ACTIONS, workspace_id),
        ]
        cache.delete_many(keys)

    @classmethod
    def invalidate_user_dashboard(cls, workspace_id: str, user_id: str) -> None:
        """Invalide le cache du dashboard d'un utilisateur spécifique"""
        key = cls._make_key(cls.PREFIX_DASHBOARD, workspace_id, f'user_{user_id}')
        cache.delete(key)

    @classmethod
    def invalidate_all_workspaces(cls) -> None:
        """Invalide tous les caches workspace (à utiliser avec précaution)"""
        # Note: Nécessite Redis pour un clear par pattern
        # Pour Django cache backend simple, on peut stocker les clés
        cache.clear()  # Attention: efface TOUT le cache!

    @classmethod
    def get_cache_stats(cls) -> Dict[str, Any]:
        """Récupère les statistiques du cache (si disponible avec Redis)"""
        try:
            # Tentative d'obtenir des stats Redis
            from django_redis import get_redis_connection
            redis_conn = get_redis_connection("default")
            info = redis_conn.info()

            return {
                'backend': 'Redis',
                'used_memory': info.get('used_memory_human', 'N/A'),
                'connected_clients': info.get('connected_clients', 0),
                'total_keys': redis_conn.dbsize(),
                'hits': info.get('keyspace_hits', 0),
                'misses': info.get('keyspace_misses', 0),
                'hit_rate': cls._calculate_hit_rate(
                    info.get('keyspace_hits', 0),
                    info.get('keyspace_misses', 0)
                )
            }
        except Exception:
            return {
                'backend': 'Django Cache',
                'message': 'Stats not available for this backend'
            }

    @staticmethod
    def _calculate_hit_rate(hits: int, misses: int) -> str:
        """Calcule le taux de hit du cache"""
        total = hits + misses
        if total == 0:
            return '0%'
        rate = (hits / total) * 100
        return f'{rate:.2f}%'


# Instance singleton pour faciliter l'utilisation
workspace_cache = WorkspaceCacheService()
