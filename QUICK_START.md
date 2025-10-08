# ⚡ Quick Start - Restructuration WiseBook

## 🚀 Démarrage Rapide en 5 Minutes

Ce guide vous permet de commencer à utiliser la nouvelle infrastructure en quelques minutes.

---

## 📖 Lecture Rapide (Choisir selon le besoin)

### Je veux juste coder rapidement
→ **Lire cette page** (5 min) + exemples ci-dessous

### Je veux comprendre l'architecture
→ Lire [RESTRUCTURATION_README.md](./RESTRUCTURATION_README.md) (15 min)

### Je veux tous les détails
→ Lire [RESTRUCTURATION_PLAN.md](./RESTRUCTURATION_PLAN.md) (30 min)

### Je veux des exemples de code
→ Lire [GUIDE_UTILISATION_COMPOSANTS.md](./GUIDE_UTILISATION_COMPOSANTS.md) (20 min)

---

## 🎯 Concepts Clés (2 minutes)

### 1. Structure Feature-First

```
features/
├── accounting/    # Tout ce qui concerne la comptabilité
├── treasury/      # Tout ce qui concerne la trésorerie
└── recovery/      # Tout ce qui concerne le recouvrement
```

**Règle** : Tout ce qui concerne une fonctionnalité au même endroit.

### 2. Composants Partagés

```
shared/
├── components/    # Composants UI réutilisables (DataTable, StatCard, etc.)
├── hooks/         # Hooks réutilisables (usePagination, useFilters, etc.)
└── utils/         # Utilitaires (formatCurrency, formatDate, etc.)
```

**Règle** : Si utilisé 2+ fois, mettre dans shared/.

### 3. Séparation des Responsabilités

- **Pages** : Orchestration (~50 lignes)
- **Composants** : UI pure (~200 lignes)
- **Hooks** : Logique métier
- **Services** : Appels API

---

## 📋 Exemples Pratiques (3 minutes)

### Exemple 1 : Créer un Tableau de Données

```typescript
import { DataTable, Column } from '@/shared/components/data-display/DataTable';

const MyPage = () => {
  const [data, setData] = useState([]);

  const columns: Column[] = [
    { key: 'name', header: 'Nom', sortable: true },
    { key: 'email', header: 'Email' },
    { key: 'status', header: 'Statut' },
  ];

  return (
    <DataTable
      data={data}
      columns={columns}
      onRowClick={(row) => console.log(row)}
    />
  );
};
```

**C'est tout !** Vous avez un tableau avec tri, pagination, sélection.

### Exemple 2 : Afficher des Statistiques

```typescript
import { StatCard } from '@/shared/components/data-display/StatCard';
import { DollarSign } from 'lucide-react';

const Dashboard = () => (
  <div className="grid grid-cols-3 gap-4">
    <StatCard
      title="Chiffre d'Affaires"
      value="45.2M FCFA"
      icon={DollarSign}
      trend={{ value: "+12%", isPositive: true }}
      color="primary"
    />
    {/* Autres cartes... */}
  </div>
);
```

### Exemple 3 : Filtrer et Paginer

```typescript
import { useFilters, usePagination } from '@/shared/hooks';

const MyComponent = () => {
  const { filteredData, setFilter } = useFilters({ data: rawData });

  const { currentPage, pageSize, goToPage, setPageSize } = usePagination({
    totalItems: filteredData.length,
  });

  return (
    <>
      <input
        onChange={(e) => setFilter('name', e.target.value, 'contains')}
        placeholder="Rechercher..."
      />
      <DataTable data={filteredData} columns={columns} />
    </>
  );
};
```

### Exemple 4 : Formater des Données

```typescript
import { formatCurrency, formatDate, formatPercent } from '@/shared/utils/formatters';

const Invoice = ({ amount, date, growth }) => (
  <div>
    <p>Montant: {formatCurrency(amount)}</p>
    <p>Date: {formatDate(date, 'medium')}</p>
    <p>Croissance: {formatPercent(growth)}</p>
  </div>
);
```

---

## 🎨 Imports Rapides (Copy-Paste)

### Composants
```typescript
import { DataTable, Column } from '@/shared/components/data-display/DataTable';
import { StatCard } from '@/shared/components/data-display/StatCard';
```

### Hooks
```typescript
import {
  usePagination,
  useFilters,
  useDebounce,
  useModal,
} from '@/shared/hooks';
```

### Formatters
```typescript
import {
  formatCurrency,
  formatCompactCurrency,
  formatDate,
  formatDateTime,
  formatRelativeTime,
  formatNumber,
  formatPercent,
  abbreviateNumber,
} from '@/shared/utils/formatters';
```

---

## 📐 Template de Page Type

