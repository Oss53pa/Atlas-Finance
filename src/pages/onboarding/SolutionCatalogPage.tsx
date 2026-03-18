// @ts-nocheck
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calculator, Users, Handshake, Package, FolderKanban, FileText, FolderOpen,
  CheckCircle, ArrowRight, Sparkles, Zap
} from 'lucide-react';
import { getSolutions, getMySubscriptions, createSubscription } from '../../features/onboarding/services/onboardingService';
import { toast } from 'react-hot-toast';

const ICONS: Record<string, React.FC<{ className?: string }>> = {
  calculator: Calculator, users: Users, handshake: Handshake,
  package: Package, 'folder-kanban': FolderKanban,
  'file-text': FileText, 'folder-open': FolderOpen,
};

const SolutionCatalogPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');

  const { data: solutions = [], isLoading } = useQuery({
    queryKey: ['solutions'],
    queryFn: getSolutions,
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['my-subscriptions'],
    queryFn: getMySubscriptions,
  });

  const activateMutation = useMutation({
    mutationFn: (solutionId: string) => createSubscription(solutionId, 'free'),
    onSuccess: (_, solutionId) => {
      queryClient.invalidateQueries({ queryKey: ['my-subscriptions'] });
      const sol = solutions.find(s => s.id === solutionId);
      toast.success(`${sol?.name || 'Solution'} activée — essai gratuit 14 jours`);
      navigate('/client');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const isSubscribed = (solutionId: string) =>
    subscriptions.some(s => s.solution_id === solutionId && (s.status === 'active' || s.status === 'trialing'));

  const formatPrice = (xof: number, eur: number) => {
    return `${xof.toLocaleString('fr-FR')} FCFA / ${eur}€`;
  };

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="atlas-brand text-2xl text-[#171717]">Atlas Studio</span>
          </div>
          <button onClick={() => navigate('/client')} className="text-sm text-gray-500 hover:text-gray-700">
            Retour au hub
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-[#171717]">Choisissez vos solutions</h1>
          <p className="text-gray-500 mt-2">Activez un essai gratuit de 14 jours — sans engagement</p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-1 bg-gray-100 rounded-lg p-1 mt-6">
            <button
              onClick={() => setBilling('monthly')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${billing === 'monthly' ? 'bg-white shadow text-[#171717]' : 'text-gray-500'}`}
            >
              Mensuel
            </button>
            <button
              onClick={() => setBilling('yearly')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${billing === 'yearly' ? 'bg-white shadow text-[#171717]' : 'text-gray-500'}`}
            >
              Annuel <span className="text-green-600 text-xs ml-1">-17%</span>
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-20 text-gray-400">Chargement...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {solutions.map(sol => {
              const Icon = ICONS[sol.icon] || Calculator;
              const subscribed = isSubscribed(sol.id);
              const price = billing === 'monthly'
                ? formatPrice(sol.price_monthly_xof, sol.price_monthly_eur)
                : formatPrice(sol.price_yearly_xof, sol.price_yearly_eur);

              return (
                <div key={sol.id} className={`bg-white rounded-2xl border-2 overflow-hidden transition-all ${
                  subscribed ? 'border-green-400 shadow-lg' : sol.is_active ? 'border-gray-200 hover:border-gray-400 hover:shadow-lg' : 'border-gray-100 opacity-60'
                }`}>
                  {/* Card header */}
                  <div className="p-6" style={{ borderBottom: `3px solid ${sol.color}` }}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: sol.color + '12' }}>
                        <Icon className="w-6 h-6" style={{ color: sol.color }} />
                      </div>
                      {subscribed && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                          <CheckCircle className="w-3.5 h-3.5" /> Actif
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-[#171717]">{sol.name}</h3>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{sol.description}</p>
                  </div>

                  {/* Price */}
                  <div className="px-6 py-4 bg-gray-50">
                    <div className="text-sm text-gray-500">{billing === 'monthly' ? 'Par mois' : 'Par an'}</div>
                    <div className="text-lg font-bold text-[#171717]">{price}</div>
                  </div>

                  {/* Features */}
                  <div className="px-6 py-4">
                    <ul className="space-y-2">
                      {(sol.features || []).slice(0, 5).map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* CTA */}
                  <div className="px-6 pb-6">
                    {subscribed ? (
                      <button onClick={() => navigate('/client')}
                        className="w-full py-3 bg-green-600 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2">
                        Ouvrir <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : sol.is_active ? (
                      <button
                        onClick={() => activateMutation.mutate(sol.id)}
                        disabled={activateMutation.isPending}
                        className="w-full py-3 bg-[#171717] text-white rounded-lg text-sm font-semibold hover:bg-[#333] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Zap className="w-4 h-4" /> Essai gratuit 14 jours
                      </button>
                    ) : (
                      <div className="w-full py-3 bg-gray-100 text-gray-400 rounded-lg text-sm font-medium text-center">
                        Bientôt disponible
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default SolutionCatalogPage;
