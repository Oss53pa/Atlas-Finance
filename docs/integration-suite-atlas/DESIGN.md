# CDC — Ossature d'intégration de la Suite Atlas (Vague A)

> **Statut** : design doc — 0 code écrit.
> **Date** : 2026-07-21
> **Portée** : Atlas Finance & Accounting (ce dépôt) devient le **Grand Livre souverain**
> de la suite. Les satellites (Atlas Trade / Atlas Procure / Atlas People) alimentent
> le GL par **événements de gestion**, jamais par écritures.

---

## 0. Contexte et décision d'architecture

### 0.1 Situation de départ (mesurée)

| Existant | Réalité |
|---|---|
| `src/config/atlasStudio.ts` | 6 lignes, 4 URLs |
| `supabase/functions/atlas-sso` | 150 lignes — identité seulement |
| `AtlasStudioRedirect.tsx` | redirection navigateur |
| `journal_entries` | **aucune** colonne `source_*` / `idempotency_key` |
| `budget_engagements.external_ref` | ✅ bon pattern, isolé au budget |
| `stock_gl_determination` | ✅ bon pattern (OBYC-like), isolé au stock |

**Conclusion** : la suite est intégrée au niveau *marque + authentification*. Aucun flux
comptable. Le GL est structurellement incapable de tracer une écriture jusqu'à son
document source.

### 0.2 Décision

1. **Le satellite n'émet jamais d'écriture.** Il émet un *fait de gestion* neutre.
2. **Atlas F&A traduit** le fait en écriture, via une table de détermination éditable
   par le comptable — généralisation de `stock_gl_determination`.
3. **Le plan comptable, les journaux, les exercices, les périodes et les règles de
   détermination sont la propriété exclusive de F&A.** Aucun satellite ne code un
   numéro de compte.
4. **Un seul master Tiers** pour la suite (voir L4).

### 0.3 Anti-patterns explicitement interdits

- ❌ Un satellite qui écrit directement dans `journal_entries` / `journal_lines`.
- ❌ Un satellite qui connaît un numéro de compte SYSCOHADA.
- ❌ Un import CSV/Excel comme mécanisme d'intégration nominal.
- ❌ Une base tiers par application.
- ❌ Un satellite qui poste dans une période close.

---

## 1. Lots

| Lot | Titre | Bloquant pour |
|---|---|---|
| **L0** | Prérequis GL : traçabilité, idempotence, performance | tout |
| **L1** | Socle tables d'intégration (`integration_*`) | L2 |
| **L2** | Moteur de posting générique (détermination comptable) | L3 |
| **L3** | Contrats d'événements par satellite | L5 |
| **L4** | MDM Tiers + référentiels partagés | L3 |
| **L5** | Réconciliation auxiliaire ↔ général | livraison |
| **L6** | Statut de période exposé + supervision des flux | livraison |
| **L7** | Chaîne de preuve et gouvernance transverses | différenciation |

---

## L0 — Prérequis Grand Livre

### L0.1 Traçabilité à la source (migration bloquante)

```sql
-- supabase/migrations/XXXXXXXX_integration_source_tracking.sql
-- Additif et idempotent.

alter table public.journal_entries
  add column if not exists source_system   text not null default 'manual',
  add column if not exists source_doc_type text,
  add column if not exists source_doc_id   text,
  add column if not exists idempotency_key text;

alter table public.journal_entries
  drop constraint if exists journal_entries_source_system_check;
alter table public.journal_entries
  add  constraint journal_entries_source_system_check
  check (source_system in ('manual','atlas_trade','atlas_procure','atlas_people',
                           'stock','assets','closure','treasury','import'));

-- Anti-doublon dur : c'est LA garantie d'idempotence du bus.
create unique index if not exists journal_entries_idempotency_uidx
  on public.journal_entries (tenant_id, idempotency_key)
  where idempotency_key is not null;

-- Drill-down inter-app.
create index if not exists journal_entries_source_doc_idx
  on public.journal_entries (tenant_id, source_system, source_doc_id);
```

> ⚠️ **`TABLE_NORMALIZERS`** (`SupabaseAdapter`) doit être étendu pour
> `journal_entries` : `source_system → sourceSystem`, `source_doc_type → sourceDocType`,
> `source_doc_id → sourceDocId`, `idempotency_key → idempotencyKey`. Sans ça les
> champs remontent `undefined` (gotcha connu du projet).

### L0.2 Performance de `safeAddEntry` — **prérequis, pas dette**

État actuel (`src/services/entryGuard.ts:34`) : chaque appel fait
`adapter.getAll('journalEntries')` puis, pour le contrôle caisse 57x, une double
boucle sur **toutes** les écritures × **toutes** leurs lignes.

