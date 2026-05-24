# WiseBook ERP v3.0 — Architecture & Code Audit
**Date**: 2026-05-24  
**Auditor**: Senior Architecture Audit Agent (read-only, god mode)  
**Scope**: Architecture integrity, security, DexieAdapter vs SupabaseAdapter parity, test quality, Money/Decimal correctness, @ts-nocheck debt, build & bundle, Proph3t integration, critical business logic, dead code.

---

## Executive Summary

WiseBook ERP v3.0 has resolved its most severe prior P0 findings (tenant isolation, atomic journal entry saving, immutable posted entries, 131/139 accounts, reverseEntry for carry-forward). The architecture is sound: clean DataAdapter abstraction, proper monorepo package boundaries, no circular dependencies detected, real data wired in key pages. The remaining open issues fall into three categories: (1) two P1 security gaps (SECURITY DEFINER functions without `SET search_path`, SupabaseAdapter missing immutability guard); (2) three carried-over OHADA compliance bugs (F-01 ProphetV2 field mismatch, F-19 dégressif coefficient, F-07 affectation flow); (3) one newly found data correctness bug (carryForward includes draft entries). The codebase has 275 files still carrying `@ts-nocheck` against a baseline of 274 — one regression. Authentication dev/prod detection uses two different mechanisms creating a subtle inconsistency.

**Verdict: PROD-READY WITH CONDITIONS** — conditions listed as P0/P1 issues below.

---

## Confirmed Fixes

- Migration 18: RPCs (`get_account_balance`, `get_trial_balance`, `save_journal_entry`, `import_exchange_rates`) use `get_user_company_id()` for tenant derivation, never trust `p_tenant_id` from client. Cross-tenant injection blocked at DB level.
- DexieAdapter: `assertJournalEntryWritable` (balance check on `create`), `assertPostedEntryImmutable` (blocks field/line changes on `update`), physical delete of `posted` entries rejected.
- SupabaseAdapter `saveJournalEntry`: uses `save_journal_entry` RPC (atomic header+lines in one Postgres transaction, balance trigger DEFERRABLE).
- `generateResultatEntry`: uses accounts 131 (bénéfice) / 139 (perte) — not 1200/1290.
- `supprimerCarryForward`: uses `reverseEntry` contrepassation, never physical delete of validated entries.
- `getAccountBalance` and `getBalanceByAccount` in DexieAdapter filter out `draft` entries (`status === 'validated' || status === 'posted'`).
- `taxationService.calculerDeclarationTVA` / IS: uses Money accumulator, filters drafts via `getEntriesForPeriod`.
- `AuthContext`: fallback role hardcoded to `'user'`, never derives admin from `user_metadata`.
- `getUserProfile` / `getUserPermissions` in `supabase.ts`: role comes from DB tables (profiles/roles), `user_metadata` explicitly excluded with comment.
- RBACGuard `isDemoMode`: gated by `isDevMode && sessionStorage` — inert in production builds.
- CI: TypeScript type-check BLOCKING, vitest BLOCKING, `@ts-nocheck` guard BLOCKING (baseline 274), migrations manual-only.
- `affectationResultatService.ts`: reserve légale = 10% (`calculerDotationReserveLegale` uses `percentage(money(resultatNet), 10)`), RAN uses account 121 (crediteur) / 129 (débiteur). F-02 and F-03 confirmed RESOLVED.
- `proph3t.ts`: no hardcoded keys, all config from env vars, `isProph3tCoreConfigured()` correct.
- `LLMProviderFactory.createFromEnv()`: auto-enables Anthropic when `isSupabaseConfigured`, no keys in source.
- `EntriesPage.tsx`: uses `adapter.getAll<any>('journalEntries')` via `useData()` — real adapter data.
- `carryForwardService.supprimerCarryForward`: uses `reverseEntry`, not `adapter.delete`.
- `vite.config.ts`: manual chunks defined, `chunkSizeWarningLimit: 700`, all `@atlas/*` aliases correct.
- `tsconfig.json`: `"strict": true`, paths match Vite aliases, `noEmit: true`.
- FEC export (`fecExportService.ts`): `formatAmount` uses `.toFixed(2)` only for FEC string formatting — acceptable for text output, not financial accumulation.
- Integration tests (`integration.criticalPaths.test.ts`, `integration.accountingFlows.test.ts`): use real `DexieAdapter` via `fake-indexeddb`, no `@ts-nocheck`, semantically correct.
- Sentry: properly initialized from `VITE_SENTRY_DSN`, `console.warn` in prod if absent, financial fields stripped from `beforeSend`.

