/**
 * Master Templates — Pre-built report structures for SYSCOHADA + operational reports.
 *
 * Each template is an array of block-factories (no IDs assigned — the store
 * generates IDs when the template is instantiated).
 *
 * Consumers:
 *   import { masterTemplates } from '.../data/masterTemplates';
 *   const blocks = masterTemplates.bilan_syscohada();
 */
import type { ReportBlock } from '../types';

export type MasterTemplateId =
  | 'bilan_syscohada'
  | 'compte_resultat_annuel'
  | 'tafire'
  | 'rapport_mensuel_direction'
  | 'rapport_fiscal_trimestriel'
  | 'rapport_audit_syscohada'
  // Modèles ajoutés pour couvrir la galerie : ces entrées y étaient annoncées
  // mais retombaient sur un modèle partiel — ou sur un document vierge.
  | 'rapport_analytique'
  | 'rapport_annuel_complet'
  | 'rapport_tresorerie'
  | 'rapport_banquier'
  | 'rapport_exco';

export interface MasterTemplateMeta {
  id: MasterTemplateId;
  name: string;
  description: string;
  icon: string;
  reportType: 'bilan' | 'resultat' | 'tafire' | 'mensuel' | 'fiscal' | 'audit';
}

export const masterTemplateList: MasterTemplateMeta[] = [
  {
    id: 'bilan_syscohada',
    name: 'Bilan SYSCOHADA',
    description: 'Bilan actif/passif complet avec couverture, sommaire et signatures',
    icon: 'file-bar-chart',
    reportType: 'bilan',
  },
  {
    id: 'compte_resultat_annuel',
    name: 'Compte de Résultat Annuel',
    description: 'Compte de résultat SYSCOHADA + SIG + analyses de marge',
    icon: 'trending-up',
    reportType: 'resultat',
  },
  {
    id: 'tafire',
    name: 'TAFIRE',
    description: 'Tableau des flux de trésorerie SYSCOHADA (méthode indirecte)',
    icon: 'arrow-down-up',
    reportType: 'tafire',
  },
  {
    id: 'rapport_mensuel_direction',
    name: 'Rapport Mensuel Direction',
    description: 'Synthèse exécutive : KPIs, P&L, trésorerie, analyse PROPH3T',
    icon: 'briefcase',
    reportType: 'mensuel',
  },
  {
    id: 'rapport_fiscal_trimestriel',
    name: 'Rapport Fiscal Trimestriel',
    description: 'TVA, IS, échéances fiscales — conforme DGI',
    icon: 'shield',
    reportType: 'fiscal',
  },
  {
    id: 'rapport_audit_syscohada',
    name: "Rapport d'Audit SYSCOHADA",
    description: '108 contrôles, détection d\'anomalies, piste d\'audit',
    icon: 'shield-check',
    reportType: 'audit',
  },
  {
    id: 'rapport_analytique',
    name: 'Rapport Analytique',
    description: 'Contrôle de gestion : budget vs réel, centres de coût, marges',
    icon: 'target',
    reportType: 'mensuel',
  },
  {
    id: 'rapport_annuel_complet',
    name: 'Rapport Annuel Complet',
    description: 'Bilan, compte de résultat, TAFIRE, SIG, ratios et annexes',
    icon: 'book-open',
    reportType: 'bilan',
  },
  {
    id: 'rapport_tresorerie',
    name: 'Rapport Trésorerie',
    description: 'Position bancaire, cash-flow, prévisions et balances âgées',
    icon: 'piggy-bank',
    reportType: 'tafire',
  },
  {
    id: 'rapport_banquier',
    name: 'Dossier de Financement',
    description: 'Synthèse orientée financement : bilan, cash-flow, solvabilité',
    icon: 'calculator',
    reportType: 'bilan',
  },
  {
    id: 'rapport_exco',
    name: 'Rapport EXCO / COPIL',
    description: 'Format décisionnel : KPIs clés, tendances, actions requises',
    icon: 'trending-up',
    reportType: 'mensuel',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Block factories return a partially-typed block; we use `any` internally
// because the ReportBlock discriminated union prevents object-literal inference
// to any single branch without a cast at every call site.
type BlockFactory = Omit<ReportBlock, 'id'>;
type AnyBlockFactory = BlockFactory;

const emptyStyle = { marginBottom: 12 };

function cover(title: string, subtitle = ''): BlockFactory {
  return {
    type: 'cover',
    companyName: 'Atlas FnA',
    reportTitle: title,
    subtitle,
    backgroundStyle: 'corporate-classic',
    confidentiality: 'confidentiel',
    locked: false,
    style: { marginBottom: 0 },
  } as BlockFactory;
}

function backPage(): BlockFactory {
  return {
    type: 'back-page',
    companyName: 'Atlas FnA',
    backgroundStyle: 'corporate-classic',
    locked: false,
    style: { marginBottom: 0 },
  } as BlockFactory;
}

function h1(content: string): BlockFactory {
  return {
    type: 'text',
    content,
    variant: 'h1',
    alignment: 'left',
    locked: false,
    style: { marginBottom: 16 },
  } as BlockFactory;
}

function h2(content: string): BlockFactory {
  return {
    type: 'text',
    content,
    variant: 'h2',
    alignment: 'left',
    locked: false,
    style: { marginBottom: 12 },
  } as BlockFactory;
}

function paragraph(content = ''): BlockFactory {
  return {
    type: 'text',
    content,
    variant: 'paragraph',
    alignment: 'left',
    locked: false,
    style: { marginBottom: 8 },
  } as BlockFactory;
}

function sommaire(reportType: 'bilan' | 'resultat' | 'tafire' | 'mensuel' | 'fiscal' | 'audit'): BlockFactory {
  return {
    type: 'sommaire',
    title: 'Synthèse',
    reportType,
    showAlerts: true,
    showSignatures: true,
    signatureLabels: ['Expert-Comptable', 'Directeur Général'],
    locked: false,
    style: { marginBottom: 16 },
  } as BlockFactory;
}

function table(source: string, title: string): BlockFactory {
  return {
    type: 'table',
    title,
    source,
    columns: [],
    rows: [],
    showHeader: true,
    showTotal: true,
    striped: true,
    bordered: false,
    highlightNegative: true,
    locked: false,
    style: emptyStyle,
  } as BlockFactory;
}

function chart(source: string, title: string, chartType: 'bar' | 'line' | 'donut' | 'waterfall' = 'bar'): BlockFactory {
  return {
    type: 'chart',
    title,
    chartType,
    source,
    data: [],
    xAxisKey: 'month',
    series: [],
    showLegend: true,
    legendPosition: 'bottom',
    height: 250,
    showGrid: true,
    locked: false,
    style: emptyStyle,
  } as BlockFactory;
}

function kpiGrid(kpis: { label: string; source: string; format?: 'currency' | 'percent' | 'number' | 'days' }[]): BlockFactory {
  return {
    type: 'kpi-grid',
    columns: (kpis.length >= 4 ? 4 : kpis.length >= 3 ? 3 : 2) as 2 | 3 | 4,
    kpis: kpis.map(k => ({
      label: k.label,
      value: null,
      previousValue: null,
      format: k.format ?? 'currency',
      source: k.source,
      showTrend: true,
      showSparkline: false,
      size: 'medium',
    })),
    locked: false,
    style: { marginBottom: 12 },
  } as BlockFactory;
}

function prophetAnalysis(scope: 'bilan' | 'resultat' | 'tafire' | 'global'): BlockFactory {
  return {
    type: 'prophet_analysis',
    title: 'Analyse PROPH3T',
    autoRun: false,
    scope,
    locked: false,
    style: { marginBottom: 16 },
  } as BlockFactory;
}

function executiveSummary(): BlockFactory {
  return {
    type: 'executive_summary',
    title: 'Synthèse Exécutive',
    autoRun: false,
    bullets: [],
    locked: false,
    style: { marginBottom: 16 },
  } as BlockFactory;
}

function anomalyDetection(): BlockFactory {
  return {
    type: 'anomaly_detection',
    title: "Détection d'Anomalies",
    sensitivity: 0.5,
    maxResults: 20,
    locked: false,
    style: { marginBottom: 16 },
  } as BlockFactory;
}

function pageBreak(): BlockFactory {
  return { type: 'page-break', locked: false, style: {} } as BlockFactory;
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

function bilanSyscohada(): BlockFactory[] {
  return [
    cover('Bilan SYSCOHADA', 'Exercice clos'),
    pageBreak(),
    sommaire('bilan'),
    pageBreak(),
    h1('Bilan — Actif'),
    table('financial.bilan_actif', 'Actif (Brut / Amort / Net)'),
    pageBreak(),
    h1('Bilan — Passif'),
    table('financial.bilan_passif', 'Passif'),
    pageBreak(),
    h1('Analyse de Structure'),
    chart('chart.bilan_structure', 'Composition Actif / Passif', 'donut'),
    kpiGrid([
      { label: 'BFR', source: 'kpi.bfr' },
      { label: 'Fonds de Roulement', source: 'kpi.fonds_roulement' },
      { label: 'Trésorerie Nette', source: 'kpi.tresorerie_nette' },
      { label: 'Ratio Liquidité', source: 'kpi.ratio_liquidite', format: 'number' },
    ]),
    prophetAnalysis('bilan'),
    backPage(),
  ];
}

function compteResultatAnnuel(): BlockFactory[] {
  return [
    cover('Compte de Résultat Annuel'),
    pageBreak(),
    sommaire('resultat'),
    pageBreak(),
    h1('Compte de Résultat'),
    table('financial.compte_resultat', 'Charges & Produits'),
    pageBreak(),
    h1('Soldes Intermédiaires de Gestion'),
    table('financial.sig', 'SIG'),
    pageBreak(),
    h1('Analyses de Marge'),
    kpiGrid([
      { label: 'CA', source: 'kpi.ca_total' },
      { label: 'EBITDA', source: 'kpi.ebitda' },
      { label: 'Résultat Net', source: 'kpi.resultat_net' },
      { label: 'Marge Nette', source: 'kpi.net_margin', format: 'percent' },
    ]),
    chart('chart.pl_monthly', 'Évolution P&L Mensuel', 'line'),
    chart('chart.marge_evolution', 'Évolution Marge Brute', 'line'),
    prophetAnalysis('resultat'),
    backPage(),
  ];
}

function tafire(): BlockFactory[] {
  return [
    cover('TAFIRE', 'Tableau des flux de trésorerie'),
    pageBreak(),
    sommaire('tafire'),
    pageBreak(),
    h1('TAFIRE — Méthode Indirecte'),
    table('financial.tft_indirect', 'Flux de trésorerie'),
    pageBreak(),
    h2('Cascade des Flux'),
    chart('chart.tft_waterfall', 'Waterfall TFT', 'waterfall'),
    chart('chart.tft_3flux', '3 Flux Comparés', 'bar'),
    kpiGrid([
      { label: 'CAF', source: 'kpi.caf' },
      { label: 'Free Cash Flow', source: 'kpi.free_cashflow' },
      { label: 'Flux Exploitation', source: 'kpi.flux_exploitation' },
      { label: 'Variation Trésorerie', source: 'kpi.variation_tresorerie' },
    ]),
    prophetAnalysis('tafire'),
    backPage(),
  ];
}

function rapportMensuelDirection(): BlockFactory[] {
  return [
    cover('Rapport Mensuel Direction'),
    pageBreak(),
    sommaire('mensuel'),
    executiveSummary(),
    pageBreak(),
    h1('Indicateurs Clés'),
    kpiGrid([
      { label: 'CA', source: 'kpi.ca_total' },
      { label: 'Résultat Net', source: 'kpi.resultat_net' },
      { label: 'Trésorerie Nette', source: 'kpi.tresorerie_nette' },
      { label: 'DSO', source: 'kpi.dso', format: 'days' },
    ]),
    h2('Évolution'),
    chart('chart.ca_evolution', 'Évolution CA', 'line'),
    chart('chart.cashflow_monthly', 'Cash-Flow Mensuel', 'bar'),
    pageBreak(),
    h1('Alertes & Anomalies'),
    anomalyDetection(),
    prophetAnalysis('global'),
    pageBreak(),
    h1('Exécution Budgétaire'),
    table('budget.execution', 'Budget / Engagé / Réalisé / Disponible'),
    table('budget.ecarts_significatifs', 'Écarts significatifs'),
    backPage(),
  ];
}

function rapportFiscalTrimestriel(): BlockFactory[] {
  return [
    cover('Rapport Fiscal Trimestriel'),
    pageBreak(),
    sommaire('fiscal'),
    pageBreak(),
    h1('TVA'),
    table('tax.tva_declaration', 'Déclaration TVA'),
    chart('chart.tva_evolution', 'Évolution TVA', 'line'),
    pageBreak(),
    h1('Impôt sur les Sociétés'),
    table('tax.is_acomptes', 'Acomptes IS'),
    kpiGrid([
      { label: 'TVA à Payer', source: 'kpi.tva_net_a_payer' },
      { label: 'IS Prévisionnel', source: 'kpi.is_previsionnel' },
    ]),
    pageBreak(),
    h1('Échéances Fiscales'),
    table('fiscal.echeancier', 'Calendrier Fiscal'),
    prophetAnalysis('global'),
    backPage(),
  ];
}

function rapportAuditSyscohada(): BlockFactory[] {
  return [
    cover("Rapport d'Audit SYSCOHADA"),
    pageBreak(),
    sommaire('audit'),
    pageBreak(),
    h1('108 Contrôles SYSCOHADA'),
    table('audit.controles_syscohada', 'Résultats des contrôles'),
    pageBreak(),
    h1('Détection d\'Anomalies'),
    anomalyDetection(),
    chart('chart.benford', 'Distribution Benford', 'bar'),
    chart('chart.anomalies_timeline', 'Timeline Anomalies', 'line'),
    kpiGrid([
      { label: 'Indice Benford', source: 'kpi.benford_index', format: 'number' },
      { label: 'Ratio Endettement', source: 'kpi.ratio_endettement', format: 'percent' },
      { label: 'Créances Clients', source: 'kpi.creances_clients' },
      { label: 'Dettes Fournisseurs', source: 'kpi.dettes_fournisseurs' },
    ]),
    pageBreak(),
    h1('Piste d\'Audit'),
    table('audit.trail', 'Écritures sensibles'),
    prophetAnalysis('global'),
    backPage(),
  ];
}

function rapportAnalytique(): BlockFactory[] {
  return [
    cover('Rapport Analytique', 'Contrôle de gestion'),
    pageBreak(),
    sommaire('mensuel'),
    pageBreak(),
    h1('Budget vs Réel'),
    table('budget.vs_actual', 'Budget / Réalisé / Écart'),
    chart('chart.budget_vs_actual', 'Budget vs Réalisé', 'bar'),
    table('budget.ecarts_significatifs', 'Écarts significatifs'),
    pageBreak(),
    h1('Centres de Coût & de Profit'),
    table('analytics.by_center', 'Résultat par centre'),
    table('analytics.sections_performance', 'Performance par section'),
    pageBreak(),
    h1('Marges'),
    kpiGrid([
      { label: 'Marge Brute', source: 'kpi.marge_brute' },
      { label: 'Marge Brute %', source: 'kpi.marge_brute_pct', format: 'percent' },
      { label: 'EBITDA', source: 'kpi.ebitda' },
      { label: 'Marge Nette', source: 'kpi.net_margin', format: 'percent' },
    ]),
    chart('chart.marge_evolution', 'Évolution de la Marge', 'line'),
    chart('chart.charges_structure', 'Structure des Charges', 'donut'),
    prophetAnalysis('resultat'),
    backPage(),
  ];
}

function rapportAnnuelComplet(): BlockFactory[] {
  return [
    cover('Rapport Annuel', 'États financiers SYSCOHADA'),
    pageBreak(),
    sommaire('bilan'),
    executiveSummary(),
    pageBreak(),
    h1('Bilan — Actif'),
    table('financial.bilan_actif', 'Actif (Brut / Amort / Net)'),
    pageBreak(),
    h1('Bilan — Passif'),
    table('financial.bilan_passif', 'Passif'),
    pageBreak(),
    h1('Compte de Résultat'),
    table('financial.compte_resultat', 'Charges & Produits'),
    chart('chart.pl_monthly', 'Évolution P&L Mensuel', 'line'),
    pageBreak(),
    h1('TAFIRE'),
    table('financial.tft_indirect', 'Flux de trésorerie'),
    chart('chart.tft_waterfall', 'Waterfall TFT', 'waterfall'),
    pageBreak(),
    h1('Soldes Intermédiaires de Gestion'),
    table('financial.sig', 'SIG'),
    pageBreak(),
    h1('Ratios'),
    kpiGrid([
      { label: 'Rentabilité (ROE)', source: 'kpi.roe', format: 'percent' },
      { label: 'Ratio Endettement', source: 'kpi.ratio_endettement', format: 'percent' },
      { label: 'Liquidité Générale', source: 'kpi.current_ratio', format: 'number' },
      { label: 'BFR', source: 'kpi.bfr' },
    ]),
    chart('chart.ratios_trend', 'Tendance des Ratios', 'line'),
    chart('chart.comparatif_n_n1', 'Comparatif N / N-1', 'bar'),
    pageBreak(),
    h1('Annexes'),
    table('accounting.balance_generale', 'Balance générale'),
    table('assets.registry', 'Registre des immobilisations'),
    prophetAnalysis('global'),
    backPage(),
  ];
}

function rapportTresorerie(): BlockFactory[] {
  return [
    cover('Rapport Trésorerie'),
    pageBreak(),
    sommaire('tafire'),
    pageBreak(),
    h1('Position de Trésorerie'),
    table('treasury.comptes_bancaires', 'Comptes bancaires'),
    kpiGrid([
      { label: 'Trésorerie Nette', source: 'kpi.tresorerie_nette' },
      { label: 'BFR', source: 'kpi.bfr' },
      { label: 'DSO', source: 'kpi.dso', format: 'days' },
      { label: 'DPO', source: 'kpi.dpo', format: 'days' },
    ]),
    pageBreak(),
    h1('Cash-Flow'),
    chart('chart.cashflow_monthly', 'Cash-Flow Mensuel', 'bar'),
    table('financial.tft_indirect', 'Flux de trésorerie'),
    pageBreak(),
    h1('Prévisions'),
    table('treasury.previsions_cash', 'Prévisions de trésorerie'),
    pageBreak(),
    h1('Aging Clients & Fournisseurs'),
    table('tiers.aging_clients', 'Balance âgée clients'),
    chart('chart.aging_clients', 'Aging Clients', 'bar'),
    table('tiers.aging_fournisseurs', 'Balance âgée fournisseurs'),
    prophetAnalysis('tafire'),
    backPage(),
  ];
}

function rapportBanquier(): BlockFactory[] {
  return [
    cover('Dossier de Financement', 'Synthèse financière'),
    pageBreak(),
    sommaire('bilan'),
    executiveSummary(),
    pageBreak(),
    h1('Synthèse'),
    kpiGrid([
      { label: "Chiffre d'Affaires", source: 'kpi.ca_total' },
      { label: 'EBITDA', source: 'kpi.ebitda' },
      { label: 'Résultat Net', source: 'kpi.resultat_net' },
      { label: 'Trésorerie Nette', source: 'kpi.tresorerie_nette' },
    ]),
    chart('chart.ca_evolution', 'Évolution du CA', 'line'),
    pageBreak(),
    h1('Bilan Condensé'),
    table('financial.bilan_actif', 'Actif'),
    table('financial.bilan_passif', 'Passif'),
    pageBreak(),
    h1('Cash-Flow'),
    table('financial.tft_indirect', 'Flux de trésorerie'),
    chart('chart.tft_3flux', '3 Flux Comparés', 'bar'),
    pageBreak(),
    h1('Ratios de Solvabilité'),
    kpiGrid([
      { label: 'Ratio Endettement', source: 'kpi.ratio_endettement', format: 'percent' },
      { label: 'Dette / Fonds Propres', source: 'kpi.debt_to_equity', format: 'number' },
      { label: 'Couverture des Intérêts', source: 'kpi.interest_coverage', format: 'number' },
      { label: 'Score Altman Z', source: 'kpi.altman_zscore', format: 'number' },
    ]),
    chart('chart.ratios_trend', 'Tendance des Ratios', 'line'),
    prophetAnalysis('bilan'),
    backPage(),
  ];
}

function rapportExco(): BlockFactory[] {
  return [
    cover('Rapport EXCO / COPIL', 'Format décisionnel'),
    sommaire('mensuel'),
    executiveSummary(),
    pageBreak(),
    h1('KPIs Clés'),
    kpiGrid([
      { label: "Chiffre d'Affaires", source: 'kpi.ca_total' },
      { label: 'Résultat Net', source: 'kpi.resultat_net' },
      { label: 'Trésorerie Nette', source: 'kpi.tresorerie_nette' },
      { label: 'Marge Nette', source: 'kpi.net_margin', format: 'percent' },
    ]),
    h2('Tendances'),
    chart('chart.ca_evolution', 'Évolution du CA', 'line'),
    chart('chart.ebitda_trimestriel', 'EBITDA Trimestriel', 'bar'),
    chart('chart.budget_vs_actual', 'Budget vs Réalisé', 'bar'),
    pageBreak(),
    h1('Actions Requises'),
    anomalyDetection(),
    table('budget.ecarts_significatifs', 'Écarts à arbitrer'),
    prophetAnalysis('global'),
    backPage(),
  ];
}

export const masterTemplates: Record<MasterTemplateId, () => BlockFactory[]> = {
  bilan_syscohada: bilanSyscohada,
  compte_resultat_annuel: compteResultatAnnuel,
  tafire,
  rapport_mensuel_direction: rapportMensuelDirection,
  rapport_fiscal_trimestriel: rapportFiscalTrimestriel,
  rapport_audit_syscohada: rapportAuditSyscohada,
  rapport_analytique: rapportAnalytique,
  rapport_annuel_complet: rapportAnnuelComplet,
  rapport_tresorerie: rapportTresorerie,
  rapport_banquier: rapportBanquier,
  rapport_exco: rapportExco,
};

export interface TemplateInstantiationOptions {
  /** Real company name to inject into cover/back-page blocks (replaces 'Atlas FnA') */
  companyName?: string;
}

/** Get blocks for a given template ID, optionally injecting real company name. */
export function getMasterTemplateBlocks(id: MasterTemplateId, options?: TemplateInstantiationOptions): BlockFactory[] {
  const factory = masterTemplates[id];
  if (!factory) return [];
  const blocks = factory();
  if (options?.companyName) {
    return blocks.map(block =>
      ('companyName' in block)
        ? { ...block, companyName: options.companyName }
        : block
    );
  }
  return blocks;
}
