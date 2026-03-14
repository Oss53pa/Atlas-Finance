import React from 'react';
import { cn } from '@/utils/cn';
import { TableBlock as TableBlockType } from '@/types/reportStudio';

interface TableBlockProps {
  block: TableBlockType;
  isEditable: boolean;
  onChange: (updates: Partial<TableBlockType>) => void;
}

export const TableBlock: React.FC<TableBlockProps> = ({
  block,
  isEditable,
  onChange,
}) => {
  const { headers, rows, config } = block;

  return (
    <div className="my-4 overflow-x-auto">
      <table
        className={cn(
          'min-w-full',
          config?.bordered && 'border border-gray-200',
          config?.compact ? 'text-sm' : 'text-base'
        )}
      >
        <thead>
          <tr className={cn(config?.striped ? 'bg-gray-100' : 'bg-gray-50')}>
            {headers.map((header) => (
              <th
                key={header.id}
                className={cn(
                  'px-4 py-3 text-left font-semibold text-gray-700 border-b border-gray-200',
                  header.align === 'center' && 'text-center',
                  header.align === 'right' && 'text-right'
                )}
                style={{ width: header.width ? `${header.width}px` : undefined }}
              >
                {header.label}
                {config?.sortable && header.sortable && (
                  <button className="ml-1 opacity-50 hover:opacity-100">
                    <svg className="w-3 h-3 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
                  </button>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.entries(rows).map(([rowKey, row], index) => (
            <tr
              key={rowKey}
              className={cn(
                'border-b border-gray-100 hover:bg-gray-50',
                config?.striped && index % 2 === 1 && 'bg-gray-50'
              )}
            >
              {headers.map((header) => {
                const cell = row[header.key];
                return (
                  <td
                    key={`${rowKey}-${header.id}`}
                    className={cn(
                      'px-4 py-3 text-gray-600',
                      header.align === 'center' && 'text-center',
                      header.align === 'right' && 'text-right'
                    )}
                    style={cell?.style}
                  >
                    {cell?.formatted ?? cell?.value ?? '-'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      {config?.pagination && (
        <div className="flex items-center justify-between mt-4 px-2">
          <span className="text-sm text-gray-500">
            Affichage de 1-{Math.min(config.pageSize || 10, Object.keys(rows).length)} sur {Object.keys(rows).length}
          </span>
          <div className="flex gap-2">
            <button
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
              disabled
            >
              Précédent
            </button>
            <button className="px-3 py-1 text-sm border rounded hover:bg-gray-50">
              Suivant
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
