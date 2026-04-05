import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ATLAS_STUDIO } from '../config/atlasStudio';
import {
  CheckCircle, X, ArrowRight, Zap, Crown, Calculator,
  BarChart3, Shield, Globe, Wallet, Brain,
  Building2, Lock, Play, Star, Users, ChevronDown,
  TrendingUp, Award, Layers,
  MousePointerClick, Phone, Mail, ChevronRight,
  Sparkles, ArrowUpRight, Eye, Target, Rocket,
} from 'lucide-react';
import { FEATURE_MATRIX } from '../config/plans';

function getWorkspacePath(_role: string): string {
  return '/home';
}

const formatXOF = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });

/* ═══════════ Animated counter ═══════════ */
function AnimatedNumber({ value, suffix = '' }: { value: string; suffix?: string }) {
  const [display, setDisplay] = useState('0');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const num = parseInt(value.replace(/[^0-9]/g, ''));
          if (isNaN(num)) { setDisplay(value); return; }
          const duration = 1200;
          const start = Date.now();
          const tick = () => {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay(Math.floor(num * eased).toLocaleString('fr-FR'));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value]);

  return (
    <div ref={ref} className="font-bold">
      {value.startsWith('<') ? '< ' : ''}{display}{suffix && <span className="text-lg text-[#c9a96e]/60 ml-1">{suffix}</span>}
    </div>
  );
}

/* ═══════════ Data ═══════════ */

const MODULES = [
  { icon: Calculator, label: 'Comptabilité SYSCOHADA', desc: 'Plan comptable OHADA, journaux, grand livre, balance. Conformité native 17 pays.', color: 'from-blue-500/20 to-blue-600/10' },
  { icon: BarChart3, label: 'États financiers', desc: 'Bilan, résultat, TAFIRE, SIG & ratios — générés automatiquement en un clic.', color: 'from-emerald-500/20 to-emerald-600/10' },
  { icon: Shield, label: 'Fiscalité automatique', desc: 'TVA, IS, IMF, patente. Calendrier fiscal, alertes. Liasse DSF 22 annexes.', color: 'from-[#c9a96e]/20 to-[#a88b4a]/10' },
  { icon: Wallet, label: 'Trésorerie & banque', desc: 'Rapprochement bancaire intelligent, caisse, effets de commerce, prévisions.', color: 'from-purple-500/20 to-purple-600/10' },
  { icon: Brain, label: 'IA PROPH3T', desc: 'Anomalies, suggestions, audit Benford, analyse prédictive LLM intégrée.', color: 'from-pink-500/20 to-pink-600/10' },
  { icon: Globe, label: 'Multi-devises', desc: 'XAF, XOF, EUR, USD. Écarts de conversion automatiques (476/477).', color: 'from-cyan-500/20 to-cyan-600/10' },
  { icon: Building2, label: 'Multi-sociétés', desc: 'Consolidation inter-company, multi-sites, multi-pays OHADA.', color: 'from-[#b8944f]/20 to-orange-600/10' },
  { icon: Lock, label: 'Audit trail SHA-256', desc: 'Piste d\'audit inaltérable, chaîne de hachage, conformité totale.', color: 'from-red-500/20 to-red-600/10' },
];

const STATS = [
  { value: '500', suffix: '+', label: 'entreprises' },
  { value: '17', suffix: '', label: 'pays OHADA' },
  { value: '100', suffix: '%', label: 'conformité' },
  { value: '99', suffix: '.9%', label: 'disponibilité' },
];

const STEPS = [
  { num: '01', title: 'Créez votre compte', desc: 'Inscription en 2 minutes. Aucune carte bancaire requise.', icon: Rocket },
  { num: '02', title: 'Configurez votre société', desc: 'L\'assistant charge le plan SYSCOHADA et configure tout.', icon: Target },
  { num: '03', title: 'Saisissez vos écritures', desc: 'Interface intuitive avec contrôle D=C temps réel.', icon: Calculator },
  { num: '04', title: 'Générez vos états', desc: 'Bilan, résultat, TAFIRE, liasse — tout est automatique.', icon: BarChart3 },
];

