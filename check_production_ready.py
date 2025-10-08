#!/usr/bin/env python
"""
Script de verification pre-production pour WiseBook ERP
Verifie que toutes les configurations critiques sont en place
"""
import os
import sys

def check_env_file():
    """Verifie la presence du fichier .env"""
    if not os.path.exists('.env'):
        return False, ".env file manquant"
    return True, ".env OK"

def check_secret_key():
    """Verifie que SECRET_KEY n'est pas la valeur par defaut"""
    try:
        with open('.env', 'r') as f:
            content = f.read()
            if 'dev-secret-key-change-in-production' in content:
                return False, "SECRET_KEY est toujours la valeur par defaut!"
            if 'your-secret-key' in content:
                return False, "SECRET_KEY n'a pas ete changee!"
        return True, "SECRET_KEY OK"
    except:
        return False, "Erreur lecture .env"

def check_debug_mode():
    """Verifie que DEBUG est False"""
    try:
        with open('.env', 'r') as f:
            content = f.read()
            if 'DEBUG=True' in content:
                return False, "DEBUG=True (doit etre False en production!)"
        return True, "DEBUG OK"
    except:
        return False, "Erreur lecture .env"

def check_database():
    """Verifie la configuration database"""
    if os.path.exists('db.sqlite3'):
        return False, "db.sqlite3 present (utiliser PostgreSQL en production!)"
    return True, "Database OK"

def check_static_files():
    """Verifie que collectstatic a ete execute"""
    if not os.path.exists('staticfiles'):
        return False, "staticfiles/ manquant - executer collectstatic"
    return True, "Static files OK"

def check_frontend_build():
    """Verifie que le frontend a ete build"""
    if not os.path.exists('frontend/dist'):
        return False, "frontend/dist/ manquant - executer npm run build"
    return True, "Frontend build OK"

def check_gitignore():
    """Verifie presence .gitignore"""
    if not os.path.exists('.gitignore'):
        return False, ".gitignore manquant"
    return True, ".gitignore OK"

def check_requirements():
    """Verifie Django version"""
    try:
        import django
        version = django.VERSION
        if version < (4, 2, 17):
            return False, f"Django {version} obsolete - mettre a jour vers 4.2.17+"
        return True, f"Django {version[0]}.{version[1]}.{version[2]} OK"
    except:
        return False, "Django non installe"

def main():
    print("=" * 60)
    print("VERIFICATION PRE-PRODUCTION - WISEBOOK ERP")
    print("=" * 60)
    print()

    checks = [
        ("Fichier .env", check_env_file),
        ("SECRET_KEY", check_secret_key),
        ("Mode DEBUG", check_debug_mode),
        ("Base de donnees", check_database),
        ("Fichiers statiques", check_static_files),
        ("Build frontend", check_frontend_build),
        (".gitignore", check_gitignore),
        ("Version Django", check_requirements),
    ]

    passed = 0
    failed = 0

    for name, check_func in checks:
        try:
            success, message = check_func()
            status = "OK  " if success else "FAIL"
            symbol = "[+]" if success else "[X]"
            print(f"[{status}] {symbol} {name}: {message}")
            if success:
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"[FAIL] [X] {name}: Erreur - {e}")
            failed += 1

    print()
    print("=" * 60)
    print(f"RESULTAT: {passed} OK / {failed} FAIL")
    print("=" * 60)

    if failed > 0:
        print("\nCORRECTIONS REQUISES AVANT PRODUCTION!")
        sys.exit(1)
    else:
        print("\nTous les checks sont OK - Pret pour production!")
        sys.exit(0)

if __name__ == '__main__':
    main()
