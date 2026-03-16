/**
 * DataImportModal - Modal de catalogage des imports de données
 * Permet d'organiser et versionner les fichiers importés
 */

import React, { useState, useMemo } from 'react';
import { cn } from '../../utils/cn';
import {
  X,
  FileUp,
  Calendar,
  FolderPlus,
  Hash,
  GitBranch,
  FileText,
  CheckCircle,
  RefreshCcw,
  AlertCircle,
  ChevronDown,
  Folder,
  Database,
} from 'lucide-react';

// Types
interface DataFolder {
  id: string;
  name: string;
  importCount: number;
}

interface ExistingImport {
  id: string;
  importNumber: string;
  name: string;
  version: string;
  period: string;
  importedAt: string;
}

interface DataImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ImportFormData) => void;
  fileName?: string;
  fileSize?: number;
  existingImport?: ExistingImport;
}

export interface ImportFormData {
  name: string;
  category: string;
  importDate: string;
  periodStart: string;
  periodEnd: string;
  folderId: string;
  newFolderName?: string;
  description: string;
  importNumber: string;
  version: string;
  isNewVersion: boolean;
  replacesImportId?: string;
}

const CATEGORIES = [
  { value: 'budget', label: 'Budget' },
  { value: 'comptabilite', label: 'Comptabilité' },
  { value: 'rh', label: 'Ressources Humaines' },
  { value: 'ventes', label: 'Ventes' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'operations', label: 'Opérations' },
  { value: 'logistique', label: 'Logistique' },
  { value: 'clients', label: 'Clients' },
  { value: 'fournisseurs', label: 'Fournisseurs' },
  { value: 'autre', label: 'Autre' },
];

const DEFAULT_FOLDERS: DataFolder[] = [
  { id: 'f1', name: 'Données Financières 2025', importCount: 12 },
  { id: 'f2', name: 'RH - Paie', importCount: 24 },
  { id: 'f3', name: 'Ventes Trimestrielles', importCount: 8 },
  { id: 'f4', name: 'Marketing Digital', importCount: 15 },
];

const DEFAULT_IMPORTS: ExistingImport[] = [
  { id: 'imp1', importNumber: 'IMP-2025-00138', name: 'Budget Q1 2025', version: 'v2.1', period: 'Jan - Mar 2025', importedAt: '2025-01-15' },
  { id: 'imp2', importNumber: 'IMP-2025-00125', name: 'Ventes Décembre', version: 'v1.0', period: 'Déc 2024', importedAt: '2025-01-02' },
  { id: 'imp3', importNumber: 'IMP-2024-00089', name: 'Comptabilité Générale', version: 'v3.2', period: 'Année 2024', importedAt: '2024-12-20' },
];

const generateImportNumber = (): string => {
  const year = new Date().getFullYear();
  const sequence = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
  return `IMP-${year}-${sequence}`;
};

const incrementVersion = (currentVersion: string, isMajor: boolean = false): string => {
  const match = currentVersion.match(/v(\d+)\.(\d+)/);
  if (!match) return 'v1.0';
  const major = parseInt(match[1]);
  const minor = parseInt(match[2]);
  return isMajor ? `v${major + 1}.0` : `v${major}.${minor + 1}`;
};

