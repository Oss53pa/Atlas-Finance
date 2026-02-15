/**
 * FEC Export component — Interface pour generer le Fichier des Ecritures Comptables.
 * Conforme article A.47 A-1 du LPF — 18 colonnes obligatoires.
 */
import React, { useState, useCallback } from 'react';
import { FileText, Download, CheckCircle, AlertTriangle, Loader2, Eye, Settings } from 'lucide-react';
import { generateFEC, validateFEC, downloadFEC, type FECExportOptions, type FECValidationResult } from '../../services/export/fecExportService';
import { db } from '../../lib/db';

const FECExport: React.FC = () => {
  const [exerciceId, setExerciceId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [siren, setSiren] = useState('');
  const [separator, setSeparator] = useState<';' | '\t'>(';');
  const [encoding, setEncoding] = useState<'UTF-8' | 'ISO-8859-15'>('UTF-8');
  const [devise, setDevise] = useState('XAF');

  const [validation, setValidation] = useState<FECValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<{ filename: string; lines: number } | null>(null);

  const [fiscalYears, setFiscalYears] = useState<Array<{ id: string; name: string; startDate: string; endDate: string }>>([]);

  // Load fiscal years on mount
  React.useEffect(() => {
    let mounted = true;
    db.fiscalYears.toArray().then(years => {
      if (!mounted) return;
      setFiscalYears(years.map(y => ({ id: y.id, name: y.name, startDate: y.startDate, endDate: y.endDate })));
      if (years.length > 0) {
        const active = years.find(y => y.isActive) || years[0];
        setExerciceId(active.id);
        setStartDate(active.startDate);
        setEndDate(active.endDate);
      }
    }).catch(() => { /* DB not available */ });
    return () => { mounted = false; };
  }, []);

  const handleExerciceChange = (id: string) => {
    setExerciceId(id);
    const fy = fiscalYears.find(y => y.id === id);
    if (fy) {
      setStartDate(fy.startDate);
      setEndDate(fy.endDate);
    }
  };

  const getOptions = useCallback((): FECExportOptions => ({
    exerciceId,
    startDate,
    endDate,
    siren,
    separator,
    encoding,
    devise,
  }), [exerciceId, startDate, endDate, siren, separator, encoding, devise]);

  const handleValidate = async () => {
    setIsValidating(true);
    setValidation(null);
    try {
      const result = await validateFEC(getOptions());
      setValidation(result);
    } catch (e: any) {
      setValidation({ valid: false, errors: [e.message || 'Erreur de validation'], warnings: [], lineCount: 0, totalDebit: 0, totalCredit: 0 });
    }
    setIsValidating(false);
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportResult(null);
    try {
      const result = await generateFEC(getOptions());
      if (result.success && result.data && result.filename) {
        downloadFEC(result.data, result.filename, encoding);
        setExportResult({ filename: result.filename, lines: result.lineCount || 0 });
      }
    } catch {
      // Error handling
    }
    setIsExporting(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center space-x-3 mb-6">
        <FileText className="w-6 h-6 text-blue-600" />
        <div>
          <h1 className="text-lg font-bold text-gray-900">Export FEC</h1>
          <p className="text-sm text-gray-500">Fichier des Ecritures Comptables — 18 colonnes obligatoires (Art. A.47 A-1 LPF)</p>
        </div>
      </div>

      {/* Configuration */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 flex items-center space-x-2">
          <Settings className="w-4 h-4" />
          <span>Parametres d'export</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Exercice fiscal</label>
            {fiscalYears.length > 0 ? (
              <select value={exerciceId} onChange={e => handleExerciceChange(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                {fiscalYears.map(fy => (
                  <option key={fy.id} value={fy.id}>{fy.name} ({fy.startDate} - {fy.endDate})</option>
                ))}
              </select>
            ) : (
              <div className="flex gap-4">
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Debut" />
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Fin" />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SIREN / RCCM</label>
            <input type="text" value={siren} onChange={e => setSiren(e.target.value)} placeholder="000000000" maxLength={9} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Separateur</label>
            <select value={separator} onChange={e => setSeparator(e.target.value as ';' | '\t')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value=";">Point-virgule (;)</option>
              <option value={'\t'}>Tabulation</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Encodage</label>
            <select value={encoding} onChange={e => setEncoding(e.target.value as 'UTF-8' | 'ISO-8859-15')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="UTF-8">UTF-8</option>
              <option value="ISO-8859-15">ISO-8859-15</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Devise</label>
            <select value={devise} onChange={e => setDevise(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="XAF">XAF (Franc CFA CEMAC)</option>
              <option value="XOF">XOF (Franc CFA UEMOA)</option>
              <option value="EUR">EUR (Euro)</option>
              <option value="USD">USD (Dollar US)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-4 mb-6">
        <button onClick={handleValidate} disabled={isValidating || !startDate || !endDate} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium flex items-center space-x-2 disabled:opacity-50">
          {isValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
          <span>Valider</span>
        </button>
        <button onClick={handleExport} disabled={isExporting || !startDate || !endDate} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center space-x-2 disabled:opacity-50">
          {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          <span>Exporter FEC</span>
        </button>
      </div>

      {/* Validation results */}
      {validation && (
        <div className={`border rounded-lg p-4 mb-6 ${validation.valid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center space-x-2 mb-2">
            {validation.valid ? <CheckCircle className="w-5 h-5 text-green-600" /> : <AlertTriangle className="w-5 h-5 text-red-600" />}
            <span className={`font-medium ${validation.valid ? 'text-green-800' : 'text-red-800'}`}>
              {validation.valid ? 'Validation reussie' : 'Erreurs detectees'}
            </span>
          </div>
          <div className="text-sm space-y-1">
            <p className="text-gray-700">{validation.lineCount} lignes | Debit: {validation.totalDebit.toLocaleString('fr-FR')} | Credit: {validation.totalCredit.toLocaleString('fr-FR')}</p>
            {validation.errors.map((e, i) => (
              <p key={i} className="text-red-700">- {e}</p>
            ))}
            {validation.warnings.map((w, i) => (
              <p key={i} className="text-amber-700">- {w}</p>
            ))}
          </div>
        </div>
      )}

      {/* Export result */}
      {exportResult && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="font-medium text-green-800">Export reussi</span>
          </div>
          <p className="text-sm text-green-700 mt-1">{exportResult.filename} — {exportResult.lines} lignes exportees</p>
        </div>
      )}

      {/* 18 columns reference */}
      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Colonnes FEC (18 obligatoires)</h3>
        <div className="flex flex-wrap gap-1">
          {['JournalCode', 'JournalLib', 'EcritureNum', 'EcritureDate', 'CompteNum', 'CompteLib', 'CompAuxNum', 'CompAuxLib', 'PieceRef', 'PieceDate', 'EcritureLib', 'Debit', 'Credit', 'EcrtureLet', 'DateLet', 'ValidDate', 'Montantdevise', 'Idevise'].map(col => (
            <span key={col} className="px-2 py-0.5 bg-white border border-gray-300 rounded text-[10px] font-mono text-gray-600">{col}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FECExport;
