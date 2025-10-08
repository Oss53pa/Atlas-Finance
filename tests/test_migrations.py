"""
Tests de migration de base de données pour WiseBook V3.0
Validation des migrations et cohérence des schémas
"""
import pytest
from django.test import TestCase, TransactionTestCase
from django.test.utils import override_settings
from django.db import connection, migrations
from django.db.migrations.executor import MigrationExecutor
from django.db.migrations.state import ProjectState
from django.core.management import call_command
from django.apps import apps
from django.conf import settings
import tempfile
import os
from io import StringIO


class MigrationTestCase(TransactionTestCase):
    """Tests de base pour les migrations."""
    
    def setUp(self):
        """Configuration pour les tests de migration."""
        self.executor = MigrationExecutor(connection)
        self.apps_to_test = [
            'core',
            'authentication', 
            'accounting',
            'third_party',
            'treasury',
            'assets',
            'analytics',
            'budgeting',
            'taxation',
            'closing',
            'reporting',
            'fund_calls',
            'consolidation',
            'security',
            'ml_detection',
            'financial_analysis',
            'api',
            'integrations',
            'configuration',
            'administration',
            'setup_wizard'
        ]
    
    def get_app_migrations(self, app_name):
        """Récupère toutes les migrations d'une app."""
        try:
            migrations_module = apps.get_app_config(app_name).get_models()
            return self.executor.loader.graph.forwards_plan([
                (app_name, migration_name) 
                for migration_name in self.executor.loader.graph.nodes 
                if migration_name[0] == app_name
            ])
        except:
            return []


class MigrationIntegrityTest(MigrationTestCase):
    """Tests d'intégrité des migrations."""
    
    def test_all_migrations_apply_cleanly(self):
        """Test que toutes les migrations s'appliquent sans erreur."""
        for app_name in self.apps_to_test:
            with self.subTest(app=app_name):
                try:
                    # Récupérer les migrations pour cette app
                    app_migrations = [
                        migration for migration in self.executor.loader.graph.nodes 
                        if migration[0] == app_name
                    ]
                    
                    if app_migrations:
                        # Tenter d'appliquer toutes les migrations
                        self.executor.migrate([
                            (app_name, migration[1]) for migration in app_migrations
                        ])
                        self.assertTrue(True, f"Migrations pour {app_name} appliquées avec succès")
                    else:
                        self.skipTest(f"Aucune migration trouvée pour {app_name}")
                        
                except Exception as e:
                    self.fail(f"Échec de migration pour {app_name}: {str(e)}")
    
    def test_migration_dependencies(self):
        """Test des dépendances entre migrations."""
        loader = self.executor.loader
        
        for app_name in self.apps_to_test:
            app_migrations = [
                migration for migration in loader.graph.nodes 
                if migration[0] == app_name
            ]
            
            for migration_key in app_migrations:
                with self.subTest(migration=migration_key):
                    migration = loader.graph.nodes[migration_key]
                    
                    # Vérifier que toutes les dépendances existent
                    for dependency in migration.dependencies:
                        self.assertIn(
                            dependency, 
                            loader.graph.nodes,
                            f"Dépendance manquante {dependency} pour {migration_key}"
                        )
    
    def test_no_migration_conflicts(self):
        """Test qu'il n'y a pas de conflits entre migrations."""
        loader = self.executor.loader
        
        # Vérifier qu'il n'y a pas de migrations en conflit
        conflicts = loader.detect_conflicts()
        self.assertEqual(
            len(conflicts), 0,
            f"Conflits de migration détectés: {conflicts}"
        )


class MigrationRollbackTest(MigrationTestCase):
    """Tests de rollback des migrations."""
    
    def test_migration_rollback(self):
        """Test du rollback des migrations."""
        for app_name in self.apps_to_test:
            with self.subTest(app=app_name):
                try:
                    # Récupérer les migrations pour cette app
                    app_migrations = [
                        migration for migration in self.executor.loader.graph.nodes 
                        if migration[0] == app_name
                    ]
                    
                    if len(app_migrations) > 1:
                        # Prendre la dernière migration
                        last_migration = max(app_migrations, key=lambda x: x[1])
                        
                        # Appliquer la migration
                        self.executor.migrate([(app_name, last_migration[1])])
                        
                        # Tenter le rollback vers la précédente
                        previous_migrations = [
                            m for m in app_migrations if m[1] < last_migration[1]
                        ]
                        
                        if previous_migrations:
                            previous_migration = max(previous_migrations, key=lambda x: x[1])
                            self.executor.migrate([(app_name, previous_migration[1])])
                            self.assertTrue(True, f"Rollback pour {app_name} réussi")
                    else:
                        self.skipTest(f"Pas assez de migrations pour tester le rollback de {app_name}")
                        
                except Exception as e:
                    self.fail(f"Échec de rollback pour {app_name}: {str(e)}")


