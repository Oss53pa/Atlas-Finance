// @ts-nocheck
/**
 * SolutionRouter — Page d'accueil de chaque solution.
 * Présente la solution, ses modules, et un bouton pour ouvrir l'application.
 */
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Calculator, FileText, FolderOpen, ArrowLeft, ArrowRight, Construction,
  BarChart3, Shield, Zap, Globe, Users, Wallet, BookOpen, Lock,
  CheckCircle, Play, Star
} from 'lucide-react';
import DemoModal from '../../components/demo/DemoModal';

const SOLUTIONS: Record<string, {
  name: string; icon: any; color: string; workspacePath?: string;
  tagline: string; description: string;
  modules: Array<{ icon: any; title: string; desc: string }>;
  stats: Array<{ value: string; label: string }>;
  demoKey: string;
}> = {
  'atlas-finance': {
    name: 'Atlas Finance',
    icon: Calculator,
    color: '#141414',
    workspacePath: '/dashboard',
    tagline: 'ERP Comptable & Financier',
    demoKey: 'atlas-finance',
    description: 'La solution complète de gestion comptable et financière pour les entreprises des 17 pays de l\'espace OHADA. Conforme au référentiel SYSCOHADA révisé 2017.',
    modules: [
      { icon: BookOpen, title: 'Comptabilité générale', desc: 'Écritures, grand livre, balance, journaux. Multi-journaux AC/VE/BQ/CA/OD.' },
      { icon: BarChart3, title: 'États financiers', desc: 'Bilan, compte de résultat, TAFIRE, SIG, ratios. Génération automatique.' },
      { icon: Wallet, title: 'Trésorerie', desc: 'Comptes bancaires, rapprochement, prévisions M+1/M+3/M+6, multi-devise.' },
      { icon: Shield, title: 'Fiscalité', desc: 'TVA, IS, IRPP pour 17 pays. Calendrier fiscal avec alertes échéances.' },
      { icon: Globe, title: 'Immobilisations', desc: 'Registre, amortissement linéaire/dégressif, prorata temporis, écritures auto.' },
      { icon: Lock, title: 'Clôture', desc: 'Processus guidé en 6 étapes. Amortissements, provisions, reports à nouveau.' },
      { icon: Zap, title: 'IA PROPH3T', desc: 'Assistant comptable IA — 108 contrôles d\'audit, détection d\'anomalies.' },
      { icon: Users, title: 'Collaboration', desc: 'Rôles admin/manager/comptable, workflow validation, piste d\'audit SHA-256.' },
    ],
    stats: [
      { value: '17', label: 'Pays OHADA' },
      { value: '108', label: 'Contrôles audit' },
      { value: '9', label: 'Niveaux SIG' },
      { value: '100%', label: 'SYSCOHADA' },
    ],
  },
  'liass-pilot': {
    name: "Liass'Pilot",
    icon: FileText,
    color: '#0891b2',
    tagline: 'Liasse Fiscale Automatique',
    demoKey: 'liass-pilot',
    description: 'Générez votre liasse fiscale DSF en quelques clics. 22 états annexes pré-remplis, contrôles de cohérence automatiques, télédéclaration conforme DGI.',
    modules: [
      { icon: FileText, title: 'Génération DSF', desc: '22 états annexes pré-remplis automatiquement depuis vos données comptables.' },
      { icon: CheckCircle, title: 'Contrôles de cohérence', desc: 'Vérification automatique des totaux inter-états et concordance.' },
      { icon: Shield, title: 'Télédéclaration', desc: 'Export XML/EDI conforme au format DGI, envoi direct.' },
      { icon: BarChart3, title: 'Comparatif N/N-1', desc: 'Analyse des variations entre exercices.' },
    ],
    stats: [
      { value: '22', label: 'États annexes' },
      { value: '100%', label: 'Conforme DGI' },
      { value: 'XML', label: 'Télédéclaration' },
      { value: 'Auto', label: 'Pré-remplissage' },
    ],
  },
  'docjourney': {
    name: 'DocJourney',
    icon: FolderOpen,
    color: '#7c3aed',
    tagline: 'Gestion Documentaire Intelligente',
    demoKey: 'doc-journey',
    description: 'Numérisez, classez et archivez tous vos documents d\'entreprise. OCR intelligent, classement IA, archivage légal 10 ans.',
    modules: [
      { icon: Zap, title: 'OCR intelligent', desc: 'Extraction automatique des données : montants, dates, fournisseurs.' },
      { icon: FolderOpen, title: 'Classement IA', desc: 'Classification automatique par type et par tiers.' },
      { icon: Lock, title: 'Archivage légal', desc: 'Conservation 10 ans, SHA-256, non-répudiation.' },
      { icon: Globe, title: 'Recherche full-text', desc: 'Retrouvez n\'importe quel document instantanément.' },
    ],
    stats: [
      { value: '10', label: 'Ans d\'archivage' },
      { value: 'OCR', label: 'Extraction auto' },
      { value: 'IA', label: 'Classement' },
      { value: 'SHA-256', label: 'Sécurité' },
    ],
  },
};

