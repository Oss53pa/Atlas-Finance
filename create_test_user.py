#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Créer un utilisateur de test"""
import os
import sys
import django

# Fix encoding for Windows
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'wisebook.settings.development')
django.setup()

from apps.authentication.models import User, Role

# Créer un rôle admin si nécessaire
admin_role, _ = Role.objects.get_or_create(
    code='admin',
    defaults={
        'name': 'Administrateur',
        'description': 'Accès complet',
        'is_active': True
    }
)

# Créer l'utilisateur admin
try:
    user = User.objects.create_superuser(
        email='admin@wisebook.cm',
        username='admin',
        password='admin123',
        first_name='Admin',
        last_name='WiseBook'
    )
    user.role = admin_role
    user.save()
    print(f"✓ Utilisateur créé: {user.email}")
    print(f"  Email: admin@wisebook.cm")
    print(f"  Password: admin123")
except Exception as e:
    if 'UNIQUE constraint' in str(e) or 'already exists' in str(e):
        print("ℹ Utilisateur admin@wisebook.cm existe déjà")
        # Mettre à jour le mot de passe
        user = User.objects.get(email='admin@wisebook.cm')
        user.set_password('admin123')
        user.save()
        print("✓ Mot de passe mis à jour: admin123")
    else:
        print(f"✗ Erreur: {e}")
