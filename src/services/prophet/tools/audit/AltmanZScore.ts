// @ts-nocheck
/**
 * AltmanZScore — Prédiction de défaillance (Z''-score marchés émergents)
 * Réf: Altman E.I. (1968, 2005), OHADA art. 547
 */
import type { ToolDefinition } from '../ToolRegistry';
import type { DataAdapter } from '@atlas/data';

interface DonneesFinancieres {
  bfr: number;
  total_actif: number;
  resultats_non_distribues: number;
  ebit: number;
  capitaux_propres: number;
  total_dettes: number;
  historique?: { annee: string; bfr: number; total_actif: number; resultats_non_distribues: number; ebit: number; capitaux_propres: number; total_dettes: number }[];
}

interface ResultatAltman {
  z_score: number;
  interpretation: 'zone_sure' | 'zone_grise' | 'zone_danger';
  seuils: { sure: number; grise_basse: number };
  composantes: { X1: number; X2: number; X3: number; X4: number; X1_pondere: number; X2_pondere: number; X3_pondere: number; X4_pondere: number };
  recommandations: string[];
  evolution_3ans: { annee: string; z_score: number; interpretation: string }[];
  reference_legale: string;
}

function calculerZScore(data: DonneesFinancieres): ResultatAltman {
  const ta = data.total_actif || 1;
  const td = data.total_dettes || 1;

  const X1 = data.bfr / ta;
  const X2 = data.resultats_non_distribues / ta;
  const X3 = data.ebit / ta;
  const X4 = data.capitaux_propres / td;

  const z = 6.56 * X1 + 3.26 * X2 + 6.72 * X3 + 1.05 * X4;
  const zRound = Math.round(z * 100) / 100;

  const interpretation: 'zone_sure' | 'zone_grise' | 'zone_danger' =
    zRound > 2.6 ? 'zone_sure' : zRound >= 1.1 ? 'zone_grise' : 'zone_danger';

  const recommandations: string[] = [];
  if (interpretation === 'zone_danger') {
    recommandations.push('ALERTE CRITIQUE : Risque élevé de défaillance dans les 24 mois');
    recommandations.push('Convoquer une assemblée générale extraordinaire (OHADA art. 547)');
    recommandations.push('Établir un plan de redressement avec renforcement des fonds propres');
    if (X1 < 0) recommandations.push('BFR négatif : restructurer le cycle d\'exploitation (renégocier délais fournisseurs, accélérer recouvrement clients)');
    if (X3 < 0.05) recommandations.push('Rentabilité opérationnelle insuffisante : réduire les charges fixes et optimiser la marge');
    if (X4 < 0.5) recommandations.push('Sous-capitalisation : envisager augmentation de capital ou conversion de dettes en capital');
  } else if (interpretation === 'zone_grise') {
    recommandations.push('Zone d\'incertitude : surveillance renforcée recommandée');
    recommandations.push('Mettre en place un tableau de bord de suivi mensuel');
    if (X1 < 0.1) recommandations.push('Améliorer le BFR : réduire les délais de recouvrement');
    if (X4 < 1) recommandations.push('Renforcer les capitaux propres pour améliorer la structure financière');
  } else {
    recommandations.push('Situation financière saine — poursuivre la surveillance périodique');
    recommandations.push('Maintenir le ratio d\'autonomie financière et la rentabilité');
  }

  // Historique 3 ans
  const evolution: { annee: string; z_score: number; interpretation: string }[] = [];
  if (data.historique) {
    for (const h of data.historique) {
      const hta = h.total_actif || 1;
      const htd = h.total_dettes || 1;
      const hz = 6.56 * (h.bfr / hta) + 3.26 * (h.resultats_non_distribues / hta) + 6.72 * (h.ebit / hta) + 1.05 * (h.capitaux_propres / htd);
      evolution.push({
        annee: h.annee,
        z_score: Math.round(hz * 100) / 100,
        interpretation: hz > 2.6 ? 'Zone sûre' : hz >= 1.1 ? 'Zone grise' : 'Zone danger',
      });
    }
  }
  evolution.push({ annee: 'Courant', z_score: zRound, interpretation: interpretation === 'zone_sure' ? 'Zone sûre' : interpretation === 'zone_grise' ? 'Zone grise' : 'Zone danger' });

  return {
    z_score: zRound,
    interpretation,
    seuils: { sure: 2.6, grise_basse: 1.1 },
    composantes: {
      X1: Math.round(X1 * 10000) / 10000,
      X2: Math.round(X2 * 10000) / 10000,
      X3: Math.round(X3 * 10000) / 10000,
      X4: Math.round(X4 * 10000) / 10000,
      X1_pondere: Math.round(6.56 * X1 * 100) / 100,
      X2_pondere: Math.round(3.26 * X2 * 100) / 100,
      X3_pondere: Math.round(6.72 * X3 * 100) / 100,
      X4_pondere: Math.round(1.05 * X4 * 100) / 100,
    },
    recommandations,
    evolution_3ans: evolution,
    reference_legale: 'Modèle Altman Z\'\'-score (marchés émergents) — Z\'\' = 6.56×X1 + 3.26×X2 + 6.72×X3 + 1.05×X4. Réf: OHADA art. 547 (continuité d\'exploitation)',
  };
}

