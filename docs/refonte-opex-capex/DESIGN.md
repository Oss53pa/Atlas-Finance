# Refonte OPEX & CAPEX — Document de conception

> Sous-modules **Gestion Budgétaire OPEX** et **CAPEX** du module Contrôle de Gestion — Atlas FNA / WiseBook.
> Réf. CDC : « CDC Sous-modules Gestion Budgétaire OPEX et CAPEX · Atlas FNA · v1.3 ».
> Statut : **conception — à valider avant tout code**. Base Supabase cible : `vgtmljfayiysuvrcmunt` (Atlas Studio - Logiciels Saas).

---

## 0. Arbitrages verrouillés (décisions utilisateur)

| # | Décision | Impact |
|---|---|---|
| D1 | **Pas de table `org_units`.** La hiérarchie organisationnelle est portée par `sections_analytiques` (axes `centre_cout` / `centre_profit` / `projet`, hiérarchie via `parent_id`). | Le CDC §2 est réinterprété : « centre de coût » = section de l'axe `centre_cout` ; « département / direction » = sections parentes ; owner/contrôleur = `sections_analytiques.responsable` + réglage settings. Le « contrat de comparabilité » (budget imputé = maille du réel) est **déjà** garanti par `ventilations_analytiques`. |
| D2 | **Retrait du module legacy `/budgeting/*`.** | Suppression des écrans `src/pages/budgeting/*` (sauf `BudgetTablePage` qui est déjà branché au nouveau service — à déplacer), du hook `src/hooks/useBudgeting.ts`, des services `budgetAnalysisService.ts` / `analytics-budgeting-taxation.service.ts`, et de la table Dexie legacy `budgetLines`. Redirection `/budgeting*` → `/budget/*`. |
| D3 | **Migrations appliquées en live via Supabase MCP** (`apply_migration`) sur `vgtmljfayiysuvrcmunt`, ET écrites en fichiers `supabase/migrations/` pour la parité repo. | Chaque lot livre son/ses fichier(s) de migration numérotés. Comble aussi la dette « prod-only » (`capex_requests`, `v_capex_by_account`) en versionnant leur définition réelle. |
| D4 | **Design doc d'abord** (ce document), puis exécution lot par lot. Commits locaux ; **push demandé à chaque fois**. | — |

---

## 1. Doctrine reprise du CDC (non négociable)

- **Money.ts** (Decimal.js, ROUND_HALF_UP, tolérance 0,01) pour toute manipulation monétaire applicative. Le CDC mentionne « bigint centimes » : on **conserve l'abstraction `Money`** existante du repo (Decimal), équivalente et déjà éprouvée. Les colonnes DB restent `numeric(18,2)` (aligné `journal_lines`), sauf montants CAPEX déjà en `bigint` (van, montant_approprie…) — on garde ce qui existe.
- **PROPH3T advisory only** : commente/alerte/suggère, ne calcule ni ne modifie aucun chiffre. Tous les calculs (VAN/TRI/payback/PI/ROI, équation budgétaire, scoring) sont code déterministe et testés.
- **Tenancy + RLS 100 %** : lecture filtrée par tenant ; écritures via Edge Functions `service_role` uniquement pour les objets gouvernés (versions verrouillées, engagements, CAR). Voir §3 pour la réconciliation `tenant_id` vs `org_id`.
- **Piste d'audit** : versions verrouillées, approbations, CAR, réaffectations → hash SHA-256 chaîné (`src/utils/integrity.ts` + hash serveur des Edge Functions, cohérent avec `wf_event`).
- **Design** : tokens **Petrol Cream** existants (pétrole `#235A6E`, crème `#F7F5EF`, ambre `#E89A2E` réservé aux montants FCFA en JetBrains Mono via `MoneyValue`). Jamais de palette réimposée.

---

## 2. Réconciliation du référentiel organisationnel (D1 en détail)

