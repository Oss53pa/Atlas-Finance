/**
 * Rattachement assisté des lignes collectives orphelines (40x / 41x sans tiers).
 *
 * Écran de RÉPARATION du sous-registre : il liste les lignes que le moteur ne
 * peut rattacher seul, propose des candidats scorés et EXPLIQUÉS, et n'affecte
 * que sur confirmation. Rien n'est appliqué automatiquement.
 *
 * Voir `services/tiers/orphanLines.ts` (moteur) et `thirdPartyCoverage.ts`
 * (quantification affichée sur le tableau de bord Tiers).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ArrowLeft, RefreshCw, Link2, Search, AlertTriangle, CheckCircle } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { formatCurrency } from '../../utils/formatters';
import type { DBThirdParty } from '../../lib/db';
import {
  listOrphanCollectiveLines,
  suggestTiers,
  assignTiersToLine,
  type OrphanLine,
  type FamilleTiers,
} from '../../services/tiers/orphanLines';

const PAGE_SIZE = 50;

const RattachementTiersPage: React.FC = () => {
  const navigate = useNavigate();
  const { adapter } = useData();

  const [loading, setLoading] = useState(true);
  const [lines, setLines] = useState<OrphanLine[]>([]);
  const [tiers, setTiers] = useState<DBThirdParty[]>([]);
  const [famille, setFamille] = useState<'all' | FamilleTiers>('all');
  const [search, setSearch] = useState('');
  const [onlySuggested, setOnlySuggested] = useState(false);
  const [page, setPage] = useState(0);
  /** Choix de l'utilisateur par ligne (code tiers). */
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [orphans, tps] = await Promise.all([
        listOrphanCollectiveLines(adapter),
        adapter.getAll<DBThirdParty>('thirdParties'),
      ]);
      setLines(orphans);
      setTiers(tps);
    } catch (e) {
      toast.error(`Chargement impossible : ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [adapter]);

  useEffect(() => { void load(); }, [load]);

  // --- Filtres -------------------------------------------------------------
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return lines.filter(l => {
      if (famille !== 'all' && l.famille !== famille) return false;
      if (q && !`${l.label} ${l.accountCode} ${l.entryNumber ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [lines, famille, search]);

  // Suggestions calculées sur la PAGE seulement (le stock peut être énorme).
  const pageRows = useMemo(() => {
    const slice = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    return slice.map(l => ({ line: l, suggestions: suggestTiers(l, tiers) }));
  }, [filtered, page, tiers]);

  const visibleRows = onlySuggested ? pageRows.filter(r => r.suggestions.length > 0) : pageRows;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const optionsFor = useCallback((l: OrphanLine) => {
    const wanted = l.famille === 'client' ? 'customer' : 'supplier';
    return tiers
      .filter(t => t.code && (!t.type || t.type === wanted || t.type === 'both'))
      .map(t => ({ value: t.code, label: `${t.code} – ${t.name}` }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [tiers]);

  // --- Affectation ---------------------------------------------------------
  const attach = useCallback(async (l: OrphanLine, code: string) => {
    const fiche = tiers.find(t => t.code === code);
    if (!fiche) { toast.error('Fiche tiers introuvable.'); return; }
    setBusy(l.lineId);
    try {
      await assignTiersToLine(adapter, l.lineId, { code: fiche.code, name: fiche.name });
      setLines(prev => prev.filter(x => x.lineId !== l.lineId));
      toast.success(`Ligne rattachée à ${fiche.code} – ${fiche.name}`);
    } catch (e) {
      toast.error(`Échec : ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  }, [adapter, tiers]);

  const attachSelection = useCallback(async () => {
    const batch = visibleRows
      .map(r => ({ line: r.line, code: choices[r.line.lineId] }))
      .filter(x => !!x.code);
    if (batch.length === 0) { toast.error('Aucun tiers choisi sur cette page.'); return; }
    setBusy('batch');
    let ok = 0, ko = 0;
    for (const b of batch) {
      const fiche = tiers.find(t => t.code === b.code);
      if (!fiche) { ko += 1; continue; }
      try {
        await assignTiersToLine(adapter, b.line.lineId, { code: fiche.code, name: fiche.name });
        ok += 1;
      } catch { ko += 1; }
    }
    const done = new Set(batch.map(b => b.line.lineId));
    setLines(prev => prev.filter(x => !done.has(x.lineId)));
    setChoices({});
    setBusy(null);
    toast.success(`${ok} ligne(s) rattachée(s)${ko > 0 ? ` — ${ko} échec(s)` : ''}`);
  }, [visibleRows, choices, adapter, tiers]);

  const montant = (l: OrphanLine) => (l.debit || 0) - (l.credit || 0);
  const totalNonAffecte = useMemo(
    () => filtered.reduce((s, l) => s + Math.abs(montant(l)), 0),
    [filtered],
  );
  const nbChoisis = visibleRows.filter(r => choices[r.line.lineId]).length;

  return (
    <div className="p-6 space-y-4">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/tiers')}
            className="p-2 rounded-lg hover:bg-gray-100"
            title="Retour au tableau de bord Tiers"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Rattachement des lignes sans tiers</h1>
            <p className="text-sm text-gray-600">
              Lignes 40x/41x qui n'apparaissent dans aucune vue par tiers tant qu'elles ne sont pas rattachées.
            </p>
          </div>
        </div>
        <button
          onClick={() => void load()}
          className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 flex items-center gap-2 text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Recharger
        </button>
      </div>

      {/* Constat */}
      <div className="p-3 rounded-lg border border-amber-300 bg-amber-50 flex items-start gap-2">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-900">
          <strong>{filtered.length}</strong> ligne(s) collectives sans code tiers,
          soit <strong>{formatCurrency(totalNonAffecte)}</strong> de mouvements absents des encours,
          balances âgées, relances et du lettrage. Aucune affectation n'est faite automatiquement :
          les propositions ci-dessous sont des <em>indices</em> à confirmer.
        </p>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm">
          {([['all', 'Tous'], ['client', 'Clients (41x)'], ['fournisseur', 'Fournisseurs (40x)']] as const).map(([v, lbl]) => (
            <button
              key={v}
              onClick={() => { setFamille(v as 'all' | FamilleTiers); setPage(0); }}
              className={`px-3 py-1.5 ${famille === v ? 'bg-[var(--color-primary)] text-white' : 'bg-white hover:bg-gray-50'}`}
            >
              {lbl}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="Libellé, compte, n° de pièce…"
            className="pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm w-72"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={onlySuggested}
            onChange={e => setOnlySuggested(e.target.checked)}
          />
          Uniquement les lignes avec une proposition
        </label>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-gray-600">{nbChoisis} choix sur cette page</span>
          <button
            onClick={() => void attachSelection()}
            disabled={nbChoisis === 0 || busy !== null}
            className="px-3 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm disabled:opacity-40 flex items-center gap-2"
          >
            <Link2 className="w-4 h-4" />
            Rattacher les choix
          </button>
        </div>
      </div>

      {/* Tableau */}
      <div className="border border-gray-200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-700">Date</th>
              <th className="text-left px-3 py-2 font-medium text-gray-700">Pièce</th>
              <th className="text-left px-3 py-2 font-medium text-gray-700">Compte</th>
              <th className="text-left px-3 py-2 font-medium text-gray-700">Libellé</th>
              <th className="text-right px-3 py-2 font-medium text-gray-700">Montant</th>
              <th className="text-left px-3 py-2 font-medium text-gray-700">Tiers proposé</th>
              <th className="text-center px-3 py-2 font-medium text-gray-700">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-500">Chargement…</td></tr>
            )}
            {!loading && visibleRows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-gray-500">
                  <CheckCircle className="w-5 h-5 inline mr-2 text-green-600" />
                  Aucune ligne à rattacher avec ces filtres.
                </td>
              </tr>
            )}
            {!loading && visibleRows.map(({ line, suggestions }) => {
              const best = suggestions[0];
              const current = choices[line.lineId] ?? best?.code ?? '';
              return (
                <tr key={line.lineId} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2 whitespace-nowrap">{line.date}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                    {line.entryNumber || '—'}
                    {line.journal ? <span className="ml-1 text-xs text-gray-400">({line.journal})</span> : null}
                  </td>
                  <td className="px-3 py-2 font-mono">{line.accountCode}</td>
                  <td className="px-3 py-2 max-w-md truncate" title={line.label}>{line.label || '—'}</td>
                  <td className={`px-3 py-2 text-right whitespace-nowrap ${montant(line) < 0 ? 'text-red-600' : ''}`}>
                    {formatCurrency(montant(line))}
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={current}
                      onChange={e => setChoices(prev => ({ ...prev, [line.lineId]: e.target.value }))}
                      className="w-full max-w-xs px-2 py-1 border border-gray-300 rounded text-xs"
                    >
                      <option value="">— choisir un tiers —</option>
                      {optionsFor(line).map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    {best && (
                      <p className="text-[11px] text-gray-500 mt-0.5" title={best.reason}>
                        proposition {best.score}% — {best.reason}
                      </p>
                    )}
                    {!best && (
                      <p className="text-[11px] text-gray-400 mt-0.5">aucune correspondance dans le libellé</p>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => current && void attach(line, current)}
                      disabled={!current || busy !== null}
                      className="px-2 py-1 rounded bg-[var(--color-primary)] text-white text-xs disabled:opacity-40"
                    >
                      {busy === line.lineId ? '…' : 'Rattacher'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            Page {page + 1} / {totalPages} — {filtered.length} ligne(s)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-40"
            >
              Précédent
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 border border-gray-300 rounded-lg disabled:opacity-40"
            >
              Suivant
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RattachementTiersPage;
