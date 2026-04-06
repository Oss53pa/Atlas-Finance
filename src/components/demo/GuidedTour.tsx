// @ts-nocheck

/**
 * Visite guidée — affiche les vraies pages dans un iframe intégré au modal
 */
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, MapPin, X, ExternalLink, Maximize2 } from 'lucide-react';

const TOUR_STEPS = {
  'atlas-fna': [
    { route: '/dashboard', title: 'Dashboard comptable', desc: 'Vue d\'ensemble de votre activité : KPIs temps réel, raccourcis, dernières écritures, alertes.', highlight: 'Le point d\'entrée de votre journée comptable.' },
    { route: '/accounting/entries', title: 'Saisie d\'écritures', desc: 'Créez vos écritures avec contrôle D=C automatique. Multi-lignes, multi-journaux.', highlight: 'Le cœur du système — chaque écriture alimente tout le reste.' },
    { route: '/accounting/general-ledger', title: 'Grand Livre', desc: 'Détail de chaque compte : mouvements, soldes, filtres par période, export.', highlight: 'Zoom sur n\'importe quel compte en un clic.' },
    { route: '/financial-statements/balance', title: 'Bilan SYSCOHADA', desc: 'Bilan actif/passif calculé en temps réel. Drill-down par poste, comparaison N/N-1.', highlight: 'Généré automatiquement — zéro saisie manuelle.' },
    { route: '/financial-statements/income', title: 'Compte de Résultat & SIG', desc: 'Produits vs charges. Soldes intermédiaires de gestion en cascade.', highlight: 'Les 9 niveaux du SIG SYSCOHADA instantanément.' },
    { route: '/reporting/tax', title: 'Reporting Fiscal', desc: 'TVA collectée/déductible, IS, IRPP. Calendrier fiscal, alertes échéances.', highlight: 'Plus jamais de calcul fiscal manuel.' },
    { route: '/treasury/accounts', title: 'Trésorerie', desc: 'Soldes bancaires consolidés, rapprochement, prévisions M+1/M+3/M+6.', highlight: 'Votre trésorerie en un coup d\'œil.' },
    { route: '/closures/periodic', title: 'Clôture de période', desc: 'Processus guidé : vérification → amortissements → verrouillage → résultat → reports.', highlight: 'La clôture mensuelle en 10 minutes.' },
  ],
  'liass-pilot': [
    { route: '/taxation/liasse', title: 'Liasse Fiscale DSF', desc: '22 états annexes pré-remplis automatiquement. Conforme DGI.', highlight: 'La liasse se génère en un clic.' },
    { route: '/taxation/declarations', title: 'Déclarations fiscales', desc: 'Suivi de toutes vos déclarations. Statuts, échéances, historique.', highlight: 'Traçabilité complète.' },
    { route: '/taxation/echeances', title: 'Calendrier fiscal', desc: 'Toutes les échéances. Alertes J-7 et J-1.', highlight: 'Fini les pénalités de retard.' },
  ],
  'doc-journey': [
    { route: '/accounting/ocr', title: 'OCR & Numérisation', desc: 'Scannez factures et contrats. Extraction automatique des données.', highlight: 'De la photo à l\'écriture en 30 secondes.' },
    { route: '/settings/import-export', title: 'Import & Export', desc: 'CSV, Excel, PDF, XML — tous les formats.', highlight: 'Interopérabilité totale.' },
    { route: '/settings/backup', title: 'Archivage sécurisé', desc: 'Conservation légale 10 ans, SHA-256.', highlight: 'Vos données en sécurité.' },
  ],
};

const GuidedTour: React.FC<{ solution: string; onClose: () => void }> = ({ solution, onClose }) => {
  const steps = TOUR_STEPS[solution] || TOUR_STEPS['atlas-fna'];
  const [current, setCurrent] = useState(0);
  const [started, setStarted] = useState(false);

  const step = steps[current];
  const baseUrl = window.location.origin;

  // Avant de lancer, poser le flag demo pour que l'iframe passe le guard
  const start = () => {
    sessionStorage.setItem('atlas-demo-mode', '1');
    setStarted(true);
  };

  const goTo = (idx: number) => {
    if (idx >= 0 && idx < steps.length) setCurrent(idx);
  };

  if (!started) {
    return (
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
          <span className="text-blue-600 text-lg">🎯</span>
          <div className="text-sm text-blue-800">
            <strong>Visite guidée</strong> — Parcourez les vraies interfaces du logiciel étape par étape, directement dans cette fenêtre.
          </div>
        </div>

        <div className="space-y-2">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white">
              <div className="w-8 h-8 bg-[#141414] text-white rounded-lg flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#141414]">{s.title}</p>
                <p className="text-xs text-gray-500 truncate">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center pt-2 border-t">
          <p className="text-xs text-gray-400">{steps.length} pages à explorer</p>
          <button onClick={start} className="px-6 py-2.5 bg-[#141414] text-white rounded-lg text-sm font-semibold hover:bg-[#2a2a2a] flex items-center gap-2">
            <MapPin className="w-4 h-4" /> Démarrer la visite
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0 -mx-5 -mb-5">
      {/* Top bar: step info + navigation */}
      <div className="bg-[#141414] text-white px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <MapPin className="w-4 h-4 text-yellow-400" />
            <span className="text-[10px] text-white/50 font-medium uppercase tracking-wider">Visite</span>
          </div>
          <div className="w-px h-5 bg-white/20"></div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{step.title}</p>
            <p className="text-[10px] text-white/50 truncate">{step.highlight}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Progress dots */}
          <div className="hidden md:flex items-center gap-1">
            {steps.map((_, i) => (
              <button key={i} onClick={() => goTo(i)}
                className={`h-1.5 rounded-full transition-all ${i === current ? 'w-5 bg-yellow-400' : 'w-1.5 bg-white/30 hover:bg-white/50'}`}
              />
            ))}
          </div>

          <span className="text-xs text-white/40 ml-2">{current + 1}/{steps.length}</span>

          <button onClick={() => goTo(current - 1)} disabled={current === 0}
            className={`p-1 rounded ${current === 0 ? 'text-white/20' : 'text-white/70 hover:bg-white/10'}`}>
            <ChevronLeft className="w-4 h-4" />
          </button>

          {current < steps.length - 1 ? (
            <button onClick={() => goTo(current + 1)}
              className="px-3 py-1 bg-yellow-400 text-[#141414] rounded text-xs font-bold hover:bg-yellow-300 flex items-center gap-1">
              Suivant <ChevronRight className="w-3 h-3" />
            </button>
          ) : (
            <button onClick={() => { setStarted(false); setCurrent(0); }}
              className="px-3 py-1 bg-green-500 text-white rounded text-xs font-bold hover:bg-green-400">
              Terminer ✓
            </button>
          )}
        </div>
      </div>

      {/* Iframe showing the real page */}
      <div className="bg-gray-200 relative" style={{ height: '55vh' }}>
        <iframe
          key={step.route}
          src={`${baseUrl}${step.route}`}
          className="w-full h-full border-0"
          title={step.title}
        />
        {/* Description overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <p className="text-white text-sm font-medium">{step.title}</p>
          <p className="text-white/70 text-xs mt-0.5">{step.desc}</p>
        </div>
      </div>
    </div>
  );
};

export default GuidedTour;
