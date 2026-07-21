/**
 * BudgetGroupTabs — barres d'onglets des groupes du module Contrôle de Gestion.
 * Chaque groupe (Élaboration / Suivi / Engagements / Analytique) = une entrée de
 * sidebar + un onglet par écran. Réduit la sidebar de ~17 à 7 entrées.
 */
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Calendar, FileBarChart, TrendingUp, Lock, Activity, BarChart3, Target, Calculator,
  Bell, Archive, FileCheck, Link2, PieChart, Split, Layers, Trophy, PiggyBank, Shuffle,
} from 'lucide-react';

export interface GroupTab { path: string; label: string; icon: React.ComponentType<{ className?: string }>; exact?: boolean; }

export const ELABORATION_TABS: GroupTab[] = [
  { path: '/budget/campagne', label: 'Campagne', icon: Calendar },
  { path: '/budget/table', label: 'Saisie & Import', icon: FileBarChart },
  { path: '/budget/revenus', label: 'Revenus', icon: TrendingUp },
  { path: '/budget/versions', label: 'Versions', icon: Lock },
];
export const SUIVI_TABS: GroupTab[] = [
  { path: '/budget/cockpit', label: 'Cockpit', icon: Activity },
  { path: '/budget/exploitation', label: 'Budget vs Réalisé', icon: BarChart3, exact: true },
  { path: '/budget/ecarts', label: 'Écarts', icon: Target },
  { path: '/budget/pnl', label: 'Résultat', icon: Calculator },
  { path: '/budget/alertes', label: 'Alertes', icon: Bell },
  { path: '/budget/snapshots', label: 'Snapshots', icon: Archive },
];
export const ENGAGEMENTS_TABS: GroupTab[] = [
  { path: '/budget/engagements', label: 'Engagements', icon: FileCheck },
  { path: '/budget/lettrage', label: 'Lettrage', icon: Link2 },
];
export const ANALYTIQUE_TABS: GroupTab[] = [
  { path: '/analytique', label: 'Comptabilité Analytique', icon: PieChart, exact: true },
  { path: '/budget/ventilation', label: 'Moteur de Ventilation', icon: Split },
];
export const CAPEX_TABS: GroupTab[] = [
  { path: '/capex', label: 'Portefeuille', icon: Layers, exact: true },
  { path: '/capex/business-cases', label: 'Business Cases', icon: FileBarChart },
  { path: '/capex/priorisation', label: 'Priorisation', icon: Trophy },
  { path: '/capex/enveloppe', label: 'Enveloppe', icon: PiggyBank },
  { path: '/capex/reaffectations', label: 'Réaffectations', icon: Shuffle },
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
  const active = (t: GroupTab) => (t.exact ? pathname === t.path : pathname === t.path || pathname.startsWith(t.path + '/'));
  return (
    <div className="flex items-center gap-1 border-b border-[var(--color-border)] -mt-1 mb-1 overflow-x-auto">
      {tabs.map((t) => {
        const Icon = t.icon; const on = active(t);
        return (
          <button key={t.path} onClick={() => navigate(t.path)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm whitespace-nowrap border-b-2 -mb-px transition ${
              on ? 'border-[var(--color-primary)] text-[var(--color-primary)] dark:text-[var(--color-primary)] font-medium'
              : 'border-transparent text-[var(--color-text-secondary)] hover:text-neutral-800 dark:hover:text-neutral-200'}`}>
            <Icon className="w-4 h-4" /> {t.label}
          </button>
        );
      })}
    </div>
  );
};

export default GroupTabs;
