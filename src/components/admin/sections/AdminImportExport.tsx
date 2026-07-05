import React, { useState, useRef } from 'react';
import { Upload, Download, FileText, Users, Package, CheckCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useData } from '../../../contexts/DataContext';

interface Props { subTab: number; setSubTab: (n: number) => void; onGoToMigration?: () => void; }

const tabs = ['Import Plan Comptable', 'Import Ecritures', 'Import Tiers', 'Export FEC', 'Export Grand Livre'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const TEMPLATES: Record<string, string> = {
  'plan-comptable': 'Code,Libelle,Classe,Type,Sens\n411000,Clients,4,Bilan,Debiteur\n401000,Fournisseurs,4,Bilan,Crediteur',
  'tiers': 'Code,Nom,Type,NIF,Telephone,Email\nCLI001,Client Exemple,customer,1234567A,0700000001,client@exemple.ci',
  'immobilisations': 'Code,Libelle,Categorie,DateAcquisition,ValeurOrigine,DureeAmort\nIMM001,Ordinateur,Materiel informatique,2026-01-01,500000,3',
  'ecritures': 'Date,Journal,NumeroPiece,Compte,Libelle,Debit,Credit\n2026-01-01,VTE,VTE001,411000,Facture client,1180000,\n2026-01-01,VTE,VTE001,707000,Vente,,1000000',
};

// ─── Module-level sub-components ─────────────────────────────────────────────

const ImportExportTabBar = ({ subTab, setSubTab }: { subTab: number; setSubTab: (n: number) => void }) => (
  <div className="border-b border-gray-200 mb-6 overflow-x-auto">
    <nav className="flex space-x-1 -mb-px">
      {tabs.map((tab, i) => (
        <button key={i} onClick={() => setSubTab(i)}
          className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            subTab === i ? 'border-[#C0322B] text-[#C0322B]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}>{tab}</button>
      ))}
    </nav>
  </div>
);

const UploadZone = ({
  label,
  formats,
  templateCols,
  templateKey,
  onImport,
}: {
  label: string;
  formats: string;
  templateCols: string[];
  templateKey: string;
  onImport?: () => void;
}) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string } | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploadedFile({ name: f.name, size: `${(f.size / 1024).toFixed(0)} Ko` });
    toast.success(`Fichier ${f.name} charge`);
  };

  const downloadTemplate = () => {
    const content = TEMPLATES[templateKey] || 'Colonne1,Colonne2';
    const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8' });
    triggerDownload(blob, `template-${templateKey}.csv`);
    toast.success('Template telecharge');
  };

  return (
    <div className="space-y-4">
      <div
        className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center hover:border-[#C0322B] transition-colors cursor-pointer"
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
            <button onClick={() => onImport ? onImport() : toast.info('Utilisez l\'assistant de migration')} className="px-4 py-2 bg-[#C0322B] text-white rounded-lg text-sm">Importer</button>
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
        <button onClick={downloadTemplate} className="mt-4 text-sm text-[#C0322B] hover:underline flex items-center space-x-1">
          <Download className="w-4 h-4" /><span>Telecharger le template CSV</span>
        </button>
      </div>
    </div>
  );
};

// ─── Export components ────────────────────────────────────────────────────────

interface ExportFormProps {
  label: string;
  saving: boolean;
  onExport: () => Promise<void>;
}

