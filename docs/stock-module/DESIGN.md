# Module Stock (Gestion des Stocks & Magasins) — Document de conception

> Nouveau module **Stock / Inventory Management** d'Atlas FNA / WiseBook, aligné sur **SAP MM (Materials Management)** et adapté au plan comptable **SYSCOHADA révisé**.
> Statut : **conception — à valider avant tout code**.
> Base Supabase cible : `vgtmljfayiysuvrcmunt` (Atlas Studio - Logiciels Saas).

---

## 0. Arbitrages verrouillés (décisions utilisateur)

| # | Décision | Impact |
|---|---|---|
| D1 | **Profondeur : SAP MM complet** — multi‑magasins + emplacements, **gestion des lots (batch)** et des **numéros de série**. | Le stock n'est plus un scalaire par article : il devient un **quant** = (article × magasin × emplacement × lot × n° série × statut). Schéma segmenté façon SAP. |
| D2 | **Postings GL SYSCOHADA automatiques par type de mouvement**, via une **table de détermination des comptes** (analogue de l'OBYC SAP). | Chaque mouvement valorisé génère l'écriture réelle au grand livre (adapter → `journalEntries`/`journal_lines`), soumise au **verrou de clôture** (`canonicalPeriodStatus`, `safeAddEntry`). |
| D3 | **Design doc d'abord** (ce document), puis exécution **lot par lot**. | Commits locaux ; **push demandé à chaque fois** (règle projet). Migrations **live via Supabase MCP** ET versionnées en `supabase/migrations/`. |
| D4 | **Nouveau socle de données** — les tables `inventory_items` / `stock_movements` actuelles sont inadaptées (mono‑emplacement ; `stock_movements` détourné d'un contexte maintenance : `part_id NOT NULL`, `work_order_id`, colonnes en double). | On crée un schéma `stock_*` propre. `inventory_items`/`stock_movements` sont **dépréciés** (conservés en lecture le temps d'une éventuelle reprise, puis retirés — voir §13). |
| D5 | **Périmètre = négoce + production** (SYSCOHADA classes 31→38). | Le module gère marchandises (31), matières & fournitures (32/33), produits finis/en‑cours (34/36) et emballages. Inventaire **permanent** (perpetual) comme mode nominal, avec régularisation d'inventaire intermittent possible à la clôture. |
| D6 | **Activation conditionnelle — une entreprise sans classe 3 reste muette** (§1bis). | Si le tenant ne gère pas de stocks (aucun compte de classe 3 utilisé / toggle désactivé), le module **n'apparaît pas** (menu masqué), ne poste **aucune** écriture, et ses blocs/dashboards de reporting sont masqués. Aucun bruit, aucun écran vide imposé. |

---

## 1. Doctrine (non négociable)

- **`Money` (Decimal.js, ROUND_HALF_UP, tolérance 0,01 FCFA)** pour toute quantité valorisée et tout montant. Colonnes DB `numeric(18,3)` pour les quantités (fractions d'UoM), `numeric(18,2)` pour les montants (aligné `journal_lines`).
- **Services `(adapter: DataAdapter, …)`** en 1er param ; composants via `useData()`. Aucun accès Supabase direct dans les composants.
- **Tenancy + RLS 100 %** : chaque table `stock_*` porte `tenant_id`, RLS `tenant_id = get_user_company_id()` (SELECT/INSERT/UPDATE/DELETE).
- **Verrou de clôture respecté** : toute écriture GL issue d'un mouvement passe par le chemin `safeAddEntry` (refus si la période est `cloturee`/`closed`). Un mouvement daté dans une période verrouillée est refusé.
- **Piste d'audit** : chaque mouvement de stock et chaque document d'inventaire est **immuable** une fois validé (statut `posted`), horodaté, tracé (`created_by`), avec hash SHA‑256 chaîné (`src/utils/integrity.ts`) sur les documents validés.
- **PROPH3T advisory only** : suggère (réappro, écarts anormaux, articles dormants) mais ne calcule ni ne poste rien ; tous les calculs (valorisation CUMP/FIFO, écarts, ABC, rotation) sont du code déterministe **testé**.
- **Design** : tokens **Petrol Cream** existants (pétrole `#235A6E`, crème, ambre `#E89A2E` réservé aux montants FCFA via `MoneyValue`). Libellés de compte affichés à côté des n° (`getAccountLabel`).

---

## 1bis. Activation conditionnelle — « reste muet » sans classe 3

Une entreprise de **prestation de services** (ou toute entité qui ne tient pas de stock) ne doit **pas** voir le module, ni recevoir d'écritures de stock. Règle :

- **Flag d'activation** `settings['stock.enabled']` (bool), avec **auto‑détection par défaut** :
  - `enabled = true` si le plan comptable du tenant contient des **comptes de classe 3** utilisés (présence d'un compte dont le `code` commence par `3` dans `accounts`), **ou** s'il existe au moins un `stock_materials`/mouvement.
  - Sinon `enabled = false` → module **muet**.
- **Effets quand `false`** :
  - **Navigation** : l'entrée « Stocks » (et toutes ses sous‑pages) est **masquée** du menu latéral. Les routes restent déclarées mais renvoient un écran « module non activé » avec un bouton *Activer la gestion des stocks* (réservé aux rôles admin) — jamais d'erreur, jamais d'écran vide subi.
  - **Comptabilité** : `postMovement` ne s'exécute pas (aucune écriture) tant que le module est inactif ; l'activation est un acte explicite.
  - **Reporting** : la catégorie « Stocks » du catalogue Report Builder et les dashboards Stock ne sont **pas proposés** (filtrés) si le module est inactif.
- **Activation** : soit automatique (dès qu'un compte de classe 3 apparaît / qu'on crée un article), soit manuelle via un réglage société (« Gestion des stocks : activée/désactivée »). Un helper unique `isStockModuleEnabled(adapter): Promise<boolean>` (mémoïsé) est la **source unique** consultée par la nav, les routes, le moteur et le reporting.
- **Cohérent** avec le pattern « états vides honnêtes » et la gestion des plans par tenant (cf. `ModernDoubleSidebarLayout` note sur les plans).

## 2. Cartographie SAP MM → Atlas FNA

| Concept SAP | Objet Atlas FNA (ce module) |
|---|---|
| **Material master** (MARA/MARC/MBEW) | `stock_materials` (référentiel article : type, UoM de base, classe de valorisation, méthode, flags lot/série) |
| **Plant** (division) | `stock_sites` (site / établissement) — rattaché à la société (tenant) |
| **Storage location** (magasin) | `stock_warehouses` (magasin) puis `stock_locations` (emplacement/bin) |
| **Batch** (lot) | `stock_batches` (n° lot, fabrication, péremption/DLC, statut qualité) |
| **Serial number** | `stock_serials` (n° série, statut, historique) |
| **Stock (MARD/MCHB)** — quant | `stock_quants` : quantité + valeur par (article × emplacement × lot × statut) |
| **Valuation (MBEW)** — prix moyen / couches | `stock_materials.moving_avg_cost` (CUMP) + `stock_valuation_layers` (couches FIFO) |
| **Material document** (MKPF/MSEG) | `stock_documents` (en‑tête) + `stock_document_lines` (lignes de mouvement) |
| **Movement type** (101, 201, 561, 701…) | `stock_movement_types` (catalogue, §4) |
| **Account determination** (OBYC : BSX/GBB/WRX/PRD) | `stock_gl_determination` (§6) |
| **Physical inventory** (MI01/MI04/MI07) | `stock_count_documents` + `stock_count_lines` (§7) |
| **Reservation** (RESB) | `stock_reservations` |
| **Reorder point / MRP** | champs `reorder_point`/`max_level`/`safety_stock` sur `stock_materials` + moteur de proposition (§8) |
| **Stock transport** (transfert magasin) | mouvement type 301/311 (transfert 1 ou 2 étapes) |

---

## 3. Modèle de données (nouvelles tables `stock_*`)

Toutes les tables : `id uuid pk`, `tenant_id uuid not null`, `created_at`, `updated_at`, RLS tenant. On ajoute les entrées correspondantes dans `DataAdapter.TableName`, `SupabaseAdapter.TABLE_MAP` et un **normaliseur** (`TABLE_NORMALIZERS`) pour chaque table (snake↔camel).

### 3.1 Référentiels d'organisation
- **`stock_sites`** — `code`, `name`, `address`, `active`. (Établissement / « plant ».)
- **`stock_warehouses`** — `site_id`, `code`, `name`, `type` (`principal|transit|qualite|rebut|consignation`), `active`.
- **`stock_locations`** — `warehouse_id`, `code` (bin), `name`, `type`, `active`. (Emplacement fin ; un magasin a ≥1 emplacement, défaut `STD`.)

### 3.2 Référentiel article (material master)
- **`stock_materials`**
  - Identité : `code` (unique/tenant), `name`, `description`, `material_type` (`marchandise|matiere|fourniture|emballage|produit_fini|produit_encours|service`), `category`, `active`.
  - Unités : `base_uom` (UoM de base), `purchase_uom`, `sales_uom`, table de conversion `stock_uom_conversions` (facteur vers base).
  - Valorisation : `valuation_method` (`CUMP|FIFO`), `valuation_class` (→ détermination comptable, ex. `MARCH`, `MP`, `PF`, `EMB`), `moving_avg_cost` (numeric 18,4, entretenu par le moteur), `standard_price` (optionnel), `currency` (FCFA).
  - Gestion : `batch_managed` bool, `serial_managed` bool, `shelf_life_days` (péremption), `hazmat` bool.
  - Réappro : `reorder_point`, `safety_stock`, `max_level`, `min_order_qty`, `lead_time_days`, `default_warehouse_id`, `default_supplier_id`.
- **`stock_uom_conversions`** — `material_id`, `from_uom`, `to_uom`, `factor`.

### 3.3 Lots & séries
- **`stock_batches`** — `material_id`, `batch_number`, `manufacture_date`, `expiry_date`, `quality_status` (`libre|bloque|quarantaine|rebut`), `supplier_batch_ref`, `attributes jsonb`.
- **`stock_serials`** — `material_id`, `serial_number`, `batch_id?`, `status` (`en_stock|sorti|reserve|rebut`), `current_location_id?`, `warranty_end?`.

### 3.4 Stock (quants) & valorisation
- **`stock_quants`** — le stock « à un endroit » : `material_id`, `warehouse_id`, `location_id`, `batch_id?`, `serial_id?`, `stock_status` (`libre|bloque|qualite|transit`), `quantity` (18,3), `value` (18,2, valeur CUMP du segment). **Unicité** sur (material, warehouse, location, batch, serial, status). Le stock total d'un article = Σ quants.
- **`stock_valuation_layers`** (FIFO) — pour les articles `valuation_method='FIFO'` : `material_id`, `warehouse_id?`, `remaining_qty`, `unit_cost`, `in_date`, `document_line_id` (origine). Consommation FIFO par couches (helper `consumeFIFO` déjà présent, à généraliser).

### 3.5 Documents de mouvement (material document)
- **`stock_documents`** — en‑tête : `doc_number` (séquence/tenant), `doc_date`, `posting_date`, `movement_type_code`, `status` (`draft|posted|cancelled`), `reference` (PO/OF/BL…), `reversal_of?` (contre‑passation), `journal_entry_id?` (écriture GL générée), `hash`, `created_by`, `posted_at`.
- **`stock_document_lines`** — `document_id`, `line_no`, `material_id`, `warehouse_id`, `location_id`, `batch_id?`, `serial_id?`, `direction` (`in|out`), `quantity` (18,3), `unit_cost` (18,4), `amount` (18,2), `to_warehouse_id?`/`to_location_id?` (transfert), `reason`, `cost_center_id?` (imputation analytique sortie).

### 3.6 Détermination comptable (OBYC‑like)
- **`stock_movement_types`** — catalogue (§4) : `code`, `label`, `direction`, `posts_gl` bool, `reverses` (code de contre‑passation), `special` (`transfer|physinv|goods_receipt|goods_issue|scrap`), `requires_reference`.
- **`stock_gl_determination`** — `valuation_class`, `transaction_key` (`BSX|GBB|WRX|PRD|UMB`), `movement_context?`, `debit_account`, `credit_account`, `analytic` bool. (Comptes SYSCOHADA configurables ; seeds fournis §6.)

### 3.7 Inventaire physique
- **`stock_count_documents`** — `doc_number`, `warehouse_id`, `count_date`, `type` (`total|tournant|ponctuel`), `status` (`ouvert|compte|valide|annule`), `team jsonb`, `period_code?` (rattachement clôture), `hash`.
- **`stock_count_lines`** — `count_doc_id`, `material_id`, `location_id`, `batch_id?`, `book_qty` (théorique figé à l'ouverture), `counted_qty`, `variance_qty`, `unit_cost`, `variance_value`, `recount` bool.

### 3.8 Réservations
- **`stock_reservations`** — `material_id`, `warehouse_id`, `quantity`, `reserved_for` (`OF|commande|manuel`), `reference`, `status` (`active|consommee|annulee`), `valid_until`.

---

## 4. Catalogue des types de mouvements (SAP‑aligned)

Chaque mouvement pointe une entrée `stock_movement_types`. Codes calqués sur SAP pour la lisibilité métier.

| Code | Libellé | Direction | Special | GL |
|---|---|---|---|---|
| **101** | Entrée sur achat (réception) | in | goods_receipt | Débit stock / Crédit GR‑IR (408) |
| **102** | Annulation entrée sur achat | out | reverse 101 | contre‑passation |
| **201** | Sortie pour charge (centre de coût) | out | goods_issue | Débit charge (60x) / Crédit stock |
| **202** | Annulation sortie 201 | in | reverse 201 | — |
| **261** | Sortie sur ordre de fabrication | out | goods_issue | Débit en‑cours / Crédit stock MP |
| **301** | Transfert magasin↔magasin (1 étape) | transfer | transfer | Débit stock A / Crédit stock B (si classes ≠) sinon neutre |
| **311** | Transfert emplacement (même magasin) | transfer | transfer | neutre (pas de GL) |
| **309** | Transfert article↔article | transfer | transfer | selon classes |
| **501** | Entrée sans commande (don, régul +) | in | goods_receipt | Débit stock / Crédit produit (758/73) |
| **551** | Mise au rebut | out | scrap | Débit charge rebut (654/658) / Crédit stock |
| **561** | Reprise initiale de stock (stock d'ouverture) | in | goods_receipt | Débit stock / Crédit 890 ou capitaux (paramétrable) |
| **701** | Écart d'inventaire positif | in | physinv | Débit stock / Crédit variation (603/73 ou 758) |
| **702** | Écart d'inventaire négatif | out | physinv | Débit variation (603/73 ou 658) / Crédit stock |

Extensible : le catalogue est en table, on peut ajouter des codes sans redéploiement.

---

## 5. Valorisation

- **CUMP (prix moyen pondéré mobile)** — méthode par défaut. À chaque entrée valorisée : `new_avg = (qté_stock·CUMP + qté_entrée·coût_entrée) / (qté_stock + qté_entrée)`. Les sorties sont valorisées au CUMP courant. `stock_materials.moving_avg_cost` est la source de vérité, recalculée transactionnellement par le moteur.
- **FIFO** — couches `stock_valuation_layers` : entrée = nouvelle couche ; sortie = consommation des couches les plus anciennes (`consumeFIFO`), valeur de sortie = Σ (qté×coût de couche).
- **Écarts de valorisation (PRD)** — si le coût de réception diffère du prix standard (articles à prix standard), la différence est postée sur le compte `PRD`.
- **Multi‑devise** : hors périmètre v1 (FCFA uniquement). Prévu extension via `stock_materials.currency` + conversion au taux du jour.
- Helpers existants réutilisés/généralisés : `calculateCUMP`, `consumeFIFO` (`src/services/inventory/inventoryService.ts`).

---

## 6. Détermination comptable SYSCOHADA (seeds `stock_gl_determination`)

Convention : `transaction_key` façon OBYC. `BSX` = compte de stock (bilan) ; `GBB` = contrepartie de sortie/charge ; `WRX` = GR/IR (réception non facturée) ; `PRD` = écart de prix ; `UMB` = variation/écart d'inventaire.

| valuation_class | Libellé | BSX (stock) | GBB (contrepartie sortie) | UMB (écart inv.) |
|---|---|---|---|---|
| `MARCH` | Marchandises | **31** | 6031 (variation) / 601 | 6031 ou 658/758 |
| `MP` | Matières premières | **32** | 6032 / 601? 602 | 6032 |
| `APPRO` | Autres approvisionnements | **33** | 6033 / 604‑605 | 6033 |
| `EMB` | Emballages | **335** | 6036 / 608 | 6036 |
| `PF` | Produits finis | **36** | 736 (variation) | 736 ou 658/758 |
| `ENCOURS` | Produits en‑cours | **34** | 734 | 734 |

- **WRX (réception 101)** : crédit **408** (fournisseurs, factures non parvenues) — soldé à la facturation par le module Achats. À défaut de PO, contrepartie paramétrable (`4081`).
- **Inventaire permanent** : 101 → D 31 / C 408 ; 201 → D 60x (charge) / C 31 ; 701 → D 31 / C 6031 (ou 758) ; 702 → D 6031 (ou 658) / C 31.
- Tous ces comptes sont **paramétrables** en table (écran d'admin « Détermination comptable Stock »), les valeurs ci‑dessus sont des **seeds**. Les libellés proviennent de `getAccountLabel`.

> ⚠️ Le choix exact 6031 (variation) vs 601 (achat) vs 758/658 (produits/charges divers) pour chaque contexte sera **confirmé avec l'utilisateur au L2** (écran de détermination éditable) — c'est là que « rien au hasard » se joue côté compta.

---

## 7. Inventaire physique (workflow)

1. **Création** d'un `stock_count_document` (magasin, type total/tournant, équipe, date). À l'ouverture, `book_qty` de chaque ligne est **figé** (photo du stock théorique par quant).
2. **Comptage** : saisie `counted_qty` (multi‑compteurs, recomptage possible sur écart).
3. **Écarts** : `variance_qty = counted − book`, `variance_value = variance_qty × CUMP`. Tableau des écarts trié par valeur.
4. **Validation** : génère les mouvements **701** (positifs) et **702** (négatifs) → ajuste `stock_quants` **et** poste l'écriture d'écart d'inventaire (déterminée par `UMB`). Le document passe `valide`, devient immuable (hash), rattaché à `period_code` pour la clôture.

Réutilise le pattern « inventaire » déjà éprouvé côté immobilisations (écarts réels + sortie sur manquant).

---

## 8. Réappro / MRP‑lite

- **Point de commande** : article sous `reorder_point` → proposition de réappro (qté = `max_level − dispo` bornée par `min_order_qty`).
- **Disponible** = stock libre − réservations actives.
- **Proposition → commande** : lien vers le module Achats existant (`purchaseOrders`) — génère un brouillon de commande fournisseur (`default_supplier_id`, `lead_time_days`).
- Écran « Alertes stock » : ruptures, sous‑mini, surstock, articles dormants (dernier mouvement > n jours), lots proches péremption.

---

## 9. Moteur & intégrité

- **`stockMovementService.postMovement(adapter, doc)`** — cœur transactionnel : valide (période non close, quantités, statut lot/série), calcule la valorisation (CUMP/FIFO), met à jour `stock_quants` (+ couches), écrit `stock_documents`/`_lines`, **poste l'écriture GL** via le chemin `safeAddEntry` (verrou clôture), pose le hash. **Atomicité** : en SaaS, l'écriture GL (journal_entry + lignes) utilise l'insert groupé (`createMany`) pour respecter les triggers d'équilibre `DEFERRABLE` (cf. gotcha `journal_lines`).
- **Contre‑passation** (`102/202/…`) plutôt que suppression : traçabilité SAP.
- **Séquences** `doc_number` par tenant (fonction Postgres `next_stock_doc_number`).
- **Idempotence** : un mouvement `posted` ne se rejoue pas ; garde anti‑double (comme le double‑décaissement trésorerie).

---

## 10. UI & navigation

Nouvelle entrée de menu latéral **« Stocks »** (icône `Boxes`/`Warehouse`), distincte de « Inventaire » (immobilisations). Sous‑sections :

| Écran | Route | Contenu |
|---|---|---|
| Tableau de bord | `/stock` | KPIs (valeur totale, ruptures, rotation, top valeur), alertes |
| Articles (material master) | `/stock/materials` | CRUD référentiel article, UoM, valorisation, flags lot/série |
| Magasins & emplacements | `/stock/warehouses` | CRUD sites/magasins/emplacements |
| Stock (quants) | `/stock/overview` | Stock par article/magasin/lot/série, filtres, statut |
| Mouvements | `/stock/movements` | Saisie entrée/sortie/transfert (par type), historique documents |
| Inventaire physique | `/stock/physical` | Documents de comptage, saisie, écarts, validation |
| Valorisation | `/stock/valuation` | CUMP/FIFO, valeur à date, couches FIFO, écarts |
| Réappro & alertes | `/stock/reorder` | Propositions, alertes, péremption, dormants |
| Détermination comptable | `/stock/gl-setup` | Édition `stock_gl_determination` (admin) |

Les pages existantes `src/pages/inventory/*` (Dashboard, Valuation réels ; Movements/Physical/StockManagement partiels/mock) sont **réécrites** contre le nouveau socle (réutilisation de la structure UI + `PageHeaderActions`, impression, `DataPageLayout`).

---

## 10bis. Intégration Reporting & catalogue (exigence utilisateur)

Le module Stock doit être **exposé dans le module Reporting / Report Builder**, pas seulement dans ses propres écrans.

- **Catalogue Report Builder** (`src/features/report-builder/data/atlasCatalog.ts`) : ajouter une **catégorie « Stocks »** avec des blocs prêts à poser dans un rapport — Valeur du stock à date, Mouvements de stock (période), Rotation & couverture, Analyse ABC, Ruptures & alertes, État des lots/péremptions, Écarts d'inventaire. Chaque bloc a son data‑provider dans `blockDataService.ts` (source unique = moteur Stock, jamais de mock).
- **Dashboards Stock au catalogue** (`src/config/activityDashboard.config.ts` — l'entrée « Gestion des Stocks » existe déjà en placeholder) : livrer de **vrais dashboards** Stock (widgets valeur/rotation/ruptures/ABC/dormants) alimentés par le moteur, sélectionnables dans le catalogue de tableaux de bord.
- **Cohérence source unique** : les blocs/dashboards lisent les **mêmes services** que les écrans du module (valorisation, quants, mouvements) — pas de recalcul divergent. Pattern identique à `blockDataService` = source unique `glHelpers`.
- **Exports** : impression/PDF via le composant partagé (`PageHeaderActions`, export PDF du builder).

Livré au **L6** (reporting/ABC/rotation), avec les blocs de base branchés dès que les données existent (L2 pour valeur/mouvements).

## 11. Sécurité & audit

- RLS tenant sur toutes les tables `stock_*`.
- Écritures de mouvement **validées** immuables (hash chaîné) ; annulation = contre‑passation tracée.
- **SoD optionnelle** (L6) : validation d'inventaire / mouvements de forte valeur routés vers la **bannette MVA** (`wf_*`) si seuil dépassé — cohérent avec le module de gouvernance.
- Audit : `logAudit` sur chaque post/cancel/validation.

---

## 12. Plan de lots

| Lot | Contenu | Livrables |
|---|---|---|
| **L0 — Socle données** | Migrations `stock_sites/warehouses/locations/materials/uom/batches/serials/quants/valuation_layers/documents/lines/movement_types/gl_determination/count_*/reservations` + RLS + séquences + seeds movement_types & gl_determination. Types DB + `TABLE_MAP` + normaliseurs + `TableName`. | migration(s) `2024010100007x_*`, `src/lib/db.ts`, `SupabaseAdapter` |
| **L1 — Référentiels, activation & UI socle** | **Gate d'activation `isStockModuleEnabled` (§1bis) : menu masqué si pas de classe 3**, Material master (CRUD + UoM + valorisation/flags), magasins/emplacements, entrée de menu « Stocks » conditionnelle, dashboard branché. | helper activation, pages `materials`, `warehouses`, nav |
| **L2 — Mouvements + valorisation + GL** | `stockMovementService.postMovement` (CUMP/FIFO), écran Mouvements (entrée/sortie/transfert), **détermination comptable éditable** + postings GL réels (verrou clôture), écran valorisation. Confirmation comptes SYSCOHADA avec l'utilisateur. | service moteur, pages `movements`/`valuation`/`gl-setup`, tests |
| **L3 — Lots & séries** | Gestion batch (péremption/qualité) et n° série de bout en bout dans mouvements/quants/valorisation. | UI + moteur lot/série |
| **L4 — Inventaire physique** | Documents de comptage, saisie multi‑compteurs, écarts, validation → 701/702 + GL. | page `physical`, service inventaire |
| **L5 — Réappro & achats** | Point de commande, propositions, alertes (rupture/dormant/péremption), lien `purchaseOrders`. | page `reorder`, moteur MRP‑lite |
| **L6 — Reporting, catalogue, ABC/rotation, SoD, polish** | ABC, rotation, valeur à date, exports/impression, **catégorie « Stocks » dans le catalogue Report Builder + data‑providers**, **dashboards Stock au catalogue** (`activityDashboard.config`), SoD via MVA, migration/retrait `inventory_items`/`stock_movements`. | reporting + catalogue, nettoyage dette |

Chaque lot : `tsc 0` + tests verts + commit + push (sur demande).

---

## 13. Reprise & dépréciation de l'existant

- `inventory_items` / `stock_movements` : **0 ligne** sur le tenant courant → pas de reprise de données nécessaire. On garde les tables (dépréciées, lecture) jusqu'à L6, puis on retire les mappings/pages legacy. Le service `inventoryService.ts` (CUMP/FIFO) est **conservé et généralisé** dans le nouveau moteur.
- Le catalogue `mockData.ts` (tableaux vides) et les pages partielles sont supprimés au fil des lots.

---

## 14. Tests

- Unitaires : valorisation CUMP (entrées/sorties successives), FIFO (couches, consommation partielle), conversion UoM, calcul d'écart d'inventaire, détermination comptable (mapping classe→comptes), génération d'écriture équilibrée.
- Intégration (test adapter `createTestAdapter`) : cycle réception→sortie→transfert→inventaire, avec vérif quants + écritures GL équilibrées + verrou clôture.

---

## 15. Hors périmètre v1 (dette assumée)

- Multi‑devise valorisation, WM/EWM (gestion d'entrepôt avancée, vagues, tâches), handling units, split valuation, sous‑traitance (563/movement 541), consignation fournisseur complète, prévision de demande (au‑delà du point de commande). Extensions possibles post‑v1.

---

## 16. Questions ouvertes à trancher au démarrage L0/L2

1. **Inventaire permanent vs intermittent** : je pars sur **permanent** (chaque mouvement poste au GL). Confirmer que la variation à la clôture (603/73) ne doit pas doublonner (le permanent la remplace).
2. **Comptes de contrepartie** exacts par contexte (601 vs 6031 pour sortie marchandise ; 758/658 vs 603 pour écart d'inventaire) — à figer sur l'écran de détermination au L2.
3. **Sites** : un seul établissement pour l'instant ou plusieurs ? (le schéma gère N, l'UI L1 peut démarrer mono‑site).