const TESTIMONIALS = [
  { name: 'Amadou Diallo', role: 'Expert-Comptable', company: 'Cabinet Diallo & Associés, Dakar', text: 'Atlas F&A a transformé notre cabinet. La conformité SYSCOHADA est native, on gagne 3 heures par dossier.', rating: 5 },
  { name: 'Marie-Claire Eboué', role: 'DAF', company: 'TechCorp Cameroun, Douala', text: 'Le rapprochement bancaire et les prévisions nous ont permis de réduire nos délais de clôture de 5 à 2 jours.', rating: 5 },
  { name: 'Ibrahim Koné', role: 'Directeur Financier', company: 'Groupe Koné Industries, Abidjan', text: 'La consolidation multi-sociétés qui prenait une semaine se fait maintenant en une heure. Impressionnant.', rating: 5 },
];

const FAQ = [
  { q: 'Atlas F&A est-il conforme au SYSCOHADA révisé 2017 ?', a: 'Oui, à 100%. Plan comptable OHADA intégré nativement, états financiers conformes aux modèles officiels, piste d\'audit conforme aux exigences OHADA.' },
  { q: 'Puis-je essayer avant de payer ?', a: '14 jours d\'essai gratuit avec toutes les fonctionnalités. Aucune carte bancaire requise. Vous pouvez aussi tester nos démos interactives sans créer de compte.' },
  { q: 'Quels modes de paiement acceptez-vous ?', a: 'Mobile Money (Orange Money, MTN MoMo, Wave), virement bancaire, carte bancaire (Visa, Mastercard). Facturation en FCFA ou EUR.' },
  { q: 'Mes données sont-elles sécurisées ?', a: 'Chiffrement AES-256, backup quotidien, piste d\'audit SHA-256. Conformité RGPD et réglementation OHADA.' },
  { q: 'Puis-je migrer depuis un autre logiciel ?', a: 'Import CSV/Excel de vos écritures, plan comptable, tiers et immobilisations. Migration assistée disponible.' },
  { q: 'Le logiciel fonctionne-t-il hors ligne ?', a: 'L\'app desktop fonctionne 100% hors ligne avec synchronisation automatique au retour de la connexion.' },
];

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleGetStarted = () => {
    if (isAuthenticated && user) {
      navigate(getWorkspacePath(user.role || ''));
    } else {
      window.location.href = ATLAS_STUDIO.LOGIN;
    }
  };

  return (
    <div className="landing-page min-h-screen bg-[#0d0d0d] text-white">

      {/* ══════════ NAV ══════════ */}
      <nav className="sticky top-0 bg-[#0d0d0d]/90 backdrop-blur-xl border-b border-white/[0.06] z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="atlas-brand text-2xl text-white">Atlas Studio</span>
            <span className="text-white/20">/</span>
            <span className="text-sm font-bold text-[#c9a96e] tracking-tight">F&A</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-white/40">
            <a href="#modules" className="hover:text-white transition-colors">Modules</a>
            <a href="#tarifs" className="hover:text-white transition-colors">Tarifs</a>
            <button onClick={() => navigate('/demo')} className="hover:text-white transition-colors">Démo</button>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <button onClick={handleGetStarted} className="px-5 py-2.5 bg-[#c9a96e] text-[#0d0d0d] rounded-lg text-sm font-bold hover:bg-[#dbc396] transition-all flex items-center gap-2">
                Mon espace <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <a href={ATLAS_STUDIO.LOGIN} className="px-4 py-2 text-sm font-medium text-white/50 hover:text-white transition-colors">
                  Se connecter
                </a>
                <a href={ATLAS_STUDIO.LOGIN} className="px-5 py-2.5 bg-[#c9a96e] text-[#0d0d0d] rounded-lg text-sm font-bold hover:bg-[#dbc396] transition-all">
                  Essai gratuit
                </a>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ══════════ HERO ══════════ */}
      <section className="relative pt-24 pb-20 px-6 overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] bg-gradient-to-r from-[#c9a96e]/8 via-[#b8944f]/5 to-[#c9a96e]/8 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#c9a96e]/20 to-transparent" />
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        </div>

        <div className="max-w-5xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#c9a96e]/10 border border-[#c9a96e]/20 text-[#c9a96e] rounded-full text-xs font-semibold mb-8">
            <Sparkles className="w-3.5 h-3.5" /> 100 % conforme SYSCOHADA révisé 2017
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold leading-[1.1] mb-6 tracking-tight">
            La comptabilité africaine,
            <br />
            <span className="bg-gradient-to-r from-[#dbc396] via-[#e0cc9e] to-[#dbc396] bg-clip-text text-transparent">
              simplifiée et intelligente.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-white/40 max-w-2xl mx-auto mb-10 leading-relaxed">
            Atlas F&A est l'ERP comptable et financier conçu pour les{' '}
            <strong className="text-white/70">17 pays de l'espace OHADA</strong>.
            Écritures, états financiers, fiscalité, trésorerie — tout est automatisé.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap mb-14">
            <button onClick={handleGetStarted} className="group px-8 py-4 bg-gradient-to-r from-[#c9a96e] to-[#dbc396] text-[#0d0d0d] rounded-xl text-sm font-bold hover:from-[#dbc396] hover:to-[#dbc396] transition-all shadow-lg shadow-[#c9a96e]/20 hover:shadow-[#c9a96e]/40 hover:-translate-y-0.5 flex items-center gap-2">
              <Zap className="w-4 h-4" /> Commencer gratuitement
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button onClick={() => navigate('/demo')} className="px-8 py-4 bg-white/5 border border-white/10 rounded-xl text-sm font-semibold text-white/80 hover:bg-white/10 hover:border-white/20 transition-all flex items-center gap-2">
              <Play className="w-4 h-4 text-[#c9a96e]" /> Voir la démo
            </button>
          </div>

          {/* Social proof */}
          <div className="flex items-center justify-center gap-3">
            <div className="flex -space-x-2">
              {['bg-[#c9a96e]', 'bg-[#b8944f]', 'bg-[#dbc396]', 'bg-[#a88b4a]'].map((bg, i) => (
                <div key={i} className={`w-9 h-9 rounded-full ${bg} border-2 border-[#0d0d0d] flex items-center justify-center text-[#0d0d0d] text-xs font-bold`}>
                  {['AD', 'MC', 'IK', 'FN'][i]}
                </div>
              ))}
            </div>
            <div className="text-sm text-white/30">
              Rejoint par <strong className="text-white/60">500+ entreprises</strong> en Afrique
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ STATS ══════════ */}
      <section className="py-12 px-6 border-y border-white/[0.06]">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-white">
                <AnimatedNumber value={stat.value} suffix={stat.suffix} />
              </div>
              <p className="text-xs text-white/30 mt-2 uppercase tracking-wider font-medium">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════ MODULES ══════════ */}
      <section id="modules" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs font-semibold text-[#c9a96e] mb-5">
              <Layers className="w-3.5 h-3.5" /> 8 modules intégrés
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Tout ce dont vous avez besoin.
            </h2>
            <p className="text-white/40 max-w-xl mx-auto text-lg">Une suite complète pour couvrir l'ensemble de vos besoins comptables et financiers.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {MODULES.map((m, i) => (
              <div key={i} className="group relative bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-300 hover:-translate-y-1">
                <div className={`absolute inset-0 bg-gradient-to-br ${m.color} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                <div className="relative">
                  <div className="w-12 h-12 bg-white/[0.06] rounded-xl flex items-center justify-center mb-4 group-hover:bg-white/10 transition-colors">
                    <m.icon className="w-6 h-6 text-[#c9a96e]" />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-2">{m.label}</h3>
                  <p className="text-xs text-white/30 leading-relaxed group-hover:text-white/50 transition-colors">{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ HOW IT WORKS ══════════ */}
      <section className="py-24 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#c9a96e]/[0.02] to-transparent pointer-events-none" />
        <div className="max-w-5xl mx-auto relative">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs font-semibold text-[#c9a96e] mb-5">
              <TrendingUp className="w-3.5 h-3.5" /> Démarrage rapide
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Opérationnel en 10 minutes</h2>
            <p className="text-white/40 text-lg">De l'inscription à votre premier bilan.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {STEPS.map((step, i) => (
              <div key={i} className="relative group">
                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-px border-t border-dashed border-white/10" />
                )}
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#c9a96e]/20 to-[#a88b4a]/10 border border-[#c9a96e]/20 rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:from-[#c9a96e]/30 group-hover:to-[#a88b4a]/20 transition-all">
                    <span className="text-[#c9a96e] text-lg font-bold">{step.num}</span>
                  </div>
                  <h3 className="text-sm font-bold text-white mb-2">{step.title}</h3>
                  <p className="text-xs text-white/30 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ DEMO CTA ══════════ */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="relative bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/[0.08] rounded-3xl p-10 md:p-16 overflow-hidden">
            {/* Decorative */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#c9a96e]/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-[#c9a96e]/5 to-transparent rounded-full translate-y-1/2 -translate-x-1/3 blur-2xl" />

            <div className="relative flex flex-col md:flex-row items-center gap-10">
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#c9a96e]/10 border border-[#c9a96e]/20 rounded-full text-xs font-semibold text-[#c9a96e] mb-4">
                  <MousePointerClick className="w-3.5 h-3.5" /> Aucun compte requis
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-3">
                  Essayez avant de<br />vous inscrire
                </h2>
                <p className="text-white/40 mb-6 leading-relaxed">
                  Visite guidée virtuelle, démos interactives et tutoriels.
                  Découvrez Atlas F&A en action, gratuitement.
                </p>
                <button
                  onClick={() => navigate('/demo')}
                  className="group px-8 py-4 bg-gradient-to-r from-[#c9a96e] to-[#dbc396] text-[#0d0d0d] rounded-xl text-sm font-bold hover:from-[#dbc396] hover:to-[#dbc396] transition-all shadow-lg shadow-[#c9a96e]/20 inline-flex items-center gap-2"
                >
                  <Play className="w-4 h-4" /> Lancer la démo
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>

              {/* Demo preview cards */}
              <div className="flex-shrink-0 grid grid-cols-1 gap-3 w-full md:w-72">
                {[
                  { icon: Calculator, title: 'Saisie d\'écriture', tag: 'Interactif' },
                  { icon: BarChart3, title: 'Bilan SYSCOHADA', tag: 'Drill-down' },
                  { icon: Shield, title: 'Calcul TVA auto', tag: 'Temps réel' },
                ].map((demo, i) => (
                  <button
                    key={i}
                    onClick={() => navigate('/demo')}
                    className="group/card flex items-center gap-3 p-3.5 bg-white/[0.03] border border-white/[0.06] rounded-xl hover:bg-white/[0.06] hover:border-white/[0.12] transition-all text-left"
                  >
                    <div className="w-10 h-10 bg-[#c9a96e]/10 rounded-lg flex items-center justify-center shrink-0">
                      <demo.icon className="w-5 h-5 text-[#c9a96e]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{demo.title}</p>
                      <p className="text-[10px] text-white/30">{demo.tag}</p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-white/20 group-hover/card:text-[#c9a96e] transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ TESTIMONIALS ══════════ */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs font-semibold text-[#c9a96e] mb-5">
              <Star className="w-3.5 h-3.5" /> Ils nous font confiance
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Ce que disent nos clients</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-7 hover:bg-white/[0.05] hover:border-white/[0.1] transition-all">
                <div className="flex gap-1 mb-5">
                  {[...Array(t.rating)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 text-[#c9a96e] fill-[#c9a96e]" />
                  ))}
                </div>
                <p className="text-sm text-white/60 leading-relaxed mb-6">"{t.text}"</p>
                <div className="flex items-center gap-3 pt-5 border-t border-white/[0.06]">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#c9a96e]/30 to-[#b8944f]/20 flex items-center justify-center text-[#c9a96e] text-xs font-bold">
                    {t.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{t.name}</p>
                    <p className="text-xs text-white/30">{t.role} · {t.company}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ PLANS ══════════ */}
      <section id="tarifs" className="py-24 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#c9a96e]/[0.02] to-transparent pointer-events-none" />
        <div className="max-w-5xl mx-auto relative">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs font-semibold text-[#c9a96e] mb-5">
              <Award className="w-3.5 h-3.5" /> Tarification transparente
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Deux plans, zéro surprise</h2>
            <p className="text-white/40 text-lg">Essai gratuit 14 jours · Sans engagement · Annulez à tout moment</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-16">
            {/* PME/TPE */}
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8 hover:border-white/[0.15] transition-all">
              <h3 className="text-xl font-bold text-white">PME / TPE</h3>
              <p className="text-sm text-white/30 mt-1">Comptabilité complète pour une société</p>
              <div className="mt-6 mb-1">
                <span className="text-5xl font-bold text-white">{formatXOF(49000)}</span>
                <span className="text-white/30 ml-2 text-sm">FCFA / mois</span>
              </div>
              <p className="text-xs text-white/20 mb-6">~75 EUR · 1 à 5 utilisateurs · +9 000 FCFA/utilisateur suppl.</p>
              <button onClick={handleGetStarted}
                className="w-full py-3.5 border border-[#c9a96e]/30 text-[#c9a96e] rounded-xl text-sm font-bold hover:bg-[#c9a96e]/10 transition-all flex items-center justify-center gap-2">
                <Zap className="w-4 h-4" /> Essai gratuit 14 jours
              </button>
              <ul className="mt-7 space-y-3">
                {['Comptabilité SYSCOHADA complète', 'États financiers & TAFIRE', 'Fiscalité (TVA, IS, IMF)', 'Trésorerie & rapprochement', 'IA PROPH3T (contrôles)', 'Support email'].map((f, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-xs text-white/40">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Premium */}
            <div className="relative bg-gradient-to-b from-[#c9a96e]/[0.06] to-transparent border border-[#c9a96e]/20 rounded-2xl p-8 shadow-xl shadow-[#c9a96e]/5">
              <div className="absolute -top-3 right-6 bg-gradient-to-r from-[#c9a96e] to-[#dbc396] text-[#0d0d0d] text-xs font-bold px-4 py-1 rounded-full flex items-center gap-1">
                <Star className="w-3 h-3" /> Populaire
              </div>
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-[#c9a96e]" />
                <h3 className="text-xl font-bold text-white">Premium</h3>
              </div>
              <p className="text-sm text-white/30 mt-1">Multi-sociétés, devises, IA avancée, RBAC, API</p>
              <div className="mt-6 mb-1">
                <span className="text-5xl font-bold text-white">{formatXOF(250000)}</span>
                <span className="text-white/30 ml-2 text-sm">FCFA / mois</span>
              </div>
              <p className="text-xs text-white/20 mb-6">~380 EUR · Utilisateurs illimités · 5+ sociétés : sur devis</p>
              <button onClick={handleGetStarted}
                className="w-full py-3.5 bg-gradient-to-r from-[#c9a96e] to-[#dbc396] text-[#0d0d0d] rounded-xl text-sm font-bold hover:from-[#dbc396] hover:to-[#dbc396] transition-all shadow-lg shadow-[#c9a96e]/20 flex items-center justify-center gap-2">
                <Zap className="w-4 h-4" /> Essai gratuit 14 jours
              </button>
              <ul className="mt-7 space-y-3">
                {['Tout le plan PME/TPE, plus :', 'Multi-sociétés illimité', 'Multi-devises & multi-pays', 'IA PROPH3T avancé (LLM)', 'Workflow RBAC & audit trail', 'API REST & intégrations', 'Support prioritaire & formation', 'SLA 99.5 %'].map((f, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-xs text-white/40">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Feature comparison */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Comparatif complet</h3>
              <span className="text-[10px] text-white/20 uppercase tracking-wider">{FEATURE_MATRIX.reduce((a, c) => a + c.items.length, 0)} fonctionnalités</span>
            </div>
            <div className="grid grid-cols-[1fr_90px_90px] bg-white/[0.02] border-b border-white/[0.06]">
              <div className="px-6 py-3 text-xs font-semibold text-white/30">Fonctionnalité</div>
              <div className="px-3 py-3 text-xs font-bold text-white/50 text-center">PME</div>
              <div className="px-3 py-3 text-xs font-bold text-[#c9a96e] text-center">Premium</div>
            </div>

            {FEATURE_MATRIX.map((cat, ci) => (
              <div key={ci}>
                <div className="px-6 py-2.5 bg-white/[0.02] border-b border-t border-white/[0.04]">
                  <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{cat.category}</span>
                </div>
                {cat.items.map((item, ii) => (
                  <div key={ii} className="grid grid-cols-[1fr_90px_90px] border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02] transition-colors">
                    <div className="px-6 py-2.5 text-sm text-white/50">{item.label}</div>
                    <div className="flex items-center justify-center">
                      {item.pme
                        ? <CheckCircle className="w-4 h-4 text-emerald-400" />
                        : <X className="w-3.5 h-3.5 text-white/10" />}
                    </div>
                    <div className="flex items-center justify-center">
                      {item.premium
                        ? <CheckCircle className="w-4 h-4 text-emerald-400" />
                        : <X className="w-3.5 h-3.5 text-white/10" />}
                    </div>
                  </div>
                ))}
              </div>
            ))}

            <div className="grid grid-cols-[1fr_90px_90px] bg-gradient-to-r from-[#c9a96e]/10 to-[#a88b4a]/5 border-t border-[#c9a96e]/20">
              <div className="px-6 py-4 text-sm font-bold text-white">Prix mensuel</div>
              <div className="flex flex-col items-center justify-center py-4">
                <span className="text-sm font-bold text-white">{formatXOF(49000)}</span>
                <span className="text-[10px] text-white/30">FCFA</span>
              </div>
              <div className="flex flex-col items-center justify-center py-4">
                <span className="text-sm font-bold text-[#c9a96e]">{formatXOF(250000)}</span>
                <span className="text-[10px] text-[#c9a96e]/50">FCFA</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ FAQ ══════════ */}
      <section id="faq" className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Questions fréquentes</h2>
            <p className="text-white/40 text-lg">Tout ce que vous devez savoir.</p>
          </div>

          <div className="space-y-3">
            {FAQ.map((item, i) => (
              <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden hover:border-white/[0.1] transition-colors">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left"
                >
                  <span className="text-sm font-semibold text-white/80 pr-4">{item.q}</span>
                  <ChevronDown className={`w-5 h-5 text-white/20 shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-180 text-[#c9a96e]' : ''}`} />
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${openFaq === i ? 'max-h-40' : 'max-h-0'}`}>
                  <div className="px-5 pb-5">
                    <p className="text-sm text-white/40 leading-relaxed">{item.a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ FINAL CTA ══════════ */}
      <section className="py-24 px-6 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-t from-[#c9a96e]/10 to-transparent rounded-full blur-[100px]" />
        </div>
        <div className="max-w-3xl mx-auto text-center relative">
          <h2 className="text-4xl md:text-6xl font-bold mb-5">
            Prêt à simplifier votre
            <br />
            <span className="bg-gradient-to-r from-[#dbc396] to-[#dbc396] bg-clip-text text-transparent">comptabilité ?</span>
          </h2>
          <p className="text-white/40 mb-10 text-lg max-w-lg mx-auto">
            Rejoignez 500+ entreprises qui font confiance à Atlas F&A. 14 jours d'essai gratuit.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap mb-8">
            <button onClick={handleGetStarted}
              className="group px-10 py-4 bg-gradient-to-r from-[#c9a96e] to-[#dbc396] text-[#0d0d0d] rounded-xl text-sm font-bold hover:from-[#dbc396] hover:to-[#dbc396] transition-all shadow-lg shadow-[#c9a96e]/25 hover:-translate-y-0.5 flex items-center gap-2">
              <Zap className="w-4 h-4" /> Créer mon compte
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button onClick={() => navigate('/demo')}
              className="px-10 py-4 bg-white/5 border border-white/10 text-white/80 rounded-xl text-sm font-semibold hover:bg-white/10 hover:border-white/20 transition-all flex items-center gap-2">
              <Play className="w-4 h-4 text-[#c9a96e]" /> Voir la démo
            </button>
          </div>
          <div className="flex items-center justify-center gap-6 text-xs text-white/20">
            <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-400/50" /> Sans carte bancaire</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-400/50" /> Mobile Money accepté</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-400/50" /> Support réactif</span>
          </div>
        </div>
      </section>

      {/* ══════════ FOOTER ══════════ */}
      <footer className="border-t border-white/[0.06] py-14 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="atlas-brand text-2xl text-white/80">Atlas Studio</span>
              </div>
              <p className="text-xs text-white/20 leading-relaxed">
                ERP comptable et financier pour l'Afrique. Conforme SYSCOHADA, intelligent et sécurisé.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-bold text-white/30 uppercase tracking-wider mb-4">Produit</h4>
              <ul className="space-y-2.5 text-xs text-white/20">
                <li><a href="#modules" className="hover:text-white/50 transition-colors">Modules</a></li>
                <li><a href="#tarifs" className="hover:text-white/50 transition-colors">Tarifs</a></li>
                <li><button onClick={() => navigate('/demo')} className="hover:text-white/50 transition-colors">Démo interactive</button></li>
                <li><a href="#faq" className="hover:text-white/50 transition-colors">FAQ</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold text-white/30 uppercase tracking-wider mb-4">Solutions</h4>
              <ul className="space-y-2.5 text-xs text-white/20">
                <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#dbc396]" /> Atlas F&A</li>
                <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> Liass'Pilot</li>
                <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> DocJourney</li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold text-white/30 uppercase tracking-wider mb-4">Contact</h4>
              <ul className="space-y-2.5 text-xs text-white/20">
                <li className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-white/10" /> contact@atlasstudio.com</li>
                <li className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-white/10" /> +237 6XX XXX XXX</li>
                <li className="flex items-center gap-2"><Building2 className="w-3.5 h-3.5 text-white/10" /> Douala, Cameroun</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/[0.06] pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <span className="text-xs text-white/15">&copy; {new Date().getFullYear()} Atlas Studio. Tous droits réservés.</span>
            <div className="flex items-center gap-6 text-xs text-white/15">
              <span className="hover:text-white/30 cursor-pointer transition-colors">Mentions légales</span>
              <span className="hover:text-white/30 cursor-pointer transition-colors">Confidentialité</span>
              <span className="hover:text-white/30 cursor-pointer transition-colors">CGV</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
