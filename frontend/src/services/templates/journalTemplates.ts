/**
 * 22 modeles d'ecritures comptables SYSCOHADA predefinies.
 * Conformes au plan comptable SYSCOHADA revise (2017).
 */
import { Money, money, percentage } from '../../utils/money';

// ============================================================================
// TYPES
// ============================================================================

export type TemplateCategorie = 'ACHATS' | 'VENTES' | 'TRESORERIE' | 'PAIE' | 'OD' | 'FISCALITE';

export type Sens = 'D' | 'C';

export interface TemplateLigne {
  compte: string;
  libelle: string;
  sens: Sens;
  /** Optional formula key for auto-calculation (e.g. 'montantHT', 'tva', 'montantTTC') */
  formule?: string;
  /** Percentage of base amount for formula-driven lines */
  pourcentage?: number;
}

export interface ChampVariable {
  cle: string;
  libelle: string;
  type: 'montant' | 'taux' | 'tiers' | 'texte' | 'date' | 'compte';
  obligatoire: boolean;
  defaut?: string | number;
}

export interface JournalEntryTemplate {
  id: string;
  code: string;
  libelle: string;
  categorie: TemplateCategorie;
  journalDefaut: string;
  description: string;
  lignes: TemplateLigne[];
  champsVariables: ChampVariable[];
}

export interface TemplateApplicationResult {
  success: boolean;
  lines?: Array<{
    accountCode: string;
    accountName: string;
    label: string;
    debit: number;
    credit: number;
  }>;
  error?: string;
}

// ============================================================================
// 22 TEMPLATES SYSCOHADA
// ============================================================================

