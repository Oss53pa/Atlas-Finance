# RAPPORT DE MIGRATION — Sage → Atlas FNA (Cahier de Mission v3)

Branche : `claude/migration-v3-sage-atlas` · Projet Supabase prod : `vgtmljfayiysuvrcmunt` (ATLAS STUDIO — SCHEMA COMPLET).
Chaque lot a été livré avec **build Vite vert** et committé séparément.

## Constat préalable (écarts cahier ↔ code réel, vérifiés en prod)

| Sujet | Réalité mesurée | Action |
|---|---|---|
| A5 montants | DB **déjà en `NUMERIC(18,2)`** | Correctif **client** uniquement (NBSP, `money()`, `ceil`) |
| A2/A3 équilibre | Trigger `trg_validate_entry_balance` **CONSTRAINT DEFERRABLE** ✅ — mais le **chemin d'import batch SaaS** (entries puis lignes en requêtes séparées) le **contourne** | Correctif **client** (downgrade + contrôle journal/global) |
| A4 libellés | fallback `name = code`, libellé GL non réinjecté côté batch | Fix à la source + backfill SQL (non appliqué) |
| A1 en-têtes | détection « ≥2 cellules » (position) | Détection par **noms de colonnes** |
| A6 pagination | `getAll` → `range(0, 99999)` | `getPage` keyset + hook (additif) |
| A7 batch_id | **absent** ; mode `replace` purgeait **tout le tenant** | Colonne + sessions + RPC purge **bornée** |

## Lots livrés

| Lot | Commit | Contenu | Prod |
|---|---|---|---|
| 1 | `03cda12` | `migration_batch_id` (5 tables) + `migration_sessions` + RLS + index keyset | **appliqué** |
| 2 | `8c494cc` | A2/A3 — équilibre journal+global, `validated`→`draft` si déséquilibré | client |
| 3 | `d1c0af0` | A5 — NBSP, `Math.ceil`, `money()` | client |
| 4 | `6f18a7b` | A1 — détection d'en-tête par noms de colonnes | client |
| 5 | `bf68f94` | A4 — libellés à l'import + backfill SQL (écrit, **non appliqué**) | client |
| 6 | `2992d10` | A7 — RPC `save_journal_entry_batch` + `purge_migration_batch` (bornée) + tag batch + sessions + UI « Annuler le lot » + `replace` borné | **appliqué** |
| 7 | `40f9cca` | A6 — `getPage` keyset (Supabase/Dexie/Hybrid) + hook `usePaginatedTable` | client |

Migrations SQL : `20240101000033_migration_batch_tracking.sql` (appliquée), `..._34_backfill_account_names.sql` (**NON appliquée** — risque hash), `..._35_migration_batch_rpcs.sql` (appliquée).

## Checklist §8 — état

- [x] **Équilibre** contrôlé global + par journal (Mode 1) ; classes 6-7 à zéro contrôlées (Mode 2, déjà en place) ; AN par EXERCICE (Mode 3). *Mécanisme en place — à confirmer sur le fichier réel SOCIÉTÉ ALPHA SA (Σ = 32 696 152 542,82).*
- [x] **0 écriture `Déséq.` validée** : downgrade auto → `draft` (batch) + `entryGuard` (Dexie).
- [x] **0 compte sans intitulé** à l'import (libellé LIBELLE réinjecté). *Backfill historique = migration 034, manuelle.*
- [x] **Libellés = DESCRIPTION** (champ `libelleEcriture`), jamais le n° de pièce.
- [x] **Plan sans « TOTAL CLASSE »** : géré par les templates (source).
- [x] **AN non doublés** : workflow par mode (Mode 1 = GL seul incluant RAN ; Mode 2 = Balance seule).
- [x] **Immos** : dates converties, `useful_life` arrondi au supérieur ; VNC = VO − amort (template).
- [x] **Écrasement propre** : `purge_migration_batch` strictement bornée `WHERE tenant_id AND migration_batch_id` (garde-fou : batch_id obligatoire). *À exécuter au LOT 8.*
- [~] **Pagination 20/page partout** : **infrastructure livrée** (`getPage` + `usePaginatedTable`). **Branchement écran-par-écran à dérouler** (GL, balance, écritures, tiers, immos, journaux) — volontairement non forcé en global pour éviter toute régression (cf. avertissement du plan).
- [x] **Migration rejouable sans doublon** : `migration_batch_id` + `onConflict ... ignoreDuplicates` + purge bornée.

## Tests
`src/services/import/migrationWorkbook.test.ts` — **7 tests verts** (détection d'en-tête A1 + conformité des 3 modes / EXERCICE / slots obligatoires).

## Étapes MANUELLES restantes

1. **LOT 8 — Écrasement réel en prod** (à faire avec backup + confirmation) :
   1. Backup Supabase `vgtmljfayiysuvrcmunt`.
   2. `purge_migration_batch(<batch>, dry_run := true)` → vérifier les compteurs.
   3. Confirmation explicite, puis import réel (mode choisi) avec `status='validated'`.
   4. Réconcilier vs les ancres §1 (équilibre 0,00, 504 comptes, 184 tiers, 334 immos).
2. **Branchement pagination** écran par écran via `usePaginatedTable` (chaque écran = un changement vérifié séparément).
3. **Décision backfill A4 historique** (migration 034) : n'exécuter qu'après avoir confirmé que `hashEntry()` n'inclut pas `account_name`, ou en re-scellant la chaîne.

## Doctrine respectée
Multi-tenant `tenant_id` + RLS `get_user_company_id()` ; `NUMERIC(18,2)` ; **zéro perte silencieuse** (toute pièce déséquilibrée loggée et passée en brouillon, jamais d'équilibre forcé) ; purge **jamais globale** (batch_id obligatoire) ; migrations additives/réversibles.
