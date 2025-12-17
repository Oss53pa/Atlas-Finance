"""
Management command pour charger les workspaces initiaux
Usage: python manage.py load_workspaces
"""
from django.core.management.base import BaseCommand
from django.core.management import call_command
from apps.workspaces.models import Workspace


class Command(BaseCommand):
    help = 'Charge les workspaces initiaux depuis les fixtures'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Supprimer les données existantes avant de charger',
        )
        parser.add_argument(
            '--three',
            action='store_true',
            help='Charger uniquement les 3 workspaces principaux (Admin, Manager, Comptable)',
        )

    def handle(self, *args, **options):
        force = options.get('force', False)
        three_only = options.get('three', False)

        # Déterminer le fichier de fixtures à utiliser
        fixture_file = 'three_workspaces.json' if three_only else 'initial_workspaces.json'
        workspace_type = '3 workspaces principaux' if three_only else 'workspaces complets'

        self.stdout.write(
            self.style.MIGRATE_HEADING(f'Chargement des {workspace_type}...')
        )

        # Si force, supprimer les données existantes
        if force:
            self.stdout.write(self.style.WARNING('Suppression des donnees existantes...'))
            from apps.workspaces.models import (
                WorkspaceWidget,
                WorkspaceStatistic,
                WorkspaceQuickAction,
                UserWorkspacePreference
            )

            UserWorkspacePreference.objects.all().delete()
            WorkspaceQuickAction.objects.all().delete()
            WorkspaceStatistic.objects.all().delete()
            WorkspaceWidget.objects.all().delete()
            Workspace.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('Donnees supprimees'))

        # Vérifier si des workspaces existent déjà
        if not force and Workspace.objects.exists():
            self.stdout.write(
                self.style.WARNING(
                    'Des workspaces existent deja. '
                    'Utilisez --force pour les remplacer.'
                )
            )
            return

        # Charger les fixtures
        try:
            self.stdout.write(f'Chargement des fixtures ({fixture_file})...')
            call_command('loaddata', fixture_file, verbosity=0)

            # Afficher le résumé
            from apps.workspaces.models import (
                WorkspaceWidget,
                WorkspaceStatistic,
                WorkspaceQuickAction
            )

            workspace_count = Workspace.objects.count()
            widget_count = WorkspaceWidget.objects.count()
            stat_count = WorkspaceStatistic.objects.count()
            action_count = WorkspaceQuickAction.objects.count()

            self.stdout.write(self.style.SUCCESS('\nFixtures chargees avec succes!'))
            self.stdout.write(f'\nResume:')
            self.stdout.write(f'  - Workspaces crees: {workspace_count}')
            self.stdout.write(f'  - Widgets crees: {widget_count}')
            self.stdout.write(f'  - Statistiques creees: {stat_count}')
            self.stdout.write(f'  - Actions rapides creees: {action_count}')

            # Liste des workspaces créés
            self.stdout.write(f'\nWorkspaces disponibles:')
            for workspace in Workspace.objects.all().order_by('order'):
                widget_count_ws = workspace.widgets.count()
                stat_count_ws = workspace.statistics.count()
                action_count_ws = workspace.quick_actions.count()

                self.stdout.write(
                    f'  - {workspace.role.upper()}: {workspace.name}'
                )
                self.stdout.write(
                    f'    => {widget_count_ws} widgets, '
                    f'{stat_count_ws} statistiques, '
                    f'{action_count_ws} actions rapides'
                )

            self.stdout.write(
                self.style.SUCCESS(
                    '\nLes workspaces sont prets a etre utilises!'
                )
            )

            if three_only:
                self.stdout.write(
                    self.style.HTTP_INFO(
                        '\nMode 3 workspaces: Admin, Manager et Comptable charges'
                    )
                )

            self.stdout.write(
                self.style.HTTP_INFO(
                    '\nConseil: Accedez a /workspace pour voir votre espace personnalise'
                )
            )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'\nErreur lors du chargement: {str(e)}')
            )
            raise
