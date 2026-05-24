# Audit Technique, Tests & Sécurité — Atlas Finance (WiseBook ERP v3.0)

**Auditeur :** Ingénieur senior / QA / Sécurité (indépendant)
**Date :** 2026-05-21
**Périmètre :** Qualité technique, tests/couverture, sécurité (OWASP), intégrité des données, perf, CI/CD, code quality, doc.
**Branche auditée :** `fix/premium-dashboard-charts` (commit `d05746c`) — **NOTE : ce n'est PAS `master`**.
**Méthode :** exécution réelle des commandes (build, type-check, lint, test, coverage, npm audit) + lecture de code. Tout chiffre est marqué **VÉRIFIÉ** (commande exécutée / code lu) ou **SUPPOSÉ**.

---

## 1. Résumé exécutif

### Verdict technique : **NO-GO** (mise en production en l'état déconseillée)

L'application **compile et se build** (le bundle est produit), et le **noyau de calcul financier est de bonne qualité et bien testé** (Money 95.9 %, integrity 100 %, validations SYSCOHADA présentes côté `entryGuard` et côté triggers Postgres). C'est le point fort réel du projet.

Mais plusieurs **défauts bloquants (P0)** interdisent une mise en production d'un logiciel comptable multi-tenant :

1. **Fuite de données inter-tenant (P0).** Les RPC Postgres `get_trial_balance` / `get_account_balance` (migration 9) sont `SECURITY DEFINER` et **font confiance au `p_tenant_id` fourni par le client** (lu depuis `localStorage`) sans le confronter à `get_user_company_id()`. Un utilisateur authentifié peut lire la balance/les soldes de **n'importe quel autre tenant**. Idem pour `import_exchange_rates` (écriture).
2. **Couche services fantôme (P0 fonctionnel).** `apiService.get/post/...` est un **stub vide** qui renvoie `{ results: [], count: 0 }` sans aucun appel réseau ; **29 fichiers** (dont les **états financiers SYSCOHADA**, dashboards, trésorerie, clients/fournisseurs) en dépendent → affichage de données vides/fausses **silencieusement**, sans erreur.
3. **Bypass RBAC côté client (P1→P0 selon exposition).** Le flag `sessionStorage 'atlas-demo-mode'='1'` désactive **tous** les contrôles de rôle/permission dans le SPA, en production. Élévation de privilèges UI possible via `user_metadata` modifiable par l'utilisateur.
4. **Filet de tests trompeur (P1).** Couverture **globale 3,46 %** (seuil projet : 70 %). Le test adapter **diverge** du comportement réel des adaptateurs (gestion de l'`id`, absence de validation) → fausse assurance. La CI **n'échoue jamais** (`|| true`) et ne lance **aucun test**.

Le code applicatif (composants/pages/services) est massivement **non typé** (`@ts-nocheck` sur **304 fichiers**) et **non testé**, avec une **dette de lint de 4341 problèmes (346 erreurs)**. La séparation local/SaaS a des **incohérences fortes** (HybridAdapter jamais câblé, `saveJournalEntry` SaaS n'insère pas les lignes).

**Recommandation :** Go-conditionnel uniquement après correction des P0 (isolation tenant RPC, suppression du stub apiService ou rebranchement des services, suppression du bypass demo en prod) + remise à plat de la CI et de la couverture sur les modules critiques.

---

## 2. Commandes exécutées — résultats bruts (VÉRIFIÉ)

| Commande | Résultat | Détail |
|---|---|---|
| `npx tsc --noEmit` | **1 erreur TS** (exit 2) | `src/contexts/DataContext.tsx:64` — MAIS **masqué par `@ts-nocheck` sur 304 fichiers** (cf. §3.1) |
| `npx vite build` | **OK** (exit 0, 3 min 18 s) | Chunk principal **724 kB** (>700 kB) ; vendors lourds (charts 641 kB, xlsx 425 kB, pdf 391 kB). Build = `vite build` **sans `tsc`** |
| `npx eslint src` | **4341 problèmes** (346 erreurs, 3995 warnings), exit 1 | `no-unused-vars` 2888, `no-explicit-any` **999**, `ban-ts-comment` **304**, `exhaustive-deps` 104, **`rules-of-hooks` 1** |
| `npx vitest run` (avec worktrees) | 2984 tests / 231 fichiers, **15 fichiers échoués, 4 erreurs** | Faux : inclut `.claude/worktrees/*` (triple comptage) |
| `npx vitest run --coverage --exclude=**/.claude/**` | **746 tests passés / 54 fichiers, 0 échec, 2 erreurs** | Chiffre réel. (Contexte annonçait « 455 tests ») |
| Coverage globale | **Lines 3,46 %** / Branch 76,38 % / **Funcs 76,07 %** | Échec seuils (70/75/80). Modules critiques bien meilleurs (cf. §3.3) |
| `npm audit` | **7 vulnérabilités : 2 high, 5 moderate** | `vite` (high), `xlsx` (high, **no fix**), `postcss`/`uuid`/`ws` (moderate) |

**Erreurs de tests (2)** : `TypeError: storage.getItem is not a function` — le client Supabase (`src/lib/supabase.ts:23`, `noopLock`) déclenche une rejection non gérée en environnement jsdom sur `proph3t-tools.test.ts` / `proph3t.test.ts` (auto-refresh token sans storage mocké). Tests « passants » mais bruit d'erreurs non gérées.

---

## 3. Findings par domaine

### 3.1 Build & Types — **P1**

- **VÉRIFIÉ — `@ts-nocheck` sur 304 fichiers** (`grep -rl "@ts-nocheck" src packages apps` = 304). Confirme le constat de l'audit UX. Conséquence : `tsc --noEmit` ne remonte **qu'1 erreur** (`DataContext.tsx:64`) parce que **le typage est désactivé sur la quasi-totalité du code applicatif**. Le « 1 erreur TS » est donc **trompeusement bas**. (`@ts-ignore`/`@ts-expect-error` : 0 — tout passe par `@ts-nocheck`, plus radical.)
- **VÉRIFIÉ — `DataContext.tsx:64`** : `Parameters<typeof SupabaseAdapter>[3]` provoque `TS2344` (la classe n'est pas une signature appelable). Mineur, mais c'est la seule erreur qui échappe au voile `@ts-nocheck`.
- **VÉRIFIÉ — Build OK mais sans garde-fou de types** : le script `build` = `vite build` (pas de `tsc`). Seul `build:check` fait `tsc && vite build`, mais n'est pas utilisé par la CI. Le build ne casse donc jamais sur une erreur de type.
- **VÉRIFIÉ — Bundle** : chunk `index` **724,20 kB** (gzip 222 kB) > seuil 700 kB. Pas de code-splitting du chunk principal.
- **SUPPOSÉ** : `@ts-nocheck` masque potentiellement des centaines d'erreurs de type réelles (impossible à chiffrer sans retirer les directives).

### 3.2 Lint — **P1**

- **VÉRIFIÉ — 4341 problèmes / 346 erreurs / 3995 warnings** sur `src` (`npx eslint src`). Le script `lint` impose `--max-warnings 0` : il **échoue donc systématiquement**.
- Répartition (VÉRIFIÉ) : `@typescript-eslint/no-unused-vars` **2888**, `no-explicit-any` **999** (`any` omniprésent), `ban-ts-comment` **304** (= les `@ts-nocheck`, comptés comme erreurs), `react-hooks/exhaustive-deps` **104**, **`react-hooks/rules-of-hooks` 1**.
- **VÉRIFIÉ — Violation Rules of Hooks restante (P1)** : il subsiste **1** violation `react-hooks/rules-of-hooks` (`useState cannot be called at the top level`) dans un fichier de pages (détectée via `eslint --rule rules-of-hooks:error`, ligne ~41). **À localiser et corriger** — c'est exactement le type de bug crash-runtime signalé par l'audit UX.
- **VÉRIFIÉ — `RBACGuard.tsx` : violation des Rules of Hooks INFIRMÉE.** Le `useEffect` est bien appelé (ligne 88) **avant** le premier `return` conditionnel (ligne 100), avec commentaire explicite « All hooks must be called before any conditional return ». **Ce point précis a été corrigé** depuis l'audit UX. (Mais voir §3.4 pour le bypass RBAC, qui lui demeure.)

### 3.3 Tests & couverture — **P1**

- **VÉRIFIÉ — 746 tests / 54 fichiers, 0 échec** (exécution propre hors worktrees). Le chiffre « 2984 tests / 15 fichiers échoués » provient des **3 worktrees git** présents dans `.claude/worktrees/` (`elastic-raman-c0995a`, `inspiring-napier-2366f3`, `serene-mayer-ddcd08`) que Vitest scanne car `vite.config.ts` ne les exclut pas → **triple exécution** et collisions IndexedDB. **À exclure** dans `vite.config.ts > test.exclude`.
- **VÉRIFIÉ — Couverture modules CRITIQUES** (bonne) :
  - `src/utils/integrity.ts` : **100 %** lignes/branches.
  - `src/utils/money.ts` : **95,89 %** lignes, 96,55 % branches.
  - `src/utils/isCalculation.ts` : 98,52 % ; `fiscalYearUtils.ts` : 100 %.
  - `src/validators/*Validator.ts` : 86,27 %.
- **VÉRIFIÉ — Modules critiques FAIBLEMENT ou NON testés** :
  - `tvaValidation.ts` 55,35 % ; `cessionService.ts` 40,21 % ; `reversalService.ts` (contrepassation) **10,38 %**.
  - Calculs financiers à **0 %** : `...Financiers.ts`, plusieurs `*Calculation.ts`, `salairesCalc.ts`, `interestSourceCalc.ts`, `theme.ts`, etc.
  - **Tout le code UI / pages / services métier branchés à l'app** : ~0 % (d'où la couverture globale **3,46 %**). Bilan/compte de résultat/balance affichés à l'écran ne sont **pas couverts par des tests d'intégration**.
- **VÉRIFIÉ — Fausse assurance du test adapter (P1)** : `src/test/createTestAdapter.ts:51` `const id = data.id || crypto.randomUUID()` (respecte l'id) vs `DexieAdapter.ts:245` `const id = crypto.randomUUID()` et `SupabaseAdapter.ts:154` `id: crypto.randomUUID()` (**écrasent toujours** l'id). De plus `createTestAdapter.saveJournalEntry` (ligne 87) **ne valide ni l'équilibre ni la période** (totalDebit/Credit forcés à 0), contrairement au vrai `DexieAdapter.saveJournalEntry` (ligne 391, 396). Les tests passant via cet adapter **ne testent pas la logique réellement exécutée en prod**.

### 3.4 Sécurité (OWASP) — **P0 / P1**

#### 3.4.1 Isolation multi-tenant — **P0 (A01 Broken Access Control)**
- **VÉRIFIÉ — RPC `SECURITY DEFINER` qui font confiance au `p_tenant_id` client.**
  - `supabase/migrations/20240101000009_schema_alignment.sql:146` `get_account_balance(p_prefixes, p_tenant_id, ...)` → `WHERE je.tenant_id = p_tenant_id` (ligne 169).
  - `...000009:188` `get_trial_balance(p_tenant_id, p_start_date, p_end_date)` → `WHERE je.tenant_id = p_tenant_id` (ligne 212).
  - `SupabaseAdapter.ts:236,247,305` envoient `p_tenant_id` issu de `localStorage.getItem('atlas-tenant-id')` (`DataContext.tsx:59`), **côté client donc falsifiable**.
  - **Impact** : un utilisateur authentifié peut interroger ces RPC avec l'UUID d'un autre tenant et lire **sa balance / ses soldes**. `SECURITY DEFINER` **contourne le RLS**. Fuite de données comptables inter-clients.
  - **Correctif** : ces RPC doivent **ignorer** `p_tenant_id` et utiliser `get_user_company_id()` (comme le font correctement les RPC de la migration 5, ex. `get_trial_balance(p_fiscal_year_id)` → `WHERE je.tenant_id = get_user_company_id()`), ou vérifier `p_tenant_id = get_user_company_id()` et `RAISE EXCEPTION` sinon.
- **VÉRIFIÉ — `import_exchange_rates` (écriture, P0)** : `...000012_atomic_operations.sql:4` `SECURITY DEFINER`, accepte `p_tenant_id` directement (ligne 12) et insère sans vérifier l'appartenance → **écriture inter-tenant** possible.
- **VÉRIFIÉ — RLS globalement présent** : `grep ENABLE ROW LEVEL SECURITY` couvre les tables des migrations 4, 6, 7, 8, 9, 10, 11, 13, 14, 15, 17 (journal_entries, journal_lines, accounts, third_parties, assets, payment_orders, cash_*, purchase_orders, etc.). Pattern `tenant_id = get_user_company_id()` (migration 4, lignes 49-64). C'est correct **pour les accès directs PostgREST** — mais les **RPC SECURITY DEFINER court-circuitent** ce filet (cf. ci-dessus).
- **SUPPOSÉ** : il faudrait vérifier sur la base réelle (via `supabase inspect` / `pg_policies`) que **toutes** les tables récemment ajoutées ont effectivement des **policies** (et pas seulement RLS activé sans policy, ce qui bloquerait tout) — non vérifiable hors base de prod.

#### 3.4.2 Authentification & RBAC client — **P1 (potentiel P0)**
- **VÉRIFIÉ — Bypass RBAC en production via `atlas-demo-mode`** : `RBACGuard.tsx:69` `isDemoMode = sessionStorage.getItem('atlas-demo-mode')==='1'`. Lignes 118 et 126 : les vérifications de rôle et de permission sont **sautées** si `isDemoMode`. **N'importe quel visiteur** peut exécuter `sessionStorage.setItem('atlas-demo-mode','1')` dans la console et accéder à toutes les vues gardées par rôle (admin inclus). Le RLS protège les **données**, mais l'**UI d'administration et les actions front-gated** deviennent accessibles. À conditionner strictement à `import.meta.env.DEV` et retirer du build prod.
- **VÉRIFIÉ — Élévation de privilèges via `user_metadata` (P1)** : `src/lib/supabase.ts:86`, `AuthContext.tsx:138,158,265` : en fallback (profil DB absent / RLS / réseau), le rôle utilisé est `meta.role` lu depuis `user_metadata`. Or `user_metadata` est **modifiable par l'utilisateur** (`supabase.auth.updateUser({ data: { role: 'admin' }})`). Combiné au cache « broken » (`supabase.ts:144`) qui désactive durablement la lecture de `profiles`, un utilisateur peut s'auto-attribuer `admin` côté front.
- **VÉRIFIÉ — Liste blanche d'emails côté client** (`AuthContext.tsx:230`, `VITE_ALLOWED_EMAILS`) : contrôle d'accès dans le bundle JS, **contournable** (le contrôle réel doit être côté Supabase Auth / DB).
- **VÉRIFIÉ — Helpers auth « fail-silent »** : `getUserPermissions()` renvoie `[]` à la moindre erreur (`supabase.ts:167-192`) et `getAll`/`count` du `SupabaseAdapter` avalent les erreurs RLS/404 en `[]`/`0` (`SupabaseAdapter.ts:122,222`). Effet : pannes et refus de permission **invisibles** (pages vides au lieu d'erreurs claires) — masque les incidents et complique l'audit.

#### 3.4.3 Secrets — **P2**
- **VÉRIFIÉ — `.env` NON commité** (gitignore ligne 28). Seul `.env.example` est tracké (`git ls-files`). Bon point.
- **VÉRIFIÉ — Aucune `service_role` key dans le code client** (`grep service_role src packages` = 0). Bon point critique.
- **VÉRIFIÉ — anon key Supabase en dur** : `src/hooks/useLandingContent.ts:4` et fallback `src/lib/supabase.ts:29`. L'anon key est **publique par conception** (mineur), mais mauvaise pratique (devrait venir d'`import.meta.env`). Projet exposé : `vgtmljfayiysuvrcmunt.supabase.co`.

#### 3.4.4 Injection SQL — **OK (P3)**
- **VÉRIFIÉ** : les RPC utilisent des paramètres typés ; `get_account_balance` construit un regex `^(60|61|...)` à partir de `p_prefixes` (`...000009:160`) — risque ReDoS/regex faible si préfixes non contrôlés, mais ce sont des codes de classe SYSCOHADA. Pas de concaténation SQL dynamique dangereuse repérée. Pas de `execute_sql` exposé côté client.

#### 3.4.5 XSS — **OK (P3)**
- **VÉRIFIÉ — 2 usages de `dangerouslySetInnerHTML`**, tous deux dans `src/components/chatbot/components/MessageBubble.tsx:108`, **assainis par `DOMPurify.sanitize(...)`** (ligne 109, import ligne 9). Mitigation correcte. DOMPurify n'est utilisé QUE là — cohérent avec le faible nombre d'injections HTML.

#### 3.4.6 En-têtes de sécurité HTTP — **P2 (A05 Misconfiguration)**
- **VÉRIFIÉ — `vercel.json` ne définit AUCUN en-tête de sécurité** (pas de CSP, X-Frame-Options, X-Content-Type-Options, HSTS, Referrer-Policy, Permissions-Policy). Pour une appli financière : risque de clickjacking / MIME-sniffing.

#### 3.4.7 Dépendances vulnérables — **P1**
- **VÉRIFIÉ (`npm audit`)** :
  - **`vite` (HIGH)** : Path Traversal + Arbitrary File Read via dev server WebSocket — *fix dispo*. (Impact surtout dev, mais le serveur de build est < 6.4.1.)
  - **`xlsx` (HIGH)** : Prototype Pollution + ReDoS — **AUCUN fix disponible**. `xlsx@0.18.5` est utilisé pour import/export (vendor 425 kB). Risque réel sur fichiers Excel importés par l'utilisateur. Envisager `exceljs` ou la version SheetJS officielle hors npm.
  - **`postcss`, `uuid@13`, `ws` (MODERATE)** : fix dispo via `npm audit fix`.

### 3.5 Données & intégrité — **P0 / P1**

- **VÉRIFIÉ — `create()` écrase l'`id` fourni (P1, fausse assurance)** : `DexieAdapter.ts:245` et `SupabaseAdapter.ts:154`. Confirmé. Diverge du test adapter (cf. §3.3). Le code appelant qui pré-génère un `id` (pour des FK croisées avant insert) obtiendra un `id` différent en prod → liens cassés silencieux. (`SupabaseAdapter.createMany:141` respecte l'id `item.id ?? randomUUID()` — incohérence interne.)
- **VÉRIFIÉ — `saveJournalEntry` SaaS n'insère PAS les lignes (P0 fonctionnel)** : `SupabaseAdapter.ts:270-282` insère dans `journal_entries` un objet contenant `entry.lines`, mais les lignes vivent dans la table séparée `journal_lines`. **Aucun insert dans `journal_lines`** → l'écriture est enregistrée **sans ses lignes**, le trigger d'équilibre (`validate_entry_balance` sur `journal_lines`) **ne se déclenche jamais**, balance/grand livre vides. (En pratique le SPA passe surtout par `entryGuard`+Dexie ; mais le chemin SaaS de l'adapter est cassé.)
- **VÉRIFIÉ — Validation Dexie : partiellement INFIRMÉE.** Contrairement au constat « validation seulement côté Supabase » :
  - `DexieAdapter.saveJournalEntry` **valide l'équilibre D=C** (`DexieAdapter.ts:391`) et **le verrouillage de période** (`assertPeriodOpen`, ligne 396/438).
  - Le **vrai chemin d'écriture du SPA** est `src/services/entryGuard.ts > safeAddEntry` : équilibre via `validateJournalEntrySync` (Money), détection de doublon de n° de pièce, contrôle caisse ≥ 0, et **chaîne de hash SHA-256**. C'est une couche applicative solide.
  - **MAIS** le `create()` **générique** (ligne 244) n'a **aucune** validation — toute écriture passant par `create('journalEntries', ...)` (au lieu de `saveJournalEntry`/`safeAddEntry`) contourne tout. À verrouiller.
