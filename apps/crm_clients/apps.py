"""
Configuration de l'app CRM Clients WiseBook
"""
from django.apps import AppConfig


class CrmClientsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.crm_clients'
    verbose_name = 'CRM Clients'
