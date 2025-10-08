"""
Authentication Models
Defines User, Role, and Permission models for WiseBook.
"""

import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _


class BaseModel(models.Model):
    """
    Abstract base model with UUID primary key and timestamps.
    All models should inherit from this.
    """
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name=_("ID")
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_("Created at")
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name=_("Updated at")
    )

    class Meta:
        abstract = True


class Permission(BaseModel):
    """
    Permission model for fine-grained access control.
    Permissions are assigned to roles and define what actions users can perform.
    """
    code = models.CharField(
        max_length=100,
        unique=True,
        verbose_name=_("Code"),
        help_text=_("Unique permission code (e.g., 'view_invoice', 'edit_client')")
    )
    name = models.CharField(
        max_length=255,
        verbose_name=_("Name"),
        help_text=_("Human-readable permission name")
    )
    module = models.CharField(
        max_length=100,
        verbose_name=_("Module"),
        help_text=_("Module this permission belongs to (e.g., 'invoices', 'clients')")
    )
    description = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Description"),
        help_text=_("Detailed description of what this permission allows")
    )

    class Meta:
        db_table = 'auth_permissions'
        verbose_name = _("Permission")
        verbose_name_plural = _("Permissions")
        ordering = ['module', 'code']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['module']),
        ]

    def __str__(self):
        return f"{self.module}.{self.code}"


class Role(BaseModel):
    """
    Role model for grouping permissions.
    Users are assigned roles which determine their access level.
    """
    ADMIN = 'admin'
    MANAGER = 'manager'
    ACCOUNTANT = 'accountant'
    USER = 'user'

    ROLE_CHOICES = [
        (ADMIN, _('Administrator')),
        (MANAGER, _('Manager')),
        (ACCOUNTANT, _('Accountant')),
        (USER, _('User')),
    ]

    code = models.CharField(
        max_length=50,
        unique=True,
        choices=ROLE_CHOICES,
        verbose_name=_("Code"),
        help_text=_("Unique role identifier")
    )
    name = models.CharField(
        max_length=255,
        verbose_name=_("Name"),
        help_text=_("Display name for the role")
    )
    description = models.TextField(
        blank=True,
        null=True,
        verbose_name=_("Description"),
        help_text=_("Description of role responsibilities and access level")
    )
    permissions = models.ManyToManyField(
        Permission,
        related_name='roles',
        blank=True,
        verbose_name=_("Permissions"),
        help_text=_("Permissions granted to this role")
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name=_("Active"),
        help_text=_("Whether this role is currently active")
    )

    class Meta:
        db_table = 'auth_roles'
        verbose_name = _("Role")
        verbose_name_plural = _("Roles")
        ordering = ['name']

    def __str__(self):
        return self.name

    def has_permission(self, permission_code):
        """Check if role has a specific permission."""
        return self.permissions.filter(code=permission_code).exists()


class User(AbstractUser, BaseModel):
    """
    Custom User model extending Django's AbstractUser.
    Includes additional fields for WiseBook functionality.
    """
    # Override id field to use UUID (from BaseModel)
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name=_("ID")
    )

    # Additional fields
    email = models.EmailField(
        unique=True,
        verbose_name=_("Email address"),
        help_text=_("User's email address (used for login)")
    )
    phone = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name=_("Phone number"),
        help_text=_("Contact phone number")
    )
    photo = models.ImageField(
        upload_to='users/photos/',
        blank=True,
        null=True,
        verbose_name=_("Photo"),
        help_text=_("Profile photo")
    )

    # Role and permissions
    role = models.ForeignKey(
        Role,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='users',
        verbose_name=_("Role"),
        help_text=_("User's role determining access level")
    )

    # Organization
    societe = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name=_("Company"),
        help_text=_("Company/organization the user belongs to")
    )

    # Security
    is_2fa_enabled = models.BooleanField(
        default=False,
        verbose_name=_("2FA enabled"),
        help_text=_("Whether two-factor authentication is enabled")
    )
    last_login_ip = models.GenericIPAddressField(
        blank=True,
        null=True,
        verbose_name=_("Last login IP"),
        help_text=_("IP address of last login")
    )
    failed_login_attempts = models.IntegerField(
        default=0,
        verbose_name=_("Failed login attempts"),
        help_text=_("Number of consecutive failed login attempts")
    )
    account_locked_until = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name=_("Account locked until"),
        help_text=_("Account lock expiration time (if locked)")
    )

    # Email as username
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']

    class Meta:
        db_table = 'auth_users'
        verbose_name = _("User")
        verbose_name_plural = _("Users")
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['role']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.get_full_name()} ({self.email})"

    def get_full_name(self):
        """Return user's full name."""
        full_name = super().get_full_name()
        return full_name if full_name else self.email

    def has_permission(self, permission_code):
        """
        Check if user has a specific permission through their role.

        Args:
            permission_code: Permission code to check (e.g., 'view_invoice')

        Returns:
            bool: True if user has permission, False otherwise
        """
        if self.is_superuser:
            return True
        if not self.role:
            return False
        return self.role.has_permission(permission_code)

    def has_module_access(self, module_name):
        """
        Check if user has any permission in a module.

        Args:
            module_name: Module name to check (e.g., 'invoices')

        Returns:
            bool: True if user has access to module, False otherwise
        """
        if self.is_superuser:
            return True
        if not self.role:
            return False
        return self.role.permissions.filter(module=module_name).exists()

    def get_permissions(self):
        """Get list of all permission codes for this user."""
        if self.is_superuser:
            return Permission.objects.values_list('code', flat=True)
        if not self.role:
            return []
        return self.role.permissions.values_list('code', flat=True)

    def is_account_locked(self):
        """Check if account is currently locked."""
        if not self.account_locked_until:
            return False
        from django.utils import timezone
        return timezone.now() < self.account_locked_until

    def reset_failed_login_attempts(self):
        """Reset failed login attempts counter."""
        self.failed_login_attempts = 0
        self.account_locked_until = None
        self.save(update_fields=['failed_login_attempts', 'account_locked_until'])

    def increment_failed_login_attempts(self):
        """
        Increment failed login attempts and lock account if threshold exceeded.
        Account is locked for 30 minutes after 5 failed attempts.
        """
        self.failed_login_attempts += 1
        if self.failed_login_attempts >= 5:
            from django.utils import timezone
            from datetime import timedelta
            self.account_locked_until = timezone.now() + timedelta(minutes=30)
        self.save(update_fields=['failed_login_attempts', 'account_locked_until'])