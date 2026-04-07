
/**
 * DemoPage — Page publique de démo interactive & visite guidée virtuelle
 * Thème dark cohérent avec la landing page Atlas Studio
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ATLAS_STUDIO } from '../config/atlasStudio';
import {
  ArrowLeft, ArrowRight, Play, Monitor, Users,
  Clock, Mail, ChevronRight, Calculator, Shield, BarChart3,
  MapPin, Zap, CheckCircle, Eye, MousePointerClick,
  Wallet, Brain, Building2, Lock, Globe, FileText,
  Sparkles, ArrowUpRight, Star, Layers, Maximize2,
} from 'lucide-react';
import InteractiveEntryDemo from '../components/demo/InteractiveEntryDemo';
import InteractiveBilanDemo from '../components/demo/InteractiveBilanDemo';
import InteractiveTaxDemo from '../components/demo/InteractiveTaxDemo';

/* ── Virtual tour sections ── */
const TOUR_SECTIONS = [
  {
    id: 'dashboard',
    title: 'Dashboard intelligent',
    desc: 'Vue d\'ensemble temps réel de votre activité comptable. KPIs, alertes, raccourcis et dernières écritures — tout est sous contrôle dès l\'ouverture.',
    icon: BarChart3,
    route: '/dashboard',
    features: ['KPIs temps réel', 'Alertes intelligentes', 'Raccourcis configurables', 'Widget dernières écritures'],
    color: 'from-blue-500/20 to-blue-600/10',
  },
  {
    id: 'entries',
    title: 'Saisie des écritures',
    desc: 'Interface de saisie multi-lignes avec contrôle débit = crédit automatique. Auto-complétion des comptes SYSCOHADA, validation instantanée.',
    icon: Calculator,
    route: '/accounting/entries',
    features: ['Contrôle D=C temps réel', 'Auto-complétion comptes', 'Multi-journaux', 'Pièces jointes'],
    color: 'from-emerald-500/20 to-emerald-600/10',
    demoId: 'entry',
  },
  {
    id: 'ledger',
    title: 'Grand Livre & Balance',
    desc: 'Détail complet de chaque compte : mouvements, soldes, filtres par période, export. Drill-down en un clic.',
    icon: FileText,
    route: '/accounting/general-ledger',
    features: ['Détail par compte', 'Filtres multi-critères', 'Export Excel/PDF', 'Recherche instantanée'],
    color: 'from-violet-500/20 to-violet-600/10',
  },
  {
    id: 'financials',
    title: 'États financiers SYSCOHADA',
    desc: 'Bilan, compte de résultat, TAFIRE et SIG générés automatiquement. Drill-down par poste, comparaison N/N-1.',
    icon: BarChart3,
    route: '/financial-statements/balance',
    features: ['Bilan actif/passif', 'Compte de résultat', 'SIG 9 niveaux', 'TAFIRE automatique'],
    color: 'from-[#c9a96e]/20 to-[#a88b4a]/10',
    demoId: 'bilan',
  },
  {
    id: 'tax',
    title: 'Fiscalité automatique',
    desc: 'Calcul automatique TVA, IS, IMF, patente. Calendrier fiscal avec alertes, liasse DSF pré-remplie avec 22 annexes.',
    icon: Shield,
    route: '/reporting/tax',
    features: ['TVA auto-calculée', 'IS / IMF / Patente', 'Calendrier fiscal', 'Liasse DSF 22 annexes'],
    color: 'from-red-500/20 to-red-600/10',
    demoId: 'tax',
  },
  {
    id: 'treasury',
    title: 'Trésorerie & rapprochement',
    desc: 'Position de trésorerie consolidée, rapprochement bancaire intelligent avec scoring, prévisions M+1 à M+6.',
    icon: Wallet,
    route: '/treasury/accounts',
    features: ['Rapprochement bancaire', 'Import CSV/MT940', 'Prévisions trésorerie', 'Multi-comptes'],
    color: 'from-purple-500/20 to-purple-600/10',
  },
  {
    id: 'ai',
    title: <>IA <span className="atlas-brand">Proph3t</span></>,
    desc: 'Moteur d\'intelligence artificielle : détection d\'anomalies, suggestions de corrections, audit Benford, prédictions.',
    icon: Brain,
    route: '/dashboard/ai-insights',
    features: ['Détection anomalies', 'Suggestions corrections', 'Audit loi de Benford', 'Analyse prédictive'],
    color: 'from-pink-500/20 to-pink-600/10',
  },
  {
    id: 'closure',
    title: 'Clôture guidée',
    desc: 'Processus de clôture en 6 étapes : vérification, amortissements, verrouillage, résultat, reports à nouveau, finalisation.',
    icon: Lock,
    route: '/closures/periodic',
    features: ['6 étapes guidées', 'Amortissements auto', 'Reports à nouveau', 'Contrôles pré-clôture'],
    color: 'from-cyan-500/20 to-cyan-600/10',
  },
];

