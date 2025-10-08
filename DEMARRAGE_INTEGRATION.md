# 🚀 Guide de Démarrage - Intégration Frontend-Backend

**Date**: 2025-10-08

---

## ⚡ Démarrage Rapide (5 minutes)

### 1. Démarrer le Backend Django

```bash
cd C:\devs\WiseBook

# Activer l'environnement virtuel (si pas déjà fait)
.\venv\Scripts\activate

# Démarrer le serveur Django
python manage.py runserver --settings=wisebook.settings.development

# Vous devriez voir:
# Django version 4.x, using settings 'wisebook.settings.development'
# Starting development server at http://127.0.0.1:8000/
```

### 2. Vérifier le Backend

Ouvrir dans le navigateur: http://localhost:8000/admin/

Vous devriez voir la page de login Django Admin ✅

### 3. Démarrer le Frontend React

```bash
# Nouvelle fenêtre de terminal
cd C:\devs\WiseBook\frontend

# Installer les dépendances (première fois seulement)
npm install

# Démarrer le serveur de développement
npm run dev

# Vous devriez voir:
# VITE v4.x ready in XXX ms
# ➜  Local:   http://localhost:3000/
```

### 4. Tester l'Intégration

1. **Ouvrir**: http://localhost:3000/login

2. **Se connecter avec**:
   - Email: `admin@wisebook.cm`
   - Password: `admin123`

3. **Vérifier la console navigateur** (F12):
   ```
   [API] POST /api/v1/auth/token/
   [API] ← 200 (234ms) {"access":"...", "refresh":"..."}
   ```

4. **Naviguer vers**: http://localhost:3000/company
   - Devrait afficher: "Société de Démonstration SYSCOHADA"

---

## 🧪 Tests Rapides

### Test 1: Authentification

**Frontend (React)**:
```typescript
// Ouvrir la console navigateur sur /login
// Entrer les identifiants et cliquer "Se connecter"
// Observer les logs:

[API] POST /api/v1/auth/token/
Request: { email: "admin@wisebook.cm", password: "admin123" }
[API] ← 200 (156ms)
Response: { access: "eyJ...", refresh: "eyJ...", user: {...} }

// Token stocké automatiquement dans localStorage
localStorage.getItem('access_token') // "eyJ..."
```

**Backend (Python)**:
```bash
# Terminal Django devrait afficher:
POST /api/v1/auth/token/ 200 [0.15, 127.0.0.1:xxxxx]
```

✅ **Succès si**: Redirection vers /dashboard + Token dans localStorage

### Test 2: Récupération Profil

**Frontend**:
```typescript
// Console navigateur après login
[API] GET /api/v1/auth/profile/
Headers: { Authorization: "Bearer eyJ..." }
[API] ← 200 (89ms)
Response: { email: "admin@wisebook.cm", first_name: "Admin", ... }
```

✅ **Succès si**: Profil utilisateur affiché

### Test 3: Liste des Sociétés

**Frontend (à /company)**:
```typescript
[API] GET /api/v1/societes/?page_size=1&ordering=-created_at
[API] ← 200 (123ms)
Response: [{ id: "...", code: "DEMO", nom: "Société de Démonstration SYSCOHADA", ... }]
```

✅ **Succès si**: Informations de la société affichées

### Test 4: Liste des Devises

**Console navigateur**:
```javascript
// Tester manuellement
import { deviseService } from './services/backend-services.index';
const devises = await deviseService.list();
console.log(devises);

// Résultat attendu:
[
  { code: "EUR", nom: "Euro", symbole: "€" },
  { code: "USD", nom: "Dollar US", symbole: "$" },
  { code: "XAF", nom: "Franc CFA CEMAC", symbole: "FCFA" },
  { code: "GBP", nom: "Livre Sterling", symbole: "£" }
]
```

✅ **Succès si**: 4 devises retournées

### Test 5: Plan Comptable

