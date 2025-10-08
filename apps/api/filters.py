import django_filters
from django_filters import rest_framework as filters
from django.db import models
from django.utils import timezone
from datetime import timedelta

from apps.accounting.models import EcritureComptable, CompteComptable
from apps.third_party.models import Client, Fournisseur, Facture
from apps.treasury.models import MouvementTresorerie
from apps.assets.models import Immobilisation
from apps.budget.models import Budget
from apps.taxation.models import DeclarationFiscale
from apps.reporting.models import Rapport


class DateRangeFilter(filters.FilterSet):
    """Filtre de base pour les plages de dates."""
    date_debut = filters.DateFilter(field_name='date_creation', lookup_expr='gte')
    date_fin = filters.DateFilter(field_name='date_creation', lookup_expr='lte')


class EcritureComptableFilter(filters.FilterSet):
    """Filtres avancés pour les écritures comptables."""
    date_debut = filters.DateFilter(field_name='date_comptable', lookup_expr='gte')
    date_fin = filters.DateFilter(field_name='date_comptable', lookup_expr='lte')
    montant_min = filters.NumberFilter(field_name='montant_total', lookup_expr='gte')
    montant_max = filters.NumberFilter(field_name='montant_total', lookup_expr='lte')
    journal = filters.CharFilter(field_name='journal', lookup_expr='icontains')
    numero_piece = filters.CharFilter(field_name='numero_piece', lookup_expr='icontains')
    
    # Filtres par période prédéfinie
    periode = filters.ChoiceFilter(
        choices=[
            ('today', 'Aujourd\'hui'),
            ('week', 'Cette semaine'),
            ('month', 'Ce mois'),
            ('quarter', 'Ce trimestre'),
            ('year', 'Cette année'),
        ],
        method='filter_by_period'
    )
    
    class Meta:
        model = EcritureComptable
        fields = ['statut', 'journal', 'date_comptable']
    
    def filter_by_period(self, queryset, name, value):
        """Filtrer par période prédéfinie."""
        now = timezone.now().date()
        
        if value == 'today':
            return queryset.filter(date_comptable=now)
        elif value == 'week':
            start_week = now - timedelta(days=now.weekday())
            return queryset.filter(
                date_comptable__gte=start_week,
                date_comptable__lte=now
            )
        elif value == 'month':
            return queryset.filter(
                date_comptable__year=now.year,
                date_comptable__month=now.month
            )
        elif value == 'quarter':
            quarter = (now.month - 1) // 3 + 1
            start_month = (quarter - 1) * 3 + 1
            end_month = quarter * 3
            return queryset.filter(
                date_comptable__year=now.year,
                date_comptable__month__gte=start_month,
                date_comptable__month__lte=end_month
            )
        elif value == 'year':
            return queryset.filter(date_comptable__year=now.year)
        
        return queryset


class CompteComptableFilter(filters.FilterSet):
    """Filtres pour les comptes comptables."""
    classe = filters.NumberFilter(field_name='classe')
    type_compte = filters.CharFilter(field_name='type_compte')
    numero_start = filters.CharFilter(field_name='numero', lookup_expr='startswith')
    nom = filters.CharFilter(field_name='nom', lookup_expr='icontains')
    
    class Meta:
        model = CompteComptable
        fields = ['classe', 'type_compte', 'actif']


class ClientFilter(filters.FilterSet):
    """Filtres pour les clients."""
    nom = filters.CharFilter(field_name='nom', lookup_expr='icontains')
    email = filters.CharFilter(field_name='email', lookup_expr='icontains')
    ville = filters.CharFilter(field_name='ville', lookup_expr='icontains')
    pays = filters.CharFilter(field_name='pays')
    actif = filters.BooleanFilter(field_name='actif')
    
    # Filtre par chiffre d'affaires
    ca_min = filters.NumberFilter(method='filter_ca_min')
    ca_max = filters.NumberFilter(method='filter_ca_max')
    
    class Meta:
        model = Client
        fields = ['actif', 'pays']
    
    def filter_ca_min(self, queryset, name, value):
        """Filtrer par CA minimum."""
        return queryset.filter(
            factures__montant_ttc__gte=value
        ).distinct()
    
    def filter_ca_max(self, queryset, name, value):
        """Filtrer par CA maximum."""
        return queryset.filter(
            factures__montant_ttc__lte=value
        ).distinct()