const INTERACTIVE_DEMOS = [
  {
    id: 'entry',
    icon: Calculator,
    title: 'Saisie d\'une écriture comptable',
    desc: 'Créez une écriture multi-lignes avec contrôle D=C automatique. Testez l\'équilibrage intelligent et la validation SYSCOHADA.',
    tags: ['SYSCOHADA', 'Temps réel', 'Multi-journaux'],
    duration: '3 min',
  },
  {
    id: 'bilan',
    icon: BarChart3,
    title: 'Bilan SYSCOHADA interactif',
    desc: 'Explorez un bilan complet avec drill-down par poste. Actif immobilisé, circulant, trésorerie vs capitaux propres.',
    tags: ['Drill-down', 'Actif/Passif', 'Temps réel'],
    duration: '2 min',
  },
  {
    id: 'tax',
    icon: Shield,
    title: 'Calcul TVA automatique',
    desc: 'Le moteur fiscal scanne vos écritures et calcule la TVA collectée, déductible et nette à payer en temps réel.',
    tags: ['18% UEMOA', 'Auto-calcul', '10 écritures'],
    duration: '2 min',
  },
];

type ActiveView = 'home' | 'tour' | 'demo-entry' | 'demo-bilan' | 'demo-tax' | 'live-preview';

const DemoPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<ActiveView>('home');
  const [tourStep, setTourStep] = useState(0);
  const [tourAutoPlay, setTourAutoPlay] = useState(false);
  const [previewRoute, setPreviewRoute] = useState('/dashboard');

  // Auto-play timer
  useEffect(() => {
    if (!tourAutoPlay || activeView !== 'tour') return;
    const timer = setInterval(() => {
      setTourStep(prev => {
        if (prev >= TOUR_SECTIONS.length - 1) { setTourAutoPlay(false); return prev; }
        return prev + 1;
      });
    }, 6000);
    return () => clearInterval(timer);
  }, [tourAutoPlay, activeView]);

  const currentSection = TOUR_SECTIONS[tourStep];

  // Set demo mode flag for iframe previews
  const openLivePreview = (route: string) => {
    sessionStorage.setItem('atlas-demo-mode', '1');
    setPreviewRoute(route);
    setActiveView('live-preview');
  };

  // Inline style constants — beats globals.css overrides
  const W = '#ffffff';
  const W50 = 'rgba(255,255,255,0.50)';
  const W40 = 'rgba(255,255,255,0.40)';
  const W30 = 'rgba(255,255,255,0.30)';
  const W20 = 'rgba(255,255,255,0.20)';
  const W15 = 'rgba(255,255,255,0.15)';
  const W10 = 'rgba(255,255,255,0.10)';
  const G = '#c9a96e';
  const BK = '#0d0d0d';
  const CHK = '#34d399';

  return (
    <div className="landing-page min-h-screen bg-[#0d0d0d]" style={{ color: W }}>

      {/* ═══ NAV ═══ */}
      <nav className="sticky top-0 bg-[#0d0d0d]/90 backdrop-blur-xl border-b border-white/[0.06] z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} style={{ color: W30 }} className="hover:opacity-80 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="atlas-brand text-2xl" style={{ color: W }}>Atlas Studio</span>
            <span style={{ color: W20 }}>/</span>
            <span className="atlas-brand text-lg" style={{ color: G }}>Atlas Finance &amp; Accounting</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm" style={{ color: W30 }}>
            <button onClick={() => navigate('/#modules')} className="hover:opacity-70 transition-colors">Applications</button>
            <button onClick={() => navigate('/#tarifs')} className="hover:opacity-70 transition-colors">Tarifs</button>
            <button onClick={() => navigate('/#blog')} className="hover:opacity-70 transition-colors">Blog</button>
            <button onClick={() => navigate('/#about')} className="hover:opacity-70 transition-colors">À propos</button>
            <button onClick={() => navigate('/#faq')} className="hover:opacity-70 transition-colors">FAQ</button>
            <button onClick={() => navigate('/#contact')} className="hover:opacity-70 transition-colors">Contact</button>
          </div>
          <a href="https://atlas-studio.org/portal?app=atlas-compta" className="px-5 py-2.5 bg-[#c9a96e] rounded-lg text-sm font-bold hover:bg-[#dbc396] transition-all flex items-center gap-2" style={{ color: BK }}>
            Souscrire maintenant <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </nav>

      {/* ═══ HOME ═══ */}
      {activeView === 'home' && (
        <>
          {/* Hero */}
          <section className="relative pt-20 pb-16 px-6 overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-[#c9a96e]/[0.05] rounded-full blur-[120px]" />
            </div>
            <div className="max-w-4xl mx-auto text-center relative">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#c9a96e]/10 border border-[#c9a96e]/20 rounded-full text-xs font-semibold mb-8" style={{ color: G }}>
                <Eye className="w-3.5 h-3.5" /> Aucun compte requis — explorez librement
              </div>
              <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-5" style={{ color: W }}>
                Découvrez Atlas F&A
                <br />
                <span className="bg-gradient-to-r from-[#dbc396] via-[#e0cc9e] to-[#dbc396] bg-clip-text text-transparent" style={{ color: 'transparent' }}>en action.</span>
              </h1>
              <p className="text-lg max-w-2xl mx-auto mb-12" style={{ color: W40 }}>
                Visite guidée, démos interactives, aperçu des vraies interfaces.
                Testez tout avant de vous inscrire.
              </p>

              {/* 3 main cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
                <button onClick={() => { setActiveView('tour'); setTourStep(0); }} className="group relative p-7 bg-gradient-to-br from-[#c9a96e]/[0.08] to-transparent border border-[#c9a96e]/20 rounded-2xl text-left hover:border-[#c9a96e]/40 transition-all hover:-translate-y-1">
                  <div className="absolute top-3 right-3 px-2 py-0.5 bg-[#dbc396] text-[10px] font-bold rounded-full" style={{ color: BK }}>Recommandé</div>
                  <div className="w-14 h-14 bg-[#c9a96e]/10 rounded-xl flex items-center justify-center mb-5">
                    <MapPin className="w-7 h-7" style={{ color: G }} />
                  </div>
                  <h3 className="text-base font-bold mb-2" style={{ color: W }}>Visite guidée</h3>
                  <p className="text-xs leading-relaxed mb-3" style={{ color: W30 }}>Parcourez les 8 modules principaux avec explications détaillées et aperçu live.</p>
                  <span className="text-[10px] flex items-center gap-1" style={{ color: W20 }}><Clock className="w-3 h-3" /> 5 min · 8 modules</span>
                </button>

                <button onClick={() => setActiveView('demo-entry')} className="group p-7 bg-white/[0.03] border border-white/[0.06] rounded-2xl text-left hover:bg-white/[0.06] hover:border-white/[0.12] transition-all hover:-translate-y-1">
                  <div className="w-14 h-14 bg-white/[0.06] rounded-xl flex items-center justify-center mb-5 group-hover:bg-white/10 transition-colors">
                    <MousePointerClick className="w-7 h-7" style={{ color: G }} />
                  </div>
                  <h3 className="text-base font-bold mb-2" style={{ color: W }}>Démos interactives</h3>
                  <p className="text-xs leading-relaxed mb-3" style={{ color: W30 }}>Testez les fonctionnalités clés en conditions réelles. Modifiez, validez.</p>
                  <span className="text-[10px] flex items-center gap-1" style={{ color: W20 }}><Clock className="w-3 h-3" /> 2-3 min chacune</span>
                </button>

                <a href="mailto:contact@atlasstudio.com?subject=Demande de démo live Atlas F%26A" className="group p-7 bg-white/[0.03] border border-white/[0.06] rounded-2xl text-left hover:bg-white/[0.06] hover:border-white/[0.12] transition-all hover:-translate-y-1" style={{ color: W }}>
                  <div className="w-14 h-14 bg-white/[0.06] rounded-xl flex items-center justify-center mb-5 group-hover:bg-white/10 transition-colors">
                    <Users className="w-7 h-7" style={{ color: G }} />
                  </div>
                  <h3 className="text-base font-bold mb-2" style={{ color: W }}>Démo live</h3>
                  <p className="text-xs leading-relaxed mb-3" style={{ color: W30 }}>Un expert vous accompagne en direct pendant 30 min. Sur rendez-vous.</p>
                  <span className="text-[10px] flex items-center gap-1" style={{ color: W20 }}><Mail className="w-3 h-3" /> contact@atlasstudio.com</span>
                </a>
              </div>
            </div>
          </section>

          {/* Interactive demos */}
          <section className="py-20 px-6">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-[#c9a96e]/10 rounded-xl flex items-center justify-center">
                  <MousePointerClick className="w-5 h-5" style={{ color: G }} />
                </div>
                <div>
                  <h2 className="text-xl font-bold" style={{ color: W }}>Démos interactives</h2>
                  <p className="text-xs" style={{ color: W30 }}>Manipulez les interfaces — tout fonctionne</p>
                </div>
              </div>
              <div className="grid gap-3">
                {INTERACTIVE_DEMOS.map(demo => (
                  <button key={demo.id} onClick={() => setActiveView(`demo-${demo.id}` as ActiveView)} className="group flex items-start gap-5 p-5 bg-white/[0.03] border border-white/[0.06] rounded-2xl hover:bg-white/[0.06] hover:border-white/[0.12] transition-all text-left">
                    <div className="w-14 h-14 bg-white/[0.04] rounded-xl flex items-center justify-center shrink-0 group-hover:bg-[#c9a96e]/10 transition-colors">
                      <demo.icon className="w-7 h-7" style={{ color: W40 }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold mb-1" style={{ color: W }}>{demo.title}</h3>
                      <p className="text-xs leading-relaxed mb-2" style={{ color: W30 }}>{demo.desc}</p>
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1.5">
                          {demo.tags.map((tag, i) => (
                            <span key={i} className="px-2 py-0.5 bg-white/[0.04] text-[10px] font-medium rounded-full" style={{ color: W30 }}>{tag}</span>
                          ))}
                        </div>
                        <span className="text-[10px] flex items-center gap-1" style={{ color: W20 }}><Clock className="w-3 h-3" /> {demo.duration}</span>
                      </div>
                    </div>
                    <ArrowUpRight className="w-5 h-5 shrink-0 mt-2" style={{ color: W10 }} />
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Tour preview grid */}
          <section className="py-20 px-6 border-t border-white/[0.06]">
            <div className="max-w-5xl mx-auto">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-[#c9a96e]/10 rounded-xl flex items-center justify-center">
                  <MapPin className="w-5 h-5" style={{ color: G }} />
                </div>
                <div>
                  <h2 className="text-xl font-bold" style={{ color: W }}>Visite guidée — 8 modules</h2>
                  <p className="text-xs" style={{ color: W30 }}>Cliquez sur un module pour démarrer la visite</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {TOUR_SECTIONS.map((section, i) => (
                  <button key={section.id} onClick={() => { setActiveView('tour'); setTourStep(i); }} className="group p-5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-left hover:bg-white/[0.06] hover:border-white/[0.12] transition-all">
                    <div className="w-10 h-10 bg-white/[0.04] rounded-lg flex items-center justify-center mb-3 group-hover:bg-[#c9a96e]/10 transition-colors">
                      <section.icon className="w-5 h-5" style={{ color: W30 }} />
                    </div>
                    <h4 className="text-xs font-bold mb-1" style={{ color: W }}>{section.title}</h4>
                    <p className="text-[10px] leading-relaxed line-clamp-2" style={{ color: W20 }}>{section.desc}</p>
                  </button>
                ))}
              </div>
              <div className="text-center mt-10">
                <button onClick={() => { setActiveView('tour'); setTourStep(0); setTourAutoPlay(true); }} className="group px-8 py-4 bg-[#c9a96e] rounded-xl text-sm font-bold hover:bg-[#dbc396] transition-all shadow-lg shadow-[#c9a96e]/20 inline-flex items-center gap-2" style={{ color: BK }}>
                  <Play className="w-4 h-4" /> Lancer la visite complète
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="py-20 px-6 relative">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#c9a96e]/[0.06] rounded-full blur-[80px]" />
            </div>
            <div className="max-w-3xl mx-auto text-center relative">
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: W }}>Convaincu ?</h2>
              <p className="mb-8" style={{ color: W40 }}>Souscrivez maintenant. Mobile Money, virement ou carte.</p>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <a href={ATLAS_STUDIO.LOGIN} className="group px-8 py-4 bg-[#c9a96e] rounded-xl text-sm font-bold hover:bg-[#dbc396] transition-all shadow-lg shadow-[#c9a96e]/20 inline-flex items-center gap-2" style={{ color: BK }}>
                  <Zap className="w-4 h-4" /> Créer mon compte
                </a>
                <button onClick={() => navigate('/#tarifs')} className="px-8 py-4 bg-white/5 border border-white/10 rounded-xl text-sm font-semibold hover:bg-white/10 transition-all" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  Voir les tarifs
                </button>
              </div>
            </div>
          </section>
        </>
      )}

      {/* ═══ VIRTUAL TOUR ═══ */}
      {activeView === 'tour' && (
        <div className="max-w-7xl mx-auto px-6 py-8">
          <button onClick={() => { setActiveView('home'); setTourAutoPlay(false); }} className="flex items-center gap-2 text-sm hover:opacity-70 mb-6 transition-colors" style={{ color: W30 }}>
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
            {/* Sidebar */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.6)' }}>Modules</h3>
                <button onClick={() => setTourAutoPlay(!tourAutoPlay)} className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${tourAutoPlay ? 'bg-[#c9a96e]/20 border border-[#c9a96e]/30' : 'bg-white/5 border border-white/[0.06] hover:opacity-70'}`} style={{ color: tourAutoPlay ? G : W30 }}>
                  <Play className="w-3 h-3" /> {tourAutoPlay ? 'En cours' : 'Auto'}
                </button>
              </div>
              <div className="space-y-1">
                {TOUR_SECTIONS.map((section, i) => (
                  <button key={section.id} onClick={() => setTourStep(i)} className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${i === tourStep ? 'bg-gradient-to-r from-[#c9a96e]/15 to-transparent border border-[#c9a96e]/20' : i < tourStep ? 'bg-white/[0.02] border border-white/[0.04]' : 'border border-transparent hover:bg-white/[0.03]'}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${i === tourStep ? 'bg-[#c9a96e]/20' : i < tourStep ? 'bg-emerald-500/10' : 'bg-white/[0.04]'}`}>
                      {i < tourStep ? (
                        <CheckCircle className="w-4 h-4" style={{ color: CHK }} />
                      ) : (
                        <section.icon className="w-4 h-4" style={{ color: i === tourStep ? G : W20 }} />
                      )}
                    </div>
                    <span className="text-xs font-medium truncate" style={{ color: i === tourStep ? W : i < tourStep ? W40 : W30 }}>{section.title}</span>
                  </button>
                ))}
              </div>

              {/* Progress */}
              <div className="mt-6 pt-4 border-t border-white/[0.06]">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span style={{ color: W20 }}>Progression</span>
                  <span style={{ color: G }}>{Math.round(((tourStep + 1) / TOUR_SECTIONS.length) * 100)}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div className="h-full bg-[#c9a96e] rounded-full transition-all duration-500" style={{ width: `${((tourStep + 1) / TOUR_SECTIONS.length) * 100}%` }} />
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="space-y-5">
              {/* Header card */}
              <div className={`relative bg-gradient-to-br ${currentSection.color} border border-white/[0.08] rounded-2xl p-8 overflow-hidden`}>
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/[0.02] rounded-full -translate-y-1/2 translate-x-1/4 blur-xl" />
                <div className="relative flex items-start gap-5">
                  <div className="w-16 h-16 bg-white/[0.08] rounded-2xl flex items-center justify-center shrink-0">
                    <currentSection.icon className="w-8 h-8" style={{ color: G }} />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-widest font-medium" style={{ color: W30 }}>Étape {tourStep + 1} / {TOUR_SECTIONS.length}</span>
                    <h2 className="text-2xl font-bold mt-1 mb-2" style={{ color: W }}>{currentSection.title}</h2>
                    <p className="text-sm leading-relaxed" style={{ color: W50 }}>{currentSection.desc}</p>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="grid grid-cols-2 gap-3">
                {currentSection.features.map((feat, i) => (
                  <div key={i} className="flex items-center gap-3 p-3.5 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                    <CheckCircle className="w-4 h-4 shrink-0" style={{ color: CHK }} />
                    <span className="text-sm" style={{ color: W50 }}>{feat}</span>
                  </div>
                ))}
              </div>

              {/* Preview / action area */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-8 text-center">
                <currentSection.icon className="w-16 h-16 mx-auto mb-4" style={{ color: 'rgba(255,255,255,0.06)' }} />
                <p className="text-sm font-medium mb-2" style={{ color: W40 }}>Module : {currentSection.title}</p>
                <p className="text-xs mb-5" style={{ color: W20 }}>Explorez cette interface dans l'application</p>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <button onClick={() => openLivePreview(currentSection.route)} className="px-5 py-2.5 bg-white/[0.06] border border-white/10 rounded-lg text-xs font-semibold hover:bg-white/10 transition-all inline-flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    <Maximize2 className="w-3.5 h-3.5" /> Aperçu live
                  </button>
                  {currentSection.demoId && (
                    <button onClick={() => setActiveView(`demo-${currentSection.demoId}` as ActiveView)} className="px-5 py-2.5 bg-[#c9a96e]/10 border border-[#c9a96e]/20 rounded-lg text-xs font-semibold hover:bg-[#c9a96e]/20 transition-all inline-flex items-center gap-2" style={{ color: G }}>
                      <MousePointerClick className="w-3.5 h-3.5" /> Démo interactive
                    </button>
                  )}
                </div>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between pt-4">
                <button onClick={() => setTourStep(Math.max(0, tourStep - 1))} disabled={tourStep === 0} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors hover:bg-white/5" style={{ color: tourStep === 0 ? W10 : W40 }}>
                  <ArrowLeft className="w-4 h-4" /> Précédent
                </button>
                <div className="flex items-center gap-1.5">
                  {TOUR_SECTIONS.map((_, i) => (
                    <button key={i} onClick={() => setTourStep(i)} className={`h-1.5 rounded-full transition-all ${i === tourStep ? 'w-6 bg-[#dbc396]' : i < tourStep ? 'w-1.5 bg-emerald-400/50' : 'w-1.5 bg-white/10'}`} />
                  ))}
                </div>
                {tourStep < TOUR_SECTIONS.length - 1 ? (
                  <button onClick={() => setTourStep(tourStep + 1)} className="group flex items-center gap-2 px-5 py-2.5 bg-[#c9a96e] rounded-lg text-sm font-bold hover:bg-[#dbc396] transition-all" style={{ color: BK }}>
                    Suivant <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                ) : (
                  <a href={ATLAS_STUDIO.LOGIN} className="group flex items-center gap-2 px-5 py-2.5 bg-emerald-500 rounded-lg text-sm font-bold hover:bg-emerald-400 transition-all" style={{ color: W }}>
                    <Zap className="w-4 h-4" /> Souscrire
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ LIVE PREVIEW (iframe) ═══ */}
      {activeView === 'live-preview' && (
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setActiveView('tour')} className="flex items-center gap-2 text-sm hover:opacity-70 transition-colors" style={{ color: W30 }}>
              <ArrowLeft className="w-4 h-4" /> Retour à la visite
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: W20 }}>Aperçu :</span>
              <span className="text-xs font-mono bg-white/5 px-2 py-1 rounded" style={{ color: G }}>{previewRoute}</span>
            </div>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="bg-white/[0.04] border-b border-white/[0.06] px-4 py-2.5 flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400/40" />
                <div className="w-3 h-3 rounded-full bg-yellow-400/40" />
                <div className="w-3 h-3 rounded-full bg-green-400/40" />
              </div>
              <div className="flex-1 bg-white/[0.04] rounded px-3 py-1 text-xs font-mono" style={{ color: W30 }}>
                atlas-fna.app{previewRoute}
              </div>
            </div>
            <div className="relative bg-white" style={{ height: '70vh' }}>
              <iframe key={previewRoute} src={`${window.location.origin}${previewRoute}`} className="w-full h-full border-0" title="Aperçu Atlas F&A" />
            </div>
          </div>
          <div className="flex items-center justify-center gap-3 mt-6">
            {TOUR_SECTIONS.filter(s => s.route !== previewRoute).slice(0, 3).map(s => (
              <button key={s.id} onClick={() => setPreviewRoute(s.route)} className="flex items-center gap-2 px-3 py-2 bg-white/[0.03] border border-white/[0.06] rounded-lg text-xs hover:border-white/[0.12] transition-all" style={{ color: W40 }}>
                <s.icon className="w-3.5 h-3.5" style={{ color: G }} /> {s.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ═══ INTERACTIVE DEMOS ═══ */}
      {(activeView === 'demo-entry' || activeView === 'demo-bilan' || activeView === 'demo-tax') && (
        <div className="max-w-4xl mx-auto px-6 py-8">
          <button onClick={() => setActiveView('home')} className="flex items-center gap-2 text-sm hover:opacity-70 mb-6 transition-colors" style={{ color: W30 }}>
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>

          <div className="flex items-center gap-2 mb-4">
            {INTERACTIVE_DEMOS.map(d => (
              <button key={d.id} onClick={() => setActiveView(`demo-${d.id}` as ActiveView)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeView === `demo-${d.id}` ? 'bg-[#c9a96e]/15 border border-[#c9a96e]/20' : 'bg-white/[0.03] border border-white/[0.06] hover:opacity-70'}`} style={{ color: activeView === `demo-${d.id}` ? G : W30 }}>
                <d.icon className="w-3.5 h-3.5" /> {d.title.split(' ').slice(0, 2).join(' ')}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-white/[0.1] shadow-2xl shadow-black/50 overflow-hidden">
            <div className="bg-[#141414] px-6 py-4 flex items-center justify-between" style={{ color: W }}>
              <div className="flex items-center gap-3">
                <Monitor className="w-5 h-5" style={{ color: G }} />
                <div>
                  <h3 className="text-sm font-bold" style={{ color: W }}>
                    {activeView === 'demo-entry' && 'Saisie d\'une écriture comptable'}
                    {activeView === 'demo-bilan' && 'Bilan SYSCOHADA interactif'}
                    {activeView === 'demo-tax' && 'Calcul TVA automatique'}
                  </h3>
                  <p className="text-[10px]" style={{ color: W40 }}>Mode démo — données simulées</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px]" style={{ color: W30 }}>Interactif</span>
              </div>
            </div>
            <div className="p-6">
              {activeView === 'demo-entry' && <InteractiveEntryDemo onClose={() => setActiveView('home')} />}
              {activeView === 'demo-bilan' && <InteractiveBilanDemo onClose={() => setActiveView('home')} />}
              {activeView === 'demo-tax' && <InteractiveTaxDemo onClose={() => setActiveView('home')} />}
            </div>
          </div>

          <div className="mt-8 bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8 text-center">
            <Sparkles className="w-8 h-8 mx-auto mb-3" style={{ color: 'rgba(201,169,110,0.5)' }} />
            <p className="text-sm mb-4" style={{ color: W50 }}>La version complète offre bien plus. Souscrivez maintenant.</p>
            <a href={ATLAS_STUDIO.LOGIN} className="px-6 py-3 bg-[#c9a96e] rounded-lg text-sm font-bold hover:bg-[#dbc396] transition-all inline-flex items-center gap-2 shadow-lg shadow-[#c9a96e]/20" style={{ color: BK }}>
              <Zap className="w-4 h-4" /> Souscrire maintenant
            </a>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-8 px-6 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="atlas-brand text-xl" style={{ color: 'rgba(255,255,255,0.6)' }}>Atlas Studio</span>
            <span style={{ color: W10 }} className="mx-1">/</span>
            <span className="atlas-brand text-sm" style={{ color: 'rgba(201,169,110,0.6)' }}>Atlas Finance &amp; Accounting</span>
          </div>
          <div className="flex items-center gap-6 text-xs" style={{ color: W15 }}>
            <span>contact@atlasstudio.com</span>
            <span>&copy; {new Date().getFullYear()} Atlas Studio</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DemoPage;
