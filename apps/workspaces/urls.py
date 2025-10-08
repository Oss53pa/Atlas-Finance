"""
URLs pour le module Workspaces WiseBook ERP V3.0
Configuration des routes API pour les workspaces
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()

router.register(r'workspaces', views.WorkspaceViewSet, basename='workspace')
router.register(r'widgets', views.WorkspaceWidgetViewSet, basename='workspace-widget')
router.register(r'statistics', views.WorkspaceStatisticViewSet, basename='workspace-statistic')
router.register(r'quick-actions', views.WorkspaceQuickActionViewSet, basename='workspace-quick-action')
router.register(r'preferences', views.UserWorkspacePreferenceViewSet, basename='workspace-preference')

app_name = 'workspaces'

urlpatterns = [
    path('', include(router.urls)),
]