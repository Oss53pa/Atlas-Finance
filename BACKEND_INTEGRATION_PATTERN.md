# Pattern d'Intégration Backend pour les Modals WiseBook

## ✅ FICHIER DE RÉFÉRENCE: ExercicePage.tsx

**Localisation:** `C:\devs\WiseBook\frontend\src\pages\core\ExercicePage.tsx`

Ce fichier contient le **pattern gold standard** validé avec:
- ✅ Build TypeScript réussi (48.42s)
- ✅ Validation Zod complète
- ✅ Gestion d'état du formulaire
- ✅ Mutation React Query
- ✅ Error handling par champ
- ✅ Loading states

---

## 🎯 Services API Créés

Tous les services sont dans `frontend/src/services/modules/`:

### 1. **accounting.service.ts**
- Endpoints: `/api/v1/journaux/`, `/api/v1/ecritures/`
- Schemas: `createJournalSchema`, `updateJournalSchema`
- Types: `Journal`, `JournalEntry`, `JournalDetails`
- Méthodes: `getJournals()`, `createJournal()`, `updateJournal()`, `deleteJournal()`

### 2. **analytics.service.ts**
- Endpoints: `/api/v1/axes-analytiques/`, `/api/v1/centres-analytiques/`
- Schemas: `createAxeSchema`, `createCentreSchema`
- Types: `AxeAnalytique`, `CentreAnalytique`
- Méthodes: `getAxes()`, `createAxe()`, `getCentres()`, `createCentre()`

### 3. **assets.service.ts**
- Endpoints: `/api/v1/immobilisations/`, `/api/v1/amortissements/`
- Schemas: `createImmobilisationSchema`, `createAmortissementSchema`
- Types: `Immobilisation`, `Amortissement`
- Méthodes: `getImmobilisations()`, `createImmobilisation()`, `createAmortissement()`

### 4. **core.service.ts**
- Endpoints: `/api/v1/exercices/`
- Schemas: `createExerciceSchema`
- Types: `Exercice`
- Méthodes: `getExercices()`, `createExercice()`, `clotureExercice()`

### 5. **tiers.service.ts**
- Endpoints: `/api/v1/tiers/`, `/api/v1/lettrage/`, `/api/v1/recouvrement/`
- Schemas: `createPartenaireSchema`, `createLettrageSchema`, `createTransfertContentieuxSchema`
- Types: `Partenaire`, `Lettrage`, `TransfertContentieux`
- Méthodes: `getPartenaires()`, `createPartenaire()`, `createLettrage()`, `transfertContentieux()`

### 6. **closures.service.ts**
- Endpoints: `/api/v1/closures/controles/`, `/api/v1/closures/provisions/`, etc.
- Schemas: `executeControleSchema`, `createProvisionSchema`, `uploadDocumentSchema`, `createValidationSchema`
- Types: `Controle`, `Provision`, `Document`, `Validation`
- Méthodes: `executeControles()`, `createProvision()`, `uploadDocument()`, `createValidation()`

### 7. **reporting.service.ts**
- Endpoints: `/api/v1/rapports/`, `/api/v1/reporting/planifications/`
- Schemas: `createPlanificationSchema`, `generateRapportSchema`
- Types: `Rapport`, `Planification`
- Méthodes: `getRapports()`, `createPlanification()`, `generateRapport()`

---

## 📋 Pattern de Connexion (Step-by-Step)

### ÉTAPE 1: Imports Nécessaires

```tsx
// AVANT (ligne ~1-40)
import { toast } from 'react-hot-toast';

// APRÈS - Ajouter ces imports:
import { [SERVICE_NAME] } from '../../services/modules/[MODULE].service';
import { [SCHEMA_NAME] } from '../../services/modules/[MODULE].service';
import { z } from 'zod';
```

**Exemple (ExercicePage):**
```tsx
import { coreService, createExerciceSchema } from '../../services/modules/core.service';
import { z } from 'zod';
```

---

### ÉTAPE 2: État du Formulaire

```tsx
// AVANT
const [showCreateModal, setShowCreateModal] = useState(false);

// APRÈS - Ajouter ces états:
const [showCreateModal, setShowCreateModal] = useState(false);
const [formData, setFormData] = useState({
  // Tous les champs du formulaire avec valeurs par défaut
  field1: '',
  field2: '',
  checkboxField: false,
  selectField: 'default_value',
});
const [errors, setErrors] = useState<Record<string, string>>({});
const [isSubmitting, setIsSubmitting] = useState(false);
```

