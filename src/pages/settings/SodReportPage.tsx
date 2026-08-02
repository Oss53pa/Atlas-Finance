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
import { listUserRoles, listDerogations, type UserRoleRow, type DerogationRow } from '../../services/param/userRoleService';
import { rbacRoleDelta, effectiveEnforcementEnabled, type RoleDelta } from '../../services/param/rbacBascule';
import { useAuth } from '../../contexts/AuthContext';

const SEV_STYLE: Record<SodSeverite, string> = {
  eleve: 'bg-red-100 text-red-700', moyen: 'bg-amber-100 text-amber-800', faible: 'bg-gray-100 text-gray-600',
};

const SodReportPage: React.FC = () => {
  const navigate = useNavigate();
  const { adapter } = useData();
  const { user } = useAuth();
  const [report, setReport] = useState<SodRoleReport[]>([]);
  const [rules, setRules] = useState<SodRule[]>([]);
  const [userRoles, setUserRoles] = useState<UserRoleRow[]>([]);
  const [derogations, setDerogations] = useState<DerogationRow[]>([]);
  const [delta, setDelta] = useState<RoleDelta | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rep, rl, ur, der, dl] = await Promise.all([
        getSodReport(adapter), listSodRules(adapter), listUserRoles(adapter), listDerogations(adapter),
        user?.id ? rbacRoleDelta(adapter, user.id) : Promise.resolve(null),
      ]);
      setReport(rep); setRules(rl); setUserRoles(ur); setDerogations(der); setDelta(dl);
    } catch (e) { toast.error(`Chargement impossible : ${(e as Error).message}`); }
    finally { setLoading(false); }
  }, [adapter, user?.id]);
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

      {/* Bascule RBAC phase 3 — état de préparation (observation) */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 text-sm font-semibold text-gray-800 flex items-center justify-between gap-2">
          <span>Bascule RBAC (rôle unique → modèle multi-rôles)</span>
          <span className={`px-2 py-0.5 rounded text-xs ${effectiveEnforcementEnabled() ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
            enforcement : {effectiveEnforcementEnabled() ? 'effectif' : 'legacy (défaut)'}
          </span>
        </div>
        <div className="p-3 text-sm">
          {!delta ? (
            <p className="text-gray-400 text-xs">Observation indisponible (hors-ligne ou aucun rôle effectif).</p>
          ) : (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <div><span className="text-gray-500 text-xs">Rôle legacy : </span><span className="font-mono">{delta.legacy ?? '∅'}</span></div>
              <div><span className="text-gray-500 text-xs">Effectifs : </span><span className="font-mono">{delta.effective.length ? delta.effective.join(', ') : '∅'}</span></div>
              {delta.aligned
                ? <span className="px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs inline-flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" />aligné — aucun verrouillage à la bascule</span>
                : <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs inline-flex items-center gap-1"><ShieldAlert className="w-3.5 h-3.5" />perdrait : {delta.perd.join(', ')}</span>}
              {delta.gagne.length > 0 && <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-xs">gagnerait : {delta.gagne.join(', ')}</span>}
            </div>
          )}
          <p className="text-[11px] text-gray-400 mt-2">Basculer via <code>VITE_RBAC_SOURCE=effective</code> (déploiement + rollback tracés) — uniquement après « écart nul » observé sur l'ensemble des utilisateurs.</p>
        </div>
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
      {/* Rôles utilisateurs (modèle user_role) + dérogations SoD */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 text-sm font-semibold text-gray-800">Rôles utilisateurs ({userRoles.length})</div>
          <table className="w-full text-sm">
            <tbody>
              {userRoles.length === 0 && <tr><td className="px-3 py-3 text-gray-400 text-xs">Aucune affectation.</td></tr>}
              {userRoles.slice(0, 20).map(u => (
                <tr key={u.id} className="border-b border-gray-100">
                  <td className="px-3 py-1.5 font-mono text-[11px] text-gray-500">{u.user_id.slice(0, 8)}…</td>
                  <td className="px-3 py-1.5 text-gray-800">{u.role_code}{u.delegue_de && <span className="ml-1 text-[10px] text-indigo-600">délégué</span>}</td>
                  <td className="px-3 py-1.5 text-right text-[11px] text-gray-400">{u.valide_au ? `→ ${u.valide_au}` : 'permanent'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 text-sm font-semibold text-gray-800">Dérogations SoD ({derogations.length})</div>
          <table className="w-full text-sm">
            <tbody>
              {derogations.length === 0 && <tr><td className="px-3 py-3 text-gray-400 text-xs">Aucune dérogation.</td></tr>}
              {derogations.map((d, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="px-3 py-1.5 font-mono text-[11px] text-gray-500">{d.permission_a} + {d.permission_b}</td>
                  <td className="px-3 py-1.5 text-gray-700 text-xs">{d.motif}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-gray-500">Le blocage SoD est <b>effectif côté serveur à l'affectation</b> (fonction souveraine <code>assign_user_role</code> : refus sauf dérogation motivée tracée). L'enforcement des permissions par le socle <code>user_role</code> reste en lecture parallèle — la bascule du RBACGuard interviendra après une période d'observation à écart nul avec <code>profiles.role</code>.</p>
    </div>
  );
};

export default SodReportPage;
