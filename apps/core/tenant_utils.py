"""
Utility functions and mixins for multi-tenant support
"""
from django.core.exceptions import PermissionDenied
from django.db import models


class TenantQuerySet(models.QuerySet):
    """
    Custom QuerySet that automatically filters by tenant company.
    """
    def for_tenant(self, company):
        """Filter queryset for a specific company."""
        if company:
            return self.filter(company=company)
        return self.none()


class TenantManager(models.Manager):
    """
    Custom Manager that provides tenant-aware queries.
    """
    def get_queryset(self):
        return TenantQuerySet(self.model, using=self._db)

    def for_tenant(self, company):
        """Get objects for a specific company."""
        return self.get_queryset().for_tenant(company)


class TenantMixin:
    """
    Mixin for views to enforce tenant isolation.
    Add this to your API views to automatically filter by tenant.
    """
    def get_queryset(self):
        """Override to filter by tenant automatically."""
        queryset = super().get_queryset()
        
        # Get tenant from request
        if hasattr(self.request, 'tenant_company_name') and self.request.tenant_company_name:
            # Assuming models have a 'company' field
            if hasattr(queryset.model, 'company'):
                return queryset.filter(company__nom=self.request.tenant_company_name)
        
        # If no tenant or not authenticated, return empty queryset for security
        return queryset.none()

    def perform_create(self, serializer):
        """Automatically set company when creating objects."""
        if hasattr(self.request, 'tenant_company_name') and self.request.tenant_company_name:
            # Try to get company object
            from apps.core.models import Societe
            try:
                company = Societe.objects.get(nom=self.request.tenant_company_name)
                serializer.save(company=company)
            except Societe.DoesNotExist:
                raise PermissionDenied("Company not found")
        else:
            raise PermissionDenied("No company assigned to user")


def get_tenant_company(request):
    """
    Helper function to get the tenant company object from request.
    Returns None if not authenticated or no company assigned.
    """
    if not hasattr(request, 'user') or not request.user.is_authenticated:
        return None
    
    if not hasattr(request, 'tenant_company_name') or not request.tenant_company_name:
        return None
    
    from apps.core.models import Societe
    try:
        return Societe.objects.get(nom=request.tenant_company_name)
    except Societe.DoesNotExist:
        return None