**Exemple (ExercicePage):**
```tsx
const [formData, setFormData] = useState({
  libelle: '',
  date_debut: '',
  date_fin: '',
  type: 'normal' as 'normal' | 'court' | 'long' | 'exceptionnel',
  plan_comptable: 'syscohada' as 'syscohada' | 'pcg' | 'ifrs',
  devise: 'XAF',
  cloture_anticipee: false,
  reouverture_auto: false,
});
const [errors, setErrors] = useState<Record<string, string>>({});
const [isSubmitting, setIsSubmitting] = useState(false);
```

---

### ÉTAPE 3: Mutation React Query

```tsx
// APRÈS queryClient, ajouter:
const createMutation = useMutation({
  mutationFn: [SERVICE].[CREATE_METHOD],
  onSuccess: () => {
    toast.success('[SUCCESS_MESSAGE]');
    queryClient.invalidateQueries({ queryKey: ['[QUERY_KEY]'] });
    setShowCreateModal(false);
    resetForm();
  },
  onError: (error: any) => {
    toast.error(error.message || '[ERROR_MESSAGE]');
  },
});
```

**Exemple (ExercicePage):**
```tsx
const createExerciceMutation = useMutation({
  mutationFn: exerciceService.createExercice,
  onSuccess: () => {
    toast.success('Exercice créé avec succès');
    queryClient.invalidateQueries({ queryKey: ['exercices'] });
    setShowCreateModal(false);
    resetForm();
  },
  onError: (error: any) => {
    toast.error(error.message || 'Erreur lors de la création');
  },
});
```

---

### ÉTAPE 4: Fonctions Helper

```tsx
// Ajouter ces 3 fonctions après les mutations:

const resetForm = () => {
  setFormData({
    // Réinitialiser tous les champs
    field1: '',
    field2: '',
  });
  setErrors({});
  setIsSubmitting(false);
};

const handleInputChange = (field: string, value: any) => {
  setFormData(prev => ({ ...prev, [field]: value }));
  // Clear error for this field
  if (errors[field]) {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }
};

const handleSubmit = async () => {
  try {
    setIsSubmitting(true);
    setErrors({});

    // Validate with Zod
    const validatedData = [SCHEMA_NAME].parse(formData);

    // Submit to backend
    await createMutation.mutateAsync(validatedData);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Map Zod errors to form fields
      const fieldErrors: Record<string, string> = {};
      error.errors.forEach((err) => {
        const field = err.path[0] as string;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      toast.error('Veuillez corriger les erreurs du formulaire');
    } else {
      toast.error('[ERROR_MESSAGE]');
    }
  } finally {
    setIsSubmitting(false);
  }
};
```

---

### ÉTAPE 5: Binding des Inputs

Pour **chaque input/select/checkbox** dans le modal JSX:

#### Input Text/Date/Number:
```tsx
// AVANT
<Input placeholder="..." />

// APRÈS
<Input
  placeholder="..."
  value={formData.[FIELD_NAME]}
  onChange={(e) => handleInputChange('[FIELD_NAME]', e.target.value)}
  disabled={isSubmitting}
/>
{errors.[FIELD_NAME] && (
  <p className="mt-1 text-sm text-red-600">{errors.[FIELD_NAME]}</p>
)}
```

#### Select:
```tsx
// AVANT
<Select>
  <SelectTrigger>
    <SelectValue placeholder="..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="val1">Label 1</SelectItem>
  </SelectContent>
</Select>

// APRÈS
<Select
  value={formData.[FIELD_NAME]}
  onValueChange={(value) => handleInputChange('[FIELD_NAME]', value)}
  disabled={isSubmitting}
>
  <SelectTrigger>
    <SelectValue placeholder="..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="val1">Label 1</SelectItem>
  </SelectContent>
</Select>
{errors.[FIELD_NAME] && (
  <p className="mt-1 text-sm text-red-600">{errors.[FIELD_NAME]}</p>
)}
```

#### Checkbox:
```tsx
// AVANT
<input type="checkbox" id="[ID]" />

// APRÈS
<input
  type="checkbox"
  id="[ID]"
  checked={formData.[FIELD_NAME]}
  onChange={(e) => handleInputChange('[FIELD_NAME]', e.target.checked)}
  disabled={isSubmitting}
  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
/>
```

---

### ÉTAPE 6: Boutons du Footer

```tsx
// AVANT (dans le footer sticky)
<button onClick={() => setShowCreateModal(false)}>
  Annuler
</button>
<button onClick={() => { toast.success('...'); setShowCreateModal(false); }}>
  Créer
</button>

// APRÈS
<button
  onClick={() => {
    setShowCreateModal(false);
    resetForm();
  }}
  disabled={isSubmitting}
  className="... disabled:opacity-50 disabled:cursor-not-allowed"
>
  Annuler
</button>
<button
  onClick={handleSubmit}
  disabled={isSubmitting}
  className="... disabled:opacity-50 disabled:cursor-not-allowed"
>
  {isSubmitting ? (
    <>
      <LoadingSpinner size="sm" />
      <span>Création...</span>
    </>
  ) : (
    <>
      <CheckCircle className="w-4 h-4" />
      <span>Créer</span>
    </>
  )}
</button>
```

