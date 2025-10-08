"""
URLs pour Module États Financiers SYSCOHADA WiseBook
API REST complète pour génération automatique
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FinancialStatementsViewSet, AuditTrailViewSet

app_name = 'financial_statements'

urlpatterns = [
    # === 1. ÉTATS FINANCIERS SYSCOHADA ===

    # Génération complète de tous les états
    path('api/generer-etats-complets/',
         FinancialStatementsViewSet.as_view({'post': 'generer_etats_complets'}),
         name='generer-etats-complets'),

    # Table Bilan Comptable (actif/passif)
    path('api/bilan-comptable/',
         FinancialStatementsViewSet.as_view({'get': 'bilan_comptable'}),
         name='bilan-comptable'),

    # Table Compte de Résultat SYSCOHADA
    path('api/compte-resultat/',
         FinancialStatementsViewSet.as_view({'get': 'compte_resultat'}),
         name='compte-resultat'),

    # === 2. SIG - SOLDES INTERMÉDIAIRES DE GESTION ===

    # Table SIG avec 9 soldes intermédiaires
    path('api/soldes-intermediaires/',
         FinancialStatementsViewSet.as_view({'get': 'soldes_intermediaires'}),
         name='sig'),

    # === 3. RATIOS FINANCIERS ===

    # Table Ratios financiers automatiques
    path('api/ratios-financiers/',
         FinancialStatementsViewSet.as_view({'get': 'ratios_financiers'}),
         name='ratios-financiers'),

    # === 4. TABLEAU DES FLUX DE TRÉSORERIE ===

    # Tableau TAFIRE (méthode indirecte)
    path('api/tableau-flux-tresorerie/',
         FinancialStatementsViewSet.as_view({'get': 'tableau_flux_tresorerie'}),
         name='tafire'),

    # === ANALYSES ET PILOTAGE ===

    # Analyse automatique santé financière
    path('api/analyser-sante-financiere/',
         FinancialStatementsViewSet.as_view({'post': 'analyser_sante_financiere'}),
         name='analyser-sante'),

    # Dashboard financier synthétique
    path('api/dashboard-financier/',
         FinancialStatementsViewSet.as_view({'get': 'dashboard_financier'}),
         name='dashboard-financier'),

    # === EXPORTS ===

    # Export Excel avec graphiques
    path('api/export-excel/',
         FinancialStatementsViewSet.as_view({'post': 'export_excel'}),
         name='export-excel'),

    # Export PDF rapport professionnel
    path('api/export-pdf/',
         FinancialStatementsViewSet.as_view({'post': 'export_pdf'}),
         name='export-pdf'),

    # === AUDIT TRAIL ===

    # Piste d'audit complète
    path('api/audit-trail/',
         AuditTrailViewSet.as_view({'get': 'audit_trail_complet'}),
         name='audit-trail'),

    # === ENDPOINTS COMPLÉMENTAIRES ===

    # Vérification conformité SYSCOHADA
    path('api/verifier-conformite/',
         FinancialStatementsViewSet.as_view({'post': 'verifier_conformite_syscohada'}),
         name='verifier-conformite'),

    # Comparaisons inter-exercices
    path('api/comparaisons-exercices/',
         FinancialStatementsViewSet.as_view({'post': 'comparaisons_inter_exercices'}),
         name='comparaisons-exercices'),

    # Performance de génération
    path('api/performance-stats/',
         FinancialStatementsViewSet.as_view({'get': 'performance_generation'}),
         name='performance-stats'),
]