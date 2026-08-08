/**
 * Soumission d'un objet à la bannette — un formulaire par nature d'objet.
 *
 * L'écran précédent était un tronc commun de trois champs (libellé, montant,
 * journal) pour cinq natures d'objets très différentes, avec des données de
 * démonstration codées en dur : le bordereau soumettait toujours les mêmes
 * quatre lignes, la modification de RIB toujours le fournisseur F-4021.
 *
 * Plus grave que l'ergonomie : la matrice de circuits (wf_resolve_definition)
 * décide sur amount_xof, journal_code, account_class ET flags. Le formulaire
 * n'envoyait que les deux premiers — toute règle fondée sur la classe de compte
 * ou sur un indicateur d'exception était donc INATTEIGNABLE depuis cet écran.
 * Ici, classe de compte et indicateurs sont DÉDUITS des lignes saisies.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { X, Plus, Trash2, AlertTriangle, Info } from 'lucide-react';
import type { DataAdapter } from '@atlas/data';
import type { DBAccount, DBThirdParty, DBJournalEntry } from '../../lib/db';
import { wfSubmit, wfBatchSubmit, mvaErr } from '../../features/validation/mvaService';

const T = {
  cream: '#F2EFE8', surface: '#FFFFFF', petrol: '#1E5A64', orange: '#E8912D',
  green: '#2E9E6B', red: '#E24B4A', ink: '#1C2B2E', sub: '#607377',
  line: '#E6E0D4', softLine: '#EFEAE0',
};
const MONO = "'JetBrains Mono', ui-monospace, monospace";
const money = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

const btn = (bg: string): React.CSSProperties => ({ display: 'inline-flex', alignItems: 'center', gap: 7, background: bg, color: '#fff', border: 'none', borderRadius: 10, padding: '9px 15px', fontSize: 13, fontWeight: 700, cursor: 'pointer' });
const miniBtn = (c: string): React.CSSProperties => ({ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#fff', background: c, border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' });
const field: React.CSSProperties = { width: '100%', boxSizing: 'border-box', border: `1px solid ${T.line}`, borderRadius: 9, padding: '8px 11px', fontSize: 13, outline: 'none', color: T.ink, background: T.surface };
const lbl: React.CSSProperties = { fontSize: 11.5, fontWeight: 600, color: T.sub, display: 'block', marginBottom: 4 };
const thc: React.CSSProperties = { textAlign: 'left', padding: '5px 7px', color: T.sub, fontWeight: 600, borderBottom: `1px solid ${T.line}`, fontSize: 10.5, whiteSpace: 'nowrap' };
const tdc: React.CSSProperties = { padding: '4px 7px', borderBottom: `1px solid ${T.softLine}`, verticalAlign: 'middle' };

const OBJECT_TYPES = [
  { v: 'journal_entry', l: 'Écriture (OD)' },
  { v: 'entry_reversal', l: 'Extourne' },
  { v: 'journal_batch', l: 'Bordereau d\'écritures' },
  { v: 'partner_master', l: 'Modification RIB (anti-fraude)' },
  { v: 'payment_batch', l: 'Lot de paiement' },
] as const;

const PAY_METHODS = [
  { v: 'virement', l: 'Virement' }, { v: 'cheque', l: 'Chèque' },
  { v: 'effet', l: 'Effet de commerce' }, { v: 'especes', l: 'Espèces' },
];

/** Ligne d'écriture saisie dans le formulaire. */
interface EntryLine { id: string; accountCode: string; thirdParty: string; label: string; debit: string; credit: string; }
/** Ligne de bordereau. */
interface BatchDraftLine { id: string; accountCode: string; label: string; amount: string; }
/** Bénéficiaire d'un lot de paiement. */
interface PayLine { id: string; partnerId: string; amount: string; ref: string; }