---

### ÉTAPE 7: Bouton Close (X)

```tsx
// AVANT
<button onClick={() => setShowCreateModal(false)}>
  <X className="w-6 h-6" />
</button>

// APRÈS
<button
  onClick={() => {
    setShowCreateModal(false);
    resetForm();
  }}
  className="text-gray-500 hover:text-gray-700"
  disabled={isSubmitting}
>
  <X className="w-6 h-6" />
</button>
```

---

## 🗂️ Mapping Fichiers → Services

### Accounting (1 fichier)
**Fichier:** `accounting/CompleteJournalsPage.tsx`
- **Service:** `accountingService` (`accounting.service.ts`)
- **Modal:** `showDetailsModal` (détails journal)
- **Schema:** `createJournalSchema` (si création future)

### Analytics (2 fichiers)
**Fichier 1:** `analytics/AnalyticalAxesPage.tsx`
- **Service:** `analyticsService` (`analytics.service.ts`)
- **Modal:** `showCreateModal`
- **Schema:** `createAxeSchema`
- **Mutation:** `createAxe()`

**Fichier 2:** `analytics/CostCentersPage.tsx`
- **Service:** `analyticsService` (`analytics.service.ts`)
- **Modal:** `showCreateModal`
- **Schema:** `createCentreSchema`
- **Mutation:** `createCentre()`

### Assets (2 fichiers)
**Fichier 1:** `assets/DepreciationPage.tsx`
- **Service:** `assetsService` (`assets.service.ts`)
- **Modal:** `showCreateModal`
- **Schema:** `createAmortissementSchema`
- **Mutation:** `createAmortissement()`

**Fichier 2:** `assets/FixedAssetsPage.tsx`
- **Service:** `assetsService` (`assets.service.ts`)
- **Modal:** `showCreateModal`
- **Schema:** `createImmobilisationSchema`
- **Mutation:** `createImmobilisation()`

### Config/Reporting (2 fichiers)
**Fichier 1:** `config/PlanSYSCOHADAPage.tsx`
- **Service:** `accountingService` (comptes SYSCOHADA)
- **Modal:** `showNewAccountModal`
- **Note:** Utiliser endpoints comptes

**Fichier 2:** `reporting/CustomReportsPage.tsx`
- **Service:** `reportingService` (`reporting.service.ts`)
- **Modal:** `showScheduleModal`
- **Schema:** `createPlanificationSchema`
- **Mutation:** `createPlanification()`

### Tiers (3 fichiers)
**Fichier 1:** `tiers/LettrageModule.tsx`
- **Service:** `tiersService` (`tiers.service.ts`)
- **Modal:** `showLettrageModal`
- **Schema:** `createLettrageSchema`
- **Mutation:** `createLettrage()`

**Fichier 2:** `tiers/PartenairesModule.tsx`
- **Service:** `tiersService` (`tiers.service.ts`)
- **Modal:** `showPartenaireModal`
- **Schema:** `createPartenaireSchema`
- **Mutation:** `createPartenaire()`

**Fichier 3:** `tiers/RecouvrementModule.tsx`
- **Service:** `tiersService` (`tiers.service.ts`)
- **Modal:** `showTransferContentieuxModal`
- **Schema:** `createTransfertContentieuxSchema`
- **Mutation:** `transfertContentieux()`

### Closures (7 fichiers)
**Fichier 1:** `closures/sections/ControlesCoherence.tsx`
- **Service:** `closuresService` (`closures.service.ts`)
- **Modal:** `showExecutionModal`
- **Schema:** `executeControleSchema`
- **Mutation:** `executeControles()`

**Fichier 2:** `closures/sections/CycleClients.tsx`
- **Service:** `closuresService`
- **Modal:** `showProvisionModal`
- **Schema:** `createProvisionSchema`
- **Mutation:** `createProvision()`

**Fichier 3:** `closures/sections/DocumentsArchives.tsx`
- **Service:** `closuresService`
- **Modal:** `showUploadModal`
- **Schema:** `uploadDocumentSchema`
- **Mutation:** `uploadDocument()`
- **Note:** Gestion de fichiers avec FormData

**Fichier 4:** `closures/sections/EtatsSYSCOHADA.tsx`
- **Service:** `reportingService` (génération états)
- **Modal:** `showGenerationModal`
- **Schema:** `generateRapportSchema`
- **Mutation:** `generateRapport()`

