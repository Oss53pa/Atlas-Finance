/**
 * RevenusPickerPage — /budget/revenus (refonte OPEX/CAPEX, Lot 4, §14).
 * Sélection du centre de profit pour saisir le budget des revenus (classe 7).
 * La grille (/budget/revenus/:sectionId) réutilise BudgetMatrixGridPage en mode revenus.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { listOrgTree, type SectionOrgNode } from '../../features/budget/services/sectionGovernanceService';
import { TrendingUp, Loader2, ArrowRight, Sparkles } from 'lucide-react';

const RevenusPickerPage: React.FC = () => {
  const { adapter } = useData();
  const navigate = useNavigate();
  const [sections, setSections] = useState<SectionOrgNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try { const t = await listOrgTree(adapter); if (!cancelled) setSections(t); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [adapter]);

  // centres de profit prioritaires, sinon toutes les sections
  const profit = useMemo(() => {
    const cp = sections.filter((s) => s.type_axe === 'centre_profit');
    return cp.length ? cp : sections;
  }, [sections]);

  return (
    <div className="p-6 space-y-5">
      <header>
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white flex items-center gap-2"><TrendingUp className="w-6 h-6 text-[#235A6E]" /> Budget des revenus</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Classe 7 par centre de profit · alimente le compte de résultat budgétaire.</p>
      </header>

      {loading ? (
        <div className="flex items-center gap-2 text-neutral-500 py-12 justify-center"><Loader2 className="w-5 h-5 animate-spin" /> Chargement…</div>
      ) : profit.length === 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 px-6 py-10 text-center text-sm text-amber-700 dark:text-amber-300">
          <Sparkles className="w-6 h-6 mx-auto mb-2" />
          Aucun centre de profit. Initialisez l'organisation analytique depuis le hub.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {profit.map((s) => (
            <button key={s.id} onClick={() => navigate(`/budget/revenus/${s.id}`)}
              className="text-left bg-white dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-4 hover:border-[#235A6E] hover:shadow-md transition flex items-center justify-between">
              <div>
                <div className="font-mono text-sm text-neutral-900 dark:text-white">{s.code}</div>
                <div className="text-xs text-neutral-500">{s.libelle}</div>
              </div>
              <ArrowRight className="w-4 h-4 text-neutral-300" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default RevenusPickerPage;
