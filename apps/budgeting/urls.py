"""
URLs pour Module Budget WiseBook
API REST complète pour gestion budgétaire intelligente
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    BudgetPlanViewSet, BudgetLineViewSet, BudgetDashboardViewSet,
    BudgetAlertViewSet, BudgetImportViewSet, BudgetReportViewSet
)

# Router principal
router = DefaultRouter()

# Enregistrement des ViewSets
router.register(r'plans', BudgetPlanViewSet, basename='budget-plans')
router.register(r'lines', BudgetLineViewSet, basename='budget-lines')
router.register(r'alerts', BudgetAlertViewSet, basename='budget-alerts')

app_name = 'budgeting'

urlpatterns = [
    # API REST principale
    path('api/', include(router.urls)),

    # === MODULE 1: PLANIFICATION BUDGÉTAIRE PRÉDICTIVE ===

    # Prévisions IA - Modèles ARIMA, LSTM, Prophet
    path('api/plans/<uuid:pk>/generer-previsions-ia/',
         BudgetPlanViewSet.as_view({'post': 'generer_previsions_ia'}),
         name='budget-previsions-ia'),

    # Dashboard Executive avec KPIs clés
    path('api/plans/<uuid:pk>/dashboard-executive/',
         BudgetPlanViewSet.as_view({'get': 'dashboard_executive'}),
         name='budget-dashboard-executive'),

    # Analyse de variance avec drill-down
    path('api/plans/<uuid:pk>/analyser-variances/',
         BudgetPlanViewSet.as_view({'post': 'analyser_variances'}),
         name='budget-analyser-variances'),

    # === MODULE 2: SAISIE INTELLIGENTE ===

    # Saisie matricielle multi-dimensionnelle
    path('api/lines/saisie-matricielle/',
         BudgetLineViewSet.as_view({'post': 'saisie_matricielle'}),
         name='budget-saisie-matricielle'),

    # Grille de saisie pour interface
    path('api/lines/grille-saisie/',
         BudgetLineViewSet.as_view({'get': 'grille_saisie'}),
         name='budget-grille-saisie'),

    # === MODULE 3: DASHBOARDS INTERACTIFS ===

    # Statistiques principales temps réel
    path('api/dashboard/stats/',
         BudgetDashboardViewSet.as_view({'get': 'stats_principales'}),
         name='budget-stats'),

    # Comparaison YTD détaillée
    path('api/dashboard/ytd/',
         BudgetDashboardViewSet.as_view({'get': 'comparaison_ytd'}),
         name='budget-ytd'),

    # Analyse par département
    path('api/dashboard/departements/',
         BudgetDashboardViewSet.as_view({'get': 'analyse_departements'}),
         name='budget-analyse-dept'),

    # === MODULE 4: SYSTÈME D'ALERTES ===

    # Évaluation automatique des alertes
    path('api/alerts/evaluer-automatiques/',
         BudgetAlertViewSet.as_view({'post': 'evaluer_alertes_automatiques'}),
         name='budget-evaluer-alertes'),

    # Dashboard des alertes
    path('api/alerts/dashboard/',
         BudgetAlertViewSet.as_view({'get': 'dashboard_alertes'}),
         name='budget-dashboard-alertes'),

    # Accusé réception alerte
    path('api/alerts/<uuid:pk>/accuser-reception/',
         BudgetAlertViewSet.as_view({'post': 'accuser_reception'}),
         name='budget-alerte-ack'),

    # === MODULE 5: IMPORT/EXPORT ===

    # Import Excel intelligent avec OCR
    path('api/import/excel/',
         BudgetImportViewSet.as_view({'post': 'import_excel'}),
         name='budget-import-excel'),

    # Export Excel avancé
    path('api/export/excel/',
         BudgetImportViewSet.as_view({'post': 'export_excel'}),
         name='budget-export-excel'),

    # Templates de budget
    path('api/import/templates/',
         BudgetImportViewSet.as_view({'get': 'templates_disponibles'}),
         name='budget-templates'),

    # === MODULE 6: REPORTING AUTOMATISÉ ===

    # Génération rapport mensuel automatique
    path('api/reports/mensuel/',
         BudgetReportViewSet.as_view({'post': 'generer_rapport_mensuel'}),
         name='budget-rapport-mensuel'),

    # Rapports programmés
    path('api/reports/programmed/',
         BudgetReportViewSet.as_view({'get': 'rapports_programmes'}),
         name='budget-rapports-programmes'),

    # === ENDPOINTS COMPLÉMENTAIRES ===

    # Départements budgétaires
    path('api/departments/',
         BudgetDashboardViewSet.as_view({'get': 'liste_departements'}),
         name='budget-departments'),

    # Comptes comptables utilisables
    path('api/accounts/budgetaires/',
         BudgetDashboardViewSet.as_view({'get': 'comptes_budgetaires'}),
         name='budget-accounts'),

    # Workflow de validation
    path('api/workflow/validation/',
         BudgetDashboardViewSet.as_view({'post': 'workflow_validation'}),
         name='budget-workflow'),

    # === APIs AVANCÉES ===

    # Machine Learning - Prédictions
    path('api/ml/predict/',
         BudgetDashboardViewSet.as_view({'post': 'predict_ml'}),
         name='budget-ml-predict'),

    # Analytics - Analyse ABC fournisseurs
    path('api/analytics/abc-analysis/',
         BudgetDashboardViewSet.as_view({'get': 'abc_analysis'}),
         name='budget-abc-analysis'),

    # Comparaisons multi-périodes
    path('api/analytics/multi-period/',
         BudgetDashboardViewSet.as_view({'post': 'comparaison_multi_periodes'}),
         name='budget-multi-period'),

    # Optimisation budgétaire IA
    path('api/optimize/ai-suggestions/',
         BudgetDashboardViewSet.as_view({'post': 'suggestions_optimisation_ia'}),
         name='budget-optimize-ai'),
]