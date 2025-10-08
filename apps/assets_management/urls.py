"""
URLs pour le module de gestion des actifs
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AssetViewSet, AssetComponentViewSet, AssetCategoryViewSet,
    AssetDocumentViewSet, AssetDepreciationViewSet, AssetMovementViewSet,
    AssetIoTSensorViewSet, AssetMaintenanceRecordViewSet, AssetInventoryViewSet,
    AssetPerformanceMetricsViewSet, WiseFMIntegrationViewSet,
    MaintenanceServiceContractViewSet, PriceListSummaryItemViewSet,
    MaintenanceHistoryViewSet, AssetAttachmentViewSet, AssetNoteViewSet
)

app_name = 'assets_management'

router = DefaultRouter()
router.register(r'assets', AssetViewSet, basename='asset')
router.register(r'components', AssetComponentViewSet, basename='component')
router.register(r'categories', AssetCategoryViewSet, basename='category')
router.register(r'documents', AssetDocumentViewSet, basename='document')
router.register(r'depreciations', AssetDepreciationViewSet, basename='depreciation')
router.register(r'movements', AssetMovementViewSet, basename='movement')
router.register(r'sensors', AssetIoTSensorViewSet, basename='sensor')
router.register(r'maintenance', AssetMaintenanceRecordViewSet, basename='maintenance')
router.register(r'inventories', AssetInventoryViewSet, basename='inventory')
router.register(r'metrics', AssetPerformanceMetricsViewSet, basename='metrics')
router.register(r'wisefm', WiseFMIntegrationViewSet, basename='wisefm')
router.register(r'maintenance-contracts', MaintenanceServiceContractViewSet, basename='maintenance-contract')
router.register(r'price-items', PriceListSummaryItemViewSet, basename='price-item')
router.register(r'maintenance-history', MaintenanceHistoryViewSet, basename='maintenance-history')
router.register(r'attachments', AssetAttachmentViewSet, basename='attachment')
router.register(r'notes', AssetNoteViewSet, basename='note')

urlpatterns = [
    path('', include(router.urls)),
]