---

## Open Issues

| ID | Severity | Component | Finding | Recommended Fix |
|----|----------|-----------|---------|----------------|
| A-01 | P0 | `supabase/migrations/20240101000018` | All 4 SECURITY DEFINER functions lack `SET search_path = public, pg_temp` — a malicious schema-injection attack could redirect table lookups via `search_path` manipulation | Add `SET search_path = public, pg_temp` to each function signature |
| A-02 | P1 | `packages/data/src/adapters/SupabaseAdapter.ts` | `update()` has NO equivalent of `assertPostedEntryImmutable`. A client calling `adapter.update('journalEntries', id, {journal:'VE'})` on a posted entry succeeds silently in SaaS mode (Postgres-level protection not in place) | Add immutability guard to SupabaseAdapter.update() mirroring DexieAdapter, OR add a Postgres trigger on `journal_entries` |
| A-03 | P1 | `packages/data/src/adapters/SupabaseAdapter.ts` | `delete()` has NO guard against deleting a `posted` entry. SupabaseAdapter.delete calls `this.client.from(...).delete()` directly with no status check | Add status check before delete (equivalent to DexieAdapter line 304-310) |
| A-04 | P1 | `src/services/cloture/carryForwardService.ts` line 72-74 | `calculerSoldesCloture()` calls `adapter.getAll('journalEntries')` WITHOUT filtering out draft entries. Draft entries are included in carry-forward balance computation. The closure logic in `executerCloture` already rejects draft entries before this point — but `calculerSoldesCloture` can also be called standalone (e.g., via `previewCarryForward`) | Add `.filter(e => e.status === 'validated' \|\| e.status === 'posted')` after `allEntries` fetch (line 73) |
| A-05 | P1 | `src/contexts/AuthContext.tsx` line 172 vs `src/components/auth/RBACGuard.tsx` line 69 | Inconsistent dev-mode detection: `AuthContext` uses `VITE_APP_ENV === 'development'` (user-controlled env var, survives prod build if set), while `RBACGuard` uses the Vite built-in `import.meta.env.DEV` (always false in prod builds). In prod with `VITE_APP_ENV=development`, the bypass conditions (`isSupabaseConfigured \|\| isDev`) in AuthContext would activate dev mode but RBACGuard would correctly enforce RBAC. Minor inconsistency but `atlas-dev-user` persisted in localStorage (with role info) could survive a prod deploy | Align both to `import.meta.env.DEV` — the built-in flag that cannot be overridden at runtime |
| A-06 | P1 | `scripts/check-ts-nocheck.cjs` BASELINE=274 | Current count is **275** (one regression). The CI guard catches this and will FAIL — but it was introduced after the last commit. Find and remove the new @ts-nocheck | Run `npm run check:ts-nocheck` to identify the offending file and fix its types |
| F-01 | P1 | `src/services/prophet/audit/controls/*.ts` | **Carried from Agent 1**: All audit controls (`fondamentaux.ts`, `tiers.ts`, `tresorerie.ts`, `capitauxPropres.ts`, etc.) read `r.totalDebit` / `r.totalCredit` from `TrialBalanceRow` objects. The `TrialBalanceRow` interface (packages/shared/src/types/accounting.ts line 319-328) has NO `totalDebit`/`totalCredit` fields — only `debitMouvement`, `creditMouvement`, `debitSolde`, `creditSolde`. All arithmetic on these fields evaluates to `0` silently (JavaScript `undefined || 0 = 0`). 86+ controls produce zero-value results instead of real balances | Replace `r.totalDebit \|\| 0` → `r.debitMouvement + r.debitOuverture` and `r.totalCredit \|\| 0` → `r.creditMouvement + r.creditOuverture` across all audit control files. A spawned task tracks this. |
| F-07 | P2 | `src/services/affectation/` (wiring) | **Carried from Agent 1**: The affectation flow (`genererEcrituresAffectation`) is correctly implemented and uses accounts 131/139 as source, but the orchestrator `executerCloture` does NOT call `genererEcrituresAffectation` — it only calls `generateResultatEntry` (determination) and `executerCarryForward`. The affectation step (répartition bénéfice → réserves/dividendes/RAN) must be triggered separately. There is no automated wiring from closure to affectation | Add affectation step to `executerCloture` after `generateResultatEntry`, or document that it is intentionally manual (AG decision required) |
| F-19 | P2 | `src/services/postingService.ts` line 66 | **Carried from Agent 1**: Dégressif rate hardcoded as `(100 / asset.usefulLifeYears) * 2` — always ×2 regardless of useful life. SYSCOHADA table requires: 3 years → ×1.5, 4-5 years → ×2.0, 6-10 years → ×2.5, >10 years → ×3.0 | Replace ×2 with a lookup: `const DEGRESSIF_COEFFS = [[3,1.5],[5,2.0],[10,2.5],[Infinity,3.0]]`; use `usefulLifeYears` to pick coefficient |
| A-07 | P2 | `packages/data/src/adapters/SupabaseAdapter.ts` line 312-314 | Generic `rpc()` method always appends `p_tenant_id: this.tenantId` to ALL RPC calls (line 313). This means custom RPCs called via `adapter.rpc(name, params)` get an extra `p_tenant_id` param that may not exist in their signature — causing Postgres `ERROR: 42883: function not found` or param mismatch errors for future RPCs | Only inject `p_tenant_id` if the RPC is in a known allowlist, or document that callers must handle this |
| A-08 | P2 | `src/services/cloture/affectationResultatService.ts` line 199-202 | Loss case: debits `REPORT_A_NOUVEAU_DEBITEUR` (129) then credits `RESULTAT_PERTE` (139). In the standard SYSCOHADA flow, the loss (129 debit) should be the counterpart from 139, not an additional credit line. The resulting entry structure may be asymmetric for partial loss absorption | Review loss accounting entry structure against SYSCOHADA Art. 43 — ensure one debit 139 → credit 129 line, not a split |
| A-09 | P2 | `src/lib/supabase.ts` | User's `company_id` is stored to `localStorage.setItem('atlas-tenant-id', userData.company_id)`. This value is read by `SupabaseAdapter` constructor (presumably via `DataContext`). While the RPCs server-side ignore `p_tenant_id` from client (migr. 18 fix), this stored key could confuse future code or be tampered | Derive tenant_id from Supabase session/RPC exclusively; avoid persisting it to localStorage |
| A-10 | P3 | `src/services/api.service.ts` + 23 sibling `*.service.ts` files | Legacy REST/Supabase-direct services (`api.service.ts`, `budget.service.ts`, `assets.service.ts`, etc.) still have `@ts-nocheck` and import from each other, but are mostly unused in the main application flow. They inflate the bundle and @ts-nocheck count | Audit imports, delete truly dead files, or move to a `legacy/` folder excluded from build |
| A-11 | P3 | `src/hooks/index.ts` | Barrel re-exports `useSystem`, `useTreasury` etc. via `export *`. If any of these modules contain dead exported hooks (as noted in MEMORY.md: `useDashboard`, `useReconciliation`, etc.), tree-shaking may not eliminate them in all bundlers | Audit `useSystem.ts`, `useTreasury.ts` for truly dead hooks and remove them |
| A-12 | P3 | Test files `src/__tests__/p4Improvements.test.ts` and `auditCorrections.test.ts` | Both have `// @ts-nocheck` — these are test files added after the @ts-nocheck sweep, bypassing type safety in tests that verify core correctness | Remove `@ts-nocheck` from both test files; resolve any type errors |

