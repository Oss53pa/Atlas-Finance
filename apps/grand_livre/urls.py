"""
URLs pour le module Grand Livre
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'configuration', views.GrandLivreConfigurationViewSet, basename='gl-configuration')

app_name = 'grand_livre'

urlpatterns = [
    path('api/', include(router.urls)),

    # Recherche
    path('api/search/quick/', views.LedgerSearchViewSet.as_view({'get': 'quick_search', 'post': 'quick_search'}), name='quick-search'),
    path('api/search/advanced/', views.LedgerSearchViewSet.as_view({'post': 'advanced_search'}), name='advanced-search'),
    path('api/search/fuzzy/', views.LedgerSearchViewSet.as_view({'post': 'fuzzy_search'}), name='fuzzy-search'),
    path('api/search/suggestions/', views.LedgerSearchViewSet.as_view({'get': 'search_suggestions'}), name='search-suggestions'),

    # Navigation
    path('api/views/chronological/', views.LedgerNavigationViewSet.as_view({'get': 'chronological_view'}), name='chronological-view'),
    path('api/views/hierarchical/', views.LedgerNavigationViewSet.as_view({'get': 'hierarchical_view'}), name='hierarchical-view'),
    path('api/views/analytical/', views.LedgerNavigationViewSet.as_view({'get': 'analytical_view'}), name='analytical-view'),
    path('api/views/kanban/', views.LedgerNavigationViewSet.as_view({'get': 'kanban_view'}), name='kanban-view'),
    path('api/views/heatmap/', views.LedgerNavigationViewSet.as_view({'get': 'heatmap_view'}), name='heatmap-view'),
]
