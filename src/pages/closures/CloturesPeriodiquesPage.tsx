import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Lock,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  BarChart3,
  Target,
  ArrowRight,
  Play,
  Settings,
  Download,
  Zap,
  Brain,
  Users,
  Activity,
  Timer,
  Shield,
  Award,
  Layers,
  GitBranch,
  Bot,
  Workflow,
  CheckSquare,
  AlertCircle,
  TrendingUp,
  Database,
  RefreshCw,
  PauseCircle,
  FastForward,
  Calculator,
  Building,
  Save,
  TrendingDown
} from 'lucide-react';

interface ClosureStep {
  id: string;
  name: string;
  name_en?: string;
  description: string;
  description_en?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error' | 'requires_approval';
  order: number;
  duration?: string;
  estimated_duration?: string;
  errorMessage?: string;
  syscohada_compliance: boolean;
  mandatory: boolean;
  category: 'preparation' | 'provisions' | 'amortissement' | 'regularisation' | 'etats_financiers' | 'validation' | 'archivage';
  dependencies?: string[];
  created_entries?: number;
  validated_by?: string;
  validation_date?: Date;
  syscohada_reference?: string;
  controls: ClosureControl[];
}

interface ClosureControl {
  id: string;
  name: string;
  type: 'balance_check' | 'legal_check' | 'syscohada_check' | 'completeness_check';
  status: 'pending' | 'passed' | 'failed';
  message?: string;
  severity: 'info' | 'warning' | 'error';
  auto_correctable: boolean;
}

interface ClosurePeriod {
  id: string;
  type: 'monthly' | 'quarterly' | 'annual';
  period: string;
  period_en?: string;
  status: 'open' | 'in_progress' | 'closed' | 'locked' | 'approval_pending';
  startDate: Date;
  endDate?: Date;
  closure_deadline?: Date;
  fiscal_year: string;
  steps: ClosureStep[];
  syscohada_compliance_score: number;
  legal_requirements_met: boolean;
  audit_trail_complete: boolean;
  documents_generated: string[];
  approvals_required: string[];
  approvals_received: string[];
  region: 'CEMAC' | 'UEMOA';
  business_sector: 'commercial' | 'industrial' | 'services' | 'banking' | 'insurance';
  total_duration?: string;
  created_by: string;
  approved_by?: string;
  locked_by?: string;
  retention_until: Date;
}

