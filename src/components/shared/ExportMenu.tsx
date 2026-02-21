import React, { useState } from 'react';
import { Download, FileText, FileSpreadsheet, FileImage } from 'lucide-react';
import { Button } from '../ui';
import { toast } from 'react-hot-toast';

interface ExportMenuProps {
  data: Record<string, unknown>[];
  filename: string;
  columns?: { [key: string]: string }; // Mapping des clés vers les labels
  onExport?: (format: 'csv' | 'excel' | 'pdf') => void;
  buttonText?: string;
  buttonVariant?: 'default' | 'outline' | 'ghost';
  className?: string;
  supportedFormats?: ('csv' | 'excel' | 'pdf')[];
}

const ExportMenu: React.FC<ExportMenuProps> = ({
  data,
  filename,
  columns,
  onExport,
  buttonText = 'Exporter',
  buttonVariant = 'outline',
  className = '',
  supportedFormats = ['csv', 'excel', 'pdf']
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const prepareData = () => {
    if (!data || data.length === 0) return [];

    if (columns) {
      return data.map(item => {
        const mappedItem: Record<string, unknown> = {};
        Object.entries(columns).forEach(([key, label]) => {
          mappedItem[label] = item[key];
        });
        return mappedItem;
      });
    }

    return data;
  };

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    if (onExport) {
      onExport(format);
      setShowMenu(false);
      return;
    }

    if (!data || data.length === 0) {
      toast.error('Aucune donnée à exporter');
      return;
    }

    const exportData = prepareData();
    const dateStr = new Date().toISOString().split('T')[0];

    if (format === 'csv') {
      exportCSV(exportData, `${filename}_${dateStr}.csv`);
      toast.success('Export CSV réussi !');
    } else if (format === 'excel') {
      exportExcel(exportData, `${filename}_${dateStr}.xls`);
      toast.success('Export Excel réussi !');
    } else if (format === 'pdf') {
      toast.info('Export PDF en cours de développement');
    }

    setShowMenu(false);
  };

  const exportCSV = (data: Record<string, unknown>[], filename: string) => {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(';'),
      ...data.map(row => headers.map(header => {
        const value = row[header];
        // Échapper les guillemets et entourer de guillemets si nécessaire
        if (typeof value === 'string' && (value.includes(';') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(';'))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, filename);
  };

  const exportExcel = (data: Record<string, unknown>[], filename: string) => {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const excelContent = [
      headers.join('\t'),
      ...data.map(row => headers.map(header => {
        const value = row[header];
        // Gérer les valeurs avec des retours à la ligne ou des tabs
        if (typeof value === 'string' && (value.includes('\t') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join('\t'))
    ].join('\n');

    const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel' });
    downloadBlob(blob, filename);
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative">
      <Button
        variant={buttonVariant}
        onClick={() => setShowMenu(!showMenu)}
        className={`border-[#6A8A82] text-[#6A8A82] hover:bg-[#6A8A82]/10 ${className}`}
      >
        <Download className="mr-2 h-4 w-4" />
        {buttonText}
      </Button>

      {showMenu && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          {supportedFormats.includes('csv') && (
            <button
              onClick={() => handleExport('csv')}
              className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center space-x-2 rounded-t-lg"
            >
              <FileText className="w-4 h-4 text-[#6A8A82]" />
              <span>Export CSV</span>
            </button>
          )}

          {supportedFormats.includes('excel') && (
            <button
              onClick={() => handleExport('excel')}
              className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center space-x-2"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#7A99AC]" />
              <span>Export Excel</span>
            </button>
          )}

          {supportedFormats.includes('pdf') && (
            <button
              onClick={() => handleExport('pdf')}
              className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center space-x-2 text-gray-700 rounded-b-lg"
              disabled
            >
              <FileImage className="w-4 h-4" />
              <span>Export PDF (bientôt)</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ExportMenu;