from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api_views import ModeleMLViewSet, DetectionAnomalieViewSet

router = DefaultRouter()
router.register(r'modeles', ModeleMLViewSet, basename='modeleml')
router.register(r'detections', DetectionAnomalieViewSet, basename='detection')

app_name = 'ml_detection'

urlpatterns = [
    path('', include(router.urls)),
]