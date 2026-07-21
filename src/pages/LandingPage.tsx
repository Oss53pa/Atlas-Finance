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
  TrendingUp, Award, Layers, PieChart, Landmark,
  MousePointerClick, Phone, Mail,
  Sparkles, Sun, Moon,
} from 'lucide-react';
import { FEATURE_MATRIX } from '../config/plans';
import { useLandingContent } from '../hooks/useLandingContent';
import { useLanguage } from '@/contexts/LanguageContext';

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

/* ═══ Data (i18n : les chaînes sont des CLÉS résolues au rendu) ═══ */
type ModuleItem = {
  icon: typeof Calculator;
  labelKey: string;
  descKey: string;
  /** Ajoute le suffixe de marque « Proph3t » après le libellé traduit. */
  brand?: boolean;
};

const MODULES: ModuleItem[] = [
  { icon: Calculator, labelKey: 'landing.modAccounting', descKey: 'landing.modAccountingDesc' },
  { icon: BarChart3, labelKey: 'landing.modStatements', descKey: 'landing.modStatementsDesc' },
  { icon: Shield, labelKey: 'landing.modTax', descKey: 'landing.modTaxDesc' },
  { icon: Wallet, labelKey: 'landing.modTreasury', descKey: 'landing.modTreasuryDesc' },
  { icon: PieChart, labelKey: 'landing.modControlling', descKey: 'landing.modControllingDesc' },
  { icon: Landmark, labelKey: 'landing.modAssets', descKey: 'landing.modAssetsDesc' },
  { icon: Users, labelKey: 'landing.modThirdParties', descKey: 'landing.modThirdPartiesDesc' },
  { icon: CheckCircle, labelKey: 'landing.modClosing', descKey: 'landing.modClosingDesc' },
  { icon: Brain, labelKey: 'landing.modAi', descKey: 'landing.modAiDesc', brand: true },
  { icon: Globe, labelKey: 'landing.modMultiCurrency', descKey: 'landing.modMultiCurrencyDesc' },
  { icon: Building2, labelKey: 'landing.modMultiCompany', descKey: 'landing.modMultiCompanyDesc' },
  { icon: Lock, labelKey: 'landing.modAudit', descKey: 'landing.modAuditDesc' },
];

/** `label` reste possible : le contenu distant (Atlas Studio) fournit du texte déjà localisé. */
type StatItem = { value: string; suffix: string; labelKey?: string; label?: string };

const STATS: StatItem[] = [
  { value: '500', suffix: '+', labelKey: 'landing.statCompanies' },
  { value: '17', suffix: '', labelKey: 'landing.statCountries' },
  { value: '100', suffix: '%', labelKey: 'landing.statCompliance' },
  { value: '99', suffix: '.9%', labelKey: 'landing.statUptime' },
];

const STEPS = [
  { num: '01', titleKey: 'landing.step1Title', descKey: 'landing.step1Desc' },
  { num: '02', titleKey: 'landing.step2Title', descKey: 'landing.step2Desc' },
  { num: '03', titleKey: 'landing.step3Title', descKey: 'landing.step3Desc' },
  { num: '04', titleKey: 'landing.step4Title', descKey: 'landing.step4Desc' },
];

const TESTIMONIALS = [
  { name: 'Amadou Diallo', initials: 'AD', roleKey: 'landing.testimonial1Role', company: 'Cabinet Diallo & Associés, Dakar', textKey: 'landing.testimonial1Text' },
  { name: 'Marie-Claire Eboué', initials: 'MC', roleKey: 'landing.testimonial2Role', company: 'TechCorp Cameroun, Douala', textKey: 'landing.testimonial2Text' },
  { name: 'Ibrahim Koné', initials: 'IK', roleKey: 'landing.testimonial3Role', company: 'Groupe Koné Industries, Abidjan', textKey: 'landing.testimonial3Text' },
];

/** `q`/`a` restent possibles : le contenu distant fournit du texte déjà localisé. */
type FaqItem = { qKey?: string; aKey?: string; q?: string; a?: string };

