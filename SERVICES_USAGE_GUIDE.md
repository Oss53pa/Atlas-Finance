# 📘 Guide d'Utilisation des Services API WiseBook

## 🎯 Vue d'Ensemble

Ce guide explique comment utiliser les services API WiseBook Phase 1 dans votre application frontend React/TypeScript.

### Services Disponibles

- **Authentication** - Login, logout, gestion de profil
- **Core** - Sociétés, Devises
- **Accounting** - Exercices, Journaux, Plan comptable, Écritures
- **Third Party** - Tiers (clients/fournisseurs), Adresses, Contacts

---

## 🚀 Démarrage Rapide

### 1. Import des Services

```typescript
// Import individuel
import { authBackendService } from '@/services/backend-services.index';
import { societeService } from '@/services/backend-services.index';

// Import multiple
import {
  authBackendService,
  societeService,
  journalEntryService,
  tiersService
} from '@/services/backend-services.index';

// Import par défaut (tous les services)
import backendServices from '@/services/backend-services.index';
```

### 2. Configuration

Les services utilisent automatiquement la configuration d'environnement:

```env
VITE_API_URL=http://localhost:8000/api/v1
```

---

## 🔐 Authentication

### Login

```typescript
import { authBackendService } from '@/services/backend-services.index';

const handleLogin = async () => {
  try {
    const response = await authBackendService.login({
      email: 'admin@wisebook.cm',
      password: 'your_password'
    });

    // response contient:
    // {
    //   access: 'jwt_access_token',
    //   refresh: 'jwt_refresh_token',
    //   user: { id, email, first_name, last_name, ... }
    // }

    // Stocker les tokens (automatiquement géré par le store auth)
    localStorage.setItem('accessToken', response.access);
    localStorage.setItem('refreshToken', response.refresh);

  } catch (error) {
    console.error('Login failed:', error);
    // L'erreur est automatiquement affichée via toast
  }
};
```

### Logout

```typescript
const handleLogout = async () => {
  try {
    await authBackendService.logout();
    // Nettoyer le store auth
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  } catch (error) {
    console.error('Logout failed:', error);
  }
};
```

### Récupérer le Profil

```typescript
const loadUserProfile = async () => {
  try {
    const user = await authBackendService.getProfile();
    console.log('User profile:', user);
  } catch (error) {
    console.error('Failed to load profile:', error);
  }
};
```

### Changer le Mot de Passe

```typescript
const changePassword = async () => {
  try {
    await authBackendService.changePassword({
      old_password: 'oldpassword',
      new_password: 'newpassword',
      new_password_confirmation: 'newpassword'
    });
    toast.success('Mot de passe modifié avec succès');
  } catch (error) {
    console.error('Failed to change password:', error);
  }
};
```

---

## 🏢 Core - Sociétés

### Lister les Sociétés

```typescript
import { societeService } from '@/services/backend-services.index';

const loadSocietes = async () => {
  try {
    const response = await societeService.list({
      page: 1,
      page_size: 25,
      ordering: '-created_at'
    });

    // response contient:
    // {
    //   count: 100,
    //   next: 'url_to_next_page',
    //   previous: null,
    //   results: [...]
    // }

    console.log('Total sociétés:', response.count);
    console.log('Sociétés:', response.results);
  } catch (error) {
    console.error('Failed to load sociétés:', error);
  }
};
```

### Créer une Société

```typescript
const createSociete = async () => {
  try {
    const newSociete = await societeService.create({
      code: 'SOC001',
      nom: 'Ma Société SARL',
      description: 'Description de la société',
      email: 'contact@societe.cm',
      telephone: '+237 123 456 789',
      address: '123 Avenue de la Liberté, Douala'
    });

    console.log('Société créée:', newSociete);
    toast.success('Société créée avec succès');
  } catch (error) {
    console.error('Failed to create société:', error);
  }
};
```

### Modifier une Société

```typescript
// Modification complète
const updateSociete = async (id: string) => {
  try {
    const updated = await societeService.update(id, {
      code: 'SOC001',
      nom: 'Nouveau nom',
      email: 'newemail@societe.cm'
    });
    toast.success('Société mise à jour');
  } catch (error) {
    console.error('Failed to update:', error);
  }
};

// Modification partielle (PATCH)
const patchSociete = async (id: string) => {
  try {
    const updated = await societeService.patch(id, {
      email: 'newemail@societe.cm' // Seulement l'email
    });
    toast.success('Société mise à jour');
  } catch (error) {
    console.error('Failed to patch:', error);
  }
};
```

### Rechercher des Sociétés

```typescript
const searchSocietes = async (query: string) => {
  try {
    const response = await societeService.search(query, {
      page_size: 10
    });
    console.log('Résultats:', response.results);
  } catch (error) {
    console.error('Search failed:', error);
  }
};
```

