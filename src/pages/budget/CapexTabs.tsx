/**
 * CapexTabs — barre d'onglets partagée du module Investissement (CAPEX).
 * Regroupe Portefeuille / Priorisation / Enveloppe / Réaffectations sous une seule
 * entrée de navigation (au lieu de 4 entrées séparées dans la sidebar).
 */
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Layers, Trophy, PiggyBank, Shuffle } from 'lucide-react';

const TABS = [
  { path: '/capex', label: 'Portefeuille', icon: Layers, exact: true },
  { path: '/capex/priorisation', label: 'Priorisation', icon: Trophy },
  { path: '/capex/enveloppe', label: 'Enveloppe', icon: PiggyBank },
  { path: '/capex/reaffectations', label: 'Réaffectations', icon: Shuffle },
];

const CapexTabs: React.FC = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isActive = (t: (typeof TABS)[number]) =>
    t.exact ? pathname === t.path : pathname.startsWith(t.path);
  return (
    <div className="flex items-center gap-1 border-b border-neutral-200 dark:border-neutral-700 -mt-1 mb-1 overflow-x-auto">
      {TABS.map((t) => {
        const Icon = t.icon; const active = isActive(t);
        return (
          <button key={t.path} onClick={() => navigate(t.path)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm whitespace-nowrap border-b-2 -mb-px transition ${
              active ? 'border-[#235A6E] text-[#235A6E] dark:text-[#8fc7d6] font-medium'
              : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'}`}>
            <Icon className="w-4 h-4" /> {t.label}
          </button>
        );
      })}
    </div>
  );
};

export default CapexTabs;
