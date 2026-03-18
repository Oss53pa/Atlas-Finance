// @ts-nocheck
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Calculator, BarChart3, Shield, Globe, Zap, Users, FileText, FolderOpen,
  ArrowRight, CheckCircle, ChevronRight, Play, TrendingUp, Lock, Wallet
} from 'lucide-react';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, login } = useAuth();

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">

      {/* ══════════ NAV ══════════ */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-xl border-b border-gray-100 z-50">
        <div className="w-full px-8 md:px-16 lg:px-24 h-16 flex items-center justify-between">
          <span className="atlas-brand text-2xl text-[#171717]">Atlas Studio</span>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-500 font-medium">
            <a href="#solutions" className="hover:text-[#171717] transition-colors">Solutions</a>
            <a href="#features" className="hover:text-[#171717] transition-colors">Fonctionnalités</a>
            <a href="#contact" className="hover:text-[#171717] transition-colors">Contact</a>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <button onClick={() => navigate('/client')} className="px-5 py-2.5 bg-[#171717] text-white rounded-full text-sm font-semibold hover:bg-[#333] transition-all flex items-center gap-2">
                Mon espace <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <button onClick={() => navigate('/login')} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-[#171717]">Se connecter</button>
                <button onClick={() => navigate('/register')} className="px-5 py-2.5 bg-[#171717] text-white rounded-full text-sm font-semibold hover:bg-[#333] transition-all">Commencer</button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ══════════ HERO — fond gradient avec formes ══════════ */}
      <section className="relative pt-28 pb-24 px-8 md:px-16 lg:px-24 overflow-hidden">
        {/* Background shapes */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-blue-50/30" />
        <div className="absolute top-20 -right-40 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-blue-100/40 to-purple-100/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-amber-50/50 to-orange-50/20 blur-3xl" />

        <div className="relative max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left — Text */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#171717]/5 rounded-full text-sm font-medium text-[#171717] mb-6">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Plateforme disponible — Essai gratuit 14 jours
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#171717] leading-[1.1] mb-6">
                La gestion d'entreprise,
                <span className="block mt-2">
                  <span className="atlas-brand text-5xl md:text-6xl lg:text-7xl bg-gradient-to-r from-[#171717] via-[#404040] to-[#171717] bg-clip-text text-transparent">réinventée</span>
                </span>
              </h1>
              <p className="text-lg text-gray-500 leading-relaxed mb-8 max-w-lg">
                Comptabilité SYSCOHADA, liasse fiscale, gestion documentaire — une suite complète pour les entreprises des 17 pays OHADA.
              </p>
              <div className="flex items-center gap-3 flex-wrap">
                <button onClick={() => navigate('/register')} className="px-7 py-3.5 bg-[#171717] text-white rounded-xl text-sm font-semibold hover:bg-[#333] transition-all hover:shadow-xl hover:-translate-y-0.5 flex items-center gap-2">
                  Démarrer gratuitement <ArrowRight className="w-4 h-4" />
                </button>
                <button onClick={async () => { await login('admin@atlasfinance.cm', 'admin123'); navigate('/client'); }}
                  className="px-7 py-3.5 border-2 border-[#171717] text-[#171717] rounded-xl text-sm font-semibold hover:bg-[#171717] hover:text-white transition-all flex items-center gap-2">
                  <Play className="w-4 h-4" /> Voir la démo
                </button>
              </div>
              <div className="flex items-center gap-6 mt-8 text-xs text-gray-400">
                <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-green-500" /> Aucune carte requise</span>
                <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-green-500" /> Support 7j/7</span>
                <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-green-500" /> 100% SYSCOHADA</span>
              </div>
            </div>

            {/* Right — Visual card */}
            <div className="hidden lg:block relative">
              <div className="relative">
                {/* Main card */}
                <div className="bg-white rounded-2xl shadow-2xl border p-6 transform rotate-1 hover:rotate-0 transition-transform duration-500">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                    <span className="text-xs text-gray-400 ml-2">Atlas Finance — Dashboard</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      { label: 'Trésorerie', value: '24.5M', color: 'text-green-600', bg: 'bg-green-50' },
                      { label: 'CA Mensuel', value: '8.2M', color: 'text-blue-600', bg: 'bg-blue-50' },
                      { label: 'Résultat', value: '1.8M', color: 'text-purple-600', bg: 'bg-purple-50' },
                    ].map((kpi, i) => (
                      <div key={i} className={`${kpi.bg} rounded-xl p-3`}>
                        <div className="text-[10px] text-gray-500">{kpi.label}</div>
                        <div className={`text-lg font-bold ${kpi.color}`}>{kpi.value}</div>
                        <div className="text-[10px] text-gray-400">FCFA</div>
                      </div>
                    ))}
                  </div>
                  <div className="h-24 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg flex items-end px-3 pb-2 gap-1">
                    {[40, 55, 35, 70, 60, 80, 65, 90, 75, 85, 95, 70].map((h, i) => (
                      <div key={i} className="flex-1 bg-[#171717] rounded-t" style={{ height: `${h}%`, opacity: 0.1 + i * 0.07 }} />
                    ))}
                  </div>
                </div>

                {/* Floating cards */}
                <div className="absolute -top-4 -left-8 bg-white rounded-xl shadow-lg border p-3 transform -rotate-6 animate-pulse">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-xs font-medium">TVA déclarée</span>
                  </div>
                </div>
                <div className="absolute -bottom-4 -right-6 bg-[#171717] rounded-xl shadow-lg p-3 transform rotate-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    <span className="text-xs font-medium text-white">PROPH3T IA</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ STATS — bande avec gradient ══════════ */}
      <section className="py-10 bg-gradient-to-r from-[#171717] via-[#1e293b] to-[#171717]">
        <div className="w-full px-8 md:px-16 lg:px-24 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: '17', label: 'Pays OHADA', icon: Globe },
            { value: '108', label: 'Contrôles audit', icon: Shield },
            { value: '3', label: 'Solutions actives', icon: Zap },
            { value: '100%', label: 'SYSCOHADA', icon: CheckCircle },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <s.icon className="w-5 h-5 text-white/30 mx-auto mb-2" />
              <div className="text-3xl font-bold text-white">{s.value}</div>
              <div className="text-sm text-white/40 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════ SOLUTIONS — cartes avec gradient header ══════════ */}
      <section id="solutions" className="py-24 px-8 md:px-16 lg:px-24 bg-[#fafafa]">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-[#171717] mb-3">Nos solutions</h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">Une application pour chaque besoin. Activez ce dont vous avez besoin, quand vous en avez besoin.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {[
            {
              name: 'Atlas Finance', sub: 'ERP Comptable & Financier', icon: Calculator,
              gradient: 'from-[#171717] to-[#334155]', badge: 'Disponible', badgeColor: 'bg-green-500',
              features: ['Comptabilité SYSCOHADA révisé 2017', 'Bilan, CR, TAFIRE, SIG', 'Trésorerie & rapprochement', 'Fiscalité 17 pays OHADA', 'Audit IA PROPH3T (108 contrôles)', 'Multi-société, multi-devise'],
              price: '25 000', priceSuffix: 'FCFA/mois',
            },
            {
              name: "Liass'Pilot", sub: 'Liasse Fiscale Automatique', icon: FileText,
              gradient: 'from-[#0891b2] to-[#06b6d4]', badge: 'Disponible', badgeColor: 'bg-green-500',
              features: ['DSF conforme DGI', '22 états annexes pré-remplis', 'Télédéclaration directe', 'Contrôles de cohérence', 'Export PDF, XML, EDI', 'Multi-exercice comparatif'],
              price: '15 000', priceSuffix: 'FCFA/mois',
            },
            {
              name: 'DocJourney', sub: 'Gestion Documentaire', icon: FolderOpen,
              gradient: 'from-[#7c3aed] to-[#a78bfa]', badge: 'Bientôt', badgeColor: 'bg-amber-500',
              features: ['OCR intelligent', 'Classement IA automatique', 'Archivage légal 10 ans', 'Recherche full-text', 'Workflows de validation', 'Intégration Atlas Finance'],
              price: '10 000', priceSuffix: 'FCFA/mois',
            },
          ].map((sol, i) => (
            <div key={i} className="rounded-2xl overflow-hidden bg-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 group border border-gray-100">
              <div className={`bg-gradient-to-br ${sol.gradient} p-8 relative overflow-hidden`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <sol.icon className="w-8 h-8 text-white/80" />
                    <span className={`${sol.badgeColor} text-white text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider`}>{sol.badge}</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white">{sol.name}</h3>
                  <p className="text-white/60 text-sm mt-1">{sol.sub}</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-white">{sol.price}</span>
                    <span className="text-white/50 text-sm">{sol.priceSuffix}</span>
                  </div>
                </div>
              </div>
              <div className="p-8">
                <ul className="space-y-3 mb-8">
                  {sol.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2.5 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => navigate('/register')}
                  className="w-full py-3.5 bg-[#171717] text-white rounded-xl text-sm font-semibold hover:bg-[#333] transition-all flex items-center justify-center gap-2 group-hover:shadow-lg">
                  Essai gratuit 14 jours <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════ FEATURES — grille avec icônes ══════════ */}
      <section id="features" className="py-24 px-8 md:px-16 lg:px-24 bg-white">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-[#171717] mb-3">Tout ce dont vous avez besoin</h2>
          <p className="text-gray-500 text-lg">Des outils puissants, pensés pour l'Afrique</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {[
            { icon: Calculator, title: 'Comptabilité SYSCOHADA', desc: 'Plan comptable OHADA, écritures, grand livre, balance. 100% conforme au référentiel révisé 2017.', color: '#171717' },
            { icon: BarChart3,  title: 'États Financiers',       desc: 'Bilan, compte de résultat, TAFIRE, SIG, ratios. Génération automatique et export PDF.', color: '#2563eb' },
            { icon: Shield,     title: 'Fiscalité 17 Pays',      desc: 'TVA, IS, IRPP, retenues à la source. Calendrier fiscal avec alertes et déclarations.', color: '#dc2626' },
            { icon: Wallet,     title: 'Trésorerie',             desc: 'Comptes bancaires, rapprochement, prévisions, multi-devise. Position temps réel.', color: '#059669' },
            { icon: Zap,        title: 'IA PROPH3T',             desc: 'Assistant comptable IA — calculs fiscaux, écritures, audit Benford, 108 contrôles.', color: '#d97706' },
            { icon: Users,      title: 'Multi-tenant SaaS',      desc: 'Chaque client isolé. Rôles, permissions, feature flags. Sécurité RLS PostgreSQL.', color: '#7c3aed' },
          ].map((f, i) => (
            <div key={i} className="p-7 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300 group bg-white">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-colors" style={{ backgroundColor: f.color + '10' }}>
                <f.icon className="w-6 h-6" style={{ color: f.color }} />
              </div>
              <h3 className="text-base font-bold text-[#171717] mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════ CTA — gradient vivant ══════════ */}
      <section className="py-24 px-8 md:px-16 lg:px-24 bg-gradient-to-br from-[#171717] via-[#1e293b] to-[#0f172a] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="relative max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Prêt à simplifier votre gestion ?</h2>
          <p className="text-lg text-white/50 mb-8">
            Rejoignez les entreprises qui font confiance à <span className="atlas-brand text-xl text-white">Atlas Studio</span>
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <button onClick={() => navigate('/register')} className="px-8 py-4 bg-white text-[#171717] rounded-xl text-base font-semibold hover:bg-gray-100 transition-all hover:shadow-xl hover:-translate-y-0.5 inline-flex items-center gap-2">
              Créer mon compte <ArrowRight className="w-5 h-5" />
            </button>
            <button onClick={async () => { await login('admin@atlasfinance.cm', 'admin123'); navigate('/client'); }}
              className="px-8 py-4 border-2 border-white/20 text-white rounded-xl text-base font-semibold hover:bg-white/10 transition-all inline-flex items-center gap-2">
              <Play className="w-5 h-5" /> Voir la démo
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
              <p className="text-sm text-white/30 mt-3 leading-relaxed">La suite de gestion d'entreprise pour l'Afrique francophone.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm text-white/80">Produits</h4>
              <ul className="space-y-2.5 text-sm text-white/40">
                <li className="hover:text-white/60 cursor-pointer transition-colors">Atlas Finance</li>
                <li className="hover:text-white/60 cursor-pointer transition-colors">Liass'Pilot</li>
                <li className="hover:text-white/60 cursor-pointer transition-colors">DocJourney</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm text-white/80">Ressources</h4>
              <ul className="space-y-2.5 text-sm text-white/40">
                <li className="hover:text-white/60 cursor-pointer transition-colors">Documentation</li>
                <li className="hover:text-white/60 cursor-pointer transition-colors">API</li>
                <li className="hover:text-white/60 cursor-pointer transition-colors">Support</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm text-white/80">Contact</h4>
              <ul className="space-y-2.5 text-sm text-white/40">
                <li>contact@atlasstudio.com</li>
                <li>Douala, Cameroun</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/5 pt-8 text-center text-xs text-white/20">
            &copy; {new Date().getFullYear()} <span className="atlas-brand text-sm">Atlas Studio</span> — Tous droits réservés
            <button onClick={() => navigate('/admin-login')} className="text-white/10 hover:text-white/10 ml-1 cursor-default">·</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