**Console navigateur**:
```javascript
import { chartOfAccountsService } from './services/backend-services.index';
const comptes = await chartOfAccountsService.list({ page_size: 10 });
console.log(comptes);

// Résultat attendu:
{
  count: 119,
  results: [
    { code: "10", name: "CAPITAL", ... },
    { code: "101", name: "Capital social", ... },
    // ... 10 comptes
  ]
}
```

✅ **Succès si**: 119 comptes SYSCOHADA disponibles

---

## 🐛 Dépannage Rapide

### Erreur: "Failed to fetch"

**Symptôme**: Erreur réseau dans la console

**Solutions**:
1. Vérifier que le backend Django est démarré
2. Vérifier l'URL dans `enhanced-api-client.ts`:
   ```typescript
   const BASE_URL = 'http://localhost:8000/api/v1';
   ```
3. Vérifier CORS dans Django `settings/base.py`:
   ```python
   CORS_ALLOWED_ORIGINS = [
       'http://localhost:3000',
   ]
   ```

### Erreur: "401 Unauthorized"

**Symptôme**: Erreur 401 sur les requêtes API

**Solutions**:
1. Vérifier le token dans localStorage:
   ```javascript
   localStorage.getItem('access_token')
   ```
2. Si vide, se reconnecter
3. Si présent, vérifier qu'il n'est pas expiré (durée: 60 minutes)

### Erreur: "Module not found"

**Symptôme**: Erreur d'import TypeScript

**Solutions**:
1. Vérifier les chemins d'import:
   ```typescript
   import { authBackendService } from './services/backend-services.index';
   // OU
   import { authBackendService } from '@/services/backend-services.index';
   ```
2. Redémarrer le serveur de développement:
   ```bash
   # Ctrl+C puis
   npm run dev
   ```

### Erreur: "django_redis not installed"

**Symptôme**: Erreur au démarrage de Django

**Solution**:
```bash
pip install django-redis redis hiredis
```

### Erreur: "Database connection failed"

**Symptôme**: Erreur de connexion PostgreSQL

**Solution**: Vérifier `.env`:
```env
DB_NAME=wisebook
DB_USER=postgres
DB_PASSWORD=votre_mot_de_passe
DB_HOST=localhost
DB_PORT=5432
```

---

## 📊 Vérifications Système

### Backend Django

```bash
# Terminal backend
python manage.py check
# Devrait afficher: System check identified no issues (0 silenced).

# Tester les migrations
python manage.py showmigrations
# Devrait afficher [X] pour chaque migration

# Vérifier l'utilisateur admin
python create_test_user.py
# Devrait afficher: ✓ Utilisateur créé: admin@wisebook.cm
```

### Frontend React

```bash
# Terminal frontend
npm run type-check
# Devrait compiler sans erreurs TypeScript

# Vérifier les dépendances
npm list react react-dom @tanstack/react-query
# Devrait afficher les versions installées
```

---

## 🔍 Inspection des Données

### Via Backend Django Shell

```bash
python manage.py shell --settings=wisebook.settings.development
```

```python
# Vérifier les sociétés
from apps.core.models import Societe
societes = Societe.objects.all()
print(f"Sociétés: {societes.count()}")
for s in societes:
    print(f"  - {s.code}: {s.nom}")

# Vérifier les devises
from apps.core.models import Devise
devises = Devise.objects.all()
print(f"\nDevises: {devises.count()}")
for d in devises:
    print(f"  - {d.code}: {d.nom}")

# Vérifier les comptes
from apps.accounting.models import ChartOfAccounts
comptes = ChartOfAccounts.objects.all()
print(f"\nComptes: {comptes.count()}")
for c in comptes[:5]:
    print(f"  - {c.code}: {c.name}")

# Vérifier les journaux
from apps.accounting.models import Journal
journaux = Journal.objects.all()
print(f"\nJournaux: {journaux.count()}")
for j in journaux:
    print(f"  - {j.code}: {j.name}")

# Vérifier l'utilisateur
from apps.authentication.models import User
user = User.objects.get(email='admin@wisebook.cm')
print(f"\nUtilisateur: {user.email}")
print(f"  Nom: {user.first_name} {user.last_name}")
print(f"  Superuser: {user.is_superuser}")
print(f"  Actif: {user.is_active}")
```

