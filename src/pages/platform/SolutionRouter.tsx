// @ts-nocheck
/**
 * SolutionRouter — dispatche vers la bonne application selon le code solution.
 * atlas-finance → workspace Atlas Finance
 * liass-pilot, docjourney → page placeholder (à implémenter)
 */
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calculator, FileText, FolderOpen, ArrowLeft, Construction } from 'lucide-react';

const SOLUTIONS: Record<string, { name: string; icon: any; color: string; workspacePath?: string }> = {
  'atlas-finance': { name: 'Atlas Finance', icon: Calculator, color: '#171717', workspacePath: '/workspace/admin' },
  'liass-pilot':   { name: "Liass'Pilot",   icon: FileText,   color: '#0891b2' },
  'docjourney':    { name: 'DocJourney',     icon: FolderOpen, color: '#7c3aed' },
};

const SolutionRouter: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const sol = code ? SOLUTIONS[code] : null;

  // Atlas Finance → redirige vers le workspace existant
  React.useEffect(() => {
    if (sol?.workspacePath) {
      navigate(sol.workspacePath, { replace: true });
    }
  }, [sol, navigate]);

  if (!sol) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Construction className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-[#171717] mb-2">Solution non trouvée</h2>
          <p className="text-sm text-gray-500 mb-4">Le code "{code}" ne correspond à aucune solution.</p>
          <button onClick={() => navigate('/client')} className="px-5 py-2.5 bg-[#171717] text-white rounded-lg text-sm font-semibold">
            Retour au dashboard
          </button>
        </div>
      </div>
    );
  }

  // Si pas de workspacePath → page placeholder
  if (!sol.workspacePath) {
    const Icon = sol.icon;
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: sol.color + '15' }}>
            <Icon className="w-8 h-8" style={{ color: sol.color }} />
          </div>
          <h2 className="text-xl font-bold text-[#171717] mb-2">{sol.name}</h2>
          <p className="text-gray-500 text-sm mb-6">
            Cette application est en cours de développement. Vous serez notifié dès qu'elle sera disponible.
          </p>
          <button onClick={() => navigate('/client')} className="px-5 py-2.5 border rounded-lg text-sm font-semibold hover:bg-gray-50 flex items-center gap-2 mx-auto">
            <ArrowLeft className="w-4 h-4" /> Retour au dashboard
          </button>
        </div>
      </div>
    );
  }

  return null; // redirect handled by useEffect
};

export default SolutionRouter;
