# 📡 WiseBook API Endpoints - Phase 1

**Base URL**: `http://localhost:8000/api/v1`

## 🔐 Authentication

| Méthode | Endpoint | Description | Auth Required |
|---------|----------|-------------|---------------|
| POST | `/auth/login/` | Connexion utilisateur | ❌ |
| POST | `/auth/logout/` | Déconnexion utilisateur | ✅ |
| GET | `/auth/profile/` | Récupérer profil utilisateur | ✅ |
| POST | `/auth/token/` | Obtenir JWT token | ❌ |
| POST | `/auth/token/refresh/` | Rafraîchir JWT token | ❌ |

**Login Request Body**:
```json
{
  "email": "admin@wisebook.cm",
  "password": "votre_password"
}
```

**Login Response**:
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "user": {
    "id": "uuid",
    "email": "admin@wisebook.cm",
    "first_name": "Admin",
    "last_name": "User",
    "role": "admin"
  }
}
```

---

## 🏢 Core - Sociétés

| Méthode | Endpoint | Description | Auth Required |
|---------|----------|-------------|---------------|
| GET | `/societes/` | Liste toutes les sociétés | ✅ |
| POST | `/societes/` | Créer une société | ✅ |
| GET | `/societes/{id}/` | Détails d'une société | ✅ |
| PUT | `/societes/{id}/` | Modifier une société | ✅ |
| PATCH | `/societes/{id}/` | Modification partielle | ✅ |
| DELETE | `/societes/{id}/` | Supprimer une société | ✅ |

**Société Object**:
```typescript
{
  id: string (UUID)
  code: string
  nom: string
  description?: string
  email?: string
  telephone?: string
  address?: string
  created_at: string (ISO datetime)
  updated_at: string (ISO datetime)
}
```

---

## 💱 Core - Devises

| Méthode | Endpoint | Description | Auth Required |
|---------|----------|-------------|---------------|
| GET | `/devises/` | Liste toutes les devises | ✅ |
| POST | `/devises/` | Créer une devise | ✅ |
| GET | `/devises/{id}/` | Détails d'une devise | ✅ |
| PUT | `/devises/{id}/` | Modifier une devise | ✅ |
| DELETE | `/devises/{id}/` | Supprimer une devise | ✅ |

**Devise Object**:
```typescript
{
  id: string (UUID)
  code: string (ISO 3)
  nom: string
  symbole: string
  taux_change: number (decimal)
  is_active: boolean
  created_at: string
  updated_at: string
}
```

---

## 👥 Authentication - Utilisateurs

| Méthode | Endpoint | Description | Auth Required |
|---------|----------|-------------|---------------|
| GET | `/users/` | Liste utilisateurs | ✅ |
| POST | `/users/` | Créer utilisateur | ✅ (admin) |
| GET | `/users/{id}/` | Détails utilisateur | ✅ |
| PUT | `/users/{id}/` | Modifier utilisateur | ✅ |
| DELETE | `/users/{id}/` | Supprimer utilisateur | ✅ (admin) |
| GET | `/users/me/` | Mon profil | ✅ |

**User Object**:
```typescript
{
  id: string (UUID)
  email: string
  username: string
  first_name: string
  last_name: string
  is_active: boolean
  is_staff: boolean
  role: Role
  created_at: string
  updated_at: string
}
```

---

## 🔑 Authentication - Rôles & Permissions

| Méthode | Endpoint | Description | Auth Required |
|---------|----------|-------------|---------------|
| GET | `/roles/` | Liste rôles | ✅ |
| GET | `/roles/{id}/` | Détails rôle | ✅ |
| GET | `/permissions/` | Liste permissions | ✅ |
| GET | `/permissions/{id}/` | Détails permission | ✅ |

---

## 📅 Accounting - Exercices Fiscaux

| Méthode | Endpoint | Description | Auth Required |
|---------|----------|-------------|---------------|
| GET | `/exercices/` | Liste exercices | ✅ |
| POST | `/exercices/` | Créer exercice | ✅ |
| GET | `/exercices/{id}/` | Détails exercice | ✅ |
| PUT | `/exercices/{id}/` | Modifier exercice | ✅ |
| DELETE | `/exercices/{id}/` | Supprimer exercice | ✅ |
| GET | `/exercices/active/` | Exercices actifs | ✅ |

**FiscalYear Object**:
```typescript
{
  id: string (UUID)
  company: string (UUID)
  code: string
  name: string
  start_date: string (YYYY-MM-DD)
  end_date: string (YYYY-MM-DD)
  is_closed: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}
