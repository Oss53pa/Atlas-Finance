/**
 * Block Data Service — Connects report blocks to Atlas FnA data
 * CDC §9 — Catalogue Intégré — Connexion Atlas FnA
 *
 * Resolves block `source` fields to actual financial data via DataAdapter.
 */

import type { DataAdapter } from '@atlas/data';
import type { PeriodSelection } from '../types';

// ============================================================================
// Types
// ============================================================================

interface KPIResult {
  value: number | null;
  previousValue: number | null;
}

interface TableResult {
  columns: { key: string; label: string; align: 'left' | 'right' | 'center'; format?: string }[];
  rows: Record<string, string | number | null>[];
}

interface ChartResult {
  data: Record<string, string | number>[];
  xAxisKey: string;
  series: { key: string; label: string; color?: string }[];
}

// ============================================================================
// Helpers
// ============================================================================

interface JournalLine {
  accountCode?: string;
  accountName?: string;
  label?: string;
  debit?: number;
  credit?: number;
  thirdPartyName?: string;
  thirdPartyCode?: string;
  // Champs bruts snake_case présents via le spread du normaliseur de ligne
  lettrage_code?: string;
  lettrageCode?: string;
  analytical_code?: string;
  analyticalCode?: string;
}

interface JournalEntry {
  id?: string;
  entryNumber?: string;
  date?: string;
  journal?: string;
  label?: string;
  lines?: JournalLine[];
  totalDebit?: number;
  totalCredit?: number;
  status?: string;
}

function inPeriod(date: string | undefined, period: PeriodSelection): boolean {
  if (!date) return false;
  return date >= period.startDate && date <= period.endDate;
}

function previousPeriod(period: PeriodSelection): PeriodSelection {
  const start = new Date(period.startDate);
  const end = new Date(period.endDate);
  const durationMs = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - durationMs);
  return {
    ...period,
    startDate: prevStart.toISOString().split('T')[0],
    endDate: prevEnd.toISOString().split('T')[0],
    label: 'N-1',
  };
}

function sumByClass(entries: JournalEntry[], classPrefix: string, period: PeriodSelection, type: 'debit' | 'credit' | 'net'): number {
  let total = 0;
  for (const e of entries) {
    if (!inPeriod(e.date, period)) continue;
    for (const l of (e.lines || [])) {
      if (!l.accountCode?.startsWith(classPrefix)) continue;
      if (type === 'debit') total += l.debit || 0;
      else if (type === 'credit') total += l.credit || 0;
      else total += (l.credit || 0) - (l.debit || 0);
    }
  }
  return total;
}

/** Solde « produit » (crédit − débit) d'une classe sur la période. */
const prodNet = (entries: JournalEntry[], cls: string, p: PeriodSelection) => sumByClass(entries, cls, p, 'net');
/** Solde « charge » (débit − crédit) d'une classe sur la période. */
const chargeNet = (entries: JournalEntry[], cls: string, p: PeriodSelection) =>
  sumByClass(entries, cls, p, 'debit') - sumByClass(entries, cls, p, 'credit');

/**
 * Résultat AVANT impôt = produits (cl.7) − charges (cl.6). Réf tenant : 67 349 583.
 * Source unique = glHelpers.resultatAvantImpot (mêmes classes).
 */
const resultatAvantImpotLocal = (entries: JournalEntry[], p: PeriodSelection) =>
  prodNet(entries, '7', p) - chargeNet(entries, '6', p);
/**
 * Résultat NET = résultat avant impôt − IMF/IS (classe 89). Réf tenant : 62 349 583.
 * ⚠️ Déduire la classe 89 est REQUIS (sinon divergence de 5 M avec le vrai résultat net
 * et incohérence interne avec financial.sig / financial.tft_indirect qui la déduisent déjà).
 */
const resultatNetLocal = (entries: JournalEntry[], p: PeriodSelection) =>
  resultatAvantImpotLocal(entries, p) - chargeNet(entries, '89', p);

/**
 * Lecture paginée d'une vue/table Supabase (PostgREST tronque à 1000 lignes).
 * `build` doit renvoyer un query builder ; on ajoute un tri déterministe + range en boucle.
 */
async function fetchAllRows(build: () => any, orderCol: string): Promise<any[]> {
  const all: any[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build().order(orderCol, { ascending: true }).range(from, from + PAGE - 1);
    if (error) break;
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < PAGE) break;
  }
  return all;
}

/** Code analytique d'une ligne (snake ou camel). */
const lineAnalytical = (l: JournalLine) => l.analytical_code || l.analyticalCode || '';
/** Code de lettrage d'une ligne (snake ou camel). */
const lineLettrage = (l: JournalLine) => l.lettrage_code || l.lettrageCode || '';

// ============================================================================
// KPI Data
// ============================================================================

