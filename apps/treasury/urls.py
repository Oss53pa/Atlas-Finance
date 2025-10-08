"""
URLs pour Module Treasury WiseBook
API REST enterprise-grade pour gestion de trésorerie
Conforme au cahier des charges complet
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TreasuryDashboardViewSet, BankAccountViewSet, CashForecastViewSet,
    FundCallViewSet, BankReconciliationViewSet, CashMovementViewSet
)

# Router principal
router = DefaultRouter()

# Enregistrement des ViewSets
router.register(r'accounts', BankAccountViewSet, basename='bank-accounts')
router.register(r'movements', CashMovementViewSet, basename='cash-movements')
router.register(r'fund-calls', FundCallViewSet, basename='fund-calls')

app_name = 'treasury'

urlpatterns = [
    # API REST principale
    path('api/', include(router.urls)),

    # === SECTION 7: DASHBOARD CASHFLOW (KPIs temps réel) ===

    # Position de trésorerie temps réel
    path('api/dashboard/position/',
         TreasuryDashboardViewSet.as_view({'get': 'position_temps_reel'}),
         name='treasury-position'),

    # KPIs principaux du dashboard
    path('api/dashboard/kpis/',
         TreasuryDashboardViewSet.as_view({'get': 'kpis_principaux'}),
         name='treasury-kpis'),

    # Analyse des tendances 12 mois
    path('api/dashboard/trends/',
         TreasuryDashboardViewSet.as_view({'get': 'trend_analysis'}),
         name='treasury-trends'),

    # Alertes trésorerie actives
    path('api/dashboard/alertes/',
         TreasuryDashboardViewSet.as_view({'get': 'alertes_actives'}),
         name='treasury-alertes'),

    # === SECTION 1: ACCOUNT MANAGEMENT ===

    # Consolidation multi-comptes
    path('api/accounts/consolidation/',
         BankAccountViewSet.as_view({'get': 'consolidation'}),
         name='accounts-consolidation'),

    # Validation IBAN/SWIFT automatique
    path('api/accounts/<uuid:pk>/valider-iban/',
         BankAccountViewSet.as_view({'post': 'valider_iban'}),
         name='account-validate-iban'),

    # === SECTION 2: CASH MOVEMENTS & TRANSACTIONS ===

    # Dernières transactions (interface principale)
    path('api/movements/dernieres/',
         CashMovementViewSet.as_view({'get': 'dernieres_transactions'}),
         name='movements-latest'),

    # Validation en lot
    path('api/movements/validation-lot/',
         CashMovementViewSet.as_view({'post': 'validation_lot'}),
         name='movements-bulk-validate'),

    # Export vers comptabilité générale
    path('api/movements/export-comptable/',
         CashMovementViewSet.as_view({'post': 'export_comptable'}),
         name='movements-export-gl'),

    # === SECTION 4: CASH FORECASTING ===

    # Prévisions 13 semaines avec scénarios multiples
    path('api/forecasting/13-semaines/',
         CashForecastViewSet.as_view({'get': 'previsions_13_semaines'}),
         name='forecasting-13weeks'),

    # Simulation de scénarios personnalisés
    path('api/forecasting/simulation/',
         CashForecastViewSet.as_view({'post': 'simulation_scenarios'}),
         name='forecasting-simulation'),

    # Interface prévisions encaissements
    path('api/forecasting/encaissements/',
         CashForecastViewSet.as_view({'get': 'encaissements_prevus'}),
         name='forecasting-inflows'),

    # Interface prévisions décaissements avec priorité
    path('api/forecasting/decaissements/',
         CashForecastViewSet.as_view({'get': 'decaissements_prevus'}),
         name='forecasting-outflows'),

    # === SECTION 5: FUND CALLS ===

    # Analyse automatique besoins financement
    path('api/fund-calls/analyser-besoins/',
         FundCallViewSet.as_view({'post': 'analyser_besoins'}),
         name='fund-calls-analyze-needs'),

    # Création automatique appel de fonds
    path('api/fund-calls/creer-automatique/',
         FundCallViewSet.as_view({'post': 'creer_automatique'}),
         name='fund-calls-auto-create'),

    # Aging analysis détaillé
    path('api/fund-calls/<uuid:pk>/aging/',
         FundCallViewSet.as_view({'get': 'aging_analysis'}),
         name='fund-call-aging'),

    # === SECTION 6: BANK RECONCILIATION ===

    # Rapprochement automatique avec IA
    path('api/reconciliation/automatique/',
         BankReconciliationViewSet.as_view({'post': 'rapprochement_automatique'}),
         name='reconciliation-auto'),

    # Import relevé bancaire (MT940, CSV, Excel)
    path('api/reconciliation/import-releve/',
         BankReconciliationViewSet.as_view({'post': 'import_releve_bancaire'}),
         name='reconciliation-import-statement'),

    # === ENDPOINTS COMPLÉMENTAIRES ===

    # Liste des banques disponibles
    path('api/banks/',
         BankAccountViewSet.as_view({'get': 'liste_banques'}),
         name='treasury-banks'),

    # Connexions bancaires actives
    path('api/connections/status/',
         TreasuryDashboardViewSet.as_view({'get': 'bank_connections_status'}),
         name='treasury-connections'),

    # === APIs AVANCÉES ===

    # Machine Learning - Prédictions de trésorerie
    path('api/ml/predict-cash-flow/',
         CashForecastViewSet.as_view({'post': 'predict_ml_cashflow'}),
         name='treasury-ml-predict'),

    # Analytics - Analyse de performance
    path('api/analytics/performance/',
         TreasuryDashboardViewSet.as_view({'get': 'treasury_performance'}),
         name='treasury-analytics'),

    # Optimisation - Suggestions IA
    path('api/optimize/cash-management/',
         TreasuryDashboardViewSet.as_view({'post': 'optimize_cash_management'}),
         name='treasury-optimize'),

    # === SÉCURITÉ ET AUDIT ===

    # Audit trail des opérations sensibles
    path('api/audit/operations/',
         TreasuryDashboardViewSet.as_view({'get': 'audit_trail'}),
         name='treasury-audit'),

    # Contrôles sécuritaires
    path('api/security/controls/',
         TreasuryDashboardViewSet.as_view({'get': 'security_controls'}),
         name='treasury-security'),

    # === INTÉGRATIONS EXTERNES ===

    # Export ERP (SAP, Oracle, Sage)
    path('api/export/erp/',
         TreasuryDashboardViewSet.as_view({'post': 'export_to_erp'}),
         name='treasury-export-erp'),

    # Import depuis systèmes bancaires
    path('api/import/banking-api/',
         BankReconciliationViewSet.as_view({'post': 'import_from_banking_api'}),
         name='treasury-import-banking'),

    # === REPORTING ===

    # Génération rapports PDF/Excel
    path('api/reports/generate/',
         TreasuryDashboardViewSet.as_view({'post': 'generate_treasury_report'}),
         name='treasury-reports'),

    # Planning de trésorerie
    path('api/reports/planning/',
         CashForecastViewSet.as_view({'get': 'planning_tresorerie'}),
         name='treasury-planning'),
]