import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ATLAS_STUDIO } from '../config/atlasStudio';
import { AtlasStudioBrand } from '../components/common/AtlasStudioBrand';
import { getLandingTheme, setLandingTheme, type LandingThemeMode } from '../config/landingTheme';
import {
  CheckCircle, X, ArrowRight, Zap, Crown, Calculator,
  BarChart3, Shield, Globe, Wallet, Brain,
  Building2, Lock, Play, Star, Users, ChevronDown,
  TrendingUp, Award, Layers,
  MousePointerClick, Phone, Mail,
  Sparkles, Sun, Moon,
} from 'lucide-react';
import { FEATURE_MATRIX } from '../config/plans';
import { useLandingContent } from '../hooks/useLandingContent';

function getWorkspacePath(_role: string): string {
  return '/home';
}

/* ═══ IntersectionObserver hook for scroll animations ═══ */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, className: inView ? 'in-view' : '' };
}

const formatXOF = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });

/* ═══ Animated counter ═══ */
function AnimatedNumber({ value, suffix = '' }: { value: string; suffix?: string }) {
  const [display, setDisplay] = useState('0');
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
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
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value]);
  return <div ref={ref} className="font-bold">{value.startsWith('<') ? '< ' : ''}{display}{suffix}</div>;
}

/* ═══ Data ═══ */
const MODULES = [
  { icon: Calculator, label: 'Comptabilité SYSCOHADA', desc: 'Plan comptable OHADA, journaux, grand livre, balance. Conformité native 17 pays.' },
  { icon: BarChart3, label: 'États financiers', desc: 'Bilan, résultat, TAFIRE, SIG & ratios — générés automatiquement en un clic.' },
  { icon: Shield, label: 'Fiscalité automatique', desc: 'TVA, IS, IMF, patente. Calendrier fiscal, alertes. Liasse DSF 22 annexes.' },
  { icon: Wallet, label: 'Trésorerie & banque', desc: 'Rapprochement bancaire intelligent, caisse, effets de commerce, prévisions.' },
  { icon: Brain, label: <>IA <span className="atlas-brand">Proph3t</span></>, desc: 'Anomalies, suggestions, audit Benford, analyse prédictive LLM intégrée.' },
  { icon: Globe, label: 'Multi-devises', desc: 'XAF, XOF, EUR, USD. Écarts de conversion automatiques (476/477).' },
  { icon: Building2, label: 'Multi-sociétés', desc: 'Consolidation inter-company, multi-sites, multi-pays OHADA.' },
  { icon: Lock, label: 'Audit trail SHA-256', desc: 'Piste d\'audit inaltérable, chaîne de hachage, conformité totale.' },
];

const STATS = [
  { value: '500', suffix: '+', label: 'entreprises' },
  { value: '17', suffix: '', label: 'pays OHADA' },
  { value: '100', suffix: '%', label: 'conformité' },
  { value: '99', suffix: '.9%', label: 'disponibilité' },
];

const STEPS = [
  { num: '01', title: 'Créez votre compte', desc: 'Inscription en 2 minutes. Aucune carte bancaire requise.' },
  { num: '02', title: 'Configurez votre société', desc: 'L\'assistant charge le plan SYSCOHADA et configure tout.' },
  { num: '03', title: 'Saisissez vos écritures', desc: 'Interface intuitive avec contrôle D=C temps réel.' },
  { num: '04', title: 'Générez vos états', desc: 'Bilan, résultat, TAFIRE, liasse — tout est automatique.' },
];

const TESTIMONIALS = [
  { name: 'Amadou Diallo', initials: 'AD', role: 'Expert-Comptable', company: 'Cabinet Diallo & Associés, Dakar', text: 'Atlas F&A a transformé notre cabinet. La conformité SYSCOHADA est native, on gagne 3 heures par dossier.' },
  { name: 'Marie-Claire Eboué', initials: 'MC', role: 'DAF', company: 'TechCorp Cameroun, Douala', text: 'Le rapprochement bancaire et les prévisions nous ont permis de réduire nos délais de clôture de 5 à 2 jours.' },
  { name: 'Ibrahim Koné', initials: 'IK', role: 'Directeur Financier', company: 'Groupe Koné Industries, Abidjan', text: 'La consolidation multi-sociétés qui prenait une semaine se fait maintenant en une heure. Impressionnant.' },
];

