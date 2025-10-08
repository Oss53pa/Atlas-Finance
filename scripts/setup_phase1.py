"""
Script pour configurer WiseBook Phase 1
Exécuter: python scripts/setup_phase1.py
"""
import os
import sys
import django

# Fix encoding for Windows console
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# Ajouter le répertoire parent au path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'wisebook.settings.development')
django.setup()

from apps.core.models import Societe, Devise
from apps.accounting.models import FiscalYear, Journal
from apps.authentication.models import User, Role, Permission
from datetime import date

def setup():
    print("🚀 Configuration Phase 1 WiseBook...")
    print("=" * 60)

    # Créer devises
    print("\n📊 Création des devises...")
    devises_data = [
        ('XAF', 'Franc CFA CEMAC', 'FCFA', 1.0),
        ('XOF', 'Franc CFA UEMOA', 'FCFA', 1.0),
        ('EUR', 'Euro', '€', 655.957),
        ('USD', 'Dollar US', '$', 580.5),
    ]

    for code, nom, symbole, taux in devises_data:
        devise, created = Devise.objects.get_or_create(
            code=code,
            defaults={'nom': nom, 'symbole': symbole, 'taux_change': taux}
        )
        if created:
            print(f"   ✓ Devise créée: {code} - {nom}")
        else:
            print(f"   - Devise existante: {code}")

    # Créer société de démo
    print("\n🏢 Création de la société de démonstration...")
    societe, created = Societe.objects.get_or_create(
        code='DEMO',
        defaults={
            'nom': 'Société de Démonstration SYSCOHADA',
            'description': 'Société pour tests et démonstration',
            'email': 'demo@wisebook.cm',
            'telephone': '+237 123 456 789',
            'address': '123 Avenue de la Comptabilité, Douala, Cameroun'
        }
    )
    if created:
        print(f"   ✓ Société créée: {societe.nom}")
    else:
        print(f"   - Société existante: {societe.nom}")

    # Créer exercice fiscal
    print("\n📅 Création de l'exercice fiscal...")
    today = date.today()
    start_date = date(today.year, 1, 1)
    end_date = date(today.year, 12, 31)

    exercice, created = FiscalYear.objects.get_or_create(
        company=societe,
        code=str(today.year),
        defaults={
            'name': f'Exercice {today.year}',
            'start_date': start_date,
            'end_date': end_date,
            'is_active': True
        }
    )
    if created:
        print(f"   ✓ Exercice créé: {exercice.name} ({start_date} - {end_date})")
    else:
        print(f"   - Exercice existant: {exercice.name}")

    # Créer journaux SYSCOHADA
    print("\n📖 Création des journaux comptables SYSCOHADA...")
    journals_data = [
        ('AC', 'Journal des Achats', 'AC', 'AC-'),
        ('VE', 'Journal des Ventes', 'VE', 'VE-'),
        ('BQ', 'Journal de Banque', 'BQ', 'BQ-'),
        ('CA', 'Journal de Caisse', 'CA', 'CA-'),
        ('OD', 'Journal des Opérations Diverses', 'OD', 'OD-'),
        ('AN', 'Journal des À-nouveaux', 'AN', 'AN-'),
        ('SAL', 'Journal des Salaires', 'SAL', 'SAL-'),
    ]

    for code, name, jtype, prefix in journals_data:
        journal, created = Journal.objects.get_or_create(
            company=societe,
            code=code,
            defaults={
                'name': name,
                'journal_type': jtype,
                'numbering_prefix': prefix,
                'is_active': True
            }
        )
        if created:
            print(f"   ✓ Journal créé: {code} - {name}")
        else:
            print(f"   - Journal existant: {code}")

    # Créer rôles par défaut
    print("\n👥 Création des rôles...")
    roles_data = [
        ('admin', 'Administrateur', 'Accès complet au système'),
        ('manager', 'Gestionnaire', 'Gestion courante de la comptabilité'),
        ('accountant', 'Comptable', 'Saisie et consultation comptable'),
        ('user', 'Utilisateur', 'Consultation uniquement'),
    ]

    for code, name, description in roles_data:
        role, created = Role.objects.get_or_create(
            code=code,
            defaults={'name': name, 'description': description, 'is_active': True}
        )
        if created:
            print(f"   ✓ Rôle créé: {code} - {name}")
        else:
            print(f"   - Rôle existant: {code}")

    # Statistiques finales
    print("\n" + "=" * 60)
    print("✅ Configuration terminée avec succès!")
    print("=" * 60)
    print(f"📊 Statistiques:")
    print(f"   - Sociétés: {Societe.objects.count()}")
    print(f"   - Devises: {Devise.objects.count()}")
    print(f"   - Exercices: {FiscalYear.objects.count()}")
    print(f"   - Journaux: {Journal.objects.count()}")
    print(f"   - Rôles: {Role.objects.count()}")
    print(f"   - Utilisateurs: {User.objects.count()}")

    print("\n🎯 Prochaines étapes:")
    print("   1. python manage.py createsuperuser")
    print("   2. python manage.py runserver")
    print("   3. Accéder à http://localhost:8000/admin/")
    print("   4. Accéder à http://localhost:8000/api/docs/")

if __name__ == '__main__':
    try:
        setup()
    except Exception as e:
        print(f"\n❌ Erreur lors de la configuration: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