class FactureFilter(filters.FilterSet):
    """Filtres pour les factures."""
    date_debut = filters.DateFilter(field_name='date_facture', lookup_expr='gte')
    date_fin = filters.DateFilter(field_name='date_facture', lookup_expr='lte')
    montant_min = filters.NumberFilter(field_name='montant_ttc', lookup_expr='gte')
    montant_max = filters.NumberFilter(field_name='montant_ttc', lookup_expr='lte')
    client_nom = filters.CharFilter(field_name='client__nom', lookup_expr='icontains')
    fournisseur_nom = filters.CharFilter(field_name='fournisseur__nom', lookup_expr='icontains')
    
    # Filtres par statut de paiement
    en_retard = filters.BooleanFilter(method='filter_en_retard')
    
    class Meta:
        model = Facture
        fields = ['type_facture', 'statut', 'client', 'fournisseur']
    
    def filter_en_retard(self, queryset, name, value):
        """Filtrer les factures en retard de paiement."""
        if value:
            now = timezone.now().date()
            return queryset.filter(
                statut='emise',
                date_echeance__lt=now
            )
        return queryset


class MouvementTresorerieFilter(filters.FilterSet):
    """Filtres pour les mouvements de trésorerie."""
    date_debut = filters.DateFilter(field_name='date_valeur', lookup_expr='gte')
    date_fin = filters.DateFilter(field_name='date_valeur', lookup_expr='lte')
    montant_min = filters.NumberFilter(field_name='montant', lookup_expr='gte')
    montant_max = filters.NumberFilter(field_name='montant', lookup_expr='lte')
    libelle = filters.CharFilter(field_name='libelle', lookup_expr='icontains')
    
    class Meta:
        model = MouvementTresorerie
        fields = ['compte_bancaire', 'type_mouvement', 'statut']


class ImmobilisationFilter(filters.FilterSet):
    """Filtres pour les immobilisations."""
    nom = filters.CharFilter(field_name='nom', lookup_expr='icontains')
    date_acquisition_debut = filters.DateFilter(field_name='date_acquisition', lookup_expr='gte')
    date_acquisition_fin = filters.DateFilter(field_name='date_acquisition', lookup_expr='lte')
    valeur_min = filters.NumberFilter(field_name='valeur_acquisition', lookup_expr='gte')
    valeur_max = filters.NumberFilter(field_name='valeur_acquisition', lookup_expr='lte')
    
    # Filtre par état d'amortissement
    entierement_amortie = filters.BooleanFilter(method='filter_amortie')
    
    class Meta:
        model = Immobilisation
        fields = ['categorie', 'methode_amortissement', 'active']
    
    def filter_amortie(self, queryset, name, value):
        """Filtrer les immobilisations entièrement amorties."""
        if value:
            return queryset.filter(
                amortissements__cumul_amortissements__gte=models.F('valeur_acquisition')
            ).distinct()
        else:
            return queryset.filter(
                amortissements__cumul_amortissements__lt=models.F('valeur_acquisition')
            ).distinct()


class BudgetFilter(filters.FilterSet):
    """Filtres pour les budgets."""
    nom = filters.CharFilter(field_name='nom', lookup_expr='icontains')
    date_debut = filters.DateFilter(field_name='date_debut', lookup_expr='gte')
    date_fin = filters.DateFilter(field_name='date_fin', lookup_expr='lte')
    
    class Meta:
        model = Budget
        fields = ['exercice', 'statut', 'type_budget']


class DeclarationFiscaleFilter(filters.FilterSet):
    """Filtres pour les déclarations fiscales."""
    date_declaration_debut = filters.DateFilter(field_name='date_declaration', lookup_expr='gte')
    date_declaration_fin = filters.DateFilter(field_name='date_declaration', lookup_expr='lte')
    date_depot_debut = filters.DateFilter(field_name='date_depot', lookup_expr='gte')
    date_depot_fin = filters.DateFilter(field_name='date_depot', lookup_expr='lte')
    
    # Filtre par retard de dépôt
    en_retard = filters.BooleanFilter(method='filter_retard_depot')
    
    class Meta:
        model = DeclarationFiscale
        fields = ['type_declaration', 'statut', 'exercice']
    
    def filter_retard_depot(self, queryset, name, value):
        """Filtrer les déclarations en retard."""
        if value:
            now = timezone.now().date()
            return queryset.filter(
                statut__in=['preparee', 'validee'],
                date_limite_depot__lt=now
            )
        return queryset


class RapportFilter(filters.FilterSet):
    """Filtres pour les rapports."""
    nom = filters.CharFilter(field_name='nom', lookup_expr='icontains')
    description = filters.CharFilter(field_name='description', lookup_expr='icontains')
    date_creation_debut = filters.DateFilter(field_name='date_creation', lookup_expr='gte')
    date_creation_fin = filters.DateFilter(field_name='date_creation', lookup_expr='lte')
    
    class Meta:
        model = Rapport
        fields = ['type_rapport', 'statut', 'cree_par']


class SearchFilter(filters.FilterSet):
    """Filtre de recherche global."""
    q = filters.CharFilter(method='filter_global_search')
    
    def filter_global_search(self, queryset, name, value):
        """Recherche globale dans plusieurs champs."""
        if not value:
            return queryset
        
        # Cette méthode doit être surchargée dans chaque FilterSet
        # pour définir les champs de recherche appropriés
        return queryset