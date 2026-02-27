# Audit Pre-Migration — Atlas Finance Dual Architecture
> Date: 2026-02-22
> Total: 834 fichiers TS/TSX | 113 806 lignes de code

---

## 0.1 — Imports Dexie directs (a migrer vers DataAdapter)

**146 fichiers** importent directement `db` depuis `../../lib/db` ou `dexie`.

### Par categorie :
- **Services (top-level)**: ~30 fichiers dans `src/services/`
- **Services (features)**: ~10 fichiers dans `src/features/*/services/`
- **Pages**: ~50 fichiers dans `src/pages/`
- **Components**: ~15 fichiers dans `src/components/`
- **Hooks**: ~10 fichiers dans `src/hooks/`
- **Tests**: ~15 fichiers dans `src/__tests__/`
- **Validators**: 1 fichier (`journalEntryValidator.ts`)

### Services critiques importent db :
- `closureOrchestrator.ts`, `closureService.ts`
- `carryForwardService.ts`, `affectationResultatService.ts`
- `extourneService.ts`, `regularisationsService.ts`
- `lettrageService.ts`, `postingService.ts`
- `trialBalanceService.ts`, `rapprochementBancaireService.ts`
- `planComptableService.ts`, `generalLedgerService.ts`
- `balanceService.ts`, `clientService.ts`
- `budgetingService.ts`, `financialStatementsService.ts`
- `fecExportService.ts`, `notesAnnexesService.ts`
- `tafireService.ts`, `reevaluationService.ts`
- `effetsCommerceService.ts`, `exchangeRateService.ts`
- `workflowService.ts`, `entryWorkflow.ts`, `entryGuard.ts`
- `aliasTiersService.ts`

---

## 0.2 — Imports Supabase

**9 fichiers** importent Supabase :
- `src/contexts/AuthContext.tsx`
- `src/services/sync/syncService.ts`
- `src/lib/supabase.ts`
- `src/services/prophet/ProphetV2.ts`
- `src/services/core-complete.service.ts`
- `src/services/api.service.ts`
- `src/services/treasury-complete.service.ts`
- `src/services/accounting-complete.service.ts`
- `src/services/realtime/realtimeService.ts`

---

## 0.3 — useLiveQuery (a wrapper)

**37 fichiers** utilisent `useLiveQuery` de `dexie-react-hooks`.

Principalement dans :
- Pages treasury: 6 fichiers
- Pages security: 3 fichiers
- Pages assets: 5 fichiers
- Pages tiers: 5 fichiers
- Pages inventory: 3 fichiers
- Pages taxation: 4 fichiers
- Pages config: 3 fichiers
- Pages closures: 2 fichiers
- Pages admin/finance: 6 fichiers

---

## 0.4 — Money.ts

**Localisation**: `src/utils/money.ts`

**Type**: Classe OOP wrappant `Decimal.js` (PAS un objet statique)
```
export class Money { add(), subtract(), multiply(), divide(), round(), toNumber(), ... }
export const money = (amount) => new Money(amount)
export function percentage(base, rate)
export function convertCurrency(amount, rate)
```

**Utilisation actuelle**: Seulement **14 occurrences** de `Money.` dans 5 fichiers :
- `src/__tests__/money.test.ts` (4)
- `src/services/workflow/workflowService.ts` (2)
- `src/validators/journalEntryValidator.ts` (4)
- `src/services/trialBalanceService.ts` (2)
- `src/services/entryGuard.ts` (2)

> ATTENTION: Money.ts est TRES sous-utilise. La plupart des calculs
> monetaires utilisent des operateurs JavaScript natifs (+= -= etc.)

---

## 0.5 — Violations Money.ts (calculs monetaires hors Money)

**~25+ fichiers** effectuent des calculs monetaires avec `+=` sur debit/credit/solde/montant :