---

## 💱 Core - Devises

### Lister les Devises

```typescript
import { deviseService } from '@/services/backend-services.index';

const loadDevises = async () => {
  try {
    const response = await deviseService.list();
    console.log('Devises:', response.results);
  } catch (error) {
    console.error('Failed to load devises:', error);
  }
};
```

### Devises Actives Uniquement

```typescript
const loadActiveDevises = async () => {
  try {
    const response = await deviseService.listActive();
    console.log('Devises actives:', response.results);
  } catch (error) {
    console.error('Failed to load active devises:', error);
  }
};
```

### Récupérer par Code ISO

```typescript
const getDeviseByCode = async (code: string) => {
  try {
    const devise = await deviseService.getByCode('XAF');
    console.log('Devise XAF:', devise);
  } catch (error) {
    console.error('Devise not found:', error);
  }
};
```

---

## 📊 Accounting - Exercices Fiscaux

### Lister les Exercices

```typescript
import { fiscalYearService } from '@/services/backend-services.index';

const loadFiscalYears = async () => {
  try {
    const response = await fiscalYearService.list();
    console.log('Exercices:', response.results);
  } catch (error) {
    console.error('Failed to load fiscal years:', error);
  }
};
```

### Exercices Actifs

```typescript
const loadActiveFiscalYears = async () => {
  try {
    const active = await fiscalYearService.listActive();
    console.log('Exercices actifs:', active);
  } catch (error) {
    console.error('Failed to load active fiscal years:', error);
  }
};
```

### Créer un Exercice

```typescript
const createFiscalYear = async (companyId: string) => {
  try {
    const newYear = await fiscalYearService.create({
      company: companyId,
      code: '2025',
      name: 'Exercice 2025',
      start_date: '2025-01-01',
      end_date: '2025-12-31',
      is_active: true
    });
    toast.success('Exercice créé');
  } catch (error) {
    console.error('Failed to create fiscal year:', error);
  }
};
```

### Clôturer un Exercice

```typescript
const closeFiscalYear = async (id: string) => {
  try {
    const closed = await fiscalYearService.close(id);
    toast.success('Exercice clôturé');
  } catch (error) {
    console.error('Failed to close fiscal year:', error);
  }
};
```

---

## 📖 Accounting - Journaux

### Lister les Journaux

```typescript
import { journalService } from '@/services/backend-services.index';

const loadJournaux = async () => {
  try {
    const response = await journalService.list();
    console.log('Journaux:', response.results);
  } catch (error) {
    console.error('Failed to load journals:', error);
  }
};
```

### Journaux Actifs

```typescript
const loadActiveJournaux = async () => {
  try {
    const response = await journalService.listActive();
    console.log('Journaux actifs:', response.results);
  } catch (error) {
    console.error('Failed to load active journals:', error);
  }
};
```

---

## 📊 Accounting - Plan Comptable

### Lister les Comptes

```typescript
import { chartOfAccountsService } from '@/services/backend-services.index';

const loadAccounts = async () => {
  try {
    const response = await chartOfAccountsService.list({
      page_size: 50,
      ordering: 'code'
    });
    console.log('Comptes:', response.results);
  } catch (error) {
    console.error('Failed to load accounts:', error);
  }
};
```

### Comptes par Classe SYSCOHADA

```typescript
const loadAccountsByClass = async (accountClass: '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8') => {
  try {
    const response = await chartOfAccountsService.listByClass(accountClass);
    console.log(`Comptes classe ${accountClass}:`, response.results);
  } catch (error) {
    console.error('Failed to load accounts by class:', error);
  }
};
```

### Rechercher des Comptes

```typescript
const searchAccounts = async (query: string) => {
  try {
    const response = await chartOfAccountsService.search(query);
    console.log('Résultats:', response.results);
  } catch (error) {
    console.error('Search failed:', error);
  }
};
```

### Comptes Lettrables

```typescript
const loadReconcilableAccounts = async () => {
  try {
    const response = await chartOfAccountsService.listReconcilable();
    console.log('Comptes lettrables:', response.results);
  } catch (error) {
    console.error('Failed to load reconcilable accounts:', error);
  }
};
```

---

## 📝 Accounting - Écritures Comptables

### Lister les Écritures

```typescript
import { journalEntryService } from '@/services/backend-services.index';

const loadJournalEntries = async () => {
  try {
    const response = await journalEntryService.list({
      page: 1,
      page_size: 25,
      ordering: '-entry_date'
    });
    console.log('Écritures:', response.results);
  } catch (error) {
    console.error('Failed to load entries:', error);
  }
};
```

### Créer une Écriture

