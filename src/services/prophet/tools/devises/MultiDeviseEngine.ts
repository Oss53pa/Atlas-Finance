// @ts-nocheck

/**
 * MultiDeviseEngine — Multi-devises & taux de change SYSCOHADA
 * Réf. légales : SYSCOHADA art. 37, Accords monétaires UEMOA/CEMAC
 */
import type { ToolDefinition } from '../ToolRegistry';
import type { DataAdapter } from '@atlas/data';

// ── TYPES ────────────────────────────────────────────────────

export type CodeDevise = 'XOF' | 'XAF' | 'EUR' | 'USD' | 'GBP' | 'GNF' | 'KMF' | 'CDF';

interface TauxChange { achat: number; vente: number; moyen: number; source: string; }

export interface PosteDevise {
  compte: string;
  libelle: string;
  devise: CodeDevise;
  montant_devise: number;
  cours_historique: number;
  montant_comptable: number;
  nature: 'creance' | 'dette' | 'tresorerie';
}

export interface PosteReevalue {
  compte: string;
  libelle: string;
  devise: CodeDevise;
  montant_devise: number;
  cours_historique: number;
  cours_cloture: number;
  montant_ancien: number;
  montant_nouveau: number;
  difference: number;
  sens: 'gain' | 'perte' | 'neutre';
}

export interface EcritureComptable {
  compte_debit: string;
  compte_credit: string;
  libelle: string;
  montant: number;
  reference?: string;
}

// ── TAUX DE CHANGE STATIQUES ─────────────────────────────────

const PARITE_FIXE_EUR = 655.957; // 1 EUR = 655.957 XOF = 655.957 XAF

// Taux croisés par rapport à l'EUR (taux indicatifs, mise à jour manuelle)
const TAUX_BASE_EUR: Record<CodeDevise, { achat: number; vente: number }> = {
  EUR: { achat: 1, vente: 1 },
  XOF: { achat: PARITE_FIXE_EUR, vente: PARITE_FIXE_EUR },
  XAF: { achat: PARITE_FIXE_EUR, vente: PARITE_FIXE_EUR },
  USD: { achat: 0.92, vente: 0.94 },        // indicatif
  GBP: { achat: 0.785, vente: 0.80 },       // indicatif
  GNF: { achat: 9200, vente: 9400 },        // franc guinéen flottant
  KMF: { achat: 491.968, vente: 491.968 },  // franc comorien, parité fixe
  CDF: { achat: 2750, vente: 2850 },        // franc congolais flottant
};

function getTaux(source: CodeDevise, cible: CodeDevise, type: 'achat' | 'vente' | 'moyen'): number {
  if (source === cible) return 1;
  const sourceEnEUR = type === 'achat' ? TAUX_BASE_EUR[source].achat : type === 'vente' ? TAUX_BASE_EUR[source].vente : (TAUX_BASE_EUR[source].achat + TAUX_BASE_EUR[source].vente) / 2;
  const cibleEnEUR = type === 'achat' ? TAUX_BASE_EUR[cible].achat : type === 'vente' ? TAUX_BASE_EUR[cible].vente : (TAUX_BASE_EUR[cible].achat + TAUX_BASE_EUR[cible].vente) / 2;
  return cibleEnEUR / sourceEnEUR;
}

// ── FONCTIONS ────────────────────────────────────────────────

function convertirDevise(montant: number, source: CodeDevise, cible: CodeDevise, type_taux: 'achat' | 'vente' | 'moyen', date?: string) {
  const taux = getTaux(source, cible, type_taux);
  const resultat = Math.round(montant * taux * 100) / 100;
  return {
    montant_source: montant,
    devise_source: source,
    montant_converti: resultat,
    devise_cible: cible,
    taux_applique: Math.round(taux * 1000000) / 1000000,
    type_taux,
    date: date || new Date().toISOString().split('T')[0],
    source_taux: (source === 'XOF' || source === 'XAF' || cible === 'XOF' || cible === 'XAF') ? 'Parité fixe BCEAO/BEAC' : 'Taux indicatif (mise à jour requise)',
    reference_legale: 'SYSCOHADA art. 37 — Opérations en devises étrangères',
  };
}

