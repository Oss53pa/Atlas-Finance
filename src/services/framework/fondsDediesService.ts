/**
 * Fonds dédiés SYCEBNL — suivi des ressources affectées par projet/bailleur.
 *
 * Cœur de la comptabilité des entités non lucratives : quand un bailleur affecte
 * une ressource à un PROJET et qu'elle n'est pas entièrement employée à la
 * clôture, la fraction non utilisée est REPORTÉE en « fonds dédiés » (engagement
 * à réaliser sur ressources affectées) et reprise l'exercice suivant.
 *
 * Le projet/bailleur est porté par l'axe analytique des lignes (`analyticalCode`).
 * Pour chaque projet :
 *   fonds dédiés à l'ouverture (report antérieur)
 *   + ressources affectées de l'exercice   (produits cl.7, hors reprise 789)
 *   − emplois de l'exercice                 (charges cl.6, hors dotation 689)
 *   = fonds dédiés à reporter (clôture)
 *
 * Source : glHelpers (loadGLEntries) — brouillons exclus.
 */

import type { DataAdapter } from '@atlas/data';
import { loadGLEntries, type GLEntry } from '../../features/financial/glHelpers';
import { money, Money } from '../../utils/money';
import { ENGAGEMENTS_RESSOURCES_AFFECTEES, REPORT_RESSOURCES_NON_UTILISEES } from './sycebnlChart';

const isANEntry = (e: GLEntry): boolean => e.journal === 'AN' || e.journal === 'RAN';

export interface FondsDedieProjet {
  /** Code du projet/bailleur (axe analytique) ; '(non affecté)' si absent. */
  projet: string;
  ouverture: number;
  ressourcesAffectees: number;
  emplois: number;
  cloture: number;
}

export interface FondsDediesStatement {
  startDate?: string;
  endDate?: string;
  projets: FondsDedieProjet[];
  totalOuverture: number;
  totalRessources: number;
  totalEmplois: number;
  totalCloture: number;
}

const UNASSIGNED = '(non affecté)';

/**
 * Contribution nette d'une ligne au solde « fonds dédiés » d'un projet.
 *
 * Ressource affectée = produit (cl.7) crédité, HORS reprise 789 (qui est
 * précisément la consommation d'un fonds dédié antérieur). Emploi = charge
 * (cl.6) débitée, HORS dotation 689 (qui EST la constitution du fonds dédié).
 * On mesure donc l'AFFECTATION économique, pas les écritures de report.
 */
function ressourceNette(code: string, debit: number, credit: number): number {
  const c = code || '';
  if (c.startsWith(REPORT_RESSOURCES_NON_UTILISEES)) return 0; // 789 : reprise, neutralisée
  if (c.startsWith(ENGAGEMENTS_RESSOURCES_AFFECTEES)) return 0; // 689 : dotation, neutralisée
  if (c.startsWith('7')) return credit - debit;  // ressource (produit)
  if (c.startsWith('6')) return -(debit - credit); // emploi (charge) → diminue le solde
  return 0;
}

export async function buildFondsDediesStatement(
  adapter: DataAdapter,
  range: { startDate?: string; endDate?: string } = {},
): Promise<FondsDediesStatement> {
  const entries = await loadGLEntries(adapter as any);

  // Par projet : ouverture (avant période / AN), ressources & emplois de période.
  const acc = new Map<string, { ouv: Money; res: Money; emp: Money }>();
  const get = (p: string) => {
    let a = acc.get(p);
    if (!a) { a = { ouv: money(0), res: money(0), emp: money(0) }; acc.set(p, a); }
    return a;
  };

  for (const e of entries) {
    const opening = isANEntry(e);
    const date = e.date ?? '';
    const before = range.startDate ? date < range.startDate : false;
    const after = range.endDate ? date > range.endDate : false;
    if (!opening && after) continue;

    for (const l of e.lines ?? []) {
      const code = l.accountCode || '';
      if (!(code.startsWith('6') || code.startsWith('7'))) continue;
      const net = ressourceNette(code, l.debit || 0, l.credit || 0);
      if (net === 0) continue;
      const projet = (l as any).analyticalCode || UNASSIGNED;
      const a = get(projet);

      if (opening || before) {
        // Antérieur : alimente le report d'ouverture (net cumulé).
        a.ouv = a.ouv.add(net);
      } else {
        // Période : sépare ressources (+) et emplois (−).
        if (net >= 0) a.res = a.res.add(net);
        else a.emp = a.emp.add(-net);
      }
    }
  }

  const projets: FondsDedieProjet[] = [...acc.entries()]
    .map(([projet, a]) => {
      const ouverture = a.ouv.round(2).toNumber();
      const ressources = a.res.round(2).toNumber();
      const emplois = a.emp.round(2).toNumber();
      const cloture = money(ouverture).add(ressources).subtract(emplois).round(2).toNumber();
      return { projet, ouverture, ressourcesAffectees: ressources, emplois, cloture };
    })
    .filter(p => p.ouverture !== 0 || p.ressourcesAffectees !== 0 || p.emplois !== 0)
    .sort((a, b) => b.cloture - a.cloture);

  return {
    startDate: range.startDate,
    endDate: range.endDate,
    projets,
    totalOuverture: Money.sum(projets.map(p => money(p.ouverture))).round(2).toNumber(),
    totalRessources: Money.sum(projets.map(p => money(p.ressourcesAffectees))).round(2).toNumber(),
    totalEmplois: Money.sum(projets.map(p => money(p.emplois))).round(2).toNumber(),
    totalCloture: Money.sum(projets.map(p => money(p.cloture))).round(2).toNumber(),
  };
}

/** Export CSV de l'état des fonds dédiés. */
export function fondsDediesToCSV(s: FondsDediesStatement): string {
  const head = ['Projet/Bailleur', 'Ouverture', 'Ressources affectées', 'Emplois', 'À reporter'].join(';');
  const rows = s.projets.map(p =>
    [`"${p.projet.replace(/"/g, '""')}"`, p.ouverture, p.ressourcesAffectees, p.emplois, p.cloture].join(';'),
  );
  const total = ['TOTAL', s.totalOuverture, s.totalRessources, s.totalEmplois, s.totalCloture].join(';');
  return ['# État des fonds dédiés (SYCEBNL)', head, ...rows, total].join('\n');
}
