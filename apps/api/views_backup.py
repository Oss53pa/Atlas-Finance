from rest_framework import viewsets, status, permissions
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework.pagination import PageNumberPagination
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth import login, logout
from django.utils import timezone
from django.db.models import Q, Sum, Count
from django.db import transaction
from decimal import Decimal
import logging

from .serializers_minimal import *
from .permissions import *

# Phase 1 imports only
from apps.core.models import Societe, Devise
from apps.accounting.models import FiscalYear, ChartOfAccounts, JournalEntry, Journal, JournalEntryLine
from apps.third_party.models import Tiers, AdresseTiers, ContactTiers
from apps.authentication.models import User, Role, Permission

# Alias pour compatibilité
Exercice = FiscalYear
CompteComptable = ChartOfAccounts
EcritureComptable = JournalEntry
Utilisateur = User

# Phase 2 imports (désactivés pour l'instant)
# from apps.treasury.models import ComptesBancaires, MouvementTresorerie
# from apps.assets.models import Immobilisation
# from apps.analytics.models import AxeAnalytique, SectionAnalytique
# from apps.budget.models import Budget, SimulationBudget
# from apps.taxation.models import DeclarationFiscale
# from apps.fund_calls.models import CampagneAppel, AppelFonds
# from apps.reporting.models import Rapport, TableauBord
# from apps.financial_analysis.models import AnalyseFinanciere
# from apps.security.models import SessionUtilisateur
# from apps.security.services import AuthService

logger = logging.getLogger(__name__)


