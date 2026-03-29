import React, { useState, useCallback } from 'react';
import { useData } from '../../contexts/DataContext';
import { useToast } from '../../hooks/useToast';
import { runAllCrossControls, type CrossControlReport, type ControlResult } from '../../services/crossControlsService';

function StatusBadge({ status }: { status: ControlResult['status'] }) {
  const colors = {
    OK: 'bg-green-100 text-green-800',
    ECART: 'bg-red-100 text-red-800',
    ERROR: 'bg-yellow-100 text-yellow-800',
  };
  const labels = { OK: 'OK', ECART: 'ÉCART', ERROR: 'ERREUR' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status]}`}>
      {labels[status]}
    </span>
  );
}

export default function CrossControlsPage() {
  const { adapter } = useData();
  const { toast } = useToast();
  const [report, setReport] = useState<CrossControlReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [fiscalYear, setFiscalYear] = useState({
    code: '2025',
    start: '2025-01-01',
    end: '2025-12-31',
  });

  const runControls = useCallback(async () => {
    if (!adapter) return;
    setLoading(true);
    try {
      const result = await runAllCrossControls(adapter, 'default', fiscalYear);
      setReport(result);
      if (result.totalEcart === 0) {
        toast.success(`Contrôles terminés: ${result.totalOk}/20 OK`);
      } else {
        toast.warning(`Contrôles terminés: ${result.totalOk}/20 OK, ${result.totalEcart} écarts`);
      }
    } catch (err) {
      toast.error(`Erreur: ${err instanceof Error ? err.message : 'Inconnue'}`);
    } finally {
      setLoading(false);
    }
  }, [adapter, fiscalYear, toast]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Contrôles Croisés</h1>
          <p className="text-sm text-gray-500 mt-1">20 contrôles automatisés de cohérence comptable</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Exercice:</label>
            <input
              type="text"
              value={fiscalYear.code}
              onChange={(e) => setFiscalYear({
                code: e.target.value,
                start: `${e.target.value}-01-01`,
                end: `${e.target.value}-12-31`,
              })}
              className="w-20 px-2 py-1 border rounded text-sm"
            />
          </div>
          <button
            onClick={runControls}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                En cours...
              </>
            ) : (
              'Lancer les contrôles'
            )}
          </button>
        </div>
      </div>

      {report && (
        <>
          {/* Score Summary */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
              <p className="text-sm text-gray-500">Score global</p>
              <p className={`text-3xl font-bold ${report.score === 100 ? 'text-green-600' : report.score >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                {report.score}%
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
              <p className="text-sm text-gray-500">Contrôles OK</p>
              <p className="text-3xl font-bold text-green-600">{report.totalOk}/20</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
              <p className="text-sm text-gray-500">Écarts détectés</p>
              <p className="text-3xl font-bold text-red-600">{report.totalEcart}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
              <p className="text-sm text-gray-500">Date d'exécution</p>
              <p className="text-sm font-medium mt-2">{new Date(report.date).toLocaleString('fr-FR')}</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium">Progression</span>
              <span className="text-sm text-gray-500">{report.totalOk}/20 contrôles validés</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${report.score === 100 ? 'bg-green-500' : report.score >= 80 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${report.score}%` }}
              />
            </div>
          </div>

          {/* Controls Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contrôle</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Détails</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Écart</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {report.controls.map((control) => (
                  <tr key={control.id} className={control.status === 'ECART' ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                    <td className="px-4 py-3 text-sm font-mono text-gray-500">{control.id}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{control.name}</p>
                      <p className="text-xs text-gray-500">{control.description}</p>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={control.status} /></td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 max-w-xs truncate">
                      {control.details || '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-mono">
                      {control.ecart ? (
                        <span className="text-red-600">{control.ecart.toString()}</span>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!report && !loading && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border p-12 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Aucun contrôle exécuté</h3>
          <p className="text-sm text-gray-500 mb-4">
            Cliquez sur "Lancer les contrôles" pour exécuter les 20 vérifications de cohérence comptable.
          </p>
        </div>
      )}
    </div>
  );
}