const FAQ = [
  { q: 'Atlas F&A est-il conforme au SYSCOHADA révisé 2017 ?', a: 'Oui, à 100%. Plan comptable OHADA intégré nativement, états financiers conformes aux modèles officiels, piste d\'audit conforme aux exigences OHADA.' },
  { q: 'Puis-je essayer avant de payer ?', a: 'Souscrivez maintenant avec toutes les fonctionnalités. Aucune carte bancaire requise.' },
  { q: 'Quels modes de paiement acceptez-vous ?', a: 'Mobile Money (Orange Money, MTN MoMo, Wave), virement bancaire, carte bancaire (Visa, Mastercard). Facturation en FCFA ou EUR.' },
  { q: 'Mes données sont-elles sécurisées ?', a: 'Chiffrement AES-256, backup quotidien, piste d\'audit SHA-256. Conformité RGPD et réglementation OHADA.' },
  { q: 'Puis-je migrer depuis un autre logiciel ?', a: 'Import CSV/Excel de vos écritures, plan comptable, tiers et immobilisations. Migration assistée disponible.' },
  { q: 'Le logiciel fonctionne-t-il hors ligne ?', a: 'L\'app desktop fonctionne 100% hors ligne avec synchronisation automatique au retour de la connexion.' },
];

/* ═══ Theme-aware CSS helper ═══ */
/* Globals.css forces color on h1-h6 and p with !important via CSS vars.
   We use inline styles for text colors to beat specificity. */
