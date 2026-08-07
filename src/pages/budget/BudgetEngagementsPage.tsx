/**
 * BudgetEngagementsPage — /budget/engagements (refonte OPEX/CAPEX, Lot 2).
 *
 * Registre pivot des engagements (externes ingérés + saisis manuellement). C'est
 * la table lue par le moteur d'équation budgétaire. Permet la saisie manuelle
 * (contrats, marchés), la génération d'un engagement récurrent, le dégagement
 * (libération du reliquat) et l'annulation. Le réalisé bascule automatiquement
 * via les rapprochements (trigger DB).
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency } from '../../utils/formatters';
import { getAccountLabel } from '../../utils/accountLabels';
import {
  listEngagements, createManualEngagement, createRecurringEngagement,
  degageEngagement, annulerEngagement, engagementRestant,
  type BudgetEngagement, type EngagementStatut,
} from '../../features/budget/services/engagementService';
import { listOrgTree, type SectionOrgNode } from '../../features/budget/services/sectionGovernanceService';
import {
  getMailleDisponible, decideCheck, getControlPolicy, natureOfAccount,
  type MailleDisponible, type CheckDecision,
} from '../../features/budget/services/budgetCheckService';
import BudgetEquationBar from '../../components/budget/BudgetEquationBar';
import { getDefaultAnnee } from '../../features/budget/services/budgetService';
import { runYearEndCarryover, carryoverSummary, type CarryoverPolicy } from '../../features/budget/services/yearEndService';
import {
  Plus, Loader2, Unlock, XCircle, FileSignature, Repeat, Building2, CalendarX,
} from 'lucide-react';

const STATUT_STYLE: Record<EngagementStatut, string> = {
  ouvert: 'bg-[var(--color-primary-light)] text-[var(--color-primary)] dark:text-[var(--color-primary)]',
  partiellement_facture: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  solde: 'bg-neutral-100 text-[var(--color-text-secondary)] dark:bg-neutral-700 dark:text-neutral-300',
  annule: 'bg-neutral-100 text-[var(--color-text-tertiary)] line-through dark:bg-neutral-800',
  surfacture: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
};
const STATUT_LABEL_KEY: Record<EngagementStatut, string> = {
  ouvert: 'budgetCommitments.statusOpen', partiellement_facture: 'budgetCommitments.statusPartial',
  solde: 'budgetCommitments.statusSettled', annule: 'budgetCommitments.statusCancelled',
  surfacture: 'budgetCommitments.statusOverInvoiced',
};

const emptyForm = {
  accountCode: '', sectionId: '', periode: '', montant: '', fournisseur: '', reference: '',
  motif: '', recurrent: false, months: '12',
};

const INP = 'w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-light)]';

const BudgetEngagementsPage: React.FC = () => {
  const { adapter } = useData();
  const { t, language } = useLanguage();
  const numberLocale = language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'fr-FR';
  const [rows, setRows] = useState<BudgetEngagement[]>([]);
  const [sections, setSections] = useState<SectionOrgNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ maille: MailleDisponible; decision: CheckDecision; seuil: 'consommation_90' | 'depassement' | null } | null>(null);
  const [showClose, setShowClose] = useState(false);
  const [closing, setClosing] = useState(false);

  const runCarryover = useCallback(async (policy: CarryoverPolicy) => {
    setClosing(true); setError(null); setNotice(null);
    try {
      const annee = await getDefaultAnnee(adapter);
      const r = await runYearEndCarryover(adapter, annee, policy);
      setNotice(t('budgetCommitments.carryoverDone', {
        year: String(annee),
        discharged: String(r.discharged),
        carried: policy === 'report' ? t('budgetCommitments.carriedSuffix', { count: String(r.recreated) }) : '',
        remainder: r.totalReliquat.toLocaleString(numberLocale),
      }));
      setShowClose(false); setRefreshKey((k) => k + 1);
    } catch (e: any) { setError(e?.message || t('budgetCommitments.carryoverFailed')); } finally { setClosing(false); }
  }, [adapter, t, numberLocale]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const [eng, tree] = await Promise.all([listEngagements(adapter), listOrgTree(adapter)]);
        if (cancelled) return;
        setRows(eng); setSections(tree);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Erreur de chargement');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [adapter, refreshKey]);

  // Aperçu live du disponible de la maille en cours de saisie (lecture seule, non journalisé).
  useEffect(() => {
    if (!showForm || !form.accountCode.trim() || !form.periode) { setPreview(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const annee = form.periode.slice(0, 4);
        const period = Number(form.periode.slice(5, 7)) || undefined;
        const [maille, policy] = await Promise.all([
          getMailleDisponible(adapter, { accountCode: form.accountCode.trim(), sectionId: form.sectionId || null, annee, period }),
          getControlPolicy(adapter, natureOfAccount(form.accountCode.trim())),
        ]);
        if (cancelled) return;
        const { decision, seuil } = decideCheck(maille, Number(form.montant) || 0, policy);
        setPreview({ maille, decision, seuil });
      } catch {
        if (!cancelled) setPreview(null);
      }
    })();
    return () => { cancelled = true; };
  }, [adapter, showForm, form.accountCode, form.sectionId, form.periode, form.montant]);

  const sectionLabel = useCallback(
    (id: string | null) => (id ? sections.find((s) => s.id === id)?.libelle ?? '—' : '—'),
    [sections],
  );

  const totals = useMemo(() => rows.reduce((acc, r) => ({
    initial: acc.initial + r.montant_initial,
    facture: acc.facture + r.montant_facture,
    restant: acc.restant + engagementRestant(r),
  }), { initial: 0, facture: 0, restant: 0 }), [rows]);

  const submitForm = useCallback(async () => {
    setSaving(true); setError(null); setNotice(null);
    try {
      if (!form.accountCode.trim()) throw new Error(t('budgetCommitments.errAccount'));
      if (!form.periode) throw new Error(t('budgetCommitments.errPeriod'));
      if (!form.motif.trim()) throw new Error(t('budgetCommitments.errReason'));
      const montant = Number(form.montant);
      if (!(montant > 0)) throw new Error(t('budgetCommitments.errAmount'));
      const input = {
        accountCode: form.accountCode, sectionId: form.sectionId || null,
        periode: `${form.periode}-01`, montant, fournisseur: form.fournisseur || null,
        reference: form.reference || null, motif: form.motif, contratRecurrent: form.recurrent,
      };
      if (form.recurrent) {
        const ids = await createRecurringEngagement(adapter, input, Number(form.months) || 12);
        setNotice(t('budgetCommitments.recurringCreated', { count: String(ids.length) }));
      } else {
        await createManualEngagement(adapter, input);
        setNotice(t('budgetCommitments.manualCreated'));
      }
      setForm({ ...emptyForm }); setShowForm(false); setRefreshKey((k) => k + 1);
    } catch (e: any) {
      setError(e?.message || t('budgetCommitments.saveFailed'));
    } finally {
      setSaving(false);
    }
  }, [adapter, form]);

  const doAction = useCallback(async (id: string, action: 'degage' | 'annule') => {
    setBusyId(id); setError(null); setNotice(null);
    try {
      if (action === 'degage') { await degageEngagement(adapter, id); setNotice(t('budgetCommitments.remainderReleased')); }
      else { await annulerEngagement(adapter, id); setNotice(t('budgetCommitments.commitmentCancelled')); }
      setRefreshKey((k) => k + 1);
    } catch (e: any) {
      setError(e?.message || t('budgetCommitments.actionFailed'));
    } finally {
      setBusyId(null);
    }
  }, [adapter]);

  return (
    <div className="p-6 space-y-5">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
            <FileSignature className="w-6 h-6 text-[var(--color-primary)]" /> Registre des engagements
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] dark:text-[var(--color-text-tertiary)]">
            {t('budgetCommitments.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowClose((s) => !s)} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--color-border)] text-sm hover:bg-neutral-50 dark:hover:bg-neutral-700">
            <CalendarX className="w-4 h-4" /> {t('budgetCommitments.yearEndClosing')}
          </button>
          <button onClick={() => setShowForm((s) => !s)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium hover:opacity-90 transition">
            <Plus className="w-4 h-4" /> Engagement manuel
          </button>
        </div>
      </header>

      {showClose && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 px-4 py-3 text-sm space-y-2">
          <div className="text-amber-800 dark:text-amber-200">
            {t('budgetCommitments.yearEndRelease', {
              count: String(carryoverSummary(rows).count),
              remainder: carryoverSummary(rows).totalReliquat.toLocaleString(numberLocale),
            })}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button disabled={closing} onClick={() => runCarryover('report')} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--color-primary)] text-white text-xs font-medium disabled:opacity-50">{closing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Reporter sur N+1</button>
            <button disabled={closing} onClick={() => runCarryover('annulation')} className="px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-600 text-xs disabled:opacity-50">{t('budgetCommitments.cancelRemainders')}</button>
            <button onClick={() => setShowClose(false)} className="px-3 py-1.5 text-xs text-[var(--color-text-secondary)]">{t('budgetCommitments.close')}</button>
          </div>
        </div>
      )}

      {error && <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</div>}
      {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{notice}</div>}

      {showForm && (
        <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Field label={t('budgetCommitments.fieldAccount')}>
              <input value={form.accountCode} onChange={(e) => setForm({ ...form, accountCode: e.target.value })}
                placeholder="6132" className={INP} />
            </Field>
            <Field label={t('budgetCommitments.fieldSection')}>
              <select value={form.sectionId} onChange={(e) => setForm({ ...form, sectionId: e.target.value })} className={INP}>
                <option value="">{t('budgetCommitments.noneOption')}</option>
                {sections.map((s) => <option key={s.id} value={s.id}>{s.code} · {s.libelle}</option>)}
              </select>
            </Field>
            <Field label={t('budgetCommitments.fieldPeriod')}>
              <input type="month" value={form.periode} onChange={(e) => setForm({ ...form, periode: e.target.value })} className={INP} />
            </Field>
            <Field label={t('budgetCommitments.fieldAmount')}>
              <input type="number" value={form.montant} onChange={(e) => setForm({ ...form, montant: e.target.value })} className={`${INP} font-mono`} />
            </Field>
            <Field label={t('budgetCommitments.fieldSupplier')}>
              <input value={form.fournisseur} onChange={(e) => setForm({ ...form, fournisseur: e.target.value })} className={INP} />
            </Field>
            <Field label={t('budgetCommitments.fieldReference')}>
              <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} className={INP} />
            </Field>
            <Field label={t('budgetCommitments.fieldReason')} className="lg:col-span-3">
              <input value={form.motif} onChange={(e) => setForm({ ...form, motif: e.target.value })}
                placeholder={t('budgetCommitments.reasonPlaceholder')} className={INP} />
            </Field>
          </div>
          {preview && (
            <div className="rounded-xl bg-[var(--color-surface-hover)] border border-[var(--color-border)] p-3">
              <div className="text-xs font-medium text-[var(--color-text-secondary)] mb-2">{t('budgetCommitments.availableInfo')}</div>
              <BudgetEquationBar
                budget={preview.maille.budget} engage={preview.maille.engage}
                realise={preview.maille.realise} disponible={preview.maille.disponible}
                montantEnvisage={Number(form.montant) || undefined}
                decision={preview.decision} seuil={preview.seuil}
              />
            </div>
          )}
          <div className="flex items-center gap-4 flex-wrap">
            <label className="inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
              <input type="checkbox" checked={form.recurrent} onChange={(e) => setForm({ ...form, recurrent: e.target.checked })} />
              <Repeat className="w-4 h-4" /> {t('budgetCommitments.recurring')}
            </label>
            {form.recurrent && (
              <label className="inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                {t('budgetCommitments.instalments')}
                <input type="number" value={form.months} onChange={(e) => setForm({ ...form, months: e.target.value })}
                  className={`${INP} w-20`} min={1} max={60} />
              </label>
            )}
            <div className="flex-1" />
            <button onClick={() => { setShowForm(false); setForm({ ...emptyForm }); }} className="px-4 py-2 rounded-xl text-sm text-[var(--color-text-secondary)] hover:bg-neutral-100 dark:hover:bg-neutral-700">{t('budgetCommitments.cancel')}</button>
            <button onClick={submitForm} disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Enregistrer
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center gap-2 text-[var(--color-text-secondary)] py-12 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> Chargement…</div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center text-sm text-[var(--color-text-secondary)]">
            {t('budgetCommitments.empty')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left bg-gray-50 text-xs font-semibold text-gray-600 border-b border-[var(--color-border)]">
                  <th className="px-4 py-3">{t('budgetCommitments.colAccount')}</th>
                  <th className="px-4 py-3">{t('budgetCommitments.colSection')}</th>
                  <th className="px-4 py-3">{t('budgetCommitments.colPeriod')}</th>
                  <th className="px-4 py-3">{t('budgetCommitments.fieldSupplier')}</th>
                  <th className="px-4 py-3 text-right">{t('budgetCommitments.colInitial')}</th>
                  <th className="px-4 py-3 text-right">{t('budgetCommitments.colInvoiced')}</th>
                  <th className="px-4 py-3 text-right">{t('budgetCommitments.colRemaining')}</th>
                  <th className="px-4 py-3">{t('budgetCommitments.colStatus')}</th>
                  <th className="px-4 py-3 text-right">{t('budgetCommitments.colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const restant = engagementRestant(r);
                  const canAct = r.statut !== 'solde' && r.statut !== 'annule';
                  return (
                    <tr key={r.id} className="border-b border-[var(--color-border-light)] hover:bg-neutral-50 dark:hover:bg-neutral-700/30">
                      <td className="px-4 py-3">
                        <div className="font-mono text-[var(--color-text-primary)]">{r.account_code}</div>
                        <div className="text-xs text-[var(--color-text-tertiary)] truncate max-w-[160px]">{getAccountLabel(r.account_code)}</div>
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">{sectionLabel(r.section_id)}</td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">{r.periode?.slice(0, 7)}</td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                        <div className="flex items-center gap-1">
                          {r.source === 'manuel' && <Building2 className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />}
                          {r.fournisseur_libelle || '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{formatCurrency(r.montant_initial)}</td>
                      <td className="px-4 py-3 text-right font-mono text-[var(--color-text-secondary)]">{formatCurrency(r.montant_facture)}</td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-[var(--color-primary)] dark:text-[var(--color-primary)]">{formatCurrency(restant)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUT_STYLE[r.statut]}`}>{t(STATUT_LABEL_KEY[r.statut])}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {canAct && (
                            <>
                              <button title={t('budgetCommitments.releaseRemainder')} disabled={busyId === r.id}
                                onClick={() => doAction(r.id, 'degage')}
                                className="p-1.5 rounded-lg text-[var(--color-text-tertiary)] hover:text-[var(--color-primary)] hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-40">
                                {busyId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                              </button>
                              <button title={t('budgetCommitments.cancelCommitment')} disabled={busyId === r.id}
                                onClick={() => doAction(r.id, 'annule')}
                                className="p-1.5 rounded-lg text-[var(--color-text-tertiary)] hover:text-red-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-40">
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[var(--color-border)] font-medium text-[var(--color-text-primary)]">
                  <td className="px-4 py-3" colSpan={4}>{t('budgetCommitments.totalRow', { count: String(rows.length) })}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatCurrency(totals.initial)}</td>
                  <td className="px-4 py-3 text-right font-mono text-[var(--color-text-secondary)]">{formatCurrency(totals.facture)}</td>
                  <td className="px-4 py-3 text-right font-mono text-[var(--color-primary)] dark:text-[var(--color-primary)]">{formatCurrency(totals.restant)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const Field: React.FC<{ label: string; className?: string; children: React.ReactNode }> = ({ label, className = '', children }) => (
  <label className={`block ${className}`}>
    <span className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">{label}</span>
    {children}
  </label>
);

export default BudgetEngagementsPage;
