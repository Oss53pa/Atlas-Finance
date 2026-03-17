// @ts-nocheck
import React, { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Users, Search, Filter, ChevronRight, Building, Globe, Calendar } from 'lucide-react';
import { getTenantsAdmin } from '../../features/platform/services/adminService';

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  trial: 'bg-orange-100 text-orange-700',
  suspended: 'bg-red-100 text-red-700',
  churned: 'bg-gray-100 text-gray-500',
};

const AdminTenantsPage: React.FC = () => {
  const navigate = useNavigate();
  const { search: globalSearch } = useOutletContext<any>();
  const [statusFilter, setStatusFilter] = useState('all');
  const [localSearch, setLocalSearch] = useState('');
  const [page, setPage] = useState(0);

  const searchTerm = globalSearch || localSearch;

  const { data, isLoading } = useQuery({
    queryKey: ['admin-tenants', statusFilter, searchTerm, page],
    queryFn: () => getTenantsAdmin({ status: statusFilter, search: searchTerm, page }),
  });

  const tenants = data?.tenants || [];
  const total = data?.total || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#0f172a]">Tenants</h1>
          <p className="text-sm text-gray-500">{total} organisation(s)</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={localSearch} onChange={e => { setLocalSearch(e.target.value); setPage(0); }}
            placeholder="Rechercher..." className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm" />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
          className="border rounded-lg px-3 py-2 text-sm">
          <option value="all">Tous les statuts</option>
          <option value="active">Actif</option>
          <option value="trial">Essai</option>
          <option value="suspended">Suspendu</option>
          <option value="churned">Churné</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['Organisation', 'Pays', 'Statut', 'Membres', 'Créé le', ''].map(h => (
                <th key={h} className="px-5 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">Chargement...</td></tr>
            ) : tenants.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">Aucun tenant trouvé</td></tr>
            ) : tenants.map((t: any) => (
              <tr key={t.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/admin-console/tenants/${t.id}`)}>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#0f172a] flex items-center justify-center text-white text-xs font-bold">
                      {(t.name || '?')[0]}
                    </div>
                    <div>
                      <div className="font-medium text-[#0f172a]">{t.name}</div>
                      <div className="text-xs text-gray-400">{t.billing_email || t.slug}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-gray-600">{t.country || '—'}</td>
                <td className="px-5 py-4">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_BADGE[t.status] || 'bg-gray-100 text-gray-500'}`}>
                    {t.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-gray-600">{t.user_profiles?.[0]?.count || '—'}</td>
                <td className="px-5 py-4 text-xs text-gray-400">{new Date(t.created_at).toLocaleDateString('fr-FR')}</td>
                <td className="px-5 py-4"><ChevronRight className="w-4 h-4 text-gray-300" /></td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {total > 20 && (
          <div className="px-5 py-3 border-t bg-gray-50 flex items-center justify-between">
            <span className="text-xs text-gray-500">{page * 20 + 1}–{Math.min((page + 1) * 20, total)} sur {total}</span>
            <div className="flex gap-2">
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 border rounded text-xs disabled:opacity-50">Précédent</button>
              <button disabled={(page + 1) * 20 >= total} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 border rounded text-xs disabled:opacity-50">Suivant</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminTenantsPage;
