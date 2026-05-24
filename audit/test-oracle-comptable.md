# Oracle de test comptable WiseBook / Atlas Finance — SYSCOHADA révisé

> **But** : référence de vérité chiffrée pour l'agent QA qui écrira les tests d'intégration.
> Devise = **FCFA (XOF/XAF), 0 décimale** → tous les montants sont des entiers.
> Toutes les valeurs « attendues » ci-dessous sont **calculées à la main**, pas des formules.
>
> Audit réalisé en **lecture seule**. Aucune modification du code applicatif.

---

## 0. Repères techniques vérifiés (signatures réelles)

Le QA agent doit appeler les services exactement comme ci-dessous. Tous prennent `adapter: DataAdapter` en 1er paramètre.

### Adaptateur de test
Deux options, toutes deux valides :
- **`new DexieAdapter('nom-unique')`** importé de `@atlas/data` (utilisé par `integration.accountingFlows.test.ts`). ⚠️ `create('journalEntries', …)` **valide l'équilibre D=C et le verrou de période** (cf. `DexieAdapter.assertJournalEntryWritable`, lignes 475-488). Donc toute écriture seedée doit être équilibrée, sinon `create` rejette.
- **`createTestAdapter()`** de `src/test/createTestAdapter.ts` (wrappe le singleton `db`). ⚠️ son `create` **n'impose AUCUNE validation** → pratique pour seeder un brouillon délibérément déséquilibré (scénario 4). Mais le `db` est partagé entre tests → vider les tables entre `it` (ou préférer DexieAdapter avec nom unique par test).

**Recommandation** : `DexieAdapter` avec nom unique par test pour l'isolation ; pour le scénario 4 (brouillon déséquilibré) utiliser `createTestAdapter()` OU seeder le brouillon **équilibré** mais hors-période/draft (le filtre `status==='draft'` suffit à le faire ignorer).

### Forme d'une écriture (table `journalEntries`, `DBJournalEntry`)
```ts
{
  id: string,                 // requis ; DexieAdapter respecte l'id fourni
  entryNumber: string,        // ex 'VE-000001' — DOIT être unique (entryGuard détecte les doublons)
  journal: string,            // 'VE','AC','OD','BQ','CA','AN','RAN'…
  date: string,               // 'YYYY-MM-DD'
  reference: string,
  label: string,
  status: 'draft' | 'validated' | 'posted',
  lines: DBJournalLine[],
  totalDebit: number,         // peut être 0 si on passe par create() direct
  totalCredit: number,
  createdAt: string,          // ISO
  // optionnels: reversed, reversedBy, reversalOf, nature, hash…
}
```
### Forme d'une ligne (`DBJournalLine`)
```ts
{
  id: string,
  accountCode: string,        // ex '411000'
  accountName: string,
  label: string,
  debit: number,              // entier FCFA, >= 0
  credit: number,             // entier FCFA, >= 0  (jamais debit>0 ET credit>0)
  thirdPartyCode?: string, thirdPartyName?: string, …
}
```

### Services & signatures
| Service | Appel |
|---|---|
| États financiers | `financialStatementsService.getFinancialStatements(adapter, exercice)` → `{ bilan, compteResultat, sig, ratios, bilanFonctionnel }` |
| | `financialStatementsService.getBilan(adapter, exercice)` → `Bilan` |
| | `financialStatementsService.getCompteResultat(adapter, exercice)` → `CompteResultat` |
| | `verifierCoherenceResultat(resultatBilan, resultatCDR)` → `{ isValid, ecart, message }` |
| Balance | `balanceService.getBalance(adapter, filters)` → `BalanceAccount[]` |
| | `balanceService.calculateTotals(accounts)` → `BalanceTotals` |
| | `balanceService.verifyEquilibrium(adapter, filters)` → `{ isBalanced, totalDebit, totalCredit, ecart, details }` |
| Balance de vérification | `verifyTrialBalance(adapter, fiscalYear?)` → `TrialBalanceResult` (de `src/services/trialBalanceService.ts`) |
| Grand livre | `generalLedgerService.getAccountLedger(adapter, accountNumber, filters)` → `AccountLedger` |
| | `generalLedgerService.getLedgerAccounts(adapter, filters)` → `AccountLedger[]` |
| TVA | `calculerDeclarationTVA(adapter, debut, fin)` → `TVADeclarationResult` |
| IS | `calculerDeclarationIS(adapter, debut, fin, countryCode?, reintegrations?, deductions?)` → `ISDeclarationResult` |
| IS pur | `calculateIS(input: ISInput)` → `ISResult` (de `src/utils/isCalculation.ts`) |
| TVA pur | `TVAValidator.calculerTVA(montantHT, tauxTVA)` → `number` |
| Affectation | `simulerAffectation(adapter, fiscalYearId, input)` → `AffectationSimulation` |
| Contrepassation | `reverseEntry(adapter, { originalEntryId, reversalDate, reason })` → `ReversalResult` |
| À-nouveaux | `executerCarryForward(adapter, { closingExerciceId, openingExerciceId, openingDate })` |
| TAFIRE | `calculateTAFIRE(adapter, fiscalYear?)` → `TAFIREData` |

