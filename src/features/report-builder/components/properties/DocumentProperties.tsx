/**
 * Document Properties — Page settings, title, period
 */
import React from 'react';
import { useReportBuilderStore } from '../../store/useReportBuilderStore';
import type { PageFormat } from '../../types';

const formats: { value: PageFormat; label: string }[] = [
  { value: 'a4-portrait', label: 'A4 Portrait' },
  { value: 'a4-landscape', label: 'A4 Paysage' },
  { value: 'letter', label: 'Lettre US' },
  { value: 'a3', label: 'A3' },
];

const DocumentProperties: React.FC = () => {
  const { document: doc, updateTitle, setPageSettings } = useReportBuilderStore();

  if (!doc) return null;

  return (
    <div className="p-4 space-y-4">
      <div className="text-xs font-semibold text-neutral-700">Document</div>

      <div>
        <label className="text-[11px] text-neutral-500 mb-1 block">Titre du rapport</label>
        <input
          type="text"
          value={doc.title}
          onChange={e => updateTitle(e.target.value)}
          className="w-full text-xs border border-neutral-200 rounded-md px-2 py-1.5 focus:ring-1 focus:ring-neutral-500"
        />
      </div>

      <div>
        <label className="text-[11px] text-neutral-500 mb-1 block">Période</label>
        <div className="text-xs text-neutral-700 bg-neutral-50 rounded-md px-3 py-2">
          {doc.period.label}
        </div>
      </div>

      <div>
        <label className="text-[11px] text-neutral-500 mb-1 block">Format de page</label>
        <select
          value={doc.pageSettings.format}
          onChange={e => setPageSettings({ format: e.target.value as PageFormat })}
          className="w-full text-xs border border-neutral-200 rounded-md px-2 py-1.5"
        >
          {formats.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      </div>

      {/* Margins */}
      <div>
        <label className="text-[11px] text-neutral-500 mb-1 block">Marges (mm)</label>
        <div className="grid grid-cols-2 gap-2">
          {(['marginTop', 'marginBottom', 'marginLeft', 'marginRight'] as const).map(key => (
            <div key={key} className="flex items-center gap-1">
              <span className="text-[10px] text-neutral-400 w-8">
                {key === 'marginTop' ? 'Haut' : key === 'marginBottom' ? 'Bas' : key === 'marginLeft' ? 'Gau.' : 'Drt.'}
              </span>
              <input
                type="number"
                min={0}
                max={50}
                value={doc.pageSettings[key]}
                onChange={e => setPageSettings({ [key]: Number(e.target.value) })}
                className="w-full text-xs border border-neutral-200 rounded-md px-2 py-1 font-mono"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Header / Footer */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs text-neutral-600">
          <input type="checkbox" checked={doc.pageSettings.showHeader} onChange={e => setPageSettings({ showHeader: e.target.checked })} className="rounded" />
          En-tête de page
        </label>
        <label className="flex items-center gap-2 text-xs text-neutral-600">
          <input type="checkbox" checked={doc.pageSettings.showFooter} onChange={e => setPageSettings({ showFooter: e.target.checked })} className="rounded" />
          Pied de page
        </label>
      </div>

      {/* Info */}
      <div className="pt-2 border-t border-neutral-100 space-y-1">
        <div className="flex justify-between text-[10px] text-neutral-400">
          <span>Pages</span>
          <span>{doc.pages.length}</span>
        </div>
        <div className="flex justify-between text-[10px] text-neutral-400">
          <span>Blocs</span>
          <span>{doc.pages.reduce((sum, p) => sum + p.blocks.length, 0)}</span>
        </div>
        <div className="flex justify-between text-[10px] text-neutral-400">
          <span>Version</span>
          <span>v{doc.version}</span>
        </div>
        <div className="flex justify-between text-[10px] text-neutral-400">
          <span>Statut</span>
          <span className="capitalize">{doc.status}</span>
        </div>
      </div>
    </div>
  );
};

export default DocumentProperties;
