# ANALYSE COMPLÈTE FRONTEND WISEBOOK - BESOINS API

**Date d'analyse**: 2025-10-07
**Projet**: WiseBook ERP - Comptabilité SYSCOHADA
**Version**: 1.0

---

## RÉSUMÉ EXÉCUTIF

WiseBook est une application ERP comptable complète avec **15 modules principaux** identifiés dans le frontend. L'analyse révèle que le frontend utilise un **système de services bien structuré** avec des types TypeScript complets, mais certains services utilisent encore des **données mock** (simulées).

### Statistiques Globales
- **Modules identifiés**: 15
- **Services API**: 18
- **Pages/Composants**: 114+ pages
- **Types TypeScript**: ~540 lignes de définitions
- **Endpoints estimés**: 200+

---

## 1. MODULE CORE (Base Système)

### 1.1 SOCIÉTÉS (Companies)

**Service**: `companiesService` (`core-complete.service.ts`)

**Endpoints identifiés**:
```
GET    /api/societes/                     - Liste des sociétés
GET    /api/societes/{id}/                - Détail société
POST   /api/societes/                     - Créer société
PATCH  /api/societes/{id}/                - Modifier société
DELETE /api/societes/{id}/                - Supprimer société
GET    /api/societes/{id}/statistics/     - Statistiques société
POST   /api/societes/{id}/upload-logo/    - Upload logo
DELETE /api/societes/{id}/delete-logo/    - Supprimer logo
POST   /api/societes/{id}/toggle-active/  - Activer/Désactiver
```

**Champs de données (Company)**:
- `id`, `created_at`, `updated_at`
- `nom`, `code`, `description`
- `email`, `telephone`, `address`
- `logo`, `numero_rc`, `numero_if`
- `actif`

**Fonctionnalités**:
- ✅ CRUD complet
- ✅ Upload de logo
- ✅ Gestion multi-sociétés
- ✅ Statistiques par société

**Pages associées**:
- `/core/company` - Gestion des sociétés
- `/config/multi-societes` - Configuration multi-sociétés

---

### 1.2 EXERCICES FISCAUX (Fiscal Years)

**Service**: `fiscalYearsService` (`core-complete.service.ts`)

**Endpoints identifiés**:
```
GET    /api/exercices/                - Liste des exercices
GET    /api/exercices/{id}/           - Détail exercice
POST   /api/exercices/                - Créer exercice
PATCH  /api/exercices/{id}/           - Modifier exercice
DELETE /api/exercices/{id}/           - Supprimer exercice
GET    /api/exercices/by-date/        - Trouver exercice par date
GET    /api/exercices/check-overlap/  - Vérifier chevauchement
POST   /api/exercices/{id}/open/      - Ouvrir exercice
POST   /api/exercices/{id}/close/     - Clôturer exercice
POST   /api/exercices/{id}/archive/   - Archiver exercice
POST   /api/exercices/{id}/reopen/    - Réouvrir exercice
GET    /api/exercices/{id}/statistics/ - Statistiques exercice
```

**Champs de données (FiscalYear)**:
- `id`, `created_at`, `updated_at`
- `code`, `libelle`
- `date_debut`, `date_fin`
- `statut`: 'ouvert' | 'cloture' | 'archive'
- `societe`, `actif`

**Fonctionnalités**:
- ✅ CRUD complet
- ✅ Gestion du cycle de vie (ouverture/clôture/archivage)
- ✅ Vérification des chevauchements de dates
- ✅ Recherche par date
- ✅ Statistiques par exercice

**Pages associées**:
- `/core/exercice` - Gestion des exercices

---

### 1.3 DEVISES (Currencies)

**Service**: `currenciesService` (`core-complete.service.ts`)

**Endpoints identifiés**:
```
GET    /api/devises/                      - Liste des devises
GET    /api/devises/{id}/                 - Détail devise
POST   /api/devises/                      - Créer devise
PATCH  /api/devises/{id}/                 - Modifier devise
DELETE /api/devises/{id}/                 - Supprimer devise
POST   /api/devises/{id}/set-reference/   - Définir comme référence
PATCH  /api/devises/{id}/update-rate/     - Mettre à jour taux
GET    /api/devises/convert/              - Convertir montant
GET    /api/devises/{id}/rate-history/    - Historique des taux
POST   /api/devises/import-rates/         - Import taux de change
```

**Champs de données (Currency)**:
- `id`, `created_at`, `updated_at`
- `code`, `libelle`, `symbole`
- `taux_change`
- `devise_reference`
- `actif`

**Fonctionnalités**:
- ✅ CRUD complet
- ✅ Gestion des taux de change
- ✅ Conversion entre devises
- ✅ Historique des taux
- ✅ Import de taux

---

## 2. MODULE COMPTABILITÉ (Accounting)

### 2.1 PLAN COMPTABLE (Chart of Accounts)

**Service**: `chartOfAccountsService` (`accounting-complete.service.ts`)

**Endpoints identifiés**:
```
GET    /api/comptes/                       - Liste des comptes
GET    /api/comptes/{id}/                  - Détail compte
POST   /api/comptes/                       - Créer compte
PATCH  /api/comptes/{id}/                  - Modifier compte
DELETE /api/comptes/{id}/                  - Supprimer compte
GET    /api/comptes/hierarchy/             - Hiérarchie des comptes
POST   /api/comptes/import-syscohada/      - Import plan SYSCOHADA
GET    /api/comptes/{id}/balance/          - Solde d'un compte
```

**Champs de données (ChartOfAccount)**:
- `id`, `created_at`, `updated_at`
- `numero`, `libelle`
- `classe`: '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
- `sous_classe`, `compte_principal`, `parent`
- `type`: 'detail' | 'total'
- `nature`: 'debit' | 'credit'
- `actif`, `societe`

**Fonctionnalités**:
- ✅ CRUD complet
- ✅ Hiérarchie des comptes
- ✅ Import SYSCOHADA standard
- ✅ Recherche par classe
- ✅ Consultation des soldes

**Pages associées**:
- `/accounting/chart-of-accounts` - Gestion du plan comptable
- `/config/plan-syscohada` - Configuration SYSCOHADA

---

### 2.2 JOURNAUX (Journals)

**Service**: `journalsService` (`accounting-complete.service.ts`)

**Endpoints identifiés**:
```
GET    /api/journaux/                 - Liste des journaux
GET    /api/journaux/{id}/            - Détail journal
POST   /api/journaux/                 - Créer journal
PATCH  /api/journaux/{id}/            - Modifier journal
DELETE /api/journaux/{id}/            - Supprimer journal
GET    /api/journaux/{id}/entries/    - Écritures d'un journal
```

**Champs de données (Journal)**:
- `id`, `created_at`, `updated_at`
- `code`, `libelle`
- `type`: 'ACH' | 'VTE' | 'BQ' | 'OD' | 'PAIE' | 'AN'
- `compte_contrepartie`
- `actif`, `societe`

**Types de journaux SYSCOHADA**:
- **ACH**: Achats
- **VTE**: Ventes
- **BQ**: Banque
- **OD**: Opérations Diverses
- **PAIE**: Salaires/Paie
- **AN**: À-Nouveaux

**Fonctionnalités**:
- ✅ CRUD complet
- ✅ Types de journaux standard SYSCOHADA
- ✅ Compte de contrepartie
- ✅ Liste des écritures par journal

**Pages associées**:
- `/accounting/journals` - Gestion des journaux

