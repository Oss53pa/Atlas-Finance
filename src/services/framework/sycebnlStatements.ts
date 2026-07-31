/**
 * États SYCEBNL formatés — tableau des ressources et des emplois.
 *
 * L'équivalent non lucratif du compte de résultat : les EMPLOIS (charges, cl.6)
 * et les RESSOURCES (produits, cl.7) sont présentés par RUBRIQUE normalisée, et
 * le solde est un EXCÉDENT ou un DÉFICIT (sans impôt sur les sociétés).
 *
 * Structure par rubriques : cotisations, dons/legs, subventions, activités,
 * report des ressources non utilisées (789) côté ressources ; achats, services,
 * personnel, engagements à réaliser sur ressources affectées (689), aides
 * accordées (657)… côté emplois.
 *
 * Source : glHelpers (loadGLEntries) — brouillons exclus, source unique.
 */

import type { DataAdapter } from '@atlas/data';
import { loadGLEntries, type GLEntry } from '../../features/financial/glHelpers';
import { money, Money } from '../../utils/money';

export type SycebnlSection = 'emploi' | 'ressource';

interface RubriqueDef {
  section: SycebnlSection;
  label: string;
  prefixes: string[];
}

/**
 * Rubriques ORDONNÉES : la première dont un préfixe correspond gagne. Les
 * comptes spécifiques (689, 657, 754, 7551…) précèdent leurs classes génériques
 * (68, 65, 75) pour être isolés dans la bonne rubrique.
 */
const RUBRIQUES: RubriqueDef[] = [
  // ── EMPLOIS (charges, classe 6) ───────────────────────────────────────────
  { section: 'emploi', label: 'Engagements à réaliser sur ressources affectées', prefixes: ['689'] },
  { section: 'emploi', label: 'Aides, secours et subventions accordées', prefixes: ['657'] },
  { section: 'emploi', label: 'Achats et variations de stocks', prefixes: ['60', '61'] },
  { section: 'emploi', label: 'Services extérieurs', prefixes: ['62', '63'] },
  { section: 'emploi', label: 'Impôts et taxes', prefixes: ['64'] },
  { section: 'emploi', label: 'Charges de personnel', prefixes: ['66'] },
  { section: 'emploi', label: 'Charges financières', prefixes: ['67'] },
  { section: 'emploi', label: 'Dotations aux amortissements et provisions', prefixes: ['68'] },
  { section: 'emploi', label: 'Autres charges', prefixes: ['65'] },
  { section: 'emploi', label: 'Autres emplois', prefixes: ['69'] },
  // ── RESSOURCES (produits, classe 7) ───────────────────────────────────────
  { section: 'ressource', label: 'Report des ressources non utilisées (N-1)', prefixes: ['789'] },
  { section: 'ressource', label: 'Cotisations', prefixes: ['754'] },
  { section: 'ressource', label: 'Dons, legs et libéralités', prefixes: ['7551', '755', '756'] },
  { section: 'ressource', label: "Subventions d'exploitation", prefixes: ['74'] },
  { section: 'ressource', label: 'Produits des activités', prefixes: ['70', '71', '72', '73'] },
  { section: 'ressource', label: 'Produits financiers', prefixes: ['77'] },
  { section: 'ressource', label: 'Reprises de provisions', prefixes: ['78'] },
  { section: 'ressource', label: 'Autres produits', prefixes: ['75'] },
  { section: 'ressource', label: 'Autres ressources', prefixes: ['76', '79'] },
];

function resolveRubrique(code: string): RubriqueDef | null {
  const c = code || '';
  const section: SycebnlSection | null = c.startsWith('6') ? 'emploi' : c.startsWith('7') ? 'ressource' : null;
  if (!section) return null;
  for (const r of RUBRIQUES) {
    if (r.section !== section) continue;
    if (r.prefixes.some(p => c.startsWith(p))) return r;
  }
  return null;
}

