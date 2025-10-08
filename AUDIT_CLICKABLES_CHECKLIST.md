# ✅ Checklist - Corrections des Éléments Cliquables

**Audit du:** 2025-10-05 | **Total Red Flags:** 241

---

## 🔴 SPRINT 1 - ACCESSIBILITÉ CRITIQUE (1 semaine)

### 📋 Éléments Non Accessibles au Clavier (120 à corriger)

#### Fichier: `pages\financial\BilanSYSCOHADAPage.tsx` (12 occurrences)

- [ ] **Ligne 493** - `<td onClick>` → Ajouter `role="button"`, `tabIndex={0}`, `onKeyDown`
- [ ] **Ligne 500** - `<td onClick>` → Ajouter `role="button"`, `tabIndex={0}`, `onKeyDown`
- [ ] **Ligne 531** - `<td onClick>` → Ajouter `role="button"`, `tabIndex={0}`, `onKeyDown`
- [ ] **Ligne 538** - `<td onClick>` → Ajouter `role="button"`, `tabIndex={0}`, `onKeyDown`
- [ ] **Ligne 594** - `<td onClick>` → Ajouter `role="button"`, `tabIndex={0}`, `onKeyDown`
- [ ] **Ligne 601** - `<td onClick>` → Ajouter `role="button"`, `tabIndex={0}`, `onKeyDown`
- [ ] **Ligne 632** - `<td onClick>` → Ajouter `role="button"`, `tabIndex={0}`, `onKeyDown`
- [ ] **Ligne 639** - `<td onClick>` → Ajouter `role="button"`, `tabIndex={0}`, `onKeyDown`
- [ ] **Ligne 787** - `<div onClick>` → Ajouter `role="button"`, `tabIndex={0}`, `onKeyDown`
- [ ] **Ligne 821** - `<div onClick>` → Ajouter `role="button"`, `tabIndex={0}`, `onKeyDown`
- [ ] **Ligne 1003** - `<td onClick>` → Ajouter `role="button"`, `tabIndex={0}`, `onKeyDown`
- [ ] **Ligne 1050** - `<td onClick>` → Ajouter `role="button"`, `tabIndex={0}`, `onKeyDown`

#### Fichier: `pages\financial\CompteResultatPage.tsx` (6 occurrences)

- [ ] **Ligne 404** - `<td onClick>` → Ajouter accessibilité
- [ ] **Ligne 486** - `<td onClick>` → Ajouter accessibilité
- [ ] **Ligne 676** - `<td onClick>` → Ajouter accessibilité
- [ ] **Ligne 685** - `<td onClick>` → Ajouter accessibilité
- [ ] **Ligne 745** - `<td onClick>` → Ajouter accessibilité
- [ ] **Ligne 754** - `<td onClick>` → Ajouter accessibilité

#### Fichier: `pages\financial\BilanSYSCOHADAPageV2.tsx` (4 occurrences)

- [ ] **Ligne 499** - `<td onClick>` → Ajouter accessibilité
- [ ] **Ligne 546** - `<td onClick>` → Ajouter accessibilité
- [ ] **Ligne 624** - `<td onClick>` → Ajouter accessibilité
- [ ] **Ligne 671** - `<td onClick>` → Ajouter accessibilité

#### Fichier: `pages\DashboardPage.tsx`

- [ ] **Ligne 176** - `<div onClick>` → Ajouter accessibilité

#### Fichier: `pages\ExecutiveDashboardV2.tsx`

- [ ] **Ligne 177** - `<div onClick>` → Ajouter accessibilité

#### Fichier: `shared\components\data-display\DataTable\DataTable.tsx`

- [ ] **Ligne 167** - `<tr onClick>` → Ajouter accessibilité

#### Fichier: `shared\components\data-display\StatCard\StatCard.tsx`

- [ ] **Ligne 79** - `<div onClick>` → Ajouter accessibilité

#### Fichier: `pages\accounting\AccountingDashboardV2.tsx`

- [ ] **Ligne 187** - `<div onClick>` → Ajouter accessibilité

#### Fichier: `pages\accounting\ChartOfAccountsAdvancedPage.tsx`

- [ ] **Ligne 727** - `<div onClick>` → Ajouter accessibilité

#### Fichier: `pages\accounting\GrandLivreAdvancedPage.tsx`

- [ ] **Ligne 316** - `<tr onClick>` → Ajouter accessibilité

#### Fichier: `pages\accounting\OCRInvoices.tsx`

- [ ] **Ligne 733** - `<div onClick>` → Ajouter accessibilité

#### Fichier: `pages\assets\AssetFormsComparison.tsx`

- [ ] **Ligne 72** - `<div onClick>` → Ajouter accessibilité

