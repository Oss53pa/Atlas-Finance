# Plan de Restructuration WiseBook - Architecture en Composants

## 📊 Analyse de l'État Actuel

### Problèmes Identifiés

1. **Fichiers Monolithiques** : 170+ fichiers dépassent 500 lignes, certains atteignent 13 000 lignes
2. **Duplication de Code** : Logique métier répétée dans plusieurs pages
3. **Responsabilités Mélangées** : UI, logique métier et gestion d'état dans le même fichier
4. **Composants Non Réutilisables** : Code UI copié-collé au lieu d'être partagé
5. **Structure Incohérente** : Mélange de patterns entre pages et composants
6. **Fichiers de Backup** : Plusieurs versions (.backup, .old, .broken) qui polluent le projet

### Métriques Actuelles

- **Pages > 1000 lignes** : 19 fichiers
- **Pages > 2000 lignes** : 6 fichiers
- **Plus gros fichier** : RecouvrementModule.tsx (13 077 lignes)
- **Fichiers de backup** : ~30 fichiers .backup/.old/.broken à nettoyer

---

## 🎯 Objectifs de la Restructuration

1. **Séparation des Responsabilités** : Pages ≠ Logique ≠ UI
2. **Composants Réutilisables** : DRY (Don't Repeat Yourself)
3. **Maintenabilité** : Fichiers < 300 lignes idéalement
4. **Performance** : Lazy loading et code splitting
5. **Testabilité** : Isolation des composants et logique

---

## 📁 Nouvelle Architecture Proposée

```
frontend/src/
├── 📄 App.tsx                              # Point d'entrée principal
├── 📄 main.tsx                             # Bootstrap React
│
├── 📂 features/                            # Modules métier (Feature-First Architecture)
│   ├── 📂 accounting/                      # Module Comptabilité
│   │   ├── 📂 components/                  # Composants spécifiques comptabilité
│   │   │   ├── JournalEntryForm/
│   │   │   ├── BalanceSheet/
│   │   │   ├── GeneralLedger/
│   │   │   └── AccountingFilters/
│   │   ├── 📂 hooks/                       # Hooks métier comptabilité
│   │   │   ├── useJournalEntries.ts
│   │   │   ├── useBalance.ts
│   │   │   └── useAccountingPeriod.ts
│   │   ├── 📂 services/                    # API calls comptabilité
│   │   │   ├── journalService.ts
│   │   │   └── balanceService.ts
│   │   ├── 📂 types/                       # Types TypeScript
│   │   │   └── accounting.types.ts
│   │   ├── 📂 utils/                       # Utilitaires métier
│   │   │   ├── accountingCalculations.ts
│   │   │   └── accountingValidations.ts
│   │   └── 📂 pages/                       # Pages du module
│   │       ├── EntriesPage.tsx
│   │       ├── JournalsPage.tsx
│   │       └── ReportsPage.tsx
│   │
│   ├── 📂 treasury/                        # Module Trésorerie
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types/
│   │   ├── utils/
│   │   └── pages/
│   │
│   ├── 📂 assets/                          # Module Immobilisations
│   ├── 📂 budgeting/                       # Module Budget
│   ├── 📂 clients/                         # Module Clients (Tiers)
│   ├── 📂 suppliers/                       # Module Fournisseurs
│   ├── 📂 recovery/                        # Module Recouvrement
│   ├── 📂 reporting/                       # Module Reporting
│   ├── 📂 closures/                        # Module Clôtures
│   └── 📂 analytics/                       # Module Analytique
│
├── 📂 shared/                              # Composants UI partagés entre modules
│   ├── 📂 components/
│   │   ├── 📂 ui/                          # Composants UI de base
│   │   │   ├── Button/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Button.test.tsx
│   │   │   │   └── index.ts
│   │   │   ├── Card/
│   │   │   ├── Modal/
│   │   │   ├── Table/
│   │   │   ├── Form/
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Select.tsx
│   │   │   │   ├── DatePicker.tsx
│   │   │   │   └── FormField.tsx
│   │   │   ├── Badge/
│   │   │   ├── Alert/
│   │   │   ├── Tabs/
│   │   │   ├── Dropdown/
│   │   │   └── Loader/
│   │   │
│   │   ├── 📂 data-display/                # Affichage de données
│   │   │   ├── DataTable/
│   │   │   │   ├── DataTable.tsx
│   │   │   │   ├── useDataTable.ts
│   │   │   │   ├── TablePagination.tsx
│   │   │   │   ├── TableFilters.tsx
│   │   │   │   └── TableActions.tsx
│   │   │   ├── StatCard/
│   │   │   ├── MetricCard/
│   │   │   └── KPICard/
│   │   │
│   │   ├── 📂 charts/                      # Graphiques réutilisables
│   │   │   ├── BarChart/
│   │   │   ├── LineChart/
│   │   │   ├── PieChart/
│   │   │   ├── AreaChart/
│   │   │   ├── ChartContainer/
│   │   │   └── ChartLegend/
│   │   │
│   │   ├── 📂 layout/                      # Composants de layout
│   │   │   ├── AppLayout/
│   │   │   ├── PageHeader/
│   │   │   ├── Sidebar/
│   │   │   ├── Navbar/
│   │   │   └── PageContainer/
│   │   │
│   │   └── 📂 feedback/                    # Feedbacks utilisateur
│   │       ├── Toast/
│   │       ├── Notification/
│   │       ├── ConfirmDialog/
│   │       └── ErrorBoundary/
│   │
│   ├── 📂 hooks/                           # Hooks réutilisables
│   │   ├── useApi.ts                       # Hook générique pour API calls
│   │   ├── useDebounce.ts
│   │   ├── useLocalStorage.ts
│   │   ├── usePagination.ts
│   │   ├── useFilters.ts
│   │   ├── useSort.ts
│   │   ├── useModal.ts
│   │   └── usePermissions.ts
│   │
│   ├── 📂 utils/                           # Utilitaires globaux
│   │   ├── formatters/
│   │   │   ├── currency.ts
│   │   │   ├── date.ts
│   │   │   └── number.ts
│   │   ├── validators/
│   │   │   ├── formValidators.ts
│   │   │   └── businessRules.ts
│   │   ├── helpers/
│   │   │   ├── array.ts
│   │   │   ├── object.ts
│   │   │   └── string.ts
│   │   └── constants/
│   │       ├── routes.ts
│   │       ├── apiEndpoints.ts
│   │       └── businessConstants.ts
│   │
│   └── 📂 types/                           # Types globaux
│       ├── api.types.ts
│       ├── common.types.ts
│       └── utility.types.ts
│
├── 📂 core/                                # Fonctionnalités core de l'app
│   ├── 📂 auth/                            # Authentification
│   │   ├── components/
│   │   │   ├── LoginForm/
│   │   │   ├── ProtectedRoute/
│   │   │   └── PermissionGuard/
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   └── usePermissions.ts
│   │   ├── services/
│   │   │   └── authService.ts
│   │   └── pages/
│   │       ├── LoginPage.tsx
│   │       └── ForgotPasswordPage.tsx
│   │
│   ├── 📂 navigation/                      # Navigation
│   │   ├── AppRouter.tsx
│   │   ├── routes.config.ts
│   │   └── RouteGuards.tsx
│   │
│   ├── 📂 theme/                           # Système de thème
│   │   ├── ThemeProvider.tsx
│   │   ├── theme.config.ts
│   │   └── useTheme.ts
│   │
│   └── 📂 i18n/                            # Internationalisation
│       ├── i18n.config.ts
│       ├── useTranslation.ts
│       └── locales/
│
├── 📂 store/                               # State management (Redux/Zustand)
│   ├── index.ts
│   ├── 📂 slices/
│   │   ├── authSlice.ts
│   │   ├── uiSlice.ts
│   │   └── userSlice.ts
│   └── 📂 middleware/
│
├── 📂 api/                                 # Configuration API
│   ├── apiClient.ts                        # Axios/Fetch config
│   ├── interceptors.ts
│   └── endpoints.ts
│
├── 📂 config/                              # Configuration
│   ├── app.config.ts
│   ├── env.ts
│   └── feature-flags.ts
│
└── 📂 assets/                              # Assets statiques
    ├── images/
    ├── icons/
    └── fonts/
```

---

## 🔄 Pattern de Composant Standard

### Structure d'un Composant

```typescript
// DataTable/DataTable.tsx
import React from 'react';
import { DataTableProps } from './DataTable.types';
import { useDataTable } from './useDataTable';
import styles from './DataTable.module.css';

export const DataTable: React.FC<DataTableProps> = ({
  data,
  columns,
  onRowClick
}) => {
  const { sortedData, handleSort } = useDataTable(data);

  return (
    <div className={styles.container}>
      {/* JSX */}
    </div>
  );
};

// DataTable/DataTable.types.ts
export interface DataTableProps {
  data: any[];
  columns: Column[];
  onRowClick?: (row: any) => void;
}

// DataTable/useDataTable.ts
export const useDataTable = (data: any[]) => {
  // Logique isolée
  return { sortedData, handleSort };
};

// DataTable/index.ts
export { DataTable } from './DataTable';
export type { DataTableProps } from './DataTable.types';
```

---

## 📋 Conventions de Nommage

### Fichiers
- **Composants** : PascalCase → `DataTable.tsx`
- **Hooks** : camelCase avec "use" → `useDataTable.ts`
- **Types** : PascalCase avec ".types" → `DataTable.types.ts`
- **Services** : camelCase avec "Service" → `userService.ts`
- **Utils** : camelCase → `formatCurrency.ts`
- **Constants** : UPPER_SNAKE_CASE ou camelCase → `API_ENDPOINTS.ts`

### Composants
- **Composants UI** : Verbe ou Nom → `Button`, `Card`, `Modal`
- **Composants Métier** : Nom descriptif → `InvoiceList`, `ClientDetails`
- **Pages** : Nom + "Page" → `DashboardPage`, `InvoicesPage`
- **Layouts** : Nom + "Layout" → `AppLayout`, `AuthLayout`

### Hooks
- Toujours préfixer par "use" → `useAuth`, `useInvoices`
- Custom hooks dans le dossier du module ou shared/hooks

### Types
- Interfaces : PascalCase → `User`, `Invoice`
- Types d'union : PascalCase → `Status = 'active' | 'inactive'`
- Props : ComponentName + "Props" → `ButtonProps`

---

## 🎨 Principes de Refactoring

### 1. Extraction de Composants

**Avant** (Monolithique) :
```tsx
const LargePage = () => {
  return (
    <div>
      {/* 500 lignes de JSX avec formulaires, tables, modales... */}
    </div>
  );
};
```

**Après** (Composé) :
```tsx
const InvoicesPage = () => {
  return (
    <PageContainer>
      <PageHeader title="Factures" />
      <InvoiceFilters />
      <InvoiceTable />
      <InvoiceDetailsModal />
    </PageContainer>
  );
};
```

### 2. Extraction de Logique Métier

**Avant** :
```tsx
const Component = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch('/api/data')
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  // ...
};
```

**Après** :
```tsx
const Component = () => {
  const { data, loading, error } = useData();
  // ...
};

// hooks/useData.ts
export const useData = () => {
  // Logique isolée et testable
};
```

### 3. Centralisation des Services

**Avant** :
```tsx
// Dans chaque composant
fetch('/api/invoices');
```

**Après** :
```tsx
// services/invoiceService.ts
export const invoiceService = {
  getAll: () => apiClient.get('/invoices'),
  getById: (id) => apiClient.get(`/invoices/${id}`),
  create: (data) => apiClient.post('/invoices', data),
};
```

---

## 📦 Modules Prioritaires à Refactoriser

### Phase 1 - Urgent (Fichiers > 3000 lignes)
1. ✅ **RecouvrementModule** (13 077 lignes) → features/recovery/
2. ✅ **CompleteBudgetingModule** (5 713 lignes) → features/budgeting/
3. ✅ **AssetsRegistry** (5 256 lignes) → features/assets/
4. ✅ **AssetsListComplete** (3 948 lignes) → features/assets/
5. ✅ **AssetMasterDataModalContent** (3 045 lignes) → features/assets/

### Phase 2 - Important (Fichiers 1500-3000 lignes)
6. ClotureComptableFinal (2 262 lignes)
7. ClientDetailView (1 812 lignes)
8. FundCallDetails (1 693 lignes)

### Phase 3 - Composants Partagés
- Créer DataTable réutilisable
- Créer système de formulaires
- Créer composants de graphiques
- Créer composants de modales

---

## ✅ Checklist de Refactoring

Pour chaque module :

- [ ] Créer la structure features/[module]/
- [ ] Extraire les types dans types/
- [ ] Extraire les appels API dans services/
- [ ] Créer les hooks métier dans hooks/
- [ ] Décomposer en composants < 300 lignes
- [ ] Créer les tests unitaires
- [ ] Migrer les pages vers pages/
- [ ] Mettre à jour les imports
- [ ] Supprimer les fichiers backup
- [ ] Documenter les composants

---

## 🚀 Plan d'Exécution

### Étape 1 : Créer l'Infrastructure
1. Créer la structure de dossiers cible
2. Mettre en place les composants UI de base (shared/components/ui)
3. Créer les hooks réutilisables (shared/hooks)
4. Centraliser les utilitaires (shared/utils)

### Étape 2 : Refactoriser par Module
Pour chaque module (commencer par Recovery) :
1. Créer features/[module]/
2. Identifier les composants réutilisables
3. Extraire la logique métier
4. Décomposer la page principale
5. Créer les sous-composants
6. Tester et valider

### Étape 3 : Nettoyage
1. Supprimer les fichiers .backup/.old/.broken
2. Mettre à jour les imports absolus
3. Vérifier qu'il n'y a pas de code dupliqué
4. Optimiser les performances

### Étape 4 : Documentation
1. Documenter chaque composant majeur
2. Créer un guide de contribution
3. Documenter les patterns utilisés
4. Créer un Storybook des composants

---

## 📊 Métriques de Succès

### Objectifs Chiffrés
- ✅ Aucun fichier > 500 lignes (sauf exceptions documentées)
- ✅ 80%+ de couverture de tests
- ✅ Réduction de 50% du code dupliqué
- ✅ Temps de build réduit de 30%
- ✅ 0 fichier de backup dans src/

### Indicateurs Qualité
- Lisibilité : Fichiers compréhensibles en < 5 minutes
- Maintenabilité : Ajout de feature sans toucher à 10+ fichiers
- Réutilisabilité : 70%+ des composants UI réutilisés 3+ fois
- Performance : Lazy loading de tous les modules

---

## 🎯 Priorités Immédiates

1. **Créer shared/components/ui/** avec composants de base
2. **Refactoriser RecouvrementModule** (13k lignes → 20+ petits composants)
3. **Créer features/recovery/** avec nouvelle structure
4. **Extraire DataTable générique** (utilisé partout)
5. **Créer système de formulaires réutilisables**
