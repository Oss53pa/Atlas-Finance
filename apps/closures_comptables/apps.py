"""
Configuration de l'application Closures Comptables
"""
from django.apps import AppConfig


class ClosuresComptablesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.closures_comptables'
    verbose_name = 'Clôtures Comptables'
