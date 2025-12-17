"""
App configuration pour advanced_bi
"""
from django.apps import AppConfig


class AdvancedBiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.advanced_bi'
    verbose_name = 'Advanced BI & Paloma AI'

    def ready(self):
        """Import des signaux et configurations au démarrage"""
        pass
