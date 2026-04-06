# SYSCOHADA Implementation Guide

## Why SYSCOHADA?

Atlas Finance targets businesses in the OHADA zone (17 francophone African countries). SYSCOHADA (Systeme Comptable OHADA) is the mandatory accounting standard for all commercial entities in this economic area, as established by the Uniform Act on Accounting Law and Financial Reporting adopted on January 26, 2017 (effective January 1, 2018).

Choosing SYSCOHADA is not optional for our target market. The Acte Uniforme relatif au Droit Comptable et a l'Information Financiere (AUDCIF) requires every entity subject to commercial law to maintain accounting records in conformity with this system.

Key regulatory references:
- **Art. 1-4**: Scope and definitions
- **Art. 6-13**: Accounting principles (going concern, consistency, prudence, cost basis, accrual)
- **Art. 15-18**: Chart of accounts and journal requirements
- **Art. 19**: Annual financial statements must include Bilan, Compte de Resultat, TAFIRE, and Notes Annexes
- **Art. 24**: Books must be kept in the official language and in the legal currency (FCFA for UEMOA/CEMAC zones)
- **Art. 35-38**: Fiscal year and closure rules

## 9 Account Classes

SYSCOHADA organizes the chart of accounts into 9 classes:

| Class | Name | Type | Normal Balance |
|-------|------|------|----------------|
| 1 | Comptes de Ressources Durables | Balance Sheet | Credit |
| 2 | Comptes d'Actif Immobilise | Balance Sheet | Debit |
| 3 | Comptes de Stocks | Balance Sheet | Debit |
| 4 | Comptes de Tiers | Balance Sheet | Mixed |
| 5 | Comptes de Tresorerie | Balance Sheet | Debit |
| 6 | Comptes de Charges des Activites Ordinaires | Income Statement | Debit |
| 7 | Comptes de Produits des Activites Ordinaires | Income Statement | Credit |
| 8 | Comptes des Autres Charges et Produits | Income Statement | Mixed |
| 9 | Comptes des Engagements Hors Bilan et Comptabilite Analytique | Off-balance / Analytics | N/A |

### Implementation in Atlas Finance

Each account in `chart_of_accounts` table has an `account_class` field derived from the first digit of its code. The class determines:
- Balance sheet vs. income statement classification
- Normal balance direction (debit/credit)
- Aggregation rules for financial statements
- Closure behavior (class 6/7/8 accounts are zeroed at year-end)

## Journal Types

Atlas Finance implements all SYSCOHADA journal types:

| Code | Journal Type | Description |
|------|-------------|-------------|
| AC | Achats | Purchase journal |
| VE | Ventes | Sales journal |
| BQ | Banque | Bank journal |
| CA | Caisse | Cash journal |
| OD | Operations Diverses | Miscellaneous operations |
| AN | A-Nouveau | Opening balances / carry-forward |
| SAL | Salaires | Payroll journal |
| DEC | Declarations | Tax declarations |
| REG | Regularisations | Adjusting entries |
| CLO | Cloture | Closing entries |

Per Art. 19-21, each journal must maintain chronological numbering without gaps (piece_number sequencing enforced by database trigger).

## Closure Process (15 Steps)

The fiscal year closure follows SYSCOHADA regulations through 15 sequential steps:

1. **Verification des Periodes** - Ensure all monthly periods are closed (Art. 35)
2. **Lettrage des Comptes** - Account reconciliation / lettering (classes 40/41)
3. **Rapprochement Bancaire** - Bank reconciliation (class 5)
4. **Controles de Coherence** - Cross-controls (debit/credit totals, balance verification)
5. **Regularisations** - Accruals and deferrals (charges constatees d'avance, produits constates d'avance)
6. **Amortissements** - Depreciation calculation and posting (Art. 45-46)
7. **Provisions** - Provision evaluation and posting (Art. 48-49)
8. **Reevaluation** - Asset revaluation if applicable (Art. 62-65)
9. **Ecritures d'Inventaire** - Inventory entries and stock adjustments
10. **Determination du Resultat** - Income determination (closing class 6/7/8 to class 12/13)
11. **Affectation du Resultat** - Profit/loss allocation (to reserves, dividends, carried forward)
12. **Generation Etats Financiers** - Generate Bilan, Compte de Resultat, TAFIRE, Notes Annexes
13. **Liasse Fiscale** - Generate the 84-form fiscal package
14. **Reports a Nouveau** - Generate opening balance entries for next fiscal year (AN journal)
15. **Verrouillage Exercice** - Lock the fiscal year against further modifications

Each step has preconditions (previous steps must be completed) and is protected by audit trail.

## Regulatory References

- **Art. 19**: Obligation to produce Bilan, Compte de Resultat, and TAFIRE
- **Art. 24**: Language and currency requirements
- **Art. 35**: Fiscal year duration (12 months, can exceptionally differ)
- **Art. 36-38**: Inventory and closure obligations
- **Art. 45-46**: Depreciation rules (linear and declining)
- **Art. 48-49**: Provision rules
- **Art. 62-65**: Revaluation rules
- **Art. 73-75**: Consolidation rules (for group accounts)
- **Art. 110-112**: Sanctions for non-compliance

## Financial Statements

### Bilan (Balance Sheet)
- Assets: Classes 2 (fixed), 3 (stocks), 4 (debit balances), 5 (treasury)
- Liabilities: Class 1 (permanent resources), 4 (credit balances), 5 (treasury liabilities)
- Must show N and N-1 columns

### Compte de Resultat (Income Statement)
- Charges: Class 6 + class 8 (charges)
- Produits: Class 7 + class 8 (produits)
- SIG (Soldes Intermediaires de Gestion): Marge Brute, Valeur Ajoutee, EBE, Resultat d'Exploitation, Resultat Financier, Resultat HAO, Resultat Net

### TAFIRE (Tableau Financier des Ressources et Emplois)
- Cash flow statement specific to SYSCOHADA
- Shows: CAFG, Autofinancement, Variation BFR, Variation Tresorerie

### Notes Annexes
- 42 notes detailing balance sheet and income statement items
- Required per Art. 19 for the "Systeme Normal"
