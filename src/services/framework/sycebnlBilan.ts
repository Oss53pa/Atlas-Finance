/**
 * Bilan SYCEBNL formaté — entités à but non lucratif.
 *
 * Le bilan non lucratif reprend la structure SYSCOHADA mais côté PASSIF isole
 * les spécificités du secteur :
 *   - FONDS PROPRES (et non « capitaux propres ») : sans droit de reprise (102),
 *     avec droit de reprise (103), réserves, report à nouveau, subventions
 *     d'investissement, et le RÉSULTAT de l'exercice (excédent/déficit) ;
 *   - FONDS DÉDIÉS (13x) : engagements à réaliser sur ressources affectées —
 *     poste propre au SYCEBNL, entre fonds propres et dettes.
 *
 * Positions (classes 1-5) cumulées à la date de clôture (à-nouveau inclus) ;
 * chaque compte des classes 4/5 est placé à l'ACTIF ou au PASSIF selon le SIGNE
 * de son solde (jamais de Math.max qui écraserait un compte à solde inversé,
 * cf. gotcha bilan). Le résultat (produits − charges de la période, SANS impôt)
 * équilibre Actif = Passif.
 *
 * Source : glHelpers (loadGLEntries) — brouillons exclus, source unique.
 */

import type { DataAdapter } from '@atlas/data';
import { loadGLEntries, type GLEntry } from '../../features/financial/glHelpers';
import { money, Money } from '../../utils/money';

export interface BilanLigne {
  label: string;
  montant: number;
}

export interface BilanSycebnl {
  startDate?: string;
  endDate?: string;
  actif: BilanLigne[];
  passif: BilanLigne[];
  totalActif: number;
  totalPassif: number;
  /** Excédent (+) / déficit (−) inclus dans les fonds propres. */
  resultat: number;
  resultatLabel: 'Excédent' | 'Déficit';
  equilibre: boolean;
}

const isTreso = (c: string) => c.startsWith('5') && !c.startsWith('58') && !c.startsWith('59');

export async function buildBilanSycebnl(
  adapter: DataAdapter,
  range: { startDate?: string; endDate?: string } = {},
): Promise<BilanSycebnl> {
  const all = await loadGLEntries(adapter as any);

  // Positions classes 1-5 : cumul à la date de clôture (à-nouveau inclus).
  const solde = new Map<string, number>();
  for (const e of all as GLEntry[]) {
    if (range.endDate && (e.date ?? '') > range.endDate) continue;
    for (const l of e.lines ?? []) {
      const c = l.accountCode || '';
      if (!/^[1-5]/.test(c)) continue;
      solde.set(c, (solde.get(c) ?? 0) + (l.debit || 0) - (l.credit || 0));
    }
  }

  // Résultat de la période : produits (cl.7) − charges (cl.6), SANS impôt.
  let produits = money(0), charges = money(0);
  for (const e of all as GLEntry[]) {
    const d = e.date ?? '';
    if (range.startDate && d < range.startDate) continue;
    if (range.endDate && d > range.endDate) continue;
    for (const l of e.lines ?? []) {
      const c = l.accountCode || '';
      if (c.startsWith('7')) produits = produits.add((l.credit || 0) - (l.debit || 0));
      else if (c.startsWith('6')) charges = charges.add((l.debit || 0) - (l.credit || 0));
    }
  }
  const resultat = produits.subtract(charges).round(2).toNumber();

  // Accumulateurs par rubrique.
  const A = { immo: money(0), circulant: money(0), treso: money(0) };
  const P = {
    fondsPropres: money(0), fondsDedies: money(0), provisions: money(0),
    dettesFin: money(0), dettes: money(0), tresoPassif: money(0),
  };

  for (const [code, s] of solde) {
    const signed = money(s);
    if (code.startsWith('2')) { A.immo = A.immo.add(signed); continue; }        // net (VNC)
    if (code.startsWith('3')) { A.circulant = A.circulant.add(signed); continue; } // stocks
    if (code.startsWith('1')) {
      // Passif — fonds propres / dédiés / provisions / dettes financières.
      const credit = -s; // solde créditeur (positif normalement)
      if (code.startsWith('13')) P.fondsDedies = P.fondsDedies.add(credit);
      else if (code.startsWith('16')) P.dettesFin = P.dettesFin.add(credit);
      else if (code.startsWith('19')) P.provisions = P.provisions.add(credit);
      else P.fondsPropres = P.fondsPropres.add(credit);
      continue;
    }
    // Classes 4 et 5 : placement PAR SIGNE.
    if (code.startsWith('4')) {
      if (s >= 0) A.circulant = A.circulant.add(signed);         // créance (débit)
      else P.dettes = P.dettes.add(money(-s));                    // dette (crédit)
      continue;
    }
    if (isTreso(code)) {
      if (s >= 0) A.treso = A.treso.add(signed);                  // trésorerie active
      else P.tresoPassif = P.tresoPassif.add(money(-s));          // découvert
    }
  }

  // Le résultat rejoint les fonds propres.
  P.fondsPropres = P.fondsPropres.add(resultat);

  const actif: BilanLigne[] = [
    { label: 'Actif immobilisé', montant: A.immo.round(2).toNumber() },
    { label: 'Actif circulant', montant: A.circulant.round(2).toNumber() },
    { label: 'Trésorerie-actif', montant: A.treso.round(2).toNumber() },
  ].filter(l => l.montant !== 0);

  const passif: BilanLigne[] = [
    { label: 'Fonds propres (dont résultat)', montant: P.fondsPropres.round(2).toNumber() },
    { label: 'Fonds dédiés (ressources affectées)', montant: P.fondsDedies.round(2).toNumber() },
    { label: 'Provisions pour risques et charges', montant: P.provisions.round(2).toNumber() },
    { label: 'Dettes financières', montant: P.dettesFin.round(2).toNumber() },
    { label: 'Dettes (passif circulant)', montant: P.dettes.round(2).toNumber() },
    { label: 'Trésorerie-passif', montant: P.tresoPassif.round(2).toNumber() },
  ].filter(l => l.montant !== 0);

  const totalActif = Money.sum(actif.map(l => money(l.montant))).round(2).toNumber();
  const totalPassif = Money.sum(passif.map(l => money(l.montant))).round(2).toNumber();

  return {
    startDate: range.startDate,
    endDate: range.endDate,
    actif, passif, totalActif, totalPassif,
    resultat,
    resultatLabel: resultat >= 0 ? 'Excédent' : 'Déficit',
    equilibre: money(totalActif).equals(money(totalPassif), 1),
  };
}

/** Export CSV du bilan SYCEBNL. */
export function bilanSycebnlToCSV(b: BilanSycebnl): string {
  const rows: string[] = [
    '# Bilan SYCEBNL',
    `# Au ${b.endDate ?? ''}`,
    '',
    'Section;Poste;Montant',
  ];
  for (const a of b.actif) rows.push(`Actif;"${a.label}";${a.montant}`);
  rows.push(`;TOTAL ACTIF;${b.totalActif}`);
  for (const p of b.passif) rows.push(`Passif;"${p.label}";${p.montant}`);
  rows.push(`;TOTAL PASSIF;${b.totalPassif}`);
  return rows.join('\n');
}
