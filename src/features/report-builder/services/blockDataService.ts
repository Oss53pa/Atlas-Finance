/**
 * Block Data Service — Connects report blocks to Atlas Finance data
 * CDC §9 — Catalogue Intégré — Connexion Atlas Finance
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

// ============================================================================
// KPI Data
// ============================================================================

export async function fetchKPIValue(
  adapter: DataAdapter,
  source: string,
  period: PeriodSelection
): Promise<KPIResult> {
  const entries = (await adapter.getAll('journalEntries')) as JournalEntry[];
  const prev = previousPeriod(period);

  const calcValue = (p: PeriodSelection): number | null => {
    switch (source) {
      case 'kpi.ca_total':
        return sumByClass(entries, '7', p, 'net');

      case 'kpi.resultat_net': {
        const produits = sumByClass(entries, '7', p, 'net');
        const charges = sumByClass(entries, '6', p, 'debit') - sumByClass(entries, '6', p, 'credit');
        return produits - charges;
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
        // Trésorerie = comptes 5xx
        let total = 0;
        for (const e of entries) {
          if (!inPeriod(e.date, p)) continue;
          for (const l of (e.lines || [])) {
            if (l.accountCode?.startsWith('5')) {
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
        const produits = sumByClass(entries, '7', p, 'net');
        const charges = sumByClass(entries, '6', p, 'debit') - sumByClass(entries, '6', p, 'credit');
        const resultat = produits - charges;
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
        const produits = sumByClass(entries, '7', p, 'net');
        const charges = sumByClass(entries, '6', p, 'debit') - sumByClass(entries, '6', p, 'credit');
        const resultat = produits - charges;
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
  const entries = (await adapter.getAll('journalEntries')) as JournalEntry[];

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
        return {
          classe: cls,
          label: getClassLabel(cls),
          current,
          type: isCharge ? 'Charge' : 'Produit',
        };
      }).filter(r => r.current !== 0);
      return {
        columns: [
          { key: 'classe', label: 'Classe', align: 'left' },
          { key: 'label', label: 'Libellé', align: 'left' },
          { key: 'type', label: 'Type', align: 'center' },
          { key: 'current', label: 'Montant', align: 'right', format: 'currency' },
        ],
        rows,
      };
    }

    case 'financial.bilan_actif': {
      const postes = [
        { code: '2', label: 'Immobilisations' },
        { code: '3', label: 'Stocks' },
        { code: '41', label: 'Créances Clients' },
        { code: '5', label: 'Trésorerie Actif' },
      ];
      const rows = postes.map(p => {
        let brut = 0;
        for (const e of entries) {
          if (!inPeriod(e.date, period)) continue;
          for (const l of (e.lines || [])) {
            if (l.accountCode?.startsWith(p.code)) brut += (l.debit || 0) - (l.credit || 0);
          }
        }
        return { label: p.label, brut, net: brut };
      });
      return {
        columns: [
          { key: 'label', label: 'Poste', align: 'left' },
          { key: 'brut', label: 'Brut', align: 'right', format: 'currency' },
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

    default:
      return { columns: [], rows: [] };
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
  const entries = (await adapter.getAll('journalEntries')) as JournalEntry[];

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
              { key: 'resultat', label: 'Résultat', color: '#22c55e' },
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
          { key: 'encaissements', label: 'Encaissements', color: '#22c55e' },
          { key: 'decaissements', label: 'Décaissements', color: '#ef4444' },
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
      // Simplified — uses class 6 data vs a flat budget assumption
      const months = getMonthsInPeriod(period);
      const data = months.map(m => {
        let reel = 0;
        for (const e of entries) {
          if (!e.date || !e.date.startsWith(m.prefix)) continue;
          for (const l of (e.lines || [])) {
            if (l.accountCode?.startsWith('6')) reel += (l.debit || 0) - (l.credit || 0);
          }
        }
        return { month: m.label, reel, budget: reel * 1.1 }; // Budget = 110% of actual as placeholder
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
