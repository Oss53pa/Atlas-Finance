"""
URLs pour l'API comptabilité
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views, test_views

# Router pour les ViewSets
router = DefaultRouter()
router.register(r'companies', views.CompanyViewSet, basename='company')
router.register(r'fiscal-years', views.FiscalYearViewSet, basename='fiscal-year')
router.register(r'journals', views.JournalViewSet, basename='journal')
router.register(r'chart-of-accounts', views.ChartOfAccountsViewSet, basename='chart-of-accounts')
router.register(r'account', views.ChartOfAccountsViewSet, basename='account')  # Alias pour compatibilité frontend
router.register(r'journal-entries', views.JournalEntryViewSet, basename='journal-entry')
# router.register(r'trial-balances', views.TrialBalanceViewSet, basename='trial-balance')  # À implémenter
router.register(r'fund-call', views.FundCallViewSet, basename='fund-call')

app_name = 'accounting'

urlpatterns = [
    path('api/', include(router.urls)),
    # Test endpoints (temporary)
    path('fund-call/all_data/', test_views.test_fund_calls, name='test-fund-calls'),
    path('fund-call/', test_views.test_create_fund_call, name='test-create-fund-call'),
    path('account/start_account/', test_views.test_accounts, name='test-accounts'),
]