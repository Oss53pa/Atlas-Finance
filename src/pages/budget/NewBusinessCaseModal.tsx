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
import { useLanguage } from '@/contexts/LanguageContext';

// Clés résolues au rendu : la liste est figée au chargement du module.
const URGENCE_KEY: Record<string, string> = {
  securite_personnes: 'newBusinessCase.reasonSafety',
  continuite_exploitation: 'newBusinessCase.reasonContinuity',
  injonction_reglementaire: 'newBusinessCase.reasonRegulatory',
  sinistre: 'newBusinessCase.reasonIncident',
};

const INP = 'w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-light)]';

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block"><span className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">{label}</span>{children}</label>
);

interface Props { open: boolean; onClose: () => void; onCreated: (id: string) => void }

const NewBusinessCaseModal: React.FC<Props> = ({ open, onClose, onCreated }) => {
  const { adapter } = useData();
  const { label: accountLabel } = useAccountNames();
  const { t } = useLanguage();
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
    if (!libelle.trim()) { setError(t('newBusinessCase.titleRequired')); return; }
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
    } catch (e: any) { setError(e?.message || t('newBusinessCase.createFailed')); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close(); }} containerClassName="max-w-lg">
      <DialogContent>
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2"><Layers className="w-5 h-5 text-[var(--color-primary)]" /> {t('newBusinessCase.title')}</h3>
          <button onClick={close} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          {error && <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700">{error}</div>}
          <Field label={t('newBusinessCase.investmentTitle')}>
            <input value={libelle} onChange={(e) => setLibelle(e.target.value)} className={INP} placeholder={t('newBusinessCase.investmentPlaceholder')} disabled={busy} />
          </Field>
          <Field label={t('newBusinessCase.assetAccount')}>
            <AccountCombobox value={account} onChange={setAccount} classPrefix="2" placeholder="2313" disabled={busy} inputClassName="w-full" />
            <span className="block mt-1 text-xs text-[var(--color-text-tertiary)] truncate" title={accountLabel(account)}>
              {account ? (accountLabel(account) || t('newBusinessCase.accountOffChart')) : t('newBusinessCase.selectAccount')}
            </span>
          </Field>
          <label className="inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
            <input type="checkbox" checked={urgence} onChange={(e) => setUrgence(e.target.checked)} disabled={busy} /> {t('newBusinessCase.emergencyCapex')}
          </label>
          {urgence && (
            <Field label={t('newBusinessCase.emergencyReason')}>
              <select value={sousMotif} onChange={(e) => setSousMotif(e.target.value)} className={INP} disabled={busy}>
                {Object.entries(URGENCE_KEY).map(([m, k]) => <option key={m} value={m}>{t(k)}</option>)}
              </select>
            </Field>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={close} disabled={busy} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">{t('newBusinessCase.cancel')}</button>
          <button onClick={create} disabled={busy} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} {t('newBusinessCase.createDraft')}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewBusinessCaseModal;
