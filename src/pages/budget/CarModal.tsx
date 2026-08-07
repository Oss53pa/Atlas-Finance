/**
 * CarModal — Capital Appropriation Request (objet distinct, CDC §8 ⑤⑥).
 *
 * Émise APRÈS validation du business case et inscription au budget CAPEX.
 * Approprie (débloque) tout ou partie de l'enveloppe budgétée pour engager la
 * dépense. Plusieurs CAR possibles par business case (somme ≤ enveloppe).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../utils/formatters';
import { Dialog, DialogContent } from '../../components/ui/Dialog';
import { setCapexStatut, setCapexUtilise, type CapexRequest } from '../../features/budget/services/budgetService';
import { listCars, createCar, deleteCar, type Car } from '../../features/budget/services/capexCarService';
import { Landmark, X, CheckCircle, Trash2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface Props { open: boolean; request: CapexRequest | null; onClose: () => void; onSaved?: () => void }

const CarModal: React.FC<Props> = ({ open, request, onClose, onSaved }) => {
  const { adapter } = useData();
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [cars, setCars] = useState<Car[]>([]);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ reference: '', montant: '', date: '', justification: '' });

  const load = async () => {
    if (!request) return;
    try { setCars(await listCars(adapter, request.id)); } catch { /* ignore */ }
  };
  useEffect(() => { if (open && request) { load(); setF({ reference: '', montant: '', date: '', justification: '' }); } /* eslint-disable-next-line */ }, [open, request]);

  const dejaApproprie = useMemo(() => cars.reduce((s, c) => s + c.montant_approprie, 0), [cars]);
  const restant = (request?.montant || 0) - dejaApproprie;

  if (!request) return null;

  const submit = async () => {
    const montant = parseFloat(f.montant) || 0;
    if (montant <= 0) { toast.error(t('carModal.amountRequired')); return; }
    if (montant > restant) { toast.error(t('carModal.exceedsEnvelope', { amount: formatCurrency(restant) })); return; }
    setSaving(true);
    try {
      await createCar(adapter, {
        requestId: request.id, reference: f.reference || null, montant_approprie: montant,
        date_appropriation: f.date || null, justification: f.justification || null, createdBy: user?.id || null,
      });
      // L'émission d'une CAR rend les fonds disponibles (workflow business case).
      if (request.statut === 'approuve') await setCapexStatut(adapter, request.id, 'fonds_disponibles');
      // Réconcilier `montant_utilise` sur capex_requests = total approprié (sert au PIR/clôture).
      await setCapexUtilise(adapter, request.id, dejaApproprie + montant).catch(() => {});
      toast.success(t('carModal.carIssued'));
      onSaved?.(); load();
      setF({ reference: '', montant: '', date: '', justification: '' });
    } catch (e: any) { toast.error(e?.message || t('carModal.error')); }
    finally { setSaving(false); }
  };

  const inputCls = 'w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm';
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }} containerClassName="max-w-2xl">
      <DialogContent>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center"><Landmark className="w-5 h-5 text-[var(--color-primary)]" /></div>
            <div>
              <h3 className="text-base font-bold text-gray-900">{t('carModal.title')}</h3>
              <p className="text-xs text-gray-500">{t('carModal.subtitle', { name: request.libelle })}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
        </div>

        {/* Enveloppe */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-gray-50 rounded-lg p-3"><div className="text-[11px] text-gray-500">{t('carModal.budgetedEnvelope')}</div><div className="font-semibold text-gray-900">{formatCurrency(request.montant)}</div></div>
          <div className="bg-gray-50 rounded-lg p-3"><div className="text-[11px] text-gray-500">{t('carModal.alreadyAppropriated')}</div><div className="font-semibold text-blue-700">{formatCurrency(dejaApproprie)}</div></div>
          <div className="bg-gray-50 rounded-lg p-3"><div className="text-[11px] text-gray-500">{t('carModal.remainingToAppropriate')}</div><div className={`font-semibold ${restant > 0 ? 'text-green-700' : 'text-gray-400'}`}>{formatCurrency(restant)}</div></div>
        </div>

        {/* Nouvelle CAR */}
        {restant > 0 && (
          <div className="border border-[var(--color-border)] rounded-lg p-3 mb-4">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[11px] text-gray-500 block mb-1">{t('carModal.carReference')}</label><input value={f.reference} onChange={e => setF(s => ({ ...s, reference: e.target.value }))} placeholder={t('carModal.carReferencePlaceholder')} className={inputCls + ' font-mono'} /></div>
              <div><label className="text-[11px] text-gray-500 block mb-1">{t('carModal.amountToAppropriate')}</label><input type="number" value={f.montant} onChange={e => setF(s => ({ ...s, montant: e.target.value }))} placeholder={String(restant)} className={inputCls} /></div>
              <div><label className="text-[11px] text-gray-500 block mb-1">{t('carModal.appropriationDate')}</label><input type="date" value={f.date} onChange={e => setF(s => ({ ...s, date: e.target.value }))} className={inputCls} /></div>
              <div><label className="text-[11px] text-gray-500 block mb-1">{t('carModal.justification')}</label><input value={f.justification} onChange={e => setF(s => ({ ...s, justification: e.target.value }))} placeholder={t('carModal.justificationPlaceholder')} className={inputCls} /></div>
            </div>
            <div className="flex justify-end mt-3">
              <button onClick={submit} disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"><CheckCircle className="w-4 h-4" />{saving ? '…' : t('carModal.issueCar')}</button>
            </div>
          </div>
        )}

        {/* CAR émises */}
        <div className="text-xs font-semibold text-gray-600 mb-2">{t('carModal.issuedCars', { count: String(cars.length) })}</div>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {cars.length === 0 && <div className="text-sm text-gray-400 py-4 text-center">{t('carModal.noCar')}</div>}
          {cars.map(c => (
            <div key={c.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
              <div><span className="font-mono text-gray-500">{c.reference || '—'}</span> <span className="text-gray-400 text-xs">{c.date_appropriation || ''}</span></div>
              <div className="flex items-center gap-3">
                <span className="font-medium text-gray-900">{formatCurrency(c.montant_approprie)}</span>
                <button onClick={() => deleteCar(adapter, c.id).then(async () => { await setCapexUtilise(adapter, request.id, Math.max(0, dejaApproprie - c.montant_approprie)).catch(() => {}); load(); onSaved?.(); })} className="text-gray-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">{t('carModal.close')}</button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CarModal;
