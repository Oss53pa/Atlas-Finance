
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calculator, FileText, FolderOpen, Users, Handshake, Truck, ShieldCheck,
  CheckCircle, X, ArrowRight, Zap, Crown, Lock, ArrowLeft, ChevronDown, ChevronUp
} from 'lucide-react';
import { PLANS, FEATURE_MATRIX, type PlanTier } from '../../config/plans';

/* ══════════ Catalogue des applications ══════════ */

interface SolutionDef {
  code: string;
  name: string;
  desc: string;
  longDesc: string;
  icon: React.FC<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  status: 'available' | 'coming_soon';
  highlights: string[];
  pricing?: { from_xof: number; from_eur: number };
}

const SOLUTIONS: SolutionDef[] = [
  {
    code: 'atlas-fna',
    name: 'Atlas F&A',
    desc: 'ERP Comptable & Financier SYSCOHADA',
    longDesc: 'Solution comptable complète conforme au plan SYSCOHADA révisé. Gestion des écritures, lettrage automatique, rapprochement bancaire, immobilisations, fiscalité, clôture et états financiers.',
    icon: Calculator,
    color: '#171717',
    status: 'available',
    highlights: [
      'Plan comptable SYSCOHADA révisé',
      'Lettrage automatique (4 algorithmes)',
      'Immobilisations & amortissements',
      'États financiers : Bilan, CR, SIG, TAFIRE',
      'IA PROPH3T : contrôles & corrections',
      'Multi-sociétés & multi-pays OHADA',
    ],
    pricing: { from_xof: 49000, from_eur: 75 },
  },
  {
    code: 'liass-pilot',
    name: "Liass'Pilot",
    desc: 'Liasse fiscale automatique',
    longDesc: "Génération automatique de la liasse fiscale OHADA à partir de vos écritures comptables. Export conforme aux normes de l'administration fiscale.",
    icon: FileText,
    color: '#0891b2',
    status: 'available',
    highlights: [
      'Liasse fiscale SYSCOHADA automatique',
      'Formulaires DSF préremplis',
      'Contrôles de cohérence intégrés',
      'Export PDF & EDI',
    ],
    pricing: { from_xof: 29000, from_eur: 45 },
  },
  {
    code: 'docjourney',
    name: 'DocJourney',
    desc: 'Gestion documentaire intelligente',
    longDesc: "Dématérialisez vos pièces comptables avec OCR intelligent. Classement automatique, archivage sécurisé et recherche instantanée.",
    icon: FolderOpen,
    color: '#7c3aed',
    status: 'available',
    highlights: [
      'OCR intelligent multi-langues',
      'Classement automatique par IA',
      'Archivage sécurisé & conforme',
      'Recherche plein texte instantanée',
    ],
    pricing: { from_xof: 19000, from_eur: 29 },
  },
  {
    code: 'tms-pro',
    name: 'TMS Pro Africa',
    desc: 'Gestion de trésorerie',
    longDesc: "Pilotez votre trésorerie en temps réel. Prévisions de cash-flow, gestion des positions bancaires multi-devises et rapprochement automatique.",
    icon: Truck,
    color: '#ea580c',
    status: 'coming_soon',
    highlights: [
      'Position de trésorerie consolidée',
      'Prévisions de cash-flow IA',
      'Multi-banques & multi-devises',
      'Rapprochement bancaire automatique',
    ],
  },
  {
    code: 'scrutix',
    name: 'Scrutix',
    desc: 'Audit & conformité',
    longDesc: "Plateforme d'audit interne et de contrôle de conformité. Piste d'audit complète, contrôles automatisés et rapports de conformité OHADA.",
    icon: ShieldCheck,
    color: '#059669',
    status: 'coming_soon',
    highlights: [
      "Piste d'audit irréfutable",
      'Contrôles automatisés (200+ règles)',
      'Rapports de conformité OHADA',
      'Workflow de validation RBAC',
    ],
  },
  {
    code: 'atlas-hr',
    name: 'Atlas HR',
    desc: 'Ressources Humaines & Paie',
    longDesc: "Gestion complète des RH : fiches employés, contrats, paie conforme aux réglementations OHADA, congés et absences.",
    icon: Users,
    color: '#2563eb',
    status: 'coming_soon',
    highlights: [
      'Paie conforme multi-pays OHADA',
      'Gestion des congés & absences',
      'Déclarations sociales automatiques',
      'Portail employé self-service',
    ],
  },
  {
    code: 'atlas-crm',
    name: 'Atlas CRM',
    desc: 'Relation Client & Commercial',
    longDesc: "CRM adapté au contexte africain. Gestion des contacts, pipeline commercial, devis, facturation et suivi de recouvrement intégré.",
    icon: Handshake,
    color: '#dc2626',
    status: 'coming_soon',
    highlights: [
      'Pipeline commercial visuel',
      'Devis & facturation intégrée',
      'Suivi de recouvrement',
      'Intégration comptable Atlas F&A',
    ],
  },
];

