# 📖 GUIDE DE MIGRATION - Utilisation des Hooks React Query

Ce guide explique comment migrer les composants existants vers les nouveaux hooks React Query.

---

## 🎯 POURQUOI MIGRER ?

### Avant (ancien code)
```typescript
// ❌ Code verbeux, gestion manuelle du cache, erreurs non gérées
const [accounts, setAccounts] = useState([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

useEffect(() => {
  setLoading(true);
  fetch('/api/comptes-bancaires/')
    .then(res => res.json())
    .then(data => setAccounts(data.results))
    .catch(err => setError(err))
    .finally(() => setLoading(false));
}, []);
```

### Après (nouveaux hooks)
```typescript
// ✅ Code concis, caching automatique, gestion d'erreurs incluse
const { data: accounts, isLoading, error } = useBankAccounts();
```

### Avantages
- ✅ **Caching automatique** - Les données sont mises en cache intelligemment
- ✅ **Invalidation automatique** - Les mutations invalident le cache automatiquement
- ✅ **Loading states** - `isLoading`, `isFetching`, `isPending` inclus
- ✅ **Error handling** - Gestion d'erreurs automatique avec toasts
- ✅ **Type safety** - TypeScript complet de bout en bout
- ✅ **Optimistic updates** - Support natif des mises à jour optimistes
- ✅ **Retry logic** - Retry automatique en cas d'échec
- ✅ **Moins de code** - ~70% de code en moins

---

## 🚀 PATTERNS DE MIGRATION

### Pattern 1: Liste simple

#### Avant
```typescript
const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  treasuryService.getBankAccounts()
    .then(setData)
    .finally(() => setLoading(false));
}, []);
```

#### Après
```typescript
import { useBankAccounts } from '@/hooks';

const { data, isLoading } = useBankAccounts();
```

---

### Pattern 2: Liste avec pagination

#### Avant
```typescript
const [page, setPage] = useState(1);
const [data, setData] = useState(null);
const [loading, setLoading] = useState(false);

useEffect(() => {
  setLoading(true);
  treasuryService.getBankAccounts({ page, page_size: 20 })
    .then(setData)
    .finally(() => setLoading(false));
}, [page]);
```

#### Après
```typescript
import { useBankAccounts } from '@/hooks';

const [page, setPage] = useState(1);
const { data, isLoading } = useBankAccounts({ page, page_size: 20 });
// ✅ Le hook se rafraîchit automatiquement quand page change
```

---

### Pattern 3: Liste avec filtres

#### Avant
```typescript
const [filters, setFilters] = useState({ search: '', type: '' });
const [data, setData] = useState([]);

useEffect(() => {
  treasuryService.getBankAccounts(filters).then(setData);
}, [filters]);
```

#### Après
```typescript
import { useBankAccounts } from '@/hooks';

const [filters, setFilters] = useState({ search: '', type: '' });
const { data } = useBankAccounts({
  search: filters.search || undefined,
  type: filters.type || undefined,
});
// ✅ Rafraîchissement automatique sur changement de filtres
```

---

### Pattern 4: Détail d'un élément

#### Avant
```typescript
const [account, setAccount] = useState(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  if (accountId) {
    treasuryService.getBankAccount(accountId)
      .then(setAccount)
      .finally(() => setLoading(false));
  }
}, [accountId]);
```

#### Après
```typescript
import { useBankAccount } from '@/hooks';

const { data: account, isLoading } = useBankAccount(accountId);
// ✅ enabled automatique si accountId existe
```

---

### Pattern 5: Création (mutation)

#### Avant
```typescript
const [creating, setCreating] = useState(false);

const handleCreate = async (formData) => {
  setCreating(true);
  try {
    await treasuryService.createBankAccount(formData);
    toast.success('Créé avec succès');
    // Refetch manuel
    treasuryService.getBankAccounts().then(setData);
  } catch (error) {
    toast.error('Erreur');
  } finally {
    setCreating(false);
  }
};
```

