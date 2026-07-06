/**
 * BudgetVersionDetailPage — /budget/versions/:id
 *
 * Détail COMPLET d'une version budgétaire : phasage mensuel (12 colonnes) par
 * ligne, groupé par rubrique SYSCOHADA, sous-totaux + résultat budgété. Lecture
 * seule (l'édition passe par Saisie / Import). Impression + drill-down écritures.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useToast } from '../../hooks/useToast';
import { formatCurrency } from '../../utils/formatters';
import {
  listBudgetVersions, getBudgetLinesWithPeriods,
  type BudgetVersionFull, type BudgetLineEdit,
} from '../../features/budget/services/budgetService';
import { CATEGORIES_SYSCOHADA } from '../../data/syscohada-referentiel';
import PageHeaderActions from '../../components/ui/PageHeaderActions';
import BudgetImportModal from './BudgetImportModal';
import { ArrowLeft, GitBranch, Star, Lock, ExternalLink, Upload, PencilLine } from 'lucide-react';

const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const catLabel = (code2: string) => CATEGORIES_SYSCOHADA.find(c => c.code === code2)?.libelle || code2;

interface Row { account_code: string; label: string; periods: Record<number, number>; total: number }
interface Rubrique { code: string; label: string; rows: Row[]; monthly: number[]; total: number }

function groupByRubrique(lines: BudgetLineEdit[], names: Map<string, string>): Rubrique[] {
  const map = new Map<string, Rubrique>();
  for (const l of lines) {
    const cat = l.account_code.slice(0, 2);
    if (!map.has(cat)) map.set(cat, { code: cat, label: catLabel(cat), rows: [], monthly: Array(12).fill(0), total: 0 });
    const g = map.get(cat)!;
    const total = Object.values(l.periods).reduce((s, v) => s + (v || 0), 0);
    for (let p = 1; p <= 12; p++) g.monthly[p - 1] += l.periods[p] || 0;
    g.total += total;
    g.rows.push({ account_code: l.account_code, label: names.get(l.account_code) || '', periods: l.periods, total });
  }
  const rubriques = Array.from(map.values());
  rubriques.forEach(r => r.rows.sort((a, b) => a.account_code.localeCompare(b.account_code)));
  return rubriques.sort((a, b) => a.code.localeCompare(b.code));
}

const BudgetVersionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { adapter } = useData();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [version, setVersion] = useState<BudgetVersionFull | null>(null);
  const [lines, setLines] = useState<BudgetLineEdit[]>([]);
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vue, setVue] = useState<'exploitation' | 'investissement'>('exploitation');
  const [showImport, setShowImport] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) return;
      setLoading(true); setError(null);
      try {
        const [versions, l, accounts] = await Promise.all([
          listBudgetVersions(adapter),
          getBudgetLinesWithPeriods(adapter, id),
          adapter.getAll<any>('accounts').catch(() => []),
        ]);
        if (cancelled) return;
        const v = versions.find(x => x.id === id) || null;
        if (!v) { setError('Version introuvable.'); setLoading(false); return; }
        const nm = new Map<string, string>();
        (accounts || []).forEach((a: any) => nm.set(String(a.code || ''), String(a.name || a.libelle || '')));
        setVersion(v); setLines(l); setNames(nm);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Erreur de chargement');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [adapter, id, refreshKey]);

  const expLines = useMemo(() => lines.filter(l => l.budget_type === 'exploitation'), [lines]);
  const invLines = useMemo(() => lines.filter(l => l.budget_type === 'investissement'), [lines]);
  const produits = useMemo(() => groupByRubrique(expLines.filter(l => l.account_code.startsWith('7')), names), [expLines, names]);
  const charges = useMemo(() => groupByRubrique(expLines.filter(l => l.account_code.startsWith('6')), names), [expLines, names]);
  const capex = useMemo(() => groupByRubrique(invLines, names), [invLines, names]);

  const sumTotal = (rs: Rubrique[]) => rs.reduce((s, r) => s + r.total, 0);
  const totalProduits = sumTotal(produits), totalCharges = sumTotal(charges), totalCapex = sumTotal(capex);
  const resultat = totalProduits - totalCharges;

  if (loading) return <div className="p-8 text-center text-[var(--color-text-tertiary)]">Chargement du détail…</div>;
  if (error) {
    return (
      <div className="p-8">
        <div className="bg-[var(--color-error-light,#FEECEC)] text-[var(--color-error)] rounded-lg p-4 text-sm">{error}</div>
        <button onClick={() => navigate('/budget/versions')} className="mt-4 text-sm text-[var(--color-primary)] hover:underline">← Retour aux versions</button>
      </div>
    );
  }
  const v = version!;

  const renderBlock = (title: string, rubriques: Rubrique[], accent: string) => (
    <div className="mb-6">
      <div className="px-1 mb-2 text-sm font-semibold" style={{ color: accent }}>{title}</div>
      <div className="overflow-x-auto border border-[var(--color-border)] rounded-xl">
        <table className="text-xs border-collapse min-w-[1100px] w-full">
          <thead className="bg-gray-50 border-b border-[var(--color-border)] sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-gray-600 sticky left-0 bg-gray-50 w-56">Compte</th>
              {MOIS.map(m => <th key={m} className="px-2 py-2 text-right font-semibold text-gray-500 w-20">{m}</th>)}
              <th className="px-3 py-2 text-right font-semibold text-gray-700 w-28">Total</th>
              <th className="px-2 py-2 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {rubriques.length === 0 && <tr><td colSpan={15} className="px-3 py-6 text-center text-gray-400">Aucune ligne.</td></tr>}
            {rubriques.map(g => (
              <React.Fragment key={g.code}>
                <tr className="bg-[var(--color-primary)]/5 border-t border-[var(--color-border)]">
                  <td className="px-3 py-1.5 font-semibold text-[var(--color-primary)] sticky left-0 bg-[var(--color-primary)]/5"><span className="font-mono">{g.code}</span> · {g.label}</td>
                  {g.monthly.map((mv, i) => <td key={i} className="px-2 py-1.5 text-right text-gray-500">{mv ? formatCurrency(mv) : ''}</td>)}
                  <td className="px-3 py-1.5 text-right font-semibold text-gray-800">{formatCurrency(g.total)}</td>
                  <td></td>
                </tr>
                {g.rows.map(r => (
                  <tr key={r.account_code} className="hover:bg-gray-50 border-t border-gray-100">
                    <td className="px-3 py-1 sticky left-0 bg-white">
                      <span className="font-mono text-gray-600 ml-3">{r.account_code}</span> <span className="text-gray-500">{r.label}</span>
                    </td>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(p => (
                      <td key={p} className="px-2 py-1 text-right text-gray-700">{r.periods[p] ? formatCurrency(r.periods[p]) : ''}</td>
                    ))}
                    <td className="px-3 py-1 text-right font-medium text-gray-900">{formatCurrency(r.total)}</td>
                    <td className="px-2 py-1 text-center">
                      <button onClick={() => navigate(`/accounting/general-ledger?compte=${r.account_code}`)} title="Voir les écritures" className="text-gray-300 hover:text-[var(--color-primary)]"><ExternalLink className="w-3.5 h-3.5 inline" /></button>
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="p-6 bg-[var(--color-border)] min-h-full space-y-5">
      <div className="bg-white rounded-xl p-5 border border-[var(--color-border)] shadow-sm flex items-center gap-3 flex-wrap">
        <button onClick={() => navigate('/budget/versions')} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"><ArrowLeft className="w-4 h-4" /></button>
        <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center"><GitBranch className="w-5 h-5 text-[var(--color-primary)]" /></div>
        <div className="flex-1 min-w-[200px]">
          <h1 className="text-lg font-bold text-[var(--color-primary)] flex items-center gap-2">
            {v.libelle}
            {v.is_active && <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
            {v.statut === 'verrouille' && <Lock className="w-4 h-4 text-amber-600" />}
          </h1>
          <p className="text-sm text-[var(--color-text-tertiary)] capitalize">{v.type} · {v.statut} · {lines.length} ligne(s)</p>
        </div>
        <div className="flex items-center gap-2">
          {v.statut !== 'verrouille' && (
            <button onClick={() => setShowImport(true)} className="px-3 py-2 text-sm font-medium border border-[var(--color-border)] rounded-lg hover:bg-gray-50 flex items-center gap-2"><Upload className="w-4 h-4" />Importer</button>
          )}
          {v.is_active && v.statut !== 'verrouille' && (
            <button onClick={() => navigate('/budget/cockpit')} className="px-3 py-2 text-sm font-medium border border-[var(--color-border)] rounded-lg hover:bg-gray-50 flex items-center gap-2"><PencilLine className="w-4 h-4" />Saisir</button>
          )}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['exploitation', 'investissement'] as const).map(t => (
              <button key={t} onClick={() => setVue(t)} className={`px-3 py-1.5 text-xs font-medium rounded-md ${vue === t ? 'bg-white text-[var(--color-primary)] shadow-sm' : 'text-gray-500'}`}>
                {t === 'exploitation' ? 'Exploitation' : 'Investissement'}
              </button>
            ))}
          </div>
          <PageHeaderActions printTitle={`Budget « ${v.libelle} » — ${vue}`} />
        </div>
      </div>

      {/* Bandeau totaux */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 border border-[var(--color-border)] shadow-sm"><div className="text-xs text-[var(--color-text-tertiary)]">Produits budgétés</div><div className="text-lg font-bold text-gray-900">{formatCurrency(totalProduits)}</div></div>
        <div className="bg-white rounded-xl p-4 border border-[var(--color-border)] shadow-sm"><div className="text-xs text-[var(--color-text-tertiary)]">Charges budgétées</div><div className="text-lg font-bold text-gray-900">{formatCurrency(totalCharges)}</div></div>
        <div className="bg-white rounded-xl p-4 border border-[var(--color-border)] shadow-sm"><div className="text-xs text-[var(--color-text-tertiary)]">Résultat budgété</div><div className="text-lg font-bold" style={{ color: resultat >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>{formatCurrency(resultat)}</div></div>
        <div className="bg-white rounded-xl p-4 border border-[var(--color-border)] shadow-sm"><div className="text-xs text-[var(--color-text-tertiary)]">Investissement budgété</div><div className="text-lg font-bold text-gray-900">{formatCurrency(totalCapex)}</div></div>
      </div>

      {lines.length === 0 ? (
        <div className="bg-white rounded-xl p-10 border border-[var(--color-border)] shadow-sm text-center text-sm text-[var(--color-text-tertiary)]">
          Aucune ligne budgétaire dans cette version. Importez un budget (bouton ci-dessus) ou saisissez-le depuis le Cockpit.
        </div>
      ) : vue === 'exploitation' ? (
        <div className="bg-white rounded-xl p-5 border border-[var(--color-border)] shadow-sm">
          {renderBlock('Produits (classe 7)', produits, 'var(--color-success)')}
          {renderBlock('Charges (classe 6)', charges, 'var(--color-error)')}
          <div className="flex justify-end pt-2 border-t border-[var(--color-border)]">
            <div className="text-sm">Résultat budgété : <span className="font-bold" style={{ color: resultat >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>{formatCurrency(resultat)}</span></div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl p-5 border border-[var(--color-border)] shadow-sm">
          {renderBlock('Investissement (classe 2)', capex, 'var(--color-primary)')}
        </div>
      )}

      <BudgetImportModal open={showImport} onClose={() => setShowImport(false)} initialVersionId={id} onImported={() => setRefreshKey(k => k + 1)} />
    </div>
  );
};

export default BudgetVersionDetailPage;