Coût : `O(n)` lecture réseau + `O(n·m)` CPU **par écriture**. Sur ~530 écritures /
10 300 lignes c'est déjà lourd ; avec 3 satellites en régime nominal (centaines
d'écritures/jour) c'est un mur.

**Corrections exigées avant tout branchement satellite :**

| Contrôle | Aujourd'hui | Cible |
|---|---|---|
| Doublon `entry_number` | scan de tout `getAll` | contrainte `UNIQUE(tenant_id, entry_number)` déjà présente → **laisser la DB rejeter**, catcher l'erreur |
| Solde caisse 57x ≥ 0 | double boucle full-scan | RPC `get_account_balance(tenant_id, account_code, as_of)` |
| Chaîne de hash | `getAll` pour retrouver le précédent | RPC/`select … order by created_at desc limit 1` |
| Verrou de période | 1 `getAll('fiscalYears')` + statut | ✅ correct, garder |

**Cible : `safeAddEntry` en O(1) requêtes indexées, sans `getAll`.**

### L0.3 Séquence de numéro de pièce

La numérotation actuelle est applicative (`generateEntryNumber(prefix, date, index)`).
Sous concurrence multi-satellite, deux flux simultanés peuvent viser le même numéro.

→ **Séquence serveur par (tenant, journal, exercice)** :

```sql
create table if not exists public.entry_sequences (
  tenant_id     uuid not null references public.societes(id),
  journal_code  text not null,
  fiscal_year   text not null,
  last_value    bigint not null default 0,
  primary key (tenant_id, journal_code, fiscal_year)
);

create or replace function public.next_entry_number(
  p_tenant uuid, p_journal text, p_fy text
) returns text
language plpgsql security definer set search_path = public as $$
declare v bigint;
begin
  insert into entry_sequences(tenant_id, journal_code, fiscal_year, last_value)
  values (p_tenant, p_journal, p_fy, 1)
  on conflict (tenant_id, journal_code, fiscal_year)
    do update set last_value = entry_sequences.last_value + 1
  returning last_value into v;
  return p_journal || '-' || p_fy || '-' || lpad(v::text, 6, '0');
end $$;
```

Bénéfice collatéral : solde la dette « numérotation pièce (séquence) » de l'audit
Comptabilité.

---

## L1 — Socle tables d'intégration

```sql
-- 1. Journal des faits de gestion reçus (append-only, source de vérité du bus)
create table if not exists public.integration_events (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references public.societes(id),
  source_system    text not null,
  event_type       text not null,          -- 'sale.invoice.issued', 'payroll.run.validated'…
  event_version    int  not null default 1,
  source_doc_id    text not null,
  idempotency_key  text not null,
  occurred_at      timestamptz not null,   -- date métier (satellite)
  received_at      timestamptz not null default now(),
  payload          jsonb not null,
  payload_hash     text not null,          -- SHA-256 du payload canonique
  status           text not null default 'pending'
                     check (status in ('pending','posted','rejected','ignored','deferred')),
  journal_entry_id uuid references public.journal_entries(id),
  error_code       text,
  error_detail     text,
  attempts         int not null default 0,
  next_attempt_at  timestamptz,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  unique (tenant_id, idempotency_key)
);

create index if not exists integration_events_pending_idx
  on public.integration_events (tenant_id, status, next_attempt_at)
  where status in ('pending','deferred');

-- 2. Détermination comptable générique (généralise stock_gl_determination)
create table if not exists public.posting_rules (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.societes(id),
  event_type     text not null,
  line_role      text not null,     -- 'revenue','receivable','vat_collected','expense','payable',
                                    -- 'gross_salary','social_employee','social_employer','net_payable'…
  match_key      text not null default '',  -- discriminant : famille produit, classe de valorisation,
                                            -- code taxe, rubrique de paie… '' = défaut
  debit_account  text,
  credit_account text,
  analytic       boolean not null default false,
  third_party    boolean not null default false,  -- ligne portant un code tiers
  priority       int not null default 100,
  active         boolean not null default true,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now(),
  unique (tenant_id, event_type, line_role, match_key)
);

-- 3. Dead-letter / supervision
create table if not exists public.integration_dead_letters (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.societes(id),
  event_id    uuid not null references public.integration_events(id),
  reason      text not null,
  payload     jsonb not null,
  resolved    boolean not null default false,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at  timestamptz default now()
);
```

