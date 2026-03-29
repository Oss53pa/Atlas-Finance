import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ATLAS_STUDIO } from '../config/atlasStudio';
import {
  CheckCircle, X, ArrowRight, Zap, Crown, Calculator,
  BarChart3, Shield, Globe, BookOpen, Wallet, Brain,
  Building2, Lock, HeadphonesIcon,
} from 'lucide-react';
import { FEATURE_MATRIX } from '../config/plans';

function getWorkspacePath(_role: string): string {
  return '/home';
}

const HIGHLIGHTS = [
  { icon: Calculator, label: 'Comptabilité SYSCOHADA', desc: 'Plan comptable OHADA, journaux, grand livre, balance.' },
  { icon: BarChart3, label: 'États financiers', desc: 'Bilan, compte de résultat, TAFIRE, SIG, ratios.' },
  { icon: Shield, label: 'Fiscalité 17 pays', desc: 'TVA, IS, IMF, patente, calendrier fiscal.' },
  { icon: Wallet, label: 'Trésorerie', desc: 'Rapprochement bancaire, caisse, effets de commerce.' },
  { icon: Brain, label: 'IA PROPH3T', desc: 'Contrôles automatiques, corrections, audit Benford.' },
  { icon: Globe, label: 'Multi-devises', desc: 'XAF, XOF, EUR, USD, écarts de conversion.' },
  { icon: Building2, label: 'Multi-sociétés', desc: 'Consolidation, inter-company, multi-sites.' },
  { icon: Lock, label: 'Audit trail SHA-256', desc: 'Piste d\'audit inaltérable, conformité OHADA.' },
];

