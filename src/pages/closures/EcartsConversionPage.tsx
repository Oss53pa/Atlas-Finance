// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { useToast } from '../../hooks/useToast';
import FeatureGuard from '../../components/auth/FeatureGuard';
import { extourneEcartsConversion } from '../../services/foreignCurrencyPaymentService';
import { formatCurrency } from '../../utils/formatters';
import { ArrowLeft, ArrowLeftRight, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const EcartsConversionPage: React.FC = () => {
  const { adapter } = useData();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [ecarts, setEcarts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateExtourne, setDateExtourne] = useState(new Date().toISOString().split('T')[0]);
  const [processing, setProcessing] = useState(false);

  const loadEcarts = async () => {
    setLoading(true);
    try {
      const entries = await adapter.getAll('journalEntries') as any[];
      const ecartLines: any[] = [];
      for (const entry of entries) {
        if (entry.status !== 'validated' && entry.status !== 'posted') continue;
        for (const line of (entry.lines || [])) {
          const code = line.accountCode || '';
          if (code.startsWith('476') || code.startsWith('477')) {
            ecartLines.push({
              id: `${entry.id}-${line.id}`,
              entryId: entry.id,
              entryNumber: entry.entryNumber,
              date: entry.date,
              compte: code,
              libelle: line.label || entry.label || '',
              debit: line.debit || 0,
              credit: line.credit || 0,
            });
          }
        }
      }
      setEcarts(ecartLines);
    } catch { setEcarts([]); }
    setLoading(false);
  };

  useEffect(() => { loadEcarts(); }, [adapter]);

  const handleExtourne = async () => {
    if (!dateExtourne) { toast.error('Sélectionnez une date d\'extourne'); return; }
    setProcessing(true);
    try {
      const ids = await extourneEcartsConversion(adapter, 'default', dateExtourne);
      if (ids.length > 0) {
        toast.success(`${ids.length} écriture(s) d'extourne générée(s)`);
      } else {
        toast.warning('Aucun écart de conversion à extourner');
      }
      loadEcarts();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de l\'extourne');
    }
    setProcessing(false);
  };

  const total476 = ecarts.filter(e => e.compte.startsWith('476')).reduce((s, e) => s + e.debit - e.credit, 0);
  const total477 = ecarts.filter(e => e.compte.startsWith('477')).reduce((s, e) => s + e.credit - e.debit, 0);

  return (
    <FeatureGuard module="ecarts_conversion">
      <div className="p-6 bg-[#e5e5e5] min-h-screen">
        <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button onClick={() => navigate('/closures')} className="flex items-center px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <ArrowLeftRight className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-[#171717]">Écarts de Conversion (476 / 477)</h1>
                <p className="text-sm text-[#737373]">Gestion et extourne des écarts de conversion — SYSCOHADA</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div>
                <label className="text-xs text-[#737373]">Date d'extourne</label>
                <input type="date" value={dateExtourne} onChange={e => setDateExtourne(e.target.value)}
                  className="block border border-[#e5e5e5] rounded-lg px-3 py-1.5 text-sm" />
              </div>
              <button onClick={handleExtourne} disabled={processing || ecarts.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 mt-4">
                <RefreshCw className={`w-4 h-4 ${processing ? 'animate-spin' : ''}`} />
                {processing ? 'Extourne...' : 'Extourner tout'}
              </button>
            </div>
          </div>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm">
            <p className="text-xs text-[#737373]">Écarts actif (476)</p>
            <p className="text-xl font-bold text-[#171717]">{formatCurrency(Math.abs(total476))}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm">
            <p className="text-xs text-[#737373]">Écarts passif (477)</p>
            <p className="text-xl font-bold text-[#171717]">{formatCurrency(Math.abs(total477))}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-[#e5e5e5] shadow-sm">
            <p className="text-xs text-[#737373]">Lignes d'écart</p>
            <p className="text-xl font-bold text-[#171717]">{ecarts.length}</p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-[#e5e5e5] shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-[#737373]">Chargement...</div>
          ) : ecarts.length === 0 ? (
            <div className="p-12 text-center text-[#737373]">
              <ArrowLeftRight className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">Aucun écart de conversion</p>
              <p className="text-sm mt-1">Les comptes 476 et 477 ne contiennent aucune écriture</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-[#e5e5e5]">
                  <th className="p-3 text-left text-xs font-semibold text-[#737373] uppercase">N° écriture</th>
                  <th className="p-3 text-left text-xs font-semibold text-[#737373] uppercase">Date</th>
                  <th className="p-3 text-left text-xs font-semibold text-[#737373] uppercase">Compte</th>
                  <th className="p-3 text-left text-xs font-semibold text-[#737373] uppercase">Libellé</th>
                  <th className="p-3 text-right text-xs font-semibold text-[#737373] uppercase">Débit</th>
                  <th className="p-3 text-right text-xs font-semibold text-[#737373] uppercase">Crédit</th>
                </tr>
              </thead>
              <tbody>
                {ecarts.map(e => (
                  <tr key={e.id} className="border-b border-[#e5e5e5] hover:bg-gray-50">
                    <td className="p-3 text-sm font-mono">{e.entryNumber || '—'}</td>
                    <td className="p-3 text-sm">{e.date ? new Date(e.date).toLocaleDateString('fr-FR') : '—'}</td>
                    <td className="p-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${e.compte.startsWith('476') ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                        {e.compte}
                      </span>
                    </td>
                    <td className="p-3 text-sm">{e.libelle}</td>
                    <td className="p-3 text-sm text-right">{e.debit > 0 ? formatCurrency(e.debit) : '—'}</td>
                    <td className="p-3 text-sm text-right">{e.credit > 0 ? formatCurrency(e.credit) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </FeatureGuard>
  );
};

export default EcartsConversionPage;
