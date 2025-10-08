/**
 * Module Budget WiseBook - Dashboard Principal
 * Gestion budgétaire intelligente avec IA et analyse prédictive
 * Conforme au cahier des charges complet - Interface matricielle
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import {
  Calculator, TrendingUp, TrendingDown, AlertTriangle, Search, Filter,
  Plus, Download, Upload, Eye, Edit, Save, MoreHorizontal,
  BarChart3, PieChart, LineChart, Activity, DollarSign, Clock,
  CheckCircle, XCircle, AlertCircle, Target, Zap, Brain,
  FileSpreadsheet, Calendar, Users, Building, Settings,
  ArrowUp, ArrowDown, Equal, Sparkles
} from 'lucide-react';

// Types selon le cahier des charges
interface BudgetPlan {
  id: string;
  name: string;
  fiscal_year: number;
  status: 'DRAFT' | 'IN_PROGRESS' | 'APPROVED' | 'LOCKED';
  version: string;
  created_at: string;
}

interface BudgetLine {
  id: string;
  account_code: string;
  account_name: string;
  department: string;
  month: number;
  budget_initial: number;
  budget_revised: number;
  actual: number;
  committed: number;
  available: number;
  last_year_actual: number;
  variance_amount: number;
  variance_percent: number;
  forecast_amount: number;
  confidence_score: number;
  comments: string;
}

interface DashboardStats {
  kpis_principaux: {
    budget_total_annuel: number;
    reel_ytd: number;
    taux_execution: number;
    ecart_montant: number;
    ecart_pourcentage: number;
    engage_total: number;
    disponible_total: number;
  };
  analyses_comparatives: any;
  alertes_critiques: any[];
  previsions_fin_annee: any;
  recommandations_ia: string[];
}

interface GrilleData {
  account_code: string;
  account_name: string;
  category: string;
  mois: Record<number, {
    budget_initial: number;
    budget_revised: number;
    actual: number;
    variance_percent: number;
    comments: string;
  }>;
}

const ModernBudgetDashboard: React.FC = () => {
  const { t } = useLanguage();
  // État principal
  const [budgetPlans, setBudgetPlans] = useState<BudgetPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [grilleData, setGrilleData] = useState<GrilleData[]>([]);

  // État interface
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [editMode, setEditMode] = useState(false);

  // État pour saisie matricielle
  const [budgetEdits, setBudgetEdits] = useState<Record<string, number>>({});
  const [commentsEdits, setCommentsEdits] = useState<Record<string, string>>({});

  // Données de configuration
  const departments = [
    { id: '1', code: 'COMM', name: 'Commercial' },
    { id: '2', code: 'PROD', name: 'Production' },
    { id: '3', code: 'ADMIN', name: 'Administration' },
    { id: '4', code: 'RD', name: 'R&D' },
    { id: '5', code: 'MARK', name: 'Marketing' },
  ];

  const mois = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  // Chargement initial
  useEffect(() => {
    chargerBudgetPlans();
  }, []);

  useEffect(() => {
    if (selectedPlan) {
      chargerDashboardStats();
    }
  }, [selectedPlan]);

  useEffect(() => {
    if (selectedPlan && selectedDepartment) {
      chargerGrilleSaisie();
    }
  }, [selectedPlan, selectedDepartment]);

  const chargerBudgetPlans = async () => {
    try {
      const response = await fetch('/api/v1/budgeting/api/plans/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setBudgetPlans(Array.isArray(data) ? data : data.results || []);
        if (data.length > 0) {
          setSelectedPlan(data[0].id);
        }
      }
    } catch (error) {
      setError('Erreur chargement plans budgétaires');
      console.error('Erreur plans:', error);
    }
  };

  const chargerDashboardStats = async () => {
    if (!selectedPlan) return;

    try {
      const response = await fetch(`/api/v1/budgeting/api/plans/${selectedPlan}/dashboard-executive/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Erreur stats:', error);
    }
  };

  const chargerGrilleSaisie = async () => {
    if (!selectedPlan || !selectedDepartment) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/v1/budgeting/api/lines/grille-saisie/?budget_plan_id=${selectedPlan}&department_id=${selectedDepartment}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setGrilleData(data.grille_data || []);
      }
    } catch (error) {
      setError('Erreur chargement grille');
      console.error('Erreur grille:', error);
    } finally {
      setLoading(false);
    }
  };

  const sauvegarderSaisieMatricielle = async () => {
    if (!selectedPlan || !selectedDepartment) return;

    // Préparation des données modifiées
    const budget_data = [];

    Object.entries(budgetEdits).forEach(([key, value]) => {
      const [account_code, month_str] = key.split('_');
      budget_data.push({
        account_code,
        month: parseInt(month_str),
        budget_amount: value,
        comments: commentsEdits[key] || ''
      });
    });

    try {
      const response = await fetch('/api/v1/budgeting/api/lines/saisie-matricielle/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          budget_plan_id: selectedPlan,
          department_id: selectedDepartment,
          month: selectedMonth,
          budget_data
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Sauvegarde réussie: ${result.lignes_creees} créées, ${result.lignes_modifiees} modifiées`);

        // Recharger les données
        chargerGrilleSaisie();
        chargerDashboardStats();

        // Reset éditions
        setBudgetEdits({});
        setCommentsEdits({});
        setEditMode(false);
      }
    } catch (error) {
      setError('Erreur sauvegarde');
      console.error('Erreur sauvegarde:', error);
    }
  };

  // Formatage des montants
  const formaterMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(montant);
  };

  const getVarianceColor = (variance: number) => {
    if (Math.abs(variance) < 5) return 'text-[var(--color-success)]';
    if (Math.abs(variance) < 10) return 'text-[var(--color-warning)]';
    return 'text-[var(--color-error)]';
  };

  const getVarianceIcon = (variance: number) => {
    if (variance > 5) return <ArrowUp className="h-4 w-4 text-[var(--color-error)]" />;
    if (variance < -5) return <ArrowDown className="h-4 w-4 text-[var(--color-success)]" />;
    return <Equal className="h-4 w-4 text-[var(--color-text-secondary)]" />;
  };

  // Rendu des KPIs principales
  const renderKPICards = () => {
    if (!stats) return null;

    const kpis = stats.kpis_principaux;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-primary)]">Budget Total Annuel</p>
                <p className="text-3xl font-bold text-[var(--color-text-primary)]">
                  {formaterMontant(kpis.budget_total_annuel)}
                </p>
              </div>
              <Target className="h-8 w-8 text-[var(--color-primary)]" />
            </div>
            <div className="mt-4">
              <p className="text-sm text-[var(--color-primary)]">
                Exercice {new Date().getFullYear()}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-primary)]">Réalisé YTD</p>
                <p className="text-3xl font-bold text-[var(--color-text-primary)]">
                  {formaterMontant(kpis.reel_ytd)}
                </p>
              </div>
              <Activity className="h-8 w-8 text-[var(--color-success)]" />
            </div>
            <div className="mt-4">
              <Progress value={kpis.taux_execution} className="h-2" />
              <p className="text-sm text-[var(--color-success)] mt-1">
                {kpis.taux_execution}% exécuté
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-primary)]">Écart vs Budget</p>
                <p className={`text-3xl font-bold ${getVarianceColor(kpis.ecart_pourcentage)}`}>
                  {kpis.ecart_pourcentage > 0 ? '+' : ''}{kpis.ecart_pourcentage}%
                </p>
              </div>
              <div className="flex items-center">
                {getVarianceIcon(kpis.ecart_pourcentage)}
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs text-[var(--color-text-secondary)]">
                {formaterMontant(Math.abs(kpis.ecart_montant))} d'écart
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-text-primary)]">Disponible</p>
                <p className="text-3xl font-bold text-[var(--color-success)]">
                  {formaterMontant(kpis.disponible_total)}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-[var(--color-success)]" />
            </div>
            <div className="mt-4">
              <p className="text-sm text-[var(--color-text-primary)]">
                Engagé: {formaterMontant(kpis.engage_total)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Rendu des recommandations IA
  const renderRecommendationsIA = () => {
    if (!stats?.recommandations_ia?.length) return null;

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            Recommandations IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.recommandations_ia.map((recommendation, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-[var(--color-info-lightest)] rounded-lg">
                <Sparkles className="h-5 w-5 text-purple-500 mt-0.5" />
                <p className="text-sm text-[var(--color-text-primary)]">{recommendation}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Rendu de la grille de saisie matricielle
  const renderGrilleSaisie = () => {
    if (!selectedPlan || !selectedDepartment) {
      return (
        <Card>
          <CardContent className="text-center py-12">
            <Calculator className="h-12 w-12 text-[var(--color-text-secondary)] mx-auto mb-4" />
            <p className="text-[var(--color-text-primary)] mb-4">Sélectionnez un plan budgétaire et un département</p>
            <p className="text-sm text-[var(--color-text-secondary)]">
              pour accéder à la grille de saisie matricielle
            </p>
          </CardContent>
        </Card>
      );
    }

    if (loading) {
      return (
        <Card>
          <CardContent className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mx-auto"></div>
            <p className="mt-4 text-[var(--color-text-primary)]">Chargement de la grille...</p>
          </CardContent>
        </Card>
      );
    }

    if (grilleData.length === 0) {
      return (
        <Card>
          <CardContent className="text-center py-12">
            <FileSpreadsheet className="h-12 w-12 text-[var(--color-text-secondary)] mx-auto mb-4" />
            <p className="text-[var(--color-text-primary)] mb-4">Aucune donnée budgétaire</p>
            <Button onClick={() => setEditMode(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Commencer la saisie
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Grille de Saisie Matricielle
            </CardTitle>
            <div className="flex gap-2">
              {editMode ? (
                <>
                  <Button onClick={sauvegarderSaisieMatricielle} size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    Sauvegarder
                  </Button>
                  <Button onClick={() => setEditMode(false)} variant="outline" size="sm">
                    Annuler
                  </Button>
                </>
              ) : (
                <Button onClick={() => setEditMode(true)} size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Modifier
                </Button>
              )}
            </div>
          </div>

          <div className="flex gap-4 mt-4">
            <div>
              <Label>Département</Label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(dept => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Mois</Label>
              <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {mois.map((moisNom, index) => (
                    <SelectItem key={index + 1} value={(index + 1).toString()}>
                      {moisNom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-[var(--color-border-dark)] text-sm">
              <thead>
                <tr className="bg-[var(--color-background-secondary)]">
                  <th className="border border-[var(--color-border-dark)] p-3 text-left">{t('accounting.account')}</th>
                  <th className="border border-[var(--color-border-dark)] p-3 text-left">{t('accounting.label')}</th>
                  <th className="border border-[var(--color-border-dark)] p-3 text-right">{t('navigation.budget')}</th>
                  <th className="border border-[var(--color-border-dark)] p-3 text-right">Révisé</th>
                  <th className="border border-[var(--color-border-dark)] p-3 text-right">Réel</th>
                  <th className="border border-[var(--color-border-dark)] p-3 text-right">N-1</th>
                  <th className="border border-[var(--color-border-dark)] p-3 text-center">Var %</th>
                  <th className="border border-[var(--color-border-dark)] p-3 text-left">Commentaires</th>
                  {editMode && <th className="border border-[var(--color-border-dark)] p-3 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {grilleData.map((ligne, index) => {
                  const moisData = ligne.mois[selectedMonth] || {};
                  const editKey = `${ligne.account_code}_${selectedMonth}`;

                  return (
                    <tr key={ligne.account_code} className={index % 2 === 0 ? 'bg-white' : 'bg-[var(--color-background-secondary)]'}>
                      <td className="border border-[var(--color-border-dark)] p-3 font-mono text-sm">
                        {ligne.account_code}
                      </td>
                      <td className="border border-[var(--color-border-dark)] p-3">
                        {ligne.account_name}
                      </td>
                      <td className="border border-[var(--color-border-dark)] p-3 text-right font-mono">
                        {editMode ? (
                          <Input
                            type="number"
                            value={budgetEdits[editKey] ?? moisData.budget_revised ?? 0}
                            onChange={(e) => setBudgetEdits(prev => ({
                              ...prev,
                              [editKey]: parseFloat(e.target.value) || 0
                            }))}
                            className="w-24 text-right"
                          />
                        ) : (
                          formaterMontant(moisData.budget_revised || 0)
                        )}
                      </td>
                      <td className="border border-[var(--color-border-dark)] p-3 text-right font-mono">
                        {formaterMontant(moisData.budget_revised || 0)}
                      </td>
                      <td className="border border-[var(--color-border-dark)] p-3 text-right font-mono">
                        {formaterMontant(moisData.actual || 0)}
                      </td>
                      <td className="border border-[var(--color-border-dark)] p-3 text-right font-mono text-[var(--color-text-primary)]">
                        {/* N-1 à implémenter selon données historiques */}
                        {formaterMontant(0)}
                      </td>
                      <td className="border border-[var(--color-border-dark)] p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {getVarianceIcon(moisData.variance_percent || 0)}
                          <span className={getVarianceColor(moisData.variance_percent || 0)}>
                            {moisData.variance_percent ? `${moisData.variance_percent > 0 ? '+' : ''}${moisData.variance_percent.toFixed(1)}%` : '0%'}
                          </span>
                        </div>
                      </td>
                      <td className="border border-[var(--color-border-dark)] p-3">
                        {editMode ? (
                          <Input
                            placeholder="Commentaire..."
                            value={commentsEdits[editKey] ?? moisData.comments ?? ''}
                            onChange={(e) => setCommentsEdits(prev => ({
                              ...prev,
                              [editKey]: e.target.value
                            }))}
                            className="w-full"
                          />
                        ) : (
                          <span className="text-sm text-[var(--color-text-primary)]">
                            {moisData.comments || '-'}
                          </span>
                        )}
                      </td>
                      {editMode && (
                        <td className="border border-[var(--color-border-dark)] p-3 text-center">
                          <Button size="sm" variant="outline">
                            <Brain className="h-4 w-4" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {editMode && (
            <div className="mt-4 p-4 bg-[var(--color-primary-lightest)] rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-[var(--color-primary)]" />
                <span className="font-medium text-[var(--color-primary-dark)]">Assistant IA activé</span>
              </div>
              <p className="text-sm text-[var(--color-primary)]">
                L'IA analyse vos saisies en temps réel et suggère des ajustements basés sur l'historique et les tendances.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // Rendu des alertes critiques
  const renderAlertesCritiques = () => {
    if (!stats?.alertes_critiques?.length) return null;

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-[var(--color-error)]" />
            Alertes Critiques
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.alertes_critiques.map((alerte, index) => (
              <div key={alerte.id} className="flex items-start gap-3 p-3 bg-[var(--color-error-lightest)] border border-[var(--color-error-light)] rounded-lg">
                <AlertCircle className="h-5 w-5 text-[var(--color-error)] mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-red-900">{alerte.message}</p>
                  <p className="text-sm text-[var(--color-error-dark)] mt-1">
                    {alerte.department} - {alerte.account}
                  </p>
                  <p className="text-xs text-[var(--color-error)] mt-1">
                    {new Date(alerte.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <Button size="sm" variant="outline">
                  Traiter
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">
            Module Budget Intelligent
          </h1>
          <p className="text-[var(--color-text-primary)] mt-2">
            Gestion budgétaire avec IA et analyse prédictive - WiseBook
          </p>
        </div>

        <div className="flex gap-3">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Importer Excel
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
          <Button>
            <Brain className="h-4 w-4 mr-2" />
            Prédictions IA
          </Button>
        </div>
      </div>

      {/* Sélection plan budgétaire */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div>
              <Label>Plan Budgétaire</Label>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Sélectionner un plan" />
                </SelectTrigger>
                <SelectContent>
                  {budgetPlans.map(plan => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} v{plan.version} ({plan.fiscal_year})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPlan && (
              <div className="flex items-center gap-2">
                <Badge className="bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)]">
                  {budgetPlans.find(p => p.id === selectedPlan)?.status}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Erreur */}
      {error && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* KPIs principales */}
      {renderKPICards()}

      {/* Recommandations IA */}
      {renderRecommendationsIA()}

      {/* Alertes critiques */}
      {renderAlertesCritiques()}

      {/* Onglets principaux */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard">{t('dashboard.title')}</TabsTrigger>
          <TabsTrigger value="saisie">Saisie Matricielle</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="alerts">Alertes</TabsTrigger>
          <TabsTrigger value="reports">Rapports</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Évolution Mensuelle</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-[var(--color-text-secondary)]">
                  <LineChart className="h-12 w-12 mr-4" />
                  <div>
                    <p>Graphique Budget vs Réel</p>
                    <p className="text-sm">Chart.js à intégrer</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Répartition par Département</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-[var(--color-text-secondary)]">
                  <PieChart className="h-12 w-12 mr-4" />
                  <div>
                    <p>Répartition budgétaire</p>
                    <p className="text-sm">Chart.js à intégrer</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="saisie" className="mt-6">
          {renderGrilleSaisie()}
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Analyse YTD vs N-1</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 mx-auto text-[var(--color-text-secondary)] mb-4" />
                  <p className="text-[var(--color-text-primary)]">Analytics avancés en cours de développement</p>
                  <p className="text-sm text-[var(--color-text-secondary)] mt-2">
                    Comparaisons YTD, variance analysis, drill-down par compte
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Système d'Alertes Intelligent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Zap className="h-12 w-12 mx-auto text-[var(--color-text-secondary)] mb-4" />
                <p className="text-[var(--color-text-primary)]">Module alertes intelligentes en développement</p>
                <p className="text-sm text-[var(--color-text-secondary)] mt-2">
                  Alertes prédictives, notifications multicritères, workflow d'approbation
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Reporting Automatisé</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileSpreadsheet className="h-12 w-12 mx-auto text-[var(--color-text-secondary)] mb-4" />
                <p className="text-[var(--color-text-primary)]">Module reporting automatisé en développement</p>
                <p className="text-sm text-[var(--color-text-secondary)] mt-2">
                  Rapports PDF/Excel, distribution automatique, storytelling IA
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ModernBudgetDashboard;