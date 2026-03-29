// @ts-nocheck
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, X, ArrowRight, Zap, Crown } from 'lucide-react';
import { PLANS, FEATURE_MATRIX, type PlanTier } from '../../config/plans';

const SolutionCatalogPage: React.FC = () => {
  const navigate = useNavigate();

  const handleSelectPlan = (tier: PlanTier) => {
    navigate(`/client/checkout/atlas-fna?plan=${tier}`);
  };

  const formatXOF = (n: number) =>
    n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="atlas-brand text-2xl text-[#171717]">Atlas Studio</span>
            <span className="text-gray-300 mx-1">/</span>
            <span className="text-sm font-semibold text-gray-600">Atlas F&A</span>
          </div>
          <button onClick={() => navigate('/client')} className="text-sm text-gray-500 hover:text-gray-700">
            Retour au hub
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Title */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-[#171717]">Choisissez votre plan Atlas F&A</h1>
          <p className="text-gray-500 mt-2">Comptabilité SYSCOHADA complète pour les entreprises africaines</p>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-16">
          {/* PME/TPE */}
          <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden hover:border-gray-400 transition-all">
            <div className="p-8">
              <h3 className="text-xl font-bold text-[#171717]">{PLANS.pme.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{PLANS.pme.tagline}</p>
              <div className="mt-6">
                <span className="text-4xl font-bold text-[#171717]">{formatXOF(PLANS.pme.pricing.monthly_xof)}</span>
                <span className="text-gray-400 ml-1">FCFA/mois</span>
              </div>
              <p className="text-sm text-gray-400 mt-1">~{PLANS.pme.pricing.monthly_eur} EUR &middot; 1 à {PLANS.pme.seats.included} utilisateurs</p>
              <p className="text-xs text-gray-400 mt-0.5">Utilisateur suppl. : {formatXOF(PLANS.pme.pricing.extra_user_xof!)} FCFA/mois</p>
              <button
                onClick={() => handleSelectPlan('pme')}
                className="w-full mt-6 py-3 border-2 border-[#171717] text-[#171717] rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" /> Essai gratuit 14 jours
              </button>
            </div>
          </div>

          {/* Premium */}
          <div className="bg-white rounded-2xl border-2 border-[#171717] overflow-hidden shadow-xl relative">
            <div className="absolute top-0 right-0 bg-[#171717] text-white text-xs font-semibold px-4 py-1.5 rounded-bl-lg">
              Populaire
            </div>
            <div className="p-8">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-500" />
                <h3 className="text-xl font-bold text-[#171717]">{PLANS.premium.name}</h3>
              </div>
              <p className="text-sm text-gray-500 mt-1">{PLANS.premium.tagline}</p>
              <div className="mt-6">
                <span className="text-4xl font-bold text-[#171717]">{formatXOF(PLANS.premium.pricing.monthly_xof)}</span>
                <span className="text-gray-400 ml-1">FCFA/mois</span>
              </div>
              <p className="text-sm text-gray-400 mt-1">~{PLANS.premium.pricing.monthly_eur} EUR &middot; utilisateurs illimités</p>
              <p className="text-xs text-gray-400 mt-0.5">Au-delà de 5 sociétés : sur devis</p>
              <button
                onClick={() => handleSelectPlan('premium')}
                className="w-full mt-6 py-3 bg-[#171717] text-white rounded-lg text-sm font-semibold hover:bg-[#2a2a2a] transition-colors flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" /> Essai gratuit 14 jours
              </button>
            </div>
          </div>
        </div>

        {/* Feature comparison table */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-bold text-[#171717] mb-6 text-center">Comparaison détaillée des plans</h2>

          <div className="bg-white rounded-2xl border overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_120px_120px] bg-gray-50 border-b">
              <div className="px-6 py-4 text-sm font-semibold text-gray-500">Fonctionnalité</div>
              <div className="px-4 py-4 text-sm font-semibold text-gray-700 text-center">PME / TPE</div>
              <div className="px-4 py-4 text-sm font-semibold text-gray-700 text-center">
                Premium
              </div>
            </div>

            {FEATURE_MATRIX.map((cat, ci) => (
              <div key={ci}>
                {/* Category header */}
                <div className="px-6 py-3 bg-gray-50/50 border-b border-t">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{cat.category}</span>
                </div>
                {/* Items */}
                {cat.items.map((item, ii) => (
                  <div key={ii} className="grid grid-cols-[1fr_120px_120px] border-b last:border-b-0 hover:bg-gray-50/50">
                    <div className="px-6 py-3 text-sm text-gray-700">{item.label}</div>
                    <div className="px-4 py-3 flex items-center justify-center">
                      {item.pme ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <X className="w-4 h-4 text-gray-300" />
                      )}
                    </div>
                    <div className="px-4 py-3 flex items-center justify-center">
                      {item.premium ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <X className="w-4 h-4 text-gray-300" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}

            {/* Pricing row */}
            <div className="grid grid-cols-[1fr_120px_120px] bg-[#171717]">
              <div className="px-6 py-5 text-sm font-bold text-white">Prix</div>
              <div className="px-4 py-5 text-center">
                <div className="text-lg font-bold text-white">{formatXOF(49000)}</div>
                <div className="text-xs text-gray-400">FCFA/mois</div>
              </div>
              <div className="px-4 py-5 text-center">
                <div className="text-lg font-bold text-white">{formatXOF(250000)}</div>
                <div className="text-xs text-gray-400">FCFA/mois</div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <p className="text-sm text-gray-400">
            Essai gratuit 14 jours, sans engagement &middot; Paiement par Mobile Money, virement ou carte
          </p>
        </div>
      </main>
    </div>
  );
};

export default SolutionCatalogPage;