```typescript
const createJournalEntry = async () => {
  try {
    const newEntry = await journalEntryService.create({
      company: 'company-uuid',
      fiscal_year: 'fiscal-year-uuid',
      journal: 'journal-uuid',
      entry_date: '2025-01-15',
      description: 'Vente marchandise',
      reference: 'FAC-001',
      lines: [
        {
          account: 'compte-411-uuid', // Client
          label: 'Vente client ABC',
          debit: 10000,
          credit: 0,
          line_order: 1
        },
        {
          account: 'compte-701-uuid', // Vente marchandise
          label: 'Vente marchandise',
          debit: 0,
          credit: 10000,
          line_order: 2
        }
      ]
    });

    console.log('Écriture créée:', newEntry);
    toast.success('Écriture créée avec succès');
  } catch (error) {
    console.error('Failed to create entry:', error);
  }
};
```

### Valider une Écriture

```typescript
const validateEntry = async (entryId: string) => {
  try {
    const result = await journalEntryService.validate(entryId);
    console.log('Écriture validée:', result);
    toast.success(result.message);
  } catch (error) {
    console.error('Failed to validate entry:', error);
  }
};
```

### Écritures Non Validées

```typescript
const loadPendingEntries = async () => {
  try {
    const response = await journalEntryService.listPending();
    console.log('Écritures en attente:', response.results);
  } catch (error) {
    console.error('Failed to load pending entries:', error);
  }
};
```

### Écritures par Période

```typescript
const loadEntriesByPeriod = async (startDate: string, endDate: string) => {
  try {
    const response = await journalEntryService.listByPeriod(startDate, endDate);
    console.log('Écritures de la période:', response.results);
  } catch (error) {
    console.error('Failed to load entries by period:', error);
  }
};
```

### Statistiques

```typescript
const loadStats = async () => {
  try {
    const stats = await journalEntryService.getStats();
    console.log('Statistiques:', stats);
    // stats contient: total_entries, validated_entries, pending_entries, etc.
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
};
```

---

## 👔 Third Party - Tiers

### Lister les Tiers

```typescript
import { tiersService } from '@/services/backend-services.index';

const loadTiers = async () => {
  try {
    const response = await tiersService.list({
      page: 1,
      page_size: 25
    });
    console.log('Tiers:', response.results);
  } catch (error) {
    console.error('Failed to load tiers:', error);
  }
};
```

### Clients Uniquement

```typescript
const loadClients = async () => {
  try {
    const clients = await tiersService.listClients();
    console.log('Clients:', clients);
  } catch (error) {
    console.error('Failed to load clients:', error);
  }
};
```

### Fournisseurs Uniquement

```typescript
const loadFournisseurs = async () => {
  try {
    const fournisseurs = await tiersService.listFournisseurs();
    console.log('Fournisseurs:', fournisseurs);
  } catch (error) {
    console.error('Failed to load fournisseurs:', error);
  }
};
```

### Créer un Tiers

```typescript
const createTiers = async () => {
  try {
    const newTiers = await tiersService.create({
      societe: 'societe-uuid',
      type_tiers: 'CLIENT',
      raison_sociale: 'SARL ABC',
      nif: '123456789',
      rccm: 'RC/DLA/2025/A/123',
      email: 'contact@abc.cm',
      telephone: '+237 123 456 789',
      statut: 'ACTIF',
      date_creation: '2025-01-01'
    });

    console.log('Tiers créé:', newTiers);
    toast.success('Tiers créé avec succès');
  } catch (error) {
    console.error('Failed to create tiers:', error);
  }
};
```

### Filtrer par Type

```typescript
const loadByType = async () => {
  try {
    const response = await tiersService.listByType('CLIENT');
    console.log('Clients:', response.results);
  } catch (error) {
    console.error('Failed to load by type:', error);
  }
};
```

### Bloquer/Débloquer un Tiers

```typescript
const blockTiers = async (id: string) => {
  try {
    await tiersService.block(id);
    toast.success('Tiers bloqué');
  } catch (error) {
    console.error('Failed to block tiers:', error);
  }
};

const unblockTiers = async (id: string) => {
  try {
    await tiersService.unblock(id);
    toast.success('Tiers débloqué');
  } catch (error) {
    console.error('Failed to unblock tiers:', error);
  }
};
```

---

## 📍 Third Party - Adresses

### Créer une Adresse

```typescript
import { adresseTiersService } from '@/services/backend-services.index';

const createAdresse = async (tiersId: string) => {
  try {
    const newAdresse = await adresseTiersService.create({
      tiers: tiersId,
      type_adresse: 'PRINCIPALE',
      adresse_ligne1: '123 Avenue de la République',
      adresse_ligne2: 'BP 1234',
      ville: 'Douala',
      code_postal: '2025',
      pays: 'Cameroun',
      est_principale: true
    });

    console.log('Adresse créée:', newAdresse);
    toast.success('Adresse ajoutée');
  } catch (error) {
    console.error('Failed to create address:', error);
  }
};
```

