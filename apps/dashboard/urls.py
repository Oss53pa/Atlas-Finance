"""
Dashboard URLs Configuration

Endpoints for executive dashboard and analytics.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'dashboard'

# Router pour les ViewSets
router = DefaultRouter()
router.register(r'notifications', views.NotificationViewSet, basename='notification')
router.register(r'exports', views.DashboardExportViewSet, basename='export')

urlpatterns = [
    # Dashboard Index - Liste des endpoints disponibles
    path(
        '',
        views.DashboardIndexView.as_view(),
        name='dashboard-index'
    ),

    # Consolidated KPIs
    path(
        'consolidated-kpis/',
        views.ConsolidatedKPIsView.as_view(),
        name='consolidated-kpis'
    ),

    # Operational Metrics
    path(
        'operational-metrics/',
        views.OperationalMetricsView.as_view(),
        name='operational-metrics'
    ),

    # Financial Trends
    path(
        'financial-trends/',
        views.FinancialTrendsView.as_view(),
        name='financial-trends'
    ),

    # Critical Alerts
    path(
        'critical-alerts/',
        views.CriticalAlertsView.as_view(),
        name='critical-alerts'
    ),

    # Performance Benchmark
    path(
        'performance-benchmark/',
        views.PerformanceBenchmarkView.as_view(),
        name='performance-benchmark'
    ),

    # Export Dashboard
    path(
        'export/',
        views.ExportDashboardView.as_view(),
        name='export'
    ),

    # Include router URLs for ViewSets
    path('', include(router.urls)),
]
