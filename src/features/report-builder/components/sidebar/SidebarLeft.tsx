/**
 * SidebarLeft — 3 tabs dans le Builder : Sommaire, Blocs, Catalogue Atlas
 * Les Modèles et le Journal sont des onglets principaux séparés.
 */
import React from 'react';
import { List, LayoutGrid, Database } from 'lucide-react';
import { useReportBuilderStore, type SidebarLeftTab } from '../../store/useReportBuilderStore';
import TableOfContents from './TableOfContents';
import BlockCatalog from './BlockCatalog';
import AtlasCatalogPanel from './AtlasCatalogPanel';

const tabs: { id: SidebarLeftTab; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'toc', label: 'Sommaire', icon: List },
  { id: 'catalog', label: 'Blocs', icon: LayoutGrid },
  { id: 'atlas-catalog', label: 'Catalogue', icon: Database },
];

const SidebarLeft: React.FC = () => {
  const { sidebarLeftTab, setSidebarLeftTab, sidebarLeftOpen } = useReportBuilderStore();

  if (!sidebarLeftOpen) return null;

  return (
    <div className="w-[300px] border-r border-neutral-200 bg-white flex flex-col shrink-0 h-full">
      <div className="flex border-b border-neutral-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setSidebarLeftTab(tab.id)}
            title={tab.label}
            className={`flex-1 flex items-center justify-center gap-1.5 px-1 py-2.5 text-[11px] font-medium transition-colors ${
              sidebarLeftTab === tab.id
                ? 'text-neutral-900 border-b-2 border-neutral-900 bg-neutral-100/50'
                : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        {sidebarLeftTab === 'toc' && <TableOfContents />}
        {sidebarLeftTab === 'catalog' && <BlockCatalog />}
        {sidebarLeftTab === 'atlas-catalog' && <AtlasCatalogPanel />}
      </div>
    </div>
  );
};

export default SidebarLeft;