#### Fichier: `pages\assets\AssetsClasses.tsx`

- [ ] **Ligne 375** - `<tr onClick>` → Ajouter accessibilité

#### Fichier: `pages\assets\AssetsListComplete.tsx`

- [ ] **Ligne 683** - `<tr onClick>` → Ajouter accessibilité

#### Fichier: `pages\assets\AssetsTransactions.tsx`

- [ ] **Ligne 545** - `<tr onClick>` → Ajouter accessibilité

#### Fichier: `pages\closures\ClotureAnnuelle.tsx`

- [ ] **Ligne 368** - `<div onClick>` → Ajouter accessibilité

#### Fichier: `pages\closures\RevisionsModule.tsx`

- [ ] **Ligne 355** - `<tr onClick>` → Ajouter accessibilité

#### Fichier: `pages\core\MultiCompanyPage.tsx`

- [ ] **Ligne 291** - `<div onClick>` → Ajouter accessibilité

**... (95 autres éléments listés dans le rapport détaillé)**

### 🔧 Template de Correction

```tsx
// ❌ AVANT
<div
  onClick={handleClick}
  className="cursor-pointer hover:bg-gray-100"
>
  Cliquez ici
</div>

// ✅ APRÈS
<div
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }}
  role="button"
  tabIndex={0}
  aria-label="Description claire de l'action"
  className="cursor-pointer hover:bg-gray-100"
>
  Cliquez ici
</div>
```

### ✅ Tests à Effectuer

- [ ] Navigation au clavier (Tab) fonctionne sur tous les éléments
- [ ] Touche Enter active l'action
- [ ] Touche Espace active l'action (pour les divs)
- [ ] Focus visible (outline) sur tous les éléments
- [ ] Lecteur d'écran annonce correctement l'élément

---

## 🔴 SPRINT 2 - ACTIONS MIXTES & LABELS (1 semaine)

### 🔄 Actions Mixtes Toast + Modal (10 à corriger)

#### Fichier: `pages\assets\InventairePhysiquePage.tsx`

- [ ] **Ligne 1549** - Bouton "Créer la session"
  ```tsx
  // ❌ AVANT
  onClick={() => {
    toast.success('Session d\'inventaire créée avec succès');
    setShowNewSessionModal(false);
  }}

  // ✅ APRÈS
  onClick={() => {
    setShowNewSessionModal(false);
    setTimeout(() => {
      toast.success('Session d\'inventaire créée avec succès');
    }, 150);
  }}
  ```

- [ ] **Ligne 1737** - Bouton "Enregistrer les modifications"
  ```tsx
  // ❌ AVANT
  onClick={() => {
    toast.success('Immobilisation modifiée avec succès');
    setShowEditItemModal(false);
  }}

  // ✅ APRÈS
  onClick={() => {
    setShowEditItemModal(false);
    setTimeout(() => {
      toast.success('Immobilisation modifiée avec succès');
    }, 150);
  }}
  ```

#### Fichier: `pages\config\ImportExportPage.tsx`

- [ ] **Ligne 1176** - Bouton "Créer le modèle"
  ```tsx
  // Appliquer le même pattern
  ```

#### Fichier: `pages\config\ThirdPartyCodeConfigPage.tsx`

- [ ] **Ligne ?** - Identifier et corriger l'action mixte

#### Fichier: `pages\taxation\TaxCalculationsPage.tsx`

- [ ] **Ligne ?** - Identifier et corriger l'action mixte

#### Fichier: `pages\tiers\CollaborationModuleV2.tsx` (2 occurrences)

- [ ] **Occurrence 1** - Corriger action mixte
- [ ] **Occurrence 2** - Corriger action mixte

#### Fichier: `pages\tiers\CustomersPageV2.tsx`

- [ ] **Ligne ?** - Corriger action mixte

#### Fichier: `pages\tiers\SuppliersModuleV2.tsx` (2 occurrences)

- [ ] **Occurrence 1** - Corriger action mixte
- [ ] **Occurrence 2** - Corriger action mixte

### 🏷️ Aria-Labels Manquants (≈100 à ajouter)

#### Boutons avec Icônes Seules

- [ ] Tous les boutons `<X>` → `aria-label="Fermer"`
- [ ] Tous les boutons `<Menu>` → `aria-label="Ouvrir le menu"`
- [ ] Tous les boutons `<Edit>` → `aria-label="Modifier"`
- [ ] Tous les boutons `<Trash>` → `aria-label="Supprimer"`
- [ ] Tous les boutons `<Download>` → `aria-label="Télécharger"`
- [ ] Tous les boutons `<Upload>` → `aria-label="Importer"`
- [ ] Tous les boutons `<Search>` → `aria-label="Rechercher"`
- [ ] Tous les boutons `<Bell>` → `aria-label="Notifications"`
- [ ] Tous les boutons `<User>` → `aria-label="Profil utilisateur"`
- [ ] Tous les boutons `<Settings>` → `aria-label="Paramètres"`

