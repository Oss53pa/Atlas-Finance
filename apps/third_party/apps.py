"""
Configuration de l'application Third Party
"""
from django.apps import AppConfig


class ThirdPartyConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.third_party'
    label = 'third_party'  # Label for ForeignKey references
    verbose_name = 'Third Party Management'
