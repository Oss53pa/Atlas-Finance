"""
WiseBook - Global Rate Limiting Configuration
Configuration centralisée pour tous les modules
"""

from rest_framework.throttling import UserRateThrottle, AnonRateThrottle


# ============================================================================
# Throttling Modules Principaux
# ============================================================================

class AccountingReadThrottle(UserRateThrottle):
    """Comptabilité - Lectures"""
    scope = 'accounting_read'
    rate = '1000/hour'


class AccountingWriteThrottle(UserRateThrottle):
    """Comptabilité - Écritures"""
    scope = 'accounting_write'
    rate = '200/hour'


class CRMReadThrottle(UserRateThrottle):
    """CRM - Lectures"""
    scope = 'crm_read'
    rate = '1000/hour'


class CRMWriteThrottle(UserRateThrottle):
    """CRM - Écritures"""
    scope = 'crm_write'
    rate = '200/hour'


class SupplierReadThrottle(UserRateThrottle):
    """Fournisseurs - Lectures"""
    scope = 'supplier_read'
    rate = '1000/hour'


class SupplierWriteThrottle(UserRateThrottle):
    """Fournisseurs - Écritures"""
    scope = 'supplier_write'
    rate = '200/hour'


class AnalyticsThrottle(UserRateThrottle):
    """Analytics - CPU-intensive"""
    scope = 'analytics'
    rate = '100/hour'


class BudgetingReadThrottle(UserRateThrottle):
    """Budgeting - Lectures"""
    scope = 'budgeting_read'
    rate = '500/hour'


class BudgetingWriteThrottle(UserRateThrottle):
    """Budgeting - Écritures"""
    scope = 'budgeting_write'
    rate = '100/hour'


class TaxationReadThrottle(UserRateThrottle):
    """Taxation - Lectures"""
    scope = 'taxation_read'
    rate = '500/hour'


class TaxationWriteThrottle(UserRateThrottle):
    """Taxation - Écritures (déclarations)"""
    scope = 'taxation_write'
    rate = '50/hour'


class IntegrationSyncThrottle(UserRateThrottle):
    """Intégrations - Synchronisations (protection APIs externes)"""
    scope = 'integration_sync'
    rate = '30/hour'


class DashboardThrottle(UserRateThrottle):
    """Dashboard - Lectures"""
    scope = 'dashboard'
    rate = '500/hour'


class MLDetectionThrottle(UserRateThrottle):
    """Machine Learning - CPU-intensive"""
    scope = 'ml_detection'
    rate = '50/hour'


class WorkspacesReadThrottle(UserRateThrottle):
    """Workspaces - Lectures"""
    scope = 'workspaces_read'
    rate = '1000/hour'


class WorkspacesWriteThrottle(UserRateThrottle):
    """Workspaces - Écritures"""
    scope = 'workspaces_write'
    rate = '100/hour'


# ============================================================================
# Mixin pour Application Automatique du Throttling
# ============================================================================

class ThrottleMixin:
    """
    Mixin pour appliquer automatiquement le throttling selon l'action

    Usage:
        class MyViewSet(ThrottleMixin, viewsets.ModelViewSet):
            read_throttle_class = AccountingReadThrottle
            write_throttle_class = AccountingWriteThrottle
    """

    read_throttle_class = None
    write_throttle_class = None

    def get_throttles(self):
        """Applique le throttling selon l'action"""
        if self.action in ['list', 'retrieve']:
            if self.read_throttle_class:
                return [self.read_throttle_class()]
        elif self.action in ['create', 'update', 'partial_update', 'destroy']:
            if self.write_throttle_class:
                return [self.write_throttle_class()]

        # Throttle par défaut si non spécifié
        return super().get_throttles()


# ============================================================================
# Configuration Django REST Framework
# ============================================================================

THROTTLE_RATES = {
    # Treasury
    'treasury_read': '1000/hour',
    'treasury_write': '200/hour',
    'payment_execution': '50/hour',
    'payment_approval': '100/hour',
    'bank_sync': '30/hour',
    'report_generation': '20/hour',

    # Accounting
    'accounting_read': '1000/hour',
    'accounting_write': '200/hour',

    # CRM
    'crm_read': '1000/hour',
    'crm_write': '200/hour',

    # Suppliers
    'supplier_read': '1000/hour',
    'supplier_write': '200/hour',

    # Analytics
    'analytics': '100/hour',

    # Budgeting
    'budgeting_read': '500/hour',
    'budgeting_write': '100/hour',

    # Taxation
    'taxation_read': '500/hour',
    'taxation_write': '50/hour',

    # Integrations
    'integration_sync': '30/hour',

    # Dashboard
    'dashboard': '500/hour',

    # ML Detection
    'ml_detection': '50/hour',

    # Workspaces
    'workspaces_read': '1000/hour',
    'workspaces_write': '100/hour',

    # Generic
    'burst': '100/minute',
    'sustained': '2000/hour',
    'ip_based': '5000/day',
    'anon_treasury': '10/hour',
}
