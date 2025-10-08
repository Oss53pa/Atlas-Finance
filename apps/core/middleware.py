"""
Custom middleware for WiseBook
"""
from django.utils.deprecation import MiddlewareMixin
import logging

logger = logging.getLogger(__name__)


class AuditMiddleware(MiddlewareMixin):
    """
    Middleware for auditing requests.
    """
    def process_request(self, request):
        # Log API requests
        if request.path.startswith('/api/'):
            logger.info(f"{request.method} {request.path} - User: {request.user}")
        return None


class TenantMiddleware(MiddlewareMixin):
    """
    Middleware for multi-tenant support.
    """
    def process_request(self, request):
        # Add tenant context to request
        # This will be implemented based on user's company
        return None