---

## Detailed Findings

### Section 1 — Architecture & Layer Integrity

**Package boundaries**: Confirmed clean. `packages/core` (Money, depreciation), `packages/data` (adapters), `packages/shared` (types/constants) have no circular imports. Root `src/` imports from `@atlas/shared` and `@atlas/data` correctly.

**DataAdapter interface completeness**: All methods used in services exist on the interface. The interface at `packages/data/src/DataAdapter.ts` defines 17 methods plus optional `rpc?`. No method calls on undefined were found.

**Service/adapter pattern**: All business services accept `adapter: DataAdapter` as first parameter. Components retrieve adapter via `const { adapter } = useData()`. No violations found in the main service files reviewed.

**`logAudit` direct import**: Consistent — `logAudit` is imported directly from `src/lib/db` in closure services and carryForward. This is documented as acceptable in MEMORY.md (utility, not adapter). `useInvalidateOnEntryChange` similarly keeps direct `db` import. No violation.

### Section 2 — DexieAdapter vs SupabaseAdapter Parity

**Methods**: Both implement all 15 `DataAdapter` interface methods. DexieAdapter has an additional `validateJournalBalance()` public helper and `getDexieInstance()` — neither in the interface, so not a parity issue.

**Draft filtering**: DexieAdapter filters drafts in `getAccountBalance` (line 346) and `getBalanceByAccount` (line 398). SupabaseAdapter delegates to `get_account_balance` RPC which has `AND je.status IN ('validated', 'posted')` (migration 18 line 56). **Parity confirmed.**

