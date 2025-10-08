"""
Development settings for WiseBook project.
"""
from .base import *

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

# Development specific apps
INSTALLED_APPS += [
    'django_extensions',
    'debug_toolbar',
]

# Development middleware
MIDDLEWARE += [
    'debug_toolbar.middleware.DebugToolbarMiddleware',
]

# Debug toolbar configuration
INTERNAL_IPS = [
    '127.0.0.1',
    'localhost',
]

# Development database - SQLite for quick setup
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# Development cache - use local memory
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'unique-snowflake',
    }
}

# Email backend for development
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Celery settings for development
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

# CORS settings for development
CORS_ALLOW_ALL_ORIGINS = True

# Disable security features in development
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False

# Logging for development
LOGGING['loggers']['wisebook']['level'] = 'DEBUG'
LOGGING['handlers']['console']['level'] = 'DEBUG'

# Additional development settings
DJANGO_EXTENSIONS_PRINT_SQL = True
DJANGO_EXTENSIONS_PRINT_SQL_STACKTRACE = True