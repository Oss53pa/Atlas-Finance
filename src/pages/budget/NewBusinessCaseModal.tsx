/**
 * NewBusinessCaseModal — création rapide d'un Business Case CAPEX, en MODALE
 * au-dessus du Portefeuille (la liste des business cases existants reste visible
 * derrière). Une fois créé, redirige vers le stepper complet (/capex/bc/:id)
 * pour le remplissage détaillé (coûts, cashflows, risques, évaluation).
 */
import React, { useState } from 'react';
import { Dialog, DialogContent } from '../../components/ui/Dialog';
import AccountCombobox from '../../components/common/AccountCombobox';
import { useAccountNames } from '../../hooks/useAccountNames';
import { createCapexRequest } from '../../features/budget/services/budgetService';
import { updateBcFields } from '../../features/budget/services/capexBcService';
import { useData } from '../../contexts/DataContext';
import { Layers, Loader2, Plus, X } from 'lucide-react';

const INP = 'w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-light)]';

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block"><span className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">{label}</span>{children}</label>
);

interface Props { open: boolean; onClose: () => void; onCreated: (id: string) => void }

const NewBusinessCaseModal: React.FC<Props> = ({ open, onClose, onCreated }) => {
  const { adapter } = useData();
  const { label: accountLabel } = useAccountNames();
  const [libelle, setLibelle] = useState('');
  const [account, setAccount] = useState('');
  const [urgence, setUrgence] = useState(false);
  const [sousMotif, setSousMotif] = useState('continuite_exploitation');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => { setLibelle(''); setAccount(''); setUrgence(false); setSousMotif('continuite_exploitation'); setError(null); };
  const close = () => { if (!busy) { reset(); onClose(); } };

  const create = async () => {
    setError(null);
    if (!libelle.trim()) { setError('Intitulé obligatoire.'); return; }
    setBusy(true);
    try {
      const newId = await createCapexRequest(adapter, {
        libelle, account_code: (account || '2').trim(), montant: 0,
        duree_amortissement: 5, methode: 'lineaire',
      });
      await updateBcFields(adapter, newId, urgence
        ? { statut: 'brouillon', urgence: true, urgence_sous_motif: sousMotif, categorie: 'urgence' }
        : { statut: 'brouillon' });
      reset();
      onCreated(newId);
    } catch (e: any) { setError(e?.message || 'Échec de la création'); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close(); }} containerClassName="max-w-lg">
      <DialogContent>
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2"><Layers className="w-5 h-5 text-[var(--color-primary)]" /> Nouveau Business Case</h3>
          <button onClick={close} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          {error && <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700">{error}</div>}
          <Field label="Intitulé de l'investissement">
            <input value={libelle} onChange={(e) => setLibelle(e.target.value)} className={INP} placeholder="Extension entrepôt Nord" disabled={busy} />
          </Field>
          <Field label="Compte d'immobilisation (classe 2)">
            <AccountCombobox value={account} onChange={setAccount} classPrefix="2" placeholder="2313" disabled={busy} inputClassName="w-full" />
            <span className="block mt-1 text-xs text-[var(--color-text-tertiary)] truncate" title={accountLabel(account)}>
              {account ? (accountLabel(account) || 'Compte hors référentiel') : 'Sélectionnez un compte'}
            </span>
          </Field>
          <label className="inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
            <input type="checkbox" checked={urgence} onChange={(e) => setUrgence(e.target.checked)} disabled={busy} /> CAPEX d'urgence (fast-track)
          </label>
          {urgence && (
            <Field label="Sous-motif d'urgence (obligatoire)">
              <select value={sousMotif} onChange={(e) => setSousMotif(e.target.value)} className={INP} disabled={busy}>
                {['securite_personnes', 'continuite_exploitation', 'injonction_reglementaire', 'sinistre'].map((m) => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
              </select>
            </Field>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={close} disabled={busy} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">Annuler</button>
          <button onClick={create} disabled={busy} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Créer le brouillon
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewBusinessCaseModal;
