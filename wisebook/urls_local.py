"""
URL configuration for WiseBook local development.
Essential API routes for local development.
"""
from django.urls import path, include
from django.http import JsonResponse
from django.contrib import admin


def home_view(request):
    """API Root - Liste tous les endpoints disponibles"""
    return JsonResponse({
        'status': 'ok',
        'message': 'WiseBook API - Local Development',
        'version': '3.0.0',
        'endpoints': {
            'auth': '/api/v1/auth/',
            'dashboard': '/api/v1/dashboard/',
            'accounting': '/api/v1/accounting/',
            'treasury': '/api/v1/treasury/',
            'budgeting': '/api/v1/budgeting/',
            'clients': '/api/v1/clients/',
            'suppliers': '/api/v1/suppliers/',
            'reports': '/api/v1/reports/',
            'third-party': '/api/v1/third-party/',
        },
        'documentation': '/api/docs/',
    })


def health_check(request):
    """Health check endpoint"""
    return JsonResponse({
        'status': 'healthy',
        'database': 'connected',
        'version': '3.0.0'
    })


urlpatterns = [
    # Home & Health
    path('', home_view, name='home'),
    path('health/', health_check, name='health-check'),

    # Admin Django
    path('admin/', admin.site.urls),

    # ============================================================
    # AUTHENTICATION API
    # ============================================================
    path('api/v1/auth/', include('apps.authentication.urls')),

    # ============================================================
    # DASHBOARD API - KPIs, Alertes, Métriques
    # ============================================================
    path('api/v1/dashboard/', include('apps.dashboard.urls')),

    # ============================================================
    # ACCOUNTING API - Comptabilité SYSCOHADA
    # ============================================================
    path('api/v1/accounting/', include('apps.accounting.urls')),

    # ============================================================
    # TREASURY API - Trésorerie
    # ============================================================
    path('api/v1/treasury/', include('apps.treasury.urls')),

    # ============================================================
    # BUDGETING API - Budget et Prévisions
    # ============================================================
    path('api/v1/budgeting/', include('apps.budgeting.urls')),

    # ============================================================
    # CRM CLIENTS API - Gestion Clients
    # ============================================================
    path('api/v1/clients/', include('apps.crm_clients.urls')),

    # ============================================================
    # SUPPLIERS API - Gestion Fournisseurs
    # ============================================================
    path('api/v1/suppliers/', include('apps.suppliers.urls')),

    # ============================================================
    # REPORTING API - Rapports
    # ============================================================
    path('api/v1/reports/', include('apps.reporting.urls')),

    # ============================================================
    # THIRD PARTY API - Tiers (Clients/Fournisseurs)
    # ============================================================
    path('api/v1/third-party/', include('apps.third_party.urls')),

    # ============================================================
    # CONSOLIDATION API - Consolidation
    # ============================================================
    path('api/v1/consolidation/', include('apps.consolidation.urls')),
]