const SolutionRouter: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const sol = code ? SOLUTIONS[code] : null;
  const [showDemo, setShowDemo] = useState(false);

  if (!sol) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Construction className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-[#141414] mb-2">Solution non trouvée</h2>
          <p className="text-sm text-gray-500 mb-4">Le code "{code}" ne correspond à aucune solution.</p>
          <button onClick={() => navigate('/client')} className="px-5 py-2.5 bg-[#141414] text-white rounded-lg text-sm font-semibold">
            Retour au dashboard
          </button>
        </div>
      </div>
    );
  }

  const Icon = sol.icon;
  const hasWorkspace = !!sol.workspacePath;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2 mb-8">
        <button onClick={() => navigate('/client')} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-sm text-gray-400">Mes applications</span>
      </div>

      {/* Hero */}
      <div className="rounded-2xl overflow-hidden mb-8" style={{ backgroundColor: sol.color }}>
        <div className="px-10 py-12 flex items-center justify-between">
          <div className="max-w-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 bg-white/15 rounded-xl flex items-center justify-center">
                <Icon className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white atlas-brand">{sol.name}</h1>
                <p className="text-sm text-white/60">{sol.tagline}</p>
              </div>
            </div>
            <p className="text-white/70 leading-relaxed mb-6">{sol.description}</p>
            <div className="flex gap-3">
              {hasWorkspace ? (
                <button
                  onClick={() => navigate(sol.workspacePath)}
                  className="px-6 py-3 bg-white text-[#141414] rounded-xl font-semibold text-sm hover:bg-gray-100 transition-colors flex items-center gap-2"
                >
                  Ouvrir l'application <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <div className="px-6 py-3 bg-white/20 text-white rounded-xl font-semibold text-sm">
                  Bientôt disponible
                </div>
              )}
              <button
                onClick={() => setShowDemo(true)}
                className="px-6 py-3 border border-white/30 text-white rounded-xl font-semibold text-sm hover:bg-white/10 transition-colors flex items-center gap-2"
              >
                <Play className="w-4 h-4" /> Voir la démo
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="hidden lg:grid grid-cols-2 gap-4">
            {sol.stats.map((s, i) => (
              <div key={i} className="bg-white/10 rounded-xl px-5 py-3 text-center min-w-[100px]">
                <div className="text-2xl font-bold text-white">{s.value}</div>
                <div className="text-xs text-white/50 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modules */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-[#141414] mb-4">Modules inclus</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {sol.modules.map((m, i) => {
            const MIcon = m.icon;
            return (
              <div key={i} className="p-5 bg-white rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mb-3">
                  <MIcon className="w-5 h-5 text-[#141414]" />
                </div>
                <h3 className="text-sm font-semibold text-[#141414] mb-1">{m.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{m.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* CTA */}
      {hasWorkspace && (
        <div className="bg-gray-50 rounded-2xl p-8 text-center border border-gray-200">
          <h3 className="text-lg font-bold text-[#141414] mb-2">Prêt à travailler ?</h3>
          <p className="text-sm text-gray-500 mb-4">Accédez à votre espace de travail {sol.name}.</p>
          <button
            onClick={() => navigate(sol.workspacePath)}
            className="px-8 py-3 bg-[#141414] text-white rounded-xl font-semibold text-sm hover:bg-[#2a2a2a] transition-colors inline-flex items-center gap-2"
          >
            Ouvrir {sol.name} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Demo Modal */}
      <DemoModal isOpen={showDemo} onClose={() => setShowDemo(false)} initialSolution={sol.demoKey} />
    </div>
  );
};

export default SolutionRouter;
