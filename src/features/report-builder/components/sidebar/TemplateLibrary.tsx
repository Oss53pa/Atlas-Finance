// @ts-nocheck
/**
 * Template Library — Pre-built report templates
 * CDC Section 6.4 — Onglet Modèles
 */
import React, { useState } from 'react';
import {
  Search, FileText, BarChart3, Shield, Target,
  Briefcase, PieChart, Calculator, TrendingUp,
  Clock, Users, Package, PiggyBank, BookOpen,
  ArrowRight, Star,
} from 'lucide-react';
import { useReportBuilderStore } from '../../store/useReportBuilderStore';
import type { ReportBlock, TextBlock, KPIGridBlock, ChartBlock, TableBlock, SeparatorBlock } from '../../types';

// ============================================================================
// Template definitions
// ============================================================================

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: 'direction' | 'financier' | 'analytique' | 'fiscal' | 'custom';
  icon: React.ReactNode;
  pageCount: number;
  sections: string[];
  /** Generates the initial blocks for the report */
  generateBlocks: () => ReportBlock[];
}

function uid(): string { return crypto.randomUUID(); }

const templates: ReportTemplate[] = [
  {
    id: 'tpl-mensuel-dg',
    name: 'Rapport Mensuel DG',
    description: 'Couverture + Sommaire + KPIs + P&L + Cash + Commentaires',
    category: 'direction',
    icon: <Briefcase className="w-5 h-5" />,
    pageCount: 22,
    sections: ['Couverture', 'KPIs Exécutifs', 'Compte de Résultat', 'Trésorerie', 'Points d\'Attention'],
    generateBlocks: () => [
      { id: uid(), type: 'cover', locked: false, style: { marginBottom: 0 }, companyName: 'Atlas Finance', reportTitle: 'Rapport Mensuel de Direction', subtitle: '', backgroundStyle: 'corporate-classic', confidentiality: 'confidentiel' } as ReportBlock,
      { id: uid(), type: 'text', locked: false, style: { marginBottom: 16 }, content: 'Vue Exécutive', variant: 'h1', alignment: 'left' } as TextBlock,
      { id: uid(), type: 'kpi-grid', locked: false, style: { marginBottom: 16 }, columns: 4, kpis: [
        { label: 'Chiffre d\'Affaires', value: null, format: 'currency', showTrend: true, showSparkline: false, size: 'medium', locked: false, style: {}, source: 'kpi.ca_total' },
        { label: 'Résultat Net', value: null, format: 'currency', showTrend: true, showSparkline: false, size: 'medium', locked: false, style: {}, source: 'kpi.resultat_net' },
        { label: 'EBITDA', value: null, format: 'currency', showTrend: true, showSparkline: false, size: 'medium', locked: false, style: {}, source: 'kpi.ebitda' },
        { label: 'Trésorerie Nette', value: null, format: 'currency', showTrend: true, showSparkline: false, size: 'medium', locked: false, style: {}, source: 'kpi.tresorerie_nette' },
      ] } as KPIGridBlock,
      { id: uid(), type: 'text', locked: false, style: { marginBottom: 8 }, content: '', variant: 'paragraph', alignment: 'left' } as TextBlock,
      { id: uid(), type: 'separator', locked: false, style: { marginBottom: 12 }, lineStyle: 'solid', thickness: 1 } as SeparatorBlock,
      { id: uid(), type: 'text', locked: false, style: { marginBottom: 12 }, content: 'Compte de Résultat', variant: 'h1', alignment: 'left' } as TextBlock,
      { id: uid(), type: 'chart', locked: false, style: { marginBottom: 12 }, title: 'Évolution P&L Mensuel', chartType: 'line', source: 'chart.pl_monthly', data: [], xAxisKey: 'month', series: [{ key: 'produits', label: 'Produits' }, { key: 'charges', label: 'Charges' }, { key: 'resultat', label: 'Résultat' }], showLegend: true, legendPosition: 'bottom', height: 250, showGrid: true } as ChartBlock,
      { id: uid(), type: 'table', locked: false, style: { marginBottom: 12 }, title: 'Compte de Résultat Condensé', source: 'financial.compte_resultat', columns: [{ key: 'label', label: 'Libellé', align: 'left', format: 'text', visible: true }, { key: 'current', label: 'N', align: 'right', format: 'currency', visible: true }, { key: 'previous', label: 'N-1', align: 'right', format: 'currency', visible: true }, { key: 'variation', label: 'Var %', align: 'right', format: 'percent', visible: true }], rows: [], showHeader: true, showTotal: true, striped: true, bordered: false, highlightNegative: true } as TableBlock,
      { id: uid(), type: 'text', locked: false, style: { marginBottom: 12 }, content: 'Trésorerie', variant: 'h1', alignment: 'left' } as TextBlock,
      { id: uid(), type: 'chart', locked: false, style: { marginBottom: 12 }, title: 'Cash-Flow Mensuel', chartType: 'bar', source: 'chart.cashflow_monthly', data: [], xAxisKey: 'month', series: [{ key: 'encaissements', label: 'Encaissements' }, { key: 'decaissements', label: 'Décaissements' }], showLegend: true, legendPosition: 'bottom', height: 220, showGrid: true } as ChartBlock,
      { id: uid(), type: 'text', locked: false, style: { marginBottom: 12 }, content: 'Points d\'Attention', variant: 'h1', alignment: 'left' } as TextBlock,
      { id: uid(), type: 'text', locked: false, style: { marginBottom: 8 }, content: '', variant: 'paragraph', alignment: 'left' } as TextBlock,
    ],
  },
  {
    id: 'tpl-exco',
    name: 'Rapport EXCO / COPIL',
    description: 'Format décisionnel condensé, KPIs exécutifs, graphiques essentiels',
    category: 'direction',
    icon: <TrendingUp className="w-5 h-5" />,
    pageCount: 14,
    sections: ['KPIs Clés', 'Tendances', 'Actions Requises'],
    generateBlocks: () => [
      { id: uid(), type: 'cover', locked: false, style: { marginBottom: 0 }, companyName: 'Atlas Finance', reportTitle: 'Rapport EXCO', subtitle: 'Comité de Direction', backgroundStyle: 'executive-dark', confidentiality: 'confidentiel' } as ReportBlock,
      { id: uid(), type: 'text', locked: false, style: { marginBottom: 12 }, content: 'Indicateurs Clés', variant: 'h1', alignment: 'left' } as TextBlock,
      { id: uid(), type: 'kpi-grid', locked: false, style: { marginBottom: 16 }, columns: 3, kpis: [
        { label: 'CA', value: null, format: 'currency', showTrend: true, showSparkline: false, size: 'large', locked: false, style: {} },
        { label: 'Marge Nette', value: null, format: 'percent', showTrend: true, showSparkline: false, size: 'large', locked: false, style: {} },
        { label: 'Trésorerie', value: null, format: 'currency', showTrend: true, showSparkline: false, size: 'large', locked: false, style: {} },
      ] } as KPIGridBlock,
    ],
  },
  {
    id: 'tpl-annuel',
    name: 'Rapport Annuel Complet',
    description: 'États SYSCOHADA complets + Annexes + Tableaux détaillés',
    category: 'financier',
    icon: <BookOpen className="w-5 h-5" />,
    pageCount: 48,
    sections: ['Bilan', 'Compte de Résultat', 'TAFIRE', 'SIG', 'Ratios', 'Annexes'],
    generateBlocks: () => [
      { id: uid(), type: 'cover', locked: false, style: { marginBottom: 0 }, companyName: 'Atlas Finance', reportTitle: 'Rapport Annuel', subtitle: 'Exercice 2025', backgroundStyle: 'finance-modern', confidentiality: 'confidentiel' } as ReportBlock,
      { id: uid(), type: 'text', locked: false, style: { marginBottom: 12 }, content: 'Bilan SYSCOHADA', variant: 'h1', alignment: 'left' } as TextBlock,
      { id: uid(), type: 'table', locked: false, style: { marginBottom: 12 }, title: 'Bilan Actif', source: 'financial.bilan_actif', columns: [{ key: 'label', label: 'Poste', align: 'left', format: 'text', visible: true }, { key: 'brut', label: 'Brut', align: 'right', format: 'currency', visible: true }, { key: 'amort', label: 'Amort./Prov.', align: 'right', format: 'currency', visible: true }, { key: 'net', label: 'Net N', align: 'right', format: 'currency', visible: true }, { key: 'net_n1', label: 'Net N-1', align: 'right', format: 'currency', visible: true }], rows: [], showHeader: true, showTotal: true, striped: false, bordered: true, highlightNegative: false } as TableBlock,
    ],
  },
  {
    id: 'tpl-tresorerie',
    name: 'Rapport Trésorerie',
    description: 'Positions bancaires + Cash-flow + Prévisions + Aging',
    category: 'financier',
    icon: <PiggyBank className="w-5 h-5" />,
    pageCount: 8,
    sections: ['Position', 'Cash-Flow', 'Prévisions', 'Aging'],
    generateBlocks: () => [
      { id: uid(), type: 'text', locked: false, style: { marginBottom: 12 }, content: 'Rapport de Trésorerie', variant: 'h1', alignment: 'left' } as TextBlock,
      { id: uid(), type: 'kpi-grid', locked: false, style: { marginBottom: 16 }, columns: 3, kpis: [
        { label: 'Trésorerie Nette', value: null, format: 'currency', showTrend: true, showSparkline: false, size: 'large', locked: false, style: {}, source: 'kpi.tresorerie_nette' },
        { label: 'BFR', value: null, format: 'currency', showTrend: true, showSparkline: false, size: 'large', locked: false, style: {}, source: 'kpi.bfr' },
        { label: 'DSO', value: null, format: 'days', showTrend: true, showSparkline: false, size: 'large', locked: false, style: {}, source: 'kpi.dso' },
      ] } as KPIGridBlock,
    ],
  },
  {
    id: 'tpl-analytique',
    name: 'Rapport Analytique',
    description: 'Centres de coût/profit + Marges + Budget vs Réel',
    category: 'analytique',
    icon: <Target className="w-5 h-5" />,
    pageCount: 16,
    sections: ['Budget vs Réel', 'Centres de Coût', 'Marges'],
    generateBlocks: () => [
      { id: uid(), type: 'text', locked: false, style: { marginBottom: 12 }, content: 'Rapport de Contrôle de Gestion', variant: 'h1', alignment: 'left' } as TextBlock,
      { id: uid(), type: 'chart', locked: false, style: { marginBottom: 12 }, title: 'Budget vs Réel', chartType: 'grouped-bar', source: 'chart.budget_vs_actual', data: [], xAxisKey: 'category', series: [{ key: 'budget', label: 'Budget' }, { key: 'reel', label: 'Réel' }], showLegend: true, legendPosition: 'bottom', height: 280, showGrid: true } as ChartBlock,
    ],
  },
  {
    id: 'tpl-fiscal',
    name: 'Rapport Fiscal',
    description: 'Déclarations + Liasse + Tableaux TVA',
    category: 'fiscal',
    icon: <Shield className="w-5 h-5" />,
    pageCount: 12,
    sections: ['TVA', 'Liasse Fiscale', 'Piste d\'Audit'],
    generateBlocks: () => [
      { id: uid(), type: 'text', locked: false, style: { marginBottom: 12 }, content: 'Rapport Fiscal', variant: 'h1', alignment: 'left' } as TextBlock,
    ],
  },
  {
    id: 'tpl-banquier',
    name: 'Rapport Banquier',
    description: 'Synthèse financière orientée financement et solvabilité',
    category: 'financier',
    icon: <Calculator className="w-5 h-5" />,
    pageCount: 6,
    sections: ['Synthèse', 'Bilan', 'Cash-Flow', 'Ratios'],
    generateBlocks: () => [
      { id: uid(), type: 'cover', locked: false, style: { marginBottom: 0 }, companyName: 'Atlas Finance', reportTitle: 'Rapport Financier', subtitle: 'À l\'attention de nos partenaires bancaires', backgroundStyle: 'formal', confidentiality: 'confidentiel' } as ReportBlock,
      { id: uid(), type: 'text', locked: false, style: { marginBottom: 12 }, content: 'Synthèse Financière', variant: 'h1', alignment: 'left' } as TextBlock,
    ],
  },
  {
    id: 'tpl-auditeur',
    name: 'Rapport Auditeur',
    description: 'Grand livre + Justificatifs + Piste d\'audit',
    category: 'fiscal',
    icon: <FileText className="w-5 h-5" />,
    pageCount: 30,
    sections: ['Grand Livre', 'Balance', 'Piste d\'Audit'],
    generateBlocks: () => [
      { id: uid(), type: 'text', locked: false, style: { marginBottom: 12 }, content: 'Dossier de Révision', variant: 'h1', alignment: 'left' } as TextBlock,
    ],
  },
  {
    id: 'tpl-vierge',
    name: 'Rapport Personnalisé',
    description: 'Document vierge — composition libre',
    category: 'custom',
    icon: <FileText className="w-5 h-5" />,
    pageCount: 1,
    sections: [],
    generateBlocks: () => [],
  },
];

