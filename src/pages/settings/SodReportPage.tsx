/**
 * Rapport de séparation des tâches (SoD) (CDC Paramètres §13, critère #4).
 *
 * Liste les rôles qui cumulent des permissions en conflit + la matrice de
 * conflits livrée. Lecture seule (n'altère pas l'enforcement d'autorisation).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ArrowLeft, RefreshCw, ShieldAlert, ShieldCheck, Grid3x3 } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { getSodReport, listSodRules, type SodRoleReport, type SodRule, type SodSeverite } from '../../services/param/sodService';

const SEV_STYLE: Record<SodSeverite, string> = {
  eleve: 'bg-red-100 text-red-700', moyen: 'bg-amber-100 text-amber-800', faible: 'bg-gray-100 text-gray-600',
};

const SodReportPage: React.FC = () => {
  const navigate = useNavigate();
  const { adapter } = useData();
  const [report, setReport] = useState<SodRoleReport[]>([]);
  const [rules, setRules] = useState<SodRule[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rep, rl] = await Promise.all([getSodReport(adapter), listSodRules(adapter)]);
      setReport(rep); setRules(rl);
    } catch (e) { toast.error(`Chargement impossible : ${(e as Error).message}`); }
    finally { setLoading(false); }
  }, [adapter]);
  useEffect(() => { void load(); }, [load]);

  const rolesEnConflit = report.filter(r => r.violations.length > 0);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100"><ArrowLeft className="w-5 h-5" /></button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-[var(--color-primary)]" /> Séparation des tâches (SoD)</h1>
            <p className="text-sm text-gray-600">Rôles cumulant des permissions en conflit · matrice livrée</p>
          </div>
        </div>
        <button onClick={() => void load()} className="px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 flex items-center gap-2 text-sm"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Recharger</button>
      </div>

      {/* Synthèse */}
      {!loading && (
        report.length === 0
          ? <div className="p-3 rounded-lg border border-amber-300 bg-amber-50 text-sm text-amber-800 flex items-center justify-between flex-wrap gap-2">
              <span>Aucun rôle configuré à analyser. Définissez des rôles et leurs permissions pour activer le contrôle SoD.</span>
              <button onClick={() => navigate('/security/roles')} className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs">Gérer les rôles</button>
            </div>
          : rolesEnConflit.length === 0
            ? <div className="p-3 rounded-lg border border-green-300 bg-green-50 text-sm text-green-800 flex items-center gap-2"><ShieldCheck className="w-5 h-5" />Aucun rôle ne cumule de permissions en conflit.</div>
            : <div className="p-3 rounded-lg border border-red-300 bg-red-50 text-sm text-red-800 flex items-center gap-2"><ShieldAlert className="w-5 h-5" /><b>{rolesEnConflit.length}</b> rôle(s) en conflit de séparation des tâches.</div>
      )}

      {/* Rapport par rôle */}
      <div className="border border-gray-200 rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200"><tr>
            <th className="text-left px-3 py-2 font-medium text-gray-700">Rôle</th>
            <th className="text-center px-3 py-2 font-medium text-gray-700">Utilisateurs</th>
            <th className="text-center px-3 py-2 font-medium text-gray-700">Permissions</th>
            <th className="text-left px-3 py-2 font-medium text-gray-700">Conflits SoD</th>
          </tr></thead>
          <tbody>
            {loading && <tr><td colSpan={4} className="px-3 py-8 text-center text-gray-500">Chargement…</td></tr>}
            {!loading && report.length === 0 && <tr><td colSpan={4} className="px-3 py-8 text-center text-gray-500">Aucun rôle.</td></tr>}
            {!loading && report.map(r => (
              <tr key={r.role_id} className={`border-b border-gray-100 ${r.violations.length ? 'bg-red-50/40' : 'hover:bg-gray-50'}`}>
                <td className="px-3 py-2 font-medium text-gray-800">{r.role_name}</td>
                <td className="px-3 py-2 text-center text-gray-600">{r.nb_users}</td>
                <td className="px-3 py-2 text-center text-gray-500">{r.permissions.length}</td>
                <td className="px-3 py-2">
                  {r.violations.length === 0 ? <span className="text-green-600 text-xs inline-flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" />conforme</span> : (
                    <div className="flex flex-col gap-1">
                      {r.violations.map((v, i) => (
                        <span key={i} className="text-xs">
                          <span className={`px-1.5 py-0.5 rounded ${SEV_STYLE[v.severite]}`}>{v.severite}</span>{' '}
                          <span className="font-mono text-gray-500">{v.permission_a}</span> + <span className="font-mono text-gray-500">{v.permission_b}</span>
                          {v.libelle && <span className="text-gray-400"> — {v.libelle}</span>}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Matrice de conflits livrée */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-2 text-sm font-semibold text-gray-800"><Grid3x3 className="w-4 h-4" />Matrice de conflits ({rules.length})</div>
        <table className="w-full text-sm">
          <tbody>
            {rules.map((r, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="px-3 py-1.5"><span className={`px-1.5 py-0.5 rounded text-xs ${SEV_STYLE[r.severite]}`}>{r.severite}</span></td>
                <td className="px-3 py-1.5 font-mono text-xs text-gray-600">{r.permission_a} ⇎ {r.permission_b}</td>
                <td className="px-3 py-1.5 text-gray-600 text-xs">{r.libelle}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500">Analyse en lecture seule sur les rôles relationnels. Le blocage effectif à l'affectation et les dérogations tracées arrivent en vague suivante (nécessite la refonte de l'attribution des rôles).</p>
    </div>
  );
};

export default SodReportPage;
