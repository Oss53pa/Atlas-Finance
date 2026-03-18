// @ts-nocheck
import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Calculator, BarChart3, Shield, Globe, Zap, Users,
  ArrowRight, CheckCircle, ChevronRight, Play
} from 'lucide-react';

// Hook simple pour fade-in au scroll
function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('animate-in'); observer.unobserve(el); } },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

const FadeIn: React.FC<{ children: React.ReactNode; className?: string; delay?: number }> = ({ children, className = '', delay = 0 }) => {
  const ref = useFadeIn();
  return (
    <div ref={ref} className={`opacity-0 translate-y-6 transition-all duration-700 ease-out ${className}`}
      style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
};

const STATS = [
  { value: '17', label: 'Pays OHADA' },
  { value: '108', label: 'Contrôles audit' },
  { value: '15+', label: 'Taxes configurées' },
  { value: '100%', label: 'SYSCOHADA' },
];

function getWorkspacePath(role: string): string {
  if (role === 'admin' || role === 'super_admin') return '/workspace/admin';
  if (role === 'manager') return '/workspace/manager';
  if (role === 'comptable') return '/workspace/comptable';
  return '/dashboard';
}

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, login } = useAuth();

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        .animate-in { opacity: 1 !important; transform: translateY(0) !important; }
        .glass { background: rgba(255,255,255,0.7); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.3); }
        .glass-dark { background: rgba(255,255,255,0.08); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.12); }
        .card-hover { transition: transform 0.3s, box-shadow 0.3s; }
        .card-hover:hover { transform: translateY(-4px); box-shadow: 0 20px 40px rgba(0,0,0,0.08); }
      `}</style>

      {/* ══════════ NAV — glassmorphism ══════════ */}
      <nav className="fixed top-0 w-full glass border-b border-gray-200/50 z-50">
        <div className="w-full px-8 md:px-16 lg:px-24 h-16 flex items-center justify-between">
          <span className="atlas-brand text-2xl text-[#171717]">Atlas Studio</span>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-600">
            <a href="#features" className="hover:text-[#141414] transition-colors">Fonctionnalités</a>
            <a href="#products" className="hover:text-[#141414] transition-colors">Produits</a>
            <a href="#contact" className="hover:text-[#141414] transition-colors">Contact</a>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <button onClick={() => navigate(getWorkspacePath(user?.role || ''))} className="px-5 py-2.5 bg-[#141414] text-white rounded-lg text-sm font-semibold hover:bg-[#2a2a2a] transition-colors flex items-center gap-2">
                Mon espace <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <button onClick={() => navigate('/login')} className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-[#141414] transition-colors">Se connecter</button>
                <button onClick={() => navigate('/register')} className="px-5 py-2.5 bg-[#141414] text-white rounded-lg text-sm font-semibold hover:bg-[#2a2a2a] transition-colors">Commencer</button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ══════════ HERO ══════════ */}
      <section className="pt-32 pb-20 px-8 md:px-16 lg:px-24">
        <FadeIn className="max-w-5xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl leading-tight mb-4">
            <span className="atlas-brand text-5xl md:text-7xl text-[#171717]">Atlas Studio</span>
          </h1>
          <p className="text-2xl font-semibold text-[#141414] mb-6">Gérez simple. Grandissez vite.</p>
          <p className="text-xl text-gray-500 max-w-3xl mx-auto mb-10 leading-relaxed">
            La plateforme de gestion d'entreprise conçue pour les 17 pays
            de l'espace OHADA. Comptabilité, fiscalité, documents, liasse — tout en un.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <button onClick={() => navigate('/register')} className="px-8 py-4 bg-[#141414] text-white rounded-xl text-base font-semibold hover:bg-[#2a2a2a] transition-all hover:shadow-xl hover:-translate-y-0.5 flex items-center gap-2">
              Démarrer gratuitement <ArrowRight className="w-5 h-5" />
            </button>
            <button onClick={async () => { await login('admin@atlasfinance.cm', 'admin123'); navigate('/client'); }}
              className="px-8 py-4 border-2 border-[#171717] text-[#171717] rounded-xl text-base font-semibold hover:bg-[#171717] hover:text-white transition-all flex items-center gap-2">
              <Play className="w-5 h-5" /> Voir la démo
            </button>
            <a href="#features" className="px-8 py-4 border-2 border-gray-200 rounded-xl text-base font-semibold text-gray-700 hover:border-gray-400 transition-all">Découvrir</a>
          </div>
        </FadeIn>
      </section>

      {/* ══════════ STATS BAR ══════════ */}
      <section className="py-8 bg-[#141414]">
        <div className="w-full px-8 md:px-16 lg:px-24 flex items-center justify-around">
          {STATS.map((s, i) => (
            <FadeIn key={i} delay={i * 100} className="text-center">
              <div className="text-3xl font-bold text-white">{s.value}</div>
              <div className="text-sm text-white/50 mt-1">{s.label}</div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ══════════ SOLUTIONS — cartes glassmorphism ══════════ */}
      <section id="features" className="py-20 px-8 md:px-16 lg:px-24 bg-[#fafafa]">
        <FadeIn className="text-center mb-14">
          <h2 className="text-3xl font-bold text-[#141414]">Nos solutions</h2>
          <p className="text-gray-500 mt-3 text-lg">Une application pour chaque besoin, des fonctionnalités pour chaque métier</p>
        </FadeIn>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {[
            { name: 'Atlas Finance', sub: 'ERP Comptable & Financier', bg: 'bg-[#141414]', badge: 'Disponible',
              features: ['Comptabilité SYSCOHADA révisé 2017','Grand livre, balance, journaux','Bilan, compte de résultat, TAFIRE, SIG','Trésorerie & rapprochement bancaire','Fiscalité 17 pays OHADA (TVA, IS, IRPP)','Immobilisations & amortissements','Clôture mensuelle & annuelle','Multi-société, multi-exercice, multi-devise','Audit IA PROPH3T (108 contrôles)','Piste d\'audit SHA-256'] },
            { name: "Liass'Pilot", sub: 'Liasse Fiscale Automatique', bg: 'bg-[#1a3a4a]', badge: 'Disponible',
              features: ['DSF conforme DGI Cameroun','22 états annexes pré-remplis','Télédéclaration directe','Contrôles de cohérence automatiques','Export PDF, XML, EDI','Historique des déclarations','Alertes échéances fiscales','Multi-exercice comparatif'] },
            { name: 'DocJourney', sub: 'Gestion Documentaire', bg: 'bg-[#2d1b4e]', badge: 'Bientôt',
              features: ['Numérisation OCR intelligente','Classement automatique par IA','Archivage légal 10 ans','Piste d\'audit complète','Recherche full-text instantanée','Partage sécurisé de documents','Workflows de validation','Intégration Atlas Finance'] },
          ].map((sol, i) => (
            <FadeIn key={i} delay={i * 150}>
              <div className="rounded-2xl overflow-hidden card-hover shadow-lg">
                <div className={`p-8 ${sol.bg} relative overflow-hidden`}>
                  {/* Glass accent */}
                  <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/5 blur-xl" />
                  <div className="relative">
                    <h3 className="text-xl font-bold text-white">{sol.name}</h3>
                    <p className="text-sm mt-1 text-white/60">{sol.sub}</p>
                    <span className="inline-block mt-3 text-xs px-3 py-1 rounded-full font-medium glass-dark text-white">{sol.badge}</span>
                  </div>
                </div>
                <div className="p-8 bg-white">
                  <ul className="space-y-2.5">
                    {sol.features.map((f, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm text-gray-700">
                        <CheckCircle className="w-4 h-4 text-green-500 shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => navigate('/register')} className="mt-8 w-full py-3 bg-[#141414] text-white rounded-lg text-sm font-semibold hover:bg-[#2a2a2a] transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2">
                    Essai gratuit <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ══════════ CTA ══════════ */}
      <FadeIn>
        <section className="py-24 px-8 md:px-16 lg:px-24 bg-[#141414]">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Prêt à commencer ?</h2>
            <p className="text-lg text-white/60 mb-8">
              Rejoignez les entreprises africaines qui modernisent leur gestion avec <span className="atlas-brand text-xl text-white">Atlas Studio</span>.
            </p>
            <button onClick={() => navigate('/register')} className="px-10 py-4 bg-white text-[#141414] rounded-xl text-base font-semibold hover:bg-gray-100 transition-all hover:shadow-xl hover:-translate-y-0.5 inline-flex items-center gap-2">
              Créer mon compte <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </section>
      </FadeIn>

      {/* ══════════ FOOTER ══════════ */}
      <footer id="contact" className="bg-[#0e0e0e] py-14 px-8 md:px-16 lg:px-24">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
          <div>
            <span className="atlas-brand text-2xl text-white">Atlas Studio</span>
            <p className="text-sm italic text-white/50 mt-3">Gérez simple. Grandissez vite.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm text-white">Produits</h4>
            <ul className="space-y-2 text-sm text-white/45">
              <li>Atlas Finance</li><li>Liass'Pilot</li><li>DocJourney</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm text-white">Ressources</h4>
            <ul className="space-y-2 text-sm text-white/45">
              <li>Documentation</li><li>API</li><li>Support</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm text-white">Contact</h4>
            <ul className="space-y-2 text-sm text-white/45">
              <li>contact@atlasstudio.com</li><li>Douala, Cameroun</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/8 pt-6 text-center text-xs text-white/25">
          &copy; {new Date().getFullYear()} <span className="atlas-brand text-sm">Atlas Studio</span> — Tous droits réservés
          <button onClick={() => navigate('/admin-login')} className="text-white/20 hover:text-white/20 ml-1 cursor-default">·</button>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