### 🎣 Créer Hook useModal Standard

- [ ] Créer fichier `hooks/useModal.ts`
- [ ] Implémenter logique open/close avec feedback
- [ ] Ajouter support toast différé
- [ ] Documenter avec JSDoc
- [ ] Créer tests unitaires
- [ ] Migrer 10 premiers usages

```tsx
// hooks/useModal.ts
export const useModal = (onSuccess?: (message: string) => void) => {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeModal = useCallback((successMessage?: string) => {
    setIsOpen(false);
    if (successMessage && onSuccess) {
      setTimeout(() => {
        onSuccess(successMessage);
      }, 150);
    }
  }, [onSuccess]);

  return { isOpen, openModal, closeModal };
};
```

---

## 🟡 SPRINT 3 - HANDLERS COMPLEXES (2 semaines)

### 📝 Handlers Inline à Refactoriser (110 total, 50 prioritaires)

#### Fichier: `pages\AllEntryModals.tsx`

- [ ] **Ligne 123** - Handler 293 chars → Extraire en `handleModalOpen`
  ```tsx
  // ❌ AVANT (293 chars)
  onClick={() => {
    if (modal.id === 'journal-entry') setShowJournalEntry(true);
    else if (modal.id === 'intelligent-form') setShowIntelligentForm(true);
    else if (modal.id === 'ocr') setShowOCR(true);
    // ...
  }}

  // ✅ APRÈS
  const handleModalOpen = useCallback(() => {
    switch (modal.id) {
      case 'journal-entry':
        setShowJournalEntry(true);
        break;
      case 'intelligent-form':
        setShowIntelligentForm(true);
        break;
      case 'ocr':
        setShowOCR(true);
        break;
      default:
        break;
    }
  }, [modal.id]);

  <button onClick={handleModalOpen}>
  ```

#### Fichier: `pages\accounting\EntriesPage.tsx`

- [ ] **Ligne 502** - Handler 409 chars → Extraire fonction nommée
- [ ] **Ligne 518** - Handler 409 chars → Extraire fonction nommée
- [ ] **Ligne ?** - 13 autres handlers à refactoriser

#### Fichier: `pages\config\ImportExportPage.tsx`

- [ ] **Ligne ?** - 7 handlers complexes à extraire

#### Fichier: `pages\tiers\RecouvrementModule.tsx`

- [ ] **Ligne ?** - 10+ handlers complexes dans ce fichier monstre

### 📚 Documentation JSDoc

Pour chaque fonction extraite, ajouter:

```tsx
/**
 * Gère l'ouverture de la modal appropriée selon le type
 * @param modalId - Identifiant de la modal à ouvrir
 */
const handleModalOpen = useCallback((modalId: string) => {
  // ...
}, [dependencies]);
```

### 🧪 Tests Unitaires

Pour chaque handler extrait:

```tsx
// __tests__/handlers.test.ts
describe('handleModalOpen', () => {
  it('should open journal entry modal when id is journal-entry', () => {
    // Test
  });

  it('should open intelligent form when id is intelligent-form', () => {
    // Test
  });
});
```

---

## 🟢 SPRINT 4 - REFACTORING RECOUVREMENT (2 semaines)

### 📦 Fichier Monstre: `pages\tiers\RecouvrementModule.tsx`

**Métriques actuelles:**
- Lignes: 11,860 ⚠️
- Clickables: 35
- Red flags: 12

#### Phase 1: Analyse (2 jours)

- [ ] Cartographier toutes les fonctionnalités
- [ ] Identifier les composants à extraire
- [ ] Créer architecture cible
- [ ] Planifier migration progressive

#### Phase 2: Extraction Composants (5 jours)

- [ ] Créer `RecouvrementDashboard.tsx` (≈500 lignes)
- [ ] Créer `RecouvrementTable.tsx` (≈800 lignes)
- [ ] Créer `RecouvrementFilters.tsx` (≈400 lignes)
- [ ] Créer dossier `RecouvrementModals/` avec:
  - [ ] `CreateDossierModal.tsx`
  - [ ] `EditDossierModal.tsx`
  - [ ] `TransferModal.tsx`
  - [ ] `ActionsModal.tsx`
- [ ] Créer dossier `RecouvrementHooks/` avec:
  - [ ] `useRecouvrementData.ts`
  - [ ] `useRecouvrementActions.ts`
  - [ ] `useRecouvrementFilters.ts`

