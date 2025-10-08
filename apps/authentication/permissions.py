"""
Custom DRF Permissions for WiseBook
Provides fine-grained access control based on roles and permissions.
"""

from rest_framework import permissions


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Permission to only allow owners of an object or admins to access it.
    Assumes the model instance has an `user` attribute or is the User model itself.
    """

    def has_permission(self, request, view):
        """Check if user is authenticated."""
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        """
        Check if user is owner of the object or an admin.

        Args:
            request: The request object
            view: The view being accessed
            obj: The object being accessed

        Returns:
            bool: True if user has permission, False otherwise
        """
        # Superusers and staff can access anything
        if request.user.is_superuser or request.user.is_staff:
            return True

        # Check if object is the user itself
        if hasattr(obj, 'id') and obj.id == request.user.id:
            return True

        # Check if object has a user attribute (e.g., Invoice.user)
        if hasattr(obj, 'user'):
            return obj.user == request.user

        # Check if object has a created_by attribute
        if hasattr(obj, 'created_by'):
            return obj.created_by == request.user

        return False


class HasModulePermission(permissions.BasePermission):
    """
    Permission to check if user has any permission in a specific module.
    The view must define a `required_module` attribute.
    """

    def has_permission(self, request, view):
        """
        Check if user has access to the module.

        Args:
            request: The request object
            view: The view being accessed

        Returns:
            bool: True if user has module permission, False otherwise
        """
        # Ensure user is authenticated
        if not request.user or not request.user.is_authenticated:
            return False

        # Superusers have access to everything
        if request.user.is_superuser:
            return True

        # Get required module from view
        required_module = getattr(view, 'required_module', None)
        if not required_module:
            # If no module specified, deny access
            return False

        # Check if user has any permission in the module
        return request.user.has_module_access(required_module)


class HasPermission(permissions.BasePermission):
    """
    Permission to check if user has a specific permission.
    The view must define a `required_permission` attribute or
    `permission_map` for different actions.
    """

    def has_permission(self, request, view):
        """
        Check if user has the required permission.

        Args:
            request: The request object
            view: The view being accessed

        Returns:
            bool: True if user has permission, False otherwise
        """
        # Ensure user is authenticated
        if not request.user or not request.user.is_authenticated:
            return False

        # Superusers have access to everything
        if request.user.is_superuser:
            return True

        # Try to get permission from permission_map first
        permission_map = getattr(view, 'permission_map', {})
        if permission_map:
            action = view.action if hasattr(view, 'action') else request.method.lower()
            required_permission = permission_map.get(action)
        else:
            # Fall back to required_permission attribute
            required_permission = getattr(view, 'required_permission', None)

        # If no permission specified, deny access
        if not required_permission:
            return False

        # Check if user has the permission
        return request.user.has_permission(required_permission)


class CanManageUsers(permissions.BasePermission):
    """
    Permission for managing users.
    Only admins and users with 'manage_users' permission can manage users.
    """

    def has_permission(self, request, view):
        """
        Check if user can manage users.

        Args:
            request: The request object
            view: The view being accessed

        Returns:
            bool: True if user can manage users, False otherwise
        """
        # Ensure user is authenticated
        if not request.user or not request.user.is_authenticated:
            return False

        # Superusers and staff can manage users
        if request.user.is_superuser or request.user.is_staff:
            return True

        # Check for specific permission
        return request.user.has_permission('manage_users')

    def has_object_permission(self, request, view, obj):
        """
        Check object-level permission for user management.

        Args:
            request: The request object
            view: The view being accessed
            obj: The user object being accessed

        Returns:
            bool: True if user has permission, False otherwise
        """
        # Allow read operations for own profile
        if request.method in permissions.SAFE_METHODS:
            if obj.id == request.user.id:
                return True

        # Superusers and staff can manage all users
        if request.user.is_superuser or request.user.is_staff:
            return True

        # Users with manage_users permission can manage non-admin users
        if request.user.has_permission('manage_users'):
            # Cannot manage superusers unless you are one
            if obj.is_superuser:
                return False
            return True

        return False


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Permission to only allow admins to edit, but allow read-only access to all authenticated users.
    """

    def has_permission(self, request, view):
        """
        Check if user is authenticated and has appropriate permissions.

        Args:
            request: The request object
            view: The view being accessed

        Returns:
            bool: True if user has permission, False otherwise
        """
        # Ensure user is authenticated
        if not request.user or not request.user.is_authenticated:
            return False

        # Allow read-only access to authenticated users
        if request.method in permissions.SAFE_METHODS:
            return True

        # Allow write access only to admins
        return request.user.is_superuser or request.user.is_staff


class CanManageRoles(permissions.BasePermission):
    """
    Permission for managing roles and permissions.
    Only admins can manage roles.
    """

    def has_permission(self, request, view):
        """
        Check if user can manage roles.

        Args:
            request: The request object
            view: The view being accessed

        Returns:
            bool: True if user can manage roles, False otherwise
        """
        # Ensure user is authenticated
        if not request.user or not request.user.is_authenticated:
            return False

        # Only superusers and staff can manage roles
        if request.user.is_superuser or request.user.is_staff:
            return True

        # Check for specific permission
        return request.user.has_permission('manage_roles')


class IsSelfOrAdmin(permissions.BasePermission):
    """
    Permission to only allow users to access their own data or admins to access any data.
    """

    def has_permission(self, request, view):
        """Check if user is authenticated."""
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        """
        Check if user is accessing their own data or is an admin.

        Args:
            request: The request object
            view: The view being accessed
            obj: The object being accessed

        Returns:
            bool: True if user has permission, False otherwise
        """
        # Admins can access anything
        if request.user.is_superuser or request.user.is_staff:
            return True

        # Users can only access their own data
        return obj.id == request.user.id