### Adresses d'un Tiers

```typescript
const loadAdressesByTiers = async (tiersId: string) => {
  try {
    const response = await adresseTiersService.listByTiers(tiersId);
    console.log('Adresses:', response.results);
  } catch (error) {
    console.error('Failed to load addresses:', error);
  }
};
```

---

## 📞 Third Party - Contacts

### Créer un Contact

```typescript
import { contactTiersService } from '@/services/backend-services.index';

const createContact = async (tiersId: string) => {
  try {
    const newContact = await contactTiersService.create({
      tiers: tiersId,
      nom: 'DUPONT',
      prenom: 'Jean',
      fonction: 'Directeur Général',
      email: 'jean.dupont@abc.cm',
      telephone: '+237 123 456 789',
      mobile: '+237 690 123 456',
      est_principal: true
    });

    console.log('Contact créé:', newContact);
    toast.success('Contact ajouté');
  } catch (error) {
    console.error('Failed to create contact:', error);
  }
};
```

---

## ⚙️ Fonctionnalités Avancées

### Retry Automatique

Le client API réessaye automatiquement les requêtes échouées (3 tentatives avec backoff exponentiel).

```typescript
// Les erreurs suivantes sont automatiquement réessayées:
// - 408 Request Timeout
// - 429 Too Many Requests
// - 500 Internal Server Error
// - 502 Bad Gateway
// - 503 Service Unavailable
// - 504 Gateway Timeout
```

### Logging

Tous les appels API sont automatiquement loggés en mode développement.

```typescript
import { enhancedApiClient } from '@/lib/enhanced-api-client';

// Voir les 20 derniers logs
const logs = enhancedApiClient.getRecentLogs(20);
console.log('API Logs:', logs);

// Effacer les logs
enhancedApiClient.clearLogs();

// Activer/désactiver le logging
enhancedApiClient.setLoggingEnabled(false);
```

### Gestion des Erreurs

Les erreurs sont automatiquement affichées via toast. Vous pouvez aussi les gérer manuellement:

```typescript
try {
  const data = await societeService.list();
} catch (error) {
  // error est normalisé avec le format ApiError
  console.error('Message:', error.message);
  console.error('Détails:', error.detail);
  console.error('Erreurs de validation:', error.errors);
}
```

### Annulation de Requêtes

```typescript
import { enhancedApiClient } from '@/lib/enhanced-api-client';

// Annuler toutes les requêtes en cours
enhancedApiClient.cancelAllRequests();

// Annuler une requête spécifique
enhancedApiClient.cancelRequest('request-id');
```

---

## 🔧 Configuration Personnalisée

### Changer l'URL de Base

```typescript
import { enhancedApiClient } from '@/lib/enhanced-api-client';

enhancedApiClient.setBaseURL('https://api.wisebook.cm/api/v1');
```

### Headers Personnalisés

```typescript
const data = await societeService.list({}, {
  headers: {
    'X-Custom-Header': 'value'
  }
});
```

---

## 📋 Bonnes Pratiques

### 1. Toujours gérer les erreurs

```typescript
try {
  const data = await societeService.list();
  // Traiter les données
} catch (error) {
  console.error('Erreur:', error);
  // Informer l'utilisateur
}
```

### 2. Utiliser la pagination

```typescript
const loadData = async (page: number = 1) => {
  const response = await societeService.list({
    page,
    page_size: 25
  });

  // Afficher les résultats
  console.log(`Page ${page}/${Math.ceil(response.count / 25)}`);
  return response;
};
```

### 3. Utiliser le tri

```typescript
const response = await societeService.list({
  ordering: '-created_at' // Décroissant
});

const response2 = await societeService.list({
  ordering: 'nom' // Croissant
});
```

### 4. Combiner les filtres

```typescript
const response = await tiersService.list({
  type_tiers: 'CLIENT',
  statut: 'ACTIF',
  search: 'SARL',
  page: 1,
  page_size: 50,
  ordering: 'raison_sociale'
});
```

---

## 🐛 Débogage

### Activer les logs détaillés

```typescript
import { enhancedApiClient } from '@/lib/enhanced-api-client';

enhancedApiClient.setLoggingEnabled(true);
```

### Inspecter les requêtes

```typescript
const logs = enhancedApiClient.getRecentLogs();
logs.forEach(log => {
  console.log(`${log.method} ${log.url} - ${log.status} (${log.duration}ms)`);
  if (log.error) {
    console.error('Erreur:', log.error);
  }
});
```

---

## 📚 Ressources

- [API Endpoints Documentation](./API_ENDPOINTS.md)
- [Types TypeScript](./src/types/backend.types.ts)
- [Backend Django Documentation](../BACKEND_FINAL_REPORT.md)

---

**Dernière mise à jour:** 2025-10-08