Le CDC raisonne en `org_units(direction → departement → centre_cout)` avec mapping 1:1 vers une section analytique. On **supprime la couche org_units** et on projette directement sur l'analytique :

| Concept CDC | Réalité Atlas FNA |
|---|---|
| Centre de coût | `sections_analytiques` d'un `axe` de `type_axe='centre_cout'`, feuille de l'arbre (`parent_id` non nul pointant le département) |
| Département / Direction | Sections parentes (`parent_id`) du même axe, ou sections d'un axe dédié `direction` |
| Centre de profit | `sections_analytiques` d'un `axe` `type_axe='centre_profit'` |
| Projet CAPEX | `sections_analytiques` d'un `axe` `type_axe='projet'` (créée à l'émission du CAR) |
| `budget_owner_user_id` / `budget_controller_user_id` | `sections_analytiques.responsable` (owner) + nouvelle table légère `section_governance` (contrôleur, owner_user_id) — voir §3.1 |
| `v_budget_rollup` (agrégation ascendante) | Vue récursive sur `parent_id` (CTE) — voir §4 |

**Conséquence** : la maille budgétaire du CDC `compte × période × centre de coût [× projet]` devient `account_code × period × section_id [× capex section projet]`. C'est exactement la granularité de `budget_lines` + `budget_line_periods` + `ventilations_analytiques`. Zéro re-saisie du réel.

---

## 3. Modèle de données cible

### 3.0 Réconciliation tenancy (à trancher avec l'utilisateur — voir Questions ouvertes)

- `budget_*`, `sections_analytiques`, `ventilations_analytiques`, `capex_requests` → **`tenant_id uuid → societes`** (via `get_user_company_id()`).
- `fna_capex_*`, `fna_car` → **`org_id text`** (scoping `fna_user_orgs` / `fna_auth_org_ids`, cf. commit `41685e1`).