const ExportForm = ({ label, saving, onExport }: ExportFormProps) => {
  const cy = new Date().getFullYear();
  const [exportFrom, setExportFrom] = useState(`${cy}-01-01`);
  const [exportTo, setExportTo] = useState(`${cy}-12-31`);
  return (
    <div className="bg-white rounded-xl p-6 border space-y-5">
      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Exercice</label>
          <select className="w-full px-3 py-2 border rounded-lg"><option>{cy}</option><option>{cy - 1}</option><option>{cy - 2}</option></select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Periode</label>
          <div className="flex space-x-2">
            <input type="date" value={exportFrom} onChange={e => setExportFrom(e.target.value)} className="flex-1 px-3 py-2 border rounded-lg text-sm" />
            <input type="date" value={exportTo} onChange={e => setExportTo(e.target.value)} className="flex-1 px-3 py-2 border rounded-lg text-sm" />
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
            <label key={i} className="flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:border-[#C0322B] has-[:checked]:border-[#C0322B] has-[:checked]:bg-red-50">
              <input type="radio" name={`fmt-${label}`} defaultChecked={i === 0} className="text-[#C0322B]" />
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
        <button
          onClick={onExport}
          disabled={saving}
          className="px-6 py-2.5 bg-[#C0322B] text-white rounded-lg text-sm font-medium flex items-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          <span>{saving ? 'Export en cours...' : `Generer l'export ${label}`}</span>
        </button>
      </div>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

const AdminImportExport: React.FC<Props> = ({ subTab, setSubTab, onGoToMigration }) => {
  const { adapter } = useData();
  const [saving, setSaving] = useState(false);

  // FEC conforme : une ligne par MOUVEMENT (CompteNum/CompteLib/Debit/Credit réels),
  // pas par pièce. Les lignes sont portées par journal_lines (ré-injectées dans .lines
  // par l'adapter, déjà paginées → pas de troncature à 1000).
  const handleExportFEC = async () => {
    try {
      setSaving(true);
      const entries = await adapter.getAll<any>('journalEntries');
      const header = 'JournalCode|JournalLib|EcritureNum|EcritureDate|CompteNum|CompteLib|PieceRef|PieceDate|EcritureLib|Debit|Credit\n';
      const lines: string[] = [];
      let nbLignes = 0;
      for (const e of entries as any[]) {
        for (const l of (e.lines || [])) {
          nbLignes++;
          lines.push([
            e.journal || '',
            `Journal ${e.journal || ''}`,
            e.entry_number || e.entryNumber || '',
            (e.date || '').replace(/-/g, ''),
            l.accountCode || l.account_code || '',
            (l.accountName || l.account_name || '').substring(0, 99),
            e.reference || '',
            e.date || '',
            (l.label || e.label || '').substring(0, 99),
            l.debit ?? 0,
            l.credit ?? 0,
          ].join('|'));
        }
      }
      const blob = new Blob([header + lines.join('\n')], { type: 'text/plain;charset=utf-8' });
      triggerDownload(blob, 'FEC.txt');
      toast.success(`FEC exporte — ${nbLignes} lignes / ${entries.length} ecritures`);
    } catch {
      toast.error('Erreur export FEC');
    } finally {
      setSaving(false);
    }
  };

  // Grand Livre : une ligne par mouvement, avec le compte réel.
  const handleExportGrandLivre = async () => {
    try {
      setSaving(true);
      const entries = await adapter.getAll<any>('journalEntries');
      const header = 'Date,Journal,Numero,Compte,Libelle,Debit,Credit,Statut\n';
      const rows: string[] = [];
      for (const e of entries as any[]) {
        for (const l of (e.lines || [])) {
          rows.push([
            e.date || '',
            e.journal || '',
            e.entry_number || e.entryNumber || '',
            l.accountCode || l.account_code || '',
            '"' + (l.label || e.label || '').replace(/"/g, '') + '"',
            l.debit ?? 0,
            l.credit ?? 0,
            e.status || '',
          ].join(','));
        }
      }
      const blob = new Blob(['﻿' + header + rows.join('\n')], { type: 'text/csv;charset=utf-8' });
      triggerDownload(blob, 'GrandLivre.csv');
      toast.success(`Grand Livre exporte — ${rows.length} lignes`);
    } catch {
      toast.error('Erreur export GL');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-lg font-bold mb-4">Import / Export</h2>
      <ImportExportTabBar subTab={subTab} setSubTab={setSubTab} />
      {subTab <= 2 && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start justify-between gap-4">
          <p className="text-sm text-blue-800">
            L'import réel (parsing, contrôle d'équilibre débit=crédit, détection de doublons, intégrité SHA-256)
            passe par l'<strong>assistant de migration</strong>. Le bouton « Importer » ci-dessous vous y redirige.
          </p>
          {onGoToMigration && (
            <button onClick={onGoToMigration} className="shrink-0 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
              Ouvrir l'assistant
            </button>
          )}
        </div>
      )}
      {subTab === 0 && (
        <UploadZone
          key={0}
          label="Plan Comptable"
          formats=".csv, .xlsx"
          templateKey="plan-comptable"
          onImport={onGoToMigration}
          templateCols={['numero', 'libelle', 'classe', 'type_compte', 'sens_normal', 'compte_collectif', 'statut']}
        />
      )}
      {subTab === 1 && (
        <UploadZone
          key={1}
          label="Ecritures Comptables"
          formats=".csv, .xlsx, .txt (FEC)"
          templateKey="ecritures"
          onImport={onGoToMigration}
          templateCols={['journal', 'numero_piece', 'date_piece', 'compte', 'tiers_code', 'libelle', 'debit', 'credit', 'date_echeance', 'lettrage_ref']}
        />
      )}
      {subTab === 2 && (
        <UploadZone
          key={2}
          label="Tiers (Clients/Fournisseurs)"
          formats=".csv, .xlsx"
          templateKey="tiers"
          onImport={onGoToMigration}
          templateCols={['code', 'type', 'raison_sociale', 'nif', 'rccm', 'pays', 'compte_collectif', 'email', 'telephone', 'adresse', 'conditions_paiement']}
        />
      )}
      {subTab === 3 && (
        <ExportForm label="FEC" saving={saving} onExport={handleExportFEC} />
      )}
      {subTab === 4 && (
        <ExportForm label="Grand Livre" saving={saving} onExport={handleExportGrandLivre} />
      )}
    </div>
  );
};

export default AdminImportExport;
