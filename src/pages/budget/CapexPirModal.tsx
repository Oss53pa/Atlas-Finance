/**
 * CapexPirModal — Post-Implementation Review d'une CAR clôturée (CDC §8 ⑧).
 * Coût final vs business case, écart budget, VAN ex-post, leçons capitalisées.
 */
import React, { useEffect, useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../utils/formatters';
import { Dialog, DialogContent } from '../../components/ui/Dialog';
import { getPir, savePir } from '../../features/budget/services/capexCarService';
import type { CapexRequest } from '../../features/budget/services/budgetService';
import { ClipboardCheck, X, Save } from 'lucide-react';

interface Props { open: boolean; request: CapexRequest | null; onClose: () => void; onSaved?: () => void }

const CapexPirModal: React.FC<Props> = ({ open, request, onClose, onSaved }) => {
  const { adapter } = useData();
  const { toast } = useToast();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ cout_final: '', van_ex_post: '', lecons: '' });

  useEffect(() => {
    if (!open || !request) return;
    (async () => {
      const existing = await getPir(adapter, request.id).catch(() => null);
      setF({
        cout_final: existing?.cout_final != null ? String(existing.cout_final) : (request.montant_utilise ? String(request.montant_utilise) : ''),
        van_ex_post: existing?.van_ex_post != null ? String(existing.van_ex_post) : (request.van != null ? String(request.van) : ''),
        lecons: existing?.lecons || '',
      });
    })();
  }, [open, request, adapter]);

  if (!request) return null;
  const coutFinal = parseFloat(f.cout_final) || 0;
  // Enveloppe AUTORISÉE = montant approuvé + provision pour aléas (contingence). Un
  // dépassement absorbé par la contingence ne doit pas être compté comme un écart.
  const enveloppeAutorisee = request.montant * (1 + (((request as any).contingence_pct || 0) / 100));
  const ecartBudget = coutFinal - enveloppeAutorisee;

  const submit = async () => {
    setSaving(true);
    try {
      await savePir(adapter, request.id, {
        cout_final: coutFinal, ecart_budget: ecartBudget, van_ex_post: parseFloat(f.van_ex_post) || 0,
        lecons: f.lecons, reviewedBy: user?.id || null,
      });
      toast.success('PIR enregistrée'); onSaved?.(); onClose();
    } catch (e: any) { toast.error(e?.message || 'Erreur'); }
    finally { setSaving(false); }
  };

  const inputCls = 'w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm';
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }} containerClassName="max-w-xl">
      <DialogContent>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 flex items-center justify-center"><ClipboardCheck className="w-5 h-5 text-[var(--color-primary)]" /></div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Post-Implementation Review</h3>
              <p className="text-xs text-gray-500">{request.libelle} · enveloppe {formatCurrency(request.montant)}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-[11px] text-gray-500 block mb-1">Coût final réel (FCFA)</label><input type="number" value={f.cout_final} onChange={e => setF(s => ({ ...s, cout_final: e.target.value }))} className={inputCls} /></div>
          <div><label className="text-[11px] text-gray-500 block mb-1">VAN ex-post (FCFA)</label><input type="number" value={f.van_ex_post} onChange={e => setF(s => ({ ...s, van_ex_post: e.target.value }))} className={inputCls} /></div>
        </div>
        <div className="mt-3 bg-gray-50 rounded-lg p-3 flex items-center justify-between text-sm">
          <span className="text-gray-600">Écart vs budget approuvé</span>
          <span className={`font-semibold ${ecartBudget <= 0 ? 'text-green-600' : 'text-red-600'}`}>{ecartBudget >= 0 ? '+' : ''}{formatCurrency(ecartBudget)}</span>
        </div>
        <div className="mt-3"><label className="text-[11px] text-gray-500 block mb-1">Leçons capitalisées</label><textarea value={f.lecons} onChange={e => setF(s => ({ ...s, lecons: e.target.value }))} rows={3} placeholder="Ce qui a marché, les dérives, recommandations pour les prochains projets…" className={inputCls} /></div>

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Fermer</button>
          <button onClick={submit} disabled={saving} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"><Save className="w-4 h-4" />{saving ? '…' : 'Enregistrer la PIR'}</button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CapexPirModal;
