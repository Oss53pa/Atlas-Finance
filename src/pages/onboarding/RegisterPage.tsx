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
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <Calculator className="w-5 h-5" />
            </div>
            <span className="atlas-brand text-3xl">Atlas Studio</span>
          </div>
          <h2 className="text-3xl font-bold leading-tight mb-4 text-white">
            Créez votre espace de gestion en 2 minutes
          </h2>
          <p className="text-gray-400 text-lg leading-relaxed mb-8">
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
      {/* ══════════ MODAL DEMO ══════════ */}
      {showDemoModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowDemoModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h3 className="text-xl font-bold text-[#141414]">
                  Découvrir {demoSolution === 'atlas-finance' ? 'Atlas Finance' : demoSolution === 'liass-pilot' ? "Liass'Pilot" : 'DocJourney'}
                </h3>
                <p className="text-sm text-gray-500 mt-1">Choisissez votre mode de découverte</p>
              </div>
              <button onClick={() => setShowDemoModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Solution selector */}
            <div className="px-6 pt-4 flex gap-2">
              {[
                { id: 'atlas-finance', label: 'Atlas Finance' },
                { id: 'liass-pilot', label: "Liass'Pilot" },
                { id: 'doc-journey', label: 'DocJourney' },
              ].map(s => (
                <button
                  key={s.id}
                  onClick={() => { setDemoSolution(s.id); setDemoTab('interactive'); }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    demoSolution === s.id ? 'bg-[#141414] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Demo mode tabs */}
            <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { id: 'interactive', icon: Monitor, title: 'Démos interactives', desc: 'Testez en conditions réelles', time: 'Illimité', badge: 'Populaire' },
                { id: 'guided', icon: Play, title: 'Visite guidée', desc: 'Tour rapide des modules', time: '2 min', badge: null },
                { id: 'tutorials', icon: Lightbulb, title: 'Tutoriels', desc: 'Pas à pas par fonctionnalité', time: '5-10 min', badge: null },
                { id: 'live', icon: Users, title: 'Démo guidée live', desc: 'Un expert en direct', time: '30 min', badge: null },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setDemoTab(opt.id)}
                  className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                    demoTab === opt.id ? 'border-[#141414] bg-gray-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {opt.badge && (
                    <span className="absolute -top-2 right-2 px-2 py-0.5 bg-[#141414] text-white text-[10px] font-bold rounded-full">{opt.badge}</span>
                  )}
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mb-3">
                    <opt.icon className="w-5 h-5 text-[#141414]" />
                  </div>
                  <h4 className="text-sm font-semibold text-[#141414]">{opt.title}</h4>
                  <p className="text-xs text-gray-500 mt-1">{opt.desc}</p>
                  <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                    <Clock className="w-3 h-3" /> {opt.time}
                  </div>
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="px-6 pb-6">
              {demoTab === 'interactive' && (
                <div className="space-y-4">
                  {(demoSolution === 'atlas-finance' ? [
                    { cat: 'Comptabilité', items: [
                      { title: 'Saisie d\'écritures comptables', desc: 'Créez des écritures avec contrôle débit = crédit automatique, multi-lignes, rattachement tiers et analytique.', route: '/accounting/entries', tags: ['SYSCOHADA', 'Multi-journaux'] },
                      { title: 'Grand Livre & Balance', desc: 'Consultez le grand livre par compte, par tiers, par période. Balance générale avec soldes d\'ouverture et de clôture.', route: '/accounting/general-ledger', tags: ['Filtres avancés', 'Export'] },
                      { title: 'Plan comptable SYSCOHADA', desc: 'Arborescence complète classes 1 à 9, recherche par code ou libellé, ajout de sous-comptes personnalisés.', route: '/accounting/chart-of-accounts', tags: ['OHADA 2017', 'Personnalisable'] },
                      { title: 'Lettrage automatique', desc: 'Rapprochement automatique des comptes clients 411 et fournisseurs 401 par montant, référence et somme.', route: '/accounting/lettrage-auto', tags: ['4 algorithmes', 'Comptes 40x/41x'] },
                    ]},
                    { cat: 'États Financiers', items: [
                      { title: 'Bilan SYSCOHADA', desc: 'Bilan actif/passif avec totaux calculés en temps réel, comparaison N/N-1, drill-down par compte.', route: '/financial-statements/balance', tags: ['Temps réel', 'Drill-down'] },
                      { title: 'Compte de Résultat', desc: 'Produits classes 7, charges classes 6, SIG cascade (marge commerciale → résultat net), évolution mensuelle.', route: '/financial-statements/income', tags: ['SIG', 'Mensuel'] },
                      { title: 'TAFIRE & Flux de Trésorerie', desc: 'Tableau des flux méthode directe et indirecte, CAF, variation BFR, trésorerie début/fin d\'exercice.', route: '/financial-statements/cash-flow', tags: ['Méthode directe', 'Méthode indirecte'] },
                      { title: 'Ratios financiers', desc: '20+ ratios : autonomie financière, liquidité, ROE, rotation stocks, couverture charges financières.', route: '/accounting/ratios', tags: ['20+ ratios', 'Benchmarks'] },
                    ]},
                    { cat: 'Trésorerie', items: [
                      { title: 'Comptes bancaires & Soldes', desc: 'Vue consolidée de tous vos comptes bancaires, soldes en temps réel, alertes de seuil.', route: '/treasury/accounts', tags: ['Multi-banques', 'Alertes'] },
                      { title: 'Rapprochement bancaire', desc: 'Rapprochement automatique relevé vs comptabilité, identification des écarts, pointage manuel.', route: '/treasury/reconciliation', tags: ['Automatique', 'Import relevé'] },
                      { title: 'Prévision de trésorerie', desc: 'Projection à 1, 3 et 6 mois basée sur les encaissements/décaissements prévisionnels et l\'historique.', route: '/treasury/forecast', tags: ['M+1', 'M+3', 'M+6'] },
                    ]},
                    { cat: 'Fiscalité', items: [
                      { title: 'Déclarations fiscales', desc: 'TVA, IS, IRPP calculés automatiquement depuis les écritures. Calendrier fiscal avec échéances par pays.', route: '/taxation/declarations', tags: ['17 pays', 'Auto-calcul'] },
                      { title: 'Reporting fiscal', desc: 'Dashboard TVA collectée/déductible, taux effectif d\'imposition, alertes échéances, calendrier visuel.', route: '/reporting/tax', tags: ['Dashboard', 'Calendrier'] },
                    ]},
                    { cat: 'Immobilisations', items: [
                      { title: 'Registre des immobilisations', desc: 'Fiche complète par actif : valeur d\'origine, taux, méthode amortissement, VNC, compte SYSCOHADA.', route: '/assets/registry', tags: ['Linéaire', 'Dégressif'] },
                      { title: 'Tableau d\'amortissement', desc: 'Calcul automatique des dotations avec prorata temporis, génération des écritures de clôture.', route: '/assets/depreciation', tags: ['Prorata', 'Écritures auto'] },
                    ]},
                    { cat: 'Clôture & Audit', items: [
                      { title: 'Clôture mensuelle & annuelle', desc: 'Processus guidé en 6 étapes : vérification → amortissements → verrouillage → résultat → reports → finalisation.', route: '/closures/periodic', tags: ['6 étapes', 'Verrouillage'] },
                      { title: 'Révision des comptes', desc: 'Lead schedules par cycle, assertions d\'audit ISA, matrice des risques, ajustements proposés.', route: '/closures/revisions', tags: ['ISA', 'Lead schedules'] },
                    ]},
                  ] : demoSolution === 'liass-pilot' ? [
                    { cat: 'Liasse Fiscale', items: [
                      { title: 'Génération DSF automatique', desc: 'Pré-remplissage des 22 états annexes à partir des données comptables Atlas Finance. Conforme DGI.', route: '/taxation/liasse', tags: ['22 annexes', 'DGI'] },
                      { title: 'Contrôles de cohérence', desc: 'Vérification automatique des totaux inter-états, équilibre actif/passif, concordance résultat.', route: '/taxation/liasse', tags: ['Auto-contrôle', 'Alertes'] },
                      { title: 'Télédéclaration', desc: 'Export XML/EDI conforme au format de l\'administration fiscale, envoi direct ou téléchargement.', route: '/taxation/declarations', tags: ['XML', 'EDI'] },
                    ]},
                    { cat: 'Suivi fiscal', items: [
                      { title: 'Calendrier des échéances', desc: 'Toutes les dates limites de déclaration et paiement, alertes J-7 et J-1, historique.', route: '/taxation/echeances', tags: ['Alertes', 'Multi-pays'] },
                      { title: 'Historique des déclarations', desc: 'Archive de toutes les liasses générées, comparaison N/N-1, piste d\'audit complète.', route: '/taxation/declarations', tags: ['Archive', 'Comparatif'] },
                    ]},
                  ] : [
                    { cat: 'Gestion documentaire', items: [
                      { title: 'Numérisation OCR', desc: 'Scannez factures, reçus, contrats. L\'OCR extrait automatiquement montants, dates, fournisseurs.', route: '/accounting/ocr', tags: ['OCR IA', 'Multi-format'] },
                      { title: 'Classement intelligent', desc: 'L\'IA analyse le contenu et classe automatiquement par type (facture, contrat, relevé) et par tiers.', route: '/accounting/ocr', tags: ['IA', 'Auto-classement'] },
                    ]},
                    { cat: 'Archivage & Recherche', items: [
                      { title: 'Archivage légal 10 ans', desc: 'Stockage sécurisé conforme aux exigences légales OHADA, piste d\'audit SHA-256, non-répudiation.', route: '/settings/backup', tags: ['SHA-256', 'Légal'] },
                      { title: 'Recherche full-text', desc: 'Retrouvez n\'importe quel document par mot-clé, montant, date, tiers. Résultats instantanés.', route: '/settings/import-export', tags: ['Instantané', 'Filtres'] },
                    ]},
                  ]).map((section, si) => (
                    <div key={si}>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{section.cat}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {section.items.map((demo, di) => (
                          <button
                            key={di}
                            onClick={() => goDemo(demo.route)}
                            className="text-left p-4 bg-white rounded-xl border border-gray-200 hover:border-[#141414] hover:shadow-md transition-all group"
                          >
                            <div className="flex items-start justify-between">
                              <h5 className="text-sm font-semibold text-[#141414] group-hover:text-[#141414]">{demo.title}</h5>
                              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#141414] transition-colors shrink-0 mt-0.5" />
                            </div>
                            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{demo.desc}</p>
                            <div className="flex gap-1.5 mt-2 flex-wrap">
                              {demo.tags.map((tag, ti) => (
                                <span key={ti} className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-medium rounded-full">{tag}</span>
                              ))}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {demoTab === 'guided' && (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                    <h4 className="font-semibold text-[#141414] mb-3">Visite express — les modules clés</h4>
                    <p className="text-sm text-gray-500 mb-4">Parcourez les pages principales en un clic.</p>
                    <div className="space-y-2">
                      {(demoSolution === 'atlas-finance' ? [
                        { label: 'Dashboard comptable', route: '/dashboard', desc: 'Vue d\'ensemble KPIs et raccourcis' },
                        { label: 'Saisie d\'écritures', route: '/accounting/entries', desc: 'Le cœur de la comptabilité' },
                        { label: 'Bilan SYSCOHADA', route: '/financial-statements/balance', desc: 'États financiers en temps réel' },
                        { label: 'Trésorerie', route: '/treasury/accounts', desc: 'Soldes bancaires et prévisions' },
                        { label: 'Clôture', route: '/closures/periodic', desc: 'Processus de clôture guidé' },
                      ] : demoSolution === 'liass-pilot' ? [
                        { label: 'Liasse fiscale', route: '/taxation/liasse', desc: 'Génération DSF' },
                        { label: 'Déclarations', route: '/taxation/declarations', desc: 'Suivi des déclarations' },
                        { label: 'Échéances', route: '/taxation/echeances', desc: 'Calendrier fiscal' },
                      ] : [
                        { label: 'OCR & Numérisation', route: '/accounting/ocr', desc: 'Import de documents' },
                        { label: 'Sauvegarde', route: '/settings/backup', desc: 'Archivage sécurisé' },
                      ]).map((item, i) => (
                        <button
                          key={i}
                          onClick={() => goDemo(item.route)}
                          className="w-full flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 hover:border-[#141414] transition-colors text-left group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 bg-[#141414] text-white rounded-lg flex items-center justify-center text-xs font-bold">{i + 1}</div>
                            <div>
                              <p className="text-sm font-medium text-[#141414]">{item.label}</p>
                              <p className="text-xs text-gray-400">{item.desc}</p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#141414]" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {demoTab === 'tutorials' && (
                <div className="space-y-3">
                  {(demoSolution === 'atlas-finance' ? [
                    { title: 'Créer votre première écriture', desc: 'De la saisie à la validation : journal, comptes, montants, pièce jointe.', duration: '3 min', route: '/accounting/entries' },
                    { title: 'Importer un plan comptable', desc: 'Chargez le plan SYSCOHADA ou importez votre plan personnalisé.', duration: '2 min', route: '/config/plan-syscohada' },
                    { title: 'Configurer la TVA', desc: 'Paramétrez les taux, comptes collecteurs/déductibles pour votre pays.', duration: '3 min', route: '/config/tva' },
                    { title: 'Effectuer un lettrage', desc: 'Rapprochez les comptes clients et fournisseurs automatiquement.', duration: '4 min', route: '/accounting/lettrage-auto' },
                    { title: 'Générer le bilan', desc: 'Visualisez le bilan SYSCOHADA et exportez-le en PDF.', duration: '2 min', route: '/financial-statements/balance' },
                    { title: 'Clôturer un mois', desc: 'Suivez les 6 étapes de la clôture mensuelle.', duration: '5 min', route: '/closures/periodic' },
                    { title: 'Paramétrer l\'exercice fiscal', desc: 'Définissez les dates, la devise, les journaux obligatoires.', duration: '2 min', route: '/core/exercice' },
                    { title: 'Gérer les immobilisations', desc: 'Ajoutez un actif, paramétrez l\'amortissement, générez les dotations.', duration: '4 min', route: '/assets/registry' },
                  ] : demoSolution === 'liass-pilot' ? [
                    { title: 'Préparer la liasse fiscale', desc: 'Import des données, vérification, génération des annexes.', duration: '5 min', route: '/taxation/liasse' },
                    { title: 'Vérifier la cohérence', desc: 'Contrôles automatiques et corrections.', duration: '3 min', route: '/taxation/liasse' },
                    { title: 'Télédéclarer au DGI', desc: 'Export et envoi du fichier XML.', duration: '2 min', route: '/taxation/declarations' },
                  ] : [
                    { title: 'Scanner un document', desc: 'Utilisez l\'OCR pour extraire les données.', duration: '2 min', route: '/accounting/ocr' },
                    { title: 'Organiser vos fichiers', desc: 'Classement automatique et recherche.', duration: '3 min', route: '/settings/import-export' },
                  ]).map((tuto, i) => (
                    <button
                      key={i}
                      onClick={() => goDemo(tuto.route)}
                      className="w-full flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 hover:border-[#141414] hover:shadow-sm transition-all text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-[#141414] group-hover:text-white transition-colors">
                          <Lightbulb className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#141414]">{tuto.title}</p>
                          <p className="text-xs text-gray-500">{tuto.desc}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {tuto.duration}</span>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#141414]" />
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {demoTab === 'live' && (
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <div className="text-center mb-6">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <h4 className="font-semibold text-[#141414] mb-2">Réservez une démo personnalisée</h4>
                    <p className="text-sm text-gray-500">Un expert Atlas Studio vous accompagne en direct pendant 30 minutes pour explorer les fonctionnalités adaptées à votre métier.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                    {[
                      { label: 'Découverte', desc: 'Tour complet de la solution', icon: '🎯' },
                      { label: 'Migration', desc: 'Comment migrer depuis votre logiciel actuel', icon: '🔄' },
                      { label: 'Sur mesure', desc: 'Adaptation à vos besoins spécifiques', icon: '⚙️' },
                    ].map((opt, i) => (
                      <div key={i} className="p-3 bg-white rounded-lg border border-gray-200 text-center">
                        <div className="text-2xl mb-2">{opt.icon}</div>
                        <p className="text-sm font-medium text-[#141414]">{opt.label}</p>
                        <p className="text-xs text-gray-500 mt-1">{opt.desc}</p>
                      </div>
                    ))}
                  </div>
                  <div className="text-center">
                    <button className="px-8 py-3 bg-[#141414] text-white rounded-lg text-sm font-semibold hover:bg-[#2a2a2a] transition-colors inline-flex items-center gap-2">
                      <Mail className="w-4 h-4" /> Planifier un rendez-vous
                    </button>
                    <p className="text-xs text-gray-400 mt-2">Réponse sous 24h — contact@atlasstudio.com</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterPage;
