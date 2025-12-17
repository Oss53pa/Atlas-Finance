"""
Configuration de l'application
"""
from django.apps import AppConfig


class PeriodClosuresConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.period_closures'
    verbose_name = 'Period Closures'
