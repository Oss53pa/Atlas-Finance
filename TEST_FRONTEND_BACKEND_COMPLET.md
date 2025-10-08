# 🧪 Test End-to-End Frontend-Backend WiseBook

**Date**: 2025-10-08
**Status**: Prêt à tester

---

## 📋 Services Intégrés

### ✅ Services Backend Créés et Testés
- [x] `authBackendService` - 11 méthodes
- [x] `societeService` - 7 méthodes
- [x] `deviseService` - 7 méthodes
- [x] `fiscalYearService` - 8 méthodes
- [x] `journalService` - 7 méthodes
- [x] `chartOfAccountsService` - 12 méthodes
- [x] `journalEntryService` - 13 méthodes
- [x] `journalEntryLineService` - 6 méthodes
- [x] `tiersService` - 17 méthodes
- [x] `adresseTiersService` - 8 méthodes
- [x] `contactTiersService` - 8 méthodes

### ✅ Services Adaptés pour Frontend
- [x] `auth.service.ts` - Adapté (189 lignes)
- [x] `company.service.ts` - Adapté (150 lignes)
- [x] `accounting-complete.service.ts` - Adapté (590 lignes)
- [x] `third-party.service.ts` - Créé (450 lignes)

**Total**: 120+ méthodes backend, 4 services frontend adaptés

---

## 🚀 Démarrage pour Tests

### 1. Terminal Backend
```bash
cd C:\devs\WiseBook

# Démarrer le backend Django
python manage.py runserver --settings=wisebook.settings.development
```

### 2. Terminal Frontend
```bash
cd C:\devs\WiseBook\frontend

# Installer les dépendances si nécessaire
npm install

# Démarrer le serveur de développement
npm run dev
```

### 3. Navigateur
Ouvrir: http://localhost:3000

---

## 🧪 Tests à Effectuer

### Test 1: Authentication ✅ Priorité HAUTE

**Page**: `/login`

**Actions**:
1. Ouvrir http://localhost:3000/login
2. Entrer:
   - Email: `admin@wisebook.cm`
   - Password: `admin123`
3. Cliquer "Se connecter"

**Résultat attendu**:
- ✅ Redirection vers `/dashboard`
- ✅ Token stocké dans `localStorage`
- ✅ Logs dans console:
  ```
  [API] POST /api/v1/auth/token/
  [API] ← 200 (XXXms)
  ```

**Vérification**:
```javascript
// Console navigateur (F12)
localStorage.getItem('access_token') // Doit retourner le token JWT
localStorage.getItem('user') // Doit retourner l'objet user
```

---

### Test 2: Company Page ✅ Priorité HAUTE

**Page**: `/company`

**Actions**:
1. Naviguer vers http://localhost:3000/company
2. Observer le chargement
3. Vérifier les informations affichées

**Résultat attendu**:
- ✅ Informations de la société "Société de Démonstration SYSCOHADA"
- ✅ Code: DEMO
- ✅ Devise: XAF
- ✅ Logs dans console:
  ```
  [API] GET /api/v1/societes/?page_size=1&ordering=-created_at
  [API] ← 200 (XXXms)
  ```

**Actions supplémentaires**:
1. Cliquer sur "Modifier"
2. Modifier le nom de la société
3. Cliquer "Enregistrer"

**Résultat attendu**:
- ✅ Toast "Informations société mises à jour"
- ✅ Logs:
  ```
  [API] PATCH /api/v1/societes/{id}/
  [API] ← 200 (XXXms)
  ```

---

### Test 3: Plan Comptable ⚠️ Priorité MOYENNE

**Page**: `/accounting` ou `/plan-comptable`

**Actions**:
1. Naviguer vers la page du plan comptable
2. Observer la liste des comptes

**Résultat attendu**:
- ✅ Liste de 119 comptes SYSCOHADA
- ✅ Comptes affichés: "10 - CAPITAL", "101 - Capital social", etc.
- ✅ Logs:
  ```
  [API] GET /api/v1/comptes/
  [API] ← 200 (XXXms)
  ```

**Actions supplémentaires**:
1. Utiliser la recherche (ex: "Capital")
2. Filtrer par classe (ex: "1")
3. Observer l'arbre hiérarchique

