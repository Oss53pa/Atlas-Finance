"""
Core Permissions for WiseBook
Custom permission classes for API views
"""
from rest_framework import permissions


class IsCompanyMember(permissions.BasePermission):
    """
    Permission to check if user belongs to the company
    """
    message = "You do not have permission to access this company's data."

    def has_permission(self, request, view):
        """
        Check if user is authenticated and has company access
        """
        if not request.user or not request.user.is_authenticated:
            return False

        # Superusers have access to everything
        if request.user.is_superuser:
            return True

        # Check if user has a company
        if hasattr(request.user, 'societe') and request.user.societe:
            return True

        # Check if user belongs to any company
        if hasattr(request.user, 'companies') and request.user.companies.exists():
            return True

        return False

    def has_object_permission(self, request, view, obj):
        """
        Check if user can access this specific object
        """
        if not request.user or not request.user.is_authenticated:
            return False

        # Superusers have access to everything
        if request.user.is_superuser:
            return True

        # Check if object belongs to user's company
        if hasattr(obj, 'company'):
            if hasattr(request.user, 'societe'):
                return obj.company == request.user.societe
            if hasattr(request.user, 'companies'):
                return obj.company in request.user.companies.all()

        return False


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Permission to only allow owners to edit objects
    """
    message = "You must be the owner to modify this object."

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions only to owner
        return obj.user == request.user or obj.created_by == request.user


class IsSuperUser(permissions.BasePermission):
    """
    Permission to only allow superusers
    """
    message = "You must be a superuser to perform this action."

    def has_permission(self, request, view):
        return request.user and request.user.is_superuser


class IsAdminUser(permissions.BasePermission):
    """
    Permission to only allow admin users
    """
    message = "You must be an administrator to perform this action."

    def has_permission(self, request, view):
        return request.user and (request.user.is_superuser or request.user.is_staff)


class IsAccountant(permissions.BasePermission):
    """
    Permission for accountant role
    """
    message = "You must have accountant privileges to perform this action."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.user.is_superuser:
            return True

        # Check if user has accountant role
        if hasattr(request.user, 'role'):
            return request.user.role in ['ACCOUNTANT', 'ADMIN', 'DIRECTOR']

        return False
