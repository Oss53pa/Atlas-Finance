/**
 * JournalDetailPage — détail d'un journal (AC, VE, BQ, CA, OD, IPE, AN…) avec le
 * composant Filtre & Recherche (brief v1.0 · 11/06/2026, Phase 1).
 *
 * Disposition : en-tête (titre + devise + recherche rapide Alt+S), zone résultats à
 * gauche (chips de filtres actifs, totaux dédupliqués, tableau avec colonne Lettrage),
 * barre latérale de filtres à DROITE repliable (FilterSidebar, persistée par écran).
 *
 * Route : /accounting/journals/:journalCode (?compte=521 pour un sous-journal).
 * Les sous-journaux sont filtrables via le filtre « Compte (début) ».
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Search, Download, CheckCircle2, Circle, CheckCircle } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { formatCurrency } from '@/utils/formatters';
import FilterSidebar, {
  type ComptaFilters,
  type ComptaRow,
  DEFAULT_COMPTA_FILTERS,
  applyComptaFilters,
  buildFilterChips,
  removeFilter,
  loadPersistedFilters,
  FilterChipPill,
} from '../../components/accounting/FilterSidebar';

const JOURNAL_LABELS: Record<string, string> = {
  AC: 'Achats', VE: 'Ventes', BQ: 'Banque', CA: 'Caisse',
  OD: 'Opérations Diverses', AN: 'À-Nouveaux', RAN: 'Report À-Nouveau',
  IPE: 'Instruments de paiement électronique', PAIE: 'Paie',
};

const PAGE_SIZE = 200;

const JournalDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { adapter } = useData();
  const { journalCode = 'TOUS' } = useParams<{ journalCode: string }>();
  const [searchParams] = useSearchParams();
  const compteParam = searchParams.get('compte') || '';

  const screenKey = 'journal-detail';
  const [rows, setRows] = useState<ComptaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const searchRef = useRef<HTMLInputElement>(null);

  // Filtres : persistés par écran, MAIS le journal/compte de la route priment à l'arrivée.
  const [filters, setFilters] = useState<ComptaFilters>(() => {
    const persisted = loadPersistedFilters(screenKey, DEFAULT_COMPTA_FILTERS);
    return {
      ...persisted,
      journals: journalCode !== 'TOUS' ? [journalCode] : persisted.journals,
      accountPrefix: compteParam || persisted.accountPrefix,
    };
  });

  // Navigation interne vers un AUTRE journal → resynchroniser le filtre journal.
  useEffect(() => {
    setFilters((f) => ({
      ...f,
      journals: journalCode !== 'TOUS' ? [journalCode] : f.journals,
      accountPrefix: compteParam || f.accountPrefix,
    }));
    setVisible(PAGE_SIZE);
  }, [journalCode, compteParam]);

  // ── Chargement : écritures aplaties en lignes filtrables ───────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const entries = await adapter.getAll<any>('journalEntries');
        if (cancelled) return;
        const flat: ComptaRow[] = [];
        for (const e of entries) {
          if (e.status === 'draft') {
            // les brouillons restent accessibles via le filtre Statut
          }
          const piece = String(e.entryNumber || e.reference || e.id || '');
          for (let i = 0; i < (e.lines || []).length; i++) {
            const l = e.lines[i];
            flat.push({
              id: `${e.id}-${i}`,
              piece,
              date: String(e.date || ''),
              journal: String(e.journal || ''),
              accountCode: String(l.accountCode || ''),
              accountName: String(l.accountName || ''),
              libelle: String(l.label || e.label || ''),
              debit: Number(l.debit) || 0,
              credit: Number(l.credit) || 0,
              lettrage: l.lettrageCode || l.lettrage || '',
              tiersCode: l.thirdPartyCode || '',
              tiersName: l.thirdPartyName || '',
              statut: String(e.status || 'validated'),
            });
          }
        }
        flat.sort((a, b) => b.date.localeCompare(a.date) || a.piece.localeCompare(b.piece));
        setRows(flat);

        // Période par défaut = exercice détecté (année la plus fréquente), si vide.
        setFilters((f) => {
          if (f.dateFrom && f.dateTo) return f;
          const years: Record<string, number> = {};
          for (const r of flat) { const y = r.date.slice(0, 4); if (y) years[y] = (years[y] || 0) + 1; }
          const year = Object.entries(years).sort((a, b) => b[1] - a[1])[0]?.[0] || String(new Date().getFullYear());
          return { ...f, dateFrom: f.dateFrom || `${year}-01-01`, dateTo: f.dateTo || `${year}-12-31` };
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [adapter]);

  // Alt+S → focus recherche (brief §10).
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 's') { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  // ── Filtrage + agrégats (toujours dédupliqués, recalculés à chaque filtre) ──
  const filtered = useMemo(() => applyComptaFilters(rows, filters), [rows, filters]);
  const totals = useMemo(() => {
    let d = 0, c = 0;
    for (const r of filtered) { d += r.debit; c += r.credit; }
    return { debit: d, credit: c, balanced: Math.abs(d - c) < 1 };
  }, [filtered]);

  const journalOptions = useMemo(() => {
    const codes = Array.from(new Set(rows.map((r) => r.journal).filter(Boolean))).sort();
    return codes.map((code) => ({ code, label: JOURNAL_LABELS[code] || code }));
  }, [rows]);

  const exercice = useMemo(() => {
    const y = (filters.dateFrom || '').slice(0, 4) || String(new Date().getFullYear());
    return { start: `${y}-01-01`, end: `${y}-12-31` };
  }, [filters.dateFrom]);

  const chips = buildFilterChips(filters);
  const title = journalCode === 'TOUS'
    ? 'Tous les journaux'
    : `Journal ${journalCode} – ${JOURNAL_LABELS[journalCode] || journalCode}`;

  const dateFr = (iso: string) => (iso ? iso.split('-').reverse().join('/') : '');

  // Export CSV des lignes filtrées (séparateur ; — Excel FR).
  const exportCsv = () => {
    const header = 'Piece;Date;Compte;Intitule;Libelle;Debit;Credit;Lettrage';
    const lines = filtered.map((r) =>
      [r.piece, dateFr(r.date), r.accountCode, r.accountName, r.libelle, r.debit, r.credit, r.lettrage || '']
        .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';'));
    const blob = new Blob(['﻿' + [header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `journal-${journalCode}-${filters.dateFrom}-${filters.dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="h-full flex flex-col">
      {/* En-tête */}
      <div className="flex flex-wrap items-center gap-3 px-6 py-4 border-b border-[var(--color-border)] bg-white">
        <button
          type="button"
          onClick={() => navigate('/accounting/journals')}
          className="p-2 rounded-lg hover:bg-[var(--color-surface-hover)]"
          aria-label="Retour aux journaux"
        >
          <ArrowLeft className="w-5 h-5 text-[var(--color-text-secondary)]" />
        </button>
        <h1 className="text-lg font-bold text-[var(--color-text-primary)]">{title}</h1>
        <span className="px-2 py-0.5 rounded-md bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-semibold">FCFA</span>
        <div className="relative flex-1 min-w-[220px] max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
          <input
            ref={searchRef}
            type="text"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder="Rechercher : pièce, compte, libellé, montant…  (Alt+S)"
            className="w-full pl-9 pr-3 py-2 border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40"
          />
        </div>
        <button
          type="button"
          onClick={exportCsv}
          className="flex items-center gap-2 px-3 py-2 border border-[var(--color-border)] rounded-lg text-sm hover:bg-[var(--color-surface-hover)]"
        >
          <Download className="w-4 h-4" /> Exporter
        </button>
      </div>

      {/* Corps : résultats à gauche + barre latérale filtres à droite */}
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 min-w-0 p-6 overflow-y-auto">
          {/* Chips des filtres actifs */}
          <div className="flex flex-wrap gap-2 mb-4">
            {chips.map((chip) => (
              <FilterChipPill
                key={chip.key}
                chip={chip}
                onRemove={chip.removable ? () => setFilters(removeFilter(filters, chip.key)) : undefined}
              />
            ))}
          </div>

          {/* Totaux — une seule série de cartes, recalculée à chaque filtre */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4">
              <p className="text-xs text-[var(--color-text-secondary)] mb-1">Total débit</p>
              <p className="text-xl font-bold font-mono text-red-700">{formatCurrency(totals.debit)}</p>
            </div>
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4">
              <p className="text-xs text-[var(--color-text-secondary)] mb-1">Total crédit</p>
              <p className="text-xl font-bold font-mono text-green-700">{formatCurrency(totals.credit)}</p>
            </div>
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4">
              <p className="text-xs text-[var(--color-text-secondary)] mb-1">Équilibre</p>
              {totals.balanced ? (
                <p className="text-xl font-bold text-green-700 flex items-center gap-1.5"><CheckCircle className="w-5 h-5" /> Équilibré</p>
              ) : (
                <p className="text-xl font-bold text-red-700">Écart {formatCurrency(Math.abs(totals.debit - totals.credit))}</p>
              )}
            </div>
          </div>

          {/* Tableau */}
          {loading ? (
            <div className="py-16 text-center text-[var(--color-text-tertiary)]">Chargement des écritures…</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-[var(--color-text-secondary)] mb-2">Aucune écriture ne correspond à ces critères</p>
              <button
                type="button"
                className="text-sm text-[var(--color-primary)] hover:underline"
                onClick={() => setFilters({ ...DEFAULT_COMPTA_FILTERS, dateFrom: filters.dateFrom, dateTo: filters.dateTo, journals: journalCode !== 'TOUS' ? [journalCode] : [] })}
              >
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            /* Scroll PROPRE à la table (pas le scroll de page) + en-tête FIGÉ (sticky). */
            <div className="bg-white border border-[var(--color-border)] rounded-xl overflow-auto max-h-[68vh]">
              <table className="w-full text-sm">
                <thead className="bg-[var(--color-surface-hover)] sticky top-0 z-10 shadow-[0_1px_0_var(--color-border)]">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-[var(--color-text-secondary)]">Pièce</th>
                    <th className="text-left px-4 py-2.5 font-medium text-[var(--color-text-secondary)]">Date</th>
                    <th className="text-left px-4 py-2.5 font-medium text-[var(--color-text-secondary)]">Compte</th>
                    <th className="text-left px-4 py-2.5 font-medium text-[var(--color-text-secondary)]">Libellé</th>
                    <th className="text-right px-4 py-2.5 font-medium text-[var(--color-text-secondary)]">Débit</th>
                    <th className="text-right px-4 py-2.5 font-medium text-[var(--color-text-secondary)]">Crédit</th>
                    <th className="text-center px-3 py-2.5 font-medium text-[var(--color-text-secondary)]" title="Lettrage">Let.</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, visible).map((r) => (
                    <tr key={r.id} className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]">
                      <td className="px-4 py-2 font-mono text-xs whitespace-nowrap">{r.piece}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{dateFr(r.date)}</td>
                      <td className="px-4 py-2">
                        <span className="font-mono">{r.accountCode}</span>
                        {r.accountName && (
                          <span className="block text-[11px] uppercase text-[var(--color-text-tertiary)] truncate max-w-[180px]">{r.accountName}</span>
                        )}
                      </td>
                      <td className="px-4 py-2 max-w-[360px] truncate" title={r.libelle}>{r.libelle}</td>
                      <td className="px-4 py-2 text-right font-mono text-red-700">{r.debit > 0 ? formatCurrency(r.debit) : '—'}</td>
                      <td className="px-4 py-2 text-right font-mono text-green-700">{r.credit > 0 ? formatCurrency(r.credit) : '—'}</td>
                      <td className="px-3 py-2 text-center">
                        {r.lettrage ? (
                          <CheckCircle2 className="w-4 h-4 inline text-green-600" aria-label={`Lettré (${r.lettrage})`} />
                        ) : (
                          <Circle className="w-4 h-4 inline text-[var(--color-text-tertiary)]" aria-label="Non lettré" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length > visible && (
                <div className="p-3 text-center border-t border-[var(--color-border)]">
                  <button
                    type="button"
                    onClick={() => setVisible((v) => v + PAGE_SIZE)}
                    className="text-sm text-[var(--color-primary)] hover:underline"
                  >
                    Afficher plus ({filtered.length - visible} lignes restantes)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Barre latérale filtres (repliable, persistée) */}
        <FilterSidebar
          screenKey={screenKey}
          filters={filters}
          onChange={setFilters}
          journalOptions={journalOptions}
          exercice={exercice}
        />
      </div>
    </div>
  );
};

export default JournalDetailPage;