---

### 2.3 ÉCRITURES COMPTABLES (Accounting Entries)

**Service**: `accountingEntriesService` (`accounting-complete.service.ts`)

**Endpoints identifiés**:
```
GET    /api/ecritures/                         - Liste des écritures
GET    /api/ecritures/{id}/                    - Détail écriture
POST   /api/ecritures/                         - Créer écriture
PATCH  /api/ecritures/{id}/                    - Modifier écriture
DELETE /api/ecritures/{id}/                    - Supprimer écriture
POST   /api/ecritures/{id}/validate/           - Valider écriture
POST   /api/ecritures/{id}/reverse/            - Contrepasser écriture
POST   /api/ecritures/reconcile/               - Lettrer écritures
POST   /api/ecritures/{id}/unreconcile/        - Délettrer écriture
GET    /api/ecritures/next-piece-number/       - Prochain numéro de pièce
POST   /api/ecritures/{id}/duplicate/          - Dupliquer écriture
POST   /api/ecritures/import/                  - Import écritures (CSV/Excel)
GET    /api/ecritures/export/                  - Export écritures
```

**Champs de données (AccountingEntry)**:
- `id`, `created_at`, `updated_at`
- `numero_piece`, `date_piece`
- `journal`, `libelle`
- `reference_externe`
- `statut`: 'brouillon' | 'valide' | 'lettree' | 'contrepasse'
- `lignes`: AccountingEntryLine[]
- `total_debit`, `total_credit`
- `exercice`, `societe`
- `validee_par`, `date_validation`

**Champs de données (AccountingEntryLine)**:
- `id`, `created_at`, `updated_at`
- `ecriture`, `compte`, `libelle`
- `debit`, `credit`
- `tiers`, `axe_analytique`, `centre_analytique`
- `piece_jointe`, `numero_ligne`

**Fonctionnalités**:
- ✅ CRUD complet
- ✅ Validation des écritures (équilibre débit/crédit)
- ✅ Workflow de validation
- ✅ Lettrage/Délettrage
- ✅ Contrepassation
- ✅ Génération automatique de numéros de pièce
- ✅ Duplication d'écritures
- ✅ Import/Export (CSV, Excel, PDF)
- ✅ Pièces jointes

**Pages associées**:
- `/accounting/entries` - Saisie des écritures
- `/accounting/lettrage` - Lettrage des comptes

---

### 2.4 RAPPORTS COMPTABLES (Accounting Reports)

**Service**: `accountingReportsService` (`accounting-complete.service.ts`)

**Endpoints identifiés**:
```
GET    /api/reports/balance/              - Balance générale
GET    /api/reports/general-ledger/       - Grand livre
GET    /api/reports/journal/{code}/       - Journal
GET    /api/reports/balance/export/       - Export balance
GET    /api/reports/general-ledger/export/ - Export grand livre
```

**Paramètres de requête (AccountingQueryParams)**:
- `exercice`, `journal`, `compte`
- `date_debut`, `date_fin`
- `statut`, `page`, `page_size`
- `ordering`, `search`

**Rapports disponibles**:
- **Balance générale**: Soldes de tous les comptes
- **Grand livre**: Détail des mouvements par compte
- **Journal**: Écritures par journal
- **Balance âgée**: Analyse par ancienneté

**Formats d'export**:
- ✅ PDF
- ✅ Excel (XLSX)
- ✅ CSV

**Pages associées**:
- `/accounting/reports` - Rapports comptables
- `/accounting/balance` - Balance générale
- `/accounting/general-ledger` - Grand livre

---

## 3. MODULE TIERS (Third Party)

### 3.1 TIERS (Third Party)

**Service**: `thirdPartyService` (`thirdparty-complete.service.ts`)

**Endpoints identifiés**:
```
GET    /api/tiers/                         - Liste des tiers
GET    /api/tiers/{id}/                    - Détail tiers
POST   /api/tiers/                         - Créer tiers
PATCH  /api/tiers/{id}/                    - Modifier tiers
DELETE /api/tiers/{id}/                    - Supprimer tiers
GET    /api/tiers/{id}/contacts/           - Contacts d'un tiers
GET    /api/tiers/{id}/balance/            - Solde d'un tiers
GET    /api/tiers/{id}/entries/            - Écritures d'un tiers
GET    /api/tiers/{id}/invoices/           - Factures d'un tiers
GET    /api/tiers/{id}/payments/           - Paiements d'un tiers
GET    /api/tiers/{id}/receivables/        - Créances client
GET    /api/tiers/{id}/payables/           - Dettes fournisseur
GET    /api/tiers/generate-account-number/ - Générer numéro compte
POST   /api/tiers/merge/                   - Fusionner tiers
POST   /api/tiers/{id}/archive/            - Archiver tiers
POST   /api/tiers/{id}/unarchive/          - Désarchiver tiers
POST   /api/tiers/import/                  - Import tiers
GET    /api/tiers/export/                  - Export tiers
```

**Champs de données (ThirdParty)**:
- `id`, `created_at`, `updated_at`
- `code`, `nom`
- `type`: 'client' | 'fournisseur' | 'client_fournisseur' | 'autre'
- `compte_comptable`
- `adresse`, `ville`, `code_postal`, `pays`
- `telephone`, `email`, `contact_principal`
- `numero_rc`, `numero_if`
- `conditions_reglement`, `delai_paiement`
- `plafond_credit`
- `actif`, `societe`

**Fonctionnalités**:
- ✅ CRUD complet
- ✅ Gestion clients/fournisseurs
- ✅ Gestion des contacts
- ✅ Suivi des soldes (créances/dettes)
- ✅ Historique des factures
- ✅ Historique des paiements
- ✅ Balance âgée (30/60/90 jours)
- ✅ Génération automatique de numéros de compte
- ✅ Fusion de tiers
- ✅ Import/Export

**Pages associées**:
- `/third-party/customers` - Gestion clients
- `/third-party/suppliers` - Gestion fournisseurs
- `/third-party/contacts` - Gestion contacts
- `/third-party/recouvrement` - Recouvrement
- `/third-party/lettrage-clients` - Lettrage clients

---

### 3.2 CONTACTS

**Service**: `contactsService` (`thirdparty-complete.service.ts`)

**Endpoints identifiés**:
```
GET    /api/contacts/                     - Liste des contacts
GET    /api/contacts/{id}/                - Détail contact
POST   /api/contacts/                     - Créer contact
PATCH  /api/contacts/{id}/                - Modifier contact
DELETE /api/contacts/{id}/                - Supprimer contact
POST   /api/contacts/{id}/set-principal/  - Définir comme principal
```

**Champs de données (Contact)**:
- `id`, `created_at`, `updated_at`
- `tiers`, `nom`, `prenom`
- `fonction`
- `telephone`, `mobile`, `email`
- `principal`, `actif`

**Fonctionnalités**:
- ✅ CRUD complet
- ✅ Contact principal par tiers
- ✅ Recherche par email/téléphone

---

### 3.3 RAPPORTS TIERS

**Service**: `thirdPartyReportsService` (`thirdparty-complete.service.ts`)

**Endpoints identifiés**:
```
GET    /api/reports/thirdparty/customers/           - Rapport clients
GET    /api/reports/thirdparty/suppliers/           - Rapport fournisseurs
GET    /api/reports/thirdparty/aged-receivables/    - Balance âgée clients
GET    /api/reports/thirdparty/aged-payables/       - Balance âgée fournisseurs
GET    /api/reports/thirdparty/account-statement/   - Relevé de compte tiers
```

