/**
 * Module Treasury WiseBook - Dashboard Enterprise
 * Gestion de trésorerie temps réel avec IA et alertes
 * Conforme au cahier des charges - Standard international
 */
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Banknote, TrendingUp, TrendingDown, AlertTriangle, Activity,
  CreditCard, ArrowUpRight, ArrowDownRight, Clock, Target,
  Shield, Zap, BarChart3, PieChart, LineChart, RefreshCw,
  Bell, Eye, Settings, Download, Upload, FileText,
  Building, Users, Calculator, Brain, Sparkles
} from 'lucide-react';

// Types selon le cahier des charges
interface TreasuryKPIs {
  all_accounts_balance: number;
  rib_masque: string;
  opening: number;
  cash_in: number;
  cash_out: number;
  actual_balance: number;
  incoming: number;
  outcoming: number;
  landing_forecast: number;
  liquidity_risk_score: number;
  risk_level: 'FAIBLE' | 'MODERE' | 'ELEVE' | 'CRITIQUE';
  days_coverage: number;
  alertes_actives: number;
  alertes_critiques: number;
  currency: string;
}

interface BankAccount {
  account_number: string;
  description: string;
  iban_masked: string;
  bank_name: string;
  current_balance: number;
  overdraft_limit: number;
  available_balance: number;
  currency: string;
  status: 'ACTIVE' | 'CLOSED' | 'SUSPENDED';
}

interface TreasuryAlert {
  id: string;
  type: string;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  title: string;
  message: string;
  account?: string;
  created_at: string;
  is_acknowledged: boolean;
}

interface CashForecast {
  semaine: number;
  period_start: string;
  period_end: string;
  scenarios: {
    OPTIMISTE: { balance_fin: number; entrees: number; sorties: number; confidence: number };
    REALISTE: { balance_fin: number; entrees: number; sorties: number; confidence: number };
    PESSIMISTE: { balance_fin: number; entrees: number; sorties: number; confidence: number };
  };
  confidence_level: number;
}

