"""
Tests pour les API du module Workspaces
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.workspaces.models import (
    Workspace,
    WorkspaceWidget,
    WorkspaceStatistic,
    WorkspaceQuickAction,
    UserWorkspacePreference,
    WorkspaceRole
)

User = get_user_model()


class WorkspaceAPITest(TestCase):
    """Tests pour l'API Workspace"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)

        self.workspace = Workspace.objects.create(
            role=WorkspaceRole.COMPTABLE,
            name='Espace Comptable',
            description='Test workspace',
            is_active=True,
            order=1
        )

    def test_list_workspaces(self):
        """Test liste des workspaces"""
        url = '/api/workspaces/workspaces/'
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], 'Espace Comptable')

    def test_retrieve_workspace(self):
        """Test récupération d'un workspace"""
        url = f'/api/workspaces/workspaces/{self.workspace.id}/'
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Espace Comptable')
        self.assertIn('widgets', response.data)
        self.assertIn('quick_actions', response.data)

    def test_my_workspace(self):
        """Test endpoint my-workspace"""
        # Assigner le rôle comptable à l'utilisateur
        self.user.role = 'comptable'
        self.user.save()

        url = '/api/workspaces/workspaces/my-workspace/'
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['role'], 'comptable')

    def test_get_workspace_by_role(self):
        """Test récupération workspace par rôle"""
        url = '/api/workspaces/workspaces/by-role/comptable/'
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['role'], 'comptable')

    def test_get_workspace_dashboard(self):
        """Test endpoint dashboard"""
        # Créer des données associées
        WorkspaceWidget.objects.create(
            workspace=self.workspace,
            widget_type='stat',
            title='Test Widget',
            order=1,
            width=1,
            height=1
        )

        WorkspaceStatistic.objects.create(
            workspace=self.workspace,
            stat_key='test_stat',
            stat_label='Test Stat',
            stat_value='100'
        )

        url = f'/api/workspaces/workspaces/{self.workspace.id}/dashboard/'
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('workspace', response.data)
        self.assertIn('statistics', response.data)
        self.assertIn('widgets', response.data)
        self.assertIn('quick_actions', response.data)

    def test_customize_workspace(self):
        """Test personnalisation workspace"""
        url = f'/api/workspaces/workspaces/{self.workspace.id}/customize/'
        data = {
            'show_welcome_message': False,
            'compact_mode': True
        }
        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('preferences', response.data)

        # Vérifier que les préférences ont été créées
        prefs = UserWorkspacePreference.objects.get(user=self.user)
        self.assertFalse(prefs.show_welcome_message)
        self.assertTrue(prefs.compact_mode)

    def test_reset_customization(self):
        """Test réinitialisation personnalisation"""
        # Créer des préférences
        prefs = UserWorkspacePreference.objects.create(
            user=self.user,
            default_workspace=self.workspace,
            hidden_widgets=['widget1', 'widget2'],
            compact_mode=True
        )

        url = f'/api/workspaces/workspaces/{self.workspace.id}/reset-customization/'
        response = self.client.post(url)

        self.assertEqual(response.status.HTTP_200_OK)

        # Vérifier la réinitialisation
        prefs.refresh_from_db()
        self.assertEqual(prefs.hidden_widgets, [])
        self.assertEqual(prefs.custom_widget_order, {})

    def test_filter_by_role(self):
        """Test filtrage par rôle"""
        Workspace.objects.create(
            role=WorkspaceRole.MANAGER,
            name='Manager Workspace',
            description='Test',
            is_active=True
        )

        url = '/api/workspaces/workspaces/?role=manager'
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['role'], 'manager')

    def test_search_workspace(self):
        """Test recherche dans les workspaces"""
        url = '/api/workspaces/workspaces/?search=Comptable'
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)


class WorkspaceWidgetAPITest(TestCase):
    """Tests pour l'API Widgets"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)

        self.workspace = Workspace.objects.create(
            role=WorkspaceRole.COMPTABLE,
            name='Test Workspace',
            description='Test'
        )

        self.widget = WorkspaceWidget.objects.create(
            workspace=self.workspace,
            widget_type='stat',
            title='Test Widget',
            order=1,
            width=1,
            height=1
        )

    def test_list_widgets(self):
        """Test liste des widgets"""
        url = '/api/workspaces/widgets/'
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_get_widgets_by_workspace(self):
        """Test récupération widgets par workspace"""
        url = f'/api/workspaces/widgets/by-workspace/{self.workspace.id}/'
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertEqual(len(response.data['results']), 1)


class WorkspaceStatisticAPITest(TestCase):
    """Tests pour l'API Statistics"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)

        self.workspace = Workspace.objects.create(
            role=WorkspaceRole.MANAGER,
            name='Test Workspace',
            description='Test'
        )

        self.statistic = WorkspaceStatistic.objects.create(
            workspace=self.workspace,
            stat_key='revenue',
            stat_label='Revenue',
            stat_value='1000000',
            stat_type='currency'
        )

    def test_list_statistics(self):
        """Test liste des statistiques"""
        url = '/api/workspaces/statistics/'
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_get_statistics_by_workspace(self):
        """Test récupération statistiques par workspace"""
        url = f'/api/workspaces/statistics/by-workspace/{self.workspace.id}/'
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertEqual(len(response.data['results']), 1)

    def test_refresh_statistic(self):
        """Test refresh d'une statistique"""
        url = f'/api/workspaces/statistics/{self.statistic.id}/refresh/'
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('statistic', response.data)


class WorkspaceQuickActionAPITest(TestCase):
    """Tests pour l'API Quick Actions"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)

        self.workspace = Workspace.objects.create(
            role=WorkspaceRole.COMPTABLE,
            name='Test Workspace',
            description='Test'
        )

        self.action = WorkspaceQuickAction.objects.create(
            workspace=self.workspace,
            label='Test Action',
            action_type='navigate',
            action_target='/test',
            order=1
        )

    def test_list_quick_actions(self):
        """Test liste des actions rapides"""
        url = '/api/workspaces/quick-actions/'
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_get_actions_by_workspace(self):
        """Test récupération actions par workspace"""
        url = f'/api/workspaces/quick-actions/by-workspace/{self.workspace.id}/'
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertEqual(len(response.data['results']), 1)


class UserWorkspacePreferenceAPITest(TestCase):
    """Tests pour l'API Preferences"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)

        self.workspace = Workspace.objects.create(
            role=WorkspaceRole.COMPTABLE,
            name='Test Workspace',
            description='Test'
        )

        self.preference = UserWorkspacePreference.objects.create(
            user=self.user,
            default_workspace=self.workspace
        )

    def test_get_my_preferences(self):
        """Test récupération de mes préférences"""
        url = '/api/workspaces/preferences/my-preferences/'
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user_username'], 'testuser')

    def test_unauthenticated_access(self):
        """Test accès non authentifié"""
        self.client.force_authenticate(user=None)
        url = '/api/workspaces/workspaces/'
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
