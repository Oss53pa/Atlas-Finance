"""
Vues de navigation pour WiseBook
Implémente la structure hiérarchique selon cahier des charges 6.2.1
"""

from django.views.generic import TemplateView, ListView, DetailView, CreateView, UpdateView
from django.contrib.auth.mixins import LoginRequiredMixin, PermissionRequiredMixin
from django.shortcuts import render, redirect
from django.http import JsonResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status


class NavigationMixin(LoginRequiredMixin):
    """Mixin de base pour toutes les vues avec navigation"""
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['navigation'] = self.get_navigation_context()
        context['breadcrumbs'] = self.get_breadcrumbs()
        context['quick_actions'] = self.get_quick_actions()
        return context
    
    def get_navigation_context(self):
        """Retourne le contexte de navigation pour le menu principal"""
        return {
            'current_module': getattr(self, 'navigation_module', ''),
            'current_page': getattr(self, 'navigation_page', ''),
            'user_permissions': self.request.user.get_all_permissions(),
        }
    
    def get_breadcrumbs(self):
        """Génère le fil d'Ariane"""
        return []
    
    def get_quick_actions(self):
        """Actions rapides disponibles sur la page"""
        return []


# Dashboard Principal
class DashboardView(NavigationMixin, TemplateView):
    template_name = 'navigation/dashboard.html'
    navigation_module = 'dashboard'
    navigation_page = 'home'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['kpis'] = self.get_dashboard_kpis()
        context['recent_activities'] = self.get_recent_activities()
        context['alerts'] = self.get_alerts()
        return context
    
    def get_dashboard_kpis(self):
        return {
            'chiffre_affaires': 0,
            'tresorerie': 0,
            'factures_impayees': 0,
            'marge_brute': 0,
        }
    
    def get_recent_activities(self):
        return []
    
    def get_alerts(self):
        return []


# Module Comptabilité
class ComptabiliteHomeView(NavigationMixin, TemplateView):
    template_name = 'comptabilite/home.html'
    navigation_module = 'comptabilite'
    navigation_page = 'home'


class EcrituresListView(NavigationMixin, ListView):
    template_name = 'comptabilite/ecritures/list.html'
    navigation_module = 'comptabilite'
    navigation_page = 'ecritures'
    context_object_name = 'ecritures'
    paginate_by = 50
    
    def get_queryset(self):
        from apps.accounting.models import EcritureComptable
        return EcritureComptable.objects.filter(
            company=self.request.user.company
        ).select_related('compte', 'journal', 'exercice')


class EcrituresCreateView(NavigationMixin, PermissionRequiredMixin, CreateView):
    template_name = 'comptabilite/ecritures/form.html'
    navigation_module = 'comptabilite'
    navigation_page = 'ecritures'
    permission_required = 'accounting.add_ecriturecomptable'


class EcrituresDetailView(NavigationMixin, DetailView):
    template_name = 'comptabilite/ecritures/detail.html'
    navigation_module = 'comptabilite'
    navigation_page = 'ecritures'


class EcrituresUpdateView(NavigationMixin, PermissionRequiredMixin, UpdateView):
    template_name = 'comptabilite/ecritures/form.html'
    navigation_module = 'comptabilite'
    navigation_page = 'ecritures'
    permission_required = 'accounting.change_ecriturecomptable'


class EcrituresImportView(NavigationMixin, TemplateView):
    template_name = 'comptabilite/ecritures/import.html'
    navigation_module = 'comptabilite'
    navigation_page = 'ecritures'


class GrandLivreView(NavigationMixin, TemplateView):
    template_name = 'comptabilite/grand_livre.html'
    navigation_module = 'comptabilite'
    navigation_page = 'grand_livre'


class BalanceView(NavigationMixin, TemplateView):
    template_name = 'comptabilite/balance.html'
    navigation_module = 'comptabilite'
    navigation_page = 'balance'


class JournauxListView(NavigationMixin, ListView):
    template_name = 'comptabilite/journaux/list.html'
    navigation_module = 'comptabilite'
    navigation_page = 'journaux'


class JournauxDetailView(NavigationMixin, DetailView):
    template_name = 'comptabilite/journaux/detail.html'
    navigation_module = 'comptabilite'
    navigation_page = 'journaux'


# Module Tiers
class TiersHomeView(NavigationMixin, TemplateView):
    template_name = 'tiers/home.html'
    navigation_module = 'tiers'
    navigation_page = 'home'


class ClientsListView(NavigationMixin, ListView):
    template_name = 'tiers/clients/list.html'
    navigation_module = 'tiers'
    navigation_page = 'clients'
    paginate_by = 25


