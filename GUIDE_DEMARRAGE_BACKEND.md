# Guide de Démarrage Backend WiseBook

## ✅ Travaux réalisés

### 1. Nettoyage et standardisation des modèles
- ✅ Modèles core nettoyés (`Societe`, `Devise`)
- ✅ Modèles accounting réécris complètement
- ✅ Fichiers manquants créés (pagination, exceptions, middleware)
- ✅ Apps simplifiées dans INSTALLED_APPS (phase 1 seulement)

### 2. Structure actuelle

**Apps actives (Phase 1):**
- `apps.core` - Modèles de base
- `apps.authentication` - User, Role, Permission
- `apps.accounting` - Comptabilité SYSCOHADA complète
- `apps.third_party` - Tiers (clients, fournisseurs)
- `apps.api` - API REST
- `apps.workspaces` - Espaces de travail

**Apps désactivées temporairement (Phase 2):**
- treasury, assets, budget, taxation, reporting, etc.

## 🔧 Étapes suivantes recommandées

### Option A: Approche minimaliste (RECOMMANDÉ)

1. **Simplifier les serializers**
   ```python
   # Créer apps/api/serializers_minimal.py avec uniquement:
   - SocieteSerializer
   - DeviseSerializer
   - FiscalYearSerializer
   - JournalSerializer
   - ChartOfAccountsSerializer
   - JournalEntrySerializer
   - TiersSerializer
   ```

2. **Créer migrations Phase 1**
   ```bash
   python manage.py makemigrations core
   python manage.py makemigrations authentication
   python manage.py makemigrations accounting
   python manage.py makemigrations third_party
   python manage.py makemigrations workspaces
   python manage.py migrate
   ```

3. **Créer superuser**
   ```bash
   python manage.py createsuperuser
   ```

4. **Tester l'API**
   ```bash
   python manage.py runserver
   # Accéder à http://localhost:8000/api/docs/
   ```

5. **Créer fixtures SYSCOHADA**
   Voir section "Fixtures" ci-dessous

6. **Activer progressivement les autres apps**

### Option B: Tout réparer en une fois (complexe)

Corriger tous les imports dans tous les fichiers - Déconseillé car trop d'interdépendances.

## 📦 Fixtures SYSCOHADA à créer

### 1. Devises (fixtures/devises.json)
```python
# apps/core/management/commands/load_devises.py
```json
[
  {"code": "XAF", "nom": "Franc CFA CEMAC", "symbole": "FCFA", "taux_change": 1.0},
  {"code": "XOF", "nom": "Franc CFA UEMOA", "symbole": "FCFA", "taux_change": 1.0},
  {"code": "EUR", "nom": "Euro", "symbole": "€", "taux_change": 655.957},
  {"code": "USD", "nom": "Dollar US", "symbole": "$", "taux_change": 580.5}
]
```

### 2. Plan comptable SYSCOHADA (fixtures/plan_comptable.json)
Classes principales:
- Classe 1: Comptes de capitaux
- Classe 2: Comptes d'immobilisations
- Classe 3: Comptes de stocks
- Classe 4: Comptes de tiers
- Classe 5: Comptes de trésorerie
- Classe 6: Comptes de charges
- Classe 7: Comptes de produits
- Classe 8: Comptes spéciaux

### 3. Journaux par défaut
```python
journals = [
    {"code": "AC", "name": "Achats", "journal_type": "AC"},
    {"code": "VE", "name": "Ventes", "journal_type": "VE"},
    {"code": "BQ", "name": "Banque", "journal_type": "BQ"},
    {"code": "CA", "name": "Caisse", "journal_type": "CA"},
    {"code": "OD", "name": "Opérations Diverses", "journal_type": "OD"},
]
```

## 🐛 Problèmes identifiés et solutions

### Problème 1: Imports de modèles inexistants
**Fichier:** `apps/api/serializers.py`
**Erreur:** Imports de Client, Fournisseur, Facture, etc.
**Solution:** N'utiliser que le modèle `Tiers` qui existe

### Problème 2: Apps désactivées référencées dans urls.py
**Fichier:** `wisebook/urls.py`
**Solution:** Commenter les includes des apps Phase 2

### Problème 3: ViewSets référençant des modèles inexistants
**Fichier:** `apps/api/views.py`
**Solution:** Créer version minimale avec uniquement les modèles Phase 1

## 📝 Script de démarrage rapide

```python
# scripts/setup_phase1.py
"""
Script pour configurer WiseBook Phase 1
"""
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'wisebook.settings.development')
django.setup()