const FAQ: FaqItem[] = [
  { qKey: 'landing.faq1Q', aKey: 'landing.faq1A' },
  { qKey: 'landing.faq2Q', aKey: 'landing.faq2A' },
  { qKey: 'landing.faq3Q', aKey: 'landing.faq3A' },
  { qKey: 'landing.faq4Q', aKey: 'landing.faq4A' },
  { qKey: 'landing.faq5Q', aKey: 'landing.faq5A' },
  { qKey: 'landing.faq6Q', aKey: 'landing.faq6A' },
];

/* ═══ Theme-aware CSS helper ═══ */
/* Globals.css forces color on h1-h6 and p with !important via CSS vars.
   We use inline styles for text colors to beat specificity. */
function t(mode: LandingThemeMode) {
  const d = mode === 'dark';
  // Petrol Cream — accent pétrole (clair) / ambre (sombre).
  // All text colors as raw values for inline styles (beats globals.css !important)
  const txt    = d ? '#F7F5EF' : '#261E15';
  const sec    = d ? 'rgba(247,245,239,0.55)' : '#5C5347';
  const ter    = d ? 'rgba(247,245,239,0.34)' : '#8A8170';
  const muted  = d ? 'rgba(247,245,239,0.20)' : '#B0A893';
  const inv    = d ? '#0C2530' : '#ffffff';
  const gold   = d ? '#E89A2E' : '#235A6E';
  const chk    = d ? '#34d399' : '#15803D';

  return {
    // Backgrounds (classes — these work fine, globals don't override bg)
    bg: d ? 'bg-[#0C2530]' : 'bg-[#F7F5EF]',
    bgAlt: d ? 'bg-[#13323D]' : 'bg-white',
    goldBg: d ? 'bg-[#E89A2E]' : 'bg-[#235A6E]',
    goldBgLight: d ? 'bg-[#E89A2E]/10' : 'bg-[#235A6E]/8',
    goldBorder: d ? 'border-[#E89A2E]/22' : 'border-[#235A6E]/20',
    goldBorderSolid: d ? 'border-[#E89A2E]' : 'border-[#235A6E]',
    border: d ? 'border-white/[0.07]' : 'border-[#E8E3D6]',
    gradFrom: d ? 'from-[#F2A93B]' : 'from-[#235A6E]',
    gradVia: d ? 'via-[#F2A93B]' : 'via-[#2C6E86]',
    gradTo: d ? 'to-[#E89A2E]' : 'to-[#1B4856]',
    btnPrimary: d ? 'bg-[#E89A2E] hover:bg-[#F2A93B]' : 'bg-[#235A6E] hover:bg-[#1B4856]',
    btnSecondary: d ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-[#E8E3D6] hover:bg-[#F7F5EF]',
    card: d ? 'bg-white/[0.03] border-white/[0.07]' : 'bg-white border-[#E8E3D6] shadow-sm',
    cardHover: d ? 'hover:bg-white/[0.06] hover:border-white/[0.12]' : 'hover:border-[#235A6E]/40 hover:shadow-md',
    navBg: d ? 'bg-[#0C2530]/90' : 'bg-white/92',
    tableRowAlt: d ? 'bg-white/[0.01]' : 'bg-[#FAF8F2]',
    tableRowHover: d ? 'hover:bg-white/[0.04]' : 'hover:bg-[#F2EEE4]',
    tableCatBg: d ? 'bg-white/[0.03]' : 'bg-[#F1ECE0]',
    tableFootBg: d ? 'bg-[#E89A2E]/10' : 'bg-[#235A6E]/8',
    footerBg: d ? 'bg-[#081C24]' : 'bg-[#F0EBE0]',

    // Inline styles for ALL text colors (beats !important)
    s:     { color: txt } as React.CSSProperties,
    sSec:  { color: sec } as React.CSSProperties,
    sTer:  { color: ter } as React.CSSProperties,
    sMuted:{ color: muted } as React.CSSProperties,
    sInv:  { color: inv } as React.CSSProperties,
    sGold: { color: gold } as React.CSSProperties,
    sChk:  { color: chk } as React.CSSProperties,
    sBtnP: { color: d ? '#261E15' : '#ffffff' } as React.CSSProperties,
    sBtnS: { color: d ? 'rgba(247,245,239,0.8)' : '#5C5347' } as React.CSSProperties,

    // Raw values
    txt, sec, ter, muted, inv, gold, chk,
  };
}

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  // `t` est déjà pris par le helper de thème ci-dessus → on alias la fonction i18n en `tr`.
  const { t: tr } = useLanguage();
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
      // Connexion à l'app (entreprise déjà créée dans la console) → login interne
      // Supabase, PAS le site vitrine Atlas Studio (qui n'a pas de vrai formulaire).
      navigate('/login');
    }
  };

  const c = t(mode);

  // Remote content from Atlas Studio (centralized landing)
  const { content: remoteContent } = useLandingContent('atlas-compta');
  const remotePricing = remoteContent?.pricing;
  const pmePrice = remotePricing?.plans?.[0]?.price ?? 49000;
  const premiumPrice = remotePricing?.plans?.[1]?.price ?? 250000;

  const remoteStats = remoteContent?.stats;
  const statsData = (remoteStats?.items as StatItem[] | undefined) ?? STATS;

  const remoteFaq = remoteContent?.faq;
  const faqData = (remoteFaq?.items as FaqItem[] | undefined) ?? FAQ;

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
            <a href="#modules" className="hover:opacity-80 transition-colors" style={c.sTer}>{tr('landing.navApplications')}</a>
            <a href="#tarifs" className="hover:opacity-80 transition-colors" style={c.sTer}>{tr('landing.navPricing')}</a>
            <a href="#blog" className="hover:opacity-80 transition-colors" style={c.sTer}>{tr('landing.navBlog')}</a>
            <a href="#about" className="hover:opacity-80 transition-colors" style={c.sTer}>{tr('landing.navAbout')}</a>
            <a href="#faq" className="hover:opacity-80 transition-colors" style={c.sTer}>{tr('landing.navFaq')}</a>
            <a href="#contact" className="hover:opacity-80 transition-colors" style={c.sTer}>{tr('landing.navContact')}</a>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={toggleMode} className={`p-2 rounded-lg ${mode === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-100'} transition-colors`} style={c.sTer} title={mode === 'dark' ? tr('landing.lightMode') : tr('landing.darkMode')}>
              {mode === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {isAuthenticated ? (
              <button onClick={handleGetStarted} className={`px-5 py-2.5 ${c.btnPrimary} rounded-lg text-sm font-bold transition-all flex items-center gap-2`} style={c.sBtnP}>
                {tr('landing.myWorkspace')} <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <button onClick={() => navigate('/login')} className="px-4 py-2 text-sm font-medium transition-colors" style={c.sSec}>{tr('landing.signIn')}</button>
                <a href={ATLAS_STUDIO.LOGIN} className={`px-5 py-2.5 ${c.btnPrimary} rounded-lg text-sm font-bold transition-all`} style={c.sBtnP}>{tr('landing.subscribeNow')}</a>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ══════════ HERO ══════════ */}
      <section className="relative pt-24 pb-20 px-6 overflow-hidden">
        {mode === 'dark' && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] bg-[#E89A2E]/[0.06] rounded-full blur-[120px] anim-glow" />
            <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
          </div>
        )}
        {mode === 'light' && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] bg-[#235A6E]/[0.05] rounded-full blur-[120px] anim-glow" />
          </div>
        )}

        <div className="max-w-5xl mx-auto text-center relative">
          <div className={`anim-hero inline-flex items-center gap-2 px-4 py-2 ${c.goldBgLight} border ${c.goldBorder} rounded-full text-xs font-semibold mb-8`} style={c.sGold}>
            <Sparkles className="w-3.5 h-3.5" /> {tr('landing.heroBadge')}
          </div>

          <h1 className="anim-hero-delay-1 text-5xl md:text-7xl font-extrabold leading-[1.1] mb-6 tracking-tight" style={c.s}>
            {tr('landing.heroTitle1')}
            <br />
            <span className={`bg-gradient-to-r ${c.gradFrom} ${c.gradVia} ${c.gradTo} bg-clip-text text-transparent`} style={{ color: 'transparent' }}>
              {tr('landing.heroTitle2')}
            </span>
          </h1>

          <p className="anim-hero-delay-2 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed" style={c.sSec}>
            {tr('landing.heroSubtitlePart1')}{' '}
            <strong style={c.s}>{tr('landing.heroSubtitleStrong')}</strong>.{' '}
            {tr('landing.heroSubtitlePart2')}
          </p>

          <div className="anim-hero-delay-3 flex items-center justify-center gap-4 flex-wrap mb-14">
            <button onClick={handleGetStarted} className={`group px-8 py-4 ${c.btnPrimary} rounded-xl text-sm font-bold transition-all shadow-lg hover:-translate-y-0.5 flex items-center gap-2`} style={c.sBtnP}>
              <Zap className="w-4 h-4" /> {tr('landing.subscribeNow')}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button onClick={() => navigate('/demo')} className={`px-8 py-4 ${c.btnSecondary} border rounded-xl text-sm font-semibold transition-all flex items-center gap-2`} style={c.sBtnS}>
              <Play className="w-4 h-4" style={c.sGold} /> {tr('landing.watchDemo')}
            </button>
          </div>

          <div className="anim-hero-delay-3 flex items-center justify-center gap-3 text-sm" style={c.sTer}>
            <div className="flex -space-x-2">
              {['AD', 'MC', 'IK', 'FN'].map((init, i) => (
                <div key={i} className={`w-9 h-9 rounded-full ${c.goldBg} border-2 ${mode === 'dark' ? 'border-[#0C2530]' : 'border-white'} flex items-center justify-center text-xs font-bold`} style={c.sInv}>
                  {init}
                </div>
              ))}
            </div>
            <span>{tr('landing.heroJoinedByPrefix')} <strong style={c.s}>{tr('landing.heroJoinedByStrong')}</strong> {tr('landing.heroJoinedBySuffix')}</span>
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
              <p className="text-xs mt-2 uppercase tracking-wider font-medium" style={c.sTer}>{stat.labelKey ? tr(stat.labelKey) : stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════ MODULES ══════════ */}
      <section id="modules" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 ${c.goldBgLight} border ${c.goldBorder} rounded-full text-xs font-semibold mb-5`} style={c.sGold}>
              <Layers className="w-3.5 h-3.5" /> {tr('landing.modulesBadge')}
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4" style={c.s}>{tr('landing.modulesTitle')}</h2>
            <p className="max-w-xl mx-auto text-lg" style={c.sSec}>{tr('landing.modulesSubtitle')}</p>
          </div>

          <div ref={modules.ref} className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 anim-stagger ${modules.className}`}>
            {MODULES.map((m, i) => (
              <div key={i} className={`group ${c.card} border rounded-2xl p-6 ${c.cardHover} transition-all duration-300 hover:-translate-y-1`}>
                <div className={`w-12 h-12 ${c.goldBgLight} rounded-xl flex items-center justify-center mb-4`}>
                  <m.icon className="w-6 h-6" style={c.sGold} />
                </div>
                <h3 className="text-sm font-bold mb-2" style={c.s}>
                  {m.brand
                    ? <>{tr(m.labelKey)} <span className="atlas-brand">Proph3t</span></>
                    : tr(m.labelKey)}
                </h3>
                <p className="text-xs leading-relaxed" style={c.sTer}>{tr(m.descKey)}</p>
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
              <TrendingUp className="w-3.5 h-3.5" /> {tr('landing.stepsBadge')}
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4" style={c.s}>{tr('landing.stepsTitle')}</h2>
            <p className="text-lg" style={c.sSec}>{tr('landing.stepsSubtitle')}</p>
          </div>

          <div ref={steps.ref} className={`grid grid-cols-1 md:grid-cols-4 gap-6 anim-stagger ${steps.className}`}>
            {STEPS.map((step, i) => (
              <div key={i} className="text-center">
                <div className={`w-16 h-16 ${c.goldBgLight} border ${c.goldBorder} rounded-2xl flex items-center justify-center mx-auto mb-5`}>
                  <span className="text-lg font-bold" style={c.sGold}>{step.num}</span>
                </div>
                <h3 className="text-sm font-bold mb-2" style={c.s}>{tr(step.titleKey)}</h3>
                <p className="text-xs leading-relaxed" style={c.sTer}>{tr(step.descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ DEMO CTA ══════════ */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div ref={demoCta.ref} className={`anim-scale ${demoCta.className} relative ${mode === 'dark' ? 'bg-gradient-to-br from-white/[0.04] to-white/[0.02] border-white/[0.08]' : 'bg-gradient-to-br from-[#F7F5EF] to-[#F0EBE0] border-[#E8E3D6]'} border rounded-3xl p-10 md:p-14 overflow-hidden`}>
            <div className="relative flex flex-col md:flex-row items-center gap-10">
              <div className="flex-1">
                <div className={`inline-flex items-center gap-2 px-3 py-1 ${c.goldBgLight} border ${c.goldBorder} rounded-full text-xs font-semibold mb-4`} style={c.sGold}>
                  <MousePointerClick className="w-3.5 h-3.5" /> {tr('landing.demoBadge')}
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-3" style={c.s}>{tr('landing.demoTitle')}</h2>
                <p className="mb-6 leading-relaxed" style={c.sSec}>
                  {tr('landing.demoSubtitle')}
                </p>
                <button onClick={() => navigate('/demo')} className={`group px-8 py-4 ${c.btnPrimary} rounded-xl text-sm font-bold transition-all shadow-lg inline-flex items-center gap-2`} style={c.sBtnP}>
                  <Play className="w-4 h-4" /> {tr('landing.demoLaunch')}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>

              <div className="flex-shrink-0 grid grid-cols-1 gap-3 w-full md:w-72">
                {[
                  { icon: Calculator, title: tr('landing.demoCardEntry'), tag: tr('landing.demoCardEntryTag') },
                  { icon: BarChart3, title: tr('landing.demoCardBalanceSheet'), tag: tr('landing.demoCardBalanceSheetTag') },
                  { icon: Shield, title: tr('landing.demoCardVat'), tag: tr('landing.demoCardVatTag') },
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
              <Star className="w-3.5 h-3.5" /> {tr('landing.testimonialsBadge')}
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4" style={c.s}>{tr('landing.testimonialsTitle')}</h2>
          </div>
          <div ref={testimonials.ref} className={`grid grid-cols-1 md:grid-cols-3 gap-6 anim-stagger ${testimonials.className}`}>
            {TESTIMONIALS.map((tt, i) => (
              <div key={i} className={`${c.card} border rounded-2xl p-7 ${c.cardHover} transition-all`}>
                <div className="flex gap-0.5 mb-5">
                  {[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4" style={{ color: c.gold, fill: c.gold }} />)}
                </div>
                <p className="text-sm leading-relaxed mb-6 italic" style={c.sSec}>"{tr(tt.textKey)}"</p>
                <div className={`flex items-center gap-3 pt-5 border-t ${c.border}`}>
                  <div className={`w-10 h-10 rounded-full ${c.goldBg} flex items-center justify-center text-xs font-bold`} style={c.sInv}>{tt.initials}</div>
                  <div>
                    <p className="text-sm font-bold" style={c.s}>{tt.name}</p>
                    <p className="text-xs" style={c.sTer}>{tr(tt.roleKey)} · {tt.company}</p>
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
              <Award className="w-3.5 h-3.5" /> {tr('landing.pricingBadge')}
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4" style={c.s}>{tr('landing.pricingTitle')}</h2>
            <p className="text-lg" style={c.sSec}>{tr('landing.pricingSubtitle')}</p>
          </div>

          {/* Plan cards */}
          <div ref={plans.ref} className={`grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-16 anim-stagger ${plans.className}`}>
            {/* PME/TPE */}
            <div className={`${c.card} border-2 rounded-2xl p-8 ${c.cardHover} transition-all`}>
              <h3 className="text-xl font-bold" style={c.s}>{tr('landing.planSmb')}</h3>
              <p className="text-sm mt-1" style={c.sSec}>{tr('landing.planSmbDesc')}</p>
              <div className="mt-6 mb-1">
                <span className="text-5xl font-bold" style={c.s}>{formatXOF(pmePrice)}</span>
                <span className="ml-2 text-sm" style={c.sTer}>{tr('landing.perMonth')}</span>
              </div>
              <p className="text-xs mb-6" style={c.sMuted}>{tr('landing.planSmbNote')}</p>
              <button onClick={handleGetStarted} className={`w-full py-3.5 border-2 ${c.goldBorderSolid} rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2`} style={c.sGold}>
                <Zap className="w-4 h-4" /> {tr('landing.subscribeNow')}
              </button>
              <ul className="mt-7 space-y-3">
                {[
                  tr('landing.planSmbFeat1'),
                  tr('landing.planSmbFeat2'),
                  tr('landing.planSmbFeat3'),
                  tr('landing.planSmbFeat4'),
                  <>{tr('landing.planSmbFeat5Prefix')} <span className="atlas-brand">Proph3t</span> {tr('landing.planSmbFeat5Suffix')}</>,
                  tr('landing.planSmbFeat6'),
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
                <Star className="w-3 h-3" /> {tr('landing.popular')}
              </div>
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5" style={c.sGold} />
                <h3 className="text-xl font-bold" style={c.s}>Premium</h3>
              </div>
              <p className="text-sm mt-1" style={c.sSec}>{tr('landing.planPremiumDesc')}</p>
              <div className="mt-6 mb-1">
                <span className="text-5xl font-bold" style={c.s}>{formatXOF(premiumPrice)}</span>
                <span className="ml-2 text-sm" style={c.sTer}>{tr('landing.perMonth')}</span>
              </div>
              <p className="text-xs mb-6" style={c.sMuted}>{tr('landing.planPremiumNote')}</p>
              <button onClick={handleGetStarted} className={`w-full py-3.5 ${c.btnPrimary} rounded-xl text-sm font-bold transition-all shadow-lg flex items-center justify-center gap-2`} style={c.sBtnP}>
                <Zap className="w-4 h-4" /> {tr('landing.subscribeNow')}
              </button>
              <ul className="mt-7 space-y-3">
                {[
                  tr('landing.planPremiumFeat1'),
                  tr('landing.planPremiumFeat2'),
                  tr('landing.planPremiumFeat3'),
                  tr('landing.planPremiumFeat4'),
                  <>{tr('landing.planPremiumFeat5Prefix')} <span className="atlas-brand">Proph3t</span> {tr('landing.planPremiumFeat5Suffix')}</>,
                  tr('landing.planPremiumFeat6'),
                  tr('landing.planPremiumFeat7'),
                  tr('landing.planPremiumFeat8'),
                  tr('landing.planPremiumFeat9'),
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
              <h3 className="text-sm font-bold" style={c.s}>{tr('landing.comparisonTitle')}</h3>
              <span className="text-[10px] uppercase tracking-wider" style={c.sMuted}>{tr('landing.featuresCount', { count: String(FEATURE_MATRIX.reduce((a, cc) => a + cc.items.length, 0)) })}</span>
            </div>

            {/* Header row */}
            <div className={`grid grid-cols-[1fr_100px_100px] ${c.bgAlt} border-b ${c.border}`}>
              <div className="px-6 py-3 text-xs font-bold uppercase tracking-wider" style={c.sTer}>{tr('landing.featureColumn')}</div>
              <div className="px-3 py-3 text-xs font-bold text-center" style={c.sSec}>{tr('landing.planSmb')}</div>
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
              <div className="px-6 py-4 text-sm font-bold" style={c.s}>{tr('landing.monthlyPrice')}</div>
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
            <h2 className="text-3xl md:text-5xl font-bold mb-4" style={c.s}>{tr('landing.faqTitle')}</h2>
            <p className="text-lg" style={c.sSec}>{tr('landing.faqSubtitle')}</p>
          </div>
          <div ref={faq.ref} className={`space-y-3 anim-stagger ${faq.className}`}>
            {faqData.map((item, i) => (
              <div key={i} className={`${c.card} border rounded-xl overflow-hidden ${c.cardHover} transition-colors`}>
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between p-5 text-left">
                  <span className="text-sm font-semibold pr-4" style={c.s}>{item.qKey ? tr(item.qKey) : item.q}</span>
                  <ChevronDown className="w-5 h-5 shrink-0 transition-transform duration-200" style={openFaq === i ? c.sGold : c.sTer} />
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${openFaq === i ? 'max-h-40' : 'max-h-0'}`}>
                  <div className="px-5 pb-5">
                    <p className="text-sm leading-relaxed" style={c.sSec}>{item.aKey ? tr(item.aKey) : item.a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ FINAL CTA ══════════ */}
      <section className="py-24 px-6 bg-[#13323D]" style={{ color: '#ffffff' }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-bold mb-5" style={{ color: '#ffffff' }}>
            {tr('landing.ctaTitle1')}
            <br />
            <span className="bg-gradient-to-r from-[#F2A93B] via-[#F2A93B] to-[#E89A2E] bg-clip-text text-transparent" style={{ color: 'transparent' }}>{tr('landing.ctaTitle2')}</span>
          </h2>
          <p className="text-lg max-w-lg mx-auto mb-10" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {tr('landing.ctaSubtitle')}
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap mb-8">
            <button onClick={handleGetStarted} className="group px-10 py-4 bg-[#E89A2E] rounded-xl text-sm font-bold hover:bg-[#F2A93B] transition-all shadow-lg hover:-translate-y-0.5 flex items-center gap-2" style={{ color: '#261E15' }}>
              <Zap className="w-4 h-4" /> {tr('landing.createAccount')}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button onClick={() => navigate('/demo')} className="px-10 py-4 bg-white/5 border border-white/10 rounded-xl text-sm font-semibold hover:bg-white/10 transition-all flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.8)' }}>
              <Play className="w-4 h-4" style={{ color: '#E89A2E' }} /> {tr('landing.watchDemo')}
            </button>
          </div>
          <div className="flex items-center justify-center gap-6 text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
            <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" style={{ color: 'rgba(52,211,153,0.5)' }} /> {tr('landing.noCreditCard')}</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" style={{ color: 'rgba(52,211,153,0.5)' }} /> {tr('landing.mobileMoneyAccepted')}</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5" style={{ color: 'rgba(52,211,153,0.5)' }} /> {tr('landing.responsiveSupport')}</span>
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
              <p className="text-xs leading-relaxed mt-2" style={c.sTer}>{tr('landing.footerTagline')}</p>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider mb-4" style={c.sTer}>{tr('landing.footerNavigation')}</h4>
              <ul className="space-y-2.5 text-xs" style={c.sMuted}>
                <li><a href="#modules" style={c.sMuted}>{tr('landing.navApplications')}</a></li>
                <li><a href="#tarifs" style={c.sMuted}>{tr('landing.navPricing')}</a></li>
                <li><a href="#blog" style={c.sMuted}>{tr('landing.navBlog')}</a></li>
                <li><a href="#about" style={c.sMuted}>{tr('landing.navAbout')}</a></li>
                <li><a href="#faq" style={c.sMuted}>{tr('landing.navFaq')}</a></li>
                <li><a href="#contact" style={c.sMuted}>{tr('landing.navContact')}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider mb-4" style={c.sTer}>{tr('landing.footerSolutions')}</h4>
              <ul className="space-y-2.5 text-xs" style={c.sMuted}>
                <li className="flex items-center gap-1.5"><span className={`w-1.5 h-1.5 rounded-full ${c.goldBg}`} /> Atlas FnA</li>
                <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> Liass'Pilot</li>
                <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Advist</li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider mb-4" style={c.sTer}>{tr('landing.footerContact')}</h4>
              <ul className="space-y-2.5 text-xs" style={c.sMuted}>
                <li className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> contact@atlasstudio.org</li>
                <li className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> +237 6XX XXX XXX</li>
                <li className="flex items-center gap-2"><Building2 className="w-3.5 h-3.5" /> {tr('landing.footerCity')}</li>
              </ul>
            </div>
          </div>
          <div className={`border-t ${c.border} pt-6 flex flex-col md:flex-row items-center justify-between gap-4`}>
            <span className="text-xs" style={c.sMuted}>&copy; {new Date().getFullYear()} <AtlasStudioBrand className="hover:opacity-80">Atlas Studio</AtlasStudioBrand>. {tr('landing.allRightsReserved')}</span>
            <div className="flex items-center gap-6 text-xs" style={c.sMuted}>
              <span>{tr('landing.legalNotice')}</span>
              <span>{tr('landing.privacy')}</span>
              <span>{tr('landing.terms')}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