export async function fetchKPIValue(
  adapter: DataAdapter,
  source: string,
  period: PeriodSelection
): Promise<KPIResult> {
  const entries = ((await adapter.getAll('journalEntries')) as JournalEntry[]).filter((e) => e.status !== 'draft');
  const prev = previousPeriod(period);

  const calcValue = (p: PeriodSelection): number | null => {
    switch (source) {
      case 'kpi.ca_total':
        return sumByClass(entries, '7', p, 'net');

      case 'kpi.stock_value':
        // Valeur du stock = solde débiteur de la classe 3 (alimentée par les
        // postings du module Stock). Cohérent avec la comptabilité.
        return sumByClass(entries, '3', p, 'debit') - sumByClass(entries, '3', p, 'credit');

      case 'kpi.resultat_net': {
        return resultatNetLocal(entries, p);
      }

      case 'kpi.ebitda': {
        const ca = sumByClass(entries, '7', p, 'net');
        const charges6 = sumByClass(entries, '6', p, 'debit') - sumByClass(entries, '6', p, 'credit');
        // EBITDA ≈ CA - charges opérationnelles (hors amortissements 68x)
        const amort = sumByClass(entries, '68', p, 'debit') - sumByClass(entries, '68', p, 'credit');
        return ca - charges6 + amort;
      }

      case 'kpi.marge_brute': {
        const ca = sumByClass(entries, '7', p, 'net');
        if (ca === 0) return 0;
        const achats = sumByClass(entries, '60', p, 'debit') - sumByClass(entries, '60', p, 'credit');
        return ((ca - achats) / ca) * 100;
      }

      case 'kpi.tresorerie_nette': {
        // Trésorerie = classe 5 HORS 58 (virements internes) et 59 (dépréciations)
        let total = 0;
        for (const e of entries) {
          if (!inPeriod(e.date, p)) continue;
          for (const l of (e.lines || [])) {
            const code = l.accountCode || '';
            if (code.startsWith('5') && !code.startsWith('58') && !code.startsWith('59')) {
              total += (l.debit || 0) - (l.credit || 0);
            }
          }
        }
        return total;
      }

      case 'kpi.bfr': {
        // BFR = Actif circulant (classes 3+4 débiteur) - Passif circulant (classes 4 créditeur)
        let actifCirculant = 0;
        let passifCirculant = 0;
        for (const e of entries) {
          if (!inPeriod(e.date, p)) continue;
          for (const l of (e.lines || [])) {
            const code = l.accountCode || '';
            if (code.startsWith('3') || code.startsWith('41')) {
              actifCirculant += (l.debit || 0) - (l.credit || 0);
            }
            if (code.startsWith('40') || code.startsWith('42') || code.startsWith('43') || code.startsWith('44')) {
              passifCirculant += (l.credit || 0) - (l.debit || 0);
            }
          }
        }
        return actifCirculant - passifCirculant;
      }

      case 'kpi.fonds_roulement': {
        // FR = Capitaux permanents (1+16+17) - Actif immobilisé (2)
        let capPerm = 0;
        let actifImmo = 0;
        for (const e of entries) {
          if (!inPeriod(e.date, p)) continue;
          for (const l of (e.lines || [])) {
            const code = l.accountCode || '';
            if (code.startsWith('1')) capPerm += (l.credit || 0) - (l.debit || 0);
            if (code.startsWith('2')) actifImmo += (l.debit || 0) - (l.credit || 0);
          }
        }
        return capPerm - actifImmo;
      }

      case 'kpi.dso': {
        const ca = sumByClass(entries, '7', p, 'net');
        if (ca === 0) return 0;
        let creances = 0;
        for (const e of entries) {
          if (!inPeriod(e.date, p)) continue;
          for (const l of (e.lines || [])) {
            if (l.accountCode?.startsWith('41')) creances += (l.debit || 0) - (l.credit || 0);
          }
        }
        const days = (new Date(p.endDate).getTime() - new Date(p.startDate).getTime()) / (1000 * 60 * 60 * 24);
        return (creances / ca) * days;
      }

      case 'kpi.dpo': {
        const achats = sumByClass(entries, '60', p, 'debit') - sumByClass(entries, '60', p, 'credit');
        if (achats === 0) return 0;
        let dettes = 0;
        for (const e of entries) {
          if (!inPeriod(e.date, p)) continue;
          for (const l of (e.lines || [])) {
            if (l.accountCode?.startsWith('40')) dettes += (l.credit || 0) - (l.debit || 0);
          }
        }
        const days = (new Date(p.endDate).getTime() - new Date(p.startDate).getTime()) / (1000 * 60 * 60 * 24);
        return (dettes / achats) * days;
      }

      case 'kpi.creances_clients': {
        let total = 0;
        for (const e of entries) {
          if (!inPeriod(e.date, p)) continue;
          for (const l of (e.lines || [])) {
            if (l.accountCode?.startsWith('41')) total += (l.debit || 0) - (l.credit || 0);
          }
        }
        return total;
      }

      case 'kpi.dettes_fournisseurs': {
        let total = 0;
        for (const e of entries) {
          if (!inPeriod(e.date, p)) continue;
          for (const l of (e.lines || [])) {
            if (l.accountCode?.startsWith('40')) total += (l.credit || 0) - (l.debit || 0);
          }
        }
        return total;
      }

      case 'kpi.ratio_endettement': {
        let dettes = 0;
        let capitaux = 0;
        for (const e of entries) {
          if (!inPeriod(e.date, p)) continue;
          for (const l of (e.lines || [])) {
            const code = l.accountCode || '';
            if (code.startsWith('16') || code.startsWith('17')) dettes += (l.credit || 0) - (l.debit || 0);
            if (code.startsWith('10') || code.startsWith('11') || code.startsWith('12') || code.startsWith('13')) {
              capitaux += (l.credit || 0) - (l.debit || 0);
            }
          }
        }
        return capitaux === 0 ? 0 : (dettes / capitaux) * 100;
      }

      case 'kpi.roe': {
        const resultat = resultatNetLocal(entries, p);
        let capitaux = 0;
        for (const e of entries) {
          if (!inPeriod(e.date, p)) continue;
          for (const l of (e.lines || [])) {
            const code = l.accountCode || '';
            if (code.startsWith('10') || code.startsWith('11') || code.startsWith('12') || code.startsWith('13')) {
              capitaux += (l.credit || 0) - (l.debit || 0);
            }
          }
        }
        return capitaux === 0 ? 0 : (resultat / capitaux) * 100;
      }

      case 'kpi.roi': {
        const resultat = resultatNetLocal(entries, p);
        let totalActif = 0;
        for (const e of entries) {
          if (!inPeriod(e.date, p)) continue;
          for (const l of (e.lines || [])) {
            const code = l.accountCode || '';
            if (code.startsWith('2') || code.startsWith('3') || code.startsWith('4') || code.startsWith('5')) {
              totalActif += (l.debit || 0) - (l.credit || 0);
            }
          }
        }
        return totalActif === 0 ? 0 : (resultat / totalActif) * 100;
      }

      case 'kpi.ratio_liquidite': {
        let actifCirculant = 0;
        let passifCirculant = 0;
        for (const e of entries) {
          if (!inPeriod(e.date, p)) continue;
          for (const l of (e.lines || [])) {
            const code = l.accountCode || '';
            if (code.startsWith('3') || code.startsWith('4') || code.startsWith('5')) {
              if ((l.debit || 0) > (l.credit || 0)) actifCirculant += (l.debit || 0) - (l.credit || 0);
            }
            if (code.startsWith('4') || code.startsWith('5')) {
              if ((l.credit || 0) > (l.debit || 0)) passifCirculant += (l.credit || 0) - (l.debit || 0);
            }
          }
        }
        return passifCirculant === 0 ? 0 : actifCirculant / passifCirculant;
      }

      case 'kpi.caf': {
        // CAF = Résultat net + Dotations amort/prov - Reprises prov
        const resultat = resultatNetLocal(entries, p);
        const dotations = sumByClass(entries, '68', p, 'debit') - sumByClass(entries, '68', p, 'credit')
          + sumByClass(entries, '69', p, 'debit') - sumByClass(entries, '69', p, 'credit');
        const reprises = sumByClass(entries, '78', p, 'net') + sumByClass(entries, '79', p, 'net');
        return resultat + dotations - reprises;
      }

      case 'kpi.flux_exploitation': {
        // Flux exploitation = CAF - Variation BFR
        const resultat = resultatNetLocal(entries, p);
        const dotations = sumByClass(entries, '68', p, 'debit') - sumByClass(entries, '68', p, 'credit')
          + sumByClass(entries, '69', p, 'debit') - sumByClass(entries, '69', p, 'credit');
        const reprises = sumByClass(entries, '78', p, 'net') + sumByClass(entries, '79', p, 'net');
        const caf = resultat + dotations - reprises;
        // Variation BFR simplifiée
        let bfrVar = 0;
        for (const e of entries) {
          if (!inPeriod(e.date, p)) continue;
          for (const l of (e.lines || [])) {
            const code = l.accountCode || '';
            if (code.startsWith('3') || code.startsWith('41') || code.startsWith('46')) {
              bfrVar += (l.debit || 0) - (l.credit || 0);
            }
            if (code.startsWith('40') || code.startsWith('42') || code.startsWith('43') || code.startsWith('44')) {
              bfrVar -= (l.credit || 0) - (l.debit || 0);
            }
          }
        }
        return caf - bfrVar;
      }

      case 'kpi.free_cashflow': {
        // FCF = Flux exploitation + Flux investissement
        const resultat = resultatNetLocal(entries, p);
        const dotations = sumByClass(entries, '68', p, 'debit') - sumByClass(entries, '68', p, 'credit');
        const reprises = sumByClass(entries, '78', p, 'net');
        const caf = resultat + dotations - reprises;
        const acquisitions = sumByClass(entries, '2', p, 'debit') - sumByClass(entries, '2', p, 'credit');
        return caf - Math.max(0, acquisitions);
      }

      case 'kpi.variation_tresorerie': {
        // Variation = Somme des flux nets sur comptes de trésorerie (classe 5)
        let total = 0;
        for (const e of entries) {
          if (!inPeriod(e.date, p)) continue;
          if (e.journal === 'AN' || e.journal === 'RAN') continue;
          for (const l of (e.lines || [])) {
            if (l.accountCode?.startsWith('5')) total += (l.debit || 0) - (l.credit || 0);
          }
        }
        return total;
      }

      // -- New KPIs (Task 1 expansion) --
      case 'kpi.gross_margin':
      case 'kpi.marge_brute_pct': {
        const ca = sumByClass(entries, '7', p, 'net');
        if (ca === 0) return 0;
        const achats = sumByClass(entries, '60', p, 'debit') - sumByClass(entries, '60', p, 'credit');
        return ((ca - achats) / ca) * 100;
      }

      case 'kpi.net_margin': {
        const ca = sumByClass(entries, '7', p, 'net');
        if (ca === 0) return 0;
        return (resultatNetLocal(entries, p) / ca) * 100;
      }

      case 'kpi.ebitda_margin': {
        const ca = sumByClass(entries, '7', p, 'net');
        if (ca === 0) return 0;
        const charges6 = sumByClass(entries, '6', p, 'debit') - sumByClass(entries, '6', p, 'credit');
        const amort = sumByClass(entries, '68', p, 'debit') - sumByClass(entries, '68', p, 'credit');
        const ebitda = ca - charges6 + amort;
        return (ebitda / ca) * 100;
      }

      case 'kpi.roa': {
        const resultat = resultatNetLocal(entries, p);
        let actif = 0;
        for (const e of entries) {
          if (!inPeriod(e.date, p)) continue;
          for (const l of (e.lines || [])) {
            const code = l.accountCode || '';
            if (code.startsWith('2') || code.startsWith('3') || code.startsWith('4') || code.startsWith('5')) {
              actif += (l.debit || 0) - (l.credit || 0);
            }
          }
        }
        return actif === 0 ? 0 : (resultat / actif) * 100;
      }

      case 'kpi.roic': {
        // ROIC ≈ Résultat net / Capitaux investis (classe 1)
        const resultat = resultatNetLocal(entries, p);
        let invested = 0;
        for (const e of entries) {
          if (!inPeriod(e.date, p)) continue;
          for (const l of (e.lines || [])) {
            const code = l.accountCode || '';
            if (code.startsWith('1')) invested += (l.credit || 0) - (l.debit || 0);
          }
        }
        return invested === 0 ? 0 : (resultat / invested) * 100;
      }

      case 'kpi.debt_to_equity': {
        let dettes = 0;
        let capitaux = 0;
        for (const e of entries) {
          if (!inPeriod(e.date, p)) continue;
          for (const l of (e.lines || [])) {
            const code = l.accountCode || '';
            if (code.startsWith('16') || code.startsWith('17')) dettes += (l.credit || 0) - (l.debit || 0);
            if (code.startsWith('10') || code.startsWith('11') || code.startsWith('12') || code.startsWith('13')) {
              capitaux += (l.credit || 0) - (l.debit || 0);
            }
          }
        }
        return capitaux === 0 ? 0 : dettes / capitaux;
      }

      case 'kpi.interest_coverage': {
        const produits = sumByClass(entries, '7', p, 'net');
        const charges = sumByClass(entries, '6', p, 'debit') - sumByClass(entries, '6', p, 'credit');
        const ebit = produits - charges + (sumByClass(entries, '66', p, 'debit') - sumByClass(entries, '66', p, 'credit'));
        const interest = sumByClass(entries, '66', p, 'debit') - sumByClass(entries, '66', p, 'credit');
        return interest === 0 ? 0 : ebit / interest;
      }

      case 'kpi.current_ratio': {
        let actifCirculant = 0;
        let passifCirculant = 0;
        for (const e of entries) {
          if (!inPeriod(e.date, p)) continue;
          for (const l of (e.lines || [])) {
            const code = l.accountCode || '';
            if (code.startsWith('3') || code.startsWith('4') || code.startsWith('5')) {
              const net = (l.debit || 0) - (l.credit || 0);
              if (net > 0) actifCirculant += net;
            }
            if (code.startsWith('40') || code.startsWith('42') || code.startsWith('43') || code.startsWith('44')) {
              const net = (l.credit || 0) - (l.debit || 0);
              if (net > 0) passifCirculant += net;
            }
          }
        }
        return passifCirculant === 0 ? 0 : actifCirculant / passifCirculant;
      }

      case 'kpi.quick_ratio': {
        let actifCirculant = 0;
        let stocks = 0;
        let passifCirculant = 0;
        for (const e of entries) {
          if (!inPeriod(e.date, p)) continue;
          for (const l of (e.lines || [])) {
            const code = l.accountCode || '';
            if (code.startsWith('3') || code.startsWith('4') || code.startsWith('5')) {
              const net = (l.debit || 0) - (l.credit || 0);
              if (net > 0) actifCirculant += net;
            }
            if (code.startsWith('3')) {
              stocks += (l.debit || 0) - (l.credit || 0);
            }
            if (code.startsWith('40') || code.startsWith('42') || code.startsWith('43') || code.startsWith('44')) {
              const net = (l.credit || 0) - (l.debit || 0);
              if (net > 0) passifCirculant += net;
            }
          }
        }
        return passifCirculant === 0 ? 0 : (actifCirculant - stocks) / passifCirculant;
      }

      case 'kpi.cash_conversion_cycle': {
        // CCC = DSO + DIO - DPO (simplified)
        const ca = sumByClass(entries, '7', p, 'net');
        const achats = sumByClass(entries, '60', p, 'debit') - sumByClass(entries, '60', p, 'credit');
        const days = (new Date(p.endDate).getTime() - new Date(p.startDate).getTime()) / (1000 * 60 * 60 * 24);
        let creances = 0, dettes = 0, stocks = 0;
        for (const e of entries) {
          if (!inPeriod(e.date, p)) continue;
          for (const l of (e.lines || [])) {
            const code = l.accountCode || '';
            if (code.startsWith('41')) creances += (l.debit || 0) - (l.credit || 0);
            if (code.startsWith('40')) dettes += (l.credit || 0) - (l.debit || 0);
            if (code.startsWith('3')) stocks += (l.debit || 0) - (l.credit || 0);
          }
        }
        const dso = ca === 0 ? 0 : (creances / ca) * days;
        const dpo = achats === 0 ? 0 : (dettes / achats) * days;
        const dio = achats === 0 ? 0 : (stocks / achats) * days;
        return dso + dio - dpo;
      }

      case 'kpi.working_capital_days': {
        const ca = sumByClass(entries, '7', p, 'net');
        if (ca === 0) return 0;
        let bfr = 0;
        for (const e of entries) {
          if (!inPeriod(e.date, p)) continue;
          for (const l of (e.lines || [])) {
            const code = l.accountCode || '';
            if (code.startsWith('3') || code.startsWith('41')) bfr += (l.debit || 0) - (l.credit || 0);
            if (code.startsWith('40') || code.startsWith('42') || code.startsWith('43') || code.startsWith('44')) bfr -= (l.credit || 0) - (l.debit || 0);
          }
        }
        return (bfr / ca) * 365;
      }

      case 'kpi.altman_zscore': {
        // Altman Z = 1.2*(WC/TA) + 1.4*(RE/TA) + 3.3*(EBIT/TA) + 0.6*(E/TL) + 1.0*(S/TA)
        // WC = actif circulant réel − passif circulant réel ; RE = réserves+report (11+12) ;
        // EBIT = résultat avant impôt (distinct de RE, ne pas compter deux fois).
        let totalActif = 0;
        let capitaux = 0;   // E (capitaux propres 10-13)
        let dettes = 0;     // TL (dettes financières + fournisseurs)
        let re = 0;         // RE (réserves 11 + report à nouveau 12)
        let actifCirculant = 0;
        let passifCirculant = 0;
        for (const e of entries) {
          if (!inPeriod(e.date, p)) continue;
          for (const l of (e.lines || [])) {
            const code = l.accountCode || '';
            if (code.startsWith('2') || code.startsWith('3') || code.startsWith('4') || code.startsWith('5')) {
              totalActif += (l.debit || 0) - (l.credit || 0);
            }
            if (code.startsWith('10') || code.startsWith('11') || code.startsWith('12') || code.startsWith('13')) {
              capitaux += (l.credit || 0) - (l.debit || 0);
            }
            if (code.startsWith('11') || code.startsWith('12')) {
              re += (l.credit || 0) - (l.debit || 0);
            }
            if (code.startsWith('16') || code.startsWith('17') || code.startsWith('40')) {
              dettes += (l.credit || 0) - (l.debit || 0);
            }
            if (code.startsWith('3') || code.startsWith('41') || code.startsWith('5')) {
              const net = (l.debit || 0) - (l.credit || 0);
              if (net > 0) actifCirculant += net;
            }
            if (code.startsWith('40') || code.startsWith('42') || code.startsWith('43') || code.startsWith('44')) {
              const net = (l.credit || 0) - (l.debit || 0);
              if (net > 0) passifCirculant += net;
            }
          }
        }
        if (totalActif === 0) return 0;
        const ca = sumByClass(entries, '7', p, 'net');
        const ebit = resultatAvantImpotLocal(entries, p);
        const wc = actifCirculant - passifCirculant;
        const z = 1.2 * (wc / totalActif) + 1.4 * (re / totalActif) + 3.3 * (ebit / totalActif)
          + 0.6 * (capitaux / (dettes || 1)) + 1.0 * (ca / totalActif);
        return z;
      }

      case 'kpi.tva_net_a_payer': {
        // TVA collectée (4431 / 443) - TVA déductible (4452 / 445)
        let tvaCollectee = 0;
        let tvaDeductible = 0;
        for (const e of entries) {
          if (!inPeriod(e.date, p)) continue;
          for (const l of (e.lines || [])) {
            const code = l.accountCode || '';
            if (code.startsWith('443')) tvaCollectee += (l.credit || 0) - (l.debit || 0);
            if (code.startsWith('445')) tvaDeductible += (l.debit || 0) - (l.credit || 0);
          }
        }
        return Math.max(0, tvaCollectee - tvaDeductible);
      }

      case 'kpi.is_previsionnel': {
        const ca = sumByClass(entries, '7', p, 'net');
        const charges = sumByClass(entries, '6', p, 'debit') - sumByClass(entries, '6', p, 'credit');
        const resultat = ca - charges;
        return Math.max(0, resultat * 0.25); // 25% default rate
      }

      case 'kpi.benford_index': {
        // Simplified conformity score (0..100)
        const values: number[] = [];
        for (const e of entries) {
          if (!inPeriod(e.date, p)) continue;
          for (const l of (e.lines || [])) {
            const v = Math.abs((l.debit || 0) + (l.credit || 0));
            if (v > 0) values.push(v);
          }
        }
        if (values.length < 30) return 50;
        const counts = new Array(10).fill(0);
        for (const v of values) {
          const first = parseInt(String(v).replace(/^0+/, '').charAt(0), 10);
          if (first >= 1 && first <= 9) counts[first]++;
        }
        const expected = [0, 0.301, 0.176, 0.125, 0.097, 0.079, 0.067, 0.058, 0.051, 0.046];
        let chi = 0;
        for (let d = 1; d <= 9; d++) {
          const exp = expected[d] * values.length;
          chi += Math.pow(counts[d] - exp, 2) / (exp || 1);
        }
        // Map χ² to a 0..100 score (heuristic)
        return Math.max(0, Math.min(100, 100 - chi * 2));
      }

      case 'kpi.score_credit_moyen': {
        // Placeholder: derive a stub score based on DSO
        const ca = sumByClass(entries, '7', p, 'net');
        if (ca === 0) return 0;
        let creances = 0;
        for (const e of entries) {
          if (!inPeriod(e.date, p)) continue;
          for (const l of (e.lines || [])) {
            if (l.accountCode?.startsWith('41')) creances += (l.debit || 0) - (l.credit || 0);
          }
        }
        const days = (new Date(p.endDate).getTime() - new Date(p.startDate).getTime()) / (1000 * 60 * 60 * 24);
        const dso = (creances / ca) * days;
        return Math.max(0, Math.min(100, 100 - dso));
      }

      case 'kpi.total_actif': {
        // Total Actif = Σ soldes des classes 2-5 (débit − crédit).
        let total = 0;
        for (const e of entries) {
          if (!inPeriod(e.date, p)) continue;
          for (const l of (e.lines || [])) {
            const code = l.accountCode || '';
            if (code.startsWith('2') || code.startsWith('3') || code.startsWith('4') || code.startsWith('5')) {
              total += (l.debit || 0) - (l.credit || 0);
            }
          }
        }
        return total;
      }

      case 'kpi.capitaux_propres': {
        // Capitaux propres = capital + réserves + report à nouveau (10-12, crédit − débit)
        // + résultat net de l'exercice (calculé, pas encore affecté au 13).
        let cp = 0;
        for (const e of entries) {
          if (!inPeriod(e.date, p)) continue;
          for (const l of (e.lines || [])) {
            const code = l.accountCode || '';
            if (code.startsWith('10') || code.startsWith('11') || code.startsWith('12')) {
              cp += (l.credit || 0) - (l.debit || 0);
            }
          }
        }
        return cp + resultatNetLocal(entries, p);
      }

      default:
        return null;
    }
  };

  return {
    value: calcValue(period),
    previousValue: calcValue(prev),
  };
}

// ============================================================================
// Table Data
// ============================================================================