#### Après
```typescript
import { useCreateBankAccount } from '@/hooks';

const createAccount = useCreateBankAccount();

const handleCreate = async (formData) => {
  try {
    await createAccount.mutateAsync(formData);
    // ✅ Toast automatique
    // ✅ Cache invalidé automatiquement
  } catch (error) {
    // ✅ Toast d'erreur automatique
  }
};

// Loading state disponible
{createAccount.isPending && <LoadingSpinner />}
```

---

### Pattern 6: Modification (mutation)

#### Avant
```typescript
const [updating, setUpdating] = useState(false);

const handleUpdate = async (id, data) => {
  setUpdating(true);
  try {
    await treasuryService.updateBankAccount(id, data);
    toast.success('Modifié');
    // Refetch manuel
    fetchData();
  } catch (error) {
    toast.error('Erreur');
  } finally {
    setUpdating(false);
  }
};
```

#### Après
```typescript
import { useUpdateBankAccount } from '@/hooks';

const updateAccount = useUpdateBankAccount();

const handleUpdate = async (id, data) => {
  await updateAccount.mutateAsync({ id, data });
  // ✅ Tout le reste est automatique
};
```

---

### Pattern 7: Suppression (mutation)

#### Avant
```typescript
const handleDelete = async (id) => {
  if (!confirm('Supprimer ?')) return;

  try {
    await treasuryService.deleteBankAccount(id);
    toast.success('Supprimé');
    setData(prev => prev.filter(item => item.id !== id));
  } catch (error) {
    toast.error('Erreur');
  }
};
```

#### Après
```typescript
import { useDeleteBankAccount } from '@/hooks';

const deleteAccount = useDeleteBankAccount();

const handleDelete = async (id) => {
  if (!confirm('Supprimer ?')) return;
  await deleteAccount.mutateAsync(id);
  // ✅ Toast + cache invalidation automatiques
};
```

---

### Pattern 8: Queries multiples

#### Avant
```typescript
const [accounts, setAccounts] = useState([]);
const [transactions, setTransactions] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  Promise.all([
    treasuryService.getBankAccounts(),
    treasuryService.getTransactions()
  ]).then(([acc, trans]) => {
    setAccounts(acc);
    setTransactions(trans);
    setLoading(false);
  });
}, []);
```

#### Après
```typescript
import { useBankAccounts, useBankTransactions } from '@/hooks';

const { data: accounts, isLoading: loadingAccounts } = useBankAccounts();
const { data: transactions, isLoading: loadingTrans } = useBankTransactions();

const isLoading = loadingAccounts || loadingTrans;
// ✅ Les deux queries s'exécutent en parallèle
```

---

### Pattern 9: Query dépendante

#### Avant
```typescript
const [account, setAccount] = useState(null);
const [transactions, setTransactions] = useState([]);

useEffect(() => {
  if (accountId) {
    treasuryService.getBankAccount(accountId).then(setAccount);
  }
}, [accountId]);

useEffect(() => {
  if (account) {
    treasuryService.getTransactionsByAccount(account.id).then(setTransactions);
  }
}, [account]);
```

#### Après
```typescript
import { useBankAccount, useTransactionsByAccount } from '@/hooks';

const { data: account } = useBankAccount(accountId);
const { data: transactions } = useTransactionsByAccount(
  account?.id || '',
  // ✅ enabled:  false tant que account n'existe pas
);
// La 2ème query attend automatiquement que la 1ère soit terminée
```

---

### Pattern 10: Query avec transformation de données

#### Avant
```typescript
const [accounts, setAccounts] = useState([]);
const [summary, setSummary] = useState(null);

useEffect(() => {
  treasuryService.getBankAccounts().then(data => {
    setAccounts(data);
    setSummary({
      total: data.length,
      totalBalance: data.reduce((sum, acc) => sum + acc.solde, 0)
    });
  });
}, []);
```

#### Après
```typescript
import { useBankAccounts } from '@/hooks';

const { data: accountsData } = useBankAccounts();

// ✅ Transformation dans le composant (memoized)
const summary = useMemo(() => ({
  total: accountsData?.results?.length || 0,
  totalBalance: accountsData?.results?.reduce((sum, acc) => sum + acc.solde, 0) || 0
}), [accountsData]);
```

