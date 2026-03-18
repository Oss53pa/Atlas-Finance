// @ts-nocheck
import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Activity, Filter, Calendar, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { getAuditLogs } from '../../features/platform/services/auditService';

const ACTION_LABELS: Record<string, string> = {
  USER_LOGIN: 'Connexion', USER_LOGOUT: 'Déconnexion', USER_INVITED: 'Invitation envoyée',
  USER_ROLE_CHANGED: 'Rôle modifié', USER_SUSPENDED: 'Utilisateur suspendu',
  SUBSCRIPTION_CREATED: 'Abonnement créé', SUBSCRIPTION_ACTIVATED: 'Abonnement activé',
  PAYMENT_CONFIRMED: 'Paiement confirmé', PAYMENT_FAILED: 'Paiement échoué',
  TENANT_UPDATED: 'Organisation modifiée',
  ENTRY_CREATED: 'Écriture créée', ENTRY_VALIDATED: 'Écriture validée', ENTRY_POSTED: 'Écriture comptabilisée',
  CLOSURE_STARTED: 'Clôture démarrée', CLOSURE_COMPLETED: 'Clôture terminée',
  REPORT_EXPORTED: 'Rapport exporté', FEC_EXPORTED: 'FEC exporté',
  MODULE_ENABLED: 'Module activé', MODULE_DISABLED: 'Module désactivé',
};

const ClientAuditTrail: React.FC = () => {
  const { tenant } = useOutletContext<any>();
  const [page, setPage] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const [search, setSearch] = useState('');
  const limit = 30;

  const { data, isLoading } = useQuery({
    queryKey: ['audit-trail', tenant?.id, page, actionFilter],
    queryFn: () => getAuditLogs(tenant.id, {
      action: actionFilter || undefined,
      limit,
      offset: page * limit,
    }),
    enabled: !!tenant?.id,
  });

  const logs = data?.logs || [];
  const total = data?.total || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#171717]">Piste d'audit</h1>
        <p className="text-sm text-gray-500 mt-1">Historique complet des actions — {total} événement(s)</p>
      </div>

      {/* Filtres */}
      <div className="flex gap-3 flex-wrap">
        <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(0); }}
          className="border rounded-xl px-4 py-2.5 text-sm">
          <option value="">Toutes les actions</option>
          {Object.entries(ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="max-h-[600px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b sticky top-0">
              <tr>
                {['Action', 'Ressource', 'Détails', 'Date'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400">Chargement...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400">Aucun événement</td></tr>
              ) : logs.map((log: any) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <span className="text-xs px-2 py-1 bg-gray-100 rounded-full font-medium text-gray-700">
                      {ACTION_LABELS[log.action] || log.action}
                    </span>
                    {log.impersonated_by && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full">IMPERSONATION</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{log.resource_type || '—'}</td>
                  <td className="px-5 py-3 text-xs text-gray-400 font-mono truncate max-w-[250px]">
                    {log.metadata && Object.keys(log.metadata).length > 0 ? JSON.stringify(log.metadata) : '—'}
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-400 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString('fr-FR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > limit && (
          <div className="px-5 py-3 border-t bg-gray-50 flex items-center justify-between">
            <span className="text-xs text-gray-500">{page * limit + 1}–{Math.min((page + 1) * limit, total)} sur {total}</span>
            <div className="flex gap-2">
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 border rounded-lg text-xs disabled:opacity-50 flex items-center gap-1">
                <ChevronLeft className="w-3.5 h-3.5" /> Précédent
              </button>
              <button disabled={(page + 1) * limit >= total} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 border rounded-lg text-xs disabled:opacity-50 flex items-center gap-1">
                Suivant <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientAuditTrail;
