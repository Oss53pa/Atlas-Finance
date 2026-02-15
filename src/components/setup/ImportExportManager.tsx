import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DocumentArrowUpIcon,
  DocumentArrowDownIcon,
  TableCellsIcon,
  DocumentTextIcon,
  CodeBracketIcon,
  DocumentIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  PlayIcon,
  PauseIcon,
  ArrowPathIcon,
  EyeIcon,
  Cog6ToothIcon,
  MagnifyingGlassIcon,
  CloudArrowUpIcon,
  CloudArrowDownIcon
} from '@heroicons/react/24/outline';

interface ImportTemplate {
  id: string;
  name: string;
  type: 'CHART_OF_ACCOUNTS' | 'OPENING_BALANCE' | 'JOURNAL_ENTRIES' | 'THIRD_PARTIES' | 'FIXED_ASSETS' | 'BUDGET';
  format: 'EXCEL' | 'CSV' | 'XML' | 'JSON' | 'TXT';
  description: string;
  columns: TemplateColumn[];
  validationRules: ValidationRule[];
  mappingRules: MappingRule[];
  isStandard: boolean;
  downloadCount: number;
  lastUsed: string;
}

interface TemplateColumn {
  name: string;
  type: 'STRING' | 'NUMBER' | 'DATE' | 'BOOLEAN' | 'ACCOUNT_CODE' | 'CURRENCY';
  required: boolean;
  defaultValue?: string;
  validation?: string;
  example: string;
}

interface ValidationRule {
  field: string;
  rule: string;
  message: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
}

interface MappingRule {
  sourceField: string;
  targetField: string;
  transformation?: string;
  defaultValue?: string;
}

interface ImportJob {
  id: string;
  name: string;
  template: string;
  fileName: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress: number;
  startDate: string;
  endDate?: string;
  results: {
    totalRows: number;
    successRows: number;
    errorRows: number;
    warnings: number;
  };
  errors: string[];
}

interface ExportJob {
  id: string;
  name: string;
  type: 'FEC' | 'BALANCE' | 'JOURNAL' | 'THIRD_PARTIES' | 'FISCAL_PACKAGE';
  format: 'EXCEL' | 'CSV' | 'XML' | 'PDF';
  parameters: any;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress: number;
  fileSize?: number;
  downloadUrl?: string;
  createdDate: string;
}

const ImportExportManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'import' | 'export' | 'templates' | 'fec'>('import');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const queryClient = useQueryClient();

  const { data: importTemplates = [] } = useQuery({
    queryKey: ['import-templates'],
    queryFn: async (): Promise<ImportTemplate[]> => [
      {
        id: '1',
        name: 'Plan Comptable SYSCOHADA',
        type: 'CHART_OF_ACCOUNTS',
        format: 'EXCEL',
        description: 'Import du plan comptable avec hiérarchie et paramètres',
        columns: [
          { name: 'Code', type: 'ACCOUNT_CODE', required: true, example: '601001', validation: 'SYSCOHADA_FORMAT' },
          { name: 'Libellé', type: 'STRING', required: true, example: 'Achats marchandises A' },
          { name: 'Classe', type: 'STRING', required: true, example: '6' },
          { name: 'Collectif', type: 'BOOLEAN', required: false, example: 'NON', defaultValue: 'NON' },
          { name: 'Lettrable', type: 'BOOLEAN', required: false, example: 'NON', defaultValue: 'NON' },
          { name: 'Tiers obligatoire', type: 'BOOLEAN', required: false, example: 'NON' }
        ],
        validationRules: [
          { field: 'Code', rule: 'UNIQUE', message: 'Code de compte déjà existant', severity: 'ERROR' },
          { field: 'Code', rule: 'SYSCOHADA_COMPLIANT', message: 'Code non conforme SYSCOHADA', severity: 'ERROR' },
          { field: 'Libellé', rule: 'MIN_LENGTH_3', message: 'Libellé trop court', severity: 'WARNING' }
        ],
        mappingRules: [
          { sourceField: 'Code', targetField: 'account_code' },
          { sourceField: 'Libellé', targetField: 'account_name' },
          { sourceField: 'Classe', targetField: 'account_class' }
        ],
        isStandard: true,
        downloadCount: 156,
        lastUsed: '2024-08-25'
      },
      {
        id: '2',
        name: 'Balance d\'Ouverture',
        type: 'OPENING_BALANCE',
        format: 'EXCEL',
        description: 'Import des soldes d\'ouverture avec ventilation analytique',
        columns: [
          { name: 'Compte', type: 'ACCOUNT_CODE', required: true, example: '411001' },
          { name: 'Libellé', type: 'STRING', required: true, example: 'Client ABC SARL' },
          { name: 'Débit', type: 'CURRENCY', required: false, example: '1500000' },
          { name: 'Crédit', type: 'CURRENCY', required: false, example: '0' },
          { name: 'Tiers', type: 'STRING', required: false, example: 'ABC SARL' },
          { name: 'Centre de coût', type: 'STRING', required: false, example: 'ADMIN' }
        ],
        validationRules: [
          { field: 'Compte', rule: 'EXISTS', message: 'Compte inexistant', severity: 'ERROR' },
          { field: 'Débit,Crédit', rule: 'BALANCE_CHECK', message: 'Débit et crédit simultanés', severity: 'ERROR' }
        ],
        mappingRules: [
          { sourceField: 'Compte', targetField: 'account_code' },
          { sourceField: 'Débit', targetField: 'debit_amount', defaultValue: '0' },
          { sourceField: 'Crédit', targetField: 'credit_amount', defaultValue: '0' }
        ],
        isStandard: true,
        downloadCount: 89,
        lastUsed: '2024-08-20'
      },
      {
        id: '3',
        name: 'Fichier Tiers Complet',
        type: 'THIRD_PARTIES',
        format: 'EXCEL',
        description: 'Import clients et fournisseurs avec contacts et paramètres',
        columns: [
          { name: 'Type', type: 'STRING', required: true, example: 'CLIENT' },
          { name: 'Code', type: 'STRING', required: true, example: 'CCM00001' },
          { name: 'Raison sociale', type: 'STRING', required: true, example: 'ABC SARL' },
          { name: 'Adresse', type: 'STRING', required: true, example: 'BP 1234 Yaoundé' },
          { name: 'Téléphone', type: 'STRING', required: false, example: '+237612345678' },
          { name: 'Email', type: 'STRING', required: false, example: 'contact@abc.cm' },
          { name: 'Conditions paiement', type: 'NUMBER', required: false, example: '30' },
          { name: 'Limite crédit', type: 'CURRENCY', required: false, example: '5000000' }
        ],
        validationRules: [
          { field: 'Code', rule: 'UNIQUE', message: 'Code tiers déjà existant', severity: 'ERROR' },
          { field: 'Email', rule: 'EMAIL_FORMAT', message: 'Format email invalide', severity: 'WARNING' },
          { field: 'Type', rule: 'ENUM_CLIENT_SUPPLIER', message: 'Type doit être CLIENT ou SUPPLIER', severity: 'ERROR' }
        ],
        mappingRules: [
          { sourceField: 'Type', targetField: 'third_party_type' },
          { sourceField: 'Code', targetField: 'code' },
          { sourceField: 'Raison sociale', targetField: 'legal_name' }
        ],
        isStandard: true,
        downloadCount: 67,
        lastUsed: '2024-08-18'
      }
    ]
  });

  const { data: importJobs = [] } = useQuery({
    queryKey: ['import-jobs'],
    queryFn: async (): Promise<ImportJob[]> => [
      {
        id: '1',
        name: 'Import Plan Comptable - Sage Migration',
        template: 'Plan Comptable SYSCOHADA',
        fileName: 'plan_comptable_sage.xlsx',
        status: 'COMPLETED',
        progress: 100,
        startDate: '2024-08-25T10:30:00Z',
        endDate: '2024-08-25T10:45:00Z',
        results: {
          totalRows: 156,
          successRows: 152,
          errorRows: 4,
          warnings: 8
        },
        errors: [
          'Ligne 45: Code 4011234 non conforme SYSCOHADA',
          'Ligne 67: Libellé manquant pour compte 602001',
          'Ligne 89: Compte 701999 déjà existant'
        ]
      }
    ]
  });

  const { data: exportJobs = [] } = useQuery({
    queryKey: ['export-jobs'],
    queryFn: async (): Promise<ExportJob[]> => [
      {
        id: '1',
        name: 'FEC Mensuel Août 2024',
        type: 'FEC',
        format: 'CSV',
        parameters: { period: '2024-08', includeValidatedOnly: true },
        status: 'COMPLETED',
        progress: 100,
        fileSize: 2450000,
        downloadUrl: '/api/exports/fec_202408.csv',
        createdDate: '2024-08-30T08:00:00Z'
      },
      {
        id: '2',
        name: 'Liasse Fiscale 2024',
        type: 'FISCAL_PACKAGE',
        format: 'PDF',
        parameters: { fiscalYear: '2024', includeAnnexes: true },
        status: 'PROCESSING',
        progress: 65,
        createdDate: '2024-08-30T09:00:00Z'
      }
    ]
  });

  const handleFileDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    
    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileUpload = (file: File) => {
    // TODO: Traitement du fichier
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'EXCEL': return TableCellsIcon;
      case 'CSV': return DocumentTextIcon;
      case 'XML': return CodeBracketIcon;
      case 'JSON': return CodeBracketIcon;
      case 'PDF': return DocumentIcon;
      default: return DocumentIcon;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold text-gray-900 flex items-center">
              <ArrowPathIcon className="h-8 w-8 mr-3 text-indigo-600" />
              Import/Export Avancé
            </h1>
            <p className="text-gray-600 mt-2">
              Gestion des échanges de données • 5 formats supportés • Templates SYSCOHADA
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <nav className="flex space-x-8 px-6">
          {[
            { id: 'import', label: 'Import Données', icon: DocumentArrowUpIcon },
            { id: 'export', label: 'Export Données', icon: DocumentArrowDownIcon },
            { id: 'templates', label: 'Templates', icon: TableCellsIcon },
            { id: 'fec', label: 'FEC Fiscal', icon: DocumentTextIcon }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-700 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Onglet Import */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          {/* Zone de drag & drop */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Import de Fichiers</h2>
            
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                dragOver 
                  ? 'border-indigo-400 bg-indigo-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
            >
              <CloudArrowUpIcon className={`h-16 w-16 mx-auto mb-4 ${
                dragOver ? 'text-indigo-500' : 'text-gray-700'
              }`} />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Glissez vos fichiers ici ou cliquez pour sélectionner
              </h3>
              <p className="text-gray-600 mb-4">
                Formats supportés: Excel (.xlsx, .xls), CSV, XML, JSON, TXT
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg"
              >
                Sélectionner Fichiers
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".xlsx,.xls,.csv,.xml,.json,.txt"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  files.forEach(handleFileUpload);
                }}
                className="hidden"
              />
            </div>
          </div>

          {/* Templates disponibles */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Templates Standards</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {importTemplates.map((template) => {
                const FormatIcon = getFormatIcon(template.format);
                
                return (
                  <div key={template.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="p-3 bg-blue-100 rounded-lg">
                          <FormatIcon className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{template.name}</h3>
                          <span className="text-xs text-gray-700">{template.format}</span>
                        </div>
                      </div>
                      {template.isStandard && (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                          Standard
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-gray-600 mb-4">{template.description}</p>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Colonnes:</span>
                        <span className="font-medium">{template.columns.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Règles validation:</span>
                        <span className="font-medium">{template.validationRules.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Téléchargements:</span>
                        <span className="font-medium">{template.downloadCount}</span>
                      </div>
                    </div>

                    <div className="flex space-x-2 mt-4">
                      <button className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded text-sm">
                        <CloudArrowDownIcon className="h-4 w-4 inline mr-1" />
                        Télécharger
                      </button>
                      <button 
                        onClick={() => setSelectedTemplate(template.id)}
                        className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Historique des imports */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Historique des Imports</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Import
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Template
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Résultats
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {importJobs.map((job) => (
                    <tr key={job.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{job.name}</div>
                        <div className="text-sm text-gray-700">{job.fileName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {job.template}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex flex-col items-center space-y-1">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            job.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                            job.status === 'PROCESSING' ? 'bg-blue-100 text-blue-800' :
                            job.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {job.status === 'COMPLETED' ? 'Terminé' :
                             job.status === 'PROCESSING' ? 'En cours' :
                             job.status === 'FAILED' ? 'Échec' : 'En attente'}
                          </span>
                          {job.status === 'PROCESSING' && (
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full transition-all"
                                style={{ width: `${job.progress}%` }}
                              ></div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                        <div className="space-y-1">
                          <div className="text-green-600 font-medium">
                            ✓ {job.results.successRows}/{job.results.totalRows}
                          </div>
                          {job.results.errorRows > 0 && (
                            <div className="text-red-600 text-xs">
                              ✗ {job.results.errorRows} erreurs
                            </div>
                          )}
                          {job.results.warnings > 0 && (
                            <div className="text-yellow-600 text-xs">
                              ⚠ {job.results.warnings} alertes
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                        {new Date(job.startDate).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex space-x-2 justify-center">
                          <button className="text-indigo-600 hover:text-indigo-900" aria-label="Voir les détails">
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          {job.status === 'FAILED' && (
                            <button className="text-green-600 hover:text-green-900" aria-label="Actualiser">
                              <ArrowPathIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Onglet Export */}
      {activeTab === 'export' && (
        <div className="space-y-6">
          {/* Exports rapides */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Exports Rapides</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  name: 'Balance Générale',
                  description: 'Export de la balance au format Excel',
                  icon: TableCellsIcon,
                  color: 'blue',
                  formats: ['Excel', 'CSV', 'PDF']
                },
                {
                  name: 'Grand Livre',
                  description: 'Détail des comptes avec écritures',
                  icon: DocumentTextIcon,
                  color: 'green',
                  formats: ['Excel', 'PDF']
                },
                {
                  name: 'Journal Centralisateur',
                  description: 'Récapitulatif des journaux',
                  icon: DocumentIcon,
                  color: 'purple',
                  formats: ['Excel', 'PDF']
                },
                {
                  name: 'FEC Fiscal',
                  description: 'Fichier des Écritures Comptables',
                  icon: CodeBracketIcon,
                  color: 'orange',
                  formats: ['CSV', 'XML']
                }
              ].map((exportType, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className={`p-3 bg-${exportType.color}-100 rounded-lg`}>
                      <exportType.icon className={`h-6 w-6 text-${exportType.color}-600`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{exportType.name}</h3>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-4">{exportType.description}</p>
                  
                  <div className="space-y-2">
                    <div className="text-xs text-gray-700 mb-2">Formats disponibles:</div>
                    <div className="flex flex-wrap gap-2">
                      {exportType.formats.map((format) => (
                        <button
                          key={format}
                          className="px-3 py-1 text-xs border border-gray-300 rounded-full hover:bg-gray-50"
                        >
                          {format}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <button className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded text-sm">
                    <CloudArrowDownIcon className="h-4 w-4 inline mr-1" />
                    Exporter
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Historique des exports */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Historique des Exports</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Export
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Format
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Taille
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {exportJobs.map((job) => (
                    <tr key={job.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{job.name}</div>
                        <div className="text-xs text-gray-700">
                          {Object.entries(job.parameters).map(([key, value]) => 
                            `${key}: ${value}`
                          ).join(' • ')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          job.type === 'FEC' ? 'bg-orange-100 text-orange-800' :
                          job.type === 'FISCAL_PACKAGE' ? 'bg-purple-100 text-purple-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {job.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                        {React.createElement(getFormatIcon(job.format), {
                          className: 'h-5 w-5 mx-auto text-gray-600'
                        })}
                        <div className="text-xs text-gray-700 mt-1">{job.format}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex flex-col items-center space-y-1">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            job.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                            job.status === 'PROCESSING' ? 'bg-blue-100 text-blue-800' :
                            job.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {job.status === 'COMPLETED' ? 'Terminé' :
                             job.status === 'PROCESSING' ? 'En cours' :
                             job.status === 'FAILED' ? 'Échec' : 'En attente'}
                          </span>
                          {job.status === 'PROCESSING' && (
                            <div className="w-16 bg-gray-200 rounded-full h-1">
                              <div 
                                className="bg-blue-500 h-1 rounded-full transition-all"
                                style={{ width: `${job.progress}%` }}
                              ></div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                        {job.fileSize ? formatFileSize(job.fileSize) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                        {new Date(job.createdDate).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex space-x-2 justify-center">
                          {job.downloadUrl && job.status === 'COMPLETED' && (
                            <button className="text-green-600 hover:text-green-900">
                              <CloudArrowDownIcon className="h-4 w-4" />
                            </button>
                          )}
                          <button className="text-indigo-600 hover:text-indigo-900" aria-label="Voir les détails">
                            <EyeIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Onglet FEC */}
      {activeTab === 'fec' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
            <DocumentTextIcon className="h-6 w-6 mr-2 text-indigo-600" />
            Fichier des Écritures Comptables (FEC)
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Génération FEC Automatique</h3>
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Format Réglementaire</h4>
                  <div className="text-sm text-blue-800 space-y-1">
                    <div>• 18 colonnes obligatoires selon norme</div>
                    <div>• Encodage UTF-8 avec séparateur pipe (|)</div>
                    <div>• Contrôles intégrité automatiques</div>
                    <div>• Validation format fiscal</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Période</label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500">
                      <option value="2024-08">Août 2024</option>
                      <option value="2024-07">Juillet 2024</option>
                      <option value="2024">Exercice 2024 complet</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="validatedOnly"
                      defaultChecked
                      className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <label htmlFor="validatedOnly" className="text-sm text-gray-700">
                      Écritures validées uniquement
                    </label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="includeAnalytical"
                      className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <label htmlFor="includeAnalytical" className="text-sm text-gray-700">
                      Inclure ventilation analytique
                    </label>
                  </div>

                  <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2">
                    <DocumentArrowDownIcon className="h-5 w-5" />
                    <span>Générer FEC</span>
                  </button>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Structure FEC</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-xs font-mono space-y-1">
                  <div className="font-semibold text-gray-900 mb-2">Colonnes obligatoires (18):</div>
                  <div>JournalCode|JournalLib|EcritureNum|EcritureDate</div>
                  <div>CompteNum|CompteLib|CompAuxNum|CompAuxLib</div>
                  <div>PieceRef|PieceDate|EcritureLib|Debit|Credit</div>
                  <div>EcritureLet|DateLet|ValidDate|Montantdevise</div>
                  <div>Idevise</div>
                </div>
              </div>

              <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-900 mb-2">⚠️ Contrôles Qualité</h4>
                <div className="text-sm text-yellow-800 space-y-1">
                  <div>• Équilibre global Débit = Crédit</div>
                  <div>• Cohérence dates (écriture ≤ validation)</div>
                  <div>• Références pièces non nulles</div>
                  <div>• Comptes conformes plan SYSCOHADA</div>
                  <div>• Lettrage cohérent</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportExportManager;