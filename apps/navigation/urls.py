"""
URLs principales de navigation pour WiseBook
Structure hiérarchique selon cahier des charges 6.2.1
"""

from django.urls import path, include
from . import views

app_name = 'navigation'

urlpatterns = [
    # Dashboard (Vue d'ensemble)
    path('', views.DashboardView.as_view(), name='dashboard'),
    path('dashboard/', views.DashboardView.as_view(), name='dashboard-main'),
    
    # Module Comptabilité
    path('comptabilite/', include([
        path('', views.ComptabiliteHomeView.as_view(), name='comptabilite-home'),
        path('ecritures/', include([
            path('', views.EcrituresListView.as_view(), name='ecritures-list'),
            path('create/', views.EcrituresCreateView.as_view(), name='ecritures-create'),
            path('<uuid:pk>/', views.EcrituresDetailView.as_view(), name='ecritures-detail'),
            path('<uuid:pk>/edit/', views.EcrituresUpdateView.as_view(), name='ecritures-edit'),
            path('import/', views.EcrituresImportView.as_view(), name='ecritures-import'),
        ])),
        path('grand-livre/', views.GrandLivreView.as_view(), name='grand-livre'),
        path('balance/', views.BalanceView.as_view(), name='balance'),
        path('journaux/', include([
            path('', views.JournauxListView.as_view(), name='journaux-list'),
            path('<uuid:pk>/', views.JournauxDetailView.as_view(), name='journaux-detail'),
        ])),
    ])),
    
    # Module Tiers
    path('tiers/', include([
        path('', views.TiersHomeView.as_view(), name='tiers-home'),
        path('clients/', include([
            path('', views.ClientsListView.as_view(), name='clients-list'),
            path('create/', views.ClientCreateView.as_view(), name='clients-create'),
            path('<uuid:pk>/', views.ClientDetailView.as_view(), name='clients-detail'),
            path('<uuid:pk>/edit/', views.ClientUpdateView.as_view(), name='clients-edit'),
            path('<uuid:pk>/balance/', views.ClientBalanceView.as_view(), name='clients-balance'),
        ])),
        path('fournisseurs/', include([
            path('', views.FournisseursListView.as_view(), name='fournisseurs-list'),
            path('create/', views.FournisseurCreateView.as_view(), name='fournisseurs-create'),
            path('<uuid:pk>/', views.FournisseurDetailView.as_view(), name='fournisseurs-detail'),
            path('<uuid:pk>/edit/', views.FournisseurUpdateView.as_view(), name='fournisseurs-edit'),
            path('<uuid:pk>/balance/', views.FournisseurBalanceView.as_view(), name='fournisseurs-balance'),
        ])),
        path('autres/', views.AutresTiersListView.as_view(), name='autres-tiers'),
    ])),
    
    # Module Trésorerie
    path('tresorerie/', include([
        path('', views.TresorerieHomeView.as_view(), name='tresorerie-home'),
        path('position/', views.PositionTresorerieView.as_view(), name='tresorerie-position'),
        path('previsions/', views.PrevisionsTresorerieView.as_view(), name='tresorerie-previsions'),
        path('rapprochements/', include([
            path('', views.RapprochementsListView.as_view(), name='rapprochements-list'),
            path('create/', views.RapprochementCreateView.as_view(), name='rapprochements-create'),
            path('<uuid:pk>/', views.RapprochementDetailView.as_view(), name='rapprochements-detail'),
        ])),
    ])),
    
    # Module Immobilisations
    path('immobilisations/', include([
        path('', views.ImmobilisationsListView.as_view(), name='immobilisations-list'),
        path('create/', views.ImmobilisationCreateView.as_view(), name='immobilisations-create'),
        path('<uuid:pk>/', views.ImmobilisationDetailView.as_view(), name='immobilisations-detail'),
        path('<uuid:pk>/edit/', views.ImmobilisationUpdateView.as_view(), name='immobilisations-edit'),
        path('amortissements/', views.AmortissementsView.as_view(), name='amortissements'),
        path('cessions/', views.CessionsView.as_view(), name='cessions'),
    ])),
    
    # Module Budget
    path('budget/', include([
        path('', views.BudgetHomeView.as_view(), name='budget-home'),
        path('previsions/', views.BudgetPrevisionsView.as_view(), name='budget-previsions'),
        path('realise/', views.BudgetRealiseView.as_view(), name='budget-realise'),
        path('ecarts/', views.BudgetEcartsView.as_view(), name='budget-ecarts'),
        path('controle/', views.BudgetControleView.as_view(), name='budget-controle'),
    ])),
    
    # Module Fiscalité
    path('fiscalite/', include([
        path('', views.FiscaliteHomeView.as_view(), name='fiscalite-home'),
        path('tva/', include([
            path('', views.TVAHomeView.as_view(), name='tva-home'),
            path('declaration/', views.TVADeclarationView.as_view(), name='tva-declaration'),
            path('controle/', views.TVAControleView.as_view(), name='tva-controle'),
        ])),
        path('liasse/', views.LiasseFiscaleView.as_view(), name='liasse-fiscale'),
        path('taxes/', views.AutresTaxesView.as_view(), name='autres-taxes'),
        path('compliance/', views.ComplianceFiscaleView.as_view(), name='compliance-fiscale'),
    ])),
    
    # Module Clôtures
    path('clotures/', include([
        path('', views.CloturesHomeView.as_view(), name='clotures-home'),
        path('mensuelle/', views.ClotureMensuelleView.as_view(), name='cloture-mensuelle'),
        path('trimestrielle/', views.ClotureTrimestrielleView.as_view(), name='cloture-trimestrielle'),
        path('annuelle/', views.ClotureAnnuelleView.as_view(), name='cloture-annuelle'),
        path('checklist/', views.ClotureChecklistView.as_view(), name='cloture-checklist'),
        path('validation/', views.ClotureValidationView.as_view(), name='cloture-validation'),
    ])),
    
    # Module Rapports
    path('rapports/', include([
        path('', views.RapportsHomeView.as_view(), name='rapports-home'),
        path('financiers/', include([
            path('', views.RapportsFinanciersView.as_view(), name='rapports-financiers'),
            path('bilan/', views.BilanView.as_view(), name='bilan'),
            path('compte-resultat/', views.CompteResultatView.as_view(), name='compte-resultat'),
            path('flux-tresorerie/', views.FluxTresorerieView.as_view(), name='flux-tresorerie'),
            path('variation-capitaux/', views.VariationCapitauxView.as_view(), name='variation-capitaux'),
        ])),
        path('syscohada/', views.RapportsSyscohadaView.as_view(), name='rapports-syscohada'),
        path('ifrs/', views.RapportsIFRSView.as_view(), name='rapports-ifrs'),
        path('custom/', views.RapportsCustomView.as_view(), name='rapports-custom'),
        path('export/', views.ExportRapportsView.as_view(), name='export-rapports'),
    ])),
    
    # Module Paramètres
    path('parametres/', include([
        path('', views.ParametresHomeView.as_view(), name='parametres-home'),
        path('entreprise/', views.ParametresEntrepriseView.as_view(), name='parametres-entreprise'),
        path('plan-comptable/', views.PlanComptableView.as_view(), name='plan-comptable'),
        path('utilisateurs/', views.UtilisateursView.as_view(), name='utilisateurs'),
        path('securite/', views.SecuriteView.as_view(), name='securite'),
        path('integrations/', views.IntegrationsView.as_view(), name='integrations'),
        path('sauvegardes/', views.SauvegardesView.as_view(), name='sauvegardes'),
        path('audit/', views.AuditView.as_view(), name='audit'),
    ])),
    
    # APIs pour navigation dynamique
    path('api/navigation/', include([
        path('menu/', views.NavigationMenuAPIView.as_view(), name='api-navigation-menu'),
        path('breadcrumb/', views.BreadcrumbAPIView.as_view(), name='api-breadcrumb'),
        path('quick-access/', views.QuickAccessAPIView.as_view(), name='api-quick-access'),
        path('search/', views.GlobalSearchAPIView.as_view(), name='api-global-search'),
    ])),
]