export const JOURNAL_TEMPLATES: JournalEntryTemplate[] = [
  // ---- ACHATS (4 templates) ----
  {
    id: 'TPL-ACH-001',
    code: 'ACH-MARCH',
    libelle: 'Achat de marchandises',
    categorie: 'ACHATS',
    journalDefaut: 'AC',
    description: 'Achat de marchandises avec TVA deductible',
    lignes: [
      { compte: '601', libelle: 'Achats de marchandises', sens: 'D', formule: 'montantHT' },
      { compte: '4452', libelle: 'TVA recuperable sur achats', sens: 'D', formule: 'tva' },
      { compte: '401', libelle: 'Fournisseurs', sens: 'C', formule: 'montantTTC' },
    ],
    champsVariables: [
      { cle: 'montantHT', libelle: 'Montant HT', type: 'montant', obligatoire: true },
      { cle: 'tauxTVA', libelle: 'Taux TVA (%)', type: 'taux', obligatoire: true, defaut: 18 },
      { cle: 'tiers', libelle: 'Fournisseur', type: 'tiers', obligatoire: true },
      { cle: 'libelle', libelle: 'Libelle', type: 'texte', obligatoire: false, defaut: 'Achat marchandises' },
    ],
  },
  {
    id: 'TPL-ACH-002',
    code: 'ACH-MP',
    libelle: 'Achat de matieres premieres',
    categorie: 'ACHATS',
    journalDefaut: 'AC',
    description: 'Achat de matieres premieres avec TVA deductible',
    lignes: [
      { compte: '602', libelle: 'Achats de matieres premieres', sens: 'D', formule: 'montantHT' },
      { compte: '4452', libelle: 'TVA recuperable sur achats', sens: 'D', formule: 'tva' },
      { compte: '401', libelle: 'Fournisseurs', sens: 'C', formule: 'montantTTC' },
    ],
    champsVariables: [
      { cle: 'montantHT', libelle: 'Montant HT', type: 'montant', obligatoire: true },
      { cle: 'tauxTVA', libelle: 'Taux TVA (%)', type: 'taux', obligatoire: true, defaut: 18 },
      { cle: 'tiers', libelle: 'Fournisseur', type: 'tiers', obligatoire: true },
      { cle: 'libelle', libelle: 'Libelle', type: 'texte', obligatoire: false, defaut: 'Achat matieres premieres' },
    ],
  },
  {
    id: 'TPL-ACH-003',
    code: 'ACH-SERV',
    libelle: 'Achat de services exterieurs',
    categorie: 'ACHATS',
    journalDefaut: 'AC',
    description: 'Charges externes et services avec TVA',
    lignes: [
      { compte: '624', libelle: 'Services exterieurs', sens: 'D', formule: 'montantHT' },
      { compte: '4452', libelle: 'TVA recuperable sur services', sens: 'D', formule: 'tva' },
      { compte: '401', libelle: 'Fournisseurs', sens: 'C', formule: 'montantTTC' },
    ],
    champsVariables: [
      { cle: 'montantHT', libelle: 'Montant HT', type: 'montant', obligatoire: true },
      { cle: 'tauxTVA', libelle: 'Taux TVA (%)', type: 'taux', obligatoire: true, defaut: 18 },
      { cle: 'tiers', libelle: 'Fournisseur', type: 'tiers', obligatoire: true },
      { cle: 'libelle', libelle: 'Libelle', type: 'texte', obligatoire: false, defaut: 'Services exterieurs' },
    ],
  },
  {
    id: 'TPL-ACH-004',
    code: 'ACH-IMMO',
    libelle: "Achat d'immobilisations",
    categorie: 'ACHATS',
    journalDefaut: 'AC',
    description: "Acquisition d'immobilisation corporelle avec TVA",
    lignes: [
      { compte: '24', libelle: 'Immobilisations corporelles', sens: 'D', formule: 'montantHT' },
      { compte: '4451', libelle: "TVA recuperable sur immobilisations", sens: 'D', formule: 'tva' },
      { compte: '401', libelle: 'Fournisseurs', sens: 'C', formule: 'montantTTC' },
    ],
    champsVariables: [
      { cle: 'montantHT', libelle: 'Montant HT', type: 'montant', obligatoire: true },
      { cle: 'tauxTVA', libelle: 'Taux TVA (%)', type: 'taux', obligatoire: true, defaut: 18 },
      { cle: 'compteImmo', libelle: "Compte d'immobilisation", type: 'compte', obligatoire: true, defaut: '241' },
      { cle: 'tiers', libelle: 'Fournisseur', type: 'tiers', obligatoire: true },
    ],
  },

  // ---- VENTES (4 templates) ----
  {
    id: 'TPL-VTE-001',
    code: 'VTE-MARCH',
    libelle: 'Vente de marchandises',
    categorie: 'VENTES',
    journalDefaut: 'VE',
    description: 'Vente de marchandises avec TVA collectee',
    lignes: [
      { compte: '411', libelle: 'Clients', sens: 'D', formule: 'montantTTC' },
      { compte: '701', libelle: 'Ventes de marchandises', sens: 'C', formule: 'montantHT' },
      { compte: '4431', libelle: 'TVA facturee sur ventes', sens: 'C', formule: 'tva' },
    ],
    champsVariables: [
      { cle: 'montantHT', libelle: 'Montant HT', type: 'montant', obligatoire: true },
      { cle: 'tauxTVA', libelle: 'Taux TVA (%)', type: 'taux', obligatoire: true, defaut: 18 },
      { cle: 'tiers', libelle: 'Client', type: 'tiers', obligatoire: true },
      { cle: 'libelle', libelle: 'Libelle', type: 'texte', obligatoire: false, defaut: 'Vente marchandises' },
    ],
  },
  {
    id: 'TPL-VTE-002',
    code: 'VTE-PF',
    libelle: 'Vente de produits finis',
    categorie: 'VENTES',
    journalDefaut: 'VE',
    description: 'Vente de produits finis avec TVA collectee',
    lignes: [
      { compte: '411', libelle: 'Clients', sens: 'D', formule: 'montantTTC' },
      { compte: '702', libelle: 'Ventes de produits finis', sens: 'C', formule: 'montantHT' },
      { compte: '4431', libelle: 'TVA facturee sur ventes', sens: 'C', formule: 'tva' },
    ],
    champsVariables: [
      { cle: 'montantHT', libelle: 'Montant HT', type: 'montant', obligatoire: true },
      { cle: 'tauxTVA', libelle: 'Taux TVA (%)', type: 'taux', obligatoire: true, defaut: 18 },
      { cle: 'tiers', libelle: 'Client', type: 'tiers', obligatoire: true },
    ],
  },
  {
    id: 'TPL-VTE-003',
    code: 'VTE-PREST',
    libelle: 'Prestation de services',
    categorie: 'VENTES',
    journalDefaut: 'VE',
    description: 'Facturation de prestation de services',
    lignes: [
      { compte: '411', libelle: 'Clients', sens: 'D', formule: 'montantTTC' },
      { compte: '706', libelle: 'Prestations de services', sens: 'C', formule: 'montantHT' },
      { compte: '4431', libelle: 'TVA facturee sur prestations', sens: 'C', formule: 'tva' },
    ],
    champsVariables: [
      { cle: 'montantHT', libelle: 'Montant HT', type: 'montant', obligatoire: true },
      { cle: 'tauxTVA', libelle: 'Taux TVA (%)', type: 'taux', obligatoire: true, defaut: 18 },
      { cle: 'tiers', libelle: 'Client', type: 'tiers', obligatoire: true },
    ],
  },
  {
    id: 'TPL-VTE-004',
    code: 'VTE-AVOIR',
    libelle: 'Avoir client',
    categorie: 'VENTES',
    journalDefaut: 'VE',
    description: "Avoir / note de credit client (ecriture inversee)",
    lignes: [
      { compte: '701', libelle: 'Ventes de marchandises', sens: 'D', formule: 'montantHT' },
      { compte: '4431', libelle: 'TVA facturee sur ventes', sens: 'D', formule: 'tva' },
      { compte: '411', libelle: 'Clients', sens: 'C', formule: 'montantTTC' },
    ],
    champsVariables: [
      { cle: 'montantHT', libelle: 'Montant HT', type: 'montant', obligatoire: true },
      { cle: 'tauxTVA', libelle: 'Taux TVA (%)', type: 'taux', obligatoire: true, defaut: 18 },
      { cle: 'tiers', libelle: 'Client', type: 'tiers', obligatoire: true },
    ],
  },

  // ---- TRESORERIE (4 templates) ----
  {
    id: 'TPL-TRE-001',
    code: 'TRE-ENCAIS',
    libelle: 'Encaissement client',
    categorie: 'TRESORERIE',
    journalDefaut: 'BQ',
    description: 'Encaissement reglement client par banque',
    lignes: [
      { compte: '521', libelle: 'Banque', sens: 'D', formule: 'montantTTC' },
      { compte: '411', libelle: 'Clients', sens: 'C', formule: 'montantTTC' },
    ],
    champsVariables: [
      { cle: 'montantTTC', libelle: 'Montant encaisse', type: 'montant', obligatoire: true },
      { cle: 'tiers', libelle: 'Client', type: 'tiers', obligatoire: true },
      { cle: 'reference', libelle: 'Ref. reglement', type: 'texte', obligatoire: false },
    ],
  },
  {
    id: 'TPL-TRE-002',
    code: 'TRE-DECAIS',
    libelle: 'Decaissement fournisseur',
    categorie: 'TRESORERIE',
    journalDefaut: 'BQ',
    description: 'Paiement fournisseur par banque',
    lignes: [
      { compte: '401', libelle: 'Fournisseurs', sens: 'D', formule: 'montantTTC' },
      { compte: '521', libelle: 'Banque', sens: 'C', formule: 'montantTTC' },
    ],
    champsVariables: [
      { cle: 'montantTTC', libelle: 'Montant paye', type: 'montant', obligatoire: true },
      { cle: 'tiers', libelle: 'Fournisseur', type: 'tiers', obligatoire: true },
      { cle: 'reference', libelle: 'Ref. paiement', type: 'texte', obligatoire: false },
    ],
  },
  {
    id: 'TPL-TRE-003',
    code: 'TRE-VIREMENT',
    libelle: 'Virement interne',
    categorie: 'TRESORERIE',
    journalDefaut: 'BQ',
    description: 'Virement entre comptes bancaires internes',
    lignes: [
      { compte: '521', libelle: 'Banque destinataire', sens: 'D', formule: 'montantTTC' },
      { compte: '585', libelle: 'Virements de fonds', sens: 'C', formule: 'montantTTC' },
    ],
    champsVariables: [
      { cle: 'montantTTC', libelle: 'Montant', type: 'montant', obligatoire: true },
      { cle: 'compteDest', libelle: 'Compte banque dest.', type: 'compte', obligatoire: true, defaut: '5211' },
      { cle: 'compteOrig', libelle: 'Compte banque orig.', type: 'compte', obligatoire: true, defaut: '5212' },
    ],
  },
  {
    id: 'TPL-TRE-004',
    code: 'TRE-ESCOMPTE',
    libelle: "Remise a l'escompte",
    categorie: 'TRESORERIE',
    journalDefaut: 'BQ',
    description: "Remise d'effets a l'escompte aupres de la banque",
    lignes: [
      { compte: '521', libelle: 'Banque (net escompte)', sens: 'D', formule: 'netEscompte' },
      { compte: '675', libelle: "Escomptes accordes", sens: 'D', formule: 'fraisEscompte' },
      { compte: '415', libelle: 'Effets a recevoir', sens: 'C', formule: 'montantTTC' },
    ],
    champsVariables: [
      { cle: 'montantTTC', libelle: 'Montant nominal effet', type: 'montant', obligatoire: true },
      { cle: 'fraisEscompte', libelle: "Frais d'escompte", type: 'montant', obligatoire: true },
    ],
  },

  // ---- PAIE (4 templates) ----
  {
    id: 'TPL-PAI-001',
    code: 'PAI-SAL',
    libelle: 'Salaires et traitements',
    categorie: 'PAIE',
    journalDefaut: 'OD',
    description: 'Comptabilisation des salaires bruts',
    lignes: [
      { compte: '661', libelle: 'Remunerations du personnel', sens: 'D', formule: 'salaireBrut' },
      { compte: '431', libelle: 'Securite sociale', sens: 'C', formule: 'cotisationsSalariales' },
      { compte: '4421', libelle: 'Impots sur salaires', sens: 'C', formule: 'impotSalaire' },
      { compte: '421', libelle: 'Personnel - remunerations dues', sens: 'C', formule: 'salaireNet' },
    ],
    champsVariables: [
      { cle: 'salaireBrut', libelle: 'Salaire brut', type: 'montant', obligatoire: true },
      { cle: 'cotisationsSalariales', libelle: 'Cotisations salariales', type: 'montant', obligatoire: true },
      { cle: 'impotSalaire', libelle: 'Impot sur salaire', type: 'montant', obligatoire: true },
    ],
  },
  {
    id: 'TPL-PAI-002',
    code: 'PAI-CHPAT',
    libelle: 'Charges sociales patronales',
    categorie: 'PAIE',
    journalDefaut: 'OD',
    description: 'Comptabilisation des charges patronales',
    lignes: [
      { compte: '664', libelle: 'Charges sociales patronales', sens: 'D', formule: 'chargesPatronales' },
      { compte: '431', libelle: 'Securite sociale (part patronale)', sens: 'C', formule: 'chargesPatronales' },
    ],
    champsVariables: [
      { cle: 'chargesPatronales', libelle: 'Charges patronales', type: 'montant', obligatoire: true },
    ],
  },
  {
    id: 'TPL-PAI-003',
    code: 'PAI-CHSAL',
    libelle: 'Charges sociales salariales',
    categorie: 'PAIE',
    journalDefaut: 'OD',
    description: 'Reglement des charges sociales salariales',
    lignes: [
      { compte: '431', libelle: 'Securite sociale', sens: 'D', formule: 'cotisationsSalariales' },
      { compte: '521', libelle: 'Banque', sens: 'C', formule: 'cotisationsSalariales' },
    ],
    champsVariables: [
      { cle: 'cotisationsSalariales', libelle: 'Cotisations salariales', type: 'montant', obligatoire: true },
    ],
  },
  {
    id: 'TPL-PAI-004',
    code: 'PAI-ACOMPTE',
    libelle: 'Acompte sur salaire',
    categorie: 'PAIE',
    journalDefaut: 'BQ',
    description: 'Versement acompte au personnel',
    lignes: [
      { compte: '421', libelle: 'Personnel - avances et acomptes', sens: 'D', formule: 'montantAcompte' },
      { compte: '521', libelle: 'Banque', sens: 'C', formule: 'montantAcompte' },
    ],
    champsVariables: [
      { cle: 'montantAcompte', libelle: 'Montant acompte', type: 'montant', obligatoire: true },
      { cle: 'tiers', libelle: 'Employe', type: 'tiers', obligatoire: false },
    ],
  },

  // ---- OD (4 templates) ----
  {
    id: 'TPL-OD-001',
    code: 'OD-DOTAMORT',
    libelle: 'Dotation aux amortissements',
    categorie: 'OD',
    journalDefaut: 'OD',
    description: "Constatation de la dotation aux amortissements d'immobilisations",
    lignes: [
      { compte: '681', libelle: 'Dotations aux amortissements', sens: 'D', formule: 'montantDotation' },
      { compte: '28', libelle: 'Amortissements des immobilisations', sens: 'C', formule: 'montantDotation' },
    ],
    champsVariables: [
      { cle: 'montantDotation', libelle: 'Montant dotation', type: 'montant', obligatoire: true },
      { cle: 'compteDotation', libelle: 'Compte dotation (681x)', type: 'compte', obligatoire: false, defaut: '6812' },
      { cle: 'compteAmort', libelle: 'Compte amort. (28x)', type: 'compte', obligatoire: false, defaut: '2813' },
    ],
  },
  {
    id: 'TPL-OD-002',
    code: 'OD-DOTPROV',
    libelle: 'Dotation aux provisions',
    categorie: 'OD',
    journalDefaut: 'OD',
    description: 'Constitution de provision pour risques et charges',
    lignes: [
      { compte: '691', libelle: 'Dotations aux provisions', sens: 'D', formule: 'montantProvision' },
      { compte: '19', libelle: 'Provisions pour risques et charges', sens: 'C', formule: 'montantProvision' },
    ],
    champsVariables: [
      { cle: 'montantProvision', libelle: 'Montant provision', type: 'montant', obligatoire: true },
      { cle: 'compteProv', libelle: 'Compte provision (19x)', type: 'compte', obligatoire: false, defaut: '191' },
    ],
  },
  {
    id: 'TPL-OD-003',
    code: 'OD-REPRPROV',
    libelle: 'Reprise de provision',
    categorie: 'OD',
    journalDefaut: 'OD',
    description: 'Reprise de provision devenue sans objet',
    lignes: [
      { compte: '19', libelle: 'Provisions pour risques et charges', sens: 'D', formule: 'montantReprise' },
      { compte: '791', libelle: 'Reprises de provisions', sens: 'C', formule: 'montantReprise' },
    ],
    champsVariables: [
      { cle: 'montantReprise', libelle: 'Montant reprise', type: 'montant', obligatoire: true },
      { cle: 'compteProv', libelle: 'Compte provision (19x)', type: 'compte', obligatoire: false, defaut: '191' },
    ],
  },
  {
    id: 'TPL-OD-004',
    code: 'OD-REGUL',
    libelle: 'Regularisation CCA/FNP',
    categorie: 'OD',
    journalDefaut: 'OD',
    description: 'Charges constatees d\'avance ou factures non parvenues',
    lignes: [
      { compte: '486', libelle: "Charges constatees d'avance", sens: 'D', formule: 'montantRegul' },
      { compte: '6', libelle: 'Compte de charge concerne', sens: 'C', formule: 'montantRegul' },
    ],
    champsVariables: [
      { cle: 'montantRegul', libelle: 'Montant regularisation', type: 'montant', obligatoire: true },
      { cle: 'typeRegul', libelle: 'Type (CCA/FNP/FAE/PCA)', type: 'texte', obligatoire: true, defaut: 'CCA' },
      { cle: 'compteRegul', libelle: 'Compte regularisation', type: 'compte', obligatoire: true, defaut: '486' },
      { cle: 'compteCharge', libelle: 'Compte charge/produit', type: 'compte', obligatoire: true },
    ],
  },

  // ---- FISCALITE (2 templates) ----
  {
    id: 'TPL-FISC-001',
    code: 'FISC-TVA',
    libelle: 'TVA collectee/deductible',
    categorie: 'FISCALITE',
    journalDefaut: 'OD',
    description: 'Liquidation de la TVA - centralisation mensuelle',
    lignes: [
      { compte: '4431', libelle: 'TVA facturee sur ventes', sens: 'D', formule: 'tvaCollectee' },
      { compte: '4452', libelle: 'TVA recuperable sur achats', sens: 'C', formule: 'tvaDeductible' },
      { compte: '4441', libelle: 'Etat, TVA due', sens: 'C', formule: 'tvaDue' },
    ],
    champsVariables: [
      { cle: 'tvaCollectee', libelle: 'TVA collectee', type: 'montant', obligatoire: true },
      { cle: 'tvaDeductible', libelle: 'TVA deductible', type: 'montant', obligatoire: true },
    ],
  },
  {
    id: 'TPL-FISC-002',
    code: 'FISC-IS',
    libelle: 'Impot sur benefices',
    categorie: 'FISCALITE',
    journalDefaut: 'OD',
    description: "Comptabilisation de l'impot sur les benefices",
    lignes: [
      { compte: '891', libelle: 'Impots sur les benefices', sens: 'D', formule: 'montantIS' },
      { compte: '441', libelle: 'Etat, impot sur benefices', sens: 'C', formule: 'montantIS' },
    ],
    champsVariables: [
      { cle: 'montantIS', libelle: "Montant impot", type: 'montant', obligatoire: true },
    ],
  },
];