```typescript
// features/invoices/pages/InvoicesPage.tsx
import React, { useState } from 'react';
import { DataTable, StatCard } from '@/shared/components/data-display';
import { useFilters, usePagination, useDebounce } from '@/shared/hooks';
import { formatCurrency } from '@/shared/utils/formatters';
import { DollarSign } from 'lucide-react';

// Hook métier (à créer)
import { useInvoices } from '../hooks/useInvoices';

// Configuration des colonnes (à créer)
import { invoiceColumns } from '../config/columns';

const InvoicesPage: React.FC = () => {
  // 1. Récupérer les données
  const { invoices, loading, refetch } = useInvoices();

  // 2. État local simple
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);

  // 3. Filtres
  const { filteredData, setFilter, clearFilters } = useFilters({
    data: invoices,
  });

  // 4. Pagination
  const pagination = usePagination({
    initialPageSize: 10,
    totalItems: filteredData.length,
  });

  // 5. Effets
  React.useEffect(() => {
    if (debouncedSearch) {
      setFilter('number', debouncedSearch, 'contains');
    }
  }, [debouncedSearch]);

  // 6. Calculer les stats
  const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);

  // 7. Rendu
  return (
    <div className="space-y-6 p-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="Total Factures"
          value={invoices.length}
          icon={DollarSign}
          color="primary"
        />
        <StatCard
          title="Montant Total"
          value={formatCurrency(totalAmount)}
          icon={DollarSign}
          color="success"
        />
      </div>

      {/* Filtres */}
      <div className="flex gap-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Rechercher..."
          className="px-4 py-2 border rounded"
        />
        {/* Autres filtres... */}
      </div>

      {/* Tableau */}
      <DataTable
        data={filteredData}
        columns={invoiceColumns}
        loading={loading}
        pagination={{
          currentPage: pagination.currentPage,
          pageSize: pagination.pageSize,
          totalItems: filteredData.length,
          onPageChange: pagination.goToPage,
          onPageSizeChange: pagination.setPageSize,
        }}
        onRowClick={(invoice) => console.log('Clicked:', invoice)}
      />
    </div>
  );
};

export default InvoicesPage;
```

**Taille** : ~70 lignes pour une page complète !

---

## 🛠️ Créer un Nouveau Module

### 1. Créer la Structure

```bash
mkdir -p features/mon-module/{components,hooks,services,types,utils,pages}
```

### 2. Créer le Hook Métier

```typescript
// features/mon-module/hooks/useMonModule.ts
import { useState, useEffect } from 'react';
import { monModuleService } from '../services/monModuleService';

export const useMonModule = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await monModuleService.getAll();
      setData(result);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { data, loading, error, refetch: fetchData };
};
```

### 3. Créer le Service

```typescript
// features/mon-module/services/monModuleService.ts
import { apiClient } from '@/api/apiClient';

export const monModuleService = {
  getAll: () => apiClient.get('/mon-module'),
  getById: (id: string) => apiClient.get(`/mon-module/${id}`),
  create: (data: any) => apiClient.post('/mon-module', data),
  update: (id: string, data: any) => apiClient.put(`/mon-module/${id}`, data),
  delete: (id: string) => apiClient.delete(`/mon-module/${id}`),
};
```

### 4. Créer la Page

Utiliser le template ci-dessus !

---

## ⚠️ À NE PAS FAIRE

### ❌ Logique métier dans les composants
```typescript
// MAUVAIS
const MyComponent = () => {
  const [data, setData] = useState([]);
  useEffect(() => {
    fetch('/api/data').then(/* ... */);
  }, []);
  // ... 500 lignes de logique
};
```

### ✅ Logique métier dans les hooks
```typescript
// BON
const MyComponent = () => {
  const { data, loading } = useMyData();
  return <div>{/* UI simple */}</div>;
};
```

### ❌ Tableaux custom
```typescript
// MAUVAIS - Ne pas recréer un tableau from scratch
<table>
  <thead>/* 100 lignes */</thead>
  <tbody>/* 200 lignes */</tbody>
</table>
```

### ✅ Utiliser DataTable
```typescript
// BON
<DataTable data={data} columns={columns} />
```

### ❌ Formatage inline
```typescript
// MAUVAIS
<td>{amount.toLocaleString()} FCFA</td>
```

### ✅ Utiliser les formatters
```typescript
// BON
<td>{formatCurrency(amount)}</td>
```

---

## 🎯 Checklist pour Nouvelle Page

- [ ] Créer le hook métier (`useMonModule`)
- [ ] Créer le service API (`monModuleService`)
- [ ] Définir les types (`types/monModule.types.ts`)
- [ ] Utiliser `DataTable` pour les listes
- [ ] Utiliser `StatCard` pour les stats
- [ ] Utiliser `usePagination` si besoin
- [ ] Utiliser `useFilters` si besoin
- [ ] Utiliser les formatters (`formatCurrency`, etc.)
- [ ] Garder la page < 100 lignes
- [ ] Extraire les sous-composants si > 200 lignes

---

## 📚 Pour Aller Plus Loin

### Comprendre l'Architecture
→ [RESTRUCTURATION_README.md](./RESTRUCTURATION_README.md)

### Voir Plus d'Exemples
→ [GUIDE_UTILISATION_COMPOSANTS.md](./GUIDE_UTILISATION_COMPOSANTS.md)

### Comprendre les Conventions
→ [CHANGEMENTS_RESTRUCTURATION.md](./CHANGEMENTS_RESTRUCTURATION.md)

### Voir le Plan Complet
→ [RESTRUCTURATION_PLAN.md](./RESTRUCTURATION_PLAN.md)

---

## 💡 Aide Rapide

### J'ai besoin d'afficher une liste
→ Utiliser `DataTable`

### J'ai besoin d'afficher des stats
→ Utiliser `StatCard`

### J'ai besoin de paginer
→ Utiliser `usePagination`

### J'ai besoin de filtrer
→ Utiliser `useFilters`

### J'ai besoin de formater une devise
→ Utiliser `formatCurrency`

### J'ai besoin de formater une date
→ Utiliser `formatDate`

### J'ai besoin d'une modale
→ Utiliser `useModal`

### J'ai une recherche en temps réel
→ Utiliser `useDebounce`

---

## 🎉 C'est Parti !

Vous êtes prêt à coder avec la nouvelle infrastructure !

**N'oubliez pas** :
1. Utiliser les composants shared
2. Extraire la logique dans des hooks
3. Garder les pages simples
4. Consulter la doc si besoin

**Bonne chance ! 🚀**