class StandardResultsSetPagination(PageNumberPagination):
    """Pagination standard pour l'API."""
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 100


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login_api(request):
    """Endpoint de connexion API."""
    serializer = LoginSerializer(data=request.data)
    
    if serializer.is_valid():
        user = serializer.validated_data['user']
        
        # Créer une session
        auth_service = AuthService()
        session = auth_service.creer_session(user, request)
        
        # Générer le token JWT
        token_data = auth_service.generer_jwt_token(user, session)
        
        return Response({
            'success': True,
            'user': UtilisateurSerializer(user).data,
            'token': token_data['access_token'],
            'refresh_token': token_data['refresh_token'],
            'expires_in': token_data['expires_in'],
            'session_id': session.id
        })
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def logout_api(request):
    """Endpoint de déconnexion API."""
    try:
        # Désactiver la session
        if hasattr(request.user, 'sessions'):
            sessions = request.user.sessions.filter(active=True)
            sessions.update(active=False, date_deconnexion=timezone.now())
        
        return Response({'success': True, 'message': 'Déconnexion réussie'})
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Erreur lors de la déconnexion: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def profile_api(request):
    """Endpoint pour récupérer le profil utilisateur."""
    return Response(UtilisateurSerializer(request.user).data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def dashboard_api(request):
    """Endpoint pour récupérer les données du tableau de bord."""
    try:
        societe = request.user.societe
        
        # Statistiques générales
        stats = {
            'total_clients': Client.objects.filter(societe=societe).count(),
            'total_fournisseurs': Fournisseur.objects.filter(societe=societe).count(),
            'total_factures': Facture.objects.filter(societe=societe).count(),
            'ca_mensuel': Facture.objects.filter(
                societe=societe,
                type_facture='vente',
                date_facture__month=timezone.now().month
            ).aggregate(total=Sum('montant_ttc'))['total'] or 0,
        }
        
        # Évolution des ventes (6 derniers mois)
        ventes_mensuelles = []
        for i in range(6):
            date = timezone.now() - timezone.timedelta(days=30*i)
            ca = Facture.objects.filter(
                societe=societe,
                type_facture='vente',
                date_facture__month=date.month,
                date_facture__year=date.year
            ).aggregate(total=Sum('montant_ttc'))['total'] or 0
            
            ventes_mensuelles.append({
                'mois': date.strftime('%Y-%m'),
                'montant': float(ca)
            })
        
        return Response({
            'stats': stats,
            'ventes_mensuelles': list(reversed(ventes_mensuelles))
        })
    
    except Exception as e:
        logger.error(f"Erreur dashboard API: {str(e)}")
        return Response({
            'error': 'Erreur lors de la récupération des données'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class BaseWiseBookViewSet(viewsets.ModelViewSet):
    """ViewSet de base pour WiseBook avec pagination et filtres."""
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    permission_classes = [permissions.IsAuthenticated, IsInSameSociete]
    
    def get_queryset(self):
        """Filtrer par société de l'utilisateur."""
        queryset = super().get_queryset()
        if hasattr(self.request.user, 'societe') and hasattr(queryset.model, 'societe'):
            return queryset.filter(societe=self.request.user.societe)
        return queryset


class UtilisateurViewSet(BaseWiseBookViewSet):
    """ViewSet pour les utilisateurs."""
    queryset = Utilisateur.objects.all()
    serializer_class = UtilisateurSerializer
    permission_classes = [permissions.IsAuthenticated, CanManageUsers]
    search_fields = ['email', 'nom', 'prenom']
    ordering_fields = ['nom', 'prenom', 'date_joined']
    ordering = ['nom', 'prenom']


class SocieteViewSet(BaseWiseBookViewSet):
    """ViewSet pour les sociétés."""
    queryset = Societe.objects.all()
    serializer_class = SocieteSerializer
    permission_classes = [permissions.IsAuthenticated, IsDirecteurFinancierOrAdmin]
    search_fields = ['nom', 'siret', 'sigle']
    ordering_fields = ['nom', 'date_creation']
    ordering = ['nom']


class ExerciceViewSet(BaseWiseBookViewSet):
    """ViewSet pour les exercices comptables."""
    queryset = Exercice.objects.all()
    serializer_class = ExerciceSerializer
    permission_classes = [permissions.IsAuthenticated, IsComptableOrAdmin]
    ordering_fields = ['date_debut', 'date_fin']
    ordering = ['-date_debut']


class CompteComptableViewSet(BaseWiseBookViewSet):
    """ViewSet pour les comptes comptables."""
    queryset = CompteComptable.objects.all()
    serializer_class = CompteComptableSerializer
    permission_classes = [permissions.IsAuthenticated, IsComptableOrAdmin]
    search_fields = ['numero', 'nom']
    filterset_fields = ['type_compte', 'classe', 'actif']
    ordering_fields = ['numero', 'nom']
    ordering = ['numero']
    
    @action(detail=False, methods=['get'])
    def plan_comptable(self, request):
        """Récupérer le plan comptable complet."""
        comptes = self.get_queryset().filter(actif=True).order_by('numero')
        serializer = self.get_serializer(comptes, many=True)
        return Response(serializer.data)


class EcritureComptableViewSet(BaseWiseBookViewSet):
    """ViewSet pour les écritures comptables."""
    queryset = EcritureComptable.objects.all()
    serializer_class = EcritureComptableSerializer
    permission_classes = [permissions.IsAuthenticated, IsComptableOrAdmin]
    filterset_fields = ['journal', 'statut', 'date_comptable']
    ordering_fields = ['date_comptable', 'numero_piece']
    ordering = ['-date_comptable', '-numero_piece']
    
    @action(detail=True, methods=['post'])
    def valider(self, request, pk=None):
        """Valider une écriture comptable."""
        ecriture = self.get_object()
        
        if ecriture.statut != 'brouillon':
            return Response({
                'error': 'Seules les écritures en brouillon peuvent être validées'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            with transaction.atomic():
                ecriture.statut = 'validee'
                ecriture.date_validation = timezone.now()
                ecriture.validee_par = request.user
                ecriture.save()
                
            return Response({'success': True, 'message': 'Écriture validée'})
        except Exception as e:
            return Response({
                'error': f'Erreur lors de la validation: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ClientViewSet(BaseWiseBookViewSet):
    """ViewSet pour les clients."""
    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    search_fields = ['nom', 'email', 'telephone', 'siret']
    ordering_fields = ['nom', 'date_creation']
    ordering = ['nom']
    
    @action(detail=True, methods=['get'])
    def factures(self, request, pk=None):
        """Récupérer les factures d'un client."""
        client = self.get_object()
        factures = Facture.objects.filter(client=client).order_by('-date_facture')
        serializer = FactureSerializer(factures, many=True)
        return Response(serializer.data)


class FournisseurViewSet(BaseWiseBookViewSet):
    """ViewSet pour les fournisseurs."""
    queryset = Fournisseur.objects.all()
    serializer_class = FournisseurSerializer
    search_fields = ['nom', 'email', 'telephone', 'siret']
    ordering_fields = ['nom', 'date_creation']
    ordering = ['nom']


class FactureViewSet(BaseWiseBookViewSet):
    """ViewSet pour les factures."""
    queryset = Facture.objects.all()
    serializer_class = FactureSerializer
    filterset_fields = ['type_facture', 'statut', 'client', 'fournisseur']
    ordering_fields = ['date_facture', 'numero', 'montant_ttc']
    ordering = ['-date_facture']
    
    @action(detail=True, methods=['post'])
    def generer_ecriture(self, request, pk=None):
        """Générer l'écriture comptable pour une facture."""
        facture = self.get_object()
        
        if facture.ecriture_generee:
            return Response({
                'error': 'L\'écriture a déjà été générée pour cette facture'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Logique de génération d'écriture comptable
            # À implémenter selon les règles SYSCOHADA
            return Response({'success': True, 'message': 'Écriture générée'})
        except Exception as e:
            return Response({
                'error': f'Erreur lors de la génération: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ComptesBancairesViewSet(BaseWiseBookViewSet):
    """ViewSet pour les comptes bancaires."""
    queryset = ComptesBancaires.objects.all()
    serializer_class = ComptesBancairesSerializer
    search_fields = ['nom', 'iban', 'bic']
    ordering_fields = ['nom', 'date_creation']
    ordering = ['nom']


class MouvementTresorerieViewSet(BaseWiseBookViewSet):
    """ViewSet pour les mouvements de trésorerie."""
    queryset = MouvementTresorerie.objects.all()
    serializer_class = MouvementTresorerieSerializer
    filterset_fields = ['compte_bancaire', 'type_mouvement', 'statut']
    ordering_fields = ['date_valeur', 'montant']
    ordering = ['-date_valeur']


class ImmobilisationViewSet(BaseWiseBookViewSet):
    """ViewSet pour les immobilisations."""
    queryset = Immobilisation.objects.all()
    serializer_class = ImmobilisationSerializer
    search_fields = ['nom', 'numero_immobilisation']
    filterset_fields = ['categorie', 'methode_amortissement']
    ordering_fields = ['nom', 'date_acquisition', 'valeur_acquisition']
    ordering = ['nom']


class BudgetViewSet(BaseWiseBookViewSet):
    """ViewSet pour les budgets."""
    queryset = Budget.objects.all()
    serializer_class = BudgetSerializer
    filterset_fields = ['exercice', 'statut', 'type_budget']
    ordering_fields = ['nom', 'date_creation']
    ordering = ['nom']


class DeclarationFiscaleViewSet(BaseWiseBookViewSet):
    """ViewSet pour les déclarations fiscales."""
    queryset = DeclarationFiscale.objects.all()
    serializer_class = DeclarationFiscaleSerializer
    permission_classes = [permissions.IsAuthenticated, IsDirecteurFinancierOrAdmin]
    filterset_fields = ['type_declaration', 'statut', 'exercice']
    ordering_fields = ['date_declaration', 'date_depot']
    ordering = ['-date_declaration']


class CampagneAppelViewSet(BaseWiseBookViewSet):
    """ViewSet pour les campagnes d'appel."""
    queryset = CampagneAppel.objects.all()
    serializer_class = CampagneAppelSerializer
    search_fields = ['nom', 'description']
    filterset_fields = ['statut', 'type_campagne']
    ordering_fields = ['nom', 'date_creation', 'date_debut']
    ordering = ['-date_creation']


class AppelFondsViewSet(BaseWiseBookViewSet):
    """ViewSet pour les appels de fonds."""
    queryset = AppelFonds.objects.all()
    serializer_class = AppelFondsSerializer
    filterset_fields = ['campagne', 'statut', 'associe']
    ordering_fields = ['date_appel', 'montant_appele']
    ordering = ['-date_appel']


class RapportViewSet(BaseWiseBookViewSet):
    """ViewSet pour les rapports."""
    queryset = Rapport.objects.all()
    serializer_class = RapportSerializer
    permission_classes = [permissions.IsAuthenticated, CanAccessReports]
    search_fields = ['nom', 'description']
    filterset_fields = ['type_rapport', 'statut']
    ordering_fields = ['nom', 'date_creation']
    ordering = ['nom']


class TableauBordViewSet(BaseWiseBookViewSet):
    """ViewSet pour les tableaux de bord."""
    queryset = TableauBord.objects.all()
    serializer_class = TableauBordSerializer
    search_fields = ['nom', 'description']
    ordering_fields = ['nom', 'date_creation']
    ordering = ['nom']


class AnalyseFinanciereViewSet(BaseWiseBookViewSet):
    """ViewSet for financial analysis."""
    queryset = AnalyseFinanciere.objects.all()
    serializer_class = AnalyseFinanciereSerializer
    permission_classes = [permissions.IsAuthenticated, CanAccessFinancialData]
    filterset_fields = ['type_analyse', 'exercice']
    ordering_fields = ['date_analyse', 'type_analyse']
    ordering = ['-date_analyse']