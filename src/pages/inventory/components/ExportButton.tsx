import React, { useState } from 'react';
import { Download, FileText, FileSpreadsheet, File } from 'lucide-react';

interface ExportButtonProps {
  data: Record<string, unknown>[];
  filename: string;
  title?: string;
  className?: string;
}

const ExportButton: React.FC<ExportButtonProps> = ({
  data,
  filename,
  title = 'Export Data',
  className = ''
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const exportFormats = [
    {
      key: 'excel',
      label: 'Excel (.xlsx)',
      icon: FileSpreadsheet,
      color: 'text-green-600'
    },
    {
      key: 'csv',
      label: 'CSV (.csv)',
      icon: FileText,
      color: 'text-[#6A8A82]'
    },
    {
      key: 'pdf',
      label: 'PDF (.pdf)',
      icon: File,
      color: 'text-red-600'
    },
    {
      key: 'json',
      label: 'JSON (.json)',
      icon: FileText,
      color: 'text-[#B87333]'
    }
  ];

  const generateCSV = (data: Record<string, unknown>[]): string => {
    if (!data || data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          const value = row[header];
          // Escape quotes and wrap in quotes if contains comma
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    return csvContent;
  };

  const generateJSON = (data: Record<string, unknown>[]): string => {
    return JSON.stringify(data, null, 2);
  };

  const generateExcel = async (data: Record<string, unknown>[]): Promise<Blob> => {
    // This is a simplified Excel generation
    // In a real application, you would use a library like xlsx or exceljs
    const csvContent = generateCSV(data);
    return new Blob([csvContent], { type: 'application/vnd.ms-excel' });
  };

  const generatePDF = async (data: Record<string, unknown>[]): Promise<Blob> => {
    // This is a simplified PDF generation
    // In a real application, you would use a library like jsPDF or pdfmake
    const content = `
      ${title}
      Generated on: ${new Date().toLocaleString()}

      ${data.map((item, index) =>
        `${index + 1}. ${JSON.stringify(item, null, 2)}`
      ).join('\n\n')}
    `;

    return new Blob([content], { type: 'application/pdf' });
  };

  const downloadFile = (content: string | Blob, filename: string, mimeType: string) => {
    const blob = typeof content === 'string'
      ? new Blob([content], { type: mimeType })
      : content;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExport = async (format: string) => {
    setIsExporting(true);
    setIsDropdownOpen(false);

    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const baseFilename = `${filename}_${timestamp}`;

      switch (format) {
        case 'csv':
          const csvContent = generateCSV(data);
          downloadFile(csvContent, `${baseFilename}.csv`, 'text/csv');
          break;

        case 'json':
          const jsonContent = generateJSON(data);
          downloadFile(jsonContent, `${baseFilename}.json`, 'application/json');
          break;

        case 'excel':
          const excelBlob = await generateExcel(data);
          downloadFile(excelBlob, `${baseFilename}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          break;

        case 'pdf':
          const pdfBlob = await generatePDF(data);
          downloadFile(pdfBlob, `${baseFilename}.pdf`, 'application/pdf');
          break;

        default:
          console.error('Unsupported export format:', format);
      }
    } catch (error) {
      console.error('Export failed:', error);
      // In a real application, you would show a proper error notification
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        disabled={isExporting || !data || data.length === 0}
        className="flex items-center gap-2 px-4 py-2 bg-[#6A8A82] text-white rounded-md hover:bg-[#5A7A72] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        <Download className="w-4 h-4" />
        {isExporting ? 'Exporting...' : 'Export'}
      </button>

      {isDropdownOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsDropdownOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-20">
            <div className="py-1">
              {exportFormats.map((format) => {
                const IconComponent = format.icon;
                return (
                  <button
                    key={format.key}
                    onClick={() => handleExport(format.key)}
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <IconComponent className={`w-4 h-4 ${format.color}`} />
                    {format.label}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ExportButton;