const categoryLabels: Record<string, { label: string; color: string }> = {
  direction: { label: 'Direction', color: 'bg-neutral-200 text-neutral-900' },
  financier: { label: 'Financier', color: 'bg-primary-100 text-primary-700' },
  analytique: { label: 'Analytique', color: 'bg-primary-100 text-primary-700' },
  fiscal: { label: 'Fiscal', color: 'bg-red-100 text-red-700' },
  custom: { label: 'Personnalisé', color: 'bg-neutral-100 text-neutral-700' },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const TemplateLibrary: React.FC = () => {
  const { createDocument, document: doc } = useReportBuilderStore();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filtered = templates.filter(t => {
    if (activeCategory !== 'all' && t.category !== activeCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      return t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
    }
    return true;
  });

  const handleApplyTemplate = (template: ReportTemplate) => {
    // Create a new document from template
    const period = doc?.period || { type: 'monthly' as const, startDate: '2025-12-01', endDate: '2025-12-31', label: 'Décembre 2025' };
    const store = useReportBuilderStore.getState();

    store.createDocument(template.name, period);

    // Add template blocks to the first page
    const blocks = template.generateBlocks();
    for (const block of blocks) {
      store.addBlock(0, block);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 pt-3 pb-2">
        <div className="text-xs font-bold text-neutral-800 mb-2">Modèles de Rapports</div>
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un modèle…"
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-500"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-2 py-0.5 text-[9px] rounded-md font-medium ${activeCategory === 'all' ? 'bg-neutral-800 text-white' : 'bg-neutral-100 text-neutral-500'}`}
          >
            Tous ({templates.length})
          </button>
          {Object.entries(categoryLabels).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={`px-2 py-0.5 text-[9px] rounded-md font-medium ${activeCategory === key ? 'bg-neutral-800 text-white' : 'bg-neutral-100 text-neutral-500'}`}
            >
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-2">
        {filtered.map(template => {
          const cat = categoryLabels[template.category];
          return (
            <div
              key={template.id}
              className="border border-neutral-200 rounded-lg p-3 hover:border-neutral-300 hover:shadow-sm transition-all bg-white group"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-neutral-50 text-neutral-500 group-hover:bg-neutral-100 group-hover:text-neutral-700 transition-colors">
                  {template.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-neutral-800">{template.name}</div>
                  <p className="text-[10px] text-neutral-500 mt-0.5">{template.description}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${cat.color}`}>
                      {cat.label}
                    </span>
                    <span className="text-[9px] text-neutral-400">~{template.pageCount} pages</span>
                  </div>
                  {template.sections.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {template.sections.map(s => (
                        <span key={s} className="text-[8px] bg-neutral-50 text-neutral-400 px-1.5 py-0.5 rounded">{s}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleApplyTemplate(template)}
                className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded transition-colors opacity-0 group-hover:opacity-100"
              >
                Utiliser ce modèle <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TemplateLibrary;
