import React, { useState } from 'react';
import { Upload, RefreshCw } from 'lucide-react';
import { Button } from '../ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui';
import { Label, Checkbox } from '../ui';
import { FileUpload } from './FileUpload';
import { toast } from 'react-hot-toast';

export interface ImportOptions {
  dataType: string;
  dateFormat: string;
  decimalSeparator: string;
  ignoreDuplicates: boolean;
  validateData: boolean;
  testMode: boolean;
}

interface ImportButtonProps {
  module: string;
  onImport?: (files: File[], options: ImportOptions) => void;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  showIcon?: boolean;
  label?: string;
}

export const ImportButton: React.FC<ImportButtonProps> = ({
  module,
  onImport,
  className = '',
  variant = 'default',
  size = 'default',
  showIcon = true,
  label = 'Importer'
}) => {
  const [showModal, setShowModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [options, setOptions] = useState<ImportOptions>({
    dataType: 'auto',
    dateFormat: 'dd/mm/yyyy',
    decimalSeparator: 'comma',
    ignoreDuplicates: true,
    validateData: true,
    testMode: false
  });

  const handleImport = () => {
    if (selectedFiles.length === 0) {
      toast.error('Veuillez sélectionner au moins un fichier');
      return;
    }

    setIsImporting(true);

    if (onImport) {
      onImport(selectedFiles, options);
    } else {
      // Import par défaut
      setTimeout(() => {
        toast.success(`Import de ${selectedFiles.length} fichier(s) lancé !`);
        setIsImporting(false);
        setShowModal(false);
        setSelectedFiles([]);
      }, 2000);
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
        {showIcon && <Upload className="mr-2 h-4 w-4" />}
        {label}
      </Button>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="bg-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>Importer des données - {module}</DialogTitle>
            <DialogDescription>
              Sélectionnez un ou plusieurs fichiers et configurez les options d'import
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Upload de fichiers */}
            <FileUpload
              onFilesSelect={setSelectedFiles}
              multiple={true}
              accept=".csv,.xlsx,.xls,.json,.xml"
              maxSize={50}
            />

            {/* Options d'import */}
            <div className="border-t pt-4 space-y-4">
              <h4 className="font-medium text-sm">Configuration d'import</h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type de données</Label>
                  <Select
                    value={options.dataType}
                    onValueChange={(value) => setOptions({ ...options, dataType: value })}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Détection automatique</SelectItem>
                      <SelectItem value="accounts">Plan comptable</SelectItem>
                      <SelectItem value="entries">Écritures comptables</SelectItem>
                      <SelectItem value="customers">Clients</SelectItem>
                      <SelectItem value="suppliers">Fournisseurs</SelectItem>
                      <SelectItem value="products">Articles/Produits</SelectItem>
                      <SelectItem value="employees">Employés</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Format de date</Label>
                  <Select
                    value={options.dateFormat}
                    onValueChange={(value) => setOptions({ ...options, dateFormat: value })}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dd/mm/yyyy">JJ/MM/AAAA</SelectItem>
                      <SelectItem value="mm/dd/yyyy">MM/JJ/AAAA</SelectItem>
                      <SelectItem value="yyyy-mm-dd">AAAA-MM-JJ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Séparateur décimal</Label>
                <Select
                  value={options.decimalSeparator}
                  onValueChange={(value) => setOptions({ ...options, decimalSeparator: value })}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comma">Virgule (,)</SelectItem>
                    <SelectItem value="dot">Point (.)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <Checkbox
                    checked={options.ignoreDuplicates}
                    onCheckedChange={(checked) =>
                      setOptions({ ...options, ignoreDuplicates: !!checked })
                    }
                  />
                  <Label className="cursor-pointer">Ignorer les doublons</Label>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <Checkbox
                    checked={options.validateData}
                    onCheckedChange={(checked) =>
                      setOptions({ ...options, validateData: !!checked })
                    }
                  />
                  <Label className="cursor-pointer">Valider les données avant import</Label>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <Checkbox
                    checked={options.testMode}
                    onCheckedChange={(checked) =>
                      setOptions({ ...options, testMode: !!checked })
                    }
                  />
                  <Label className="cursor-pointer">Mode test (simuler l'import)</Label>
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)} disabled={isImporting}>
              Annuler
            </Button>
            <Button
              onClick={handleImport}
              disabled={selectedFiles.length === 0 || isImporting}
            >
              {isImporting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Import en cours...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Lancer l'import
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
