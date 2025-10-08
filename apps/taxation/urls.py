"""
URLs pour le module fiscalité.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    RegimeFiscalViewSet, TypeDeclarationViewSet, DeclarationFiscaleViewSet,
    LigneDeclarationViewSet, ObligationFiscaleViewSet, AlerteFiscaleViewSet,
    ControlesFiscauxViewSet, DocumentFiscalViewSet, EvenementFiscalViewSet,
    TaxationAnalyticsViewSet
)

# Configuration du routeur DRF
router = DefaultRouter()
router.register(r'regimes-fiscaux', RegimeFiscalViewSet, basename='regime-fiscal')
router.register(r'types-declarations', TypeDeclarationViewSet, basename='type-declaration')
router.register(r'declarations', DeclarationFiscaleViewSet, basename='declaration-fiscale')
router.register(r'lignes-declarations', LigneDeclarationViewSet, basename='ligne-declaration')
router.register(r'obligations', ObligationFiscaleViewSet, basename='obligation-fiscale')
router.register(r'alertes', AlerteFiscaleViewSet, basename='alerte-fiscale')
router.register(r'controles', ControlesFiscauxViewSet, basename='controle-fiscal')
router.register(r'documents', DocumentFiscalViewSet, basename='document-fiscal')
router.register(r'evenements', EvenementFiscalViewSet, basename='evenement-fiscal')
router.register(r'analytics', TaxationAnalyticsViewSet, basename='taxation-analytics')

app_name = 'taxation'

urlpatterns = [
    path('', include(router.urls)),
]