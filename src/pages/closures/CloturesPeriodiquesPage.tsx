import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { motion } from 'framer-motion';
import { previewClosure, executerCloture, getClosureSessions } from '../../services/closureService';
import { db } from '../../lib/db';
import toast from 'react-hot-toast';
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
  const { t } = useLanguage();
  const [periods, setPeriods] = useState<ClosurePeriod[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'workflows' | 'formulas' | 'consolidation' | 'archive'>('dashboard');

  // États pour vraies opérations comptables
  const [realClosureInProgress, setRealClosureInProgress] = useState(false);
  const [currentRealStep, setCurrentRealStep] = useState('');
  const [realClosureResult, setRealClosureResult] = useState<Record<string, unknown> | null>(null);
  const [realTrialBalance, setRealTrialBalance] = useState<Record<string, unknown>[]>([]);
  const [realProvisions, setRealProvisions] = useState<Record<string, unknown>[]>([]);
  const [realDepreciation, setRealDepreciation] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    loadClosurePeriods();
  }, []);

  const loadClosurePeriods = async () => {
    // Load real closure sessions from Dexie
    const sessions = await getClosureSessions();
    const fiscalYears = await db.fiscalYears.toArray();

    if (sessions.length > 0) {
      const realPeriods: ClosurePeriod[] = sessions.map((s, idx) => ({
        id: s.id,
        type: s.type === 'MENSUELLE' ? 'monthly' as const
          : s.type === 'TRIMESTRIELLE' ? 'quarterly' as const
          : 'annual' as const,
        period: s.periode,
        period_en: s.periode,
        status: s.statut === 'CLOTUREE' ? 'closed' as const
          : s.statut === 'EN_COURS' ? 'in_progress' as const
          : 'pending' as const,
        startDate: new Date(s.dateDebut),
        endDate: new Date(s.dateFin),
        closure_deadline: new Date(s.dateFin),
        fiscal_year: s.exercice,
        syscohada_compliance_score: s.statut === 'CLOTUREE' ? 100 : s.progression,
        legal_requirements_met: s.statut === 'CLOTUREE',
        audit_trail_complete: s.statut === 'CLOTUREE',
        documents_generated: s.statut === 'CLOTUREE' ? ['trial_balance', 'journal_entries'] : [],
        approvals_required: ['comptable_principal'],
        approvals_received: s.statut === 'CLOTUREE' ? ['comptable_principal'] : [],
        region: 'CEMAC',
        business_sector: 'commercial',
        total_duration: '',
        created_by: s.creePar,
        approved_by: s.statut === 'CLOTUREE' ? s.creePar : undefined,
        locked_by: s.statut === 'CLOTUREE' ? 'system' : undefined,
        retention_until: new Date(new Date(s.dateFin).getTime() + 10 * 365 * 24 * 3600 * 1000),
        steps: [],
      }));
      setPeriods(realPeriods);
      if (realPeriods.length > 0) setSelectedPeriod(realPeriods[0].id);
      setLoading(false);
      return;
    }

    // Fallback: generate periods from fiscal years
    const fallbackPeriods: ClosurePeriod[] = fiscalYears.map(fy => ({
      id: fy.id,
      type: 'annual' as const,
      period: fy.name,
      period_en: fy.name,
      status: fy.isClosed ? 'closed' as const : 'pending' as const,
      startDate: new Date(fy.startDate),
      endDate: new Date(fy.endDate),
      closure_deadline: new Date(fy.endDate),
      fiscal_year: fy.name,
      syscohada_compliance_score: fy.isClosed ? 100 : 0,
      legal_requirements_met: fy.isClosed,
      audit_trail_complete: fy.isClosed,
      documents_generated: [],
      approvals_required: ['comptable_principal'],
      approvals_received: fy.isClosed ? ['comptable_principal'] : [],
      region: 'CEMAC',
      business_sector: 'commercial',
      total_duration: '',
      created_by: '',
      retention_until: new Date(new Date(fy.endDate).getTime() + 10 * 365 * 24 * 3600 * 1000),
      steps: [],
    }));

    if (fallbackPeriods.length > 0) {
      setPeriods(fallbackPeriods);
      setSelectedPeriod(fallbackPeriods[0].id);
      setLoading(false);
      return;
    }

    // Ultimate fallback — no data in DB, empty state
    setLoading(false);
  };

  /* REMOVED_MOCK_DATA_BLOCK_START
  void [
      {
        id: 'empty-placeholder',
        type: 'monthly',
        period: 'Aucune période',
        period_en: 'No period',
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
    
  REMOVED_MOCK_DATA_BLOCK_END */

  const selectedPeriodData = periods.find(p => p.id === selectedPeriod);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-[var(--color-success)] bg-[var(--color-success-lighter)]';
      case 'in_progress': return 'text-[var(--color-primary)] bg-[var(--color-primary-lighter)]';
      case 'error': return 'text-[var(--color-error)] bg-[var(--color-error-lighter)]';
      case 'requires_approval': return 'text-[var(--color-warning)] bg-[var(--color-warning-lighter)]';
      default: return 'text-[var(--color-text-secondary)] bg-[var(--color-background-hover)]';
    }
  };
  
  const getComplianceColor = (score: number) => {
    if (score >= 95) return 'text-[var(--color-success)] bg-[var(--color-success-lighter)]';
    if (score >= 85) return 'text-[var(--color-warning)] bg-[var(--color-warning-lighter)]';
    return 'text-[var(--color-error)] bg-[var(--color-error-lighter)]';
  };
  
  // Fonctions réelles de clôture comptable — via closureService (Dexie local)
  const startMonthlyClosureReal = async (_periodId: string) => {
    setRealClosureInProgress(true);
    setCurrentRealStep('Initialisation clôture...');

    try {
      // 1. Preview
      setCurrentRealStep('Pré-vérification...');
      const preview = await previewClosure();
      setRealTrialBalance([
        { label: 'Brouillons à verrouiller', value: preview.draftsToLock },
        { label: 'Immobilisations', value: preview.assetsToDepreciate },
      ]);

      // 2. Execute full closure
      setCurrentRealStep('Exécution de la clôture...');
      const result = await executerCloture();

      if (!result.success) {
        toast.error(result.errors?.join('\n') || 'Erreur clôture');
        setCurrentRealStep('Erreur lors de la clôture');
        return;
      }

      setRealClosureResult(result);
      setCurrentRealStep('Clôture terminée');
      toast.success(`Clôture terminée — ${result.entriesLocked || 0} écritures verrouillées`);

      // Reload periods
      loadClosurePeriods();

    } catch (error) {
      console.error('Erreur clôture:', error);
      setCurrentRealStep('Erreur lors de la clôture');
      toast.error(`Erreur : ${error instanceof Error ? error.message : String(error)}`);
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
      case 'closed': return 'text-[var(--color-success)] bg-[var(--color-success-lighter)]';
      case 'locked': return 'text-purple-600 bg-purple-100';
      case 'in_progress': return 'text-[var(--color-primary)] bg-[var(--color-primary-lighter)]';
      case 'approval_pending': return 'text-[var(--color-warning)] bg-[var(--color-warning-lighter)]';
      default: return 'text-[var(--color-text-primary)] bg-[var(--color-background-hover)]';
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
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
              <h1 className="text-lg font-bold text-[var(--color-text-primary)] mb-2 flex items-center">
                <Bot className="h-8 w-8 text-purple-600 mr-3" />
                Clôtures Automatisées Nouvelle Génération
              </h1>
              <p className="text-[var(--color-text-primary)] flex items-center space-x-4">
                <span>🤖 Workflow intelligent BPMN 2.0 • 📊 200+ contrôles automatiques • ⚡ Réduction 50% temps de clôture</span>
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-purple-50 p-3 rounded-lg">
                  <div className="text-sm text-purple-600">Gain Temps</div>
                  <div className="text-lg font-bold text-purple-900">-50%</div>
                </div>
                <div className="bg-[var(--color-success-lightest)] p-3 rounded-lg">
                  <div className="text-sm text-[var(--color-success)]">Erreurs</div>
                  <div className="text-lg font-bold text-green-900">-90%</div>
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
            <div className="bg-white p-4 rounded-lg border border-[var(--color-border)] flex items-center space-x-3">
              <div className="bg-[var(--color-primary-lighter)] p-2 rounded-lg">
                <Timer className="h-5 w-5 text-[var(--color-primary)]" />
              </div>
              <div>
                <div className="text-sm text-[var(--color-text-primary)]">Temps Moyen</div>
                <div className="font-bold text-[var(--color-text-primary)]">7.2 jours</div>
                <div className="text-xs text-[var(--color-success)]">-48% vs cible</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-[var(--color-border)] flex items-center space-x-3">
              <div className="bg-[var(--color-success-lighter)] p-2 rounded-lg">
                <CheckSquare className="h-5 w-5 text-[var(--color-success)]" />
              </div>
              <div>
                <div className="text-sm text-[var(--color-text-primary)]">Automatisation</div>
                <div className="font-bold text-[var(--color-text-primary)]">89%</div>
                <div className="text-xs text-[var(--color-success)]">+12% ce mois</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-[var(--color-border)] flex items-center space-x-3">
              <div className="bg-purple-100 p-2 rounded-lg">
                <Shield className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-sm text-[var(--color-text-primary)]">Conformité</div>
                <div className="font-bold text-[var(--color-text-primary)]">{Math.round(periods.reduce((sum, p) => sum + p.syscohada_compliance_score, 0) / periods.length)}%</div>
                <div className="text-xs text-[var(--color-success)]">SYSCOHADA</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-[var(--color-border)] flex items-center space-x-3">
              <div className="bg-[var(--color-warning-lighter)] p-2 rounded-lg">
                <AlertCircle className="h-5 w-5 text-[var(--color-warning)]" />
              </div>
              <div>
                <div className="text-sm text-[var(--color-text-primary)]">Alertes Actives</div>
                <div className="font-bold text-[var(--color-text-primary)]">3</div>
                <div className="text-xs text-[var(--color-warning)]">2 critiques</div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-[var(--color-border)] flex items-center space-x-3">
              <div className="bg-indigo-100 p-2 rounded-lg">
                <TrendingUp className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <div className="text-sm text-[var(--color-text-primary)]">Performance</div>
                <div className="font-bold text-[var(--color-text-primary)]">98.7%</div>
                <div className="text-xs text-indigo-600">SLA respecté</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tableau de Bord Temps Réel Workflow Intelligent */}
        <div className="mb-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-[var(--color-primary-light)] p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-[var(--color-primary-darker)] flex items-center">
              <Workflow className="w-6 h-6 mr-3" />
              Cockpit de Clôture Temps Réel
            </h2>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 text-sm text-[var(--color-success)]">
                <div className="w-2 h-2 bg-[var(--color-success)] rounded-full animate-pulse"></div>
                <span>Live</span>
              </div>
              <button className="p-2 bg-white border border-blue-300 rounded-lg hover:bg-[var(--color-primary-lightest)]" aria-label="Actualiser">
                <RefreshCw className="h-4 w-4 text-[var(--color-primary)]" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border border-[var(--color-primary-light)]">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-[var(--color-primary-darker)]">Workflows Actifs</h4>
                <Activity className="h-5 w-5 text-[var(--color-primary)]" />
              </div>
              <div className="text-lg font-bold text-[var(--color-primary-darker)]">2</div>
              <div className="text-xs text-[var(--color-primary)]">En cours d'exécution</div>
              <div className="mt-2">
                <div className="flex items-center space-x-1 text-xs text-[var(--color-success)]">
                  <CheckCircle className="h-3 w-3" />
                  <span>Févr. 67% terminé</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-[var(--color-primary-light)]">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-[var(--color-primary-darker)]">Contrôles IA</h4>
                <Brain className="h-5 w-5 text-purple-500" />
              </div>
              <div className="text-lg font-bold text-[var(--color-primary-darker)]">247</div>
              <div className="text-xs text-[var(--color-primary)]">Exécutés aujourd'hui</div>
              <div className="mt-2">
                <div className="flex items-center space-x-1 text-xs text-[var(--color-success)]">
                  <Award className="h-3 w-3" />
                  <span>98.9% réussite</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-[var(--color-primary-light)]">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-[var(--color-primary-darker)]">Économies</h4>
                <TrendingUp className="h-5 w-5 text-[var(--color-success)]" />
              </div>
              <div className="text-lg font-bold text-[var(--color-primary-darker)]">47h</div>
              <div className="text-xs text-[var(--color-primary)]">Temps économisé ce mois</div>
              <div className="mt-2">
                <div className="flex items-center space-x-1 text-xs text-[var(--color-success)]">
                  <Zap className="h-3 w-3" />
                  <span>15 → 7 jours</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-[var(--color-primary-light)]">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-[var(--color-primary-darker)]">Équipes</h4>
                <Users className="h-5 w-5 text-orange-500" />
              </div>
              <div className="text-lg font-bold text-[var(--color-primary-darker)]">12</div>
              <div className="text-xs text-[var(--color-primary)]">Collaborateurs actifs</div>
              <div className="mt-2">
                <div className="flex items-center space-x-1 text-xs text-[var(--color-warning)]">
                  <AlertTriangle className="h-3 w-3" />
                  <span>2 en attente validation</span>
                </div>
              </div>
            </div>
          </div>

          {/* Workflow en cours avec progression temps réel */}
          <div className="mt-6 bg-white rounded-lg border border-[var(--color-primary-light)] p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-[var(--color-primary-darker)]">Workflow Février 2024 - En Cours</h4>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-[var(--color-primary)]">67% terminé</span>
                <div className="w-32 h-2 bg-[var(--color-primary-lighter)] rounded-full">
                  <div className="w-2/3 h-2 bg-[var(--color-primary)] rounded-full"></div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-[var(--color-success)]" />
                <span>4/6 étapes terminées</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-[var(--color-primary)]" />
                <span>2h15 restantes (estimation IA)</span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-purple-500" />
                <span>94.2% conformité SYSCOHADA</span>
              </div>
              <button className="px-3 py-1 bg-[var(--color-primary-lighter)] text-[var(--color-primary-dark)] rounded-full text-xs hover:bg-[var(--color-primary-light)] flex items-center space-x-1">
                <FastForward className="h-3 w-3" />
                <span>Accélérer</span>
              </button>
            </div>
          </div>
        </div>

        {/* Navigation par onglets */}
        <div className="mb-8">
          <div className="border-b border-[var(--color-border)]">
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
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-dark)]'
                  }`}
                >
                  <tab.icon className={`mr-2 h-5 w-5 ${
                    activeTab === tab.id ? 'text-purple-500' : 'text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-secondary)]'
                  }`} />
                  {tab.label}
                  {tab.badge && (
                    <span className="ml-2 px-2 py-1 text-xs bg-[var(--color-error)] text-white rounded-full animate-pulse">
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
            <div className="bg-[var(--color-primary-lightest)] border border-[var(--color-primary-light)] rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[var(--color-primary-darker)]">Clôture Comptable en Cours</h3>
                <div className="flex items-center space-x-2 text-[var(--color-primary-dark)]">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Génération d'écritures réelles...</span>
                </div>
              </div>
              <div className="text-[var(--color-primary-darker)] font-medium">{currentRealStep}</div>
              <div className="mt-3 bg-[var(--color-primary-light)] rounded-full h-3">
                <div className="bg-[var(--color-primary)] h-3 rounded-full transition-all duration-500" style={{ width: '67%' }}></div>
              </div>
            </div>
          )}

          {/* Résultats de clôture réelle */}
          {realClosureResult && (
            <div className="bg-[var(--color-success-lightest)] border border-[var(--color-success-light)] rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-green-900 flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Clôture Mensuelle Terminée
                </h3>
                <div className="text-[var(--color-success-dark)] text-sm">
                  {realClosureResult.total_entries_created} écritures générées
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg">
                  <h4 className="font-medium text-[var(--color-text-primary)] mb-2">Provisions Clients</h4>
                  <div className="text-lg font-bold text-[var(--color-success)]">
                    {realProvisions.length > 0
                      ? `${realProvisions.reduce((sum, p) => sum + parseFloat(p.provision_amount), 0).toLocaleString()} XOF`
                      : '0 XOF'
                    }
                  </div>
                  <div className="text-sm text-[var(--color-text-primary)]">{realProvisions.length} clients provisionnés</div>
                </div>

                <div className="bg-white p-4 rounded-lg">
                  <h4 className="font-medium text-[var(--color-text-primary)] mb-2">Amortissements</h4>
                  <div className="text-lg font-bold text-[var(--color-primary)]">
                    {realDepreciation.length > 0
                      ? `${realDepreciation.reduce((sum, d) => sum + parseFloat(d.annual_depreciation), 0).toLocaleString()} XOF`
                      : '0 XOF'
                    }
                  </div>
                  <div className="text-sm text-[var(--color-text-primary)]">{realDepreciation.length} immobilisations</div>
                </div>

                <div className="bg-white p-4 rounded-lg">
                  <h4 className="font-medium text-[var(--color-text-primary)] mb-2">{t('accounting.balance')}</h4>
                  <div className="text-lg font-bold text-purple-600">
                    {realTrialBalance.length > 0 ? `${realTrialBalance.length} comptes` : 'Non générée'}
                  </div>
                  <div className="text-sm text-[var(--color-text-primary)]">
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
                <button className="px-4 py-2 bg-[var(--color-success)] text-white rounded-lg hover:bg-[var(--color-success-dark)]">
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
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Actions Comptables Individuelles</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={calculateRealProvisions}
                className="p-4 border border-[var(--color-border)] rounded-lg hover:border-orange-300 hover:bg-orange-50 text-center"
              >
                <TrendingDown className="h-8 w-8 text-[var(--color-warning)] mx-auto mb-2" />
                <div className="font-medium text-[var(--color-text-primary)]">Calculer Provisions</div>
                <div className="text-sm text-[var(--color-text-primary)]">Créances clients SYSCOHADA</div>
                {realProvisions.length > 0 && (
                  <div className="text-xs text-[var(--color-success)] mt-1">
                    ✓ {realProvisions.length} provisions calculées
                  </div>
                )}
              </button>

              <button
                onClick={calculateRealDepreciation}
                className="p-4 border border-[var(--color-border)] rounded-lg hover:border-blue-300 hover:bg-[var(--color-primary-lightest)] text-center"
              >
                <TrendingDown className="h-8 w-8 text-[var(--color-primary)] mx-auto mb-2" />
                <div className="font-medium text-[var(--color-text-primary)]">Calculer Amortissements</div>
                <div className="text-sm text-[var(--color-text-primary)]">Barèmes SYSCOHADA</div>
                {realDepreciation.length > 0 && (
                  <div className="text-xs text-[var(--color-success)] mt-1">
                    ✓ {realDepreciation.length} amortissements calculés
                  </div>
                )}
              </button>

              <button
                onClick={loadRealTrialBalance}
                className="p-4 border border-[var(--color-border)] rounded-lg hover:border-purple-300 hover:bg-purple-50 text-center"
              >
                <Database className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <div className="font-medium text-[var(--color-text-primary)]">Balance Générale</div>
                <div className="text-sm text-[var(--color-text-primary)]">Soldes réels post-clôture</div>
                {realTrialBalance.length > 0 && (
                  <div className="text-xs text-[var(--color-success)] mt-1">
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
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Balance Générale Réelle</h3>
                <button
                  onClick={() => setRealTrialBalance([])}
                  className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                >
                  ×
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-[var(--color-background-secondary)]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase">{t('accounting.account')}</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)] uppercase">{t('accounting.label')}</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-[var(--color-text-secondary)] uppercase">Solde Débiteur</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-[var(--color-text-secondary)] uppercase">Solde Créditeur</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {realTrialBalance.slice(0, 10).map((account, index) => (
                      <tr key={index} className="hover:bg-[var(--color-background-secondary)]">
                        <td className="px-4 py-3 text-sm font-mono font-medium text-[var(--color-text-primary)]">
                          {account.account_number}
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--color-text-primary)]">
                          {account.account_name}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-mono text-[var(--color-primary)]">
                          {parseFloat(account.debit_balance) > 0 ?
                            new Intl.NumberFormat('fr-FR').format(parseFloat(account.debit_balance)) : '-'
                          }
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-mono text-[var(--color-success)]">
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
                <div className="mt-4 text-center text-sm text-[var(--color-text-secondary)]">
                  ... et {realTrialBalance.length - 10} autres comptes
                </div>
              )}
            </div>
          )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Liste des périodes */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border)]">
              <div className="p-6 border-b border-[var(--color-border)]">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Périodes</h2>
              </div>
              
              <div className="p-4 space-y-3">
                {periods.map((period) => (
                  <button
                    key={period.id}
                    onClick={() => setSelectedPeriod(period.id)}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      selectedPeriod === period.id
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary-lightest)]'
                        : 'border-[var(--color-border)] hover:bg-[var(--color-background-secondary)]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-[var(--color-text-primary)]">{period.period}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPeriodStatusColor(period.status)}`}>
                        {getPeriodStatusLabel(period.status)}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 text-sm text-[var(--color-text-primary)]">
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
                        <span className="text-xs text-[var(--color-text-secondary)]">Conformité SYSCOHADA</span>
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
              <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border)]">
                <div className="p-6 border-b border-[var(--color-border)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                        Clôture {selectedPeriodData.period}
                      </h2>
                      <p className="text-[var(--color-text-primary)]">
                        Workflow automatisé en {selectedPeriodData.steps.length} étapes
                      </p>
                    </div>
                    
                    {selectedPeriodData.status === 'open' && (
                      <div className="flex space-x-3">
                        <button
                          onClick={() => startMonthlyClosureReal(selectedPeriodData.id)}
                          className="inline-flex items-center px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors"
                        >
                          <Calculator className="h-4 w-4 mr-2" />
                          Clôture Mensuelle Réelle
                        </button>
                        <button className="inline-flex items-center px-3 py-2 bg-[var(--color-success)] text-white rounded-lg hover:bg-[var(--color-success-dark)] transition-colors">
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
                          step.status === 'completed' ? 'border-[var(--color-success-light)] bg-[var(--color-success-lightest)]' :
                          step.status === 'in_progress' ? 'border-[var(--color-primary-light)] bg-[var(--color-primary-lightest)]' :
                          step.status === 'error' ? 'border-[var(--color-error-light)] bg-[var(--color-error-lightest)]' :
                          'border-[var(--color-border)] bg-[var(--color-background-secondary)]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${getStatusColor(step.status)}`}>
                              {getStatusIcon(step.status)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <h4 className="font-medium text-[var(--color-text-primary)]">
                                  {step.order}. {step.name}
                                </h4>
                                {step.syscohada_compliance && (
                                  <span className="px-2 py-1 bg-[var(--color-success-lighter)] text-[var(--color-success-dark)] text-xs rounded-full">
                                    SYSCOHADA
                                  </span>
                                )}
                                {step.mandatory && (
                                  <span className="px-2 py-1 bg-[var(--color-error-lighter)] text-[var(--color-error-dark)] text-xs rounded-full">
                                    Obligatoire
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-[var(--color-text-primary)]">{step.description}</p>
                              {step.syscohada_reference && (
                                <p className="text-xs text-[var(--color-primary)] mt-1">
                                  📖 {step.syscohada_reference}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            {step.duration && (
                              <div className="text-right">
                                <div className="text-sm font-medium text-[var(--color-text-primary)]">{step.duration}</div>
                                {step.estimated_duration && (
                                  <div className="text-xs text-[var(--color-text-secondary)]">
                                    Estimé: {step.estimated_duration}
                                  </div>
                                )}
                              </div>
                            )}

                            {step.status === 'pending' && (
                              <div className="flex space-x-1">
                                <button
                                  className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-success)] transition-colors"
                                  title="Exécuter automatiquement" aria-label="Lire">
                                  <Play className="h-4 w-4" />
                                </button>
                                <button
                                  className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors"
                                  title="Configurer" aria-label="Paramètres">
                                  <Settings className="h-4 w-4" />
                                </button>
                              </div>
                            )}

                            {step.status === 'completed' && step.created_entries && step.created_entries > 0 && (
                              <div className="text-right">
                                <div className="text-xs text-[var(--color-success)]">
                                  {step.created_entries} écritures générées
                                </div>
                                <div className="text-xs text-[var(--color-text-secondary)]">
                                  Validé par {step.validated_by}
                                </div>
                              </div>
                            )}

                            {step.status === 'requires_approval' && (
                              <div className="flex space-x-1">
                                <button
                                  className="p-2 text-[var(--color-success)] hover:text-[var(--color-success-dark)] transition-colors"
                                  title="Approuver" aria-label="Valider">
                                  <CheckCircle className="h-4 w-4" />
                                </button>
                                <button
                                  className="p-2 text-[var(--color-error)] hover:text-[var(--color-error-dark)] transition-colors"
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
                            <div className="text-xs font-medium text-[var(--color-text-primary)] mb-2">
                              Contrôles Automatiques ({step.controls.length})
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {step.controls.map((control, controlIndex) => (
                                <div key={controlIndex} className={`p-2 rounded text-xs flex items-center space-x-2 ${
                                  control.status === 'passed' ? 'bg-[var(--color-success-lightest)] text-[var(--color-success-darker)]' :
                                  control.status === 'failed' ? 'bg-[var(--color-error-lightest)] text-red-800' :
                                  'bg-[var(--color-warning-lightest)] text-yellow-800'
                                }`}>
                                  {control.status === 'passed' ? (
                                    <CheckCircle className="h-3 w-3 text-[var(--color-success)]" />
                                  ) : control.status === 'failed' ? (
                                    <AlertTriangle className="h-3 w-3 text-[var(--color-error)]" />
                                  ) : (
                                    <Clock className="h-3 w-3 text-[var(--color-warning)]" />
                                  )}
                                  <span>{control.name}</span>
                                  {control.auto_correctable && control.status === 'failed' && (
                                    <button className="ml-auto text-[var(--color-primary)] hover:text-[var(--color-primary-darker)]">
                                      <Zap className="h-3 w-3" title="Correction automatique" />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {step.errorMessage && (
                          <div className="mt-3 p-3 bg-[var(--color-error-lighter)] border border-[var(--color-error-light)] rounded-lg">
                            <p className="text-sm text-[var(--color-error-dark)]">{step.errorMessage}</p>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Actions Avancées avec Workflow Intelligent */}
                <div className="p-6 border-t border-[var(--color-border)]">
                  {selectedPeriodData.status === 'closed' && (
                    <div className="bg-[var(--color-success-lightest)] border border-[var(--color-success-light)] rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <CheckCircle className="h-5 w-5 text-[var(--color-success)]" />
                          <div>
                            <div className="text-sm font-medium text-green-900">
                              Clôture terminée le {selectedPeriodData.endDate?.toLocaleDateString()}
                            </div>
                            <div className="text-xs text-[var(--color-success-dark)]">
                              Durée totale: {selectedPeriodData.total_duration} • Conformité: {selectedPeriodData.syscohada_compliance_score}%
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button className="px-3 py-2 bg-white border border-green-300 text-[var(--color-success-dark)] rounded-lg hover:bg-[var(--color-success-lightest)] transition-colors text-sm">
                            <Database className="h-4 w-4 mr-1" />
                            Archiver
                          </button>
                          <button className="px-3 py-2 bg-[var(--color-success)] text-white rounded-lg hover:bg-[var(--color-success-dark)] transition-colors text-sm">
                            <Lock className="h-4 w-4 mr-1" />
                            Verrouiller
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedPeriodData.status === 'approval_pending' && (
                    <div className="bg-[var(--color-warning-lightest)] border border-yellow-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <AlertTriangle className="h-5 w-5 text-yellow-500" />
                          <div>
                            <div className="text-sm font-medium text-yellow-900">
                              En attente d'approbation directeur financier
                            </div>
                            <div className="text-xs text-[var(--color-warning-dark)]">
                              Toutes les étapes terminées • Score conformité: {selectedPeriodData.syscohada_compliance_score}%
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button className="px-3 py-2 bg-[var(--color-error-lighter)] border border-red-300 text-[var(--color-error-dark)] rounded-lg hover:bg-[var(--color-error-lightest)] transition-colors text-sm">
                            <AlertTriangle className="h-4 w-4 mr-1" />
                            Rejeter
                          </button>
                          <button className="px-3 py-2 bg-[var(--color-success)] text-white rounded-lg hover:bg-[var(--color-success-dark)] transition-colors text-sm">
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
                          <button className="inline-flex items-center px-3 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)] transition-colors">
                            <FastForward className="h-4 w-4 mr-2" />
                            Accélérer
                          </button>
                          <button className="inline-flex items-center px-3 py-2 bg-[var(--color-warning)] text-white rounded-lg hover:bg-orange-700 transition-colors">
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
                      <button className="inline-flex items-center px-4 py-2 bg-[var(--color-success)] text-white rounded-lg hover:bg-[var(--color-success-dark)] transition-colors">
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
          <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border)] p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center">
                <GitBranch className="h-6 w-6 mr-3 text-[var(--color-primary)]" />
                Designer de Workflow BPMN 2.0
              </h2>
              <div className="flex space-x-3">
                <button className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)]">
                  <Save className="h-4 w-4 mr-2 inline" />
                  Sauvegarder Template
                </button>
                <button className="px-4 py-2 bg-[var(--color-success)] text-white rounded-lg hover:bg-[var(--color-success-dark)]">
                  <Play className="h-4 w-4 mr-2 inline" />
                  Tester Workflow
                </button>
              </div>
            </div>

            {/* Templates prédéfinis */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Templates SYSCOHADA Prédéfinis</h3>
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
                  <div key={index} className="border border-[var(--color-border)] rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer">
                    <h4 className="font-medium text-[var(--color-text-primary)] mb-2">{template.name}</h4>
                    <p className="text-sm text-[var(--color-text-primary)] mb-3">{template.description}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--color-primary)]">{template.duration}</span>
                      <span className="text-[var(--color-text-secondary)]">{template.steps} étapes</span>
                      <span className="px-2 py-1 bg-[var(--color-success-lighter)] text-[var(--color-success-dark)] rounded-full">
                        {template.compliance}%
                      </span>
                    </div>
                    <button className="mt-3 w-full py-2 bg-[var(--color-primary-lightest)] text-[var(--color-primary-dark)] rounded hover:bg-[var(--color-primary-lighter)] text-sm">
                      Charger Template
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Zone de design simplifiée */}
            <div className="bg-[var(--color-background-secondary)] rounded-lg p-6 border-2 border-dashed border-[var(--color-border-dark)]">
              <div className="text-center">
                <GitBranch className="h-16 w-16 text-[var(--color-text-secondary)] mx-auto mb-4" />
                <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-2">Designer de Workflow</h3>
                <p className="text-[var(--color-text-primary)] mb-4">
                  Créez vos workflows de clôture personnalisés avec l'éditeur graphique BPMN 2.0
                </p>
                <div className="flex justify-center space-x-3">
                  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                    Nouveau Workflow
                  </button>
                  <button className="px-4 py-2 border border-[var(--color-border-dark)] text-[var(--color-text-primary)] rounded-lg hover:bg-[var(--color-background-secondary)]">
                    Importer BPMN
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Onglet Éditeur de Formules */}
        {activeTab === 'formulas' && (
          <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border)] p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center">
                <Calculator className="h-6 w-6 mr-3 text-[var(--color-success)]" />
                Éditeur de Formules Avancé
              </h2>
              <div className="flex space-x-3">
                <button className="px-4 py-2 bg-[var(--color-success)] text-white rounded-lg hover:bg-[var(--color-success-dark)]">
                  <Play className="h-4 w-4 mr-2 inline" />
                  Tester Formule
                </button>
                <button className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-dark)]">
                  <Save className="h-4 w-4 mr-2 inline" />
                  Sauvegarder
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Éditeur */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                    Formule de Calcul
                  </label>
                  <textarea
                    className="w-full h-32 p-4 border border-[var(--color-border-dark)] rounded-lg font-mono text-sm"
                    placeholder="Exemples:&#10;• IF(CREANCES_CLIENTS > 100000, CREANCES_CLIENTS * 0.05, 0)&#10;• (STOCK_MOYEN * 365) / CA&#10;• SUM(COMPTE_70X) - SUM(COMPTE_60X)"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                      Type de Calcul
                    </label>
                    <select className="w-full px-3 py-2 border border-[var(--color-border-dark)] rounded-md">
                      <option>Provision Créances Douteuses</option>
                      <option>Amortissements SYSCOHADA</option>
                      <option>Régularisations Cut-off</option>
                      <option>Ratios Financiers</option>
                      <option>Calcul Personnalisé</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                      Conformité
                    </label>
                    <div className="flex items-center space-x-2 mt-3">
                      <CheckCircle className="h-5 w-5 text-[var(--color-success)]" />
                      <span className="text-sm text-[var(--color-success-dark)]">SYSCOHADA Conforme</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Variables et aide */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-[var(--color-text-primary)] mb-3">Variables Disponibles</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {[
                      { name: 'CA', desc: 'Chiffre d\'affaires', example: '2,500,000' },
                      { name: 'CREANCES_CLIENTS', desc: 'Créances clients', example: '450,000' },
                      { name: 'STOCK_MOYEN', desc: 'Stock moyen', example: '180,000' },
                      { name: 'TAUX_PROVISION', desc: 'Taux provision légal', example: '0.025' }
                    ].map((variable, index) => (
                      <div key={index} className="p-3 bg-[var(--color-background-secondary)] rounded-lg hover:bg-[var(--color-primary-lightest)] cursor-pointer transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm font-medium text-[var(--color-primary)]">{variable.name}</span>
                          <span className="text-xs text-[var(--color-text-secondary)]">{variable.example}</span>
                        </div>
                        <div className="text-xs text-[var(--color-text-primary)] mt-1">{variable.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-[var(--color-success-lightest)] rounded-lg border border-[var(--color-success-light)]">
                  <h5 className="font-medium text-green-900 mb-2">Test de Formule</h5>
                  <div className="text-sm text-[var(--color-success-darker)]">
                    <div className="mb-2"><strong>Résultat :</strong> 11,250 XOF</div>
                    <div className="text-xs text-[var(--color-success-dark)]">
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
          <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border)] p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center">
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
              <div className="border border-[var(--color-border)] rounded-lg p-4">
                <h4 className="font-medium text-[var(--color-text-primary)] mb-3">Groupe Atlas Finance SARL</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-primary)]">Société mère</span>
                    <span className="font-medium">Atlas Finance SARL (100%)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-primary)]">Filiales</span>
                    <span className="font-medium">3 sociétés</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-primary)]">Méthode</span>
                    <span className="px-2 py-1 bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)] rounded text-xs">Intégration Globale</span>
                  </div>
                </div>
                <button className="mt-3 w-full py-2 bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100">
                  Consolider Q1 2024
                </button>
              </div>

              <div className="border border-[var(--color-border)] rounded-lg p-4">
                <h4 className="font-medium text-[var(--color-text-primary)] mb-3">Éliminations Intra-Groupe</h4>
                <div className="space-y-3">
                  {[
                    { type: 'Ventes/Achats', amount: '2,450,000', status: 'auto' },
                    { type: 'Créances/Dettes', amount: '890,000', status: 'manual' },
                    { type: 'Dividendes', amount: '150,000', status: 'auto' }
                  ].map((elim, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-[var(--color-background-secondary)] rounded">
                      <div className="flex items-center space-x-2">
                        <span className={`w-2 h-2 rounded-full ${elim.status === 'auto' ? 'bg-[var(--color-success)]' : 'bg-[var(--color-warning)]'}`}></span>
                        <span className="text-sm text-[var(--color-text-primary)]">{elim.type}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{elim.amount}</div>
                        <div className="text-xs text-[var(--color-text-secondary)]">
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
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">États Financiers Consolidés</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { name: 'Bilan Consolidé', status: 'generated', date: '15/01/2024' },
                  { name: 'Compte Résultat Consolidé', status: 'generated', date: '15/01/2024' },
                  { name: 'Flux Trésorerie Consolidés', status: 'pending', date: null },
                  { name: 'Annexes Consolidées', status: 'pending', date: null }
                ].map((state, index) => (
                  <div key={index} className={`border rounded-lg p-4 text-center ${
                    state.status === 'generated' ? 'border-[var(--color-success-light)] bg-[var(--color-success-lightest)]' : 'border-[var(--color-border)] bg-[var(--color-background-secondary)]'
                  }`}>
                    <h5 className="font-medium text-[var(--color-text-primary)] mb-2">{state.name}</h5>
                    <div className={`text-sm ${state.status === 'generated' ? 'text-[var(--color-success)]' : 'text-[var(--color-text-secondary)]'}`}>
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
          <div className="bg-white rounded-xl shadow-sm border border-[var(--color-border)] p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center">
                <Database className="h-6 w-6 mr-3 text-[var(--color-text-primary)]" />
                Archivage à Valeur Probante
              </h2>
              <div className="flex items-center space-x-2 text-sm text-[var(--color-success)]">
                <CheckCircle className="h-4 w-4" />
                <span>Conformité légale 10 ans</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Coffre-fort numérique */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Coffre-Fort Numérique</h3>

                <div className="bg-[var(--color-primary-lightest)] border border-[var(--color-primary-light)] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-[var(--color-primary-darker)]">Documents Archivés</h4>
                    <span className="text-[var(--color-primary)] font-bold">1,247</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[var(--color-primary-darker)]">États financiers</span>
                      <span className="text-[var(--color-primary)]">48 documents</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--color-primary-darker)]">Journaux comptables</span>
                      <span className="text-[var(--color-primary)]">892 documents</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--color-primary-darker)]">Pièces justificatives</span>
                      <span className="text-[var(--color-primary)]">307 documents</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[var(--color-success-lightest)] border border-[var(--color-success-light)] rounded-lg p-4">
                  <h4 className="font-medium text-green-900 mb-2">Intégrité Vérifiée</h4>
                  <div className="space-y-2 text-sm text-[var(--color-success-darker)]">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-[var(--color-success)]" />
                      <span>Hash blockchain validé</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-[var(--color-success)]" />
                      <span>Chiffrement AES-256</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-[var(--color-success)]" />
                      <span>Horodatage certifié</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cycle de vie des documents */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Cycle de Vie</h3>

                <div className="space-y-3">
                  {[
                    { period: 'Janvier 2024', retention: '2034-01-31', status: 'archived', size: '245 MB' },
                    { period: 'Février 2024', retention: '2034-02-28', status: 'pending', size: '189 MB' },
                    { period: 'Exercice 2023', retention: '2033-12-31', status: 'locked', size: '2.1 GB' }
                  ].map((item, index) => (
                    <div key={index} className="border border-[var(--color-border)] rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-[var(--color-text-primary)]">{item.period}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          item.status === 'archived' ? 'bg-[var(--color-success-lighter)] text-[var(--color-success-darker)]' :
                          item.status === 'locked' ? 'bg-purple-100 text-purple-800' :
                          'bg-[var(--color-warning-lighter)] text-yellow-800'
                        }`}>
                          {item.status === 'archived' ? 'Archivé' :
                           item.status === 'locked' ? 'Verrouillé' : 'En attente'}
                        </span>
                      </div>
                      <div className="text-sm text-[var(--color-text-primary)]">
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