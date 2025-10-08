"""
Views minimales pour Phase 1 WiseBook API
"""
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth import authenticate, login, logout
from django.utils import timezone
from django.db.models import Q, Sum, Count
from django.db import transaction
from decimal import Decimal
import logging

from .serializers_minimal import *
from .permissions import *
from apps.core.models import Societe, Devise
from apps.accounting.models import FiscalYear, ChartOfAccounts, JournalEntry, Journal, JournalEntryLine
from apps.third_party.models import Tiers, AdresseTiers, ContactTiers
from apps.authentication.models import User, Role, Permission

logger = logging.getLogger(__name__)


# ============================================================================
# AUTHENTICATION VIEWS
# ============================================================================

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login_api(request):
    """Endpoint de connexion API."""
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data['user']
        login(request, user)

        return Response({
            'success': True,
            'message': 'Connexion réussie',
            'user': UserSerializer(user).data
        })

    return Response({
        'success': False,
        'errors': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def logout_api(request):
    """Endpoint de déconnexion API."""
    logout(request)
    return Response({
        'success': True,
        'message': 'Déconnexion réussie'
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def profile_api(request):
    """Endpoint pour récupérer le profil utilisateur."""
    return Response(UserSerializer(request.user).data)


# ============================================================================
# BASE VIEWSET
# ============================================================================

class BaseWiseBookViewSet(viewsets.ModelViewSet):
    """ViewSet de base pour WiseBook."""
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    pagination_class = None  # Utiliser la pagination par défaut

    def perform_create(self, serializer):
        """Enregistrer l'utilisateur qui crée l'objet."""
        if hasattr(serializer.Meta.model, 'created_by'):
            serializer.save(created_by=self.request.user)
        else:
            serializer.save()

    def perform_update(self, serializer):
        """Enregistrer l'utilisateur qui modifie l'objet."""
        if hasattr(serializer.Meta.model, 'updated_by'):
            serializer.save(updated_by=self.request.user)
        else:
            serializer.save()


# ============================================================================
# CORE VIEWSETS
# ============================================================================

class SocieteViewSet(BaseWiseBookViewSet):
    """ViewSet pour les sociétés."""
    queryset = Societe.objects.all()
    serializer_class = SocieteSerializer
    search_fields = ['nom', 'code', 'email']
    ordering_fields = ['nom', 'code', 'created_at']
    ordering = ['nom']


class DeviseViewSet(BaseWiseBookViewSet):
    """ViewSet pour les devises."""
    queryset = Devise.objects.filter(is_active=True)
    serializer_class = DeviseSerializer
    search_fields = ['code', 'nom']
    ordering_fields = ['code', 'nom']
    ordering = ['code']


# ============================================================================
# AUTHENTICATION VIEWSETS
# ============================================================================

class UserViewSet(BaseWiseBookViewSet):
    """ViewSet pour les utilisateurs."""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    search_fields = ['email', 'first_name', 'last_name']
    ordering_fields = ['email', 'created_at']
    ordering = ['-created_at']

    @action(detail=False, methods=['get'])
    def me(self, request):
        """Retourne le profil de l'utilisateur connecté."""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)


class RoleViewSet(BaseWiseBookViewSet):
    """ViewSet pour les rôles."""
    queryset = Role.objects.filter(is_active=True)
    serializer_class = RoleSerializer
    search_fields = ['code', 'name']
    ordering_fields = ['name', 'code']
    ordering = ['name']


class PermissionViewSet(BaseWiseBookViewSet):
    """ViewSet pour les permissions."""
    queryset = Permission.objects.all()
    serializer_class = PermissionSerializer
    search_fields = ['code', 'name', 'module']
    filterset_fields = ['module']
    ordering_fields = ['module', 'code']
    ordering = ['module', 'code']


# ============================================================================
# ACCOUNTING VIEWSETS
# ============================================================================

class FiscalYearViewSet(BaseWiseBookViewSet):
    """ViewSet pour les exercices comptables."""
    queryset = FiscalYear.objects.all()
    serializer_class = FiscalYearSerializer
    search_fields = ['code', 'name']
    filterset_fields = ['company', 'is_active', 'is_closed']
    ordering_fields = ['start_date', 'code']
    ordering = ['-start_date']

    @action(detail=False, methods=['get'])
    def active(self, request):
        """Retourne les exercices actifs."""
        queryset = self.queryset.filter(is_active=True, is_closed=False)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class JournalViewSet(BaseWiseBookViewSet):
    """ViewSet pour les journaux comptables."""
    queryset = Journal.objects.all()
    serializer_class = JournalSerializer
    search_fields = ['code', 'name']
    filterset_fields = ['company', 'journal_type', 'is_active']
    ordering_fields = ['code', 'name']
    ordering = ['code']


class ChartOfAccountsViewSet(BaseWiseBookViewSet):
    """ViewSet pour le plan comptable."""
    queryset = ChartOfAccounts.objects.all()
    serializer_class = ChartOfAccountsSerializer
    search_fields = ['code', 'name']
    filterset_fields = ['company', 'account_class', 'account_type', 'is_active']
    ordering_fields = ['code', 'name']
    ordering = ['code']

    @action(detail=False, methods=['get'])
    def by_class(self, request):
        """Retourne les comptes groupés par classe."""
        company = request.query_params.get('company')
        queryset = self.queryset.filter(company=company) if company else self.queryset

        grouped = {}
        for account in queryset:
            class_code = account.account_class
            if class_code not in grouped:
                grouped[class_code] = []
            grouped[class_code].append(ChartOfAccountsSerializer(account).data)

        return Response(grouped)


class JournalEntryViewSet(BaseWiseBookViewSet):
    """ViewSet pour les écritures comptables."""
    queryset = JournalEntry.objects.all()
    serializer_class = JournalEntrySerializer
    search_fields = ['piece_number', 'description', 'reference']
    filterset_fields = ['company', 'fiscal_year', 'journal', 'is_validated', 'is_balanced']
    ordering_fields = ['entry_date', 'piece_number', 'created_at']
    ordering = ['-entry_date', '-piece_number']

    @action(detail=True, methods=['post'])
    def validate(self, request, pk=None):
        """Valide une écriture comptable."""
        entry = self.get_object()

        if entry.is_validated:
            return Response({
                'success': False,
                'message': 'Cette écriture est déjà validée'
            }, status=status.HTTP_400_BAD_REQUEST)

        if not entry.is_balanced:
            return Response({
                'success': False,
                'message': 'Cette écriture n\'est pas équilibrée'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            entry.validate_entry(request.user)
            return Response({
                'success': True,
                'message': 'Écriture validée avec succès',
                'entry': JournalEntrySerializer(entry).data
            })
        except Exception as e:
            return Response({
                'success': False,
                'message': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Statistiques sur les écritures."""
        company = request.query_params.get('company')
        queryset = self.queryset.filter(company=company) if company else self.queryset

        stats = {
            'total': queryset.count(),
            'validated': queryset.filter(is_validated=True).count(),
            'pending': queryset.filter(is_validated=False).count(),
            'unbalanced': queryset.filter(is_balanced=False).count(),
            'total_debit': queryset.aggregate(Sum('total_debit'))['total_debit__sum'] or 0,
            'total_credit': queryset.aggregate(Sum('total_credit'))['total_credit__sum'] or 0,
        }

        return Response(stats)


class JournalEntryLineViewSet(BaseWiseBookViewSet):
    """ViewSet pour les lignes d'écriture."""
    queryset = JournalEntryLine.objects.all()
    serializer_class = JournalEntryLineSerializer
    filterset_fields = ['entry', 'account', 'is_reconciled']
    ordering_fields = ['line_number', 'created_at']
    ordering = ['entry', 'line_number']


# ============================================================================
# THIRD PARTY VIEWSETS
# ============================================================================

class TiersViewSet(BaseWiseBookViewSet):
    """ViewSet pour les tiers."""
    queryset = Tiers.objects.all()
    serializer_class = TiersSerializer
    search_fields = ['code', 'raison_sociale', 'nom_commercial', 'email', 'nif', 'rccm']
    filterset_fields = ['societe', 'type_tiers', 'statut']
    ordering_fields = ['raison_sociale', 'code', 'created_at']
    ordering = ['raison_sociale']

    @action(detail=False, methods=['get'])
    def clients(self, request):
        """Retourne uniquement les clients."""
        queryset = self.queryset.filter(type_tiers__in=['CLIENT', 'CLIENT_FOURNISSEUR'])
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def fournisseurs(self, request):
        """Retourne uniquement les fournisseurs."""
        queryset = self.queryset.filter(type_tiers__in=['FOURNISSEUR', 'CLIENT_FOURNISSEUR'])
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class AdresseTiersViewSet(BaseWiseBookViewSet):
    """ViewSet pour les adresses des tiers."""
    queryset = AdresseTiers.objects.all()
    serializer_class = AdresseTiersSerializer
    filterset_fields = ['tiers', 'type_adresse', 'is_default', 'is_active']
    ordering_fields = ['created_at']
    ordering = ['-created_at']


class ContactTiersViewSet(BaseWiseBookViewSet):
    """ViewSet pour les contacts des tiers."""
    queryset = ContactTiers.objects.all()
    serializer_class = ContactTiersSerializer
    search_fields = ['nom', 'prenom', 'email']
    filterset_fields = ['tiers', 'fonction', 'is_principal', 'is_active']
    ordering_fields = ['nom', 'created_at']
    ordering = ['nom']


# ============================================================================
# ALIASES POUR COMPATIBILITÉ
# ============================================================================

ExerciceViewSet = FiscalYearViewSet
CompteComptableViewSet = ChartOfAccountsViewSet
EcritureComptableViewSet = JournalEntryViewSet
LigneEcritureViewSet = JournalEntryLineViewSet
JournalComptableViewSet = JournalViewSet
UtilisateurViewSet = UserViewSet