**SupabaseAdapter `getBalanceByAccount` math**: `solde: row.debitSolde - row.creditSolde` — correct because `get_trial_balance` returns `GREATEST(...debit - credit, 0)` as `solde_debiteur` and `GREATEST(...credit - debit, 0)` as `solde_crediteur`. The subtraction is correct.

**Immutability guards (A-02, A-03)**: DexieAdapter has `assertPostedEntryImmutable` in `update()` and a `status === 'posted'` check in `delete()`. SupabaseAdapter has NO equivalent checks — a direct Supabase update/delete bypasses all SYSCOHADA Art. 19 protections. The server-side `save_journal_entry` RPC is atomic, but raw `update()`/`delete()` calls on `journal_entries` go through PostgREST directly without any trigger or RPC validation on the posted status. This is a **P1 gap**.

**`createMany` in SupabaseAdapter**: This method exists in SupabaseAdapter but is NOT in the `DataAdapter` interface — it's an implementation detail. This is fine for internal use but means code relying on it must cast the adapter.

### Section 3 — Test Quality

**Integration tests**: Both `integration.criticalPaths.test.ts` and `integration.accountingFlows.test.ts` use the real `DexieAdapter` with `fake-indexeddb/auto`. No stubs. Tests are syntactically and semantically correct. They cover: P0-4 balance check, ID preservation, posted entry immutability, contrepassation, carry-forward, and balance verification.

**@ts-nocheck in test files**: Found in `p4Improvements.test.ts` and `auditCorrections.test.ts` (see A-12). The new integration tests are clean.

**Coverage gaps**: No coverage on `SupabaseAdapter` methods (requires real Supabase), `LLMProviderFactory` (no unit tests found), `ProphetV2.ts` routing logic, all audit controls in `src/services/prophet/audit/controls/` (the F-01 bug would be caught by tests if they existed).

### Section 4 — Security

**Migration 18 RPCs**: All 4 functions use `SECURITY DEFINER` and call `get_user_company_id()` to derive tenant server-side, rejecting mismatched `p_tenant_id`. However, **none include `SET search_path = public, pg_temp`** (A-01). Per PostgreSQL security best practices for SECURITY DEFINER, this omission allows search_path injection if a superuser schema is manipulated.

**`p_tenant_id` still sent from client**: `SupabaseAdapter.getAccountBalance` (line 241), `getTrialBalance` (line 251), and `rpc()` (line 313) all pass `this.tenantId` as `p_tenant_id`. The server-side RPCs in migration 18 correctly **ignore** this value (using `get_user_company_id()` instead) but still validate that `p_tenant_id IS NULL OR p_tenant_id = v_tenant`. This is safe — but the extra parameter adds surface area. Low priority.

**Role assignment**: `AuthContext` fallback uses hardcoded `role: 'user'`. `getUserProfile` in `supabase.ts` explicitly never reads role from `user_metadata` (comment on lines 88-90). **Confirmed secure.**

**`localStorage` sensitive data (A-09)**: The `atlas-dev-user` key stores serialized `User` object (including role and permissions) in `localStorage` for dev mode. This persists across browser restarts. In production with a real Supabase deploy and no `VITE_APP_ENV=development`, this is inert — the key is only written in `isDev` mode. However, `atlas-tenant-id` (company_id) is stored in localStorage unconditionally when a Supabase profile loads (line 124 of AuthContext). Moderate risk.

**`isDemoMode` gating**: Correctly gated by `isDevMode && sessionStorage.getItem('atlas-demo-mode')`. In production (`import.meta.env.DEV === false`), the flag is inert. **Confirmed secure.**

**Inconsistent dev detection (A-05)**: `AuthContext` uses `VITE_APP_ENV === 'development'` while `RBACGuard` uses `import.meta.env.DEV`. The Vite built-in `DEV` flag is compile-time (always false in prod) whereas `VITE_APP_ENV` is a runtime env var that could be set to `development` in a prod environment. In `AuthContext`, `isDev` bypasses Supabase auth, meaning if a prod deploy sets `VITE_APP_ENV=development` the login system falls back to dev accounts. This is a potential misconfiguration risk.