**Fonctionnalités**:
- ✅ Rapport clients (CA, créances, top clients)
- ✅ Rapport fournisseurs (achats, dettes, top fournisseurs)
- ✅ Balance âgée des créances
- ✅ Balance âgée des dettes
- ✅ Relevé de compte tiers

---

## 4. MODULE TRÉSORERIE (Treasury)

### 4.1 COMPTES BANCAIRES (Bank Accounts)

**Service**: `bankAccountsService` (`treasury-complete.service.ts`)

**Endpoints identifiés**:
```
GET    /api/comptes-bancaires/                      - Liste des comptes
GET    /api/comptes-bancaires/{id}/                 - Détail compte
POST   /api/comptes-bancaires/                      - Créer compte
PATCH  /api/comptes-bancaires/{id}/                 - Modifier compte
DELETE /api/comptes-bancaires/{id}/                 - Supprimer compte
GET    /api/comptes-bancaires/{id}/balance/         - Solde à une date
GET    /api/comptes-bancaires/{id}/balance-history/ - Historique des soldes
GET    /api/comptes-bancaires/{id}/transactions/    - Transactions d'un compte
POST   /api/comptes-bancaires/{id}/close/           - Clôturer compte
POST   /api/comptes-bancaires/{id}/reopen/          - Réouvrir compte
```

**Champs de données (BankAccount)**:
- `id`, `created_at`, `updated_at`
- `numero_compte`, `libelle`
- `banque`, `agence`
- `iban`, `bic_swift`
- `compte_comptable`, `devise`
- `solde_initial`, `solde_actuel`
- `date_ouverture`, `date_fermeture`
- `actif`, `societe`

**Fonctionnalités**:
- ✅ CRUD complet
- ✅ Multi-devises
- ✅ Solde en temps réel
- ✅ Historique des soldes
- ✅ Clôture/Réouverture
- ✅ Lien avec la comptabilité

**Pages associées**:
- `/treasury/bank-accounts` - Gestion comptes bancaires
- `/treasury/positions` - Position de trésorerie

---

### 4.2 TRANSACTIONS BANCAIRES (Bank Transactions)

**Service**: `bankTransactionsService` (`treasury-complete.service.ts`)

**Endpoints identifiés**:
```
GET    /api/transactions-bancaires/                     - Liste des transactions
GET    /api/transactions-bancaires/{id}/                - Détail transaction
POST   /api/transactions-bancaires/                     - Créer transaction
PATCH  /api/transactions-bancaires/{id}/                - Modifier transaction
DELETE /api/transactions-bancaires/{id}/                - Supprimer transaction
POST   /api/transactions-bancaires/{id}/reconcile/      - Rapprocher transaction
POST   /api/transactions-bancaires/{id}/unreconcile/    - Dé-rapprocher transaction
POST   /api/transactions-bancaires/{id}/letter/         - Lettrer transaction
POST   /api/transactions-bancaires/import-statement/    - Import relevé bancaire
POST   /api/transactions-bancaires/create-with-accounting/ - Créer avec écriture auto
GET    /api/transactions-bancaires/export/              - Export transactions
```

**Champs de données (BankTransaction)**:
- `id`, `created_at`, `updated_at`
- `compte_bancaire`
- `date_operation`, `date_valeur`
- `libelle`, `reference`
- `montant`
- `sens`: 'debit' | 'credit'
- `solde_apres`
- `type_operation`: 'virement' | 'cheque' | 'carte' | 'prelevement' | 'depot' | 'autre'
- `statut`: 'en_attente' | 'rapproche' | 'lettree'
- `ecriture_comptable`, `piece_jointe`

**Fonctionnalités**:
- ✅ CRUD complet
- ✅ Import relevés bancaires (OFX, QIF, CSV)
- ✅ Rapprochement bancaire
- ✅ Lettrage
- ✅ Génération automatique d'écritures comptables
- ✅ Pièces jointes
- ✅ Export

**Pages associées**:
- `/treasury/bank-movements` - Mouvements bancaires
- `/treasury/reconciliation` - Rapprochement bancaire

---

### 4.3 RAPPORTS TRÉSORERIE

**Service**: `treasuryReportsService` (`treasury-complete.service.ts`)

**Endpoints identifiés**:
```
GET    /api/reports/treasury/position/       - Position de trésorerie
GET    /api/reports/treasury/forecast/       - Prévisions de trésorerie
GET    /api/reports/treasury/cash-flow/      - Flux de trésorerie
GET    /api/reports/treasury/reconciliation/ - Rapport rapprochement
```

**Fonctionnalités**:
- ✅ Position de trésorerie en temps réel
- ✅ Prévisions de trésorerie (forecasting)
- ✅ Flux de trésorerie (exploitation, investissement, financement)
- ✅ Rapport de rapprochement bancaire
- ✅ Export (PDF, Excel, CSV)

**Pages associées**:
- `/treasury/position` - Position de trésorerie
- `/treasury/cash-flow` - Flux de trésorerie
- `/treasury/previsions` - Prévisions de trésorerie
- `/treasury/fund-calls` - Appels de fonds

---

## 5. MODULE IMMOBILISATIONS (Assets)

### 5.1 IMMOBILISATIONS (Fixed Assets)

**Service**: `fixedAssetsService` (`assets-complete.service.ts`)

**Endpoints identifiés**:
```
GET    /api/immobilisations/                         - Liste des immobilisations
GET    /api/immobilisations/{id}/                    - Détail immobilisation
POST   /api/immobilisations/                         - Créer immobilisation
PATCH  /api/immobilisations/{id}/                    - Modifier immobilisation
DELETE /api/immobilisations/{id}/                    - Supprimer immobilisation
POST   /api/immobilisations/{id}/put-in-service/     - Mettre en service
POST   /api/immobilisations/{id}/dispose/            - Céder immobilisation
POST   /api/immobilisations/{id}/reform/             - Réformer immobilisation
GET    /api/immobilisations/{id}/depreciation-plan/  - Plan d'amortissement
GET    /api/immobilisations/{id}/depreciations/      - Historique amortissements
GET    /api/immobilisations/{id}/net-book-value/     - VNC à une date
POST   /api/immobilisations/{id}/duplicate/          - Dupliquer immobilisation
POST   /api/immobilisations/import/                  - Import immobilisations
GET    /api/immobilisations/export/                  - Export immobilisations
```

**Champs de données (FixedAsset)**:
- `id`, `created_at`, `updated_at`
- `numero`, `libelle`, `categorie`
- `compte_immobilisation`, `compte_amortissement`
- `date_acquisition`, `date_mise_en_service`
- `valeur_acquisition`, `valeur_residuelle`
- `duree_amortissement`, `methode_amortissement`
- `taux_amortissement`, `valeur_nette_comptable`
- `statut`: 'en_cours' | 'amorti' | 'cede' | 'reforme'
- `localisation`, `responsable`, `fournisseur`
- `societe`

**Méthodes d'amortissement**:
- **Linéaire**: Amortissement constant
- **Dégressif**: Amortissement décroissant
- **Variable**: Basé sur l'utilisation

**Fonctionnalités**:
- ✅ CRUD complet
- ✅ Cycle de vie complet (acquisition → mise en service → amortissement → cession/réforme)
- ✅ Calcul automatique des amortissements
- ✅ Plan d'amortissement prévisionnel
- ✅ Calcul de plus/moins-values de cession
- ✅ Génération d'écritures comptables automatiques
- ✅ Gestion par localisation et responsable
- ✅ Import/Export

