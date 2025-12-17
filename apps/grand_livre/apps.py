"""
Configuration de l'application
"""
from django.apps import AppConfig


class GrandLivreConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.grand_livre'
    verbose_name = 'Grand Livre'
