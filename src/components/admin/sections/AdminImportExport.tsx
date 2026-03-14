import React, { useState, useRef } from 'react';
import { Upload, Download, FileText, Users, Package, Search, CheckCircle, AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props { subTab: number; setSubTab: (n: number) => void; }

const tabs = ['Import Plan Comptable', 'Import Ecritures', 'Import Tiers', 'Export FEC', 'Export Grand Livre'];

const AdminImportExport: React.FC<Props> = ({ subTab, setSubTab }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string; rows: number } | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploadedFile({ name: f.name, size: `${(f.size / 1024).toFixed(0)} Ko`, rows: 0 });
    toast.success(`Fichier ${f.name} charge`);
  };

  const TabBar = () => (
    <div className="border-b border-gray-200 mb-6 overflow-x-auto">
      <nav className="flex space-x-1 -mb-px">
        {tabs.map((tab, i) => (
          <button key={i} onClick={() => { setSubTab(i); setUploadedFile(null); }}
            className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              subTab === i ? 'border-[#ef4444] text-[#ef4444]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}>{tab}</button>
        ))}
      </nav>
    </div>
  );

  const UploadZone = ({ label, formats, templateCols }: { label: string; formats: string; templateCols: string[] }) => (
    <div className="space-y-4">
      <div
        className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center hover:border-[#ef4444] transition-colors cursor-pointer"
        onClick={() => fileRef.current?.click()}
      >
        <Upload className="w-12 h-12 mx-auto text-gray-300 mb-3" />
        <p className="text-gray-600 font-medium">Glissez votre fichier {label} ici</p>
        <p className="text-sm text-gray-400 mt-1">Formats acceptes : {formats}</p>
        <p className="text-xs text-gray-300 mt-2">ou cliquez pour parcourir</p>
      </div>
      <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.txt" className="hidden" onChange={handleFile} />

      {uploadedFile && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-medium text-green-800">{uploadedFile.name}</p>
              <p className="text-xs text-green-600">{uploadedFile.size}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={() => toast.info('Lancement de l\'import...')} className="px-4 py-2 bg-[#ef4444] text-white rounded-lg text-sm">Importer</button>
            <button onClick={() => setUploadedFile(null)} className="p-2 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4 text-red-500" /></button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl p-5 border">
        <h4 className="font-medium mb-3">Colonnes attendues dans le fichier</h4>
        <div className="flex flex-wrap gap-2">
          {templateCols.map(col => (
            <span key={col} className="px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-700">{col}</span>
          ))}
        </div>
        <button onClick={() => toast.info('Telechargement du template...')} className="mt-4 text-sm text-[#ef4444] hover:underline flex items-center space-x-1">
          <Download className="w-4 h-4" /><span>Telecharger le template CSV</span>
        </button>
      </div>
    </div>
  );

  const ExportForm = ({ label }: { label: string }) => (
    <div className="bg-white rounded-xl p-6 border space-y-5">
      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Exercice</label>
          <select className="w-full px-3 py-2 border rounded-lg"><option>2026</option><option>2025</option><option>2024</option></select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Periode</label>
          <div className="flex space-x-2">
            <input type="date" defaultValue="2026-01-01" className="flex-1 px-3 py-2 border rounded-lg text-sm" />
            <input type="date" defaultValue="2026-12-31" className="flex-1 px-3 py-2 border rounded-lg text-sm" />
          </div>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Format de sortie</label>
        <div className="grid grid-cols-3 gap-3">
          {(label === 'FEC'
            ? ['CSV point-virgule (;)', 'CSV tabulation', 'TXT']
            : ['CSV', 'Excel (.xlsx)', 'PDF']
          ).map((f, i) => (
            <label key={i} className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:border-[#ef4444] has-[:checked]:border-[#ef4444] has-[:checked]:bg-red-50">
              <input type="radio" name={`fmt-${label}`} defaultChecked={i === 0} className="text-[#ef4444]" />
              <span className="text-sm">{f}</span>
            </label>
          ))}
        </div>
      </div>
      {label === 'FEC' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Encodage</label>
          <select className="w-64 px-3 py-2 border rounded-lg"><option>UTF-8</option><option>ISO-8859-15 (Latin)</option></select>
        </div>
      )}
      <div className="flex justify-end">
        <button onClick={() => toast.success(`Export ${label} genere avec succes`)} className="px-6 py-2.5 bg-[#ef4444] text-white rounded-lg text-sm font-medium flex items-center space-x-2">
          <Download className="w-4 h-4" /><span>Generer l'export {label}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <h2 className="text-lg font-bold mb-4">Import / Export</h2>
      <TabBar />
      {subTab === 0 && <UploadZone label="Plan Comptable" formats=".csv, .xlsx" templateCols={['numero', 'libelle', 'classe', 'type_compte', 'sens_normal', 'compte_collectif', 'statut']} />}
      {subTab === 1 && <UploadZone label="Ecritures Comptables" formats=".csv, .xlsx, .txt (FEC)" templateCols={['journal', 'numero_piece', 'date_piece', 'compte', 'tiers_code', 'libelle', 'debit', 'credit', 'date_echeance', 'lettrage_ref']} />}
      {subTab === 2 && <UploadZone label="Tiers (Clients/Fournisseurs)" formats=".csv, .xlsx" templateCols={['code', 'type', 'raison_sociale', 'nif', 'rccm', 'pays', 'compte_collectif', 'email', 'telephone', 'adresse', 'conditions_paiement']} />}
      {subTab === 3 && <ExportForm label="FEC" />}
      {subTab === 4 && <ExportForm label="Grand Livre" />}
    </div>
  );
};

export default AdminImportExport;