```

---

## 📖 Accounting - Journaux

| Méthode | Endpoint | Description | Auth Required |
|---------|----------|-------------|---------------|
| GET | `/journaux/` | Liste journaux | ✅ |
| POST | `/journaux/` | Créer journal | ✅ |
| GET | `/journaux/{id}/` | Détails journal | ✅ |
| PUT | `/journaux/{id}/` | Modifier journal | ✅ |
| DELETE | `/journaux/{id}/` | Supprimer journal | ✅ |

**Journal Object**:
```typescript
{
  id: string (UUID)
  company: string (UUID)
  code: string
  name: string
  journal_type: string
  numbering_prefix: string
  is_active: boolean
  created_at: string
  updated_at: string
}
```

---

## 📊 Accounting - Plan Comptable

| Méthode | Endpoint | Description | Auth Required |
|---------|----------|-------------|---------------|
| GET | `/comptes/` | Liste comptes | ✅ |
| POST | `/comptes/` | Créer compte | ✅ |
| GET | `/comptes/{id}/` | Détails compte | ✅ |
| PUT | `/comptes/{id}/` | Modifier compte | ✅ |
| DELETE | `/comptes/{id}/` | Supprimer compte | ✅ |
| GET | `/comptes/by_class/` | Comptes par classe | ✅ |

**Query Parameters**:
- `account_class`: Filtrer par classe (1-8)
- `search`: Recherche par code ou nom
- `is_active`: Filtrer comptes actifs

**ChartOfAccounts Object**:
```typescript
{
  id: string (UUID)
  company: string (UUID)
  code: string
  name: string
  account_class: string ('1'-'8')
  account_type: 'TOTAL' | 'DETAIL'
  normal_balance: 'DEBIT' | 'CREDIT'
  is_reconcilable: boolean
  is_auxiliary: boolean
  is_active: boolean
  parent_account?: string (UUID)
  created_at: string
  updated_at: string
}
```

---

## 📝 Accounting - Écritures Comptables

| Méthode | Endpoint | Description | Auth Required |
|---------|----------|-------------|---------------|
| GET | `/ecritures/` | Liste écritures | ✅ |
| POST | `/ecritures/` | Créer écriture | ✅ |
| GET | `/ecritures/{id}/` | Détails écriture | ✅ |
| PUT | `/ecritures/{id}/` | Modifier écriture | ✅ |
| DELETE | `/ecritures/{id}/` | Supprimer écriture | ✅ |
| POST | `/ecritures/{id}/validate/` | Valider écriture | ✅ |
| GET | `/ecritures/stats/` | Statistiques | ✅ |

**JournalEntry Object**:
```typescript
{
  id: string (UUID)
  company: string (UUID)
  fiscal_year: string (UUID)
  journal: string (UUID)
  entry_number: string
  entry_date: string (YYYY-MM-DD)
  description: string
  reference?: string
  is_validated: boolean
  validated_at?: string
  validated_by?: string (UUID)
  lines: JournalEntryLine[]
  created_at: string
  updated_at: string
}
```

**JournalEntryLine Object**:
```typescript
{
  id: string (UUID)
  journal_entry: string (UUID)
  account: string (UUID)
  label: string
  debit: number (decimal)
  credit: number (decimal)
  third_party?: string (UUID)
  line_order: number
}
```

---

## 📋 Accounting - Lignes d'Écriture

| Méthode | Endpoint | Description | Auth Required |
|---------|----------|-------------|---------------|
| GET | `/lignes-ecriture/` | Liste lignes | ✅ |
| POST | `/lignes-ecriture/` | Créer ligne | ✅ |
| GET | `/lignes-ecriture/{id}/` | Détails ligne | ✅ |
| PUT | `/lignes-ecriture/{id}/` | Modifier ligne | ✅ |
| DELETE | `/lignes-ecriture/{id}/` | Supprimer ligne | ✅ |

---

## 👔 Third Party - Tiers

| Méthode | Endpoint | Description | Auth Required |
|---------|----------|-------------|---------------|
| GET | `/tiers/` | Liste tiers | ✅ |
| POST | `/tiers/` | Créer tiers | ✅ |
| GET | `/tiers/{id}/` | Détails tiers | ✅ |
| PUT | `/tiers/{id}/` | Modifier tiers | ✅ |
| DELETE | `/tiers/{id}/` | Supprimer tiers | ✅ |
| GET | `/tiers/clients/` | Clients uniquement | ✅ |
| GET | `/tiers/fournisseurs/` | Fournisseurs uniquement | ✅ |

**Query Parameters**:
- `type_tiers`: Filtrer par type (CLIENT, FOURNISSEUR, CLIENT_FOURNISSEUR)
- `statut`: Filtrer par statut (ACTIF, INACTIF, BLOQUE)
- `search`: Recherche par raison sociale, NIF, RCCM

**Tiers Object**:
```typescript
{
  id: string (UUID)
  societe: string (UUID)
  type_tiers: 'CLIENT' | 'FOURNISSEUR' | 'CLIENT_FOURNISSEUR'
  raison_sociale: string
  nif?: string
  rccm?: string
  code_tiers?: string
  email?: string
  telephone?: string
  statut: 'ACTIF' | 'INACTIF' | 'BLOQUE'
  date_creation: string
  created_at: string
  updated_at: string
}
```

---

## 📍 Third Party - Adresses

| Méthode | Endpoint | Description | Auth Required |
|---------|----------|-------------|---------------|
| GET | `/adresses-tiers/` | Liste adresses | ✅ |
| POST | `/adresses-tiers/` | Créer adresse | ✅ |
| GET | `/adresses-tiers/{id}/` | Détails adresse | ✅ |
| PUT | `/adresses-tiers/{id}/` | Modifier adresse | ✅ |
| DELETE | `/adresses-tiers/{id}/` | Supprimer adresse | ✅ |

**AdresseTiers Object**:
```typescript
{
  id: string (UUID)
  tiers: string (UUID)
  type_adresse: 'PRINCIPALE' | 'FACTURATION' | 'LIVRAISON' | 'AUTRE'
  adresse_ligne1: string
  adresse_ligne2?: string
  ville: string
  code_postal?: string
  pays: string
  est_principale: boolean
}
```

---

## 📞 Third Party - Contacts

| Méthode | Endpoint | Description | Auth Required |
|---------|----------|-------------|---------------|
| GET | `/contacts-tiers/` | Liste contacts | ✅ |
| POST | `/contacts-tiers/` | Créer contact | ✅ |
| GET | `/contacts-tiers/{id}/` | Détails contact | ✅ |
| PUT | `/contacts-tiers/{id}/` | Modifier contact | ✅ |
| DELETE | `/contacts-tiers/{id}/` | Supprimer contact | ✅ |

**ContactTiers Object**:
```typescript
{
  id: string (UUID)
  tiers: string (UUID)
  nom: string
  prenom?: string
  fonction?: string
  email?: string
  telephone?: string
  mobile?: string
  est_principal: boolean
}
```

---

## 🔍 Pagination & Filtrage

**Toutes les listes supportent**:
- `page`: Numéro de page (défaut: 1)
- `page_size`: Taille de page (défaut: 25, max: 100)
- `ordering`: Tri (ex: `-created_at` pour décroissant)
- `search`: Recherche globale

**Response Format**:
```json
{
  "count": 100,
  "next": "http://localhost:8000/api/v1/societes/?page=2",
  "previous": null,
  "results": [...]
}
```

---

## ⚠️ Gestion des Erreurs

**Status Codes**:
- `200`: Success
- `201`: Created
- `204`: No Content (DELETE success)
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (token missing/invalid)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `500`: Internal Server Error

**Error Response Format**:
```json
{
  "detail": "Error message",
  "errors": {
    "field_name": ["Error detail"]
  }
}
```

---

## 📌 Notes d'Implémentation

1. **Authentication**: Toutes les routes (sauf login/token) nécessitent un JWT token
2. **Authorization Header**: `Authorization: Bearer {access_token}`
3. **Content-Type**: `application/json`
4. **UUID**: Tous les IDs sont des UUID v4
5. **Dates**: Format ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ)
6. **Decimal**: Nombres décimaux en string pour précision

---

## 🚀 Exemples d'Utilisation

### Login
```javascript
const response = await fetch('http://localhost:8000/api/v1/auth/login/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@wisebook.cm',
    password: 'password'
  })
});
const { access, refresh, user } = await response.json();
```

### Récupérer les Sociétés
```javascript
const response = await fetch('http://localhost:8000/api/v1/societes/', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});
const { results } = await response.json();
```

### Créer une Écriture Comptable
```javascript
const response = await fetch('http://localhost:8000/api/v1/ecritures/', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    company: 'uuid-societe',
    fiscal_year: 'uuid-exercice',
    journal: 'uuid-journal',
    entry_date: '2025-01-15',
    description: 'Vente marchandise',
    lines: [
      {
        account: 'uuid-compte-411',
        label: 'Client ABC',
        debit: 10000,
        credit: 0
      },
      {
        account: 'uuid-compte-701',
        label: 'Vente marchandise',
        debit: 0,
        credit: 10000
      }
    ]
  })
});
```
