// @ts-nocheck
/**
 * Visite guidée — navigue dans les vraies pages avec overlay explicatif
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, ChevronLeft, ChevronRight, X, ExternalLink } from 'lucide-react';

const TOUR_STEPS = {
  'atlas-finance': [
    { route: '/dashboard', title: 'Dashboard comptable', desc: 'Vue d\'ensemble de votre activité : KPIs en temps réel, raccourcis vers les modules, dernières écritures, alertes.', highlight: 'Le point d\'entrée de votre journée comptable.' },
    { route: '/accounting/entries', title: 'Saisie d\'écritures', desc: 'Créez vos écritures comptables avec contrôle débit = crédit automatique. Multi-lignes, multi-journaux (AC, VE, BQ, CA, OD).', highlight: 'Le cœur du système — chaque écriture alimente tout le reste.' },
    { route: '/accounting/general-ledger', title: 'Grand Livre', desc: 'Consultez le détail de chaque compte : mouvements, soldes, filtres par période, par tiers, export Excel/PDF.', highlight: 'Zoom sur n\'importe quel compte en un clic.' },
    { route: '/financial-statements/balance', title: 'Bilan SYSCOHADA', desc: 'Bilan actif/passif calculé en temps réel depuis vos écritures. Drill-down par poste, comparaison N/N-1.', highlight: 'Généré automatiquement — zéro saisie manuelle.' },
    { route: '/financial-statements/income', title: 'Compte de Résultat & SIG', desc: 'Produits (classe 7) vs charges (classe 6). Soldes intermédiaires de gestion : marge commerciale → résultat net.', highlight: 'Les 9 niveaux du SIG SYSCOHADA calculés instantanément.' },
    { route: '/reporting/tax', title: 'Reporting Fiscal', desc: 'TVA collectée/déductible, IS, IRPP. Calendrier fiscal avec échéances par pays. Calcul automatique depuis les écritures.', highlight: 'Plus jamais de calcul manuel — la TVA se calcule toute seule.' },
    { route: '/treasury/accounts', title: 'Trésorerie', desc: 'Soldes bancaires consolidés, rapprochement automatique, prévisions à M+1/M+3/M+6.', highlight: 'Votre trésorerie en un coup d\'œil.' },
    { route: '/closures/periodic', title: 'Clôture de période', desc: 'Processus guidé en 6 étapes : vérification → amortissements → verrouillage → résultat → reports → finalisation.', highlight: 'La clôture mensuelle en 10 minutes au lieu de 2 jours.' },
  ],
  'liass-pilot': [
    { route: '/taxation/liasse', title: 'Liasse Fiscale DSF', desc: '22 états annexes pré-remplis automatiquement depuis vos données comptables. Conforme au format DGI.', highlight: 'La liasse se génère en un clic.' },
    { route: '/taxation/declarations', title: 'Déclarations fiscales', desc: 'Suivi de toutes vos déclarations : TVA, IS, IRPP. Statuts, échéances, historique complet.', highlight: 'Traçabilité complète de vos obligations fiscales.' },
    { route: '/taxation/echeances', title: 'Calendrier fiscal', desc: 'Toutes les échéances fiscales de votre pays. Alertes J-7 et J-1 pour ne jamais rater une date limite.', highlight: 'Fini les pénalités de retard.' },
  ],
  'doc-journey': [
    { route: '/accounting/ocr', title: 'OCR & Numérisation', desc: 'Scannez vos factures, reçus, contrats. L\'OCR extrait automatiquement les montants, dates, fournisseurs.', highlight: 'De la photo à l\'écriture comptable en 30 secondes.' },
    { route: '/settings/import-export', title: 'Import & Export', desc: 'Importez et exportez vos données dans tous les formats : CSV, Excel, PDF, XML.', highlight: 'Interopérabilité totale avec vos outils existants.' },
    { route: '/settings/backup', title: 'Archivage sécurisé', desc: 'Sauvegarde automatique, archivage légal 10 ans, piste d\'audit SHA-256 inaltérable.', highlight: 'Vos données sont en sécurité — toujours.' },
  ],
};

const GuidedTour: React.FC<{ solution: string; onClose: () => void }> = ({ solution, onClose }) => {
  const navigate = useNavigate();
  const steps = TOUR_STEPS[solution] || TOUR_STEPS['atlas-finance'];
  const [current, setCurrent] = useState(0);
  const [launched, setLaunched] = useState(false);

  const step = steps[current];

  const launch = () => {
    setLaunched(true);
    sessionStorage.setItem('atlas-demo-mode', '1');
    sessionStorage.setItem('atlas-guided-tour', JSON.stringify({ solution, step: 0, total: steps.length }));
    navigate(step.route);
    onClose();
  };

  const goStep = (idx: number) => {
    setCurrent(idx);
  };

  const launchStep = (idx: number) => {
    sessionStorage.setItem('atlas-demo-mode', '1');
    sessionStorage.setItem('atlas-guided-tour', JSON.stringify({ solution, step: idx, total: steps.length }));
    navigate(steps[idx].route);
    onClose();
  };

  return (
    <div className="space-y-4">
      {/* Intro */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
        <span className="text-blue-600 text-lg">🎯</span>
        <div className="text-sm text-blue-800">
          <strong>Visite guidée</strong> — Chaque étape vous emmène dans la vraie interface du logiciel. Cliquez sur "Lancer" pour commencer.
        </div>
      </div>

      {/* Steps list */}
      <div className="space-y-2">
        {steps.map((s, i) => (
          <button
            key={i}
            onClick={() => goStep(i)}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
              i === current ? 'border-[#141414] bg-gray-50 shadow-sm' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
              i === current ? 'bg-[#141414] text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-[#141414]">{s.title}</h4>
                <span className="text-[10px] text-gray-400 font-mono">{s.route}</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{s.desc}</p>
              {i === current && (
                <p className="text-xs text-blue-600 font-medium mt-1.5 italic">💡 {s.highlight}</p>
              )}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); launchStep(i); }}
              className="px-3 py-1.5 bg-[#141414] text-white rounded-lg text-xs font-medium hover:bg-[#2a2a2a] flex items-center gap-1 shrink-0"
            >
              Ouvrir <ExternalLink className="w-3 h-3" />
            </button>
          </button>
        ))}
      </div>

      {/* Launch all */}
      <div className="flex items-center justify-between pt-2 border-t">
        <p className="text-xs text-gray-400">{steps.length} pages à explorer</p>
        <button
          onClick={launch}
          className="px-6 py-2.5 bg-[#141414] text-white rounded-lg text-sm font-semibold hover:bg-[#2a2a2a] flex items-center gap-2"
        >
          <Play className="w-4 h-4" /> Lancer la visite complète
        </button>
      </div>
    </div>
  );
};

export default GuidedTour;