**Résultat attendu**:
- ✅ Résultats filtrés correctement
- ✅ Logs de requêtes avec paramètres:
  ```
  [API] GET /api/v1/comptes/?search=Capital
  [API] GET /api/v1/comptes/?classe=1
  ```

---

### Test 4: Journaux ⚠️ Priorité MOYENNE

**Page**: `/journaux` ou `/accounting/journals`

**Actions**:
1. Naviguer vers la page des journaux
2. Observer la liste

**Résultat attendu**:
- ✅ 7 journaux affichés:
  - AC - Journal des Achats
  - AN - Journal des À-nouveaux
  - BQ - Journal de Banque
  - CA - Journal de Caisse
  - OD - Journal des Opérations Diverses
  - SAL - Journal des Salaires
  - VE - Journal des Ventes
- ✅ Logs:
  ```
  [API] GET /api/v1/journaux/
  [API] ← 200 (XXXms)
  ```

---

### Test 5: Création Écriture ⏳ Priorité BASSE

**Page**: `/ecritures/new` ou équivalent

**Actions**:
1. Naviguer vers la création d'écriture
2. Remplir le formulaire:
   - Journal: VE (Ventes)
   - Date: Aujourd'hui
   - Numéro pièce: FAC-001
   - Description: "Test écriture"
   - Lignes:
     - Compte 411 (Clients): Débit 1000
     - Compte 707 (Ventes): Crédit 1000
3. Cliquer "Enregistrer"

**Résultat attendu**:
- ✅ Écriture créée
- ✅ Toast "Écriture créée avec succès"
- ✅ Logs:
  ```
  [API] POST /api/v1/ecritures/
  [API] ← 201 (XXXms)
  ```

---

### Test 6: Third Party (Tiers) ⏳ Priorité BASSE

**Page**: `/third-party` ou `/tiers`

**Actions**:
1. Naviguer vers la page des tiers
2. Observer la liste

**Résultat attendu**:
- ✅ Liste des tiers (peut être vide initialement)
- ✅ Logs:
  ```
  [API] GET /api/v1/tiers/
  [API] ← 200 (XXXms)
  ```

**Actions supplémentaires**:
1. Cliquer "Nouveau tiers"
2. Remplir:
   - Code: CLI001
   - Nom: "Client Test"
   - Type: CLIENT
   - Email: test@client.com
3. Enregistrer

**Résultat attendu**:
- ✅ Tiers créé
- ✅ Toast "Tiers créé avec succès"
- ✅ Logs:
  ```
  [API] POST /api/v1/tiers/
  [API] ← 201 (XXXms)
  ```

---

### Test 7: Profil Utilisateur ⚠️ Priorité MOYENNE

**Page**: `/profile` ou `/settings/profile`

**Actions**:
1. Naviguer vers le profil
2. Observer les informations

**Résultat attendu**:
- ✅ Informations utilisateur affichées
- ✅ Email: admin@wisebook.cm
- ✅ Nom: Admin WiseBook
- ✅ Logs:
  ```
  [API] GET /api/v1/auth/profile/
  [API] ← 200 (XXXms)
  ```

**Actions supplémentaires**:
1. Modifier le prénom/nom
2. Enregistrer

**Résultat attendu**:
- ✅ Profil mis à jour
- ✅ Toast "Profil mis à jour avec succès"
- ✅ Logs:
  ```
  [API] PUT /api/v1/auth/profile/
  [API] ← 200 (XXXms)
  ```

---

### Test 8: Logout ✅ Priorité HAUTE

**Page**: Toute page

**Actions**:
1. Cliquer sur le bouton de déconnexion (généralement dans le header/sidebar)

**Résultat attendu**:
- ✅ Redirection vers `/login`
- ✅ Token supprimé de `localStorage`
- ✅ Toast "Déconnexion réussie"
- ✅ Logs:
  ```
  [API] POST /api/v1/auth/logout/
  [API] ← 200 (XXXms)
  ```

**Vérification**:
```javascript
// Console navigateur
localStorage.getItem('access_token') // Doit retourner null
localStorage.getItem('user') // Doit retourner null
```

---

## 📊 Grille de Test