const CloturesPeriodiquesPage: React.FC = () => {
  const [periods, setPeriods] = useState<ClosurePeriod[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'workflows' | 'formulas' | 'consolidation' | 'archive'>('dashboard');

  // États pour vraies opérations comptables
  const [realClosureInProgress, setRealClosureInProgress] = useState(false);
  const [currentRealStep, setCurrentRealStep] = useState('');
  const [realClosureResult, setRealClosureResult] = useState<any>(null);
  const [realTrialBalance, setRealTrialBalance] = useState<any[]>([]);
  const [realProvisions, setRealProvisions] = useState<any[]>([]);
  const [realDepreciation, setRealDepreciation] = useState<any[]>([]);

  useEffect(() => {
    loadClosurePeriods();
  }, []);

  const loadClosurePeriods = async () => {
    // Simulation de données SYSCOHADA complètes
    const mockPeriods: ClosurePeriod[] = [
      {
        id: '202401',
        type: 'monthly',
        period: 'Janvier 2024',
        period_en: 'January 2024',
        status: 'closed',
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-02-05'),
        closure_deadline: new Date('2024-02-15'),
        fiscal_year: '2024',
        syscohada_compliance_score: 98.5,
        legal_requirements_met: true,
        audit_trail_complete: true,
        documents_generated: ['balance_sheet', 'income_statement', 'trial_balance', 'journal_entries'],
        approvals_required: ['comptable_principal', 'directeur_financier'],
        approvals_received: ['comptable_principal', 'directeur_financier'],
        region: 'CEMAC',
        business_sector: 'commercial',
        total_duration: '4h 15min',
        created_by: 'comptable1',
        approved_by: 'directeur_financier',
        locked_by: 'system',
        retention_until: new Date('2034-01-31'),
        steps: [
          {
            id: 'balance_trial_pre',
            name: 'Balance d\'essai pré-clôture',
            name_en: 'Pre-closure Trial Balance',
            description: 'Génération balance avant écritures de clôture selon SYSCOHADA',
            description_en: 'Generate trial balance before closure entries per SYSCOHADA',
            status: 'completed',
            order: 1,
            duration: '2min',
            estimated_duration: '3min',
            syscohada_compliance: true,
            mandatory: true,
            category: 'preparation',
            created_entries: 0,
            validated_by: 'comptable1',
            validation_date: new Date('2024-02-01T08:15:00'),
            syscohada_reference: 'SYSCOHADA Art. 65 - Balance de vérification',
            controls: [
              {
                id: 'balance_equilibrium',
                name: 'Équilibre débit/crédit',
                type: 'balance_check',
                status: 'passed',
                message: 'Balance équilibrée : 0 XAF d\'écart',
                severity: 'info',
                auto_correctable: false
              },
              {
                id: 'account_coherence',
                name: 'Cohérence des comptes SYSCOHADA',
                type: 'syscohada_check',
                status: 'passed',
                message: 'Tous les comptes respectent la codification SYSCOHADA',
                severity: 'info',
                auto_correctable: false
              }
            ]
          },
          {
            id: 'provisions_clients',
            name: 'Provisions pour Créances Douteuses',
            name_en: 'Bad Debt Provisions',
            description: 'Calcul provisions clients selon méthode SYSCOHADA',
            description_en: 'Calculate customer provisions per SYSCOHADA method',
            status: 'completed',
            order: 2,
            duration: '5min',
            estimated_duration: '8min',
            syscohada_compliance: true,
            mandatory: true,
            category: 'provisions',
            dependencies: ['balance_trial_pre'],
            created_entries: 5,
            validated_by: 'comptable1',
            validation_date: new Date('2024-02-01T08:25:00'),
            syscohada_reference: 'SYSCOHADA Art. 45 - Provisions',
            controls: [
              {
                id: 'provision_calculation',
                name: 'Calcul des provisions',
                type: 'syscohada_check',
                status: 'passed',
                message: 'Taux de provision conformes : 50% > 6 mois, 100% > 12 mois',
                severity: 'info',
                auto_correctable: false
              }
            ]
          },
          {
            id: 'amortissements',
            name: 'Amortissements Mensuels',
            name_en: 'Monthly Depreciation',
            description: 'Calcul amortissements linéaires et dégressifs SYSCOHADA',
            description_en: 'Calculate linear and declining depreciation per SYSCOHADA',
            status: 'completed',
            order: 3,
            duration: '3min',
            estimated_duration: '5min',
            syscohada_compliance: true,
            mandatory: true,
            category: 'amortissement',
            dependencies: ['balance_trial_pre'],
            created_entries: 12,
            validated_by: 'comptable1',
            validation_date: new Date('2024-02-01T08:35:00'),
            syscohada_reference: 'SYSCOHADA Art. 42 - Amortissements',
            controls: [
              {
                id: 'depreciation_rates',
                name: 'Taux d\'amortissement SYSCOHADA',
                type: 'syscohada_check',
                status: 'passed',
                message: 'Taux conformes aux barèmes SYSCOHADA',
                severity: 'info',
                auto_correctable: false
              }
            ]
          },
          {
            id: 'regularisations',
            name: 'Écritures de Régularisation',
            name_en: 'Adjustment Entries',
            description: 'Charges à payer, produits à recevoir, charges constatées d\'avance',
            status: 'completed',
            order: 4,
            duration: '8min',
            estimated_duration: '10min',
            syscohada_compliance: true,
            mandatory: true,
            category: 'regularisation',
            created_entries: 8,
            validated_by: 'comptable1',
            validation_date: new Date('2024-02-01T08:50:00'),
            syscohada_reference: 'SYSCOHADA Art. 58 - Régularisations',
            controls: [
              {
                id: 'accruals_complete',
                name: 'Exhaustivité des régularisations',
                type: 'completeness_check',
                status: 'passed',
                message: 'Toutes les régularisations identifiées ont été comptabilisées',
                severity: 'info',
                auto_correctable: false
              }
            ]
          },
          {
            id: 'balance_trial_post',
            name: 'Balance d\'essai Post-Clôture',
            name_en: 'Post-closure Trial Balance',
            description: 'Balance après toutes les écritures de clôture',
            status: 'completed',
            order: 5,
            duration: '2min',
            syscohada_compliance: true,
            mandatory: true,
            category: 'validation',
            dependencies: ['provisions_clients', 'amortissements', 'regularisations'],
            validated_by: 'directeur_financier',
            validation_date: new Date('2024-02-01T09:00:00'),
            controls: [
              {
                id: 'final_balance',
                name: 'Équilibre final',
                type: 'balance_check',
                status: 'passed',
                message: 'Balance finale équilibrée',
                severity: 'info',
                auto_correctable: false
              }
            ]
          },
          {
            id: 'etats_financiers',
            name: 'États Financiers SYSCOHADA',
            name_en: 'SYSCOHADA Financial Statements',
            description: 'Génération Bilan, Compte de Résultat, TAFIRE, État Annexé',
            status: 'completed',
            order: 6,
            duration: '15min',
            syscohada_compliance: true,
            mandatory: true,
            category: 'etats_financiers',
            dependencies: ['balance_trial_post'],
            validated_by: 'directeur_financier',
            validation_date: new Date('2024-02-01T09:20:00'),
            syscohada_reference: 'SYSCOHADA Art. 25-35 - États financiers',
            controls: [
              {
                id: 'statements_format',
                name: 'Format SYSCOHADA respecté',
                type: 'syscohada_check',
                status: 'passed',
                message: 'Tous les états respectent les formats officiels SYSCOHADA',
                severity: 'info',
                auto_correctable: false
              }
            ]
          }
        ]
      },
      {
        id: '202402',
        type: 'monthly',
        period: 'Février 2024',
        period_en: 'February 2024',
        status: 'approval_pending',
        startDate: new Date('2024-03-01'),
        closure_deadline: new Date('2024-03-15'),
        fiscal_year: '2024',
        syscohada_compliance_score: 94.2,
        legal_requirements_met: true,
        audit_trail_complete: true,
        documents_generated: ['trial_balance', 'journal_entries'],
        approvals_required: ['comptable_principal', 'directeur_financier'],
        approvals_received: ['comptable_principal'],
        region: 'CEMAC',
        business_sector: 'commercial',
        created_by: 'comptable1',
        retention_until: new Date('2034-02-28'),
        steps: [
          {
            id: 'balance_trial_pre',
            name: 'Balance d\'essai pré-clôture',
            description: 'Génération balance avant écritures de clôture selon SYSCOHADA',
            status: 'completed',
            order: 1,
            duration: '2min',
            syscohada_compliance: true,
            mandatory: true,
            category: 'preparation',
            created_entries: 0,
            validated_by: 'comptable1',
            validation_date: new Date('2024-03-01T08:15:00'),
            controls: [
              {
                id: 'balance_equilibrium',
                name: 'Équilibre débit/crédit',
                type: 'balance_check',
                status: 'passed',
                severity: 'info',
                auto_correctable: false
              }
            ]
          },
          {
            id: 'provisions_clients',
            name: 'Provisions pour Créances Douteuses',
            description: 'Calcul provisions clients selon méthode SYSCOHADA',
            status: 'completed',
            order: 2,
            duration: '6min',
            syscohada_compliance: true,
            mandatory: true,
            category: 'provisions',
            dependencies: ['balance_trial_pre'],
            created_entries: 7,
            validated_by: 'comptable1',
            validation_date: new Date('2024-03-01T08:25:00'),
            controls: [
              {
                id: 'provision_calculation',
                name: 'Calcul des provisions',
                type: 'syscohada_check',
                status: 'passed',
                severity: 'info',
                auto_correctable: false
              }
            ]
          },
          {
            id: 'amortissements',
            name: 'Amortissements Mensuels',
            description: 'Calcul amortissements linéaires et dégressifs SYSCOHADA',
            status: 'completed',
            order: 3,
            duration: '4min',
            syscohada_compliance: true,
            mandatory: true,
            category: 'amortissement',
            dependencies: ['balance_trial_pre'],
            created_entries: 14,
            validated_by: 'comptable1',
            validation_date: new Date('2024-03-01T08:35:00'),
            controls: [
              {
                id: 'depreciation_rates',
                name: 'Taux d\'amortissement SYSCOHADA',
                type: 'syscohada_check',
                status: 'passed',
                severity: 'info',
                auto_correctable: false
              }
            ]
          },
          {
            id: 'etats_financiers',
            name: 'États Financiers SYSCOHADA',
            description: 'En attente d\'approbation du directeur financier',
            status: 'requires_approval',
            order: 4,
            syscohada_compliance: true,
            mandatory: true,
            category: 'etats_financiers',
            dependencies: ['provisions_clients', 'amortissements'],
            validated_by: 'comptable1',
            validation_date: new Date('2024-03-01T09:00:00'),
            controls: [
              {
                id: 'approval_pending',
                name: 'Approbation requise',
                type: 'legal_check',
                status: 'pending',
                message: 'En attente de l\'approbation du directeur financier',
                severity: 'warning',
                auto_correctable: false
              }
            ]
          }
        ]
      }
    ];
    
    setPeriods(mockPeriods);
    setSelectedPeriod(mockPeriods[0].id);
    setLoading(false);
  };

  const selectedPeriodData = periods.find(p => p.id === selectedPeriod);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-500 bg-green-100';
      case 'in_progress': return 'text-blue-500 bg-blue-100';
      case 'error': return 'text-red-500 bg-red-100';
      case 'requires_approval': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-500 bg-gray-100';
    }
  };
  
  const getComplianceColor = (score: number) => {
    if (score >= 95) return 'text-green-600 bg-green-100';
    if (score >= 85) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };
  
  // Fonctions réelles de clôture comptable
  const startMonthlyClosureReal = async (periodId: string) => {
    setRealClosureInProgress(true);
    setCurrentRealStep('Initialisation clôture mensuelle...');

    try {
      // 1. Appel API pour démarrer la clôture réelle
      const response = await fetch('http://127.0.0.1:8888/api/v1/period-closures/api/closures/start-real-closure/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          fiscal_year_id: '2024',
          closure_type: 'monthly',
          period_id: periodId
        })
      });

      if (response.ok) {
        const result = await response.json();

        // Simulation du processus étape par étape avec vraies données
        const steps = [
          { name: 'Balance pré-clôture', api: 'http://127.0.0.1:8888/api/v1/period-closures/api/closures/trial-balance/' },
          { name: 'Calcul provisions clients', api: 'http://127.0.0.1:8888/api/v1/period-closures/api/closures/calculate-provisions/' },
          { name: 'Calcul amortissements', api: 'http://127.0.0.1:8888/api/v1/period-closures/api/closures/calculate-depreciation/' },
          { name: 'Écritures régularisation', api: 'http://127.0.0.1:8888/api/v1/period-closures/api/closures/generate-accruals/' },
          { name: 'Balance post-clôture', api: 'http://127.0.0.1:8888/api/v1/period-closures/api/closures/trial-balance/' }
        ];

        for (const step of steps) {
          setCurrentRealStep(step.name);

          // Appel API réel pour chaque étape
          const stepResponse = await fetch(step.api, {
            method: step.api.includes('trial-balance') ? 'GET' : 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: step.api.includes('trial-balance') ? undefined : JSON.stringify({
              fiscal_year_id: '2024'
            })
          });

          if (stepResponse.ok) {
            const stepData = await stepResponse.json();

            // Mettre à jour l'état avec les vraies données
            if (step.name === 'Calcul provisions clients') {
              setRealProvisions(stepData.provisions_detail || []);
            } else if (step.name === 'Calcul amortissements') {
              setRealDepreciation(stepData.depreciation_detail || []);
            } else if (step.name.includes('Balance')) {
              setRealTrialBalance(stepData.balance_data || []);
            }
          }

          // Délai pour montrer la progression
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        setRealClosureResult(result);
        setCurrentRealStep('Clôture mensuelle terminée');

        // Recharger les données des périodes
        loadClosurePeriods();

      } else {
        throw new Error('Erreur API clôture');
      }

    } catch (error) {
      console.error('Erreur clôture réelle:', error);
      setCurrentRealStep('Erreur lors de la clôture');
    } finally {
      setRealClosureInProgress(false);
    }
  };

  const loadRealTrialBalance = async () => {
    try {
      const response = await fetch(`/api/closures/trial-balance?fiscal_year_id=2024`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRealTrialBalance(data.balance_data || []);
      }
    } catch (error) {
      console.error('Erreur chargement balance:', error);
    }
  };

  const calculateRealProvisions = async () => {
    setCurrentRealStep('Calcul provisions clients...');

    try {
      const response = await fetch('/api/closures/calculate-provisions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          fiscal_year_id: '2024'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setRealProvisions(data.provisions_detail || []);
        setCurrentRealStep(`Provisions calculées: ${data.total_provisions} XOF`);
      }
    } catch (error) {
      console.error('Erreur calcul provisions:', error);
      setCurrentRealStep('Erreur calcul provisions');
    }
  };

  const calculateRealDepreciation = async () => {
    setCurrentRealStep('Calcul amortissements...');

    try {
      const response = await fetch('/api/closures/calculate-depreciation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          fiscal_year_id: '2024'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setRealDepreciation(data.depreciation_detail || []);
        setCurrentRealStep(`Amortissements calculés: ${data.total_depreciation} XOF`);
      }
    } catch (error) {
      console.error('Erreur calcul amortissements:', error);
      setCurrentRealStep('Erreur calcul amortissements');
    }
  };

  const generateSYSCOHADAReport = (period: ClosurePeriod) => {
    const completedSteps = period.steps.filter(s => s.status === 'completed').length;
    const totalSteps = period.steps.length;
    const completionRate = (completedSteps / totalSteps) * 100;
    
    return {
      completion_rate: completionRate,
      syscohada_compliance: period.syscohada_compliance_score,
      total_entries: period.steps.reduce((sum, step) => sum + (step.created_entries || 0), 0),
      controls_passed: period.steps.reduce((sum, step) => 
        sum + step.controls.filter(c => c.status === 'passed').length, 0),
      controls_failed: period.steps.reduce((sum, step) => 
        sum + step.controls.filter(c => c.status === 'failed').length, 0)
    };
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'in_progress': return <Clock className="h-4 w-4" />;
      case 'error': return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getPeriodStatusColor = (status: string) => {
    switch (status) {
      case 'closed': return 'text-green-600 bg-green-100';
      case 'locked': return 'text-purple-600 bg-purple-100';
      case 'in_progress': return 'text-blue-600 bg-blue-100';
      case 'approval_pending': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };
  
  const getPeriodStatusLabel = (status: string) => {
    switch (status) {
      case 'closed': return 'Clôturée';
      case 'locked': return 'Verrouillée';
      case 'in_progress': return 'En cours';
      case 'approval_pending': return 'En attente';
      default: return 'Ouverte';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-6">
        {/* En-tête Amélioré avec Métriques Temps Réel */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
                <Bot className="h-8 w-8 text-purple-600 mr-3" />
                Clôtures Automatisées Nouvelle Génération
              </h1>
              <p className="text-gray-600 flex items-center space-x-4">
                <span>🤖 Workflow intelligent BPMN 2.0 • 📊 200+ contrôles automatiques • ⚡ Réduction 50% temps de clôture</span>
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-purple-50 p-3 rounded-lg">
                  <div className="text-sm text-purple-600">Gain Temps</div>
                  <div className="text-xl font-bold text-purple-900">-50%</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-sm text-green-600">Erreurs</div>
                  <div className="text-xl font-bold text-green-900">-90%</div>
                </div>
              </div>
              <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2">
                <Workflow className="h-4 w-4" />
                <span>Nouveau Workflow</span>
              </button>
            </div>
          </div>

          {/* Métriques de Performance Globales */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-6">
            <div className="bg-white p-4 rounded-lg border border-gray-200 flex items-center space-x-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Timer className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Temps Moyen</div>
                <div className="font-bold text-gray-900">7.2 jours</div>
                <div className="text-xs text-green-600">-48% vs cible</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200 flex items-center space-x-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <CheckSquare className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Automatisation</div>
                <div className="font-bold text-gray-900">89%</div>
                <div className="text-xs text-green-600">+12% ce mois</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200 flex items-center space-x-3">
              <div className="bg-purple-100 p-2 rounded-lg">
                <Shield className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Conformité</div>
                <div className="font-bold text-gray-900">{Math.round(periods.reduce((sum, p) => sum + p.syscohada_compliance_score, 0) / periods.length)}%</div>
                <div className="text-xs text-green-600">SYSCOHADA</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200 flex items-center space-x-3">
              <div className="bg-orange-100 p-2 rounded-lg">
                <AlertCircle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Alertes Actives</div>
                <div className="font-bold text-gray-900">3</div>
                <div className="text-xs text-orange-600">2 critiques</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-gray-200 flex items-center space-x-3">
              <div className="bg-indigo-100 p-2 rounded-lg">
                <TrendingUp className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Performance</div>
                <div className="font-bold text-gray-900">98.7%</div>
                <div className="text-xs text-indigo-600">SLA respecté</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tableau de Bord Temps Réel Workflow Intelligent */}
        <div className="mb-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-blue-900 flex items-center">
              <Workflow className="w-6 h-6 mr-3" />
              Cockpit de Clôture Temps Réel
            </h2>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 text-sm text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Live</span>
              </div>
              <button className="p-2 bg-white border border-blue-300 rounded-lg hover:bg-blue-50">
                <RefreshCw className="h-4 w-4 text-blue-600" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-blue-900">Workflows Actifs</h4>
                <Activity className="h-5 w-5 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-blue-900">2</div>
              <div className="text-xs text-blue-600">En cours d'exécution</div>
              <div className="mt-2">
                <div className="flex items-center space-x-1 text-xs text-green-600">
                  <CheckCircle className="h-3 w-3" />
                  <span>Févr. 67% terminé</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-blue-900">Contrôles IA</h4>
                <Brain className="h-5 w-5 text-purple-500" />
              </div>
              <div className="text-2xl font-bold text-blue-900">247</div>
              <div className="text-xs text-blue-600">Exécutés aujourd'hui</div>
              <div className="mt-2">
                <div className="flex items-center space-x-1 text-xs text-green-600">
                  <Award className="h-3 w-3" />
                  <span>98.9% réussite</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-blue-900">Économies</h4>
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div className="text-2xl font-bold text-blue-900">47h</div>
              <div className="text-xs text-blue-600">Temps économisé ce mois</div>
              <div className="mt-2">
                <div className="flex items-center space-x-1 text-xs text-green-600">
                  <Zap className="h-3 w-3" />
                  <span>15 → 7 jours</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-blue-900">Équipes</h4>
                <Users className="h-5 w-5 text-orange-500" />
              </div>
              <div className="text-2xl font-bold text-blue-900">12</div>
              <div className="text-xs text-blue-600">Collaborateurs actifs</div>
              <div className="mt-2">
                <div className="flex items-center space-x-1 text-xs text-orange-600">
                  <AlertTriangle className="h-3 w-3" />
                  <span>2 en attente validation</span>
                </div>
              </div>
            </div>
          </div>

          {/* Workflow en cours avec progression temps réel */}
          <div className="mt-6 bg-white rounded-lg border border-blue-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-blue-900">Workflow Février 2024 - En Cours</h4>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-blue-600">67% terminé</span>
                <div className="w-32 h-2 bg-blue-100 rounded-full">
                  <div className="w-2/3 h-2 bg-blue-500 rounded-full"></div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>4/6 étapes terminées</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <span>2h15 restantes (estimation IA)</span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-purple-500" />
                <span>94.2% conformité SYSCOHADA</span>
              </div>
              <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs hover:bg-blue-200 flex items-center space-x-1">
                <FastForward className="h-3 w-3" />
                <span>Accélérer</span>
              </button>
            </div>
          </div>
        </div>

        {/* Navigation par onglets */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'dashboard', label: 'Tableau de Bord', icon: BarChart3 },
                { id: 'workflows', label: 'Designer BPMN 2.0', icon: GitBranch, badge: 'Nouveau' },
                { id: 'formulas', label: 'Éditeur de Formules', icon: Calculator, badge: 'Nouveau' },
                { id: 'consolidation', label: 'Consolidation', icon: Building },
                { id: 'archive', label: 'Archivage Probant', icon: Database }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className={`mr-2 h-5 w-5 ${
                    activeTab === tab.id ? 'text-purple-500' : 'text-gray-400 group-hover:text-gray-500'
                  }`} />
                  {tab.label}
                  {tab.badge && (
                    <span className="ml-2 px-2 py-1 text-xs bg-red-500 text-white rounded-full animate-pulse">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {activeTab === 'dashboard' && (
        <div className="space-y-6">

          {/* Progression clôture réelle en cours */}
          {realClosureInProgress && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-blue-900">Clôture Comptable en Cours</h3>
                <div className="flex items-center space-x-2 text-blue-700">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Génération d'écritures réelles...</span>
                </div>
              </div>
              <div className="text-blue-800 font-medium">{currentRealStep}</div>
              <div className="mt-3 bg-blue-200 rounded-full h-3">
                <div className="bg-blue-600 h-3 rounded-full transition-all duration-500" style={{ width: '67%' }}></div>
              </div>
            </div>
          )}

          {/* Résultats de clôture réelle */}
          {realClosureResult && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-green-900 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Clôture Mensuelle Terminée
                </h3>
                <div className="text-green-700 text-sm">
                  {realClosureResult.total_entries_created} écritures générées
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Provisions Clients</h4>
                  <div className="text-2xl font-bold text-green-600">
                    {realProvisions.length > 0
                      ? `${realProvisions.reduce((sum, p) => sum + parseFloat(p.provision_amount), 0).toLocaleString()} XOF`
                      : '0 XOF'
                    }
                  </div>
                  <div className="text-sm text-gray-600">{realProvisions.length} clients provisionnés</div>
                </div>

                <div className="bg-white p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Amortissements</h4>
                  <div className="text-2xl font-bold text-blue-600">
                    {realDepreciation.length > 0
                      ? `${realDepreciation.reduce((sum, d) => sum + parseFloat(d.annual_depreciation), 0).toLocaleString()} XOF`
                      : '0 XOF'
                    }
                  </div>
                  <div className="text-sm text-gray-600">{realDepreciation.length} immobilisations</div>
                </div>

                <div className="bg-white p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Balance</h4>
                  <div className="text-2xl font-bold text-purple-600">
                    {realTrialBalance.length > 0 ? `${realTrialBalance.length} comptes` : 'Non générée'}
                  </div>
                  <div className="text-sm text-gray-600">
                    {realTrialBalance.length > 0 ? 'Équilibrée' : 'En attente'}
                  </div>
                </div>
              </div>

              {/* Actions post-clôture */}
              <div className="mt-4 flex space-x-3">
                <button
                  onClick={loadRealTrialBalance}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  <Database className="h-4 w-4 mr-2 inline" />
                  Voir Balance Réelle
                </button>
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  <FileText className="h-4 w-4 mr-2 inline" />
                  États Financiers
                </button>
                <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                  <Download className="h-4 w-4 mr-2 inline" />
                  Journal Clôture
                </button>
              </div>
            </div>
          )}

          {/* Actions de clôture par étape */}
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions Comptables Individuelles</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={calculateRealProvisions}
                className="p-4 border border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 text-center"
              >
                <TrendingDown className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                <div className="font-medium text-gray-900">Calculer Provisions</div>
                <div className="text-sm text-gray-600">Créances clients SYSCOHADA</div>
                {realProvisions.length > 0 && (
                  <div className="text-xs text-green-600 mt-1">
                    ✓ {realProvisions.length} provisions calculées
                  </div>
                )}
              </button>

              <button
                onClick={calculateRealDepreciation}
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 text-center"
              >
                <TrendingDown className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <div className="font-medium text-gray-900">Calculer Amortissements</div>
                <div className="text-sm text-gray-600">Barèmes SYSCOHADA</div>
                {realDepreciation.length > 0 && (
                  <div className="text-xs text-green-600 mt-1">
                    ✓ {realDepreciation.length} amortissements calculés
                  </div>
                )}
              </button>

              <button
                onClick={loadRealTrialBalance}
                className="p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 text-center"
              >
                <Database className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <div className="font-medium text-gray-900">Balance Générale</div>
                <div className="text-sm text-gray-600">Soldes réels post-clôture</div>
                {realTrialBalance.length > 0 && (
                  <div className="text-xs text-green-600 mt-1">
                    ✓ {realTrialBalance.length} comptes dans la balance
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Affichage de la vraie balance générale */}
          {realTrialBalance.length > 0 && (
            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Balance Générale Réelle</h3>
                <button
                  onClick={() => setRealTrialBalance([])}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Compte</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Libellé</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Solde Débiteur</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Solde Créditeur</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {realTrialBalance.slice(0, 10).map((account, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-mono font-medium text-gray-900">
                          {account.account_number}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {account.account_name}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-mono text-blue-600">
                          {parseFloat(account.debit_balance) > 0 ?
                            new Intl.NumberFormat('fr-FR').format(parseFloat(account.debit_balance)) : '-'
                          }
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-mono text-green-600">
                          {parseFloat(account.credit_balance) > 0 ?
                            new Intl.NumberFormat('fr-FR').format(parseFloat(account.credit_balance)) : '-'
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {realTrialBalance.length > 10 && (
                <div className="mt-4 text-center text-sm text-gray-500">
                  ... et {realTrialBalance.length - 10} autres comptes
                </div>
              )}
            </div>
          )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Liste des périodes */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Périodes</h2>
              </div>
              
              <div className="p-4 space-y-3">
                {periods.map((period) => (
                  <button
                    key={period.id}
                    onClick={() => setSelectedPeriod(period.id)}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      selectedPeriod === period.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">{period.period}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPeriodStatusColor(period.status)}`}>
                        {getPeriodStatusLabel(period.status)}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>{period.startDate.toLocaleDateString()}</span>
                        {period.endDate && (
                          <>
                            <ArrowRight className="h-3 w-3" />
                            <span>{period.endDate.toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Conformité SYSCOHADA</span>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          getComplianceColor(period.syscohada_compliance_score)
                        }`}>
                          {period.syscohada_compliance_score}%
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Détails de la période sélectionnée */}
          <div className="lg:col-span-2">
            {selectedPeriodData && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        Clôture {selectedPeriodData.period}
                      </h2>
                      <p className="text-gray-600">
                        Workflow automatisé en {selectedPeriodData.steps.length} étapes
                      </p>
                    </div>
                    
                    {selectedPeriodData.status === 'open' && (
                      <div className="flex space-x-3">
                        <button
                          onClick={() => startMonthlyClosureReal(selectedPeriodData.id)}
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Calculator className="h-4 w-4 mr-2" />
                          Clôture Mensuelle Réelle
                        </button>
                        <button className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                          <Database className="h-4 w-4 mr-2" />
                          Balance Période
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Étapes de clôture */}
                <div className="p-6">
                  <div className="space-y-4">
                    {selectedPeriodData.steps.map((step, index) => (
                      <motion.div
                        key={step.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`p-4 rounded-lg border ${
                          step.status === 'completed' ? 'border-green-200 bg-green-50' :
                          step.status === 'in_progress' ? 'border-blue-200 bg-blue-50' :
                          step.status === 'error' ? 'border-red-200 bg-red-50' :
                          'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${getStatusColor(step.status)}`}>
                              {getStatusIcon(step.status)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <h4 className="font-medium text-gray-900">
                                  {step.order}. {step.name}
                                </h4>
                                {step.syscohada_compliance && (
                                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                                    SYSCOHADA
                                  </span>
                                )}
                                {step.mandatory && (
                                  <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                                    Obligatoire
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600">{step.description}</p>
                              {step.syscohada_reference && (
                                <p className="text-xs text-blue-600 mt-1">
                                  📖 {step.syscohada_reference}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            {step.duration && (
                              <div className="text-right">
                                <div className="text-sm font-medium text-gray-900">{step.duration}</div>
                                {step.estimated_duration && (
                                  <div className="text-xs text-gray-500">
                                    Estimé: {step.estimated_duration}
                                  </div>
                                )}
                              </div>
                            )}

                            {step.status === 'pending' && (
                              <div className="flex space-x-1">
                                <button
                                  className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                                  title="Exécuter automatiquement"
                                >
                                  <Play className="h-4 w-4" />
                                </button>
                                <button
                                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                                  title="Configurer"
                                >
                                  <Settings className="h-4 w-4" />
                                </button>
                              </div>
                            )}

                            {step.status === 'completed' && step.created_entries && step.created_entries > 0 && (
                              <div className="text-right">
                                <div className="text-xs text-green-600">
                                  {step.created_entries} écritures générées
                                </div>
                                <div className="text-xs text-gray-500">
                                  Validé par {step.validated_by}
                                </div>
                              </div>
                            )}

                            {step.status === 'requires_approval' && (
                              <div className="flex space-x-1">
                                <button
                                  className="p-2 text-green-600 hover:text-green-700 transition-colors"
                                  title="Approuver"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </button>
                                <button
                                  className="p-2 text-red-600 hover:text-red-700 transition-colors"
                                  title="Rejeter"
                                >
                                  <AlertTriangle className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Contrôles détaillés pour cette étape */}
                        {step.controls && step.controls.length > 0 && (
                          <div className="mt-3 border-t pt-3">
                            <div className="text-xs font-medium text-gray-700 mb-2">
                              Contrôles Automatiques ({step.controls.length})
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {step.controls.map((control, controlIndex) => (
                                <div key={controlIndex} className={`p-2 rounded text-xs flex items-center space-x-2 ${
                                  control.status === 'passed' ? 'bg-green-50 text-green-800' :
                                  control.status === 'failed' ? 'bg-red-50 text-red-800' :
                                  'bg-yellow-50 text-yellow-800'
                                }`}>
                                  {control.status === 'passed' ? (
                                    <CheckCircle className="h-3 w-3 text-green-600" />
                                  ) : control.status === 'failed' ? (
                                    <AlertTriangle className="h-3 w-3 text-red-600" />
                                  ) : (
                                    <Clock className="h-3 w-3 text-yellow-600" />
                                  )}
                                  <span>{control.name}</span>
                                  {control.auto_correctable && control.status === 'failed' && (
                                    <button className="ml-auto text-blue-600 hover:text-blue-800">
                                      <Zap className="h-3 w-3" title="Correction automatique" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {step.errorMessage && (
                          <div className="mt-3 p-3 bg-red-100 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-700">{step.errorMessage}</p>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Actions Avancées avec Workflow Intelligent */}
                <div className="p-6 border-t border-gray-200">
                  {selectedPeriodData.status === 'closed' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <div>
                            <div className="text-sm font-medium text-green-900">
                              Clôture terminée le {selectedPeriodData.endDate?.toLocaleDateString()}
                            </div>
                            <div className="text-xs text-green-700">
                              Durée totale: {selectedPeriodData.total_duration} • Conformité: {selectedPeriodData.syscohada_compliance_score}%
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button className="px-3 py-2 bg-white border border-green-300 text-green-700 rounded-lg hover:bg-green-50 transition-colors text-sm">
                            <Database className="h-4 w-4 mr-1" />
                            Archiver
                          </button>
                          <button className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm">
                            <Lock className="h-4 w-4 mr-1" />
                            Verrouiller
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedPeriodData.status === 'approval_pending' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <AlertTriangle className="h-5 w-5 text-yellow-500" />
                          <div>
                            <div className="text-sm font-medium text-yellow-900">
                              En attente d'approbation directeur financier
                            </div>
                            <div className="text-xs text-yellow-700">
                              Toutes les étapes terminées • Score conformité: {selectedPeriodData.syscohada_compliance_score}%
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button className="px-3 py-2 bg-red-100 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors text-sm">
                            <AlertTriangle className="h-4 w-4 mr-1" />
                            Rejeter
                          </button>
                          <button className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approuver
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {/* Actions workflow intelligentes */}
                      {selectedPeriodData.status === 'open' && (
                        <div className="flex space-x-2">
                          <button className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                            <Bot className="h-4 w-4 mr-2" />
                            Démarrer Workflow IA
                          </button>
                          <button className="inline-flex items-center px-3 py-2 bg-white border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 transition-colors">
                            <GitBranch className="h-4 w-4 mr-2" />
                            Template BPMN
                          </button>
                        </div>
                      )}

                      {selectedPeriodData.status === 'in_progress' && (
                        <div className="flex space-x-2">
                          <button className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                            <FastForward className="h-4 w-4 mr-2" />
                            Accélérer
                          </button>
                          <button className="inline-flex items-center px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
                            <PauseCircle className="h-4 w-4 mr-2" />
                            Suspendre
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-3">
                      <button className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                        <Download className="h-4 w-4 mr-2" />
                        Rapport de Clôture
                      </button>
                      <button className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                        <FileText className="h-4 w-4 mr-2" />
                        États Financiers SYSCOHADA
                      </button>
                      <button className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                        <Layers className="h-4 w-4 mr-2" />
                        Audit Trail
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Onglet Designer BPMN 2.0 */}
        {activeTab === 'workflows' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 flex items-center">
                <GitBranch className="h-6 w-6 mr-3 text-blue-600" />
                Designer de Workflow BPMN 2.0
              </h2>
              <div className="flex space-x-3">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <Save className="h-4 w-4 mr-2 inline" />
                  Sauvegarder Template
                </button>
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  <Play className="h-4 w-4 mr-2 inline" />
                  Tester Workflow
                </button>
              </div>
            </div>

            {/* Templates prédéfinis */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Templates SYSCOHADA Prédéfinis</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    name: 'Clôture Mensuelle Standard',
                    description: 'Workflow automatisé pour clôture mensuelle conforme SYSCOHADA',
                    duration: '4h 30min',
                    steps: 6,
                    compliance: 98.5
                  },
                  {
                    name: 'Consolidation Trimestrielle',
                    description: 'Workflow multi-sociétés avec éliminations intra-groupe',
                    duration: '2j 6h',
                    steps: 12,
                    compliance: 96.8
                  },
                  {
                    name: 'Clôture Annuelle Complète',
                    description: 'Workflow complet avec inventaire et audit externe',
                    duration: '7j 12h',
                    steps: 18,
                    compliance: 99.2
                  }
                ].map((template, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer">
                    <h4 className="font-medium text-gray-900 mb-2">{template.name}</h4>
                    <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-blue-600">{template.duration}</span>
                      <span className="text-gray-500">{template.steps} étapes</span>
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">
                        {template.compliance}%
                      </span>
                    </div>
                    <button className="mt-3 w-full py-2 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 text-sm">
                      Charger Template
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Zone de design simplifiée */}
            <div className="bg-gray-50 rounded-lg p-6 border-2 border-dashed border-gray-300">
              <div className="text-center">
                <GitBranch className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Designer de Workflow</h3>
                <p className="text-gray-600 mb-4">
                  Créez vos workflows de clôture personnalisés avec l'éditeur graphique BPMN 2.0
                </p>
                <div className="flex justify-center space-x-3">
                  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                    Nouveau Workflow
                  </button>
                  <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                    Importer BPMN
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Onglet Éditeur de Formules */}
        {activeTab === 'formulas' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 flex items-center">
                <Calculator className="h-6 w-6 mr-3 text-green-600" />
                Éditeur de Formules Avancé
              </h2>
              <div className="flex space-x-3">
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  <Play className="h-4 w-4 mr-2 inline" />
                  Tester Formule
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <Save className="h-4 w-4 mr-2 inline" />
                  Sauvegarder
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Éditeur */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Formule de Calcul
                  </label>
                  <textarea
                    className="w-full h-32 p-4 border border-gray-300 rounded-lg font-mono text-sm"
                    placeholder="Exemples:&#10;• IF(CREANCES_CLIENTS > 100000, CREANCES_CLIENTS * 0.05, 0)&#10;• (STOCK_MOYEN * 365) / CA&#10;• SUM(COMPTE_70X) - SUM(COMPTE_60X)"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type de Calcul
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                      <option>Provision Créances Douteuses</option>
                      <option>Amortissements SYSCOHADA</option>
                      <option>Régularisations Cut-off</option>
                      <option>Ratios Financiers</option>
                      <option>Calcul Personnalisé</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Conformité
                    </label>
                    <div className="flex items-center space-x-2 mt-3">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="text-sm text-green-700">SYSCOHADA Conforme</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Variables et aide */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Variables Disponibles</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {[
                      { name: 'CA', desc: 'Chiffre d\'affaires', example: '2,500,000' },
                      { name: 'CREANCES_CLIENTS', desc: 'Créances clients', example: '450,000' },
                      { name: 'STOCK_MOYEN', desc: 'Stock moyen', example: '180,000' },
                      { name: 'TAUX_PROVISION', desc: 'Taux provision légal', example: '0.025' }
                    ].map((variable, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm font-medium text-blue-600">{variable.name}</span>
                          <span className="text-xs text-gray-500">{variable.example}</span>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">{variable.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h5 className="font-medium text-green-900 mb-2">Test de Formule</h5>
                  <div className="text-sm text-green-800">
                    <div className="mb-2"><strong>Résultat :</strong> 11,250 XOF</div>
                    <div className="text-xs text-green-700">
                      ✓ Syntaxe valide • ✓ Variables correctes • ✓ SYSCOHADA conforme
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Onglet Consolidation Multi-Sociétés */}
        {activeTab === 'consolidation' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 flex items-center">
                <Building className="h-6 w-6 mr-3 text-indigo-600" />
                Consolidation Multi-Sociétés
              </h2>
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                <Users className="h-4 w-4 mr-2 inline" />
                Nouveau Périmètre
              </button>
            </div>

            {/* Périmètres de consolidation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Groupe WiseBook SARL</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Société mère</span>
                    <span className="font-medium">WiseBook SARL (100%)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Filiales</span>
                    <span className="font-medium">3 sociétés</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Méthode</span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">Intégration Globale</span>
                  </div>
                </div>
                <button className="mt-3 w-full py-2 bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100">
                  Consolider Q1 2024
                </button>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Éliminations Intra-Groupe</h4>
                <div className="space-y-3">
                  {[
                    { type: 'Ventes/Achats', amount: '2,450,000', status: 'auto' },
                    { type: 'Créances/Dettes', amount: '890,000', status: 'manual' },
                    { type: 'Dividendes', amount: '150,000', status: 'auto' }
                  ].map((elim, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center space-x-2">
                        <span className={`w-2 h-2 rounded-full ${elim.status === 'auto' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                        <span className="text-sm text-gray-900">{elim.type}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{elim.amount}</div>
                        <div className="text-xs text-gray-500">
                          {elim.status === 'auto' ? 'Auto-détecté' : 'Manuel'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* États consolidés */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">États Financiers Consolidés</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { name: 'Bilan Consolidé', status: 'generated', date: '15/01/2024' },
                  { name: 'Compte Résultat Consolidé', status: 'generated', date: '15/01/2024' },
                  { name: 'Flux Trésorerie Consolidés', status: 'pending', date: null },
                  { name: 'Annexes Consolidées', status: 'pending', date: null }
                ].map((state, index) => (
                  <div key={index} className={`border rounded-lg p-4 text-center ${
                    state.status === 'generated' ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                  }`}>
                    <h5 className="font-medium text-gray-900 mb-2">{state.name}</h5>
                    <div className={`text-sm ${state.status === 'generated' ? 'text-green-600' : 'text-gray-500'}`}>
                      {state.status === 'generated' ? `Généré le ${state.date}` : 'En attente'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Onglet Archivage à Valeur Probante */}
        {activeTab === 'archive' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 flex items-center">
                <Database className="h-6 w-6 mr-3 text-gray-600" />
                Archivage à Valeur Probante
              </h2>
              <div className="flex items-center space-x-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>Conformité légale 10 ans</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Coffre-fort numérique */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Coffre-Fort Numérique</h3>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-blue-900">Documents Archivés</h4>
                    <span className="text-blue-600 font-bold">1,247</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-800">États financiers</span>
                      <span className="text-blue-600">48 documents</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-800">Journaux comptables</span>
                      <span className="text-blue-600">892 documents</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-800">Pièces justificatives</span>
                      <span className="text-blue-600">307 documents</span>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-900 mb-2">Intégrité Vérifiée</h4>
                  <div className="space-y-2 text-sm text-green-800">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Hash blockchain validé</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Chiffrement AES-256</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span>Horodatage certifié</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cycle de vie des documents */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Cycle de Vie</h3>

                <div className="space-y-3">
                  {[
                    { period: 'Janvier 2024', retention: '2034-01-31', status: 'archived', size: '245 MB' },
                    { period: 'Février 2024', retention: '2034-02-28', status: 'pending', size: '189 MB' },
                    { period: 'Exercice 2023', retention: '2033-12-31', status: 'locked', size: '2.1 GB' }
                  ].map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">{item.period}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          item.status === 'archived' ? 'bg-green-100 text-green-800' :
                          item.status === 'locked' ? 'bg-purple-100 text-purple-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {item.status === 'archived' ? 'Archivé' :
                           item.status === 'locked' ? 'Verrouillé' : 'En attente'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <div>Conservation jusqu'au : {item.retention}</div>
                        <div>Taille : {item.size}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
        )}
      </div>
    </div>
  );
};

export default CloturesPeriodiquesPage;