---

## 📋 CHECKLIST DE MIGRATION

### Pour chaque composant:

- [ ] **Identifier les calls API**
  - Chercher `fetch`, `axios`, `treasuryService`, `accountingService`, etc.
  - Lister toutes les queries et mutations

- [ ] **Remplacer les queries**
  - Import des hooks correspondants depuis `@/hooks`
  - Remplacer `useState` + `useEffect` par le hook approprié
  - Supprimer les états `loading`, `error` redondants

- [ ] **Remplacer les mutations**
  - Import des hooks de mutation (`useCreate*`, `useUpdate*`, `useDelete*`)
  - Remplacer les fonctions manuelles
  - Supprimer les `setState` après mutations
  - Supprimer les refetch manuels

- [ ] **Nettoyer le code**
  - Supprimer les `useEffect` inutiles
  - Supprimer les états redondants
  - Supprimer les imports d'anciens services

- [ ] **Tester**
  - Vérifier le chargement initial
  - Tester les filtres et pagination
  - Tester les mutations (create/update/delete)
  - Vérifier que le cache se rafraîchit correctement

---

## 🎨 EXEMPLES PAR MODULE

### Comptabilité

```typescript
import {
  useChartOfAccounts,
  useAccountsByClass,
  useJournals,
  useAccountingEntries,
  useCreateAccountingEntry,
  useValidateEntry,
  useBalance,
} from '@/hooks';

// Liste des comptes
const { data: accounts } = useChartOfAccounts({ actif: true });

// Comptes par classe
const { data: class4Accounts } = useAccountsByClass('4');

// Journaux actifs
const { data: journals } = useActiveJournals();

// Écritures par journal
const { data: entries } = useEntriesByJournal(journalId);

// Créer une écriture
const createEntry = useCreateAccountingEntry();
await createEntry.mutateAsync(entryData);

// Valider une écriture
const validateEntry = useValidateEntry();
await validateEntry.mutateAsync(entryId);

// Balance
const { data: balance } = useBalance({
  exercice: fiscalYearId,
  date_debut: '2024-01-01',
  date_fin: '2024-12-31'
});
```

### Trésorerie

```typescript
import {
  useBankAccounts,
  useBankTransactions,
  useUnreconciledTransactions,
  useReconcileTransaction,
  useTreasuryPosition,
  useCashFlow,
} from '@/hooks';

// Comptes bancaires
const { data: accounts } = useBankAccounts();

// Transactions non rapprochées
const { data: unreconciled } = useUnreconciledTransactions(accountId);

// Rapprocher une transaction
const reconcile = useReconcileTransaction();
await reconcile.mutateAsync({ id: transactionId, ecritureId });

// Position de trésorerie
const { data: position } = useTreasuryPosition({ date: '2024-12-31' });

// Flux de trésorerie
const { data: cashFlow } = useCashFlow({
  date_debut: '2024-01-01',
  date_fin: '2024-12-31'
});
```

### Immobilisations

```typescript
import {
  useFixedAssets,
  useDepreciationPlan,
  usePutAssetInService,
  useDisposeAsset,
  useDepreciations,
  useAccountDepreciation,
  useAssetsTable,
} from '@/hooks';

// Immobilisations actives
const { data: assets } = useActiveFixedAssets();

// Plan d'amortissement
const { data: plan } = useDepreciationPlan(assetId);

// Mettre en service
const putInService = usePutAssetInService();
await putInService.mutateAsync({ id: assetId, dateMiseEnService: '2024-01-01' });

// Céder
const dispose = useDisposeAsset();
await dispose.mutateAsync({
  id: assetId,
  data: { date_cession: '2024-12-31', prix_cession: 10000 }
});

// Amortissements non comptabilisés
const { data: unaccounted } = useUnaccountedDepreciations();

// Comptabiliser
const account = useAccountDepreciation();
await account.mutateAsync(depreciationId);

// Tableau des immobilisations
const { data: table } = useAssetsTable({ exercice: fiscalYearId });
```