### Section 5 — Money/Decimal Correctness

**Financial accumulation**: All critical accumulations in `closureService.ts`, `carryForwardService.ts`, `affectationResultatService.ts`, `taxationService.ts`, and `DexieAdapter` use the `money()` wrapper (Decimal.js-backed). No raw `+` arithmetic on financial amounts in service layer.

**`parseFloat`/`parseInt` on financial amounts**: Found only in non-financial contexts (entry number generation, period parsing, OCR input normalization, Benford's law analysis). None found accumulating account balances.

**`.toFixed()` on financial amounts**: `fecExportService.ts` line 115 uses `.toFixed(2)` for FEC text output — this is correct as FEC format requires a formatted string, not a financial accumulation. Budget analysis percentage displays also use `.toFixed()` for UI strings. No rounding risk found in critical accumulation paths.

**ROUND_HALF_UP**: The `Money` class in `packages/core/src/Money.ts` wraps Decimal.js. The rounding mode was verified in the last audit cycle. No changes detected.

### Section 6 — @ts-nocheck Remaining Debt

Current count: **275 files** vs BASELINE=274 in `scripts/check-ts-nocheck.cjs`. **This is a regression** — the CI guard will fail. The offending file must be identified and fixed before merging.

The `check:ts-nocheck` script is correctly wired as `npm run check:ts-nocheck` and is BLOCKING in CI (`ci.yml` line 38). The BASELINE is not auto-updated, so progress in reducing @ts-nocheck is not being locked in (as commented in the script). Recommendation: when any @ts-nocheck is removed, lower the BASELINE to prevent re-introduction.

**Notable `@ts-nocheck` files**: All prophet audit controls (`fondamentaux.ts`, `tiers.ts`, `tresorerie.ts`, `capitauxPropres.ts`, `chargesProduits.ts`, `fiscal.ts`, `immobilisations.ts`) have `@ts-nocheck` — these are the files with the F-01 bug. The type suppression is masking the field name mismatch.

### Section 7 — Build & Bundle

**Vite config**: Manual chunks split into 8 vendor groups covering react, router, UI, charts, data (dexie+supabase), xlsx, forms, utils. `chunkSizeWarningLimit: 700`. Sourcemaps disabled for production. All `@atlas/*` aliases defined.

**tsconfig.json**: `"strict": true` — all strict checks enabled. `noUnusedLocals: false` / `noUnusedParameters: false` — these relaxations are acceptable during @ts-nocheck debt reduction. `noEmit: true` correct for bundler mode.

**Missing env variables**: `VITE_SENTRY_DSN` — optional (warn in prod), documented. `VITE_ATLAS_SUPABASE_URL` / `VITE_ATLAS_SUPABASE_ANON_KEY` — optional, Proph3t core gracefully disables if absent. `VITE_OLLAMA_BASE_URL` — optional. `VITE_ANTHROPIC_ENABLED` — optional. No required env variable will break a prod build silently.

**tsconfig excludes**: 6 files are excluded from TypeScript compilation (`CompleteAssetsModulesDetailed.tsx`, etc.). These appear to be broken/backup files. They should be deleted, not merely excluded — they inflate the repo and could cause confusion.

### Section 8 — Proph3t Integration

**3-path routing**: `src/lib/proph3t.ts` implements Mode B (hosted core via `proph3t-ask`). `LLMProviderFactory` handles Ollama/Anthropic. ProphetV2 routes via all three. Clean separation.

**No hardcoded API keys**: Verified. `ATLAS_CORE_URL` and `ATLAS_CORE_ANON` from env vars. Ollama URL from `VITE_OLLAMA_BASE_URL`. Anthropic API key handled server-side (Supabase Secret).

**`isProph3tCoreConfigured()`**: Correctly checks both `ATLAS_CORE_URL` and `ATLAS_CORE_ANON` are non-empty.

**F-01 (unresolved)**: All ProphetV2 audit controls read `r.totalDebit` / `r.totalCredit` from `TrialBalanceRow` objects. The type has no such fields — only `debitMouvement`, `creditMouvement`, `debitSolde`, `creditSolde`. JavaScript evaluates `undefined || 0 = 0` silently, so 86+ controls compute 0 instead of actual values. A spawned fix task exists.

### Section 9 — Critical Business Logic Spot Checks

**131/139 accounts**: `generateResultatEntry` (closureService.ts lines 498-513) uses `isBenefice ? '131' : '139'`. **Confirmed correct.**

**carryForwardService.supprimerCarryForward**: Uses `reverseEntry` for validated/posted entries, physical delete only for drafts. **Confirmed correct.**

**Dégressif coefficient (F-19 unresolved)**: `postingService.ts` line 66: `(100 / asset.usefulLifeYears) * 2`. Always multiplies by 2. SYSCOHADA table requires 1.5 for ≤3 years, 2.0 for 4-5 years, 2.5 for 6-10 years, 3.0 for >10 years. **Confirmed unresolved.**

**Reserve légale 10% (F-02 resolved)**: `affectationResultatService.ts` line 93-95: `percentage(money(resultatNet), 10)` — confirmed 10%, not 5%. **Confirmed resolved.**

**RAN account 121 (F-03 resolved)**: `affectationResultatService.ts` line 65: `REPORT_A_NOUVEAU_CREDITEUR: '121'`. **Confirmed resolved.**

**carryForward includes drafts (A-04 new)**: `calculerSoldesCloture` (carryForwardService.ts line 72-74) loads ALL journal entries without filtering by status. Draft entries (never validated) will incorrectly appear in carry-forward balances. **New finding.**

**F-07 affectation wiring**: `executerCloture` calls `generateResultatEntry` (determination) and `executerCarryForward`, but never calls `genererEcrituresAffectation`. The full SYSCOHADA closure sequence (result determination → affectation → carry-forward) is incomplete as an automated flow. The affectation step requires capital/reserves data from an annual general meeting, so intentional manual triggering may be acceptable — but it should be documented.

**TVA/IS drafts filtered**: `getEntriesForPeriod` filters `status === 'validated' || status === 'posted'`. **Confirmed correct.**

### Section 10 — Dead Code & Tech Debt

**`src/services/api.service.ts`**: Has `@ts-nocheck`, imported by 8 files (`useDataTable.ts`, `PlanSYSCOHADAPage.tsx`, `accounting-complete.service.ts`, `api.ts`, `auth-backend.service.ts`, `core-complete.service.ts`, `dashboardApi.ts`, `treasury-complete.service.ts`). Not dead — still actively imported. However, all these files are themselves part of the legacy REST/Supabase layer (A-10).

**`src/hooks/index.ts`**: Re-exports `useSystem`, `useTreasury`, `useThirdParty`, etc. via `export *`. Dead hooks identified in MEMORY.md (`useDashboard`, `useReports`, `useReconciliation`, etc.) are not in the barrel — they may have already been removed. The barrel itself appears to export only live hooks.

**Excluded tsconfig files**: 6 backup/broken files excluded from compilation (e.g., `CompleteAssetsModulesDetailed.tsx`). These should be deleted from the repository.

---

## Risk Summary

| Severity | Count | Key Issues |
|----------|-------|-----------|
| P0 | 1 | SECURITY DEFINER without SET search_path (A-01) |
| P1 | 5 | SupabaseAdapter missing immutability guards (A-02, A-03), carryForward includes drafts (A-04), @ts-nocheck regression (A-06), F-01 ProphetV2 audit controls zero-value |
| P2 | 4 | F-07 affectation wiring, F-19 dégressif coefficient, RPC p_tenant_id leakage concern (A-07), affectation loss accounting (A-08) |
| P3 | 3 | localStorage tenant-id (A-09), legacy REST services (A-10), @ts-nocheck in test files (A-12) |

---

## Overall Verdict

**PROD-READY WITH CONDITIONS**

The system can go to production for the Dexie (local/desktop) adapter path with the critical fixes noted. For the SaaS/SupabaseAdapter path, **A-01** (search_path) and **A-02/A-03** (missing immutability guards on Supabase update/delete) must be resolved before handling production accounting data. The ProphetV2 audit controls (F-01) produce silent zero-value results — the AI assistant's audit findings are currently unreliable and must be fixed before presenting them to users.

Priority order for production readiness:
1. Fix A-01: Add `SET search_path = public, pg_temp` to migration 18 functions
2. Fix A-02/A-03: Add posted-entry guards to SupabaseAdapter update() and delete()
3. Fix A-04: Filter drafts in `calculerSoldesCloture`
4. Fix A-06: Remove the 1 regression @ts-nocheck file (count 275 > baseline 274)
5. Fix F-01: Correct `totalDebit`→`debitMouvement` field names in audit controls
6. Fix F-19: SYSCOHADA dégressif coefficient table

Items F-07, A-07, A-08, A-09 are follow-up items that do not block initial production deployment.
