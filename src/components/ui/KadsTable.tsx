import React, { ReactNode } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Search, Filter, Download, Eye, Edit, Trash2 } from 'lucide-react';

interface Column {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  width?: string;
  render?: (value: any, row: any) => ReactNode;
}

interface KadsTableProps {
  title?: string;
  columns: Column[];
  data: any[];
  searchable?: boolean;
  filterable?: boolean;
  exportable?: boolean;
  actions?: boolean;
  onSearch?: (term: string) => void;
  onFilter?: () => void;
  onExport?: () => void;
  onView?: (row: any) => void;
  onEdit?: (row: any) => void;
  onDelete?: (row: any) => void;
  className?: string;
}

const KadsTable: React.FC<KadsTableProps> = ({
  title,
  columns,
  data,
  searchable = true,
  filterable = true,
  exportable = true,
  actions = true,
  onSearch,
  onFilter,
  onExport,
  onView,
  onEdit,
  onDelete,
  className = ''
}) => {
  const { t } = useLanguage();
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 ${className}`}>
      {/* Header du tableau */}
      {(title || searchable || filterable || exportable) && (
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {title && (
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            )}
            
            <div className="flex items-center space-x-3">
              {searchable && (
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-700" />
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    onChange={(e) => onSearch?.(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              )}
              
              {filterable && (
                <button 
                  onClick={onFilter}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors" aria-label="Filtrer">
                  <Filter className="w-4 h-4 text-gray-700" />
                </button>
              )}
              
              {exportable && (
                <button 
                  onClick={onExport}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors" aria-label="Télécharger">
                  <Download className="w-4 h-4 text-gray-700" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tableau */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`
                    px-6 py-3 text-xs font-medium text-gray-700 uppercase tracking-wider
                    ${column.align === 'center' ? 'text-center' : 
                      column.align === 'right' ? 'text-right' : 'text-left'}
                  `}
                  style={{ width: column.width }}
                >
                  {column.label}
                </th>
              ))}
              {actions && (
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50 transition-colors">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`
                      px-6 py-4 whitespace-nowrap text-sm
                      ${column.align === 'center' ? 'text-center' : 
                        column.align === 'right' ? 'text-right' : 'text-left'}
                    `}
                  >
                    {column.render 
                      ? column.render(row[column.key], row)
                      : row[column.key]
                    }
                  </td>
                ))}
                
                {actions && (
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center space-x-2">
                      {onView && (
                        <button 
                          onClick={() => onView(row)}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                          title="Voir"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      
                      {onEdit && (
                        <button 
                          onClick={() => onEdit(row)}
                          className="text-green-600 hover:text-green-800 transition-colors"
                          title={t('common.edit')}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      
                      {onDelete && (
                        <button 
                          onClick={() => onDelete(row)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title={t('common.delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {data.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-700">Aucune donnée disponible</p>
        </div>
      )}
    </div>
  );
};

export default KadsTable;