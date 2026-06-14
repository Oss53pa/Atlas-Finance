/**
 * CapexRequestModal — Capital Appropriation Request (CAR).
 * Demande d'investissement (CAPEX), DISTINCTE du budget d'exploitation :
 * non mensuelle, orientée projet/bien, avec amortissement (durée, méthode,
 * dotation annuelle, valeur résiduelle). Écrit dans capex_requests.
 *
 * Trois modes : création (editing=null), modification (editing + statut éditable),
 * consultation (editing + statut verrouillé → champs en lecture seule).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useToast } from '../../hooks/useToast';
import { formatCurrency } from '../../utils/formatters';
import { Dialog, DialogContent } from '../../components/ui/Dialog';
import {
  getActiveFiscalYear, createCapexRequest, updateCapexRequest, dotationAnnuelle,
  type CapexRequest,
} from '../../features/budget/services/budgetService';
import { listSections, type Section } from '../../features/budget/services/analyticsService';
import { Package, X, CheckCircle, Eye, Pencil } from 'lucide-react';

interface AccountLite { code: string; name: string }
interface Props { open: boolean; onClose: () => void; onCreated?: () => void; editing?: CapexRequest | null }

const EMPTY = {
  libelle: '', account_code: '', section_id: '', montant: '', date_prevue: '',
  duree_amortissement: '', methode: 'lineaire' as 'lineaire' | 'degressif', valeur_residuelle: '', justification: '',
};

const CapexRequestModal: React.FC<Props> = ({ open, onClose, onCreated, editing }) => {
  const { adapter } = useData();
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<AccountLite[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ ...EMPTY });

  // Une demande déjà engagée (fonds dispo / clôturée) n'est plus modifiable → consultation seule.
  const readOnly = !!editing && (editing.statut === 'fonds_disponibles' || editing.statut === 'clos');
  const isEdit = !!editing;

  const reset = () => setF({ ...EMPTY });

  useEffect(() => {
    if (!open) return;
    // Préremplissage en mode édition/consultation
    if (editing) {
      setF({
        libelle: editing.libelle || '',
        account_code: editing.account_code || '',
        section_id: editing.section_id || '',
        montant: editing.montant ? String(editing.montant) : '',
        date_prevue: editing.date_prevue || '',
        duree_amortissement: editing.duree_amortissement ? String(editing.duree_amortissement) : '',
        methode: editing.methode || 'lineaire',
        valeur_residuelle: editing.valeur_residuelle ? String(editing.valeur_residuelle) : '',
        justification: editing.justification || '',
      });
    } else {
      reset();
    }
    (async () => {
      try {
        const [accs, secs] = await Promise.all([adapter.getAll<any>('accounts'), listSections(adapter)]);
        setAccounts((accs || []).map((a: any) => ({ code: String(a.code || ''), name: String(a.name || a.libelle || '') })).filter(a => a.code.startsWith('2')).sort((a, b) => a.code.localeCompare(b.code)));
        setSections(secs);
      } catch { /* ignore */ }
    })();
  }, [open, adapter, editing]);

  const accountName = (code: string) => accounts.find(a => a.code === code)?.name || '';
  const dotation = useMemo(() => dotationAnnuelle({
    montant: parseFloat(f.montant) || 0, valeur_residuelle: parseFloat(f.valeur_residuelle) || 0, duree_amortissement: parseInt(f.duree_amortissement) || 0,
  }), [f.montant, f.valeur_residuelle, f.duree_amortissement]);

  const close = () => { reset(); onClose(); };

  const submit = async () => {
    if (!f.libelle.trim() || !f.account_code.trim() || !f.montant) { toast.error('Intitulé, compte et montant requis'); return; }
    setSaving(true);
    try {
      const payload = {
        libelle: f.libelle, account_code: f.account_code, section_id: f.section_id || null,
        montant: parseFloat(f.montant) || 0, date_prevue: f.date_prevue || null,
        duree_amortissement: parseInt(f.duree_amortissement) || 0, methode: f.methode,
        valeur_residuelle: parseFloat(f.valeur_residuelle) || 0, justification: f.justification || null,
      };
      if (editing) {
        await updateCapexRequest(adapter, editing.id, payload);
        toast.success('Demande CAPEX mise à jour');
      } else {
        const fy = await getActiveFiscalYear(adapter);
        await createCapexRequest(adapter, { fiscalYearId: fy?.id || null, ...payload });
        toast.success('Demande CAPEX créée');
      }
      reset(); onCreated?.(); onClose();
    } catch (e: any) { toast.error('Échec : ' + (e?.message || 'erreur')); }
    finally { setSaving(false); }
  };

  const field = (label: string, node: React.ReactNode) => (
    <div><label className="text-[11px] text-gray-500 block mb-1">{label}</label>{node}</div>
  );
  const inputCls = 'w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm disabled:bg-gray-50 disabled:text-gray-500';

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close(); }} containerClassName="max-w-2xl">
      <DialogContent>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center">
              {readOnly ? <Eye className="w-5 h-5 text-[var(--color-primary)]" /> : isEdit ? <Pencil className="w-5 h-5 text-[var(--color-primary)]" /> : <Package className="w-5 h-5 text-[var(--color-primary)]" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">{readOnly ? 'Demande CAPEX (consultation)' : isEdit ? 'Modifier la demande CAPEX' : "Demande d'investissement (CAR)"}</h3>
              <p className="text-xs text-gray-500">Capital Appropriation Request — projet / bien immobilisé, avec amortissement</p>
            </div>
          </div>
          <button onClick={close} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
        </div>

        {readOnly && <div className="mb-3 bg-amber-50 text-amber-800 px-3 py-2 rounded-lg text-xs">Les fonds sont déjà engagés : cette demande est en lecture seule.</div>}

        <div className="grid grid-cols-2 gap-3">
          {field('Intitulé du projet / bien *', <input value={f.libelle} disabled={readOnly} onChange={e => setF(s => ({ ...s, libelle: e.target.value }))} placeholder="ex. Groupe électrogène 250 kVA" className={inputCls} />)}
          {field('Compte immobilisation (classe 2) *', <>
            <input list="capex-accounts" value={f.account_code} disabled={readOnly} onChange={e => setF(s => ({ ...s, account_code: e.target.value }))} placeholder="ex. 2411" className={inputCls + ' font-mono'} />
            {accountName(f.account_code) && <div className="text-[10px] text-gray-400 truncate">{accountName(f.account_code)}</div>}
            <datalist id="capex-accounts">{accounts.map(a => <option key={a.code} value={a.code}>{a.code} — {a.name}</option>)}</datalist>
          </>)}
          {field('Montant (FCFA) *', <input type="number" value={f.montant} disabled={readOnly} onChange={e => setF(s => ({ ...s, montant: e.target.value }))} placeholder="0" className={inputCls} />)}
          {field("Date d'acquisition prévue", <input type="date" value={f.date_prevue} disabled={readOnly} onChange={e => setF(s => ({ ...s, date_prevue: e.target.value }))} className={inputCls} />)}
          {field("Durée d'amortissement (ans)", <input type="number" value={f.duree_amortissement} disabled={readOnly} onChange={e => setF(s => ({ ...s, duree_amortissement: e.target.value }))} placeholder="ex. 5" className={inputCls} />)}
          {field('Méthode', <select value={f.methode} disabled={readOnly} onChange={e => setF(s => ({ ...s, methode: e.target.value as any }))} className={inputCls}><option value="lineaire">Linéaire</option><option value="degressif">Dégressif</option></select>)}
          {field('Valeur résiduelle', <input type="number" value={f.valeur_residuelle} disabled={readOnly} onChange={e => setF(s => ({ ...s, valeur_residuelle: e.target.value }))} placeholder="0" className={inputCls} />)}
          {field('Section / Centre', <select value={f.section_id} disabled={readOnly} onChange={e => setF(s => ({ ...s, section_id: e.target.value }))} className={inputCls}><option value="">— Aucune —</option>{sections.map(s => <option key={s.id} value={s.id}>{s.code} · {s.libelle}</option>)}</select>)}
        </div>
        <div className="mt-3">{field('Justification', <textarea value={f.justification} disabled={readOnly} onChange={e => setF(s => ({ ...s, justification: e.target.value }))} rows={2} placeholder="Motivation de l'investissement, ROI attendu…" className={inputCls} />)}</div>

        {/* Aperçu amortissement */}
        <div className="mt-4 bg-gray-50 rounded-lg p-3 flex items-center justify-between text-sm">
          <span className="text-gray-600">Dotation annuelle d'amortissement ({f.methode})</span>
          <span className="font-semibold text-[var(--color-primary)]">{formatCurrency(dotation)}{(parseInt(f.duree_amortissement) || 0) > 0 && <span className="text-xs text-gray-400 font-normal"> /an × {f.duree_amortissement} ans</span>}</span>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={close} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">{readOnly ? 'Fermer' : 'Annuler'}</button>
          {!readOnly && <button onClick={submit} disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"><CheckCircle className="w-4 h-4" />{saving ? 'Envoi…' : isEdit ? 'Enregistrer' : 'Créer la demande'}</button>}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CapexRequestModal;
