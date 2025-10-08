"""
Authentication Service
Business logic for authentication operations.
"""

from datetime import timedelta
from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from rest_framework_simplejwt.tokens import RefreshToken
from ..models import User, Role, Permission


class AuthService:
    """Service class for authentication operations."""

    @staticmethod
    def generate_tokens(user):
        """
        Generate JWT access and refresh tokens for user.

        Args:
            user: User instance

        Returns:
            dict: Dictionary containing access and refresh tokens
        """
        refresh = RefreshToken.for_user(user)

        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': {
                'id': str(user.id),
                'email': user.email,
                'full_name': user.get_full_name(),
                'role': user.role.code if user.role else None,
            }
        }

    @staticmethod
    def update_last_login(user, ip_address=None):
        """
        Update user's last login timestamp and IP address.

        Args:
            user: User instance
            ip_address: IP address of the login request
        """
        user.last_login = timezone.now()
        if ip_address:
            user.last_login_ip = ip_address
        user.save(update_fields=['last_login', 'last_login_ip'])

    @staticmethod
    def get_client_ip(request):
        """
        Extract client IP address from request.

        Args:
            request: HTTP request object

        Returns:
            str: Client IP address
        """
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

    @staticmethod
    def send_password_reset_email(user, reset_url):
        """
        Send password reset email to user.

        Args:
            user: User instance
            reset_url: URL for password reset
        """
        subject = 'Password Reset Request - WiseBook'
        message = render_to_string('emails/password_reset.html', {
            'user': user,
            'reset_url': reset_url,
        })

        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            html_message=message,
            fail_silently=False,
        )

    @staticmethod
    def generate_password_reset_token(user):
        """
        Generate password reset token for user.

        Args:
            user: User instance

        Returns:
            str: Password reset token
        """
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        return f"{uid}-{token}"

    @staticmethod
    def verify_password_reset_token(token):
        """
        Verify password reset token and return user.

        Args:
            token: Password reset token

        Returns:
            User: User instance if token is valid, None otherwise
        """
        try:
            uid, token_value = token.split('-', 1)
            user_id = urlsafe_base64_decode(uid).decode()
            user = User.objects.get(pk=user_id)

            if default_token_generator.check_token(user, token_value):
                return user
        except (ValueError, User.DoesNotExist, TypeError, OverflowError):
            pass

        return None

    @staticmethod
    def assign_role_to_user(user, role_code):
        """
        Assign role to user by role code.

        Args:
            user: User instance
            role_code: Role code (e.g., 'admin', 'manager')

        Returns:
            bool: True if successful, False otherwise
        """
        try:
            role = Role.objects.get(code=role_code, is_active=True)
            user.role = role
            user.save(update_fields=['role'])
            return True
        except Role.DoesNotExist:
            return False

    @staticmethod
    def create_default_roles():
        """
        Create default roles for the system.
        Should be called during initial setup.

        Returns:
            dict: Dictionary of created roles
        """
        roles = {}

        # Admin role
        admin_role, created = Role.objects.get_or_create(
            code=Role.ADMIN,
            defaults={
                'name': 'Administrator',
                'description': 'Full system access with all permissions',
            }
        )
        roles['admin'] = admin_role

        # Manager role
        manager_role, created = Role.objects.get_or_create(
            code=Role.MANAGER,
            defaults={
                'name': 'Manager',
                'description': 'Management access with most permissions',
            }
        )
        roles['manager'] = manager_role

        # Accountant role
        accountant_role, created = Role.objects.get_or_create(
            code=Role.ACCOUNTANT,
            defaults={
                'name': 'Accountant',
                'description': 'Accounting and financial operations access',
            }
        )
        roles['accountant'] = accountant_role

        # User role
        user_role, created = Role.objects.get_or_create(
            code=Role.USER,
            defaults={
                'name': 'User',
                'description': 'Basic user access',
            }
        )
        roles['user'] = user_role

        return roles

    @staticmethod
    def create_default_permissions():
        """
        Create default permissions for the system.
        Should be called during initial setup.

        Returns:
            list: List of created permissions
        """
        default_permissions = [
            # User management
            {'code': 'manage_users', 'name': 'Manage Users', 'module': 'users',
             'description': 'Create, update, and delete users'},
            {'code': 'view_users', 'name': 'View Users', 'module': 'users',
             'description': 'View user information'},

            # Role management
            {'code': 'manage_roles', 'name': 'Manage Roles', 'module': 'roles',
             'description': 'Create, update, and delete roles'},
            {'code': 'view_roles', 'name': 'View Roles', 'module': 'roles',
             'description': 'View role information'},

            # Invoice management
            {'code': 'create_invoice', 'name': 'Create Invoice', 'module': 'invoices',
             'description': 'Create new invoices'},
            {'code': 'edit_invoice', 'name': 'Edit Invoice', 'module': 'invoices',
             'description': 'Edit existing invoices'},
            {'code': 'delete_invoice', 'name': 'Delete Invoice', 'module': 'invoices',
             'description': 'Delete invoices'},
            {'code': 'view_invoice', 'name': 'View Invoice', 'module': 'invoices',
             'description': 'View invoice information'},

            # Client management
            {'code': 'manage_clients', 'name': 'Manage Clients', 'module': 'clients',
             'description': 'Full access to client management'},
            {'code': 'view_clients', 'name': 'View Clients', 'module': 'clients',
             'description': 'View client information'},

            # Financial operations
            {'code': 'view_reports', 'name': 'View Reports', 'module': 'reports',
             'description': 'View financial reports'},
            {'code': 'export_data', 'name': 'Export Data', 'module': 'reports',
             'description': 'Export data to various formats'},
        ]

        created_permissions = []
        for perm_data in default_permissions:
            permission, created = Permission.objects.get_or_create(
                code=perm_data['code'],
                defaults=perm_data
            )
            created_permissions.append(permission)

        return created_permissions

    @staticmethod
    def setup_default_role_permissions():
        """
        Assign default permissions to roles.
        Should be called after creating default roles and permissions.
        """
        try:
            # Get roles
            admin_role = Role.objects.get(code=Role.ADMIN)
            manager_role = Role.objects.get(code=Role.MANAGER)
            accountant_role = Role.objects.get(code=Role.ACCOUNTANT)
            user_role = Role.objects.get(code=Role.USER)

            # Admin gets all permissions
            admin_role.permissions.set(Permission.objects.all())

            # Manager gets most permissions except user/role management
            manager_perms = Permission.objects.exclude(
                code__in=['manage_users', 'manage_roles']
            )
            manager_role.permissions.set(manager_perms)

            # Accountant gets financial permissions
            accountant_perms = Permission.objects.filter(
                module__in=['invoices', 'clients', 'reports']
            )
            accountant_role.permissions.set(accountant_perms)

            # User gets view permissions only
            user_perms = Permission.objects.filter(
                code__in=['view_invoice', 'view_clients', 'view_reports']
            )
            user_role.permissions.set(user_perms)

        except Role.DoesNotExist:
            pass
