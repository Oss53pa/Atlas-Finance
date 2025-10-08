"""
URLs pour Module Clôture Comptable Périodique WiseBook
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClotureComptableViewSet

router = DefaultRouter()
router.register(r'clotures', ClotureComptableViewSet, basename='clotures-comptables')

app_name = 'closures_comptables'

urlpatterns = [
    # API REST
    path('api/', include(router.urls)),

    # Endpoints spécifiques
    path('api/clotures/demarrer-mensuelle/',
         ClotureComptableViewSet.as_view({'post': 'demarrer_cloture_mensuelle'}),
         name='demarrer-cloture-mensuelle'),

    path('api/clotures/provisions-clients/',
         ClotureComptableViewSet.as_view({'post': 'calculer_provisions_clients'}),
         name='calculer-provisions-clients'),

    path('api/clotures/amortissements/',
         ClotureComptableViewSet.as_view({'post': 'calculer_amortissements'}),
         name='calculer-amortissements'),

    path('api/clotures/balance-generale/',
         ClotureComptableViewSet.as_view({'get': 'balance_generale'}),
         name='balance-generale'),

    path('api/clotures/ecritures/',
         ClotureComptableViewSet.as_view({'get': 'ecritures_cloture'}),
         name='ecritures-cloture'),

    path('api/clotures/statistiques/',
         ClotureComptableViewSet.as_view({'get': 'statistiques_globales'}),
         name='statistiques-globales'),

    path('api/clotures/exercices/',
         ClotureComptableViewSet.as_view({'get': 'exercices_disponibles'}),
         name='exercices-disponibles'),
]