class ClientCreateView(NavigationMixin, CreateView):
    template_name = 'tiers/clients/form.html'
    navigation_module = 'tiers'
    navigation_page = 'clients'


class ClientDetailView(NavigationMixin, DetailView):
    template_name = 'tiers/clients/detail.html'
    navigation_module = 'tiers'
    navigation_page = 'clients'


class ClientUpdateView(NavigationMixin, UpdateView):
    template_name = 'tiers/clients/form.html'
    navigation_module = 'tiers'
    navigation_page = 'clients'


class ClientBalanceView(NavigationMixin, DetailView):
    template_name = 'tiers/clients/balance.html'
    navigation_module = 'tiers'
    navigation_page = 'clients'


class FournisseursListView(NavigationMixin, ListView):
    template_name = 'tiers/fournisseurs/list.html'
    navigation_module = 'tiers'
    navigation_page = 'fournisseurs'
    paginate_by = 25


class FournisseurCreateView(NavigationMixin, CreateView):
    template_name = 'tiers/fournisseurs/form.html'
    navigation_module = 'tiers'
    navigation_page = 'fournisseurs'


class FournisseurDetailView(NavigationMixin, DetailView):
    template_name = 'tiers/fournisseurs/detail.html'
    navigation_module = 'tiers'
    navigation_page = 'fournisseurs'


class FournisseurUpdateView(NavigationMixin, UpdateView):
    template_name = 'tiers/fournisseurs/form.html'
    navigation_module = 'tiers'
    navigation_page = 'fournisseurs'


class FournisseurBalanceView(NavigationMixin, DetailView):
    template_name = 'tiers/fournisseurs/balance.html'
    navigation_module = 'tiers'
    navigation_page = 'fournisseurs'


class AutresTiersListView(NavigationMixin, ListView):
    template_name = 'tiers/autres/list.html'
    navigation_module = 'tiers'
    navigation_page = 'autres'


# Module Trésorerie
class TresorerieHomeView(NavigationMixin, TemplateView):
    template_name = 'tresorerie/home.html'
    navigation_module = 'tresorerie'
    navigation_page = 'home'


class PositionTresorerieView(NavigationMixin, TemplateView):
    template_name = 'tresorerie/position.html'
    navigation_module = 'tresorerie'
    navigation_page = 'position'


class PrevisionsTresorerieView(NavigationMixin, TemplateView):
    template_name = 'tresorerie/previsions.html'
    navigation_module = 'tresorerie'
    navigation_page = 'previsions'


class RapprochementsListView(NavigationMixin, ListView):
    template_name = 'tresorerie/rapprochements/list.html'
    navigation_module = 'tresorerie'
    navigation_page = 'rapprochements'


class RapprochementCreateView(NavigationMixin, CreateView):
    template_name = 'tresorerie/rapprochements/form.html'
    navigation_module = 'tresorerie'
    navigation_page = 'rapprochements'


class RapprochementDetailView(NavigationMixin, DetailView):
    template_name = 'tresorerie/rapprochements/detail.html'
    navigation_module = 'tresorerie'
    navigation_page = 'rapprochements'


# Module Immobilisations
class ImmobilisationsListView(NavigationMixin, ListView):
    template_name = 'immobilisations/list.html'
    navigation_module = 'immobilisations'
    navigation_page = 'list'
    paginate_by = 25


class ImmobilisationCreateView(NavigationMixin, CreateView):
    template_name = 'immobilisations/form.html'
    navigation_module = 'immobilisations'
    navigation_page = 'create'


class ImmobilisationDetailView(NavigationMixin, DetailView):
    template_name = 'immobilisations/detail.html'
    navigation_module = 'immobilisations'
    navigation_page = 'detail'


class ImmobilisationUpdateView(NavigationMixin, UpdateView):
    template_name = 'immobilisations/form.html'
    navigation_module = 'immobilisations'
    navigation_page = 'edit'


class AmortissementsView(NavigationMixin, TemplateView):
    template_name = 'immobilisations/amortissements.html'
    navigation_module = 'immobilisations'
    navigation_page = 'amortissements'


class CessionsView(NavigationMixin, TemplateView):
    template_name = 'immobilisations/cessions.html'
    navigation_module = 'immobilisations'
    navigation_page = 'cessions'


# Module Budget
class BudgetHomeView(NavigationMixin, TemplateView):
    template_name = 'budget/home.html'
    navigation_module = 'budget'
    navigation_page = 'home'


class BudgetPrevisionsView(NavigationMixin, TemplateView):
    template_name = 'budget/previsions.html'
    navigation_module = 'budget'
    navigation_page = 'previsions'


