/**
 * createBlockFromCatalog — conversion d'un élément du catalogue Atlas en bloc de rapport.
 *
 * Extrait d'AtlasCatalogPanel pour être partagé avec le gestionnaire de
 * glisser-déposer (ReportBuilderApp) : le catalogue ne proposait qu'un bouton
 * « Ajouter » masqué jusqu'au survol, sans aucun glisser-déposer.
 */
import type { AtlasCatalogItem } from './atlasCatalog';
import type { ReportBlock, KPIBlock, TableBlock, ChartBlock } from '../types';

// ---- Dashboard → grille de KPIs réels --------------------------------------
// Chaque tableau de bord se matérialise en une grille de 4 KPIs câblés à des
// sources kpi.* réelles (résolues par blockDataService → DataAdapter). Tout est
// donc connecté aux données réelles, plus aucune grille vide.
type KpiFmt = 'currency' | 'percent' | 'number' | 'days';
interface DashKpi { label: string; source: string; format: KpiFmt }

const DASHBOARD_KPIS: Record<string, DashKpi[]> = {
  'dashboard.global': [
    { label: "Chiffre d'Affaires", source: 'kpi.ca_total', format: 'currency' },
    { label: 'Résultat Net', source: 'kpi.resultat_net', format: 'currency' },
    { label: 'Trésorerie Nette', source: 'kpi.tresorerie_nette', format: 'currency' },
    { label: 'Marge Brute', source: 'kpi.marge_brute', format: 'percent' },
  ],
  'dashboard.executive': [
    { label: "Chiffre d'Affaires", source: 'kpi.ca_total', format: 'currency' },
    { label: 'EBITDA', source: 'kpi.ebitda', format: 'currency' },
    { label: 'Résultat Net', source: 'kpi.resultat_net', format: 'currency' },
    { label: 'Trésorerie Nette', source: 'kpi.tresorerie_nette', format: 'currency' },
  ],
  'dashboard.tiers': [
    { label: 'Créances Clients', source: 'kpi.creances_clients', format: 'currency' },
    { label: 'Dettes Fournisseurs', source: 'kpi.dettes_fournisseurs', format: 'currency' },
    { label: 'DSO', source: 'kpi.dso', format: 'days' },
    { label: 'DPO', source: 'kpi.dpo', format: 'days' },
  ],
  'dashboard.pl': [
    { label: "Chiffre d'Affaires", source: 'kpi.ca_total', format: 'currency' },
    { label: 'EBITDA', source: 'kpi.ebitda', format: 'currency' },
    { label: 'Résultat Net', source: 'kpi.resultat_net', format: 'currency' },
    { label: 'Marge Nette', source: 'kpi.net_margin', format: 'percent' },
  ],
  'dashboard.treasury': [
    { label: 'Trésorerie Nette', source: 'kpi.tresorerie_nette', format: 'currency' },
    { label: 'CAF', source: 'kpi.caf', format: 'currency' },
    { label: 'Free Cash Flow', source: 'kpi.free_cashflow', format: 'currency' },
    { label: 'Variation Trésorerie', source: 'kpi.variation_tresorerie', format: 'currency' },
  ],
  'dashboard.tft': [
    { label: 'CAF', source: 'kpi.caf', format: 'currency' },
    { label: "Flux d'Exploitation", source: 'kpi.flux_exploitation', format: 'currency' },
    { label: 'Free Cash Flow', source: 'kpi.free_cashflow', format: 'currency' },
    { label: 'Variation Trésorerie', source: 'kpi.variation_tresorerie', format: 'currency' },
  ],
  'dashboard.charges': [
    { label: "Chiffre d'Affaires", source: 'kpi.ca_total', format: 'currency' },
    { label: 'Marge Brute', source: 'kpi.marge_brute', format: 'percent' },
    { label: 'EBITDA', source: 'kpi.ebitda', format: 'currency' },
    { label: 'Résultat Net', source: 'kpi.resultat_net', format: 'currency' },
  ],
  'dashboard.analytique': [
    { label: "Chiffre d'Affaires", source: 'kpi.ca_total', format: 'currency' },
    { label: 'EBITDA', source: 'kpi.ebitda', format: 'currency' },
    { label: 'ROI', source: 'kpi.roi', format: 'percent' },
    { label: 'Marge Nette', source: 'kpi.net_margin', format: 'percent' },
  ],
  'dashboard.budget': [
    { label: "Chiffre d'Affaires", source: 'kpi.ca_total', format: 'currency' },
    { label: 'Résultat Net', source: 'kpi.resultat_net', format: 'currency' },
    { label: 'EBITDA', source: 'kpi.ebitda', format: 'currency' },
    { label: 'Marge Nette', source: 'kpi.net_margin', format: 'percent' },
  ],
  'dashboard.inventory': [
    { label: 'BFR', source: 'kpi.bfr', format: 'currency' },
    { label: 'Working Capital (j)', source: 'kpi.working_capital_days', format: 'days' },
    { label: 'Current Ratio', source: 'kpi.current_ratio', format: 'number' },
    { label: 'Quick Ratio', source: 'kpi.quick_ratio', format: 'number' },
  ],
  'dashboard.fiscal': [
    { label: 'TVA Nette à Payer', source: 'kpi.tva_net_a_payer', format: 'currency' },
    { label: 'IS Prévisionnel', source: 'kpi.is_previsionnel', format: 'currency' },
    { label: "Chiffre d'Affaires", source: 'kpi.ca_total', format: 'currency' },
    { label: 'Résultat Net', source: 'kpi.resultat_net', format: 'currency' },
  ],
  'dashboard.recovery': [
    { label: 'Créances Clients', source: 'kpi.creances_clients', format: 'currency' },
    { label: 'DSO', source: 'kpi.dso', format: 'days' },
    { label: 'Score Crédit Moyen', source: 'kpi.score_credit_moyen', format: 'number' },
    { label: "Chiffre d'Affaires", source: 'kpi.ca_total', format: 'currency' },
  ],
  'dashboard.consolidation': [
    { label: "Chiffre d'Affaires", source: 'kpi.ca_total', format: 'currency' },
    { label: 'Résultat Net', source: 'kpi.resultat_net', format: 'currency' },
    { label: 'Trésorerie Nette', source: 'kpi.tresorerie_nette', format: 'currency' },
    { label: 'Ratio Endettement', source: 'kpi.ratio_endettement', format: 'percent' },
  ],
  'dashboard.cloture': [
    { label: "Chiffre d'Affaires", source: 'kpi.ca_total', format: 'currency' },
    { label: 'Résultat Net', source: 'kpi.resultat_net', format: 'currency' },
    { label: 'Trésorerie Nette', source: 'kpi.tresorerie_nette', format: 'currency' },
    { label: 'Indice Benford', source: 'kpi.benford_index', format: 'number' },
  ],
  'dashboard.payroll': [
    { label: "Chiffre d'Affaires", source: 'kpi.ca_total', format: 'currency' },
    { label: 'EBITDA', source: 'kpi.ebitda', format: 'currency' },
    { label: 'Résultat Net', source: 'kpi.resultat_net', format: 'currency' },
    { label: 'Marge Nette', source: 'kpi.net_margin', format: 'percent' },
  ],
  'dashboard.audit': [
    { label: 'Indice Benford', source: 'kpi.benford_index', format: 'number' },
    { label: 'Ratio Endettement', source: 'kpi.ratio_endettement', format: 'percent' },
    { label: 'Créances Clients', source: 'kpi.creances_clients', format: 'currency' },
    { label: 'Dettes Fournisseurs', source: 'kpi.dettes_fournisseurs', format: 'currency' },
  ],
  'dashboard.anomaly': [
    { label: 'Indice Benford', source: 'kpi.benford_index', format: 'number' },
    { label: 'Altman Z-Score', source: 'kpi.altman_zscore', format: 'number' },
    { label: 'Ratio Endettement', source: 'kpi.ratio_endettement', format: 'percent' },
    { label: 'Marge Nette', source: 'kpi.net_margin', format: 'percent' },
  ],
  'dashboard.kpi_360': [
    { label: "Chiffre d'Affaires", source: 'kpi.ca_total', format: 'currency' },
    { label: 'Résultat Net', source: 'kpi.resultat_net', format: 'currency' },
    { label: 'EBITDA', source: 'kpi.ebitda', format: 'currency' },
    { label: 'Trésorerie Nette', source: 'kpi.tresorerie_nette', format: 'currency' },
  ],
};