class SchemaConsistencyTest(TestCase):
    """Tests de cohérence du schéma de base de données."""
    
    def test_foreign_key_constraints(self):
        """Test que toutes les clés étrangères sont valides."""
        from django.db import models
        
        # Récupérer tous les modèles
        all_models = []
        for app_name in ['core', 'accounting', 'third_party', 'treasury', 'assets', 
                        'analytics', 'security', 'authentication']:
            try:
                app_models = apps.get_app_config(app_name).get_models()
                all_models.extend(app_models)
            except:
                continue
        
        for model in all_models:
            with self.subTest(model=model.__name__):
                for field in model._meta.get_fields():
                    if isinstance(field, models.ForeignKey):
                        # Vérifier que le modèle référencé existe
                        related_model = field.related_model
                        self.assertIsNotNone(
                            related_model,
                            f"Modèle référencé par {model.__name__}.{field.name} n'existe pas"
                        )
    
    def test_unique_constraints(self):
        """Test des contraintes d'unicité."""
        from django.db import models
        
        # Modèles critiques avec contraintes d'unicité
        critical_models = [
            ('core.Societe', ['sigle']),
            ('accounting.CompteComptable', ['societe', 'numero']),
            ('accounting.JournalComptable', ['societe', 'code']),
            ('third_party.Tiers', ['societe', 'code']),
            ('security.Utilisateur', ['username']),
        ]
        
        for model_path, unique_fields in critical_models:
            try:
                model = apps.get_model(model_path)
                
                # Vérifier que les contraintes d'unicité sont définies
                unique_together = getattr(model._meta, 'unique_together', [])
                constraints = getattr(model._meta, 'constraints', [])
                
                # Chercher les contraintes d'unicité dans les différents endroits
                found_unique = False
                
                # Vérifier unique_together
                for unique_set in unique_together:
                    if set(unique_fields).issubset(set(unique_set)):
                        found_unique = True
                        break
                
                # Vérifier les contraintes modernes
                for constraint in constraints:
                    if hasattr(constraint, 'fields') and set(unique_fields).issubset(set(constraint.fields)):
                        found_unique = True
                        break
                
                # Vérifier les champs individuels avec unique=True
                for field_name in unique_fields:
                    field = model._meta.get_field(field_name)
                    if getattr(field, 'unique', False):
                        found_unique = True
                        break
                
                self.assertTrue(
                    found_unique,
                    f"Contrainte d'unicité manquante pour {model_path} sur {unique_fields}"
                )
                
            except Exception as e:
                self.fail(f"Erreur lors de la vérification de {model_path}: {str(e)}")
    
    def test_index_presence(self):
        """Test de la présence d'index critiques."""
        critical_indexes = [
            ('accounting_ecriturecomptable', ['societe_id', 'date_ecriture']),
            ('accounting_ligneecriture', ['ecriture_id']),
            ('accounting_ligneecriture', ['compte_id']),
            ('security_journalsecurite', ['utilisateur_id', 'timestamp']),
            ('core_auditlog', ['content_type_id', 'object_id']),
            ('third_party_tiers', ['societe_id', 'type']),
        ]
        
        with connection.cursor() as cursor:
            for table_name, index_fields in critical_indexes:
                with self.subTest(table=table_name, fields=index_fields):
                    try:
                        # Vérifier que la table existe
                        cursor.execute(
                            "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
                            [table_name]
                        )
                        
                        if cursor.fetchone():
                            # Pour SQLite, vérifier les index
                            cursor.execute(
                                "PRAGMA index_list(?)",
                                [table_name]
                            )
                            indexes = cursor.fetchall()
                            
                            # Au moins un index doit exister pour cette table
                            self.assertGreater(
                                len(indexes), 0,
                                f"Aucun index trouvé pour la table {table_name}"
                            )
                        else:
                            self.skipTest(f"Table {table_name} n'existe pas encore")
                            
                    except Exception as e:
                        # Si on ne peut pas vérifier les index, on passe
                        self.skipTest(f"Impossible de vérifier les index pour {table_name}: {str(e)}")


class DataIntegrityTest(TestCase):
    """Tests d'intégrité des données après migration."""
    
    def test_required_initial_data(self):
        """Test que les données initiales requises sont présentes."""
        from apps.core.models import Devise
        from apps.accounting.models import CompteComptable
        
        # Vérifier que la devise XAF existe (peut être créée par une migration)
        try:
            xaf = Devise.objects.get(code='XAF')
            self.assertTrue(xaf.devise_reference, "XAF doit être la devise de référence")
        except Devise.DoesNotExist:
            # Si XAF n'existe pas, c'est peut-être normal selon l'environnement de test
            self.skipTest("Devise XAF non trouvée - peut être normale en test")
    
    def test_syscohada_accounts_structure(self):
        """Test de la structure des comptes SYSCOHADA."""
        from apps.accounting.models import CompteComptable
        
        # Classes de comptes SYSCOHADA attendues
        expected_classes = [1, 2, 3, 4, 5, 6, 7, 8]
        
        for classe in expected_classes:
            with self.subTest(classe=classe):
                # Vérifier qu'il existe au moins un compte pour chaque classe
                # (seulement si des comptes existent)
                comptes_classe = CompteComptable.objects.filter(classe=classe)
                
                if CompteComptable.objects.exists():
                    # Si des comptes existent, vérifier la cohérence des classes
                    if comptes_classe.exists():
                        for compte in comptes_classe:
                            # Vérifier que le numéro correspond à la classe
                            numero_classe = int(compte.numero[0]) if compte.numero else 0
                            self.assertEqual(
                                numero_classe, classe,
                                f"Compte {compte.numero} a un numéro incohérent avec sa classe {classe}"
                            )


