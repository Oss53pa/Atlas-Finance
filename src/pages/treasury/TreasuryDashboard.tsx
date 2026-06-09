import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useData } from '../../contexts/DataContext';
import analyticsAdvancedService from '../../services/analytics-advanced.service';
import treasuryMLService from '../../services/treasury-ml.service';
import {
  Banknote,
  TrendingUp,
  Shield,
  Brain,
  Target,
  CreditCard,
  Wallet,
  AlertTriangle
} from 'lucide-react';
import {
  UnifiedCard,
  KPICard,
  SectionHeader,
  ElegantButton,
  PageContainer,
  ModernChartCard,
  ColorfulBarChart
} from '../../components/ui/DesignSystem';
import { useBankAccounts } from '../../hooks';
import { formatCurrency, formatPercentage } from '../../lib/utils';
import { queryKeys } from '../../lib/react-query';
import { toast } from 'react-hot-toast';

const TreasuryDashboard: React.FC = () => {
  const [selectedTimeframe, setSelectedTimeframe] = useState('30d');
  const { adapter } = useData();
  // Derive companyId from adapter to follow project pattern instead of reading directly from localStorage
  const companyId = (adapter as unknown as { tenantId?: string }).tenantId
    ?? localStorage.getItem('atlas-tenant-id')
    ?? '';

  // Real API: Get bank accounts — uses the shared queryKey so invalidations are coordinated
  const { data: accountsData, isLoading: loadingAccounts, isError: errorAccounts } = useQuery({
    queryKey: queryKeys.treasury.bankAccounts.list({}),
    queryFn: async () => {
      const { bankAccountsService } = await import('../../services/treasury-complete.service');
      return bankAccountsService.getActiveAccounts();
    },
  });

  // Real API: Get global KPIs from analytics service
  const { data: globalKPIs, isLoading: loadingKPIs, isError: errorKPIs } = useQuery({
    queryKey: ['global-kpis', companyId],
    queryFn: async () => {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return await analyticsAdvancedService.getGlobalKPIs({
        company_id: companyId,
        date_from: startOfMonth.toISOString().split('T')[0],
        date_to: today.toISOString().split('T')[0],
        modules: ['treasury', 'accounting']
      });
    },
    enabled: !!companyId,
    meta: {
      onError: (error: unknown) => {
        console.error('[TreasuryDashboard] Erreur chargement KPIs globaux:', error);
        toast.error('Impossible de charger les KPIs de trésorerie');
      }
    },
  });

  // Real API: Get ML cash flow predictions
  const { data: cashFlowPrediction, isLoading: loadingForecast, isError: errorForecast } = useQuery({
    queryKey: ['cash-flow-prediction', companyId, selectedTimeframe],
    queryFn: async () => {
      const days = selectedTimeframe === '30d' ? 30 : selectedTimeframe === '90d' ? 90 : 7;
      try {
        const result = await treasuryMLService.predictCashFlow({
          company_id: companyId,
          forecast_days: days,
          confidence_level: 0.95,
          include_scenarios: true,
          historical_months: 12
        });
        return result;
      } catch (error) {
        console.error('[TreasuryDashboard] Erreur prévisions ML cash flow:', error);
        throw error;
      }
    },
    enabled: !!companyId,
  });

  // Real API: Get AI recommendations
  const { data: aiRecommendations, isLoading: loadingRecommendations, isError: errorRecommendations } = useQuery({
    queryKey: ['ai-recommendations', companyId],
    queryFn: async () => {
      try {
        return await treasuryMLService.getAIRecommendations(companyId);
      } catch (error) {
        console.error('[TreasuryDashboard] Erreur recommandations IA:', error);
        throw error;
      }
    },
    enabled: !!companyId,
  });

  // Afficher les erreurs non bloquantes à l'utilisateur
  React.useEffect(() => {
    if (errorAccounts) {
      toast.error('Impossible de charger les comptes bancaires');
    }
  }, [errorAccounts]);

  React.useEffect(() => {
    if (errorForecast) {
      toast.error('Impossible de charger les prévisions de trésorerie');
    }
  }, [errorForecast]);

  React.useEffect(() => {
    if (errorRecommendations) {
      console.error('[TreasuryDashboard] Erreur recommandations IA');
    }
  }, [errorRecommendations]);

  // Compute derived stats from real account data
  const accounts = Array.isArray(accountsData) ? accountsData : [];
  const totalBalance = accounts.reduce((sum: number, acc: any) =>
    sum + (acc.current_balance ?? acc.solde_courant ?? 0), 0);
  const activeAccounts = accounts.filter((acc: any) =>
    (acc.status ?? acc.statut ?? '') === 'ACTIVE' || (acc.actif === true));

  // Récupérer les entrées non rapprochées depuis les recommandations IA (catégorie correcte)
  const reconciliationPendingCount = aiRecommendations?.recommendations?.filter(
    (r: any) => r.category === 'reconciliation' || r.category === 'unmatched'
  ).length ?? 0;

  // Taux de rapprochement : proxy basé sur les comptes disponibles côté client
  // (le KPI analytics ne retourne pas encore de reconciliation_rate)
  const rawReconciliationRate: number = (() => {
    const kpisExt = globalKPIs?.treasury as Record<string, unknown> | undefined;
    if (typeof kpisExt?.reconciliation_rate === 'number') {
      return kpisExt.reconciliation_rate as number;
    }
    // Proxy : proportion de comptes dont l'écart est nul
    const total = accounts.length;
    if (total === 0) return 0;
    const reconciled = accounts.filter((acc: any) => {
      const cb = acc.current_balance ?? 0;
      const ib = acc.initial_balance ?? 0;
      return Math.abs(cb - ib) < 1;
    }).length;
    return reconciled / total;
  })();
  const reconciliationRate = Math.round(rawReconciliationRate * 100) / 100;

  // Flux de trésorerie : cash_flow positif = entrées, négatif = sorties
  // Le service analytics ne distingue pas encore total_in / total_out séparément
  const cashFlow = globalKPIs?.treasury?.cash_flow ?? 0;
  const totalIn: number = cashFlow > 0 ? cashFlow : 0;
  const totalOut: number = cashFlow < 0 ? Math.abs(cashFlow) : 0;

  // Prévision J+30 : lire depuis le scénario most_likely si predictions[29] vaut 0
  const pred30 = cashFlowPrediction?.predictions?.[29]?.predicted_balance;
  const cashForecast30d: number = (() => {
    if (pred30 && pred30 !== 0) return pred30;
    // Fallback vers le scénario most_likely si disponible
    const scenario = cashFlowPrediction?.scenarios?.most_likely;
    if (typeof scenario === 'number' && scenario !== 0) return scenario;
    return pred30 ?? 0;
  })();

  const stats = {
    total_accounts: accounts.length,
    total_balance: totalBalance,
    total_in: totalIn,
    total_out: totalOut,
    totalCashPosition: globalKPIs?.treasury?.cash_position ?? totalBalance,
    activeBankConnections: activeAccounts.length,
    reconciliationRate,
    pendingReconciliation: reconciliationPendingCount,
    cashForecast30d,
  };

  const isLoadingStats = loadingAccounts || loadingKPIs;

  if (isLoadingStats) {
    return (
      <PageContainer background="warm" padding="lg">
        <div className="flex justify-center items-center min-h-[60vh]">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center space-y-4 bg-white/90 backdrop-blur-sm p-8 rounded-xl shadow-sm"
          >
            <div className="w-16 h-16 border-4 border-[var(--color-warning-light)] border-t-orange-600 rounded-full animate-spin"></div>
            <p className="text-lg font-medium text-neutral-700">Chargement du module trésorerie...</p>
          </motion.div>
        </div>
      </PageContainer>
    );
  }

  // Afficher un bandeau d'erreur si companyId manquant (queries désactivées)
  const missingCompanyId = !companyId;

  return (
    <PageContainer background="warm" padding="lg">
      <div className="space-y-8">
        {/* Avertissement si companyId absent */}
        {missingCompanyId && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-amber-800 text-sm">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-500" />
            <span>
              Session non initialisée — certaines données de trésorerie ne peuvent pas être chargées.
              Reconnectez-vous pour actualiser votre contexte.
            </span>
          </div>
        )}

        {/* Avertissement si KPIs en erreur */}
        {(errorKPIs || errorForecast) && !missingCompanyId && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-800 text-sm">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-500" />
            <span>
              Certaines données du tableau de bord ne sont pas disponibles. Les valeurs affichées peuvent être incomplètes.
            </span>
          </div>
        )}

        {/* Header épuré */}
        <SectionHeader
          title="Module Trésorerie & Cash Management"
          subtitle="EBICS, SWIFT MT940/942, Rapprochement IA, Prévisions Monte Carlo"
          icon={Banknote}
          action={
            <div className="flex gap-3">
              <Link to="/treasury/connections">
                <ElegantButton variant="outline" icon={Shield}>
                  Connexions EBICS
                </ElegantButton>
              </Link>
              <Link to="/treasury/forecast">
                <ElegantButton variant="primary" icon={TrendingUp}>
                  Prévisions
                </ElegantButton>
              </Link>
            </div>
          }
        />

        {/* KPI Cards épurées */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Position de Trésorerie"
            value={stats.total_accounts > 0 ? formatCurrency(stats.totalCashPosition) : '—'}
            subtitle={stats.total_accounts > 0 ? `${stats.total_accounts} compte(s)` : 'Aucune donnée — module non alimenté par l\'import'}
            icon={Wallet}
            color="success"
            delay={0.1}
            withChart={true}
          />

          <KPICard
            title="Connexions Bancaires"
            value={stats.total_accounts > 0 ? stats.activeBankConnections.toString() : '—'}
            subtitle={stats.total_accounts > 0 ? 'EBICS • SWIFT • PSD2 • Temps réel' : 'Aucune connexion bancaire enregistrée'}
            icon={Shield}
            color="neutral"
            delay={0.2}
            withChart={true}
          />

          <KPICard
            title="Rapprochement IA"
            value={stats.total_accounts > 0 ? formatPercentage(stats.reconciliationRate) : '—'}
            subtitle={
              stats.total_accounts > 0
                ? `Taux de matching${stats.pendingReconciliation > 0 ? ` • ${stats.pendingReconciliation} en attente` : ''}`
                : 'Aucune donnée — module non alimenté par l\'import'
            }
            icon={Brain}
            color="primary"
            delay={0.3}
            withChart={true}
          />

          <KPICard
            title="Cash Forecast 30J"
            value={stats.cashForecast30d !== 0 ? formatCurrency(stats.cashForecast30d) : '—'}
            subtitle={
              errorForecast
                ? 'Prévisions indisponibles'
                : loadingForecast
                ? 'Chargement...'
                : stats.cashForecast30d === 0
                ? 'Aucune prévision disponible'
                : 'Monte Carlo • Confiance 95%'
            }
            icon={Target}
            color="warning"
            delay={0.4}
            withChart={true}
          />
        </div>

        {/* Section graphique moderne */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <ModernChartCard
            title="Évolution de Trésorerie"
            subtitle="Flux mensuels et prévisions ML"
            icon={TrendingUp}
          >
            {loadingForecast ? (
              <div className="flex justify-center items-center h-40">
                <div className="w-8 h-8 border-4 border-neutral-200 border-t-[var(--color-primary)] rounded-full animate-spin" />
              </div>
            ) : errorForecast ? (
              <div className="flex flex-col items-center justify-center h-40 text-neutral-500 text-sm">
                <AlertTriangle className="h-8 w-8 text-amber-400 mb-2" />
                <span>Prévisions temporairement indisponibles</span>
              </div>
            ) : (cashFlowPrediction?.predictions?.length ?? 0) === 0 ||
               (cashFlowPrediction?.predictions ?? []).every((p: any) => p.predicted_balance === 0) ? (
              <div className="flex flex-col items-center justify-center h-40 text-neutral-500 text-sm">
                <span>Aucune prévision disponible pour cette période</span>
              </div>
            ) : (
              <ColorfulBarChart
                data={(cashFlowPrediction?.predictions || []).slice(0, 7).map((pred: any, idx: number) => {
                  const date = new Date(pred.forecast_date);
                  const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
                  const prevBalance = cashFlowPrediction?.predictions?.[idx - 1]?.predicted_balance ?? 0;
                  const color = pred.predicted_balance > prevBalance
                    ? 'bg-[var(--color-success)]'
                    : 'bg-[var(--color-warning)]';
                  return {
                    label: `${monthNames[date.getMonth()]} ${date.getDate()}`,
                    value: Math.round(pred.predicted_balance / 1000000),
                    color,
                  };
                })}
                height={160}
              />
            )}
          </ModernChartCard>
        </motion.div>

        {/* Actions rapides épurées */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <UnifiedCard variant="elevated" size="md">
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-neutral-800">Actions Rapides</h2>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Link to="/treasury/bank-connections" className="group">
                  <motion.div
                    whileHover={{ y: -2 }}
                    className="p-4 border border-neutral-200 rounded-lg hover:border-[var(--color-primary)]/30 hover:shadow-sm transition-all duration-200"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-[var(--color-primary)]/5 rounded-lg">
                        <Shield className="h-5 w-5 text-[var(--color-primary)]" />
                      </div>
                      <div>
                        <h3 className="font-medium text-neutral-800">Connexions EBICS</h3>
                        <p className="text-sm text-neutral-500">Gestion bancaire</p>
                      </div>
                    </div>
                  </motion.div>
                </Link>

                <Link to="/treasury/payments" className="group">
                  <motion.div
                    whileHover={{ y: -2 }}
                    className="p-4 border border-neutral-200 rounded-lg hover:border-green-300 hover:shadow-sm transition-all duration-200"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-[var(--color-success-lightest)] rounded-lg">
                        <CreditCard className="h-5 w-5 text-[var(--color-success)]" />
                      </div>
                      <div>
                        <h3 className="font-medium text-neutral-800">Paiements SEPA</h3>
                        <p className="text-sm text-neutral-500">Virements</p>
                      </div>
                    </div>
                  </motion.div>
                </Link>

                <Link to="/treasury/reconciliation" className="group">
                  <motion.div
                    whileHover={{ y: -2 }}
                    className="p-4 border border-neutral-200 rounded-lg hover:border-amber-300 hover:shadow-sm transition-all duration-200"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-amber-50 rounded-lg">
                        <Brain className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-neutral-800">Rapprochement IA</h3>
                        <p className="text-sm text-neutral-500">Matching intelligent</p>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              </div>
            </div>
          </UnifiedCard>
        </motion.div>
      </div>
    </PageContainer>
  );
};

export default TreasuryDashboard;