class BudgetRealiseView(NavigationMixin, TemplateView):
    template_name = 'budget/realise.html'
    navigation_module = 'budget'
    navigation_page = 'realise'


class BudgetEcartsView(NavigationMixin, TemplateView):
    template_name = 'budget/ecarts.html'
    navigation_module = 'budget'
    navigation_page = 'ecarts'


class BudgetControleView(NavigationMixin, TemplateView):
    template_name = 'budget/controle.html'
    navigation_module = 'budget'
    navigation_page = 'controle'


# Module Fiscalité
class FiscaliteHomeView(NavigationMixin, TemplateView):
    template_name = 'fiscalite/home.html'
    navigation_module = 'fiscalite'
    navigation_page = 'home'


class TVAHomeView(NavigationMixin, TemplateView):
    template_name = 'fiscalite/tva/home.html'
    navigation_module = 'fiscalite'
    navigation_page = 'tva'


class TVADeclarationView(NavigationMixin, TemplateView):
    template_name = 'fiscalite/tva/declaration.html'
    navigation_module = 'fiscalite'
    navigation_page = 'tva_declaration'


class TVAControleView(NavigationMixin, TemplateView):
    template_name = 'fiscalite/tva/controle.html'
    navigation_module = 'fiscalite'
    navigation_page = 'tva_controle'


class LiasseFiscaleView(NavigationMixin, TemplateView):
    template_name = 'fiscalite/liasse.html'
    navigation_module = 'fiscalite'
    navigation_page = 'liasse'


class AutresTaxesView(NavigationMixin, TemplateView):
    template_name = 'fiscalite/autres_taxes.html'
    navigation_module = 'fiscalite'
    navigation_page = 'autres_taxes'


class ComplianceFiscaleView(NavigationMixin, TemplateView):
    template_name = 'fiscalite/compliance.html'
    navigation_module = 'fiscalite'
    navigation_page = 'compliance'


# Module Clôtures
class CloturesHomeView(NavigationMixin, TemplateView):
    template_name = 'clotures/home.html'
    navigation_module = 'clotures'
    navigation_page = 'home'


class ClotureMensuelleView(NavigationMixin, TemplateView):
    template_name = 'clotures/mensuelle.html'
    navigation_module = 'clotures'
    navigation_page = 'mensuelle'


class ClotureTrimestrielleView(NavigationMixin, TemplateView):
    template_name = 'clotures/trimestrielle.html'
    navigation_module = 'clotures'
    navigation_page = 'trimestrielle'


class ClotureAnnuelleView(NavigationMixin, TemplateView):
    template_name = 'clotures/annuelle.html'
    navigation_module = 'clotures'
    navigation_page = 'annuelle'


class ClotureChecklistView(NavigationMixin, TemplateView):
    template_name = 'clotures/checklist.html'
    navigation_module = 'clotures'
    navigation_page = 'checklist'


class ClotureValidationView(NavigationMixin, TemplateView):
    template_name = 'clotures/validation.html'
    navigation_module = 'clotures'
    navigation_page = 'validation'


# Module Rapports
class RapportsHomeView(NavigationMixin, TemplateView):
    template_name = 'rapports/home.html'
    navigation_module = 'rapports'
    navigation_page = 'home'


class RapportsFinanciersView(NavigationMixin, TemplateView):
    template_name = 'rapports/financiers/home.html'
    navigation_module = 'rapports'
    navigation_page = 'financiers'


class BilanView(NavigationMixin, TemplateView):
    template_name = 'rapports/financiers/bilan.html'
    navigation_module = 'rapports'
    navigation_page = 'bilan'


class CompteResultatView(NavigationMixin, TemplateView):
    template_name = 'rapports/financiers/compte_resultat.html'
    navigation_module = 'rapports'
    navigation_page = 'compte_resultat'


class FluxTresorerieView(NavigationMixin, TemplateView):
    template_name = 'rapports/financiers/flux_tresorerie.html'
    navigation_module = 'rapports'
    navigation_page = 'flux_tresorerie'


class VariationCapitauxView(NavigationMixin, TemplateView):
    template_name = 'rapports/financiers/variation_capitaux.html'
    navigation_module = 'rapports'
    navigation_page = 'variation_capitaux'


class RapportsSyscohadaView(NavigationMixin, TemplateView):
    template_name = 'rapports/syscohada.html'
    navigation_module = 'rapports'
    navigation_page = 'syscohada'


class RapportsIFRSView(NavigationMixin, TemplateView):
    template_name = 'rapports/ifrs.html'
    navigation_module = 'rapports'
    navigation_page = 'ifrs'


class RapportsCustomView(NavigationMixin, TemplateView):
    template_name = 'rapports/custom.html'
    navigation_module = 'rapports'
    navigation_page = 'custom'


