/**
 * QualificationPage — /analytique/qualification (CDC §5.4).
 *
 * File de qualification du reliquat de ventilation : les lignes de GL (charges/
 * produits) non couvertes par une règle sont affectées manuellement à une
 * section, puis — une fois affectées — promouvables en règle DIRECT en un clic
 * (le prochain run couvre automatiquement ce compte).
 *
 * La suggestion est ADVISORY (apprise des affectations passées du même compte) ;
 * aucune affectation n'est jamais posée automatiquement.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useToast } from '../../hooks/useToast';
import { formatCurrency } from '../../utils/formatters';
import { listSections, type Section } from '../../features/budget/services/analyticsService';
import {
  listQueue, assign, promoteToRule, type QualificationItem, type QualificationStatut,
} from '../../features/budget/services/qualificationService';
import { ArrowLeft, ListChecks, Inbox, Wand2, Check, GitBranch } from 'lucide-react';

const QualificationPage: React.FC = () => {
  const { adapter } = useData();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState<QualificationStatut>('en_attente');
  const [items, setItems] = useState<QualificationItem[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [rowSection, setRowSection] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string>('');

  const load = async (which: QualificationStatut = tab) => {
    setLoading(true);
    try {
      const [secs, q] = await Promise.all([listSections(adapter), listQueue(adapter, which)]);
      setSections(secs); setItems(q);
    } catch (e: any) { toast.error(e?.message || 'Erreur'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(tab); /* eslint-disable-next-line */ }, [adapter, tab]);

  const sectionLabel = (id: string | null) => { const s = sections.find(x => x.id === id); return s ? `${s.code} · ${s.libelle}` : '—'; };

  const doAssign = async (item: QualificationItem) => {
    const sectionId = rowSection[item.id] || item.suggestion?.section_id || '';
    if (!sectionId) { toast.error('Choisissez une section (ou appliquez la suggestion).'); return; }
    setBusy(item.id);
    try { await assign(adapter, item.id, sectionId); toast.success('Ligne affectée'); await load(); }
    catch (e: any) { toast.error(e?.message || 'Erreur'); }
    finally { setBusy(''); }
  };

  const doPromote = async (item: QualificationItem) => {
    setBusy(item.id);
    try { await promoteToRule(adapter, item.id); toast.success(`Règle créée : compte ${item.account_code} → ${sectionLabel(item.section_id)}`); await load(); }
    catch (e: any) { toast.error(e?.message || 'Erreur'); }
    finally { setBusy(''); }
  };

  return (
    <div className="p-6 bg-[var(--color-border)] min-h-full space-y-6">
      {/* En-tête */}
      <div className="bg-white rounded-xl p-5 border border-[var(--color-border)] shadow-sm flex items-center gap-3 flex-wrap">
        <button onClick={() => navigate('/budget/ventilation')} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"><ArrowLeft className="w-4 h-4" /></button>
        <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center"><ListChecks className="w-5 h-5 text-[var(--color-primary)]" /></div>
        <div className="flex-1 min-w-[200px]">
          <h1 className="text-lg font-bold text-[var(--color-primary)]">File de qualification</h1>
          <p className="text-sm text-[var(--color-text-tertiary)]">Reliquat de ventilation · affectation manuelle → promotion en règle</p>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex gap-2">
        {([['en_attente', 'En attente', Inbox], ['affecte', 'Affectées', Check]] as const).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key)} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${tab === key ? 'bg-[var(--color-primary)] text-white' : 'bg-white border border-[var(--color-border)] text-gray-600 hover:bg-gray-50'}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-[var(--color-border)]"><tr>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">Compte</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">Libellé</th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">Montant</th>
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600">{tab === 'en_attente' ? 'Section cible' : 'Section affectée'}</th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-600">Action</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {loading && <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">Chargement…</td></tr>}
            {!loading && items.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                {tab === 'en_attente' ? 'Aucune ligne en attente — couverture complète. 🎉' : 'Aucune ligne affectée manuellement.'}
              </td></tr>
            )}
            {!loading && items.map(item => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5"><span className="font-mono text-gray-500">{item.account_code}</span> <span className="text-gray-800">{item.account_name}</span></td>
                <td className="px-4 py-2.5 text-gray-600 text-xs max-w-[240px] truncate">{item.label || '—'}</td>
                <td className={`px-4 py-2.5 text-right font-medium ${item.montant < 0 ? 'text-blue-700' : 'text-gray-900'}`}>{formatCurrency(item.montant)}</td>
                <td className="px-4 py-2.5">
                  {tab === 'en_attente' ? (
                    <div className="flex items-center gap-2">
                      <select value={rowSection[item.id] ?? item.suggestion?.section_id ?? ''} onChange={e => setRowSection(m => ({ ...m, [item.id]: e.target.value }))} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm max-w-[220px]">
                        <option value="">Choisir une section…</option>
                        {sections.map(s => <option key={s.id} value={s.id}>{s.code} · {s.libelle}</option>)}
                      </select>
                      {item.suggestion && (
                        <span className="text-[10px] text-[var(--color-primary)] flex items-center gap-1" title="Suggestion basée sur vos affectations passées du même compte">
                          <Wand2 className="w-3 h-3" />suggéré
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-800">{sectionLabel(item.section_id)}{item.promue_en_regle_id && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700">règle créée</span>}</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {tab === 'en_attente' ? (
                    <button onClick={() => doAssign(item)} disabled={busy === item.id} className="px-3 py-1.5 bg-[var(--color-primary)] text-white rounded-lg text-xs flex items-center gap-1 ml-auto disabled:opacity-50">
                      <Check className="w-3.5 h-3.5" />Affecter
                    </button>
                  ) : (
                    <button onClick={() => doPromote(item)} disabled={busy === item.id || !!item.promue_en_regle_id} className="px-3 py-1.5 border border-[var(--color-primary)] text-[var(--color-primary)] rounded-lg text-xs flex items-center gap-1 ml-auto disabled:opacity-40 hover:bg-[var(--color-primary)]/5">
                      <GitBranch className="w-3.5 h-3.5" />{item.promue_en_regle_id ? 'Promue' : 'Promouvoir en règle'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[var(--color-text-tertiary)] flex items-center gap-1.5">
        <Wand2 className="w-3.5 h-3.5" />Les suggestions sont indicatives (apprises de vos affectations passées) — aucune affectation automatique n'est jamais posée.
      </p>
    </div>
  );
};

export default QualificationPage;