**Pages associées**:
- `/assets/fixed-assets` - Gestion immobilisations
- `/assets/depreciation` - Amortissements
- `/assets/disposals` - Cessions
- `/assets/inventory` - Inventaire physique

---

### 5.2 AMORTISSEMENTS (Depreciations)

**Service**: `depreciationsService` (`assets-complete.service.ts`)

**Endpoints identifiés**:
```
GET    /api/amortissements/                      - Liste des amortissements
GET    /api/amortissements/{id}/                 - Détail amortissement
POST   /api/amortissements/                      - Créer amortissement
POST   /api/amortissements/calculate/            - Calculer dotations exercice
POST   /api/amortissements/{id}/account/         - Comptabiliser amortissement
POST   /api/amortissements/bulk-account/         - Comptabilisation en masse
POST   /api/amortissements/{id}/cancel-accounting/ - Annuler comptabilisation
```

**Champs de données (Depreciation)**:
- `id`, `created_at`, `updated_at`
- `immobilisation`, `exercice`
- `date_dotation`, `montant_dotation`
- `amortissement_cumule`, `valeur_nette_comptable`
- `ecriture_comptable`
- `statut`: 'calculee' | 'comptabilisee'

**Fonctionnalités**:
- ✅ Calcul automatique des dotations
- ✅ Comptabilisation automatique
- ✅ Comptabilisation en masse
- ✅ Annulation de comptabilisation
- ✅ Suivi par exercice

---

### 5.3 RAPPORTS IMMOBILISATIONS

**Service**: `assetsReportsService` (`assets-complete.service.ts`)

**Endpoints identifiés**:
```
GET    /api/reports/assets/table/            - Tableau des immobilisations
GET    /api/reports/assets/register/         - Registre des immobilisations
GET    /api/reports/assets/depreciation-plan/ - Plan d'amortissement global
GET    /api/reports/assets/disposals/        - Rapport de cessions
```

**Fonctionnalités**:
- ✅ Tableau récapitulatif des immobilisations
- ✅ Registre légal des immobilisations
- ✅ Plan d'amortissement prévisionnel pluriannuel
- ✅ Rapport des cessions (plus/moins-values)
- ✅ Export (PDF, Excel, CSV)

---

## 6. MODULE COMPTABILITÉ ANALYTIQUE (Analytics)

### 6.1 AXES ANALYTIQUES (Analytical Axes)

**Service**: `analyticalAxisService` (`analytics-budgeting-taxation.service.ts`)

**Endpoints identifiés**:
```
GET    /api/axes-analytiques/            - Liste des axes
GET    /api/axes-analytiques/{id}/       - Détail axe
POST   /api/axes-analytiques/            - Créer axe
PATCH  /api/axes-analytiques/{id}/       - Modifier axe
DELETE /api/axes-analytiques/{id}/       - Supprimer axe
GET    /api/axes-analytiques/{id}/centers/ - Centres d'un axe
```

**Champs de données (AnalyticalAxis)**:
- `id`, `created_at`, `updated_at`
- `code`, `libelle`, `description`
- `obligatoire`, `actif`, `societe`

**Fonctionnalités**:
- ✅ CRUD complet
- ✅ Axes obligatoires
- ✅ Hiérarchie des centres

**Pages associées**:
- `/analytics/axes` - Gestion axes analytiques
- `/config/axes-analytiques` - Configuration axes

---

### 6.2 CENTRES ANALYTIQUES (Analytical Centers)

**Service**: `analyticalCentersService` (`analytics-budgeting-taxation.service.ts`)

**Endpoints identifiés**:
```
GET    /api/centres-analytiques/               - Liste des centres
GET    /api/centres-analytiques/{id}/          - Détail centre
POST   /api/centres-analytiques/               - Créer centre
PATCH  /api/centres-analytiques/{id}/          - Modifier centre
DELETE /api/centres-analytiques/{id}/          - Supprimer centre
GET    /api/centres-analytiques/hierarchy/     - Hiérarchie des centres
GET    /api/centres-analytiques/{id}/distributions/ - Ventilations centre
```

**Champs de données (AnalyticalCenter)**:
- `id`, `created_at`, `updated_at`
- `code`, `libelle`
- `axe`, `parent`, `niveau`
- `actif`, `responsable`

**Fonctionnalités**:
- ✅ CRUD complet
- ✅ Hiérarchie multi-niveaux
- ✅ Gestion par responsable
- ✅ Analyse des ventilations

**Pages associées**:
- `/analytics/cost-centers` - Centres de coûts

---

## 7. MODULE BUDGET (Budgeting)

### 7.1 BUDGETS

**Service**: `budgetsService` (`analytics-budgeting-taxation.service.ts`)

**Endpoints identifiés**:
```
GET    /api/budgets/                         - Liste des budgets
GET    /api/budgets/{id}/                    - Détail budget
POST   /api/budgets/                         - Créer budget
PATCH  /api/budgets/{id}/                    - Modifier budget
DELETE /api/budgets/{id}/                    - Supprimer budget
POST   /api/budgets/{id}/validate/           - Valider budget
POST   /api/budgets/{id}/close/              - Clôturer budget
POST   /api/budgets/{id}/duplicate/          - Dupliquer budget
GET    /api/budgets/{id}/controls/           - Contrôles budgétaires
GET    /api/budgets/{id}/execution-report/   - Rapport d'exécution
```

**Champs de données (Budget)**:
- `id`, `created_at`, `updated_at`
- `code`, `libelle`, `exercice`
- `type`: 'previsionnel' | 'initial' | 'modifie'
- `date_debut`, `date_fin`
- `statut`: 'brouillon' | 'valide' | 'cloture'
- `montant_total`, `societe`

**Fonctionnalités**:
- ✅ CRUD complet
- ✅ Workflow de validation
- ✅ Duplication d'exercice en exercice
- ✅ Suivi de l'exécution
- ✅ Contrôles budgétaires

**Pages associées**:
- `/budgeting/budgets` - Gestion budgets
- `/budgeting/budget-detail` - Détail budget
- `/budgeting/budget-control` - Contrôle budgétaire

---

### 7.2 CONTRÔLE BUDGÉTAIRE (Budget Control)

**Service**: `budgetControlService` (`analytics-budgeting-taxation.service.ts`)

**Endpoints identifiés**:
```
GET    /api/controles-budgetaires/                - Liste des contrôles
GET    /api/controles-budgetaires/{id}/           - Détail contrôle
POST   /api/controles-budgetaires/recalculate/    - Recalculer contrôles
GET    /api/controles-budgetaires/check-availability/ - Vérifier disponibilité
```

**Champs de données (BudgetControl)**:
- `id`, `created_at`, `updated_at`
- `budget`, `compte`, `centre_analytique`
- `montant_budgete`, `montant_realise`, `montant_engage`
- `ecart`, `taux_realisation`, `periode`

**Fonctionnalités**:
- ✅ Suivi par compte et centre analytique
- ✅ Calcul automatique des écarts
- ✅ Détection des dépassements
- ✅ Vérification de disponibilité avant engagement
- ✅ Recalcul automatique

**Pages associées**:
- `/budgeting/budget-control` - Contrôle budgétaire

---

## 8. MODULE FISCALITÉ (Taxation)

### 8.1 DÉCLARATIONS FISCALES (Tax Declarations)