// ============================================================================
// TEMPLATE ENGINE
// ============================================================================

/**
 * Apply a template with user-provided values to generate journal entry lines.
 */
export function applyTemplate(
  template: JournalEntryTemplate,
  values: Record<string, string | number>
): TemplateApplicationResult {
  // Validate required fields
  for (const champ of template.champsVariables) {
    if (champ.obligatoire && (values[champ.cle] === undefined || values[champ.cle] === '')) {
      return { success: false, error: `Champ obligatoire manquant : ${champ.libelle}` };
    }
  }

  // Compute derived amounts
  const montantHT = money(Number(values['montantHT'] || 0));
  const tauxTVA = Number(values['tauxTVA'] || 0);
  const tvaAmount = percentage(montantHT, tauxTVA);
  const montantTTC = montantHT.add(tvaAmount);
  const montantTTCDirect = money(Number(values['montantTTC'] || 0));

  // Build lookup for formula resolution
  const formulaLookup: Record<string, Money> = {
    montantHT,
    tva: tvaAmount,
    montantTTC: montantTTCDirect.isZero() ? montantTTC : montantTTCDirect,
    // Paie fields
    salaireBrut: money(Number(values['salaireBrut'] || 0)),
    cotisationsSalariales: money(Number(values['cotisationsSalariales'] || 0)),
    impotSalaire: money(Number(values['impotSalaire'] || 0)),
    salaireNet: money(Number(values['salaireBrut'] || 0))
      .subtract(money(Number(values['cotisationsSalariales'] || 0)))
      .subtract(money(Number(values['impotSalaire'] || 0))),
    chargesPatronales: money(Number(values['chargesPatronales'] || 0)),
    montantAcompte: money(Number(values['montantAcompte'] || 0)),
    // OD fields
    montantDotation: money(Number(values['montantDotation'] || 0)),
    montantProvision: money(Number(values['montantProvision'] || 0)),
    montantReprise: money(Number(values['montantReprise'] || 0)),
    montantRegul: money(Number(values['montantRegul'] || 0)),
    // Fiscalite
    tvaCollectee: money(Number(values['tvaCollectee'] || 0)),
    tvaDeductible: money(Number(values['tvaDeductible'] || 0)),
    tvaDue: money(Number(values['tvaCollectee'] || 0)).subtract(money(Number(values['tvaDeductible'] || 0))),
    montantIS: money(Number(values['montantIS'] || 0)),
    // Escompte
    fraisEscompte: money(Number(values['fraisEscompte'] || 0)),
    netEscompte: (montantTTCDirect.isZero() ? montantTTC : montantTTCDirect)
      .subtract(money(Number(values['fraisEscompte'] || 0))),
  };

  // Generate lines
  const lines = template.lignes.map((ligne) => {
    const amount = ligne.formule ? formulaLookup[ligne.formule] || money(0) : money(0);
    // Override account if user specified one
    let compte = ligne.compte;
    if (ligne.compte === '24' && values['compteImmo']) compte = String(values['compteImmo']);
    if (ligne.compte === '6' && values['compteCharge']) compte = String(values['compteCharge']);
    if (ligne.compte === '486' && values['compteRegul']) compte = String(values['compteRegul']);
    if (ligne.compte === '681' && values['compteDotation']) compte = String(values['compteDotation']);
    if (ligne.compte === '28' && values['compteAmort']) compte = String(values['compteAmort']);
    if (ligne.compte === '19' && values['compteProv']) compte = String(values['compteProv']);

    return {
      accountCode: compte,
      accountName: ligne.libelle,
      label: String(values['libelle'] || template.libelle),
      debit: ligne.sens === 'D' ? amount.round(2).toNumber() : 0,
      credit: ligne.sens === 'C' ? amount.round(2).toNumber() : 0,
    };
  });

  // Verify balance
  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    return {
      success: false,
      error: `Ecriture desequilibree : debit=${totalDebit.toFixed(2)}, credit=${totalCredit.toFixed(2)}`,
    };
  }

  return { success: true, lines };
}

/**
 * Get templates by category.
 */
export function getTemplatesByCategory(categorie: TemplateCategorie): JournalEntryTemplate[] {
  return JOURNAL_TEMPLATES.filter(t => t.categorie === categorie);
}

/**
 * Get a specific template by ID.
 */
export function getTemplateById(id: string): JournalEntryTemplate | undefined {
  return JOURNAL_TEMPLATES.find(t => t.id === id);
}

/**
 * Get all available categories with count.
 */
export function getTemplateCategories(): Array<{ categorie: TemplateCategorie; count: number; label: string }> {
  const labels: Record<TemplateCategorie, string> = {
    ACHATS: 'Achats',
    VENTES: 'Ventes',
    TRESORERIE: 'Tresorerie',
    PAIE: 'Paie',
    OD: 'Operations Diverses',
    FISCALITE: 'Fiscalite',
  };
  const categories: TemplateCategorie[] = ['ACHATS', 'VENTES', 'TRESORERIE', 'PAIE', 'OD', 'FISCALITE'];
  return categories.map(c => ({
    categorie: c,
    count: JOURNAL_TEMPLATES.filter(t => t.categorie === c).length,
    label: labels[c],
  }));
}
