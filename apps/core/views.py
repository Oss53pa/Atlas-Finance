"""
Core views for WiseBook
"""
from django.http import JsonResponse
from django.db import connection
from django.core.cache import cache
import sys


def healthcheck(request):
    """
    Healthcheck endpoint for monitoring and load balancers.
    Returns 200 OK if all systems are operational.
    Returns 503 Service Unavailable if any critical service is down.
    """
    status_code = 200
    health_status = {
        'status': 'healthy',
        'version': '3.0.0',
        'checks': {}
    }

    # Check database connectivity
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        health_status['checks']['database'] = {
            'status': 'ok',
            'message': 'Database connection successful'
        }
    except Exception as e:
        health_status['checks']['database'] = {
            'status': 'error',
            'message': str(e)
        }
        status_code = 503

    # Check Redis/Cache connectivity
    try:
        cache_key = 'healthcheck_test'
        cache.set(cache_key, 'ok', 10)
        cache_value = cache.get(cache_key)
        if cache_value == 'ok':
            health_status['checks']['cache'] = {
                'status': 'ok',
                'message': 'Cache (Redis) connection successful'
            }
        else:
            raise Exception('Cache write/read mismatch')
    except Exception as e:
        health_status['checks']['cache'] = {
            'status': 'error',
            'message': str(e)
        }
        # Cache is not critical, don't change status_code
        # status_code = 503

    # Python version
    health_status['python_version'] = sys.version

    # Overall status
    if status_code == 503:
        health_status['status'] = 'unhealthy'

    return JsonResponse(health_status, status=status_code)


def readiness(request):
    """
    Readiness probe - indicates if the app is ready to receive traffic.
    Used by Kubernetes and other orchestrators.
    """
    # Add any initialization checks here
    return JsonResponse({
        'status': 'ready',
        'message': 'Application is ready to serve requests'
    })


def liveness(request):
    """
    Liveness probe - indicates if the app is alive.
    Used by Kubernetes to determine if the pod should be restarted.
    """
    return JsonResponse({
        'status': 'alive',
        'message': 'Application is running'
    })


# ============================================
# Base ViewSet pour filtrage par société
# ============================================
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated


class BaseCompanyViewSet(viewsets.ModelViewSet):
    """
    ViewSet de base avec filtrage automatique par société.
    Toutes les vues avec données multi-sociétés héritent de cette classe.
    """

    def get_company(self):
        """
        Récupère la société de l'utilisateur connecté.
        """
        if hasattr(self.request.user, 'societe') and self.request.user.societe:
            return self.request.user.societe

        # Fallback: essayer de récupérer depuis les paramètres de requête
        company_id = self.request.query_params.get('company_id')
        if company_id:
            try:
                from apps.core.models import Societe
                return Societe.objects.get(id=company_id)
            except Exception:
                pass

        return None

    def get_queryset(self):
        """
        Filtre le queryset par société.
        """
        queryset = super().get_queryset()

        company = self.get_company()
        if company:
            # Essaie différents noms de champs pour le filtrage par société
            if hasattr(queryset.model, 'societe'):
                queryset = queryset.filter(societe=company)
            elif hasattr(queryset.model, 'company'):
                queryset = queryset.filter(company=company)

        return queryset

    def perform_create(self, serializer):
        """
        Associe automatiquement la société lors de la création.
        """
        company = self.get_company()

        # Détermine le nom du champ société dans le modèle
        model = serializer.Meta.model
        if hasattr(model, 'societe'):
            serializer.save(societe=company, created_by=self.request.user)
        elif hasattr(model, 'company'):
            serializer.save(company=company, created_by=self.request.user)
        else:
            serializer.save(created_by=self.request.user)
