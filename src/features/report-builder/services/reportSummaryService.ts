/**
 * Report Summary Service — Fetches default KPIs and alerts for summary/cover pages.
 * Used by SommaireBlock to populate its 4 KPI cards + alerts zone.
 */
import type { DataAdapter } from '@atlas/data';
import type { PeriodSelection } from '../types';
import { fetchKPIValue } from './blockDataService';

export type ReportSummaryType = 'bilan' | 'resultat' | 'tafire' | 'mensuel' | 'fiscal' | 'audit';

export interface SummaryKPI {
  label: string;
  value: number;
  variation?: number;
  format?: 'currency' | 'percent' | 'number' | 'days';
  source?: string;
}

export interface SummaryPayload {
  kpis: SummaryKPI[];
  alerts: string[];
}

/**
 * Returns the default KPIs + alerts tailored for a given report type.
 * Falls back gracefully if a KPI cannot be computed.
 */
export async function getDefaultSummary(
  adapter: DataAdapter,
  reportType: ReportSummaryType,
  period?: PeriodSelection,
): Promise<SummaryPayload> {
  const activePeriod: PeriodSelection = period ?? {
    type: 'annual',
    startDate: `${new Date().getFullYear()}-01-01`,
    endDate: `${new Date().getFullYear()}-12-31`,
    label: String(new Date().getFullYear()),
  };

  const kpiSources = pickSources(reportType);
  const kpis: SummaryKPI[] = [];

  for (const { label, source, format } of kpiSources) {
    try {
      const res = await fetchKPIValue(adapter, source, activePeriod);
      const value = res.value ?? 0;
      const prev = res.previousValue;
      const variation =
        prev !== null && prev !== 0 && prev !== undefined
          ? ((value - prev) / Math.abs(prev)) * 100
          : undefined;
      kpis.push({ label, value, variation, format, source });
    } catch {
      kpis.push({ label, value: 0, format, source });
    }
  }

  const alerts = await computeAlerts(adapter, activePeriod, kpis);

  return { kpis, alerts };
}

function pickSources(reportType: ReportSummaryType): Array<{
  label: string;
  source: string;
  format: SummaryKPI['format'];
}> {
  switch (reportType) {
    case 'bilan':
      return [
        { label: 'Total Actif', source: 'kpi.ca_total', format: 'currency' },
        { label: 'Capitaux Propres', source: 'kpi.roe', format: 'currency' },
        { label: 'Trésorerie Nette', source: 'kpi.tresorerie_nette', format: 'currency' },
        { label: 'Ratio Liquidité', source: 'kpi.ratio_liquidite', format: 'number' },
      ];
    case 'resultat':
      return [
        { label: "Chiffre d'Affaires", source: 'kpi.ca_total', format: 'currency' },
        { label: 'Résultat Net', source: 'kpi.resultat_net', format: 'currency' },
        { label: 'EBITDA', source: 'kpi.ebitda', format: 'currency' },
        { label: 'Marge Brute', source: 'kpi.marge_brute', format: 'percent' },
      ];
    case 'tafire':
      return [
        { label: 'CAF', source: 'kpi.caf', format: 'currency' },
        { label: 'Free Cash Flow', source: 'kpi.free_cashflow', format: 'currency' },
        { label: 'Flux Exploitation', source: 'kpi.flux_exploitation', format: 'currency' },
        { label: 'Variation Trésorerie', source: 'kpi.variation_tresorerie', format: 'currency' },
      ];
    case 'fiscal':
      return [
        { label: "Chiffre d'Affaires", source: 'kpi.ca_total', format: 'currency' },
        { label: 'Résultat Net', source: 'kpi.resultat_net', format: 'currency' },
        { label: 'TVA à Payer', source: 'kpi.tva_net_a_payer', format: 'currency' },
        { label: 'IS Prévisionnel', source: 'kpi.is_previsionnel', format: 'currency' },
      ];
    case 'audit':
      return [
        { label: 'Créances Clients', source: 'kpi.creances_clients', format: 'currency' },
        { label: 'Dettes Fournisseurs', source: 'kpi.dettes_fournisseurs', format: 'currency' },
        { label: 'Indice Benford', source: 'kpi.benford_index', format: 'number' },
        { label: 'Ratio Endettement', source: 'kpi.ratio_endettement', format: 'percent' },
      ];
    case 'mensuel':
    default:
      return [
        { label: "Chiffre d'Affaires", source: 'kpi.ca_total', format: 'currency' },
        { label: 'Résultat Net', source: 'kpi.resultat_net', format: 'currency' },
        { label: 'Trésorerie Nette', source: 'kpi.tresorerie_nette', format: 'currency' },
        { label: 'Ratio Liquidité', source: 'kpi.ratio_liquidite', format: 'number' },
      ];
  }
}

async function computeAlerts(
  adapter: DataAdapter,
  period: PeriodSelection,
  kpis: SummaryKPI[],
): Promise<string[]> {
  const alerts: string[] = [];

  try {
    const bfr = await fetchKPIValue(adapter, 'kpi.bfr', period);
    if (bfr.value !== null && bfr.value > 0) {
      const ca = await fetchKPIValue(adapter, 'kpi.ca_total', period);
      if (ca.value && ca.value > 0) {
        const bfrDays = (bfr.value / ca.value) * 365;
        if (bfrDays > 90) {
          alerts.push(`BFR élevé : ${Math.round(bfrDays)} jours de CA — surveillez le recouvrement.`);
        }
      }
    }

    const liquidity = kpis.find(k => k.source === 'kpi.ratio_liquidite');
    if (liquidity && liquidity.value < 1) {
      alerts.push(`Ratio de liquidité critique (${liquidity.value.toFixed(2)}) — risque de tension.`);
    }

    const endettement = await fetchKPIValue(adapter, 'kpi.ratio_endettement', period);
    if (endettement.value !== null && endettement.value > 200) {
      alerts.push(`Taux d'endettement élevé : ${endettement.value.toFixed(0)}%.`);
    }

    // Altman Z-Score proxy: naive check using ROE and debt
    const roe = await fetchKPIValue(adapter, 'kpi.roe', period);
    if (roe.value !== null && roe.value < 0) {
      alerts.push('Rentabilité négative (ROE < 0) — résultat déficitaire.');
    }

    const resultat = kpis.find(k => k.source === 'kpi.resultat_net');
    if (resultat && resultat.value < 0) {
      alerts.push('Résultat net négatif sur la période.');
    }
  } catch {
    // best-effort
  }

  if (alerts.length === 0) {
    alerts.push('Aucune alerte critique détectée sur la période.');
  }
  return alerts;
}