- **VÉRIFIÉ — Atomicité (ACID) :**
  - **SaaS** : `SupabaseAdapter.transaction()` (ligne 284) = `return fn(this)` — **aucune transaction**. Les opérations multi-tables côté client **ne sont pas atomiques** (le commentaire l'admet). Pas de rollback applicatif.
  - **Local** : `DexieAdapter.transaction()` (ligne 464) ouvre bien une transaction Dexie mais passe `fn(this)` (l'adapter non-transactionnel). Dexie capture les ops via sa transaction-zone (PSD) tant qu'elles ciblent les tables déclarées — fonctionnel mais fragile/implicite.
- **VÉRIFIÉ — Triggers d'intégrité Postgres : SOLIDES** (`...000006_integrity_triggers.sql`) : `CHECK (debit>=0, credit>=0, debit=0 OR credit=0)` (l.11-19) ; trigger DEFERRABLE `validate_entry_balance` (l.43) ; immutabilité des écritures `posted` SYSCOHADA Art.19 (`protect_posted_entries`, l.51) ; `ON DELETE RESTRICT` (l.90) ; `block_closed_period` (l.96) ; protection `audit_logs` (l.119). **Excellent — mais s'applique uniquement au mode SaaS.** Le mode **local Dexie n'a aucune contrainte DB** (seulement l'app-level).
- **VÉRIFIÉ — Hash SHA-256 (`src/utils/integrity.ts`)** : chaînage correct (`previousHash`), 100 % testé. **Limite (P2)** : en mode local, le hash est stocké dans la même IndexedDB que l'utilisateur contrôle → simple **tamper-evidence sans ancre externe** (un attaquant local peut recalculer toute la chaîne après falsification). En SaaS, le hash est calculé par trigger Postgres (mieux). À documenter comme non-preuve d'inviolabilité en local.
- **VÉRIFIÉ — RGPD / `soft_delete_encryption` (migration 17)** : RLS activé sur `bank_accounts` (l.52). Présence d'une migration dédiée — non auditée en profondeur (chiffrement réel des champs PII non vérifié sur base). **SUPPOSÉ partiel.**

### 3.6 Performance — **P2**

- **VÉRIFIÉ — Indexation DB correcte** : migration 4 (l.73-111) + `...000016_performance_indexes.sql` couvrent `(tenant_id, date)`, `(tenant_id, journal)`, `entry_id`, etc. Dexie : index composites `[journal+date]`, `[fromCurrency+toCurrency+date]` (`DexieAdapter.ts:107-123`). Bon.
- **VÉRIFIÉ — Aucune virtualisation (P2)** : `grep useVirtualizer|useReactTable` = **0**, alors que `@tanstack/react-virtual` et `@tanstack/react-table` sont en dépendances. Les grandes listes (grand livre, balance, écritures) **ne sont pas virtualisées** → DOM lourd / freeze sur gros volumes. `useInfiniteQuery/usePagination` : seulement 4 fichiers.
- **VÉRIFIÉ — Lectures « tout en mémoire » (P2)** : `DexieAdapter.getAccountBalance`/`getBalanceByAccount` (l.312, 361) font `journalEntries.toArray()` puis `flatMap` en mémoire à chaque appel → O(n) sur **toutes** les écritures, sans index. Sur des dizaines de milliers d'écritures, lent.
- **VÉRIFIÉ — `entryGuard` contrôle caisse en O(n×m)** (`entryGuard.ts`, boucle sur `allEntries` × `lines` par ligne de caisse) à chaque insertion → coûteux à fort volume.
- **VÉRIFIÉ — Bundle 724 kB** sur le chunk principal (cf. §3.1). Manque de découpage.

### 3.7 Logs & observabilité — **P1**

- **VÉRIFIÉ — Sentry présent mais probablement inactif en prod** : `src/main.tsx:9-28` initialise Sentry **uniquement si `VITE_SENTRY_DSN`** est défini, avec `beforeSend` qui purge `debit/credit/montant/solde` (bonne hygiène). **MAIS `VITE_SENTRY_DSN` est absent de `.env.production`** → Sentry **désactivé en production** sauf si le déploiement l'injecte ailleurs. Trou d'observabilité.
- **VÉRIFIÉ — `console.log` résiduels** : 7 `console.log` (et 13 `console.*`) hors tests dans `src`, dont le **DEBUG de montage** : `ModernDoubleSidebarLayout.tsx:59-60` `console.log('[DEBUG] ... MOUNTED/UNMOUNTED')`. Confirme le constat UX (le bandeau « DEBUG INPUT » n'a PAS été retrouvé — probablement déjà retiré, fichier modifié dans `git status`).
- **VÉRIFIÉ — Audit trail** : table `audit_logs` + hash chain + protection par trigger (migration 6). Cohérent. Pas d'alerting configuré (SUPPOSÉ).

### 3.8 CI/CD — **P1**

- **VÉRIFIÉ — CI non bloquante (`ci.yml`)** : ligne 48 `npm run lint || true` et ligne 51 `npx tsc --noEmit || true` → lint et type-check **n'échouent jamais** le pipeline. **Aucun job de tests** (pas de `vitest run`). CI cosmétique.
- **VÉRIFIÉ — `ci-cd.yml` est OBSOLÈTE/cassé** : il référence `working-directory: backend` et `cache-dependency-path: frontend/package-lock.json` (lignes 27, 30, 49, 52…). **Ces dossiers n'existent pas** (le frontend est à la racine, pas de `backend/`). Vestige d'une ancienne archi Django/monorepo `backend/frontend`. Ce workflow échouerait au `npm ci`. Corrobore le « backend Django fantôme » (cf. §3.9).
- **VÉRIFIÉ — Migrations sans rollback** : `grep "-- DOWN"|"DROP POLICY"|rollback` dans `supabase/migrations/` = **0**. Aucune migration réversible. `ci.yml:30` fait `supabase db push` directement en prod (sur push main) sans étape de revert/backup. Risque en cas de migration fautive.
- **VÉRIFIÉ — Sources de vérité SQL multiples & divergentes** : `supabase/migrations/` **+** `combined_migration.sql` **+** `combined_deploy.sql` **+** `migration_part3_functions.sql`. `combined_migration.sql:485` définit l'ancienne `get_trial_balance(p_fiscal_year_id)` tandis que `combined_deploy.sql:526` a une autre signature. **Drift de migration** → comportement DB dépendant du fichier réellement appliqué. Et migrations **13 et 14 créent toutes deux** `payment_orders`/`cash_register_sessions`/… (doublons).

### 3.9 Code quality — **P1**

- **VÉRIFIÉ — Couche services fantôme (P0 fonctionnel)** : `src/services/api.service.ts:280-298` — `apiService.get/post/put/patch/delete` sont des **stubs** : `get` renvoie toujours `{ data: { results: [], count: 0 } }`, `post/put/patch` renvoient l'input, `delete` renvoie `null`. **Aucun appel réseau.** **29 fichiers** dépendent de ces méthodes (`grep -rl "apiService.\(get\|post\|...\)"` = 29), dont :
  - `financial_statements.service.ts` (**états financiers SYSCOHADA — cœur du produit**) : `@ts-nocheck`, `BASE_PATH='/api/v1/financial_statements'`, commentaire `Backend: apps/financial_statements/urls.py` (backend Django **inexistant**). Tous ses `genererEtatsComplets`/`getBilanComptable`/`getCompteResultat`… retournent **du vide** sans erreur.
  - `useFinancialStatements.ts`, `useDashboard.ts`, `useReports.ts`, `useSecurity.ts`, `accounting.service.ts`, `treasury*.service.ts`, `customer/supplier.service.ts`, `analytics*.service.ts`, etc.
  - **Confirme** le constat de l'audit comptable (stub appelant un Django inexistant) et **l'étend** : c'est tout un pan de services qui est **mort/silencieusement vide**.
- **VÉRIFIÉ — Duplication massive de services** : `treasury.service.ts` + `treasury-advanced` + `treasury-complete` + `treasury-ml` + dossiers `treasury/` et `tresorerie/` ; `customer/supplier/thirdparty/third-party/thirdPartyAccount/thirdparty-complete` (6 variantes tiers) ; `accounting.service.ts` + `accounting-complete.service.ts` + dossier `accounting/`. **63 fichiers de services** à la racine. Les versions « legacy » (stub apiService) coexistent avec les versions `-complete` (Supabase) → confusion sur la source de vérité, risque de brancher la mauvaise.
- **VÉRIFIÉ — `tranprimary` : 158 occurrences dans 100 fichiers** (`Grep` tool). Confirmé. Ex. `ModernButton.tsx:39-40` `hover:-tranprimary-y-0.5` / `active:tranprimary-y-0` : classe Tailwind **invalide** (corruption d'un remplacement global `slate→primary` ayant touché `tran**slate**` → `tran**primary**`). Effet : les `translate` (animations/hover) sont **silencieusement cassés** (Tailwind ignore la classe inconnue). Cosmétique mais répandu.
- **VÉRIFIÉ — TODO/FIXME/HACK/XXX : 66** dans `src`+`packages`.
- **VÉRIFIÉ — HybridAdapter jamais câblé** : `DataContext.tsx:66` (cas `'hybrid'`) retourne `new DexieAdapter()` **sans** paramètres Supabase → le mode hybride **dégrade silencieusement en local-only**, **aucune synchro**. De plus la `syncQueue` du HybridAdapter est **en mémoire** (`HybridAdapter.ts:37`), non persistée → perte de file d'attente au reload (latent).

### 3.10 Documentation technique — **P2**

- **VÉRIFIÉ — README.md présent** (11,9 ko) + `docs/`. Audits antérieurs présents (`AUDIT_REPORT.md`, `AUDIT_EXPERT_2026-03-14.md`, `AUDIT_COMPTABILITE_TIERS_2026-03-13.md`).
- **VÉRIFIÉ — Doc trompeuse** : `financial_statements.service.ts:18` documente un backend `apps/financial_statements/urls.py` qui **n'existe pas**. La doc décrit une architecture Django obsolète. Risque de désorientation des nouveaux développeurs.
- **SUPPOSÉ** : pas de runbook d'incident / de procédure de rollback DB visible. À fournir avant prod.

---

## 4. Matrice risque × impact

| Finding | Probabilité | Impact | Niveau |
|---|---|---|---|
| Fuite inter-tenant via RPC `SECURITY DEFINER` (p_tenant_id client) | Élevée | Critique (confidentialité comptable) | **P0** |
| `apiService` stub → 29 services renvoient du vide (états financiers inclus) | Certaine (si UI branchée dessus) | Critique (chiffres faux/absents) | **P0** |
| `saveJournalEntry` SaaS n'insère pas les lignes | Élevée (chemin SaaS) | Élevé (écritures sans lignes) | **P0** |
| Bypass RBAC via `atlas-demo-mode` en prod | Élevée (trivial) | Élevé (accès UI admin) | **P1→P0** |
| Élévation de privilèges via `user_metadata` | Moyenne | Élevé | **P1** |
| CI non bloquante + `ci-cd.yml` cassé + 0 test en CI | Certaine | Élevé (régressions non détectées) | **P1** |
| Couverture 3,46 % + test adapter divergent | Certaine | Élevé (fausse assurance) | **P1** |
| Dépendances HIGH (`vite`, `xlsx` no-fix) | Moyenne | Moyen-Élevé | **P1** |
| 304 `@ts-nocheck` / 4341 lint / 999 `any` | Certaine | Moyen (maintenabilité, bugs latents) | **P1** |
| 1 violation Rules of Hooks restante | Moyenne | Moyen (crash écran) | **P1** |
| Migrations sans rollback + drift SQL multi-fichiers | Moyenne | Élevé (incident DB) | **P1** |
| Pas d'en-têtes de sécurité (vercel.json) | Moyenne | Moyen (clickjacking) | **P2** |
| Sentry désactivé en prod (DSN absent) | Élevée | Moyen (cécité incidents) | **P1** |
| Pas de virtualisation / lectures O(n) en mémoire | Moyenne | Moyen (perf gros volumes) | **P2** |
| Hash local sans ancre externe | Faible | Moyen (preuve d'inviolabilité) | **P2** |
| `console.log [DEBUG]` résiduels + `tranprimary` ×158 | Certaine | Faible | **P2-P3** |

---

## 5. Angles morts (non vérifiables dans ce contexte)

- **Base de données de production** : impossible de lister `pg_policies` réel — on ne peut garantir que **chaque** table a bien des **policies** (RLS activé sans policy = tout bloqué ; ou policy permissive `USING (true)` non détectée ici). Les RPC réellement déployées dépendent du fichier SQL appliqué (drift §3.8).
- **Charge réelle / volumétrie** : aucun test de charge ; les O(n) en mémoire (§3.6) non éprouvés sur données réelles.
- **Pentest applicatif réel** : pas de test d'intrusion (auth flows, JWT, storage buckets, edge functions `ai-proxy`/`atlas-sso`). Les Edge Functions n'ont pas été auditées en profondeur.
- **Chiffrement RGPD** : `soft_delete_encryption` (migration 17) non vérifié sur base (champs PII réellement chiffrés ?).
- **E2E Playwright** : dossier `e2e/` présent mais **non exécuté** (hors périmètre temps ; nécessite app lancée).
- **`@ts-nocheck`** : impossible de chiffrer les erreurs de type masquées sans retirer les 304 directives (effet de bord massif).
- **Comportement runtime SaaS réel** : l'audit du code SaaS (mismatch camelCase/snake_case dans `getBalanceByAccount`, RPC absentes en migration 5) suggère des bugs runtime non reproduits faute de base Supabase live.

---

## 6. Tableau récapitulatif final

| ID | Sévérité | Domaine | Description | Fichier:ligne | Effort |
|---|---|---|---|---|---|
| T-01 | **P0** | Sécurité / multi-tenant | RPC `get_trial_balance`/`get_account_balance` SECURITY DEFINER font confiance au `p_tenant_id` client → fuite inter-tenant | `supabase/migrations/20240101000009_schema_alignment.sql:146,169,188,212` ; `SupabaseAdapter.ts:236,247` ; `DataContext.tsx:59` | M (réécrire RPC + tests) |
| T-02 | **P0** | Sécurité / multi-tenant | `import_exchange_rates` SECURITY DEFINER accepte `p_tenant_id` sans contrôle → écriture inter-tenant | `supabase/migrations/20240101000012_atomic_operations.sql:12` | S |
| T-03 | **P0** | Code / fonctionnel | `apiService.get/post/...` = stub vide ; 29 services (états financiers SYSCOHADA inclus) renvoient des données vides silencieusement | `src/services/api.service.ts:280-298` ; `financial_statements.service.ts` ; 29 fichiers | L (rebrancher ou supprimer) |
| T-04 | **P0** | Données | `saveJournalEntry` SaaS n'insère pas les `journal_lines` → écritures sans lignes, trigger d'équilibre jamais déclenché | `packages/data/src/adapters/SupabaseAdapter.ts:270-282` | M |
| T-05 | **P1→P0** | Sécurité / RBAC | Bypass total des contrôles de rôle/permission via `sessionStorage 'atlas-demo-mode'='1'` en prod | `src/components/auth/RBACGuard.tsx:69,118,126` | S |
| T-06 | **P1** | Sécurité / auth | Élévation de privilèges : rôle dérivé de `user_metadata` (modifiable par l'utilisateur) en fallback | `src/lib/supabase.ts:86` ; `AuthContext.tsx:138,158,265` | M |
| T-07 | **P1** | CI/CD | CI non bloquante (`lint || true`, `tsc || true`), aucun job de tests | `.github/workflows/ci.yml:48,51` | S |
| T-08 | **P1** | CI/CD | `ci-cd.yml` obsolète référence `backend/` et `frontend/` inexistants → pipeline cassé | `.github/workflows/ci-cd.yml:27,30,49,52` | S |
| T-09 | **P1** | Tests | Couverture globale 3,46 % (seuil 70) ; modules critiques contrepassation 10 %, cession 40 %, TVA 55 % | rapport coverage ; `vite.config.ts:29` | L |
| T-10 | **P1** | Tests | Test adapter diverge des adaptateurs réels (gestion `id`, pas de validation) → fausse assurance | `src/test/createTestAdapter.ts:51,87` vs `DexieAdapter.ts:245`, `SupabaseAdapter.ts:154` | M |
| T-11 | **P1** | Types | 304 fichiers `@ts-nocheck` masquent le typage ; 1 erreur TS résiduelle | 304 fichiers ; `src/contexts/DataContext.tsx:64` | L |
| T-12 | **P1** | Lint | 4341 problèmes (346 erreurs), dont 1 `react-hooks/rules-of-hooks` restante | `npx eslint src` ; fichier page ~ligne 41 | L |
| T-13 | **P1** | Dépendances | `vite` (HIGH, fix dispo), `xlsx` (HIGH, **no fix**), postcss/uuid/ws (moderate) | `package.json` ; `npm audit` | M |
| T-14 | **P1** | CI/CD / DB | Migrations sans rollback + sources SQL multiples divergentes + tables dupliquées (migr 13/14) | `supabase/migrations/` ; `combined_*.sql` | M |
| T-15 | **P1** | Observabilité | Sentry désactivé en prod (`VITE_SENTRY_DSN` absent de `.env.production`) | `src/main.tsx:9-10` ; `.env.production` | S |
| T-16 | **P2** | Données | `create()` écrase l'`id` fourni (incohérent avec `createMany`/test adapter) | `DexieAdapter.ts:245` ; `SupabaseAdapter.ts:154` | S |
| T-17 | **P2** | Données | `transaction()` SaaS = no-op ; pas d'atomicité multi-tables côté client | `SupabaseAdapter.ts:284-288` | M |
| T-18 | **P2** | Architecture | Mode `hybrid` jamais câblé (dégrade en local) ; syncQueue en mémoire non persistée | `DataContext.tsx:66` ; `HybridAdapter.ts:37` | M |
| T-19 | **P2** | Sécurité | `vercel.json` sans en-têtes de sécurité (CSP/X-Frame-Options/HSTS…) | `vercel.json` | S |
| T-20 | **P2** | Perf | Aucune virtualisation (react-virtual/react-table inutilisés) ; lectures O(n) en mémoire | `DexieAdapter.ts:312,361` ; `entryGuard.ts` | M |
| T-21 | **P2** | Intégrité | Hash SHA-256 local stocké dans IndexedDB user-contrôlée (tamper-evidence sans ancre) | `src/utils/integrity.ts` ; `DexieAdapter.ts:470` | M |
| T-22 | **P2** | Code quality | Duplication services (treasury ×4, tiers ×6, accounting ×2) — code mort/legacy | `src/services/` (63 fichiers) | L |
| T-23 | **P2** | Tests | 3 worktrees dans `.claude/worktrees/` scannés par Vitest → triple exécution | `vite.config.ts:17-23` | S |
| T-24 | **P3** | Code quality | `tranprimary` (Tailwind cassé) ×158 dans 100 fichiers | ex. `src/components/ui/ModernButton.tsx:39-40` | M |
| T-25 | **P3** | Observabilité | `console.log('[DEBUG] … MOUNTED/UNMOUNTED')` résiduels | `src/components/layout/ModernDoubleSidebarLayout.tsx:59-60` | S |

---

*Points objectivement solides à préserver : `Money`/Decimal.js (95,9 % couvert), `integrity.ts` (100 %), `entryGuard` (validations métier SYSCOHADA), triggers Postgres d'intégrité (équilibre DEFERRABLE, immutabilité Art.19, blocage période close), RLS de base, DOMPurify, Sentry `beforeSend` qui purge les montants, `.env` non commité, pas de `service_role` côté client.*
