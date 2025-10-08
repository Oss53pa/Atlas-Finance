"""
Permissions complètes pour WiseBook V3.0 API
Système de permissions granulaires et sécurisé
"""
from rest_framework import permissions
from rest_framework.exceptions import PermissionDenied
from django.contrib.auth.models import AnonymousUser
from django.utils import timezone
from datetime import timedelta

from apps.security.models import Permission, Role, JournalSecurite
from apps.core.models import Societe, Exercice


class BaseWiseBookPermission(permissions.BasePermission):
    """Permission de base pour WiseBook avec logging."""
    
    def has_permission(self, request, view):
        """Vérification de permission avec audit."""
        result = self._check_permission(request, view)
        
        # Log de l'accès (succès ou échec)
        if hasattr(request, 'user') and not isinstance(request.user, AnonymousUser):
            JournalSecurite.objects.create(
                utilisateur=request.user,
                societe=getattr(request.user, 'societe', None),
                action='API_ACCESS',
                ressource=f"{view.__class__.__name__}.{view.action if hasattr(view, 'action') else request.method}",
                ip_address=self._get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                statut='SUCCESS' if result else 'DENIED',
                details={
                    'method': request.method,
                    'path': request.path,
                    'query_params': dict(request.query_params)
                }
            )
        
        return result
    
    def _check_permission(self, request, view):
        """Méthode à surcharger pour la logique de permission."""
        return True
    
    def _get_client_ip(self, request):
        """Récupère l'IP du client."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class IsAuthenticatedAndActive(BaseWiseBookPermission):
    """Utilisateur authentifié et actif."""
    
    def _check_permission(self, request, view):
        """Vérifie que l'utilisateur est authentifié et actif."""
        return (
            request.user and
            request.user.is_authenticated and
            request.user.is_active and
            not request.user.is_locked
        )


class HasSocietePermission(BaseWiseBookPermission):
    """L'utilisateur doit appartenir à une société."""
    
    def _check_permission(self, request, view):
        """Vérifie l'appartenance à une société."""
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Super utilisateurs peuvent accéder à toutes les sociétés
        if request.user.is_superuser:
            return True
        
        # Utilisateur doit avoir une société
        if not hasattr(request.user, 'societe') or not request.user.societe:
            return False
        
        # Vérifier que la société est active
        return request.user.societe.active


class WiseBookModulePermission(BaseWiseBookPermission):
    """Permission par module avec actions CRUD."""
    
    # Mapping des actions vers les permissions
    action_permissions = {
        'list': 'view',
        'retrieve': 'view',
        'create': 'add',
        'update': 'change',
        'partial_update': 'change',
        'destroy': 'delete',
    }
    
    def _check_permission(self, request, view):
        """Vérifie les permissions par module."""
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Super utilisateurs ont tous les droits
        if request.user.is_superuser:
            return True
        
        # Déterminer le module et l'action
        module_name = self._get_module_name(view)
        action = self._get_action_name(request, view)
        
        if not module_name or not action:
            return False
        
        # Construire le code de permission
        permission_code = f"{module_name}.{action}_{view.__class__.__name__.lower().replace('viewset', '')}"
        
        # Vérifier la permission
        return self._has_permission_code(request.user, permission_code)
    
    def _get_module_name(self, view):
        """Détermine le nom du module."""
        module_map = {
            'CompteComptableViewSet': 'accounting',
            'JournalComptableViewSet': 'accounting',
            'EcritureComptableViewSet': 'accounting',
            'LigneEcritureViewSet': 'accounting',
            'TiersViewSet': 'third_party',
            'ContactViewSet': 'third_party',
            'CompteBancaireViewSet': 'treasury',
            'MouvementBancaireViewSet': 'treasury',
            'ImmobilisationViewSet': 'assets',
            'AxeAnalytiqueViewSet': 'analytics',
            'CentreAnalytiqueViewSet': 'analytics',
            'BudgetViewSet': 'budgeting',
            'DeclarationFiscaleViewSet': 'taxation',
            'RapportViewSet': 'reporting',
            'DashboardViewSet': 'reporting',
            'UtilisateurViewSet': 'security',
            'RoleViewSet': 'security',
            'SocieteViewSet': 'core',
            'ExerciceViewSet': 'core',
            'DeviseViewSet': 'core',
        }
        
        return module_map.get(view.__class__.__name__, 'core')
    
    def _get_action_name(self, request, view):
        """Détermine l'action à partir de la méthode HTTP."""
        if hasattr(view, 'action'):
            return self.action_permissions.get(view.action)
        
        method_actions = {
            'GET': 'view',
            'POST': 'add',
            'PUT': 'change',
            'PATCH': 'change',
            'DELETE': 'delete',
        }
        
        return method_actions.get(request.method)
    
    def _has_permission_code(self, user, permission_code):
        """Vérifie si l'utilisateur a une permission spécifique."""
        try:
            # Vérifier via les rôles
            user_permissions = Permission.objects.filter(
                roles__utilisateurs=user,
                code=permission_code,
                actif=True
            )
            
            if user_permissions.exists():
                return True
            
            # Permissions directes (si implémenté)
            direct_permissions = user.permissions.filter(
                code=permission_code,
                actif=True
            )
            
            return direct_permissions.exists()
            
        except Exception:
            return False


