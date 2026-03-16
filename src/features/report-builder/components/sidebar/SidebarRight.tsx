// @ts-nocheck
/**
 * SidebarRight — 5 tabs: Propriétés, Style, Page, Typographie, Thème
 * CDC §7 — Project colors: neutral-*
 */
import React from 'react';
import { Settings, Paintbrush, FileText, Type as TypeIcon, Palette } from 'lucide-react';
import { useReportBuilderStore, type SidebarRightTab } from '../../store/useReportBuilderStore';
import type { ReportBlock, TextBlock, KPIBlock, TableBlock, ChartBlock } from '../../types';
import TextProperties from '../properties/TextProperties';
import KPIProperties from '../properties/KPIProperties';
import TableProperties from '../properties/TableProperties';
import ChartProperties from '../properties/ChartProperties';
import DocumentProperties from '../properties/DocumentProperties';
import BlockStyleProperties from '../properties/BlockStyleProperties';

const tabs: { id: SidebarRightTab; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'properties', label: 'Propriétés', icon: Settings },
  { id: 'style', label: 'Style', icon: Paintbrush },
  { id: 'page', label: 'Page', icon: FileText },
  { id: 'typography', label: 'Typo', icon: TypeIcon },
  { id: 'theme', label: 'Thème', icon: Palette },
];

function getBlockProperties(block: ReportBlock) {
  switch (block.type) {
    case 'text': return <TextProperties block={block as TextBlock} />;
    case 'kpi': return <KPIProperties block={block as KPIBlock} />;
    case 'table': return <TableProperties block={block as TableBlock} />;
    case 'chart': return <ChartProperties block={block as ChartBlock} />;
    default: return <div className="p-4 text-xs text-neutral-400">Aucune propriété configurable</div>;
  }
}

const SidebarRight: React.FC = () => {
  const { sidebarRightOpen, sidebarRightTab, setSidebarRightTab, selectedBlockId, document: doc } = useReportBuilderStore();

  if (!sidebarRightOpen || !doc) return null;

  let selectedBlock: ReportBlock | null = null;
  if (selectedBlockId) {
    for (const page of doc.pages) {
      const found = page.blocks.find(b => b.id === selectedBlockId);
      if (found) { selectedBlock = found; break; }
    }
  }

  return (
    <div className="w-[280px] border-l border-neutral-200 bg-white flex flex-col shrink-0 h-full">
      <div className="flex border-b border-neutral-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setSidebarRightTab(tab.id)}
            className={`flex-1 flex items-center justify-center py-2.5 text-xs font-medium transition-colors ${
              sidebarRightTab === tab.id
                ? 'text-neutral-900 border-b-2 border-neutral-900 bg-neutral-100/50'
                : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50'
            }`}
            title={tab.label}
          >
            <tab.icon className="w-3.5 h-3.5" />
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {sidebarRightTab === 'properties' && (
          selectedBlock ? getBlockProperties(selectedBlock) : <DocumentProperties />
        )}
        {sidebarRightTab === 'style' && (
          selectedBlock
            ? <BlockStyleProperties block={selectedBlock} />
            : <div className="p-4 text-xs text-neutral-400">Sélectionnez un bloc pour modifier son style.</div>
        )}
        {sidebarRightTab === 'page' && <DocumentProperties />}
        {sidebarRightTab === 'typography' && <TypographyPanel />}
        {sidebarRightTab === 'theme' && <ThemePanel />}
      </div>
    </div>
  );
};

// ============================================================================
// Typography Panel (CDC §7.5)
// ============================================================================

const fontOptions = [
  'Exo 2, sans-serif',
  'Inter, sans-serif',
  'Poppins, sans-serif',
  'Montserrat, sans-serif',
  'Nunito, sans-serif',
  'Roboto, sans-serif',
  'Playfair Display, serif',
  'Merriweather, serif',
  'EB Garamond, serif',
];

const monoFontOptions = [
  'JetBrains Mono, monospace',
  'Fira Code, monospace',
  'Roboto Mono, monospace',
];

const weightOptions = [
  { value: 300, label: 'Light (300)' },
  { value: 400, label: 'Regular (400)' },
  { value: 500, label: 'Medium (500)' },
  { value: 600, label: 'Semi-Bold (600)' },
  { value: 700, label: 'Bold (700)' },
];