const formatXOF = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const handleGetStarted = () => {
    if (isAuthenticated && user) {
      navigate(getWorkspacePath(user.role || ''));
    } else {
      window.location.href = ATLAS_STUDIO.LOGIN;
    }
  };

  return (
    <div className="min-h-screen bg-white">

      {/* ══════════ NAV ══════════ */}
      <nav className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-gray-200 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="atlas-brand text-2xl text-[#171717]">Atlas Studio</span>
            <span className="text-gray-300">/</span>
            <span className="text-sm font-bold text-[#171717] tracking-tight">Atlas F&A</span>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <button onClick={handleGetStarted} className="px-5 py-2 bg-[#171717] text-white rounded-lg text-sm font-semibold hover:bg-[#2a2a2a] transition-colors flex items-center gap-2">
                Mon espace <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <a href={ATLAS_STUDIO.LOGIN} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-[#171717]">
                  Se connecter
                </a>
                <a href={ATLAS_STUDIO.LOGIN} className="px-5 py-2 bg-[#171717] text-white rounded-lg text-sm font-semibold hover:bg-[#2a2a2a] transition-colors">
                  Essai gratuit
                </a>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ══════════ HERO ══════════ */}
      <section className="pt-20 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-semibold mb-6">
            <CheckCircle className="w-3.5 h-3.5" /> 100% conforme SYSCOHADA révisé 2017
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-[#171717] leading-tight mb-4">
            La comptabilité africaine,<br />
            <span className="text-gray-400">simplifiée et intelligente.</span>
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-8">
            Atlas F&A est le module comptable et financier d'Atlas Studio.
            Conçu pour les 17 pays de l'espace OHADA.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <button onClick={handleGetStarted} className="px-8 py-3.5 bg-[#171717] text-white rounded-xl text-sm font-semibold hover:bg-[#2a2a2a] transition-all hover:shadow-lg flex items-center gap-2">
              <Zap className="w-4 h-4" /> Commencer gratuitement
            </button>
            <a href="#plans" className="px-8 py-3.5 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:border-gray-400 transition-all">
              Voir les plans
            </a>
          </div>
        </div>
      </section>

      {/* ══════════ HIGHLIGHTS ══════════ */}
      <section className="py-16 px-6 bg-[#fafafa]">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {HIGHLIGHTS.map((h, i) => (
              <div key={i} className="bg-white rounded-xl border p-5 hover:shadow-md transition-shadow">
                <h.icon className="w-6 h-6 text-[#171717] mb-3" />
                <h3 className="text-sm font-bold text-[#171717] mb-1">{h.label}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{h.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ PLANS ══════════ */}
      <section id="plans" className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#171717]">Deux plans, zéro surprise</h2>
            <p className="text-gray-500 mt-2">Essai gratuit 14 jours, sans engagement</p>
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
            {/* PME/TPE */}
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-8 hover:border-gray-400 transition-all">
              <h3 className="text-xl font-bold text-[#171717]">PME / TPE</h3>
              <p className="text-sm text-gray-500 mt-1">Tous les modules comptables de base pour une société</p>
              <div className="mt-6">
                <span className="text-4xl font-bold text-[#171717]">{formatXOF(49000)}</span>
                <span className="text-gray-400 ml-1 text-sm">FCFA/mois</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">~75 EUR &middot; 1 à 5 utilisateurs</p>
              <p className="text-xs text-gray-400">Utilisateur suppl. : 9 000 FCFA/mois</p>
              <button onClick={handleGetStarted}
                className="w-full mt-6 py-3 border-2 border-[#171717] text-[#171717] rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                <Zap className="w-4 h-4" /> Essai gratuit 14 jours
              </button>
            </div>

            {/* Premium */}
            <div className="bg-white rounded-2xl border-2 border-[#171717] p-8 shadow-xl relative">
              <div className="absolute -top-3 right-6 bg-[#171717] text-white text-xs font-semibold px-4 py-1 rounded-full">
                Populaire
              </div>
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-500" />
                <h3 className="text-xl font-bold text-[#171717]">Premium</h3>
              </div>
              <p className="text-sm text-gray-500 mt-1">Multi-sociétés, devises, IA avancée, RBAC, API, support dédié</p>
              <div className="mt-6">
                <span className="text-4xl font-bold text-[#171717]">{formatXOF(250000)}</span>
                <span className="text-gray-400 ml-1 text-sm">FCFA/mois</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">~380 EUR &middot; utilisateurs illimités</p>
              <p className="text-xs text-gray-400">Au-delà de 5 sociétés : sur devis</p>
              <button onClick={handleGetStarted}
                className="w-full mt-6 py-3 bg-[#171717] text-white rounded-lg text-sm font-semibold hover:bg-[#2a2a2a] transition-colors flex items-center justify-center gap-2">
                <Zap className="w-4 h-4" /> Essai gratuit 14 jours
              </button>
            </div>
          </div>

          {/* Feature comparison table */}
          <div className="bg-white rounded-2xl border overflow-hidden">
            <div className="grid grid-cols-[1fr_100px_100px] bg-gray-50 border-b">
              <div className="px-6 py-4 text-sm font-semibold text-gray-500">Fonctionnalité</div>
              <div className="px-3 py-4 text-xs font-bold text-gray-700 text-center">PME / TPE</div>
              <div className="px-3 py-4 text-xs font-bold text-gray-700 text-center">Premium</div>
            </div>

            {FEATURE_MATRIX.map((cat, ci) => (
              <div key={ci}>
                <div className="px-6 py-2.5 bg-gray-50/60 border-b border-t">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{cat.category}</span>
                </div>
                {cat.items.map((item, ii) => (
                  <div key={ii} className="grid grid-cols-[1fr_100px_100px] border-b last:border-b-0 hover:bg-gray-50/40">
                    <div className="px-6 py-2.5 text-sm text-gray-700">{item.label}</div>
                    <div className="flex items-center justify-center">
                      {item.pme
                        ? <CheckCircle className="w-4 h-4 text-green-500" />
                        : <X className="w-3.5 h-3.5 text-gray-300" />}
                    </div>
                    <div className="flex items-center justify-center">
                      {item.premium
                        ? <CheckCircle className="w-4 h-4 text-green-500" />
                        : <X className="w-3.5 h-3.5 text-gray-300" />}
                    </div>
                  </div>
                ))}
              </div>
            ))}

            {/* Pricing footer */}
            <div className="grid grid-cols-[1fr_100px_100px] bg-[#171717]">
              <div className="px-6 py-4 text-sm font-bold text-white">Prix mensuel</div>
              <div className="flex flex-col items-center justify-center py-4">
                <span className="text-sm font-bold text-white">{formatXOF(49000)}</span>
                <span className="text-[10px] text-gray-400">FCFA</span>
              </div>
              <div className="flex flex-col items-center justify-center py-4">
                <span className="text-sm font-bold text-white">{formatXOF(250000)}</span>
                <span className="text-[10px] text-gray-400">FCFA</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ CTA ══════════ */}
      <section className="py-16 px-6 bg-[#171717]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Prêt à démarrer ?</h2>
          <p className="text-sm text-white/50 mb-6">
            14 jours d'essai gratuit &middot; Paiement Mobile Money, virement ou carte
          </p>
          <button onClick={handleGetStarted}
            className="px-8 py-3.5 bg-white text-[#171717] rounded-xl text-sm font-semibold hover:bg-gray-100 transition-all inline-flex items-center gap-2">
            Créer mon compte <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ══════════ FOOTER ══════════ */}
      <footer className="bg-[#0e0e0e] py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="atlas-brand text-xl text-white/80">Atlas Studio</span>
            <span className="text-white/20 mx-1">/</span>
            <span className="text-xs font-semibold text-white/50">Atlas F&A</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-white/30">
            <span>contact@atlasstudio.com</span>
            <span>Douala, Cameroun</span>
            <span>&copy; {new Date().getFullYear()} Atlas Studio</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
