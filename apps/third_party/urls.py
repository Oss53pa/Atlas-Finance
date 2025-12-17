"""
URLs pour le module Third Party (Tiers)
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'tiers', views.TiersViewSet, basename='tiers')
router.register(r'adresses', views.AdresseTiersViewSet, basename='adresses')
router.register(r'contacts', views.ContactTiersViewSet, basename='contacts')
router.register(r'categories', views.CategorieAnalytiqueViewSet, basename='categories')

app_name = 'third_party'

urlpatterns = [
    path('api/', include(router.urls)),

    # Endpoints spécialisés
    path('api/tiers/clients/', views.TiersViewSet.as_view({'get': 'clients'}), name='clients-list'),
    path('api/tiers/fournisseurs/', views.TiersViewSet.as_view({'get': 'fournisseurs'}), name='fournisseurs-list'),
    path('api/tiers/stats/', views.TiersViewSet.as_view({'get': 'stats'}), name='tiers-stats'),
    path('api/tiers/<uuid:pk>/bloquer/', views.TiersViewSet.as_view({'post': 'bloquer'}), name='tiers-bloquer'),
    path('api/tiers/<uuid:pk>/debloquer/', views.TiersViewSet.as_view({'post': 'debloquer'}), name='tiers-debloquer'),
    path('api/tiers/<uuid:pk>/balance/', views.TiersViewSet.as_view({'get': 'balance'}), name='tiers-balance'),
]
