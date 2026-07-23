/**
 * BCStepperPage — /capex/bc/:id (et /capex/bc/new) (refonte OPEX/CAPEX, Lot 5, §16).
 *
 * Formulaire Business Case CAPEX en 8 sections (stepper). Cœur = capex_requests +
 * satellites (lignes de coût, cashflows, risques) via capexBcService. L'évaluation
 * financière (section 7) est recalculée 100 % code (recomputeBcMetrics) — jamais
 * saisie. Jauge de complétude par étape.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency } from '../../utils/formatters';
import AccountCombobox from '../../components/common/AccountCombobox';
import { useAccountNames } from '../../hooks/useAccountNames';
import { createCapexRequest } from '../../features/budget/services/budgetService';
import {
  getBcRequest, updateBcFields, recomputeBcMetrics,
  listCostLines, upsertCostLine, deleteCostLine,
  listCashflows, upsertCashflow, deleteCashflow,
  listRisques, upsertRisque, deleteRisque,
  type BcCostLine, type BcCashflow, type BcRisque, type BcMetrics, type TypeCout, type TypeCashflow,
} from '../../features/budget/services/capexBcService';
import { listOrgTree, type SectionOrgNode } from '../../features/budget/services/sectionGovernanceService';
import { emitCar } from '../../features/budget/services/carService';
import CarModal from './CarModal';
import { Layers, Loader2, Plus, Trash2, Calculator, ArrowLeft, Send, Banknote } from 'lucide-react';

const STEP_KEYS = ['bcStepper.stepIdentification', 'bcStepper.stepCategorie', 'bcStepper.stepContexte', 'bcStepper.stepAlternatives', 'bcStepper.stepCouts', 'bcStepper.stepBenefices', 'bcStepper.stepEvaluation', 'bcStepper.stepRisques'];
const CATEGORIES = ['croissance', 'remplacement', 'conformite_reglementaire', 'securite_hsse', 'productivite', 'it_digital'];
const TYPES_COUT: TypeCout[] = ['acquisition', 'travaux_installation', 'transport_douane', 'etudes_ingenierie', 'formation', 'logiciel_licences', 'contingence', 'autres', 'opex_induit'];
const TYPES_CF: TypeCashflow[] = ['economie', 'revenu', 'cout_evite', 'valeur_residuelle', 'autre'];
const INP = 'w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-light)]';

const Field: React.FC<{ label: string; className?: string; children: React.ReactNode }> = ({ label, className = '', children }) => (
  <label className={`block ${className}`}><span className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">{label}</span>{children}</label>
);

const BCStepperPage: React.FC = () => {
  const { id = '' } = useParams();
  const { adapter } = useData();
  const { t: tr } = useLanguage();
  const { label: accountLabel } = useAccountNames();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [bc, setBc] = useState<any | null>(null);
  const [sections, setSections] = useState<SectionOrgNode[]>([]);
  const [costs, setCosts] = useState<BcCostLine[]>([]);
  const [cashflows, setCashflows] = useState<BcCashflow[]>([]);
  const [risques, setRisques] = useState<BcRisque[]>([]);
  const [metrics, setMetrics] = useState<BcMetrics | null>(null);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showCar, setShowCar] = useState(false);
  // création
  const [newLibelle, setNewLibelle] = useState('');
  const [newAccount, setNewAccount] = useState('');
  const [newUrgence, setNewUrgence] = useState(false);
  const [newSousMotif, setNewSousMotif] = useState('continuite_exploitation');

  useEffect(() => {
    if (isNew) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const [req, tree, c, cf, rq] = await Promise.all([
          getBcRequest(adapter, id), listOrgTree(adapter),
          listCostLines(adapter, id), listCashflows(adapter, id), listRisques(adapter, id),
        ]);
        if (cancelled) return;
        setBc(req); setSections(tree); setCosts(c); setCashflows(cf); setRisques(rq);
      } catch (e: any) { if (!cancelled) setError(e?.message || tr('bcStepper.errorGeneric')); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [adapter, id, isNew, refreshKey]);

  const patch = useCallback(async (p: Record<string, any>) => {
    if (!bc) return;
    setBc((b: any) => ({ ...b, ...p }));
    try { await updateBcFields(adapter, bc.id, p); } catch (e: any) { setError(e?.message || tr('bcStepper.saveFailed')); }
  }, [adapter, bc]);

  const create = useCallback(async () => {
    setBusy(true); setError(null);
    try {
      if (!newLibelle.trim()) throw new Error(tr('bcStepper.labelRequired'));
      const newId = await createCapexRequest(adapter, {
        libelle: newLibelle, account_code: (newAccount || '2').trim(), montant: 0,
        duree_amortissement: 5, methode: 'lineaire',
      });
      await updateBcFields(adapter, newId, newUrgence
        ? { statut: 'brouillon', urgence: true, urgence_sous_motif: newSousMotif, categorie: 'urgence' }
        : { statut: 'brouillon' });
      navigate(`/capex/bc/${newId}`, { replace: true });
    } catch (e: any) { setError(e?.message || tr('bcStepper.createFailed')); } finally { setBusy(false); }
  }, [adapter, newLibelle, newAccount, navigate]);

  const recompute = useCallback(async () => {
    setBusy(true); setError(null); setNotice(null);
    try { const m = await recomputeBcMetrics(adapter, id); setMetrics(m); setNotice(tr('bcStepper.appraisalRecomputed')); setRefreshKey((k) => k + 1); }
    catch (e: any) { setError(e?.message || tr('bcStepper.computeFailed')); } finally { setBusy(false); }
  }, [adapter, id]);

  const submit = useCallback(async () => {
    setBusy(true); setError(null); setNotice(null);
    try { await patch({ statut: 'soumis' }); setNotice(tr('bcStepper.submitted')); }
    catch (e: any) { setError(e?.message || tr('bcStepper.failed')); } finally { setBusy(false); }
  }, [patch]);

  /**
   * Après enregistrement du document d'appropriation (CarModal), on matérialise le
   * projet : capex_projets + section analytique (ancrage du réalisé GL classe 2).
   * emitCar est idempotent — un 2e CAR sur le même BC ne recrée pas le projet.
   */
  const afterCarSaved = useCallback(async () => {
    setBusy(true); setError(null); setNotice(null);
    try { const r = await emitCar(adapter, id); setNotice(tr('bcStepper.carSaved', { code: String(r.code) })); setShowCar(false); navigate(`/capex/projet/${r.projectId}`); }
    catch (e: any) { setError(e?.message || tr('bcStepper.carProjectFailed')); }
    finally { setBusy(false); }
  }, [adapter, id, navigate]);

  const totalCosts = useMemo(() => costs.reduce((s, c) => s + c.montant, 0), [costs]);

  if (loading) return <div className="flex items-center gap-2 text-[var(--color-text-secondary)] py-16 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> {tr('bcStepper.loading')}</div>;

  if (isNew) {
    return (
      <div className="p-6 max-w-lg mx-auto space-y-4">
        <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] flex items-center gap-2"><Layers className="w-6 h-6 text-[var(--color-primary)]" /> {tr('bcStepper.newBusinessCase')}</h1>
        {error && <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700">{error}</div>}
        <Field label={tr('bcStepper.investmentLabel')}><input value={newLibelle} onChange={(e) => setNewLibelle(e.target.value)} className={INP} placeholder={tr('bcStepper.investmentPlaceholder')} /></Field>
        <Field label={tr('bcStepper.fixedAssetAccount')}>
          <AccountCombobox value={newAccount} onChange={setNewAccount} classPrefix="2" placeholder="2313" inputClassName="w-full" />
          <span className="block mt-1 text-xs text-[var(--color-text-tertiary)] truncate" title={accountLabel(newAccount)}>
            {newAccount ? (accountLabel(newAccount) || tr('bcStepper.accountOutsideChart')) : tr('bcStepper.selectAccount')}
          </span>
        </Field>
        <label className="inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
          <input type="checkbox" checked={newUrgence} onChange={(e) => setNewUrgence(e.target.checked)} /> {tr('bcStepper.emergencyCapex')}
        </label>
        {newUrgence && (
          <Field label={tr('bcStepper.emergencySubReason')}>
            <select value={newSousMotif} onChange={(e) => setNewSousMotif(e.target.value)} className={INP}>
              {['securite_personnes', 'continuite_exploitation', 'injonction_reglementaire', 'sinistre'].map((m) => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
            </select>
          </Field>
        )}
        <div className="flex gap-2">
          <button onClick={() => navigate('/capex')} className="px-4 py-2 rounded-xl text-sm text-[var(--color-text-secondary)] hover:bg-neutral-100 dark:hover:bg-neutral-700">{tr('bcStepper.cancel')}</button>
          <button onClick={create} disabled={busy} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} {tr('bcStepper.createDraft')}</button>
        </div>
      </div>
    );
  }

  if (!bc) return <div className="p-6 text-center text-sm text-[var(--color-text-secondary)]">{tr('bcStepper.notFound')}</div>;

  return (
    <div className="p-6 space-y-5">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/capex')} className="p-2 rounded-lg text-[var(--color-text-tertiary)] hover:bg-neutral-100 dark:hover:bg-neutral-700"><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <h1 className="text-xl font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
              {bc.libelle}
              {bc.urgence && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-300">{tr('bcStepper.emergencyBadge')} · {(bc.urgence_sous_motif || '').replace(/_/g, ' ')}</span>}
            </h1>
            <p className="text-xs text-[var(--color-text-secondary)]">{bc.reference || 'BC'} · {tr('bcStepper.statusLabel')} {bc.statut} · {tr('bcStepper.investmentInline')} {formatCurrency(totalCosts)}</p>
          </div>
        </div>
        {(bc.statut === 'brouillon' || bc.statut === 'demande') && (
          <button onClick={submit} disabled={busy} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} {tr('bcStepper.submit')}
          </button>
        )}
        {/* Le CAR passe par son FORMULAIRE d'appropriation (référence, montant, date,
            justification) — plusieurs CAR possibles par BC, somme ≤ enveloppe. */}
        {['approuve', 'approuve_avec_conditions', 'fonds_disponibles', 'car_emis'].includes(String(bc.statut)) && (
          <button onClick={() => setShowCar(true)} disabled={busy} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-secondary)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Banknote className="w-4 h-4" />} {bc.statut === 'approuve' || bc.statut === 'approuve_avec_conditions' ? tr('bcStepper.issueCar') : tr('bcStepper.carAppropriations')}
          </button>
        )}
      </header>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700">{error}</div>}
      {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 text-sm text-emerald-700">{notice}</div>}

      {/* Stepper nav */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {STEP_KEYS.map((s, i) => (
          <button key={s} onClick={() => setStep(i)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${i === step ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-neutral-800 dark:hover:text-neutral-200'}`}>
            {i + 1}. {tr(s)}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-[var(--color-border)] shadow-sm p-5">
        {step === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={tr('bcStepper.label')}><input defaultValue={bc.libelle} onBlur={(e) => patch({ libelle: e.target.value })} className={INP} /></Field>
            <Field label={tr('bcStepper.fixedAssetAccountShort')}>
              <AccountCombobox value={bc.account_code ?? ''}
                onChange={(code) => setBc((b: any) => ({ ...b, account_code: code }))}
                onCommit={(code) => patch({ account_code: code })}
                classPrefix="2" placeholder="ex. 2313" inputClassName="w-full" />
              <span className="block mt-1 text-xs text-[var(--color-text-tertiary)] truncate" title={accountLabel(bc.account_code)}>
                {bc.account_code ? (accountLabel(bc.account_code) || tr('bcStepper.accountOutsideChart')) : tr('bcStepper.selectAccount')}
              </span>
            </Field>
            <Field label={tr('bcStepper.carryingSection')}>
              <select defaultValue={bc.section_id ?? ''} onChange={(e) => patch({ section_id: e.target.value || null })} className={INP}>
                <option value="">—</option>{sections.map((s) => <option key={s.id} value={s.id}>{s.code} · {s.libelle}</option>)}
              </select>
            </Field>
            <Field label={tr('bcStepper.targetInServiceDate')}><input type="date" defaultValue={bc.date_prevue ?? ''} onBlur={(e) => patch({ date_prevue: e.target.value || null })} className={INP} /></Field>
          </div>
        )}

        {step === 1 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={tr('bcStepper.strategicCategory')}>
              <select defaultValue={bc.categorie ?? ''} onChange={(e) => patch({ categorie: e.target.value || null })} className={INP}>
                <option value="">—</option>{CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
              </select>
            </Field>
            <Field label={tr('bcStepper.assetClassSyscohada')}>
              <select defaultValue={bc.classe_immo ?? ''} onChange={(e) => patch({ classe_immo: e.target.value || null })} className={INP}>
                <option value="">—</option>{['21', '22', '23', '24'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label={tr('bcStepper.depreciationDuration')}><input type="number" defaultValue={bc.duree_amortissement} onBlur={(e) => patch({ duree_amortissement: Number(e.target.value) || 0 })} className={INP} /></Field>
            <Field label={tr('bcStepper.discountRate')}><input type="number" step="0.01" defaultValue={bc.taux_actualisation ?? ''} onBlur={(e) => patch({ taux_actualisation: e.target.value ? Number(e.target.value) : null })} className={INP} placeholder="0.12" /></Field>
            <label className="inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)] sm:col-span-2">
              <input type="checkbox" defaultChecked={bc.obligatoire} onChange={(e) => patch({ obligatoire: e.target.checked })} />
              {tr('bcStepper.mandatoryInvestment')}
            </label>
          </div>
        )}

        {step === 2 && (
          <Field label={tr('bcStepper.contextJustification')}>
            <textarea defaultValue={bc.business_case ?? ''} onBlur={(e) => patch({ business_case: e.target.value })} rows={8} className={INP} placeholder={tr('bcStepper.contextPlaceholder')} />
          </Field>
        )}

        {step === 3 && (
          <Field label={tr('bcStepper.alternativesStudied')}>
            <textarea defaultValue={bc.justification ?? ''} onBlur={(e) => patch({ justification: e.target.value })} rows={8} className={INP} placeholder={tr('bcStepper.alternativesPlaceholder')} />
          </Field>
        )}

        {step === 4 && (
          <CostSection adapter={adapter} requestId={id} rows={costs} onChange={() => setRefreshKey((k) => k + 1)} total={totalCosts} />
        )}
        {step === 5 && (
          <CashflowSection adapter={adapter} requestId={id} rows={cashflows} onChange={() => setRefreshKey((k) => k + 1)} />
        )}
        {step === 6 && (
          <EvalSection bc={bc} metrics={metrics} investment={totalCosts} onRecompute={recompute} busy={busy} />
        )}
        {step === 7 && (
          <RisqueSection adapter={adapter} requestId={id} rows={risques} onChange={() => setRefreshKey((k) => k + 1)} />
        )}
      </div>

      <div className="flex items-center justify-between">
        <button disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))} className="px-4 py-2 rounded-xl border border-[var(--color-border)] text-sm disabled:opacity-40">{tr('bcStepper.previous')}</button>
        <button disabled={step === STEP_KEYS.length - 1} onClick={() => setStep((s) => Math.min(STEP_KEYS.length - 1, s + 1))} className="px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white text-sm disabled:opacity-40">{tr('bcStepper.next')}</button>
      </div>

      <CarModal
        open={showCar}
        request={bc as any}
        onClose={() => setShowCar(false)}
        onSaved={afterCarSaved}
      />
    </div>
  );
};

// ── Sections satellites ──────────────────────────────────────────────────────
const CostSection: React.FC<{ adapter: any; requestId: string; rows: BcCostLine[]; total: number; onChange: () => void }> = ({ adapter, requestId, rows, total, onChange }) => {
  const { t: tr } = useLanguage();
  const [type, setType] = useState<TypeCout>('acquisition');
  const [des, setDes] = useState(''); const [montant, setMontant] = useState(''); const [capi, setCapi] = useState(true);
  const add = async () => { if (!des.trim() || !(Number(montant) > 0)) return; await upsertCostLine(adapter, requestId, { type_cout: type, designation: des, montant: Number(montant), capitalisable: capi }); setDes(''); setMontant(''); onChange(); };
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
        <select value={type} onChange={(e) => setType(e.target.value as TypeCout)} className={INP}>{TYPES_COUT.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}</select>
        <input value={des} onChange={(e) => setDes(e.target.value)} placeholder={tr('bcStepper.designation')} className={`${INP} sm:col-span-1`} />
        <input type="number" value={montant} onChange={(e) => setMontant(e.target.value)} placeholder={tr('bcStepper.amount')} className={`${INP} font-mono`} />
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-1 text-xs text-[var(--color-text-secondary)]"><input type="checkbox" checked={capi} onChange={(e) => setCapi(e.target.checked)} /> {tr('bcStepper.capitalizable')}</label>
          <button onClick={add} className="px-3 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm"><Plus className="w-4 h-4" /></button>
        </div>
      </div>
      <ul className="divide-y divide-[var(--color-border-light)]">
        {rows.map((r) => (
          <li key={r.id} className="py-2 flex items-center justify-between gap-2 text-sm">
            <span className="text-[var(--color-text-secondary)]"><span className="text-xs text-[var(--color-text-tertiary)] mr-2">{r.type_cout.replace(/_/g, ' ')}</span>{r.designation}{!r.capitalisable && <span className="ml-2 text-[10px] text-amber-600">{tr('bcStepper.nonCapitalizable')}</span>}</span>
            <span className="flex items-center gap-2"><span className="font-mono">{formatCurrency(r.montant)}</span><button onClick={async () => { await deleteCostLine(adapter, r.id); onChange(); }} className="text-neutral-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button></span>
          </li>
        ))}
      </ul>
      <div className="text-right text-sm font-medium text-[var(--color-primary)] dark:text-[var(--color-primary)]">{tr('bcStepper.totalInvestment')} <span className="font-mono">{formatCurrency(total)}</span></div>
    </div>
  );
};

const CashflowSection: React.FC<{ adapter: any; requestId: string; rows: BcCashflow[]; onChange: () => void }> = ({ adapter, requestId, rows, onChange }) => {
  const { t: tr } = useLanguage();
  const [annee, setAnnee] = useState('1'); const [type, setType] = useState<TypeCashflow>('economie'); const [montant, setMontant] = useState(''); const [lib, setLib] = useState('');
  const add = async () => { if (!(Number(montant) > 0)) return; await upsertCashflow(adapter, requestId, { annee: Number(annee) || 1, type, montant: Number(montant), libelle: lib || null }); setMontant(''); setLib(''); onChange(); };
  return (
    <div className="space-y-3">
      <p className="text-xs text-[var(--color-text-tertiary)]">{tr('bcStepper.annualBenefitsHelp')}</p>
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
        <input type="number" value={annee} onChange={(e) => setAnnee(e.target.value)} placeholder={tr('bcStepper.year')} className={`${INP} font-mono`} />
        <select value={type} onChange={(e) => setType(e.target.value as TypeCashflow)} className={INP}>{TYPES_CF.map((t) => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}</select>
        <input value={lib} onChange={(e) => setLib(e.target.value)} placeholder={tr('bcStepper.labelField')} className={INP} />
        <input type="number" value={montant} onChange={(e) => setMontant(e.target.value)} placeholder={tr('bcStepper.amount')} className={`${INP} font-mono`} />
        <button onClick={add} className="px-3 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm"><Plus className="w-4 h-4 inline" /> {tr('bcStepper.add')}</button>
      </div>
      <ul className="divide-y divide-[var(--color-border-light)]">
        {rows.map((r) => (
          <li key={r.id} className="py-2 flex items-center justify-between gap-2 text-sm">
            <span className="text-[var(--color-text-secondary)]"><span className="font-mono text-xs text-[var(--color-text-tertiary)] mr-2">{tr('bcStepper.yearShort', { year: String(r.annee) })}</span>{r.libelle || r.type.replace(/_/g, ' ')}</span>
            <span className="flex items-center gap-2"><span className="font-mono text-emerald-600">{formatCurrency(r.montant)}</span><button onClick={async () => { await deleteCashflow(adapter, r.id); onChange(); }} className="text-neutral-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button></span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const EvalSection: React.FC<{ bc: any; metrics: BcMetrics | null; investment: number; onRecompute: () => void; busy: boolean }> = ({ bc, metrics, investment, onRecompute, busy }) => {
  const { t: tr } = useLanguage();
  const van = metrics?.van ?? (bc.van != null ? Number(bc.van) : null);
  const tri = metrics?.tri ?? (bc.tri != null ? Number(bc.tri) : null);
  const pi = metrics?.pi ?? (bc.indice_profitabilite != null ? Number(bc.indice_profitabilite) : null);
  const roi = metrics?.roi ?? (bc.roi != null ? Number(bc.roi) : null);
  const pb = metrics?.paybackSimpleMois ?? bc.payback_simple_mois ?? null;
  const Tile: React.FC<{ label: string; value: string; accent?: string }> = ({ label, value, accent = 'text-[var(--color-text-primary)]' }) => (
    <div className="rounded-xl border border-[var(--color-border)] px-4 py-3"><div className="text-[11px] uppercase tracking-wide text-[var(--color-text-secondary)]">{label}</div><div className={`font-mono text-lg font-semibold ${accent}`}>{value}</div></div>
  );
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-[var(--color-text-tertiary)]">{tr('bcStepper.deterministicHelp', { amount: formatCurrency(investment) })}</p>
        <button onClick={onRecompute} disabled={busy} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />} {tr('bcStepper.recompute')}</button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Tile label={tr('bcStepper.npv')} value={van != null ? formatCurrency(van) : '—'} accent={van != null && van >= 0 ? 'text-emerald-600' : van != null ? 'text-red-600' : ''} />
        <Tile label={tr('bcStepper.irr')} value={tri != null ? `${(tri * 100).toFixed(1)} %` : '—'} />
        <Tile label={tr('bcStepper.profitabilityIndex')} value={pi != null ? pi.toFixed(2) : '—'} />
        <Tile label="ROI" value={roi != null ? `${(roi * 100).toFixed(1)} %` : '—'} />
        <Tile label={tr('bcStepper.simplePayback')} value={pb != null ? tr('bcStepper.yearsValue', { value: (pb / 12).toFixed(1) }) : '—'} />
      </div>
    </div>
  );
};

const RisqueSection: React.FC<{ adapter: any; requestId: string; rows: BcRisque[]; onChange: () => void }> = ({ adapter, requestId, rows, onChange }) => {
  const { t: tr } = useLanguage();
  const [risque, setRisque] = useState(''); const [p, setP] = useState('3'); const [i, setI] = useState('3'); const [mit, setMit] = useState('');
  const add = async () => { if (!risque.trim()) return; await upsertRisque(adapter, requestId, { risque, probabilite: Number(p) || 1, impact: Number(i) || 1, mitigation: mit || null }); setRisque(''); setMit(''); onChange(); };
  const color = (s: number) => s >= 15 ? 'bg-red-100 text-red-700' : s >= 8 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700';
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
        <input value={risque} onChange={(e) => setRisque(e.target.value)} placeholder={tr('bcStepper.risk')} className={`${INP} sm:col-span-2`} />
        <input type="number" min={1} max={5} value={p} onChange={(e) => setP(e.target.value)} placeholder={tr('bcStepper.probabilityPlaceholder')} className={`${INP} font-mono`} />
        <input type="number" min={1} max={5} value={i} onChange={(e) => setI(e.target.value)} placeholder={tr('bcStepper.impactPlaceholder')} className={`${INP} font-mono`} />
        <button onClick={add} className="px-3 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm"><Plus className="w-4 h-4 inline" /></button>
      </div>
      <input value={mit} onChange={(e) => setMit(e.target.value)} placeholder={tr('bcStepper.mitigationOptional')} className={INP} />
      <ul className="divide-y divide-[var(--color-border-light)]">
        {rows.map((r) => { const s = r.probabilite * r.impact; return (
          <li key={r.id} className="py-2 flex items-center justify-between gap-2 text-sm">
            <span className="text-[var(--color-text-secondary)]">{r.risque}{r.mitigation && <span className="block text-xs text-[var(--color-text-tertiary)]">→ {r.mitigation}</span>}</span>
            <span className="flex items-center gap-2"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${color(s)}`}>P×I {s}</span><button onClick={async () => { await deleteRisque(adapter, r.id); onChange(); }} className="text-neutral-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button></span>
          </li>
        ); })}
      </ul>
    </div>
  );
};

export default BCStepperPage;
