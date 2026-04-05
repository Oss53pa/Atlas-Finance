// @ts-nocheck
/**
 * ImmobilisationsComplet — Composants, crédit-bail, subventions, cessions
 * Réf: SYSCOHADA art. 52, IFRS 16, OHADA
 */
import type { ToolDefinition } from '../ToolRegistry';
import type { DataAdapter } from '@atlas/data';

interface EcritureComptable { compte_debit: string; compte_credit: string; libelle: string; montant: number; }

// ── CRÉDIT-BAIL ──────────────────────────────────────────────

function traiterCreditBail(params: {
  traitement: 'hors_bilan_syscohada' | 'bilan_ifrs16';
  montant_bien: number;
  duree_contrat_mois: number;
  redevance_mensuelle: number;
  taux_interet_implicite: number;
  option_achat: number;
  libelle_bien: string;
}) {
  const { traitement, montant_bien, duree_contrat_mois, redevance_mensuelle, taux_interet_implicite, option_achat, libelle_bien } = params;

  if (traitement === 'hors_bilan_syscohada') {
    // SYSCOHADA art. 52 — Hors bilan
    const redevanceAnnuelle = redevance_mensuelle * 12;
    const totalRedevances = redevance_mensuelle * duree_contrat_mois;
    const ecritures: EcritureComptable[] = [{
      compte_debit: '623',
      compte_credit: '52',
      libelle: `Redevance crédit-bail — ${libelle_bien} (SYSCOHADA art. 52)`,
      montant: redevance_mensuelle,
    }];

    const engagements = {
      moins_1_an: Math.min(12, duree_contrat_mois) * redevance_mensuelle,
      entre_1_5_ans: Math.min(48, Math.max(0, duree_contrat_mois - 12)) * redevance_mensuelle,
      plus_5_ans: Math.max(0, duree_contrat_mois - 60) * redevance_mensuelle,
    };

    return {
      traitement: 'hors_bilan_syscohada',
      reference_legale: 'SYSCOHADA art. 52 — Le crédit-bail est comptabilisé hors bilan chez le preneur',
      redevance_mensuelle,
      redevance_annuelle: redevanceAnnuelle,
      total_redevances: totalRedevances,
      option_achat,
      cout_total: totalRedevances + option_achat,
      ecritures_mensuelles: ecritures,
      engagement_hors_bilan: engagements,
      note_annexe: `Engagements de crédit-bail : <1 an = ${engagements.moins_1_an.toLocaleString('fr-FR')} / 1-5 ans = ${engagements.entre_1_5_ans.toLocaleString('fr-FR')} / >5 ans = ${engagements.plus_5_ans.toLocaleString('fr-FR')} FCFA`,
    };
  }

  // IFRS 16 — Au bilan
  const tauxMensuel = taux_interet_implicite / 12;
  const detteInitiale = tauxMensuel > 0
    ? redevance_mensuelle * (1 - Math.pow(1 + tauxMensuel, -duree_contrat_mois)) / tauxMensuel
    : redevance_mensuelle * duree_contrat_mois;

  const droitUtilisation = detteInitiale;
  const amortMensuelDU = droitUtilisation / duree_contrat_mois;

  const tableau: { mois: number; redevance: number; interet: number; principal: number; solde: number }[] = [];
  let solde = detteInitiale;
  for (let m = 1; m <= duree_contrat_mois; m++) {
    const interet = Math.round(solde * tauxMensuel);
    const principal = redevance_mensuelle - interet;
    solde = Math.max(0, solde - principal);
    tableau.push({ mois: m, redevance: redevance_mensuelle, interet, principal, solde: Math.round(solde) });
  }

  return {
    traitement: 'bilan_ifrs16',
    reference_legale: 'IFRS 16 — Inscription au bilan d\'un droit d\'utilisation et d\'une dette locative',
    droit_utilisation: Math.round(droitUtilisation),
    dette_locative_initiale: Math.round(detteInitiale),
    amortissement_mensuel_du: Math.round(amortMensuelDU),
    taux_interet_implicite,
    tableau_amortissement_dette: tableau.slice(0, 24), // 2 premières années
    ecritures_initiales: [
      { compte_debit: '22', compte_credit: '17', libelle: `Droit d'utilisation — ${libelle_bien} (IFRS 16)`, montant: Math.round(droitUtilisation) },
    ],
    ecritures_mensuelles: [
      { compte_debit: '681', compte_credit: '28', libelle: `Amortissement droit d'utilisation`, montant: Math.round(amortMensuelDU) },
      { compte_debit: '672', compte_credit: '17', libelle: `Intérêts dette locative`, montant: tableau[0]?.interet ?? 0 },
      { compte_debit: '17', compte_credit: '52', libelle: `Remboursement dette locative`, montant: tableau[0]?.principal ?? 0 },
    ],
  };
}

// ── CESSION D'IMMOBILISATION ─────────────────────────────────

