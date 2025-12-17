"""
Mixins pour optimiser les ViewSets avec cache
"""
from rest_framework.response import Response
from .services.cache_service import workspace_cache


class CachedWorkspaceMixin:
    """Mixin pour ajouter le cache aux viewsets workspace"""

    def retrieve(self, request, *args, **kwargs):
        """Retrieve avec cache"""
        workspace_id = kwargs.get('pk')

        # Essayer de récupérer depuis le cache
        cached_data = workspace_cache.get_workspace(workspace_id)
        if cached_data:
            return Response(cached_data)

        # Si pas en cache, récupérer depuis la DB
        response = super().retrieve(request, *args, **kwargs)

        # Mettre en cache
        if response.status_code == 200:
            workspace_cache.set_workspace(workspace_id, response.data)

        return response

    def list(self, request, *args, **kwargs):
        """List sans cache (pour avoir données fraîches)"""
        return super().list(request, *args, **kwargs)

    def perform_update(self, serializer):
        """Invalider le cache après update"""
        super().perform_update(serializer)
        workspace_cache.invalidate_workspace(str(serializer.instance.id))

    def perform_destroy(self, instance):
        """Invalider le cache après delete"""
        workspace_cache.invalidate_workspace(str(instance.id))
        super().perform_destroy(instance)


class CachedDashboardMixin:
    """Mixin pour le cache du dashboard"""

    def get_cached_dashboard(self, workspace_id, user_id=None):
        """Récupère le dashboard depuis le cache"""
        return workspace_cache.get_dashboard(workspace_id, user_id)

    def cache_dashboard(self, workspace_id, data, user_id=None):
        """Met le dashboard en cache"""
        workspace_cache.set_dashboard(workspace_id, data, user_id)

    def invalidate_dashboard_cache(self, workspace_id, user_id=None):
        """Invalide le cache du dashboard"""
        if user_id:
            workspace_cache.invalidate_user_dashboard(workspace_id, user_id)
        else:
            workspace_cache.invalidate_workspace(workspace_id)
