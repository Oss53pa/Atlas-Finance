"""
Configuration Django pour les tests WiseBook V3.0
Settings optimisés pour l'exécution des tests
"""
from .base import *
import tempfile
import os

# DEBUG doit être False pour certains tests de sécurité
DEBUG = False

# Base de données en mémoire pour les tests
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
        'OPTIONS': {
            'init_command': 'PRAGMA foreign_keys=ON;',
        },
        'TEST': {
            'NAME': ':memory:',
        }
    }
}

# Cache en mémoire pour les tests
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'test-cache',
        'KEY_PREFIX': 'wisebook-test',
        'TIMEOUT': 300,
    }
}

# Désactiver les migrations pour les tests (plus rapide)
class DisableMigrations:
    def __contains__(self, item):
        return True
    
    def __getitem__(self, item):
        return None

# MIGRATION_MODULES = DisableMigrations()

# Configuration des tests
TEST_RUNNER = 'django.test.runner.DiscoverRunner'
TEST_NON_SERIALIZED_APPS = []

# Email backend pour les tests
EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'

# Désactiver les logs pendant les tests
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'null': {
            'class': 'logging.NullHandler',
        },
    },
    'root': {
        'handlers': ['null'],
    },
    'loggers': {
        'django': {
            'handlers': ['null'],
            'propagate': False,
        },
        'wisebook': {
            'handlers': ['null'],
            'propagate': False,
        }
    }
}

# Médias temporaires pour les tests
MEDIA_ROOT = tempfile.mkdtemp()

# Désactiver les tâches Celery pendant les tests
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

# Configuration JWT simplifiée pour les tests
from datetime import timedelta
SIMPLE_JWT.update({
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=5),
    'REFRESH_TOKEN_LIFETIME': timedelta(minutes=10),
    'ROTATE_REFRESH_TOKENS': False,
    'BLACKLIST_AFTER_ROTATION': False,
})

# Désactiver la vérification CSRF pour les tests API
CSRF_COOKIE_SECURE = False
SESSION_COOKIE_SECURE = False

# Simplifier les hashs de mots de passe pour les tests
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
]

# Réduire la complexité des mots de passe pour les tests
AUTH_PASSWORD_VALIDATORS = []

# Configuration des paramètres WiseBook pour les tests
WISEBOOK_SETTINGS.update({
    'SESSION_TIMEOUT_MINUTES': 5,
    'MAX_LOGIN_ATTEMPTS': 3,
    'LOCKOUT_DURATION_MINUTES': 1,
})

# Désactiver les middlewares lourds pour les tests
TEST_MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'apps.core.middleware.TenantMiddleware',
]

# Utiliser les middlewares de test si définis
if 'TEST_MIDDLEWARE' in locals():
    MIDDLEWARE = TEST_MIDDLEWARE

# Configuration pour les tests parallèles
if 'PYTEST_CURRENT_TEST' in os.environ:
    # Configuration spécifique à pytest
    DATABASES['default']['ENGINE'] = 'django.db.backends.sqlite3'
    DATABASES['default']['NAME'] = ':memory:'

# Désactiver les signaux lourds pendant les tests
DISABLE_SIGNALS = True

# Configuration de coverage pour exclure certains fichiers
COVERAGE_EXCLUDE = [
    '*/migrations/*',
    '*/venv/*',
    '*/env/*',
    'manage.py',
    'wisebook/wsgi.py',
    'wisebook/asgi.py',
    '*/settings/*',
    '*/tests/*',
    '*/test_*.py',
]

# Désactiver la création automatique de données pour les tests
CREATE_TEST_DATA = False

# Timezone pour les tests
USE_TZ = True
TIME_ZONE = 'UTC'

# Langue par défaut pour les tests
LANGUAGE_CODE = 'fr'

# Désactiver la collecte de fichiers statiques pour les tests
STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.StaticFilesStorage'

# Configuration pour les tests de sécurité
ALLOWED_HOSTS = ['testserver', 'localhost', '127.0.0.1']

# Clé secrète spécifique aux tests
SECRET_KEY = 'test-secret-key-for-testing-only-do-not-use-in-production'

# Configuration GraphQL pour les tests
GRAPHENE = {
    'SCHEMA': 'wisebook.schema.schema',
    'MIDDLEWARE': [],
}

# Configuration DRF pour les tests
REST_FRAMEWORK.update({
    'TEST_REQUEST_DEFAULT_FORMAT': 'json',
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
})

# Désactiver la vérification des permissions pour certains tests
DISABLE_PERMISSIONS_CHECK = False

# Configuration des fixtures de test
FIXTURE_DIRS = [
    os.path.join(BASE_DIR, 'tests', 'fixtures'),
    os.path.join(BASE_DIR, 'fixtures'),
]

# Configuration pour les tests d'intégration
INTEGRATION_TEST_SETTINGS = {
    'CREATE_SAMPLE_DATA': False,
    'USE_REAL_EXTERNAL_APIS': False,
    'MOCK_EXTERNAL_SERVICES': True,
}

# Configuration pour les tests de performance
PERFORMANCE_TEST_SETTINGS = {
    'ENABLE_PROFILING': True,
    'MAX_QUERY_COUNT': 50,
    'MAX_RESPONSE_TIME': 2.0,
}

# Configuration des apps de test
if 'test' in sys.argv or 'pytest' in sys.modules:
    # Apps supplémentaires pour les tests
    TEST_APPS = []
    INSTALLED_APPS = INSTALLED_APPS + TEST_APPS

# Configuration des index pour les tests
# Désactiver l'auto-création d'index pour accélérer les tests
CREATE_INDEXES = False

print("Configuration de test WiseBook V3.0 chargée")