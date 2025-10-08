"""
URLs pour module de clôture comptable intégré WiseBook
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClotureComptableViewSet

router = DefaultRouter()
router.register(r'clotures', ClotureComptableViewSet, basename='clotures')

app_name = 'cloture_comptable'

urlpatterns = [
    path('api/', include(router.urls)),

    # Endpoints spécifiques selon cahier des charges
    path('api/exercices/',
         ClotureComptableViewSet.as_view({'get': 'exercices_disponibles'}),
         name='exercices-disponibles'),

    path('api/balance-reelle/',
         ClotureComptableViewSet.as_view({'get': 'balance_generale_reelle'}),
         name='balance-reelle'),

    path('api/provisions-reelles/',
         ClotureComptableViewSet.as_view({'post': 'calculer_provisions_reelles'}),
         name='provisions-reelles'),

    path('api/valider-provision/',
         ClotureComptableViewSet.as_view({'post': 'valider_provision'}),
         name='valider-provision'),

    path('api/indicateurs/',
         ClotureComptableViewSet.as_view({'get': 'indicateurs_performance'}),
         name='indicateurs'),
]