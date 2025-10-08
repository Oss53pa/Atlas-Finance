"""
URLs pour le module Clôture Comptable Réelle WiseBook
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views.real_closure_views import RealClosureViewSet

# Configuration du router REST
router = DefaultRouter()
router.register(r'real-closures', RealClosureViewSet, basename='real-closures')

app_name = 'period_closures'

urlpatterns = [
    # API REST pour clôtures réelles
    path('api/closures/', include(router.urls)),

    # URLs spécifiques pour actions de clôture
    path('api/closures/start-real-closure/',
         RealClosureViewSet.as_view({'post': 'start_real_closure'}),
         name='start-real-closure'),

    path('api/closures/calculate-provisions/',
         RealClosureViewSet.as_view({'post': 'calculate_provisions'}),
         name='calculate-provisions'),

    path('api/closures/calculate-depreciation/',
         RealClosureViewSet.as_view({'post': 'calculate_depreciation'}),
         name='calculate-depreciation'),

    path('api/closures/generate-accruals/',
         RealClosureViewSet.as_view({'post': 'generate_accruals'}),
         name='generate-accruals'),

    path('api/closures/trial-balance/',
         RealClosureViewSet.as_view({'get': 'trial_balance'}),
         name='trial-balance'),

    path('api/closures/closure-entries/',
         RealClosureViewSet.as_view({'get': 'closure_entries'}),
         name='closure-entries'),

    path('api/closures/closure-status/',
         RealClosureViewSet.as_view({'get': 'closure_status'}),
         name='closure-status'),
]