# Guide d'Utilisation des Composants Réutilisables WiseBook

## 📚 Table des Matières

1. [DataTable](#datatable)
2. [StatCard](#statcard)
3. [Hooks Partagés](#hooks-partagés)
4. [Utilitaires de Formatage](#utilitaires-de-formatage)
5. [Exemples de Refactoring](#exemples-de-refactoring)

---

## DataTable

### Description
Composant de tableau de données puissant et réutilisable avec :
- Tri par colonnes
- Pagination
- Sélection multiple
- Actions personnalisées
- Responsive

### Import
```typescript
import { DataTable, Column } from '@/shared/components/data-display/DataTable';
```

### Exemple Basique
```typescript
import React from 'react';
import { DataTable, Column } from '@/shared/components/data-display/DataTable';
import { Eye, Edit, Trash } from 'lucide-react';

interface Invoice {
  id: string;
  number: string;
  client: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  date: string;
}

const InvoicesPage = () => {
  const [invoices, setInvoices] = React.useState<Invoice[]>([]);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  const columns: Column<Invoice>[] = [
    {
      key: 'number',
      header: 'N° Facture',
      sortable: true,
    },
    {
      key: 'client',
      header: 'Client',
      sortable: true,
    },
    {
      key: 'amount',
      header: 'Montant',
      sortable: true,
      render: (value) => `${value.toLocaleString()} FCFA`,
      align: 'right',
    },
    {
      key: 'status',
      header: 'Statut',
      render: (value) => (
        <span className={`
          px-2 py-1 rounded text-xs font-medium
          ${value === 'paid' ? 'bg-green-100 text-green-800' : ''}
          ${value === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
          ${value === 'overdue' ? 'bg-red-100 text-red-800' : ''}
        `}>
          {value === 'paid' ? 'Payée' : value === 'pending' ? 'En attente' : 'En retard'}
        </span>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      sortable: true,
    },
  ];

  return (
    <DataTable
      data={invoices}
      columns={columns}
      pagination={{
        currentPage,
        pageSize,
        totalItems: invoices.length,
        onPageChange: setCurrentPage,
        onPageSizeChange: setPageSize,
      }}
      onRowClick={(invoice) => console.log('Clicked:', invoice)}
      actions={(invoice) => (
        <>
          <button className="p-1 hover:bg-gray-100 rounded">
            <Eye className="h-4 w-4" />
          </button>
          <button className="p-1 hover:bg-gray-100 rounded">
            <Edit className="h-4 w-4" />
          </button>
          <button className="p-1 hover:bg-gray-100 rounded text-red-600">
            <Trash className="h-4 w-4" />
          </button>
        </>
      )}
      striped
      hoverable
    />
  );
};
```

### Avec Sélection Multiple
```typescript
const [selectedRows, setSelectedRows] = React.useState<Set<string>>(new Set());

<DataTable
  data={data}
  columns={columns}
  selectable
  selectedRows={selectedRows}
  onSelectionChange={setSelectedRows}
  getRowId={(row) => row.id}
/>
```

### Props Principales

| Prop | Type | Description |
|------|------|-------------|
| `data` | `T[]` | Données à afficher |
| `columns` | `Column<T>[]` | Configuration des colonnes |
| `loading` | `boolean` | État de chargement |
| `pagination` | `object` | Configuration de la pagination |
| `sorting` | `object` | Configuration du tri |
| `selectable` | `boolean` | Active la sélection multiple |
| `onRowClick` | `(row: T) => void` | Callback au clic sur une ligne |
| `actions` | `(row: T) => ReactNode` | Rendu des actions |

---

## StatCard

### Description
Carte de statistique avec icône, tendance et design uniforme.

### Import
```typescript
import { StatCard } from '@/shared/components/data-display/StatCard';
```

### Exemple
```typescript
import { DollarSign, TrendingUp, Users, ShoppingCart } from 'lucide-react';

const Dashboard = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Chiffre d'Affaires"
        value="45,2M FCFA"
        subtitle="Ce mois"
        icon={DollarSign}
        trend={{
          value: "+12.5%",
          isPositive: true,
          label: "vs mois dernier"
        }}
        color="primary"
      />

      <StatCard
        title="Nouveaux Clients"
        value="142"
        subtitle="Ce trimestre"
        icon={Users}
        trend={{
          value: "+8.2%",
          isPositive: true
        }}
        color="success"
      />

      <StatCard
        title="Commandes"
        value="1,834"
        icon={ShoppingCart}
        color="info"
      />

      <StatCard
        title="Taux de Conversion"
        value="23.5%"
        trend={{
          value: "-2.1%",
          isPositive: false
        }}
        color="warning"
      />
    </div>
  );
};
```

### Props

| Prop | Type | Description |
|------|------|-------------|
| `title` | `string` | Titre de la statistique |
| `value` | `string \| number` | Valeur principale |
| `subtitle` | `string` | Sous-titre optionnel |
| `icon` | `LucideIcon` | Icône Lucide |
| `trend` | `object` | Données de tendance |
| `color` | `'primary' \| 'secondary' \| 'success' \| 'warning' \| 'error' \| 'info'` | Couleur du thème |
| `loading` | `boolean` | État de chargement |
| `onClick` | `() => void` | Callback au clic |

---

## Hooks Partagés

### usePagination

Gère la pagination des données côté client.

```typescript
import { usePagination } from '@/shared/hooks';

const MyComponent = () => {
  const {
    currentPage,
    pageSize,
    totalPages,
    goToPage,
    nextPage,
    previousPage,
    setPageSize,
    paginateData,
  } = usePagination({
    initialPage: 1,
    initialPageSize: 10,
    totalItems: data.length,
  });

  const displayData = paginateData(data);

  return (
    // ...
  );
};
```

### useFilters

Filtre des données selon plusieurs critères.

```typescript
import { useFilters } from '@/shared/hooks';

const MyComponent = () => {
  const {
    filteredData,
    filters,
    setFilter,
    removeFilter,
    clearFilters,
    hasFilters,
  } = useFilters({
    data: originalData,
  });

  return (
    <div>
      <input
        type="text"
        onChange={(e) => setFilter('name', e.target.value, 'contains')}
        placeholder="Rechercher par nom..."
      />

      <select onChange={(e) => setFilter('status', e.target.value, 'equals')}>
        <option value="">Tous les statuts</option>
        <option value="active">Actif</option>
        <option value="inactive">Inactif</option>
      </select>

      {hasFilters && (
        <button onClick={clearFilters}>Réinitialiser les filtres</button>
      )}

      {/* Afficher filteredData */}
    </div>
  );
};
```

### useDebounce

Retarde l'exécution d'une valeur (utile pour les recherches).

```typescript
import { useDebounce } from '@/shared/hooks';

const SearchComponent = () => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  React.useEffect(() => {
    // N'est appelé que 500ms après que l'utilisateur arrête de taper
    if (debouncedSearchTerm) {
      fetchSearchResults(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm]);

  return (
    <input
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      placeholder="Rechercher..."
    />
  );
};
```

### useModal

Gère l'état d'ouverture/fermeture d'une modale.

```typescript
import { useModal } from '@/shared/hooks';

const MyComponent = () => {
  const modal = useModal();

  return (
    <div>
      <button onClick={modal.open}>Ouvrir la modale</button>

      {modal.isOpen && (
        <div className="modal">
          {/* Contenu de la modale */}
          <button onClick={modal.close}>Fermer</button>
        </div>
      )}
    </div>
  );
};
```

---

## Utilitaires de Formatage

### Devises

```typescript
import { formatCurrency, formatCompactCurrency, parseCurrency } from '@/shared/utils/formatters';

formatCurrency(1500000); // "1 500 000 FCFA"
formatCurrency(1500000, 'EUR'); // "1 500 000,00 €"

formatCompactCurrency(1500000); // "1.5M FCFA"
formatCompactCurrency(45000000000); // "45.0Mrd FCFA"

parseCurrency("1 500 000 FCFA"); // 1500000
```

### Dates

```typescript
import {
  formatDate,
  formatDateTime,
  formatRelativeTime,
  getDaysBetween,
  isOverdue,
} from '@/shared/utils/formatters';

formatDate('2024-03-15', 'short'); // "15/03/2024"
formatDate('2024-03-15', 'medium'); // "15 mars 2024"
formatDate('2024-03-15', 'long'); // "15 mars 2024"
formatDate('2024-03-15', 'full'); // "vendredi 15 mars 2024"

formatDateTime('2024-03-15T14:30:00'); // "15 mars 2024, 14:30"

formatRelativeTime('2024-03-15T14:00:00'); // "il y a 2 heures"

getDaysBetween('2024-03-01', '2024-03-15'); // 14

isOverdue('2024-03-01'); // true si la date est passée
```

### Nombres

```typescript
import {
  formatNumber,
  formatPercent,
  formatPercentage,
  abbreviateNumber,
} from '@/shared/utils/formatters';

formatNumber(1234567.89); // "1 234 568"
formatNumber(1234567.89, 2); // "1 234 567,89"

formatPercent(12.5); // "12,5%"
formatPercent(12.567, 2); // "12,57%"

formatPercentage(25, 100); // "25.0%"

abbreviateNumber(1500); // "1.5k"
abbreviateNumber(1500000); // "1.5M"
abbreviateNumber(1500000000); // "1.5Mrd"
```

---

## Exemples de Refactoring

### Avant : Page Monolithique (500+ lignes)

```typescript
// pages/InvoicesPage.tsx (ANCIEN - À ÉVITER)
const InvoicesPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortColumn, setSortColumn] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/invoices');
      const data = await response.json();
      setInvoices(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices
    .filter(inv =>
      inv.number.includes(searchTerm) ||
      inv.client.includes(searchTerm)
    )
    .filter(inv => filterStatus === 'all' || inv.status === filterStatus)
    .sort((a, b) => {
      // Logique de tri complexe...
    });

  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div>
      {/* 400+ lignes de JSX avec formulaires, tableaux, modales... */}
    </div>
  );
};
```

### Après : Page Modulaire et Composée

```typescript
// features/invoices/pages/InvoicesPage.tsx (NOUVEAU - RECOMMANDÉ)
import { DataTable, StatCard } from '@/shared/components/data-display';
import { useFilters, usePagination, useDebounce } from '@/shared/hooks';
import { formatCurrency, formatDate } from '@/shared/utils/formatters';
import { useInvoices } from '../hooks/useInvoices';
import { InvoiceFilters } from '../components/InvoiceFilters';
import { InvoiceActions } from '../components/InvoiceActions';
import { InvoiceStats } from '../components/InvoiceStats';
import { invoiceColumns } from '../config/columns';

const InvoicesPage = () => {
  const { invoices, loading, refetch } = useInvoices();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);

  const { filteredData, setFilter, clearFilters } = useFilters({
    data: invoices,
  });

  const {
    currentPage,
    pageSize,
    goToPage,
    setPageSize,
  } = usePagination({
    initialPageSize: 10,
    totalItems: filteredData.length,
  });

  useEffect(() => {
    if (debouncedSearch) {
      setFilter('client', debouncedSearch, 'contains');
    }
  }, [debouncedSearch]);

  return (
    <div className="space-y-6">
      <InvoiceStats data={invoices} />

      <InvoiceFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onFilterChange={setFilter}
        onClearFilters={clearFilters}
      />

      <DataTable
        data={filteredData}
        columns={invoiceColumns}
        loading={loading}
        pagination={{
          currentPage,
          pageSize,
          totalItems: filteredData.length,
          onPageChange: goToPage,
          onPageSizeChange: setPageSize,
        }}
        actions={(invoice) => <InvoiceActions invoice={invoice} onUpdate={refetch} />}
      />
    </div>
  );
};
```

#### Bénéfices du Refactoring :

✅ **Page principale** : ~50 lignes au lieu de 500+
✅ **Logique réutilisable** : Hooks partagés (filtres, pagination)
✅ **Composants modulaires** : InvoiceFilters, InvoiceActions, InvoiceStats
✅ **Testabilité** : Chaque composant peut être testé individuellement
✅ **Maintenabilité** : Modification d'une fonctionnalité = 1 seul fichier
✅ **Lisibilité** : Code auto-documenté et facile à comprendre

---

## Structure du Code Refactorisé

```
features/invoices/
├── components/
│   ├── InvoiceFilters.tsx       # Composant de filtres
│   ├── InvoiceActions.tsx       # Actions sur une facture
│   ├── InvoiceStats.tsx         # Statistiques
│   └── InvoiceDetailsModal.tsx  # Modale de détails
├── hooks/
│   └── useInvoices.ts           # Hook métier pour gérer les factures
├── services/
│   └── invoiceService.ts        # Appels API
├── types/
│   └── invoice.types.ts         # Types TypeScript
├── config/
│   └── columns.ts               # Configuration des colonnes du tableau
└── pages/
    ├── InvoicesPage.tsx         # Page principale (50 lignes)
    └── InvoiceDetailPage.tsx    # Page de détail
```

---

## Checklist de Migration

Lors de la refactorisation d'une page :

- [ ] Identifier les composants UI réutilisables
- [ ] Extraire la logique métier dans des hooks
- [ ] Centraliser les appels API dans des services
- [ ] Créer les types TypeScript
- [ ] Remplacer les tableaux custom par DataTable
- [ ] Utiliser les formatters pour les devises/dates
- [ ] Utiliser les hooks partagés (pagination, filtres, modal)
- [ ] Décomposer la page en sous-composants < 200 lignes
- [ ] Tester les composants individuellement
- [ ] Supprimer le code dupliqué

---

## Convention de Nommage

### Composants
- `PascalCase` : `InvoiceList`, `ClientDetails`
- Préfixe du module : `Invoice...`, `Client...`, `Treasury...`

### Hooks
- `camelCase` avec préfixe `use` : `useInvoices`, `useFilters`

### Services
- `camelCase` avec suffixe `Service` : `invoiceService`, `clientService`

### Types
- `PascalCase` : `Invoice`, `Client`, `User`
- Interfaces de props : `ComponentNameProps`

### Fichiers
- Composants : `ComponentName.tsx`
- Hooks : `useHookName.ts`
- Services : `serviceName.ts`
- Types : `module.types.ts`

---

## Support et Questions

Pour toute question sur l'utilisation des composants réutilisables :
1. Consulter ce guide
2. Consulter les exemples dans `frontend/src/shared/`
3. Consulter le plan de restructuration : `RESTRUCTURATION_PLAN.md`