const DEFAULT_DASH_KPIS: DashKpi[] = DASHBOARD_KPIS['dashboard.global'];

// ---- Create block from catalog item ----
export function createBlockFromCatalog(item: AtlasCatalogItem): ReportBlock {
  const id = crypto.randomUUID();
  const baseStyle = { marginBottom: 12 };

  switch (item.blockType) {
    case 'kpi':
      return {
        id, type: 'kpi', locked: false, style: baseStyle,
        label: item.label, value: null, previousValue: null,
        format: 'currency', unit: 'FCFA',
        source: item.source, showTrend: true, showSparkline: false, size: 'medium',
      } as KPIBlock;

    case 'table':
      return {
        id, type: 'table', locked: false, style: baseStyle,
        title: item.label, source: item.source,
        // Le schéma vient de la source (blockDataService renvoie ses propres
        // colonnes). Imposer ici Libellé/Débit/Crédit/Solde plaquait un schéma
        // de balance sur TOUTES les tables — aging, ratios, échéanciers,
        // immobilisations — d'où des en-têtes et des totaux sans rapport avec
        // le contenu réel. Même convention que les modèles maîtres.
        columns: [],
        rows: [],
        showHeader: true, showTotal: true, striped: true,
        bordered: false, highlightNegative: true,
      } as TableBlock;

    case 'chart':
      return {
        id, type: 'chart', locked: false, style: baseStyle,
        title: item.label, source: item.source,
        chartType: item.source.includes('donut') || item.source.includes('structure') ? 'donut'
          : item.source.includes('line') || item.source.includes('evolution') || item.source.includes('dso') || item.source.includes('bfr') || item.source.includes('cumul') ? 'line'
          : 'bar',
        data: [],
        xAxisKey: 'label',
        series: [{ key: 'value', label: 'Valeur' }],
        showLegend: true, legendPosition: 'bottom',
        height: 250, showGrid: true,
      } as ChartBlock;

    default: {
      // Dashboard → grille de KPIs réels (chaque KPI a une source kpi.* câblée)
      const dashKpis = DASHBOARD_KPIS[item.source] || DEFAULT_DASH_KPIS;
      return {
        id, type: 'kpi-grid', locked: false, style: baseStyle,
        columns: 4,
        kpis: dashKpis.map(k => ({
          label: k.label, value: null, previousValue: null,
          format: k.format, source: k.source,
          showTrend: true, showSparkline: false, size: 'medium' as const,
          locked: false, style: {},
        })),
      } as unknown as ReportBlock;
    }
  }
}