const TreasuryDashboardEnterprise: React.FC = () => {
  // État principal
  const [kpis, setKpis] = useState<TreasuryKPIs | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [alerts, setAlerts] = useState<TreasuryAlert[]>([]);
  const [forecasts, setForecasts] = useState<CashForecast[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // État interface
  const [activeTab, setActiveTab] = useState('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Chargement initial et auto-refresh
  useEffect(() => {
    chargerDonneesCompletes();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        chargerKPIs();
        setLastRefresh(new Date());
      }, 30000); // Refresh toutes les 30 secondes

      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const chargerDonneesCompletes = async () => {
    setLoading(true);
    try {
      await Promise.all([
        chargerKPIs(),
        chargerComptesBank(),
        chargerAlertes(),
        chargerPrevisions()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const chargerKPIs = async () => {
    try {
      const response = await fetch('/api/treasury/api/dashboard/kpis/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setKpis(data);
      }
    } catch (error) {
      console.error('Erreur KPIs:', error);
    }
  };

  const chargerComptesBank = async () => {
    try {
      const response = await fetch('/api/treasury/api/accounts/consolidation/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setBankAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error('Erreur comptes:', error);
    }
  };

  const chargerAlertes = async () => {
    try {
      const response = await fetch('/api/treasury/api/dashboard/alertes/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAlerts(data.alertes || []);
      }
    } catch (error) {
      console.error('Erreur alertes:', error);
    }
  };

  const chargerPrevisions = async () => {
    try {
      const response = await fetch('/api/treasury/api/forecasting/13-semaines/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setForecasts(data.previsions_13_semaines || []);
      }
    } catch (error) {
      console.error('Erreur prévisions:', error);
    }
  };

  // Formatage des montants
  const formaterMontant = (montant: number, devise: string = 'XOF') => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: devise,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(montant);
  };

  const getRiskColor = (riskLevel: string) => {
    const colors = {
      'FAIBLE': 'text-green-600',
      'MODERE': 'text-yellow-600',
      'ELEVE': 'text-orange-600',
      'CRITIQUE': 'text-red-600',
    };
    return colors[riskLevel as keyof typeof colors] || 'text-gray-600';
  };

  const getRiskBadgeColor = (riskLevel: string) => {
    const colors = {
      'FAIBLE': 'bg-green-100 text-green-800',
      'MODERE': 'bg-yellow-100 text-yellow-800',
      'ELEVE': 'bg-orange-100 text-orange-800',
      'CRITIQUE': 'bg-red-100 text-red-800',
    };
    return colors[riskLevel as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'WARNING':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'ERROR':
        return <Shield className="h-4 w-4 text-red-500" />;
      default:
        return <Bell className="h-4 w-4 text-[#6A8A82]" />;
    }
  };

  // Rendu des KPIs principales - Conforme Balance Overview
  const renderKPIsBalance = () => {
    if (!kpis) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Balance globale */}
        <Card className="col-span-1 md:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-600">ALL ACCOUNTS BALANCE</p>
                <p className={`text-4xl font-bold ${kpis.all_accounts_balance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formaterMontant(kpis.all_accounts_balance, kpis.currency)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  RIB masqué: {kpis.rib_masque}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge className={getRiskBadgeColor(kpis.risk_level)}>
                  {kpis.risk_level}
                </Badge>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Score Risque</p>
                  <p className="text-sm font-bold">{kpis.liquidity_risk_score}/100</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-gray-500">Opening</p>
                <p className="font-semibold">{formaterMontant(kpis.opening, kpis.currency)}</p>
              </div>
              <div>
                <p className="text-xs text-green-600">Cash In</p>
                <p className="font-semibold text-green-600">{formaterMontant(kpis.cash_in, kpis.currency)}</p>
              </div>
              <div>
                <p className="text-xs text-red-600">Cash Out</p>
                <p className="font-semibold text-red-600">{formaterMontant(kpis.cash_out, kpis.currency)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Prévisions */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Incoming</p>
                <p className="text-2xl font-bold text-[#6A8A82]">
                  {formaterMontant(kpis.incoming, kpis.currency)}
                </p>
              </div>
              <ArrowDownRight className="h-8 w-8 text-[#6A8A82]" />
            </div>
            <div className="mt-4">
              <p className="text-xs text-gray-500">7 prochains jours</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Outcoming</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formaterMontant(kpis.outcoming, kpis.currency)}
                </p>
              </div>
              <ArrowUpRight className="h-8 w-8 text-orange-500" />
            </div>
            <div className="mt-4">
              <p className="text-xs text-gray-500">7 prochains jours</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Rendu position finale prévue
  const renderPositionForecast = () => {
    if (!kpis) return null;

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Landing Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Position prévisionnelle (7 jours)</p>
              <p className={`text-3xl font-bold ${kpis.landing_forecast < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formaterMontant(kpis.landing_forecast, kpis.currency)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Couverture</p>
              <p className="text-lg font-semibold">{kpis.days_coverage} jours</p>
              <Progress
                value={Math.min(kpis.days_coverage / 30 * 100, 100)}
                className="w-24 h-2 mt-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Rendu des comptes bancaires
  const renderBankAccountsList = () => {
    if (bankAccounts.length === 0) {
      return (
        <Card>
          <CardContent className="text-center py-12">
            <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Aucun compte bancaire configuré</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Comptes Bancaires ({bankAccounts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 p-3 text-left">Account #</th>
                  <th className="border border-gray-300 p-3 text-left">Description</th>
                  <th className="border border-gray-300 p-3 text-left">IBAN</th>
                  <th className="border border-gray-300 p-3 text-left">Banque</th>
                  <th className="border border-gray-300 p-3 text-right">Balance</th>
                  <th className="border border-gray-300 p-3 text-right">Découvert</th>
                  <th className="border border-gray-300 p-3 text-center">Statut</th>
                </tr>
              </thead>
              <tbody>
                {bankAccounts.map((account, index) => (
                  <tr key={account.account_number} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-300 p-3 font-mono">
                      {account.account_number}
                    </td>
                    <td className="border border-gray-300 p-3">
                      {account.description}
                    </td>
                    <td className="border border-gray-300 p-3 font-mono text-xs">
                      {account.iban_masked}
                    </td>
                    <td className="border border-gray-300 p-3">
                      {account.bank_name}
                    </td>
                    <td className="border border-gray-300 p-3 text-right font-mono">
                      <span className={account.current_balance < 0 ? 'text-red-600 font-bold' : 'text-green-600'}>
                        {formaterMontant(account.current_balance, account.currency)}
                      </span>
                    </td>
                    <td className="border border-gray-300 p-3 text-right font-mono text-gray-600">
                      {formaterMontant(account.overdraft_limit, account.currency)}
                    </td>
                    <td className="border border-gray-300 p-3 text-center">
                      <Badge className={
                        account.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                        account.status === 'SUSPENDED' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }>
                        {account.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Rendu des alertes critiques
  const renderAlertesActives = () => {
    const alertesCritiques = alerts.filter(a => a.severity === 'CRITICAL');
    const alertesWarning = alerts.filter(a => a.severity === 'WARNING');

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Alertes Trésorerie ({alerts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-green-600 font-medium">Aucune alerte active</p>
              <p className="text-sm text-gray-500">Situation de trésorerie normale</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Alertes critiques */}
              {alertesCritiques.length > 0 && (
                <div>
                  <h4 className="font-semibold text-red-700 mb-3">Alertes Critiques ({alertesCritiques.length})</h4>
                  <div className="space-y-2">
                    {alertesCritiques.map((alerte) => (
                      <div key={alerte.id} className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        {getSeverityIcon(alerte.severity)}
                        <div className="flex-1">
                          <p className="font-medium text-red-900">{alerte.title}</p>
                          <p className="text-sm text-red-700">{alerte.message}</p>
                          {alerte.account && (
                            <p className="text-xs text-red-600 mt-1">Compte: {alerte.account}</p>
                          )}
                        </div>
                        <Button size="sm" variant="outline">
                          Traiter
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Alertes warning */}
              {alertesWarning.length > 0 && (
                <div>
                  <h4 className="font-semibold text-orange-700 mb-3">Avertissements ({alertesWarning.length})</h4>
                  <div className="space-y-2">
                    {alertesWarning.slice(0, 3).map((alerte) => (
                      <div key={alerte.id} className="flex items-start gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        {getSeverityIcon(alerte.severity)}
                        <div className="flex-1">
                          <p className="font-medium text-orange-900">{alerte.title}</p>
                          <p className="text-sm text-orange-700">{alerte.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Rendu des prévisions 13 semaines
  const renderPrevisions13Semaines = () => {
    if (forecasts.length === 0) {
      return (
        <Card>
          <CardContent className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Prévisions en cours de génération...</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Prévisions 13 Semaines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 p-2 text-center">Semaine</th>
                  <th className="border border-gray-300 p-2 text-right">Début</th>
                  <th className="border border-gray-300 p-2 text-right">Encaiss.</th>
                  <th className="border border-gray-300 p-2 text-right">Décaiss.</th>
                  <th className="border border-gray-300 p-2 text-right">Fin</th>
                  <th className="border border-gray-300 p-2 text-center">Confiance</th>
                </tr>
              </thead>
              <tbody>
                {forecasts.slice(0, 8).map((forecast, index) => {
                  const scenario = forecast.scenarios.REALISTE;
                  return (
                    <tr key={forecast.semaine} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-300 p-2 text-center font-semibold">
                        S{forecast.semaine}
                      </td>
                      <td className="border border-gray-300 p-2 text-right font-mono">
                        {formaterMontant(scenario.balance_fin - scenario.entrees + scenario.sorties, kpis?.currency || 'XOF')}
                      </td>
                      <td className="border border-gray-300 p-2 text-right font-mono text-green-600">
                        +{formaterMontant(scenario.entrees, kpis?.currency || 'XOF')}
                      </td>
                      <td className="border border-gray-300 p-2 text-right font-mono text-red-600">
                        -{formaterMontant(scenario.sorties, kpis?.currency || 'XOF')}
                      </td>
                      <td className="border border-gray-300 p-2 text-right font-mono font-bold">
                        <span className={scenario.balance_fin < 0 ? 'text-red-600' : 'text-green-600'}>
                          {formaterMontant(scenario.balance_fin, kpis?.currency || 'XOF')}
                        </span>
                      </td>
                      <td className="border border-gray-300 p-2 text-center">
                        <Progress value={forecast.confidence_level} className="w-12 h-2" />
                        <span className="text-xs">{forecast.confidence_level}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      {/* Header pleine largeur avec couleurs du projet */}
      <div className="bg-gradient-to-r from-[#6A8A82] to-[#7A99AC] rounded-lg p-4 text-white shadow-lg mb-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">
              📊 Tableau de bord Finance
            </h1>
            <p className="text-white/90 text-sm">
              Vue d'ensemble financière complète - Analyses temps réel
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-white/80 bg-white/10 px-3 py-2 rounded-lg backdrop-blur">
              <Clock className="h-4 w-4" />
              <span>Dernière MAJ: {lastRefresh.toLocaleTimeString('fr-FR')}</span>
            </div>

            <button className="flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-colors backdrop-blur border border-white/20">
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Indicateurs rapides dans le header */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4 pt-3 border-t border-white/20">
          <div className="text-center">
            <div className="text-sm text-white/70">Working Capital</div>
            <div className="text-xl font-bold text-white">
              {new Intl.NumberFormat('fr-FR', { notation: 'compact', compactDisplay: 'short' }).format(181066062)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-white/70">Current Ratio</div>
            <div className="text-xl font-bold text-white">2.0</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-white/70">Quick Ratio</div>
            <div className="text-xl font-bold text-white">40%</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-white/70">Cash Position</div>
            <div className="text-xl font-bold text-white">
              {new Intl.NumberFormat('fr-FR', { notation: 'compact', compactDisplay: 'short' }).format(-95214202)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Current Working Capital */}
        <div>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">💼 Current Working Capital</h2>

            {/* Liste avec deux colonnes */}
            <div className="space-y-4">
              {/* Current Assets */}
              <div>
                <h3 className="text-base font-medium text-[#6A8A82] mb-3">📈 Current Assets</h3>
                <div className="bg-[#6A8A82]/5 rounded-lg p-3">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center py-1 border-b border-[#6A8A82]/20">
                      <span className="text-[#6A8A82] font-medium">Current assets</span>
                      <span className="text-xl font-bold text-[#6A8A82]">
                        {new Intl.NumberFormat('fr-FR').format(370717739)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-gray-700 ml-4">Cash</span>
                      <span className="font-semibold text-green-600">
                        {new Intl.NumberFormat('fr-FR').format(115400365)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-gray-700 ml-4">Account receivable</span>
                      <span className="font-semibold text-[#6A8A82]">
                        {new Intl.NumberFormat('fr-FR').format(255317374)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-gray-700 ml-4">Pre-paid expense</span>
                      <span className="font-semibold text-gray-600">0</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Liabilities */}
              <div>
                <h3 className="text-lg font-medium text-red-800 mb-4">📉 Current Liabilities</h3>
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-red-200">
                      <span className="text-red-700 font-medium">Current liabilities</span>
                      <span className="text-xl font-bold text-red-600">
                        {new Intl.NumberFormat('fr-FR').format(189651677)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-gray-700 ml-4">Account payable</span>
                      <span className="font-semibold text-red-600">
                        {new Intl.NumberFormat('fr-FR').format(73940491)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-gray-700 ml-4">Credit card debt</span>
                      <span className="font-semibold text-red-600">
                        {new Intl.NumberFormat('fr-FR').format(38721)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-gray-700 ml-4">Bank operating credit</span>
                      <span className="font-semibold text-red-600">
                        {new Intl.NumberFormat('fr-FR').format(115672465)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-gray-700 ml-4">Accrued expenses</span>
                      <span className="font-semibold text-gray-600">0</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-gray-700 ml-4">Taxes payable</span>
                      <span className="font-semibold text-gray-600">0</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Working Capital & Current Ratio */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
                  <div className="flex justify-between items-center">
                    <span className="text-green-800 font-medium">💰 Working Capital</span>
                    <span className="text-2xl font-bold text-green-600">
                      {new Intl.NumberFormat('fr-FR').format(181066062)}
                    </span>
                  </div>
                </div>
                <div className="bg-[#6A8A82]/5 rounded-lg p-4 border-l-4 border-[#6A8A82]">
                  <div className="flex justify-between items-center">
                    <span className="text-[#6A8A82] font-medium">📊 Current Ratio</span>
                    <span className="text-2xl font-bold text-[#6A8A82]">2.0</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Ratios & Metrics */}
        <div className="space-y-4">
          {/* Days Outstanding - Côte à côte */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Days Payable Outstanding */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <h3 className="text-lg font-semibold text-orange-800 mb-4">📉 Days Payable Outstanding</h3>

              {/* Semi-Circle Gauge Modern */}
              <div className="mb-4 text-center">
                <div className="relative w-32 h-20 mx-auto mb-4">
                  {/* SVG Semi-Circle Gauge */}
                  <svg className="w-32 h-20" viewBox="0 0 128 64">
                    {/* Background Semi-Circle */}
                    <path
                      d="M 16 48 A 32 32 0 0 1 112 48"
                      stroke="#FED7AA"
                      strokeWidth="10"
                      fill="none"
                      opacity="0.3"
                    />
                    {/* Progress Semi-Circle */}
                    <path
                      d="M 16 48 A 32 32 0 0 1 112 48"
                      stroke="url(#orangeGradient)"
                      strokeWidth="10"
                      fill="none"
                      strokeDasharray={`${40 * 1.51} ${100 * 1.51}`}
                      strokeLinecap="round"
                      className="drop-shadow-sm"
                    />
                    {/* Gradient Definition */}
                    <defs>
                      <linearGradient id="orangeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#FB923C" />
                        <stop offset="100%" stopColor="#F97316" />
                      </linearGradient>
                    </defs>
                  </svg>

                  {/* Center Content */}
                  <div className="absolute inset-0 flex items-center justify-center mt-1">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600 mb-1">40%</div>
                      <div className="text-xs text-gray-600 font-medium">40 jours</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Répartition des dettes */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-800 mb-3">Répartition des dettes :</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-600">- de 30j</span>
                    <span className="font-semibold text-green-600">
                      {new Intl.NumberFormat('fr-FR', { notation: 'compact', compactDisplay: 'short' }).format(45200000)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-600">31-60j</span>
                    <span className="font-semibold text-yellow-600">
                      {new Intl.NumberFormat('fr-FR', { notation: 'compact', compactDisplay: 'short' }).format(28750000)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-600">61-90j</span>
                    <span className="font-semibold text-orange-600">
                      {new Intl.NumberFormat('fr-FR', { notation: 'compact', compactDisplay: 'short' }).format(15200000)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-t pt-2">
                    <span className="text-gray-600">+90j</span>
                    <span className="font-semibold text-red-600">
                      {new Intl.NumberFormat('fr-FR', { notation: 'compact', compactDisplay: 'short' }).format(4500000)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Days Sales Outstanding */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <h3 className="text-lg font-semibold text-[#6A8A82] mb-4">📈 Days Sales Outstanding</h3>

              {/* Semi-Circle Gauge Modern */}
              <div className="mb-4 text-center">
                <div className="relative w-32 h-20 mx-auto mb-4">
                  {/* SVG Semi-Circle Gauge */}
                  <svg className="w-32 h-20" viewBox="0 0 128 64">
                    {/* Background Semi-Circle */}
                    <path
                      d="M 16 48 A 32 32 0 0 1 112 48"
                      stroke="#DBEAFE"
                      strokeWidth="10"
                      fill="none"
                      opacity="0.3"
                    />
                    {/* Progress Semi-Circle */}
                    <path
                      d="M 16 48 A 32 32 0 0 1 112 48"
                      stroke="url(#blueGradient)"
                      strokeWidth="10"
                      fill="none"
                      strokeDasharray={`${40 * 1.51} ${100 * 1.51}`}
                      strokeLinecap="round"
                      className="drop-shadow-sm"
                    />
                    {/* Gradient Definition */}
                    <defs>
                      <linearGradient id="blueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#60A5FA" />
                        <stop offset="100%" stopColor="#3B82F6" />
                      </linearGradient>
                    </defs>
                  </svg>

                  {/* Center Content */}
                  <div className="absolute inset-0 flex items-center justify-center mt-1">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-[#6A8A82] mb-1">40%</div>
                      <div className="text-xs text-gray-600 font-medium">40 jours</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Répartition des créances */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-800 mb-3">Répartition des créances :</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-600">- de 30j</span>
                    <span className="font-semibold text-green-600">
                      {new Intl.NumberFormat('fr-FR', { notation: 'compact', compactDisplay: 'short' }).format(145200000)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-600">31-60j</span>
                    <span className="font-semibold text-yellow-600">
                      {new Intl.NumberFormat('fr-FR', { notation: 'compact', compactDisplay: 'short' }).format(65800000)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-600">61-90j</span>
                    <span className="font-semibold text-orange-600">
                      {new Intl.NumberFormat('fr-FR', { notation: 'compact', compactDisplay: 'short' }).format(32100000)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-t pt-2">
                    <span className="text-gray-600">+90j</span>
                    <span className="font-semibold text-red-600">
                      {new Intl.NumberFormat('fr-FR', { notation: 'compact', compactDisplay: 'short' }).format(12200000)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cash Conversion Cycle */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🔄 Cash Conversion Cycle</h3>

            {/* Métriques principales */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              <div className="text-center p-3 bg-[#6A8A82]/5 rounded-lg">
                <div className="text-lg font-bold text-[#6A8A82]">8</div>
                <div className="text-xs text-gray-600">DSO</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-lg font-bold text-orange-600">10</div>
                <div className="text-xs text-gray-600">DPO</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-lg font-bold text-green-600">18</div>
                <div className="text-xs text-gray-600">CCC</div>
              </div>
            </div>

            {/* Histogramme mensuel */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-800 mb-3">Évolution mensuelle :</h4>
              <div className="flex items-end justify-between h-24 bg-gray-50 rounded-lg p-3">
                {[
                  { mois: 'Jan', valeur: 22, couleur: '#EF4444' },
                  { mois: 'Fév', valeur: 19, couleur: '#F97316' },
                  { mois: 'Mar', valeur: 16, couleur: '#EAB308' },
                  { mois: 'Avr', valeur: 18, couleur: '#22C55E' },
                  { mois: 'Mai', valeur: 15, couleur: '#22C55E' },
                  { mois: 'Jun', valeur: 18, couleur: '#22C55E' }
                ].map((data, index) => (
                  <div key={index} className="flex flex-col items-center">
                    <div
                      className="w-6 rounded-t transition-all duration-300 hover:opacity-80"
                      style={{
                        height: `${(data.valeur / 25) * 100}%`,
                        backgroundColor: data.couleur,
                        minHeight: '8px'
                      }}
                    ></div>
                    <div className="text-xs text-gray-600 mt-1">{data.mois}</div>
                    <div className="text-xs font-medium text-gray-800">{data.valeur}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tendance */}
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
              <span className="text-sm font-medium text-green-800">Tendance actuelle</span>
              <div className="flex items-center space-x-2">
                <TrendingDown className="w-4 h-4 text-green-600" />
                <span className="text-sm font-bold text-green-600">-4 jours vs mois dernier</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Second Row - Trends & Cash Ratios */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Trends */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-3">📈 Trends</h3>

          {/* Cash Ratios avec jauges et sparklines */}
          <div className="mb-4">
            <h4 className="font-medium text-[#B87333] mb-3">Cash ratios</h4>
            <div className="space-y-4">
              {/* Quick Ratio avec Sparkline */}
              <div className="flex items-center space-x-4">
                {/* Gauge gauche */}
                <div className="text-center flex-shrink-0">
                  <div className="relative w-28 h-18 mx-auto mb-2">
                    <svg className="w-28 h-18" viewBox="0 0 112 56">
                      {/* Background Semi-Circle */}
                      <path
                        d="M 14 42 A 28 28 0 0 1 98 42"
                        stroke="#E5E7EB"
                        strokeWidth="8"
                        fill="none"
                        opacity="0.3"
                      />
                      {/* Progress Semi-Circle */}
                      <path
                        d="M 14 42 A 28 28 0 0 1 98 42"
                        stroke="url(#purpleGradient)"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${40 * 1.32} ${100 * 1.32}`}
                        strokeLinecap="round"
                      />
                      <defs>
                        <linearGradient id="purpleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#A855F7" />
                          <stop offset="100%" stopColor="#7C3AED" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-lg font-bold text-[#B87333]">40%</div>
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 font-medium">Quick Ratio</div>
                </div>

                {/* Sparkline droite - Style MUI */}
                <div className="flex-1">
                  <div className="flex flex-col">
                    <div className="text-xs text-gray-500 mb-1 font-medium">Quick Ratio - 6 derniers mois</div>
                    <div className="border-b-2 border-[#B87333]/20 pb-1">
                      <div className="h-10 flex-1">
                        <svg width="100%" height="40" viewBox="0 0 150 40" className="overflow-visible">
                          {/* Area gradient */}
                          <defs>
                            <linearGradient id="purpleAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="rgb(137, 86, 255)" stopOpacity="0.2" />
                              <stop offset="100%" stopColor="rgb(137, 86, 255)" stopOpacity="0.05" />
                            </linearGradient>
                          </defs>
                          {/* Area */}
                          <path
                            d={`M 0 ${40 - (42/50)*35} L 25 ${40 - (38/50)*35} L 50 ${40 - (35/50)*35} L 75 ${40 - (41/50)*35} L 100 ${40 - (39/50)*35} L 125 ${40 - (40/50)*35} L 125 40 L 0 40 Z`}
                            fill="url(#purpleAreaGradient)"
                          />
                          {/* Line */}
                          <path
                            d={`M 0 ${40 - (42/50)*35} L 25 ${40 - (38/50)*35} L 50 ${40 - (35/50)*35} L 75 ${40 - (41/50)*35} L 100 ${40 - (39/50)*35} L 125 ${40 - (40/50)*35}`}
                            stroke="rgb(137, 86, 255)"
                            strokeWidth="3"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          {/* Highlight dot */}
                          <circle
                            cx="125"
                            cy={40 - (40/50)*35}
                            r="4"
                            fill="rgb(137, 86, 255)"
                            className="drop-shadow-sm"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Ratio avec Sparkline */}
              <div className="flex items-center space-x-4">
                {/* Gauge gauche */}
                <div className="text-center flex-shrink-0">
                  <div className="relative w-28 h-18 mx-auto mb-2">
                    <svg className="w-28 h-18" viewBox="0 0 112 56">
                      {/* Background Semi-Circle */}
                      <path
                        d="M 14 42 A 28 28 0 0 1 98 42"
                        stroke="#E5E7EB"
                        strokeWidth="8"
                        fill="none"
                        opacity="0.3"
                      />
                      {/* Progress Semi-Circle */}
                      <path
                        d="M 14 42 A 28 28 0 0 1 98 42"
                        stroke="url(#cyanGradient)"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${40 * 1.32} ${100 * 1.32}`}
                        strokeLinecap="round"
                      />
                      <defs>
                        <linearGradient id="cyanGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#06B6D4" />
                          <stop offset="100%" stopColor="#0891B2" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-lg font-bold text-cyan-600">40%</div>
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 font-medium">Current Ratio</div>
                </div>

                {/* Sparkline droite - Style MUI */}
                <div className="flex-1">
                  <div className="flex flex-col">
                    <div className="text-xs text-gray-500 mb-1 font-medium">Current Ratio - 6 derniers mois</div>
                    <div className="border-b-2 border-cyan-200 pb-1">
                      <div className="h-10 flex-1">
                        <svg width="100%" height="40" viewBox="0 0 150 40" className="overflow-visible">
                          {/* Area gradient */}
                          <defs>
                            <linearGradient id="cyanAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="rgb(6, 182, 212)" stopOpacity="0.2" />
                              <stop offset="100%" stopColor="rgb(6, 182, 212)" stopOpacity="0.05" />
                            </linearGradient>
                          </defs>
                          {/* Area */}
                          <path
                            d={`M 0 ${40 - (38/50)*35} L 25 ${40 - (41/50)*35} L 50 ${40 - (39/50)*35} L 75 ${40 - (42/50)*35} L 100 ${40 - (40/50)*35} L 125 ${40 - (40/50)*35} L 125 40 L 0 40 Z`}
                            fill="url(#cyanAreaGradient)"
                          />
                          {/* Line */}
                          <path
                            d={`M 0 ${40 - (38/50)*35} L 25 ${40 - (41/50)*35} L 50 ${40 - (39/50)*35} L 75 ${40 - (42/50)*35} L 100 ${40 - (40/50)*35} L 125 ${40 - (40/50)*35}`}
                            stroke="rgb(6, 182, 212)"
                            strokeWidth="3"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          {/* Highlight dot */}
                          <circle
                            cx="125"
                            cy={40 - (40/50)*35}
                            r="4"
                            fill="rgb(6, 182, 212)"
                            className="drop-shadow-sm"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Total Cash Section - Horizontal */}
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-3 bg-red-50 rounded-lg border-l-4 border-red-500">
              <div className="text-sm text-gray-700 mb-1">Total Cash</div>
              <div className="text-lg font-bold text-red-600">
                {new Intl.NumberFormat('fr-FR').format(-95214202)}
              </div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-sm text-gray-700 mb-1">Cash In</div>
              <div className="text-lg font-bold text-green-600">
                {new Intl.NumberFormat('fr-FR').format(179400537)}
              </div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-sm text-gray-700 mb-1">Cash Out</div>
              <div className="text-lg font-bold text-red-600">
                {new Intl.NumberFormat('fr-FR').format(274614739)}
              </div>
            </div>
          </div>
        </div>

        {/* Cash Balance Summary */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">💰 Cash Balance</h3>
          <div className="text-center mb-4">
            <div className="text-4xl font-bold text-red-600 mb-2">
              {new Intl.NumberFormat('fr-FR').format(-95214202)}
            </div>
            <div className="text-sm text-gray-600">Position de trésorerie actuelle</div>
          </div>

          {/* Histogramme mensuel */}
          <div>
            <h4 className="text-sm font-medium text-gray-800 mb-3">Évolution mensuelle :</h4>
            <div className="flex items-end justify-between h-24 bg-gray-50 rounded-lg p-2">
              {[
                { mois: 'Jan', solde: -85194202, couleur: '#EF4444' },
                { mois: 'Fév', solde: -88456789, couleur: '#EF4444' },
                { mois: 'Mar', solde: -91823456, couleur: '#EF4444' },
                { mois: 'Avr', solde: -89167890, couleur: '#EF4444' },
                { mois: 'Mai', solde: -90987654, couleur: '#EF4444' },
                { mois: 'Jun', solde: -93854321, couleur: '#EF4444' },
                { mois: 'Jul', solde: -96123789, couleur: '#EF4444' },
                { mois: 'Aoû', solde: -94876543, couleur: '#EF4444' },
                { mois: 'Sep', solde: -95214202, couleur: '#DC2626' },
                { mois: 'Oct', solde: -92800000, couleur: '#F97316' },
                { mois: 'Nov', solde: -89500000, couleur: '#EAB308' },
                { mois: 'Déc', solde: -86200000, couleur: '#22C55E' }
              ].map((data, index) => {
                // Trouver min/max des données
                const soldes = [-85194202, -88456789, -91823456, -89167890, -90987654, -93854321, -96123789, -94876543, -95214202, -92800000, -89500000, -86200000];
                const minSoldeAbs = Math.min(...soldes.map(s => Math.abs(s))); // 85.2M
                const maxSoldeAbs = Math.max(...soldes.map(s => Math.abs(s))); // 96.1M

                // Calculer hauteur avec amplification des différences
                const soldeAbs = Math.abs(data.solde);
                const hauteur = ((soldeAbs - minSoldeAbs) / (maxSoldeAbs - minSoldeAbs)) * 75 + 25; // 25% à 100%
                return (
                  <div key={index} className="flex flex-col items-center">
                    <div
                      className="w-5 rounded-t transition-all duration-300 hover:opacity-80 relative group"
                      style={{
                        height: `${hauteur}%`,
                        backgroundColor: data.couleur,
                        minHeight: '8px'
                      }}
                    >
                      {/* Tooltip au hover */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        Solde: {new Intl.NumberFormat('fr-FR').format(data.solde)}
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 mt-1 font-medium">{data.mois}</div>
                  </div>
                );
              })}
            </div>

            {/* Légende */}
            <div className="mt-3 flex justify-center space-x-4 text-xs">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span className="text-gray-600">Déficit critique</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-orange-500 rounded"></div>
                <span className="text-gray-600">Amélioration</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span className="text-gray-600">Prévision positive</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Rapport généré le {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR')}
          </div>
          <div className="flex space-x-3">
            <Button variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button variant="outline">
              <BarChart3 className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
            <Button>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TreasuryDashboardEnterprise;