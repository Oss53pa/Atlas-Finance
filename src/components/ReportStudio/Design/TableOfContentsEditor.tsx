/**
 * TableOfContentsEditor - Editor for table of contents settings
 */

import React from 'react';
import { List, Hash } from 'lucide-react';
import { useReportDesignStore } from '@/stores/reportDesignStore';
import type { TableOfContentsStyle } from '@/types/reportDesign';

const TableOfContentsEditor: React.FC = () => {
  const { settings, updateTableOfContents } = useReportDesignStore();
  const { tableOfContents } = settings;

  const styles: { id: TableOfContentsStyle; label: string; description: string }[] = [
    { id: 'classic', label: 'Classique', description: 'Style traditionnel avec indentation' },
    { id: 'modern', label: 'Moderne', description: 'Design epure et contemporain' },
    { id: 'minimal', label: 'Minimal', description: 'Tres simple, sans fioritures' },
    { id: 'dotted', label: 'Pointilles', description: 'Lignes pointillees jusqu\'aux numeros' },
  ];

  return (
    <div className="space-y-6">
      {/* Enable toggle */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div>
          <h4 className="font-medium text-gray-900">Sommaire</h4>
          <p className="text-sm text-gray-500">Generer automatiquement un sommaire</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={tableOfContents.enabled}
            onChange={(e) => updateTableOfContents({ enabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
        </label>
      </div>

      {tableOfContents.enabled && (
        <>
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <List className="w-4 h-4 inline mr-1" />
              Titre du sommaire
            </label>
            <input
              type="text"
              value={tableOfContents.title}
              onChange={(e) => updateTableOfContents({ title: e.target.value })}
              placeholder="Sommaire"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Depth */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Hash className="w-4 h-4 inline mr-1" />
              Profondeur des titres
            </label>
            <div className="flex gap-2">
              {[1, 2, 3].map((depth) => (
                <button
                  key={depth}
                  onClick={() => updateTableOfContents({ depth: depth as 1 | 2 | 3 })}
                  className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
                    tableOfContents.depth === depth
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  <div className="text-lg font-bold">H{depth}</div>
                  <div className="text-xs">Niveau {depth}</div>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Inclure les titres jusqu'au niveau selectionne
            </p>
          </div>

          {/* Style */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Style</label>
            <div className="space-y-2">
              {styles.map((style) => (
                <button
                  key={style.id}
                  onClick={() => updateTableOfContents({ style: style.id })}
                  className={`w-full flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-colors ${
                    tableOfContents.style === style.id
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div
                    className={`w-4 h-4 mt-0.5 rounded-full border-2 flex items-center justify-center ${
                      tableOfContents.style === style.id
                        ? 'border-indigo-600'
                        : 'border-gray-300'
                    }`}
                  >
                    {tableOfContents.style === style.id && (
                      <div className="w-2 h-2 rounded-full bg-indigo-600" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{style.label}</div>
                    <div className="text-sm text-gray-500">{style.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Show page numbers */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">Afficher les numeros de page</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={tableOfContents.showPageNumbers}
                onChange={(e) => updateTableOfContents({ showPageNumbers: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </>
      )}
    </div>
  );
};

export default TableOfContentsEditor;
