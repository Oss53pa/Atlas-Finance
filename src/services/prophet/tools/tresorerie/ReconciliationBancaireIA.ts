
/**
 * ReconciliationBancaireIA — Rapprochement bancaire automatique IA (3 passes)
 */
import type { ToolDefinition } from '../ToolRegistry';
import type { DataAdapter } from '@atlas/data';

interface LigneBanque { id: string; date: string; libelle: string; montant: number; reference?: string; }
interface LigneGL { id: string; date: string; libelle: string; montant: number; compte: string; piece?: string; }
interface Match { banque_id: string; gl_ids: string[]; confiance: number; methode: 'exact' | 'fuzzy' | 'multi'; montant: number; }
interface EcritureAjustement { compte_debit: string; compte_credit: string; libelle: string; montant: number; }

interface ConfigMatching {
  tolerance_montant: number;
  fenetre_dates: number;
  seuil_confiance: number;
}

// Levenshtein inline
function levenshtein(a: string, b: string): number {
  const la = a.length, lb = b.length;
  if (la === 0) return lb;
  if (lb === 0) return la;
  const d: number[][] = Array.from({ length: la + 1 }, (_, i) => {
    const row = new Array(lb + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 1; j <= lb; j++) d[0][j] = j;
  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
    }
  }
  return d[la][lb];
}

