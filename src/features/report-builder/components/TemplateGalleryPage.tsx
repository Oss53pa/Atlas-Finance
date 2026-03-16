/**
 * Template Gallery Page — Bibliothèque de modèles de rapports (onglet pleine page)
 * L'utilisateur parcourt les modèles et clique "Utiliser" → ouvre dans le Builder
 */
import React, { useState } from 'react';
import {
  Search, Briefcase, TrendingUp, BookOpen, PiggyBank,
  Target, Shield, Calculator, FileText, ArrowRight,
  BarChart3, Users, Clock, Star,
} from 'lucide-react';

// ============================================================================
// Template data
// ============================================================================

interface Template {
  id: string;
  name: string;
  description: string;
  category: 'direction' | 'financier' | 'analytique' | 'fiscal' | 'custom';
  icon: React.ReactNode;
  pageCount: number;
  sections: string[];
  popular?: boolean;
}

const templates: Template[] = [
  {
    id: 'tpl-mensuel-dg', name: 'Rapport Mensuel DG',
    description: 'Rapport de direction mensuel complet : couverture, KPIs exécutifs, P&L, trésorerie, points d\'attention et commentaires.',
    category: 'direction', icon: <Briefcase className="w-6 h-6" />, pageCount: 22,
    sections: ['Couverture', 'KPIs Exécutifs', 'Compte de Résultat', 'Trésorerie', 'Points d\'Attention'],
    popular: true,
  },
  {
    id: 'tpl-exco', name: 'Rapport EXCO / COPIL',
    description: 'Format décisionnel condensé pour les comités de direction. KPIs essentiels, graphiques tendanciels et actions requises.',
    category: 'direction', icon: <TrendingUp className="w-6 h-6" />, pageCount: 14,
    sections: ['KPIs Clés', 'Tendances', 'Actions Requises'],
    popular: true,
  },
  {
    id: 'tpl-annuel', name: 'Rapport Annuel Complet',
    description: 'États financiers SYSCOHADA complets avec bilan, compte de résultat, TAFIRE, SIG, ratios et annexes détaillées.',
    category: 'financier', icon: <BookOpen className="w-6 h-6" />, pageCount: 48,
    sections: ['Bilan', 'Compte de Résultat', 'TAFIRE', 'SIG', 'Ratios', 'Annexes'],
  },
  {
    id: 'tpl-tresorerie', name: 'Rapport Trésorerie',
    description: 'Positions bancaires, cash-flow mensuel, prévisions de trésorerie, aging clients/fournisseurs et BFR.',
    category: 'financier', icon: <PiggyBank className="w-6 h-6" />, pageCount: 8,
    sections: ['Position', 'Cash-Flow', 'Prévisions', 'Aging'],
  },
  {
    id: 'tpl-analytique', name: 'Rapport Analytique',
    description: 'Contrôle de gestion : centres de coût/profit, marges par centre, budget vs réel avec analyse des écarts.',
    category: 'analytique', icon: <Target className="w-6 h-6" />, pageCount: 16,
    sections: ['Budget vs Réel', 'Centres de Coût', 'Marges'],
  },
  {
    id: 'tpl-fiscal', name: 'Rapport Fiscal',
    description: 'Déclarations fiscales, TVA collectée/déductible, liasse fiscale et piste d\'audit.',
    category: 'fiscal', icon: <Shield className="w-6 h-6" />, pageCount: 12,
    sections: ['TVA', 'Liasse Fiscale', 'Piste d\'Audit'],
  },
  {
    id: 'tpl-banquier', name: 'Rapport Banquier',
    description: 'Synthèse financière orientée financement : bilan condensé, cash-flow, ratios de solvabilité et couverture dette.',
    category: 'financier', icon: <Calculator className="w-6 h-6" />, pageCount: 6,
    sections: ['Synthèse', 'Bilan', 'Cash-Flow', 'Ratios'],
  },
  {
    id: 'tpl-auditeur', name: 'Rapport Auditeur',
    description: 'Dossier de révision pour commissaires aux comptes : grand livre, balance, justificatifs et piste d\'audit.',
    category: 'fiscal', icon: <FileText className="w-6 h-6" />, pageCount: 30,
    sections: ['Grand Livre', 'Balance', 'Piste d\'Audit'],
  },
  {
    id: 'tpl-vierge', name: 'Rapport Personnalisé',
    description: 'Document vierge — composition libre. Construisez votre rapport de A à Z depuis le sommaire et le catalogue.',
    category: 'custom', icon: <FileText className="w-6 h-6" />, pageCount: 1,
    sections: [],
  },
];

const categoryLabels: Record<string, { label: string; color: string; bg: string }> = {
  direction: { label: 'Direction', color: 'text-neutral-900', bg: 'bg-neutral-100' },
  financier: { label: 'Financier', color: 'text-primary-700', bg: 'bg-primary-50' },
  analytique: { label: 'Analytique', color: 'text-primary-700', bg: 'bg-primary-50' },
  fiscal: { label: 'Fiscal', color: 'text-red-700', bg: 'bg-red-50' },
  custom: { label: 'Personnalisé', color: 'text-neutral-600', bg: 'bg-neutral-50' },
};

// ============================================================================
// MAIN PAGE
// ============================================================================

interface Props {
  onUseTemplate: (title: string) => void;
}

const TemplateGalleryPage: React.FC<Props> = ({ onUseTemplate }) => {
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

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-neutral-900">Modèles de Rapports</h1>
        <p className="text-sm text-neutral-500 mt-0.5">Choisissez un modèle pour démarrer rapidement votre rapport</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un modèle…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-300"
          />
        </div>
        <div className="flex items-center gap-1 bg-neutral-100 rounded-xl p-1">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeCategory === 'all' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'
            }`}
          >
            Tous ({templates.length})
          </button>
          {Object.entries(categoryLabels).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeCategory === key ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'
              }`}
            >
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {/* Template grid */}
      <div className="grid grid-cols-3 gap-5">
        {filtered.map(template => {
          const cat = categoryLabels[template.category];
          return (
            <div
              key={template.id}
              className="bg-white border border-neutral-200 rounded-2xl overflow-hidden hover:border-neutral-300 hover:shadow-md transition-all group"
            >
              {/* Template preview area */}
              <div className="bg-neutral-50 p-6 flex items-center justify-center h-40 relative">
                <div className="text-neutral-300 group-hover:text-neutral-400 transition-colors">
                  {template.icon}
                </div>
                {template.popular && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[9px] font-medium">
                    <Star className="w-2.5 h-2.5 fill-amber-500" /> Populaire
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm font-bold text-neutral-900">{template.name}</h3>
                </div>
                <p className="text-xs text-neutral-500 leading-relaxed mb-3 line-clamp-3">{template.description}</p>

                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cat.bg} ${cat.color}`}>
                    {cat.label}
                  </span>
                  <span className="text-[10px] text-neutral-400">~{template.pageCount} pages</span>
                </div>

                {template.sections.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {template.sections.map(s => (
                      <span key={s} className="text-[9px] bg-neutral-50 text-neutral-500 px-2 py-0.5 rounded-full border border-neutral-100">{s}</span>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => onUseTemplate(template.name)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl transition-colors"
                >
                  Utiliser ce modèle <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <BookOpen className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <p className="text-sm text-neutral-500">Aucun modèle trouvé</p>
        </div>
      )}
    </div>
  );
};

export default TemplateGalleryPage;
