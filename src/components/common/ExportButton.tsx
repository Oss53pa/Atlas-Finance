import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileText, FileCode } from 'lucide-react';
import { Button } from '../ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/Dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui';
import { Label } from '../ui';
import { toast } from 'react-hot-toast';

export type ExportFormat = 'excel' | 'csv' | 'pdf' | 'json' | 'xml';

interface ExportButtonProps {
  module: string;
  data?: any;
  onExport?: (format: ExportFormat, options: ExportOptions) => void;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  showIcon?: boolean;
  label?: string;
}

export interface ExportOptions {
  format: ExportFormat;
  period: string;
  fields: string[];
  fileName?: string;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  module,
  data,
  onExport,
  className = '',
  variant = 'default',
  size = 'default',
  showIcon = true,
  label = 'Exporter'
}) => {
  const [showModal, setShowModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('excel');
  const [period, setPeriod] = useState('current-month');

  const handleExport = () => {
    const options: ExportOptions = {
      format: exportFormat,
      period,
      fields: [], // À remplir selon les besoins
      fileName: `${module}_export_${new Date().toISOString().split('T')[0]}.${exportFormat}`
    };

    if (onExport) {
      onExport(exportFormat, options);
    } else {
      // Export par défaut
      toast.success(`Export ${exportFormat.toUpperCase()} lancé !`);
      // Simuler un téléchargement
      setTimeout(() => {
        toast.success('Fichier téléchargé avec succès !');
      }, 1500);
    }

    setShowModal(false);
  };

  const getFormatIcon = (format: ExportFormat) => {
    switch (format) {
      case 'excel':
      case 'csv':
        return <FileSpreadsheet className="h-4 w-4" />;
      case 'json':
      case 'xml':
        return <FileCode className="h-4 w-4" />;
      case 'pdf':
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setShowModal(true)}
      >
        {showIcon && <Download className="mr-2 h-4 w-4" />}
        {label}
      </Button>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Exporter {module}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Format d'export</Label>
              <Select value={exportFormat} onValueChange={(value) => setExportFormat(value as ExportFormat)}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excel">
                    <div className="flex items-center">
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Excel (.xlsx)
                    </div>
                  </SelectItem>
                  <SelectItem value="csv">
                    <div className="flex items-center">
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      CSV (.csv)
                    </div>
                  </SelectItem>
                  <SelectItem value="pdf">
                    <div className="flex items-center">
                      <FileText className="mr-2 h-4 w-4" />
                      PDF (.pdf)
                    </div>
                  </SelectItem>
                  <SelectItem value="json">
                    <div className="flex items-center">
                      <FileCode className="mr-2 h-4 w-4" />
                      JSON (.json)
                    </div>
                  </SelectItem>
                  <SelectItem value="xml">
                    <div className="flex items-center">
                      <FileCode className="mr-2 h-4 w-4" />
                      XML (.xml)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Période</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les données</SelectItem>
                  <SelectItem value="current-month">Mois en cours</SelectItem>
                  <SelectItem value="last-month">Mois dernier</SelectItem>
                  <SelectItem value="current-year">Année en cours</SelectItem>
                  <SelectItem value="custom">Personnalisée</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 bg-[var(--color-info-light)] rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--color-text-secondary)]">Format:</span>
                <span className="font-medium flex items-center">
                  {getFormatIcon(exportFormat)}
                  <span className="ml-2">{exportFormat.toUpperCase()}</span>
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-[var(--color-text-secondary)]">Nom du fichier:</span>
                <span className="font-mono text-xs">
                  {module}_export_...{exportFormat}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Annuler
            </Button>
            <Button onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Exporter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