/* ══════════ Composant ══════════ */

const SolutionCatalogPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedSolution, setSelectedSolution] = useState<string | null>(null);
  const [showFeatures, setShowFeatures] = useState(false);

  const formatXOF = (n: number) =>
    n.toLocaleString('fr-FR', { maximumFractionDigits: 0 });

  const available = SOLUTIONS.filter(s => s.status === 'available');
  const comingSoon = SOLUTIONS.filter(s => s.status === 'coming_soon');

  const handleSubscribe = (code: string) => {
    navigate(`/client/checkout/${code}?plan=pme`);
  };

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="atlas-brand text-2xl text-[#171717]">Atlas Studio</span>
            <span className="text-gray-300 mx-1">/</span>
            <span className="text-sm font-semibold text-gray-600">Catalogue</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/hub')} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Hub
            </button>
            <button onClick={() => navigate('/client')} className="text-sm text-gray-500 hover:text-gray-700">
              Mon espace
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-[#171717]">Catalogue des solutions</h1>
          <p className="text-gray-500 mt-2 max-w-xl mx-auto">
            La suite logicielle Atlas Studio pour les entreprises africaines.
            Chaque application fonctionne seule ou en synergie avec les autres.
          </p>
        </div>

        {/* ══════════ Applications disponibles ══════════ */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <h2 className="text-xl font-bold text-[#171717]">Disponibles maintenant</h2>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
              {available.length} applications
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {available.map(sol => {
              const Icon = sol.icon;
              const isSelected = selectedSolution === sol.code;

              return (
                <div
                  key={sol.code}
                  className={`bg-white rounded-2xl border-2 overflow-hidden transition-all hover:shadow-lg ${
                    isSelected ? 'border-[#171717] shadow-xl' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {/* Card header */}
                  <div className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: sol.color + '12' }}
                      >
                        <Icon className="w-6 h-6" style={{ color: sol.color }} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-lg font-bold text-[#171717]">{sol.name}</h3>
                        <p className="text-sm text-gray-500">{sol.desc}</p>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 leading-relaxed mb-4">{sol.longDesc}</p>

                    {/* Highlights */}
                    <ul className="space-y-2 mb-5">
                      {sol.highlights.map((h, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                          <span className="text-gray-700">{h}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Pricing */}
                    {sol.pricing && (
                      <div className="flex items-baseline gap-1 mb-5 pb-5 border-b">
                        <span className="text-xs text-gray-400">A partir de</span>
                        <span className="text-2xl font-bold text-[#171717]">{formatXOF(sol.pricing.from_xof)}</span>
                        <span className="text-gray-400 text-sm">FCFA/mois</span>
                        <span className="text-xs text-gray-400 ml-1">(~{sol.pricing.from_eur} EUR)</span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleSubscribe(sol.code)}
                        className="flex-1 py-3 bg-[#171717] text-white rounded-xl text-sm font-semibold hover:bg-[#333] transition-colors flex items-center justify-center gap-2"
                      >
                        <Zap className="w-4 h-4" /> Essai gratuit 14j
                      </button>
                      <button
                        onClick={() => setSelectedSolution(isSelected ? null : sol.code)}
                        className="px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors"
                      >
                        Voir plans
                      </button>
                    </div>
                  </div>

                  {/* Expanded plan details */}
                  {isSelected && (
                    <div className="border-t bg-gray-50 p-6 space-y-4">
                      <h4 className="text-sm font-bold text-[#171717]">Choisissez votre plan pour {sol.name}</h4>
                      <div className="grid grid-cols-2 gap-3">
                        {/* PME */}
                        <button
                          onClick={() => navigate(`/client/checkout/${sol.code}?plan=pme`)}
                          className="p-4 bg-white rounded-xl border-2 border-gray-200 hover:border-[#171717] text-left transition-all group"
                        >
                          <div className="text-sm font-bold text-[#171717]">{PLANS.pme.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">1 à 5 utilisateurs</div>
                          <div className="text-lg font-bold text-[#171717] mt-2">{formatXOF(PLANS.pme.pricing.monthly_xof)}</div>
                          <div className="text-xs text-gray-400">FCFA/mois</div>
                          <div className="mt-3 text-xs font-semibold text-gray-400 group-hover:text-[#171717] flex items-center gap-1 transition-colors">
                            Souscrire <ArrowRight className="w-3 h-3" />
                          </div>
                        </button>

                        {/* Premium */}
                        <button
                          onClick={() => navigate(`/client/checkout/${sol.code}?plan=premium`)}
                          className="p-4 bg-white rounded-xl border-2 border-[#171717] text-left relative overflow-hidden group"
                        >
                          <div className="absolute top-0 right-0 bg-[#171717] text-white text-[10px] font-semibold px-2 py-0.5 rounded-bl-lg">
                            Populaire
                          </div>
                          <div className="flex items-center gap-1">
                            <Crown className="w-3.5 h-3.5 text-amber-500" />
                            <span className="text-sm font-bold text-[#171717]">{PLANS.premium.name}</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">Utilisateurs illimités</div>
                          <div className="text-lg font-bold text-[#171717] mt-2">{formatXOF(PLANS.premium.pricing.monthly_xof)}</div>
                          <div className="text-xs text-gray-400">FCFA/mois</div>
                          <div className="mt-3 text-xs font-semibold text-[#171717] flex items-center gap-1">
                            Souscrire <ArrowRight className="w-3 h-3" />
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ══════════ Applications à venir ══════════ */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <h2 className="text-xl font-bold text-[#171717]">Prochainement</h2>
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
              {comingSoon.length} applications
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {comingSoon.map(sol => {
              const Icon = sol.icon;
              return (
                <div key={sol.code} className="bg-white rounded-2xl border border-gray-200 p-5 opacity-75">
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: sol.color + '10' }}
                    >
                      <Icon className="w-5 h-5" style={{ color: sol.color }} />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-[#171717]">{sol.name}</div>
                      <div className="text-xs text-gray-400">{sol.desc}</div>
                    </div>
                  </div>
                  <ul className="space-y-1.5 mb-4">
                    {sol.highlights.slice(0, 3).map((h, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-500">
                        <CheckCircle className="w-3.5 h-3.5 text-gray-300 shrink-0 mt-0.5" />
                        {h}
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center gap-2 text-xs text-amber-600 font-medium">
                    <Lock className="w-3.5 h-3.5" /> Disponible prochainement
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ══════════ Comparaison détaillée des plans ══════════ */}
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => setShowFeatures(!showFeatures)}
            className="w-full flex items-center justify-center gap-2 mb-6 text-gray-500 hover:text-[#171717] transition-colors"
          >
            <h2 className="text-xl font-bold text-[#171717]">Comparaison détaillée des plans</h2>
            {showFeatures ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          {showFeatures && (
            <div className="bg-white rounded-2xl border overflow-hidden mb-8">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_120px_120px] bg-gray-50 border-b">
                <div className="px-6 py-4 text-sm font-semibold text-gray-500">Fonctionnalité</div>
                <div className="px-4 py-4 text-sm font-semibold text-gray-700 text-center">PME / TPE</div>
                <div className="px-4 py-4 text-sm font-semibold text-gray-700 text-center">Premium</div>
              </div>

              {FEATURE_MATRIX.map((cat, ci) => (
                <div key={ci}>
                  <div className="px-6 py-3 bg-gray-50/50 border-b border-t">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{cat.category}</span>
                  </div>
                  {cat.items.map((item, ii) => (
                    <div key={ii} className="grid grid-cols-[1fr_120px_120px] border-b last:border-b-0 hover:bg-gray-50/50">
                      <div className="px-6 py-3 text-sm text-gray-700">{item.label}</div>
                      <div className="px-4 py-3 flex items-center justify-center">
                        {item.pme ? <CheckCircle className="w-5 h-5 text-green-500" /> : <X className="w-4 h-4 text-gray-300" />}
                      </div>
                      <div className="px-4 py-3 flex items-center justify-center">
                        {item.premium ? <CheckCircle className="w-5 h-5 text-green-500" /> : <X className="w-4 h-4 text-gray-300" />}
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
          )}
        </div>

        {/* CTA */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-400">
            Essai gratuit 14 jours, sans engagement &middot; Paiement par Mobile Money, virement ou carte
          </p>
        </div>
      </main>
    </div>
  );
};

export default SolutionCatalogPage;
