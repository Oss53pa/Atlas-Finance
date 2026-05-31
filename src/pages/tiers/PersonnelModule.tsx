/**
 * PersonnelModule — Gestion du personnel (comptes 421-425 SYSCOHADA)
 */
import React, { useState, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { Users, Search, Eye, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Personnel {
  id: string;
  code: string;
  name: string;
  type: string;
  is_active: boolean;
  email?: string;
  phone?: string;
}

const PersonnelModule: React.FC = () => {
  const { adapter } = useData();
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const all = await adapter.getAll<any>('thirdParties');
        // Personnel = type 'employee' OU code 42x/43x importés
        const perso = all.filter((tp: any) =>
          tp.type === 'employee' ||
          /^4[23]/.test(tp.code || '')
        );
        setPersonnel(perso.map((tp: any) => ({
          id: tp.id,
          code: tp.code || '',
          name: tp.name || tp.raisonSociale || '',
          type: tp.type || 'employee',
          is_active: tp.is_active ?? tp.isActive ?? true,
          email: tp.email || '',
          phone: tp.phone || '',
        })));
      } catch { setPersonnel([]); }
      finally { setLoading(false); }
    };
    load();
  }, [adapter]);

  const filtered = personnel.filter(p =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.code.includes(search)
  );

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-blue-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Personnel</h1>
            <p className="text-sm text-gray-500">Comptes 421–425 SYSCOHADA — {personnel.length} enregistrement(s)</p>
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par nom ou code..."
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Chargement...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Aucun membre du personnel trouvé</p>
          <p className="text-xs mt-1">Les comptes 421–425 importés apparaîtront ici</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Code', 'Nom', 'Type', 'Compte', 'Statut', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-medium text-blue-700">{p.code}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">
                      {p.type === 'employee' ? 'Personnel' : p.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-600">{p.code.substring(0, 3)}xxx</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {p.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button className="p-1 text-gray-400 hover:text-blue-600" title="Voir détail">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-1 text-gray-400 hover:text-green-600" title="Modifier">
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
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
