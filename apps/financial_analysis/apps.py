"""
Configuration de l'application
"""
from django.apps import AppConfig


class FinancialAnalysisConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.financial_analysis'
    verbose_name = 'Financial Analysis'