export async function fetchTableData(
  adapter: DataAdapter,
  source: string,
  period: PeriodSelection
): Promise<TableResult> {
  const entries = ((await adapter.getAll('journalEntries')) as JournalEntry[]).filter((e) => e.status !== 'draft');

  // Chargements complémentaires (uniquement si la source les requiert)
  const loadAux = async (table: string): Promise<Record<string, any>[]> => {
    try { return ((await adapter.getAll(table as never)) as Record<string, any>[]) || []; }
    catch { return []; }
  };

  switch (source) {
    case 'accounting.balance_generale': {
      const balances = new Map<string, { label: string; debit: number; credit: number }>();
      for (const e of entries) {
        if (!inPeriod(e.date, period)) continue;
        for (const l of (e.lines || [])) {
          const code = l.accountCode || '???';
          if (!balances.has(code)) balances.set(code, { label: l.accountName || code, debit: 0, credit: 0 });
          const b = balances.get(code)!;
          b.debit += l.debit || 0;
          b.credit += l.credit || 0;
        }
      }
      const rows = Array.from(balances.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([code, b]) => ({
          compte: code,
          label: b.label,
          debit: b.debit,
          credit: b.credit,
          solde: b.debit - b.credit,
        }));
      return {
        columns: [
          { key: 'compte', label: 'Compte', align: 'left' },
          { key: 'label', label: 'Libellé', align: 'left' },
          { key: 'debit', label: 'Débit', align: 'right', format: 'currency' },
          { key: 'credit', label: 'Crédit', align: 'right', format: 'currency' },
          { key: 'solde', label: 'Solde', align: 'right', format: 'currency' },
        ],
        rows,
      };
    }

    case 'accounting.journal_entries': {
      const rows = entries
        .filter(e => inPeriod(e.date, period))
        .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
        .map(e => ({
          date: e.date || '',
          numero: e.entryNumber || '',
          journal: e.journal || '',
          libelle: e.label || '',
          debit: e.totalDebit || 0,
          credit: e.totalCredit || 0,
        }));
      return {
        columns: [
          { key: 'date', label: 'Date', align: 'left', format: 'date' },
          { key: 'numero', label: 'N° Pièce', align: 'left' },
          { key: 'journal', label: 'Journal', align: 'center' },
          { key: 'libelle', label: 'Libellé', align: 'left' },
          { key: 'debit', label: 'Débit', align: 'right', format: 'currency' },
          { key: 'credit', label: 'Crédit', align: 'right', format: 'currency' },
        ],
        rows,
      };
    }

    case 'financial.compte_resultat': {
      const classes = ['60', '61', '62', '63', '64', '65', '66', '67', '68', '69', '70', '71', '72', '73', '74', '75', '76', '77', '78', '79'];
      // Budget par classe (2 chiffres) depuis la vue live, si dispo (CDC §5 : CR enrichi budget/écart)
      const budgetByClass = new Map<string, number>();
      try {
        const client = (adapter as any).client;
        if (client) {
          const bva = await fetchAllRows(() => client.from('v_budget_vs_actual').select('account_code,budget').eq('budget_type', 'exploitation'), 'account_code');
          for (const r of (bva || [])) budgetByClass.set(String(r.account_code).slice(0, 2), (budgetByClass.get(String(r.account_code).slice(0, 2)) || 0) + (Number(r.budget) || 0));
        }
      } catch { /* vue absente */ }
      const hasBudget = budgetByClass.size > 0;
      const rows = classes.map(cls => {
        const isCharge = cls.startsWith('6');
        let current = 0;
        for (const e of entries) {
          if (!inPeriod(e.date, period)) continue;
          for (const l of (e.lines || [])) {
            if (l.accountCode?.startsWith(cls)) {
              current += isCharge ? ((l.debit || 0) - (l.credit || 0)) : ((l.credit || 0) - (l.debit || 0));
            }
          }
        }
        const budget = budgetByClass.get(cls) || 0;
        return {
          classe: cls,
          label: getClassLabel(cls),
          type: isCharge ? 'Charge' : 'Produit',
          budget,
          current,
          ecart: current - budget,
        };
      }).filter(r => r.current !== 0 || r.budget !== 0);
      const columns: TableResult['columns'] = [
        { key: 'classe', label: 'Classe', align: 'left' },
        { key: 'label', label: 'Libellé', align: 'left' },
        { key: 'type', label: 'Type', align: 'center' },
      ];
      if (hasBudget) columns.push({ key: 'budget', label: 'Budget', align: 'right', format: 'currency' });
      columns.push({ key: 'current', label: 'Réalisé', align: 'right', format: 'currency' });
      if (hasBudget) columns.push({ key: 'ecart', label: 'Écart', align: 'right', format: 'currency' });
      return { columns, rows };
    }

    case 'financial.bilan_actif': {
      const postes = [
        { code: '2', label: 'Immobilisations' },
        { code: '3', label: 'Stocks' },
        { code: '41', label: 'Créances Clients' },
        { code: '5', label: 'Trésorerie Actif' },
      ];
      // Comptes de dépréciation/amortissement (créditeurs) à isoler du brut : 28x/29x (immo),
      // 39x (stocks), 49x (créances), 59x (trésorerie). Brut = valeur d'origine, Net = VNC.
      const isProvision = (code: string) =>
        code.startsWith('28') || code.startsWith('29') || code.startsWith('39') ||
        code.startsWith('49') || code.startsWith('59');
      const rows = postes.map(p => {
        let brut = 0;
        let amort = 0;
        for (const e of entries) {
          if (!inPeriod(e.date, period)) continue;
          for (const l of (e.lines || [])) {
            const code = l.accountCode || '';
            if (!code.startsWith(p.code)) continue;
            if (isProvision(code)) amort += (l.credit || 0) - (l.debit || 0);
            else brut += (l.debit || 0) - (l.credit || 0);
          }
        }
        return { label: p.label, brut, amort, net: brut - amort };
      });
      return {
        columns: [
          { key: 'label', label: 'Poste', align: 'left' },
          { key: 'brut', label: 'Brut', align: 'right', format: 'currency' },
          { key: 'amort', label: 'Amort./Prov.', align: 'right', format: 'currency' },
          { key: 'net', label: 'Net', align: 'right', format: 'currency' },
        ],
        rows,
      };
    }

    case 'financial.bilan_passif': {
      const postes = [
        { code: '10', label: 'Capital' },
        { code: '11', label: 'Réserves' },
        { code: '12', label: 'Résultat' },
        { code: '16', label: 'Emprunts' },
        { code: '40', label: 'Dettes Fournisseurs' },
        { code: '43', label: 'Dettes Sociales' },
        { code: '44', label: 'Dettes Fiscales' },
      ];
      const rows = postes.map(p => {
        let montant = 0;
        for (const e of entries) {
          if (!inPeriod(e.date, period)) continue;
          for (const l of (e.lines || [])) {
            if (l.accountCode?.startsWith(p.code)) montant += (l.credit || 0) - (l.debit || 0);
          }
        }
        return { label: p.label, montant };
      });
      return {
        columns: [
          { key: 'label', label: 'Poste', align: 'left' },
          { key: 'montant', label: 'Montant', align: 'right', format: 'currency' },
        ],
        rows,
      };
    }

    case 'accounting.grand_livre':
    case 'accounting.grand_livre_auxiliaire': {
      const rows: Record<string, string | number | null>[] = [];
      for (const e of entries) {
        if (!inPeriod(e.date, period)) continue;
        for (const l of (e.lines || [])) {
          rows.push({
            date: e.date || '',
            compte: l.accountCode || '',
            libelle: l.accountName || l.label || e.label || '',
            debit: l.debit || 0,
            credit: l.credit || 0,
            solde: (l.debit || 0) - (l.credit || 0),
          });
        }
      }
      return {
        columns: [
          { key: 'date', label: 'Date', align: 'left', format: 'date' },
          { key: 'compte', label: 'Compte', align: 'left' },
          { key: 'libelle', label: 'Libellé', align: 'left' },
          { key: 'debit', label: 'Débit', align: 'right', format: 'currency' },
          { key: 'credit', label: 'Crédit', align: 'right', format: 'currency' },
          { key: 'solde', label: 'Solde', align: 'right', format: 'currency' },
        ],
        rows,
      };
    }

    case 'accounting.balance_clients':
    case 'accounting.balance_fournisseurs': {
      const prefix = source === 'accounting.balance_clients' ? '41' : '40';
      const balances = new Map<string, { label: string; debit: number; credit: number }>();
      for (const e of entries) {
        if (!inPeriod(e.date, period)) continue;
        for (const l of (e.lines || [])) {
          if (!l.accountCode?.startsWith(prefix)) continue;
          const code = l.accountCode;
          if (!balances.has(code)) balances.set(code, { label: l.accountName || code, debit: 0, credit: 0 });
          const b = balances.get(code)!;
          b.debit += l.debit || 0;
          b.credit += l.credit || 0;
        }
      }
      return {
        columns: [
          { key: 'compte', label: 'Compte', align: 'left' },
          { key: 'label', label: 'Libellé', align: 'left' },
          { key: 'debit', label: 'Débit', align: 'right', format: 'currency' },
          { key: 'credit', label: 'Crédit', align: 'right', format: 'currency' },
          { key: 'solde', label: 'Solde', align: 'right', format: 'currency' },
        ],
        rows: Array.from(balances.entries()).map(([code, b]) => ({
          compte: code,
          label: b.label,
          debit: b.debit,
          credit: b.credit,
          solde: b.debit - b.credit,
        })),
      };
    }

    case 'tiers.top_clients_ca':
    case 'tiers.top_fournisseurs': {
      const isClients = source === 'tiers.top_clients_ca';
      const prefix = isClients ? '41' : '40';
      const tot = new Map<string, { label: string; montant: number }>();
      for (const e of entries) {
        if (!inPeriod(e.date, period)) continue;
        for (const l of (e.lines || [])) {
          if (!l.accountCode?.startsWith(prefix)) continue;
          const code = l.accountCode;
          if (!tot.has(code)) tot.set(code, { label: l.accountName || code, montant: 0 });
          const t = tot.get(code)!;
          t.montant += isClients ? (l.debit || 0) : (l.credit || 0);
        }
      }
      const rows = Array.from(tot.entries())
        .map(([code, t]) => ({ compte: code, label: t.label, montant: t.montant }))
        .sort((a, b) => b.montant - a.montant)
        .slice(0, 20);
      return {
        columns: [
          { key: 'compte', label: 'Compte', align: 'left' },
          { key: 'label', label: 'Libellé', align: 'left' },
          { key: 'montant', label: 'Montant', align: 'right', format: 'currency' },
        ],
        rows,
      };
    }

    case 'tiers.aging_clients':
    case 'tiers.aging_fournisseurs':
    case 'tiers.creances_echues': {
      const isClients = source !== 'tiers.aging_fournisseurs';
      const prefix = isClients ? '41' : '40';
      const now = new Date(period.endDate).getTime();
      const buckets = { '0-30': 0, '30-60': 0, '60-90': 0, '>90': 0 };
      for (const e of entries) {
        if (!inPeriod(e.date, period)) continue;
        const age = (now - new Date(e.date || period.endDate).getTime()) / (1000 * 60 * 60 * 24);
        for (const l of (e.lines || [])) {
          if (!l.accountCode?.startsWith(prefix)) continue;
          if (lineLettrage(l)) continue; // ligne lettrée = soldée → exclue (cf. keystone getAgedReceivables)
          const montant = isClients ? (l.debit || 0) - (l.credit || 0) : (l.credit || 0) - (l.debit || 0);
          if (montant <= 0) continue;
          if (age <= 30) buckets['0-30'] += montant;
          else if (age <= 60) buckets['30-60'] += montant;
          else if (age <= 90) buckets['60-90'] += montant;
          else buckets['>90'] += montant;
        }
      }
      return {
        columns: [
          { key: 'tranche', label: 'Tranche', align: 'left' },
          { key: 'montant', label: 'Montant', align: 'right', format: 'currency' },
        ],
        rows: Object.entries(buckets).map(([tranche, montant]) => ({ tranche, montant })),
      };
    }

    case 'financial.sig': {
      // Soldes Intermédiaires de Gestion (OHADA, pragmatique)
      const ca = prodNet(entries, '70', period);
      const prodStockee = prodNet(entries, '72', period) + prodNet(entries, '73', period);
      const production = ca + prodStockee;
      const consommations = chargeNet(entries, '60', period) + chargeNet(entries, '61', period)
        + chargeNet(entries, '62', period) + chargeNet(entries, '63', period);
      const va = production - consommations;
      const subventions = prodNet(entries, '71', period) + prodNet(entries, '74', period);
      const ebe = va + subventions - chargeNet(entries, '64', period) - chargeNet(entries, '66', period);
      const autresProd = prodNet(entries, '75', period) + prodNet(entries, '78', period) + prodNet(entries, '79', period);
      const resultExpl = ebe + autresProd - chargeNet(entries, '65', period) - chargeNet(entries, '68', period);
      const resultFin = prodNet(entries, '77', period) - chargeNet(entries, '67', period);
      const rao = resultExpl + resultFin;
      const resultHAO = (prodNet(entries, '82', period) + prodNet(entries, '84', period) + prodNet(entries, '86', period) + prodNet(entries, '88', period))
        - (chargeNet(entries, '81', period) + chargeNet(entries, '83', period) + chargeNet(entries, '85', period));
      const impots = chargeNet(entries, '89', period) + chargeNet(entries, '69', period);
      const resultatNet = prodNet(entries, '7', period) - chargeNet(entries, '6', period) - chargeNet(entries, '89', period);
      const rows = [
        { solde: "Chiffre d'affaires", montant: ca },
        { solde: "Production de l'exercice", montant: production },
        { solde: 'Valeur Ajoutée (VA)', montant: va },
        { solde: "Excédent Brut d'Exploitation (EBE)", montant: ebe },
        { solde: "Résultat d'Exploitation", montant: resultExpl },
        { solde: 'Résultat Financier', montant: resultFin },
        { solde: 'Résultat des Activités Ordinaires', montant: rao },
        { solde: 'Résultat Hors Activités Ordinaires (HAO)', montant: resultHAO },
        { solde: 'Impôts (IS / IMF)', montant: -impots },
        { solde: 'RÉSULTAT NET', montant: resultatNet },
      ];
      return {
        columns: [
          { key: 'solde', label: 'Solde Intermédiaire', align: 'left' },
          { key: 'montant', label: 'Montant', align: 'right', format: 'currency' },
        ],
        rows,
      };
    }

    case 'financial.tafire':
    case 'financial.tft_indirect': {
      // TFT méthode indirecte : CAF → Variation BFR → 3 flux → Variation nette
      const resultatNet = prodNet(entries, '7', period) - chargeNet(entries, '6', period) - chargeNet(entries, '89', period);
      const dotations = chargeNet(entries, '68', period) + chargeNet(entries, '69', period);
      const reprises = prodNet(entries, '78', period) + prodNet(entries, '79', period);
      const caf = resultatNet + dotations - reprises;
      // Variation BFR (approchée sur la période)
      let bfrVar = 0;
      for (const e of entries) {
        if (!inPeriod(e.date, period)) continue;
        for (const l of (e.lines || [])) {
          const code = l.accountCode || '';
          if (code.startsWith('3') || code.startsWith('41') || code.startsWith('46')) bfrVar += (l.debit || 0) - (l.credit || 0);
          if (code.startsWith('40') || code.startsWith('42') || code.startsWith('43') || code.startsWith('44')) bfrVar -= (l.credit || 0) - (l.debit || 0);
        }
      }
      const fluxExploitation = caf - bfrVar;
      const acquisitions = sumByClass(entries, '2', period, 'debit') - sumByClass(entries, '2', period, 'credit');
      const fluxInvestissement = -acquisitions;
      const fluxFinancement = prodNet(entries, '10', period) + prodNet(entries, '13', period) + prodNet(entries, '16', period);
      const variation = fluxExploitation + fluxInvestissement + fluxFinancement;
      const rows = [
        { poste: 'Résultat Net', montant: resultatNet },
        { poste: '+ Dotations aux amortissements & provisions', montant: dotations },
        { poste: '− Reprises de provisions', montant: -reprises },
        { poste: '= Capacité d\'Autofinancement (CAF)', montant: caf },
        { poste: '− Variation du BFR', montant: -bfrVar },
        { poste: 'Flux de trésorerie d\'EXPLOITATION (A)', montant: fluxExploitation },
        { poste: 'Flux de trésorerie d\'INVESTISSEMENT (B)', montant: fluxInvestissement },
        { poste: 'Flux de trésorerie de FINANCEMENT (C)', montant: fluxFinancement },
        { poste: 'VARIATION NETTE DE TRÉSORERIE (A+B+C)', montant: variation },
      ];
      return {
        columns: [
          { key: 'poste', label: 'Poste', align: 'left' },
          { key: 'montant', label: 'Montant', align: 'right', format: 'currency' },
        ],
        rows,
      };
    }

    case 'financial.tft_direct': {
      // Méthode directe : encaissements clients / décaissements par nature
      const encaissementsClients = sumByClass(entries, '70', period, 'net') + sumByClass(entries, '71', period, 'net');
      const decaissFournisseurs = chargeNet(entries, '60', period) + chargeNet(entries, '61', period) + chargeNet(entries, '62', period) + chargeNet(entries, '63', period);
      const decaissPersonnel = chargeNet(entries, '66', period);
      const decaissImpots = chargeNet(entries, '64', period) + chargeNet(entries, '89', period) + chargeNet(entries, '69', period);
      const decaissFinancier = chargeNet(entries, '67', period);
      const fluxExploitation = encaissementsClients - decaissFournisseurs - decaissPersonnel - decaissImpots - decaissFinancier;
      const rows = [
        { poste: 'Encaissements reçus des clients', montant: encaissementsClients },
        { poste: 'Décaissements fournisseurs', montant: -decaissFournisseurs },
        { poste: 'Décaissements personnel', montant: -decaissPersonnel },
        { poste: 'Impôts & taxes décaissés', montant: -decaissImpots },
        { poste: 'Intérêts & frais financiers', montant: -decaissFinancier },
        { poste: 'Flux net de trésorerie d\'exploitation', montant: fluxExploitation },
      ];
      return {
        columns: [
          { key: 'poste', label: 'Flux (méthode directe)', align: 'left' },
          { key: 'montant', label: 'Montant', align: 'right', format: 'currency' },
        ],
        rows,
      };
    }

    case 'tax.tva_declaration': {
      const collecteePos = sumByClass(entries, '443', period, 'credit') - sumByClass(entries, '443', period, 'debit');
      const deductible = sumByClass(entries, '445', period, 'debit') - sumByClass(entries, '445', period, 'credit');
      const aPayer = collecteePos - deductible;
      const rows = [
        { poste: 'TVA collectée (443)', montant: collecteePos },
        { poste: 'TVA déductible (445)', montant: deductible },
        { poste: aPayer >= 0 ? 'TVA nette à payer' : 'Crédit de TVA', montant: aPayer },
      ];
      return {
        columns: [
          { key: 'poste', label: 'Poste TVA', align: 'left' },
          { key: 'montant', label: 'Montant', align: 'right', format: 'currency' },
        ],
        rows,
      };
    }

    case 'tax.tva_mensuelle': {
      const months = getMonthsInPeriod(period);
      const rows = months.map(m => {
        let collectee = 0, deductible = 0;
        for (const e of entries) {
          if (!e.date || !e.date.startsWith(m.prefix)) continue;
          for (const l of (e.lines || [])) {
            const code = l.accountCode || '';
            if (code.startsWith('443')) collectee += (l.credit || 0) - (l.debit || 0);
            if (code.startsWith('445')) deductible += (l.debit || 0) - (l.credit || 0);
          }
        }
        return { mois: m.label, collectee, deductible, net: collectee - deductible };
      });
      return {
        columns: [
          { key: 'mois', label: 'Mois', align: 'left' },
          { key: 'collectee', label: 'TVA collectée', align: 'right', format: 'currency' },
          { key: 'deductible', label: 'TVA déductible', align: 'right', format: 'currency' },
          { key: 'net', label: 'TVA nette', align: 'right', format: 'currency' },
        ],
        rows,
      };
    }

    case 'tax.is_acomptes': {
      const resultat = prodNet(entries, '7', period) - chargeNet(entries, '6', period);
      const isComptabilise = chargeNet(entries, '89', period) + chargeNet(entries, '69', period);
      const isTheorique = Math.max(0, resultat * 0.25);
      const rows = [
        { poste: 'Résultat avant impôt', montant: resultat },
        { poste: 'IS théorique (25%)', montant: isTheorique },
        { poste: 'IS / IMF comptabilisé (classe 89)', montant: isComptabilise },
        { poste: 'Écart à régulariser', montant: isTheorique - isComptabilise },
      ];
      return {
        columns: [
          { key: 'poste', label: 'Impôt sur les sociétés', align: 'left' },
          { key: 'montant', label: 'Montant', align: 'right', format: 'currency' },
        ],
        rows,
      };
    }

    case 'fiscal.echeancier': {
      // Calendrier fiscal SYSCOHADA / DGI Côte d'Ivoire (référence déterministe)
      const rows = [
        { echeance: '10 du mois', obligation: 'TVA mensuelle (régime réel)', periodicite: 'Mensuelle' },
        { echeance: '15 du mois', obligation: 'Impôt sur salaires / ITS', periodicite: 'Mensuelle' },
        { echeance: '15 du mois', obligation: 'Cotisations CNPS', periodicite: 'Mensuelle' },
        { echeance: '20 avril', obligation: '1er acompte IS', periodicite: 'Trimestrielle' },
        { echeance: '20 juin', obligation: '2e acompte IS', periodicite: 'Trimestrielle' },
        { echeance: '20 septembre', obligation: '3e acompte IS', periodicite: 'Trimestrielle' },
        { echeance: '20 décembre', obligation: '4e acompte IS', periodicite: 'Trimestrielle' },
        { echeance: '30 avril', obligation: 'Déclaration fiscale annuelle (DSF)', periodicite: 'Annuelle' },
        { echeance: '30 mai', obligation: 'Solde IS', periodicite: 'Annuelle' },
      ];
      return {
        columns: [
          { key: 'echeance', label: 'Échéance', align: 'left' },
          { key: 'obligation', label: 'Obligation fiscale', align: 'left' },
          { key: 'periodicite', label: 'Périodicité', align: 'center' },
        ],
        rows,
      };
    }

    case 'audit.trail': {
      const rows = entries
        .filter(e => inPeriod(e.date, period))
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
        .slice(0, 200)
        .map(e => ({
          date: e.date || '',
          numero: e.entryNumber || '',
          journal: e.journal || '',
          libelle: e.label || '',
          montant: e.totalDebit || 0,
          statut: e.status === 'validated' || e.status === 'posted' ? 'Validée' : (e.status || '—'),
          hash: ((e as any).hash || (e as any).integrity_hash || '').toString().slice(0, 12) || '—',
        }));
      return {
        columns: [
          { key: 'date', label: 'Date', align: 'left', format: 'date' },
          { key: 'numero', label: 'N° Pièce', align: 'left' },
          { key: 'journal', label: 'Journal', align: 'center' },
          { key: 'libelle', label: 'Libellé', align: 'left' },
          { key: 'montant', label: 'Montant', align: 'right', format: 'currency' },
          { key: 'statut', label: 'Statut', align: 'center' },
          { key: 'hash', label: 'Hash', align: 'left' },
        ],
        rows,
      };
    }

    case 'audit.controles_syscohada': {
      // Contrôles réels d'équilibre et de cohérence sur la période
      let totalDebit = 0, totalCredit = 0, nbDesequilibrees = 0, nbSansLignes = 0;
      const inP = entries.filter(e => inPeriod(e.date, period));
      for (const e of inP) {
        let d = 0, c = 0;
        for (const l of (e.lines || [])) { d += l.debit || 0; c += l.credit || 0; }
        totalDebit += d; totalCredit += c;
        if (Math.abs(d - c) > 0.5) nbDesequilibrees++;
        if (!(e.lines || []).length) nbSansLignes++;
      }
      const ok = (b: boolean) => b ? '✓ Conforme' : '✗ Anomalie';
      const rows = [
        { controle: 'Équilibre global Débit = Crédit', resultat: ok(Math.abs(totalDebit - totalCredit) < 1), detail: `Δ ${Math.round(totalDebit - totalCredit)}` },
        { controle: 'Écritures équilibrées (par pièce)', resultat: ok(nbDesequilibrees === 0), detail: `${nbDesequilibrees} déséquilibrée(s)` },
        { controle: 'Écritures avec lignes', resultat: ok(nbSansLignes === 0), detail: `${nbSansLignes} sans ligne` },
        { controle: 'Écritures validées uniquement', resultat: ok(inP.every(e => e.status === 'validated')), detail: `${inP.length} écriture(s)` },
      ];
      return {
        columns: [
          { key: 'controle', label: 'Contrôle', align: 'left' },
          { key: 'resultat', label: 'Résultat', align: 'center' },
          { key: 'detail', label: 'Détail', align: 'right' },
        ],
        rows,
      };
    }

    case 'audit.evolution_comptes': {
      // Évolution mensuelle des comptes sensibles (trésorerie 5, clients 41, fournisseurs 40)
      const months = getMonthsInPeriod(period);
      const rows = months.map(m => {
        let treso = 0, clients = 0, fourn = 0;
        for (const e of entries) {
          if (!e.date || !e.date.startsWith(m.prefix)) continue;
          for (const l of (e.lines || [])) {
            const code = l.accountCode || '';
            if (code.startsWith('5')) treso += (l.debit || 0) - (l.credit || 0);
            if (code.startsWith('41')) clients += (l.debit || 0) - (l.credit || 0);
            if (code.startsWith('40')) fourn += (l.credit || 0) - (l.debit || 0);
          }
        }
        return { mois: m.label, treso, clients, fourn };
      });
      return {
        columns: [
          { key: 'mois', label: 'Mois', align: 'left' },
          { key: 'treso', label: 'Trésorerie (5)', align: 'right', format: 'currency' },
          { key: 'clients', label: 'Clients (41)', align: 'right', format: 'currency' },
          { key: 'fourn', label: 'Fournisseurs (40)', align: 'right', format: 'currency' },
        ],
        rows,
      };
    }

    case 'accounting.lettrage': {
      // Synthèse par compte auxiliaire : lignes lettrées / non lettrées
      const acc = new Map<string, { label: string; total: number; lettrees: number; nonLettrees: number }>();
      for (const e of entries) {
        if (!inPeriod(e.date, period)) continue;
        for (const l of (e.lines || [])) {
          const code = l.accountCode || '';
          if (!code.startsWith('40') && !code.startsWith('41')) continue;
          if (!acc.has(code)) acc.set(code, { label: l.accountName || code, total: 0, lettrees: 0, nonLettrees: 0 });
          const a = acc.get(code)!;
          a.total++;
          if (lineLettrage(l)) a.lettrees++; else a.nonLettrees++;
        }
      }
      const rows = Array.from(acc.entries()).sort(([x], [y]) => x.localeCompare(y)).map(([code, a]) => ({
        compte: code, label: a.label, total: a.total, lettrees: a.lettrees, nonLettrees: a.nonLettrees,
        taux: a.total ? Math.round((a.lettrees / a.total) * 100) : 0,
      }));
      return {
        columns: [
          { key: 'compte', label: 'Compte', align: 'left' },
          { key: 'label', label: 'Libellé', align: 'left' },
          { key: 'total', label: 'Lignes', align: 'right', format: 'number' },
          { key: 'lettrees', label: 'Lettrées', align: 'right', format: 'number' },
          { key: 'nonLettrees', label: 'Non lettrées', align: 'right', format: 'number' },
          { key: 'taux', label: 'Taux %', align: 'right', format: 'number' },
        ],
        rows,
      };
    }

    case 'accounting.ecritures_non_lettrees': {
      const rows: Record<string, string | number | null>[] = [];
      for (const e of entries) {
        if (!inPeriod(e.date, period)) continue;
        for (const l of (e.lines || [])) {
          const code = l.accountCode || '';
          if (!code.startsWith('40') && !code.startsWith('41')) continue;
          if (lineLettrage(l)) continue;
          rows.push({
            date: e.date || '',
            compte: code,
            tiers: l.thirdPartyName || '',
            libelle: l.label || e.label || '',
            debit: l.debit || 0,
            credit: l.credit || 0,
          });
        }
      }
      return {
        columns: [
          { key: 'date', label: 'Date', align: 'left', format: 'date' },
          { key: 'compte', label: 'Compte', align: 'left' },
          { key: 'tiers', label: 'Tiers', align: 'left' },
          { key: 'libelle', label: 'Libellé', align: 'left' },
          { key: 'debit', label: 'Débit', align: 'right', format: 'currency' },
          { key: 'credit', label: 'Crédit', align: 'right', format: 'currency' },
        ],
        rows,
      };
    }

    case 'treasury.comptes_bancaires':
    case 'treasury.reconciliation': {
      // Soldes comptables par compte de trésorerie (classe 5)
      const acc = new Map<string, { label: string; debit: number; credit: number }>();
      for (const e of entries) {
        if (!inPeriod(e.date, period)) continue;
        for (const l of (e.lines || [])) {
          const code = l.accountCode || '';
          if (!code.startsWith('5')) continue;
          if (!acc.has(code)) acc.set(code, { label: l.accountName || code, debit: 0, credit: 0 });
          const a = acc.get(code)!;
          a.debit += l.debit || 0;
          a.credit += l.credit || 0;
        }
      }
      const rows = Array.from(acc.entries()).sort(([x], [y]) => x.localeCompare(y)).map(([code, a]) => ({
        compte: code, label: a.label, debit: a.debit, credit: a.credit, solde: a.debit - a.credit,
      }));
      return {
        columns: [
          { key: 'compte', label: 'Compte', align: 'left' },
          { key: 'label', label: 'Banque / Caisse', align: 'left' },
          { key: 'debit', label: 'Entrées', align: 'right', format: 'currency' },
          { key: 'credit', label: 'Sorties', align: 'right', format: 'currency' },
          { key: 'solde', label: 'Solde comptable', align: 'right', format: 'currency' },
        ],
        rows,
      };
    }

    case 'treasury.previsions_cash': {
      // Projection 12 mois à partir du flux net mensuel moyen (classe 5, hors AN)
      let netFlow = 0; const monthsSet = new Set<string>();
      for (const e of entries) {
        if (e.journal === 'AN' || e.journal === 'RAN') continue;
        for (const l of (e.lines || [])) {
          if (l.accountCode?.startsWith('5')) netFlow += (l.debit || 0) - (l.credit || 0);
        }
        if (e.date) monthsSet.add(e.date.slice(0, 7));
      }
      const nbMonths = Math.max(1, monthsSet.size);
      const avgMonthly = netFlow / nbMonths;
      let soldeActuel = 0;
      for (const e of entries) {
        for (const l of (e.lines || [])) {
          if (l.accountCode?.startsWith('5')) soldeActuel += (l.debit || 0) - (l.credit || 0);
        }
      }
      const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
      const startM = new Date(period.endDate).getMonth();
      const rows: Record<string, string | number | null>[] = [];
      let cumul = soldeActuel;
      for (let i = 1; i <= 12; i++) {
        cumul += avgMonthly;
        rows.push({ mois: `M+${i} (${monthNames[(startM + i) % 12]})`, flux: Math.round(avgMonthly), soldeProjete: Math.round(cumul) });
      }
      return {
        columns: [
          { key: 'mois', label: 'Mois', align: 'left' },
          { key: 'flux', label: 'Flux net prévu', align: 'right', format: 'currency' },
          { key: 'soldeProjete', label: 'Solde projeté', align: 'right', format: 'currency' },
        ],
        rows,
      };
    }

    case 'analytics.by_center':
    case 'analytics.sections_performance': {
      // Résultat par code analytique (réel, depuis analytical_code des lignes)
      const centers = new Map<string, { produits: number; charges: number }>();
      for (const e of entries) {
        if (!inPeriod(e.date, period)) continue;
        for (const l of (e.lines || [])) {
          const ax = lineAnalytical(l);
          if (!ax) continue;
          const code = l.accountCode || '';
          if (!centers.has(ax)) centers.set(ax, { produits: 0, charges: 0 });
          const c = centers.get(ax)!;
          if (code.startsWith('7')) c.produits += (l.credit || 0) - (l.debit || 0);
          if (code.startsWith('6')) c.charges += (l.debit || 0) - (l.credit || 0);
        }
      }
      const rows = Array.from(centers.entries()).map(([ax, c]) => ({
        centre: ax, produits: c.produits, charges: c.charges, resultat: c.produits - c.charges,
        marge: c.produits ? Math.round(((c.produits - c.charges) / c.produits) * 100) : 0,
      })).sort((a, b) => b.resultat - a.resultat);
      if (rows.length === 0) {
        return {
          columns: [{ key: 'info', label: 'Information', align: 'left' }],
          rows: [{ info: 'Aucun code analytique renseigné sur les écritures de la période.' }],
        };
      }
      return {
        columns: [
          { key: 'centre', label: 'Centre / Section', align: 'left' },
          { key: 'produits', label: 'Produits', align: 'right', format: 'currency' },
          { key: 'charges', label: 'Charges', align: 'right', format: 'currency' },
          { key: 'resultat', label: 'Résultat', align: 'right', format: 'currency' },
          { key: 'marge', label: 'Marge %', align: 'right', format: 'number' },
        ],
        rows,
      };
    }

    case 'budget.execution': {
      // Exécution budgétaire (refonte OPEX/CAPEX) : Budget / Engagé / Réalisé /
      // Disponible par classe, depuis la vue d'équation v_budget_execution.
      const client = (adapter as any).client;
      if (client) {
        try {
          const rows0 = await fetchAllRows(() => client.from('v_budget_execution').select('account_code,budget,engage,realise,disponible'), 'account_code');
          const byNat = new Map<string, { code: string; budget: number; engage: number; realise: number; disponible: number }>();
          for (const r of (rows0 || [])) {
            const code = String(r.account_code || '').slice(0, 2);
            if (!byNat.has(code)) byNat.set(code, { code, budget: 0, engage: 0, realise: 0, disponible: 0 });
            const n = byNat.get(code)!;
            n.budget += Number(r.budget) || 0; n.engage += Number(r.engage) || 0;
            n.realise += Number(r.realise) || 0; n.disponible += Number(r.disponible) || 0;
          }
          const rows = Array.from(byNat.values()).map(n => ({
            poste: `${n.code} — ${getClassLabel(n.code)}`,
            budget: n.budget, engage: n.engage, realise: n.realise, disponible: n.disponible,
          })).sort((a, b) => (b.budget + b.realise) - (a.budget + a.realise));
          return {
            columns: [
              { key: 'poste', label: 'Poste', align: 'left' },
              { key: 'budget', label: 'Budget', align: 'right', format: 'currency' },
              { key: 'engage', label: 'Engagé', align: 'right', format: 'currency' },
              { key: 'realise', label: 'Réalisé', align: 'right', format: 'currency' },
              { key: 'disponible', label: 'Disponible', align: 'right', format: 'currency' },
            ],
            rows,
          };
        } catch { /* vue absente → tableau vide honnête */ }
      }
      return {
        columns: [
          { key: 'poste', label: 'Poste', align: 'left' },
          { key: 'budget', label: 'Budget', align: 'right', format: 'currency' },
          { key: 'engage', label: 'Engagé', align: 'right', format: 'currency' },
          { key: 'realise', label: 'Réalisé', align: 'right', format: 'currency' },
          { key: 'disponible', label: 'Disponible', align: 'right', format: 'currency' },
        ],
        rows: [],
      };
    }
    case 'budget.vs_actual':
    case 'budget.ecarts_significatifs': {
      // Priorité : vue live v_budget_vs_actual (module Budget V3). Repli sur le
      // calcul GL ci-dessous si la vue est absente ou vide.
      try {
        const client = (adapter as any).client;
        if (client) {
          const bva = await fetchAllRows(() => client.from('v_budget_vs_actual').select('*'), 'account_code');
          if (Array.isArray(bva) && bva.length > 0) {
            const byNat = new Map<string, { code: string; budget: number; realise: number }>();
            for (const r of bva) {
              const code = String(r.account_code || '').slice(0, 2);
              if (!byNat.has(code)) byNat.set(code, { code, budget: 0, realise: 0 });
              const n = byNat.get(code)!;
              n.budget += Number(r.budget) || 0;
              n.realise += Number(r.realise) || 0;
            }
            let rows = Array.from(byNat.values()).map(n => ({
              poste: `${n.code} — ${getClassLabel(n.code)}`,
              budget: n.budget, reel: n.realise, ecart: n.realise - n.budget,
              ecartPct: n.budget ? Math.round(((n.realise - n.budget) / Math.abs(n.budget)) * 100) : 0,
            })).sort((a, b) => Math.abs(b.ecart) - Math.abs(a.ecart));
            if (source === 'budget.ecarts_significatifs') rows = rows.filter(r => Math.abs(r.ecartPct) > 10);
            return {
              columns: [
                { key: 'poste', label: 'Poste', align: 'left' },
                { key: 'budget', label: 'Budget', align: 'right', format: 'currency' },
                { key: 'reel', label: 'Réel', align: 'right', format: 'currency' },
                { key: 'ecart', label: 'Écart', align: 'right', format: 'currency' },
                { key: 'ecartPct', label: 'Écart %', align: 'right', format: 'number' },
              ],
              rows,
            };
          }
        }
      } catch { /* vue absente → repli GL ci-dessous */ }
      const budgetLines = await loadAux('budgetLines');
      const months = getMonthsInPeriod(period);
      // Réel par classe 6 (charges) sur la période
      const realByClass = new Map<string, number>();
      for (const e of entries) {
        if (!inPeriod(e.date, period)) continue;
        for (const l of (e.lines || [])) {
          const code = l.accountCode || '';
          if (!code.startsWith('6')) continue;
          const cls = code.slice(0, 2);
          realByClass.set(cls, (realByClass.get(cls) || 0) + ((l.debit || 0) - (l.credit || 0)));
        }
      }
      // Budget par classe (si budget_lines présent), sinon N-1 comme référence
      const prev = previousPeriod(period);
      const budgetByClass = new Map<string, number>();
      if (budgetLines.length > 0) {
        for (const b of budgetLines) {
          const code = (b.account_code || b.accountCode || '').toString();
          const amount = Number(b.amount ?? b.montant ?? b.budget ?? 0);
          if (!code.startsWith('6')) continue;
          const cls = code.slice(0, 2);
          budgetByClass.set(cls, (budgetByClass.get(cls) || 0) + amount);
        }
      } else {
        for (const e of entries) {
          if (!inPeriod(e.date, prev)) continue;
          for (const l of (e.lines || [])) {
            const code = l.accountCode || '';
            if (!code.startsWith('6')) continue;
            const cls = code.slice(0, 2);
            budgetByClass.set(cls, (budgetByClass.get(cls) || 0) + ((l.debit || 0) - (l.credit || 0)));
          }
        }
      }
      const refLabel = budgetLines.length > 0 ? 'Budget' : 'Référence (N-1)';
      let rows = Array.from(new Set([...realByClass.keys(), ...budgetByClass.keys()])).sort().map(cls => {
        const reel = realByClass.get(cls) || 0;
        const budget = budgetByClass.get(cls) || 0;
        const ecart = reel - budget;
        return { classe: cls, label: getClassLabel(cls), budget, reel, ecart, ecartPct: budget ? Math.round((ecart / budget) * 100) : 0 };
      });
      void months;
      if (source === 'budget.ecarts_significatifs') {
        rows = rows.filter(r => Math.abs(r.ecartPct) > 10);
      }
      return {
        columns: [
          { key: 'label', label: 'Poste', align: 'left' },
          { key: 'budget', label: refLabel, align: 'right', format: 'currency' },
          { key: 'reel', label: 'Réel', align: 'right', format: 'currency' },
          { key: 'ecart', label: 'Écart', align: 'right', format: 'currency' },
          { key: 'ecartPct', label: 'Écart %', align: 'right', format: 'number' },
        ],
        rows,
      };
    }

    case 'assets.registry': {
      const assets = await loadAux('assets');
      const rows = assets
        .filter(a => !a.is_component && !a.isComponent && !a.date_sortie && !a.dateSortie)
        .map(a => {
          const brut = Number(a.acquisitionValue ?? a.acquisition_value ?? 0);
          const amort = Number(a.cumulDepreciation ?? a.cumul_depreciation ?? 0);
          return {
            code: a.code || a.account_code || a.accountCode || a.id,
            label: a.label || a.name || a.designation || '—',
            classe: (a.accountCode || a.account_code || '').toString().slice(0, 2),
            brut,
            amort,
            vnc: brut - amort,
          };
        });
      return {
        columns: [
          { key: 'code', label: 'Code', align: 'left' },
          { key: 'label', label: 'Désignation', align: 'left' },
          { key: 'classe', label: 'Classe', align: 'center' },
          { key: 'brut', label: 'Valeur brute', align: 'right', format: 'currency' },
          { key: 'amort', label: 'Amort. cumulé', align: 'right', format: 'currency' },
          { key: 'vnc', label: 'VNC', align: 'right', format: 'currency' },
        ],
        rows,
      };
    }

    case 'assets.depreciation': {
      const assets = await loadAux('assets');
      const rows = assets
        .filter(a => !a.is_component && !a.isComponent)
        .map(a => {
          const brut = Number(a.acquisitionValue ?? a.acquisition_value ?? 0);
          const amort = Number(a.cumulDepreciation ?? a.cumul_depreciation ?? 0);
          const duree = Number(a.usefulLife ?? a.useful_life_years ?? 0);
          const dotation = duree > 0 ? brut / duree : 0;
          return {
            code: a.code || a.account_code || a.id,
            label: a.label || a.name || '—',
            brut,
            duree,
            dotation: Math.round(dotation),
            amort,
            vnc: brut - amort,
          };
        });
      return {
        columns: [
          { key: 'code', label: 'Code', align: 'left' },
          { key: 'label', label: 'Désignation', align: 'left' },
          { key: 'brut', label: 'Base', align: 'right', format: 'currency' },
          { key: 'duree', label: 'Durée (ans)', align: 'right', format: 'number' },
          { key: 'dotation', label: 'Dotation annuelle', align: 'right', format: 'currency' },
          { key: 'amort', label: 'Amort. cumulé', align: 'right', format: 'currency' },
          { key: 'vnc', label: 'VNC', align: 'right', format: 'currency' },
        ],
        rows,
      };
    }

    case 'assets.cessions': {
      const assets = await loadAux('assets');
      const rows = assets
        .filter(a => a.date_sortie || a.dateSortie)
        .map(a => {
          const brut = Number(a.acquisitionValue ?? a.acquisition_value ?? 0);
          const amort = Number(a.cumulDepreciation ?? a.cumul_depreciation ?? 0);
          const vnc = brut - amort;
          const prix = Number(a.prix_cession ?? a.prixCession ?? a.sale_value ?? 0);
          return {
            code: a.code || a.id,
            label: a.label || a.name || '—',
            dateSortie: a.date_sortie || a.dateSortie || '',
            vnc,
            prix,
            plusValue: prix - vnc,
          };
        });
      return {
        columns: [
          { key: 'code', label: 'Code', align: 'left' },
          { key: 'label', label: 'Désignation', align: 'left' },
          { key: 'dateSortie', label: 'Date sortie', align: 'left', format: 'date' },
          { key: 'vnc', label: 'VNC à la cession', align: 'right', format: 'currency' },
          { key: 'prix', label: 'Prix de cession', align: 'right', format: 'currency' },
          { key: 'plusValue', label: '+/- Value', align: 'right', format: 'currency' },
        ],
        rows,
      };
    }

    case 'assets.composants': {
      const assets = await loadAux('assets');
      const rows = assets
        .filter(a => a.is_component || a.isComponent)
        .map(a => {
          const brut = Number(a.acquisitionValue ?? a.acquisition_value ?? 0);
          const amort = Number(a.cumulDepreciation ?? a.cumul_depreciation ?? 0);
          return {
            code: a.code || a.id,
            label: a.label || a.name || '—',
            parent: a.parent_id || a.parentId || a.parent_code || '—',
            brut,
            vnc: brut - amort,
          };
        });
      return {
        columns: [
          { key: 'code', label: 'Composant', align: 'left' },
          { key: 'label', label: 'Désignation', align: 'left' },
          { key: 'parent', label: 'Bien parent', align: 'left' },
          { key: 'brut', label: 'Valeur brute', align: 'right', format: 'currency' },
          { key: 'vnc', label: 'VNC', align: 'right', format: 'currency' },
        ],
        rows,
      };
    }

    case 'payroll.bulletins': {
      // Masse salariale par tiers personnel (classe 66 / comptes 42) — réel GL
      const byTiers = new Map<string, { name: string; montant: number }>();
      for (const e of entries) {
        if (!inPeriod(e.date, period)) continue;
        for (const l of (e.lines || [])) {
          const code = l.accountCode || '';
          if (!code.startsWith('66') && !code.startsWith('42')) continue;
          const key = l.thirdPartyName || l.thirdPartyCode || code;
          if (!byTiers.has(key)) byTiers.set(key, { name: l.thirdPartyName || key, montant: 0 });
          byTiers.get(key)!.montant += (l.debit || 0);
        }
      }
      const rows = Array.from(byTiers.values()).filter(r => r.montant > 0).sort((a, b) => b.montant - a.montant)
        .map(r => ({ salarie: r.name, montant: r.montant }));
      if (rows.length === 0) {
        return { columns: [{ key: 'info', label: 'Information', align: 'left' }], rows: [{ info: 'Aucune charge de personnel (classe 66/42) sur la période.' }] };
      }
      return {
        columns: [
          { key: 'salarie', label: 'Salarié / Tiers', align: 'left' },
          { key: 'montant', label: 'Montant', align: 'right', format: 'currency' },
        ],
        rows,
      };
    }

    case 'inventory.mouvements': {
      // Nouveau socle Stock (SAP MM) : documents + lignes de mouvement.
      const [docs, lines, materials] = await Promise.all([
        loadAux('stockDocuments'), loadAux('stockDocumentLines'), loadAux('stockMaterials'),
      ]);
      if (docs.length === 0) {
        return { columns: [{ key: 'info', label: 'Information', align: 'left' }], rows: [{ info: 'Aucun mouvement de stock enregistré.' }] };
      }
      const docById = new Map(docs.map(d => [d.id, d]));
      const matById = new Map(materials.map(m => [m.id, m]));
      const rows = lines
        .map(l => ({ l, d: docById.get(l.documentId) }))
        .filter((x): x is { l: Record<string, any>; d: Record<string, any> } => {
          if (!x.d) return false;
          const dt = x.d.docDate || '';
          return !dt || (dt >= period.startDate && dt <= period.endDate);
        })
        .slice(0, 500)
        .map(({ l, d }) => {
          const m = matById.get(l.materialId);
          return {
            date: d.docDate || '',
            document: d.docNumber || '—',
            article: m ? `${m.code} — ${m.name}` : (l.materialId || '—'),
            type: d.movementTypeCode || '—',
            sens: l.direction === 'in' ? 'Entrée' : 'Sortie',
            quantite: Number(l.quantity ?? 0),
            valeur: Number(l.amount ?? 0),
          };
        });
      return {
        columns: [
          { key: 'date', label: 'Date', align: 'left', format: 'date' },
          { key: 'document', label: 'Document', align: 'left' },
          { key: 'article', label: 'Article', align: 'left' },
          { key: 'type', label: 'Type', align: 'center' },
          { key: 'sens', label: 'Sens', align: 'center' },
          { key: 'quantite', label: 'Quantité', align: 'right', format: 'number' },
          { key: 'valeur', label: 'Valeur', align: 'right', format: 'currency' },
        ],
        rows,
      };
    }

    case 'stock.valorisation': {
      const [quants, materials] = await Promise.all([loadAux('stockQuants'), loadAux('stockMaterials')]);
      const matById = new Map(materials.map(m => [m.id, m]));
      const agg = new Map<string, { qty: number; value: number }>();
      for (const q of quants) {
        if ((q.stockStatus ?? 'libre') !== 'libre') continue;
        const a = agg.get(q.materialId) || { qty: 0, value: 0 };
        a.qty += Number(q.quantity) || 0; a.value += Number(q.value) || 0;
        agg.set(q.materialId, a);
      }
      const rows = Array.from(agg.entries()).map(([id, a]) => {
        const m = matById.get(id);
        return { article: m ? `${m.code} — ${m.name}` : id, methode: m?.valuationMethod || '—', quantite: a.qty, valeur: a.value };
      }).filter(r => r.valeur !== 0).sort((a, b) => b.valeur - a.valeur);
      if (rows.length === 0) return { columns: [{ key: 'info', label: 'Information', align: 'left' }], rows: [{ info: 'Aucun stock valorisé.' }] };
      return {
        columns: [
          { key: 'article', label: 'Article', align: 'left' },
          { key: 'methode', label: 'Méthode', align: 'center' },
          { key: 'quantite', label: 'Quantité', align: 'right', format: 'number' },
          { key: 'valeur', label: 'Valeur', align: 'right', format: 'currency' },
        ],
        rows,
      };
    }

    case 'stock.abc': {
      const [quants, materials] = await Promise.all([loadAux('stockQuants'), loadAux('stockMaterials')]);
      const matById = new Map(materials.map(m => [m.id, m]));
      const agg = new Map<string, number>();
      for (const q of quants) {
        if ((q.stockStatus ?? 'libre') !== 'libre') continue;
        agg.set(q.materialId, (agg.get(q.materialId) || 0) + (Number(q.value) || 0));
      }
      const sorted = Array.from(agg.entries()).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
      const total = sorted.reduce((s, [, v]) => s + v, 0);
      let cum = 0;
      const rows = sorted.map(([id, v]) => {
        const share = total > 0 ? (v / total) * 100 : 0; cum += share;
        const classe = cum <= 80 ? 'A' : cum <= 95 ? 'B' : 'C';
        const m = matById.get(id);
        return { classe, article: m ? `${m.code} — ${m.name}` : id, valeur: v, cumul: Number(cum.toFixed(1)) };
      });
      if (rows.length === 0) return { columns: [{ key: 'info', label: 'Information', align: 'left' }], rows: [{ info: 'Aucun stock à analyser.' }] };
      return {
        columns: [
          { key: 'classe', label: 'Classe', align: 'center' },
          { key: 'article', label: 'Article', align: 'left' },
          { key: 'valeur', label: 'Valeur', align: 'right', format: 'currency' },
          { key: 'cumul', label: '% cumulé', align: 'right', format: 'number' },
        ],
        rows,
      };
    }

    case 'budget.capex': {
      // CAPEX : budget vs réalisé (classe 2) depuis les vues live
      const client = (adapter as any).client;
      if (!client) return { columns: [{ key: 'info', label: 'Information', align: 'left' }], rows: [{ info: 'Module Budget indisponible.' }] };
      const annee = String(new Date(period.endDate).getFullYear());
      const [inv, bva] = await Promise.all([
        fetchAllRows(() => client.from('v_actual_investment').select('account_code,account_name,montant_realise').eq('annee', annee), 'account_code'),
        fetchAllRows(() => client.from('v_budget_vs_actual').select('account_code,budget').eq('budget_type', 'investissement'), 'account_code'),
      ]);
      const map = new Map<string, { code: string; label: string; realise: number; budget: number }>();
      for (const r of (inv || [])) { const c = String(r.account_code); if (!map.has(c)) map.set(c, { code: c, label: r.account_name || c, realise: 0, budget: 0 }); map.get(c)!.realise += Number(r.montant_realise) || 0; }
      for (const r of (bva || [])) { const c = String(r.account_code); if (!map.has(c)) map.set(c, { code: c, label: c, realise: 0, budget: 0 }); map.get(c)!.budget += Number(r.budget) || 0; }
      const rows = Array.from(map.values()).map(m => ({ compte: m.code, label: m.label, budget: m.budget, realise: m.realise, reste: Math.max(0, m.budget - m.realise) })).sort((a, b) => b.realise - a.realise);
      return {
        columns: [
          { key: 'compte', label: 'Compte', align: 'left' },
          { key: 'label', label: 'Désignation', align: 'left' },
          { key: 'budget', label: 'Budgété', align: 'right', format: 'currency' },
          { key: 'realise', label: 'Réalisé', align: 'right', format: 'currency' },
          { key: 'reste', label: 'Reste à engager', align: 'right', format: 'currency' },
        ],
        rows,
      };
    }

    case 'analytics.by_section': {
      const client = (adapter as any).client;
      if (!client) return { columns: [{ key: 'info', label: 'Information', align: 'left' }], rows: [{ info: 'Module Analytique indisponible.' }] };
      const annee = String(new Date(period.endDate).getFullYear());
      const data = await fetchAllRows(() => client.from('v_actual_by_section').select('*').eq('annee', annee), 'section_code');
      const map = new Map<string, { code: string; produits: number; charges: number }>();
      for (const r of (data || [])) { const c = String(r.section_code); if (!map.has(c)) map.set(c, { code: c, produits: 0, charges: 0 }); const m = map.get(c)!; const v = Number(r.montant) || 0; if (r.classe === '7') m.produits += v; else if (r.classe === '6') m.charges += v; }
      const rows = Array.from(map.values()).map(m => ({ section: m.code, produits: m.produits, charges: m.charges, resultat: m.produits - m.charges })).sort((a, b) => b.resultat - a.resultat);
      return {
        columns: [
          { key: 'section', label: 'Section', align: 'left' },
          { key: 'produits', label: 'Produits', align: 'right', format: 'currency' },
          { key: 'charges', label: 'Charges', align: 'right', format: 'currency' },
          { key: 'resultat', label: 'Résultat', align: 'right', format: 'currency' },
        ],
        rows,
      };
    }

    case 'treasury.plan_lft': {
      const client = (adapter as any).client;
      if (!client) return { columns: [{ key: 'info', label: 'Information', align: 'left' }], rows: [{ info: 'Module LFT indisponible.' }] };
      // Flux manuels + budget : agrégés par mois (les postes ouverts dépendent des échéances)
      const flows = await fetchAllRows(() => client.from('treasury_flows').select('sens,date_prevue,montant'), 'date_prevue');
      const byMonth = new Map<string, { enc: number; dec: number }>();
      for (const f of (flows || [])) {
        const ym = String(f.date_prevue).slice(0, 7);
        if (!byMonth.has(ym)) byMonth.set(ym, { enc: 0, dec: 0 });
        const b = byMonth.get(ym)!;
        if (f.sens === 'encaissement') b.enc += Number(f.montant) || 0; else b.dec += Number(f.montant) || 0;
      }
      const rows = Array.from(byMonth.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([ym, b]) => ({ mois: ym, encaissements: b.enc, decaissements: b.dec, fluxNet: b.enc - b.dec }));
      if (rows.length === 0) return { columns: [{ key: 'info', label: 'Information', align: 'left' }], rows: [{ info: 'Aucun flux de trésorerie planifié.' }] };
      return {
        columns: [
          { key: 'mois', label: 'Mois', align: 'left' },
          { key: 'encaissements', label: 'Encaissements', align: 'right', format: 'currency' },
          { key: 'decaissements', label: 'Décaissements', align: 'right', format: 'currency' },
          { key: 'fluxNet', label: 'Flux net', align: 'right', format: 'currency' },
        ],
        rows,
      };
    }

    default:
      // Generic fallback: empty table with a helpful note
      return {
        columns: [{ key: 'info', label: 'Information', align: 'left' }],
        rows: [{ info: `Source « ${source} » — données non disponibles pour cette période.` }],
      };
  }
}

