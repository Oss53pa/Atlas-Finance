// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowRight, CheckCircle, ChevronRight, Play } from 'lucide-react';

function getWorkspacePath(role: string): string {
  if (role === 'admin' || role === 'super_admin') return '/workspace/admin';
  if (role === 'manager') return '/workspace/manager';
  if (role === 'comptable') return '/workspace/comptable';
  return '/dashboard';
}

// Compteur animé
function AnimatedNumber({ target, suffix = '' }: { target: string; suffix?: string }) {
  const [val, setVal] = useState('0');
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const num = parseInt(target);
    if (isNaN(num)) { setVal(target); return; }
    const observer = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      let start = 0;
      const step = Math.max(1, Math.floor(num / 30));
      const timer = setInterval(() => { start += step; if (start >= num) { setVal(String(num)); clearInterval(timer); } else setVal(String(start)); }, 30);
      observer.disconnect();
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);
  return <span ref={ref}>{val}{suffix}</span>;
}

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, login } = useAuth();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <style>{`
        @keyframes float1 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(30px,-20px) scale(1.05); } }
        @keyframes float2 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-20px,30px) scale(1.08); } }
        @keyframes float3 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(15px,15px); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(40px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        .anim-float1 { animation: float1 8s ease-in-out infinite; }
        .anim-float2 { animation: float2 10s ease-in-out infinite; }
        .anim-float3 { animation: float3 6s ease-in-out infinite; }
        .anim-up { animation: fadeUp 0.8s ease-out both; }
        .anim-up-d1 { animation: fadeUp 0.8s ease-out 0.15s both; }
        .anim-up-d2 { animation: fadeUp 0.8s ease-out 0.3s both; }
        .anim-up-d3 { animation: fadeUp 0.8s ease-out 0.45s both; }
        .anim-fade { animation: fadeIn 1s ease-out both; }
        .glass { background: rgba(255,255,255,0.6); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
        .card-lift { transition: transform 0.4s cubic-bezier(.4,0,.2,1), box-shadow 0.4s cubic-bezier(.4,0,.2,1); }
        .card-lift:hover { transform: translateY(-6px); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.1); }
      `}</style>

      {/* ══════════ NAV ══════════ */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${scrollY > 50 ? 'glass border-b border-gray-200/50 shadow-sm' : 'bg-transparent'}`}>
        <div className="w-full px-8 md:px-16 lg:px-24 h-16 flex items-center justify-between">
          <span className="atlas-brand text-2xl text-[#171717]">Atlas Studio</span>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-500 font-medium">
            <a href="#solutions" className="hover:text-[#171717] transition-colors">Solutions</a>
            <a href="#features" className="hover:text-[#171717] transition-colors">Fonctionnalités</a>
            <a href="#contact" className="hover:text-[#171717] transition-colors">Contact</a>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <button onClick={() => navigate(getWorkspacePath(user?.role || ''))} className="px-5 py-2.5 bg-[#171717] text-white rounded-full text-sm font-semibold hover:bg-[#333] transition-all flex items-center gap-2">
                Mon espace <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <button onClick={() => navigate('/login')} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-[#171717] transition-colors">Se connecter</button>
                <button onClick={() => navigate('/register')} className="px-5 py-2.5 bg-[#171717] text-white rounded-full text-sm font-semibold hover:bg-[#333] transition-all">Commencer</button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ══════════ HERO ══════════ */}
      <section className="relative min-h-[90vh] flex items-center px-8 md:px-16 lg:px-24 overflow-hidden">
        {/* Fond animé — bulles qui bougent */}
        <div className="absolute inset-0 bg-[#fafafa]">
          <div className="absolute top-1/4 left-[10%] w-[400px] h-[400px] rounded-full bg-gradient-to-br from-blue-100/50 to-cyan-50/30 anim-float1 blur-3xl" />
          <div className="absolute top-1/3 right-[15%] w-[350px] h-[350px] rounded-full bg-gradient-to-br from-violet-100/40 to-pink-50/20 anim-float2 blur-3xl" />
          <div className="absolute bottom-1/4 left-[40%] w-[300px] h-[300px] rounded-full bg-gradient-to-br from-amber-50/40 to-orange-50/20 anim-float3 blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center py-20">
          <h1 className="anim-up">
            <span className="atlas-brand text-6xl md:text-8xl text-[#171717] leading-none">Atlas Studio</span>
          </h1>
          <p className="text-2xl md:text-3xl font-semibold text-[#171717] mt-6 mb-4 anim-up-d1">
            Gérez simple. Grandissez vite.
          </p>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed anim-up-d2">
            La plateforme de gestion d'entreprise conçue pour les 17 pays
            de l'espace OHADA. Comptabilité, fiscalité, documents, liasse — tout en un.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap anim-up-d3">
            <button onClick={() => navigate('/register')} className="group px-8 py-4 bg-[#171717] text-white rounded-full text-base font-semibold hover:bg-[#333] transition-all hover:shadow-2xl hover:-translate-y-1 flex items-center gap-2">
              Démarrer gratuitement <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button onClick={async () => { await login('admin@atlasfinance.cm', 'admin123'); navigate('/client'); }}
              className="px-8 py-4 glass rounded-full text-base font-semibold text-[#171717] hover:bg-white transition-all hover:shadow-lg flex items-center gap-2 border border-gray-200">
              <Play className="w-5 h-5" /> Voir la démo
            </button>
          </div>

          {/* Trust bar */}
          <div className="flex items-center justify-center gap-8 mt-14 anim-fade" style={{ animationDelay: '0.8s' }}>
            {['Aucune carte requise', '14 jours gratuits', 'Support 7j/7'].map((t, i) => (
              <span key={i} className="flex items-center gap-1.5 text-sm text-gray-400">
                <CheckCircle className="w-4 h-4 text-green-400" /> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ STATS — compteurs animés ══════════ */}
      <section className="py-16 bg-[#171717]">
        <div className="w-full px-8 md:px-16 lg:px-24 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: '17', label: 'Pays OHADA' },
            { value: '108', label: 'Contrôles audit' },
            { value: '15', label: 'Taxes configurées', suffix: '+' },
            { value: '100', label: 'SYSCOHADA conforme', suffix: '%' },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-white">
                <AnimatedNumber target={s.value} suffix={s.suffix} />
              </div>
              <div className="text-sm text-white/40 mt-2">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════ SOLUTIONS ══════════ */}
      <section id="solutions" className="py-24 px-8 md:px-16 lg:px-24 bg-[#fafafa]">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-[#171717]">Nos solutions</h2>
          <p className="text-gray-400 mt-3 text-lg">Activez ce dont vous avez besoin, quand vous en avez besoin</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {[
            { name: 'Atlas Finance', sub: 'ERP Comptable & Financier', bg: '#171717',
              features: ['Comptabilité SYSCOHADA révisé 2017','Grand livre, balance, journaux','Bilan, CR, TAFIRE, SIG','Trésorerie & rapprochement','Fiscalité 17 pays OHADA','Immobilisations & amortissements','Clôture mensuelle & annuelle','Multi-société, multi-devise','Audit IA PROPH3T (108 contrôles)','Piste d\'audit SHA-256'],
              badge: 'Disponible', badgeColor: 'bg-green-500' },
            { name: "Liass'Pilot", sub: 'Liasse Fiscale Automatique', bg: '#0e4a5c',
              features: ['DSF conforme DGI Cameroun','22 états annexes pré-remplis','Télédéclaration directe','Contrôles de cohérence','Export PDF, XML, EDI','Historique déclarations','Alertes échéances fiscales','Multi-exercice comparatif'],
              badge: 'Disponible', badgeColor: 'bg-green-500' },
            { name: 'DocJourney', sub: 'Gestion Documentaire', bg: '#2d1b4e',
              features: ['OCR intelligent','Classement automatique IA','Archivage légal 10 ans','Piste d\'audit complète','Recherche full-text','Partage sécurisé','Workflows de validation','Intégration Atlas Finance'],
              badge: 'Bientôt', badgeColor: 'bg-amber-500' },
          ].map((sol, i) => (
            <div key={i} className="rounded-2xl overflow-hidden card-lift bg-white shadow-md">
              <div className="p-8 relative overflow-hidden" style={{ backgroundColor: sol.bg }}>
                <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-white/5 anim-float3" />
                <div className="relative">
                  <h3 className="text-xl font-bold text-white">{sol.name}</h3>
                  <p className="text-sm mt-1 text-white/50">{sol.sub}</p>
                  <span className={`inline-block mt-3 text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider text-white ${sol.badgeColor}`}>{sol.badge}</span>
                </div>
              </div>
              <div className="p-8">
                <ul className="space-y-2.5">
                  {sol.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => navigate('/register')} className="mt-8 w-full py-3 bg-[#171717] text-white rounded-full text-sm font-semibold hover:bg-[#333] transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2">
                  Essai gratuit <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════ FEATURES ══════════ */}
      <section id="features" className="py-24 px-8 md:px-16 lg:px-24 bg-white">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-[#171717]">Tout ce dont vous avez besoin</h2>
          <p className="text-gray-400 mt-3 text-lg">Des outils puissants, pensés pour l'Afrique</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {[
            'Comptabilité SYSCOHADA', 'États Financiers', 'Fiscalité 17 pays',
            'Trésorerie', 'IA PROPH3T', 'Multi-société',
            'Piste d\'audit', 'Clôture automatique', 'Import/Export FEC',
          ].map((f, i) => (
            <div key={i} className="glass rounded-xl p-5 border border-gray-100 card-lift text-center">
              <span className="text-sm font-semibold text-[#171717]">{f}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════ CTA ══════════ */}
      <section className="py-28 px-8 md:px-16 lg:px-24 bg-[#171717] relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-white/[0.02] anim-float1 blur-3xl" />
        <div className="relative max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Prêt à commencer ?</h2>
          <p className="text-lg text-white/40 mb-10">
            Rejoignez les entreprises qui font confiance à <span className="atlas-brand text-xl text-white">Atlas Studio</span>
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <button onClick={() => navigate('/register')} className="group px-10 py-4 bg-white text-[#171717] rounded-full text-base font-semibold hover:bg-gray-100 transition-all hover:shadow-2xl hover:-translate-y-1 inline-flex items-center gap-2">
              Créer mon compte <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* ══════════ FOOTER ══════════ */}
      <footer id="contact" className="bg-[#0a0a0a] py-16 px-8 md:px-16 lg:px-24">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            <div>
              <span className="atlas-brand text-2xl text-white">Atlas Studio</span>
              <p className="text-sm text-white/25 mt-3">Gérez simple. Grandissez vite.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm text-white/60">Produits</h4>
              <ul className="space-y-2.5 text-sm text-white/30"><li>Atlas Finance</li><li>Liass'Pilot</li><li>DocJourney</li></ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm text-white/60">Ressources</h4>
              <ul className="space-y-2.5 text-sm text-white/30"><li>Documentation</li><li>API</li><li>Support</li></ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm text-white/60">Contact</h4>
              <ul className="space-y-2.5 text-sm text-white/30"><li>contact@atlasstudio.com</li><li>Douala, Cameroun</li></ul>
            </div>
          </div>
          <div className="border-t border-white/5 pt-8 text-center text-xs text-white/15">
            &copy; {new Date().getFullYear()} <span className="atlas-brand text-sm">Atlas Studio</span> — Tous droits réservés
            <button onClick={() => navigate('/admin-login')} className="text-white/10 hover:text-white/10 ml-1 cursor-default">·</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
