"""
Vues pour le module Workspaces WiseBook ERP V3.0
ViewSets REST pour la gestion des espaces de travail
"""
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count, Prefetch

from .models import (
    Workspace,
    WorkspaceWidget,
    UserWorkspacePreference,
    WorkspaceStatistic,
    WorkspaceQuickAction
)
from .serializers import (
    WorkspaceSerializer,
    WorkspaceListSerializer,
    WorkspaceWidgetSerializer,
    UserWorkspacePreferenceSerializer,
    WorkspaceStatisticSerializer,
    WorkspaceQuickActionSerializer,
    WorkspaceDashboardSerializer,
    WorkspaceCustomizationSerializer
)


class WorkspaceViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour les workspaces

    Endpoints:
    - GET /workspaces/ : Liste tous les workspaces
    - GET /workspaces/{id}/ : Détails d'un workspace
    - GET /workspaces/my-workspace/ : Workspace de l'utilisateur connecté
    - GET /workspaces/{id}/dashboard/ : Dashboard complet du workspace
    - GET /workspaces/by-role/{role}/ : Workspace par rôle
    """
    queryset = Workspace.objects.prefetch_related(
        'widgets',
        'quick_actions',
        'statistics'
    ).filter(is_active=True)
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['role', 'is_active']
    search_fields = ['name', 'description']
    ordering_fields = ['order', 'name']
    ordering = ['order']

    def get_serializer_class(self):
        if self.action == 'list':
            return WorkspaceListSerializer
        return WorkspaceSerializer

    @action(detail=False, methods=['get'])
    def my_workspace(self, request):
        """Récupère le workspace de l'utilisateur connecté basé sur son rôle"""
        user = request.user

        # Déterminer le rôle de l'utilisateur
        user_role = 'comptable'  # Rôle par défaut
        if user.is_superuser:
            user_role = 'admin'
        elif hasattr(user, 'role') and user.role:
            user_role = user.role.lower()

        try:
            workspace = self.get_queryset().get(role=user_role)
            serializer = WorkspaceSerializer(workspace)
            return Response(serializer.data)
        except Workspace.DoesNotExist:
            # Retourner le workspace comptable par défaut
            try:
                workspace = self.get_queryset().get(role='comptable')
                serializer = WorkspaceSerializer(workspace)
                return Response(serializer.data)
            except Workspace.DoesNotExist:
                return Response(
                    {'error': 'Aucun workspace disponible'},
                    status=status.HTTP_404_NOT_FOUND
                )

    @action(detail=False, methods=['get'], url_path='by-role/(?P<role>[^/.]+)')
    def by_role(self, request, role=None):
        """Récupère un workspace par rôle"""
        try:
            workspace = self.get_queryset().get(role=role)
            serializer = WorkspaceSerializer(workspace)
            return Response(serializer.data)
        except Workspace.DoesNotExist:
            return Response(
                {'error': f'Workspace non trouvé pour le rôle "{role}"'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['get'])
    def dashboard(self, request, pk=None):
        """Récupère le dashboard complet d'un workspace avec toutes ses données"""
        workspace = self.get_object()
        user = request.user

        # Récupérer les préférences utilisateur
        user_prefs = None
        try:
            user_prefs = UserWorkspacePreference.objects.get(user=user)
        except UserWorkspacePreference.DoesNotExist:
            pass

        # Récupérer les widgets visibles (en tenant compte des préférences)
        widgets = workspace.widgets.filter(is_visible=True)
        if user_prefs and user_prefs.hidden_widgets:
            widgets = widgets.exclude(id__in=user_prefs.hidden_widgets)

        # Récupérer les actions rapides
        quick_actions = workspace.quick_actions.filter(is_visible=True)

        # Récupérer les statistiques
        statistics = workspace.statistics.all()

        # Construire la réponse
        dashboard_data = {
            'workspace': WorkspaceSerializer(workspace).data,
            'user_preferences': UserWorkspacePreferenceSerializer(user_prefs).data if user_prefs else None,
            'statistics': WorkspaceStatisticSerializer(statistics, many=True).data,
            'widgets': WorkspaceWidgetSerializer(widgets, many=True).data,
            'quick_actions': WorkspaceQuickActionSerializer(quick_actions, many=True).data,
            'pending_tasks': 0,  # À implémenter selon votre système de tâches
        }

        serializer = WorkspaceDashboardSerializer(dashboard_data)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def customize(self, request, pk=None):
        """Personnaliser le workspace pour l'utilisateur connecté"""
        workspace = self.get_object()
        user = request.user

        serializer = WorkspaceCustomizationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Récupérer ou créer les préférences utilisateur
        prefs, created = UserWorkspacePreference.objects.get_or_create(
            user=user,
            defaults={'default_workspace': workspace}
        )

        # Mettre à jour les préférences
        for key, value in serializer.validated_data.items():
            setattr(prefs, key, value)

        prefs.save()

        return Response({
            'message': 'Workspace personnalisé avec succès',
            'preferences': UserWorkspacePreferenceSerializer(prefs).data
        })

    @action(detail=True, methods=['post'])
    def reset_customization(self, request, pk=None):
        """Réinitialiser la personnalisation du workspace"""
        workspace = self.get_object()
        user = request.user

        try:
            prefs = UserWorkspacePreference.objects.get(user=user)
            prefs.hidden_widgets = []
            prefs.custom_widget_order = {}
            prefs.custom_layout = {}
            prefs.save()

            return Response({
                'message': 'Personnalisation réinitialisée',
                'preferences': UserWorkspacePreferenceSerializer(prefs).data
            })
        except UserWorkspacePreference.DoesNotExist:
            return Response(
                {'message': 'Aucune personnalisation à réinitialiser'},
                status=status.HTTP_404_NOT_FOUND
            )


class WorkspaceWidgetViewSet(viewsets.ModelViewSet):
    """ViewSet pour les widgets workspace"""
    queryset = WorkspaceWidget.objects.all()
    serializer_class = WorkspaceWidgetSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['workspace', 'widget_type', 'is_visible']
    ordering_fields = ['order', 'title']
    ordering = ['order']

    @action(detail=False, methods=['get'], url_path='by-workspace/(?P<workspace_id>[^/.]+)')
    def by_workspace(self, request, workspace_id=None):
        """Récupère les widgets d'un workspace"""
        widgets = self.get_queryset().filter(
            workspace_id=workspace_id,
            is_visible=True
        )
        serializer = self.get_serializer(widgets, many=True)
        return Response({
            'workspace_id': workspace_id,
            'count': widgets.count(),
            'results': serializer.data
        })


class WorkspaceStatisticViewSet(viewsets.ModelViewSet):
    """ViewSet pour les statistiques workspace"""
    queryset = WorkspaceStatistic.objects.all()
    serializer_class = WorkspaceStatisticSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['workspace', 'stat_type']

    @action(detail=False, methods=['get'], url_path='by-workspace/(?P<workspace_id>[^/.]+)')
    def by_workspace(self, request, workspace_id=None):
        """Récupère les statistiques d'un workspace"""
        statistics = self.get_queryset().filter(workspace_id=workspace_id)
        serializer = self.get_serializer(statistics, many=True)
        return Response({
            'workspace_id': workspace_id,
            'count': statistics.count(),
            'results': serializer.data
        })

    @action(detail=True, methods=['post'])
    def refresh(self, request, pk=None):
        """Forcer le recalcul d'une statistique"""
        statistic = self.get_object()
        # TODO: Implémenter la logique de recalcul selon stat_key
        statistic.save()  # Met à jour last_calculated

        return Response({
            'message': 'Statistique mise à jour',
            'statistic': self.get_serializer(statistic).data
        })


class WorkspaceQuickActionViewSet(viewsets.ModelViewSet):
    """ViewSet pour les actions rapides workspace"""
    queryset = WorkspaceQuickAction.objects.all()
    serializer_class = WorkspaceQuickActionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['workspace', 'action_type', 'is_visible']
    ordering_fields = ['order', 'label']
    ordering = ['order']

    @action(detail=False, methods=['get'], url_path='by-workspace/(?P<workspace_id>[^/.]+)')
    def by_workspace(self, request, workspace_id=None):
        """Récupère les actions rapides d'un workspace"""
        actions = self.get_queryset().filter(
            workspace_id=workspace_id,
            is_visible=True
        )
        serializer = self.get_serializer(actions, many=True)
        return Response({
            'workspace_id': workspace_id,
            'count': actions.count(),
            'results': serializer.data
        })


class UserWorkspacePreferenceViewSet(viewsets.ModelViewSet):
    """ViewSet pour les préférences workspace utilisateur"""
    queryset = UserWorkspacePreference.objects.select_related('user', 'default_workspace')
    serializer_class = UserWorkspacePreferenceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Restreindre aux préférences de l'utilisateur connecté"""
        return self.queryset.filter(user=request.user)

    @action(detail=False, methods=['get'])
    def my_preferences(self, request):
        """Récupère les préférences de l'utilisateur connecté"""
        try:
            prefs = self.get_queryset().get(user=request.user)
            serializer = self.get_serializer(prefs)
            return Response(serializer.data)
        except UserWorkspacePreference.DoesNotExist:
            return Response({
                'message': 'Aucune préférence définie',
                'user': request.user.username
            }, status=status.HTTP_404_NOT_FOUND)