Fichiers critiques :
- `balanceService.ts` (lignes 47-48, 205-206): `existing.debit += line.debit`
- `clientService.ts` (lignes 122-123): `totalDebit += line.debit`
- `closuresService.ts` (lignes 106-107, 165-166): `existing.debit += line.debit`
- `financialStatementsService.ts` (lignes 36, 51, 66): `total += line.debit - line.credit`
- `budgetingService.ts` (ligne 335): `totalActual += line.debit - line.credit`
- `useBalanceData.ts` (lignes 97-98, 194-196): `existing.debit += line.debit`
- `AdvancedFinancialStatements.tsx` (ligne 150): `debit += l.debit; credit += l.credit`

---

## 0.6 — Services existants (a deplacer vers @atlas/core)

### Services cloture (`src/services/cloture/`)
- `closureOrchestrator.ts` — orchestrateur principal (modes manual + proph3t)
- `affectationResultatService.ts` — affectation du resultat
- `carryForwardService.ts` — reports a nouveau
- `extourneService.ts` — contre-passation
- `regularisationsService.ts` — CCA/FNP/FAE/PCA

### Services comptables (`src/services/`)
- `closureService.ts` — preview/execute cloture
- `lettrageService.ts` — lettrage
- `postingService.ts` — posting ecritures
- `trialBalanceService.ts` — balance generale
- `rapprochementBancaireService.ts` — rapprochement
- `entryGuard.ts` — validation pre-saisie
- `entryWorkflow.ts` — workflow ecritures
- `budgetAnalysisService.ts` — analyse budgetaire

### Services features (`src/features/*/services/`)
- `balanceService.ts` — balance
- `clientService.ts` — clients
- `generalLedgerService.ts` — grand livre
- `closuresService.ts` — closures feature
- `revisionsService.ts` — revisions
- `budgetingService.ts` — budgeting
- `financialStatementsService.ts` — etats financiers

### Services specialises
- `planComptableService.ts` — plan comptable CRUD
- `aliasTiersService.ts` — alias tiers
- `exchangeRateService.ts` — taux de change
- `fecExportService.ts` — export FEC
- `notesAnnexesService.ts` — notes annexes
- `tafireService.ts` — TAFIRE
- `reevaluationService.ts` — reevaluation immos
- `effetsCommerceService.ts` — effets de commerce
- `workflowService.ts` — workflow
- `auditTrailPdfService.ts` — export audit PDF

---

## 0.7 — Donnees hardcodees / Mock

**100 fichiers** contiennent des references mock/fake/Math.random.

Fichiers mock dedies :
- `src/lib/mockData.ts`
- `src/pages/tiers/recouvrement/mockData.ts`
- `src/pages/inventory/utils/mockData.ts`
- `src/test/mocks/server.ts`

Beaucoup de pages contiennent encore des donnees mock inline.

---

## 0.8 — Dependencies actuelles

```
dexie: ^4.3.0
dexie-react-hooks: ^4.2.0
@supabase/supabase-js: ^2.95.3
react: ^18.2.0
typescript: ^5.0.2
vite: ^4.4.5
decimal.js: ^10.6.0
```

Pas d'Electron installe.

---

## 0.9 — TSConfig actuel

- `target`: ES2020
- `moduleResolution`: bundler
- `strict`: true
- `noUnusedLocals`: false (desactive)
- `noUnusedParameters`: false (desactive)
- Path aliases: `@/*` → `./src/*`
- Exclusions: 5 fichiers broken/backup

---

## 0.10 — Resume chiffre

| Metrique | Valeur |
|----------|--------|
| Fichiers TS/TSX | 834 |
| Lignes de code | 113 806 |
| Imports Dexie directs | **146 fichiers** |
| Imports Supabase | 9 fichiers |
| useLiveQuery | **37 fichiers** |
| Utilisations Money.ts | 14 occurrences (5 fichiers) |
| Violations Money.ts | ~25+ fichiers |
| Services a extraire | ~30 services |
| Fichiers mock/hardcode | ~100 fichiers |
| DB version actuelle | 4 (Dexie) |
