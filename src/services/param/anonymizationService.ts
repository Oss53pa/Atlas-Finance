/**
 * anonymizationService — anonymisation RGPD des tiers personnes physiques (CDC §13).
 *
 * Lit les candidats (tiers PP dont la rétention est échue), déclenche
 * l'anonymisation souveraine (destructive, garde serveur, journal chaîné) et
 * relit le journal. `computeCandidates` est PURE (éligibilité + échéance).
 */
import type { DataAdapter } from '@atlas/data';
import { getRetentionConfig, isRetentionExpired } from './rgpdService';

function getClient(adapter: DataAdapter): any | null {
  const c = (adapter as any).client;
  return adapter.getMode() === 'saas' && c ? c : null;
}

/** Ajoute `months` mois à une date ISO (UTC). Renvoie 'YYYY-MM-DD'. */
export function addMonths(iso: string, months: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + (Number(months) || 0));
  return d.toISOString().slice(0, 10);
}

export interface TiersRow { code: string; name: string; derniere_activite: string | null; }
export interface Candidate {
  code: string; name: string; derniere_activite: string; echeance: string; eligible: boolean;
}

/**
 * Calcule les candidats à l'anonymisation : pour chaque tiers ayant une dernière
 * activité, l'échéance de rétention et l'éligibilité à `asOf`. Fonction pure.
 */
export function computeCandidates(rows: TiersRow[], retentionMonths: number, asOf: string): Candidate[] {
  return rows
    .filter(r => !!r.derniere_activite)
    .map(r => ({
      code: r.code, name: r.name, derniere_activite: r.derniere_activite as string,
      echeance: addMonths(r.derniere_activite as string, retentionMonths),
      eligible: isRetentionExpired(r.derniere_activite as string, retentionMonths, asOf),
    }))
    .sort((a, b) => (a.eligible === b.eligible ? a.echeance.localeCompare(b.echeance) : a.eligible ? -1 : 1));
}

const today = () => new Date().toISOString().slice(0, 10);

/** Liste les candidats (tiers PP non encore anonymisés) avec leur éligibilité. */
export async function listCandidates(adapter: DataAdapter): Promise<{ candidates: Candidate[]; retentionMonths: number }> {
  const client = getClient(adapter);
  if (!client) return { candidates: [], retentionMonths: 60 };
  const cfg = await getRetentionConfig(adapter);
  const { data } = await client.from('third_parties')
    .select('code,name,derniere_activite')
    .eq('est_personne_physique', true).is('anonymise_le', null).limit(500);
  return { candidates: computeCandidates((data ?? []) as TiersRow[], cfg.retentionTiersMois, today()), retentionMonths: cfg.retentionTiersMois };
}

/** Anonymise un tiers (souverain, irréversible, journalisé). Renvoie le pseudonyme. */
export async function anonymizeTiers(adapter: DataAdapter, code: string, motif: string): Promise<any> {
  const client = getClient(adapter);
  if (!client) throw new Error('Indisponible hors-ligne.');
  const { data, error } = await client.rpc('anonymize_tiers', { p_code: code, p_motif: motif });
  if (error) throw new Error(error.message);
  return data;
}

export interface AnonLogRow { tiers_code: string; motif: string | null; par: string | null; le: string; hash: string | null; hash_precedent: string | null; }

/** Journal des anonymisations (append-only, chaîné par hash). */
export async function listAnonymisationLog(adapter: DataAdapter, limit = 100): Promise<AnonLogRow[]> {
  const client = getClient(adapter);
  if (!client) return [];
  const { data } = await client.from('anonymisation_log')
    .select('tiers_code,motif,par,le,hash,hash_precedent').order('le', { ascending: false }).limit(limit);
  return (data ?? []) as AnonLogRow[];
}