**Fichier 5:** `closures/sections/ParametragePeriodes.tsx`
- **Service:** `closuresService` ou `coreService`
- **Modal:** `showCreateModal`
- **Note:** Créer période de clôture (endpoint custom)

**Fichier 6:** `closures/sections/RapprochementBancaire.tsx`
- **Service:** `closuresService`
- **Modal:** `showImportModal`
- **Note:** Import fichiers bancaires (CSV, OFX)

**Fichier 7:** `closures/sections/ValidationFinale.tsx`
- **Service:** `closuresService`
- **Modal:** `showValidationModal`
- **Schema:** `createValidationSchema`
- **Mutation:** `createValidation()`

---

## ⚠️ Points d'Attention

### 1. **Champs Requis**
Marquer les labels avec `*` pour les champs obligatoires définis dans le schema Zod:
```tsx
<label>Libellé de l'exercice *</label>
```

### 2. **Types TypeScript**
Utiliser `as` pour les unions de types dans l'état initial:
```tsx
type: 'normal' as 'normal' | 'court' | 'long' | 'exceptionnel'
```

### 3. **Gestion des Fichiers**
Pour les modals avec upload (DocumentsArchives, RapprochementBancaire):
- Utiliser `<input type="file" />`
- Stocker dans `formData` comme `File` object
- Valider avec `z.instanceof(File)`
- Utiliser `uploadFile()` method du service

### 4. **Messages de Succès Personnalisés**
Adapter le message selon le contexte:
- "Exercice créé avec succès"
- "Journal créé avec succès"
- "Axe analytique créé avec succès"
- "Provision comptabilisée avec succès"
- etc.

### 5. **Query Keys**
Utiliser des clés cohérentes pour React Query:
- `['exercices']` → liste d'exercices
- `['journaux']` → liste de journaux
- `['axes-analytiques']` → liste d'axes
- `['provisions']` → liste de provisions

---

## ✅ Checklist de Validation

Pour chaque fichier connecté, vérifier:

- [ ] Import du service correct
- [ ] Import du schema Zod
- [ ] Import de `z` from 'zod'
- [ ] État `formData` avec tous les champs
- [ ] État `errors` et `isSubmitting`
- [ ] Mutation React Query configurée
- [ ] Fonction `resetForm()` implémentée
- [ ] Fonction `handleInputChange()` implémentée
- [ ] Fonction `handleSubmit()` avec validation Zod
- [ ] Tous les inputs ont `value` et `onChange`
- [ ] Tous les inputs ont `disabled={isSubmitting}`
- [ ] Messages d'erreur affichés sous chaque champ
- [ ] Bouton submit avec loading state
- [ ] Bouton cancel appelle `resetForm()`
- [ ] Bouton close (X) appelle `resetForm()`
- [ ] Build TypeScript sans erreurs

---

## 🚀 Ordre d'Exécution Recommandé

### Batch 1 (Fichiers Simples)
1. `analytics/AnalyticalAxesPage.tsx`
2. `analytics/CostCentersPage.tsx`
3. `tiers/LettrageModule.tsx`

### Batch 2 (Assets)
4. `assets/DepreciationPage.tsx`
5. `assets/FixedAssetsPage.tsx`

### Batch 3 (Tiers)
6. `tiers/PartenairesModule.tsx`
7. `tiers/RecouvrementModule.tsx`

### Batch 4 (Closures Simples)
8. `closures/sections/CycleClients.tsx`
9. `closures/sections/ControlesCoherence.tsx`
10. `closures/sections/ValidationFinale.tsx`

### Batch 5 (Reporting & Config)
11. `reporting/CustomReportsPage.tsx`
12. `config/PlanSYSCOHADAPage.tsx`

### Batch 6 (Closures Complexes - avec fichiers)
13. `closures/sections/DocumentsArchives.tsx`
14. `closures/sections/RapprochementBancaire.tsx`
15. `closures/sections/EtatsSYSCOHADA.tsx`
16. `closures/sections/ParametragePeriodes.tsx`

### Batch 7 (Accounting - dernier)
17. `accounting/CompleteJournalsPage.tsx`

**Total: 17 fichiers à connecter** (ExercicePage déjà fait = 18/18)

---

## 📊 Commande de Build

Après chaque batch:
```bash
cd /c/devs/WiseBook/frontend && npm run build
```

Build réussi si:
- `✓ built in XX.XXs`
- Pas d'erreurs TypeScript
- Warnings (chunk size, eval) sont acceptables

---

**Document généré:** 2025-09-27
**Fichier de référence validé:** `ExercicePage.tsx`
**Build status:** ✅ Réussi (48.42s)