**Service**: `taxDeclarationsService` (`analytics-budgeting-taxation.service.ts`)

**Endpoints identifiés**:
```
GET    /api/declarations-fiscales/                  - Liste des déclarations
GET    /api/declarations-fiscales/{id}/             - Détail déclaration
POST   /api/declarations-fiscales/                  - Créer déclaration
PATCH  /api/declarations-fiscales/{id}/             - Modifier déclaration
DELETE /api/declarations-fiscales/{id}/             - Supprimer déclaration
GET    /api/declarations-fiscales/overdue/          - Déclarations en retard
GET    /api/declarations-fiscales/upcoming/         - Déclarations à venir
POST   /api/declarations-fiscales/{id}/calculate/   - Calculer déclaration
POST   /api/declarations-fiscales/{id}/mark-submitted/ - Marquer déposée
POST   /api/declarations-fiscales/{id}/mark-paid/   - Marquer payée
POST   /api/declarations-fiscales/{id}/generate-file/ - Générer fichier
POST   /api/declarations-fiscales/{id}/upload-file/ - Upload fichier
GET    /api/declarations-fiscales/calendar/         - Calendrier fiscal
GET    /api/declarations-fiscales/export/           - Export déclarations
```

**Champs de données (TaxDeclaration)**:
- `id`, `created_at`, `updated_at`
- `numero`
- `type`: 'tva' | 'is' | 'irpp' | 'tpl' | 'autre'
- `exercice`, `periode_debut`, `periode_fin`
- `date_declaration`, `date_limite_depot`
- `montant_taxe`, `montant_paye`
- `statut`: 'brouillon' | 'depose' | 'paye'
- `fichier_declaration`, `societe`

**Types de taxes**:
- **TVA**: Taxe sur la Valeur Ajoutée
- **IS**: Impôt sur les Sociétés
- **IRPP**: Impôt sur le Revenu des Personnes Physiques
- **TPL**: Taxe Professionnelle de Licence
- **Autre**: Autres taxes

**Fonctionnalités**:
- ✅ CRUD complet
- ✅ Calcul automatique des taxes
- ✅ Calendrier fiscal
- ✅ Alertes échéances
- ✅ Génération de fichiers (PDF, XML, CSV)
- ✅ Upload de déclarations
- ✅ Suivi des paiements
- ✅ Déclarations en retard

**Pages associées**:
- `/taxation/declarations` - Déclarations fiscales
- `/taxation/calendar` - Calendrier fiscal
- `/taxation/calculations` - Calculs automatiques
- `/taxation/liasse-fiscale` - Liasse fiscale

---

## 9. MODULE CLÔTURES (Closures)

### 9.1 CLÔTURES PÉRIODIQUES

**Pages identifiées**:
- `/closures/complete-closures` - Module complet clôtures
- `/closures/periodic` - Clôtures périodiques
- `/closures/real-closure` - Clôture définitive
- `/closures/simple-closure` - Clôture simplifiée

**Fonctionnalités identifiées** (basé sur les composants):

#### Workflow IA de Clôture
- ✅ Workflow automatisé avec IA
- ✅ Contrôles pré-clôture automatiques
- ✅ Génération d'écritures de clôture
- ✅ Validation multi-niveaux

#### Contrôles de Clôture
- ✅ Vérification équilibre débit/crédit
- ✅ Vérification des comptes non lettrés
- ✅ Contrôle des suspens
- ✅ Contrôle des immobilisations
- ✅ Contrôle des stocks
- ✅ Contrôle TVA

#### Reports
- ✅ Report à-nouveaux
- ✅ Affectation du résultat
- ✅ Report des soldes

#### États SYSCOHADA
- ✅ Bilan (actif/passif)
- ✅ Compte de résultat
- ✅ Tableau de flux de trésorerie (TAFIRE)
- ✅ Variation des capitaux propres
- ✅ Notes annexes

**Endpoints estimés nécessaires**:
```
GET    /api/clotures/                          - Liste des clôtures
GET    /api/clotures/{id}/                     - Détail clôture
POST   /api/clotures/                          - Créer clôture
POST   /api/clotures/{id}/start-workflow/      - Démarrer workflow
POST   /api/clotures/{id}/run-controls/        - Exécuter contrôles
POST   /api/clotures/{id}/generate-entries/    - Générer écritures
POST   /api/clotures/{id}/carry-forward/       - Report à-nouveaux
POST   /api/clotures/{id}/finalize/            - Finaliser clôture
GET    /api/clotures/{id}/syscohada-statements/ - États SYSCOHADA
```

---

## 10. MODULE REPORTING (Reporting)

### 10.1 RAPPORTS PERSONNALISÉS

**Pages identifiées**:
- `/reporting/reports` - Rapports
- `/reporting/dashboards` - Tableaux de bord
- `/reporting/custom-reports` - Rapports personnalisés
- `/reporting/tax-reporting` - Reporting fiscal

**Fonctionnalités identifiées**:
- ✅ Tableaux de bord configurables
- ✅ KPI personnalisés
- ✅ Graphiques dynamiques
- ✅ Export multi-formats
- ✅ Planification d'envois automatiques

**Endpoints estimés nécessaires**:
```
GET    /api/reports/                    - Liste des rapports
GET    /api/reports/{id}/               - Détail rapport
POST   /api/reports/                    - Créer rapport
POST   /api/reports/{id}/generate/      - Générer rapport
GET    /api/reports/{id}/download/      - Télécharger rapport
GET    /api/dashboards/                 - Liste des tableaux de bord
POST   /api/dashboards/                 - Créer tableau de bord
GET    /api/dashboards/{id}/data/       - Données du tableau de bord
```

---

## 11. MODULE SÉCURITÉ (Security)

### 11.1 UTILISATEURS (Users)

**Pages identifiées**:
- `/security/users` - Gestion utilisateurs
- `/settings/users` - Configuration utilisateurs

**Endpoints estimés nécessaires**:
```
GET    /api/users/                 - Liste des utilisateurs
GET    /api/users/{id}/            - Détail utilisateur
POST   /api/users/                 - Créer utilisateur
PATCH  /api/users/{id}/            - Modifier utilisateur
DELETE /api/users/{id}/            - Supprimer utilisateur
POST   /api/users/{id}/activate/   - Activer utilisateur
POST   /api/users/{id}/deactivate/ - Désactiver utilisateur
POST   /api/users/{id}/reset-password/ - Réinitialiser mot de passe
```

**Champs de données (User)**:
- `id`, `created_at`, `updated_at`
- `username`, `email`
- `first_name`, `last_name`
- `is_active`, `is_staff`, `is_superuser`
- `role`, `permissions`
- `last_login`, `date_joined`

---

### 11.2 RÔLES ET PERMISSIONS

**Pages identifiées**:
- `/security/roles` - Gestion des rôles
- `/security/permissions` - Gestion des permissions
- `/config/profils-securite` - Profils de sécurité

**Endpoints estimés nécessaires**:
```
GET    /api/roles/                    - Liste des rôles
GET    /api/roles/{id}/               - Détail rôle
POST   /api/roles/                    - Créer rôle
PATCH  /api/roles/{id}/               - Modifier rôle
DELETE /api/roles/{id}/               - Supprimer rôle
GET    /api/permissions/              - Liste des permissions
POST   /api/roles/{id}/assign-permissions/ - Assigner permissions
```

**Champs de données (Role)**:
- `id`, `created_at`, `updated_at`
- `nom`, `code`, `description`
- `permissions`: Permission[]
- `utilisateurs_count`

**Champs de données (Permission)**:
- `id`, `nom`, `code`, `module`, `description`

---

## 12. MODULE INVENTAIRE (Inventory)

**Page identifiée**: `/inventory/dashboard`

**Fonctionnalités identifiées** (basé sur InventoryDashboard.tsx):

### 12.1 Gestion des Stocks

**KPIs**:
- Valeur totale du stock
- Nombre d'articles
- Rotation des stocks
- Valeur moyenne par article
- Articles en rupture
- Articles à réapprovisionner

**Analyses**:
- ✅ Analyse ABC
- ✅ Rotation par catégorie
- ✅ Niveaux de stock par localisation
- ✅ Analyse de vieillissement (aging)
- ✅ Valeur par méthode de valorisation

**Méthodes de valorisation**:
- **FIFO**: First In, First Out
- **LIFO**: Last In, First Out
- **AVCO**: Average Cost
- **STANDARD**: Coût standard

**Endpoints estimés nécessaires**:
```
GET    /api/inventory/items/                    - Liste des articles
GET    /api/inventory/items/{id}/               - Détail article
POST   /api/inventory/items/                    - Créer article
PATCH  /api/inventory/items/{id}/               - Modifier article
DELETE /api/inventory/items/{id}/               - Supprimer article
GET    /api/inventory/movements/                - Mouvements de stock
POST   /api/inventory/movements/                - Créer mouvement
GET    /api/inventory/locations/                - Liste des emplacements
GET    /api/inventory/valuation/                - Valorisation du stock
GET    /api/inventory/kpis/                     - KPIs inventaire
GET    /api/inventory/abc-analysis/             - Analyse ABC
GET    /api/inventory/turnover/                 - Rotation des stocks
GET    /api/inventory/aging/                    - Analyse de vieillissement
GET    /api/inventory/reorder-point/            - Points de réapprovisionnement
POST   /api/inventory/physical-inventory/       - Inventaire physique
POST   /api/inventory/adjustments/              - Ajustements de stock
```

**Champs de données (InventoryItem)**:
- `id`, `created_at`, `updated_at`
- `code`, `libelle`, `description`
- `categorie`, `unite_mesure`
- `quantite_stock`, `quantite_reservee`
- `quantite_disponible`
- `valeur_unitaire`, `valeur_totale`
- `methode_valorisation`
- `seuil_reapprovisionnement`
- `localisation`, `emplacement`
- `actif`, `societe`

---

## 13. MODULE ÉTATS FINANCIERS (Financial Statements)

**Pages identifiées**:
- `/financial/statements` - États financiers
- `/financial/balance-sheet` - Bilan
- `/financial/income-statement` - Compte de résultat
- `/financial/cash-flow` - Flux de trésorerie
- `/financial/financial-analysis` - Analyse financière
- `/financial/ratios` - Ratios financiers
- `/accounting/sig` - Soldes Intermédiaires de Gestion

**Fonctionnalités identifiées**:

### 13.1 Bilan SYSCOHADA
- ✅ Actif immobilisé
- ✅ Actif circulant
- ✅ Trésorerie actif
- ✅ Capitaux propres
- ✅ Passif
- ✅ Trésorerie passif

### 13.2 Compte de Résultat SYSCOHADA
- ✅ Produits d'exploitation
- ✅ Charges d'exploitation
- ✅ Résultat d'exploitation
- ✅ Produits financiers
- ✅ Charges financières
- ✅ Résultat financier
- ✅ Résultat exceptionnel
- ✅ Impôt sur les sociétés
- ✅ Résultat net

### 13.3 TAFIRE (Tableau de Flux de Trésorerie)
- ✅ Flux de trésorerie liés à l'activité
- ✅ Flux de trésorerie liés aux investissements
- ✅ Flux de trésorerie liés au financement
- ✅ Variation de trésorerie

### 13.4 Soldes Intermédiaires de Gestion (SIG)
- ✅ Marge commerciale
- ✅ Production de l'exercice
- ✅ Valeur ajoutée
- ✅ Excédent brut d'exploitation (EBE)
- ✅ Résultat d'exploitation
- ✅ Résultat courant avant impôt
- ✅ Résultat exceptionnel
- ✅ Résultat net

### 13.5 Ratios Financiers
- ✅ Ratios de liquidité
- ✅ Ratios de solvabilité
- ✅ Ratios de rentabilité
- ✅ Ratios d'activité
- ✅ Ratios de structure

**Endpoints estimés nécessaires**:
```
GET    /api/financial/balance-sheet/          - Bilan
GET    /api/financial/income-statement/       - Compte de résultat
GET    /api/financial/tafire/                 - TAFIRE
GET    /api/financial/sig/                    - SIG
GET    /api/financial/ratios/                 - Ratios financiers
GET    /api/financial/statements/export/      - Export états financiers
```

---

## 14. MODULE CONFIGURATION (Configuration)

**Pages identifiées**:
- `/config/configuration-center` - Centre de configuration
- `/config/multi-societes` - Multi-sociétés
- `/config/axes-analytiques` - Axes analytiques
- `/config/plan-syscohada` - Plan SYSCOHADA
- `/config/tva-taxes` - TVA et taxes
- `/config/profils-securite` - Profils de sécurité
- `/config/codification-tiers` - Codification tiers
- `/config/import-export` - Import/Export
- `/config/assistant-demarrage` - Assistant démarrage

**Fonctionnalités**:
- ✅ Configuration générale
- ✅ Paramétrage comptable
- ✅ Numérotation automatique
- ✅ Import/Export de configurations
- ✅ Assistant de démarrage

---

## 15. MODULE PARAMÈTRES (Settings)

**Pages identifiées**:
- `/settings/accounting` - Paramètres comptables
- `/settings/users` - Gestion utilisateurs
- `/settings/import-export` - Import/Export
- `/settings/backup` - Sauvegarde
- `/settings/regional` - Paramètres régionaux
- `/settings/ia-config` - Configuration IA
- `/settings/api-integrations` - Intégrations API
- `/settings/offline-mode` - Mode hors ligne
- `/settings/mobile-app` - Application mobile
- `/settings/track-change` - Suivi des modifications

**Fonctionnalités**:
- ✅ Paramètres comptables
- ✅ Paramètres régionaux (langue, devise, format dates)
- ✅ Sauvegarde/Restauration
- ✅ Import/Export de données
- ✅ Intégrations API
- ✅ Configuration IA
- ✅ Mode hors ligne
- ✅ Suivi des modifications (audit trail)

**Endpoints estimés nécessaires**:
```
GET    /api/settings/                        - Paramètres globaux
PATCH  /api/settings/                        - Modifier paramètres
GET    /api/settings/accounting/             - Paramètres comptables
PATCH  /api/settings/accounting/             - Modifier paramètres comptables
GET    /api/settings/regional/               - Paramètres régionaux
PATCH  /api/settings/regional/               - Modifier paramètres régionaux
POST   /api/settings/backup/create/          - Créer sauvegarde
GET    /api/settings/backup/list/            - Liste sauvegardes
POST   /api/settings/backup/restore/         - Restaurer sauvegarde
POST   /api/settings/import/                 - Import données
GET    /api/settings/export/                 - Export données
GET    /api/settings/integrations/           - Liste intégrations
POST   /api/settings/integrations/           - Configurer intégration
GET    /api/audit-trail/                     - Journal d'audit
```

