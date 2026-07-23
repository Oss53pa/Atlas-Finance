# CDC — Vague B : DSF interne + moteur fiscal multi-pays + FEC

> **Statut** : design doc. B0/B1/B3 implémentés dans la foulée ; B2 assemblage suit.
> **Date** : 2026-07-23
> **Portée** : Atlas Finance & Accounting rapatrie la conformité fiscale qu'il
> délègue aujourd'hui (Liass'Pilot), la rend **multi-pays et versionnée par loi
> de finances**, et produit le **FEC** légalement exigé mais absent.

---

## 0. Pourquoi c'est le manque fatal n°1

Après la Vague A (le GL devient souverain), le trou béant devient la
conformité fiscale :

| Constat mesuré | Conséquence |
|---|---|
| `LiasseFiscalePage` = 89 lignes dont un bouton `window.open()` vers Liass'Pilot | **La DSF — livrable central du SYSCOHADA — est sous-traitée.** |
| `taxRegistrySeeds.ts` : tout `countryCode: 'CI'` | Mono-pays. 16 autres pays OHADA ignorés. |
| `IS_RATES` = constante dans `isCalculation.ts` | **Une loi de finances n'est pas versionnable.** Changement de taux = modif de code. |
| `calculateIS` prend `reintegrations`/`deductions` en **paramètres bruts** | **Rien ne calcule le passage comptable→fiscal.** Le cœur du métier fiscal est absent. |
| Aucun export FEC / fichier des écritures | **Non-conformité légale** (contrôle DGI). |

> Un logiciel SYSCOHADA qui délègue la DSF et ne produit pas de FEC n'est pas
> candidat au titre de meilleur du monde, quelle que soit la qualité du reste.

---

## 1. Principe directeur

> **La loi fiscale est une DONNÉE VERSIONNÉE, jamais du code.**

Un jeu de paramètres est identifié par `(countryCode, fiscalYear)`. Changer de
taux d'IS en loi de finances 2027 = ajouter un jeu de données, pas déployer.
Le moteur lit toujours le jeu applicable à l'exercice traité.

Corollaire : **le passage du résultat comptable au résultat fiscal est
auditable ligne par ligne** — chaque réintégration / déduction porte son code,
son montant, sa base légale, et sa source (compte GL ou saisie motivée).

---

## 2. Lots

| Lot | Titre | État |
|---|---|---|
| **B0** | Paramètres fiscaux versionnés (pays × exercice) | ce commit |
| **B1** | Moteur de détermination du résultat fiscal | ce commit |
| **B3** | Export FEC / Fichier des Écritures Comptables | ce commit |
| **B2** | Assemblage DSF interne + écran | suivant |
| **B4** | Notes annexes : pousser `auto:false` → `auto:true` | backlog |
| **B5** | Télédéclaration (e-impôts CI, SIGTAS…) | backlog |

---

## B0 — Paramètres fiscaux versionnés

### Modèle

`src/services/fiscal/fiscalParameters.ts` : jeu de paramètres immuable par
`(countryCode, fiscalYear)`.

```ts
interface FiscalParameterSet {
  countryCode: string;         // 'CI', 'SN', 'BJ', 'CM'…
  fiscalYear: number;          // 2024, 2025, 2026
  legalReference: string;      // « Loi de finances 2026 (CI) »
  is: {
    rateStandard: number;      // 25 (CI)
    rateReduced?: number;
    minimumRate: number;       // 0,5 % du CA (IMF)
    minimumFloor: number;      // plancher IMF
    minimumCap?: number;       // plafond IMF
  };
  deficitCarryForwardYears: number;  // report déficitaire (3 ans CI)
  irppBrackets: Array<{ from: number; to: number | null; rate: number }>;
  vatRateStandard: number;
  // Catalogue des réintégrations/déductions applicables (B1)
  fiscalAdjustments: FiscalAdjustmentRule[];
}
```

### Contenu

- **Seeds CI** pour 2024, 2025, 2026 (démontre le versionnement).
- **Squelettes SN / BJ / CM** (taux IS connus, ajustements à compléter) pour
  prouver le multi-pays structurel — pas 17 pays exhaustifs, mais l'ossature
  qui rend l'ajout d'un pays trivial.
- Résolution : `getFiscalParameters(country, year)` → jeu exact, ou repli sur
  l'année la plus récente ≤ year du même pays (une loi reste en vigueur tant
  qu'une nouvelle ne l'a pas remplacée), avec avertissement explicite.

### Migration douce

`taxRegistrySeeds.ts` (CI, déclarations périodiques TVA/IS/IRPP) **reste** —
il pilote les déclarations mensuelles/trimestrielles. B0 ajoute la couche
**paramètres annuels de détermination**, complémentaire, pas concurrente.

---

## B1 — Moteur de détermination du résultat fiscal

### Le pont