### Via API directement (cURL)

```bash
# 1. Obtenir le token
curl -X POST http://localhost:8000/api/v1/auth/token/ \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@wisebook.cm","password":"admin123"}'

# Résultat: {"access":"eyJ...","refresh":"eyJ..."}

# 2. Utiliser le token (remplacer TOKEN)
curl http://localhost:8000/api/v1/societes/ \
  -H "Authorization: Bearer TOKEN"

# 3. Tester d'autres endpoints
curl http://localhost:8000/api/v1/devises/ \
  -H "Authorization: Bearer TOKEN"

curl http://localhost:8000/api/v1/comptes/?page_size=5 \
  -H "Authorization: Bearer TOKEN"
```

---

## 📝 Checklist de Vérification

### Avant de Commencer
- [ ] Python 3.10+ installé
- [ ] Node.js 18+ installé
- [ ] PostgreSQL installé et démarré
- [ ] Git repository cloné
- [ ] `.env` configuré

### Backend Django
- [ ] Environnement virtuel activé
- [ ] Dépendances installées (`pip install -r requirements.txt`)
- [ ] Migrations appliquées (`python manage.py migrate`)
- [ ] Fixtures chargées (SYSCOHADA, devises, société démo)
- [ ] Utilisateur admin créé (`create_test_user.py`)
- [ ] Serveur démarré sur port 8000

### Frontend React
- [ ] Dépendances installées (`npm install`)
- [ ] Serveur démarré sur port 3000
- [ ] Connexion au backend fonctionnelle
- [ ] Pas d'erreurs TypeScript
- [ ] Pas d'erreurs dans la console navigateur

### Intégration
- [ ] Login fonctionnel
- [ ] Token JWT stocké
- [ ] Profil utilisateur chargé
- [ ] Page Company affiche les données
- [ ] Logs API visibles dans la console

---

## 🎯 Prochaines Étapes

Après avoir vérifié que tout fonctionne:

1. **Explorer les pages disponibles**:
   - `/login` - Page de connexion ✅
   - `/dashboard` - Tableau de bord
   - `/company` - Informations société ✅
   - `/accounting` - Module comptabilité
   - `/third-party` - Module tiers

2. **Tester les fonctionnalités**:
   - Modification des informations société
   - Navigation entre les pages
   - Déconnexion

3. **Consulter la documentation**:
   - `INTEGRATION_FRONTEND_BACKEND_RAPPORT.md` - Guide complet
   - `API_ENDPOINTS.md` - Liste des endpoints
   - `SERVICES_USAGE_GUIDE.md` - Exemples d'utilisation

4. **Continuer l'intégration**:
   - Suivre les étapes du rapport d'intégration
   - Adapter les services comptables
   - Créer les services tiers
   - Tester end-to-end

---

## 📞 Support

### Logs Utiles

**Backend Django**:
```bash
# Voir les logs dans le terminal où Django tourne
# Ou dans le fichier (si configuré)
tail -f logs/wisebook.log
```

**Frontend React**:
```bash
# Console navigateur (F12)
# Filtrer par "API" pour voir les requêtes
# Filtrer par "ERROR" pour voir les erreurs
```

### Commandes Utiles

```bash
# Redémarrer backend
# Ctrl+C dans le terminal Django, puis:
python manage.py runserver --settings=wisebook.settings.development

# Redémarrer frontend
# Ctrl+C dans le terminal npm, puis:
npm run dev

# Réinitialiser la base de données (ATTENTION: perte de données!)
python manage.py flush
python manage.py migrate
python scripts/load_syscohada_fixtures.py
python create_test_user.py

# Tester l'API sans frontend
python quick_test.py
python test_api_integration.py
```

---

**Dernière mise à jour**: 2025-10-08
**Version**: 1.0
**Statut**: ✅ Prêt à tester
