/**
 * CapexPrioriteKanban — arbitrage visuel des Business Cases par PRIORITÉ.
 *
 * 4 colonnes (critique / haute / moyenne / basse) ; on glisse une carte pour
 * poser la priorité — écriture RÉELLE en base (capex_requests.priorite via
 * updateBcFields), pas un état local. Complète le classement par score composite
 * (le score classe objectivement, la priorité est le geste d'arbitrage humain).
 *
 * Drag & drop HTML5 natif : aucune dépendance ajoutée.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { formatCurrency } from '../../utils/formatters';
import { getAccountLabel } from '../../utils/accountLabels';
import type { CapexPriorite, CapexRequest } from '../../features/budget/services/budgetService';
import { Loader2, GripVertical, AlertTriangle } from 'lucide-react';

export const PRIORITES: { key: CapexPriorite; label: string; accent: string; ring: string }[] = [
  { key: 'critique', label: 'Critique', accent: 'text-red-700', ring: 'border-red-300' },
  { key: 'haute', label: 'Haute', accent: 'text-amber-700', ring: 'border-amber-300' },
  { key: 'moyenne', label: 'Moyenne', accent: 'text-[var(--color-primary)]', ring: 'border-[var(--color-border)]' },
  { key: 'basse', label: 'Basse', accent: 'text-[var(--color-text-tertiary)]', ring: 'border-[var(--color-border)]' },
];

interface Props {
  rows: CapexRequest[];
  /** Persiste la nouvelle priorité ; doit rejeter en cas d'échec (rollback UI). */
  onChangePriorite: (id: string, priorite: CapexPriorite) => Promise<void>;
  onOpen: (id: string) => void;
}

const CapexPrioriteKanban: React.FC<Props> = ({ rows, onChangePriorite, onOpen }) => {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<CapexPriorite | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const byPriorite = useMemo(() => {
    const m: Record<CapexPriorite, CapexRequest[]> = { critique: [], haute: [], moyenne: [], basse: [] };
    for (const r of rows) {
      const p = (r.priorite as CapexPriorite) || 'moyenne';
      (m[p] ?? m.moyenne).push(r);
    }
    // Au sein d'une colonne : le plus gros engagement d'abord.
    for (const k of Object.keys(m) as CapexPriorite[]) m[k].sort((a, b) => (b.montant || 0) - (a.montant || 0));
    return m;
  }, [rows]);

  const drop = useCallback(async (target: CapexPriorite) => {
    const id = dragId;
    setOverCol(null); setDragId(null);
    if (!id) return;
    const current = rows.find((r) => r.id === id);
    if (!current || ((current.priorite as CapexPriorite) || 'moyenne') === target) return;
    setBusyId(id); setError(null);
    try { await onChangePriorite(id, target); }
    catch (e: any) { setError(e?.message || 'Échec de la mise à jour de la priorité.'); }
    finally { setBusyId(null); }
  }, [dragId, rows, onChangePriorite]);

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 items-start">
        {PRIORITES.map((col) => {
          const items = byPriorite[col.key];
          const total = items.reduce((s, r) => s + (r.montant || 0), 0);
          const isOver = overCol === col.key;
          return (
            <section
              key={col.key}
              onDragOver={(e) => { e.preventDefault(); setOverCol(col.key); }}
              onDragLeave={() => setOverCol((c) => (c === col.key ? null : c))}
              onDrop={(e) => { e.preventDefault(); drop(col.key); }}
              className={`rounded-2xl border bg-[var(--color-surface)] p-3 min-h-[180px] transition ${
                isOver ? 'border-[var(--color-primary)] bg-[var(--color-primary-light)]/40 ring-2 ring-[var(--color-primary)]/30' : col.ring
              }`}
            >
              <header className="flex items-baseline justify-between gap-2 mb-2 px-1">
                <h3 className={`text-sm font-semibold ${col.accent}`}>{col.label}</h3>
                <span className="text-[11px] text-[var(--color-text-tertiary)] font-mono">{items.length} · {formatCurrency(total)}</span>
              </header>

              <div className="space-y-2">
                {items.length === 0 && (
                  <p className="text-[11px] text-[var(--color-text-tertiary)] px-1 py-6 text-center">Glissez un Business Case ici.</p>
                )}
                {items.map((r) => (
                  <article
                    key={r.id}
                    draggable={busyId !== r.id}
                    onDragStart={() => setDragId(r.id)}
                    onDragEnd={() => { setDragId(null); setOverCol(null); }}
                    onClick={() => onOpen(r.id)}
                    className={`group rounded-xl border border-[var(--color-border)] bg-white dark:bg-neutral-800 p-2.5 cursor-pointer hover:border-[var(--color-primary)] transition ${
                      dragId === r.id ? 'opacity-40' : ''
                    }`}
                  >
                    <div className="flex items-start gap-1.5">
                      <GripVertical className="w-3.5 h-3.5 mt-0.5 text-neutral-300 group-hover:text-[var(--color-primary)] shrink-0 cursor-grab" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{r.libelle}</p>
                        <p className="text-[11px] text-[var(--color-text-tertiary)] truncate">
                          <span className="font-mono">{r.account_code}</span> {getAccountLabel(r.account_code)}
                        </p>
                        <div className="flex items-center justify-between gap-2 mt-1.5">
                          <span className="font-mono text-xs text-[var(--color-text-primary)]">{formatCurrency(r.montant || 0)}</span>
                          {r.van != null && (
                            <span className={`font-mono text-[11px] ${r.van >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              VAN {formatCurrency(r.van)}
                            </span>
                          )}
                        </div>
                      </div>
                      {busyId === r.id && <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--color-primary)] shrink-0" />}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
      <p className="text-xs text-[var(--color-text-tertiary)]">
        La priorité est enregistrée immédiatement en base. Elle n'écrase pas le score composite calculé — les deux se lisent ensemble dans la vue Tableau.
      </p>
    </div>
  );
};

export default CapexPrioriteKanban;