function reevaluerPostesBilan(postes: PosteDevise[], cours_cloture: Record<CodeDevise, number>, exercice: string) {
  const postesReevalues: PosteReevalue[] = [];
  const ecritures: EcritureComptable[] = [];
  let gain_total = 0;
  let perte_total = 0;

  for (const poste of postes) {
    const coursCloture = cours_cloture[poste.devise];
    if (!coursCloture) continue;

    const montantNouveau = Math.round(poste.montant_devise * coursCloture * 100) / 100;
    const difference = montantNouveau - poste.montant_comptable;

    const sens: 'gain' | 'perte' | 'neutre' =
      difference > 0.01 ? (poste.nature === 'creance' || poste.nature === 'tresorerie' ? 'gain' : 'perte') :
      difference < -0.01 ? (poste.nature === 'creance' || poste.nature === 'tresorerie' ? 'perte' : 'gain') :
      'neutre';

    postesReevalues.push({
      compte: poste.compte,
      libelle: poste.libelle,
      devise: poste.devise,
      montant_devise: poste.montant_devise,
      cours_historique: poste.cours_historique,
      cours_cloture: coursCloture,
      montant_ancien: poste.montant_comptable,
      montant_nouveau: montantNouveau,
      difference: Math.round(difference * 100) / 100,
      sens,
    });

    if (Math.abs(difference) > 0.01) {
      if (sens === 'gain') {
        gain_total += Math.abs(difference);
        // Gain latent → écart de conversion passif (4786) + provision (pas de gain direct à la clôture)
        ecritures.push({
          compte_debit: poste.compte,
          compte_credit: '4786',
          libelle: `Réévaluation ${poste.libelle} — gain latent ${poste.devise} (SYSCOHADA art. 37)`,
          montant: Math.abs(Math.round(difference * 100) / 100),
          reference: `REEVAL-${exercice}`,
        });
      } else if (sens === 'perte') {
        perte_total += Math.abs(difference);
        // Perte latente → écart de conversion actif (4784) + provision pour risque de change
        ecritures.push({
          compte_debit: '4784',
          compte_credit: poste.compte,
          libelle: `Réévaluation ${poste.libelle} — perte latente ${poste.devise} (SYSCOHADA art. 37)`,
          montant: Math.abs(Math.round(difference * 100) / 100),
          reference: `REEVAL-${exercice}`,
        });
        // Constitution provision pour risque de change
        ecritures.push({
          compte_debit: '6971',
          compte_credit: '1971',
          libelle: `Provision pour risque de change — ${poste.libelle}`,
          montant: Math.abs(Math.round(difference * 100) / 100),
          reference: `PROV-CHANGE-${exercice}`,
        });
      }
    }
  }

  return {
    exercice,
    postes_reevalues: postesReevalues,
    ecritures_ajustement: ecritures,
    gain_change_latent: Math.round(gain_total * 100) / 100,
    perte_change_latent: Math.round(perte_total * 100) / 100,
    impact_net: Math.round((gain_total - perte_total) * 100) / 100,
    nb_postes_ajustes: postesReevalues.filter(p => p.sens !== 'neutre').length,
    reference_legale: 'SYSCOHADA art. 37 — Réévaluation des éléments monétaires en devises au cours de clôture',
    note: `Gains latents → compte 4786 (écart de conversion passif). Pertes latentes → compte 4784 (écart de conversion actif) + provision 1971. Les gains ne sont pas comptabilisés en produits à la clôture (principe de prudence SYSCOHADA).`,
  };
}

function ecartConversionConsolidation(
  entites: { nom: string; devise: CodeDevise; capitaux_propres: number; resultat: number; total_bilan: number }[],
  cours_cloture: Record<CodeDevise, number>,
  cours_moyen: Record<CodeDevise, number>,
  cours_historique_cp: Record<CodeDevise, number>,
  devise_consolidation: CodeDevise
) {
  const ecarts: { entite: string; ecart_bilan: number; ecart_resultat: number; ecart_cp: number; total: number }[] = [];
  let totalEcart = 0;

  for (const e of entites) {
    if (e.devise === devise_consolidation) continue;

    const ccl = cours_cloture[e.devise] ?? 1;
    const cmoy = cours_moyen[e.devise] ?? ccl;
    const chist = cours_historique_cp[e.devise] ?? ccl;

    // Bilan converti au cours de clôture
    const bilanConverti = e.total_bilan / ccl;
    // Résultat converti au cours moyen
    const resultatConverti = e.resultat / cmoy;
    // CP convertis au cours historique
    const cpConverti = e.capitaux_propres / chist;

    // Écart = différence entre bilan (cours clôture) et CP+résultat (cours historique/moyen)
    const ecartBilan = bilanConverti - (cpConverti + resultatConverti);

    ecarts.push({
      entite: e.nom,
      ecart_bilan: Math.round(bilanConverti * 100) / 100,
      ecart_resultat: Math.round(resultatConverti * 100) / 100,
      ecart_cp: Math.round(cpConverti * 100) / 100,
      total: Math.round(ecartBilan * 100) / 100,
    });
    totalEcart += ecartBilan;
  }

  return {
    ecarts_par_entite: ecarts,
    ecart_total_consolidation: Math.round(totalEcart * 100) / 100,
    devise_consolidation,
    comptabilisation: 'L\'écart de conversion est porté en capitaux propres consolidés (réserves de conversion), sans impact sur le résultat consolidé.',
    reference_legale: 'AUDCIF art. 92 — Conversion des comptes des entités étrangères',
  };
}

// ── TOOL DEFINITIONS ─────────────────────────────────────────