const uid = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.round(Math.random() * 1e9)}`);
const num = (s: string) => { const n = Number(String(s).replace(/\s/g, '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const emptyLine = (): EntryLine => ({ id: uid(), accountCode: '', thirdParty: '', label: '', debit: '', credit: '' });

/**
 * Indicateurs d'exception déduits des lignes — ce sont eux que la matrice lit
 * dans `flags`. Les nommer ici plutôt que de les laisser au hasard rend le
 * routage prévisible et vérifiable par l'utilisateur avant de soumettre.
 */
function deriveFlags(codes: string[], amounts: number[]): string[] {
  const flags: string[] = [];
  if (codes.some((c) => c.startsWith('47'))) flags.push('compte_attente');
  if (amounts.some((a) => a >= 5_000_000)) flags.push('ligne_montant_eleve');
  if (codes.some((c) => c.startsWith('6') || c.startsWith('7'))) flags.push('impact_resultat');
  if (codes.some((c) => c.startsWith('5'))) flags.push('impact_tresorerie');
  return flags;
}

/** Classe SYSCOHADA dominante : celle qui porte le plus gros montant. */
function dominantClass(lines: { code: string; amount: number }[]): string | undefined {
  const byClass = new Map<string, number>();
  for (const l of lines) {
    const cls = (l.code || '')[0];
    if (!cls) continue;
    byClass.set(cls, (byClass.get(cls) || 0) + Math.abs(l.amount));
  }
  let best: string | undefined; let max = -1;
  for (const [cls, amt] of byClass) if (amt > max) { max = amt; best = cls; }
  return best;
}

export default function SubmitObjectModal({ adapter, onClose, onDone, toast }: {
  adapter: DataAdapter;
  onClose: () => void;
  onDone: () => void;
  toast: { success: (m: string) => void; error: (m: string) => void; warning: (m: string) => void };
}) {
  const [objectType, setObjectType] = useState<string>('journal_entry');
  const [busy, setBusy] = useState(false);

  // ── Référentiels du dossier (plus de saisie libre non contrôlée) ──────────
  const [accounts, setAccounts] = useState<DBAccount[]>([]);
  const [partners, setPartners] = useState<DBThirdParty[]>([]);
  const [journals, setJournals] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [acc, tp, entries] = await Promise.all([
          adapter.getAll<DBAccount>('accounts').catch(() => []),
          adapter.getAll<DBThirdParty>('thirdParties').catch(() => []),
          adapter.getAll<DBJournalEntry>('journalEntries').catch(() => []),
        ]);
        if (cancelled) return;
        setAccounts(acc);
        setPartners(tp.filter((p) => p.isActive !== false));
        // Les journaux réellement utilisés dans le dossier — un code libre
        // pouvait ne correspondre à aucune règle de la matrice.
        const codes = new Set<string>();
        for (const e of entries) if (e.journal) codes.add(String(e.journal));
        setJournals([...codes].sort());
      } catch { /* référentiels indisponibles : les champs restent libres */ }
    })();
    return () => { cancelled = true; };
  }, [adapter]);

  // ── Champs communs ────────────────────────────────────────────────────────
  const [title, setTitle] = useState('');
  const [journal, setJournal] = useState('OD');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');
  const [comment, setComment] = useState('');

  // ── Écriture / Extourne ───────────────────────────────────────────────────
  const [lines, setLines] = useState<EntryLine[]>([emptyLine(), emptyLine()]);
  const patchLine = (id: string, k: keyof EntryLine, v: string) =>
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, [k]: v } : l)));

  const totals = useMemo(() => {
    const d = lines.reduce((s, l) => s + num(l.debit), 0);
    const c = lines.reduce((s, l) => s + num(l.credit), 0);
    return { debit: d, credit: c, ecart: Math.round((d - c) * 100) / 100 };
  }, [lines]);
  const balanced = Math.abs(totals.ecart) < 0.005 && totals.debit > 0;

  // ── Bordereau ─────────────────────────────────────────────────────────────
  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7));
  const [batchLines, setBatchLines] = useState<BatchDraftLine[]>([{ id: uid(), accountCode: '', label: '', amount: '' }]);
  const patchBatch = (id: string, k: keyof BatchDraftLine, v: string) =>
    setBatchLines((prev) => prev.map((l) => (l.id === id ? { ...l, [k]: v } : l)));
  const batchTotal = useMemo(() => batchLines.reduce((s, l) => s + num(l.amount), 0), [batchLines]);
  // Les mêmes règles que le serveur : l'utilisateur voit ce qui sera extrait
  // AVANT de soumettre, au lieu de le découvrir dans le message de retour.
  const batchExceptions = useMemo(
    () => batchLines.filter((l) => l.accountCode.startsWith('47') || num(l.amount) >= 5_000_000),
    [batchLines],
  );

  // ── Modification de RIB ───────────────────────────────────────────────────
  const [partnerId, setPartnerId] = useState('');
  const [newIban, setNewIban] = useState('');
  const [ribReason, setRibReason] = useState('');
  const partner = useMemo(() => partners.find((p) => p.id === partnerId), [partners, partnerId]);
  const oldIban = partner?.banque?.iban
    || (partner?.banque ? [partner.banque.nomBanque, partner.banque.codeAgence, partner.banque.numeroCompte, partner.banque.cleRIB].filter(Boolean).join(' ') : '');
  // Contrôle de forme minimal : 2 lettres de pays, 2 chiffres de clé, puis
  // 11 à 30 caractères alphanumériques. Ne remplace pas la validation MOD-97.
  const ibanLooksValid = /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(newIban.replace(/\s/g, '').toUpperCase());

  // ── Lot de paiement ───────────────────────────────────────────────────────
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [payMethod, setPayMethod] = useState('virement');
  const [payLines, setPayLines] = useState<PayLine[]>([{ id: uid(), partnerId: '', amount: '', ref: '' }]);
  const patchPay = (id: string, k: keyof PayLine, v: string) =>
    setPayLines((prev) => prev.map((l) => (l.id === id ? { ...l, [k]: v } : l)));
  const payTotal = useMemo(() => payLines.reduce((s, l) => s + num(l.amount), 0), [payLines]);

  // ── Critères transmis au moteur de circuit ────────────────────────────────
  const routing = useMemo(() => {
    if (objectType === 'journal_entry' || objectType === 'entry_reversal') {
      const ls = lines.map((l) => ({ code: l.accountCode.trim(), amount: Math.max(num(l.debit), num(l.credit)) }));
      return {
        amount: totals.debit,
        journal,
        accountClass: dominantClass(ls),
        flags: deriveFlags(ls.map((l) => l.code), ls.map((l) => l.amount)),
      };
    }
    if (objectType === 'journal_batch') {
      const ls = batchLines.map((l) => ({ code: l.accountCode.trim(), amount: num(l.amount) }));
      return { amount: batchTotal, journal, accountClass: dominantClass(ls), flags: deriveFlags(ls.map((l) => l.code), ls.map((l) => l.amount)) };
    }
    if (objectType === 'partner_master') return { amount: 0, journal: undefined, accountClass: '4', flags: ['rib_change'] };
    return { amount: payTotal, journal, accountClass: '5', flags: ['impact_tresorerie', ...(payTotal >= 5_000_000 ? ['ligne_montant_eleve'] : [])] };
  }, [objectType, lines, totals.debit, journal, batchLines, batchTotal, payTotal]);

  // ── Validation avant envoi ────────────────────────────────────────────────
  const problem = useMemo((): string | null => {
    if (objectType === 'partner_master') {
      if (!partnerId) return 'Sélectionnez le tiers concerné.';
      if (!ibanLooksValid) return 'Le nouveau RIB / IBAN n\'a pas un format valide.';
      if (newIban.replace(/\s/g, '').toUpperCase() === String(oldIban).replace(/\s/g, '').toUpperCase()) return 'Le nouveau RIB est identique à l\'ancien.';
      if (!ribReason.trim()) return 'Indiquez le motif du changement.';
      return null;
    }
    if (objectType === 'payment_batch') {
      if (payLines.some((l) => !l.partnerId)) return 'Chaque ligne doit désigner un bénéficiaire.';
      if (payLines.some((l) => num(l.amount) <= 0)) return 'Chaque montant doit être strictement positif.';
      if (payTotal <= 0) return 'Le total du lot doit être positif.';
      return null;
    }
    if (objectType === 'journal_batch') {
      if (batchLines.some((l) => !l.accountCode.trim())) return 'Chaque ligne doit porter un compte.';
      if (batchLines.some((l) => num(l.amount) <= 0)) return 'Chaque montant doit être strictement positif.';
      return null;
    }
    if (!title.trim()) return 'Le libellé est requis.';
    if (lines.some((l) => !l.accountCode.trim())) return 'Chaque ligne doit porter un compte.';
    if (lines.some((l) => num(l.debit) < 0 || num(l.credit) < 0)) return 'Les montants ne peuvent pas être négatifs.';
    if (lines.some((l) => num(l.debit) > 0 && num(l.credit) > 0)) return 'Une ligne porte un débit OU un crédit, pas les deux.';
    if (totals.debit <= 0) return 'Saisissez au moins un montant.';
    if (!balanced) return `Écriture déséquilibrée : écart de ${money(totals.ecart)} FCFA.`;
    return null;
  }, [objectType, title, lines, totals, balanced, partnerId, ibanLooksValid, newIban, oldIban, ribReason, payLines, payTotal, batchLines]);

  const submit = useCallback(async () => {
    if (problem) { toast.warning(problem); return; }
    setBusy(true);
    try {
      if (objectType === 'journal_batch') {
        const res = await wfBatchSubmit(adapter, {
          journal_code: journal, period, source: 'manuel',
          lines: batchLines.map((l, i) => ({
            line_ref: `L${i + 1}`, account_code: l.accountCode.trim(),
            label: l.label.trim() || `Ligne ${i + 1}`, amount_xof: num(l.amount),
          })),
        });
        toast.success(`Bordereau soumis · ${res.included_count} incluse(s), ${res.exception_count} exception(s) extraite(s)`);
        onDone(); return;
      }

      if (objectType === 'partner_master') {
        const objectId = `partner-rib-${partnerId}-${Date.now()}`;
        const iban = newIban.replace(/\s/g, '').toUpperCase();
        const res = await wfSubmit(adapter, {
          objectType, objectId, priority,
          preview: {
            title: `Changement de RIB — ${partner?.name || partnerId}`,
            partner_id: partner?.code || partnerId, partner_name: partner?.name,
            old_rib: oldIban || '—', new_rib: iban, reason: ribReason.trim(),
            flags: ['rib_change'], ref: objectId.slice(-8).toUpperCase(), comment: comment.trim() || undefined,
          },
          payload: { flags: ['rib_change'], account_class: '4', partner_id: partner?.code || partnerId, new_rib: iban },
        });
        toast.success(`RIB soumis · circuit renforcé « ${res.definition} » (${res.stages.length} étape(s))`);
        onDone(); return;
      }

      if (objectType === 'payment_batch') {
        const objectId = `payment-batch-${Date.now()}`;
        const beneficiaries = payLines.map((l) => {
          const p = partners.find((x) => x.id === l.partnerId);
          return { partner_id: p?.code || l.partnerId, partner_name: p?.name, amount_xof: num(l.amount), ref: l.ref.trim() || undefined };
        });
        const res = await wfSubmit(adapter, {
          objectType, objectId, priority,
          preview: {
            title: title.trim() || `Lot de paiement du ${payDate}`,
            amount_xof: payTotal, ref: objectId.slice(-8).toUpperCase(),
            detail: `${beneficiaries.length} bénéficiaire(s) · ${payMethod} · exécution ${payDate}`,
            beneficiaries, comment: comment.trim() || undefined,
          },
          payload: {
            amount_xof: payTotal, journal_code: journal, account_class: '5',
            flags: routing.flags, payment_method: payMethod, execution_date: payDate,
            beneficiary_count: beneficiaries.length,
          },
        });
        toast.success(`Lot soumis · circuit « ${res.definition} » (${res.stages.length} étape(s))`);
        onDone(); return;
      }

      // Écriture / Extourne
      const objectId = `manual-${objectType}-${Date.now()}`;
      const previewLines = lines.map((l) => ({
        account_code: l.accountCode.trim(),
        third_party: l.thirdParty || undefined,
        label: l.label.trim() || undefined,
        debit: num(l.debit) || undefined,
        credit: num(l.credit) || undefined,
      }));
      const res = await wfSubmit(adapter, {
        objectType, objectId, priority,
        preview: {
          title: title.trim(), amount_xof: totals.debit, ref: objectId.slice(-8).toUpperCase(),
          detail: `${OBJECT_TYPES.find((o) => o.v === objectType)?.l} · journal ${journal} · ${date}`,
          date, journal_code: journal, lines: previewLines, comment: comment.trim() || undefined,
        },
        payload: {
          amount_xof: totals.debit, journal_code: journal,
          account_class: routing.accountClass, flags: routing.flags,
          date, line_count: previewLines.length,
        },
      });
      toast.success(`Soumis · circuit « ${res.definition} » (${res.stages.length} étape(s))`);
      onDone();
    } catch (e: unknown) {
      toast.error(mvaErr((e as Error)?.message));
    } finally { setBusy(false); }
  }, [problem, objectType, adapter, journal, period, batchLines, partnerId, newIban, partner, oldIban, ribReason,
      priority, comment, payLines, partners, payTotal, payDate, payMethod, title, lines, totals.debit, date, routing, toast, onDone]);

  const isEntry = objectType === 'journal_entry' || objectType === 'entry_reversal';

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(28,43,46,.45)', display: 'grid', placeItems: 'center', zIndex: 60, padding: 20 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: T.surface, borderRadius: 16, width: 'min(760px, 100%)', maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>

        <div style={{ padding: '15px 18px', borderBottom: `1px solid ${T.line}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 15.5, color: T.petrol, fontWeight: 800 }}>Soumettre un objet à validation</h3>
          <button onClick={onClose} aria-label="Fermer" style={{ ...miniBtn(T.sub), padding: 6 }}><X size={16} /></button>
        </div>

        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <label style={{ flex: 1, minWidth: 220 }}><span style={lbl}>Type d'objet</span>
              <select value={objectType} onChange={(e) => setObjectType(e.target.value)} style={field}>
                {OBJECT_TYPES.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            </label>
            <label style={{ width: 150 }}><span style={lbl}>Priorité</span>
              <select value={priority} onChange={(e) => setPriority(e.target.value as 'normal' | 'urgent')} style={field}>
                <option value="normal">Normale</option>
                <option value="urgent">Urgente</option>
              </select>
            </label>
          </div>

          {/* ── Écriture / Extourne ─────────────────────────────────────── */}
          {isEntry && (
            <>
              <label><span style={lbl}>Libellé</span>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. OD régularisation charges" style={field} />
              </label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <label style={{ width: 160 }}><span style={lbl}>Date</span>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={field} />
                </label>
                <label style={{ width: 160 }}><span style={lbl}>Journal</span>
                  {journals.length > 0
                    ? <select value={journal} onChange={(e) => setJournal(e.target.value)} style={field}>
                        {!journals.includes(journal) && <option value={journal}>{journal}</option>}
                        {journals.map((j) => <option key={j} value={j}>{j}</option>)}
                      </select>
                    : <input value={journal} onChange={(e) => setJournal(e.target.value.toUpperCase())} style={field} />}
                </label>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <span style={{ ...lbl, marginBottom: 0 }}>Lignes</span>
                  <button onClick={() => setLines((p) => [...p, emptyLine()])} style={{ ...miniBtn(T.petrol), padding: '4px 9px' }}><Plus size={12} /> Ligne</button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, minWidth: 620 }}>
                    <thead><tr>
                      <th style={thc}>Compte</th><th style={thc}>Tiers</th><th style={thc}>Libellé</th>
                      <th style={{ ...thc, textAlign: 'right' }}>Débit</th><th style={{ ...thc, textAlign: 'right' }}>Crédit</th><th style={thc} />
                    </tr></thead>
                    <tbody>
                      {lines.map((l) => (
                        <tr key={l.id}>
                          <td style={{ ...tdc, width: 130 }}>
                            <input list="wf-accounts" value={l.accountCode} onChange={(e) => patchLine(l.id, 'accountCode', e.target.value)}
                              placeholder="601000" style={{ ...field, fontFamily: MONO, padding: '6px 8px' }} />
                          </td>
                          <td style={{ ...tdc, width: 150 }}>
                            <select value={l.thirdParty} onChange={(e) => patchLine(l.id, 'thirdParty', e.target.value)} style={{ ...field, padding: '6px 8px' }}>
                              <option value="">—</option>
                              {partners.map((p) => <option key={p.id} value={p.code}>{p.code} · {p.name}</option>)}
                            </select>
                          </td>
                          <td style={tdc}>
                            <input value={l.label} onChange={(e) => patchLine(l.id, 'label', e.target.value)} style={{ ...field, padding: '6px 8px' }} />
                          </td>
                          <td style={{ ...tdc, width: 110 }}>
                            <input value={l.debit} onChange={(e) => patchLine(l.id, 'debit', e.target.value)} inputMode="decimal"
                              style={{ ...field, fontFamily: MONO, padding: '6px 8px', textAlign: 'right' }} />
                          </td>
                          <td style={{ ...tdc, width: 110 }}>
                            <input value={l.credit} onChange={(e) => patchLine(l.id, 'credit', e.target.value)} inputMode="decimal"
                              style={{ ...field, fontFamily: MONO, padding: '6px 8px', textAlign: 'right' }} />
                          </td>
                          <td style={{ ...tdc, width: 34 }}>
                            <button onClick={() => setLines((p) => (p.length > 1 ? p.filter((x) => x.id !== l.id) : p))}
                              aria-label="Supprimer la ligne" style={{ background: 'none', border: 'none', color: T.red, cursor: 'pointer', padding: 4 }}>
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={3} style={{ ...tdc, textAlign: 'right', fontWeight: 700, color: T.sub }}>Totaux</td>
                        <td style={{ ...tdc, textAlign: 'right', fontFamily: MONO, fontWeight: 700 }}>{money(totals.debit)}</td>
                        <td style={{ ...tdc, textAlign: 'right', fontFamily: MONO, fontWeight: 700 }}>{money(totals.credit)}</td>
                        <td style={tdc} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <datalist id="wf-accounts">
                  {accounts.slice(0, 800).map((a) => <option key={a.id} value={a.code}>{a.name}</option>)}
                </datalist>
                <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700, color: balanced ? T.green : T.red }}>
                  {balanced ? 'Équilibrée' : `Écart débit − crédit : ${money(totals.ecart)} FCFA`}
                </div>
              </div>
            </>
          )}

          {/* ── Bordereau ───────────────────────────────────────────────── */}
          {objectType === 'journal_batch' && (
            <>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <label style={{ width: 160 }}><span style={lbl}>Journal</span>
                  {journals.length > 0
                    ? <select value={journal} onChange={(e) => setJournal(e.target.value)} style={field}>
                        {!journals.includes(journal) && <option value={journal}>{journal}</option>}
                        {journals.map((j) => <option key={j} value={j}>{j}</option>)}
                      </select>
                    : <input value={journal} onChange={(e) => setJournal(e.target.value.toUpperCase())} style={field} />}
                </label>
                <label style={{ width: 160 }}><span style={lbl}>Période</span>
                  <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} style={field} />
                </label>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <span style={{ ...lbl, marginBottom: 0 }}>Lignes du bordereau</span>
                  <button onClick={() => setBatchLines((p) => [...p, { id: uid(), accountCode: '', label: '', amount: '' }])}
                    style={{ ...miniBtn(T.petrol), padding: '4px 9px' }}><Plus size={12} /> Ligne</button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, minWidth: 520 }}>
                    <thead><tr><th style={thc}>Compte</th><th style={thc}>Libellé</th><th style={{ ...thc, textAlign: 'right' }}>Montant</th><th style={thc} /></tr></thead>
                    <tbody>
                      {batchLines.map((l) => {
                        const isException = l.accountCode.startsWith('47') || num(l.amount) >= 5_000_000;
                        return (
                          <tr key={l.id} style={isException ? { background: 'rgba(232,145,45,.07)' } : undefined}>
                            <td style={{ ...tdc, width: 140 }}>
                              <input list="wf-accounts-batch" value={l.accountCode} onChange={(e) => patchBatch(l.id, 'accountCode', e.target.value)}
                                placeholder="601000" style={{ ...field, fontFamily: MONO, padding: '6px 8px' }} />
                            </td>
                            <td style={tdc}><input value={l.label} onChange={(e) => patchBatch(l.id, 'label', e.target.value)} style={{ ...field, padding: '6px 8px' }} /></td>
                            <td style={{ ...tdc, width: 130 }}>
                              <input value={l.amount} onChange={(e) => patchBatch(l.id, 'amount', e.target.value)} inputMode="decimal"
                                style={{ ...field, fontFamily: MONO, padding: '6px 8px', textAlign: 'right' }} />
                            </td>
                            <td style={{ ...tdc, width: 34 }}>
                              <button onClick={() => setBatchLines((p) => (p.length > 1 ? p.filter((x) => x.id !== l.id) : p))}
                                aria-label="Supprimer la ligne" style={{ background: 'none', border: 'none', color: T.red, cursor: 'pointer', padding: 4 }}><Trash2 size={13} /></button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot><tr>
                      <td colSpan={2} style={{ ...tdc, textAlign: 'right', fontWeight: 700, color: T.sub }}>Total</td>
                      <td style={{ ...tdc, textAlign: 'right', fontFamily: MONO, fontWeight: 700 }}>{money(batchTotal)}</td>
                      <td style={tdc} />
                    </tr></tfoot>
                  </table>
                </div>
                <datalist id="wf-accounts-batch">
                  {accounts.slice(0, 800).map((a) => <option key={a.id} value={a.code}>{a.name}</option>)}
                </datalist>
                {batchExceptions.length > 0 && (
                  <div style={{ marginTop: 7, fontSize: 11.5, color: T.orange, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                    <AlertTriangle size={13} style={{ flex: 'none', marginTop: 1 }} />
                    <span>{batchExceptions.length} ligne(s) seront extraites en dossiers individuels (compte 47x ou montant ≥ 5 M).</span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── Modification de RIB ─────────────────────────────────────── */}
          {objectType === 'partner_master' && (
            <>
              <label><span style={lbl}>Tiers concerné</span>
                <select value={partnerId} onChange={(e) => setPartnerId(e.target.value)} style={field}>
                  <option value="">— Sélectionner —</option>
                  {partners.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
                </select>
              </label>
              <label><span style={lbl}>RIB actuel</span>
                <input value={oldIban || (partnerId ? 'Aucun RIB enregistré' : '')} readOnly disabled
                  style={{ ...field, fontFamily: MONO, background: T.cream, color: T.sub }} />
              </label>
              <label><span style={lbl}>Nouveau RIB / IBAN</span>
                <input value={newIban} onChange={(e) => setNewIban(e.target.value)} placeholder="CI93 SGCI 0001 2345 6789"
                  style={{ ...field, fontFamily: MONO, borderColor: newIban && !ibanLooksValid ? T.red : T.line }} />
                {newIban && !ibanLooksValid && <span style={{ fontSize: 11, color: T.red }}>Format attendu : 2 lettres de pays, 2 chiffres de clé, puis 11 à 30 caractères.</span>}
              </label>
              <label><span style={lbl}>Motif du changement</span>
                <input value={ribReason} onChange={(e) => setRibReason(e.target.value)} placeholder="Ex. changement de domiciliation bancaire" style={field} />
              </label>
            </>
          )}

          {/* ── Lot de paiement ─────────────────────────────────────────── */}
          {objectType === 'payment_batch' && (
            <>
              <label><span style={lbl}>Libellé du lot</span>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. Règlement fournisseurs avril" style={field} />
              </label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <label style={{ width: 170 }}><span style={lbl}>Date d'exécution</span>
                  <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} style={field} />
                </label>
                <label style={{ width: 180 }}><span style={lbl}>Moyen de paiement</span>
                  <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} style={field}>
                    {PAY_METHODS.map((m) => <option key={m.v} value={m.v}>{m.l}</option>)}
                  </select>
                </label>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <span style={{ ...lbl, marginBottom: 0 }}>Bénéficiaires</span>
                  <button onClick={() => setPayLines((p) => [...p, { id: uid(), partnerId: '', amount: '', ref: '' }])}
                    style={{ ...miniBtn(T.petrol), padding: '4px 9px' }}><Plus size={12} /> Bénéficiaire</button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, minWidth: 520 }}>
                    <thead><tr><th style={thc}>Bénéficiaire</th><th style={thc}>Référence</th><th style={{ ...thc, textAlign: 'right' }}>Montant</th><th style={thc} /></tr></thead>
                    <tbody>
                      {payLines.map((l) => (
                        <tr key={l.id}>
                          <td style={tdc}>
                            <select value={l.partnerId} onChange={(e) => patchPay(l.id, 'partnerId', e.target.value)} style={{ ...field, padding: '6px 8px' }}>
                              <option value="">— Sélectionner —</option>
                              {partners.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
                            </select>
                          </td>
                          <td style={{ ...tdc, width: 150 }}>
                            <input value={l.ref} onChange={(e) => patchPay(l.id, 'ref', e.target.value)} placeholder="N° facture" style={{ ...field, padding: '6px 8px' }} />
                          </td>
                          <td style={{ ...tdc, width: 130 }}>
                            <input value={l.amount} onChange={(e) => patchPay(l.id, 'amount', e.target.value)} inputMode="decimal"
                              style={{ ...field, fontFamily: MONO, padding: '6px 8px', textAlign: 'right' }} />
                          </td>
                          <td style={{ ...tdc, width: 34 }}>
                            <button onClick={() => setPayLines((p) => (p.length > 1 ? p.filter((x) => x.id !== l.id) : p))}
                              aria-label="Supprimer le bénéficiaire" style={{ background: 'none', border: 'none', color: T.red, cursor: 'pointer', padding: 4 }}><Trash2 size={13} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot><tr>
                      <td colSpan={2} style={{ ...tdc, textAlign: 'right', fontWeight: 700, color: T.sub }}>Total du lot</td>
                      <td style={{ ...tdc, textAlign: 'right', fontFamily: MONO, fontWeight: 700 }}>{money(payTotal)}</td>
                      <td style={tdc} />
                    </tr></tfoot>
                  </table>
                </div>
              </div>
            </>
          )}

          <label><span style={lbl}>Commentaire au valideur (facultatif)</span>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2}
              placeholder="Contexte, pièce de référence, urgence particulière…" style={{ ...field, resize: 'vertical' }} />
          </label>

          {/* Ce que le moteur recevra — le circuit se résout sur ces critères,
              autant les montrer avant que l'objet soit figé par hash. */}
          <div style={{ fontSize: 11.5, color: T.sub, background: T.cream, borderRadius: 9, padding: '9px 11px', display: 'flex', gap: 7, alignItems: 'flex-start' }}>
            <Info size={13} style={{ flex: 'none', marginTop: 1 }} />
            <span>
              <b>Critères transmis au moteur de circuit</b> — montant <span style={{ fontFamily: MONO }}>{money(routing.amount)}</span>
              {routing.journal ? <> · journal <span style={{ fontFamily: MONO }}>{routing.journal}</span></> : null}
              {routing.accountClass ? <> · classe <span style={{ fontFamily: MONO }}>{routing.accountClass}</span></> : null}
              {routing.flags.length > 0 ? <> · indicateurs <span style={{ fontFamily: MONO }}>{routing.flags.join(', ')}</span></> : null}
              <br />Le circuit est résolu par la matrice du tenant. L'objet est figé par hash à la soumission.
            </span>
          </div>

          {problem && (
            <div style={{ fontSize: 12, color: T.red, display: 'flex', gap: 6, alignItems: 'center' }}>
              <AlertTriangle size={13} style={{ flex: 'none' }} />{problem}
            </div>
          )}
        </div>

        <div style={{ padding: '13px 18px', borderTop: `1px solid ${T.line}`, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{ ...miniBtn(T.sub), background: 'none', color: T.sub, border: `1px solid ${T.line}` }}>Annuler</button>
          <button onClick={submit} disabled={busy || !!problem} style={{ ...btn(T.petrol), opacity: busy || problem ? .5 : 1, cursor: busy || problem ? 'not-allowed' : 'pointer' }}>
            {busy ? 'Soumission…' : 'Soumettre'}
          </button>
        </div>
      </div>
    </div>
  );
}
