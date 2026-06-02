/**
 * CompanyOnboardingModal — modal de création d'entreprise au PREMIER accès.
 *
 * S'affiche au-dessus de l'accueil Atlas FnA pour un admin dont l'entreprise
 * n'a pas encore été configurée (aucun `admin_company_legal`). Capture
 * quelques champs essentiels ; le reste se complète ensuite dans l'Espace
 * Admin → « Société & Comptabilité ». Les données sont écrites dans la source
 * canonique (`settings.admin_company_legal` + `admin_company_devise` + exercice),
 * donc immédiatement visibles dans l'app et éditables dans le détail.
 */
import React, { useMemo, useState } from 'react';
import { Building2, ArrowRight, Loader2, ShieldCheck, X } from 'lucide-react';
import { toast } from 'sonner';
import { useData } from '../../contexts/DataContext';
import { saveCompanyOnboarding } from '../../services/company/companyOnboardingService';

interface Props {
  open: boolean;
  /** Reporter à plus tard (la modal réapparaîtra au prochain accès tant que non configurée). */
  onDismiss: () => void;
  /** Entreprise créée — reçoit la raison sociale enregistrée. */
  onSaved: (raisonSociale: string) => void;
}

const OHADA_COUNTRIES = [
  "Cote d'Ivoire", 'Cameroun', 'Senegal', 'Gabon', 'Congo', 'Tchad', 'RCA',
  'Mali', 'Burkina Faso', 'Niger', 'Togo', 'Benin', 'Guinee Equatoriale',
  'Comores', 'Guinee', 'Guinee-Bissau', 'RDC',
];

const FORMES_JURIDIQUES = ['SARL', 'SARLU', 'SA', 'SAS', 'SUARL', 'SNC', 'SCS', 'GIE', 'Entreprise individuelle', 'ONG / Association', 'Autre'];

const DEVISES = [
  { value: 'XOF', label: 'FCFA — Franc CFA (UEMOA · XOF)' },
  { value: 'XAF', label: 'FCFA — Franc CFA (CEMAC · XAF)' },
  { value: 'EUR', label: '€ — Euro (EUR)' },
  { value: 'USD', label: '$ — Dollar US (USD)' },
];

const labelCls = 'block text-sm font-medium mb-1';
const inputCls = 'w-full px-3 py-2.5 border rounded-xl text-sm outline-none transition-colors';