---

## RÉSUMÉ DES ENDPOINTS PAR MODULE

| Module | Endpoints CRUD | Endpoints Actions | Endpoints Reports | Total Estimé |
|--------|----------------|-------------------|-------------------|--------------|
| Core (Sociétés, Exercices, Devises) | 15 | 12 | 3 | 30 |
| Comptabilité | 25 | 15 | 10 | 50 |
| Tiers | 15 | 8 | 7 | 30 |
| Trésorerie | 15 | 10 | 8 | 33 |
| Immobilisations | 12 | 8 | 8 | 28 |
| Analytique | 10 | 3 | 2 | 15 |
| Budget | 10 | 5 | 3 | 18 |
| Fiscalité | 8 | 6 | 3 | 17 |
| Clôtures | 5 | 8 | 5 | 18 |
| Inventaire | 12 | 6 | 8 | 26 |
| Reporting | 6 | 4 | 12 | 22 |
| Sécurité | 10 | 5 | 0 | 15 |
| États Financiers | 0 | 0 | 12 | 12 |
| Configuration | 5 | 8 | 2 | 15 |
| Paramètres | 8 | 6 | 3 | 17 |
| **TOTAL** | **156** | **104** | **86** | **346** |

---

## STRUCTURES DE DONNÉES DÉTAILLÉES

### Types de Base
```typescript
interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}
```

### Entités Principales (voir types complets dans `/frontend/src/types/api.types.ts`)
- ✅ Company (30 lignes)
- ✅ FiscalYear (12 lignes)
- ✅ Currency (10 lignes)
- ✅ ChartOfAccount (15 lignes)
- ✅ Journal (12 lignes)
- ✅ AccountingEntry (20 lignes)
- ✅ AccountingEntryLine (12 lignes)
- ✅ ThirdParty (25 lignes)
- ✅ Contact (12 lignes)
- ✅ BankAccount (18 lignes)
- ✅ BankTransaction (15 lignes)
- ✅ FixedAsset (22 lignes)
- ✅ Depreciation (10 lignes)
- ✅ AnalyticalAxis (10 lignes)
- ✅ AnalyticalCenter (12 lignes)
- ✅ Budget (15 lignes)
- ✅ BudgetControl (12 lignes)
- ✅ TaxDeclaration (18 lignes)

**Total**: ~540 lignes de types TypeScript définis

---

## ARCHITECTURE DES SERVICES

### Services Complets Identifiés

1. **core-complete.service.ts** (457 lignes)
   - `CompaniesService`
   - `FiscalYearsService`
   - `CurrenciesService`

2. **accounting-complete.service.ts** (448 lignes)
   - `ChartOfAccountsService`
   - `JournalsService`
   - `AccountingEntriesService`
   - `EntryLinesService`
   - `AccountingReportsService`

3. **thirdparty-complete.service.ts** (578 lignes)
   - `ThirdPartyService`
   - `ContactsService`
   - `ThirdPartyReportsService`

4. **treasury-complete.service.ts** (472 lignes)
   - `BankAccountsService`
   - `BankTransactionsService`
   - `TreasuryReportsService`

5. **assets-complete.service.ts** (557 lignes)
   - `FixedAssetsService`
   - `DepreciationsService`
   - `AssetsReportsService`

6. **analytics-budgeting-taxation.service.ts** (581 lignes)
   - `AnalyticalAxisService`
   - `AnalyticalCentersService`
   - `BudgetsService`
   - `BudgetControlService`
   - `TaxDeclarationsService`

### Services avec Mock Data (à compléter)
- `assets.service.ts` - Données simulées
- `treasury.service.ts` - Données simulées
- `thirdparty.service.ts` - Données simulées
- `budget.service.ts` - Données simulées

---

## FONCTIONNALITÉS TRANSVERSALES

### 1. Import/Export
**Formats supportés**:
- ✅ CSV
- ✅ Excel (XLSX)
- ✅ PDF
- ✅ OFX (relevés bancaires)
- ✅ QIF (relevés bancaires)
- ✅ XML (déclarations fiscales)

**Modules avec Import**:
- Écritures comptables
- Plan comptable SYSCOHADA
- Tiers (clients/fournisseurs)
- Immobilisations
- Relevés bancaires
- Taux de change

**Modules avec Export**:
- Tous les rapports
- Balance générale
- Grand livre
- États financiers
- Déclarations fiscales

### 2. Recherche et Filtres
**Paramètres communs**:
- `search`: Recherche textuelle
- `page`, `page_size`: Pagination
- `ordering`: Tri
- `date_debut`, `date_fin`: Filtres par date
- `statut`: Filtre par statut
- `actif`: Filtre actif/inactif

### 3. Lettrage
**Modules concernés**:
- Écritures comptables
- Transactions bancaires
- Tiers (clients/fournisseurs)

**Fonctionnalités**:
- ✅ Lettrage manuel
- ✅ Lettrage automatique
- ✅ Délettrage
- ✅ Rapprochement bancaire

### 4. Validation et Workflow
**Statuts communs**:
- `brouillon`: En cours de saisie
- `valide`: Validé
- `cloture`: Clôturé
- `archive`: Archivé

**Modules avec workflow**:
- Écritures comptables
- Budgets
- Déclarations fiscales
- Clôtures périodiques
- Exercices fiscaux

### 5. Pièces Jointes
**Modules supportant les pièces jointes**:
- Écritures comptables
- Transactions bancaires
- Déclarations fiscales
- Factures (tiers)
- Immobilisations

### 6. Génération Automatique
**Éléments générés automatiquement**:
- ✅ Numéros de pièce comptable
- ✅ Numéros de compte tiers
- ✅ Écritures d'amortissement
- ✅ Écritures de clôture
- ✅ Écritures de rapprochement bancaire
- ✅ Plans d'amortissement

### 7. Hiérarchies
**Modules avec hiérarchie**:
- Plan comptable (comptes parents/enfants)
- Centres analytiques (multi-niveaux)
- Sociétés (groupe/filiales)

### 8. Audit Trail
**Champs d'audit sur toutes les entités**:
- `created_at`: Date de création
- `updated_at`: Date de modification
- `created_by`: Créé par (utilisateur)
- `updated_by`: Modifié par (utilisateur)
- `validee_par`: Validé par (utilisateur)
- `date_validation`: Date de validation

---

## INTÉGRATIONS IDENTIFIÉES

### 1. Intelligence Artificielle (IA)
**Modules avec IA**:
- Clôtures périodiques (workflow automatisé)
- OCR factures
- Prévisions de trésorerie
- Suggestions de comptes
- Détection d'anomalies

**Endpoints estimés**:
```
POST   /api/ia/ocr-invoice/              - OCR facture
POST   /api/ia/suggest-account/          - Suggérer compte
POST   /api/ia/forecast-treasury/        - Prévisions trésorerie
POST   /api/ia/detect-anomalies/         - Détecter anomalies
GET    /api/ia/analytics/                - Analytics IA
```

### 2. Connexions Bancaires
**Page**: `/treasury/connexions-bancaires`

**Fonctionnalités**:
- ✅ Connexion aux banques (API bancaires)
- ✅ Import automatique des relevés
- ✅ Synchronisation temps réel

**Endpoints estimés**:
```
GET    /api/bank-connections/            - Liste des connexions
POST   /api/bank-connections/            - Créer connexion
DELETE /api/bank-connections/{id}/       - Supprimer connexion
POST   /api/bank-connections/{id}/sync/  - Synchroniser
GET    /api/bank-connections/{id}/status/ - Statut connexion
```

