// @ts-nocheck
import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Calculator, Eye, EyeOff, Building, User, Mail, Lock, Globe, ChevronRight, ChevronLeft, CheckCircle, Phone, Shield, Zap, Play } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import DemoModal from '../../components/demo/DemoModal';

const COUNTRIES = [
  { code: 'CI', name: "Côte d'Ivoire", currency: 'XOF' },
  { code: 'SN', name: 'Sénégal', currency: 'XOF' },
  { code: 'CM', name: 'Cameroun', currency: 'XAF' },
  { code: 'ML', name: 'Mali', currency: 'XOF' },
  { code: 'BF', name: 'Burkina Faso', currency: 'XOF' },
  { code: 'BJ', name: 'Bénin', currency: 'XOF' },
  { code: 'TG', name: 'Togo', currency: 'XOF' },
  { code: 'NE', name: 'Niger', currency: 'XOF' },
  { code: 'GN', name: 'Guinée', currency: 'GNF' },
  { code: 'GA', name: 'Gabon', currency: 'XAF' },
  { code: 'CG', name: 'Congo-Brazzaville', currency: 'XAF' },
  { code: 'CD', name: 'RD Congo', currency: 'CDF' },
  { code: 'TD', name: 'Tchad', currency: 'XAF' },
  { code: 'CF', name: 'Centrafrique', currency: 'XAF' },
  { code: 'GQ', name: 'Guinée Équatoriale', currency: 'XAF' },
  { code: 'KM', name: 'Comores', currency: 'KMF' },
  { code: 'GW', name: 'Guinée-Bissau', currency: 'XOF' },
];

const LEGAL_FORMS = ['SARL', 'SA', 'SAS', 'SUARL', 'EI', 'ONG', 'Association', 'Autre'];

