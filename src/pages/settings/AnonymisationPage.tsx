/**
 * Anonymisation des tiers personnes physiques (CDC Paramètres §13, critère #8).
 *
 * Liste les candidats (rétention échue), déclenche l'anonymisation souveraine
 * (irréversible, journalisée). Les écritures et soldes restent intacts.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ArrowLeft, RefreshCw, ShieldAlert, History, UserX, CheckCircle, Clock } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { listCandidates, anonymizeTiers, listAnonymisationLog, type Candidate, type AnonLogRow } from '../../services/param/anonymizationService';

const AnonymisationPage: React.FC = () => {
  const navigate = useNavigate();
  const { adapter } = useData();
  const [tab, setTab] = useState<'candidats' | 'journal'>('candidats');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [retention, setRetention] = useState(60);
  const [log, setLog] = useState<AnonLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, l] = await Promise.all([listCandidates(adapter), listAnonymisationLog(adapter, 200)]);
      setCandidates(c.candidates); setRetention(c.retentionMonths); setLog(l);
    } catch (e) { toast.error(`Chargement impossible : ${(e as Error).message}`); }
    finally { setLoading(false); }
  }, [adapter]);
  useEffect(() => { void load(); }, [load]);

  const anonymize = async (c: Candidate) => {
    if (!window.confirm(`Anonymiser définitivement « ${c.code} · ${c.name} » ? Les coordonnées seront purgées ; les écritures et le solde restent intacts. Action IRRÉVERSIBLE.`)) return;
    const motif = window.prompt('Motif de l\'anonymisation (tracé au journal) :');
    if (!motif || !motif.trim()) { toast.error('Motif requis.'); return; }
    setBusy(c.code);
    try {
      const r = await anonymizeTiers(adapter, c.code, motif.trim());
      toast.success(r?.skipped ? 'Déjà anonymisé' : `Anonymisé → ${r?.pseudonyme || ''}`);
      await load();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(''); }
  };

  const eligibles = candidates.filter(c => c.eligible);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2"><UserX className="w-5 h-5 text-[var(--color-primary)]" /> Anonymisation des tiers</h1>
            <p className="text-sm text-gray-600">Personnes physiques dont la rétention ({retention} mois) est échue</p>
          </div>
        </div>
        <button onClick={() => void load()} className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 flex items-center gap-2 text-sm"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Recharger</button>
      </div>

      <div className="p-3 rounded-lg border border-blue-200 bg-blue-50 text-sm text-blue-900 flex items-start gap-2">
        <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
        <span>Opération <b>irréversible</b> : le nom devient un pseudonyme, e-mail/téléphone/adresse/n° fiscal sont purgés. Le <b>code, les écritures et le solde restent intacts</b> (obligation SYSCOHADA 10 ans). Réservée aux administrateurs, l'éligibilité est revérifiée côté serveur.</span>
      </div>

      <div className="flex gap-2">
        {([['candidats', 'Candidats', Clock], ['journal', 'Journal', History]] as const).map(([k, l, Icon]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${tab === k ? 'bg-[var(--color-primary)] text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
            <Icon className="w-4 h-4" />{l}{k === 'candidats' && eligibles.length > 0 && <span className="text-[10px] bg-white/20 rounded px-1">{eligibles.length}</span>}
          </button>
        ))}
      </div>

      {tab === 'candidats' && (
        <div className="border border-gray-200 rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200"><tr>
              <th className="text-left px-3 py-2 font-medium text-gray-700">Tiers</th>
              <th className="text-left px-3 py-2 font-medium text-gray-700">Dernière activité</th>
              <th className="text-left px-3 py-2 font-medium text-gray-700">Échéance</th>
              <th className="text-center px-3 py-2 font-medium text-gray-700">Statut</th>
              <th className="text-right px-3 py-2 font-medium text-gray-700">Action</th>
            </tr></thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="px-3 py-8 text-center text-gray-500">Chargement…</td></tr>}
              {!loading && candidates.length === 0 && <tr><td colSpan={5} className="px-3 py-10 text-center text-gray-500">Aucun tiers personne physique à anonymiser.</td></tr>}
              {!loading && candidates.map(c => (
                <tr key={c.code} className={`border-b border-gray-100 ${c.eligible ? 'hover:bg-red-50/40' : 'hover:bg-gray-50'}`}>
                  <td className="px-3 py-2"><span className="font-mono text-gray-500">{c.code}</span> <span className="text-gray-800">{c.name}</span></td>
                  <td className="px-3 py-2 text-gray-600">{c.derniere_activite}</td>
                  <td className="px-3 py-2 text-gray-600">{c.echeance}</td>
                  <td className="px-3 py-2 text-center">
                    {c.eligible
                      ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">échue</span>
                      : <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">à conserver</span>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => anonymize(c)} disabled={!c.eligible || busy === c.code} className="px-3 py-1.5 border border-red-300 text-red-700 rounded-lg text-xs inline-flex items-center gap-1 ml-auto disabled:opacity-30 hover:bg-red-50">
                      <UserX className="w-3.5 h-3.5" />Anonymiser
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'journal' && (
        <div className="border border-gray-200 rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200"><tr>
              <th className="text-left px-3 py-2 font-medium text-gray-700">Quand</th>
              <th className="text-left px-3 py-2 font-medium text-gray-700">Tiers</th>
              <th className="text-left px-3 py-2 font-medium text-gray-700">Motif</th>
              <th className="text-left px-3 py-2 font-medium text-gray-700">Hash</th>
            </tr></thead>
            <tbody>
              {log.length === 0 && <tr><td colSpan={4} className="px-3 py-8 text-center text-gray-500">Aucune anonymisation journalisée.</td></tr>}
              {log.map((a, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="px-3 py-2 text-gray-500 text-xs whitespace-nowrap">{new Date(a.le).toLocaleString('fr-FR')}</td>
                  <td className="px-3 py-2 font-mono text-gray-600">{a.tiers_code}</td>
                  <td className="px-3 py-2 text-gray-700 text-xs">{a.motif || '—'}</td>
                  <td className="px-3 py-2 font-mono text-[10px] text-gray-400" title={`précédent : ${a.hash_precedent || '—'}`}>{(a.hash || '').slice(0, 12)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {tab === 'journal' && log.length > 0 && <p className="text-xs text-gray-500 flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" />Journal append-only chaîné par hash — toute rupture de la chaîne est détectable.</p>}
    </div>
  );
};

export default AnonymisationPage;
