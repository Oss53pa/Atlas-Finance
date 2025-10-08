from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api.views import (
    ImmobilisationViewSet,
    PlanAmortissementViewSet,
    EcritureAmortissementViewSet,
    CategorieImmobilisationViewSet,
    VirementPosteViewSet,
    SortieViewSet,
    SortieComptableViewSet,
    ReparationViewSet,
    ReevaluationImmobilisationViewSet
)

app_name = 'assets'

router = DefaultRouter()
router.register(r'categories', CategorieImmobilisationViewSet)
router.register(r'immobilisations', ImmobilisationViewSet)
router.register(r'plans-amortissement', PlanAmortissementViewSet)
router.register(r'ecritures-amortissement', EcritureAmortissementViewSet)
router.register(r'virements', VirementPosteViewSet)
router.register(r'sorties', SortieViewSet)
router.register(r'sorties-comptables', SortieComptableViewSet)
router.register(r'reparations', ReparationViewSet)
router.register(r'reevaluations', ReevaluationImmobilisationViewSet)

urlpatterns = [
    path('api/', include(router.urls)),
]