class ExerciceOpenPermission(BaseWiseBookPermission):
    """Permission pour les opérations nécessitant un exercice ouvert."""
    
    def _check_permission(self, request, view):
        """Vérifie qu'il y a un exercice ouvert."""
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Super utilisateur peut tout faire
        if request.user.is_superuser:
            return True
        
        societe = getattr(request.user, 'societe', None)
        if not societe:
            return False
        
        # Vérifier qu'il existe un exercice ouvert
        exercice_ouvert = Exercice.objects.filter(
            societe=societe,
            statut='ouvert'
        ).exists()
        
        return exercice_ouvert


class ReadOnlyOrOwnerPermission(BaseWiseBookPermission):
    """Lecture pour tous, écriture pour le propriétaire seulement."""
    
    def _check_permission(self, request, view):
        """Permission de base (authentification)."""
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        """Permission sur l'objet."""
        # Lecture autorisée pour tous
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Écriture seulement pour le propriétaire ou super utilisateur
        if request.user.is_superuser:
            return True
        
        # Vérifier si l'objet appartient à l'utilisateur
        if hasattr(obj, 'utilisateur'):
            return obj.utilisateur == request.user
        
        if hasattr(obj, 'utilisateur_creation'):
            return obj.utilisateur_creation == request.user
        
        return False


class SocieteIsolationPermission(BaseWiseBookPermission):
    """Isolation par société - les utilisateurs ne voient que leurs données."""
    
    def has_object_permission(self, request, view, obj):
        """Vérifie l'isolation par société."""
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Super utilisateur peut tout voir
        if request.user.is_superuser:
            return True
        
        # Vérifier que l'objet appartient à la même société
        if hasattr(obj, 'societe'):
            return obj.societe == request.user.societe
        
        # Pour les objets sans société (ex: devises), autoriser
        return True


class FinancialDataPermission(BaseWiseBookPermission):
    """Permission spéciale pour les données financières sensibles."""
    
    sensitive_actions = ['export', 'rapport_financier', 'balance', 'grand_livre']
    
    def _check_permission(self, request, view):
        """Vérifie les permissions pour données financières."""
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Super utilisateur autorisé
        if request.user.is_superuser:
            return True
        
        # Vérifier si l'action est sensible
        action = getattr(view, 'action', request.method.lower())
        
        if action in self.sensitive_actions:
            # Vérifier permission spéciale
            return self._has_financial_permission(request.user)
        
        return True
    
    def _has_financial_permission(self, user):
        """Vérifie les permissions financières spéciales."""
        financial_permissions = [
            'accounting.view_financial_data',
            'reporting.generate_financial_reports',
            'treasury.view_bank_data'
        ]
        
        for perm_code in financial_permissions:
            if self._has_permission_code(user, perm_code):
                return True
        
        return False
    
    def _has_permission_code(self, user, permission_code):
        """Vérifie une permission spécifique."""
        return Permission.objects.filter(
            roles__utilisateurs=user,
            code=permission_code,
            actif=True
        ).exists()


class TimeBasedPermission(BaseWiseBookPermission):
    """Permission basée sur des créneaux horaires."""
    
    def _check_permission(self, request, view):
        """Vérifie les permissions selon l'heure."""
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Super utilisateur toujours autorisé
        if request.user.is_superuser:
            return True
        
        # Vérifier les créneaux horaires
        now = timezone.now()
        current_hour = now.hour
        
        # Heures de bureau : 7h-19h
        if 7 <= current_hour <= 19:
            return True
        
        # Hors heures de bureau : seulement certaines actions
        safe_actions = ['list', 'retrieve', 'dashboard']
        action = getattr(view, 'action', request.method.lower())
        
        if action in safe_actions:
            return True
        
        # Vérifier permission spéciale hors horaires
        return self._has_after_hours_permission(request.user)
    
    def _has_after_hours_permission(self, user):
        """Vérifie la permission de travailler hors horaires."""
        return Permission.objects.filter(
            roles__utilisateurs=user,
            code='security.after_hours_access',
            actif=True
        ).exists()


