// @ts-nocheck
/**
 * Visite guidée animée — tour auto-play en 6 étapes
 */
import React, { useState, useEffect } from 'react';
import { Upload, GitBranch, PenTool, BarChart3, Users, Shield, Play, Pause, ChevronLeft, ChevronRight } from 'lucide-react';

const TOUR_STEPS = {
  'atlas-finance': [
    { icon: Upload, title: 'Saisissez vos écritures', desc: 'Journal des achats, ventes, banque, caisse, OD. Contrôle débit = crédit automatique. Multi-lignes, multi-journaux.', color: '#1e40af', animation: 'upload' },
    { icon: BarChart3, title: 'Visualisez vos états financiers', desc: 'Bilan SYSCOHADA, compte de résultat, TAFIRE, SIG — générés instantanément depuis vos écritures.', color: '#166534', animation: 'chart' },
    { icon: GitBranch, title: 'Rapprochez vos comptes', desc: 'Lettrage automatique clients/fournisseurs, rapprochement bancaire, identification des écarts.', color: '#7c2d12', animation: 'connect' },
    { icon: Shield, title: 'Déclarez vos impôts', desc: 'TVA, IS, IRPP calculés automatiquement. Calendrier fiscal 17 pays OHADA avec alertes échéances.', color: '#6b21a8', animation: 'shield' },
    { icon: Users, title: 'Collaborez en équipe', desc: 'Rôles comptable, manager, DG. Workflow de validation. Piste d\'audit SHA-256 inaltérable.', color: '#0f766e', animation: 'team' },
    { icon: PenTool, title: 'Clôturez en confiance', desc: 'Processus de clôture guidé en 6 étapes. Amortissements, provisions, reports à nouveau automatisés.', color: '#b91c1c', animation: 'lock' },
  ],
  'liass-pilot': [
    { icon: Upload, title: 'Importez vos données', desc: 'Connexion directe avec Atlas Finance ou import de balance. Mapping automatique des comptes.', color: '#1e40af', animation: 'upload' },
    { icon: BarChart3, title: 'Générez la liasse', desc: '22 états annexes pré-remplis automatiquement. Format conforme DGI Cameroun.', color: '#166534', animation: 'chart' },
    { icon: Shield, title: 'Contrôles de cohérence', desc: 'Vérification automatique des totaux, concordance bilan/résultat, contrôles croisés.', color: '#7c2d12', animation: 'shield' },
    { icon: GitBranch, title: 'Télédéclarez', desc: 'Export XML/EDI, envoi direct au portail fiscal. Accusé de réception tracé.', color: '#6b21a8', animation: 'connect' },
  ],
  'doc-journey': [
    { icon: Upload, title: 'Numérisez vos documents', desc: 'OCR intelligent — factures, reçus, contrats. Extraction automatique des données clés.', color: '#1e40af', animation: 'upload' },
    { icon: BarChart3, title: 'Classement automatique', desc: 'L\'IA identifie le type de document et le classe dans le bon dossier. Tags automatiques.', color: '#166534', animation: 'chart' },
    { icon: Shield, title: 'Archivage sécurisé', desc: 'Conservation légale 10 ans. Hash SHA-256, horodatage certifié, non-répudiation.', color: '#7c2d12', animation: 'shield' },
    { icon: Users, title: 'Partagez et collaborez', desc: 'Workflows de validation documentaire, partage sécurisé, recherche full-text instantanée.', color: '#0f766e', animation: 'team' },
  ],
};

const GuidedTour: React.FC<{ solution: string; onClose: () => void }> = ({ solution, onClose }) => {
  const steps = TOUR_STEPS[solution] || TOUR_STEPS['atlas-finance'];
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          setCurrent(c => (c + 1) % steps.length);
          return 0;
        }
        return prev + 2;
      });
    }, 80);
    return () => clearInterval(interval);
  }, [playing, steps.length]);

  const step = steps[current];
  const Icon = step.icon;

  return (
    <div className="space-y-4">
      {/* Progress dots */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {steps.map((_, i) => (
            <button key={i} onClick={() => { setCurrent(i); setProgress(0); }}
              className={`h-1.5 rounded-full transition-all ${i === current ? 'w-8 bg-[#141414]' : i < current ? 'w-4 bg-gray-400' : 'w-4 bg-gray-200'}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setPlaying(!playing)} className="p-1.5 rounded-lg hover:bg-gray-100">
            {playing ? <Pause className="w-4 h-4 text-gray-600" /> : <Play className="w-4 h-4 text-gray-600" />}
          </button>
          <span className="text-xs text-gray-400">{current + 1}/{steps.length}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-1">
        <div className="h-1 rounded-full transition-all duration-100" style={{ width: `${progress}%`, backgroundColor: step.color }}></div>
      </div>

      {/* Step content */}
      <div className="flex flex-col items-center text-center py-6">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 transition-colors duration-500" style={{ backgroundColor: step.color + '15' }}>
          <Icon className="w-10 h-10 transition-colors duration-500" style={{ color: step.color }} />
        </div>
        <h3 className="text-xl font-bold text-[#141414] mb-3">{step.title}</h3>
        <p className="text-sm text-gray-500 max-w-md leading-relaxed">{step.desc}</p>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => { setCurrent(c => Math.max(0, c - 1)); setProgress(0); }}
          disabled={current === 0}
          className={`flex items-center gap-1 text-sm ${current === 0 ? 'text-gray-300' : 'text-gray-600 hover:text-[#141414]'}`}
        >
          <ChevronLeft className="w-4 h-4" /> Précédent
        </button>
        {current === steps.length - 1 ? (
          <button onClick={onClose} className="px-6 py-2 bg-[#141414] text-white rounded-lg text-sm font-semibold hover:bg-[#2a2a2a]">
            Commencer maintenant
          </button>
        ) : (
          <button
            onClick={() => { setCurrent(c => c + 1); setProgress(0); }}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-[#141414]"
          >
            Suivant <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default GuidedTour;
