/**
 * AutresTiersModule — Organismes sociaux, État, Autres débiteurs/créditeurs
 * Comptes 43x, 44x, 46x, 47x SYSCOHADA
 */
import React, { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { Database, Search, Eye } from 'lucide-react';

interface AutreTiers {
  id: string;
  code: string;
  name: string;
  type: string;
  is_active: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  social_org: 'Org. social',
  state: 'État / Impôts',
  other: 'Autre tiers',
  both: 'Mixte',
};

const CLASS_LABELS: Record<string, string> = {
  '43': 'Organismes sociaux (43x)',
  '44': 'État & Impôts (44x)',
  '46': 'Associés / Débiteurs divers (46x)',
  '47': 'Créditeurs divers (47x)',
};

const PersonnelModule: React.FC = () => {
  const { adapter } = useData();
  const [tiers, setTiers] = useState<AutreTiers[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const all = await adapter.getAll<any>('thirdParties');
        const autres = all.filter((tp: any) =>
          ['social_org', 'state', 'other'].includes(tp.type) ||
          /^4[34567]/.test(tp.code || '')
        );
        setTiers(autres.map((tp: any) => ({
          id: tp.id,
          code: tp.code || '',
          name: tp.name || tp.raisonSociale || '',
          type: tp.type || 'other',
          is_active: tp.is_active ?? tp.isActive ?? true,
        })));
      } catch { setTiers([]); }
      finally { setLoading(false); }
    };
    load();
  }, [adapter]);

  const filtered = tiers.filter(t =>
    !search ||
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.code.includes(search)
  );

  const classPrefix = (code: string) => code.substring(0, 2);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Database className="w-6 h-6 text-purple-600" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">Autres Tiers</h1>
          <p className="text-sm text-gray-500">Org. sociaux (43x), État (44x), Divers (46x-47x) — {tiers.length} enregistrement(s)</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(CLASS_LABELS).map(([prefix, label]) => {
          const count = tiers.filter(t => classPrefix(t.code) === prefix).length;
          return (
            <div key={prefix} className="bg-white border border-gray-200 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-purple-700">{count}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          );
        })}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher..."
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Chargement...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Database className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Aucun tiers trouvé dans cette catégorie</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Code', 'Nom', 'Catégorie', 'Statut', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-medium text-purple-700">{t.code}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{t.name}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700">
                      {TYPE_LABELS[t.type] || CLASS_LABELS[classPrefix(t.code)] || t.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${t.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {t.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button className="p-1 text-gray-400 hover:text-purple-600">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PersonnelModule;