#### Phase 3: Migration (3 jours)

- [ ] Migrer Dashboard
- [ ] Migrer Table
- [ ] Migrer Filters
- [ ] Migrer Modals
- [ ] Migrer Hooks

#### Phase 4: Tests (2 jours)

- [ ] Tests unitaires nouveaux composants
- [ ] Tests d'intégration
- [ ] Tests de régression
- [ ] Tests E2E critiques

#### Structure Cible

```
tiers/
├── RecouvrementModule.tsx (≈200 lignes - container)
├── components/
│   ├── RecouvrementDashboard.tsx
│   ├── RecouvrementTable.tsx
│   ├── RecouvrementFilters.tsx
│   └── modals/
│       ├── CreateDossierModal.tsx
│       ├── EditDossierModal.tsx
│       ├── TransferModal.tsx
│       └── ActionsModal.tsx
└── hooks/
    ├── useRecouvrementData.ts
    ├── useRecouvrementActions.ts
    └── useRecouvrementFilters.ts
```

---

## 🔧 OUTILS & COMMANDES UTILES

### Recherche des Problèmes

```bash
# Trouver tous les div onClick sans role
grep -r "<div.*onClick" --include="*.tsx" frontend/src | grep -v "role="

# Trouver tous les handlers complexes (>150 chars)
grep -r "onClick={" --include="*.tsx" frontend/src | awk 'length($0) > 150'

# Compter les modales par fichier
grep -r "setShow.*Modal" --include="*.tsx" frontend/src | cut -d: -f1 | sort | uniq -c | sort -rn

# Trouver actions mixtes toast+modal
grep -r "toast\." --include="*.tsx" frontend/src | grep "setShow.*Modal"
```

### Validation Accessibilité

```bash
# Installer axe-core pour tests auto
npm install --save-dev @axe-core/react

# Installer testing-library
npm install --save-dev @testing-library/react @testing-library/jest-dom

# Lancer tests accessibilité
npm run test:a11y
```

### Scripts de Correction Automatique

```bash
# Script pour ajouter role="button" aux divs cliquables
# (à créer et adapter selon besoins)
node scripts/fix-accessibility.js
```

---

## 📊 SUIVI DE PROGRESSION

### Sprint 1 Progress
- [ ] 0/120 éléments accessibilité corrigés
- [ ] 0/120 tests clavier ajoutés
- [ ] Score accessibilité: 79/100 → **Target: 90/100**

### Sprint 2 Progress
- [ ] 0/10 actions mixtes corrigées
- [ ] 0/100 aria-labels ajoutés
- [ ] useModal hook créé: ❌
- [ ] Score UX: 75/100 → **Target: 85/100**

### Sprint 3 Progress
- [ ] 0/50 handlers refactorés
- [ ] 0/50 fonctions documentées
- [ ] 0/50 tests unitaires ajoutés
- [ ] Score maintenabilité: 63/100 → **Target: 80/100**

### Sprint 4 Progress
- [ ] RecouvrementModule analysé: ❌
- [ ] Architecture définie: ❌
- [ ] Composants extraits: 0/6
- [ ] Tests migration: ❌
- [ ] Réduction lignes: 11,860 → **Target: <500**

---

## 🎯 OBJECTIFS FINAUX

**Après tous les sprints:**

| Métrique | Avant | Après | Gain |
|----------|-------|-------|------|
| Score Accessibilité | 79 | 95 | +16 |
| Score Maintenabilité | 63 | 80 | +17 |
| Score UX | 75 | 85 | +10 |
| **Score Global** | **79** | **95** | **+16** |
| Red Flags | 241 | <10 | -96% |
| WCAG Level | A | AA | ✅ |
| Bug Rate | Baseline | -30% | ✅ |

---

## 📝 NOTES & REMARQUES

### Points de Vigilance

- ⚠️ Ne pas casser les tests existants lors des refactorings
- ⚠️ Tester sur différents navigateurs (Chrome, Firefox, Safari)
- ⚠️ Valider avec lecteurs d'écran (NVDA, JAWS, VoiceOver)
- ⚠️ Garder la compatibilité mobile
- ⚠️ Documenter chaque changement majeur

### Bonnes Pratiques

- ✅ Toujours préférer `<button>` à `<div onClick>`
- ✅ Toujours ajouter `aria-label` aux boutons icônes
- ✅ Toujours fermer la modal AVANT d'afficher le toast
- ✅ Toujours extraire les handlers complexes (>50 lignes)
- ✅ Toujours ajouter des tests pour les composants critiques

---

**Dernière mise à jour:** 2025-10-05
**Prochaine révision:** Fin Sprint 1
