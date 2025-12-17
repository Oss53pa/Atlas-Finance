"""
Configuration de l'application
"""
from django.apps import AppConfig


class AssetsManagementConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.assets_management'
    verbose_name = 'Assets Management'