### `exercice` — comment `loadEntriesForExercice` filtre
`financialStatementsService` cherche d'abord `fiscalYears` par id, puis par `code`. **Sinon** si `exercice` matche `/^\d{4}$/` (ex `'2025'`) il filtre `date` entre `'2025-01-01'` et `'2025-12-31'`. **Le plus simple : passer `'2025'`** et dater toutes les écritures en 2025. (Idem `verifyTrialBalance(adapter, '2025')` → `e.date.startsWith('2025')`.)

---

## 1. AUDIT DE JUSTESSE — verdict

### Points CORRECTS (vérifiés ligne à ligne)
- **Équilibre D=C** : `verifyTrialBalance` (CHECK 1 & 2) somme en `Money` ; `validateJournalEntrySync` (entryGuard) impose D=C par écriture. **OK**.
- **Exclusion des brouillons** : confirmée et homogène dans **tous** les états —
  `loadEntriesForExercice` (`financialStatementsService.ts:182`), `balanceService.getBalance:26`, `trialBalanceService.ts:48`, `generalLedgerService` (`:29,118,193,225,352`), `taxationService.getEntriesForPeriod:86-89` (n'accepte que `validated|posted`), `tafireService.ts:70,250,283`, `resultAffectationService.computeNetResult:55`, `DexieAdapter.getBalanceByAccount:398`. **OK partout**.
- **Calculs TVA & IS en `Money`** : `tvaValidation.calculerTVA` (`:257`) et `isCalculation.calculateIS` (`percentage()` → Money) n'utilisent **jamais** de float natif. `taxationService.sumByPrefix` agrège en Money. **OK**.
- **Résultat net** : `computeResultatNet` = Produits(7) − Charges(6) en Money ; identique au `resultatExercice` injecté au passif du bilan → **Résultat bilan == Résultat CDR** par construction (même fonction). **OK** (voir scénario 3).
- **Solde progressif grand livre** : `getAccountLedger` trie AN/RAN en tête puis par date, cumule `solde += debit − credit` en Money sans reset. **OK** (scénario 5).
- **Report des à-nouveaux** : `getAccountLedger` recalcule `soldeOuverture` à partir de TOUTES les écritures `< dateDebut` (`:151`) ou des AN/RAN (`:160`). **OK**.
- **Signe des classes au bilan** : actif = net débiteur (2,3,41,5), passif = `Math.abs(net)` pour classes 1,16-19,40 + résultat. **OK**.
- **Contrepassation** : `reverseEntry` inverse debit↔credit, marque l'original `reversed`. Impact net nul. **OK** (scénario 7).
- **Réserve légale OHADA** : `simulerAffectation` applique 5% min, plafonné à 20% du capital social moins la réserve déjà constituée. **OK** (scénario 6).

### ÉCARTS / points de vigilance trouvés

1. **[MINEUR – présentation] `passif.reserves` agrège le report-à-nouveau.**
   `financialStatementsService.ts:302` : `reserves: money(reserves).add(reportANouveau)`. Or `capitauxPropres` (`:277`) additionne déjà `reserves` (compte 11 seul) **et** `reportANouveau` (compte 12) séparément. Donc `capitauxPropres` est **correct** (pas de double comptage dans le total), mais le **champ d'affichage `passif.reserves`** mélange réserves (11) et RAN (12). Le QA doit asserter `capitauxPropres` sur le total, et pour `reserves` attendre `réserves(11) + RAN(12)`. → Documenté dans le scénario 3.

2. **[À CONFIRMER – balance générale, double comptage des AN].**
   `balanceService.getBalance` met les AN/RAN dans `openingBalances` (`:37-46`) **mais aussi** dans `movements` (`:51-74` — la boucle ne filtre PAS le journal AN/RAN). Puis `soldeNet = soldeOuvertureNet + data.debit − data.credit` (`:199`). Pour un compte qui n'a QUE des AN, l'ouverture est comptée deux fois dans le solde de clôture. **Impact** : le **solde** affiché d'un compte alimenté par AN peut être doublé ; les **mouvements** AN/RAN apparaissent en colonne mouvement (discutable en présentation SYSCOHADA, où l'AN va en colonne « solde d'ouverture », pas « mouvement »). À tester explicitement (scénario 5-bis ci-dessous) pour figer le comportement réel. ⚠️ Ceci ne casse PAS `verifyEquilibrium` (qui ne compare que `mouvementsDebit`/`mouvementsCredit`, lesquels restent équilibrés).

3. **[INFO – tolérance] `Money.equals` a une tolérance de 0.01** (`money.ts:55`). En FCFA entier c'est sans effet, mais `verifyEquilibrium` utilise `ecart.isZero()` (strict), tandis que `verifyTrialBalance` CHECK Actif=Passif tolère `<= 1` (`trialBalanceService.ts:153`). Pour des seeds entiers parfaitement équilibrés, `ecart === 0`.

4. **[INFO – IMF] Minimum IS** : `isCalculation.ts` n'a de taux minimum **renseigné** que pour CI(1%), CM(2.2%), SN(0.5%), GA(1%), GW(1%). Pour tout autre pays, `minRate` défaut = **1%**. Taux IS défaut (pays inconnu) = **30%**. À garder en tête pour les assertions IS.

5. **[INFO – TVA bornée à 0]** `calculerDeclarationTVA` renvoie `tvaDue: Math.max(0, …)` et `creditTVA` pour le négatif. Donc en situation de crédit de TVA, `tvaDue=0` ET `creditTVA>0` (scénario 2-bis).

---

## 2. ORACLE CHIFFRÉ — 7 scénarios

> Convention de plan comptable utilisée (SYSCOHADA révisé) :
> `101` capital, `111` réserve légale, `131` résultat net (bénéfice), `2154` matériel,
> `401000` fournisseurs, `411000` clients, `4431` TVA collectée, `4452` TVA déductible/récupérable sur achats,
> `521` banque, `571` caisse, `601` achats de marchandises, `605` autres achats,
> `661` charges de personnel (classe 66), `701` ventes de marchandises, `706` prestations de services.

---

### SCÉNARIO 1 — Vente avec TVA collectée (TVA 18 % CI)

**But** : balance équilibrée, CA, TVA collectée.

**Seed** — 1 écriture, journal `VE`, `date '2025-03-10'`, `status 'validated'` :
HT = 1 000 000 ; TVA 18 % = `TVAValidator.calculerTVA(1000000, 18)` = **180 000** ; TTC = **1 180 000**.

| accountCode | debit | credit |
|---|---|---|
| 411000 (client) | 1 180 000 | 0 |
| 701 (ventes marchandises) | 0 | 1 000 000 |
| 4431 (TVA collectée) | 0 | 180 000 |

`totalDebit = totalCredit = 1 180 000`.

**Attendus** :
- `verifyTrialBalance(adapter,'2025')` : `isBalanced === true`, `totalDebits === 1180000`, `totalCredits === 1180000`, `ecartGlobal === 0`, `unbalancedEntries.length === 0`.
- `verifyTrialBalance` CHECK « Actif = Passif » : Actif = 411 net débiteur = **1 180 000** ; Passif = résultat (701 crédit) **1 000 000** + 44x net créditeur **180 000** = **1 180 000** → `ecart === 0`, status `pass`.
- `balanceService.verifyEquilibrium(adapter, { period:{from:'2025-01-01',to:'2025-12-31'}, searchAccount:'', showZeroBalance:true, balanceType:'generale', displayLevel:2 })` : `isBalanced === true`, `totalDebit === 1180000`, `totalCredit === 1180000`, `ecart === 0`.
- `calculerDeclarationTVA(adapter,'2025-01-01','2025-12-31')` : `tvaCollectee === 180000`, `tvaDeductible === 0`, `tvaDue === 180000`, `creditTVA === 0`, `details.ventesHT === 1000000`, `baseImposable === 1000000`.
- `getCompteResultat(adapter,'2025')` : `chiffreAffaires === 1000000`, `productionVendue === 1000000`, `totalProduitsExploitation === 1000000`, `resultatExploitation === 1000000`, `resultatNet === 1000000`.
- `getBilan(adapter,'2025')` : `actif.creancesClients === 1180000`, `actif.totalActif === 1180000` ; `passif.resultatExercice === 1000000`, `passif.autresDettes === 180000` (4431 = solde créditeur des comptes 42-47 ⇒ part « autres dettes »), `passif.totalPassif === 1180000`.

---

### SCÉNARIO 2 — Achat avec TVA déductible → TVA due nette

**But** : TVA déductible, TVA due nette (combiné avec une vente).

**Seed** — réutiliser la vente du scénario 1 **+** 1 achat, journal `AC`, `date '2025-03-12'`, `status 'validated'` :
HT achat = 500 000 ; TVA 18 % = **90 000** ; TTC = **590 000**.

| accountCode | debit | credit |
|---|---|---|
| 601 (achats marchandises) | 500 000 | 0 |
| 4452 (TVA déductible) | 90 000 | 0 |
| 401000 (fournisseur) | 0 | 590 000 |

`totalDebit = totalCredit = 590 000`.

**Attendus (vente S1 + achat S2 dans le même exercice 2025)** :
- `calculerDeclarationTVA(adapter,'2025-01-01','2025-12-31')` :
  - `tvaCollectee === 180000` (4431 crédit)
  - `tvaDeductible === 90000` (445x débit ; **note** : le service somme le préfixe `'445'`, et `4452` commence par `445`)
  - `tvaDue === 90000`  (180 000 − 90 000)
  - `creditTVA === 0`
  - `details.ventesHT === 1000000`, `details.achatsHT === 500000`.
- `verifyTrialBalance(adapter,'2025')` : `isBalanced === true`, `totalDebits === 1770000`, `totalCredits === 1770000` (1 180 000 + 590 000), `ecartGlobal === 0`.
- `getCompteResultat(adapter,'2025')` : `chiffreAffaires === 1000000`, `achatsConsommes === 500000`, `totalChargesExploitation === 500000`, `resultatExploitation === 500000`, `resultatNet === 500000`.
- `getBilan(adapter,'2025')` :
  - `actif.creancesClients === 1180000`
  - `actif.autresCreances === 90000` (4452 = solde débiteur d'un compte 42-47 ⇒ « autres créances », `financialStatementsService.ts:233`)
  - `actif.totalActif === 1270000` (1 180 000 + 90 000)
  - `passif.dettesFournisseurs === 590000` (401)
  - `passif.autresDettes === 180000` (4431)
  - `passif.resultatExercice === 500000`
  - `passif.totalPassif === 1270000` (590 000 + 180 000 + 500 000) ✔ Actif=Passif.

**SCÉNARIO 2-bis — crédit de TVA** (déductible > collectée) : si on garde **seulement** l'achat S2 (pas la vente) :
- `tvaCollectee === 0`, `tvaDeductible === 90000`, **`tvaDue === 0`**, **`creditTVA === 90000`** (preuve du `Math.max(0,…)` + report en crédit).

---

### SCÉNARIO 3 — Exercice complet minimal (AN + ventes + achats + charges)

**But** : Bilan Actif=Passif, résultat net, cohérence Résultat bilan = Résultat CDR.

**Seed** — exercice `'2025'`. Pré-requis : créer `fiscalYears` `{ id:'fy2025', code:'2025', startDate:'2025-01-01', endDate:'2025-12-31', isClosed:false, isActive:true }` (utile si on veut tester `getBilan` par id ; sinon passer `'2025'`).

**E1 — À-nouveau d'ouverture**, journal `AN`, `date '2025-01-01'`, `validated` :
| accountCode | debit | credit |
|---|---|---|
| 521 (banque) | 2 000 000 | 0 |
| 2154 (matériel) | 3 000 000 | 0 |
| 101 (capital) | 0 | 4 000 000 |
| 401000 (fournisseur) | 0 | 1 000 000 |

Total = 5 000 000 / 5 000 000.

**E2 — Vente HT 4 000 000 + TVA 720 000**, journal `VE`, `date '2025-04-01'`, `validated` :
| 411000 | 4 720 000 | 0 |
| 701 | 0 | 4 000 000 |
| 4431 | 0 | 720 000 |

**E3 — Achat marchandises HT 1 500 000 + TVA 270 000**, journal `AC`, `date '2025-05-01'`, `validated` :
| 601 | 1 500 000 | 0 |
| 4452 | 270 000 | 0 |
| 401000 | 0 | 1 770 000 |

**E4 — Charges de personnel 800 000 payées banque**, journal `OD`, `date '2025-06-30'`, `validated` :
| 661 (charges personnel) | 800 000 | 0 |
| 521 (banque) | 0 | 800 000 |

**Calcul des soldes nets (net = Σdébit − Σcrédit, toutes écritures non-draft)** :
- 521 banque : 2 000 000 − 800 000 = **+1 200 000** (débiteur, trésorerie actif)
- 2154 matériel : **+3 000 000** (immobilisation corporelle)
- 101 capital : net = −4 000 000 → capitalSocial = `abs` = **4 000 000**
- 401000 fournisseur : net = −(1 000 000 + 1 770 000) = −2 770 000 → dettesFournisseurs = **2 770 000**
- 411000 client : **+4 720 000**
- 4431 TVA collectée : net = −720 000
- 4452 TVA déductible : net = +270 000
- 4431+4452 (comptes 44, regroupés 42-47) : net global = −720 000 + 270 000 = **−450 000** → solde créditeur ⇒ `autresDettes = 450 000`, `autresCreances = 0`.

**Compte de résultat** :
- Produits classe 7 : 701 = 4 000 000 ; Charges classe 6 : 601 = 1 500 000, 661 = 800 000 → total charges = 2 300 000.
- `chiffreAffaires === 4000000`
- `achatsConsommes === 1500000`
- `chargesPersonnel === 800000`
- `totalChargesExploitation === 2300000`
- `resultatExploitation === 1700000`
- **`resultatNet === 1700000`**

**Bilan** :
- ACTIF :
  - `immobilisationsCorporelles === 3000000` (2154 ; pas d'amortissement)
  - `totalActifImmobilise === 3000000`
  - `creancesClients === 4720000`
  - `autresCreances === 0`
  - `tresorerieActif === 1200000` (521)
  - `totalActifCirculant === 5920000` (0 stocks + 4 720 000 + 0 + 1 200 000)
  - **`totalActif === 8920000`** (3 000 000 + 5 920 000)
- PASSIF :
  - `capitalSocial === 4000000`
  - `resultatExercice === 1700000`
  - `capitauxPropres === 5700000` (4 000 000 + 0 réserves + 0 RAN + 1 700 000)
  - `dettesFournisseurs === 2770000`
  - `autresDettes === 450000` (solde créditeur net 4431/4452)
  - **`totalPassif === 8920000`** (5 700 000 + 2 770 000 + 450 000)
- **Actif (8 920 000) === Passif (8 920 000)** ✔

**Cohérence résultat** :
- `verifierCoherenceResultat(bilan.passif.resultatExercice, compteResultat.resultatNet)` = `verifierCoherenceResultat(1700000, 1700000)` → `isValid === true`, `ecart === 0`.

> ⚠️ **Note champ `passif.reserves`** : ici `réserves(11)=0` et `RAN(12)=0` donc `passif.reserves === 0`. Si un seed ajoute un compte 11 et un 12, attendre `passif.reserves === réserves(11) + RAN(12)` (cf. écart #1).

---

### SCÉNARIO 4 — Brouillon ignoré (preuve que le filtre `draft` marche)

**But** : prouver qu'une écriture `draft` ne bouge AUCUN état, et qu'en la passant `validated` les états changent.

**Seed** — partir du scénario 1 (vente validée). Ajouter **E_draft**, journal `VE`, `date '2025-03-20'`, **`status 'draft'`** :
| 411000 | 2 360 000 | 0 |
| 701 | 0 | 2 000 000 |
| 4431 | 0 | 360 000 |

(équilibrée 2 360 000 / 2 360 000 — pour pouvoir être seedée même via DexieAdapter).

**Attendus AVEC le brouillon présent (mais ignoré)** — identiques au scénario 1 :
- `getCompteResultat(adapter,'2025').chiffreAffaires === 1000000` (PAS 3 000 000).
- `getCompteResultat(...).resultatNet === 1000000`.
- `calculerDeclarationTVA(...).tvaCollectee === 180000` (PAS 540 000).
- `getBilan(...).actif.totalActif === 1180000`.
- `verifyTrialBalance(adapter,'2025').totalDebits === 1180000` ; `entriesChecked === 1` (le draft n'est pas compté).
- `balanceService.verifyEquilibrium(...).totalDebit === 1180000`.

**Étape 2 — basculer le brouillon en `validated`** (`adapter.update('journalEntries', E_draft.id, { status:'validated' })`) puis re-calculer :
- `chiffreAffaires === 3000000`, `resultatNet === 3000000`.
- `tvaCollectee === 540000`.
- `actif.totalActif === 3540000` (411 = 1 180 000 + 2 360 000).
→ **Δ prouve que le filtre `draft` est la seule différence.**

> Astuce QA : si la bascule `draft→validated` via `update` est bloquée par le verrou (elle ne l'est pas ici, seul `posted` est figé), seeder directement deux variantes.

---

### SCÉNARIO 5 — Grand livre : solde progressif avec à-nouveau

**But** : suite exacte des soldes progressifs d'un compte (compte 521 banque).

**Seed** — compte `521`. Pré-requis `fiscalYears` non obligatoire pour `getAccountLedger`.

**E1 — AN**, journal `AN`, `date '2025-01-01'`, `validated` : `521 debit 1 000 000` / `101 credit 1 000 000`.
**E2 — encaissement client**, journal `BQ`, `date '2025-02-15'`, `validated` : `521 debit 600 000` / `411000 credit 600 000`.
**E3 — paiement fournisseur**, journal `BQ`, `date '2025-03-20'`, `validated` : `401000 debit 250 000` / `521 credit 250 000`.
**E4 — paiement salaires**, journal `BQ`, `date '2025-04-10'`, `validated` : `661 debit 400 000` / `521 credit 400 000`.

**Appel** : `generalLedgerService.getAccountLedger(adapter, '521', { dateDebut:'2025-01-01', dateFin:'2025-12-31' })`.

**Attendus** (tri AN en tête, puis par date ; cumul `solde += debit − credit`) :
- `soldeOuverture` : avec `dateDebut='2025-01-01'`, le service prend les écritures **strictement < '2025-01-01'** → **aucune** → `soldeOuverture === 0`. (L'AN du 2025-01-01 est DANS la période, pas avant.)
- Suite des `entries[].solde` (ordre : AN, puis 02-15, 03-20, 04-10) :
  1. AN +1 000 000 → solde **1 000 000**
  2. +600 000 → **1 600 000**
  3. −250 000 → **1 350 000**
  4. −400 000 → **950 000**
- `totalDebit === 1600000` (1 000 000 + 600 000)
- `totalCredit === 650000` (250 000 + 400 000)
- `soldeFermeture === 950000` (soldeOuverture 0 + 1 600 000 − 650 000)
- `nombreEcritures === 4`.

**Variante 5-bis (report d'ouverture réel)** : appeler avec `dateDebut:'2025-02-01'`. Alors l'AN du 01-01 est **avant** la période → `soldeOuverture === 1000000`, et les `entries` ne contiennent que E2,E3,E4 :
- soldes : +600 000 → **1 600 000** ; −250 000 → **1 350 000** ; −400 000 → **950 000**.
- `totalDebit === 600000`, `totalCredit === 650000`, `soldeFermeture === 950000`, `nombreEcritures === 3`.
→ Le `soldeFermeture` final (**950 000**) est identique aux deux variantes : preuve que le report d'ouverture est correct (écart #2 ne touche PAS le grand livre, seulement la balance).

---

### SCÉNARIO 6 — Affectation du résultat : réserve légale OHADA

**But** : réserve légale minimale = min(5 % du bénéfice ; plafond 20 % capital − réserve déjà constituée).

**Seed** — il faut `fiscalYears`, `accounts` (le service lit `accounts` pour le capital `101*`), et des écritures.

`fiscalYears` : `{ id:'fy2025', code:'2025', startDate:'2025-01-01', endDate:'2025-12-31', isClosed:false }`.
`accounts` : au moins `{ id:'a1', code:'101', name:'Capital', accountClass:'1', … }` (le filtre est `code.startsWith('101')`).

**E_capital** journal `AN` `date '2025-01-01'` `validated` : `521 debit 10 000 000` / `101 credit 10 000 000`.
**E_resultat** — produit net 2 000 000, journal `VE` `date '2025-06-01'` `validated` : `411000 debit 2 000 000` / `701 credit 2 000 000`.
(Pas de charges → résultat net = 2 000 000.)

**Calculs** (`simulerAffectation(adapter, 'fy2025', {})`) :
- `montantResultat === 2000000` (Σ classe 7 crédit − Σ classe 6 débit, sur l'exercice).
- `capitalSocial === 10000000` (net créditeur 101).
- `reserveLegaleActuelle === 0` (aucun mouvement compte 111).
- `reserveLegalePlafond === 2000000` (20 % × 10 000 000).
- `reserveLegaleMinimale === min(5% × 2 000 000 ; plafond − actuelle) = min(100000 ; 2000000) === 100000`.
- `reserveLegalePourcentage === 5`.

**Assertions** :
- `simulerAffectation(adapter,'fy2025',{}).reserveLegaleMinimale === 100000`.
- En passant `input = { reserveLegale: 100000, reportANouveau: 1900000 }` : `ecart === 0`, `isValid === true`, `warnings` ne contient pas « ne correspond pas ».
- En passant `input = { reserveLegale: 50000, reportANouveau: 1950000 }` (dotation < minimum) : `ecart === 0` MAIS `warnings` contient le message « inferieure au minimum obligatoire ».

**Variante 6-bis (plafond atteint)** : si `reserveLegaleActuelle` était déjà ≥ 2 000 000 (seeder un compte 111 crédité de 2 000 000), alors `reserveLegaleMinimale === 0` (plafond − actuelle = 0).

---

### SCÉNARIO 7 — Contrepassation : impact net nul

**But** : une écriture + sa contrepassation → soldes inchangés (net nul).

**Seed** — `fiscalYears` 2025 ouvert recommandé (pour ne pas tomber sur le verrou de période).
**E_orig** journal `VE` `date '2025-06-01'` `entryNumber 'VE-000001'` `status 'validated'` :
| 411000 | 1 000 000 | 0 |
| 701 | 0 | 1 000 000 |

**Appel** : `reverseEntry(adapter, { originalEntryId: E_orig.id, reversalDate:'2025-07-01', reason:'erreur' })`.

**Attendus** :
- `res.success === true`, `res.reversalEntry` défini.
- L'original : `adapter.getById('journalEntries', E_orig.id)` → `reversed === true`, `reversedBy` pointe sur l'id réel de la contrepassation (`getById(reversedBy)` non nul).
- La contrepassation : `reversalOf === E_orig.id`, lignes inversées :
  - ligne 411000 : `debit === 0`, `credit === 1000000`
  - ligne 701 : `debit === 1000000`, `credit === 0`
- **Impact net après les deux écritures** :
  - 411000 : +1 000 000 (orig) − 1 000 000 (ctps) = **0**
  - 701 : −1 000 000 + 1 000 000 = **0**
- `getCompteResultat(adapter,'2025').chiffreAffaires === 0`, `.resultatNet === 0`.
- `getBilan(adapter,'2025').actif.totalActif === 0`, `.passif.totalPassif === 0`.
- `verifyTrialBalance(adapter,'2025')` : `isBalanced === true`, `totalDebits === 2000000`, `totalCredits === 2000000` (les deux écritures comptent dans les mouvements bruts), `ecartGlobal === 0`. **Note** : les totaux de mouvements ne sont PAS nuls (1M + 1M de chaque côté) — c'est le **solde net** qui est nul, pas la somme des mouvements.

---

## 3. Récapitulatif des valeurs-pivots (anti-régression rapide)

| Scénario | Métrique | Valeur exacte attendue |
|---|---|---|
| S1 | TVA collectée | 180 000 |
| S1 | CA | 1 000 000 |
| S2 | TVA déductible | 90 000 |
| S2 | TVA due | 90 000 |
| S2-bis | crédit TVA | 90 000 (et tvaDue=0) |
| S3 | résultat net | 1 700 000 |
| S3 | total actif = total passif | 8 920 000 |
| S4 | CA avec brouillon ignoré | 1 000 000 |
| S4 | CA après validation | 3 000 000 |
| S5 | soldeFermeture 521 | 950 000 |
| S5 | suite soldes | 1 000 000 → 1 600 000 → 1 350 000 → 950 000 |
| S6 | réserve légale minimale | 100 000 |
| S6 | plafond réserve légale | 2 000 000 |
| S7 | total actif / passif après ctps | 0 |
| S7 | totalDebits trial balance | 2 000 000 |

---

## 4. Pièges spécifiques pour l'agent QA

1. **Seeder via `DexieAdapter.create` exige des écritures équilibrées** (sinon rejet). Pour un brouillon « volontairement faux », soit utiliser `createTestAdapter()`, soit le faire équilibré + `status:'draft'` (le filtre draft suffit à la démonstration — voir S4).
2. **Verrou de période** : `create('journalEntries')` rejette si un `fiscalYears` couvrant la date a `isClosed:true`, OU si un `fiscalPeriods` couvrant la date est `closed|locked|cloturee`. Pour les scénarios « happy path », **ne pas seeder de fiscalYear clôturé** ni de fiscalPeriod verrouillée sur les dates utilisées.
3. **`entryNumber` unique** : `safeAddEntry` (utilisé par contrepassation, affectation, à-nouveaux) refuse les doublons de `entryNumber`. Donner des numéros distincts à chaque écriture seedée manuellement.
4. **Préfixes de comptes** : le moteur agrège par `startsWith`. `4452` tombe dans `'445'` (TVA déductible) ET dans `'42'-'47'` (autres créances/dettes du bilan). `4431` tombe dans `'443'` (collectée) et dans `'44'`→`'42'-'47'`. Respecter ces préfixes exacts dans les seeds, sinon les agrégats divergent.
5. **`exercice` string** : passer `'2025'` (4 chiffres) est le chemin le plus robuste vers `loadEntriesForExercice` (filtre `2025-01-01..2025-12-31`). Pour `verifyTrialBalance`, passer `'2025'` filtre par `date.startsWith('2025')`.
6. **Brouillon = `status:'draft'` strictement** ; `'validated'` et `'posted'` sont tous deux inclus dans les états.
7. **Tolérances** : en FCFA entier, attendre `ecart === 0` (strict) sur `verifyTrialBalance`/`verifyEquilibrium`. `verifierCoherenceResultat` tolère `< 1`. Ne pas asserter d'égalité flottante : les agrégats passent par `Money` puis `.toNumber()` → entiers exacts.
8. **Écart #2 (balance vs AN)** : si un test seede des AN ET interroge `balanceService.getBalance`, le **solde** d'un compte alimenté uniquement par AN peut être doublé. Pour tester proprement le solde progressif, **préférer le grand livre** (`getAccountLedger`, S5) qui lui est correct. Si le QA veut figer le comportement actuel de la balance, écrire une assertion explicite sur la valeur observée et la marquer « comportement actuel, cf. oracle §1 écart 2 ».
