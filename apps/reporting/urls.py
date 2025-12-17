"""
URLs pour le module Reporting
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'categories', views.CategorieRapportViewSet, basename='categorie-rapport')
router.register(r'modeles', views.ModeleRapportViewSet, basename='modele-rapport')

app_name = 'reporting'

urlpatterns = [
    path('api/', include(router.urls)),

    # Dashboard
    path('api/dashboard/stats/', views.ReportingDashboardViewSet.as_view({'get': 'stats'}), name='dashboard-stats'),
    path('api/dashboard/recents/', views.ReportingDashboardViewSet.as_view({'get': 'rapports_recents'}), name='dashboard-recents'),

    # Génération
    path('api/generer/', views.ReportingDashboardViewSet.as_view({'post': 'generer_rapport_personnalise'}), name='generer'),
    path('api/modeles/<int:pk>/generer/', views.ModeleRapportViewSet.as_view({'post': 'generer'}), name='modele-generer'),
    path('api/modeles/<int:pk>/download/', views.ModeleRapportViewSet.as_view({'get': 'download'}), name='modele-download'),

    # Types disponibles
    path('api/types/', views.ModeleRapportViewSet.as_view({'get': 'types_disponibles'}), name='types'),
]
