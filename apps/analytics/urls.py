"""
URLs pour l'API Comptabilité Analytique
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Router pour les ViewSets
router = DefaultRouter()
router.register(r'axes-analytiques', views.AxeAnalytiqueViewSet, basename='axe-analytique')
router.register(r'sections-analytiques', views.SectionAnalytiqueViewSet, basename='section-analytique')
router.register(r'ventilations', views.VentilationAnalytiqueViewSet, basename='ventilation')
router.register(r'modeles-ventilation', views.ModeleVentilationViewSet, basename='modele-ventilation')
router.register(r'balances', views.BalanceAnalytiqueViewSet, basename='balance-analytique')
router.register(r'repartitions-automatiques', views.RepartitionAutomatiqueViewSet, basename='repartition-automatique')
router.register(r'lignes-repartition', views.LigneRepartitionViewSet, basename='ligne-repartition')
router.register(r'tableaux-bord', views.TableauBordViewSet, basename='tableau-bord')
router.register(r'widgets', views.WidgetTableauBordViewSet, basename='widget')
router.register(r'cles-repartition', views.CleRepartitionViewSet, basename='cle-repartition')

app_name = 'analytics'

urlpatterns = [
    path('', include(router.urls)),
]