function similarite(a: string, b: string): number {
  const al = a.toLowerCase().replace(/[^a-z0-9]/g, '');
  const bl = b.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (al.length === 0 && bl.length === 0) return 1;
  const maxLen = Math.max(al.length, bl.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(al, bl) / maxLen;
}

function diffJours(d1: string, d2: string): number {
  return Math.abs((new Date(d1).getTime() - new Date(d2).getTime()) / 86400000);
}

function reconcilier(banque: LigneBanque[], gl: LigneGL[], config: ConfigMatching) {
  const matches: Match[] = [];
  const matchedBanque = new Set<string>();
  const matchedGL = new Set<string>();

  // PASSE 1 — Exact match
  for (const lb of banque) {
    if (matchedBanque.has(lb.id)) continue;
    for (const lg of gl) {
      if (matchedGL.has(lg.id)) continue;
      if (Math.abs(lb.montant - lg.montant) <= config.tolerance_montant && lb.date === lg.date) {
        matches.push({ banque_id: lb.id, gl_ids: [lg.id], confiance: 1.0, methode: 'exact', montant: lb.montant });
        matchedBanque.add(lb.id);
        matchedGL.add(lg.id);
        break;
      }
    }
  }

  // PASSE 2 — Fuzzy match
  for (const lb of banque) {
    if (matchedBanque.has(lb.id)) continue;
    let bestScore = 0;
    let bestGL: LigneGL | null = null;

    for (const lg of gl) {
      if (matchedGL.has(lg.id)) continue;
      const diffMontant = Math.abs(lb.montant - lg.montant);
      if (diffMontant > Math.abs(lb.montant) * 0.05) continue; // tolérance 5%

      const dj = diffJours(lb.date, lg.date);
      if (dj > config.fenetre_dates) continue;

      const scoreMontant = 1 - diffMontant / (Math.abs(lb.montant) || 1);
      const scoreDate = 1 - dj / config.fenetre_dates;
      const scoreLibelle = similarite(lb.libelle, lg.libelle);
      const score = 0.6 * scoreMontant + 0.25 * scoreDate + 0.15 * scoreLibelle;

      if (score > bestScore) {
        bestScore = score;
        bestGL = lg;
      }
    }

    if (bestGL && bestScore >= config.seuil_confiance) {
      matches.push({ banque_id: lb.id, gl_ids: [bestGL.id], confiance: Math.round(bestScore * 100) / 100, methode: 'fuzzy', montant: lb.montant });
      matchedBanque.add(lb.id);
      matchedGL.add(bestGL.id);
    }
  }

  // PASSE 3 — Multi-match (1 banque = N GL)
  for (const lb of banque) {
    if (matchedBanque.has(lb.id)) continue;
    const candidats = gl.filter(lg => !matchedGL.has(lg.id) && diffJours(lb.date, lg.date) <= config.fenetre_dates && Math.sign(lg.montant) === Math.sign(lb.montant));
    if (candidats.length < 2) continue;

    // Essayer toutes les combinaisons (jusqu'à 5 lignes)
    const maxCombo = Math.min(candidats.length, 5);
    for (let size = 2; size <= maxCombo; size++) {
      const found = findCombination(candidats, lb.montant, size, config.tolerance_montant);
      if (found) {
        const ids = found.map(f => f.id);
        matches.push({ banque_id: lb.id, gl_ids: ids, confiance: 0.85, methode: 'multi', montant: lb.montant });
        matchedBanque.add(lb.id);
        ids.forEach(id => matchedGL.add(id));
        break;
      }
    }
  }

  const nonMatcheesBanque = banque.filter(l => !matchedBanque.has(l.id));
  const nonMatcheesGL = gl.filter(l => !matchedGL.has(l.id));
  const tauxReconciliation = banque.length > 0 ? Math.round(matches.length / banque.length * 10000) / 100 : 100;
  const ecartGlobal = nonMatcheesBanque.reduce((a, l) => a + l.montant, 0) - nonMatcheesGL.reduce((a, l) => a + l.montant, 0);

  const suggestions: EcritureAjustement[] = [];
  for (const lb of nonMatcheesBanque) {
    if (lb.montant < 0) {
      suggestions.push({ compte_debit: '627', compte_credit: '52', libelle: `Frais bancaires — ${lb.libelle}`, montant: Math.abs(lb.montant) });
    } else {
      suggestions.push({ compte_debit: '52', compte_credit: '758', libelle: `Produit bancaire à identifier — ${lb.libelle}`, montant: lb.montant });
    }
  }

  return {
    lignes_matchees: matches,
    lignes_non_matchees_banque: nonMatcheesBanque,
    lignes_non_matchees_gl: nonMatcheesGL,
    taux_reconciliation: tauxReconciliation,
    ecart_global: Math.round(ecartGlobal * 100) / 100,
    suggestions_ecritures: suggestions,
    statistiques: { total_banque: banque.length, total_gl: gl.length, matchees: matches.length, exact: matches.filter(m => m.methode === 'exact').length, fuzzy: matches.filter(m => m.methode === 'fuzzy').length, multi: matches.filter(m => m.methode === 'multi').length },
  };
}

function findCombination(items: LigneGL[], target: number, size: number, tolerance: number): LigneGL[] | null {
  if (size === 1) {
    const found = items.find(i => Math.abs(i.montant - target) <= tolerance);
    return found ? [found] : null;
  }
  for (let i = 0; i <= items.length - size; i++) {
    const rest = findCombination(items.slice(i + 1), target - items[i].montant, size - 1, tolerance);
    if (rest) return [items[i], ...rest];
  }
  return null;
}

export const reconciliationTools: Record<string, ToolDefinition> = {
  reconcilier_banque_auto: {
    schema: {
      type: 'function',
      function: {
        name: 'reconcilier_banque_auto',
        description: 'Réconciliation bancaire automatique IA en 3 passes : exact, fuzzy (Levenshtein + scoring), multi-match. Retourne les lignes rapprochées, non rapprochées et suggestions d\'écritures.',
        parameters: {
          type: 'object',
          properties: {
            lignes_banque: { type: 'array', items: { type: 'object' } },
            lignes_gl: { type: 'array', items: { type: 'object' } },
            tolerance_montant: { type: 'number', default: 0.01 },
            fenetre_dates: { type: 'number', default: 3, description: 'Jours de décalage max' },
            seuil_confiance: { type: 'number', default: 0.85 },
          },
          required: ['lignes_banque', 'lignes_gl'],
        },
      },
    },
    execute: async (args, adapter) => {
      let { lignes_banque, lignes_gl, tolerance_montant, fenetre_dates, seuil_confiance } = args as Record<string, any>;

      // Lire les écritures du grand livre (comptes 52X) si non fournies
      if ((!lignes_gl || lignes_gl.length === 0) && adapter) {
        const entries = await adapter.getJournalEntries({ limit: 2000 });
        lignes_gl = entries.flatMap((e: any) => (e.lines || []).filter((l: any) => l.accountCode?.startsWith('52')).map((l: any, idx: number) => ({
          id: `${e.id}-${idx}`,
          date: e.date,
          libelle: e.label || l.label || '',
          montant: (l.debit || 0) - (l.credit || 0),
          compte: l.accountCode,
          piece: e.reference,
        })));
      }

      return JSON.stringify(reconcilier(lignes_banque || [], lignes_gl || [], { tolerance_montant: tolerance_montant ?? 0.01, fenetre_dates: fenetre_dates ?? 3, seuil_confiance: seuil_confiance ?? 0.85 }));
    },
  },
};
