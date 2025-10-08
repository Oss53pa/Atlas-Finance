from rest_framework import permissions
from rest_framework.permissions import BasePermission


class IsOwnerOrReadOnly(BasePermission):
    """
    Permission personnalisée pour permettre seulement aux propriétaires
    d'un objet de le modifier.
    """
    
    def has_object_permission(self, request, view, obj):
        # Permissions de lecture pour toute requête authentifiée
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Permissions d'écriture seulement pour le propriétaire
        return obj.utilisateur == request.user


class IsInSameSociete(BasePermission):
    """
    Permission pour s'assurer que l'utilisateur appartient
    à la même société que l'objet.
    """
    
    def has_object_permission(self, request, view, obj):
        if not request.user.is_authenticated:
            return False
        
        # Vérifier si l'objet appartient à la même société
        if hasattr(obj, 'societe') and hasattr(request.user, 'societe'):
            return obj.societe == request.user.societe
        
        return True


class HasRolePermission(BasePermission):
    """
    Permission basée sur les rôles WiseBook.
    """
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        # Vérifier les permissions du rôle
        if hasattr(request.user, 'role') and request.user.role:
            action_map = {
                'GET': 'lecture',
                'POST': 'creation',
                'PUT': 'modification',
                'PATCH': 'modification',
                'DELETE': 'suppression'
            }
            
            action = action_map.get(request.method)
            if action and hasattr(request.user.role, 'permissions'):
                return action in request.user.role.permissions.get('accounting', [])
        
        return False


class IsComptableOrAdmin(BasePermission):
    """
    Permission pour les comptables ou administrateurs.
    """
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        if request.user.is_superuser:
            return True
        
        if hasattr(request.user, 'profil'):
            return request.user.profil in ['comptable', 'expert_comptable', 'directeur_financier']
        
        return False


class IsDirecteurFinancierOrAdmin(BasePermission):
    """
    Permission pour les directeurs financiers ou administrateurs.
    """
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        if request.user.is_superuser:
            return True
        
        if hasattr(request.user, 'profil'):
            return request.user.profil in ['directeur_financier', 'expert_comptable']
        
        return False


class CanAccessFinancialData(BasePermission):
    """
    Permission pour accéder aux données financières sensibles.
    """
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        if request.user.is_superuser:
            return True
        
        # Vérifier les permissions spécifiques aux données financières
        if hasattr(request.user, 'role') and request.user.role:
            permissions = request.user.role.permissions
            return permissions.get('financial_access', False)
        
        return False


class CanManageUsers(BasePermission):
    """
    Permission pour gérer les utilisateurs.
    """
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        if request.user.is_superuser:
            return True
        
        if hasattr(request.user, 'role') and request.user.role:
            permissions = request.user.role.permissions
            return permissions.get('user_management', False)
        
        return False


class CanAccessReports(BasePermission):
    """
    Permission pour accéder aux rapports.
    """
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        if request.user.is_superuser:
            return True
        
        if hasattr(request.user, 'role') and request.user.role:
            permissions = request.user.role.permissions
            return permissions.get('reporting', {}).get('access', False)
        
        return False


class CanCreateReports(BasePermission):
    """
    Permission pour créer des rapports.
    """
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        if request.user.is_superuser:
            return True
        
        if hasattr(request.user, 'role') and request.user.role:
            permissions = request.user.role.permissions
            return permissions.get('reporting', {}).get('create', False)
        
        return False


class APIKeyPermission(BasePermission):
    """
    Permission pour l'authentification par clé API.
    """
    
    def has_permission(self, request, view):
        # Vérifier si la requête utilise une clé API valide
        if hasattr(request, '_security_context'):
            return request._security_context.get('auth_method') == 'api_key'
        
        return request.user.is_authenticated


class RateLimitPermission(BasePermission):
    """
    Permission pour vérifier les limites de taux.
    """
    
    def has_permission(self, request, view):
        # Cette permission est gérée par le middleware SecurityMiddleware
        return True