from apps.core.models import Societe, Devise
from apps.accounting.models import FiscalYear, Journal
from apps.authentication.models import User, Role, Permission
from datetime import date, timedelta

def setup():
    print("🚀 Configuration Phase 1 WiseBook...")

    # Créer devises
    print("📊 Création des devises...")
    xaf, _ = Devise.objects.get_or_create(
        code='XAF',
        defaults={'nom': 'Franc CFA CEMAC', 'symbole': 'FCFA', 'taux_change': 1.0}
    )

    # Créer société de démo
    print("🏢 Création de la société de démo...")
    societe, _ = Societe.objects.get_or_create(
        code='DEMO',
        defaults={
            'nom': 'Société de Démonstration',
            'description': 'Société pour tests',
            'email': 'demo@wisebook.cm',
            'telephone': '+237 xxx xxx xxx'
        }
    )

    # Créer exercice fiscal
    print("📅 Création de l'exercice fiscal...")
    today = date.today()
    start_date = date(today.year, 1, 1)
    end_date = date(today.year, 12, 31)

    exercice, _ = FiscalYear.objects.get_or_create(
        company=societe,
        code=str(today.year),
        defaults={
            'name': f'Exercice {today.year}',
            'start_date': start_date,
            'end_date': end_date,
            'is_active': True
        }
    )

    # Créer journaux
    print("📖 Création des journaux...")
    journals_data = [
        ('AC', 'Achats', 'AC'),
        ('VE', 'Ventes', 'VE'),
        ('BQ', 'Banque', 'BQ'),
        ('CA', 'Caisse', 'CA'),
        ('OD', 'Opérations Diverses', 'OD'),
    ]

    for code, name, jtype in journals_data:
        Journal.objects.get_or_create(
            company=societe,
            code=code,
            defaults={'name': name, 'journal_type': jtype}
        )

    # Créer rôles
    print("👥 Création des rôles...")
    admin_role, _ = Role.objects.get_or_create(
        code='admin',
        defaults={'name': 'Administrateur', 'description': 'Accès complet'}
    )

    print("✅ Configuration terminée!")
    print(f"  - Société: {societe.nom}")
    print(f"  - Exercice: {exercice.name}")
    print(f"  - Journaux: {Journal.objects.count()}")
    print("\nProchaine étape: python manage.py createsuperuser")

if __name__ == '__main__':
    setup()
```

## 🎯 Commandes essentielles

```bash
# 1. Vérifier configuration
python manage.py check

# 2. Créer migrations
python manage.py makemigrations

# 3. Appliquer migrations
python manage.py migrate

# 4. Créer superuser
python manage.py createsuperuser

# 5. Charger données de base
python scripts/setup_phase1.py

# 6. Lancer serveur
python manage.py runserver

# 7. Accéder à l'admin
http://localhost:8000/admin/

# 8. Accéder à l'API
http://localhost:8000/api/v1/

# 9. Documentation Swagger
http://localhost:8000/api/docs/
```

## 📚 Documentation API

### Endpoints Phase 1

**Core:**
- GET /api/v1/societes/
- GET /api/v1/devises/

**Accounting:**
- GET /api/v1/exercices/
- GET /api/v1/journaux/
- GET /api/v1/comptes/
- GET /api/v1/ecritures/

**Third Party:**
- GET /api/v1/tiers/

**Authentication:**
- POST /api/v1/auth/login/
- POST /api/v1/auth/logout/
- POST /api/v1/auth/token/
- POST /api/v1/auth/token/refresh/

## 🔍 Tests

```bash
# Tester les modèles
python manage.py shell
>>> from apps.core.models import Societe
>>> Societe.objects.create(code='TEST', nom='Test')

# Tests unitaires
python manage.py test apps.core
python manage.py test apps.accounting
python manage.py test apps.third_party
```

## ⚡ Performance

**Optimisations recommandées:**
1. Activer le cache Redis
2. Utiliser select_related() et prefetch_related()
3. Paginer toutes les listes
4. Ajouter des index sur les champs recherchés

## 🔒 Sécurité

**Checklist:**
- ✅ JWT configuré
- ✅ CORS configuré
- ✅ Permissions par rôle
- ⏳ Rate limiting
- ⏳ 2FA optionnel
- ⏳ Audit logs

## 📞 Support

En cas de problème:
1. Vérifier les logs: `wisebook/logs/wisebook.log`
2. Mode debug: `DEBUG=True` dans .env
3. Django debug toolbar activé

---

**Prochaine session:** Après Phase 1 fonctionnelle, activer progressivement les apps Phase 2
