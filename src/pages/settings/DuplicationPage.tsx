/**
 * Duplication de paramétrage société→société (CDC §3, critère #7).
 *
 * Copie les blocs de configuration d'une société vers une autre (les deux dont
 * l'utilisateur est membre). Exclut par construction les données vivantes
 * (écritures, tiers, soldes) et nominatives (utilisateurs, signataires, banques).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Copy, ArrowRight, CheckCircle, ShieldAlert } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import {
  listMyCompanies, duplicateConfig, validateDuplication, DUP_BLOCKS,
  type MyCompany, type DupBlock,
} from '../../services/param/duplicationService';

const DuplicationPage: React.FC = () => {
  const navigate = useNavigate();
  const { adapter } = useData();
  const [companies, setCompanies] = useState<MyCompany[]>([]);
  const [source, setSource] = useState('');
  const [target, setTarget] = useState('');
  const [blocks, setBlocks] = useState<DupBlock[]>(DUP_BLOCKS.map(b => b.key));
  const [report, setReport] = useState<Record<string, number> | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setCompanies(await listMyCompanies(adapter)); }
    catch (e) { toast.error(`Chargement impossible : ${(e as Error).message}`); }
    finally { setLoading(false); }
  }, [adapter]);
  useEffect(() => { void load(); }, [load]);

  const toggleBlock = (k: DupBlock) => setBlocks(b => b.includes(k) ? b.filter(x => x !== k) : [...b, k]);

  const run = async () => {
    const err = validateDuplication(source, target, blocks);
    if (err) { toast.error(err); return; }
    const tgt = companies.find(c => c.id === target);
    if (!window.confirm(`Copier le paramétrage sélectionné vers « ${tgt?.nom} » ? Les données existantes de la cible ne sont pas écrasées.`)) return;
    setBusy(true); setReport(null);
    try { const r = await duplicateConfig(adapter, source, target, blocks); setReport(r); toast.success('Duplication effectuée'); }
    catch (e) { toast.error(`Échec : ${(e as Error).message}`); }
    finally { setBusy(false); }
  };

  const canDuplicate = companies.length >= 2;

  return (
    <div className="p-6 space-y-4 max-w-3xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2"><Copy className="w-5 h-5 text-[var(--color-primary)]" /> Duplication de paramétrage</h1>
          <p className="text-sm text-gray-600">Copier la configuration d'une société vers une autre</p>
        </div>
      </div>

      {!loading && !canDuplicate && (
        <div className="p-3 rounded-lg border border-amber-300 bg-amber-50 text-sm text-amber-800">
          Vous devez être membre d'au moins deux sociétés pour dupliquer un paramétrage.
        </div>
      )}

      {/* Source → Cible */}
      <div className="border border-gray-200 rounded-lg p-4 bg-white grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Société source</label>
          <select value={source} onChange={e => setSource(e.target.value)} className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm">
            <option value="">—</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.code} · {c.nom}</option>)}
          </select>
        </div>
        <div className="hidden sm:flex justify-center pb-2 text-gray-400"><ArrowRight className="w-5 h-5" /></div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Société cible</label>
          <select value={target} onChange={e => setTarget(e.target.value)} className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm">
            <option value="">—</option>
            {companies.filter(c => c.id !== source).map(c => <option key={c.id} value={c.id}>{c.code} · {c.nom}</option>)}
          </select>
        </div>
      </div>

      {/* Blocs */}
      <div className="border border-gray-200 rounded-lg p-4 bg-white">
        <div className="text-sm font-medium text-gray-800 mb-2">Blocs à copier</div>
        <div className="space-y-2">
          {DUP_BLOCKS.map(b => (
            <label key={b.key} className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={blocks.includes(b.key)} onChange={() => toggleBlock(b.key)} />{b.label}
            </label>
          ))}
        </div>
        <div className="mt-3 text-xs text-gray-500 flex items-start gap-1.5">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
          Exclus par construction : données vivantes (écritures, tiers, soldes) et nominatives (utilisateurs, signataires, comptes bancaires). Les valeurs déjà présentes dans la cible ne sont pas écrasées.
        </div>
      </div>

      <button onClick={run} disabled={!canDuplicate || busy} className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50">
        <Copy className="w-4 h-4" />{busy ? 'Duplication…' : 'Dupliquer'}
      </button>

      {/* Rapport de copie */}
      {report && (
        <div className="border border-green-200 rounded-lg overflow-hidden">
          <div className="px-3 py-2 bg-green-50 border-b border-green-200 text-sm font-semibold text-green-800 flex items-center gap-2"><CheckCircle className="w-4 h-4" />Rapport de copie</div>
          <table className="w-full text-sm">
            <tbody>
              {DUP_BLOCKS.filter(b => b.key in report).map(b => (
                <tr key={b.key} className="border-b border-gray-100">
                  <td className="px-3 py-2 text-gray-700">{b.label}</td>
                  <td className="px-3 py-2 text-right font-medium text-gray-900">{report[b.key]} copié(s)</td>
                </tr>
              ))}
              {Object.keys(report).length === 0 && <tr><td className="px-3 py-3 text-gray-400 text-sm">Aucun bloc copié.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DuplicationPage;