**RLS** : `tenant_id` obligatoire sur les 3 tables, policies SELECT/INSERT/UPDATE/DELETE
complètes (l'audit 360° a relevé des RLS U/D manquantes ailleurs — ne pas répéter).

**Écriture réservée au serveur** : `integration_events` n'est **jamais** insérée depuis
le client. Insertion exclusivement par l'Edge Function `integration-ingest`.

---

## L2 — Moteur de posting générique

### L2.1 Emplacement

`src/services/integration/postingEngine.ts` — signature conforme au pattern projet
(`adapter: DataAdapter` en 1er paramètre).

```ts
export async function postEvent(
  adapter: DataAdapter,
  event: IntegrationEvent,
): Promise<PostingOutcome>;
```

### L2.2 Algorithme

1. **Résolution période** — `getPeriodeStatus(adapter, event.occurredAt)`.
   - `open` → poster à la date métier.
   - `closed | locked` → politique par type d'événement :
     `reject` (défaut) ou `defer_to_next_open` (statut `deferred`, journalisé).
2. **Résolution des règles** — `posting_rules` filtrées sur `event_type`, ordonnées
   par `priority`, `match_key` le plus spécifique gagnant, fallback `match_key = ''`.
   **Aucune règle trouvée → `rejected` avec `error_code = 'NO_POSTING_RULE'`.**
   *Jamais de compte codé en dur dans le moteur.*
3. **Construction des lignes** via `Money` (`src/utils/money.ts`, Decimal.js).
   Arrondi : **largest-remainder** (même helper que la ventilation budgétaire) pour
   que la somme des lignes soit exactement le total du document.
4. **Résolution tiers** → code tiers canonique via le MDM (L4).
5. **Équilibre** — rejet si `Σ débit ≠ Σ crédit` (aucune tolérance).
6. **Écriture** via `safeAddEntry(adapter, entry, { skipSyncValidation: false })`
   avec `sourceSystem`, `sourceDocType`, `sourceDocId`, `idempotencyKey`.
7. **Statut** de l'événement mis à `posted` + `journal_entry_id` renseigné.

### L2.3 Écran d'administration

`/settings/integration/posting-rules` — grille éditable par le comptable :
`event_type × line_role × match_key → compte débit / compte crédit`.

Réutiliser le composant de `/stock/gl-setup` (même ergonomie, même mental model) et
le sélecteur de compte code + libellé (`useAccountNames()`).

### L2.4 Migration du Stock

`stock_gl_determination` est **conservée** (clés SAP BSX/GBB/WRX/PRD/UMB, sémantique
propre) mais le module Stock passe par `postingEngine` pour l'écriture finale, afin
que les mouvements de stock portent eux aussi `source_system = 'stock'` et
l'idempotence. **Aucune régression fonctionnelle attendue** (980 tests verts à tenir).

---

## L3 — Contrats d'événements

### L3.1 Transport

**Edge Function `integration-ingest`** (souveraine, service-role) :

```
POST /functions/v1/integration-ingest
Authorization: Bearer <JWT applicatif satellite>
Idempotency-Key: <clé stable côté satellite>

{ tenant_id, source_system, event_type, event_version,
  source_doc_id, occurred_at, payload }
```

- Authentification **par application** (clé de service par satellite), pas par
  utilisateur final.
- Vérification `tenant_id` ∈ tenants autorisés pour cette clé.
- Insertion `integration_events` en `pending` puis traitement asynchrone.
- Réponse `202 Accepted` + `event_id`. **Rejeu de la même `Idempotency-Key` →
  `200` avec l'`event_id` existant, aucun effet de bord.**

### L3.2 Atlas Trade (ventes)

| Événement | Effet GL |
|---|---|
| `sale.invoice.issued` | 411 D / 701-706 C / 443 TVA collectée C |
| `sale.credit_note.issued` | contrepassation symétrique |
| `sale.payment.received` | 5xx D / 411 C + proposition de lettrage |

Payload minimum — **la donnée fiscale voyage avec l'événement** :

```jsonc
{
  "doc_number": "TRD-2026-0412",
  "doc_date": "2026-07-15",
  "third_party": { "code": "C0042", "name": "…", "tax_id": "…" },
  "currency": "XOF",
  "exchange_rate": 1,
  "lines": [{
    "label": "…", "family": "SERVICES",
    "amount_excl_tax": 1000000,
    "tax": { "code": "TVA18", "rate": 18, "base": 1000000,
             "amount": 180000, "regime": "normal", "exemption_ref": null }
  }],
  "withholdings": [{ "code": "AIRSI", "base": 1000000, "rate": 0.5, "amount": 5000 }],
  "certification": { "provider": "FNE_CI", "number": "…", "signature": "…", "qr": "…" },
  "total_excl_tax": 1000000, "total_tax": 180000, "total_incl_tax": 1180000
}
```

> **La certification fiscale appartient à Trade (émetteur). La déclaration de TVA
> appartient à F&A.** Sans `tax.base / rate / regime / exemption_ref` sur chaque ligne,
> la déclaration sera fausse — le montant seul ne suffit pas.

### L3.3 Atlas Procure (achats)

| Événement | Effet GL |
|---|---|
| `purchase.order.approved` | **aucune écriture** → engagement budgétaire (`budget_engagements.external_ref` existe déjà) |
| `purchase.goods_receipt.posted` | entrée en stock (module Stock) ou charge directe |
| `purchase.invoice.received` | 60x/61x D + 445 TVA déductible D / 401 C |
| `purchase.payment.issued` | 401 D / 5xx C |

Le rapprochement **commande ↔ réception ↔ facture** reste chez Procure. F&A reçoit
le résultat, pas le processus. Solde la dette « génération PO (tenancy Achats) » du
module Stock.

### L3.4 Atlas People (SIRH + paie)

| Événement | Effet GL |
|---|---|
| `payroll.run.validated` | écriture de paie agrégée (jamais bulletin par bulletin) |
| `payroll.payment.issued` | 422 D / 5xx C |
| `payroll.contribution.declared` | échéance sociale → module fiscal |

Rôles de ligne (`line_role`) → comptes SYSCOHADA via `posting_rules` :
`gross_salary` (661), `social_employer` (664), `social_employee` (431/43x),
`income_tax_withheld` (447), `net_payable` (422), `other_deductions` (42x).

**Arbitrage de maîtrise du référentiel de taux** — à trancher, décision de suite :

| Option | Conséquence |
|---|---|
| **A. People est maître** (recommandé) | `taxRegistrySeeds` (barèmes IRPP, CNPS, CMU, FPC) migre côté People ; F&A consomme les montants calculés et ne conserve que les **échéances déclaratives** |
| B. F&A est maître | F&A expose une API de barèmes que People appelle — couplage fort, F&A devient un service de calcul de paie |

L'option A est cohérente avec le principe « le satellite possède son métier ».
Le registre fiscal F&A reste maître pour TVA / IS / patente / retenues à la source.

---

## L4 — MDM Tiers et référentiels partagés

### L4.1 Propriété des référentiels

| Référentiel | Maître | Lecture par |
|---|---|---|
| Plan comptable, journaux, exercices, périodes, règles de posting | **F&A** | tous (lecture seule) |
| Tiers (clients, fournisseurs, personnel) | **F&A** (code tiers canonique) | tous |
| Sections analytiques | **F&A** | tous |
| Devises et cours | **F&A** | tous |
| Catalogue produits / articles | Trade + Stock | — |
| Contrats, effectifs, barèmes de paie | People | — |

### L4.2 Pourquoi F&A est maître du tiers

Le backfill de code tiers du sprint anti-mock (1 868 lignes / 143 tiers) a déjà coûté
cher. Trois bases tiers = trois codes différents pour le même client = lettrage
impossible et balance âgée fausse. **Un seul `third_party_code`, propriété de F&A.**

### L4.3 API de référentiel

Edge Function `integration-reference` (lecture seule, cache agressif) :
`GET /third-parties`, `/accounts`, `/analytic-sections`, `/periods`, `/currencies`.

Création d'un tiers depuis un satellite : `POST /third-parties/request` → **crée le
tiers en F&A** et retourne le code canonique. Le satellite ne génère jamais de code.

---

## L5 — Réconciliation auxiliaire ↔ général

**L'écran qui vend le produit.** Sans lui, la suite n'est pas auditable.

`/accounting/reconciliation-subledger` :

| Compte collectif | Solde GL | Solde auxiliaire (satellite) | Écart | Détail |
|---|---|---|---|---|
| 411 Clients | … | Atlas Trade — créances ouvertes | **0** | ▸ |
| 401 Fournisseurs | … | Atlas Procure — dettes ouvertes | **0** | ▸ |
| 422 Personnel | … | Atlas People — net à payer | **0** | ▸ |
| 3xx Stocks | … | module Stock — valorisation | **0** | ▸ |

Règles :
- Source GL = `glHelpers` (**source unique**, jamais de recalcul maison — règle projet).
- Écritures `validated` uniquement, **drafts exclus**.
- Écart ≠ 0 → liste des documents non intégrés / écritures sans source / événements
  `rejected`, avec action de rejeu.
- Snapshot quotidien horodaté (traçabilité d'audit).

---

## L6 — Statut de période exposé et supervision

### L6.1 API de période

`GET /integration-reference/periods?date=2026-07-15`
→ `{ status: 'open'|'closed'|'locked', fiscal_year, next_open_period }`

Les satellites **interrogent avant d'émettre** et affichent l'avertissement à
l'utilisateur au moment de la saisie, pas trois jours plus tard.

> **Enjeu** : le verrou de clôture réel (`canonicalPeriodStatus` + contrôle dans
> `safeAddEntry`) a déjà été corrigé une fois après avoir été purement cosmétique.
> Si un satellite peut poster dans une période close, **il redevient cosmétique à
> l'échelle de la suite.**

### L6.2 Écran de supervision des flux

`/settings/integration/monitor` : par satellite — événements reçus / postés /
rejetés / différés, âge du plus ancien `pending`, dead-letters, bouton de rejeu.

### L6.3 Mode dégradé (outbox)

- Satellite injoignable → F&A continue de fonctionner (aucun appel synchrone bloquant).
- F&A injoignable → le satellite conserve ses événements et rejoue (l'idempotence
  garantit l'absence de doublon).
- Contexte réseau Afrique de l'Ouest : **non négociable**.

---

## L7 — Chaîne de preuve et gouvernance transverses

C'est l'avantage défendable. Personne d'autre ne peut le formuler.

1. **Le hash du document source entre dans la chaîne du GL** :
   `journal_entries.hash = SHA-256(contenu écriture ‖ previous_hash ‖ event.payload_hash)`.
2. **Drill-down complet** : ligne de Bilan → écriture → événement (`integration_events`)
   → document source (lien profond vers le satellite, via SSO existant).
3. **Bannette unifiée** : les validations Procure (bon de commande), Trade (avoir
   au-dessus d'un seuil), People (run de paie) arrivent dans `/bannette` via le MVA
   (`wf-submit` / `wf-act`). **Un seul parapheur pour toute la suite.**
4. **Effet opposable** : une décision validée dans la bannette produit son effet dans
   le satellite ET son écriture dans le GL, tracés par le même hash.

**Promesse produit rendue vraie de bout en bout :**

> *« Cliquez sur n'importe quel chiffre du Bilan → l'écriture → le fait de gestion
> (facture, réception, bulletin) → la décision qui l'a validée, avec sa signature et
> son hash. »*

---

## 2. Sécurité

- Clé de service **par satellite**, portée `tenant_id` explicite, révocable.
- `integration_events` en **append-only** : pas d'UPDATE du `payload` (seuls `status`,
  `attempts`, `error_*` évoluent) — trigger de protection.
- `payload_hash` calculé serveur, jamais fourni par le client.
- RLS complète (SELECT/INSERT/UPDATE/DELETE) sur les 3 tables.
- Aucune écriture client dans `integration_events` (même politique que `space_*`).

## 3. Tests exigés

| Test | Vérifie |
|---|---|
| Rejeu de la même `Idempotency-Key` | 1 seule écriture |
| Événement sans règle de posting | `rejected`, aucune écriture |
| Événement en période close | `rejected` ou `deferred` selon politique |
| Arrondi de TVA multi-lignes | Σ lignes = total document, au centime |
| Réconciliation 411 | GL = auxiliaire Trade sur jeu de test |
| Chaîne de hash | intègre `payload_hash`, vérifiable |
| Concurrence de numéro de pièce | 2 flux simultanés → 2 numéros distincts |
| Perf `safeAddEntry` | aucun `getAll` — 200 écritures en lot sous seuil |

## 4. Hors périmètre de la Vague A

- DSF, notes annexes automatiques, moteur fiscal multi-pays → **Vague B**
- SYCEBNL, SMT, mode cabinet → **Vague C**
- Connexion bancaire (CAMT.053 / MT940 / mobile money), consolidation, multi-devise
  476/477 → **Vague D**
- Packaging/bundling commercial de la suite → décision produit, hors technique

## 5. Ordre d'exécution recommandé

```
L0 (traçabilité + perf + séquence)      ← rien ne commence avant
   └─ L1 (tables)
        └─ L2 (moteur + écran de règles)
             ├─ L4 (MDM tiers)
             └─ L3 (contrats — 1 satellite pilote : Atlas Trade)
                  ├─ L5 (réconciliation 411)
                  ├─ L6 (période + supervision)
                  └─ L7 (preuve + bannette)
                       └─ L3bis (Procure, puis People)
```

**Satellite pilote recommandé : Atlas Trade.** Cycle le plus court, réconciliation 411
la plus visible, et c'est le prérequis de l'e-invoicing (obligation légale FNE/e-MECeF).