const TypographyPanel: React.FC = () => {
  const { document: doc, setTypography } = useReportBuilderStore();
  if (!doc) return null;
  const typo = doc.typography;

  return (
    <div className="p-4 space-y-4">
      <div className="text-xs font-semibold text-neutral-800">Typographie</div>

      {/* Main font */}
      <div>
        <label className="text-[11px] text-neutral-500 mb-1 block">Police principale</label>
        <select
          value={typo.fontMain}
          onChange={e => setTypography({ fontMain: e.target.value })}
          className="w-full text-xs border border-neutral-200 rounded-md px-2 py-1.5 focus:ring-1 focus:ring-neutral-500"
        >
          {fontOptions.map(f => <option key={f} value={f}>{f.split(',')[0]}</option>)}
        </select>
      </div>

      {/* Headings font */}
      <div>
        <label className="text-[11px] text-neutral-500 mb-1 block">Police titres</label>
        <select
          value={typo.fontHeadings}
          onChange={e => setTypography({ fontHeadings: e.target.value })}
          className="w-full text-xs border border-neutral-200 rounded-md px-2 py-1.5 focus:ring-1 focus:ring-neutral-500"
        >
          {fontOptions.map(f => <option key={f} value={f}>{f.split(',')[0]}</option>)}
        </select>
      </div>

      {/* Data font */}
      <div>
        <label className="text-[11px] text-neutral-500 mb-1 block">Police données</label>
        <select
          value={typo.fontData}
          onChange={e => setTypography({ fontData: e.target.value })}
          className="w-full text-xs border border-neutral-200 rounded-md px-2 py-1.5 focus:ring-1 focus:ring-neutral-500"
        >
          {monoFontOptions.map(f => <option key={f} value={f}>{f.split(',')[0]}</option>)}
        </select>
      </div>

      <div className="border-t border-neutral-100 pt-3">
        <div className="text-[11px] text-neutral-500 mb-2">Tailles & Styles</div>

        {/* H1 */}
        <div className="mb-3">
          <label className="text-[10px] text-neutral-400 mb-1 block font-medium">H1 — Titre Principal</label>
          <div className="grid grid-cols-3 gap-1.5">
            <div>
              <input type="number" min={14} max={48} value={typo.h1Size} onChange={e => setTypography({ h1Size: Number(e.target.value) })}
                className="w-full text-[10px] border border-neutral-200 rounded px-1.5 py-1 font-mono" />
              <span className="text-[8px] text-neutral-400">px</span>
            </div>
            <select value={typo.h1Weight} onChange={e => setTypography({ h1Weight: Number(e.target.value) })}
              className="text-[10px] border border-neutral-200 rounded px-1 py-1">
              {weightOptions.map(w => <option key={w.value} value={w.value}>{w.value}</option>)}
            </select>
            <input type="color" value={typo.h1Color} onChange={e => setTypography({ h1Color: e.target.value })}
              className="w-full h-7 rounded cursor-pointer border border-neutral-200" />
          </div>
        </div>

        {/* H2 */}
        <div className="mb-3">
          <label className="text-[10px] text-neutral-400 mb-1 block font-medium">H2 — Sous-Section</label>
          <div className="grid grid-cols-3 gap-1.5">
            <div>
              <input type="number" min={12} max={36} value={typo.h2Size} onChange={e => setTypography({ h2Size: Number(e.target.value) })}
                className="w-full text-[10px] border border-neutral-200 rounded px-1.5 py-1 font-mono" />
              <span className="text-[8px] text-neutral-400">px</span>
            </div>
            <select value={typo.h2Weight} onChange={e => setTypography({ h2Weight: Number(e.target.value) })}
              className="text-[10px] border border-neutral-200 rounded px-1 py-1">
              {weightOptions.map(w => <option key={w.value} value={w.value}>{w.value}</option>)}
            </select>
            <input type="color" value={typo.h2Color} onChange={e => setTypography({ h2Color: e.target.value })}
              className="w-full h-7 rounded cursor-pointer border border-neutral-200" />
          </div>
        </div>

        {/* H3 */}
        <div className="mb-3">
          <label className="text-[10px] text-neutral-400 mb-1 block font-medium">H3 — Rubrique</label>
          <div className="grid grid-cols-3 gap-1.5">
            <div>
              <input type="number" min={10} max={28} value={typo.h3Size} onChange={e => setTypography({ h3Size: Number(e.target.value) })}
                className="w-full text-[10px] border border-neutral-200 rounded px-1.5 py-1 font-mono" />
              <span className="text-[8px] text-neutral-400">px</span>
            </div>
            <select value={typo.h3Weight} onChange={e => setTypography({ h3Weight: Number(e.target.value) })}
              className="text-[10px] border border-neutral-200 rounded px-1 py-1">
              {weightOptions.map(w => <option key={w.value} value={w.value}>{w.value}</option>)}
            </select>
            <input type="color" value={typo.h3Color} onChange={e => setTypography({ h3Color: e.target.value })}
              className="w-full h-7 rounded cursor-pointer border border-neutral-200" />
          </div>
        </div>
      </div>

      <div className="border-t border-neutral-100 pt-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-neutral-400 mb-1 block">Taille base (px)</label>
            <input type="number" min={10} max={20} value={typo.baseFontSize} onChange={e => setTypography({ baseFontSize: Number(e.target.value) })}
              className="w-full text-xs border border-neutral-200 rounded px-2 py-1 font-mono" />
          </div>
          <div>
            <label className="text-[10px] text-neutral-400 mb-1 block">Interligne</label>
            <input type="number" min={1} max={3} step={0.1} value={typo.lineHeight} onChange={e => setTypography({ lineHeight: Number(e.target.value) })}
              className="w-full text-xs border border-neutral-200 rounded px-2 py-1 font-mono" />
          </div>
        </div>
        <div>
          <label className="text-[10px] text-neutral-400 mb-1 block">Espacement paragraphe (px)</label>
          <input type="number" min={0} max={48} value={typo.paragraphSpacing} onChange={e => setTypography({ paragraphSpacing: Number(e.target.value) })}
            className="w-full text-xs border border-neutral-200 rounded px-2 py-1 font-mono" />
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Theme Panel (CDC §7.6)
// ============================================================================

const themePresets = [
  { name: 'Atlas Default', primary: '#171717', secondary: '#737373' },
  { name: 'Corporate Bleu', primary: '#1e40af', secondary: '#0284c7' },
  { name: 'Émeraude', primary: '#059669', secondary: '#10b981' },
  { name: 'Or & Ivoire', primary: '#b45309', secondary: '#d97706' },
  { name: 'Minimaliste', primary: '#475569', secondary: '#64748b' },
  { name: 'Marine Premium', primary: '#1e3a5f', secondary: '#2563eb' },
];

const ThemePanel: React.FC = () => {
  const { document: doc, setTheme } = useReportBuilderStore();
  if (!doc) return null;

  return (
    <div className="p-4 space-y-4">
      <div className="text-xs font-semibold text-neutral-800">Thèmes Prédéfinis</div>
      <div className="grid grid-cols-2 gap-2">
        {themePresets.map(preset => (
          <button
            key={preset.name}
            onClick={() => setTheme({ primaryColor: preset.primary, secondaryColor: preset.secondary })}
            className="flex items-center gap-2 p-2 rounded-md border border-neutral-200 hover:border-neutral-400 text-left transition-colors"
          >
            <div className="flex gap-1">
              <div className="w-4 h-4 rounded-full border border-neutral-200" style={{ backgroundColor: preset.primary }} />
              <div className="w-4 h-4 rounded-full border border-neutral-200" style={{ backgroundColor: preset.secondary }} />
            </div>
            <span className="text-[10px] text-neutral-600">{preset.name}</span>
          </button>
        ))}
      </div>

      <div className="text-xs font-semibold text-neutral-800 pt-2">Personnalisation</div>
      <div className="space-y-2">
        {[
          { key: 'primaryColor', label: 'Couleur primaire' },
          { key: 'secondaryColor', label: 'Couleur secondaire' },
          { key: 'positive', label: 'Positif' },
          { key: 'negative', label: 'Négatif' },
          { key: 'warning', label: 'Avertissement' },
          { key: 'borderColor', label: 'Bordures' },
        ].map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between">
            <span className="text-xs text-neutral-600">{label}</span>
            <input
              type="color"
              value={(doc.theme as Record<string, string>)[key]}
              onChange={e => setTheme({ [key]: e.target.value })}
              className="w-7 h-7 rounded cursor-pointer border border-neutral-200"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default SidebarRight;
