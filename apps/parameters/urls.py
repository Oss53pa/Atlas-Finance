"""
URLs pour le module Paramètres WiseBook ERP V3.0
Configuration des routes API pour les paramètres système
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()

router.register(r'parametres-systeme', views.ParametreSystemeViewSet, basename='parametre-systeme')
router.register(r'configurations-societe', views.ConfigurationSocieteViewSet, basename='configuration-societe')
router.register(r'journaux-parametres', views.JournalParametresViewSet, basename='journal-parametres')
router.register(r'notifications-parametres', views.NotificationParametresViewSet, basename='notification-parametres')

app_name = 'parameters'

urlpatterns = [
    path('', include(router.urls)),
]