// ============================================================================
// Chart Data
// ============================================================================

export async function fetchChartData(
  adapter: DataAdapter,
  source: string,
  period: PeriodSelection
): Promise<ChartResult> {
  const entries = ((await adapter.getAll('journalEntries')) as JournalEntry[]).filter((e) => e.status !== 'draft');

  switch (source) {
    case 'chart.ca_evolution':
    case 'chart.pl_monthly': {
      const months = getMonthsInPeriod(period);
      const data = months.map(m => {
        let produits = 0;
        let charges = 0;
        for (const e of entries) {
          if (!e.date || !e.date.startsWith(m.prefix)) continue;
          for (const l of (e.lines || [])) {
            if (l.accountCode?.startsWith('7')) produits += (l.credit || 0) - (l.debit || 0);
            if (l.accountCode?.startsWith('6')) charges += (l.debit || 0) - (l.credit || 0);
          }
        }
        return { month: m.label, produits, charges, resultat: produits - charges };
      });
      return {
        data,
        xAxisKey: 'month',
        series: source === 'chart.ca_evolution'
          ? [{ key: 'produits', label: 'Chiffre d\'Affaires' }]
          : [
              { key: 'produits', label: 'Produits', color: '#171717' },
              { key: 'charges', label: 'Charges', color: '#a3a3a3' },
              { key: 'resultat', label: 'Résultat', color: '#15803D' },
            ],
      };
    }

    case 'chart.cashflow_monthly': {
      const months = getMonthsInPeriod(period);
      const data = months.map(m => {
        let encaissements = 0;
        let decaissements = 0;
        for (const e of entries) {
          if (!e.date || !e.date.startsWith(m.prefix)) continue;
          for (const l of (e.lines || [])) {
            if (l.accountCode?.startsWith('5')) {
              if ((l.debit || 0) > 0) encaissements += l.debit || 0;
              if ((l.credit || 0) > 0) decaissements += l.credit || 0;
            }
          }
        }
        return { month: m.label, encaissements, decaissements };
      });
      return {
        data,
        xAxisKey: 'month',
        series: [
          { key: 'encaissements', label: 'Encaissements', color: '#15803D' },
          { key: 'decaissements', label: 'Décaissements', color: '#C0322B' },
        ],
      };
    }

    case 'chart.charges_structure': {
      const categories: Record<string, number> = {};
      for (const e of entries) {
        if (!inPeriod(e.date, period)) continue;
        for (const l of (e.lines || [])) {
          if (l.accountCode?.startsWith('6')) {
            const cls = l.accountCode.substring(0, 2);
            const label = getClassLabel(cls);
            categories[label] = (categories[label] || 0) + ((l.debit || 0) - (l.credit || 0));
          }
        }
      }
      return {
        data: Object.entries(categories)
          .filter(([, v]) => v > 0)
          .map(([name, value]) => ({ name, value })),
        xAxisKey: 'name',
        series: [{ key: 'value', label: 'Montant' }],
      };
    }

    case 'chart.budget_vs_actual': {
      const months = getMonthsInPeriod(period);
      // Budget mensuel RÉEL (charges cl.6) depuis la version active. Aucune valeur inventée :
      // si le budget n'existe pas, la barre budget reste à 0 (honnête) au lieu de « réel × 1,1 ».
      const budgetByMonth = new Map<string, number>();
      try {
        const client = (adapter as any).client;
        if (client) {
          const { data: ver } = await client.from('budget_versions').select('id').eq('is_active', true).limit(1);
          const vid = ver?.[0]?.id;
          if (vid) {
            const { data: lines } = await client.from('budget_lines')
              .select('id,account_code').eq('version_id', vid).eq('budget_type', 'exploitation');
            const chargeIds = (lines || [])
              .filter((l: any) => String(l.account_code || '').startsWith('6')).map((l: any) => l.id);
            if (chargeIds.length) {
              const periods = await fetchAllRows(
                () => client.from('budget_line_periods').select('period,montant_prevu').in('budget_line_id', chargeIds),
                'period');
              for (const pr of periods) {
                const mm = String(pr.period).padStart(2, '0');
                budgetByMonth.set(mm, (budgetByMonth.get(mm) || 0) + (Number(pr.montant_prevu) || 0));
              }
            }
          }
        }
      } catch { /* budget indisponible → budget = 0 */ }
      const data = months.map(m => {
        let reel = 0;
        for (const e of entries) {
          if (!e.date || !e.date.startsWith(m.prefix)) continue;
          for (const l of (e.lines || [])) {
            if (l.accountCode?.startsWith('6')) reel += (l.debit || 0) - (l.credit || 0);
          }
        }
        const mm = m.prefix.slice(5, 7);
        return { month: m.label, reel, budget: budgetByMonth.get(mm) || 0 };
      });
      return {
        data,
        xAxisKey: 'month',
        series: [
          { key: 'budget', label: 'Budget', color: '#a3a3a3' },
          { key: 'reel', label: 'Réel', color: '#171717' },
        ],
      };
    }

    case 'chart.tft_waterfall': {
      // Waterfall: CAF → Variation BFR → Flux Exploitation → Flux Investissement → Flux Financement → Variation nette
      const produits = sumByClass(entries, '7', period, 'net');
      const charges = sumByClass(entries, '6', period, 'debit') - sumByClass(entries, '6', period, 'credit');
      const resultat = produits - charges;
      const dotations = sumByClass(entries, '68', period, 'debit') - sumByClass(entries, '68', period, 'credit');
      const reprises = sumByClass(entries, '78', period, 'net');
      const caf = resultat + dotations - reprises;
      const acquisitions = sumByClass(entries, '2', period, 'debit') - sumByClass(entries, '2', period, 'credit');
      const investFlow = -Math.max(0, acquisitions);
      const capitalIncrease = sumByClass(entries, '10', period, 'net');
      const newBorrowings = sumByClass(entries, '16', period, 'net');
      const financFlow = capitalIncrease + newBorrowings;

      return {
        data: [
          { label: 'CAF', value: Math.round(caf) },
          { label: 'Exploitation', value: Math.round(caf) },
          { label: 'Investissement', value: Math.round(investFlow) },
          { label: 'Financement', value: Math.round(financFlow) },
          { label: 'Variation nette', value: Math.round(caf + investFlow + financFlow) },
        ],
        xAxisKey: 'label',
        series: [{ key: 'value', label: 'Montant' }],
      };
    }

    case 'chart.tft_3flux': {
      const produits = sumByClass(entries, '7', period, 'net');
      const charges = sumByClass(entries, '6', period, 'debit') - sumByClass(entries, '6', period, 'credit');
      const resultat = produits - charges;
      const dotations = sumByClass(entries, '68', period, 'debit') - sumByClass(entries, '68', period, 'credit');
      const reprises = sumByClass(entries, '78', period, 'net');
      const caf = resultat + dotations - reprises;
      const acquisitions = sumByClass(entries, '2', period, 'debit') - sumByClass(entries, '2', period, 'credit');
      const investFlow = -Math.max(0, acquisitions);
      const capitalIncrease = sumByClass(entries, '10', period, 'net');
      const newBorrowings = sumByClass(entries, '16', period, 'net');
      const financFlow = capitalIncrease + newBorrowings;

      return {
        data: [
          { flux: 'Exploitation', montant: Math.round(caf) },
          { flux: 'Investissement', montant: Math.round(investFlow) },
          { flux: 'Financement', montant: Math.round(financFlow) },
        ],
        xAxisKey: 'flux',
        series: [{ key: 'montant', label: 'Montant', color: '#171717' }],
      };
    }

    case 'chart.aging_clients':
    case 'chart.aging_fournisseurs': {
      const isClients = source === 'chart.aging_clients';
      const prefix = isClients ? '41' : '40';
      const now = new Date(period.endDate).getTime();
      const buckets = { '0-30': 0, '30-60': 0, '60-90': 0, '>90': 0 };
      for (const e of entries) {
        if (!inPeriod(e.date, period)) continue;
        const age = (now - new Date(e.date || period.endDate).getTime()) / (1000 * 60 * 60 * 24);
        for (const l of (e.lines || [])) {
          if (!l.accountCode?.startsWith(prefix)) continue;
          if (lineLettrage(l)) continue; // ligne lettrée = soldée → exclue (cf. keystone getAgedReceivables)
          const montant = isClients ? (l.debit || 0) - (l.credit || 0) : (l.credit || 0) - (l.debit || 0);
          if (montant <= 0) continue;
          if (age <= 30) buckets['0-30'] += montant;
          else if (age <= 60) buckets['30-60'] += montant;
          else if (age <= 90) buckets['60-90'] += montant;
          else buckets['>90'] += montant;
        }
      }
      return {
        data: Object.entries(buckets).map(([tranche, montant]) => ({ tranche, montant })),
        xAxisKey: 'tranche',
        series: [{ key: 'montant', label: 'Montant', color: '#171717' }],
      };
    }

    case 'chart.benford': {
      // Distribution premier chiffre vs Benford expected
      const counts = new Array(10).fill(0);
      let total = 0;
      for (const e of entries) {
        if (!inPeriod(e.date, period)) continue;
        for (const l of (e.lines || [])) {
          const v = Math.abs((l.debit || 0) + (l.credit || 0));
          if (v <= 0) continue;
          const first = parseInt(String(v).replace(/^0+/, '').charAt(0), 10);
          if (first >= 1 && first <= 9) {
            counts[first]++;
            total++;
          }
        }
      }
      const expected = [0, 30.1, 17.6, 12.5, 9.7, 7.9, 6.7, 5.8, 5.1, 4.6];
      const data = [] as Record<string, string | number>[];
      for (let d = 1; d <= 9; d++) {
        data.push({
          digit: String(d),
          observe: total === 0 ? 0 : (counts[d] / total) * 100,
          attendu: expected[d],
        });
      }
      return {
        data,
        xAxisKey: 'digit',
        series: [
          { key: 'observe', label: 'Observé (%)', color: '#171717' },
          { key: 'attendu', label: 'Benford (%)', color: '#a3a3a3' },
        ],
      };
    }

    case 'chart.marge_evolution': {
      const months = getMonthsInPeriod(period);
      const data = months.map(m => {
        let ca = 0, achats = 0;
        for (const e of entries) {
          if (!e.date || !e.date.startsWith(m.prefix)) continue;
          for (const l of (e.lines || [])) {
            if (l.accountCode?.startsWith('70')) ca += (l.credit || 0) - (l.debit || 0);
            if (l.accountCode?.startsWith('60')) achats += (l.debit || 0) - (l.credit || 0);
          }
        }
        return { month: m.label, marge: ca === 0 ? 0 : Math.round(((ca - achats) / ca) * 100) };
      });
      return { data, xAxisKey: 'month', series: [{ key: 'marge', label: 'Marge brute %', color: '#15803D' }] };
    }

    case 'chart.tva_evolution': {
      const months = getMonthsInPeriod(period);
      const data = months.map(m => {
        let collectee = 0, deductible = 0;
        for (const e of entries) {
          if (!e.date || !e.date.startsWith(m.prefix)) continue;
          for (const l of (e.lines || [])) {
            if (l.accountCode?.startsWith('443')) collectee += (l.credit || 0) - (l.debit || 0);
            if (l.accountCode?.startsWith('445')) deductible += (l.debit || 0) - (l.credit || 0);
          }
        }
        return { month: m.label, collectee, deductible };
      });
      return {
        data, xAxisKey: 'month',
        series: [
          { key: 'collectee', label: 'TVA collectée', color: '#171717' },
          { key: 'deductible', label: 'TVA déductible', color: '#a3a3a3' },
        ],
      };
    }

    case 'chart.ebitda_trimestriel': {
      // EBITDA par trimestre de la période
      const quarters: Record<string, { ca: number; charges6: number; amort: number }> = {};
      for (const e of entries) {
        if (!inPeriod(e.date, period) || !e.date) continue;
        const month = new Date(e.date).getMonth();
        const q = `T${Math.floor(month / 3) + 1}`;
        if (!quarters[q]) quarters[q] = { ca: 0, charges6: 0, amort: 0 };
        for (const l of (e.lines || [])) {
          const code = l.accountCode || '';
          if (code.startsWith('7')) quarters[q].ca += (l.credit || 0) - (l.debit || 0);
          if (code.startsWith('6')) quarters[q].charges6 += (l.debit || 0) - (l.credit || 0);
          if (code.startsWith('68')) quarters[q].amort += (l.debit || 0) - (l.credit || 0);
        }
      }
      const data = ['T1', 'T2', 'T3', 'T4'].filter(q => quarters[q]).map(q => ({
        trimestre: q, ebitda: Math.round(quarters[q].ca - quarters[q].charges6 + quarters[q].amort),
      }));
      return { data, xAxisKey: 'trimestre', series: [{ key: 'ebitda', label: 'EBITDA', color: '#171717' }] };
    }

    case 'chart.ratios_trend': {
      const months = getMonthsInPeriod(period);
      const data = months.map(m => {
        let ca = 0, charges = 0;
        for (const e of entries) {
          if (!e.date || !e.date.startsWith(m.prefix)) continue;
          for (const l of (e.lines || [])) {
            if (l.accountCode?.startsWith('7')) ca += (l.credit || 0) - (l.debit || 0);
            if (l.accountCode?.startsWith('6')) charges += (l.debit || 0) - (l.credit || 0);
          }
        }
        return { month: m.label, margeNette: ca === 0 ? 0 : Math.round(((ca - charges) / ca) * 100) };
      });
      return { data, xAxisKey: 'month', series: [{ key: 'margeNette', label: 'Marge nette %', color: '#171717' }] };
    }

    case 'chart.comparatif_n_n1': {
      const prev = previousPeriod(period);
      const metric = (p: PeriodSelection) => {
        const ca = sumByClass(entries, '7', p, 'net');
        const charges = sumByClass(entries, '6', p, 'debit') - sumByClass(entries, '6', p, 'credit');
        const amort = sumByClass(entries, '68', p, 'debit') - sumByClass(entries, '68', p, 'credit');
        return { ca, ebitda: ca - charges + amort, resultat: ca - charges };
      };
      const cur = metric(period); const old = metric(prev);
      const data = [
        { metric: 'CA', N: Math.round(cur.ca), 'N-1': Math.round(old.ca) },
        { metric: 'EBITDA', N: Math.round(cur.ebitda), 'N-1': Math.round(old.ebitda) },
        { metric: 'Résultat', N: Math.round(cur.resultat), 'N-1': Math.round(old.resultat) },
      ];
      return {
        data, xAxisKey: 'metric',
        series: [
          { key: 'N', label: 'N', color: '#171717' },
          { key: 'N-1', label: 'N-1', color: '#a3a3a3' },
        ],
      };
    }

    case 'chart.waterfall_result': {
      const ca = sumByClass(entries, '7', period, 'net');
      const achats = chargeNet(entries, '60', period) + chargeNet(entries, '61', period) + chargeNet(entries, '62', period) + chargeNet(entries, '63', period);
      const personnel = chargeNet(entries, '66', period);
      const autres = chargeNet(entries, '64', period) + chargeNet(entries, '65', period);
      const amortFin = chargeNet(entries, '67', period) + chargeNet(entries, '68', period);
      const impots = chargeNet(entries, '89', period);
      const resultat = ca - achats - personnel - autres - amortFin - impots;
      return {
        data: [
          { label: "Chiffre d'affaires", value: Math.round(ca) },
          { label: 'Achats & services', value: -Math.round(achats) },
          { label: 'Personnel', value: -Math.round(personnel) },
          { label: 'Autres charges', value: -Math.round(autres) },
          { label: 'Amort. & financier', value: -Math.round(amortFin) },
          { label: 'Impôts', value: -Math.round(impots) },
          { label: 'Résultat net', value: Math.round(resultat) },
        ],
        xAxisKey: 'label',
        series: [{ key: 'value', label: 'Montant' }],
      };
    }

    case 'chart.bilan_structure': {
      const immo = sumByClass(entries, '2', period, 'debit') - sumByClass(entries, '2', period, 'credit');
      const stocks = sumByClass(entries, '3', period, 'debit') - sumByClass(entries, '3', period, 'credit');
      const creances = sumByClass(entries, '41', period, 'debit') - sumByClass(entries, '41', period, 'credit');
      const treso = sumByClass(entries, '5', period, 'debit') - sumByClass(entries, '5', period, 'credit');
      return {
        // Camembert de structure d'actif : ne peut afficher que des parts positives.
        // On filtre les postes ≤ 0 (ex. trésorerie créditrice = découvert, qui relève du passif)
        // plutôt que de les écraser silencieusement à 0 par Math.max.
        data: [
          { name: 'Immobilisations', value: Math.round(immo) },
          { name: 'Stocks', value: Math.round(stocks) },
          { name: 'Créances', value: Math.round(creances) },
          { name: 'Trésorerie', value: Math.round(treso) },
        ].filter(d => d.value > 0),
        xAxisKey: 'name',
        series: [{ key: 'value', label: 'Montant' }],
      };
    }

    case 'chart.tresorerie_cumul': {
      const months = getMonthsInPeriod(period);
      let cumul = 0;
      const data = months.map(m => {
        let flow = 0;
        for (const e of entries) {
          if (!e.date || !e.date.startsWith(m.prefix)) continue;
          if (e.journal === 'AN' || e.journal === 'RAN') continue;
          for (const l of (e.lines || [])) {
            if (l.accountCode?.startsWith('5')) flow += (l.debit || 0) - (l.credit || 0);
          }
        }
        cumul += flow;
        return { month: m.label, tresorerie: Math.round(cumul) };
      });
      return { data, xAxisKey: 'month', series: [{ key: 'tresorerie', label: 'Trésorerie cumulée', color: '#171717' }] };
    }

    case 'chart.bfr_fr_tn': {
      const months = getMonthsInPeriod(period);
      // Cumuls progressifs jusqu'à la fin de chaque mois
      const data = months.map(m => {
        let actifCirc = 0, passifCirc = 0, capPerm = 0, actifImmo = 0;
        for (const e of entries) {
          if (!e.date || e.date.slice(0, 7) > m.prefix) continue;
          for (const l of (e.lines || [])) {
            const code = l.accountCode || '';
            if (code.startsWith('3') || code.startsWith('41')) actifCirc += (l.debit || 0) - (l.credit || 0);
            if (code.startsWith('40') || code.startsWith('42') || code.startsWith('43') || code.startsWith('44')) passifCirc += (l.credit || 0) - (l.debit || 0);
            if (code.startsWith('1')) capPerm += (l.credit || 0) - (l.debit || 0);
            if (code.startsWith('2')) actifImmo += (l.debit || 0) - (l.credit || 0);
          }
        }
        const bfr = actifCirc - passifCirc;
        const fr = capPerm - actifImmo;
        return { month: m.label, BFR: Math.round(bfr), FR: Math.round(fr), TN: Math.round(fr - bfr) };
      });
      return {
        data, xAxisKey: 'month',
        series: [
          { key: 'FR', label: 'Fonds de Roulement', color: '#171717' },
          { key: 'BFR', label: 'BFR', color: '#a3a3a3' },
          { key: 'TN', label: 'Trésorerie Nette', color: '#15803D' },
        ],
      };
    }

    case 'chart.dso_dpo': {
      const months = getMonthsInPeriod(period);
      const data = months.map(m => {
        let ca = 0, achats = 0, creances = 0, dettes = 0;
        for (const e of entries) {
          if (!e.date || e.date.slice(0, 7) > m.prefix) continue;
          const inMonth = e.date.startsWith(m.prefix);
          for (const l of (e.lines || [])) {
            const code = l.accountCode || '';
            if (inMonth && code.startsWith('70')) ca += (l.credit || 0) - (l.debit || 0);
            if (inMonth && code.startsWith('60')) achats += (l.debit || 0) - (l.credit || 0);
            if (code.startsWith('41')) creances += (l.debit || 0) - (l.credit || 0);
            if (code.startsWith('40')) dettes += (l.credit || 0) - (l.debit || 0);
          }
        }
        return {
          month: m.label,
          DSO: ca > 0 ? Math.round((creances / ca) * 30) : 0,
          DPO: achats > 0 ? Math.round((dettes / achats) * 30) : 0,
        };
      });
      return {
        data, xAxisKey: 'month',
        series: [
          { key: 'DSO', label: 'DSO (j)', color: '#171717' },
          { key: 'DPO', label: 'DPO (j)', color: '#a3a3a3' },
        ],
      };
    }

    case 'chart.ca_by_center':
    case 'chart.margin_by_center': {
      const isMargin = source === 'chart.margin_by_center';
      const centers = new Map<string, { produits: number; charges: number }>();
      for (const e of entries) {
        if (!inPeriod(e.date, period)) continue;
        for (const l of (e.lines || [])) {
          const ax = lineAnalytical(l);
          if (!ax) continue;
          const code = l.accountCode || '';
          if (!centers.has(ax)) centers.set(ax, { produits: 0, charges: 0 });
          const c = centers.get(ax)!;
          if (code.startsWith('7')) c.produits += (l.credit || 0) - (l.debit || 0);
          if (code.startsWith('6')) c.charges += (l.debit || 0) - (l.credit || 0);
        }
      }
      const data = Array.from(centers.entries()).map(([ax, c]) => ({
        centre: ax,
        valeur: isMargin ? (c.produits ? Math.round(((c.produits - c.charges) / c.produits) * 100) : 0) : Math.round(c.produits),
      })).sort((a, b) => b.valeur - a.valeur).slice(0, 12);
      return { data, xAxisKey: 'centre', series: [{ key: 'valeur', label: isMargin ? 'Marge %' : 'CA', color: '#171717' }] };
    }

    case 'chart.ratios_radar': {
      const ca = sumByClass(entries, '7', period, 'net');
      const charges = sumByClass(entries, '6', period, 'debit') - sumByClass(entries, '6', period, 'credit');
      const achats = sumByClass(entries, '60', period, 'debit') - sumByClass(entries, '60', period, 'credit');
      const margeBrute = ca ? ((ca - achats) / ca) * 100 : 0;
      const margeNette = ca ? ((ca - charges) / ca) * 100 : 0;
      let capitaux = 0, dettes = 0, actif = 0;
      for (const e of entries) {
        if (!inPeriod(e.date, period)) continue;
        for (const l of (e.lines || [])) {
          const code = l.accountCode || '';
          if (/^1[0-3]/.test(code)) capitaux += (l.credit || 0) - (l.debit || 0);
          if (code.startsWith('16') || code.startsWith('17')) dettes += (l.credit || 0) - (l.debit || 0);
          if (/^[2345]/.test(code)) actif += (l.debit || 0) - (l.credit || 0);
        }
      }
      const resultat = ca - charges;
      const data = [
        { ratio: 'Marge brute', valeur: Math.round(margeBrute) },
        { ratio: 'Marge nette', valeur: Math.round(margeNette) },
        { ratio: 'ROE', valeur: capitaux ? Math.round((resultat / capitaux) * 100) : 0 },
        { ratio: 'ROA', valeur: actif ? Math.round((resultat / actif) * 100) : 0 },
        { ratio: 'Autonomie', valeur: (capitaux + dettes) ? Math.round((capitaux / (capitaux + dettes)) * 100) : 0 },
      ];
      return { data, xAxisKey: 'ratio', series: [{ key: 'valeur', label: 'Valeur (%)', color: '#171717' }] };
    }

    case 'chart.pareto_clients': {
      const clients = new Map<string, number>();
      for (const e of entries) {
        if (!inPeriod(e.date, period)) continue;
        for (const l of (e.lines || [])) {
          if (!l.accountCode?.startsWith('41')) continue;
          const key = l.thirdPartyName || l.accountName || l.accountCode;
          clients.set(key, (clients.get(key) || 0) + (l.debit || 0));
        }
      }
      const sorted = Array.from(clients.entries()).map(([name, v]) => ({ name, v })).sort((a, b) => b.v - a.v).slice(0, 15);
      const total = sorted.reduce((s, c) => s + c.v, 0) || 1;
      let cum = 0;
      const data = sorted.map(c => { cum += c.v; return { client: c.name.slice(0, 18), montant: Math.round(c.v), cumul: Math.round((cum / total) * 100) }; });
      return {
        data, xAxisKey: 'client',
        series: [
          { key: 'montant', label: 'CA', color: '#171717' },
          { key: 'cumul', label: 'Cumul %', color: '#E89A2E' },
        ],
      };
    }

    case 'chart.anomalies_timeline': {
      // Comptage mensuel d'écritures « atypiques » (montant rond élevé ou pièce déséquilibrée)
      const months = getMonthsInPeriod(period);
      const data = months.map(m => {
        let count = 0;
        for (const e of entries) {
          if (!e.date || !e.date.startsWith(m.prefix)) continue;
          let d = 0, c = 0;
          for (const l of (e.lines || [])) { d += l.debit || 0; c += l.credit || 0; }
          const montant = Math.max(d, c);
          if (Math.abs(d - c) > 0.5) count++;
          else if (montant >= 1_000_000 && montant % 100000 === 0) count++;
        }
        return { month: m.label, anomalies: count };
      });
      return { data, xAxisKey: 'month', series: [{ key: 'anomalies', label: 'Anomalies', color: '#C0322B' }] };
    }

    case 'chart.cloture_progress': {
      // Progression réelle : part des écritures validées vs total (incl. brouillons)
      const allEntries = (await adapter.getAll('journalEntries')) as JournalEntry[];
      const inP = allEntries.filter(e => inPeriod(e.date, period));
      const validated = inP.filter(e => e.status === 'validated' || e.status === 'posted').length;
      const drafts = inP.length - validated;
      return {
        data: [
          { name: 'Validées', value: validated },
          { name: 'Brouillons', value: drafts },
        ].filter(d => d.value > 0),
        xAxisKey: 'name',
        series: [{ key: 'value', label: 'Écritures' }],
      };
    }

    case 'chart.heatmap_activite': {
      const months = getMonthsInPeriod(period);
      const data = months.map(m => {
        let count = 0;
        for (const e of entries) {
          if (e.date && e.date.startsWith(m.prefix)) count++;
        }
        return { month: m.label, activite: count };
      });
      return { data, xAxisKey: 'month', series: [{ key: 'activite', label: "Nombre d'écritures", color: '#235A6E' }] };
    }

    case 'chart.stocks_rotation': {
      // Nouveau socle Stock (SAP MM) : sorties valorisées par article sur la période.
      const load = async (t: string): Promise<Record<string, any>[]> => { try { return (await adapter.getAll(t as never)) as Record<string, any>[]; } catch { return []; } };
      const [docs, lines, materials] = await Promise.all([load('stockDocuments'), load('stockDocumentLines'), load('stockMaterials')]);
      if (docs.length === 0) {
        // Pas de module stock alimenté → rotation dérivée de la classe 3 (mouvements GL)
        const stockClasses = ['31', '32', '33', '34', '35', '37'];
        const data = stockClasses.map(cls => {
          let mvt = 0;
          for (const e of entries) {
            if (!inPeriod(e.date, period)) continue;
            for (const l of (e.lines || [])) {
              if (l.accountCode?.startsWith(cls)) mvt += (l.debit || 0) + (l.credit || 0);
            }
          }
          return { compte: cls, mouvements: Math.round(mvt) };
        }).filter(d => d.mouvements > 0);
        return { data, xAxisKey: 'compte', series: [{ key: 'mouvements', label: 'Mouvements (classe 3)', color: '#171717' }] };
      }
      const docDate = new Map(docs.map(d => [d.id, d.docDate as string]));
      const matById = new Map(materials.map(m => [m.id, m]));
      const byItem = new Map<string, number>();
      for (const l of lines) {
        if (l.direction !== 'out') continue;
        const dt = docDate.get(l.documentId);
        if (dt && !inPeriod(dt, period)) continue;
        const m = matById.get(l.materialId);
        const item = m ? `${m.code} — ${m.name}` : (l.materialId || '—');
        byItem.set(item, (byItem.get(item) || 0) + Number(l.amount ?? 0));
      }
      const data = Array.from(byItem.entries()).map(([article, v]) => ({ article: String(article).slice(0, 18), rotation: Math.round(v) }))
        .sort((a, b) => b.rotation - a.rotation).slice(0, 12);
      return { data, xAxisKey: 'article', series: [{ key: 'rotation', label: 'Sorties valorisées', color: '#235A6E' }] };
    }

    case 'chart.top_comptes': {
      const totals = new Map<string, { label: string; montant: number }>();
      for (const e of entries) {
        if (!inPeriod(e.date, period)) continue;
        for (const l of (e.lines || [])) {
          const code = l.accountCode || '';
          if (!totals.has(code)) totals.set(code, { label: l.accountName || code, montant: 0 });
          const t = totals.get(code)!;
          t.montant += (l.debit || 0) + (l.credit || 0);
        }
      }
      return {
        data: Array.from(totals.entries())
          .map(([code, t]) => ({ compte: code, montant: t.montant }))
          .sort((a, b) => b.montant - a.montant)
          .slice(0, 10),
        xAxisKey: 'compte',
        series: [{ key: 'montant', label: 'Montant', color: '#171717' }],
      };
    }

    default:
      return { data: [], xAxisKey: 'label', series: [] };
  }
}