export interface RubriqueLigne {
  label: string;
  montant: number;
}

export interface TableauRessourcesEmplois {
  startDate?: string;
  endDate?: string;
  emplois: RubriqueLigne[];
  ressources: RubriqueLigne[];
  totalEmplois: number;
  totalRessources: number;
  /** Excédent (+) ou déficit (−) = ressources − emplois. */
  excedentDeficit: number;
  label: 'Excédent' | 'Déficit';
  equilibre: boolean;
}

export async function buildTableauRessourcesEmplois(
  adapter: DataAdapter,
  range: { startDate?: string; endDate?: string } = {},
): Promise<TableauRessourcesEmplois> {
  let entries = await loadGLEntries(adapter as any);
  if (range.startDate && range.endDate) {
    entries = entries.filter(
      (e: GLEntry) => (e.date ?? '') >= range.startDate! && (e.date ?? '') <= range.endDate!,
    );
  }

  const emplois = new Map<string, Money>();
  const ressources = new Map<string, Money>();

  for (const e of entries) {
    for (const l of e.lines ?? []) {
      const r = resolveRubrique(l.accountCode || '');
      if (!r) continue;
      // Emploi (charge) = débit net ; ressource (produit) = crédit net.
      const montant = r.section === 'emploi'
        ? (l.debit || 0) - (l.credit || 0)
        : (l.credit || 0) - (l.debit || 0);
      const bucket = r.section === 'emploi' ? emplois : ressources;
      bucket.set(r.label, (bucket.get(r.label) ?? money(0)).add(montant));
    }
  }

  const toLignes = (m: Map<string, Money>): RubriqueLigne[] =>
    [...m.entries()]
      .map(([label, amt]) => ({ label, montant: amt.round(2).toNumber() }))
      .filter(l => l.montant !== 0)
      // Ordre de présentation = ordre des rubriques.
      .sort((a, b) => rubriqueOrder(a.label) - rubriqueOrder(b.label));

  const emploisLignes = toLignes(emplois);
  const ressourcesLignes = toLignes(ressources);
  const totalEmplois = Money.sum(emploisLignes.map(l => money(l.montant))).round(2).toNumber();
  const totalRessources = Money.sum(ressourcesLignes.map(l => money(l.montant))).round(2).toNumber();
  const excedentDeficit = money(totalRessources).subtract(totalEmplois).round(2).toNumber();

  return {
    startDate: range.startDate,
    endDate: range.endDate,
    emplois: emploisLignes,
    ressources: ressourcesLignes,
    totalEmplois,
    totalRessources,
    excedentDeficit,
    label: excedentDeficit >= 0 ? 'Excédent' : 'Déficit',
    // Contrôle : total emplois + excédent = total ressources (par construction).
    equilibre: money(totalEmplois).add(excedentDeficit).equals(money(totalRessources), 1),
  };
}

function rubriqueOrder(label: string): number {
  const i = RUBRIQUES.findIndex(r => r.label === label);
  return i < 0 ? 999 : i;
}

/** Export CSV du tableau ressources/emplois. */
export function tableauToCSV(t: TableauRessourcesEmplois): string {
  const rows: string[] = [
    '# Tableau des ressources et des emplois (SYCEBNL)',
    `# Période : ${t.startDate ?? ''} → ${t.endDate ?? ''}`,
    '',
    'Section;Rubrique;Montant',
  ];
  for (const e of t.emplois) rows.push(`Emploi;"${e.label.replace(/"/g, '""')}";${e.montant}`);
  rows.push(`;TOTAL EMPLOIS;${t.totalEmplois}`);
  for (const r of t.ressources) rows.push(`Ressource;"${r.label.replace(/"/g, '""')}";${r.montant}`);
  rows.push(`;TOTAL RESSOURCES;${t.totalRessources}`);
  rows.push(`;${t.label.toUpperCase()};${Math.abs(t.excedentDeficit)}`);
  return rows.join('\n');
}
