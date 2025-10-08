#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Quick Start pour WiseBook V3.0 - Version simplifiée
"""
import os
import sys
import subprocess
from pathlib import Path

def main():
    """Configuration rapide de WiseBook."""
    print("WiseBook V3.0 - Configuration Rapide")
    print("=" * 40)
    
    # Vérifier Python
    if sys.version_info < (3, 11):
        print(f"ERREUR: Python 3.11+ requis (version actuelle: {sys.version_info.major}.{sys.version_info.minor})")
        return 1
    
    print(f"Python {sys.version_info.major}.{sys.version_info.minor} detecte")
    
    base_dir = Path(__file__).parent
    venv_path = base_dir / 'venv'
    
    # Créer environnement virtuel
    if not venv_path.exists():
        print("Creation de l'environnement virtuel...")
        subprocess.run([sys.executable, '-m', 'venv', 'venv'], cwd=base_dir)
    
    # Commandes selon l'OS
    if os.name == 'nt':  # Windows
        pip_cmd = str(venv_path / 'Scripts' / 'pip')
        python_cmd = str(venv_path / 'Scripts' / 'python')
    else:  # Unix/Linux/macOS
        pip_cmd = str(venv_path / 'bin' / 'pip')
        python_cmd = str(venv_path / 'bin' / 'python')
    
    # Installer dépendances essentielles
    print("Installation des dependances essentielles...")
    essential_deps = [
        'Django==4.2.7',
        'djangorestframework==3.14.0', 
        'django-cors-headers==4.3.1',
        'djangorestframework-simplejwt==5.3.0',
        'django-environ==0.11.2',
        'Pillow==10.1.0',
    ]
    
    for dep in essential_deps:
        subprocess.run([pip_cmd, 'install', dep], check=True)
    
    # Créer .env
    env_file = base_dir / '.env'
    if not env_file.exists():
        print("Creation du fichier .env...")
        with open(env_file, 'w', encoding='utf-8') as f:
            f.write("""# Configuration WiseBook V3.0
SECRET_KEY=dev-secret-key-change-in-production
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Base de donnees SQLite pour developpement
DATABASE_URL=sqlite:///db.sqlite3

# Cache local
REDIS_URL=redis://localhost:6379/0

# Email
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend

# WiseBook
DEFAULT_CURRENCY=XAF
DEFAULT_COUNTRY=CM
""")
    
    # Migrations
    print("Application des migrations...")
    try:
        subprocess.run([python_cmd, 'manage.py', 'migrate'], 
                      cwd=base_dir, check=True)
    except subprocess.CalledProcessError:
        print("ATTENTION: Erreur migrations - continuez quand meme")
    
    print("\nConfiguration terminee!")
    print("=" * 40)
    print("Pour demarrer WiseBook:")
    print("1. Double-cliquez sur 'start_wisebook.bat'")
    print("2. Ou executez: python manage.py runserver")
    print("3. Ouvrez: http://localhost:8000")
    print("=" * 40)
    
    return 0

if __name__ == '__main__':
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\nConfiguration interrompue")
        sys.exit(1)
    except Exception as e:
        print(f"\nErreur: {e}")
        sys.exit(1)