```
Résultat comptable avant impôt        (glHelpers : creditNet('7') − net('6'))
  + Σ réintégrations                   (charges non déductibles)
  − Σ déductions                       (produits non imposables / déjà taxés)
  = Résultat fiscal avant déficits
  − Imputation déficits antérieurs     (plafonnée, sur N années selon le pays)
  = Résultat fiscal
  × taux IS                            (paramètre versionné)
  = IS théorique
  max( IS théorique , IMF )            (IMF = minimumRate × CA, borné)
  = IS dû
```

### Catalogue de réintégrations/déductions

Chaque règle est une entrée typée, PAS un montant en dur :

```ts
interface FiscalAdjustmentRule {
  code: string;                 // 'REINT_AMORT_VP', 'DED_DIVIDENDES'…
  label: string;
  sense: 'reintegration' | 'deduction';
  legalBasis: string;          // article du CGI du pays
  source:
    | { kind: 'account'; prefixes: string[]; portion?: number }  // dérivé du GL
    | { kind: 'manual' };      // saisie motivée (ex. amendes, dons > plafond)
}
```

Exemples CI seedés (dérivés du GL, donc **calculés, pas retapés**) :
- `REINT_IMPOT_SOCIETE` — l'IS lui-même (compte 89) n'est pas déductible.
- `REINT_AMENDES_PENALITES` — 6714 / pénalités.
- `REINT_DONS_LIBERALITES` — portion des 6713 au-delà du plafond légal.
- `DED_REPRISES_PROVISIONS_NON_DEDUITES` — reprises de provisions jadis
  réintégrées.

### Résultat auditable

`determineResultatFiscal(adapter, { country, fiscalYear })` renvoie un objet
où **chaque ligne du passage est traçable** : code, libellé, base légale,
montant, origine (comptes agrégés ou saisie). Alimente directement le tableau
de passage de la DSF (B2) et l'écriture d'impôt.

Réutilise `calculateIS` (déjà multi-pays, déjà réintégrations/déductions/
déficits) — B1 lui **fournit enfin les entrées calculées** au lieu de zéros.

---

## B3 — Export FEC / Fichier des Écritures Comptables

### Format

18 colonnes normalisées (modèle DGI/OHADA, dérivé du FEC de référence),
séparateur **pipe `|`**, une ligne d'en-tête, une ligne par ligne d'écriture :

```
JournalCode|JournalLib|EcritureNum|EcritureDate|CompteNum|CompteLib|
CompAuxNum|CompAuxLib|PieceRef|PieceDate|EcritureLib|Debit|Credit|
EcritureLet|DateLet|ValidDate|Montantdevise|Idevise
```

### Contrôles avant export (rejet si échec)

- **Équilibre global** : Σ débit = Σ crédit sur la période.
- **Chaque écriture équilibrée** : Σ débit = Σ crédit par pièce.
- **Dates dans l'exercice** : aucune écriture hors bornes.
- **Brouillons exclus** : uniquement `validated` / `posted`.
- **Numéro de pièce présent** : aucune ligne orpheline.

Un FEC qui ne passe pas ces contrôles serait rejeté par l'administration — on
le rejette nous-mêmes avec le détail, avant livraison.

### Sortie

Chaîne prête à télécharger + rapport de contrôle (nb lignes, totaux, anomalies).
Nom de fichier normalisé : `SIREN_FEC_AAAAMMJJ` (adapté : `IFU_FEC_clôture`).

---

## B2 — Assemblage DSF interne (lot suivant)

`/taxation/dsf` remplace la redirection Liass'Pilot par une liasse assemblée :
fiche de renseignements + Bilan + Compte de résultat + TAFIRE (déjà produits
par `financialStatementsService` / `glHelpers`) + **tableau de passage fiscal
(B1)** + notes annexes (`notesAnnexesService`, 35 notes). Export PDF via le
`pdfGeneratorService` existant.

La redirection Liass'Pilot devient une **option** (« exporter vers Liass'Pilot »)
et non le seul chemin.

---

## 3. Ce que la Vague B NE fait pas (assumé)

- Pas les 17 pays exhaustifs : l'ossature + CI complet + 3 squelettes. Ajouter
  un pays = ajouter un `FiscalParameterSet`, sans toucher au moteur.
- Pas la télédéclaration (portails DGI) — B5, dépend d'API tierces par pays.
- Pas les 35 notes 100 % auto — B4, incrémental.

## 4. Tests exigés

| Test | Vérifie |
|---|---|
| Résolution de paramètres | jeu exact, repli sur année antérieure, pays inconnu |
| Passage comptable→fiscal | chaque ligne tracée, total cohérent avec `calculateIS` |
| Réintégration de l'IS (89) | le résultat fiscal ré-ajoute bien la charge d'impôt |
| IMF > IS théorique | `max` correctement appliqué |
| Report déficitaire | plafonné aux N années du pays |
| FEC — équilibre | export refusé si déséquilibré |
| FEC — format | 18 colonnes, pipe, brouillons exclus, dates bornées |
| FEC — round-trip | Σ débit/crédit du FEC = balance de la période |