| Test | Page | Status | Priorité | Notes |
|------|------|--------|----------|-------|
| 1. Login | `/login` | ⏳ À tester | HAUTE | Critique |
| 2. Company | `/company` | ⏳ À tester | HAUTE | Critique |
| 3. Plan Comptable | `/accounting` | ⏳ À tester | MOYENNE | 119 comptes |
| 4. Journaux | `/journaux` | ⏳ À tester | MOYENNE | 7 journaux |
| 5. Écriture | `/ecritures/new` | ⏳ À tester | BASSE | Optionnel |
| 6. Tiers | `/third-party` | ⏳ À tester | BASSE | Optionnel |
| 7. Profil | `/profile` | ⏳ À tester | MOYENNE | Important |
| 8. Logout | N/A | ⏳ À tester | HAUTE | Critique |

---

## 🐛 Erreurs Possibles et Solutions

### Erreur: "Network Error"
**Cause**: Backend non démarré ou CORS

**Solution**:
1. Vérifier que Django tourne sur port 8000
2. Vérifier CORS dans `settings/base.py`:
   ```python
   CORS_ALLOWED_ORIGINS = [
       'http://localhost:3000',
   ]
   ```

### Erreur: "401 Unauthorized"
**Cause**: Token expiré ou invalide

**Solution**:
1. Se reconnecter
2. Vérifier que le token est bien dans `localStorage`
3. Vérifier la date d'expiration (60 minutes)

### Erreur: "404 Not Found"
**Cause**: Endpoint n'existe pas ou URL incorrecte

**Solution**:
1. Vérifier l'URL de l'API dans `enhanced-api-client.ts`
2. Vérifier les routes dans `apps/api/urls.py`

### Erreur: "TypeError: transformToFrontend is not a function"
**Cause**: Problème de contexte `this` dans les méthodes de transformation

**Solution**:
Ajouter `.bind(this)` dans les méthodes map:
```typescript
results.map(this.transformToFrontend.bind(this))
```

---

## 📝 Checklist Finale

### Avant de Commencer
- [ ] Backend Django démarré sur port 8000
- [ ] Frontend React démarré sur port 3000
- [ ] Console navigateur ouverte (F12)
- [ ] Onglet "Network" ouvert pour voir les requêtes

### Tests Critiques (HAUTE Priorité)
- [ ] ✅ Login fonctionne
- [ ] ✅ Token JWT stocké
- [ ] ✅ Company page affiche les données
- [ ] ✅ Logout fonctionne
- [ ] ✅ Token supprimé après logout

### Tests Importants (MOYENNE Priorité)
- [ ] ⚠️ Plan comptable charge 119 comptes
- [ ] ⚠️ Journaux affichent les 7 journaux
- [ ] ⚠️ Profil utilisateur charge et modifie

### Tests Optionnels (BASSE Priorité)
- [ ] ⏳ Création d'écriture fonctionne
- [ ] ⏳ Gestion des tiers fonctionne
- [ ] ⏳ Recherche et filtres fonctionnent

---

## 🎯 Résultat Attendu Final

**Objectif**: Au moins 70% des tests passés (5/8 minimum)

**Tests critiques DOIVENT tous passer**:
- Login ✅
- Company ✅
- Logout ✅

**Si tous les tests passent**:
✅ L'intégration Frontend-Backend est **COMPLÈTE et FONCTIONNELLE**

**Si certains tests échouent**:
⚠️ Documenter les erreurs et continuer les corrections

---

## 📸 Screenshots Recommandés

Pour documenter les tests:
1. Login réussi
2. Company page avec données
3. Plan comptable avec 119 comptes
4. Console avec logs API
5. localStorage avec token

---

## 🎉 Après les Tests

Si tous les tests passent:

1. **Créer un commit Git**:
   ```bash
   git add .
   git commit -m "feat: Intégration frontend-backend complète

   - Services backend créés et testés (120+ méthodes)
   - Services frontend adaptés (auth, company, accounting, third-party)
   - Tests end-to-end validés
   - Login, company, plan comptable, journaux fonctionnels"
   ```

2. **Documenter**:
   - Capturer les screenshots
   - Mettre à jour le README
   - Créer un rapport final

3. **Déployer** (si applicable):
   - Préparer pour production
   - Configurer les variables d'environnement
   - Tester en staging

---

**Date du document**: 2025-10-08
**Version**: 1.0
**Auteur**: Claude Code
**Status**: ⏳ Prêt à tester