const DataImportModal: React.FC<DataImportModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  fileName = '',
  existingImport,
}) => {
  const today = new Date().toISOString().split('T')[0];
  const [name, setName] = useState(fileName.replace(/\.[^/.]+$/, '') || '');
  const [category, setCategory] = useState('');
  const [importDate, setImportDate] = useState(today);
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [folderId, setFolderId] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [description, setDescription] = useState('');
  const [isNewVersion, setIsNewVersion] = useState(!!existingImport);
  const [selectedExistingImport, setSelectedExistingImport] = useState<string>(existingImport?.id || '');
  const [showExistingImports, setShowExistingImports] = useState(false);
  const [showFolderDropdown, setShowFolderDropdown] = useState(false);

  const totalImportCount = useMemo(() => DEFAULT_FOLDERS.reduce((acc, folder) => acc + folder.importCount, 0), []);

  const importNumber = useMemo(() => {
    if (isNewVersion && selectedExistingImport) {
      const existing = DEFAULT_IMPORTS.find(i => i.id === selectedExistingImport);
      return existing?.importNumber || generateImportNumber();
    }
    return generateImportNumber();
  }, [isNewVersion, selectedExistingImport]);

  const version = useMemo(() => {
    if (isNewVersion && selectedExistingImport) {
      const existing = DEFAULT_IMPORTS.find(i => i.id === selectedExistingImport);
      return existing ? incrementVersion(existing.version) : 'v1.0';
    }
    return 'v1.0';
  }, [isNewVersion, selectedExistingImport]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name, category, importDate, periodStart, periodEnd,
      folderId: isCreatingFolder ? 'new' : folderId,
      newFolderName: isCreatingFolder ? newFolderName : undefined,
      description, importNumber, version, isNewVersion,
      replacesImportId: isNewVersion ? selectedExistingImport : undefined,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center">
              <FileUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {isNewVersion ? 'Nouvelle version d\'import' : 'Cataloguer l\'import'}
              </h2>
              <p className="text-sm text-gray-500">Organisez et identifiez vos données</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Identifiants auto-générés */}
          <div className="flex gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                <Hash className="w-3.5 h-3.5" />N° d'identification
              </div>
              <p className="font-mono font-semibold text-gray-900">{importNumber}</p>
            </div>
            <div className="w-px bg-gray-200" />
            <div className="flex-1">
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                <GitBranch className="w-3.5 h-3.5" />Version
              </div>
              <p className="font-mono font-semibold text-gray-900">{version}</p>
            </div>
          </div>

          {/* Mode */}
          <div className="flex gap-3">
            <button type="button" onClick={() => { setIsNewVersion(false); setSelectedExistingImport(''); }}
              className={cn('flex-1 p-3 rounded-xl border-2 text-left transition-all', !isNewVersion ? 'border-gray-400 bg-gray-50' : 'border-gray-200 hover:border-gray-300')}>
              <div className="flex items-center gap-2">
                <FileUp className="w-4 h-4 text-gray-600" />
                <span className="font-medium text-gray-900 text-sm">Nouvel import</span>
              </div>
            </button>
            <button type="button" onClick={() => setIsNewVersion(true)}
              className={cn('flex-1 p-3 rounded-xl border-2 text-left transition-all', isNewVersion ? 'border-gray-400 bg-gray-50' : 'border-gray-200 hover:border-gray-300')}>
              <div className="flex items-center gap-2">
                <RefreshCcw className="w-4 h-4 text-gray-600" />
                <span className="font-medium text-gray-900 text-sm">Nouvelle version</span>
              </div>
            </button>
          </div>

          {/* Sélection import existant */}
          {isNewVersion && (
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">Import à mettre à jour</label>
              <button type="button" onClick={() => setShowExistingImports(!showExistingImports)}
                className="w-full flex items-center justify-between px-4 py-3 border border-gray-200 rounded-xl bg-white hover:border-gray-300 transition-colors">
                {selectedExistingImport ? (
                  <div className="text-left">
                    <p className="font-medium text-gray-900">{DEFAULT_IMPORTS.find(i => i.id === selectedExistingImport)?.name}</p>
                    <p className="text-xs text-gray-500">{DEFAULT_IMPORTS.find(i => i.id === selectedExistingImport)?.importNumber}</p>
                  </div>
                ) : (<span className="text-gray-400">Sélectionner un import existant...</span>)}
                <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform', showExistingImports && 'rotate-180')} />
              </button>
              {showExistingImports && (
                <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {DEFAULT_IMPORTS.map((imp) => (
                    <button key={imp.id} type="button" onClick={() => { setSelectedExistingImport(imp.id); setShowExistingImports(false); setName(imp.name); }}
                      className={cn('w-full flex items-center justify-between p-3 text-left hover:bg-gray-50', selectedExistingImport === imp.id && 'bg-gray-50')}>
                      <div><p className="font-medium text-gray-900">{imp.name}</p><p className="text-xs text-gray-500">{imp.importNumber} • {imp.version}</p></div>
                      {selectedExistingImport === imp.id && <CheckCircle className="w-4 h-4 text-green-500" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Nom */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nom du fichier <span className="text-red-500">*</span></label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Budget prévisionnel Q1 2025"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          </div>

          {/* Catégorie */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type / Catégorie <span className="text-red-500">*</span></label>
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" required>
              <option value="">Sélectionner une catégorie...</option>
              {CATEGORIES.map((cat) => (<option key={cat.value} value={cat.value}>{cat.label}</option>))}
            </select>
          </div>

          {/* Date d'import */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date d'import</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -tranprimary-y-1/2 w-4 h-4 text-gray-400" />
              <input type="date" value={importDate} onChange={(e) => setImportDate(e.target.value)}
                className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {/* Période */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Période couverte</label>
            <div className="flex gap-3 items-center">
              <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <span className="text-gray-400">à</span>
              <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {/* Dossier */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">Dossier d'import</label>
            {!isCreatingFolder ? (
              <>
                <button type="button" onClick={() => setShowFolderDropdown(!showFolderDropdown)}
                  className="w-full flex items-center justify-between px-4 py-3 border border-gray-200 rounded-xl bg-white hover:border-gray-300">
                  <div className="flex items-center gap-3">
                    {!folderId || folderId === 'all' ? (
                      <><Database className="w-5 h-5 text-gray-600" /><div className="text-left"><p className="font-medium text-gray-900">All Data</p><p className="text-xs text-gray-500">{totalImportCount} imports</p></div></>
                    ) : (
                      <><Folder className="w-5 h-5 text-amber-500" /><div className="text-left"><p className="font-medium text-gray-900">{DEFAULT_FOLDERS.find(f => f.id === folderId)?.name}</p></div></>
                    )}
                  </div>
                  <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform', showFolderDropdown && 'rotate-180')} />
                </button>
                {showFolderDropdown && (
                  <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    <button type="button" onClick={() => { setFolderId('all'); setShowFolderDropdown(false); }}
                      className={cn('w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50', (!folderId || folderId === 'all') && 'bg-gray-50')}>
                      <Database className="w-5 h-5 text-gray-600" /><p className="font-medium text-gray-900 flex-1">All Data</p>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{totalImportCount}</span>
                    </button>
                    <div className="border-t border-gray-100" />
                    {DEFAULT_FOLDERS.map((folder) => (
                      <button key={folder.id} type="button" onClick={() => { setFolderId(folder.id); setShowFolderDropdown(false); }}
                        className={cn('w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50', folderId === folder.id && 'bg-gray-50')}>
                        <Folder className="w-5 h-5 text-amber-500" /><p className="font-medium text-gray-900 flex-1">{folder.name}</p>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{folder.importCount}</span>
                      </button>
                    ))}
                    <div className="border-t border-gray-100" />
                    <button type="button" onClick={() => { setShowFolderDropdown(false); setIsCreatingFolder(true); }}
                      className="w-full flex items-center gap-3 p-3 text-left hover:bg-blue-50 text-blue-600">
                      <FolderPlus className="w-5 h-5" /><p className="font-medium">New folder</p>
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <FolderPlus className="absolute left-4 top-1/2 -tranprimary-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="Nom du nouveau dossier..."
                    className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" autoFocus />
                </div>
                <button type="button" onClick={() => { setIsCreatingFolder(false); setNewFolderName(''); }}
                  className="px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-400">
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description <span className="text-gray-400">(optionnel)</span></label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Notes ou commentaires sur cet import..."
              rows={3} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          {isNewVersion && selectedExistingImport && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800">Mise à jour de version</p>
                <p className="text-amber-600">La version précédente sera archivée et restera accessible dans l'historique.</p>
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-gray-600 hover:text-gray-900 font-medium">Annuler</button>
          <div className="flex gap-3">
            {!isNewVersion && (
              <button type="button" onClick={() => setIsNewVersion(true)}
                className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-white">
                <RefreshCcw className="w-4 h-4" />Nouvelle version
              </button>
            )}
            <button type="submit" onClick={handleSubmit}
              className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800">
              <CheckCircle className="w-4 h-4" />{isNewVersion ? 'Importer nouvelle version' : 'Importer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataImportModal;
