#!/usr/bin/env python
"""
Démarrage simple de WiseBook V3.0 pour développement local
Version minimale avec les apps de base seulement
"""
import os
import sys
import django
from django.conf import settings
from django.core.management import execute_from_command_line

def configure_minimal_django():
    """Configure Django avec le strict minimum."""
    if not settings.configured:
        settings.configure(
            DEBUG=True,
            SECRET_KEY='dev-secret-key-for-local-testing-only',
            
            # Apps minimales
            INSTALLED_APPS=[
                'django.contrib.admin',
                'django.contrib.auth',
                'django.contrib.contenttypes',
                'django.contrib.sessions',
                'django.contrib.messages',
                'django.contrib.staticfiles',
                'rest_framework',
                'rest_framework_simplejwt',
                'corsheaders',
            ],
            
            # Middleware minimal
            MIDDLEWARE=[
                'corsheaders.middleware.CorsMiddleware',
                'django.middleware.security.SecurityMiddleware',
                'django.contrib.sessions.middleware.SessionMiddleware',
                'django.middleware.common.CommonMiddleware',
                'django.middleware.csrf.CsrfViewMiddleware',
                'django.contrib.auth.middleware.AuthenticationMiddleware',
                'django.contrib.messages.middleware.MessageMiddleware',
                'django.middleware.clickjacking.XFrameOptionsMiddleware',
            ],
            
            # Base de données SQLite
            DATABASES={
                'default': {
                    'ENGINE': 'django.db.backends.sqlite3',
                    'NAME': 'db_minimal.sqlite3',
                }
            },
            
            # Templates
            TEMPLATES=[
                {
                    'BACKEND': 'django.template.backends.django.DjangoTemplates',
                    'DIRS': [],
                    'APP_DIRS': True,
                    'OPTIONS': {
                        'context_processors': [
                            'django.template.context_processors.debug',
                            'django.template.context_processors.request',
                            'django.contrib.auth.context_processors.auth',
                            'django.contrib.messages.context_processors.messages',
                        ],
                    },
                },
            ],
            
            # URLs
            ROOT_URLCONF='wisebook.urls_minimal',
            
            # Internationalisation
            LANGUAGE_CODE='fr-fr',
            TIME_ZONE='Africa/Douala',
            USE_I18N=True,
            USE_TZ=True,
            
            # Fichiers statiques
            STATIC_URL='/static/',
            MEDIA_URL='/media/',
            
            # CORS permissif
            CORS_ALLOWED_ORIGINS=[
                'http://localhost:3000',
                'http://127.0.0.1:3000',
            ],
            
            # REST Framework
            REST_FRAMEWORK={
                'DEFAULT_AUTHENTICATION_CLASSES': [
                    'rest_framework.authentication.SessionAuthentication',
                ],
                'DEFAULT_PERMISSION_CLASSES': [
                    'rest_framework.permissions.AllowAny',
                ],
            },
            
            # Autres
            ALLOWED_HOSTS=['*'],
            DEFAULT_AUTO_FIELD='django.db.models.BigAutoField',
        )

def main():
    """Point d'entrée principal."""
    print("WiseBook V3.0 - Démarrage Simple")
    print("=" * 40)
    
    # Configuration Django minimale
    configure_minimal_django()
    django.setup()
    
    # Commandes disponibles
    if len(sys.argv) > 1:
        command = sys.argv[1]
    else:
        command = 'runserver'
    
    if command == 'migrate':
        print("Application des migrations...")
        execute_from_command_line(['manage.py', 'migrate'])
        
    elif command == 'createsuperuser':
        print("Création du superutilisateur...")
        execute_from_command_line(['manage.py', 'createsuperuser'])
        
    elif command == 'shell':
        print("Ouverture du shell Django...")
        execute_from_command_line(['manage.py', 'shell'])
        
    elif command == 'runserver':
        print("Démarrage du serveur Django...")
        print("Interface: http://localhost:8000")
        print("Admin: http://localhost:8000/admin")
        print("Appuyez sur Ctrl+C pour arrêter")
        print("-" * 40)
        
        try:
            execute_from_command_line(['manage.py', 'runserver', '8000'])
        except KeyboardInterrupt:
            print("\nServeur arrêté")
    
    else:
        print(f"Commande non reconnue: {command}")
        print("Commandes disponibles: migrate, createsuperuser, shell, runserver")

if __name__ == '__main__':
    main()