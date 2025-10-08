"""
URLs pour Module CRM Clients WiseBook
API REST complète selon architecture
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ClientViewSet, ContactViewSet, ClientAddressViewSet,
    ClientDocumentViewSet, ClientAnalyticsViewSet,
    ClientRecouvrementViewSet, ClientLettrageViewSet
)

# Router principal
router = DefaultRouter()

# Enregistrement des ViewSets
router.register(r'clients', ClientViewSet, basename='clients')
router.register(r'contacts', ContactViewSet, basename='contacts')
router.register(r'addresses', ClientAddressViewSet, basename='addresses')
router.register(r'documents', ClientDocumentViewSet, basename='documents')
router.register(r'analytics', ClientAnalyticsViewSet, basename='analytics')
router.register(r'recouvrement', ClientRecouvrementViewSet, basename='recouvrement')
router.register(r'lettrage', ClientLettrageViewSet, basename='lettrage')

app_name = 'crm_clients'

urlpatterns = [
    # API REST principale
    path('api/', include(router.urls)),

    # Endpoints spécialisés pour recherche avancée
    path('api/clients/search/',
         ClientViewSet.as_view({'post': 'search_advanced'}),
         name='clients-search'),

    # Timeline client
    path('api/clients/<uuid:pk>/timeline/',
         ClientViewSet.as_view({'get': 'timeline'}),
         name='client-timeline'),

    # Scoring IA
    path('api/clients/<uuid:pk>/scoring/',
         ClientViewSet.as_view({'post': 'calculer_scoring'}),
         name='client-scoring'),

    # Import/Export
    path('api/clients/import/',
         ClientViewSet.as_view({'post': 'import_clients'}),
         name='clients-import'),

    path('api/clients/export/',
         ClientViewSet.as_view({'post': 'export_clients'}),
         name='clients-export'),

    # Dashboard stats
    path('api/dashboard/stats/',
         ClientViewSet.as_view({'get': 'dashboard_stats'}),
         name='dashboard-stats'),

    # Contacts par client
    path('api/contacts/by-client/',
         ContactViewSet.as_view({'get': 'by_client'}),
         name='contacts-by-client'),

    # Géocodage adresses
    path('api/addresses/<uuid:pk>/geocoder/',
         ClientAddressViewSet.as_view({'post': 'geocoder'}),
         name='address-geocoder'),

    # Documents - download sécurisé
    path('api/documents/<uuid:pk>/download/',
         ClientDocumentViewSet.as_view({'get': 'download'}),
         name='document-download'),

    path('api/documents/types/',
         ClientDocumentViewSet.as_view({'get': 'types_documents'}),
         name='document-types'),

    # Analytics avancés
    path('api/analytics/segmentation/',
         ClientAnalyticsViewSet.as_view({'get': 'segmentation_clients'}),
         name='analytics-segmentation'),

    path('api/analytics/predictive/',
         ClientAnalyticsViewSet.as_view({'get': 'predictive_analytics'}),
         name='analytics-predictive'),

    path('api/analytics/custom-report/',
         ClientAnalyticsViewSet.as_view({'post': 'custom_report'}),
         name='analytics-custom'),

    # Recouvrement - tableau de bord
    path('api/recouvrement/dashboard/',
         ClientRecouvrementViewSet.as_view({'get': 'tableau_bord'}),
         name='recouvrement-dashboard'),

    # Lettrage automatique
    path('api/lettrage/auto/',
         ClientLettrageViewSet.as_view({'post': 'lettrage_automatique'}),
         name='lettrage-auto'),
]