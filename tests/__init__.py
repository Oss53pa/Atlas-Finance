"""
Package de tests pour WiseBook V3.0
Système de test complet pour l'ERP comptable
"""

# Configuration par défaut pour tous les tests
import os
import django
from django.conf import settings

# S'assurer que Django est configuré pour les tests
if not settings.configured:
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'wisebook.settings.test')
    django.setup()

# Importation des utilitaires de test communs
from .conftest import *

__all__ = [
    'test_integration',
    'test_api_endpoints', 
    'test_migrations',
    'test_performance',
]