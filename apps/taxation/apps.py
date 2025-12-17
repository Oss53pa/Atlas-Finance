"""
Configuration de l'app Taxation WiseBook
"""
from django.apps import AppConfig


class TaxationConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.taxation'
    verbose_name = 'Fiscalité OHADA'
