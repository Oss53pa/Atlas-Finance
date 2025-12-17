"""
URLs pour le module Consolidation Multi-Sociétés
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'groups', views.ConsolidationGroupViewSet, basename='consolidation-group')
router.register(r'entities', views.ConsolidationEntityViewSet, basename='consolidation-entity')
router.register(r'periods', views.ConsolidationPeriodViewSet, basename='consolidation-period')
router.register(r'intercompany', views.IntercompanyTransactionViewSet, basename='intercompany')
router.register(r'adjustments', views.ConsolidationAdjustmentViewSet, basename='adjustment')
router.register(r'statements', views.ConsolidatedFinancialStatementViewSet, basename='statement')
router.register(r'workflow', views.ConsolidationWorkflowViewSet, basename='workflow')

app_name = 'consolidation'

urlpatterns = [
    path('api/', include(router.urls)),

    # Dashboard groupe
    path('api/groups/<uuid:pk>/dashboard/',
         views.ConsolidationGroupViewSet.as_view({'get': 'dashboard'}),
         name='group-dashboard'),
    path('api/groups/<uuid:pk>/entities/',
         views.ConsolidationGroupViewSet.as_view({'get': 'entities'}),
         name='group-entities'),
    path('api/groups/<uuid:pk>/periods/',
         views.ConsolidationGroupViewSet.as_view({'get': 'periods'}),
         name='group-periods'),

    # Actions période
    path('api/periods/<uuid:pk>/start/',
         views.ConsolidationPeriodViewSet.as_view({'post': 'start_processing'}),
         name='period-start'),
    path('api/periods/<uuid:pk>/validate/',
         views.ConsolidationPeriodViewSet.as_view({'post': 'validate'}),
         name='period-validate'),
    path('api/periods/<uuid:pk>/publish/',
         views.ConsolidationPeriodViewSet.as_view({'post': 'publish'}),
         name='period-publish'),
    path('api/periods/<uuid:pk>/workflow/',
         views.ConsolidationPeriodViewSet.as_view({'get': 'workflow_status'}),
         name='period-workflow'),

    # Transactions intercos
    path('api/intercompany/summary/',
         views.IntercompanyTransactionViewSet.as_view({'get': 'summary'}),
         name='interco-summary'),
    path('api/intercompany/bulk-eliminate/',
         views.IntercompanyTransactionViewSet.as_view({'post': 'bulk_eliminate'}),
         name='interco-bulk-eliminate'),
]
