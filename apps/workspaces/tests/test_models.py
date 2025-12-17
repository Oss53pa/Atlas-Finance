"""
Tests pour les modèles du module Workspaces
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from apps.workspaces.models import (
    Workspace,
    WorkspaceWidget,
    WorkspaceStatistic,
    WorkspaceQuickAction,
    UserWorkspacePreference,
    WorkspaceRole
)

User = get_user_model()


class WorkspaceModelTest(TestCase):
    """Tests pour le modèle Workspace"""

    def setUp(self):
        self.workspace = Workspace.objects.create(
            role=WorkspaceRole.COMPTABLE,
            name='Test Workspace',
            description='Workspace de test',
            icon='Calculator',
            color='#4F46E5',
            is_active=True,
            order=1
        )

    def test_workspace_creation(self):
        """Test création d'un workspace"""
        self.assertEqual(self.workspace.name, 'Test Workspace')
        self.assertEqual(self.workspace.role, WorkspaceRole.COMPTABLE)
        self.assertTrue(self.workspace.is_active)

    def test_workspace_str(self):
        """Test représentation string"""
        expected = f"{self.workspace.name} (Comptable)"
        self.assertEqual(str(self.workspace), expected)

    def test_workspace_ordering(self):
        """Test l'ordre par défaut"""
        workspace2 = Workspace.objects.create(
            role=WorkspaceRole.MANAGER,
            name='Manager Workspace',
            description='Test',
            order=2
        )
        workspaces = list(Workspace.objects.all())
        self.assertEqual(workspaces[0], self.workspace)
        self.assertEqual(workspaces[1], workspace2)

    def test_unique_role_constraint(self):
        """Test contrainte d'unicité sur le rôle"""
        with self.assertRaises(Exception):
            Workspace.objects.create(
                role=WorkspaceRole.COMPTABLE,  # Même rôle
                name='Duplicate',
                description='Test'
            )


class WorkspaceWidgetModelTest(TestCase):
    """Tests pour le modèle WorkspaceWidget"""

    def setUp(self):
        self.workspace = Workspace.objects.create(
            role=WorkspaceRole.COMPTABLE,
            name='Test Workspace',
            description='Test'
        )
        self.widget = WorkspaceWidget.objects.create(
            workspace=self.workspace,
            widget_type='stat',
            title='Test Widget',
            icon='FileText',
            color='#10B981',
            order=1,
            width=1,
            height=1
        )

    def test_widget_creation(self):
        """Test création d'un widget"""
        self.assertEqual(self.widget.title, 'Test Widget')
        self.assertEqual(self.widget.widget_type, 'stat')
        self.assertEqual(self.widget.workspace, self.workspace)

    def test_widget_str(self):
        """Test représentation string"""
        expected = f"{self.widget.title} - {self.workspace.name}"
        self.assertEqual(str(self.widget), expected)

    def test_widget_default_config(self):
        """Test configuration par défaut"""
        self.assertEqual(self.widget.config, {})

    def test_widget_visibility(self):
        """Test visibilité par défaut"""
        self.assertTrue(self.widget.is_visible)
        self.assertFalse(self.widget.is_required)


class WorkspaceStatisticModelTest(TestCase):
    """Tests pour le modèle WorkspaceStatistic"""

    def setUp(self):
        self.workspace = Workspace.objects.create(
            role=WorkspaceRole.MANAGER,
            name='Manager Workspace',
            description='Test'
        )
        self.statistic = WorkspaceStatistic.objects.create(
            workspace=self.workspace,
            stat_key='revenue',
            stat_label='Chiffre d\'Affaires',
            stat_value='125000000',
            stat_type='currency',
            trend=18.7,
            trend_direction='up'
        )

    def test_statistic_creation(self):
        """Test création d'une statistique"""
        self.assertEqual(self.statistic.stat_key, 'revenue')
        self.assertEqual(self.statistic.stat_type, 'currency')
        self.assertEqual(float(self.statistic.trend), 18.7)

    def test_statistic_str(self):
        """Test représentation string"""
        expected = f"{self.statistic.stat_label} - {self.workspace.name}"
        self.assertEqual(str(self.statistic), expected)

    def test_unique_stat_key_per_workspace(self):
        """Test contrainte d'unicité stat_key par workspace"""
        with self.assertRaises(Exception):
            WorkspaceStatistic.objects.create(
                workspace=self.workspace,
                stat_key='revenue',  # Même clé
                stat_label='Duplicate',
                stat_value='100'
            )

    def test_default_cache_duration(self):
        """Test durée de cache par défaut"""
        self.assertEqual(self.statistic.cache_duration, 300)


class WorkspaceQuickActionModelTest(TestCase):
    """Tests pour le modèle WorkspaceQuickAction"""

    def setUp(self):
        self.workspace = Workspace.objects.create(
            role=WorkspaceRole.COMPTABLE,
            name='Test Workspace',
            description='Test'
        )
        self.action = WorkspaceQuickAction.objects.create(
            workspace=self.workspace,
            label='Nouvelle Écriture',
            icon='Plus',
            color='#4F46E5',
            action_type='navigate',
            action_target='/accounting/entry/new',
            order=1
        )

    def test_action_creation(self):
        """Test création d'une action rapide"""
        self.assertEqual(self.action.label, 'Nouvelle Écriture')
        self.assertEqual(self.action.action_type, 'navigate')
        self.assertTrue(self.action.is_visible)

    def test_action_str(self):
        """Test représentation string"""
        expected = f"{self.action.label} - {self.workspace.name}"
        self.assertEqual(str(self.action), expected)

    def test_badge_disabled_by_default(self):
        """Test badge désactivé par défaut"""
        self.assertFalse(self.action.show_badge)


class UserWorkspacePreferenceModelTest(TestCase):
    """Tests pour le modèle UserWorkspacePreference"""

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.workspace = Workspace.objects.create(
            role=WorkspaceRole.COMPTABLE,
            name='Test Workspace',
            description='Test'
        )
        self.preference = UserWorkspacePreference.objects.create(
            user=self.user,
            default_workspace=self.workspace
        )

    def test_preference_creation(self):
        """Test création de préférences utilisateur"""
        self.assertEqual(self.preference.user, self.user)
        self.assertEqual(self.preference.default_workspace, self.workspace)

    def test_preference_str(self):
        """Test représentation string"""
        expected = f"Préférences de {self.user.username}"
        self.assertEqual(str(self.preference), expected)

    def test_default_values(self):
        """Test valeurs par défaut"""
        self.assertEqual(self.preference.hidden_widgets, [])
        self.assertEqual(self.preference.custom_widget_order, {})
        self.assertTrue(self.preference.show_welcome_message)
        self.assertFalse(self.preference.compact_mode)

    def test_one_preference_per_user(self):
        """Test contrainte OneToOne avec user"""
        with self.assertRaises(Exception):
            UserWorkspacePreference.objects.create(
                user=self.user,  # Même user
                default_workspace=self.workspace
            )