export const altmanTools: Record<string, ToolDefinition> = {
  calculer_altman_zscore: {
    schema: {
      type: 'function',
      function: {
        name: 'calculer_altman_zscore',
        description: 'Calcule le Z\'\'-score d\'Altman adapté marchés émergents pour prédire le risque de défaillance. Zones: >2.6 sûre, 1.1-2.6 grise, <1.1 danger.',
        parameters: {
          type: 'object',
          properties: {
            bfr: { type: 'number', description: 'Besoin en Fonds de Roulement' },
            total_actif: { type: 'number' },
            resultats_non_distribues: { type: 'number', description: 'Réserves + Report à nouveau' },
            ebit: { type: 'number', description: 'Résultat d\'exploitation' },
            capitaux_propres: { type: 'number' },
            total_dettes: { type: 'number' },
            historique: { type: 'array', items: { type: 'object' }, description: 'Données des exercices précédents' },
          },
          required: ['bfr', 'total_actif', 'resultats_non_distribues', 'ebit', 'capitaux_propres', 'total_dettes'],
        },
      },
    },
    execute: async (args, adapter) => {
      let data = args as any;

      // Si pas de données fournies, les calculer depuis la balance réelle
      if ((!data.total_actif || data.total_actif === 0) && adapter) {
        const rows = await adapter.getTrialBalance();
        const solde = (prefixes: string[]) => rows.filter((r: any) => prefixes.some(p => r.accountCode?.startsWith(p))).reduce((a: number, r: any) => a + Math.abs((r.totalDebit || 0) - (r.totalCredit || 0)), 0);

        const actifCirculant = solde(['3', '4']) - solde(['40']); // stocks + créances - fournisseurs
        const passifCirculant = solde(['40', '42', '43', '44']);
        const totalActif = solde(['2', '3', '4', '5']);
        const totalDettes = solde(['16', '17', '18', '40', '42', '43', '44', '45']);
        const capitauxPropres = solde(['10', '11', '12', '13']);
        const reserves = solde(['11', '12']);
        const resultatExpl = solde(['70', '71', '72', '73', '74', '75']) - solde(['60', '61', '62', '63', '64', '65']);

        data = {
          ...data,
          bfr: actifCirculant - passifCirculant,
          total_actif: totalActif || data.total_actif,
          resultats_non_distribues: reserves || data.resultats_non_distribues,
          ebit: resultatExpl || data.ebit,
          capitaux_propres: capitauxPropres || data.capitaux_propres,
          total_dettes: totalDettes || data.total_dettes,
        };
      }

      return JSON.stringify(calculerZScore(data as DonneesFinancieres));
    },
  },
};
