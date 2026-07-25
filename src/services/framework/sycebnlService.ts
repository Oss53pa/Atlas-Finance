/**
 * SYCEBNL — spécificités des entités à but non lucratif.
 *
 * Le SYCEBNL (2023) reprend la structure SYSCOHADA mais change le vocabulaire et
 * ajoute des notions propres au secteur non lucratif :
 *   - le solde de gestion est un EXCÉDENT (produits > charges) ou un DÉFICIT,
 *     pas un « bénéfice/perte » — et il n'y a pas d'impôt sur les sociétés à
 *     déduire (les ENBL en sont en principe exonérées sur l'activité non
 *     lucrative), donc excédent = produits (cl.7) − charges (cl.6) ;
 *   - les FONDS DÉDIÉS matérialisent les ressources affectées par un financeur
 *     à un projet et non encore employées : engagements à réaliser sur
 *     ressources affectées (passif), suivis par compte dédié.
 *
 * Ce module dérive ces agrégats du GL via glHelpers (source unique).
 */

import type { DataAdapter } from '@atlas/data';
import { loadGLEntries, makeGLHelpers } from '../../features/financial/glHelpers';
import { money } from '../../utils/money';

export interface SycebnlResult {
  produits: number;
  charges: number;
  /** Excédent (+) ou déficit (−) de l'exercice = produits − charges. */
  excedentDeficit: number;
  label: 'Excédent' | 'Déficit';
  /** Solde des fonds dédiés (ressources affectées non encore employées). */
  fondsDedies: number;
}

export interface SycebnlOptions {
  startDate?: string;
  endDate?: string;
  /**
   * Préfixes des comptes de fonds dédiés / ressources affectées. Paramétrable
   * (le plan SYCEBNL les loge en général en fonds propres/dettes ; défaut '19'
   * = provisions/fonds assimilés, ajustable selon le plan de l'entité).
   */
  fondsDediesPrefixes?: string[];
}

export async function computeSycebnlResult(
  adapter: DataAdapter,
  opts: SycebnlOptions = {},
): Promise<SycebnlResult> {
  let entries = await loadGLEntries(adapter as any); // brouillons exclus
  if (opts.startDate && opts.endDate) {
    entries = entries.filter(
      e => (e.date ?? '') >= opts.startDate! && (e.date ?? '') <= opts.endDate!,
    );
  }
  const h = makeGLHelpers(entries);

  // Excédent/déficit = produits (cl.7) − charges (cl.6). PAS de déduction d'IS :
  // l'activité non lucrative n'est pas soumise à l'IS (différence clé avec le
  // résultat net SYSCOHADA qui retranche la classe 89).
  const produits = money(h.creditNet('7')).round(2).toNumber();
  const charges = money(h.net('6')).round(2).toNumber();
  const excedentDeficit = money(produits).subtract(charges).round(2).toNumber();

  const prefixes = opts.fondsDediesPrefixes ?? ['19'];
  const fondsDedies = money(h.creditNet(...prefixes)).round(2).toNumber();

  return {
    produits,
    charges,
    excedentDeficit,
    label: excedentDeficit >= 0 ? 'Excédent' : 'Déficit',
    fondsDedies,
  };
}