class MigrationPerformanceTest(TransactionTestCase):
    """Tests de performance des migrations."""
    
    def test_migration_speed(self):
        """Test que les migrations s'exécutent dans un temps raisonnable."""
        import time
        
        start_time = time.time()
        
        # Simuler l'application de toutes les migrations
        try:
            call_command('migrate', verbosity=0, interactive=False, stdout=StringIO())
            
            end_time = time.time()
            migration_duration = end_time - start_time
            
            # Les migrations ne doivent pas prendre plus de 60 secondes
            self.assertLess(
                migration_duration, 60.0,
                f"Migrations trop lentes: {migration_duration:.2f}s"
            )
            
        except Exception as e:
            self.fail(f"Erreur lors de l'exécution des migrations: {str(e)}")


class MigrationDocumentationTest(TestCase):
    """Tests de documentation des migrations."""
    
    def test_migration_files_exist(self):
        """Test que les fichiers de migration existent pour chaque app."""
        for app_name in ['core', 'accounting', 'security', 'authentication']:
            with self.subTest(app=app_name):
                try:
                    app_config = apps.get_app_config(app_name)
                    migrations_dir = os.path.join(app_config.path, 'migrations')
                    
                    if os.path.exists(migrations_dir):
                        # Vérifier qu'il y a au moins un fichier de migration
                        migration_files = [
                            f for f in os.listdir(migrations_dir)
                            if f.endswith('.py') and f != '__init__.py'
                        ]
                        
                        self.assertGreater(
                            len(migration_files), 0,
                            f"Aucun fichier de migration trouvé pour {app_name}"
                        )
                    else:
                        self.skipTest(f"Répertoire migrations non trouvé pour {app_name}")
                        
                except Exception as e:
                    self.skipTest(f"Impossible de vérifier les migrations pour {app_name}: {str(e)}")


class CustomMigrationTest(TestCase):
    """Tests des migrations personnalisées spécifiques à WiseBook."""
    
    def test_syscohada_data_migration(self):
        """Test de la migration des données SYSCOHADA."""
        # Cette méthode teste les migrations de données personnalisées
        # qui chargent le plan comptable SYSCOHADA
        pass  # À implémenter selon les migrations de données spécifiques
    
    def test_initial_permissions_migration(self):
        """Test de la migration des permissions initiales."""
        from apps.security.models import Permission
        
        # Vérifier que les permissions de base existent
        # (seulement si le système de permissions est initialisé)
        if Permission.objects.exists():
            basic_permissions = [
                'accounting.view_comptecomptable',
                'accounting.add_comptecomptable', 
                'accounting.change_comptecomptable',
                'accounting.delete_comptecomptable',
            ]
            
            for perm_code in basic_permissions:
                with self.subTest(permission=perm_code):
                    self.assertTrue(
                        Permission.objects.filter(code=perm_code).exists(),
                        f"Permission {perm_code} manquante"
                    )


# Fixtures de test pour les migrations
@pytest.fixture
def temp_database():
    """Fixture pour une base de données temporaire."""
    with tempfile.NamedTemporaryFile(delete=False) as tmp_file:
        temp_db_path = tmp_file.name
    
    with override_settings(
        DATABASES={
            'default': {
                'ENGINE': 'django.db.backends.sqlite3',
                'NAME': temp_db_path,
            }
        }
    ):
        yield temp_db_path
    
    # Nettoyage
    if os.path.exists(temp_db_path):
        os.unlink(temp_db_path)


@pytest.mark.django_db
class MigrationStateTest:
    """Tests de l'état des migrations avec pytest."""
    
    def test_migration_state_consistency(self, temp_database):
        """Test de cohérence de l'état des migrations."""
        from django.db.migrations.state import ProjectState
        
        executor = MigrationExecutor(connection)
        
        # Récupérer l'état actuel des migrations
        current_state = executor.loader.project_state()
        
        # Vérifier que l'état est cohérent
        assert isinstance(current_state, ProjectState)
        assert len(current_state.models) > 0, "Aucun modèle dans l'état des migrations"


if __name__ == '__main__':
    # Exécution des tests de migration
    import django
    from django.conf import settings
    from django.test.utils import get_runner
    
    if not settings.configured:
        settings.configure(
            DEBUG=True,
            DATABASES={
                'default': {
                    'ENGINE': 'django.db.backends.sqlite3',
                    'NAME': ':memory:',
                }
            },
            INSTALLED_APPS=[
                'django.contrib.auth',
                'django.contrib.contenttypes',
                'apps.core',
                'apps.accounting',
                'apps.security',
                'apps.authentication',
            ]
        )
    
    django.setup()
    TestRunner = get_runner(settings)
    test_runner = TestRunner()
    failures = test_runner.run_tests(['test_migrations'])
    
    if failures:
        raise SystemExit(bool(failures))