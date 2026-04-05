// @ts-nocheck
/**
 * ScoreCreditClient — Scoring crédit client IA (modèle logistique offline)
 */
import type { ToolDefinition } from '../ToolRegistry';
import type { DataAdapter } from '@atlas/data';

interface DonneesClient {
  client_id: string;
  nom: string;
  delai_moyen_paiement: number;
  taux_impaye: number;
  anciennete_mois: number;
  volume_ca_annuel: number;
  nb_incidents_12m: number;
  encours_actuel: number;
  historique_scores?: { date: string; score: number }[];
}

function sigmoid(x: number): number { return 1 / (1 + Math.exp(-x)); }

function scorerClient(data: DonneesClient) {
  // Coefficients du modèle logistique (calibrés pour contexte africain)
  const W = { delai: -0.03, impaye: -4.0, anciennete: 0.008, volume: 0.000001, incidents: -0.8, ratio_encours: -2.5, intercept: 3.5 };

  const ratioEncours = data.volume_ca_annuel > 0 ? data.encours_actuel / data.volume_ca_annuel : 1;
  const z = W.intercept + W.delai * data.delai_moyen_paiement + W.impaye * data.taux_impaye + W.anciennete * data.anciennete_mois + W.volume * Math.min(data.volume_ca_annuel, 1e9) + W.incidents * data.nb_incidents_12m + W.ratio_encours * ratioEncours;

  const prob = sigmoid(z);
  const score = Math.round(prob * 100);

  const classe = score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D';
  const classeLabel = classe === 'A' ? 'Excellent' : classe === 'B' ? 'Bon' : classe === 'C' ? 'À surveiller' : 'Critique';

  const probaImpaye30j = Math.round((1 - prob) * 100 * 10) / 10;

  // Limite crédit recommandée
  const facteurClasse = { A: 0.25, B: 0.15, C: 0.08, D: 0.03 };
  const limiteCredit = Math.round(data.volume_ca_annuel * (facteurClasse[classe] ?? 0.05));

  const delaiRecommande = classe === 'A' ? 60 : classe === 'B' ? 45 : classe === 'C' ? 30 : 0;

  const facteursPositifs: string[] = [];
  const facteursNegatifs: string[] = [];

  if (data.delai_moyen_paiement <= 30) facteursPositifs.push(`Délai de paiement court (${data.delai_moyen_paiement}j)`);
  else if (data.delai_moyen_paiement > 60) facteursNegatifs.push(`Délai de paiement long (${data.delai_moyen_paiement}j)`);

  if (data.taux_impaye <= 0.02) facteursPositifs.push(`Taux d'impayé faible (${(data.taux_impaye * 100).toFixed(1)}%)`);
  else if (data.taux_impaye > 0.1) facteursNegatifs.push(`Taux d'impayé élevé (${(data.taux_impaye * 100).toFixed(1)}%)`);

  if (data.anciennete_mois > 36) facteursPositifs.push(`Client fidèle (${Math.floor(data.anciennete_mois / 12)} ans)`);
  else if (data.anciennete_mois < 6) facteursNegatifs.push(`Client récent (${data.anciennete_mois} mois)`);

  if (data.nb_incidents_12m === 0) facteursPositifs.push('Aucun incident sur 12 mois');
  else facteursNegatifs.push(`${data.nb_incidents_12m} incident(s) sur 12 mois`);

  if (data.volume_ca_annuel > 50000000) facteursPositifs.push(`Volume CA important (${(data.volume_ca_annuel / 1000000).toFixed(0)}M FCFA)`);

  if (ratioEncours > 0.3) facteursNegatifs.push(`Encours élevé vs CA (${(ratioEncours * 100).toFixed(0)}%)`);

  return {
    client_id: data.client_id,
    nom: data.nom,
    score,
    classe_risque: classe,
    classe_label: classeLabel,
    probabilite_impaye_30j: probaImpaye30j,
    limite_credit_recommandee: limiteCredit,
    delai_paiement_recommande: delaiRecommande,
    facteurs_positifs: facteursPositifs,
    facteurs_negatifs: facteursNegatifs,
    historique_score: data.historique_scores || [],
    recommandation: classe === 'A' ? 'Conditions préférentielles possibles (escompte, délai étendu).' : classe === 'B' ? 'Conditions standard. Surveiller l\'évolution du score.' : classe === 'C' ? 'Réduire la limite de crédit. Exiger un acompte de 30% minimum.' : 'BLOQUER les ventes à crédit. Exiger paiement comptant uniquement. Initier procédure de recouvrement si encours existant.',
  };
}

export const scoreCreditTools: Record<string, ToolDefinition> = {
  scorer_credit_client: {
    schema: {
      type: 'function',
      function: {
        name: 'scorer_credit_client',
        description: 'Calcule un score de crédit client (0-100) avec classe de risque A/B/C/D, probabilité d\'impayé, limite de crédit recommandée et facteurs d\'analyse.',
        parameters: {
          type: 'object',
          properties: {
            client_id: { type: 'string' },
            nom: { type: 'string' },
            delai_moyen_paiement: { type: 'number', description: 'Délai moyen de paiement en jours' },
            taux_impaye: { type: 'number', description: 'Taux d\'impayé (0-1)' },
            anciennete_mois: { type: 'number' },
            volume_ca_annuel: { type: 'number', description: 'CA annuel en FCFA' },
            nb_incidents_12m: { type: 'number' },
            encours_actuel: { type: 'number', description: 'Encours actuel en FCFA' },
          },
          required: ['client_id', 'delai_moyen_paiement', 'taux_impaye', 'anciennete_mois', 'volume_ca_annuel', 'nb_incidents_12m', 'encours_actuel'],
        },
      },
    },
    execute: async (args, adapter) => {
      const data = args as any;

      // Enrichir depuis les données réelles si adapter disponible et client_id fourni
      if (adapter && data.client_id) {
        try {
          // Lire les écritures du compte client pour calculer les métriques
          const entries = await adapter.getJournalEntries({ limit: 5000 });
          const clientEntries = entries.flatMap((e: any) =>
            (e.lines || []).filter((l: any) => l.accountCode?.startsWith('41') && l.thirdPartyId === data.client_id)
          );

          if (clientEntries.length > 0) {
            const totalDebit = clientEntries.reduce((a: number, l: any) => a + (l.debit || 0), 0);
            const totalCredit = clientEntries.reduce((a: number, l: any) => a + (l.credit || 0), 0);
            const encours = totalDebit - totalCredit;

            if (!data.encours_actuel && encours > 0) data.encours_actuel = encours;
            if (!data.volume_ca_annuel && totalDebit > 0) data.volume_ca_annuel = totalDebit;
          }
        } catch (_) { /* fallback to provided data */ }
      }

      return JSON.stringify(scorerClient(data as DonneesClient));
    },
  },
};
