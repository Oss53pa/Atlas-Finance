"""
Core Mixins for WiseBook
Provides common functionality for views
"""
from django.core.exceptions import PermissionDenied
from rest_framework import filters
from apps.core.models import Societe


class CompanyFilterMixin:
    """
    Mixin to filter querysets by company
    Automatically filters by the user's company
    """

    def get_company(self):
        """
        Get the company for the current user
        SÉCURISÉ: Validation des accès multi-tenant
        """
        if not self.request.user.is_authenticated:
            raise PermissionDenied("Authentication required")

        # Try to get company from user profile or request
        if hasattr(self.request.user, 'societe'):
            return self.request.user.societe

        # Try to get from query params (for admin users ONLY)
        company_id = self.request.query_params.get('company_id')
        if company_id:
            # SÉCURITÉ: Vérifier que l'utilisateur est admin ou a accès à cette société
            if not self.request.user.is_staff and not self.request.user.is_superuser:
                # Utilisateur non-admin: vérifier l'accès explicite
                if hasattr(self.request.user, 'accessible_companies'):
                    if not self.request.user.accessible_companies.filter(id=company_id).exists():
                        raise PermissionDenied("Access denied to this company")
                else:
                    raise PermissionDenied("Access denied to this company")

            try:
                return Societe.objects.get(id=company_id)
            except Societe.DoesNotExist:
                raise PermissionDenied("Company not found")

        # Default: get first active company (seulement pour admins)
        if self.request.user.is_staff or self.request.user.is_superuser:
            company = Societe.objects.filter(is_active=True).first()
            if not company:
                raise PermissionDenied("No active company found")
            return company

        raise PermissionDenied("No company assigned to user")

    def get_queryset(self):
        """
        Override to filter by company
        """
        queryset = super().get_queryset()

        # Filter by company if model has company field
        if hasattr(queryset.model, 'company'):
            company = self.get_company()
            queryset = queryset.filter(company=company)

        return queryset


class TenantFilterMixin:
    """
    Alias for CompanyFilterMixin for backwards compatibility
    """
    def get_company(self):
        if hasattr(self, 'request') and hasattr(self.request, 'tenant'):
            return self.request.tenant
        return CompanyFilterMixin.get_company(self)


class MultiTenantMixin(CompanyFilterMixin):
    """
    Multi-tenant support mixin
    Ensures data is isolated by company
    """
    filter_backends = [filters.OrderingFilter, filters.SearchFilter]

    def perform_create(self, serializer):
        """
        Automatically set company on create
        """
        company = self.get_company()
        serializer.save(company=company)

    def perform_update(self, serializer):
        """
        Ensure company is not changed on update
        """
        company = self.get_company()
        if serializer.instance.company != company:
            raise PermissionDenied("Cannot modify records from other companies")
        serializer.save()


class SoftDeleteMixin:
    """
    Mixin for soft delete functionality
    """
    def perform_destroy(self, instance):
        """
        Soft delete: set is_active = False instead of deleting
        """
        if hasattr(instance, 'is_active'):
            instance.is_active = False
            instance.save()
        else:
            super().perform_destroy(instance)
