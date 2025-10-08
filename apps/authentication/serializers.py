"""
Authentication Serializers
DRF serializers for User, Role, Permission, and authentication operations.
"""

from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth import authenticate
from django.utils.translation import gettext_lazy as _
from .models import User, Role, Permission


class PermissionSerializer(serializers.ModelSerializer):
    """Serializer for Permission model."""

    class Meta:
        model = Permission
        fields = [
            'id',
            'code',
            'name',
            'module',
            'description',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class RoleSerializer(serializers.ModelSerializer):
    """Serializer for Role model with permissions."""

    permissions = PermissionSerializer(many=True, read_only=True)
    permission_ids = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False,
        help_text=_("List of permission IDs to assign to this role")
    )
    users_count = serializers.SerializerMethodField()

    class Meta:
        model = Role
        fields = [
            'id',
            'code',
            'name',
            'description',
            'permissions',
            'permission_ids',
            'is_active',
            'users_count',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_users_count(self, obj):
        """Get number of users with this role."""
        return obj.users.count()

    def create(self, validated_data):
        """Create role with permissions."""
        permission_ids = validated_data.pop('permission_ids', [])
        role = Role.objects.create(**validated_data)

        if permission_ids:
            permissions = Permission.objects.filter(id__in=permission_ids)
            role.permissions.set(permissions)

        return role

    def update(self, instance, validated_data):
        """Update role with permissions."""
        permission_ids = validated_data.pop('permission_ids', None)

        # Update basic fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update permissions if provided
        if permission_ids is not None:
            permissions = Permission.objects.filter(id__in=permission_ids)
            instance.permissions.set(permissions)

        return instance


class UserSerializer(serializers.ModelSerializer):
    """Complete serializer for User model with all relations."""

    role_details = RoleSerializer(source='role', read_only=True)
    permissions = serializers.SerializerMethodField()
    full_name = serializers.CharField(source='get_full_name', read_only=True)

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'full_name',
            'phone',
            'photo',
            'role',
            'role_details',
            'societe',
            'is_active',
            'is_staff',
            'is_superuser',
            'is_2fa_enabled',
            'permissions',
            'last_login',
            'last_login_ip',
            'date_joined',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'id',
            'last_login',
            'last_login_ip',
            'date_joined',
            'created_at',
            'updated_at'
        ]
        extra_kwargs = {
            'password': {'write_only': True},
            'is_staff': {'read_only': True},
            'is_superuser': {'read_only': True}
        }

    def get_permissions(self, obj):
        """Get list of user's permission codes."""
        return list(obj.get_permissions())


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for user registration."""

    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'},
        help_text=_("Password must meet security requirements")
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'},
        help_text=_("Must match password field")
    )

    class Meta:
        model = User
        fields = [
            'email',
            'username',
            'password',
            'password_confirm',
            'first_name',
            'last_name',
            'phone',
            'societe',
            'role'
        ]

    def validate(self, attrs):
        """Validate that passwords match."""
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                'password_confirm': _("Passwords do not match")
            })
        return attrs

    def validate_email(self, value):
        """Ensure email is unique (case-insensitive)."""
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(
                _("A user with this email already exists")
            )
        return value.lower()

    def create(self, validated_data):
        """Create user with hashed password."""
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')

        user = User.objects.create(**validated_data)
        user.set_password(password)
        user.save()

        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user profile."""

    class Meta:
        model = User
        fields = [
            'first_name',
            'last_name',
            'phone',
            'photo',
            'societe',
            'is_2fa_enabled'
        ]

    def validate_photo(self, value):
        """Validate photo file size and type."""
        if value:
            # Max 5MB
            if value.size > 5 * 1024 * 1024:
                raise serializers.ValidationError(
                    _("Photo file size cannot exceed 5MB")
                )

            # Check file type
            allowed_types = ['image/jpeg', 'image/jpg', 'image/png']
            if hasattr(value, 'content_type') and value.content_type not in allowed_types:
                raise serializers.ValidationError(
                    _("Only JPEG and PNG images are allowed")
                )

        return value


class LoginSerializer(serializers.Serializer):
    """Serializer for user login."""

    email = serializers.EmailField(
        required=True,
        help_text=_("User's email address")
    )
    password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'},
        help_text=_("User's password")
    )

    def validate(self, attrs):
        """Validate credentials and check account status."""
        email = attrs.get('email', '').lower()
        password = attrs.get('password')

        # Check if user exists
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError(
                _("Invalid email or password"),
                code='authentication'
            )

        # Check if account is locked
        if user.is_account_locked():
            raise serializers.ValidationError(
                _("Account is temporarily locked due to too many failed login attempts. Please try again later."),
                code='account_locked'
            )

        # Check if account is active
        if not user.is_active:
            raise serializers.ValidationError(
                _("Account is inactive. Please contact support."),
                code='account_inactive'
            )

        # Authenticate user
        user_auth = authenticate(
            request=self.context.get('request'),
            username=email,
            password=password
        )

        if not user_auth:
            # Increment failed login attempts
            user.increment_failed_login_attempts()
            raise serializers.ValidationError(
                _("Invalid email or password"),
                code='authentication'
            )

        # Reset failed login attempts on successful authentication
        user.reset_failed_login_attempts()

        attrs['user'] = user_auth
        return attrs


class PasswordChangeSerializer(serializers.Serializer):
    """Serializer for changing password."""

    old_password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'},
        help_text=_("Current password")
    )
    new_password = serializers.CharField(
        required=True,
        write_only=True,
        validators=[validate_password],
        style={'input_type': 'password'},
        help_text=_("New password")
    )
    new_password_confirm = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'},
        help_text=_("Confirm new password")
    )

    def validate_old_password(self, value):
        """Validate that old password is correct."""
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError(
                _("Current password is incorrect")
            )
        return value

    def validate(self, attrs):
        """Validate that new passwords match."""
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({
                'new_password_confirm': _("Passwords do not match")
            })

        # Ensure new password is different from old
        if attrs['old_password'] == attrs['new_password']:
            raise serializers.ValidationError({
                'new_password': _("New password must be different from current password")
            })

        return attrs

    def save(self):
        """Change user's password."""
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user


class PasswordResetRequestSerializer(serializers.Serializer):
    """Serializer for requesting password reset."""

    email = serializers.EmailField(
        required=True,
        help_text=_("Email address associated with account")
    )

    def validate_email(self, value):
        """Check if user with email exists."""
        try:
            user = User.objects.get(email__iexact=value)
            if not user.is_active:
                raise serializers.ValidationError(
                    _("Account is inactive")
                )
        except User.DoesNotExist:
            # Don't reveal that user doesn't exist for security
            pass

        return value.lower()


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Serializer for confirming password reset."""

    token = serializers.CharField(
        required=True,
        help_text=_("Password reset token from email")
    )
    new_password = serializers.CharField(
        required=True,
        write_only=True,
        validators=[validate_password],
        style={'input_type': 'password'},
        help_text=_("New password")
    )
    new_password_confirm = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'},
        help_text=_("Confirm new password")
    )

    def validate(self, attrs):
        """Validate that passwords match."""
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({
                'new_password_confirm': _("Passwords do not match")
            })
        return attrs


class RefreshTokenSerializer(serializers.Serializer):
    """Serializer for refreshing JWT token."""

    refresh = serializers.CharField(
        required=True,
        help_text=_("Refresh token")
    )
