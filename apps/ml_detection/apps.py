"""
App configuration pour ml_detection
"""
from django.apps import AppConfig


class MlDetectionConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.ml_detection'
    verbose_name = 'ML Detection & Anomalies'

    def ready(self):
        """Import des signaux et configurations au démarrage"""
        pass
