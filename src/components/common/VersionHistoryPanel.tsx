import React from 'react';

export interface VersionItem {
  id: string;
  version: string;
  date: string;
  author: string;
  description?: string;
  status?: string;
}

interface Props {
  versions?: VersionItem[];
  onRestore?: (version: VersionItem) => void;
  className?: string;
}

const VersionHistoryPanel: React.FC<Props> = ({ versions = [], className = '' }) => (
  <div className={`bg-white rounded-lg border p-4 ${className}`}>
    <h4 className="font-semibold text-sm mb-3">Historique des versions</h4>
    {versions.length === 0 ? (
      <p className="text-sm text-gray-400">Aucune version precedente</p>
    ) : (
      <div className="space-y-2">
        {versions.map(v => (
          <div key={v.id} className="flex items-center justify-between p-2 rounded hover:bg-gray-50 text-sm">
            <div>
              <span className="font-medium">{v.version}</span>
              <span className="text-gray-400 ml-2">{v.date}</span>
              <span className="text-gray-400 ml-2">par {v.author}</span>
            </div>
            {v.status && <span className="text-xs px-2 py-0.5 rounded bg-gray-100">{v.status}</span>}
          </div>
        ))}
      </div>
    )}
  </div>
);

export default VersionHistoryPanel;