export const devisesTools: Record<string, ToolDefinition> = {
  convertir_devise: {
    schema: {
      type: 'function',
      function: {
        name: 'convertir_devise',
        description: 'Convertit un montant entre devises OHADA (XOF, XAF, EUR, USD, GBP, GNF, KMF, CDF). Utilise les parités fixes BCEAO/BEAC pour XOF/XAF. Réf: SYSCOHADA art. 37.',
        parameters: {
          type: 'object',
          properties: {
            montant: { type: 'number' },
            devise_source: { type: 'string', enum: ['XOF', 'XAF', 'EUR', 'USD', 'GBP', 'GNF', 'KMF', 'CDF'] },
            devise_cible: { type: 'string', enum: ['XOF', 'XAF', 'EUR', 'USD', 'GBP', 'GNF', 'KMF', 'CDF'] },
            type_taux: { type: 'string', enum: ['achat', 'vente', 'moyen'], default: 'moyen' },
            date: { type: 'string', description: 'Date du taux (YYYY-MM-DD)' },
          },
          required: ['montant', 'devise_source', 'devise_cible'],
        },
      },
    },
    execute: async (args, _adapter) => {
      const { montant, devise_source, devise_cible, type_taux, date } = args as Record<string, unknown>;
      return JSON.stringify(convertirDevise(montant, devise_source, devise_cible, type_taux || 'moyen', date));
    },
  },

  reevaluer_postes_bilan: {
    schema: {
      type: 'function',
      function: {
        name: 'reevaluer_postes_bilan',
        description: 'Réévalue les postes du bilan en devises au cours de clôture (SYSCOHADA art. 37). Génère les écritures d\'ajustement : gains → 4786, pertes → 4784 + provision 1971. Lit les postes en devises depuis la base si non fournis.',
        parameters: {
          type: 'object',
          properties: {
            exercice: { type: 'string' },
            postes: { type: 'array', items: { type: 'object' }, description: 'Postes en devises [{compte, libelle, devise, montant_devise, cours_historique, montant_comptable, nature}]' },
            cours_cloture: { type: 'object', description: 'Cours de clôture par devise {EUR: 655.957, USD: 600, ...}' },
          },
          required: ['exercice', 'cours_cloture'],
        },
      },
    },
    execute: async (args, adapter) => {
      let { exercice, postes, cours_cloture } = args as Record<string, unknown>;

      // Lire les postes en devises depuis la balance réelle (comptes 4784, 4786, créances/dettes en devises)
      if ((!postes || postes.length === 0) && adapter) {
        try {
          const rows = await adapter.getTrialBalance({ start: `${exercice}-01-01`, end: `${exercice}-12-31` });
          // Identifier les postes potentiellement en devises : comptes 41X (créances), 40X (dettes), 52X (banques)
          postes = rows
            .filter((r: any) => {
              const code = r.accountCode || '';
              return (code.startsWith('41') || code.startsWith('40') || code.startsWith('52')) && Math.abs((r.totalDebit || 0) - (r.totalCredit || 0)) > 0;
            })
            .map((r: any) => ({
              compte: r.accountCode,
              libelle: r.accountName,
              devise: 'EUR',
              montant_devise: Math.abs((r.totalDebit || 0) - (r.totalCredit || 0)) / (cours_cloture['EUR'] || 655.957),
              cours_historique: cours_cloture['EUR'] || 655.957,
              montant_comptable: Math.abs((r.totalDebit || 0) - (r.totalCredit || 0)),
              nature: r.accountCode?.startsWith('41') ? 'creance' : r.accountCode?.startsWith('40') ? 'dette' : 'tresorerie',
            }));
        } catch (_) { /* fallback */ }
      }

      return JSON.stringify(reevaluerPostesBilan(postes || [], cours_cloture, exercice));
    },
  },

  ecart_conversion_consolidation: {
    schema: {
      type: 'function',
      function: {
        name: 'ecart_conversion_consolidation',
        description: 'Calcule les écarts de conversion pour la consolidation multi-devises. Les écarts sont portés en capitaux propres consolidés (AUDCIF art. 92).',
        parameters: {
          type: 'object',
          properties: {
            entites: { type: 'array', items: { type: 'object' } },
            cours_cloture: { type: 'object' },
            cours_moyen: { type: 'object' },
            cours_historique_cp: { type: 'object' },
            devise_consolidation: { type: 'string', enum: ['XOF', 'XAF', 'EUR', 'USD'] },
          },
          required: ['entites', 'cours_cloture', 'devise_consolidation'],
        },
      },
    },
    execute: async (args, _adapter) => {
      const { entites, cours_cloture, cours_moyen, cours_historique_cp, devise_consolidation } = args as Record<string, unknown>;
      return JSON.stringify(ecartConversionConsolidation(entites, cours_cloture, cours_moyen || cours_cloture, cours_historique_cp || cours_cloture, devise_consolidation));
    },
  },
};
