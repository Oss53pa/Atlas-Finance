#!/usr/bin/env python
"""
Script de lancement des tests pour WiseBook V3.0
Runner de tests avec options avancées
"""
import os
import sys
import argparse
import subprocess
from pathlib import Path


def setup_django():
    """Configure Django pour les tests."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'wisebook.settings.test')
    
    import django
    from django.conf import settings
    
    # Configuration des tests si pas encore configuré
    if not settings.configured:
        settings.configure(
            DEBUG=True,
            DATABASES={
                'default': {
                    'ENGINE': 'django.db.backends.sqlite3',
                    'NAME': ':memory:',
                }
            },
            USE_TZ=True,
            SECRET_KEY='test-secret-key-for-testing-only',
            INSTALLED_APPS=[
                'django.contrib.auth',
                'django.contrib.contenttypes',
                'django.contrib.sessions',
                'django.contrib.messages',
                'django.contrib.staticfiles',
                'django.contrib.admin',
                'rest_framework',
                'rest_framework_simplejwt',
                'apps.core',
                'apps.authentication',
                'apps.security',
                'apps.accounting',
                'apps.third_party',
                'apps.treasury',
                'apps.assets',
                'apps.analytics',
                'apps.budgeting',
                'apps.taxation',
                'apps.closing',
                'apps.reporting',
                'apps.fund_calls',
                'apps.consolidation',
                'apps.ml_detection',
                'apps.financial_analysis',
                'apps.api',
                'apps.integrations',
                'apps.configuration',
                'apps.administration',
                'apps.setup_wizard',
            ],
            MIDDLEWARE=[
                'django.middleware.security.SecurityMiddleware',
                'django.contrib.sessions.middleware.SessionMiddleware',
                'django.middleware.common.CommonMiddleware',
                'django.middleware.csrf.CsrfViewMiddleware',
                'django.contrib.auth.middleware.AuthenticationMiddleware',
                'django.contrib.messages.middleware.MessageMiddleware',
                'django.middleware.clickjacking.XFrameOptionsMiddleware',
            ],
            ROOT_URLCONF='wisebook.urls',
            AUTH_USER_MODEL='security.Utilisateur',
        )
    
    django.setup()


class TestRunner:
    """Runner de tests WiseBook avec options avancées."""
    
    def __init__(self):
        self.base_dir = Path(__file__).resolve().parent
        self.tests_dir = self.base_dir / 'tests'
        
    def run_django_tests(self, test_labels=None, **options):
        """Lance les tests Django."""
        from django.core.management import execute_from_command_line
        
        cmd = ['manage.py', 'test']
        
        if test_labels:
            cmd.extend(test_labels)
        
        if options.get('verbosity'):
            cmd.append(f'--verbosity={options["verbosity"]}')
        
        if options.get('parallel'):
            cmd.append('--parallel')
        
        if options.get('keepdb'):
            cmd.append('--keepdb')
        
        if options.get('debug_mode'):
            cmd.append('--debug-mode')
        
        if options.get('failfast'):
            cmd.append('--failfast')
        
        execute_from_command_line(cmd)
    
    def run_pytest_tests(self, test_paths=None, **options):
        """Lance les tests avec pytest."""
        cmd = ['pytest']
        
        if test_paths:
            cmd.extend(test_paths)
        else:
            cmd.append(str(self.tests_dir))
        
        # Options pytest
        if options.get('verbose'):
            cmd.append('-v')
        
        if options.get('show_capture'):
            cmd.append('-s')
        
        if options.get('stop_on_first_fail'):
            cmd.append('-x')
        
        if options.get('last_failed'):
            cmd.append('--lf')
        
        if options.get('failed_first'):
            cmd.append('--ff')
        
        if options.get('markers'):
            cmd.extend(['-m', options['markers']])
        
        if options.get('keywords'):
            cmd.extend(['-k', options['keywords']])
        
        if options.get('coverage'):
            cmd.extend(['--cov=apps', '--cov-report=html', '--cov-report=term'])
        
        if options.get('parallel'):
            try:
                import pytest_xdist
                cmd.extend(['-n', 'auto'])
            except ImportError:
                print("⚠️  pytest-xdist non installé, tests séquentiels")
        
        if options.get('durations'):
            cmd.append('--durations=10')
        
        # Lancer pytest
        result = subprocess.run(cmd, cwd=self.base_dir)
        return result.returncode
    
    def run_performance_tests(self, **options):
        """Lance uniquement les tests de performance."""
        print("🚀 Lancement des tests de performance...")
        
        cmd = ['pytest', str(self.tests_dir / 'test_performance.py')]
        
        if options.get('benchmark'):
            cmd.extend(['--benchmark-only', '--benchmark-sort=mean'])
        
        result = subprocess.run(cmd, cwd=self.base_dir)
        return result.returncode
    
    def run_integration_tests(self, **options):
        """Lance les tests d'intégration."""
        print("🔗 Lancement des tests d'intégration...")
        
        cmd = [
            'pytest', 
            str(self.tests_dir / 'test_integration.py'),
            '-v',
            '--tb=short'
        ]
        
        if options.get('coverage'):
            cmd.extend(['--cov=apps', '--cov-report=term'])
        
        result = subprocess.run(cmd, cwd=self.base_dir)
        return result.returncode
    
    def run_api_tests(self, **options):
        """Lance les tests d'API."""
        print("🌐 Lancement des tests d'API...")
        
        cmd = [
            'pytest',
            str(self.tests_dir / 'test_api_endpoints.py'),
            '-v'
        ]
        
        result = subprocess.run(cmd, cwd=self.base_dir)
        return result.returncode
    
    def run_migration_tests(self, **options):
        """Lance les tests de migration."""
        print("🗄️  Lancement des tests de migration...")
        
        cmd = [
            'pytest',
            str(self.tests_dir / 'test_migrations.py'),
            '-v'
        ]
        
        result = subprocess.run(cmd, cwd=self.base_dir)
        return result.returncode
    
    def run_security_tests(self, **options):
        """Lance les tests de sécurité."""
        print("🔒 Lancement des tests de sécurité...")
        
        cmd = [
            'pytest',
            '-m', 'security',
            '-v'
        ]
        
        result = subprocess.run(cmd, cwd=self.base_dir)
        return result.returncode
    
    def run_all_tests(self, **options):
        """Lance tous les tests."""
        print("🧪 Lancement de tous les tests WiseBook V3.0...")
        
        cmd = ['pytest', str(self.tests_dir)]
        
        if options.get('coverage'):
            cmd.extend(['--cov=apps', '--cov-report=html:htmlcov', '--cov-report=term'])
        
        if options.get('parallel'):
            try:
                import pytest_xdist
                cmd.extend(['-n', 'auto'])
            except ImportError:
                print("⚠️  pytest-xdist non installé, tests séquentiels")
        
        result = subprocess.run(cmd, cwd=self.base_dir)
        return result.returncode
    
    def check_test_environment(self):
        """Vérifie l'environnement de test."""
        print("🔍 Vérification de l'environnement de test...")
        
        # Vérifier Python
        python_version = sys.version_info
        if python_version < (3, 11):
            print(f"⚠️  Python {python_version.major}.{python_version.minor} détecté, Python 3.11+ recommandé")
        else:
            print(f"✅ Python {python_version.major}.{python_version.minor}")
        
        # Vérifier Django
        try:
            import django
            print(f"✅ Django {django.get_version()}")
        except ImportError:
            print("❌ Django non trouvé")
            return False
        
        # Vérifier pytest
        try:
            import pytest
            print(f"✅ pytest {pytest.__version__}")
        except ImportError:
            print("❌ pytest non trouvé")
            return False
        
        # Vérifier les dépendances optionnelles
        optional_deps = [
            ('pytest-django', 'pytest_django'),
            ('pytest-cov', 'pytest_cov'),
            ('pytest-xdist', 'pytest_xdist'),
            ('factory_boy', 'factory'),
        ]
        
        for name, module in optional_deps:
            try:
                __import__(module)
                print(f"✅ {name}")
            except ImportError:
                print(f"⚠️  {name} non installé (optionnel)")
        
        return True
    
    def create_test_report(self):
        """Crée un rapport de test."""
        print("📊 Génération du rapport de test...")
        
        cmd = [
            'pytest',
            str(self.tests_dir),
            '--html=test_report.html',
            '--self-contained-html',
            '--cov=apps',
            '--cov-report=html:htmlcov'
        ]
        
        result = subprocess.run(cmd, cwd=self.base_dir)
        
        if result.returncode == 0:
            print("📁 Rapport généré:")
            print(f"  - HTML: {self.base_dir / 'test_report.html'}")
            print(f"  - Coverage: {self.base_dir / 'htmlcov' / 'index.html'}")
        
        return result.returncode


