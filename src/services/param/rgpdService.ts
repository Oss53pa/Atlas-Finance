/**
 * rgpdService — protection des données personnelles (CDC Paramètres §13).
 *
 * Politique de rétention (via le socle, namespace rgpd.*) + calcul d'éligibilité
 * à l'anonymisation. NON DESTRUCTIF : l'anonymisation effective (purge des
 * coordonnées, journal des anonymisations) fera l'objet d'un lot contrôlé dédié.
 *
 * `isRetentionExpired` est PURE (testable).
 */
import type { DataAdapter } from '@atlas/data';
import { resolveParam, setParamValue } from './paramService';

export interface RetentionConfig {
  retentionTiersMois: number;   // rétention des données tiers (mois après fin de relation)
  retentionPiecesAns: number;   // rétention des pièces comptables (obligation SYSCOHADA)
  responsable: string | null;   // responsable des données
}

/**
 * Vrai si la durée de rétention est ÉCHUE à la date `asOf` : dernière activité +
 * `months` mois ≤ asOf. Dates ISO, calcul UTC. Fonction pure.
 */
export function isRetentionExpired(lastActivityISO: string, months: number, asOfISO: string): boolean {
  const d = new Date(`${lastActivityISO}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + (Number(months) || 0));
  return d.toISOString().slice(0, 10) <= asOfISO;
}

export async function getRetentionConfig(adapter: DataAdapter): Promise<RetentionConfig> {
  const [t, p, r] = await Promise.all([
    resolveParam<number>(adapter, 'rgpd.retention_tiers_mois'),
    resolveParam<number>(adapter, 'rgpd.retention_pieces_ans'),
    resolveParam<string>(adapter, 'rgpd.responsable_donnees'),
  ]);
  return {
    retentionTiersMois: t != null ? Number(t) : 60,
    retentionPiecesAns: p != null ? Number(p) : 10,
    responsable: (r as string | null) ?? null,
  };
}

/** Met à jour un paramètre RGPD (rétention / responsable), journalisé par le socle. */
export async function setRgpdParam(adapter: DataAdapter, key: 'retention_tiers_mois' | 'responsable_donnees', value: number | string): Promise<void> {
  await setParamValue(adapter, `rgpd.${key}`, value, { portee: 'societe' });
}
