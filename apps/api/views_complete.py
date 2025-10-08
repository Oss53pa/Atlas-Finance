"""
Vues API complètes pour WiseBook V3.0
Tous les ViewSets et endpoints avec gestion d'erreurs
"""
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.authentication import SessionAuthentication
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.db import transaction
from django.utils import timezone
from django.http import JsonResponse
from decimal import Decimal
import logging

from apps.core.models import Societe, Exercice, Devise, AuditLog
from apps.accounting.models import CompteComptable, JournalComptable, EcritureComptable, LigneEcriture
from apps.third_party.models import Tiers, Contact
from apps.treasury.models import CompteBancaire, MouvementBancaire
from apps.assets.models import Immobilisation
from apps.analytics.models import AxeAnalytique, CentreAnalytique
from apps.budgeting.models import Budget, LigneBudget
from apps.taxation.models import DeclarationFiscale
from apps.reporting.models import Rapport, Dashboard
from apps.security.models import Utilisateur, Role

from .serializers import *
from .permissions import WiseBookPermission
from .filters import *

logger = logging.getLogger(__name__)


class BaseWiseBookViewSet(viewsets.ModelViewSet):
    """Classe de base pour tous les ViewSets WiseBook."""
    
    authentication_classes = [JWTAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated, WiseBookPermission]
    
    def get_queryset(self):
        """Filtre par société de l'utilisateur connecté."""
        queryset = super().get_queryset()
        if hasattr(queryset.model, 'societe'):
            return queryset.filter(societe=self.request.user.societe)
        return queryset
    
    def perform_create(self, serializer):
        """Ajout automatique de la société et utilisateur."""
        kwargs = {}
        if hasattr(serializer.Meta.model, 'societe'):
            kwargs['societe'] = self.request.user.societe
        if hasattr(serializer.Meta.model, 'utilisateur_creation'):
            kwargs['utilisateur_creation'] = self.request.user
        serializer.save(**kwargs)
    
    def perform_update(self, serializer):
        """Mise à jour avec utilisateur de modification."""
        kwargs = {}
        if hasattr(serializer.Meta.model, 'utilisateur_modification'):
            kwargs['utilisateur_modification'] = self.request.user
            kwargs['date_modification'] = timezone.now()
        serializer.save(**kwargs)
    
    def handle_exception(self, exc):
        """Gestion d'erreurs standardisée."""
        logger.error(f"Error in {self.__class__.__name__}: {str(exc)}")
        return super().handle_exception(exc)


# ==================== CORE VIEWSETS ====================

class SocieteViewSet(BaseWiseBookViewSet):
    """Gestion des sociétés."""
    queryset = Societe.objects.all()
    serializer_class = SocieteSerializer
    filterset_class = SocieteFilter
    search_fields = ['nom', 'sigle', 'email']
    ordering_fields = ['nom', 'date_creation']
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activer une société."""
        societe = self.get_object()
        societe.active = True
        societe.save()
        return Response({'status': 'activated'})
    
    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Désactiver une société."""
        societe = self.get_object()
        societe.active = False
        societe.save()
        return Response({'status': 'deactivated'})


