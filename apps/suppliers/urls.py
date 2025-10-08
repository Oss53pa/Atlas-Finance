"""
URLs pour Module Fournisseur WiseBook
API REST complète selon cahier des charges
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SupplierViewSet, SupplierInvoiceViewSet, SupplierEcheancesViewSet,
    SupplierAnalyticsViewSet, SupplierMatchingViewSet, SupplierDocumentViewSet
)

# Router principal
router = DefaultRouter()

# Enregistrement des ViewSets
router.register(r'suppliers', SupplierViewSet, basename='suppliers')
router.register(r'invoices', SupplierInvoiceViewSet, basename='invoices')
router.register(r'documents', SupplierDocumentViewSet, basename='documents')

app_name = 'suppliers'

urlpatterns = [
    # API REST principale
    path('api/', include(router.urls)),

    # Section 2.1 - Liste Fournisseurs
    path('api/suppliers/search/',
         SupplierViewSet.as_view({'post': 'search_advanced'}),
         name='suppliers-search'),

    path('api/suppliers/dashboard-stats/',
         SupplierViewSet.as_view({'get': 'dashboard_stats'}),
         name='suppliers-dashboard-stats'),

    path('api/suppliers/import/',
         SupplierViewSet.as_view({'post': 'import_fournisseurs'}),
         name='suppliers-import'),

    path('api/suppliers/export/',
         SupplierViewSet.as_view({'post': 'export_fournisseurs'}),
         name='suppliers-export'),

    path('api/suppliers/<uuid:pk>/evaluer/',
         SupplierViewSet.as_view({'post': 'evaluer_performance'}),
         name='supplier-evaluer'),

    path('api/suppliers/<uuid:pk>/valider-siret/',
         SupplierViewSet.as_view({'post': 'valider_siret'}),
         name='supplier-valider-siret'),

    # Section 2.2 - Gestion Achats (Factures)
    path('api/invoices/<uuid:pk>/valider-technique/',
         SupplierInvoiceViewSet.as_view({'post': 'valider_technique'}),
         name='invoice-valider-technique'),

    path('api/invoices/<uuid:pk>/valider-comptable/',
         SupplierInvoiceViewSet.as_view({'post': 'valider_comptable'}),
         name='invoice-valider-comptable'),

    path('api/invoices/<uuid:pk>/comptabiliser/',
         SupplierInvoiceViewSet.as_view({'post': 'comptabiliser'}),
         name='invoice-comptabiliser'),

    # Section 2.3 - Gestion des Échéances
    path('api/echeances/tableau-bord/',
         SupplierEcheancesViewSet.as_view({'get': 'tableau_bord'}),
         name='echeances-dashboard'),

    path('api/echeances/jour/',
         SupplierEcheancesViewSet.as_view({'get': 'echeances_jour'}),
         name='echeances-jour'),

    path('api/echeances/planifier-paiements/',
         SupplierEcheancesViewSet.as_view({'post': 'planifier_paiements'}),
         name='echeances-planifier'),

    path('api/echeances/generer-sepa/',
         SupplierEcheancesViewSet.as_view({'post': 'generer_virement_sepa'}),
         name='echeances-sepa'),

    # Section 2.4 - Analyse Fournisseurs
    path('api/analytics/abc/',
         SupplierAnalyticsViewSet.as_view({'get': 'analyse_abc'}),
         name='analytics-abc'),

    path('api/analytics/matrice-risques/',
         SupplierAnalyticsViewSet.as_view({'get': 'matrice_risques'}),
         name='analytics-matrice'),

    path('api/analytics/indicateurs/',
         SupplierAnalyticsViewSet.as_view({'get': 'indicateurs_cles'}),
         name='analytics-indicateurs'),

    path('api/analytics/rapport-personnalise/',
         SupplierAnalyticsViewSet.as_view({'post': 'rapport_personnalise'}),
         name='analytics-rapport'),

    # Section 2.5 - Lettrage Fournisseurs
    path('api/lettrage/automatique-global/',
         SupplierMatchingViewSet.as_view({'post': 'lettrage_automatique_global'}),
         name='lettrage-auto-global'),

    path('api/lettrage/fournisseur/',
         SupplierMatchingViewSet.as_view({'post': 'lettrage_fournisseur'}),
         name='lettrage-fournisseur'),

    path('api/lettrage/propositions/',
         SupplierMatchingViewSet.as_view({'post': 'propositions_lettrage'}),
         name='lettrage-propositions'),

    path('api/lettrage/executer-manuel/',
         SupplierMatchingViewSet.as_view({'post': 'executer_lettrage_manuel'}),
         name='lettrage-manuel'),

    # Documents
    path('api/documents/expires/',
         SupplierDocumentViewSet.as_view({'get': 'documents_expires'}),
         name='documents-expires'),
]