### 3. API Externes
**Page**: `/settings/api-integrations`

**Intégrations possibles**:
- Banques
- ERP externes
- CRM
- E-commerce
- Plateformes de paiement

---

## BESOINS SPÉCIFIQUES SYSCOHADA

### 1. Plan Comptable SYSCOHADA
**Classes**:
- Classe 1: Comptes de ressources durables
- Classe 2: Comptes d'actif immobilisé
- Classe 3: Comptes de stocks
- Classe 4: Comptes de tiers
- Classe 5: Comptes de trésorerie
- Classe 6: Comptes de charges
- Classe 7: Comptes de produits
- Classe 8: Comptes de résultats
- Classe 9: Comptes analytiques

### 2. États Financiers SYSCOHADA
- ✅ Bilan (Actif/Passif)
- ✅ Compte de résultat (par nature)
- ✅ TAFIRE (Tableau de flux de trésorerie)
- ✅ Variation des capitaux propres
- ✅ Notes annexes

### 3. Liasse Fiscale
**Page**: `/taxation/liasse-fiscale`

**Contenu**:
- ✅ Bilan fiscal
- ✅ Compte de résultat fiscal
- ✅ Tableau de détermination du résultat fiscal
- ✅ Détail des charges
- ✅ Détail des produits
- ✅ Amortissements et provisions
- ✅ Plus et moins-values

---

## RECOMMANDATIONS POUR LE BACKEND

### 1. Priorités d'Implémentation

**Phase 1 - Core (CRITIQUE)**:
1. Authentification (JWT)
2. Sociétés, Exercices, Devises
3. Plan comptable SYSCOHADA
4. Journaux
5. Écritures comptables

**Phase 2 - Fonctionnalités Essentielles**:
1. Tiers (Clients/Fournisseurs)
2. Comptes bancaires
3. Transactions bancaires
4. Immobilisations
5. Amortissements

**Phase 3 - Analytique et Budget**:
1. Axes et centres analytiques
2. Budgets
3. Contrôle budgétaire

**Phase 4 - Fiscalité et Clôtures**:
1. Déclarations fiscales
2. Clôtures périodiques
3. États financiers SYSCOHADA

**Phase 5 - Avancé**:
1. Inventaire
2. Rapports personnalisés
3. Intégrations API
4. IA et automatisation

### 2. Standards à Respecter

**Architecture REST**:
- ✅ GET pour lecture
- ✅ POST pour création
- ✅ PATCH pour modification partielle
- ✅ DELETE pour suppression
- ✅ PUT pour remplacement complet (si nécessaire)

**Pagination**:
```json
{
  "count": 100,
  "next": "http://api/endpoint?page=2",
  "previous": null,
  "results": [...]
}
```

**Filtres et Recherche**:
- Query params pour filtres: `?actif=true&date_debut=2024-01-01`
- Recherche textuelle: `?search=client`
- Tri: `?ordering=-created_at` (descendant)
- Pagination: `?page=1&page_size=20`

**Format des Dates**:
- ISO 8601: `YYYY-MM-DD` ou `YYYY-MM-DDTHH:MM:SS.sssZ`

**Format des Montants**:
- Nombres décimaux (Decimal en Python)
- Arrondi à 2 décimales pour les montants en devise

**Gestion des Erreurs**:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Données invalides",
    "details": {
      "libelle": ["Ce champ est obligatoire"],
      "montant": ["Le montant doit être positif"]
    }
  }
}
```

### 3. Sécurité

**Authentification**:
- ✅ JWT avec access et refresh tokens
- ✅ Expiration des tokens
- ✅ Refresh automatique

**Permissions**:
- ✅ Permissions granulaires par module
- ✅ Rôles prédéfinis (Admin, Chef Comptable, Comptable, etc.)
- ✅ Permissions personnalisables

**Audit Trail**:
- ✅ Enregistrement de toutes les modifications
- ✅ Traçabilité des validations
- ✅ Historique des accès

### 4. Performance

**Optimisations**:
- ✅ Pagination obligatoire sur les listes
- ✅ Lazy loading des relations
- ✅ Indexation des champs fréquemment recherchés
- ✅ Cache pour les données statiques (plan comptable, etc.)
- ✅ Compression des réponses (gzip)

**Limites Recommandées**:
- Page size par défaut: 20
- Page size maximum: 100
- Timeout requêtes: 30 secondes
- Taille max upload: 10 MB

### 5. Validation des Données

**Règles de Validation Comptable**:
- ✅ Équilibre débit/crédit pour les écritures
- ✅ Dates dans l'exercice ouvert
- ✅ Comptes actifs uniquement
- ✅ Journaux actifs uniquement
- ✅ Numéros de compte valides (format SYSCOHADA)
- ✅ Montants positifs ou négatifs selon le contexte
- ✅ Vérification des chevauchements de dates (exercices)

---

## ENDPOINTS API MOCK À IMPLÉMENTER EN PRIORITÉ

### Endpoints avec Mock Data (Statut: À implémenter)

1. **Assets Service** (`assets.service.ts`)
   - ⚠️ Utilise actuellement des données simulées
   - 📋 Endpoints à créer: `/api/immobilisations/*`

2. **Treasury Service** (`treasury.service.ts`)
   - ⚠️ Méthodes héritées avec mock data
   - 📋 Endpoints partiellement implémentés

3. **Third Party Service** (`thirdparty.service.ts`)
   - ⚠️ Toutes les méthodes retournent du mock
   - 📋 Endpoints à créer: `/api/tiers/*`

4. **Budget Service** (`budget.service.ts`)
   - ⚠️ Toutes les méthodes retournent du mock
   - 📋 Endpoints à créer: `/api/budgets/*`

---

## CONCLUSION

### Modules Identifiés: 15
1. ✅ Core (Sociétés, Exercices, Devises)
2. ✅ Comptabilité (Plan, Journaux, Écritures, Rapports)
3. ✅ Tiers (Clients, Fournisseurs, Contacts)
4. ✅ Trésorerie (Comptes bancaires, Transactions)
5. ✅ Immobilisations (Actifs, Amortissements)
6. ✅ Comptabilité Analytique (Axes, Centres)
7. ✅ Budget (Budgets, Contrôle)
8. ✅ Fiscalité (Déclarations, Calendrier)
9. ✅ Clôtures (Périodiques, Définitives)
10. ✅ Inventaire (Stocks, Valorisation)
11. ✅ Reporting (Rapports personnalisés, Dashboards)
12. ✅ Sécurité (Users, Rôles, Permissions)
13. ✅ États Financiers (Bilan, Résultat, TAFIRE, SIG)
14. ✅ Configuration (Paramétrage général)
15. ✅ Paramètres (Settings, Intégrations)

### Endpoints Estimés: 346
- CRUD: 156
- Actions: 104
- Reports: 86

### Services API: 18
- Services complets: 14
- Services avec mock: 4

### Types TypeScript: ~540 lignes

### Pages/Composants: 114+ pages

### Formats d'Export: 5
- PDF, Excel, CSV, OFX, QIF, XML

### Intégrations: 3+
- IA, Banques, API externes

---

**Rapport généré le**: 2025-10-07
**Analysé par**: Claude Code
**Source**: Frontend WiseBook (`C:\devs\WiseBook\frontend`)
