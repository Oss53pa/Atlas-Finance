/**
 * BudgetGroupTabs — barres d'onglets des groupes du module Contrôle de Gestion.
 * Chaque groupe (Élaboration / Suivi / Engagements / Analytique) = une entrée de
 * sidebar + un onglet par écran. Réduit la sidebar de ~17 à 7 entrées.
 */
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Calendar, FileBarChart, TrendingUp, Lock, Activity, BarChart3, Target, Calculator,
  Bell, Archive, FileCheck, Link2, PieChart, Split, Layers, Trophy, PiggyBank, Shuffle, Landmark,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

/** `labelKey` et non `label` : ces tables sont figées au chargement du module ;
 *  la traduction se résout au rendu via `t(tab.labelKey)`. */
export interface GroupTab { path: string; labelKey: string; icon: React.ComponentType<{ className?: string }>; exact?: boolean; }

export const ELABORATION_TABS: GroupTab[] = [
  { path: '/budget/campagne', labelKey: 'budgetGroupTabs.campaign', icon: Calendar },
  { path: '/budget/table', labelKey: 'budgetGroupTabs.entryImport', icon: FileBarChart },
  { path: '/budget/revenus', labelKey: 'budgetGroupTabs.revenue', icon: TrendingUp },
  { path: '/budget/versions', labelKey: 'budgetGroupTabs.versions', icon: Lock },
];
export const SUIVI_TABS: GroupTab[] = [
  { path: '/budget/cockpit', labelKey: 'budgetGroupTabs.cockpit', icon: Activity },
  { path: '/budget/exploitation', labelKey: 'budgetGroupTabs.budgetVsActual', icon: BarChart3, exact: true },
  { path: '/budget/ecarts', labelKey: 'budgetGroupTabs.variances', icon: Target },
  { path: '/budget/pnl', labelKey: 'budgetGroupTabs.result', icon: Calculator },
  { path: '/budget/alertes', labelKey: 'budgetGroupTabs.alerts', icon: Bell },
  { path: '/budget/snapshots', labelKey: 'budgetGroupTabs.snapshots', icon: Archive },
];
export const ENGAGEMENTS_TABS: GroupTab[] = [
  { path: '/budget/engagements', labelKey: 'budgetGroupTabs.commitments', icon: FileCheck },
  { path: '/budget/lettrage', labelKey: 'budgetGroupTabs.matching', icon: Link2 },
];
export const ANALYTIQUE_TABS: GroupTab[] = [
  { path: '/analytique', labelKey: 'budgetGroupTabs.costAccounting', icon: PieChart, exact: true },
  { path: '/budget/ventilation', labelKey: 'budgetGroupTabs.allocationEngine', icon: Split },
];
export const CAPEX_TABS: GroupTab[] = [
  { path: '/capex', labelKey: 'budgetGroupTabs.portfolio', icon: Layers, exact: true },
  { path: '/capex/business-cases', labelKey: 'budgetGroupTabs.businessCases', icon: FileBarChart },
  { path: '/capex/priorisation', labelKey: 'budgetGroupTabs.prioritisation', icon: Trophy },
  { path: '/capex/car', labelKey: 'budgetGroupTabs.car', icon: Landmark },
  { path: '/capex/enveloppe', labelKey: 'budgetGroupTabs.envelope', icon: PiggyBank },
  { path: '/capex/reaffectations', labelKey: 'budgetGroupTabs.reallocations', icon: Shuffle },
];

/** Groupes du module Contrôle de Gestion : chemins membres → onglets. */
const GROUPS: { match: string[]; tabs: GroupTab[] }[] = [
  { match: ['/budget/campagne', '/budget/table', '/budget/revenus', '/budget/versions'], tabs: ELABORATION_TABS },
  { match: ['/budget/cockpit', '/budget/exploitation', '/budget/ecarts', '/budget/pnl', '/budget/alertes', '/budget/snapshots'], tabs: SUIVI_TABS },
  { match: ['/budget/engagements', '/budget/lettrage'], tabs: ENGAGEMENTS_TABS },
  { match: ['/analytique', '/budget/ventilation'], tabs: ANALYTIQUE_TABS },
  { match: ['/capex'], tabs: CAPEX_TABS },
];

/** Onglets de groupe correspondant au chemin courant, ou null (pas de groupe). */
export function groupTabsForPath(pathname: string): GroupTab[] | null {
  for (const g of GROUPS) {
    if (g.match.some((p) => pathname === p || pathname.startsWith(p + '/'))) return g.tabs;
  }
  return null;
}

export const GroupTabs: React.FC<{ tabs: GroupTab[] }> = ({ tabs }) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const active = (tab: GroupTab) => (tab.exact ? pathname === tab.path : pathname === tab.path || pathname.startsWith(tab.path + '/'));
  return (
    <div className="flex items-center gap-1 border-b border-[var(--color-border)] -mt-1 mb-1 overflow-x-auto">
      {tabs.map((tab) => {
        const Icon = tab.icon; const on = active(tab);
        return (
          <button key={tab.path} onClick={() => navigate(tab.path)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm whitespace-nowrap border-b-2 -mb-px transition ${
              on ? 'border-[var(--color-primary)] text-[var(--color-primary)] dark:text-[var(--color-primary)] font-medium'
              : 'border-transparent text-[var(--color-text-secondary)] hover:text-neutral-800 dark:hover:text-neutral-200'}`}>
            <Icon className="w-4 h-4" /> {t(tab.labelKey)}
          </button>
        );
      })}
    </div>
  );
};

export default GroupTabs;
