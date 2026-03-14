# RAPPORT D'AUDIT EXPERT COMPLET — ATLAS FINANCE
## Modules Comptabilité & Gestion des Tiers
### Version définitive — 13 mars 2026

---

## TABLE DES MATIÈRES

- [PARTIE I — Audit Expert-Comptable SYSCOHADA (Axes 3.1 à 3.9)](#partie-i--audit-expert-comptable-syscohada)
  - [3.1 Conformité du Plan Comptable SYSCOHADA](#31-conformité-du-plan-comptable-syscohada)
  - [3.2 Règles d'équilibre comptable — Partie double](#32-règles-déquilibre-comptable--partie-double)
  - [3.3 Journaux comptables](#33-journaux-comptables)
  - [3.4 Grand Livre](#34-grand-livre)
  - [3.5 Balance comptable](#35-balance-comptable)
  - [3.6 Lettrage](#36-lettrage)
  - [3.7 Gestion des Tiers — Clients & Fournisseurs](#37-gestion-des-tiers--clients--fournisseurs)
  - [3.8 Recouvrement](#38-recouvrement)
  - [3.9 OCR Factures](#39-ocr-factures)
  - [3.10 Signature Électronique](#310-signature-électronique)
- [PARTIE II — Audit Architecte Frontend/Supabase (Axes 4.1 à 4.8)](#partie-ii--audit-architecte-frontend--supabase)
  - [4.1 Schéma de base de données Supabase](#41-schéma-de-base-de-données-supabase)
  - [4.2 Row Level Security (RLS) Supabase](#42-row-level-security-rls-supabase)
  - [4.3 Transactions et atomicité](#43-transactions-et-atomicité)
  - [4.4 Données hardcodées — Recensement exhaustif](#44-données-hardcodées--recensement-exhaustif)
  - [4.5 Calculs et algorithmes — Vérification de l'exactitude](#45-calculs-et-algorithmes--vérification-de-lexactitude)
  - [4.6 Performance et requêtes Supabase](#46-performance-et-requêtes-supabase)
  - [4.7 Gestion des erreurs et UX](#47-gestion-des-erreurs-et-ux)
  - [4.8 Interconnexion entre modules](#48-interconnexion-entre-modules)
- [PARTIE III — Livrables](#partie-iii--livrables)
  - [Livrable 1 — Fiches d'anomalies complètes (62 anomalies)](#livrable-1--fiches-danomalies-complètes)
  - [Livrable 2 — Tableau de synthèse par sévérité](#livrable-2--tableau-de-synthèse-par-sévérité)
  - [Livrable 3 — Plan de correction priorisé](#livrable-3--plan-de-correction-priorisé)
  - [Livrable 4 — Données hardcodées à migrer](#livrable-4--données-hardcodées-à-migrer)
  - [Livrable 5 — Opérations non transactionnelles à sécuriser](#livrable-5--opérations-non-transactionnelles-à-sécuriser)
  - [Livrable 6 — Schéma de base de données corrigé](#livrable-6--schéma-de-base-de-données-corrigé)
  - [Livrable 7 — Triggers PostgreSQL manquants](#livrable-7--triggers-postgresql-manquants)
  - [Barre de passage — Conformité finale](#barre-de-passage--conformité-finale)
  - [Points positifs notables](#points-positifs-notables)

---

## SYNTHÈSE EXÉCUTIVE

**Périmètre audité** : 80+ fichiers couvrant les modules Comptabilité et Gestion des Tiers.

| Sévérité | Nombre |
|----------|--------|
| CRITIQUE | 18 |
| MAJEURE | 22 |
| MINEURE | 14 |
| AMÉLIORATION | 8 |
| **Total** | **62** |

**Constats principaux :**

- **Aucun contrôle en base de données** : Toutes les règles comptables (équilibre D=C, blocage période close, immutabilité des écritures postées) sont exclusivement implémentées côté application React. Un appel direct à l'adaptateur ou à Supabase contourne toute validation.
- **Les écritures brouillon sont incluses dans tous les calculs** : Balance, grand livre, lettrage, clôture — aucun service ne filtre par statut. Les rapports financiers reflètent des données non validées.
- **Pages UI largement non connectées** : `EntriesPage`, `JournalsPage`, `ChartOfAccountsPage`, `ClientsModule`, `ClientDetailView`, `FournisseursModule`, `FournisseurDetailView`, `AdvancedGeneralLedger` utilisent 100% de données mockées/hardcodées.
- **Aucune transaction atomique** : `SupabaseAdapter.transaction()` est un no-op. `adapter.transaction()` n'est jamais appelé dans le code applicatif.
- **Les comptes 6/7 ne sont jamais soldés** en clôture — pas d'écriture de détermination du résultat.
- **Le vieillissement (aging)** utilise la date de pièce et non la date d'échéance.
- **Aucun compte auxiliaire n'est auto-créé** lors de la création d'un tiers.

---

# PARTIE I — AUDIT EXPERT-COMPTABLE SYSCOHADA

---

## 3.1 Conformité du Plan Comptable SYSCOHADA

### 3.1.1 Couverture des 9 classes

Trois sources de données coexistent :

| Source | Classes couvertes | Comptes | Usage |
|--------|-------------------|---------|-------|
| `src/data/planComptable.ts` | 1,2,4,5,6,7 | ~193 | Autocomplete UI |
| `src/data/syscohada-referentiel.ts` | 1-9 (complet) | ~643 | Référentiel statique |
| `planComptableService.ts` seed | 1-7 | 38 | Initialisation DB |

**Constats :**

- **Classe 3 (Stocks)** : **ABSENTE** de `planComptable.ts` et quasi-absente du seed (seulement 311000, 321000, 391000). Le référentiel `syscohada-referentiel.ts` couvre 31x-39x mais n'est pas utilisé pour le seed.
- **Classe 8 (HAO)** : **ABSENTE** de `planComptable.ts` et du seed. Présente dans `syscohada-referentiel.ts` (81x-89x complet : VNC cessions 81x, produits cessions 82x, charges HAO 83x, produits HAO 84x, dotations HAO 85x, reprises HAO 86x, participation 87x, subventions 88x, impôts 89x).
- **Classe 9 (Analytique)** : **ABSENTE** de `planComptable.ts` et du seed. Présente dans le référentiel (901-981).

### 3.1.2 Comptes TVA — Nomenclature SYSCOHADA

Les comptes TVA utilisent la **nomenclature SYSCOHADA correcte** (≠ PCG français) :
- TVA collectée : `443` / `4431` (SYSCOHADA) — pas 44571 (PCG)
- TVA déductible : `4452` / `4456` / `44562` (SYSCOHADA) — pas 44566 (PCG)
- TVA due : `444` (SYSCOHADA)
- TVA récupérable : `445` (SYSCOHADA)

**Verdict : CONFORME** sur la nomenclature TVA.

### 3.1.3 Comptes auxiliaires clients/fournisseurs et comptes collectifs

- Les comptes `411` (clients) et `401` (fournisseurs) existent comme comptes racines.
- **Aucun mécanisme collectif/auxiliaire n'est modélisé.** Le type `Account` (`packages/shared/src/types/accounting.ts`) ne possède pas de champ `isCollective`, `isAuxiliary`, ou `collectiveAccountId`.
- `deriveParentCode()` dans `planComptableService.ts` (ligne 362) dérive un parent en retirant le dernier chiffre et les zéros, mais les comptes parents dérivés (ex: `411` depuis `411000`) n'existent souvent pas en base.
- **Le lien tiers ↔ compte collectif n'est PAS automatique ni infaillible.** Il est totalement absent.

### 3.1.4 Stockage du plan comptable

**Hybride** : le plan est à la fois hardcodé (3 fichiers statiques) ET en base (`accounts` table via DataAdapter). Le seed écrit les defaults hardcodés en base à l'initialisation. Les fichiers statiques (`planComptable.ts`) sont utilisés indépendamment pour l'autocomplete UI, créant un risque de désynchronisation.

### 3.1.5 Éditabilité et garde-fous

- **Libellés** : modifiables via `updateAccount()` (champ `name`).
- **Numéros de compte** : **non modifiables** après création (exclu du `Pick<>` dans `updateAccount`). Correct.
- **Garde-fous** :
  - Validation du code : digits uniquement, min 2 caractères, première classe 1-9 (`validateAccountCode`, ligne 346).
  - Pas de longueur maximale — un code `199999999999` passerait la validation.
  - Pas de flag `isSystem` ou `isLocked` empêchant la modification des comptes standard.
  - La désactivation d'un compte ayant des mouvements est **bloquée** (bug : le message dit "désactivation uniquement" mais le code lance une exception, empêchant même la désactivation).

---

## 3.2 Règles d'équilibre comptable — Partie double

### 3.2.1 Contrôle Σ Débit = Σ Crédit

| Niveau | Implémenté ? | Détail |
|--------|-------------|--------|
| UI (formulaire) | **OUI** | `JournalEntryModal.tsx` ligne 252 : `Math.abs(totalDebit - totalCredit) < 0.01` |
| Service (validation) | **OUI** | `journalEntryValidator.ts` lignes 82-91 : `Money.sum()` + `isZero()` |
| Guard (insertion) | **OUI** | `entryGuard.ts` lignes 46-57 : `Money.sum()` + `validateJournalEntrySync` |
| **Base de données** | **NON** | Aucun CHECK, TRIGGER ni RPC PostgreSQL |

**Verdict : Le contrôle existe côté application mais est CONTOURNABLE.** Un appel direct `adapter.create('journalEntries', ...)` (sans passer par `safeAddEntry`) ou un INSERT SQL direct bypasse toute validation.

### 3.2.2 Écritures multi-lignes (> 2 mouvements)

**Correctement traitées.** `lignesEcriture` est un tableau sans limite. Les templates ont jusqu'à 4 lignes (PAI-SAL : 661/431/4421/421). `Money.sum()` agrège toutes les lignes quel que soit leur nombre.

### 3.2.3 Écritures d'extourne

**Correctement implémentées** dans `reversalService.ts` (lignes 38-107) :
- Inversion débit/crédit : `debit: line.credit, credit: line.debit` (lignes 72-73)
- Référence `CTPS-{originalNumber}`, préfixe `CONTREPASSATION --`
- Marquage original : `reversed: true`, `reversedBy`, `reversedAt`
- Audit trail complet
- Uniquement pour écritures `validated` ou `posted`
- Prévention double extourne

### 3.2.4 Valeurs négatives

| Niveau | Bloqué ? |
|--------|----------|
| Formulaire HTML | **NON** — pas de `min="0"` sur les `<input type="number">` |
| Validator | **OUI** — `journalEntryValidator.ts` ligne 51-59 : `< 0` check |
| Guard | **NON** — `entryGuard.ts` ne vérifie pas les négatifs |
| Base de données | **NON** — pas de `CHECK (debit >= 0)` |

### 3.2.5 Décimales FCFA

**Inconsistant :**
- `JournalEntryModal.tsx` ligne 739 : `minimumFractionDigits: 0, maximumFractionDigits: 0` — correct pour FCFA.
- `journalTemplates.ts` ligne 526 : `amount.round(2).toNumber()` — arrondit toujours à 2 décimales quel que soit la devise.
- Input HTML : `step="0.01"` dans `IntelligentEntryForm.tsx` — permet les centimes même en FCFA.
- **Pas de configuration devise-aware** pour basculer entre 0 décimales (FCFA) et 2 décimales (EUR).

---

## 3.3 Journaux comptables

### 3.3.1 Journaux obligatoires SYSCOHADA

| Journal SYSCOHADA | Code attendu | Présent ? | Détail |
|-------------------|-------------|-----------|--------|
| Journal des Achats | JA/AC | **OUI** | `AC` dans JournalsPage et templates |
| Journal des Ventes | JV/VE | **OUI** (inconsistant) | `VT` dans JournalsPage, `VE` dans templates et IntelligentEntryForm — **conflit de nommage** |
| Journal de Banque | JB/BQ | **OUI** | `BQ` — un seul, pas un par compte bancaire. Sous-journaux `BQ01`/`BQ02` sont du mock UI uniquement |
| Journal de Caisse | JC/CA | **OUI** | `CA` |
| Journal des OD | JOD/OD | **OUI** | `OD` |
| Journal d'À-Nouveaux | JAN/AN | **OUI** | `AN` |
| **Journal de Clôture** | **JCL/CL** | **NON** | **ABSENT** — aucun journal de clôture n'est défini |

**Manquants supplémentaires :** `TR` (Trésorerie) et `NV` (Notes de frais) existent dans IntelligentEntryForm mais ne sont pas standard SYSCOHADA.

### 3.3.2 Rattachement obligatoire à un journal

- `journal_entries.journal` est `TEXT NOT NULL` en Supabase (migration 2, ligne 50) — **non nullable**.
- Mais c'est un **champ texte libre** sans FK vers une table `journaux`. Aucune table `journaux` n'existe. N'importe quelle chaîne est acceptée.

### 3.3.3 Numérotation séquentielle des pièces

- `getNextPieceNumber()` (`journalEntryValidator.ts` lignes 190-205) : génère `XX-000001` séquentiellement par journal en cherchant le max existant.
- `UNIQUE(tenant_id, entry_number)` en Supabase empêche les doublons.
- **Pas garanti sans trous** : si une erreur survient entre la génération du numéro et la persistance, un trou apparaît. Pas de mécanisme de réservation.
- **Pas de trigger PostgreSQL** de numérotation séquentielle.
- **Non modifiable après validation** : seulement via `isEntryEditable()` côté UI, pas en base.

### 3.3.4 Clôture mensuelle des journaux

**NON IMPLÉMENTÉE.** Il n'existe :
- Ni table `periodes_comptables` avec statut ouvert/clôturé par mois
- Ni mécanisme de clôture par journal par période
- Ni contrôle empêchant la saisie sur une période clôturée au niveau journal

Seul `fiscal_years.is_closed` existe pour l'exercice entier.

### 3.3.5 Journal de clôture et écritures de résultat

**NON IMPLÉMENTÉ.** Le `closureOrchestrator` a une étape `CALCUL_RESULTAT` qui **lit** le résultat (classes 6-7) mais **ne génère pas** l'écriture de solde (D 7xx / C 6xx → 120 ou 129). Les comptes de gestion ne sont jamais soldés. Aucun journal `CL` n'est défini.

---

## 3.4 Grand Livre

### 3.4.1 Solde progressif ligne par ligne

**NON FONCTIONNEL.** Dans `generalLedgerService.ts` :
- Ligne 68 : `let runningBalance = soldeOuverture;`
- Ligne 76 : `runningBalance = 0;` — **écrase immédiatement** le solde d'ouverture
- Le solde progressif part donc de 0, pas du solde d'ouverture réel.

Dans `AdvancedGeneralLedger.tsx` : le grand livre utilise des **données mock hardcodées** (lignes 1585-1698) au lieu du service réel.

### 3.4.2 Tri des mouvements

**Partiellement correct.** Triés par date (`a.date.localeCompare(b.date)`) avec les AN/RAN en premier. **Pas de tri secondaire par numéro de pièce** — les mouvements du même jour ont un ordre indéterminé.

### 3.4.3 Solde d'ouverture et reports à nouveau

Le service identifie les écritures `journal === 'AN' || journal === 'RAN'` et calcule le `soldeOuverture` (ligne 22-29). Cependant :
- Le solde d'ouverture est **ignoré** dans le running balance (voir 3.4.1).
- Les AN doivent être **dans la plage de dates du filtre** pour être pris en compte. Un filtre sur mars 2025 ne verra que les AN datés en mars, pas ceux de janvier.

### 3.4.4 Filtre par période et solde d'ouverture au jour 1

**NON IMPLÉMENTÉ.** Le filtre par période dans `queryEntries()` (lignes 321-335) ne fait que filtrer les dates. Il n'y a **aucune logique** pour calculer un solde d'ouverture cumulatif au 1er jour de la période (somme de tous les mouvements antérieurs). Le solde d'ouverture ne reflète que les écritures AN dans la période filtrée.

### 3.4.5 Mouvements des comptes de tiers depuis les deux modules

Les deux modules (Comptabilité et Tiers) utilisent la même table `journalEntries`. Le grand livre affiche donc tous les mouvements d'un compte, quelle que soit leur origine. Cependant, il n'y a **aucune réconciliation explicite** entre les vues Comptabilité et Tiers, et le `GrandLivre.tsx` component utilise des données mock.

---

## 3.5 Balance comptable

### 3.5.1 Structure SYSCOHADA 8 colonnes

**OUI.** L'`AdvancedBalance.tsx` et le `BalanceTable.tsx` implémentent les 8 colonnes :
1. N° compte
2. Libellé
3. Solde débiteur ouverture
4. Solde créditeur ouverture
5. Mouvements débiteurs
6. Mouvements créditeurs
7. Solde débiteur clôture
8. Solde créditeur clôture

**BUG** : Le solde de clôture est calculé à partir des mouvements seuls (`balanceService.ts` lignes 191-208 : `soldeNet = data.debit - data.credit`), **sans ajouter le solde d'ouverture**. Formule correcte : `Solde clôture = Solde ouverture + Mouvements`.

### 3.5.2 Contrôle Σ Soldes débiteurs = Σ Soldes créditeurs

**OUI** — affiché dans `BalanceTotalsRow.tsx` (lignes 58-74) avec message "Balance équilibrée" ou "non équilibrée". **Faiblesse** : comparaison avec `===` sur nombres flottants sans tolérance epsilon.

`verifyEquilibrium()` dans `balanceService.ts` utilise la classe Money pour une vérification précise.

### 3.5.3 Contrôle Σ Mouvements débiteurs = Σ Mouvements créditeurs

**OUI** — calculé dans `calculateTotals()` et vérifié dans `verifyEquilibrium()`.

### 3.5.4 Balance auxiliaire réconciliée avec comptes collectifs

**NON IMPLÉMENTÉ.** Le filtre `balanceType: 'auxiliaire'` existe en UI mais le service ne différencie aucun comportement. Il n'y a aucune logique de réconciliation vérifiant que Σ soldes auxiliaires 411xxx = solde collectif 411.

### 3.5.5 Balance âgée — date d'échéance ou date de pièce

**BUG CRITIQUE** : L'aging utilise `entry.date` (date de pièce) dans `receivableService.ts` (ligne 209), **PAS la date d'échéance**. Le champ `date_echeance` n'existe pas sur `journal_lines` en base Supabase.

**Tranches de vieillissement** : 0-30j, 31-60j, 61-90j, 91-180j, 181-360j, +360j — conformes SYSCOHADA. Taux de provision associés : 0%, 10%, 25%, 50%, 75%, 100%.

Le filtre `balanceType: 'agee'` est un placeholder UI **sans implémentation** dans le `balanceService.ts`.

---

## 3.6 Lettrage

### 3.6.1 Lettrage manuel — sélection multiple

**OUI.** `Lettrage.tsx` utilise un `Set<string>` (`selectedEntries`) permettant de sélectionner N mouvements débiteurs et M mouvements créditeurs sur un même compte tiers.

### 3.6.2 Contrôle Σ Débit lettrés = Σ Crédit lettrés

- **Mode complet** : **OUI** — tolérance 0.01 FCFA (`Lettrage.tsx` ligne 269). Bouton désactivé si écart > tolérance.
- **Mode partiel** : **NON** — seule la non-nullité est vérifiée (ligne 275-279).
- **Service `applyManualLettrage`** : **AUCUNE VALIDATION** d'équilibre (lignes 366-400). L'utilisateur pourrait lettrer un groupe déséquilibré via un appel service direct.

### 3.6.3 Lettrage automatique — algorithme

4 algorithmes séquentiels dans `lettrageService.ts` :

1. **Montant exact** (`matchExact`, lignes 129-152) : 1:1 où `d.debit === c.credit`
2. **Référence** (`matchByReference`, lignes 154-176) : référence identique + montant identique
3. **Somme-N** (`matchSumN`, lignes 178-211) : 1 crédit = N débits (greedy descendant, tolérance configurable)
4. **Tolérance** : intégrée dans matchSumN

**Configuration** (`LettrageConfig`) : `parMontant`, `parReference`, `parDate`, `tolerance` — paramétrable.

**BUG** : `matchExact` utilise `===` pour comparer des `number` flottants (ligne 142). Devrait utiliser `Math.abs(d.debit - c.credit) < tolerance`.

### 3.6.4 Modification/suppression d'une écriture lettrée

- **Blocage en base** : **NON** — aucun trigger ni contrainte.
- **Blocage UI** : **NON** — aucune vérification `lettrageCode` avant modification.
- Une écriture lettrée peut être librement modifiée ou supprimée, cassant silencieusement le lettrage.

### 3.6.5 Traçabilité du délettrage

**OUI.** `delettrage()` dans `lettrageService.ts` (lignes 405-425) log un audit `DELETTRAGE` avec le code et le nombre de lignes via `logAudit()`. Le lettrage auto et manuel sont également audités (`LETTRAGE_AUTO`, `LETTRAGE_MANUAL`).

**Faiblesse** : l'historique de lettrage n'est pas persisté dans une table dédiée — seulement dans `audit_logs`. Le composant `Lettrage.tsx` a un onglet "Historique" mais les données sont en `useState` uniquement (non persistées).

### 3.6.6 Synchronisation lettrage Comptabilité ↔ Tiers

**Synchronisé.** `LettrageModule.tsx` (module Tiers) est un simple wrapper qui rend le même composant `<Lettrage />` de la Comptabilité. Même composant, même table (`journalEntries.lines[].lettrageCode`), même service (`lettrageService.ts`). Pas de table `lettrages` séparée.

---

## 3.7 Gestion des Tiers — Clients & Fournisseurs

### 3.7.1 Champs obligatoires de la fiche tiers

| Champ OHADA | Présent dans `types/tiers.ts` ? | Présent en base ? | Rempli en pratique ? |
|-------------|------|------|------|
| Raison sociale | OUI (`raisonSociale`) | OUI (`name`) | OUI |
| Forme juridique | OUI (`formeJuridique`) | NON — pas dans `DBThirdParty` | NON |
| NIF | OUI (`nif`) via `taxId` | OUI (`tax_id`) | Mock seulement |
| **RCCM** | **NON** | **NON** | **NON — ABSENT** |
| Adresse complète | OUI (`adresse`) | OUI (`address`) | Mock seulement |
| Compte collectif (411/401) | NON — pas dans `ThirdParty` base | NON — pas dans `DBThirdParty` | **NON — ABSENT** |
| Conditions de paiement | OUI (`conditionsPaiement`) | OUI (v8 Dexie) | Mock seulement |
| Délai d'échéance | OUI (`delaiEcheance`) | NON en Supabase | Mock seulement |

**Constats critiques :**
- **RCCM** (Registre du Commerce et du Crédit Mobilier) : champ obligatoire en zone OHADA, **totalement absent** du modèle de données.
- Les champs `siret` et `codeAPE` dans `FournisseurDetailView` sont **français, pas OHADA**.
- Le lien vers le compte collectif n'est pas modélisé.

### 3.7.2 Création automatique d'un sous-compte auxiliaire

**NON IMPLÉMENTÉ.** La création d'un tiers (`adapter.create('thirdParties', data)`) ne crée aucun compte auxiliaire dans la table `accounts`. Le composant `ThirdPartyCodeConfig.tsx` mentionne "Création compte auxiliaire automatique" dans son UI mais c'est un **texte informatif sans code sous-jacent** — 100% mock/statique.

### 3.7.3 Calcul du solde affiché sur la fiche tiers

**Deux méthodes coexistent, donnant des résultats différents :**

| Service | Méthode de calcul | Fichier |
|---------|-------------------|---------|
| `receivableService.ts` | Match par `thirdPartyCode` sur les lignes | Ligne 119 |
| `clientService.ts` | Match par `accountCode.startsWith('411')` | Ligne 113 |

De plus, `syncThirdPartyBalances()` dans `receivableService.ts` (ligne 395) écrit un champ `balance` redondant sur la fiche tiers, créant un risque de désynchronisation.

### 3.7.4 Conditions de paiement et dates d'échéance

**NON IMPLÉMENTÉ.** Les conditions de paiement existent dans les types (`conditionsPaiement`, `delaiPaiement`) mais :
- La date d'échéance sur les factures est **toujours hardcodée à +30 jours** (`clientService.ts` ligne 55, `RecouvrementModule.tsx` ligne 483)
- Le `delaiPaiement` du tiers n'est **jamais utilisé** pour calculer la date d'échéance
- Le champ `date_echeance` n'existe pas sur `journal_lines` en Supabase

### 3.7.5 Relances clients automatiques

**Partiellement implémenté :**
- 6 niveaux de relance (AUCUNE → RELANCE_1/2/3 → MISE_EN_DEMEURE → CONTENTIEUX)
- Attribution automatique basée sur le nombre de jours de retard (0, 1-30, 31-60, 61-90, >90)
- Templates email/SMS disponibles mais **hardcodés en `useState`**, non persistés
- **Seuils non paramétrables** — codés en dur dans `RecouvrementModule.tsx` (lignes 497-501)

---

## 3.8 Recouvrement

### 3.8.1 Alimentation du module

**Hybride** : les créances sont calculées depuis les données comptables réelles (lignes `411xxx` des `journalEntries`) via `adapter.getAll`. Les dossiers de recouvrement peuvent aussi être créés manuellement via la table `recoveryCases`. Risque de divergence entre les deux sources.

### 3.8.2 Calcul des pénalités de retard

- **Taux hardcodé à 5%** du principal (`RecouvrementModule.tsx` ligne 571 : `montantTotal * 0.05`)
- **Non paramétrable** par dossier ni par société
- **Non conforme OHADA** : l'Acte Uniforme sur le droit commercial prévoit un taux légal (taux directeur BCEAO/BEAC + marge), pas un forfait de 5%

### 3.8.3 Historique des actions de recouvrement

- **Horodaté** : OUI — champ `date` sur chaque action (`recoveryService.ts` ligne 147)
- **Lié à la pièce comptable source** : **NON** — les actions sont liées au dossier de recouvrement (`dossierId`) mais pas à un `journalEntryId` spécifique

### 3.8.4 Provisions pour créances douteuses

**OUI, auto-générées** via `posterProvisions()` dans `receivableService.ts` :
- Débit `6594` / Crédit `491`
- **Note sur la conformité SYSCOHADA** : le référentiel révisé 2017 utilise `6594` (Charges provisionnées d'exploitation) et `491` (Dépréciation des comptes clients). Les codes `6912`/`4912` correspondent à l'ancien plan. Les comptes utilisés sont **acceptables** selon l'interprétation du plan révisé, mais certains experts préfèrent `6912`/`4912`.
- **BUG** : le numéro de pièce est toujours `PROV-{date}-001` — exécuter la fonction deux fois crée des provisions en double
- **Pas de reprise** : aucune fonction pour `D 491 / C 7594` quand le client paie

---

## 3.9 OCR Factures

### 3.9.1 Extraction automatique

Le modèle de données (`ExtractedData` interface, lignes 27-76 de `OCRInvoices.tsx`) prévoit tous les champs :
- Montant HT (`subtotal`), TVA (`taxAmount`), TTC (`totalAmount`)
- Date de facture (`documentDate`), numéro (`documentNumber`)
- NIF fournisseur (`supplierTaxId`)

**Mais l'extraction est SIMULÉE** : `processFile()` utilise un `setTimeout(3s)` et retourne des données fictives (fournisseur = "Nouveau Fournisseur", montants = 0). Un bandeau avertit : "L'extraction OCR nécessite un service externe."

### 3.9.2 Correspondance NIF → fournisseur existant

**NON IMPLÉMENTÉ.** Aucun code ne cherche le NIF extrait dans la table `thirdParties`.

### 3.9.3 Création fournisseur à la volée

**NON IMPLÉMENTÉ.** Aucun workflow de création de tiers depuis l'OCR.

### 3.9.4 Écriture comptable après validation OCR

**NON IMPLÉMENTÉ.** `validateInvoice()` (ligne 254) contient un commentaire `// Create accounting entry` suivi de **zéro code**. L'`accountingEntryId` existe dans l'interface mais n'est jamais peuplé.

### 3.9.5 Stockage de la facture originale

**NON.** Le fichier est stocké en blob URL temporaire (`URL.createObjectURL(file)`) qui est perdu au rechargement de la page. **Aucun upload vers Supabase Storage.**

**Verdict : Le module OCR est un prototype UI non fonctionnel.**

---

## 3.10 Signature Électronique

**Prototype UI uniquement.** `ElectronicSignature.tsx` :
- 3 documents mock hardcodés en `useState`
- Méthodes de signature (dessin, texte, upload, certificat) implémentées en UI
- `signDocument()` modifie uniquement l'état React local
- Aucune connexion à un prestataire de signature (DocuSign, Yousign, etc.)
- Les mentions "Certifié eIDAS" et "AES-256" sont des labels cosmétiques sans backend
- **Aucune persistance en base**

---

# PARTIE II — AUDIT ARCHITECTE FRONTEND / SUPABASE

---

## 4.1 Schéma de base de données Supabase

### 4.1.1 Tables existantes

**16 tables tenant + 6 tables système** dans les 5 migrations :

| Table | Migration | PK | Audit cols | Soft delete |
|-------|-----------|-----|-----------|-------------|
| societes | 1 | UUID | created_at, updated_at | NON |
| roles | 1 | UUID | created_at | NON |
| permissions | 1 | UUID | created_at | NON |
| role_permissions | 1 | (role_id, perm_id) | N/A | NON |
| profiles | 1 | UUID (FK auth.users) | created_at, updated_at | NON |
| devises | 1 | UUID | created_at | NON |
| fiscal_years | 2 | UUID | created_at, updated_at | NON |
| accounts | 2 | UUID | created_at, updated_at | NON |
| journal_entries | 2 | UUID | created_at, updated_at | NON |
| journal_lines | 2 | UUID | N/A | NON |
| third_parties | 2 | UUID | created_at, updated_at | NON |
| assets | 2 | UUID | created_at, updated_at | NON |
| budget_lines | 2 | UUID | created_at | NON |
| audit_logs | 2 | UUID | timestamp | NON |
| settings | 2 | TEXT (key) | created_at, updated_at | NON |
| closure_sessions | 3 | UUID | created_at | NON |
| provisions | 3 | UUID | created_at | NON |
| exchange_rates | 3 | UUID | created_at | NON |
| hedging_positions | 3 | UUID | created_at, updated_at | NON |
| revision_items | 3 | UUID | created_at | NON |
| inventory_items | 3 | UUID | created_at, updated_at | NON |
| alias_tiers | 3 | UUID | created_at | NON |
| alias_prefix_config | 3 | UUID | created_at | NON |

### 4.1.2 Tables MANQUANTES

| Table attendue | Rôle | Statut |
|----------------|------|--------|
| **journaux** | Définition des journaux comptables | **ABSENT** |
| **lettrages** | Enregistrements de lettrage | **ABSENT** |
| **periodes_comptables** | Périodes mensuelles ouvertes/clôturées | **ABSENT** |
| **contacts** | Contacts individuels liés aux tiers | **ABSENT** |
| **recovery_cases** | Dossiers de recouvrement | **Dexie seulement** — pas en Supabase |
| **stock_movements** | Mouvements de stock | **Dexie seulement** — pas en Supabase |
| **fiscal_periods** | Périodes fiscales | **Dexie seulement** — pas en Supabase |

### 4.1.3 Contraintes manquantes

| Contrainte | Table | Statut |
|------------|-------|--------|
| `CHECK (debit >= 0)` | journal_lines | **ABSENT** |
| `CHECK (credit >= 0)` | journal_lines | **ABSENT** |
| `CHECK (debit = 0 OR credit = 0)` | journal_lines | **ABSENT** |
| `SUM(debit) = SUM(credit)` trigger | journal_lines | **ABSENT** |
| Blocage période clôturée trigger | journal_entries | **ABSENT** |
| Immutabilité posted trigger | journal_entries | **ABSENT** |
| Numérotation séquentielle trigger | journal_entries | **ABSENT** |
| FK `journal_lines.account_code` → `accounts.code` | journal_lines | **ABSENT** |
| FK `journal_lines.third_party_code` → `third_parties.code` | journal_lines | **ABSENT** |
| FK `budget_lines.fiscal_year` → `fiscal_years` | budget_lines | **ABSENT** (TEXT, pas UUID) |
| FK `revision_items.session_id` → `closure_sessions` | revision_items | **ABSENT** |
| PK `settings(tenant_id, key)` | settings | **BUG** : PK = `key` seul |

### 4.1.4 Index

**Présents** (17 index, migration 4 lignes 73-111) couvrant les patterns principaux.

**Manquants** :
- `journal_lines(tenant_id, lettrage_code)` — requêtes de lettrage
- `journal_entries(tenant_id, date, journal)` — filtre journal + période
- `closure_sessions(tenant_id, statut)` — sessions actives
- `hedging_positions(tenant_id, status)` — aucun index
- `provisions(tenant_id, statut)` — aucun index par tenant

### 4.1.5 Colonnes d'audit

- `created_at` : présent sur toutes les tables
- `updated_at` : **manquant** sur journal_lines, budget_lines, provisions, exchange_rates, alias_tiers, alias_prefix_config
- `created_by` / `updated_by` : **présent uniquement sur journal_entries** (`created_by`), absent partout ailleurs
- `deleted_at` (soft delete) : **ABSENT sur toutes les tables** — les enregistrements sont hard-deletés

---

## 4.2 Row Level Security (RLS) Supabase

### 4.2.1 Activation

RLS activé sur **17 tables tenant** (migration 4, lignes 9-25). **NON activé** sur :
- `societes` — n'importe quel utilisateur peut lire/modifier toute société
- `roles` — modifiable par tous
- `permissions` — modifiable par tous
- `role_permissions` — modifiable par tous
- **`profiles`** — **CRITIQUE** : un utilisateur peut modifier son `company_id` pour accéder aux données d'une autre société
- `devises` — modifiable par tous

### 4.2.2 Isolation multi-société

**OUI** pour les 17 tables tenant, via la même politique : `tenant_id = get_user_company_id()`. La fonction `get_user_company_id()` est `SECURITY DEFINER STABLE` et lit le `company_id` de la table `profiles`.

### 4.2.3 Différenciation par rôle

**NON.** Les 17 policies utilisent la même condition identique. Aucune distinction entre administrateur, comptable, auditeur (lecture seule), ou dirigeant. Un auditeur a les mêmes droits INSERT/UPDATE/DELETE qu'un administrateur.

### 4.2.4 Protection des écritures validées/période clôturée

**NON.** Aucune policy ne vérifie `journal_entries.status` ni `fiscal_years.is_closed`. Un UPDATE direct peut :
- Changer le status d'une écriture `posted` en `draft`
- Modifier une écriture sur un exercice clôturé
- Supprimer une écriture postée

### 4.2.5 Edge Functions pour opérations critiques

**NON.** Aucune Edge Function n'est utilisée. Les seules fonctions PostgreSQL sont les 3 RPC de lecture (`get_trial_balance`, `get_general_ledger`, `get_dashboard_kpis`). Les opérations d'écriture critiques (validation, lettrage, clôture) sont entièrement côté client.

---

## 4.3 Transactions et atomicité

### 4.3.1 Atomicité de la validation d'écriture multi-lignes

**Architecture Dexie** : Les écritures sont stockées comme un seul document JSON avec un tableau `lines` imbriqué. L'insertion est donc atomique par construction (un seul `put()`).

**Architecture Supabase** : `journal_entries` et `journal_lines` sont des tables séparées. L'insertion se fait par deux appels HTTP séparés. **Pas d'atomicité** — une écriture pourrait être créée sans ses lignes en cas d'échec réseau.

### 4.3.2 Usage de supabase.rpc()

- `get_trial_balance` : utilisé pour la balance (lecture seule)
- `get_general_ledger` : utilisé pour le grand livre (lecture seule)
- `get_dashboard_kpis` : utilisé pour le dashboard (lecture seule)
- **Aucun RPC pour les opérations d'écriture** (validation, lettrage, clôture)

### 4.3.3 État cohérent en cas d'échec réseau

**NON GARANTI.** `SupabaseAdapter.transaction()` est un **no-op** (lignes 218-222) — exécute le callback sans aucune garantie transactionnelle. De plus, `adapter.transaction()` n'est **jamais appelé** dans le code applicatif (0 occurrence dans `src/`).

### 4.3.4 Opérations multi-appels sans transaction

| Opération | Appels séquentiels | Risque |
|-----------|-------------------|--------|
| Validation d'écriture | update status + logAudit | Audit orphelin |
| Lettrage auto | N × update journalEntries | Lettrage partiel |
| Lettrage manuel | N × update journalEntries | Lettrage partiel |
| Clôture | lock entries + create AN + create résultat + update fiscalYear + update session | État incohérent |
| Extourne | update original + create reversal | Original marqué reversed sans contrepassation |
| Carry-forward | create AN entries + update fiscal year | AN orphelins |
| Provisions | create provisions + create journal entry | Provision sans écriture |
| CRUD + audit | create/update/delete + logAudit | Record sans trace |

---

## 4.4 Données hardcodées — Recensement exhaustif

### Taux de TVA par pays (17 pays)

| Fichier | Données | Lignes |
|---------|---------|--------|
| `packages/shared/src/constants/syscohada.ts` | TVA standard : CI 18%, CM 19.25%, SN 18%, GA 18%, etc. | 109-132 |
| `packages/shared/src/constants/syscohada.ts` | IS standard : CI 25%, CM 33%, SN 30%, etc. | 133-136 |
| `src/utils/isCalculation.ts` | IS rates 17 pays + minimums IS | 8-35 |
| `src/features/clients/services/clientService.ts` | TVA 19.25% hardcodée | 48 |

### Comptes SYSCOHADA

| Fichier | Données | Lignes |
|---------|---------|--------|
| `src/data/planComptable.ts` | ~193 comptes classes 1-7 | Entier |
| `src/data/syscohada-referentiel.ts` | ~643 entrées classes 1-9 | Entier |
| `packages/shared/src/constants/syscohada.ts` | Mappings bilan/résultat + classes | 12-103 |
| `src/services/receivableService.ts` | Comptes 491, 6594, 7594, 416 | 70-75 |
| `src/services/entryGuard.ts` | Préfixe caisse '57' | 73 |
| `src/features/balance/services/balanceService.ts` | Préfixes '411', '401', '57' | 284-306 |
| `src/services/trialBalanceService.ts` | Classes actif/passif | 108-118 |

### Codes journaux

| Fichier | Données | Lignes |
|---------|---------|--------|
| `packages/shared/src/constants/syscohada.ts` | AC, VE, BQ, CA, OD, AN, CL | 138-146 |
| `src/pages/accounting/JournalsPage.tsx` | VT, AC, BQ, CA, OD, AN (mock) | 245-312 |

### Données de démonstration en production

| Fichier | Nature | Lignes |
|---------|--------|--------|
| `src/pages/accounting/EntriesPage.tsx` | Tableau vide (TODO) | 42 |
| `src/pages/accounting/JournalsPage.tsx` | 6 journaux + écritures EUR 2019 | 245-487 |
| `src/pages/accounting/ChartOfAccountsPage.tsx` | 28 comptes avec soldes fictifs | 84-129 |
| `src/pages/tiers/ClientsModule.tsx` | Sociétés camerounaises fictives | 216-500+ |
| `src/pages/tiers/ClientDetailView.tsx` | "SARL CONGO BUSINESS" | 209-369 |
| `src/pages/tiers/FournisseursModule.tsx` | 7 fournisseurs CEMAC fictifs | 101-332 |
| `src/pages/tiers/FournisseurDetailView.tsx` | Fournisseur fictif | 235-358 |
| `src/pages/closures/sections/RapprochementBancaire.tsx` | 8 moyens de paiement + commissions | 161-250 |
| `src/components/accounting/JournalEntryModal.tsx` | 19 comptes + 9 codes analytiques | 105-138 |
| `src/pages/accounting/ElectronicSignature.tsx` | 3 documents fictifs | 77-210 |
| `src/pages/accounting/OCRInvoices.tsx` | Données OCR simulées | 209-224 |
| `src/components/accounting/AdvancedGeneralLedger.tsx` | Grand livre mock | 1585-1698 |

### Seuils et paramètres

| Fichier | Donnée | Valeur | Lignes |
|---------|--------|--------|--------|
| `src/services/receivableService.ts` | Buckets aging | 30/60/90/180/360 | 78-85 |
| `src/services/receivableService.ts` | Taux provisions | 0-100% par tranche | 88-95 |
| `src/services/closureService.ts` | Tolérance déséquilibre | 1 FCFA | 103, 206 |
| `src/services/trialBalanceService.ts` | Tolérance Actif=Passif | 1 FCFA | 138 |
| `src/components/accounting/Lettrage.tsx` | Tolérance lettrage | 0.01 | 73 |
| `src/components/accounting/Lettrage.tsx` | Dates par défaut | 2024-01-01 à 2024-12-31 | 64 |
| `src/components/accounting/Lettrage.tsx` | Compte par défaut | 411001 | 65 |
| `src/pages/tiers/RecouvrementModule.tsx` | Pénalité retard | 5% | 571 |
| `src/pages/tiers/RecouvrementModule.tsx` | Échéance par défaut | +30 jours | 483 |
| `src/features/clients/services/clientService.ts` | Score solvabilité | 75 | 176 |
| `src/components/setup/CompanySetupWizard.tsx` | TVA défaut Cameroun | 19.25% / 5.5% | 115-149 |

### Migration cible recommandée

Toutes ces données devraient migrer vers :
- Table `parametres_fiscaux(tenant_id, pays, type, valeur)` — taux TVA/IS par pays
- Table `journaux(tenant_id, code, libelle, type)` — codes journaux
- Table `parametres_comptables(tenant_id, key, value)` — seuils, tolérances, buckets
- Table `reference_data(type, code, label)` — formes juridiques, pays, devises

---

## 4.5 Calculs et algorithmes — Vérification de l'exactitude

### Solde d'un compte

**`balanceService.ts`** (lignes 191-208) :
```typescript
const soldeNet = data.debit - data.credit; // Raw arithmetic ⚠️
soldeDebiteur: soldeNet > 0 ? soldeNet : 0,
soldeCrediteur: soldeNet < 0 ? Math.abs(soldeNet) : 0,
```

**BUG** : Ne respecte PAS le sens normal SYSCOHADA. Le calcul est identique quel que soit le type de compte. Pour un compte créditeur (passif, produits), un solde net positif (debit > credit) est une **anomalie**, mais il est affiché comme solde débiteur normal. Le `detectAnomalies()` (lignes 267-320) détecte ces cas a posteriori mais le calcul principal ne les traite pas.

### Balance — requête et calcul

```typescript
// balanceService.ts lignes 46-72
const entries = await adapter.getAll('journalEntries'); // PAS de filtre status ⚠️
for (const entry of filteredEntries) {
  for (const line of entry.lines) {
    existing.debit += line.debit;  // Raw += arithmetic ⚠️
    existing.credit += line.credit;
  }
}
```

**BUGs** :
1. Pas de filtre `status !== 'draft'` — brouillons inclus
2. Arithmétique `+=` au lieu de Money class
3. Pas de filtre `societe_id` côté Dexie

### Grand Livre — solde progressif

```typescript
// generalLedgerService.ts lignes 68-76
let runningBalance = soldeOuverture; // Correct
// ... sort entries ...
runningBalance = 0;  // ⚠️ ÉCRASE le solde d'ouverture
for (const e of sorted) {
  runningBalance += e.debit - e.credit; // Raw arithmetic
  e.solde = runningBalance;
}
```

**BUG** : Le `runningBalance = 0` à la ligne 76 annule le `soldeOuverture` défini à la ligne 68.

### Lettrage — tolérance

```typescript
// lettrageService.ts ligne 142
d.debit === c.credit  // ⚠️ Strict equality on floats
```

**BUG** : Comparaison stricte `===` sur des `number` flottants. Devrait être `Math.abs(d.debit - c.credit) < 0.01`.

### Trésorerie KPI — RPC PostgreSQL

```sql
-- rpc_functions.sql ligne 93
CASE WHEN jl.account_code LIKE '5%' AND jl.debit > jl.credit
  THEN jl.debit - jl.credit ELSE 0 END
```

**BUG** : Condition `jl.debit > jl.credit` par ligne n'a pas de sens — une ligne a soit débit soit crédit (pas les deux). Le correct : `SUM(jl.debit - jl.credit) WHERE account_code LIKE '5%'`.

---

## 4.6 Performance et requêtes Supabase

### 4.6.1 Filtres systématiques exercice/société

**NON.** Côté Dexie, `adapter.getAll('journalEntries')` charge TOUT sans filtre. Côté Supabase, le RLS filtre par `tenant_id` automatiquement, mais le filtre par exercice/date n'est pas systématique.

### 4.6.2 Pagination

**NON IMPLÉMENTÉE** sur les requêtes de données. Toutes les listes chargent l'intégralité de la table en mémoire React. Un composant `DataTable` existe pour le rendu paginé, mais les données sous-jacentes sont toujours chargées en bloc.

### 4.6.3 Jointures

**Multiples appels séquentiels.** Le pattern DataAdapter appelle `getAll` sur chaque table séparément, puis fait les jointures en JavaScript avec des boucles imbriquées. Aucun `.select('*, lines(*)')` Supabase.

### 4.6.4 Vues matérialisées

**AUCUNE.** Zéro `MATERIALIZED VIEW` dans le schéma. Tous les agrégats sont recalculés à chaque requête.

### 4.6.5 Subscriptions Realtime

**OUI, implémentées** dans `src/services/realtime/realtimeService.ts`. Souscriptions `postgres_changes` sur `journal_entries`, `chart_of_accounts`, `fiscal_years`. **Correctement désabonnées** dans le cleanup de `useInvalidateOnEntryChange.ts`.

---

## 4.7 Gestion des erreurs et UX

### 4.7.1 Messages d'erreur intelligibles

**Mixte.** Le `JournalEntryModal` affiche les erreurs de validation clairement (lignes 571-574). Mais les erreurs Supabase/Dexie dans `JournalsPage` (ligne 419) remontent `error.message` brut qui peut être technique.

### 4.7.2 Messages de contrainte d'équilibre

**Pas applicable** — il n'y a pas de trigger PostgreSQL d'équilibre. Le contrôle est côté React avec des messages clairs ("L'écriture n'est pas équilibrée").

### 4.7.3 États loading/error/success

| Composant | Loading | Error | Success |
|-----------|---------|-------|---------|
| JournalEntryModal | OUI (`isSaving`) | OUI (validationErrors) | OUI (toast) |
| EntriesPage | **NON** | **NON** | **NON** |
| JournalsPage | **NON** | Partiel (catch brut) | OUI (toast) |
| ChartOfAccountsPage | Hardcodé `false` | Hardcodé `false` | N/A |
| Lettrage | **NON** | Partiel (toast) | OUI (toast) |
| OCRInvoices | Simulé | **NON** | Simulé |
| ClientsModule | **NON** | **NON** | **NON** |
| RecouvrementModule | OUI | Partiel | OUI (toast) |

### 4.7.4 Protection double soumission

| Composant | Guard isSaving | Résultat |
|-----------|---------------|----------|
| JournalEntryModal | **OUI** (ligne 540) | **CORRECT** |
| LettrageAutomatiquePage | **OUI** (`isRunning`) | **CORRECT** |
| EntriesPage | **NON** | **VULNÉRABLE** |
| JournalsPage | **NON** | **VULNÉRABLE** |
| ChartOfAccountsPage | **NON** | **VULNÉRABLE** |
| OCRInvoices | **NON** | **VULNÉRABLE** |
| Lettrage | **NON** | **VULNÉRABLE** |

---

## 4.8 Interconnexion entre modules

### 4.8.1 Comptabilité → Gestion des Tiers

**Mise à jour en temps réel du solde client** : **PARTIELLE.**
- `useInvalidateOnEntryChange.ts` détecte les modifications de `journalEntries` via Dexie hooks et invalide les clés React Query `'lettrage'`, `'balance'`, `'kpis'` (debounce 300ms).
- **MAIS** le `TiersDashboard` utilise un `useEffect` avec `[adapter]` comme seule dépendance — il **ne se met PAS à jour** quand des écritures changent. Le KPI encours clients n'est pas invalidé.

### 4.8.2 Gestion des Tiers → Comptabilité

**Génération automatique d'écriture depuis une facture tiers** : **NON IMPLÉMENTÉE.** Il n'existe aucun code qui crée une écriture comptable (D 411xxx / C 7xxx / C 4432x TVA) depuis le module Tiers. La création de facture est un concept absent du module.

### 4.8.3 Lettrage Comptabilité ↔ Lettrage Global Tiers

**MÊME composant, MÊME table.** `LettrageModule.tsx` (Tiers) rend `<Lettrage />` (Comptabilité). Les données de lettrage sont stockées dans `journalEntries.lines[].lettrageCode`. Pas de table `lettrages` séparée. **Synchronisation garantie** car c'est exactement le même chemin de données.

### 4.8.4 Recouvrement ↔ Balance âgée

**Sources distinctes, logique dupliquée :**
- `RecouvrementModule.tsx` calcule les créances inline depuis `journalEntries` (lignes 427-500)
- `receivableService.ts` calcule l'aging depuis `journalEntries` (lignes 182-252)
- `useBalanceAgeeClients.ts` appelle `getAgingAnalysis()` de receivableService
- **Pas de table de créances séparée** susceptible de désynchronisation — les trois chemins lisent la même source. Mais la logique est **dupliquée et incohérente** (dates d'échéance calculées différemment).

### 4.8.5 OCR Factures → Comptabilité

**NON CONNECTÉ.** La validation OCR **ne crée aucune écriture** dans `journalEntries`. Le module est un prototype déconnecté.

---

# PARTIE III — LIVRABLES

---

## LIVRABLE 1 — FICHES D'ANOMALIES COMPLÈTES

### ANOMALIES CRITIQUES (18)

---

```
[AF-001] Aucun contrôle d'équilibre D=C en base de données
Sévérité   : CRITIQUE
Module     : Comptabilité
Type       : Sécurité | Non-conformité SYSCOHADA
Fichier(s) : supabase/migrations/20240101000002_accounting_tables.sql
Description: Il n'existe aucun CHECK, TRIGGER ni RPC PostgreSQL vérifiant que
             SUM(debit) = SUM(credit) par écriture. Le contrôle n'existe que dans
             src/validators/journalEntryValidator.ts (côté React).
             Un INSERT direct en base peut créer une écriture déséquilibrée.
Impact     : Violation de la partie double — invalide toute la comptabilité.
             Non-conformité SYSCOHADA Art. 17.
Correction : Trigger DEFERRED AFTER INSERT sur journal_lines vérifiant
             ABS(SUM(debit) - SUM(credit)) <= 0.01 par entry_id.
```

---

```
[AF-002] Aucun blocage en base des écritures sur période close
Sévérité   : CRITIQUE
Module     : Comptabilité
Type       : Sécurité | Non-conformité SYSCOHADA
Fichier(s) : supabase/migrations/20240101000002_accounting_tables.sql
Description: Il n'existe ni table periodes_comptables, ni trigger empêchant
             l'insertion d'écritures sur un exercice clôturé (fiscal_years.is_closed).
Impact     : Possibilité de modifier une comptabilité clôturée — violation SYSCOHADA
             Art. 19 (intangibilité du bilan d'ouverture).
Correction : Créer table periodes_comptables + trigger BEFORE INSERT/UPDATE
             sur journal_entries vérifiant que la période est ouverte.
```

---

```
[AF-003] Aucune protection d'immutabilité des écritures postées en base
Sévérité   : CRITIQUE
Module     : Comptabilité
Type       : Sécurité | Non-conformité SYSCOHADA
Fichier(s) : supabase/migrations/20240101000004_rls_and_indexes.sql
Description: Les politiques RLS n'empêchent pas la modification/suppression d'une
             écriture avec status='posted'. Un administrateur peut modifier ou
             supprimer n'importe quelle écriture validée.
Impact     : Violation SYSCOHADA Art. 19 — immutabilité du journal.
Correction : Trigger BEFORE UPDATE/DELETE sur journal_entries refusant toute
             modification si OLD.status = 'posted'.
```

---

```
[AF-004] RLS profiles non protégée — escalade de privilèges possible
Sévérité   : CRITIQUE
Module     : Comptabilité | Gestion des Tiers
Type       : Sécurité
Fichier(s) : supabase/migrations/20240101000004_rls_and_indexes.sql
Description: La table profiles n'a pas de RLS activé. Un utilisateur authentifié
             peut modifier son propre company_id pour accéder aux données d'une
             autre société via get_user_company_id().
Impact     : Fuite de données inter-sociétés. Violation totale de l'isolation
             multi-tenant.
Correction : ALTER TABLE profiles ENABLE ROW LEVEL SECURITY + policy empêchant
             le changement de company_id.
```

---

```
[AF-005] Écritures brouillon incluses dans tous les calculs financiers
Sévérité   : CRITIQUE
Module     : Comptabilité
Type       : Calcul incorrect
Fichier(s) : src/features/balance/services/balanceService.ts (ligne 49)
             src/features/accounting/services/generalLedgerService.ts (ligne 321)
             src/services/trialBalanceService.ts (ligne 47)
             src/services/lettrageService.ts (ligne 226)
             src/services/closureService.ts (ligne 250)
Description: Aucun service ne filtre par status. Tous itèrent TOUTES les
             écritures y compris les brouillons non validés.
Impact     : Balance, grand livre, lettrage et clôture reflètent des données
             non confirmées. Rapports financiers faux.
Correction : Filtrer systématiquement par status !== 'draft'.
```

---

```
[AF-006] SupabaseAdapter.transaction() est un no-op
Sévérité   : CRITIQUE
Module     : Comptabilité | Gestion des Tiers
Type       : Désynchronisation | Sécurité
Fichier(s) : packages/data/src/adapters/SupabaseAdapter.ts (lignes 218-222)
Description: La méthode transaction() exécute simplement le callback sans aucune
             garantie transactionnelle. De plus, adapter.transaction() n'est jamais
             appelé dans le code applicatif (0 occurrence).
Impact     : En mode SaaS, toute opération multi-étape peut échouer partiellement.
Correction : Implémenter les opérations critiques comme RPC PostgreSQL.
```

---

```
[AF-007] La clôture ne génère pas l'écriture de détermination du résultat
Sévérité   : CRITIQUE
Module     : Comptabilité
Type       : Non-conformité SYSCOHADA | Calcul incorrect
Fichier(s) : src/services/cloture/closureOrchestrator.ts
             src/services/closureService.ts
Description: L'étape CALCUL_RESULTAT calcule et affiche le résultat (classes 6-7)
             mais ne génère PAS l'écriture de solde des comptes de gestion
             (D tous 7xx / C tous 6xx → contrepartie 120 ou 129).
Impact     : Comptes de gestion jamais soldés. Compte 12x sans résultat.
             Report à nouveau incorrect.
Correction : Générer une écriture dans le journal CL soldant chaque compte 6/7
             avec contrepartie au compte 120 (bénéfice) ou 129 (perte).
```

---

```
[AF-008] Le vieillissement (aging) utilise la date de pièce au lieu de la date d'échéance
Sévérité   : CRITIQUE
Module     : Gestion des Tiers
Type       : Calcul incorrect | Non-conformité SYSCOHADA
Fichier(s) : src/services/receivableService.ts (ligne 209)
             src/features/recovery/services/recoveryService.ts (ligne 197)
             src/pages/tiers/RecouvrementModule.tsx (ligne 483)
Description: L'aging analysis calcule le retard depuis entry.date (date de pièce),
             pas depuis la date d'échéance. Le champ date_echeance n'existe pas
             sur journal_lines en base Supabase.
Impact     : Toutes les balances âgées sont fausses. Provisions mal calculées.
Correction : Ajouter date_echeance à journal_lines. Calculer l'aging depuis
             cette date. Auto-calculer depuis les conditions de paiement du tiers.
```

---

```
[AF-009] Comptes de provisions SYSCOHADA à vérifier (6594/491 vs 6912/4912)
Sévérité   : CRITIQUE
Module     : Gestion des Tiers
Type       : Non-conformité SYSCOHADA
Fichier(s) : src/services/receivableService.ts (lignes 70-75)
Description: Les provisions utilisent 6594/491. Le SYSCOHADA révisé 2017 admet
             6594 (charges provisionnées d'exploitation) et 491 (dépréciation
             clients). Certains experts préfèrent 6912/4912.
Impact     : Classement potentiellement erroné selon l'interprétation adoptée.
Correction : Rendre les comptes de provision paramétrables dans settings.
```

---

```
[AF-010] La clôture valide les brouillons sans contrôle et dégrade les écritures postées
Sévérité   : CRITIQUE
Module     : Comptabilité
Type       : Non-conformité SYSCOHADA | Sécurité
Fichier(s) : src/services/closureService.ts (lignes 234-240)
Description: executerCloture() change le status de TOUTES les écritures à
             'validated' : brouillons promus sans validation, posted rétrogradés.
Impact     : Brouillons déséquilibrés deviennent validés. Violation immutabilité.
Correction : Rejeter les brouillons. Ne pas toucher les posted.
```

---

```
[AF-011] Table settings : clé primaire sans tenant_id — collision multi-tenant
Sévérité   : CRITIQUE
Module     : Comptabilité | Gestion des Tiers
Type       : Sécurité | Désynchronisation
Fichier(s) : supabase/migrations/20240101000002_accounting_tables.sql (ligne 166)
Description: La table settings a PRIMARY KEY (key) sans inclure tenant_id.
Impact     : Collision de données entre sociétés.
Correction : ALTER TABLE settings ADD PRIMARY KEY (tenant_id, key);
```

---

```
[AF-012] Audit logs supprimables — pas de protection
Sévérité   : CRITIQUE
Module     : Comptabilité
Type       : Sécurité | Non-conformité SYSCOHADA
Fichier(s) : supabase/migrations/20240101000004_rls_and_indexes.sql
Description: La table audit_logs a une politique DELETE.
Impact     : Destruction de preuve. Non-conformité SYSCOHADA Art. 20.
Correction : Supprimer la politique DELETE. Ajouter trigger bloquant DELETE/UPDATE.
```

---

```
[AF-013] Pages Comptabilité déconnectées des données réelles
Sévérité   : CRITIQUE
Module     : Comptabilité
Type       : Données hardcodées
Fichier(s) : src/pages/accounting/EntriesPage.tsx (ligne 42)
             src/pages/accounting/JournalsPage.tsx (lignes 246-487)
             src/pages/accounting/ChartOfAccountsPage.tsx (lignes 84-129)
Description: EntriesPage a un tableau vide (TODO). JournalsPage affiche des
             données EUR 2019 hardcodées. ChartOfAccountsPage montre des soldes fictifs.
Impact     : L'utilisateur voit des données fictives.
Correction : Connecter via useData() et useAdapterQuery().
```

---

```
[AF-014] Pages Tiers déconnectées des données réelles
Sévérité   : CRITIQUE
Module     : Gestion des Tiers
Type       : Données hardcodées
Fichier(s) : src/pages/tiers/ClientsModule.tsx (lignes 216-500+)
             src/pages/tiers/ClientDetailView.tsx (lignes 209-369)
             src/pages/tiers/FournisseursModule.tsx (lignes 101-332)
             src/pages/tiers/FournisseurDetailView.tsx (lignes 235-358)
Description: Toutes ces pages utilisent 100% de données mockées.
Impact     : Module Gestion des Tiers non fonctionnel en production.
Correction : Connecter via useAdapterQuery().
```

---

```
[AF-015] Pas de table journaux en base — codes journaux en texte libre
Sévérité   : CRITIQUE
Module     : Comptabilité
Type       : Non-conformité SYSCOHADA | Sécurité
Fichier(s) : supabase/migrations/20240101000002_accounting_tables.sql (ligne 50)
Description: journal_entries.journal est TEXT libre sans FK vers une table journaux.
Impact     : Pas de contrôle d'intégrité, pas de numérotation par journal,
             pas de paramétrage par journal.
Correction : Créer table journaux avec code, libelle, type, last_sequence.
```

---

```
[AF-054] Balance : solde de clôture calculé sans solde d'ouverture
Sévérité   : CRITIQUE
Module     : Comptabilité
Type       : Calcul incorrect
Fichier(s) : src/features/balance/services/balanceService.ts (lignes 191-208)
Description: Le solde de clôture est calculé comme soldeNet = debit - credit
             (mouvements seuls), sans ajouter le solde d'ouverture AN.
Impact     : Balance de vérification fausse — soldes de clôture incorrects.
Correction : soldeNet = soldeOuvertureDebit - soldeOuvertureCredit + debit - credit.
```

---

```
[AF-059] AdvancedGeneralLedger utilise des données mock
Sévérité   : CRITIQUE
Module     : Comptabilité
Type       : Données hardcodées
Fichier(s) : src/components/accounting/AdvancedGeneralLedger.tsx (lignes 1585-1698)
Description: La vue grand livre du composant principal utilise des données
             hardcodées au lieu de consulter le generalLedgerService.
Impact     : L'utilisateur voit un grand livre fictif.
```

---

### ANOMALIES MAJEURES (22)

---

```
[AF-016] Pas de table lettrages — lettrage stocké comme simple code texte
Sévérité   : MAJEURE
Module     : Comptabilité | Gestion des Tiers
Type       : Non-conformité SYSCOHADA | Désynchronisation
Fichier(s) : src/lib/db.ts (ligne 42), src/services/lettrageService.ts
Description: Le lettrage est un simple champ lettrageCode sur journal_lines.
             Pas de table lettrages avec date, utilisateur, montant, statut.
Impact     : Pas d'audit trail du lettrage. Pas de traçabilité.
```

---

```
[AF-017] RLS sans différenciation de rôles
Sévérité   : MAJEURE
Module     : Comptabilité | Gestion des Tiers
Type       : Sécurité
Fichier(s) : supabase/migrations/20240101000004_rls_and_indexes.sql
Description: Toutes les 17 tables utilisent la même politique tenant_id = company_id.
             Aucune distinction admin/comptable/auditeur.
Impact     : Pas de séparation des pouvoirs.
```

---

```
[AF-018] Arithmétique flottante dans les calculs de balance et grand livre
Sévérité   : MAJEURE
Module     : Comptabilité
Type       : Calcul incorrect
Fichier(s) : src/features/balance/services/balanceService.ts (ligne 47-72)
             src/features/accounting/services/generalLedgerService.ts (ligne 179)
             src/services/closureService.ts (lignes 93-94)
Description: L'accumulation des montants utilise += sur des number JavaScript
             au lieu de la classe Money (Decimal.js).
Impact     : Dérive de précision sur exercices volumineux.
```

---

```
[AF-019] Grand livre sans solde progressif correct
Sévérité   : MAJEURE
Module     : Comptabilité
Type       : Non-conformité SYSCOHADA
Fichier(s) : src/features/accounting/services/generalLedgerService.ts (lignes 68-76)
Description: Le solde d'ouverture est calculé puis immédiatement écrasé par 0.
Impact     : Solde progressif partant de 0 au lieu du solde d'ouverture.
```

---

```
[AF-020] Pas de création automatique de compte auxiliaire à la création d'un tiers
Sévérité   : MAJEURE
Module     : Gestion des Tiers
Type       : Non-conformité SYSCOHADA | Désynchronisation
Fichier(s) : src/services/third-party.service.ts
             src/services/accounting/aliasTiersService.ts
             src/services/accounting/planComptableService.ts
Description: La création d'un tiers ne génère aucun compte auxiliaire.
             Le système d'alias existe mais est déconnecté.
Impact     : Pas de lien automatique tiers ↔ compte comptable.
```

---

```
[AF-021] Le lettrage modifie les écritures sans recalculer le hash SHA-256
Sévérité   : MAJEURE
Module     : Comptabilité
Type       : Sécurité
Fichier(s) : src/services/lettrageService.ts (ligne 347)
Description: Ajouter lettrageCode change le contenu de l'écriture mais le hash
             n'est pas recalculé, cassant la chaîne d'intégrité.
```

---

```
[AF-022] Lettrage automatique inclut les brouillons
Sévérité   : MAJEURE
Module     : Comptabilité
Type       : Calcul incorrect
Fichier(s) : src/services/lettrageService.ts (lignes 226-227)
Description: autoLettrage() charge TOUTES les écritures sans filtre de statut.
```

---

```
[AF-023] Lettrage manuel sans validation d'équilibre
Sévérité   : MAJEURE
Module     : Comptabilité
Type       : Calcul incorrect
Fichier(s) : src/services/lettrageService.ts (lignes 366-400)
Description: applyManualLettrage() ne vérifie pas Σ débits = Σ crédits.
```

---

```
[AF-024] Bilan passif incomplet — comptes 13, 14, 15, 19 manquants
Sévérité   : MAJEURE
Module     : Comptabilité
Type       : Non-conformité SYSCOHADA
Fichier(s) : src/features/financial/services/financialStatementsService.ts
Description: Le bilan passif ne capture que 10, 11, 12. Manquent 13, 14, 15, 19.
Impact     : Passif sous-évalué.
```

---

```
[AF-025] Pas de table periodes_comptables
Sévérité   : MAJEURE
Module     : Comptabilité
Type       : Non-conformité SYSCOHADA
Description: Impossible de clôturer un mois tout en gardant l'exercice ouvert.
```

---

```
[AF-026] TVA hardcodée à 19.25% dans le service client
Sévérité   : MAJEURE
Module     : Gestion des Tiers
Type       : Données hardcodées | Non-conformité SYSCOHADA
Fichier(s) : src/features/clients/services/clientService.ts (ligne 48)
Description: Le taux 0.1925 est faux pour 16 des 17 pays OHADA.
```

---

```
[AF-027] Risque de provisions en double
Sévérité   : MAJEURE
Module     : Gestion des Tiers
Type       : Calcul incorrect
Fichier(s) : src/services/receivableService.ts (ligne 362)
Description: posterProvisions() génère toujours le suffixe '-001' sans vérifier
             l'existence de provisions antérieures.
```

---

```
[AF-028] Deux systèmes de calcul de solde tiers incohérents
Sévérité   : MAJEURE
Module     : Gestion des Tiers
Type       : Désynchronisation
Fichier(s) : src/services/receivableService.ts (ligne 119)
             src/features/clients/services/clientService.ts (ligne 113)
Description: receivableService matche par thirdPartyCode, clientService par
             accountCode.startsWith('411'). Résultats différents possibles.
```

---

```
[AF-029] CASCADE DELETE sur journal_lines
Sévérité   : MAJEURE
Module     : Comptabilité
Type       : Sécurité
Fichier(s) : supabase/migrations/20240101000002_accounting_tables.sql (ligne 75)
Description: Supprimer une écriture supprime silencieusement toutes ses lignes.
Correction : ON DELETE RESTRICT.
```

---

```
[AF-030] Absence de CHECK pour montants négatifs sur journal_lines
Sévérité   : MAJEURE
Module     : Comptabilité
Type       : Non-conformité SYSCOHADA
Fichier(s) : supabase/migrations/20240101000002_accounting_tables.sql (lignes 82-83)
Description: Pas de CHECK (debit >= 0), CHECK (credit >= 0),
             CHECK (debit = 0 OR credit = 0).
```

---

```
[AF-031] Pas de numérotation séquentielle garantie par journal
Sévérité   : MAJEURE
Module     : Comptabilité
Type       : Non-conformité SYSCOHADA
Description: entry_number est TEXT libre. Pas de trigger de séquence.
Impact     : Non-conformité SYSCOHADA Art. 18 — numérotation continue obligatoire.
```

---

```
[AF-032] OCR Factures : aucun backend, aucune création d'écriture
Sévérité   : MAJEURE
Module     : Comptabilité
Type       : Non-conformité SYSCOHADA
Fichier(s) : src/pages/accounting/OCRInvoices.tsx (lignes 194-239, 254)
Description: L'OCR est simulé. La validation ne crée aucune écriture comptable.
```

---

```
[AF-033] Pas de FK sur account_code dans journal_lines
Sévérité   : MAJEURE
Module     : Comptabilité
Type       : Sécurité
Description: Écritures sur des comptes inexistants possibles.
```

---

```
[AF-055] Grand livre : pas de solde cumulatif au 1er jour d'une période filtrée
Sévérité   : MAJEURE
Module     : Comptabilité
Type       : Non-conformité SYSCOHADA
Fichier(s) : src/features/accounting/services/generalLedgerService.ts (lignes 321-335)
Description: Le filtre par période ne calcule pas le solde d'ouverture cumulatif
             (somme de tous les mouvements antérieurs à dateDebut).
```

---

```
[AF-056] RCCM absent du modèle de données tiers
Sévérité   : MAJEURE
Module     : Gestion des Tiers
Type       : Non-conformité OHADA
Fichier(s) : src/lib/db.ts (DBThirdParty), packages/shared/src/types/accounting.ts
Description: Le RCCM, champ obligatoire en zone OHADA, n'existe dans aucun modèle.
```

---

```
[AF-060] Pas de réconciliation balance auxiliaire ↔ collectif
Sévérité   : MAJEURE
Module     : Comptabilité
Type       : Non-conformité SYSCOHADA
Fichier(s) : src/features/balance/services/balanceService.ts
Description: La balance auxiliaire ne vérifie pas que Σ auxiliaires = collectif.
```

---

### ANOMALIES MINEURES (14)

---

```
[AF-034] Pas de rollback en cas d'échec partiel de clôture
Sévérité   : MINEURE
Module     : Comptabilité
Type       : Désynchronisation
Fichier(s) : src/services/cloture/closureOrchestrator.ts
```

---

```
[AF-035] entryGuard charge toutes les écritures 3 fois par insertion
Sévérité   : MINEURE
Module     : Comptabilité
Type       : Performance
Fichier(s) : src/services/entryGuard.ts (lignes 61, 75, 107)
```

---

```
[AF-036] Lettrage.tsx : dates et compte par défaut hardcodés
Sévérité   : MINEURE
Module     : Comptabilité
Type       : Données hardcodées
Fichier(s) : src/components/accounting/Lettrage.tsx (lignes 64-65)
```

---

```
[AF-037] Plan comptable seed incomplet — classes 3, 8, 9 manquantes
Sévérité   : MINEURE
Module     : Comptabilité
Type       : Non-conformité SYSCOHADA
Fichier(s) : src/data/planComptable.ts
```

---

```
[AF-038] extourneService et carryForwardService bypassent le DataAdapter
Sévérité   : MINEURE
Module     : Comptabilité
Type       : Désynchronisation
Fichier(s) : src/services/cloture/extourneService.ts (ligne 163)
             src/services/cloture/carryForwardService.ts (lignes 188, 237)
```

---

```
[AF-039] Duplicate alias préfixes dans alias-tiers-config
Sévérité   : MINEURE
Module     : Gestion des Tiers
Type       : Données hardcodées
Fichier(s) : src/data/alias-tiers-config.ts (lignes 26-31)
```

---

```
[AF-040] Recovery cases : clientId toujours vide, fonctions stub
Sévérité   : MINEURE
Module     : Gestion des Tiers
Type       : Calcul incorrect
Fichier(s) : src/features/recovery/services/recoveryService.ts (ligne 78)
```

---

```
[AF-041] KPI dashboard : trésorerie mal calculée dans RPC
Sévérité   : MINEURE
Module     : Comptabilité
Type       : Calcul incorrect
Fichier(s) : supabase/migrations/20240101000005_rpc_functions.sql (ligne 93)
```

---

```
[AF-042] Trial balance exclut des comptes classe 4 (42x-48x)
Sévérité   : MINEURE
Module     : Comptabilité
Type       : Calcul incorrect
Fichier(s) : src/services/trialBalanceService.ts (lignes 108-118)
```

---

```
[AF-043] Double soumission non empêchée sur plusieurs pages
Sévérité   : MINEURE
Module     : Comptabilité | Gestion des Tiers
Type       : UX
Fichier(s) : EntriesPage, OCRInvoices, ChartOfAccountsPage, Lettrage
```

---

```
[AF-044] Écritures modifiables après validation dans EntriesPage et JournalsPage
Sévérité   : MINEURE
Module     : Comptabilité
Type       : Non-conformité SYSCOHADA
Fichier(s) : src/pages/accounting/EntriesPage.tsx (lignes 389-406)
             src/pages/accounting/JournalsPage.tsx (ligne 337)
```

---

```
[AF-045] Pas de reprise de provision (compte 7912)
Sévérité   : MINEURE
Module     : Gestion des Tiers
Type       : Non-conformité SYSCOHADA
Fichier(s) : src/services/receivableService.ts
```

---

```
[AF-057] Incohérence VT vs VE pour le journal des ventes
Sévérité   : MINEURE
Module     : Comptabilité
Type       : Données hardcodées
Fichier(s) : JournalsPage.tsx (VT) vs journalTemplates.ts (VE)
```

---

```
[AF-058] Désactivation de comptes avec mouvements impossible (bug logique)
Sévérité   : MINEURE
Module     : Comptabilité
Type       : UX
Fichier(s) : src/services/accounting/planComptableService.ts (lignes 170-189)
Description: Le message dit "Désactivation uniquement" mais le code lance une
             exception qui bloque aussi la désactivation.
```

---

### AMÉLIORATIONS (8)

---

```
[AF-046] Pas de pagination sur les requêtes de masse
Sévérité   : AMÉLIORATION
Module     : Comptabilité | Gestion des Tiers
Type       : Performance
```

---

```
[AF-047] Pas de vues matérialisées PostgreSQL pour les agrégats
Sévérité   : AMÉLIORATION
Module     : Comptabilité
Type       : Performance
```

---

```
[AF-048] Historique de lettrage non persisté
Sévérité   : AMÉLIORATION
Module     : Comptabilité
Type       : Non-conformité SYSCOHADA
```

---

```
[AF-049] Nommage mixte français/anglais dans le schéma
Sévérité   : AMÉLIORATION
Module     : Comptabilité | Gestion des Tiers
Type       : UX
```

---

```
[AF-050] Export Excel/PDF stub dans financialStatementsService et generalLedgerService
Sévérité   : AMÉLIORATION
Module     : Comptabilité
Type       : UX
```

---

```
[AF-051] Données de démo dans RapprochementBancaire
Sévérité   : AMÉLIORATION
Module     : Comptabilité
Type       : Données hardcodées
Fichier(s) : src/pages/closures/sections/RapprochementBancaire.tsx (lignes 161-250)
```

---

```
[AF-052] Signature électronique : module UI sans backend
Sévérité   : AMÉLIORATION
Module     : Comptabilité
Type       : UX
```

---

```
[AF-053] Deux services tiers parallèles non unifiés
Sévérité   : AMÉLIORATION
Module     : Gestion des Tiers
Type       : Désynchronisation
Fichier(s) : src/services/third-party.service.ts (API backend)
             src/services/thirdparty-complete.service.ts
             src/features/clients/services/clientService.ts (DataAdapter)
```

---

## LIVRABLE 2 — TABLEAU DE SYNTHÈSE PAR SÉVÉRITÉ

| Sévérité | Nombre | IDs |
|----------|--------|-----|
| **CRITIQUE** | 18 | AF-001 à AF-015, AF-054, AF-059 |
| **MAJEURE** | 22 | AF-016 à AF-033, AF-055, AF-056, AF-060 |
| **MINEURE** | 14 | AF-034 à AF-045, AF-057, AF-058 |
| **AMÉLIORATION** | 8 | AF-046 à AF-053 |
| **TOTAL** | **62** | |

---

## LIVRABLE 3 — PLAN DE CORRECTION PRIORISÉ

### P0 — BLOQUANT (Sécurité & intégrité — à corriger IMMÉDIATEMENT)

| # | IDs | Action | Effort |
|---|-----|--------|--------|
| P0.1 | AF-001, AF-030 | Triggers PostgreSQL : équilibre D=C + CHECK négatifs/bilatéraux | 2j |
| P0.2 | AF-003, AF-029 | Trigger immutabilité posted + ON DELETE RESTRICT | 1j |
| P0.3 | AF-004, AF-011, AF-012 | RLS profiles + PK settings + audit logs non-deletable | 1j |
| P0.4 | AF-002, AF-025 | Table periodes_comptables + trigger blocage période | 2j |
| P0.5 | AF-006 | RPC transactionnelles validation/lettrage/clôture | 3j |
| P0.6 | AF-005 | Filtre status !== 'draft' dans TOUS les services | 1j |
| P0.7 | AF-054 | Fix calcul solde clôture (ouverture + mouvements) | 0.5j |

### P1 — CRITIQUE FONCTIONNEL (Conformité SYSCOHADA)

| # | IDs | Action | Effort |
|---|-----|--------|--------|
| P1.1 | AF-007 | Écriture détermination du résultat + journal CL | 2j |
| P1.2 | AF-010 | Fix clôture : rejeter brouillons, garder posted | 0.5j |
| P1.3 | AF-015, AF-031 | Table journaux + FK + numérotation séquentielle | 2j |
| P1.4 | AF-008 | Champ date_echeance + aging sur échéance | 1.5j |
| P1.5 | AF-009 | Vérifier/corriger comptes provisions | 0.5j |
| P1.6 | AF-016 | Table lettrages + audit trail | 1.5j |
| P1.7 | AF-019 | Fix solde progressif grand livre | 0.5j |
| P1.8 | AF-024 | Ajouter comptes 13-19 dans bilan passif | 0.5j |
| P1.9 | AF-033 | FK account_code sur journal_lines | 0.5j |
| P1.10 | AF-055 | Solde cumulatif au jour 1 d'une période filtrée | 1j |
| P1.11 | AF-056 | Champ RCCM dans le modèle tiers | 0.5j |
| P1.12 | AF-060 | Réconciliation balance auxiliaire ↔ collectif | 1j |

### P2 — MAJEUR (Connexion données réelles + UX critique)

| # | IDs | Action | Effort |
|---|-----|--------|--------|
| P2.1 | AF-013, AF-059 | Connecter EntriesPage, JournalsPage, ChartOfAccountsPage, AdvancedGL | 5j |
| P2.2 | AF-014 | Connecter ClientsModule, ClientDetailView, FournisseursModule, FournisseurDetailView | 4j |
| P2.3 | AF-020 | Auto-création compte auxiliaire à la création de tiers | 2j |
| P2.4 | AF-017 | Policies RLS par rôle (admin/comptable/auditeur) | 2j |
| P2.5 | AF-018 | Migrer vers Money class dans tous les calculs | 2j |
| P2.6 | AF-021-023 | Fix lettrage : hash, brouillons, validation manuelle | 2j |
| P2.7 | AF-026-028 | TVA paramétrable + unifier calcul solde + guard provisions | 2j |
| P2.8 | AF-037 | Compléter seed plan comptable (classes 3, 8, 9) | 1j |

### P3 — MINEUR / AMÉLIORATION

| # | IDs | Action | Effort |
|---|-----|--------|--------|
| P3.1 | AF-034-045, AF-057-058 | Corrections mineures (rollback, perf, stubs, UX, nommage) | 4j |
| P3.2 | AF-046-053 | Pagination, vues matérialisées, exports, unification services | 5j |

**Effort total estimé : ~49 jours-développeur**

---

## LIVRABLE 4 — DONNÉES HARDCODÉES À MIGRER

| Catégorie | Nb items | Fichier(s) principal(aux) | Table cible |
|-----------|----------|--------------------------|-------------|
| Taux TVA par pays | 17 × 2 | `syscohada.ts` | `parametres_fiscaux` |
| Taux IS par pays | 17 + 5 mins | `isCalculation.ts` | `parametres_fiscaux` |
| Comptes SYSCOHADA | ~60 refs | `planComptable.ts`, services | `accounts` (via seed) |
| Codes journaux | 7 | `syscohada.ts`, `JournalsPage.tsx` | `journaux` (nouvelle table) |
| Alias préfixes | 15 | `alias-tiers-config.ts` | `alias_prefix_config` |
| Buckets aging | 6 | `receivableService.ts:78-85` | `parametres_comptables` |
| Taux provisions | 6 | `receivableService.ts:88-95` | `parametres_comptables` |
| Tolérances | 4 | closureService, trialBalance, Lettrage | `parametres_comptables` |
| Pénalité retard | 1 | `RecouvrementModule.tsx:571` | `parametres_comptables` |
| Formes juridiques | 7 | `CompanySetupWizard.tsx:29` | `reference_data` |
| Devises | 4 | `seed.sql` | `devises` (OK en seed) |
| Templates email/SMS | ~10 | `RecouvrementModule.tsx`, `templates.ts` | `templates` (nouvelle table) |
| Données démo production | 12 fichiers | Pages accounting + tiers + closures | **Supprimer** et connecter adapter |

---

## LIVRABLE 5 — OPÉRATIONS NON TRANSACTIONNELLES À SÉCURISER

| Opération | Fichier | Tables touchées | Risque |
|-----------|---------|-----------------|--------|
| Validation d'écriture | `entryWorkflow.ts` | journalEntries + auditLogs | Audit orphelin |
| Lettrage automatique | `lettrageService.ts` | N × journalEntries | Lettrage partiel |
| Lettrage manuel | `lettrageService.ts` | N × journalEntries | Lettrage partiel |
| Clôture d'exercice | `closureService.ts` | entries + AN + résultat + FY + session | État incohérent |
| Carry-forward | `carryForwardService.ts` | journalEntries + fiscalYears | AN orphelins |
| Extourne | `extourneService.ts` | original + reversal entries | Reversed sans contrepassation |
| Régularisations | `regularisationsService.ts` | journalEntries (CCA/FNP) | Régularisation partielle |
| Provisions tiers | `receivableService.ts` | journalEntries + provisions | Provision sans écriture |
| Création tiers + compte | Non implémenté | thirdParties + accounts | Tiers sans compte |
| CRUD + audit | `SupabaseAdapter.ts` | any table + auditLogs | Record sans trace |

**Toutes doivent être implémentées comme RPC PostgreSQL pour le mode SaaS.**

---

## LIVRABLE 6 — SCHÉMA DE BASE DE DONNÉES CORRIGÉ

```sql
-- ============================================================
-- TABLES MANQUANTES
-- ============================================================

-- 1. JOURNAUX (définitions des journaux comptables)
CREATE TABLE journaux (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES societes(id),
  code TEXT NOT NULL,
  libelle TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('achat','vente','banque','caisse','od','an','cloture')),
  compte_contrepartie TEXT,
  last_sequence INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, code)
);

-- 2. PERIODES COMPTABLES
CREATE TABLE periodes_comptables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES societes(id),
  fiscal_year_id UUID NOT NULL REFERENCES fiscal_years(id),
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','locked')),
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES profiles(id),
  reopened_at TIMESTAMPTZ,
  reopened_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, code)
);

-- 3. LETTRAGES
CREATE TABLE lettrages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES societes(id),
  reference TEXT NOT NULL,
  account_code TEXT NOT NULL,
  date_lettrage TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES profiles(id),
  montant NUMERIC(18,2) NOT NULL,
  type TEXT DEFAULT 'complet' CHECK (type IN ('complet','partiel')),
  method TEXT CHECK (method IN ('exact','reference','sum_n','manual')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, reference)
);

-- 4. CONTACTS
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES societes(id),
  third_party_id UUID REFERENCES third_parties(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role TEXT,
  email TEXT,
  phone TEXT,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. RECOVERY CASES (migrer depuis Dexie)
CREATE TABLE recovery_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES societes(id),
  numero_ref TEXT NOT NULL,
  client_id UUID REFERENCES third_parties(id),
  montant_total NUMERIC(18,2) NOT NULL,
  montant_paye NUMERIC(18,2) DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'OUVERT'
    CHECK (statut IN ('OUVERT','EN_COURS','NEGOCIE','CONTENTIEUX','CLOTURE','IRRECUPERABLE')),
  niveau_relance TEXT DEFAULT 'AUCUNE'
    CHECK (niveau_relance IN ('AUCUNE','RELANCE_1','RELANCE_2','RELANCE_3','MISE_EN_DEMEURE','CONTENTIEUX')),
  date_ouverture DATE NOT NULL DEFAULT CURRENT_DATE,
  date_cloture DATE,
  actions JSONB DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, numero_ref)
);

-- 6. PARAMETRES COMPTABLES
CREATE TABLE parametres_comptables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES societes(id),
  category TEXT NOT NULL,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, category, key)
);

-- ============================================================
-- CORRECTIONS SUR TABLES EXISTANTES
-- ============================================================

-- Fix settings PK
ALTER TABLE settings DROP CONSTRAINT settings_pkey;
ALTER TABLE settings ADD PRIMARY KEY (tenant_id, key);

-- Ajouter date_echeance sur journal_lines
ALTER TABLE journal_lines ADD COLUMN date_echeance DATE;

-- Ajouter journal_id FK sur journal_entries
ALTER TABLE journal_entries ADD COLUMN journal_id UUID REFERENCES journaux(id);

-- Ajouter RCCM et regime_fiscal sur third_parties
ALTER TABLE third_parties ADD COLUMN rccm TEXT;
ALTER TABLE third_parties ADD COLUMN regime_fiscal TEXT;
ALTER TABLE third_parties ADD COLUMN forme_juridique TEXT;
ALTER TABLE third_parties ADD COLUMN account_code TEXT;
ALTER TABLE third_parties ADD COLUMN collective_account_code TEXT;

-- Ajouter is_auxiliary et collective_account sur accounts
ALTER TABLE accounts ADD COLUMN is_auxiliary BOOLEAN DEFAULT false;
ALTER TABLE accounts ADD COLUMN collective_account_id UUID REFERENCES accounts(id);
ALTER TABLE accounts ADD COLUMN is_system BOOLEAN DEFAULT false;

-- CHECK constraints sur journal_lines
ALTER TABLE journal_lines
  ADD CONSTRAINT chk_debit_positive CHECK (debit >= 0),
  ADD CONSTRAINT chk_credit_positive CHECK (credit >= 0),
  ADD CONSTRAINT chk_not_bilateral CHECK (debit = 0 OR credit = 0);

-- Changer CASCADE en RESTRICT sur journal_lines
ALTER TABLE journal_lines DROP CONSTRAINT journal_lines_entry_id_fkey;
ALTER TABLE journal_lines ADD CONSTRAINT journal_lines_entry_id_fkey
  FOREIGN KEY (entry_id) REFERENCES journal_entries(id) ON DELETE RESTRICT;

-- ============================================================
-- RLS SUR TABLES NON PROTÉGÉES
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_select ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY profiles_update ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (company_id = (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- RLS sur nouvelles tables
ALTER TABLE journaux ENABLE ROW LEVEL SECURITY;
ALTER TABLE periodes_comptables ENABLE ROW LEVEL SECURITY;
ALTER TABLE lettrages ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE parametres_comptables ENABLE ROW LEVEL SECURITY;

-- Policies tenant standard pour chaque nouvelle table
CREATE POLICY journaux_tenant ON journaux FOR ALL
  USING (tenant_id = get_user_company_id())
  WITH CHECK (tenant_id = get_user_company_id());
CREATE POLICY periodes_tenant ON periodes_comptables FOR ALL
  USING (tenant_id = get_user_company_id())
  WITH CHECK (tenant_id = get_user_company_id());
CREATE POLICY lettrages_tenant ON lettrages FOR ALL
  USING (tenant_id = get_user_company_id())
  WITH CHECK (tenant_id = get_user_company_id());
CREATE POLICY contacts_tenant ON contacts FOR ALL
  USING (tenant_id = get_user_company_id())
  WITH CHECK (tenant_id = get_user_company_id());
CREATE POLICY recovery_tenant ON recovery_cases FOR ALL
  USING (tenant_id = get_user_company_id())
  WITH CHECK (tenant_id = get_user_company_id());
CREATE POLICY parametres_tenant ON parametres_comptables FOR ALL
  USING (tenant_id = get_user_company_id())
  WITH CHECK (tenant_id = get_user_company_id());

-- Supprimer DELETE sur audit_logs
DROP POLICY IF EXISTS audit_logs_delete ON audit_logs;
```

---

## LIVRABLE 7 — TRIGGERS POSTGRESQL MANQUANTS

```sql
-- ============================================================
-- 1. ÉQUILIBRE DÉBIT = CRÉDIT (DEFERRED)
-- ============================================================
CREATE OR REPLACE FUNCTION validate_entry_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_diff NUMERIC(18,2);
BEGIN
  SELECT ABS(COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0))
  INTO v_diff
  FROM journal_lines
  WHERE entry_id = COALESCE(NEW.entry_id, OLD.entry_id);

  IF v_diff > 0.01 THEN
    RAISE EXCEPTION 'Écriture déséquilibrée (écart: % FCFA). Σ Débit doit = Σ Crédit.', v_diff;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER trg_validate_balance
AFTER INSERT OR UPDATE OR DELETE ON journal_lines
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validate_entry_balance();

-- ============================================================
-- 2. IMMUTABILITÉ DES ÉCRITURES POSTÉES (SYSCOHADA Art. 19)
-- ============================================================
CREATE OR REPLACE FUNCTION protect_posted_entries()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.status = 'posted' THEN
    RAISE EXCEPTION 'Suppression interdite — écriture comptabilisée (SYSCOHADA Art. 19)';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'posted' THEN
    IF NEW.status != OLD.status THEN
      RAISE EXCEPTION 'Modification du statut interdite — écriture comptabilisée. Utilisez une contrepassation.';
    END IF;
    IF ROW(NEW.journal, NEW.date, NEW.entry_number, NEW.description)
        IS DISTINCT FROM ROW(OLD.journal, OLD.date, OLD.entry_number, OLD.description) THEN
      RAISE EXCEPTION 'Modification interdite — écriture comptabilisée (SYSCOHADA Art. 19)';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_protect_posted
BEFORE UPDATE OR DELETE ON journal_entries
FOR EACH ROW EXECUTE FUNCTION protect_posted_entries();

-- ============================================================
-- 3. BLOCAGE PÉRIODE CLÔTURÉE
-- ============================================================
CREATE OR REPLACE FUNCTION block_closed_period()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM fiscal_years fy
    WHERE fy.tenant_id = NEW.tenant_id
      AND NEW.date BETWEEN fy.start_date AND fy.end_date
      AND fy.is_closed = true
  ) THEN
    RAISE EXCEPTION 'Saisie impossible : l''exercice comptable est clôturé';
  END IF;

  IF EXISTS (
    SELECT 1 FROM periodes_comptables pc
    WHERE pc.tenant_id = NEW.tenant_id
      AND NEW.date BETWEEN pc.start_date AND pc.end_date
      AND pc.status = 'closed'
  ) THEN
    RAISE EXCEPTION 'Saisie impossible : la période comptable est clôturée';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_block_closed_period
BEFORE INSERT OR UPDATE ON journal_entries
FOR EACH ROW EXECUTE FUNCTION block_closed_period();

-- ============================================================
-- 4. NUMÉROTATION SÉQUENTIELLE PAR JOURNAL
-- ============================================================
CREATE OR REPLACE FUNCTION generate_sequential_entry_number()
RETURNS TRIGGER AS $$
DECLARE
  v_seq INTEGER;
  v_journal TEXT;
BEGIN
  v_journal := COALESCE(NEW.journal, 'OD');

  IF NEW.entry_number IS NULL OR NEW.entry_number = '' THEN
    SELECT COALESCE(MAX(
      CAST(REGEXP_REPLACE(entry_number, '^[A-Z]+-', '') AS INTEGER)
    ), 0) + 1
    INTO v_seq
    FROM journal_entries
    WHERE tenant_id = NEW.tenant_id
      AND journal = v_journal
      AND entry_number ~ ('^' || v_journal || '-\d+$');

    NEW.entry_number := v_journal || '-' || LPAD(v_seq::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_entry_number
BEFORE INSERT ON journal_entries
FOR EACH ROW EXECUTE FUNCTION generate_sequential_entry_number();

-- ============================================================
-- 5. PROTECTION JOURNAL D'AUDIT
-- ============================================================
CREATE OR REPLACE FUNCTION protect_audit_logs()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Le journal d''audit est immuable — % interdit', TG_OP;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_protect_audit
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION protect_audit_logs();

-- ============================================================
-- 6. AUTO-MISE À JOUR updated_at SUR NOUVELLES TABLES
-- ============================================================
CREATE TRIGGER set_updated_at_journaux
  BEFORE UPDATE ON journaux
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_periodes
  BEFORE UPDATE ON periodes_comptables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_contacts
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_recovery
  BEFORE UPDATE ON recovery_cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_parametres
  BEFORE UPDATE ON parametres_comptables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_settings
  BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 7. RPC TRANSACTIONNELLE : VALIDATION D'ÉCRITURE
-- ============================================================
CREATE OR REPLACE FUNCTION validate_journal_entry(p_entry_id UUID)
RETURNS void AS $$
DECLARE
  v_entry journal_entries;
  v_diff NUMERIC(18,2);
BEGIN
  SELECT * INTO v_entry FROM journal_entries WHERE id = p_entry_id;

  IF v_entry IS NULL THEN
    RAISE EXCEPTION 'Écriture non trouvée';
  END IF;

  IF v_entry.status != 'draft' THEN
    RAISE EXCEPTION 'Seules les écritures en brouillon peuvent être validées';
  END IF;

  SELECT ABS(COALESCE(SUM(debit),0) - COALESCE(SUM(credit),0))
  INTO v_diff FROM journal_lines WHERE entry_id = p_entry_id;

  IF v_diff > 0.01 THEN
    RAISE EXCEPTION 'Écriture déséquilibrée (écart: %)', v_diff;
  END IF;

  UPDATE journal_entries SET status = 'validated', updated_at = now() WHERE id = p_entry_id;

  INSERT INTO audit_logs (tenant_id, action, entity_type, entity_id, details, timestamp)
  VALUES (v_entry.tenant_id, 'STATUS_CHANGE', 'journal_entry', p_entry_id::TEXT,
          '{"from":"draft","to":"validated"}'::JSONB, now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 8. RPC TRANSACTIONNELLE : LETTRAGE
-- ============================================================
CREATE OR REPLACE FUNCTION apply_lettrage(
  p_tenant_id UUID,
  p_line_ids UUID[],
  p_lettrage_code TEXT
)
RETURNS void AS $$
DECLARE
  v_total_debit NUMERIC(18,2);
  v_total_credit NUMERIC(18,2);
BEGIN
  SELECT COALESCE(SUM(debit),0), COALESCE(SUM(credit),0)
  INTO v_total_debit, v_total_credit
  FROM journal_lines WHERE id = ANY(p_line_ids);

  IF ABS(v_total_debit - v_total_credit) > 0.01 THEN
    RAISE EXCEPTION 'Lettrage déséquilibré (D:% C:%)', v_total_debit, v_total_credit;
  END IF;

  UPDATE journal_lines SET lettrage_code = p_lettrage_code WHERE id = ANY(p_line_ids);

  INSERT INTO lettrages (tenant_id, reference, account_code, montant, type, method)
  SELECT p_tenant_id, p_lettrage_code,
         (SELECT account_code FROM journal_lines WHERE id = p_line_ids[1]),
         v_total_debit, 'complet', 'manual';

  INSERT INTO audit_logs (tenant_id, action, entity_type, entity_id, details, timestamp)
  VALUES (p_tenant_id, 'LETTRAGE', 'lettrage', p_lettrage_code,
          jsonb_build_object('lines', array_length(p_line_ids, 1), 'montant', v_total_debit), now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## BARRE DE PASSAGE — CONFORMITÉ FINALE

| # | Critère | Statut | Anomalie(s) |
|---|---------|--------|-------------|
| 1 | Aucune écriture déséquilibrée validable (contrôle en base) | **ÉCHEC** | AF-001 |
| 2 | Aucune donnée métier hardcodée dans le frontend | **ÉCHEC** | AF-013, AF-014, AF-026, AF-036, AF-059 |
| 3 | Balance Σ débits = Σ crédits en permanence | **ÉCHEC** — inclut brouillons + solde sans ouverture | AF-005, AF-054 |
| 4 | Solde fiche tiers = solde compte auxiliaire | **ÉCHEC** — deux calculs, pas de compte auxiliaire | AF-020, AF-028 |
| 5 | RLS sur toutes les tables — isolation multi-société | **ÉCHEC** — profiles non protégé | AF-004 |
| 6 | Opérations critiques atomiques | **ÉCHEC** — SupabaseAdapter.transaction() no-op | AF-006 |
| 7 | Aucune écriture sur période clôturée | **ÉCHEC** — pas de contrôle en base | AF-002 |
| 8 | Grand livre avec solde progressif dynamique | **ÉCHEC** — solde ouverture ignoré + mock data | AF-019, AF-055, AF-059 |
| 9 | Interconnexion Comptabilité ↔ Tiers bidirectionnelle temps réel | **ÉCHEC** — services déconnectés | AF-020, AF-028 |
| 10 | États financiers SYSCOHADA depuis données réelles | **PARTIEL** — service OK mais bilan incomplet + pas de résultat en clôture | AF-007, AF-024 |

**Verdict : Les deux modules ne sont PAS conformes.** 18 anomalies critiques et 22 majeures doivent être corrigées avant mise en production.

---

## POINTS POSITIFS NOTABLES

Malgré les 62 anomalies, le codebase comporte des fondations solides :

1. **`JournalEntryModal`** : validation D=C exemplaire avec `isSaving`, contrôle période, hash chain SHA-256, workflow status machine, TVA validation
2. **`AdvancedBalance`** : structure SYSCOHADA 8 colonnes correctement implémentée
3. **`financialStatementsService`** : Bilan et Compte de Résultat calculés depuis données réelles avec structure HAO (comptes 81-89)
4. **`carryForwardService`** : report à nouveau correct (classes 1-5, validation équilibre avant persistance)
5. **`extourneService`** : contrepassation conforme (inversion D/C, marquage, audit trail, prévention double extourne)
6. **`regularisationsService`** : CCA (476/6xx), FNP (6xx/408), FAE (418/7xx), PCA (7xx/477) — conformes SYSCOHADA
7. **Classe `Money`** (Decimal.js) : précision financière architecturalement bien conçue
8. **Hash chain SHA-256** (`integrity.ts`) : piste d'audit cryptographique
9. **`lettrageService`** : 4 algorithmes sophistiqués (exact, référence, somme-N, tolérance)
10. **`journalEntryValidator`** : 6 contrôles complets (équilibre, minimum 2 lignes, pas de négatifs, pas de bilatéraux, compte existe, exercice ouvert)
11. **22 templates d'écriture** couvrant achats, ventes, trésorerie, paie, OD, fiscalité
12. **DataAdapter pattern** : abstraction propre Dexie/Supabase/Hybrid
13. **511 tests Vitest** couvrant les services critiques
14. **Realtime subscriptions** correctement désabonnées au unmount

---

**FIN DU RAPPORT D'AUDIT**

*Audit réalisé le 13 mars 2026 — 80+ fichiers analysés, 62 anomalies documentées, ~49 jours-développeur de corrections estimés.*