class ExportRapportsView(NavigationMixin, TemplateView):
    template_name = 'rapports/export.html'
    navigation_module = 'rapports'
    navigation_page = 'export'


# Module Paramètres
class ParametresHomeView(NavigationMixin, TemplateView):
    template_name = 'parametres/home.html'
    navigation_module = 'parametres'
    navigation_page = 'home'


class ParametresEntrepriseView(NavigationMixin, TemplateView):
    template_name = 'parametres/entreprise.html'
    navigation_module = 'parametres'
    navigation_page = 'entreprise'


class PlanComptableView(NavigationMixin, TemplateView):
    template_name = 'parametres/plan_comptable.html'
    navigation_module = 'parametres'
    navigation_page = 'plan_comptable'


class UtilisateursView(NavigationMixin, TemplateView):
    template_name = 'parametres/utilisateurs.html'
    navigation_module = 'parametres'
    navigation_page = 'utilisateurs'


class SecuriteView(NavigationMixin, TemplateView):
    template_name = 'parametres/securite.html'
    navigation_module = 'parametres'
    navigation_page = 'securite'


class IntegrationsView(NavigationMixin, TemplateView):
    template_name = 'parametres/integrations.html'
    navigation_module = 'parametres'
    navigation_page = 'integrations'


class SauvegardesView(NavigationMixin, TemplateView):
    template_name = 'parametres/sauvegardes.html'
    navigation_module = 'parametres'
    navigation_page = 'sauvegardes'


class AuditView(NavigationMixin, TemplateView):
    template_name = 'parametres/audit.html'
    navigation_module = 'parametres'
    navigation_page = 'audit'


# APIs de navigation
class NavigationMenuAPIView(APIView):
    """API pour le menu de navigation dynamique"""
    
    def get(self, request):
        menu_items = self.build_menu_items(request.user)
        return Response(menu_items)
    
    def build_menu_items(self, user):
        """Construit le menu en fonction des permissions utilisateur"""
        return [
            {
                'id': 'dashboard',
                'label': 'Tableau de bord',
                'icon': 'dashboard',
                'url': '/dashboard/',
                'active': True,
            },
            {
                'id': 'comptabilite',
                'label': 'Comptabilité',
                'icon': 'accounting',
                'url': '/comptabilite/',
                'children': [
                    {'label': 'Écritures', 'url': '/comptabilite/ecritures/'},
                    {'label': 'Grand Livre', 'url': '/comptabilite/grand-livre/'},
                    {'label': 'Balance', 'url': '/comptabilite/balance/'},
                    {'label': 'Journaux', 'url': '/comptabilite/journaux/'},
                ]
            },
            # Ajouter les autres modules...
        ]


class BreadcrumbAPIView(APIView):
    """API pour le fil d'Ariane"""
    
    def get(self, request):
        path = request.GET.get('path', '/')
        breadcrumbs = self.build_breadcrumbs(path)
        return Response(breadcrumbs)
    
    def build_breadcrumbs(self, path):
        """Construit le fil d'Ariane pour le chemin donné"""
        parts = path.strip('/').split('/')
        breadcrumbs = [{'label': 'Accueil', 'url': '/'}]
        
        current_path = '/'
        for part in parts:
            if part:
                current_path += f"{part}/"
                breadcrumbs.append({
                    'label': part.replace('-', ' ').title(),
                    'url': current_path
                })
        
        return breadcrumbs


class QuickAccessAPIView(APIView):
    """API pour les accès rapides"""
    
    def get(self, request):
        quick_access = self.get_quick_access_items(request.user)
        return Response(quick_access)
    
    def get_quick_access_items(self, user):
        """Retourne les éléments d'accès rapide personnalisés"""
        return [
            {'label': 'Nouvelle écriture', 'url': '/comptabilite/ecritures/create/', 'icon': 'add'},
            {'label': 'Nouveau client', 'url': '/tiers/clients/create/', 'icon': 'person_add'},
            {'label': 'Rapprochement', 'url': '/tresorerie/rapprochements/create/', 'icon': 'sync'},
            {'label': 'Rapport mensuel', 'url': '/rapports/financiers/mensuel/', 'icon': 'report'},
        ]


class GlobalSearchAPIView(APIView):
    """API pour la recherche globale"""
    
    def get(self, request):
        query = request.GET.get('q', '')
        results = self.search(query, request.user)
        return Response(results)
    
    def search(self, query, user):
        """Effectue une recherche globale dans l'application"""
        if not query:
            return []
        
        results = []
        # Recherche dans les différents modèles
        # À implémenter selon les modèles disponibles
        
        return results