**DÉCISION (validée)** : **tout est standardisé sur `tenant_id`**. Les nouvelles tables sont scopées `tenant_id` ET les tables `fna_capex_*` / `fna_car` existantes sont **migrées de `org_id text` vers `tenant_id uuid → societes`** (RLS `get_user_company_id()`), avec backfill `org_id → tenant_id` et adaptation du service `capexCarService.ts` (qui résout aujourd'hui via `fna_auth_org_ids`). Migration `fna_*` planifiée : préparation en L1 (colonne `tenant_id` ajoutée + backfill), bascule RLS/service au plus tard en L5 quand le CAPEX est refondu. Plus de scoping `org_id` dans le module cible.

### 3.1 Socle (Lot L1) — existant étendu

**`budget_campagnes`** — *nouvelle*
```
id, tenant_id→societes, fiscal_year_id→fiscal_years, libelle,
statut text CHECK (preparation|ouverte|consolidation|arbitrage|votee|cloturee) default 'preparation',
date_ouverture date, date_limite_soumission date, date_vote date,
taux_indexation_defaut numeric(6,4), created_at
```

**`budget_versions`** — *étendue* (colonnes ajoutées)
```
+ campagne_id uuid→budget_campagnes (nullable)
+ numero int not null default 1
+ hash_sha256 text            -- posé au verrouillage, chaîné
+ verrouille_par uuid, verrouille_le timestamptz
  statut: on étend le CHECK → (brouillon|soumis|approuve|verrouille|obsolete)
  type:   on étend le CHECK → (initial|revise|forecast|atterrissage)
  est_en_vigueur := réutilise `is_active` (renommage logique, colonne inchangée)
```
Trigger `budget_guard_locked_version()` **déjà présent** (bloque les edits sur version verrouillée) — on le renforce (statut `verrouille`/`obsolete`).

**`section_governance`** — *nouvelle* (remplace budget_owner/controller du CDC)
```
id, tenant_id, section_id→sections_analytiques UNIQUE,
owner_user_id uuid→profiles, controller_user_id uuid→profiles, created_at, updated_at
```

**`sections_analytiques`** — inchangée (déjà `parent_id`, `responsable`, `nature`). On ajoute au besoin un flag `est_centre_profit boolean default false` (sinon dérivé de `axe.type_axe`).

### 3.2 Engagements & liaison compta (Lot L2) — *cœur manquant*

**`budget_engagements`** — *nouvelle* (registre pivot, §3.3 CDC)
```
id, tenant_id, source CHECK(external|manuel), external_ref text,
account_code text, section_id→sections_analytiques, capex_section_projet_id→sections_analytiques (nullable),
periode date,               -- 1er du mois d'imputation
fournisseur_libelle text, reference_document text,
montant_initial numeric(18,2), montant_facture numeric(18,2) default 0, montant_degage numeric(18,2) default 0,
statut CHECK(ouvert|partiellement_facture|solde|annule) default 'ouvert',
created_at,
UNIQUE(tenant_id, source, external_ref)      -- idempotence ingestion externe
CHECK montant_initial - montant_facture - montant_degage >= 0
```

**`engagement_rapprochements`** — *nouvelle* (§8.2 CDC, lien N↔N écriture↔engagement)
```
id, tenant_id, journal_line_id→journal_lines, engagement_id→budget_engagements,
montant numeric(18,2), mode CHECK(saisie|differe|lettrage) default 'saisie', created_at,
UNIQUE(journal_line_id, engagement_id)
```

**`journal_lines`** — *étendue* : `+ engagement_ref text` (numéro PO/contrat saisi côté compta ; matching différé sur cette référence). **Non intrusif** : colonne nullable, aucune logique comptable modifiée.

**`procurement_mappings`** + **`procurement_inbox`** — *nouvelles* (connecteur externe, §6). Inbox = file `a_qualifier` pour les lignes sans mapping résolu.

**`budget_checks`** — *nouvelle* (journal des appels Budget Check API, §4.2 ; preuve d'audit + `override_token`).

### 3.3 OPEX élaboration / revenus (Lots L3–L4)

**`budget_lines`** — *étendue*
```
+ nature text CHECK(opex|capex|revenus) default 'opex'   -- remplace/complète budget_type
+ capex_request_id uuid→capex_requests (nullable, obligatoire si nature='capex')
+ source_prefill text CHECK(manuel|n1|n1_indexe|zbb|contrat|copie_version|import|car)
  budget_type conservé et dérivé (exploitation↔opex/revenus, investissement↔capex) pour compat vues existantes
```
`budget_line_periods` inchangée (phasage 12 mois).

**`budget_lignes_volumes`** — *nouvelle* (§14.1, revenus volumes×prix)
```
id, tenant_id, budget_line_id→budget_lines, period smallint, quantite numeric(14,3), prix_unitaire numeric(18,2)
-- montant recalculé serveur = quantite × prix_unitaire, écrit dans budget_line_periods.montant_prevu
```

**`budget_virements`** — *nouvelle* (§12, virements de crédits à somme nulle).

**`compte_groupes`** — *nouvelle* (§13.3, regroupements de gestion libres comptes→familles).

### 3.4 CAPEX Business Case & CAR (Lots L5–L6)

Le `capex_requests` actuel = un enregistrement mono-champ (`business_case text`). Le CDC veut un **BC structuré 8 sections** + CAR distinct. On garde `capex_requests` comme **table BC** et on la complète avec des tables satellites, sans casser l'existant :

**`capex_requests`** — *étendue* (BC)
```
+ demandeur_id uuid→profiles, sponsor_id uuid→profiles
+ categorie CHECK(croissance|remplacement|conformite_reglementaire|securite_hsse|productivite|it_digital|urgence)
+ obligatoire boolean default false           -- non-arbitrable (conformité/sécurité)
+ urgence_sous_motif text, urgence boolean default false
+ classe_immo text                            -- 21..24 SYSCOHADA cible
+ statut: étendu → (brouillon|soumis|en_priorisation|approuve|approuve_avec_conditions|ajourne|rejete|car_emis|clos)
+ conditions jsonb                            -- checklist bloquante avant CAR
+ hash_sha256 text                            -- figé à l'approbation
```
(`business_case text` conservé comme narratif section 3 ; VAN/TRI/etc. déjà présents.)

**`capex_bc_lignes_cout`** — *nouvelle* (§16.1 §5) : coûts détaillés + phasage pluriannuel, `capitalisable boolean`, `type_cout`, `exercice_id`, `periode_prevue`.

**`capex_bc_cashflows`** — *nouvelle* (§16.1 §6) : flux annuels sur horizon (source unique des calculs `capexMetrics.ts`, remplace le champ `cashflows jsonb` par des lignes auditables ; le jsonb reste en cache calculé).

**`capex_bc_risques`** — *nouvelle* (§16.1 §8) : registre P×I.

**`capex_scoring_criteres`** + **`capex_priorisation_scenarios`** — *nouvelles* (§17, scoring paramétrable + scénarios d'arbitrage).

**`capex_enveloppes`** — *nouvelle* (§17.3, enveloppe CAPEX annuelle par direction : votée/réservée/appropriée/disponible/réserve).

**`fna_car`** — *étendue* : `+ tranche_exercice_id`, `+ montant_tranche bigint`, `+ date_validite`, `+ urgence boolean`, `+ hash_sha256`. + **`capex_reaffectations`** (§18.4, registre source→cible).

**`capex_projets`** — *nouvelle* (§20.1) : projet créé à l'émission du CAR (code `CPX-…`), lié BC+CAR, porte `section_analytique_projet_id`. C'est l'ancrage du réalisé (GL classe 2/23 ventilé projet) et de la courbe en S.

### 3.5 Reporting (Lot L7)

**`budget_snapshots`** — *nouvelle* (§24) : snapshot figé + hashé de l'exécution budgétaire à chaque clôture mensuelle ; les états sur période close relisent le snapshot (immuable, rejouable).
Publication dans le `reporting_catalog` existant (vues + gabarits).

### 3.6 Tables/écrans supprimés (D2)
- DB : Dexie `budgetLines` (legacy plat). La table Supabase legacy `budget_lines` plate a déjà été remplacée par le modèle normalisé (mig `…038`).
- Front : `src/pages/budgeting/*` (sauf logique réutilisable de `BudgetTablePage`), `src/hooks/useBudgeting.ts`, `src/services/budgetAnalysisService.ts`, `src/services/analytics-budgeting-taxation.service.ts`.

---

## 4. Moteur d'équation budgétaire

**Invariant central** : `Disponible = Budget en vigueur − Engagé (net des factures) − Réalisé (GL)`, à la maille `account_code × period × section_id [× projet]`.

- Le CDC prévoit une **materialized view `mv_budget_execution`**. Réalité : l'existant s'appuie sur des **vues live** (`v_budget_vs_actual`, `v_actual_by_section`) sans engagement. Choix : **étendre les vues live** en y jointant `budget_engagements` (LEFT JOIN LATERAL sur la maille) plutôt qu'introduire une MV à rafraîchir — cohérent avec le pattern actuel, pas de job de refresh, drill-down immédiat. Si perf insuffisante à volumétrie réelle (10 319 journal_lines aujourd'hui → OK), bascule ultérieure en MV + `pg_cron`.
- Polarité par nature : charge (classe 6/2/23) favorable si réel < budget ; produit (classe 7) favorable si réel > budget. Gérée par `nature` dans les vues et composants.
- **`v_budget_rollup`** : CTE récursive sur `sections_analytiques.parent_id` → agrégation ascendante centre→département→direction→société. Aucun budget saisi aux niveaux supérieurs.
- **Budget Check API** (`budget-check` Edge Function) : `{compte, section, projet, periode, montant} → {decision ok|warning|blocked, disponible, seuil, override_token?}`, journalisé dans `budget_checks`. Politique par nature via settings `budget_control_policy_{opex|capex|revenus} ∈ {bloquant|avertissement|passif}`.

Paramètres tenant (table `settings`, clés JSON) : `procurement_mode` (external|manual_only|hybrid), `budget_control_policy_*`, `wacc` (défaut 0.12 — noter : `capex_requests.taux_actualisation` défaut 0.10 aujourd'hui ; on aligne sur un settings global avec override par BC), `capex_contingency_pct` (défaut 0.075), `capex_invoice_requires_ref`, `car_validite_mois` (défaut 12), tolérances prix/dépassement.

---

## 5. Circuits Moteur de Validation (MVA)

Réutilisation du moteur `wf_*` existant (pas de nouveau moteur). Chaque circuit = un `wf_definition` (name) + `wf_stage` + `wf_rule`, **seedé par tenant via migration**. `object_type` ajoutés à `wf_object_registry`.

| Circuit (`wf_definition.name`) | `object_type` | Routage (stages) |
|---|---|---|
| `BUD-SOUMISSION` | budget_version | owner → contrôleur → direction |
| `BUD-VOTE` | budget_version | DAF → DG |
| `BUD-REVISION` | budget_version | contrôleur → DAF (→ DG si variation > seuil via `wf_rule`) |
| `BUD-VIREMENT` | budget_virement | owner cédant + bénéficiaire → contrôleur |
| `BUD-DEROGATION` | budget_check | owner N+1 → contrôleur |
| `BC-APPROBATION` | capex_bc | matrice par seuil (`wf_rule` amount_xof) |
| `CAR-EMISSION` | capex_car | DAF |
| `CAR-SUPPLEMENT` | capex_car | matrice +1 niveau |
| `CAR-URGENCE` | capex_car | DAF + DG (SLA 48 h) |
| `CAR-REAFFECTATION` | capex_reaffectation | niveau matriciel du montant réaffecté + avis sponsor source |

Front : `wfSubmit`/`wfAct` (`src/features/validation/mvaService.ts`), bannette `/bannette` existante. La matrice CAPEX actuelle (`fna_capex_approval_matrix` + `capexCarService.recordApproval`) est **conservée** pour la compat, mais les nouveaux circuits passent par MVA (source unique de gouvernance). Convergence à préciser en L5.

---

## 6. Edge Functions (par lot)

Toutes : vérif JWT tenant + rôle, mutations transactionnelles, `audit_log` chaîné, réponses typées (zod).

| Fonction | Lot | Rôle |
|---|---|---|
| `budget-version-lifecycle` | L1 | soumission/approbation/verrouillage + hash + mise en vigueur |
| `budget-line-upsert` | L3 | écriture lignes (statut version, classe compte, droits) |
| `budget-import` | L3 | pipeline import 3 passes, rapport, tout-ou-rien |
| `budget-prefill` | L3 | méthodes de pré-remplissage |
| `budget-virement` | L4 | virement à somme nulle |
| `budget-volumes-upsert` | L4 | revenus volumes×prix (recalcul serveur) |
| `budget-check` | L2 | contrôle de disponible + journalisation + override_token |
| `engagement-manual` | L2 | saisie manuelle (rôles restreints, récurrence) |
| `engagement-match-invoice` | L2 | rapprochement à la validation compta (bascule engagé→réalisé) |
| `engagement-reconcile` | L2 | lettrage a posteriori |
| `procurement-ingest` / `procurement-inbox-resolve` | L2 | connecteur externe + qualification |
| `bc-lifecycle` | L5 | cycle BC, calculs `capexMetrics`, hash |
| `capex-scoring` | L5 | scores priorisation + scénarios + PV |
| `car-emission` / `car-supplement` / `car-emergency` / `car-reallocate` | L5–L6 | émission/supplément/urgence/réaffectation (transactions atomiques) |
| `capex-commissioning` | L6 | mise en service : fiche immo + proposition écriture 23→2x |
| `budget-alerts-cron` | L4/L6 | moteur d'alertes (OPX-*, CPX-*, REV-*) |
| `budget-year-end-carryover` | L6 | dégagement/report fin d'exercice |
| `budget-snapshot` | L7 | snapshot mensuel figé + publication Reporting |

> Note : ~22 Edge Functions. Beaucoup de logique pourra d'abord vivre côté service (`adapter`) avec RLS write restreinte, puis être durcie en Edge Function `service_role` là où la souveraineté est requise (verrouillage, engagement, CAR). Priorité Edge Function : L2 (engagement/check) et L5–L6 (CAR).

---

## 7. Routes & écrans cibles (unification)

```
/budget                     Hub (sélecteur exercice/version/campagne)          [L1]
/budget/campagne            Pilotage campagne (contrôleur)                     [L3]
/budget/saisie/:sectionId   Grille matricielle OPEX (BudgetMatrixGrid)         [L3]
/budget/import              Import (gabarit, mapping, rapport)                 [L3]
/budget/opex                Dashboard OPEX (vues §13)                          [L4]
/budget/opex/analyse        Vues croisées (heatmap, waterfall, tops)          [L4]
/budget/revenus             Budget produits (volumes×prix, suivi)             [L4]
/budget/pnl                 Compte de résultat budgétaire                     [L4]
/budget/engagements         Registre des engagements                          [L2]
/budget/inbox               File de qualification connecteur                  [L2]
/budget/lettrage            Lettrage budgétaire a posteriori                   [L2]
/budget/virements           Virements de crédits                              [L4]
/budget/versions[/:id]      Versions (existant, conservé/enrichi)             [L1]
/budget/ventilation         Moteur de ventilation (existant, conservé)        [—]
/capex                      Portefeuille CAPEX (pipeline stage-gate)          [L5]
/capex/bc/new /capex/bc/:id Business Case 8 sections (BCStepper)              [L5]
/capex/priorisation         Arbitrage comité (ranking, flottaison)            [L5]
/capex/car/:id              Fiche CAR                                          [L5]
/capex/projet/:id           Cockpit projet (courbe en S)                      [L6]
/capex/enveloppe            Enveloppe annuelle par direction                  [L5]
/capex/pir/:id              PIR                                                [L6]
/budget/admin               Seuils, matrices, politiques, scoring, mappings   [L1/L5]
/budgeting*                 → redirect /budget/*                              [L1, D2]
```

Composants clés (tokens Petrol Cream, réutilisation `DataPageLayout`/`DataTable`/`PageHeaderActions`/`MoneyValue`) : `BudgetMatrixGrid`, `BudgetImportWizard`, `BudgetEquationBar`, `DrilldownDrawer`, `SectionTreeTable` (ex-OrgTreeTable), `SCurveChart`, `VarianceWaterfall`, `ConsumptionHeatmap`, `PriorityWaterline`, `BCStepper`, `PriorityBoard`, `EngagementRefPicker`, `PnLBudgetTable`, `ApprovalTimeline` (réutilisé MVA).

---

## 8. Séquencement des lots

| Lot | Contenu | Livrables | Dépend de |
|---|---|---|---|
| **L1 — Socle & référentiel** | Campagnes, versions immuables (hash/verrouillage/mise en vigueur), gouvernance sections (owner/contrôleur), hub `/budget`, retrait legacy `/budgeting` + redirections, settings module. | migrations campagnes+versions+section_governance ; `budget-version-lifecycle` ; hub + admin seuils ; suppression Module B. | — |
| **L2 — Engagements & liaison compta** | Registre engagements, rapprochements, `engagement_ref` sur journal_lines, connecteur (ingest/inbox/mappings), Budget Check API, `BudgetEquationBar` dans l'écran d'écriture, lettrage a posteriori. | migrations engagements ; Edge Functions engagement-*/procurement-*/budget-check ; écrans `/budget/engagements` `/budget/inbox` `/budget/lettrage`. | L1 |
| **L3 — OPEX élaboration** | `BudgetMatrixGrid`, méthodes de pré-remplissage, import 3 passes, cycle campagne (préparation→vote). | Edge Functions budget-line-upsert/import/prefill ; écrans saisie/import/campagne. | L1 |
| **L4 — Vues, alertes, revenus, P&L** | Vues §13 (temporelles/org/comptables/croisées), waterfall/heatmap/tops, virements, budget revenus volumes×prix, P&L de gestion, alertes OPX/REV. | vues SQL + rollup ; Edge Functions virement/volumes/alerts ; écrans opex/analyse/revenus/pnl/virements. | L2, L3 |
| **L5 — CAPEX BC/priorisation/CAR** | BC 8 sections structuré, tables coûts/cashflows/risques, scoring + arbitrage portefeuille, enveloppes, émission CAR (+ supplément/urgence/réaffectation), convergence MVA. | migrations BC/CAR/enveloppes ; Edge Functions bc-lifecycle/capex-scoring/car-* ; écrans capex/bc/priorisation/car/enveloppe. | L1, L2 |
| **L6 — Exécution & mise en service** | Cockpit projet courbe en S, réalisé GL classe 2/23 par section projet, alertes CPX, mise en service → fiche immo + écriture 23→2x, PIR, dégagement fin d'exercice. | Edge Functions capex-commissioning/carryover ; écrans projet/pir. | L5 |
| **L7 — Reporting & recette** | Snapshots figés, publication `reporting_catalog`, section Budget du Monthly Report, exports XLSX/PDF, suite d'invariants + protocole recette R1–R19. | Edge Function budget-snapshot ; tests invariants ; recette go/no-go. | L1–L6 |

---

## 9. Invariants & recette (repris du CDC §26, adaptés)

Tests automatisés (Vitest) obligatoires, franc près (Money, tolérance 0,01) :
1. `disponible = budget − engagé − réalisé` à toute maille.
2. Σ engagés restants = Σ (externes nets) + Σ (manuels nets).
3. Aucune dépense simultanément engagée et réalisée ; bascule atomique à la validation compta.
4. Une seule version `est_en_vigueur` par exercice ; version verrouillée immuable.
5. Virements à somme nulle.
6. Σ budget_lines CAPEX d'un projet ≤ montant approprié + suppléments.
7. Aucune ligne CAPEX sans CAR ; aucun CAR sans BC approuvé ; CAR ≤ BC approuvé.
8. Rollup : total parent = Σ enfants.
9. Import : aucune écriture partielle silencieuse ; hash fichier journalisé.
10. Réconciliation GL : Σ réalisé vues budget = balance GL même périmètre.
11. Enveloppe : votée = réservée + appropriée + disponible + réserve.
12. Snapshots immuables (hash vérifié).
13. Hash chain vérifiable.

Recette R1–R19 : exécutée en L7 sur jeu d'essai (tenant test, 2 directions, 8 sections, 5 BC forçant l'arbitrage). **Go** si tout vert ; tout écart monétaire ≠ 0 = no-go.

---

## 10. Risques & points d'attention

- **Perf vues live + engagements** : acceptable à la volumétrie actuelle ; prévoir bascule MV si dégradation.
- **Réconciliation tenancy `tenant_id`/`org_id`** (§3.0) : **résolu** — tout en `tenant_id`, `fna_*` migrées (backfill + bascule RLS/service en L1→L5). Risque : le service `capexCarService` et le commit récent `41685e1` (scoping org_id) sont réécrits ; tester la non-régression du CAPEX existant.
- **Convergence matrice CAPEX existante ↔ MVA** : deux mécanismes d'approbation ; MVA devient la source, l'ancien reste lisible. À arbitrer en L5.
- **Migrations live** : chaque `apply_migration` touche la prod ; on annonce avant, on garde le fichier repo, idempotence des seeds MVA par tenant.
- **`capex_requests` mono-champ → BC structuré** : migration additive (satellites), pas de perte de données existantes.
- **Money bigint vs Decimal** : on garde Decimal (`Money`) ; les colonnes `bigint` CAPEX existantes conservées (centimes) avec conversion aux bornes.

---

## 11. Protocole opérationnel de migration (adopté)

**Migrations appliquées directement en prod, en mode défensif** (décision utilisateur : pas de ressource payante, donc pas de branche Supabase) :
1. Chaque migration est **purement additive et idempotente** : `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`. **Jamais de `DROP` destructif** sur des données existantes.
2. `apply_migration` sur prod (`vgtmljfayiysuvrcmunt`), puis **requêtes de contrôle immédiates** (schéma, RLS, comptages) pour prouver le résultat.
3. Fichier `supabase/migrations/` committé en parallèle (parité repo↔prod).
4. La seule opération à risque — re-key `fna_* : org_id → tenant_id` (L5) — se fait en **`ADD COLUMN tenant_id` + backfill via mapping `fna_org → societe` + bascule RLS/service, en CONSERVANT `org_id`** jusqu'à validation complète (réversible ; drop de `org_id` seulement en toute fin, une fois le CAPEX non-régressé prouvé).
5. Élargissements de `CHECK` : `DROP CONSTRAINT` + `ADD CONSTRAINT` du seul check concerné (non destructif de données), ou colonne miroir si doute.

**Découverte tenancy (critique, cf. investigation)** : deux modèles disjoints coexistent —
`tenant_id uuid → societes` (via `profiles.company_id`, utilisé par `journal_lines`/`budget_*`/`sections_analytiques`/`capex_requests`) et `org_id text` (`org-xxxx` → `fna_organizations` via `fna_user_orgs`, utilisé par `fna_car`/`fna_capex_*`). **Les `org_id` ne mappent à aucun `societes.id`** (0 correspondance). La migration `fna_* → tenant_id` nécessite donc de **définir explicitement une table de correspondance `fna_org → societe`** (3 orgs / 2 sociétés → traitable), pas un simple re-keying.

**4 garde-fous avant/pendant L1** :
- G1 — Vérifier que `sections_analytiques` (arbre org) est peuplé sur le tenant cible ; sinon L1 inclut un écran de seeding/onboarding de l'arbre (prérequis, sinon module data-gated).
- G2 — Migrations `fna_*` et colonne `journal_lines.engagement_ref` testées sur branche Supabase, merge après vérif.
- G3 — Table de correspondance `fna_org → societe` définie avant la bascule tenancy (L5, préparation L1).
- G4 — Séquencement **par valeur** : L1→L4 fermes ; L5→L7 (gouvernance CAPEX lourde) en phase 2, profondeur confirmée selon les process réels. Ne pas construire les ~22 Edge Functions d'emblée : démarrer en service + RLS restreinte, durcir en Edge Function `service_role` là où la souveraineté l'exige (verrouillage, engagement, CAR).

## Questions ouvertes — RÉSOLUES

1. **Tenancy** : ✅ tout standardisé sur `tenant_id` ; `fna_capex_*` / `fna_car` migrées de `org_id` vers `tenant_id` (backfill + bascule RLS/service, L1→L5).
2. **WACC** : ✅ settings global `wacc` = 0,12 (défaut CDC), override par BC via `capex_requests.taux_actualisation`.
3. **Push** : ✅ groupé — proposé quand un ensemble cohérent est prêt (commits locaux au fil de l'eau, push sur demande).
4. **Legacy `/budgeting`** : ✅ retiré et redirigé (D2).
