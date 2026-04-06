
/**
 * GuidedTourOverlay — Bandeau fixe en bas pendant la visite guidée
 * Lit sessionStorage('atlas-guided-tour') pour savoir l'étape courante
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X, MapPin } from 'lucide-react';

const ALL_STEPS: Record<string, Array<{ route: string; title: string; highlight: string }>> = {
  'atlas-fna': [
    { route: '/dashboard', title: 'Dashboard', highlight: 'Vue d\'ensemble KPIs et raccourcis' },
    { route: '/accounting/entries', title: 'Écritures', highlight: 'Saisie avec contrôle D=C automatique' },
    { route: '/accounting/general-ledger', title: 'Grand Livre', highlight: 'Détail par compte et période' },
    { route: '/financial-statements/balance', title: 'Bilan', highlight: 'Actif/Passif en temps réel' },
    { route: '/financial-statements/income', title: 'Résultat & SIG', highlight: 'Les 9 niveaux du SIG' },
    { route: '/reporting/tax', title: 'Fiscalité', highlight: 'TVA, IS, IRPP automatiques' },
    { route: '/treasury/accounts', title: 'Trésorerie', highlight: 'Soldes et prévisions' },
    { route: '/closures/periodic', title: 'Clôture', highlight: 'Processus guidé en 6 étapes' },
  ],
  'liass-pilot': [
    { route: '/taxation/liasse', title: 'Liasse DSF', highlight: '22 annexes pré-remplies' },
    { route: '/taxation/declarations', title: 'Déclarations', highlight: 'Suivi et historique' },
    { route: '/taxation/echeances', title: 'Échéances', highlight: 'Calendrier fiscal avec alertes' },
  ],
  'doc-journey': [
    { route: '/accounting/ocr', title: 'OCR', highlight: 'Scan et extraction automatique' },
    { route: '/settings/import-export', title: 'Import/Export', highlight: 'Tous formats supportés' },
    { route: '/settings/backup', title: 'Archivage', highlight: 'Conservation légale 10 ans' },
  ],
};

const GuidedTourOverlay: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [tourData, setTourData] = useState<{ solution: string; step: number; total: number } | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('atlas-guided-tour');
    if (raw) {
      try { setTourData(JSON.parse(raw)); } catch (err) { /* silent */ setTourData(null); }
    } else {
      setTourData(null);
    }
  }, [location.pathname]);

  if (!tourData) return null;

  const steps = ALL_STEPS[tourData.solution] || ALL_STEPS['atlas-fna'];
  const currentIdx = steps.findIndex(s => location.pathname.startsWith(s.route));
  const current = currentIdx >= 0 ? currentIdx : tourData.step;
  const step = steps[current];
  if (!step) return null;

  const goTo = (idx: number) => {
    if (idx < 0 || idx >= steps.length) return;
    sessionStorage.setItem('atlas-guided-tour', JSON.stringify({ ...tourData, step: idx }));
    navigate(steps[idx].route);
  };

  const endTour = () => {
    sessionStorage.removeItem('atlas-guided-tour');
    setTourData(null);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#141414] text-white shadow-2xl border-t border-white/10">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Left: step info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4 text-yellow-400 shrink-0" />
            <span className="text-xs text-white/50 font-medium">VISITE GUIDÉE</span>
          </div>
          <div className="w-px h-6 bg-white/20"></div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{step.title}</p>
            <p className="text-xs text-white/50 truncate">{step.highlight}</p>
          </div>
        </div>

        {/* Center: progress dots */}
        <div className="hidden md:flex items-center gap-1.5">
          {steps.map((s, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`h-2 rounded-full transition-all ${i === current ? 'w-6 bg-yellow-400' : 'w-2 bg-white/30 hover:bg-white/50'}`}
              title={s.title}
            />
          ))}
        </div>

        {/* Right: nav + close */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-white/40">{current + 1}/{steps.length}</span>
          <button onClick={() => goTo(current - 1)} disabled={current === 0}
            className={`p-1.5 rounded-lg ${current === 0 ? 'text-white/20' : 'text-white/70 hover:bg-white/10'}`}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          {current < steps.length - 1 ? (
            <button onClick={() => goTo(current + 1)}
              className="px-3 py-1.5 bg-yellow-400 text-[#141414] rounded-lg text-xs font-bold hover:bg-yellow-300 flex items-center gap-1">
              Suivant <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button onClick={endTour}
              className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-bold hover:bg-green-400">
              Terminer ✓
            </button>
          )}
          <button onClick={endTour} className="p-1.5 text-white/40 hover:text-white/70 hover:bg-white/10 rounded-lg" title="Quitter la visite">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuidedTourOverlay;
