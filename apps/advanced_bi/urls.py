"""
URLs pour l'API Paloma
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.advanced_bi.views import (
    PalomaViewSet,
    DocumentSourceViewSet,
    ConversationSessionViewSet,
    CodeAnalysisResultViewSet,
    PalomaAnalyticsViewSet
)

app_name = 'advanced_bi'

router = DefaultRouter()
router.register(r'paloma', PalomaViewSet, basename='paloma')
router.register(r'documents', DocumentSourceViewSet, basename='document')
router.register(r'conversations', ConversationSessionViewSet, basename='conversation')
router.register(r'code-analysis', CodeAnalysisResultViewSet, basename='code-analysis')
router.register(r'analytics', PalomaAnalyticsViewSet, basename='analytics')

urlpatterns = [
    path('', include(router.urls)),
]