const STEPS = [
  { id: 1, label: 'Entreprise' },
  { id: 2, label: 'Administrateur' },
  { id: 3, label: 'Confirmation' },
];

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');

  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);

  const [form, setForm] = useState({
    // Étape 1 — Entreprise
    companyName: '', rccm: '', country: 'CI', currency: 'XOF', legalForm: 'SARL',
    // Étape 2 — Admin
    firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '',
  });

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const selectedCountry = COUNTRIES.find(c => c.code === form.country);

  const validateStep = (s: number): boolean => {
    setError('');
    if (s === 1 && !inviteToken) {
      if (!form.companyName) { setError('La raison sociale est obligatoire'); return false; }
      if (!form.rccm) { setError('Le RCCM / numéro fiscal est obligatoire'); return false; }
    }
    if (s === 2) {
      if (!form.firstName || !form.lastName) { setError('Prénom et nom sont obligatoires'); return false; }
      if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) { setError('Email invalide'); return false; }
      if (form.password.length < 8) { setError('8 caractères minimum'); return false; }
      if (!/[A-Z]/.test(form.password)) { setError('Le mot de passe doit contenir une majuscule'); return false; }
      if (!/[0-9]/.test(form.password)) { setError('Le mot de passe doit contenir un chiffre'); return false; }
      if (form.password !== form.confirmPassword) { setError('Les mots de passe ne correspondent pas'); return false; }
    }
    return true;
  };

  const nextStep = () => { if (validateStep(step)) setStep(s => Math.min(s + 1, 3)); };
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    if (!validateStep(2)) return;
    setLoading(true);
    setError('');

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: `${form.firstName} ${form.lastName}`,
            first_name: form.firstName,
            last_name: form.lastName,
            phone: form.phone,
            organization_name: form.companyName,
            company_name: form.companyName,
            rccm: form.rccm,
            country: form.country,
            currency: form.currency,
            legal_form: form.legalForm,
            invite_token: inviteToken || undefined,
          },
        },
      });

      if (signUpError) throw new Error(signUpError.message);
      navigate('/verify-email', { state: { email: form.email } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const Input = ({ label, icon: Icon, ...props }: any) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="relative">
        {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />}
        <input {...props} className={`w-full ${Icon ? 'pl-11' : 'pl-4'} pr-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-[#171717] focus:border-transparent transition-shadow ${props.className || ''}`} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fafafa] flex">
      {/* Left — Branding */}
      <div className="hidden lg:flex lg:w-2/5 bg-[#171717] text-white flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-3 mb-16">
            <span className="atlas-brand text-3xl">Atlas Studio</span>
          </div>
          <h2 className="text-3xl font-bold leading-tight mb-2 text-white">
            <span className="atlas-brand text-4xl" style={{ color: '#C4A235' }}>Atlas Finance</span>
          </h2>
          <p className="text-lg text-white/80 font-medium mb-4">
            Créez votre espace de gestion en 2 minutes
          </p>
          <p className="text-gray-400 text-base leading-relaxed mb-8">
            Comptabilité SYSCOHADA, liasse fiscale, gestion documentaire — tout ce dont votre entreprise a besoin, en un seul endroit.
          </p>

          <div className="space-y-5 mb-10">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                <Calculator className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Comptabilité SYSCOHADA</h4>
                <p className="text-xs text-gray-400 mt-0.5">Écritures, grand livre, balance, bilan, compte de résultat — conforme au référentiel révisé 2017.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Fiscalité 17 pays OHADA</h4>
                <p className="text-xs text-gray-400 mt-0.5">TVA, IS, IRPP, retenues à la source. Calendrier fiscal automatique avec alertes.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">IA PROPH3T intégrée</h4>
                <p className="text-xs text-gray-400 mt-0.5">Assistant comptable intelligent — calculs fiscaux, détection d'anomalies, 108 contrôles d'audit.</p>
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowDemoModal(true)}
          className="w-full py-3 border border-white/20 rounded-xl text-sm font-medium text-white hover:bg-white/10 transition-colors flex items-center justify-center gap-2 mb-8"
        >
          <Play className="w-4 h-4" /> Voir la démo
        </button>

        <div className="space-y-3">
          {['Essai gratuit 14 jours', 'Aucune carte bancaire requise', 'Support 7j/7'].map((t, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
              <span className="text-gray-300">{t}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right — Formulaire */}
      <div className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-20 py-8">
        {/* Stepper */}
        <div className="flex items-center gap-2 mb-8 max-w-lg">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <div className={`flex items-center gap-2 ${step >= s.id ? 'text-[#171717]' : 'text-gray-300'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step > s.id ? 'bg-green-500 text-white' : step === s.id ? 'bg-[#171717] text-white' : 'bg-gray-200 text-gray-400'
                }`}>
                  {step > s.id ? <CheckCircle className="w-4 h-4" /> : s.id}
                </div>
                <span className="text-sm font-medium hidden sm:inline">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 ${step > s.id ? 'bg-green-500' : 'bg-gray-200'}`} />}
            </React.Fragment>
          ))}
        </div>

        <div className="max-w-lg">
          {error && <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}

          {/* Étape 1 — Entreprise */}
          {step === 1 && !inviteToken && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold text-[#171717] mb-1">Votre entreprise</h2>
                <p className="text-gray-500 text-sm">Informations sur votre société</p>
              </div>
              <Input label="Raison sociale" icon={Building} value={form.companyName} onChange={(e: any) => set('companyName', e.target.value)} placeholder="Ma Société SARL" />
              <Input label="RCCM / Numéro fiscal" value={form.rccm} onChange={(e: any) => set('rccm', e.target.value)} placeholder="CI-ABJ-2024-B-12345" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Pays</label>
                  <select value={form.country} onChange={e => { set('country', e.target.value); const c = COUNTRIES.find(x => x.code === e.target.value); if (c) set('currency', c.currency); }}
                    className="w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-[#171717]">
                    {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Forme juridique</label>
                  <select value={form.legalForm} onChange={e => set('legalForm', e.target.value)}
                    className="w-full px-4 py-3 border rounded-xl text-sm focus:ring-2 focus:ring-[#171717]">
                    {LEGAL_FORMS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500 flex items-center gap-2">
                <Globe className="w-4 h-4" /> Devise : <strong>{form.currency}</strong> (auto-détectée depuis le pays)
              </div>
            </div>
          )}

          {step === 1 && inviteToken && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold text-[#171717] mb-1">Invitation</h2>
                <p className="text-gray-500 text-sm">Vous avez été invité à rejoindre une équipe</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
                Vous allez créer votre compte et rejoindre automatiquement l'organisation qui vous a invité.
              </div>
            </div>
          )}

          {/* Étape 2 — Administrateur */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold text-[#171717] mb-1">Votre compte</h2>
                <p className="text-gray-500 text-sm">Vous serez l'administrateur principal</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Prénom" icon={User} value={form.firstName} onChange={(e: any) => set('firstName', e.target.value)} placeholder="Amadou" />
                <Input label="Nom" value={form.lastName} onChange={(e: any) => set('lastName', e.target.value)} placeholder="Diallo" />
              </div>
              <Input label="Email professionnel" icon={Mail} type="email" value={form.email} onChange={(e: any) => set('email', e.target.value)} placeholder="amadou@entreprise.com" />
              <Input label="Téléphone" icon={Phone} type="tel" value={form.phone} onChange={(e: any) => set('phone', e.target.value)} placeholder="+225 07 00 00 00" />
              <div className="relative">
                <Input label="Mot de passe" icon={Lock} type={form._showPw ? 'text' : 'password'} value={form.password} onChange={(e: any) => set('password', e.target.value)} placeholder="8 car. min, 1 maj., 1 chiffre" />
              </div>
              <Input label="Confirmer le mot de passe" icon={Lock} type="password" value={form.confirmPassword} onChange={(e: any) => set('confirmPassword', e.target.value)} placeholder="Retapez le mot de passe" />
            </div>
          )}

          {/* Étape 3 — Confirmation */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold text-[#171717] mb-1">Récapitulatif</h2>
                <p className="text-gray-500 text-sm">Vérifiez vos informations</p>
              </div>
              <div className="bg-white rounded-xl border divide-y">
                {!inviteToken && (
                  <div className="p-4">
                    <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Entreprise</div>
                    <div className="text-sm font-semibold text-[#171717]">{form.companyName}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {form.legalForm} · {selectedCountry?.name} · {form.currency} · RCCM: {form.rccm}
                    </div>
                  </div>
                )}
                <div className="p-4">
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Administrateur</div>
                  <div className="text-sm font-semibold text-[#171717]">{form.firstName} {form.lastName}</div>
                  <div className="text-xs text-gray-500 mt-1">{form.email} · {form.phone}</div>
                </div>
                <div className="p-4">
                  <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Plan</div>
                  <div className="text-sm text-[#171717]">Essai gratuit 14 jours — <strong>aucun paiement requis</strong></div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            {step > 1 ? (
              <button onClick={prevStep} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
                <ChevronLeft className="w-4 h-4" /> Retour
              </button>
            ) : <div />}

            {step < 3 ? (
              <button onClick={nextStep} className="px-6 py-3 bg-[#171717] text-white rounded-xl text-sm font-semibold hover:bg-[#333] flex items-center gap-1">
                Continuer <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={loading}
                className="px-8 py-3 bg-[#171717] text-white rounded-xl text-sm font-semibold hover:bg-[#333] disabled:opacity-50 flex items-center gap-2">
                {loading ? 'Création...' : 'Créer mon compte'}
              </button>
            )}
          </div>

          <p className="text-center text-sm text-gray-500 mt-8">
            Déjà un compte ? <Link to="/login" className="text-[#171717] font-semibold hover:underline">Se connecter</Link>
          </p>
        </div>
      </div>
      <DemoModal isOpen={showDemoModal} onClose={() => setShowDemoModal(false)} />
    </div>
  );
};

export default RegisterPage;