class RateLimitPermission(BaseWiseBookPermission):
    """Permission avec limitation de taux."""
    
    def _check_permission(self, request, view):
        """Vérifie le rate limiting."""
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Super utilisateur pas de limite
        if request.user.is_superuser:
            return True
        
        # Vérifier le rate limiting
        return self._check_rate_limit(request.user, view)
    
    def _check_rate_limit(self, user, view):
        """Vérifie les limites de taux."""
        now = timezone.now()
        hour_ago = now - timedelta(hours=1)
        
        # Compter les accès dans la dernière heure
        recent_access = JournalSecurite.objects.filter(
            utilisateur=user,
            timestamp__gte=hour_ago,
            action='API_ACCESS'
        ).count()
        
        # Limites par type d'utilisateur
        limits = {
            'standard': 1000,  # 1000 requêtes/heure
            'premium': 5000,   # 5000 requêtes/heure
            'admin': 10000     # 10000 requêtes/heure
        }
        
        user_type = self._get_user_type(user)
        limit = limits.get(user_type, limits['standard'])
        
        return recent_access < limit
    
    def _get_user_type(self, user):
        """Détermine le type d'utilisateur."""
        if user.is_staff:
            return 'admin'
        
        # Vérifier si l'utilisateur a un rôle premium
        premium_roles = Role.objects.filter(
            utilisateurs=user,
            code__in=['PREMIUM', 'MANAGER', 'DIRECTOR']
        )
        
        if premium_roles.exists():
            return 'premium'
        
        return 'standard'


# Permission composite principale
class WiseBookPermission(permissions.BasePermission):
    """Permission composite pour WiseBook."""
    
    def has_permission(self, request, view):
        """Vérification des permissions multiples."""
        # Liste des permissions à vérifier
        permission_classes = [
            IsAuthenticatedAndActive(),
            HasSocietePermission(),
            WiseBookModulePermission(),
            RateLimitPermission(),
        ]
        
        # Actions nécessitant un exercice ouvert
        write_actions = ['create', 'update', 'partial_update', 'destroy']
        if hasattr(view, 'action') and view.action in write_actions:
            permission_classes.append(ExerciceOpenPermission())
        
        # Actions financières sensibles
        financial_views = [
            'BalanceGeneraleViewSet', 'GrandLivreViewSet', 
            'RapportViewSet', 'DashboardViewSet'
        ]
        if view.__class__.__name__ in financial_views:
            permission_classes.append(FinancialDataPermission())
        
        # Vérifier toutes les permissions
        for permission in permission_classes:
            if not permission.has_permission(request, view):
                return False
        
        return True
    
    def has_object_permission(self, request, view, obj):
        """Vérification des permissions sur l'objet."""
        permission_classes = [
            SocieteIsolationPermission(),
        ]
        
        # Permissions spéciales selon le type d'objet
        owner_only_models = ['Utilisateur', 'Rapport', 'Dashboard']
        if obj.__class__.__name__ in owner_only_models:
            permission_classes.append(ReadOnlyOrOwnerPermission())
        
        # Vérifier toutes les permissions
        for permission in permission_classes:
            if not permission.has_object_permission(request, view, obj):
                return False
        
        return True


# Permissions spécialisées pour endpoints spécifiques
class DashboardPermission(BaseWiseBookPermission):
    """Permission pour l'accès au dashboard."""
    
    def _check_permission(self, request, view):
        """Permission dashboard."""
        return (
            request.user and 
            request.user.is_authenticated and
            self._has_dashboard_access(request.user)
        )
    
    def _has_dashboard_access(self, user):
        """Vérifie l'accès au dashboard."""
        return Permission.objects.filter(
            roles__utilisateurs=user,
            code__startswith='dashboard.',
            actif=True
        ).exists()


class ExportPermission(BaseWiseBookPermission):
    """Permission pour l'export de données."""
    
    def _check_permission(self, request, view):
        """Permission export."""
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Vérifier permission d'export
        return Permission.objects.filter(
            roles__utilisateurs=request.user,
            code='core.export_data',
            actif=True
        ).exists()


class AdminOnlyPermission(BaseWiseBookPermission):
    """Permission admin seulement."""
    
    def _check_permission(self, request, view):
        """Seulement les admins."""
        return (
            request.user and 
            request.user.is_authenticated and
            (request.user.is_superuser or request.user.is_staff)
        )