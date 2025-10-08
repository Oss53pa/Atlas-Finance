#!/usr/bin/env python
"""
Script de configuration locale pour WiseBook V3.0
Automatise l'installation et la configuration pour le développement
"""
import os
import sys
import subprocess
import shutil
from pathlib import Path


class WiseBookLocalSetup:
    """Configuration automatique de WiseBook en local."""
    
    def __init__(self):
        self.base_dir = Path(__file__).parent
        self.venv_path = self.base_dir / 'venv'
        
    def print_step(self, step, message):
        """Affiche une étape de configuration."""
        print(f"\n{'='*60}")
        print(f"ÉTAPE {step}: {message}")
        print('='*60)
    
    def print_success(self, message):
        """Affiche un message de succès."""
        print(f"✅ {message}")
    
    def print_error(self, message):
        """Affiche un message d'erreur."""
        print(f"❌ {message}")
    
    def print_warning(self, message):
        """Affiche un avertissement."""
        print(f"⚠️  {message}")
    
    def check_prerequisites(self):
        """Vérifie les prérequis système."""
        self.print_step(1, "Vérification des prérequis")
        
        # Vérifier Python
        python_version = sys.version_info
        if python_version < (3, 11):
            self.print_error(f"Python 3.11+ requis, version {python_version.major}.{python_version.minor} détectée")
            return False
        self.print_success(f"Python {python_version.major}.{python_version.minor} ✓")
        
        # Vérifier pip
        try:
            subprocess.run([sys.executable, '-m', 'pip', '--version'], 
                         check=True, capture_output=True)
            self.print_success("pip installé ✓")
        except subprocess.CalledProcessError:
            self.print_error("pip non trouvé")
            return False
        
        # Vérifier Git
        try:
            subprocess.run(['git', '--version'], check=True, capture_output=True)
            self.print_success("Git installé ✓")
        except (subprocess.CalledProcessError, FileNotFoundError):
            self.print_warning("Git non trouvé (optionnel)")
        
        # Vérifier Node.js (pour le frontend)
        try:
            subprocess.run(['node', '--version'], check=True, capture_output=True)
            self.print_success("Node.js installé ✓")
        except (subprocess.CalledProcessError, FileNotFoundError):
            self.print_warning("Node.js non trouvé - requis pour le frontend React")
        
        return True
    
    def create_virtual_environment(self):
        """Crée l'environnement virtuel."""
        self.print_step(2, "Création de l'environnement virtuel")
        
        if self.venv_path.exists():
            self.print_warning("Environnement virtuel existant trouvé")
            response = input("Voulez-vous le recréer ? (y/N): ")
            if response.lower() == 'y':
                shutil.rmtree(self.venv_path)
            else:
                self.print_success("Utilisation de l'environnement existant")
                return True
        
        try:
            subprocess.run([sys.executable, '-m', 'venv', str(self.venv_path)], 
                         check=True)
            self.print_success("Environnement virtuel créé")
            return True
        except subprocess.CalledProcessError as e:
            self.print_error(f"Erreur création environnement virtuel: {e}")
            return False
    
    def get_pip_command(self):
        """Retourne la commande pip selon l'OS."""
        if os.name == 'nt':  # Windows
            return str(self.venv_path / 'Scripts' / 'pip')
        else:  # Unix/Linux/macOS
            return str(self.venv_path / 'bin' / 'pip')
    
    def get_python_command(self):
        """Retourne la commande python selon l'OS."""
        if os.name == 'nt':  # Windows
            return str(self.venv_path / 'Scripts' / 'python')
        else:  # Unix/Linux/macOS
            return str(self.venv_path / 'bin' / 'python')
    
    def install_dependencies(self):
        """Installe les dépendances Python."""
        self.print_step(3, "Installation des dépendances Python")
        
        pip_cmd = self.get_pip_command()
        
        # Mettre à jour pip
        try:
            subprocess.run([pip_cmd, 'install', '--upgrade', 'pip'], check=True)
            self.print_success("pip mis à jour")
        except subprocess.CalledProcessError:
            self.print_error("Erreur mise à jour pip")
            return False
        
        # Installer les dépendances
        try:
            subprocess.run([pip_cmd, 'install', '-r', 'requirements.txt'], 
                         check=True, cwd=self.base_dir)
            self.print_success("Dépendances Python installées")
            return True
        except subprocess.CalledProcessError as e:
            self.print_error(f"Erreur installation dépendances: {e}")
            return False
    
    def setup_environment_file(self):
        """Configure le fichier d'environnement."""
        self.print_step(4, "Configuration du fichier d'environnement")
        
        env_file = self.base_dir / '.env'
        env_example = self.base_dir / '.env.example'
        
        if env_file.exists():
            self.print_warning("Fichier .env existant trouvé")
            return True
        
        if env_example.exists():
            # Copier le fichier exemple
            shutil.copy(env_example, env_file)
            self.print_success("Fichier .env créé à partir de .env.example")
            
            # Générer une clé secrète
            import secrets
            import string
            
            secret_key = ''.join(secrets.choice(string.ascii_letters + string.digits + '!@#$%^&*') for _ in range(50))
            
            # Remplacer la clé dans le fichier
            with open(env_file, 'r') as f:
                content = f.read()
            
            content = content.replace('your-development-secret-key-change-me-in-production', secret_key)
            
            with open(env_file, 'w') as f:
                f.write(content)
            
            self.print_success("Clé secrète générée automatiquement")
            return True
        else:
            self.print_error("Fichier .env.example non trouvé")
            return False
    
    def setup_database(self):
        """Configure la base de données."""
        self.print_step(5, "Configuration de la base de données")
        
        python_cmd = self.get_python_command()
        
        # Choix de la base de données
        print("\nOptions de base de données:")
        print("1. SQLite (simple, pour développement)")
        print("2. PostgreSQL (recommandé pour production)")
        
        choice = input("Choisissez votre base de données (1/2) [1]: ").strip() or "1"
        
        if choice == "1":
            self._setup_sqlite()
        elif choice == "2":
            self._setup_postgresql()
        else:
            self.print_error("Choix invalide")
            return False
        
        # Effectuer les migrations
        try:
            subprocess.run([python_cmd, 'manage.py', 'migrate'], 
                         check=True, cwd=self.base_dir)
            self.print_success("Migrations appliquées")
            
            # Créer un superutilisateur
            print("\nCréation du superutilisateur...")
            subprocess.run([python_cmd, 'manage.py', 'createsuperuser'], 
                         cwd=self.base_dir)
            
            return True
        except subprocess.CalledProcessError as e:
            self.print_error(f"Erreur configuration base de données: {e}")
            return False
    
    def _setup_sqlite(self):
        """Configure SQLite."""
        self.print_success("Configuration SQLite (aucune configuration supplémentaire requise)")
        
        # Modifier le fichier .env pour utiliser SQLite
        env_file = self.base_dir / '.env'
        if env_file.exists():
            with open(env_file, 'r') as f:
                content = f.read()
            
            # Ajouter la configuration SQLite
            if 'DATABASE_URL' not in content:
                content += '\n# Base de données SQLite\nDATABASE_URL=sqlite:///db.sqlite3\n'
                
                with open(env_file, 'w') as f:
                    f.write(content)
    
    def _setup_postgresql(self):
        """Configure PostgreSQL."""
        print("\nPour PostgreSQL, assurez-vous que:")
        print("- PostgreSQL est installé et en cours d'exécution")
        print("- Une base de données 'wisebook_dev' existe")
        print("- L'utilisateur PostgreSQL a les bonnes permissions")
        
        host = input("Host PostgreSQL [localhost]: ").strip() or "localhost"
        port = input("Port PostgreSQL [5432]: ").strip() or "5432"
        db_name = input("Nom de la base [wisebook_dev]: ").strip() or "wisebook_dev"
        user = input("Utilisateur PostgreSQL [postgres]: ").strip() or "postgres"
        password = input("Mot de passe PostgreSQL: ").strip()
        
        # Modifier le fichier .env
        env_file = self.base_dir / '.env'
        if env_file.exists():
            with open(env_file, 'r') as f:
                content = f.read()
            
            # Remplacer les valeurs PostgreSQL
            content = content.replace('DB_HOST=localhost', f'DB_HOST={host}')
            content = content.replace('DB_PORT=5432', f'DB_PORT={port}')
            content = content.replace('DB_NAME=wisebook_dev', f'DB_NAME={db_name}')
            content = content.replace('DB_USER=postgres', f'DB_USER={user}')
            content = content.replace('DB_PASSWORD=your_db_password', f'DB_PASSWORD={password}')
            
            with open(env_file, 'w') as f:
                f.write(content)
            
            self.print_success("Configuration PostgreSQL mise à jour")
    
    def setup_frontend(self):
        """Configure le frontend React."""
        self.print_step(6, "Configuration du frontend React")
        
        frontend_dir = self.base_dir / 'frontend'
        
        if not frontend_dir.exists():
            self.print_warning("Répertoire frontend non trouvé")
            return True
        
        # Vérifier si npm est installé
        try:
            subprocess.run(['npm', '--version'], check=True, capture_output=True)
        except (subprocess.CalledProcessError, FileNotFoundError):
            self.print_error("npm non trouvé - Node.js requis pour le frontend")
            return False
        
        # Installer les dépendances
        try:
            subprocess.run(['npm', 'install'], check=True, cwd=frontend_dir)
            self.print_success("Dépendances frontend installées")
            return True
        except subprocess.CalledProcessError as e:
            self.print_error(f"Erreur installation frontend: {e}")
            return False
    
    def create_startup_scripts(self):
        """Crée des scripts de démarrage."""
        self.print_step(7, "Création des scripts de démarrage")
        
        # Script de démarrage pour Windows
        if os.name == 'nt':
            start_script = self.base_dir / 'start_wisebook.bat'
            with open(start_script, 'w') as f:
                f.write(f'''@echo off
echo Démarrage de WiseBook V3.0...

REM Activer l'environnement virtuel
call "{self.venv_path}\\Scripts\\activate.bat"

REM Démarrer le serveur Django
echo Démarrage du serveur Django sur http://localhost:8000
python manage.py runserver 8000

pause
''')
            self.print_success("Script start_wisebook.bat créé")
        
        # Script pour Unix/Linux/macOS
        start_script_unix = self.base_dir / 'start_wisebook.sh'
        with open(start_script_unix, 'w') as f:
            f.write(f'''#!/bin/bash
echo "Démarrage de WiseBook V3.0..."

# Activer l'environnement virtuel
source "{self.venv_path}/bin/activate"

# Démarrer le serveur Django
echo "Démarrage du serveur Django sur http://localhost:8000"
python manage.py runserver 8000
''')
        
        # Rendre exécutable sur Unix
        try:
            os.chmod(start_script_unix, 0o755)
            self.print_success("Script start_wisebook.sh créé")
        except:
            pass
        
        return True
    
    def run_tests(self):
        """Lance les tests pour vérifier l'installation."""
        self.print_step(8, "Vérification de l'installation")
        
        python_cmd = self.get_python_command()
        
        try:
            # Test simple
            result = subprocess.run([python_cmd, 'manage.py', 'check'], 
                                  check=True, capture_output=True, text=True,
                                  cwd=self.base_dir)
            
            if "System check identified no issues" in result.stdout:
                self.print_success("Vérification Django réussie")
                return True
            else:
                self.print_warning("Vérification Django avec avertissements")
                return True
        except subprocess.CalledProcessError as e:
            self.print_error(f"Erreur vérification: {e}")
            return False
    
    def print_final_instructions(self):
        """Affiche les instructions finales."""
        print("\n" + "="*60)
        print("🎉 INSTALLATION TERMINÉE AVEC SUCCÈS!")
        print("="*60)
        
        print("\n📋 PROCHAINES ÉTAPES:")
        print("1. Pour démarrer WiseBook:")
        
        if os.name == 'nt':
            print("   Double-cliquez sur start_wisebook.bat")
            print("   OU exécutez: .\\start_wisebook.bat")
        else:
            print("   Exécutez: ./start_wisebook.sh")
        
        print("\n2. Ouvrez votre navigateur sur: http://localhost:8000")
        print("3. Connectez-vous avec le superutilisateur créé")
        
        print("\n🔧 COMMANDES UTILES:")
        print("- Activer l'environnement virtuel:")
        if os.name == 'nt':
            print(f"  {self.venv_path}\\Scripts\\activate.bat")
        else:
            print(f"  source {self.venv_path}/bin/activate")
        
        print("- Démarrer le serveur Django:")
        print("  python manage.py runserver")
        
        print("- Lancer les tests:")
        print("  python run_tests.py --all")
        
        print("- Interface admin Django:")
        print("  http://localhost:8000/admin/")
        
        print("\n📁 STRUCTURE DU PROJET:")
        print("- Backend Django: /apps/")
        print("- Frontend React: /frontend/")
        print("- Base de données: db.sqlite3")
        print("- Configuration: .env")
        
        print("\n🆘 BESOIN D'AIDE?")
        print("- Documentation: README.md")
        print("- Tests: run_tests.py --check")
        print("- Configuration: .env")
    
    def run_full_setup(self):
        """Lance la configuration complète."""
        print("🚀 CONFIGURATION LOCALE DE WISEBOOK V3.0")
        print("ERP Comptable SYSCOHADA pour l'Afrique")
        print("="*60)
        
        steps = [
            self.check_prerequisites,
            self.create_virtual_environment,
            self.install_dependencies,
            self.setup_environment_file,
            self.setup_database,
            self.setup_frontend,
            self.create_startup_scripts,
            self.run_tests,
        ]
        
        for i, step in enumerate(steps, 1):
            if not step():
                self.print_error(f"Échec à l'étape {i}")
                return False
        
        self.print_final_instructions()
        return True


def main():
    """Point d'entrée principal."""
    setup = WiseBookLocalSetup()
    
    try:
        success = setup.run_full_setup()
        return 0 if success else 1
    except KeyboardInterrupt:
        print("\n\n❌ Installation interrompue par l'utilisateur")
        return 1
    except Exception as e:
        print(f"\n\n❌ Erreur inattendue: {e}")
        return 1


if __name__ == '__main__':
    sys.exit(main())