### Tiers

```typescript
import {
  useClients,
  useSuppliers,
  useThirdPartyBalance,
  useClientReceivables,
  useSupplierPayables,
  useContacts,
  useAgedReceivables,
} from '@/hooks';

// Clients
const { data: clients } = useClients();

// Fournisseurs
const { data: suppliers } = useSuppliers();

// Solde d'un tiers
const { data: balance } = useThirdPartyBalance(tiersId, '2024-01-01', '2024-12-31');

// Créances clients
const { data: receivables } = useClientReceivables(clientId);

// Dettes fournisseurs
const { data: payables } = useSupplierPayables(supplierId);

// Contacts
const { data: contacts } = useContactsByThirdParty(tiersId);

// Balance âgée
const { data: aged } = useAgedReceivables({ date: '2024-12-31' });
```

### Core

```typescript
import {
  useCompanies,
  useActiveFiscalYear,
  useCurrencies,
  useReferenceCurrency,
  useConvertCurrency,
} from '@/hooks';

// Sociétés actives
const { data: companies } = useActiveCompanies();

// Exercice actif
const { data: fiscalYear } = useActiveFiscalYear();

// Devises
const { data: currencies } = useActiveCurrencies();

// Devise de référence
const { data: refCurrency } = useReferenceCurrency();

// Conversion
const { data: converted } = useConvertCurrency({
  montant: 1000,
  devise_source: 'EUR',
  devise_cible: 'XOF'
});
```

### Budget & Analytique

```typescript
import {
  useBudgets,
  useActiveBudget,
  useBudgetControls,
  useBudgetOverruns,
  useCheckBudgetAvailability,
  useAnalyticalAxes,
  useCentersByAxis,
} from '@/hooks';

// Budget actif
const { data: budget } = useActiveBudget(fiscalYearId);

// Contrôles budgétaires
const { data: controls } = useBudgetControls(budgetId);

// Dépassements
const { data: overruns } = useBudgetOverruns(budgetId);

// Vérifier disponibilité
const { data: availability } = useCheckBudgetAvailability({
  budget: budgetId,
  compte: accountId,
  montant: 5000
});

// Axes analytiques
const { data: axes } = useActiveAnalyticalAxes();

// Centres par axe
const { data: centers } = useCentersByAxis(axisId);
```

### Fiscalité

```typescript
import {
  useTaxDeclarations,
  useOverdueTaxDeclarations,
  useUpcomingTaxDeclarations,
  useFiscalCalendar,
  useCalculateTaxDeclaration,
} from '@/hooks';

// Déclarations
const { data: declarations } = useTaxDeclarations();

// En retard
const { data: overdue } = useOverdueTaxDeclarations();

// À venir (30 jours)
const { data: upcoming } = useUpcomingTaxDeclarations(30);

// Calendrier fiscal
const { data: calendar } = useFiscalCalendar({ annee: 2024 });

// Calculer
const calculate = useCalculateTaxDeclaration();
await calculate.mutateAsync(declarationId);
```

---

## 🐛 DEBUGGING

### Voir les queries actives
```typescript
import { useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();
console.log(queryClient.getQueryCache().getAll());
```

### Invalider manuellement le cache
```typescript
import { invalidateQueries } from '@/lib/react-query';

// Invalider tout
invalidateQueries.accountingEntries();
invalidateQueries.bankAccounts();

// Ou avec queryClient
queryClient.invalidateQueries({ queryKey: ['bankAccounts'] });
```

### Forcer un refetch
```typescript
const { data, refetch } = useBankAccounts();

// Plus tard
refetch();
```

---

## 📚 RESSOURCES

- [React Query Docs](https://tanstack.com/query/latest/docs/react/overview)
- [Fichier d'intégration complète](./INTEGRATION_COMPLETE.md)
- [Page exemple](./src/pages/examples/BankAccountsExamplePage.tsx)

---

**Migration réussie = Moins de code + Plus de fonctionnalités + Meilleure UX !** 🎉