function t(mode: LandingThemeMode) {
  const d = mode === 'dark';
  // All text colors as raw values for inline styles (beats globals.css !important)
  const txt    = d ? '#ffffff' : '#1a1a1a';
  const sec    = d ? 'rgba(255,255,255,0.55)' : '#4a4a4a';
  const ter    = d ? 'rgba(255,255,255,0.35)' : '#777777';
  const muted  = d ? 'rgba(255,255,255,0.20)' : '#aaaaaa';
  const inv    = d ? '#0d0d0d' : '#ffffff';
  const gold   = d ? '#c9a96e' : '#7d6430';
  const chk    = d ? '#34d399' : '#16a34a';

  return {
    // Backgrounds (classes — these work fine, globals don't override bg)
    bg: d ? 'bg-[#0d0d0d]' : 'bg-white',
    bgAlt: d ? 'bg-[#141414]' : 'bg-[#f8f7f4]',
    goldBg: d ? 'bg-[#c9a96e]' : 'bg-[#9a7d3e]',
    goldBgLight: d ? 'bg-[#c9a96e]/10' : 'bg-[#9a7d3e]/8',
    goldBorder: d ? 'border-[#c9a96e]/20' : 'border-[#9a7d3e]/20',
    goldBorderSolid: d ? 'border-[#c9a96e]' : 'border-[#9a7d3e]',
    border: d ? 'border-white/[0.06]' : 'border-[#e8e5de]',
    gradFrom: d ? 'from-[#dbc396]' : 'from-[#b8944f]',
    gradVia: d ? 'via-[#e0cc9e]' : 'via-[#c9a96e]',
    gradTo: d ? 'to-[#dbc396]' : 'to-[#9a7d3e]',
    btnPrimary: d ? 'bg-[#c9a96e] hover:bg-[#dbc396]' : 'bg-[#9a7d3e] hover:bg-[#b8944f]',
    btnSecondary: d ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-[#e8e5de] hover:bg-gray-50',
    card: d ? 'bg-white/[0.03] border-white/[0.06]' : 'bg-white border-[#e8e5de] shadow-sm',
    cardHover: d ? 'hover:bg-white/[0.06] hover:border-white/[0.12]' : 'hover:border-[#d4d0c8] hover:shadow-md',
    navBg: d ? 'bg-[#0d0d0d]/90' : 'bg-white/92',
    tableRowAlt: d ? 'bg-white/[0.01]' : 'bg-[#faf9f6]',
    tableRowHover: d ? 'hover:bg-white/[0.04]' : 'hover:bg-[#f5f4f1]',
    tableCatBg: d ? 'bg-white/[0.03]' : 'bg-[#f5f3ee]',
    tableFootBg: d ? 'bg-[#c9a96e]/10' : 'bg-[#9a7d3e]/8',
    footerBg: d ? 'bg-[#0a0a0a]' : 'bg-[#f0ede6]',

    // Inline styles for ALL text colors (beats !important)
    s:     { color: txt } as React.CSSProperties,
    sSec:  { color: sec } as React.CSSProperties,
    sTer:  { color: ter } as React.CSSProperties,
    sMuted:{ color: muted } as React.CSSProperties,
    sInv:  { color: inv } as React.CSSProperties,
    sGold: { color: gold } as React.CSSProperties,
    sChk:  { color: chk } as React.CSSProperties,
    sBtnP: { color: d ? '#0d0d0d' : '#ffffff' } as React.CSSProperties,
    sBtnS: { color: d ? 'rgba(255,255,255,0.8)' : '#5c5c5c' } as React.CSSProperties,

    // Raw values
    txt, sec, ter, muted, inv, gold, chk,
  };
}

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mode, setMode] = useState<LandingThemeMode>(getLandingTheme);

  const toggleMode = () => {
    const next = mode === 'dark' ? 'light' : 'dark';
    setMode(next);
    setLandingTheme(next);
  };

  const handleGetStarted = () => {
    if (isAuthenticated && user) {
      navigate(getWorkspacePath(user.role || ''));
    } else {
      window.location.href = ATLAS_STUDIO.LOGIN;
    }
  };

  const c = t(mode);

  // Remote content from Atlas Studio (centralized landing)
  const { content: remoteContent } = useLandingContent('atlas-compta');
  const remotePricing = remoteContent?.pricing;
  const pmePrice = remotePricing?.plans?.[0]?.price ?? 49000;
  const premiumPrice = remotePricing?.plans?.[1]?.price ?? 250000;

  const remoteStats = remoteContent?.stats;
  const statsData = (remoteStats?.items as typeof STATS | undefined) ?? STATS;

  const remoteFaq = remoteContent?.faq;
  const faqData = (remoteFaq?.items as typeof FAQ | undefined) ?? FAQ;

  // Scroll-triggered animations
  const stats = useInView();
  const modules = useInView();
  const steps = useInView();
  const demoCta = useInView();
  const testimonials = useInView();
  const plans = useInView();
  const comparison = useInView(0.05);
  const faq = useInView();

  return (
    <div
      className={`landing-page min-h-screen ${c.bg} transition-colors duration-300`}
      style={{ color: c.txt }}
    >

      {/* ══════════ NAV ══════════ */}
      <nav className={`sticky top-0 ${c.navBg} backdrop-blur-xl border-b ${c.border} z-50 transition-colors duration-300`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AtlasStudioBrand className="atlas-brand text-2xl" style={c.s} />
            <span style={c.sMuted}>/</span>
            <span className="atlas-brand text-lg" style={c.sGold}>Atlas Finance &amp; Accounting</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm" style={c.sTer}>
            <a href="#modules" className="hover:opacity-80 transition-colors" style={c.sTer}>Applications</a>
            <a href="#tarifs" className="hover:opacity-80 transition-colors" style={c.sTer}>Tarifs</a>
            <a href="#blog" className="hover:opacity-80 transition-colors" style={c.sTer}>Blog</a>
            <a href="#about" className="hover:opacity-80 transition-colors" style={c.sTer}>À propos</a>
            <a href="#faq" className="hover:opacity-80 transition-colors" style={c.sTer}>FAQ</a>
            <a href="#contact" className="hover:opacity-80 transition-colors" style={c.sTer}>Contact</a>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggleMode} className={`p-2 rounded-lg ${mode === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors`} style={c.sTer} title={mode === 'dark' ? 'Mode jour' : 'Mode nuit'}>
              {mode === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {isAuthenticated ? (
              <button onClick={handleGetStarted} className={`px-5 py-2.5 ${c.btnPrimary} rounded-lg text-sm font-bold transition-all flex items-center gap-2`} style={c.sBtnP}>
                Mon espace <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <a href={ATLAS_STUDIO.LOGIN} className="px-4 py-2 text-sm font-medium transition-colors" style={c.sSec}>Se connecter</a>
                <a href={ATLAS_STUDIO.LOGIN} className={`px-5 py-2.5 ${c.btnPrimary} rounded-lg text-sm font-bold transition-all`} style={c.sBtnP}>Souscrire maintenant</a>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ══════════ HERO ══════════ */}
      <section className="relative pt-24 pb-20 px-6 overflow-hidden">
        {mode === 'dark' && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] bg-[#c9a96e]/[0.05] rounded-full blur-[120px] anim-glow" />
            <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
          </div>
        )}
        {mode === 'light' && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] bg-[#9a7d3e]/[0.04] rounded-full blur-[120px] anim-glow" />
          </div>
        )}

        <div className="max-w-5xl mx-auto text-center relative">
          <div className={`anim-hero inline-flex items-center gap-2 px-4 py-2 ${c.goldBgLight} border ${c.goldBorder} rounded-full text-xs font-semibold mb-8`} style={c.sGold}>
            <Sparkles className="w-3.5 h-3.5" /> 100 % conforme SYSCOHADA révisé 2017
          </div>

          <h1 className="anim-hero-delay-1 text-5xl md:text-7xl font-extrabold leading-[1.1] mb-6 tracking-tight" style={c.s}>
            La comptabilité africaine,
            <br />
            <span className={`bg-gradient-to-r ${c.gradFrom} ${c.gradVia} ${c.gradTo} bg-clip-text text-transparent`} style={{ color: 'transparent' }}>
              simplifiée et intelligente.
            </span>
          </h1>

          <p className="anim-hero-delay-2 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed" style={c.sSec}>
            Atlas F&A est l'ERP comptable et financier conçu pour les{' '}
            <strong style={c.s}>17 pays de l'espace OHADA</strong>.
            Écritures, états financiers, fiscalité, trésorerie — tout est automatisé.
          </p>

          <div className="anim-hero-delay-3 flex items-center justify-center gap-4 flex-wrap mb-14">
            <button onClick={handleGetStarted} className={`group px-8 py-4 ${c.btnPrimary} rounded-xl text-sm font-bold transition-all shadow-lg hover:-translate-y-0.5 flex items-center gap-2`} style={c.sBtnP}>
              <Zap className="w-4 h-4" /> Souscrire maintenant
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button onClick={() => navigate('/demo')} className={`px-8 py-4 ${c.btnSecondary} border rounded-xl text-sm font-semibold transition-all flex items-center gap-2`} style={c.sBtnS}>
              <Play className="w-4 h-4" style={c.sGold} /> Voir la démo
            </button>
          </div>

          <div className="anim-hero-delay-3 flex items-center justify-center gap-3 text-sm" style={c.sTer}>
            <div className="flex -space-x-2">
              {['AD', 'MC', 'IK', 'FN'].map((init, i) => (
                <div key={i} className={`w-9 h-9 rounded-full ${c.goldBg} border-2 ${mode === 'dark' ? 'border-[#0d0d0d]' : 'border-white'} flex items-center justify-center text-xs font-bold`} style={c.sInv}>
                  {init}
                </div>
              ))}
            </div>
            <span>Rejoint par <strong style={c.s}>500+ entreprises</strong> en Afrique</span>
          </div>
        </div>
      </section>

      {/* ══════════ STATS ══════════ */}
      <section className={`py-12 px-6 border-y ${c.border} ${c.bgAlt} transition-colors duration-300`}>
        <div ref={stats.ref} className={`max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 anim-stagger ${stats.className}`}>
          {statsData.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-4xl md:text-5xl" style={c.s}>
                <AnimatedNumber value={stat.value} suffix={stat.suffix} />
              </div>
              <p className="text-xs mt-2 uppercase tracking-wider font-medium" style={c.sTer}>{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════ MODULES ══════════ */}
      <section id="modules" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 ${c.goldBgLight} border ${c.goldBorder} rounded-full text-xs font-semibold mb-5`} style={c.sGold}>
              <Layers className="w-3.5 h-3.5" /> 8 modules intégrés
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4" style={c.s}>Tout ce dont vous avez besoin.</h2>
            <p className="max-w-xl mx-auto text-lg" style={c.sSec}>Une suite complète pour couvrir l'ensemble de vos besoins comptables et financiers.</p>
          </div>

          <div ref={modules.ref} className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 anim-stagger ${modules.className}`}>
            {MODULES.map((m, i) => (
              <div key={i} className={`group ${c.card} border rounded-2xl p-6 ${c.cardHover} transition-all duration-300 hover:-translate-y-1`}>
                <div className={`w-12 h-12 ${c.goldBgLight} rounded-xl flex items-center justify-center mb-4`}>
                  <m.icon className="w-6 h-6" style={c.sGold} />
                </div>
                <h3 className="text-sm font-bold mb-2" style={c.s}>{m.label}</h3>
                <p className="text-xs leading-relaxed" style={c.sTer}>{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ HOW IT WORKS ══════════ */}
      <section className={`py-24 px-6 ${c.bgAlt} transition-colors duration-300`}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 ${c.goldBgLight} border ${c.goldBorder} rounded-full text-xs font-semibold mb-5`} style={c.sGold}>
              <TrendingUp className="w-3.5 h-3.5" /> Démarrage rapide
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4" style={c.s}>Opérationnel en 10 minutes</h2>
            <p className="text-lg" style={c.sSec}>De l'inscription à votre premier bilan.</p>
          </div>

          <div ref={steps.ref} className={`grid grid-cols-1 md:grid-cols-4 gap-6 anim-stagger ${steps.className}`}>
            {STEPS.map((step, i) => (
              <div key={i} className="text-center">
                <div className={`w-16 h-16 ${c.goldBgLight} border ${c.goldBorder} rounded-2xl flex items-center justify-center mx-auto mb-5`}>
                  <span className="text-lg font-bold" style={c.sGold}>{step.num}</span>
                </div>
                <h3 className="text-sm font-bold mb-2" style={c.s}>{step.title}</h3>
                <p className="text-xs leading-relaxed" style={c.sTer}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ DEMO CTA ══════════ */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div ref={demoCta.ref} className={`anim-scale ${demoCta.className} relative ${mode === 'dark' ? 'bg-gradient-to-br from-white/[0.04] to-white/[0.02] border-white/[0.08]' : 'bg-gradient-to-br from-[#f8f7f4] to-[#f0ede6] border-[#e8e5de]'} border rounded-3xl p-10 md:p-14 overflow-hidden`}>
            <div className="relative flex flex-col md:flex-row items-center gap-10">
              <div className="flex-1">
                <div className={`inline-flex items-center gap-2 px-3 py-1 ${c.goldBgLight} border ${c.goldBorder} rounded-full text-xs font-semibold mb-4`} style={c.sGold}>
                  <MousePointerClick className="w-3.5 h-3.5" /> Aucun compte requis
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-3" style={c.s}>Essayez avant de vous inscrire</h2>
                <p className="mb-6 leading-relaxed" style={c.sSec}>
                  Visite guidée, démos interactives et tutoriels. Découvrez Atlas F&A en action.
                </p>
                <button onClick={() => navigate('/demo')} className={`group px-8 py-4 ${c.btnPrimary} rounded-xl text-sm font-bold transition-all shadow-lg inline-flex items-center gap-2`} style={c.sBtnP}>
                  <Play className="w-4 h-4" /> Lancer la démo
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>

              <div className="flex-shrink-0 grid grid-cols-1 gap-3 w-full md:w-72">
                {[
                  { icon: Calculator, title: 'Saisie d\'écriture', tag: 'Interactif' },
                  { icon: BarChart3, title: 'Bilan SYSCOHADA', tag: 'Drill-down' },
                  { icon: Shield, title: 'Calcul TVA auto', tag: 'Temps réel' },
                ].map((demo, i) => (
                  <button key={i} onClick={() => navigate('/demo')} className={`group/card flex items-center gap-3 p-3.5 ${c.card} border rounded-xl ${c.cardHover} transition-all text-left`}>
                    <div className={`w-10 h-10 ${c.goldBgLight} rounded-lg flex items-center justify-center shrink-0`}>
                      <demo.icon className="w-5 h-5" style={c.sGold} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={c.s}>{demo.title}</p>
                      <p className="text-[10px]" style={c.sTer}>{demo.tag}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ TESTIMONIALS ══════════ */}
      <section className={`py-24 px-6 ${c.bgAlt} transition-colors duration-300`}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 ${c.goldBgLight} border ${c.goldBorder} rounded-full text-xs font-semibold mb-5`} style={c.sGold}>
              <Star className="w-3.5 h-3.5" /> Ils nous font confiance
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4" style={c.s}>Ce que disent nos clients</h2>
          </div>
          <div ref={testimonials.ref} className={`grid grid-cols-1 md:grid-cols-3 gap-6 anim-stagger ${testimonials.className}`}>
            {TESTIMONIALS.map((tt, i) => (
              <div key={i} className={`${c.card} border rounded-2xl p-7 ${c.cardHover} transition-all`}>
                <div className="flex gap-0.5 mb-5">
                  {[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4" style={{ color: c.gold, fill: c.gold }} />)}
                </div>
                <p className="text-sm leading-relaxed mb-6 italic" style={c.sSec}>"{tt.text}"</p>
                <div className={`flex items-center gap-3 pt-5 border-t ${c.border}`}>
                  <div className={`w-10 h-10 rounded-full ${c.goldBg} flex items-center justify-center text-xs font-bold`} style={c.sInv}>{tt.initials}</div>
                  <div>
                    <p className="text-sm font-bold" style={c.s}>{tt.name}</p>
                    <p className="text-xs" style={c.sTer}>{tt.role} · {tt.company}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ PLANS ══════════ */}
      <section id="tarifs" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 ${c.goldBgLight} border ${c.goldBorder} rounded-full text-xs font-semibold mb-5`} style={c.sGold}>
              <Award className="w-3.5 h-3.5" /> Tarification transparente
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4" style={c.s}>Deux plans, zéro surprise</h2>
            <p className="text-lg" style={c.sSec}>Souscrivez maintenant · Sans engagement</p>
          </div>

          {/* Plan cards */}
          <div ref={plans.ref} className={`grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-16 anim-stagger ${plans.className}`}>
            {/* PME/TPE */}
            <div className={`${c.card} border-2 rounded-2xl p-8 ${c.cardHover} transition-all`}>
              <h3 className="text-xl font-bold" style={c.s}>PME / TPE</h3>
              <p className="text-sm mt-1" style={c.sSec}>Comptabilité complète pour une société</p>
              <div className="mt-6 mb-1">
                <span className="text-5xl font-bold" style={c.s}>{formatXOF(pmePrice)}</span>
                <span className="ml-2 text-sm" style={c.sTer}>FCFA / mois</span>
              </div>
              <p className="text-xs mb-6" style={c.sMuted}>~75 EUR · 1 à 5 utilisateurs · +9 000 FCFA/user suppl.</p>
              <button onClick={handleGetStarted} className={`w-full py-3.5 border-2 ${c.goldBorderSolid} rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2`} style={c.sGold}>
                <Zap className="w-4 h-4" /> Souscrire maintenant
              </button>
              <ul className="mt-7 space-y-3">
                {[
                  'Comptabilité SYSCOHADA complète',
                  'États financiers & TAFIRE',
                  'Fiscalité (TVA, IS, IMF)',
                  'Trésorerie & rapprochement',
                  <>IA <span className="atlas-brand">Proph3t</span> (contrôles)</>,
                  'Support email',
                ].map((f, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-xs" style={c.sSec}>
                    <CheckCircle className="w-4 h-4 shrink-0" style={c.sChk} /> {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Premium */}
            <div className={`relative ${c.card} border-2 ${c.goldBorderSolid} rounded-2xl p-8 shadow-xl`}>
              <div className={`absolute -top-3 right-6 ${c.goldBg} text-xs font-bold px-4 py-1 rounded-full flex items-center gap-1`} style={c.sInv}>
                <Star className="w-3 h-3" /> Populaire
              </div>
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5" style={c.sGold} />
                <h3 className="text-xl font-bold" style={c.s}>Premium</h3>
              </div>
              <p className="text-sm mt-1" style={c.sSec}>Multi-sociétés, devises, IA avancée, RBAC, API</p>
              <div className="mt-6 mb-1">
                <span className="text-5xl font-bold" style={c.s}>{formatXOF(premiumPrice)}</span>
                <span className="ml-2 text-sm" style={c.sTer}>FCFA / mois</span>
              </div>
              <p className="text-xs mb-6" style={c.sMuted}>~380 EUR · Utilisateurs illimités · 5+ sociétés : sur devis</p>
              <button onClick={handleGetStarted} className={`w-full py-3.5 ${c.btnPrimary} rounded-xl text-sm font-bold transition-all shadow-lg flex items-center justify-center gap-2`} style={c.sBtnP}>
                <Zap className="w-4 h-4" /> Souscrire maintenant
              </button>
              <ul className="mt-7 space-y-3">
                {[
                  'Tout le plan PME/TPE, plus :',
                  'Multi-sociétés illimité',
                  'Multi-devises & multi-pays',
                  <>IA <span className="atlas-brand">Proph3t</span> avancé (LLM)</>,
                  'Workflow RBAC & audit trail',
                  'API REST & intégrations',
                  'Support prioritaire & formation',
                  'SLA 99.5 %',
                ].map((f, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-xs" style={c.sSec}>
                    <CheckCircle className="w-4 h-4 shrink-0" style={c.sChk} /> {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* ══════ Feature comparison — HIGH CONTRAST ══════ */}
          <div ref={comparison.ref} className={`anim-fade-up ${comparison.className} ${c.card} border rounded-2xl overflow-hidden`}>
            <div className={`px-6 py-4 border-b ${c.border} flex items-center justify-between ${c.bgAlt}`}>
              <h3 className="text-sm font-bold" style={c.s}>Comparatif complet des fonctionnalités</h3>
              <span className="text-[10px] uppercase tracking-wider" style={c.sMuted}>{FEATURE_MATRIX.reduce((a, cc) => a + cc.items.length, 0)} fonctionnalités</span>
            </div>

            {/* Header row */}
            <div className={`grid grid-cols-[1fr_100px_100px] ${c.bgAlt} border-b ${c.border}`}>
              <div className="px-6 py-3 text-xs font-bold uppercase tracking-wider" style={c.sTer}>Fonctionnalité</div>
              <div className="px-3 py-3 text-xs font-bold text-center" style={c.sSec}>PME / TPE</div>
              <div className="px-3 py-3 text-xs font-bold text-center" style={c.sGold}>Premium</div>
            </div>

            {FEATURE_MATRIX.map((cat, ci) => (
              <div key={ci}>
                <div className={`px-6 py-3 ${c.tableCatBg} border-y ${c.border}`}>
                  <span className="text-xs font-bold uppercase tracking-wider" style={c.sGold}>{cat.category}</span>
                </div>
                {cat.items.map((item, ii) => (
                  <div key={ii} className={`grid grid-cols-[1fr_100px_100px] border-b ${c.border} last:border-b-0 ${ii % 2 === 1 ? c.tableRowAlt : ''} ${c.tableRowHover} transition-colors`}>
                    <div className="px-6 py-3 text-sm font-medium" style={c.sSec}>{item.label}</div>
                    <div className="flex items-center justify-center">
                      {item.pme
                        ? <CheckCircle className="w-5 h-5" style={c.sChk} />
                        : <X className="w-4 h-4" style={c.sMuted} />}
                    </div>
                    <div className="flex items-center justify-center">
                      {item.premium
                        ? <CheckCircle className="w-5 h-5" style={c.sChk} />
                        : <X className="w-4 h-4" style={c.sMuted} />}
                    </div>
                  </div>
                ))}
              </div>
            ))}

            <div className={`grid grid-cols-[1fr_100px_100px] ${c.tableFootBg} border-t ${c.goldBorder}`}>
              <div className="px-6 py-4 text-sm font-bold" style={c.s}>Prix mensuel</div>
              <div className="flex flex-col items-center justify-center py-4">
                <span className="text-sm font-bold" style={c.s}>{formatXOF(pmePrice)}</span>
                <span className="text-[10px]" style={c.sTer}>FCFA</span>
              </div>
              <div className="flex flex-col items-center justify-center py-4">
                <span className="text-sm font-bold" style={c.sGold}>{formatXOF(premiumPrice)}</span>
                <span className="text-[10px]" style={{ color: c.gold, opacity: 0.6 }}>FCFA</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ FAQ ══════════ */}
      <section id="faq" className={`py-24 px-6 ${c.bgAlt} transition-colors duration-300`}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-5xl font-bold mb-4" style={c.s}>Questions fréquentes</h2>
            <p className="text-lg" style={c.sSec}>Tout ce que vous devez savoir.</p>
          </div>
          <div ref={faq.ref} className={`space-y-3 anim-stagger ${faq.className}`}>
            {faqData.map((item, i) => (
              <div key={i} className={`${c.card} border rounded-xl overflow-hidden ${c.cardHover} transition-colors`}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between p-5 text-left">
                  <span className="text-sm font-semibold pr-4" style={c.s}>{item.q}</span>
                  <ChevronDown className="w-5 h-5 shrink-0 transition-transform duration-200" style={openFaq === i ? c.sGold : c.sTer} />
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${openFaq === i ? 'max-h-40' : 'max-h-0'}`}>
                  <div className="px-5 pb-5">
                    <p className="text-sm leading-relaxed" style={c.sSec}>{item.a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ FINAL CTA ══════════ */}
      <section className="py-24 px-6 bg-[#1a1a1a]" style={{ color: '#ffffff' }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-bold mb-5" style={{ color: '#ffffff' }}>
            Prêt à simplifier votre
            <br />
            <span className="bg-gradient-to-r from-[#dbc396] via-[#e0cc9e] to-[#dbc396] bg-clip-text text-transparent" style={{ color: 'transparent' }}>comptabilité ?</span>
          </h2>
          <p className="text-lg max-w-lg mx-auto mb-10" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Rejoignez 500+ entreprises qui font confiance à Atlas F&A. Souscrivez maintenant.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap mb-8">
            <button onClick={handleGetStarted} className="group px-10 py-4 bg-[#c9a96e] rounded-xl text-sm font-bold hover:bg-[#dbc396] transition-all shadow-lg hover:-translate-y-0.5 flex items-center gap-2" style={{ color: '#0d0d0d' }}>
              <Zap className="w-4 h-4" /> Créer mon compte
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button onClick={() => navigate('/demo')} className="px-10 py-4 bg-white/5 border border-white/10 rounded-xl text-sm font-semibold hover:bg-white/10 transition-all flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.8)' }}>
              <Play className="w-4 h-4" style={{ color: '#c9a96e' }} /> Voir la démo
            </button>
          </div>
          <div className="flex items-center justify-center gap-6 text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
            <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" style={{ color: 'rgba(52,211,153,0.5)' }} /> Sans carte bancaire</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" style={{ color: 'rgba(52,211,153,0.5)' }} /> Mobile Money accepté</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" style={{ color: 'rgba(52,211,153,0.5)' }} /> Support réactif</span>
          </div>
        </div>
      </section>

      {/* ══════════ FOOTER ══════════ */}
      <footer className={`${c.footerBg} border-t ${c.border} py-14 px-6 transition-colors duration-300`}>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
            <div>
              <AtlasStudioBrand className="atlas-brand text-2xl" style={c.s} />
              <p className="atlas-brand text-sm mt-1" style={c.sGold}>Atlas Finance &amp; Accounting</p>
              <p className="text-xs leading-relaxed mt-2" style={c.sTer}>ERP comptable et financier pour l'Afrique. Conforme SYSCOHADA, intelligent et sécurisé.</p>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider mb-4" style={c.sTer}>Navigation</h4>
              <ul className="space-y-2.5 text-xs" style={c.sMuted}>
                <li><a href="#modules" style={c.sMuted}>Applications</a></li>
                <li><a href="#tarifs" style={c.sMuted}>Tarifs</a></li>
                <li><a href="#blog" style={c.sMuted}>Blog</a></li>
                <li><a href="#about" style={c.sMuted}>À propos</a></li>
                <li><a href="#faq" style={c.sMuted}>FAQ</a></li>
                <li><a href="#contact" style={c.sMuted}>Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider mb-4" style={c.sTer}>Solutions</h4>
              <ul className="space-y-2.5 text-xs" style={c.sMuted}>
                <li className="flex items-center gap-1.5"><span className={`w-1.5 h-1.5 rounded-full ${c.goldBg}`} /> Atlas F&A</li>
                <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> Liass'Pilot</li>
                <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Advist</li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider mb-4" style={c.sTer}>Contact</h4>
              <ul className="space-y-2.5 text-xs" style={c.sMuted}>
                <li className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> contact@atlasstudio.com</li>
                <li className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> +237 6XX XXX XXX</li>
                <li className="flex items-center gap-2"><Building2 className="w-3.5 h-3.5" /> Douala, Cameroun</li>
              </ul>
            </div>
          </div>
          <div className={`border-t ${c.border} pt-6 flex flex-col md:flex-row items-center justify-between gap-4`}>
            <span className="text-xs" style={c.sMuted}>&copy; {new Date().getFullYear()} <AtlasStudioBrand className="hover:opacity-80">Atlas Studio</AtlasStudioBrand>. Tous droits réservés.</span>
            <div className="flex items-center gap-6 text-xs" style={c.sMuted}>
              <span>Mentions légales</span>
              <span>Confidentialité</span>
              <span>CGV</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
