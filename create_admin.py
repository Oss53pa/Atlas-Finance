#!/usr/bin/env python
"""
Script pour créer un superutilisateur WiseBook
"""
import os
import django
from django.conf import settings

# Configuration minimale
if not settings.configured:
    settings.configure(
        DEBUG=True,
        SECRET_KEY='dev-secret-key-for-local-testing-only',
        
        INSTALLED_APPS=[
            'django.contrib.admin',
            'django.contrib.auth',
            'django.contrib.contenttypes',
            'django.contrib.sessions',
            'django.contrib.messages',
            'django.contrib.staticfiles',
        ],
        
        DATABASES={
            'default': {
                'ENGINE': 'django.db.backends.sqlite3',
                'NAME': 'db_minimal.sqlite3',
            }
        },
        
        ALLOWED_HOSTS=['*'],
        DEFAULT_AUTO_FIELD='django.db.models.BigAutoField',
    )

django.setup()

from django.contrib.auth.models import User

def main():
    """Créer le superutilisateur."""
    print("Création du superutilisateur WiseBook...")
    
    # Supprimer l'utilisateur s'il existe déjà
    if User.objects.filter(username='admin').exists():
        print("Utilisateur 'admin' trouvé, suppression...")
        User.objects.filter(username='admin').delete()
    
    # Créer le nouvel utilisateur
    admin_user = User.objects.create_superuser(
        username='admin',
        email='admin@wisebook.local',
        password='password123'
    )
    
    print("Superutilisateur créé avec succès!")
    print("=" * 40)
    print("Utilisateur: admin")
    print("Mot de passe: password123") 
    print("Email: admin@wisebook.local")
    print("=" * 40)
    print("Vous pouvez maintenant vous connecter à:")
    print("http://localhost:8000/admin/")

if __name__ == '__main__':
    main()