// ============================================================================
// Utility
// ============================================================================

function getMonthsInPeriod(period: PeriodSelection): { prefix: string; label: string }[] {
  const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  const start = new Date(period.startDate);
  const end = new Date(period.endDate);
  const months: { prefix: string; label: string }[] = [];

  const current = new Date(start.getFullYear(), start.getMonth(), 1);
  while (current <= end) {
    const y = current.getFullYear();
    const m = current.getMonth();
    months.push({
      prefix: `${y}-${String(m + 1).padStart(2, '0')}`,
      label: monthNames[m],
    });
    current.setMonth(current.getMonth() + 1);
  }
  return months;
}

function getClassLabel(cls: string): string {
  const labels: Record<string, string> = {
    '60': 'Achats',
    '61': 'Services Extérieurs',
    '62': 'Autres Services Ext.',
    '63': 'Impôts & Taxes',
    '64': 'Charges de Personnel',
    '65': 'Autres Charges Opérat.',
    '66': 'Charges Financières',
    '67': 'Charges Exceptionnelles',
    '68': 'Dotations Amort./Prov.',
    '69': 'Impôts sur les Bénéfices',
    '70': 'Ventes',
    '71': 'Production Stockée',
    '72': 'Production Immobilisée',
    '73': 'Produits Nets Partiels',
    '74': 'Subventions',
    '75': 'Autres Produits Opérat.',
    '76': 'Produits Financiers',
    '77': 'Produits Exceptionnels',
    '78': 'Reprises Amort./Prov.',
    '79': 'Transferts de Charges',
  };
  return labels[cls] || `Classe ${cls}`;
}