const CompanyOnboardingModal: React.FC<Props> = ({ open, onDismiss, onSaved }) => {
  const { adapter } = useData();
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const [raisonSociale, setRaisonSociale] = useState('');
  const [formeJuridique, setFormeJuridique] = useState('SARL');
  const [pays, setPays] = useState("Cote d'Ivoire");
  const [devise, setDevise] = useState('XOF');
  const [exerciceDebut, setExerciceDebut] = useState(`${currentYear}-01-01`);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);

  if (!open) return null;

  const nameInvalid = touched && !raisonSociale.trim();

  const handleSubmit = async () => {
    if (!raisonSociale.trim()) { setTouched(true); toast.error('La raison sociale est obligatoire'); return; }
    setSaving(true);
    try {
      await saveCompanyOnboarding(adapter, { raisonSociale, formeJuridique, pays, devise, exerciceDebut });
      toast.success('Entreprise créée — vous pourrez compléter les détails dans l\'Espace Admin.');
      onSaved(raisonSociale.trim());
    } catch (err) {
      console.error('[CompanyOnboardingModal] save error:', err);
      toast.error('Erreur lors de la création de l\'entreprise. Réessayez.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(15, 23, 30, 0.55)', backdropFilter: 'blur(3px)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div
        className="w-full max-w-lg overflow-hidden anim-rise"
        style={{
          background: 'var(--color-surface, #fff)',
          borderRadius: 20,
          boxShadow: '0 24px 60px -12px rgba(0,0,0,0.35)',
          border: '1px solid var(--color-border, #e5e7eb)',
        }}
      >
        {/* Filet gold + en-tête */}
        <div aria-hidden style={{ height: 3, background: 'linear-gradient(90deg, #F2A93B, #E89A2E, #C77E2C)' }} />
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-3">
          <div className="flex items-start gap-3 min-w-0">
            <span
              className="shrink-0 inline-flex items-center justify-center"
              style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(232,154,46,0.14)', color: '#C77E2C' }}
            >
              <Building2 className="w-5 h-5" strokeWidth={1.7} />
            </span>
            <div className="min-w-0">
              <h2 id="onboarding-title" className="font-bold" style={{ fontSize: '1.125rem', letterSpacing: '-0.01em', color: 'var(--color-text-primary, #171717)' }}>
                Bienvenue — créons votre entreprise
              </h2>
              <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-tertiary, #6b7280)' }}>
                Quelques informations pour démarrer. Vous compléterez le détail dans votre Espace Admin.
              </p>
            </div>
          </div>
          <button
            onClick={onDismiss}
            disabled={saving}
            className="shrink-0 p-1.5 rounded-lg transition-colors hover:bg-[var(--color-surface-hover,#f3f4f6)] disabled:opacity-40"
            aria-label="Reporter à plus tard"
          >
            <X className="w-4 h-4" style={{ color: 'var(--color-text-tertiary, #6b7280)' }} />
          </button>
        </div>

        {/* Formulaire */}
        <div className="px-6 pb-2 space-y-4" style={{ color: 'var(--color-text-primary, #171717)' }}>
          {/* Raison sociale */}
          <div>
            <label htmlFor="ob-raison" className={labelCls}>
              Raison sociale <span style={{ color: '#C0322B' }}>*</span>
            </label>
            <input
              id="ob-raison"
              value={raisonSociale}
              onChange={(e) => setRaisonSociale(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="Ex. Société Nouvelle SARL"
              autoComplete="off"
              className={inputCls}
              style={{ borderColor: nameInvalid ? '#C0322B' : 'var(--color-border, #d1d5db)' }}
            />
            {nameInvalid && <p className="text-xs mt-1" style={{ color: '#C0322B' }}>Champ obligatoire.</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Forme juridique */}
            <div>
              <label htmlFor="ob-forme" className={labelCls}>Forme juridique</label>
              <select
                id="ob-forme"
                value={formeJuridique}
                onChange={(e) => setFormeJuridique(e.target.value)}
                className={inputCls}
                style={{ borderColor: 'var(--color-border, #d1d5db)', background: 'var(--color-surface, #fff)' }}
              >
                {FORMES_JURIDIQUES.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>

            {/* Pays */}
            <div>
              <label htmlFor="ob-pays" className={labelCls}>Pays (OHADA)</label>
              <select
                id="ob-pays"
                value={pays}
                onChange={(e) => setPays(e.target.value)}
                className={inputCls}
                style={{ borderColor: 'var(--color-border, #d1d5db)', background: 'var(--color-surface, #fff)' }}
              >
                {OHADA_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Devise */}
            <div>
              <label htmlFor="ob-devise" className={labelCls}>Devise</label>
              <select
                id="ob-devise"
                value={devise}
                onChange={(e) => setDevise(e.target.value)}
                className={inputCls}
                style={{ borderColor: 'var(--color-border, #d1d5db)', background: 'var(--color-surface, #fff)' }}
              >
                {DEVISES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>

            {/* Début d'exercice */}
            <div>
              <label htmlFor="ob-exercice" className={labelCls}>Début d'exercice</label>
              <input
                id="ob-exercice"
                type="date"
                value={exerciceDebut}
                onChange={(e) => setExerciceDebut(e.target.value)}
                className={inputCls}
                style={{ borderColor: 'var(--color-border, #d1d5db)' }}
              />
            </div>
          </div>

          <p className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-text-tertiary, #6b7280)' }}>
            <ShieldCheck className="w-3.5 h-3.5" strokeWidth={1.6} />
            Conforme SYSCOHADA révisé 2017 · données enregistrées en sécurité.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 mt-2" style={{ borderTop: '1px solid var(--color-border-light, #f3f4f6)' }}>
          <button
            onClick={onDismiss}
            disabled={saving}
            className="text-sm font-medium px-3 py-2 rounded-lg transition-colors hover:bg-[var(--color-surface-hover,#f3f4f6)] disabled:opacity-40"
            style={{ color: 'var(--color-text-secondary, #4b5563)' }}
          >
            Compléter plus tard
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="press flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60"
            style={{ background: 'var(--color-primary, #235A6E)', color: 'var(--color-text-inverse, #fff)', boxShadow: 'var(--shadow-obsidian, 0 6px 16px -6px rgba(0,0,0,0.3))' }}
          >
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Création…</>
              : <>Créer mon entreprise <ArrowRight className="w-4 h-4" strokeWidth={1.8} /></>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompanyOnboardingModal;