function enregistrerCession(params: {
  libelle: string;
  valeur_brute: number;
  amortissements_cumules: number;
  prix_cession: number;
  date_cession: string;
  compte_immobilisation: string;
  compte_amortissement: string;
}) {
  const vnc = params.valeur_brute - params.amortissements_cumules;
  const plusMoinsValue = params.prix_cession - vnc;
  const isGain = plusMoinsValue >= 0;

  const ecritures: EcritureComptable[] = [
    // 1. Sortie de l'amortissement cumulé
    { compte_debit: params.compte_amortissement, compte_credit: params.compte_immobilisation, libelle: `Annulation amortissements — cession ${params.libelle}`, montant: params.amortissements_cumules },
    // 2. Constatation de la cession (prix de vente)
    { compte_debit: '485', compte_credit: isGain ? '82' : params.compte_immobilisation, libelle: `Prix de cession ${params.libelle}`, montant: params.prix_cession },
    // 3. Sortie de la VNC
    { compte_debit: isGain ? '81' : '81', compte_credit: params.compte_immobilisation, libelle: `Sortie VNC ${params.libelle}`, montant: vnc },
  ];

  // Écritures simplifiées SYSCOHADA
  const ecrituresSimplifiees: EcritureComptable[] = [
    { compte_debit: params.compte_amortissement, compte_credit: params.compte_immobilisation, libelle: `Annulation amortissements cumulés`, montant: params.amortissements_cumules },
    { compte_debit: '485', compte_credit: params.compte_immobilisation, libelle: `Créance sur cession (prix: ${params.prix_cession.toLocaleString('fr-FR')})`, montant: vnc },
  ];

  if (isGain) {
    ecrituresSimplifiees.push({ compte_debit: '485', compte_credit: '82', libelle: `Plus-value de cession HAO`, montant: plusMoinsValue });
  } else {
    ecrituresSimplifiees.push({ compte_debit: '81', compte_credit: '485', libelle: `Moins-value de cession HAO`, montant: Math.abs(plusMoinsValue) });
  }

  return {
    libelle: params.libelle,
    date_cession: params.date_cession,
    valeur_brute: params.valeur_brute,
    amortissements_cumules: params.amortissements_cumules,
    vnc,
    prix_cession: params.prix_cession,
    plus_moins_value: plusMoinsValue,
    type: isGain ? 'Plus-value (compte 82)' : 'Moins-value (compte 81)',
    ecritures_cession: ecrituresSimplifiees,
    reference_legale: 'SYSCOHADA — Comptes 81 (charges HAO) et 82 (produits HAO) pour les cessions d\'immobilisations',
    note: `VNC = ${vnc.toLocaleString('fr-FR')} FCFA. ${isGain ? 'Plus' : 'Moins'}-value = ${Math.abs(plusMoinsValue).toLocaleString('fr-FR')} FCFA.`,
  };
}

// ── TOOL DEFINITIONS ─────────────────────────────────────────

export const immobilisationsCompletTools: Record<string, ToolDefinition> = {
  traiter_credit_bail: {
    schema: {
      type: 'function',
      function: {
        name: 'traiter_credit_bail',
        description: 'Traitement du crédit-bail : hors bilan SYSCOHADA (art. 52) ou au bilan IFRS 16. Calcule les écritures, le tableau d\'amortissement de la dette locative et les engagements hors bilan.',
        parameters: {
          type: 'object',
          properties: {
            traitement: { type: 'string', enum: ['hors_bilan_syscohada', 'bilan_ifrs16'] },
            montant_bien: { type: 'number' },
            duree_contrat_mois: { type: 'number' },
            redevance_mensuelle: { type: 'number' },
            taux_interet_implicite: { type: 'number', default: 0.06 },
            option_achat: { type: 'number', default: 0 },
            libelle_bien: { type: 'string' },
          },
          required: ['traitement', 'montant_bien', 'duree_contrat_mois', 'redevance_mensuelle', 'libelle_bien'],
        },
      },
    },
    execute: async (args, _adapter) => JSON.stringify(traiterCreditBail(args as any)),
  },

  enregistrer_cession_immo: {
    schema: {
      type: 'function',
      function: {
        name: 'enregistrer_cession_immo',
        description: 'Enregistre la cession d\'une immobilisation : calcule la VNC, la plus/moins-value et génère les écritures SYSCOHADA (comptes 81/82 HAO).',
        parameters: {
          type: 'object',
          properties: {
            libelle: { type: 'string' },
            valeur_brute: { type: 'number' },
            amortissements_cumules: { type: 'number' },
            prix_cession: { type: 'number' },
            date_cession: { type: 'string' },
            compte_immobilisation: { type: 'string', default: '24' },
            compte_amortissement: { type: 'string', default: '284' },
          },
          required: ['libelle', 'valeur_brute', 'amortissements_cumules', 'prix_cession', 'date_cession'],
        },
      },
    },
    execute: async (args, adapter) => {
      const data = args as any;

      // Lire l'immobilisation réelle depuis la base si ID fourni
      if (adapter && data.immobilisation_id && (!data.valeur_brute || data.valeur_brute === 0)) {
        try {
          const immo = await adapter.getById('assets', data.immobilisation_id) as any;
          if (immo) {
            data.libelle = data.libelle || immo.name || immo.libelle;
            data.valeur_brute = data.valeur_brute || immo.acquisitionValue || immo.valeur_brute || 0;
            data.amortissements_cumules = data.amortissements_cumules || immo.accumulatedDepreciation || immo.amortissements_cumules || 0;
            data.compte_immobilisation = data.compte_immobilisation || immo.accountCode || '24';
            data.compte_amortissement = data.compte_amortissement || immo.depreciationAccountCode || '284';
          }
        } catch (_) { /* fallback aux paramètres */ }
      }

      return JSON.stringify(enregistrerCession(data));
    },
  },
};
