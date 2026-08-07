/**
 * CapexRequestModal — Capital Appropriation Request (CAR), stage-gate (CDC §8).
 *
 * Deux onglets : « Demande » (intitulé, compte, amortissement, justification) et
 * « Évaluation financière » (catégorie, business case, flux de trésorerie, VAN/
 * TRI/payback/PI/ROI calculés de façon DÉTERMINISTE, test IAS 16, niveau
 * d'approbation requis selon la matrice). Trois modes : création / édition /
 * consultation (fonds engagés → lecture seule).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useToast } from '../../hooks/useToast';
import { formatCurrency } from '../../utils/formatters';
import { Dialog, DialogContent } from '../../components/ui/Dialog';
import AccountCombobox from '../../components/common/AccountCombobox';
import { useAccountNames } from '../../hooks/useAccountNames';
import {
  getActiveFiscalYear, createCapexRequest, updateCapexRequest, saveCapexEvaluation, dotationAnnuelle,
  type CapexRequest,
} from '../../features/budget/services/budgetService';
import {
  listApprovalMatrix, ensureDefaultMatrix, requiredApprover, type ApprovalBracket,
  listNotes, addNote, addAttachment, getAttachmentUrl, deleteNote, type CapexNote,
} from '../../features/budget/services/capexCarService';
import { listSections, type Section } from '../../features/budget/services/analyticsService';
import { computeCapexMetrics } from '../../utils/capexMetrics';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Package, X, CheckCircle, Eye, Pencil, Calculator, ShieldCheck, Paperclip, StickyNote, Download, Trash2, Upload } from 'lucide-react';

interface Props { open: boolean; onClose: () => void; onCreated?: () => void; editing?: CapexRequest | null }

type Translate = (key: string, params?: Record<string, string>) => string;

const CATEGORY_KEYS = [
  ['GROWTH', 'capexRequest.catGrowth'], ['REPLACEMENT', 'capexRequest.catReplacement'],
  ['REGULATORY', 'capexRequest.catRegulatory'], ['COST_REDUCTION', 'capexRequest.catCostReduction'],
  ['IT_DIGITAL', 'capexRequest.catIt'],
] as const;

const IAS16_KEYS = [
  ['controle', 'capexRequest.iasControl'],
  ['avantages', 'capexRequest.iasBenefits'],
  ['cout_fiable', 'capexRequest.iasReliableCost'],
  ['seuil', 'capexRequest.iasThreshold'],
] as const;

const EMPTY = {
  libelle: '', account_code: '', section_id: '', montant: '', date_prevue: '',
  duree_amortissement: '', methode: 'lineaire' as 'lineaire' | 'degressif', valeur_residuelle: '', justification: '',
  categorie: '', business_case: '', taux: '10', flowsText: '',
};

const CapexRequestModal: React.FC<Props> = ({ open, onClose, onCreated, editing }) => {
  const { adapter } = useData();
  const { toast } = useToast();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const dateLocale = language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'fr-FR';
  const { label: accountLabel } = useAccountNames();
  const [tab, setTab] = useState<'demande' | 'eval' | 'notes'>('demande');
  const [sections, setSections] = useState<Section[]>([]);
  const [matrix, setMatrix] = useState<ApprovalBracket[]>([]);
  const [saving, setSaving] = useState(false);
  const [test, setTest] = useState<Record<string, boolean>>({});
  const [f, setF] = useState({ ...EMPTY });
  const [notes, setNotes] = useState<CapexNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [uploading, setUploading] = useState(false);

  const loadNotes = async () => {
    if (!editing) { setNotes([]); return; }
    try { setNotes(await listNotes(adapter, editing.id)); } catch { /* ignore */ }
  };
  const submitNote = async () => {
    if (!editing || !newNote.trim()) return;
    try { await addNote(adapter, editing.id, newNote.trim(), user?.id || null); setNewNote(''); loadNotes(); }
    catch (e: any) { toast.error(e?.message || t('capexRequest.genericError')); }
  };
  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editing) return;
    setUploading(true);
    try { await addAttachment(adapter, editing.id, file, user?.id || null); toast.success(t('capexRequest.attachmentAdded')); loadNotes(); }
    catch (err: any) { toast.error(err?.message || t('capexRequest.uploadFailed')); }
    finally { setUploading(false); e.target.value = ''; }
  };
  const openAttachment = async (n: CapexNote) => {
    if (!n.file_path) return;
    const url = await getAttachmentUrl(adapter, n.file_path);
    if (url) window.open(url, '_blank', 'noopener'); else toast.error(t('capexRequest.linkUnavailable'));
  };
  const removeNote = async (n: CapexNote) => {
    try { await deleteNote(adapter, n); loadNotes(); } catch (e: any) { toast.error(e?.message || t('capexRequest.genericError')); }
  };

  const readOnly = !!editing && (editing.statut === 'fonds_disponibles' || editing.statut === 'clos');
  const isEdit = !!editing;

  const reset = () => { setF({ ...EMPTY }); setTest({}); setTab('demande'); };

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setF({
        libelle: editing.libelle || '', account_code: editing.account_code || '', section_id: editing.section_id || '',
        montant: editing.montant ? String(editing.montant) : '', date_prevue: editing.date_prevue || '',
        duree_amortissement: editing.duree_amortissement ? String(editing.duree_amortissement) : '',
        methode: editing.methode || 'lineaire', valeur_residuelle: editing.valeur_residuelle ? String(editing.valeur_residuelle) : '',
        justification: editing.justification || '', categorie: editing.categorie || '', business_case: editing.business_case || '',
        taux: editing.taux_actualisation != null ? String(Math.round(editing.taux_actualisation * 100)) : '10',
        flowsText: Array.isArray(editing.cashflows) ? editing.cashflows.join(', ') : '',
      });
      setTest(editing.test_capitalisation || {});
      loadNotes();
    } else { reset(); setNotes([]); }
    (async () => {
      try {
        const [secs, mtx] = await Promise.all([listSections(adapter), ensureDefaultMatrix(adapter).catch(() => listApprovalMatrix(adapter))]);
        setSections(secs); setMatrix(mtx);
      } catch { /* ignore */ }
    })();
  }, [open, adapter, editing]);

  const accountName = (code: string) => accountLabel(code);
  const dotation = useMemo(() => dotationAnnuelle({
    montant: parseFloat(f.montant) || 0, valeur_residuelle: parseFloat(f.valeur_residuelle) || 0, duree_amortissement: parseInt(f.duree_amortissement) || 0, methode: f.methode,
  }), [f.montant, f.valeur_residuelle, f.duree_amortissement, f.methode]);

  const flows = useMemo(() => f.flowsText.split(/[,;\n]/).map(s => parseFloat(s.trim())).filter(n => !isNaN(n)), [f.flowsText]);
  const metrics = useMemo(() => {
    const inv = parseFloat(f.montant) || 0;
    if (inv <= 0 || flows.length === 0) return null;
    return computeCapexMetrics({ investment: inv, flows, rate: (parseFloat(f.taux) || 0) / 100, residual: parseFloat(f.valeur_residuelle) || 0 });
  }, [f.montant, f.taux, f.valeur_residuelle, flows]);

  const approver = useMemo(() => requiredApprover(matrix, parseFloat(f.montant) || 0), [matrix, f.montant]);

  const close = () => { reset(); onClose(); };

  const submit = async () => {
    if (!f.libelle.trim() || !f.account_code.trim() || !f.montant) { toast.error(t('capexRequest.errRequiredFields')); return; }
    setSaving(true);
    try {
      const base = {
        libelle: f.libelle, account_code: f.account_code, section_id: f.section_id || null,
        montant: parseFloat(f.montant) || 0, date_prevue: f.date_prevue || null,
        duree_amortissement: parseInt(f.duree_amortissement) || 0, methode: f.methode,
        valeur_residuelle: parseFloat(f.valeur_residuelle) || 0, justification: f.justification || null,
      };
      let id: string;
      if (editing) { await updateCapexRequest(adapter, editing.id, base); id = editing.id; }
      else { const fy = await getActiveFiscalYear(adapter); id = await createCapexRequest(adapter, { fiscalYearId: fy?.id || null, ...base }); }

      await saveCapexEvaluation(adapter, id, {
        categorie: f.categorie || null, business_case: f.business_case || null,
        taux_actualisation: (parseFloat(f.taux) || 0) / 100, cashflows: flows.length ? flows : null,
        van: metrics ? metrics.npv : null, tri: metrics?.irr ?? null,
        payback_simple_mois: metrics?.paybackSimpleMonths ?? null, payback_actualise_mois: metrics?.paybackActualiseMonths ?? null,
        indice_profitabilite: metrics?.pi ?? null, roi: metrics?.roi ?? null,
        test_capitalisation: Object.keys(test).length ? test : null,
      });
      toast.success(editing ? t('capexRequest.carUpdated') : t('capexRequest.requestCreated'));
      reset(); onCreated?.(); onClose();
    } catch (e: any) { toast.error(t('capexRequest.submitFailed', { message: e?.message || t('capexRequest.errorWord') })); }
    finally { setSaving(false); }
  };

  const field = (label: string, node: React.ReactNode) => (<div><label className="text-[11px] text-gray-500 block mb-1">{label}</label>{node}</div>);
  const inputCls = 'w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm disabled:bg-gray-50 disabled:text-gray-500';

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close(); }} containerClassName="max-w-3xl">
      <DialogContent>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center">
              {readOnly ? <Eye className="w-5 h-5 text-[var(--color-primary)]" /> : isEdit ? <Pencil className="w-5 h-5 text-[var(--color-primary)]" /> : <Package className="w-5 h-5 text-[var(--color-primary)]" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">{readOnly ? t('capexRequest.titleReadOnly') : isEdit ? t('capexRequest.titleEdit') : t('capexRequest.titleNew')}</h3>
              <p className="text-xs text-gray-500">{t('capexRequest.subtitle')}</p>
            </div>
          </div>
          <button onClick={close} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
        </div>

        {readOnly && <div className="mb-3 bg-amber-50 text-amber-800 px-3 py-2 rounded-lg text-xs">{t('capexRequest.lockedNotice')}</div>}

        {/* Onglets */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit mb-4">
          {([['demande', t('capexRequest.tabRequest')], ['eval', t('capexRequest.tabEval')], ['notes', t('capexRequest.tabNotes')]] as const).map(([k, lbl]) => (
            <button key={k} onClick={() => setTab(k)} className={`px-4 py-1.5 text-sm font-medium rounded-md ${tab === k ? 'bg-white text-[var(--color-primary)] shadow-sm' : 'text-gray-500'}`}>{lbl}</button>
          ))}
        </div>

        {tab === 'demande' && (<>
          <div className="grid grid-cols-2 gap-3">
            {field(t('capexRequest.labelTitle'), <input value={f.libelle} disabled={readOnly} onChange={e => setF(s => ({ ...s, libelle: e.target.value }))} placeholder={t('capexRequest.labelTitlePlaceholder')} className={inputCls} />)}
            {field('Compte immobilisation (classe 2) *', <>
              <AccountCombobox value={f.account_code} onChange={(code) => setF(s => ({ ...s, account_code: code }))}
                classPrefix="2" disabled={readOnly} placeholder={t('capexRequest.accountPlaceholder')} inputClassName="w-full" />
              <div className="text-[10px] text-gray-400 truncate" title={accountName(f.account_code)}>
                {f.account_code ? (accountName(f.account_code) || t('capexRequest.accountOutOfChart')) : t('capexRequest.selectAccount')}
              </div>
            </>)}
            {field(t('capexRequest.labelAmount'), <input type="number" value={f.montant} disabled={readOnly} onChange={e => setF(s => ({ ...s, montant: e.target.value }))} placeholder="0" className={inputCls} />)}
            {field(t('capexRequest.labelPlannedDate'), <input type="date" value={f.date_prevue} disabled={readOnly} onChange={e => setF(s => ({ ...s, date_prevue: e.target.value }))} className={inputCls} />)}
            {field(t('capexRequest.labelDepreciationYears'), <input type="number" value={f.duree_amortissement} disabled={readOnly} onChange={e => setF(s => ({ ...s, duree_amortissement: e.target.value }))} placeholder={t('capexRequest.yearsPlaceholder')} className={inputCls} />)}
            {field(t('capexRequest.labelMethod'), <select value={f.methode} disabled={readOnly} onChange={e => setF(s => ({ ...s, methode: e.target.value as any }))} className={inputCls}><option value="lineaire">{t('capexRequest.methodStraight')}</option><option value="degressif">{t('capexRequest.methodDeclining')}</option></select>)}
            {field(t('capexRequest.labelResidual'), <input type="number" value={f.valeur_residuelle} disabled={readOnly} onChange={e => setF(s => ({ ...s, valeur_residuelle: e.target.value }))} placeholder="0" className={inputCls} />)}
            {field(t('capexRequest.labelSection'), <select value={f.section_id} disabled={readOnly} onChange={e => setF(s => ({ ...s, section_id: e.target.value }))} className={inputCls}><option value="">{t('capexRequest.noneOption')}</option>{sections.map(s => <option key={s.id} value={s.id}>{s.code} · {s.libelle}</option>)}</select>)}
          </div>
          <div className="mt-3">{field(t('capexRequest.labelJustification'), <textarea value={f.justification} disabled={readOnly} onChange={e => setF(s => ({ ...s, justification: e.target.value }))} rows={2} placeholder={t('capexRequest.justificationPlaceholder')} className={inputCls} />)}</div>
          <div className="mt-4 bg-gray-50 rounded-lg p-3 flex items-center justify-between text-sm">
            <span className="text-gray-600">{t('capexRequest.depreciationCharge', {
              method: f.methode === 'degressif' ? t('capexRequest.methodDecliningFirst') : t('capexRequest.methodStraightWord'),
            })}</span>
            <span className="font-semibold text-[var(--color-primary)]">{formatCurrency(dotation)}{(parseInt(f.duree_amortissement) || 0) > 0 && <span className="text-xs text-gray-400 font-normal"> {f.methode === 'degressif'
              ? t('capexRequest.thenDecreasing', { years: f.duree_amortissement })
              : t('capexRequest.perYear', { years: f.duree_amortissement })}</span>}</span>
          </div>
        </>)}

        {tab === 'eval' && (<>
          <div className="grid grid-cols-2 gap-3">
            {field(t('capexRequest.labelCategory'), <select value={f.categorie} disabled={readOnly} onChange={e => setF(s => ({ ...s, categorie: e.target.value }))} className={inputCls}><option value="">{t('capexRequest.chooseOption')}</option>{CATEGORY_KEYS.map(([k, lk]) => <option key={k} value={k}>{t(lk)}</option>)}</select>)}
            {field(t('capexRequest.labelDiscountRate'), <input type="number" value={f.taux} disabled={readOnly} onChange={e => setF(s => ({ ...s, taux: e.target.value }))} placeholder="10" className={inputCls} />)}
          </div>
          <div className="mt-3">{field(t('capexRequest.labelBusinessCase'), <textarea value={f.business_case} disabled={readOnly} onChange={e => setF(s => ({ ...s, business_case: e.target.value }))} rows={2} placeholder={t('capexRequest.businessCasePlaceholder')} className={inputCls} />)}</div>
          <div className="mt-3">{field(t('capexRequest.labelCashflows'), <input value={f.flowsText} disabled={readOnly} onChange={e => setF(s => ({ ...s, flowsText: e.target.value }))} placeholder={t('capexRequest.cashflowsPlaceholder')} className={inputCls} />)}</div>

          {/* Métriques calculées */}
          <div className="mt-4 bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 mb-2"><Calculator className="w-3.5 h-3.5" />{t('capexRequest.evaluation')}</div>
            {!metrics ? <p className="text-xs text-gray-400">{t('capexRequest.evaluationHint')}</p> : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div><div className="text-[11px] text-gray-500">{t('capexRequest.npv')}</div><div className={`font-semibold ${metrics.npv >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(metrics.npv)}</div></div>
                <div><div className="text-[11px] text-gray-500">{t('capexRequest.irr')}</div><div className="font-semibold text-gray-800">{metrics.irr != null ? `${(metrics.irr * 100).toFixed(1)}%` : '—'}</div></div>
                <div><div className="text-[11px] text-gray-500">{t('capexRequest.profitabilityIndex')}</div><div className="font-semibold text-gray-800">{metrics.pi != null ? metrics.pi.toFixed(2) : '—'}</div></div>
                <div><div className="text-[11px] text-gray-500">{t('capexRequest.paybackSimple')}</div><div className="font-semibold text-gray-800">{metrics.paybackSimpleMonths != null ? t('capexRequest.monthsSuffix', { count: String(metrics.paybackSimpleMonths) }) : '—'}</div></div>
                <div><div className="text-[11px] text-gray-500">{t('capexRequest.paybackDiscounted')}</div><div className="font-semibold text-gray-800">{metrics.paybackActualiseMonths != null ? t('capexRequest.monthsSuffix', { count: String(metrics.paybackActualiseMonths) }) : '—'}</div></div>
                <div><div className="text-[11px] text-gray-500">{t('capexRequest.roi')}</div><div className="font-semibold text-gray-800">{metrics.roi != null ? `${(metrics.roi * 100).toFixed(0)}%` : '—'}</div></div>
              </div>
            )}
          </div>

          {/* Test IAS 16 */}
          <div className="mt-4 bg-gray-50 rounded-lg p-3">
            <div className="text-xs font-semibold text-gray-600 mb-2">{t('capexRequest.ias16Test')}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {IAS16_KEYS.map(([k, lk]) => (
                <label key={k} className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" disabled={readOnly} checked={!!test[k]} onChange={e => setTest(prev => ({ ...prev, [k]: e.target.checked }))} />{t(lk)}</label>
              ))}
            </div>
            <div className="mt-2 text-xs">{IAS16_KEYS.every(([k]) => test[k]) ? <span className="text-green-700">{t('capexRequest.criteriaMet')}</span> : <span className="text-amber-700">{t('capexRequest.criteriaIncomplete')}</span>}</div>
          </div>

          {/* Niveau d'approbation requis */}
          <div className="mt-4 bg-[var(--color-primary)]/5 border border-[var(--color-primary)]/20 rounded-lg p-3 flex items-center gap-2 text-sm">
            <ShieldCheck className="w-4 h-4 text-[var(--color-primary)]" />
            <span className="text-gray-700">{t('capexRequest.approvalRequired')} <span className="font-semibold text-[var(--color-primary)]">{approver ? t('capexRequest.approverLevel', { role: approver.role_requis, level: String(approver.niveau) }) : '—'}</span>{approver && <span className="text-xs text-gray-400 ml-1">{t('capexRequest.forAmount', { amount: formatCurrency(parseFloat(f.montant) || 0) })}</span>}</span>
          </div>
        </>)}

        {tab === 'notes' && (<>
          {!editing ? (
            <div className="bg-amber-50 text-amber-800 rounded-lg px-3 py-3 text-sm">{t('capexRequest.saveFirst')}</div>
          ) : (<>
            {/* Ajout note + pièce jointe */}
            {!readOnly && (
              <div className="flex flex-col gap-2 mb-3">
                <div className="flex gap-2">
                  <input value={newNote} onChange={e => setNewNote(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submitNote(); }} placeholder={t('capexRequest.addNotePlaceholder')} className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
                  <button onClick={submitNote} disabled={!newNote.trim()} className="px-3 py-1.5 bg-[var(--color-primary)] text-white rounded-lg text-sm disabled:opacity-50 flex items-center gap-1"><StickyNote className="w-4 h-4" />{t('capexRequest.note')}</button>
                  <label className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm cursor-pointer hover:bg-gray-50 flex items-center gap-1">
                    <Upload className="w-4 h-4" />{uploading ? t('capexRequest.sending') : t('capexRequest.attachment')}
                    <input type="file" className="hidden" onChange={onPickFile} disabled={uploading} />
                  </label>
                </div>
                <p className="text-[11px] text-gray-400">{t('capexRequest.vaultNotice')}</p>
              </div>
            )}
            {/* Liste */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {notes.length === 0 && <div className="text-sm text-gray-400 py-6 text-center">{t('capexRequest.noNote')}</div>}
              {notes.map(n => (
                <div key={n.id} className="flex items-start justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <div className="flex items-start gap-2 min-w-0">
                    {n.type === 'attachment' ? <Paperclip className="w-4 h-4 text-[var(--color-primary)] mt-0.5 shrink-0" /> : <StickyNote className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />}
                    <div className="min-w-0">
                      {n.type === 'attachment'
                        ? <button onClick={() => openAttachment(n)} className="text-sm text-[var(--color-primary)] hover:underline truncate flex items-center gap-1">{n.file_name}<Download className="w-3 h-3" /></button>
                        : <div className="text-sm text-gray-800 whitespace-pre-wrap break-words">{n.contenu}</div>}
                      <div className="text-[10px] text-gray-400">{new Date(n.created_at).toLocaleString(dateLocale)}</div>
                    </div>
                  </div>
                  {!readOnly && <button onClick={() => removeNote(n)} className="text-gray-300 hover:text-red-500 shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>}
                </div>
              ))}
            </div>
          </>)}
        </>)}

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={close} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">{readOnly ? t('capexRequest.close') : t('capexRequest.cancel')}</button>
          {!readOnly && <button onClick={submit} disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"><CheckCircle className="w-4 h-4" />{saving ? t('capexRequest.sending') : isEdit ? t('capexRequest.save') : t('capexRequest.createRequest')}</button>}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CapexRequestModal;
