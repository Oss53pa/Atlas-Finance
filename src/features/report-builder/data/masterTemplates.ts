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
  | 'rapport_audit_syscohada';

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
    companyName: 'Atlas F&A',
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
    companyName: 'Atlas F&A',
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

export const masterTemplates: Record<MasterTemplateId, () => BlockFactory[]> = {
  bilan_syscohada: bilanSyscohada,
  compte_resultat_annuel: compteResultatAnnuel,
  tafire,
  rapport_mensuel_direction: rapportMensuelDirection,
  rapport_fiscal_trimestriel: rapportFiscalTrimestriel,
  rapport_audit_syscohada: rapportAuditSyscohada,
};

/** Get blocks for a given template ID. */
export function getMasterTemplateBlocks(id: MasterTemplateId): BlockFactory[] {
  const factory = masterTemplates[id];
  return factory ? factory() : [];
}
