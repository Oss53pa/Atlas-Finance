// @ts-nocheck

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DollarSign, Save, ToggleLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

const AdminPricingPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});

  const { data: solutions = [], isLoading } = useQuery({
    queryKey: ['admin-solutions'],
    queryFn: async () => { const { data } = await supabase.from('solutions').select('*').order('display_order'); return data || []; },
  });

  const saveMut = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await supabase.from('solutions').update(updates).eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-solutions'] }); setEditing(null); toast.success('Tarif mis à jour'); },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('solutions').update({ is_active: !current }).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['admin-solutions'] });
    toast.success(!current ? 'Solution activée' : 'Solution désactivée');
  };

  const fmt = (n: number) => (n || 0).toLocaleString('fr-FR');

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-[#0f172a]">Configuration des tarifs</h1>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>{['Solution', 'Mensuel XOF', 'Annuel XOF', 'Mensuel EUR', 'Annuel EUR', 'Actif', 'Actions'].map(h =>
              <th key={h} className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
            )}</tr>
          </thead>
          <tbody className="divide-y">
            {solutions.map((sol: any) => {
              const isEdit = editing === sol.id;
              const d = isEdit ? editData : sol;
              return (
                <tr key={sol.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="font-medium text-[#0f172a]">{sol.name}</div>
                    <div className="text-xs text-gray-400">{sol.code}</div>
                  </td>
                  {['price_monthly_xof', 'price_yearly_xof', 'price_monthly_eur', 'price_yearly_eur'].map(field => (
                    <td key={field} className="px-5 py-3">
                      {isEdit ? (
                        <input type="number" value={d[field] || 0} onChange={e => setEditData((p: any) => ({ ...p, [field]: Number(e.target.value) }))}
                          className="w-24 border rounded px-2 py-1 text-sm" />
                      ) : (
                        <span className="font-medium">{fmt(sol[field])}</span>
                      )}
                    </td>
                  ))}
                  <td className="px-5 py-3">
                    <button onClick={() => toggleActive(sol.id, sol.is_active)}
                      className={`w-10 h-6 rounded-full transition-colors ${sol.is_active ? 'bg-green-500' : 'bg-gray-200'}`}>
                      <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${sol.is_active ? 'translate-x-5' : 'translate-x-1'}`} />
                    </button>
                  </td>
                  <td className="px-5 py-3">
                    {isEdit ? (
                      <div className="flex gap-1">
                        <button onClick={() => saveMut.mutate({ id: sol.id, ...editData })}
                          className="text-xs text-green-700 font-semibold hover:underline">Sauver</button>
                        <button onClick={() => setEditing(null)} className="text-xs text-gray-500 hover:underline">Annuler</button>
                      </div>
                    ) : (
                      <button onClick={() => { setEditing(sol.id); setEditData(sol); }}
                        className="text-xs text-blue-700 font-semibold hover:underline">Modifier</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminPricingPage;
