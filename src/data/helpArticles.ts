export interface HelpArticle {
  id: string;
  title: string;
  category: 'demarrage' | 'comptabilite' | 'tresorerie' | 'cloture' | 'fiscalite' | 'immobilisations' | 'rapports' | 'parametres' | 'depannage';
  tags: string[];
  excerpt: string;
  content: string; // Markdown
  views?: number;
}

export const HELP_CATEGORIES = [
  { id: 'demarrage', label: 'Démarrage', icon: '🚀' },
  { id: 'comptabilite', label: 'Comptabilité', icon: '📒' },
  { id: 'tresorerie', label: 'Trésorerie', icon: '💰' },
  { id: 'cloture', label: 'Clôtures', icon: '🔒' },
  { id: 'fiscalite', label: 'Fiscalité', icon: '📊' },
  { id: 'immobilisations', label: 'Immobilisations', icon: '🏢' },
  { id: 'rapports', label: 'Rapports', icon: '📈' },
  { id: 'parametres', label: 'Paramètres', icon: '⚙️' },
  { id: 'depannage', label: 'Dépannage', icon: '🔧' },
] as const;

export const HELP_ARTICLES: HelpArticle[] = [
  {
    id: 'first-entry',
    title: 'Saisir votre première écriture comptable',
    category: 'demarrage',
    tags: ['écriture', 'journal', 'débit', 'crédit'],
    excerpt: 'Guide pas à pas pour créer votre première écriture SYSCOHADA équilibrée.',
    content: `# Saisir votre première écriture

## Étape 1 : Choisir le journal
Allez dans **Comptabilité → Nouvelle écriture**. Sélectionnez le journal approprié :
- **AC** — Achats
- **VE** — Ventes
- **BQ** — Banque
- **CA** — Caisse
- **OD** — Opérations Diverses

## Étape 2 : Date et libellé
Saisissez la date de l'opération (doit être dans une période ouverte) et un libellé descriptif.

## Étape 3 : Lignes débit/crédit
Pour chaque ligne, saisissez :
- Le compte SYSCOHADA (ex. 411 pour Clients)
- Le montant en débit OU crédit (jamais les deux sur la même ligne)

## Étape 4 : Équilibrer
La somme des débits doit égaler la somme des crédits. L'application bloque la validation sinon.

## Étape 5 : Valider
Cliquez sur **Valider**. L'écriture devient immuable et est ajoutée à la piste d'audit.`,
  },
  {
    id: 'plan-comptable',
    title: 'Comprendre le plan comptable SYSCOHADA',
    category: 'comptabilite',
    tags: ['plan comptable', 'classes', 'OHADA'],
    excerpt: 'Les 9 classes du plan comptable SYSCOHADA expliquées.',
    content: `# Plan Comptable SYSCOHADA

Le plan comptable OHADA révisé 2017 organise les comptes en **9 classes** :

| Classe | Nature | Sens normal |
|--------|--------|-------------|
| **1** | Capitaux propres et dettes financières | Crédit |
| **2** | Immobilisations | Débit |
| **3** | Stocks | Débit |
| **4** | Tiers (Clients, Fournisseurs, État) | Mixte |
| **5** | Trésorerie | Débit |
| **6** | Charges | Débit |
| **7** | Produits | Crédit |
| **8** | Comptes spéciaux (HAO) | Variable |
| **9** | Comptabilité analytique | Variable |

## Comptes obligatoires
- **101** — Capital social
- **411** — Clients
- **401** — Fournisseurs
- **521** — Banques
- **571** — Caisse
- **601** — Achats de marchandises
- **701** — Ventes de marchandises`,
  },
  {
    id: 'cloture-mensuelle',
    title: 'Effectuer une clôture mensuelle',
    category: 'cloture',
    tags: ['clôture', 'période', 'verrouillage'],
    excerpt: 'Les 8 étapes de clôture mensuelle SYSCOHADA dans Atlas Finance.',
    content: `# Clôture mensuelle

Atlas Finance suit le processus SYSCOHADA en 8 étapes pour la clôture mensuelle :

1. **Vérification des journaux** — équilibre débit/crédit
2. **Rapprochements bancaires** — concordance soldes 521 vs relevés
3. **Lettrage des tiers** — soldes des comptes 40/41
4. **Régularisations** — CCA, FNP, FAE, PCA
5. **Provisions** — risques et charges
6. **Verrouillage** — la période devient immuable
7. **Génération états** — Bilan intermédiaire, CR
8. **Extournes N+1** — préparation des contre-passations

⚠️ **Attention** : une clôture mensuelle peut être réouverte par un administrateur, mais une **clôture annuelle est définitive** (Art. 19 SYSCOHADA).`,
  },
  {
    id: 'tva-calculation',
    title: 'Calcul automatique de la TVA',
    category: 'fiscalite',
    tags: ['TVA', 'fiscalité', 'UEMOA'],
    excerpt: 'Comment Atlas Finance calcule la TVA collectée et déductible.',
    content: `# Calcul de la TVA

Atlas Finance supporte les taux TVA de **16 pays OHADA**.

## Comptes utilisés
- **4431** — TVA facturée sur ventes (collectée)
- **4452** — TVA récupérable sur achats (déductible)
- **4441** — État, TVA due

## Formule
\`\`\`
TVA à payer = TVA collectée (4431) - TVA déductible (4452)
\`\`\`

## Taux par pays
- Côte d'Ivoire, Sénégal, Burkina Faso, Mali : **18%**
- Cameroun : **19,25%** (17,5% TVA + 10% CAC)
- Gabon, Congo, Tchad : **18%**

Les taux sont mis à jour automatiquement selon le pays de l'organisation.`,
  },
  {
    id: 'amortissements',
    title: 'Amortissements des immobilisations',
    category: 'immobilisations',
    tags: ['amortissement', 'immobilisation', 'VNC'],
    excerpt: 'Méthodes linéaire et dégressive avec prorata temporis.',
    content: `# Amortissements SYSCOHADA

## Méthode linéaire
\`\`\`
Dotation annuelle = Valeur d'acquisition / Durée d'utilité
\`\`\`

Pour la **première année**, prorata temporis sur 360 jours :
\`\`\`
Dotation = Valeur × Taux × (Jours / 360)
\`\`\`

## Méthode dégressive
\`\`\`
Taux dégressif = (1 / Durée) × Coefficient OHADA
\`\`\`

## Écritures générées
- **Débit 681** — Dotations aux amortissements
- **Crédit 28x** — Amortissements de l'immobilisation

## VNC
\`\`\`
Valeur Nette Comptable = Valeur brute - Amortissements cumulés
\`\`\`

⚠️ La VNC ne peut jamais être négative.`,
  },
  {
    id: 'lettrage',
    title: 'Lettrage des comptes de tiers',
    category: 'comptabilite',
    tags: ['lettrage', 'tiers', 'matching'],
    excerpt: 'Réconcilier factures et règlements clients/fournisseurs.',
    content: `# Lettrage

Le lettrage permet de **matcher les factures avec leurs règlements** sur les comptes de tiers (411, 401).

## 4 méthodes
1. **Exact** — Match par montant exact
2. **Référence** — Match par numéro de facture
3. **Somme N** — Plusieurs factures pour un règlement
4. **Manuel** — Sélection libre

## Workflow
1. Aller dans **Comptabilité → Lettrage**
2. Sélectionner le compte (ex. 411)
3. Cliquer sur les lignes à associer (somme débit = somme crédit)
4. Valider — un code lettre est attribué (A, B, C...)

Les écritures lettrées disparaissent du solde non lettré.`,
  },
  {
    id: 'rapprochement-bancaire',
    title: 'Rapprochement bancaire',
    category: 'tresorerie',
    tags: ['rapprochement', 'banque', '521'],
    excerpt: 'Réconcilier le solde comptable et le relevé bancaire.',
    content: `# Rapprochement bancaire

## Objectif
Faire correspondre le **solde du compte 521 (Banque)** avec le **solde du relevé bancaire**.

## Étapes
1. **Trésorerie → Rapprochement bancaire**
2. Importer le relevé (CSV, OFX)
3. Pointer les écritures qui correspondent à des opérations bancaires
4. Identifier les écarts :
   - Chèques émis non débités
   - Virements en transit
   - Frais bancaires non saisis
5. Saisir les écritures manquantes
6. Valider — la session de rapprochement devient immuable

⚠️ Les rapprochements clôturés ne peuvent pas être modifiés.`,
  },
  {
    id: 'export-fec',
    title: 'Export FEC (Fichier des Écritures Comptables)',
    category: 'rapports',
    tags: ['FEC', 'export', 'DGI'],
    excerpt: 'Exporter les écritures au format réglementaire FEC.',
    content: `# Export FEC

Le **Fichier des Écritures Comptables** est le format réglementaire d'export des écritures (Art. A.47 A-1 du LPF).

## 18 colonnes obligatoires
JournalCode, JournalLib, EcritureNum, EcritureDate, CompteNum, CompteLib, CompAuxNum, CompAuxLib, PieceRef, PieceDate, EcritureLib, Debit, Credit, EcritureLet, DateLet, ValidDate, Montantdevise, Idevise.

## Comment exporter
1. **États → Export FEC**
2. Sélectionner l'exercice
3. Choisir le séparateur (\`;\` ou \`Tab\`)
4. Choisir l'encodage (UTF-8 ou ISO-8859-15)
5. Cliquer sur **Exporter**

Le fichier est conforme à la DGI et accepté par tous les contrôleurs fiscaux OHADA.`,
  },
  {
    id: 'periode-bloquee',
    title: 'Erreur : "Période verrouillée"',
    category: 'depannage',
    tags: ['erreur', 'période', 'verrouillage'],
    excerpt: 'Que faire quand vous ne pouvez pas saisir une écriture.',
    content: `# Période verrouillée

## Cause
Vous tentez de saisir une écriture sur une **période déjà clôturée**.

## Solutions

### Si la clôture est mensuelle (réouvrable)
1. Demander à un **administrateur** de réouvrir la période
2. **Paramètres → Périodes comptables**
3. Cliquer sur "Réouvrir" (action audit-trackée)
4. Saisir vos écritures
5. Refaire la clôture

### Si la clôture est annuelle (Art. 19 SYSCOHADA)
**Impossible de réouvrir** — l'exercice est définitivement clos.

À la place :
1. Saisir l'écriture sur l'**exercice suivant**
2. Utiliser un compte de **régularisation** (471, 472)
3. Ou créer une **écriture d'à-nouveau** dans le journal AN`,
  },
  {
    id: 'utilisateurs-roles',
    title: 'Gérer les utilisateurs et les rôles',
    category: 'parametres',
    tags: ['utilisateurs', 'rôles', 'permissions'],
    excerpt: 'Inviter des collaborateurs et définir leurs permissions.',
    content: `# Utilisateurs et rôles

## Rôles disponibles
- **Super Admin** — accès total
- **Directeur Général (DG)** — lecture/écriture, validation clôtures
- **Expert-comptable** — toute la comptabilité
- **Comptable** — saisie + lecture
- **Assistant** — saisie uniquement
- **Lecture seule** — consultation des rapports

## Inviter un utilisateur
1. **Paramètres → Utilisateurs**
2. **+ Inviter**
3. Saisir email + rôle
4. L'utilisateur reçoit un email Resend avec un lien d'activation
5. Il définit son mot de passe et accède à l'app

## Désactiver un utilisateur
Cliquer sur le menu \`...\` → **Désactiver**. L'historique de ses actions reste dans la piste d'audit.`,
  },
];