def main():
    """Point d'entrée principal."""
    parser = argparse.ArgumentParser(
        description='Runner de tests pour WiseBook V3.0',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemples d'utilisation:
  python run_tests.py --all                    # Tous les tests
  python run_tests.py --unit                   # Tests unitaires seulement
  python run_tests.py --integration            # Tests d'intégration
  python run_tests.py --api                    # Tests d'API
  python run_tests.py --performance            # Tests de performance
  python run_tests.py --migration              # Tests de migration
  python run_tests.py --security               # Tests de sécurité
  python run_tests.py --check                  # Vérification environnement
  python run_tests.py --report                 # Générer rapport
  python run_tests.py --coverage --parallel    # Avec couverture et parallélisme
        """
    )
    
    # Types de tests
    test_group = parser.add_mutually_exclusive_group(required=False)
    test_group.add_argument('--all', action='store_true', help='Tous les tests')
    test_group.add_argument('--unit', action='store_true', help='Tests unitaires')
    test_group.add_argument('--integration', action='store_true', help='Tests d\'intégration')
    test_group.add_argument('--api', action='store_true', help='Tests d\'API')
    test_group.add_argument('--performance', action='store_true', help='Tests de performance')
    test_group.add_argument('--migration', action='store_true', help='Tests de migration')
    test_group.add_argument('--security', action='store_true', help='Tests de sécurité')
    
    # Utilitaires
    parser.add_argument('--check', action='store_true', help='Vérifier l\'environnement')
    parser.add_argument('--report', action='store_true', help='Générer un rapport')
    
    # Options générales
    parser.add_argument('--coverage', action='store_true', help='Générer la couverture de code')
    parser.add_argument('--parallel', action='store_true', help='Exécuter en parallèle')
    parser.add_argument('--verbose', '-v', action='store_true', help='Mode verbeux')
    parser.add_argument('--failfast', action='store_true', help='S\'arrêter au premier échec')
    parser.add_argument('--keepdb', action='store_true', help='Garder la DB de test')
    
    # Filtres pytest
    parser.add_argument('--markers', '-m', help='Markers pytest (ex: "not slow")')
    parser.add_argument('--keywords', '-k', help='Mots-clés pytest')
    parser.add_argument('--last-failed', '--lf', action='store_true', help='Tests échoués seulement')
    
    # Paths spécifiques
    parser.add_argument('paths', nargs='*', help='Paths de tests spécifiques')
    
    args = parser.parse_args()
    
    # Si aucun argument, afficher l'aide
    if len(sys.argv) == 1:
        parser.print_help()
        return 0
    
    # Configurer Django
    setup_django()
    
    runner = TestRunner()
    
    # Vérification de l'environnement
    if args.check:
        return 0 if runner.check_test_environment() else 1
    
    # Génération de rapport
    if args.report:
        return runner.create_test_report()
    
    # Options communes
    options = {
        'verbose': args.verbose,
        'coverage': args.coverage,
        'parallel': args.parallel,
        'failfast': args.failfast,
        'keepdb': args.keepdb,
        'markers': args.markers,
        'keywords': args.keywords,
        'last_failed': args.last_failed,
    }
    
    # Lancer les tests appropriés
    if args.all or not any([args.unit, args.integration, args.api, 
                           args.performance, args.migration, args.security]):
        return runner.run_all_tests(**options)
    
    if args.unit:
        options['markers'] = 'unit'
        return runner.run_pytest_tests(test_paths=args.paths, **options)
    
    if args.integration:
        return runner.run_integration_tests(**options)
    
    if args.api:
        return runner.run_api_tests(**options)
    
    if args.performance:
        return runner.run_performance_tests(**options)
    
    if args.migration:
        return runner.run_migration_tests(**options)
    
    if args.security:
        return runner.run_security_tests(**options)
    
    # Paths spécifiques
    if args.paths:
        return runner.run_pytest_tests(test_paths=args.paths, **options)
    
    return 0


if __name__ == '__main__':
    sys.exit(main())