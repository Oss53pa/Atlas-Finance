// @ts-nocheck
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Calculator, BarChart3, Shield, Globe, Zap, Users,
  ArrowRight, CheckCircle, Star, ChevronRight, Sparkles
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

const GOLD = '#9E7C0C';
const GOLD_ACCENT = '#C4A235';

function getWorkspacePath(role: string): string {
  if (role === 'admin' || role === 'super_admin') return '/workspace/admin';
  if (role === 'manager') return '/workspace/manager';
  if (role === 'comptable') return '/workspace/comptable';
  return '/dashboard';
}

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="min-h-screen bg-white">

      {/* ══════════ NAV ══════════ */}
      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-md border-b border-gray-200 z-50">
        <div className="w-full px-8 md:px-16 lg:px-24 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#141414] rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5" style={{ color: GOLD }} />
            </div>
            <span className="atlas-brand text-2xl text-[#141414]">Atlas Studio</span>
          </div>
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
                <button onClick={() => navigate('/login')} className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-[#141414] transition-colors">
                  Se connecter
                </button>
                <button onClick={() => navigate('/register')} className="px-5 py-2.5 bg-[#141414] text-white rounded-lg text-sm font-semibold hover:bg-[#2a2a2a] transition-colors">
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
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gray-100 rounded-full text-sm text-gray-600 font-medium mb-6">
            <Star className="w-4 h-4 text-gray-500" /> Suite de gestion pour l'Afrique
          </div>
          <h1 className="text-5xl md:text-6xl leading-tight mb-4">
            <span className="atlas-brand text-5xl md:text-7xl" style={{ color: GOLD_ACCENT }}>Atlas Studio</span>
          </h1>
          <p className="text-2xl font-semibold text-[#141414] mb-6">
            Gérez simple. Grandissez vite.
          </p>
          <p className="text-xl text-gray-500 max-w-3xl mx-auto mb-10 leading-relaxed">
            La plateforme de gestion d'entreprise conçue pour les 17 pays
            de l'espace OHADA. Comptabilité, fiscalité, documents, liasse — tout en un.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button onClick={() => navigate('/register')} className="px-8 py-4 bg-[#141414] text-white rounded-xl text-base font-semibold hover:bg-[#2a2a2a] transition-all hover:shadow-xl flex items-center gap-2">
              Démarrer gratuitement <ArrowRight className="w-5 h-5" />
            </button>
            <a href="#features" className="px-8 py-4 border-2 border-gray-200 rounded-xl text-base font-semibold text-gray-700 hover:border-gray-400 transition-all">
              Découvrir
            </a>
          </div>
        </div>
      </section>

      {/* ══════════ STATS BAR ══════════ */}
      <section className="py-8 bg-[#141414]">
        <div className="w-full px-8 md:px-16 lg:px-24 flex items-center justify-around">
          {STATS.map((s, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl font-bold text-white">{s.value}</div>
              <div className="text-sm text-white/50 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════ SOLUTIONS ══════════ */}
      <section id="features" className="py-20 px-8 md:px-16 lg:px-24 bg-white">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-[#141414]">Nos solutions</h2>
          <p className="text-gray-500 mt-3 text-lg">Une application pour chaque besoin, des fonctionnalités pour chaque métier</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {/* Atlas Finance */}
          <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-lg hover:shadow-xl transition-shadow">
            <div className="p-8 bg-[#141414]">
              <h3 className="text-xl font-bold text-white">Atlas Finance</h3>
              <p className="text-sm mt-1 text-gray-300">ERP Comptable & Financier</p>
              <span className="inline-block mt-3 text-xs px-3 py-1 rounded-full font-medium bg-white bg-opacity-25 text-white">Disponible</span>
            </div>
            <div className="p-8 bg-white">
              <ul className="space-y-2.5">
                {[
                  'Comptabilité SYSCOHADA révisé 2017',
                  'Grand livre, balance, journaux',
                  'Bilan, compte de résultat, TAFIRE, SIG',
                  'Trésorerie & rapprochement bancaire',
                  'Fiscalité 17 pays OHADA (TVA, IS, IRPP)',
                  'Immobilisations & amortissements',
                  'Clôture mensuelle & annuelle',
                  'Multi-société, multi-exercice, multi-devise',
                  'Audit IA PROPH3T (108 contrôles)',
                  'Piste d\'audit SHA-256',
                ].map((f, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <button onClick={() => navigate('/register')} className="mt-8 w-full py-3 bg-[#141414] text-white rounded-lg text-sm font-semibold hover:bg-[#2a2a2a] transition-colors flex items-center justify-center gap-2">
                Essai gratuit <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Liass'Pilot */}
          <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-lg hover:shadow-xl transition-shadow">
            <div className="p-8 bg-[#1a3a4a]">
              <h3 className="text-xl font-bold text-white">Liass'Pilot</h3>
              <p className="text-sm mt-1 text-gray-300">Liasse Fiscale Automatique</p>
              <span className="inline-block mt-3 text-xs px-3 py-1 rounded-full font-medium bg-white bg-opacity-25 text-white">Disponible</span>
            </div>
            <div className="p-8 bg-white">
              <ul className="space-y-2.5">
                {[
                  'DSF conforme DGI Cameroun',
                  '22 états annexes pré-remplis',
                  'Télédéclaration directe',
                  'Contrôles de cohérence automatiques',
                  'Export PDF, XML, EDI',
                  'Historique des déclarations',
                  'Alertes échéances fiscales',
                  'Multi-exercice comparatif',
                ].map((f, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <button onClick={() => navigate('/register')} className="mt-8 w-full py-3 bg-[#141414] text-white rounded-lg text-sm font-semibold hover:bg-[#2a2a2a] transition-colors flex items-center justify-center gap-2">
                Essai gratuit <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* DocJourney */}
          <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-lg hover:shadow-xl transition-shadow">
            <div className="p-8 bg-[#2d1b4e]">
              <h3 className="text-xl font-bold text-white">DocJourney</h3>
              <p className="text-sm mt-1 text-gray-300">Gestion Documentaire</p>
              <span className="inline-block mt-3 text-xs px-3 py-1 rounded-full font-medium bg-white bg-opacity-25 text-white">Bientôt</span>
            </div>
            <div className="p-8 bg-white">
              <ul className="space-y-2.5">
                {[
                  'Numérisation OCR intelligente',
                  'Classement automatique par IA',
                  'Archivage légal 10 ans',
                  'Piste d\'audit complète',
                  'Recherche full-text instantanée',
                  'Partage sécurisé de documents',
                  'Workflows de validation',
                  'Intégration Atlas Finance',
                ].map((f, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <button onClick={() => navigate('/register')} className="mt-8 w-full py-3 bg-[#141414] text-white rounded-lg text-sm font-semibold hover:bg-[#2a2a2a] transition-colors flex items-center justify-center gap-2">
                Essai gratuit <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ CTA ══════════ */}
      <section className="py-24 px-8 md:px-16 lg:px-24 bg-[#141414]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Prêt à commencer ?</h2>
          <p className="text-lg text-white/60 mb-8">
            Rejoignez les entreprises africaines qui modernisent leur gestion avec <span className="atlas-brand text-xl" style={{ color: GOLD_ACCENT }}>Atlas Studio</span>.
          </p>
          <button onClick={() => navigate('/register')} className="px-10 py-4 bg-white text-[#141414] rounded-xl text-base font-semibold hover:bg-gray-100 transition-all hover:shadow-xl inline-flex items-center gap-2">
            Créer mon compte <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* ══════════ FOOTER ══════════ */}
      <footer id="contact" className="bg-[#0e0e0e] py-14 px-8 md:px-16 lg:px-24">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-white/8 rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4" style={{ color: GOLD }} />
              </div>
              <span className="atlas-brand text-2xl text-white">Atlas Studio</span>
            </div>
            <p className="text-sm italic" style={{ color: GOLD_ACCENT }}>Gérez simple. Grandissez vite.</p>
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
          <span onClick={() => navigate('/workspace/admin')} className="cursor-default select-none" aria-hidden="true">&nbsp;·&nbsp;</span>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
