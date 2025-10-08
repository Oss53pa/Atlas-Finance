"""
Serializers pour le module Workspaces WiseBook ERP V3.0
"""
from rest_framework import serializers
from .models import (
    Workspace,
    WorkspaceWidget,
    UserWorkspacePreference,
    WorkspaceStatistic,
    WorkspaceQuickAction
)


class WorkspaceWidgetSerializer(serializers.ModelSerializer):
    """Serializer pour les widgets workspace"""

    class Meta:
        model = WorkspaceWidget
        fields = [
            'id', 'workspace', 'widget_type', 'title', 'description',
            'icon', 'color', 'config', 'url', 'api_endpoint',
            'order', 'width', 'height', 'is_visible', 'is_required',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class WorkspaceQuickActionSerializer(serializers.ModelSerializer):
    """Serializer pour les actions rapides"""

    class Meta:
        model = WorkspaceQuickAction
        fields = [
            'id', 'workspace', 'label', 'description', 'icon', 'color',
            'action_type', 'action_target', 'required_permission',
            'order', 'is_visible', 'show_badge', 'badge_api_endpoint',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class WorkspaceStatisticSerializer(serializers.ModelSerializer):
    """Serializer pour les statistiques workspace"""

    class Meta:
        model = WorkspaceStatistic
        fields = [
            'id', 'workspace', 'stat_key', 'stat_label', 'stat_value',
            'stat_type', 'trend', 'trend_direction', 'target_value',
            'progress', 'metadata', 'cache_duration', 'last_calculated',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'last_calculated', 'created_at', 'updated_at']


class WorkspaceSerializer(serializers.ModelSerializer):
    """Serializer pour les workspaces"""

    role_display = serializers.CharField(source='get_role_display', read_only=True)
    widgets = WorkspaceWidgetSerializer(many=True, read_only=True)
    quick_actions = WorkspaceQuickActionSerializer(many=True, read_only=True)
    statistics = WorkspaceStatisticSerializer(many=True, read_only=True)

    widget_count = serializers.SerializerMethodField()
    action_count = serializers.SerializerMethodField()

    class Meta:
        model = Workspace
        fields = [
            'id', 'role', 'role_display', 'name', 'description',
            'icon', 'color', 'is_active', 'order',
            'widgets', 'quick_actions', 'statistics',
            'widget_count', 'action_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_widget_count(self, obj):
        return obj.widgets.filter(is_visible=True).count()

    def get_action_count(self, obj):
        return obj.quick_actions.filter(is_visible=True).count()


class WorkspaceListSerializer(serializers.ModelSerializer):
    """Serializer simplifié pour la liste des workspaces"""

    role_display = serializers.CharField(source='get_role_display', read_only=True)
    widget_count = serializers.SerializerMethodField()

    class Meta:
        model = Workspace
        fields = [
            'id', 'role', 'role_display', 'name', 'description',
            'icon', 'color', 'is_active', 'order', 'widget_count'
        ]

    def get_widget_count(self, obj):
        return obj.widgets.filter(is_visible=True).count()


class UserWorkspacePreferenceSerializer(serializers.ModelSerializer):
    """Serializer pour les préférences workspace utilisateur"""

    user_username = serializers.CharField(source='user.username', read_only=True)
    default_workspace_name = serializers.CharField(
        source='default_workspace.name',
        read_only=True
    )

    class Meta:
        model = UserWorkspacePreference
        fields = [
            'id', 'user', 'user_username', 'default_workspace',
            'default_workspace_name', 'hidden_widgets', 'custom_widget_order',
            'custom_layout', 'show_welcome_message', 'compact_mode',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']


class WorkspaceDashboardSerializer(serializers.Serializer):
    """Serializer pour le dashboard complet d'un workspace"""

    workspace = WorkspaceSerializer()
    user_preferences = UserWorkspacePreferenceSerializer(required=False)
    statistics = WorkspaceStatisticSerializer(many=True)
    widgets = WorkspaceWidgetSerializer(many=True)
    quick_actions = WorkspaceQuickActionSerializer(many=True)

    # Données dynamiques
    recent_activities = serializers.ListField(child=serializers.DictField(), required=False)
    notifications = serializers.ListField(child=serializers.DictField(), required=False)
    pending_tasks = serializers.IntegerField(required=False)


class WorkspaceCustomizationSerializer(serializers.Serializer):
    """Serializer pour la personnalisation du workspace"""

    hidden_widgets = serializers.ListField(
        child=serializers.UUIDField(),
        required=False
    )
    custom_widget_order = serializers.DictField(required=False)
    custom_layout = serializers.DictField(required=False)
    show_welcome_message = serializers.BooleanField(required=False)
    compact_mode = serializers.BooleanField(required=False)

    def validate_hidden_widgets(self, value):
        """Valider que les widgets existent"""
        if value:
            existing_widgets = WorkspaceWidget.objects.filter(
                id__in=value,
                is_required=False
            ).values_list('id', flat=True)

            invalid_ids = set(value) - set(existing_widgets)
            if invalid_ids:
                raise serializers.ValidationError(
                    f"Widgets invalides ou obligatoires: {invalid_ids}"
                )
        return value