class ExerciceViewSet(BaseWiseBookViewSet):
    """Gestion des exercices comptables."""
    queryset = Exercice.objects.all()
    serializer_class = ExerciceSerializer
    filterset_class = ExerciceFilter
    ordering_fields = ['annee', 'date_debut']
    
    @action(detail=True, methods=['post'])
    def cloturer(self, request, pk=None):
        """Clôturer un exercice."""
        exercice = self.get_object()
        if exercice.statut != 'ouvert':
            return Response(
                {'error': 'Seuls les exercices ouverts peuvent être clôturés'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with transaction.atomic():
            exercice.statut = 'cloture'
            exercice.date_cloture = timezone.now().date()
            exercice.save()
            
            # Log de l'action
            AuditLog.objects.create(
                utilisateur=request.user,
                societe=exercice.societe,
                action='CLOTURE_EXERCICE',
                model_name='Exercice',
                object_id=exercice.id,
                details={'annee': exercice.annee}
            )
        
        return Response({'status': 'cloture', 'date_cloture': exercice.date_cloture})


class DeviseViewSet(BaseWiseBookViewSet):
    """Gestion des devises."""
    queryset = Devise.objects.all()
    serializer_class = DeviseSerializer
    search_fields = ['code', 'nom']
    ordering_fields = ['code', 'nom']
    
    @action(detail=False)
    def reference(self, request):
        """Récupère la devise de référence."""
        devise_ref = Devise.objects.filter(devise_reference=True).first()
        if devise_ref:
            serializer = self.get_serializer(devise_ref)
            return Response(serializer.data)
        return Response({'error': 'Aucune devise de référence définie'}, 
                       status=status.HTTP_404_NOT_FOUND)


# ==================== ACCOUNTING VIEWSETS ====================

class CompteComptableViewSet(BaseWiseBookViewSet):
    """Gestion des comptes comptables."""
    queryset = CompteComptable.objects.all()
    serializer_class = CompteComptableSerializer
    filterset_class = CompteComptableFilter
    search_fields = ['numero', 'intitule']
    ordering_fields = ['numero', 'intitule', 'classe']
    
    @action(detail=False, methods=['post'])
    def import_syscohada(self, request):
        """Import du plan comptable SYSCOHADA."""
        try:
            from apps.accounting.services import ComptabiliteService
            service = ComptabiliteService(request.user.societe)
            result = service.importer_plan_syscohada()
            return Response({
                'status': 'success',
                'comptes_importes': result['created_count'],
                'message': 'Plan comptable SYSCOHADA importé avec succès'
            })
        except Exception as e:
            return Response(
                {'error': f'Erreur lors de l\'import: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def solde(self, request, pk=None):
        """Calcule le solde d'un compte."""
        compte = self.get_object()
        from apps.accounting.services import ComptabiliteService
        service = ComptabiliteService(request.user.societe)
        solde = service.calculer_solde_compte(compte)
        
        return Response({
            'compte': compte.numero,
            'intitule': compte.intitule,
            'solde_debiteur': solde.get('debit', 0),
            'solde_crediteur': solde.get('credit', 0),
            'solde_net': solde.get('solde', 0)
        })


class JournalComptableViewSet(BaseWiseBookViewSet):
    """Gestion des journaux comptables."""
    queryset = JournalComptable.objects.all()
    serializer_class = JournalComptableSerializer
    search_fields = ['code', 'libelle']
    ordering_fields = ['code', 'libelle', 'type']


class EcritureComptableViewSet(BaseWiseBookViewSet):
    """Gestion des écritures comptables."""
    queryset = EcritureComptable.objects.all()
    serializer_class = EcritureComptableSerializer
    filterset_class = EcritureComptableFilter
    search_fields = ['numero', 'libelle', 'reference_externe']
    ordering_fields = ['date_ecriture', 'numero', 'montant_total']
    
    @action(detail=True, methods=['post'])
    def valider(self, request, pk=None):
        """Valider une écriture."""
        ecriture = self.get_object()
        if ecriture.statut != 'brouillard':
            return Response(
                {'error': 'Seules les écritures en brouillard peuvent être validées'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            with transaction.atomic():
                from apps.accounting.services import ComptabiliteService
                service = ComptabiliteService(request.user.societe)
                service.valider_ecriture(ecriture, request.user)
                
            return Response({'status': 'validee', 'date_validation': ecriture.date_validation})
        except Exception as e:
            return Response(
                {'error': f'Erreur lors de la validation: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def extourner(self, request, pk=None):
        """Extourner une écriture."""
        ecriture = self.get_object()
        if ecriture.statut != 'valide':
            return Response(
                {'error': 'Seules les écritures validées peuvent être extournées'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            with transaction.atomic():
                from apps.accounting.services import ComptabiliteService
                service = ComptabiliteService(request.user.societe)
                ecriture_extourne = service.extourner_ecriture(ecriture, request.user)
                
            serializer = self.get_serializer(ecriture_extourne)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': f'Erreur lors de l\'extourne: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )


class LigneEcritureViewSet(BaseWiseBookViewSet):
    """Gestion des lignes d'écriture."""
    queryset = LigneEcriture.objects.all()
    serializer_class = LigneEcritureSerializer
    filterset_class = LigneEcritureFilter
    ordering_fields = ['ordre_ligne', 'montant_debit', 'montant_credit']


# ==================== THIRD PARTY VIEWSETS ====================

class TiersViewSet(BaseWiseBookViewSet):
    """Gestion des tiers (clients/fournisseurs)."""
    queryset = Tiers.objects.all()
    serializer_class = TiersSerializer
    filterset_class = TiersFilter
    search_fields = ['nom', 'code', 'email', 'telephone']
    ordering_fields = ['nom', 'code', 'date_creation']
    
    @action(detail=True, methods=['get'])
    def balance(self, request, pk=None):
        """Balance d'un tiers."""
        tiers = self.get_object()
        from apps.third_party.services import TiersService
        service = TiersService(request.user.societe)
        balance = service.calculer_balance_tiers(tiers)
        
        return Response({
            'tiers': tiers.code,
            'nom': tiers.nom,
            'solde_debiteur': balance.get('debit', 0),
            'solde_crediteur': balance.get('credit', 0),
            'solde_net': balance.get('solde', 0),
            'echeances': balance.get('echeances', [])
        })
    
    @action(detail=True, methods=['post'])
    def bloquer(self, request, pk=None):
        """Bloquer un tiers."""
        tiers = self.get_object()
        tiers.bloque = True
        tiers.date_blocage = timezone.now().date()
        tiers.motif_blocage = request.data.get('motif', 'Blocage manuel')
        tiers.save()
        
        return Response({'status': 'bloque'})


class ContactViewSet(BaseWiseBookViewSet):
    """Gestion des contacts."""
    queryset = Contact.objects.all()
    serializer_class = ContactSerializer
    search_fields = ['nom', 'prenom', 'email', 'telephone']
    ordering_fields = ['nom', 'prenom']


# ==================== TREASURY VIEWSETS ====================

class CompteBancaireViewSet(BaseWiseBookViewSet):
    """Gestion des comptes bancaires."""
    queryset = CompteBancaire.objects.all()
    serializer_class = CompteBancaireSerializer
    search_fields = ['nom', 'numero_compte', 'banque']
    ordering_fields = ['nom', 'banque', 'date_ouverture']
    
    @action(detail=True, methods=['get'])
    def solde(self, request, pk=None):
        """Solde actuel du compte."""
        compte = self.get_object()
        from apps.treasury.services import TresorerieService
        service = TresorerieService(request.user.societe)
        solde = service.calculer_solde_compte_bancaire(compte)
        
        return Response({
            'compte': compte.nom,
            'numero': compte.numero_compte,
            'solde_initial': compte.solde_initial,
            'mouvements_debiteurs': solde.get('debit', 0),
            'mouvements_crediteurs': solde.get('credit', 0),
            'solde_actuel': solde.get('solde_final', 0)
        })


class MouvementBancaireViewSet(BaseWiseBookViewSet):
    """Gestion des mouvements bancaires."""
    queryset = MouvementBancaire.objects.all()
    serializer_class = MouvementBancaireSerializer
    filterset_class = MouvementBancaireFilter
    ordering_fields = ['date_mouvement', 'montant']


class AmortissementViewSet(BaseWiseBookViewSet):
    """Gestion des amortissements."""
    queryset = Immobilisation.objects.all()  # Placeholder
    serializer_class = ImmobilisationSerializer
    
    @action(detail=True, methods=['post'])
    def calculer_amortissement(self, request, pk=None):
        """Calculer l'amortissement d'une immobilisation."""
        immobilisation = self.get_object()
        from apps.assets.services import ImmobilisationService
        service = ImmobilisationService(request.user.societe)
        plan = service.calculer_plan_amortissement(immobilisation)
        
        return Response({
            'immobilisation': immobilisation.designation,
            'plan_amortissement': plan,
            'dotation_mensuelle': immobilisation.dotation_mensuelle,
            'valeur_nette': immobilisation.valeur_nette_comptable
        })


# ==================== ANALYTICS VIEWSETS ====================

class AxeAnalytiqueViewSet(BaseWiseBookViewSet):
    """Gestion des axes analytiques."""
    queryset = AxeAnalytique.objects.all()
    serializer_class = AxeAnalytiqueSerializer
    search_fields = ['code', 'libelle']
    ordering_fields = ['code', 'libelle']


class CentreAnalytiqueViewSet(BaseWiseBookViewSet):
    """Gestion des centres analytiques."""
    queryset = CentreAnalytique.objects.all()
    serializer_class = CentreAnalytiqueSerializer
    search_fields = ['code', 'libelle']
    ordering_fields = ['code', 'libelle']


# ==================== BUDGETING VIEWSETS ====================

class BudgetViewSet(BaseWiseBookViewSet):
    """Gestion des budgets."""
    queryset = Budget.objects.all()
    serializer_class = BudgetSerializer
    filterset_class = BudgetFilter
    ordering_fields = ['exercice', 'nom', 'date_creation']
    
    @action(detail=True, methods=['post'])
    def approuver(self, request, pk=None):
        """Approuver un budget."""
        budget = self.get_object()
        budget.statut = 'approuve'
        budget.date_approbation = timezone.now().date()
        budget.utilisateur_approbation = request.user
        budget.save()
        
        return Response({'status': 'approuve'})


class ControleBudgetaireViewSet(BaseWiseBookViewSet):
    """Contrôle budgétaire."""
    queryset = Budget.objects.all()  # Placeholder
    serializer_class = BudgetSerializer
    
    @action(detail=False, methods=['get'])
    def alertes(self, request):
        """Alertes de dépassement budgétaire."""
        from apps.budgeting.services import BudgetService
        service = BudgetService(request.user.societe)
        alertes = service.detecter_depassements()
        
        return Response({
            'alertes': alertes,
            'count': len(alertes)
        })


# ==================== TAXATION VIEWSETS ====================

class DeclarationFiscaleViewSet(BaseWiseBookViewSet):
    """Gestion des déclarations fiscales."""
    queryset = DeclarationFiscale.objects.all()
    serializer_class = DeclarationFiscaleSerializer
    filterset_class = DeclarationFiscaleFilter
    ordering_fields = ['periode', 'type_declaration', 'date_limite']


# ==================== REPORTING VIEWSETS ====================

class RapportViewSet(BaseWiseBookViewSet):
    """Gestion des rapports."""
    queryset = Rapport.objects.all()
    serializer_class = RapportSerializer
    search_fields = ['nom', 'description']
    ordering_fields = ['nom', 'date_creation']
    
    @action(detail=True, methods=['post'])
    def generer(self, request, pk=None):
        """Générer un rapport."""
        rapport = self.get_object()
        try:
            from apps.reporting.services import ReportingService
            service = ReportingService(request.user.societe)
            resultat = service.generer_rapport(rapport, request.data)
            
            return Response({
                'status': 'generated',
                'rapport_id': rapport.id,
                'data': resultat
            })
        except Exception as e:
            return Response(
                {'error': f'Erreur génération rapport: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class DashboardViewSet(BaseWiseBookViewSet):
    """Gestion des tableaux de bord."""
    queryset = Dashboard.objects.all()
    serializer_class = DashboardSerializer
    search_fields = ['nom', 'description']


# ==================== SECURITY VIEWSETS ====================

class UtilisateurViewSet(BaseWiseBookViewSet):
    """Gestion des utilisateurs."""
    queryset = Utilisateur.objects.all()
    serializer_class = UtilisateurSerializer
    search_fields = ['username', 'email', 'nom', 'prenom']
    ordering_fields = ['username', 'nom', 'date_joined']


class RoleViewSet(BaseWiseBookViewSet):
    """Gestion des rôles."""
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    search_fields = ['nom', 'code']
    ordering_fields = ['nom', 'code']


# ==================== UTILITY VIEWS ====================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_data(request):
    """Données pour le tableau de bord principal."""
    try:
        from apps.reporting.services import DashboardService
        service = DashboardService(request.user.societe)
        data = service.generer_donnees_dashboard(request.user)
        
        return Response(data)
    except Exception as e:
        logger.error(f"Error generating dashboard data: {str(e)}")
        return Response(
            {'error': 'Erreur lors de la génération des données'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def api_docs(request):
    """Documentation API simple."""
    return JsonResponse({
        'title': 'WiseBook V3.0 API Documentation',
        'version': '3.0.0',
        'description': 'ERP Comptable SYSCOHADA pour l\'Afrique',
        'base_url': request.build_absolute_uri('/api/'),
        'endpoints': {
            'authentication': '/api/auth/',
            'core': '/api/societes/, /api/exercices/, /api/devises/',
            'accounting': '/api/comptes/, /api/journaux/, /api/ecritures/',
            'third_party': '/api/tiers/, /api/contacts/',
            'treasury': '/api/comptes-bancaires/, /api/mouvements-bancaires/',
            'assets': '/api/immobilisations/, /api/amortissements/',
            'analytics': '/api/axes-analytiques/, /api/centres-analytiques/',
            'budgeting': '/api/budgets/, /api/controles-budgetaires/',
            'reporting': '/api/rapports/, /api/dashboards/',
        }
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """Vue de connexion personnalisée."""
    from rest_framework_simplejwt.tokens import RefreshToken
    from django.contrib.auth import authenticate
    
    username = request.data.get('username')
    password = request.data.get('password')
    
    if not username or not password:
        return Response(
            {'error': 'Username and password required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    user = authenticate(username=username, password=password)
    if user:
        refresh = RefreshToken.for_user(user)
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'nom': getattr(user, 'nom', ''),
                'prenom': getattr(user, 'prenom', ''),
                'societe': getattr(user.societe, 'nom', '') if hasattr(user, 'societe') and user.societe else ''
            }
        })
    else:
        return Response(
            {'error': 'Invalid credentials'},
            status=status.HTTP_401_UNAUTHORIZED
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """Vue de déconnexion."""
    return Response({'message': 'Successfully logged out'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def profile_view(request):
    """Profil utilisateur."""
    user = request.user
    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'nom': getattr(user, 'nom', ''),
        'prenom': getattr(user, 'prenom', ''),
        'societe': {
            'id': user.societe.id if hasattr(user, 'societe') and user.societe else None,
            'nom': user.societe.nom if hasattr(user, 'societe') and user.societe else '',
        },
        'permissions': list(user.get_all_permissions())
    })