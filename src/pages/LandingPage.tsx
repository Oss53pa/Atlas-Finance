// @ts-nocheck
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Calculator, BarChart3, Shield, Globe, Zap, Users,
  ArrowRight, CheckCircle, Star, ChevronRight
} from 'lucide-react';

const FEATURES = [
  { icon: Calculator, title: 'Comptabilité SYSCOHADA', desc: 'Plan comptable OHADA, écritures, grand livre, balance, journaux. 100% conforme au référentiel révisé 2017.' },
  { icon: BarChart3,  title: 'États Financiers',       desc: 'Bilan, compte de résultat, TAFIRE, SIG, ratios. Génération automatique et export PDF.' },
  { icon: Shield,     title: 'Fiscalité 17 Pays',      desc: 'TVA, IS, IRPP, retenues à la source. Calendrier fiscal avec alertes et déclarations.' },
  { icon: Globe,      title: 'Multi-Société & Devise',  desc: 'Gestion multi-société, multi-exercice, multi-devise (XAF, XOF, EUR, USD).' },
  { icon: Zap,        title: 'IA PROPH3T',             desc: 'Assistant comptable IA — calculs fiscaux, écritures, audit Benford, 108 contrôles SYSCOHADA.' },
  { icon: Users,      title: 'Collaboration',          desc: 'Rôles (admin, manager, comptable), workflow de validation, piste d\'audit SHA-256.' },
];

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
  const { isAuthenticated, user } = useAuth();

  React.useEffect(() => {
    if (isAuthenticated && user) {
      navigate(getWorkspacePath(user.role), { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  return (
    <div className="min-h-screen bg-white">

      {/* ══════════ NAV ══════════ */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur border-b z-50">
        <div className="w-full px-8 md:px-16 lg:px-24 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#171717] rounded-lg flex items-center justify-center">
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <span className="atlas-brand text-2xl text-[#171717]">Atlas Studio</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-600">
            <a href="#features" className="hover:text-[#171717] transition-colors">Fonctionnalités</a>
            <a href="#products" className="hover:text-[#171717] transition-colors">Produits</a>
            <a href="#contact" className="hover:text-[#171717] transition-colors">Contact</a>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <button onClick={() => navigate('/hub')} className="px-5 py-2.5 bg-[#171717] text-white rounded-lg text-sm font-semibold hover:bg-[#333] transition-colors flex items-center gap-2">
                Mes applications <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <button onClick={() => navigate('/login')} className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-[#171717] transition-colors">
                  Se connecter
                </button>
                <button onClick={() => navigate('/register')} className="px-5 py-2.5 bg-[#171717] text-white rounded-lg text-sm font-semibold hover:bg-[#333] transition-colors">
                  Commencer
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ══════════ HERO ══════════ */}
      <section className="pt-32 pb-20 px-8 md:px-16 lg:px-24">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#171717]/5 rounded-full text-sm text-[#171717] font-medium mb-6">
            <Star className="w-4 h-4" /> Suite de gestion pour l'Afrique
          </div>
          <h1 className="text-5xl md:text-6xl leading-tight mb-6">
            <span className="font-bold text-[#171717]">La gestion d'entreprise</span>
            <br />
            <span className="atlas-brand text-5xl md:text-7xl text-[#171717]">simplifiée par Atlas Studio</span>
          </h1>
          <p className="text-xl text-gray-500 max-w-3xl mx-auto mb-10 leading-relaxed">
            La plateforme de gestion d'entreprise conçue pour les 17 pays
            de l'espace OHADA. Comptabilité, fiscalité, documents, liasse — tout en un.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button onClick={() => navigate('/register')} className="px-8 py-4 bg-[#171717] text-white rounded-xl text-base font-semibold hover:bg-[#333] transition-all hover:shadow-xl flex items-center gap-2">
              Démarrer gratuitement <ArrowRight className="w-5 h-5" />
            </button>
            <a href="#features" className="px-8 py-4 border-2 border-gray-200 rounded-xl text-base font-semibold text-gray-700 hover:border-gray-400 transition-all">
              Découvrir
            </a>
          </div>
        </div>
      </section>

      {/* ══════════ STATS BAR ══════════ */}
      <section className="bg-[#171717] py-8">
        <div className="w-full px-8 md:px-16 lg:px-24 flex items-center justify-around">
          {STATS.map((s, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl font-bold text-white">{s.value}</div>
              <div className="text-sm text-white/60 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════ FEATURES ══════════ */}
      <section id="features" className="py-20 px-8 md:px-16 lg:px-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-[#171717]">Tout ce dont vous avez besoin</h2>
          <p className="text-gray-500 mt-3 text-lg">Une suite complète pour gérer votre entreprise</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <div key={i} className="p-8 rounded-2xl border border-gray-100 hover:border-gray-300 hover:shadow-lg transition-all group">
              <div className="w-14 h-14 bg-[#171717]/5 rounded-xl flex items-center justify-center mb-5 group-hover:bg-[#171717]/10 transition-colors">
                <f.icon className="w-7 h-7 text-[#171717]" />
              </div>
              <h3 className="text-lg font-bold text-[#171717] mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════ PRODUCTS ══════════ */}
      <section id="products" className="py-20 px-8 md:px-16 lg:px-24 bg-[#fafafa]">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-[#171717]">Nos produits</h2>
          <p className="text-gray-500 mt-3 text-lg">Une application pour chaque besoin</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { name: 'Atlas Finance', desc: 'ERP Comptable & Financier', color: '#171717', features: ['Comptabilité SYSCOHADA', 'États financiers', 'Trésorerie', 'Fiscalité 17 pays', 'Audit IA PROPH3T'] },
            { name: "Liass'Pilot", desc: 'Liasse Fiscale Automatique', color: '#0891b2', features: ['DSF conforme DGI', 'États annexes 1-22', 'Télédéclaration', 'Contrôle de cohérence', 'Export PDF & XML'] },
            { name: 'DocJourney', desc: 'Gestion Documentaire', color: '#7c3aed', features: ['Numérisation OCR', 'Classement IA', 'Archivage légal 10 ans', 'Piste d\'audit', 'Recherche full-text'] },
          ].map((p, i) => (
            <div key={i} className="rounded-2xl overflow-hidden border border-gray-200 shadow-lg hover:shadow-xl transition-shadow">
              <div className="p-8 text-white" style={{ backgroundColor: p.color }}>
                <h3 className="text-xl font-bold">{p.name}</h3>
                <p className="text-white/70 text-sm mt-1">{p.desc}</p>
                <span className="inline-block mt-3 text-xs bg-white/20 px-3 py-1 rounded-full font-medium">Disponible</span>
              </div>
              <div className="p-8 bg-white">
                <ul className="space-y-3">
                  {p.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-gray-700">
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => navigate('/register')} className="mt-8 w-full py-3 bg-[#171717] text-white rounded-lg text-sm font-semibold hover:bg-[#333] transition-colors flex items-center justify-center gap-2">
                  Essai gratuit <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════ CTA ══════════ */}
      <section className="py-24 px-8 md:px-16 lg:px-24">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-[#171717] mb-4">Prêt à commencer ?</h2>
          <p className="text-gray-500 text-lg mb-8">
            Rejoignez les entreprises africaines qui modernisent leur gestion avec <span className="atlas-brand text-xl text-[#171717]">Atlas Studio</span>.
          </p>
          <button onClick={() => navigate('/register')} className="px-10 py-4 bg-[#171717] text-white rounded-xl text-base font-semibold hover:bg-[#333] transition-all hover:shadow-xl inline-flex items-center gap-2">
            Créer mon compte <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* ══════════ FOOTER ══════════ */}
      <footer id="contact" className="bg-[#171717] text-white py-14 px-8 md:px-16 lg:px-24">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                <Calculator className="w-4 h-4 text-white" />
              </div>
              <span className="atlas-brand text-2xl">Atlas Studio</span>
            </div>
            <p className="text-sm text-white/50">Suite de gestion d'entreprise pour l'Afrique francophone.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm">Produits</h4>
            <ul className="space-y-2 text-sm text-white/50">
              <li>Atlas Finance</li><li>Liass'Pilot</li><li>DocJourney</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm">Ressources</h4>
            <ul className="space-y-2 text-sm text-white/50">
              <li>Documentation</li><li>API</li><li>Support</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3 text-sm">Contact</h4>
            <ul className="space-y-2 text-sm text-white/50">
              <li>contact@atlasstudio.com</li><li>Douala, Cameroun</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 pt-6 text-center text-xs text-white/30">
          &copy; {new Date().getFullYear()} <span className="atlas-brand text-sm">Atlas Studio</span> — Tous droits réservés
          <span onClick={() => navigate('/workspace/admin')} className="cursor-default select-none" aria-hidden="true">&nbsp;·&nbsp;</span>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
