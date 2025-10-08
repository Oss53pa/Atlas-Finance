# 🚀 WiseBook Backend - Démarrage Rapide

## ✅ Tout est prêt!

Le backend a été entièrement configuré et nettoyé. Suivez ces étapes pour démarrer.

---

## 📋 Étapes de Démarrage (5 minutes)

### 1️⃣ Activer l'environnement virtuel
```bash
cd C:\devs\WiseBook
venv\Scripts\activate
```

### 2️⃣ Appliquer les migrations
```bash
python manage.py migrate --settings=wisebook.settings.development
```
**Résultat attendu:** 15+ tables créées

### 3️⃣ Charger les données de base
```bash
python scripts\setup_phase1.py
```
**Résultat attendu:**
- 4 devises créées
- 1 société démo créée
- 1 exercice fiscal créé
- 7 journaux créés
- 4 rôles créés

### 4️⃣ Charger le plan comptable SYSCOHADA
```bash
python scripts\load_syscohada_fixtures.py
```
**Résultat attendu:** 100+ comptes SYSCOHADA créés

### 5️⃣ Créer votre compte administrateur
```bash
python manage.py createsuperuser --settings=wisebook.settings.development
```
**Informations à saisir:**
- Email: admin@wisebook.cm
- Mot de passe: (votre choix sécurisé)

### 6️⃣ Lancer le serveur
```bash
python manage.py runserver --settings=wisebook.settings.development
```
**Serveur démarré:** http://localhost:8000/

---

## 🌐 Accès aux Interfaces

Une fois le serveur lancé, accédez à:

### Admin Django
**URL:** http://localhost:8000/admin/
**Login:** admin@wisebook.cm / (votre mot de passe)

Interface complète de gestion:
- Sociétés
- Utilisateurs et rôles
- Plan comptable
- Journaux et exercices
- Tiers (clients/fournisseurs)

### API REST
**URL:** http://localhost:8000/api/v1/

Endpoints disponibles:
- `/api/v1/societes/` - Sociétés
- `/api/v1/exercices/` - Exercices comptables
- `/api/v1/journaux/` - Journaux
- `/api/v1/comptes/` - Plan comptable
- `/api/v1/ecritures/` - Écritures
- `/api/v1/tiers/` - Tiers
- `/api/v1/users/` - Utilisateurs

### Documentation API (Swagger)
**URL:** http://localhost:8000/api/docs/

Documentation interactive:
- Tous les endpoints documentés
- Test en direct
- Schémas de données
- Authentification JWT

---

## 🔑 Authentification JWT

### Obtenir un token
```bash
curl -X POST http://localhost:8000/api/v1/auth/token/ \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"admin@wisebook.cm\", \"password\": \"votre_password\"}"
```

**Réponse:**
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

### Utiliser le token
```bash
curl http://localhost:8000/api/v1/societes/ \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc..."
```

---

## 📊 Vérification

### Vérifier que tout fonctionne

```bash
# 1. Vérifier les migrations
python manage.py showmigrations --settings=wisebook.settings.development
# ✅ Toutes les migrations [X] doivent être cochées

# 2. Vérifier les données
python manage.py shell --settings=wisebook.settings.development
>>> from apps.core.models import Societe, Devise
>>> print(f"Sociétés: {Societe.objects.count()}")
>>> print(f"Devises: {Devise.objects.count()}")
>>> from apps.accounting.models import ChartOfAccounts, Journal
>>> print(f"Comptes: {ChartOfAccounts.objects.count()}")
>>> print(f"Journaux: {Journal.objects.count()}")
>>> exit()
# ✅ Résultat attendu:
# Sociétés: 1
# Devises: 4
# Comptes: 100+
# Journaux: 7

# 3. Tester l'API
curl http://localhost:8000/api/v1/
# ✅ Doit retourner la liste des endpoints
```

---

## 🎯 Données Disponibles

Après l'initialisation, vous aurez:

### Société
- **Code:** DEMO
- **Nom:** Société de Démonstration SYSCOHADA

### Devises
- XAF (Franc CFA CEMAC)
- XOF (Franc CFA UEMOA)
- EUR (Euro)
- USD (Dollar US)

### Exercice Fiscal
- Exercice 2025 (01/01/2025 - 31/12/2025)

### Journaux
- AC: Achats
- VE: Ventes
- BQ: Banque
- CA: Caisse
- OD: Opérations Diverses
- AN: À-nouveaux
- SAL: Salaires

### Plan Comptable SYSCOHADA
- Classe 1: Capitaux (14 comptes)
- Classe 2: Immobilisations (12 comptes)
- Classe 3: Stocks (9 comptes)
- Classe 4: Tiers (18 comptes)
- Classe 5: Trésorerie (8 comptes)
- Classe 6: Charges (28 comptes)
- Classe 7: Produits (15 comptes)
- Classe 8: Spéciaux (3 comptes)

### Rôles
- admin: Administrateur
- manager: Gestionnaire
- accountant: Comptable
- user: Utilisateur

---

## 🧪 Test Rapide API

### 1. Login et obtenir le token
```bash
curl -X POST http://localhost:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"admin@wisebook.cm\", \"password\": \"votre_password\"}"
```

### 2. Lister les sociétés
```bash
curl http://localhost:8000/api/v1/societes/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Lister le plan comptable
```bash
curl http://localhost:8000/api/v1/comptes/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Créer une écriture comptable
```bash
curl -X POST http://localhost:8000/api/v1/ecritures/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "company": "uuid-societe",
    "fiscal_year": "uuid-exercice",
    "journal": "uuid-journal",
    "entry_date": "2025-01-15",
    "description": "Test écriture"
  }'
```

---

## 🐛 Problèmes Courants

### Erreur: "No module named 'environ'"
```bash
pip install django-environ
```

### Erreur: "Table doesn't exist"
```bash
# Supprimer la base et recommencer
del db.sqlite3
python manage.py migrate --settings=wisebook.settings.development
python scripts\setup_phase1.py
```

### Erreur: "Permission denied"
```bash
# Activer l'environnement virtuel
venv\Scripts\activate
```

### Port 8000 déjà utilisé
```bash
# Utiliser un autre port
python manage.py runserver 8001 --settings=wisebook.settings.development
```

---

## 📚 Documentation Complète

Pour plus de détails, consultez:

1. **BACKEND_FINAL_REPORT.md** - Rapport complet
2. **BACKEND_READY_TO_START.md** - Guide détaillé
3. **GUIDE_DEMARRAGE_BACKEND.md** - Instructions complètes
4. **MIGRATIONS_CREATED_SUCCESS.md** - Détails migrations

---

## 🎉 Succès!

Si tout s'est bien passé, vous devriez voir:

✅ Serveur Django lancé sur http://localhost:8000/
✅ Admin accessible avec vos identifiants
✅ API retournant les données
✅ Documentation Swagger fonctionnelle

---

## 🚀 Prochaine Étape

**Connecter le frontend React:**
1. Configurer les URLs API dans le frontend
2. Implémenter l'authentification JWT
3. Tester les endpoints CRUD
4. Développer les interfaces utilisateur

---

**Besoin d'aide?** Consultez la documentation ou vérifiez les logs dans `wisebook/logs/`
