from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClotureMensuelleViewSet, ClotureAnnuelleViewSet

router = DefaultRouter()
router.register(r'mensuelles', ClotureMensuelleViewSet)
router.register(r'annuelles', ClotureAnnuelleViewSet)

urlpatterns = [
    path('', include(router.urls)),
]