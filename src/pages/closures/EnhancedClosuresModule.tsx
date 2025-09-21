import React, { useState } from 'react';
import { 
  Lock, Calendar, CheckCircle, AlertTriangle, Clock, X,
  FileText, BarChart3, RefreshCw, Settings, Play, ChevronDown,
  Pause, RotateCcw, Shield, Key, Database, Archive, ChevronUp,
  Download, Upload, Eye, Edit, Trash2, Search, ChevronLeft,
  ChevronRight, Info, AlertCircle, Check, Hash, BookOpen,
  TrendingUp, Activity, DollarSign, Users, Zap, Save,
  FileCheck, ListChecks, ClipboardCheck, Timer, Flag,
  LayoutDashboard, Plus
} from 'lucide-react';
import { Line, Bar, Doughnut, Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Enregistrer les composants Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Types complets pour le module de clôtures
interface ClosureWorkflow {
  id: string;
  nom: string;
  type: 'journaliere' | 'mensuelle' | 'trimestrielle' | 'annuelle';
  etapes: WorkflowStep[];
  template: boolean;
  actif: boolean;
  description: string;
  dureeEstimee: number; // en minutes
  dernierUsage?: string;
}

interface WorkflowStep {
  id: string;
  ordre: number;
  nom: string;
  description: string;
  type: 'verification' | 'calcul' | 'generation' | 'validation' | 'archivage';
  automatique: boolean;
  bloquant: boolean;
  script?: string;
  responsable?: string;
  delai?: number; // en minutes
  conditions?: string[];
  actions: WorkflowAction[];
}

interface WorkflowAction {
  id: string;
  type: 'controle' | 'calcul' | 'rapport' | 'notification' | 'archivage';
  nom: string;
  paramètres: Record<string, any>;
  resultat?: any;
  statut?: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  message?: string;
}

interface ClosureExecution {
  id: string;
  workflowId: string;
  exercice: string;
  periode: string;
  dateDebut: Date;
  dateFin?: Date;
  statut: 'planifiee' | 'en-cours' | 'en-validation' | 'terminee' | 'annulee' | 'echouee';
  progression: number;
  etapeCourante?: string;
  responsable: string;
  validateurs: string[];
  logs: ExecutionLog[];
  resultats: ExecutionResult[];
  anomalies: Anomalie[];
}

interface ExecutionLog {
  timestamp: Date;
  niveau: 'info' | 'warning' | 'error' | 'success';
  message: string;
  details?: any;
  utilisateur?: string;
}

interface ExecutionResult {
  etapeId: string;
  actionId: string;
  statut: 'success' | 'warning' | 'error';
  donnees: any;
  fichiers?: string[];
  timestamp: Date;
}

interface Anomalie {
  id: string;
  type: 'equilibre' | 'coherence' | 'completude' | 'conformite' | 'autre';
  severite: 'critique' | 'majeure' | 'mineure' | 'info';
  description: string;
  compte?: string;
  montant?: number;
  resolution?: string;
  resolue: boolean;
  dateDetection: Date;
  dateResolution?: Date;
}

interface ValidationRule {
  id: string;
  nom: string;
  description: string;
  type: 'equilibre' | 'coherence' | 'rapprochement' | 'conformite';
  formule?: string;
  tolerance?: number;
  actif: boolean;
  obligatoire: boolean;
  niveau: 'compte' | 'journal' | 'global';
}

const EnhancedClosuresModule: React.FC = () => {
  const [activeView, setActiveView] = useState<'dashboard' | 'workflows' | 'executions' | 'validations' | 'archives'>('dashboard');
  const [selectedWorkflow, setSelectedWorkflow] = useState<ClosureWorkflow | null>(null);
  const [selectedExecution, setSelectedExecution] = useState<ClosureExecution | null>(null);
  const [showNewWorkflowModal, setShowNewWorkflowModal] = useState(false);
  const [showExecutionModal, setShowExecutionModal] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  // Données de démonstration
  const workflows: ClosureWorkflow[] = [
    {
      id: '1',
      nom: 'Clôture Mensuelle Standard',
      type: 'mensuelle',
      template: true,
      actif: true,
      description: 'Processus standard de clôture mensuelle avec toutes les vérifications',
      dureeEstimee: 180,
      dernierUsage: '2024-01-31',
      etapes: [
        {
          id: 's1',
          ordre: 1,
          nom: 'Vérification des écritures',
          description: 'Contrôle de cohérence et complétude des écritures',
          type: 'verification',
          automatique: true,
          bloquant: true,
          delai: 15,
          actions: [
            {
              id: 'a1',
              type: 'controle',
              nom: 'Vérifier équilibre journal',
              paramètres: { tolerance: 0.01 }
            },
            {
              id: 'a2',
              type: 'controle',
              nom: 'Contrôler pièces justificatives',
              paramètres: { obligatoire: true }
            }
          ]
        },
        {
          id: 's2',
          ordre: 2,
          nom: 'Rapprochement bancaire',
          description: 'Rapprochement des comptes bancaires',
          type: 'verification',
          automatique: false,
          bloquant: true,
          responsable: 'Comptable',
          delai: 30,
          actions: [
            {
              id: 'a3',
              type: 'controle',
              nom: 'Rapprocher relevés bancaires',
              paramètres: { comptes: ['512000'] }
            }
          ]
        },
        {
          id: 's3',
          ordre: 3,
          nom: 'Calculs automatiques',
          description: 'Calcul des provisions et régularisations',
          type: 'calcul',
          automatique: true,
          bloquant: false,
          delai: 20,
          actions: [
            {
              id: 'a4',
              type: 'calcul',
              nom: 'Calculer provisions',
              paramètres: { types: ['clients', 'stocks'] }
            },
            {
              id: 'a5',
              type: 'calcul',
              nom: 'Charges à payer',
              paramètres: { automatic: true }
            }
          ]
        },
        {
          id: 's4',
          ordre: 4,
          nom: 'Génération des états',
          description: 'Production des états financiers',
          type: 'generation',
          automatique: true,
          bloquant: false,
          delai: 10,
          actions: [
            {
              id: 'a6',
              type: 'rapport',
              nom: 'Balance générale',
              paramètres: { format: 'PDF' }
            },
            {
              id: 'a7',
              type: 'rapport',
              nom: 'Grand livre',
              paramètres: { format: 'Excel' }
            }
          ]
        },
        {
          id: 's5',
          ordre: 5,
          nom: 'Validation hiérarchique',
          description: 'Validation par le responsable comptable',
          type: 'validation',
          automatique: false,
          bloquant: true,
          responsable: 'Chef Comptable',
          delai: 60,
          actions: [
            {
              id: 'a8',
              type: 'notification',
              nom: 'Notifier validateur',
              paramètres: { email: true }
            }
          ]
        },
        {
          id: 's6',
          ordre: 6,
          nom: 'Archivage',
          description: 'Archivage des données et documents',
          type: 'archivage',
          automatique: true,
          bloquant: false,
          delai: 15,
          actions: [
            {
              id: 'a9',
              type: 'archivage',
              nom: 'Archiver données',
              paramètres: { compression: true, chiffrement: true }
            }
          ]
        }
      ]
    },
    {
      id: '2',
      nom: 'Clôture Annuelle Complète',
      type: 'annuelle',
      template: true,
      actif: true,
      description: 'Processus complet de clôture annuelle avec toutes les opérations d\'inventaire',
      dureeEstimee: 960,
      dernierUsage: '2023-12-31',
      etapes: [
        // ... étapes similaires mais plus complètes
      ]
    }
  ];

  const executions: ClosureExecution[] = [
    {
      id: 'e1',
      workflowId: '1',
      exercice: '2024',
      periode: 'Janvier 2024',
      dateDebut: new Date('2024-02-01'),
      statut: 'en-cours',
      progression: 65,
      etapeCourante: 's3',
      responsable: 'Jean Dupont',
      validateurs: ['Marie Martin', 'Pierre Durand'],
      logs: [
        {
          timestamp: new Date('2024-02-01T09:00:00'),
          niveau: 'info',
          message: 'Démarrage de la clôture mensuelle',
          utilisateur: 'Jean Dupont'
        },
        {
          timestamp: new Date('2024-02-01T09:15:00'),
          niveau: 'success',
          message: 'Vérification des écritures terminée',
          details: { ecritures: 1234, anomalies: 0 }
        },
        {
          timestamp: new Date('2024-02-01T09:45:00'),
          niveau: 'success',
          message: 'Rapprochement bancaire complété',
          details: { comptes: 3, ecarts: 2 }
        },
        {
          timestamp: new Date('2024-02-01T10:00:00'),
          niveau: 'warning',
          message: 'Anomalie détectée dans le calcul des provisions',
          details: { compte: '391000', ecart: 1250.50 }
        }
      ],
      resultats: [],
      anomalies: [
        {
          id: 'an1',
          type: 'coherence',
          severite: 'mineure',
          description: 'Écart de provision client',
          compte: '391000',
          montant: 1250.50,
          resolue: false,
          dateDetection: new Date('2024-02-01T10:00:00')
        }
      ]
    }
  ];

  const validationRules: ValidationRule[] = [
    {
      id: 'r1',
      nom: 'Équilibre débit/crédit',
      description: 'Vérification de l\'équilibre des écritures',
      type: 'equilibre',
      formule: 'SUM(debit) = SUM(credit)',
      tolerance: 0.01,
      actif: true,
      obligatoire: true,
      niveau: 'global'
    },
    {
      id: 'r2',
      nom: 'Rapprochement bancaire',
      description: 'Contrôle des soldes bancaires',
      type: 'rapprochement',
      actif: true,
      obligatoire: true,
      niveau: 'compte'
    },
    {
      id: 'r3',
      nom: 'Cohérence TVA',
      description: 'Vérification de la cohérence des déclarations TVA',
      type: 'coherence',
      formule: 'TVA_COLLECTEE - TVA_DEDUCTIBLE = TVA_A_PAYER',
      tolerance: 1,
      actif: true,
      obligatoire: false,
      niveau: 'global'
    }
  ];

  // Statistiques pour le dashboard
  const stats = {
    workflows: {
      total: workflows.length,
      actifs: workflows.filter(w => w.actif).length,
      templates: workflows.filter(w => w.template).length
    },
    executions: {
      total: executions.length,
      enCours: executions.filter(e => e.statut === 'en-cours').length,
      terminees: executions.filter(e => e.statut === 'terminee').length,
      echouees: executions.filter(e => e.statut === 'echouee').length
    },
    anomalies: {
      total: executions.reduce((acc, e) => acc + e.anomalies.length, 0),
      critiques: executions.reduce((acc, e) => acc + e.anomalies.filter(a => a.severite === 'critique').length, 0),
      resolues: executions.reduce((acc, e) => acc + e.anomalies.filter(a => a.resolue).length, 0)
    },
    performance: {
      tempsMovgen: 180,
      tauxReussite: 94,
      conformite: 98
    }
  };

  // Graphiques
  const performanceData = {
    labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'],
    datasets: [
      {
        label: 'Temps de clôture (min)',
        data: [180, 165, 170, 155, 160, 150],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4
      },
      {
        label: 'Anomalies détectées',
        data: [5, 3, 4, 2, 3, 1],
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
        yAxisID: 'y1'
      }
    ]
  };

  const workflowDistribution = {
    labels: ['Journalière', 'Mensuelle', 'Trimestrielle', 'Annuelle'],
    datasets: [{
      data: [365, 12, 4, 1],
      backgroundColor: [
        'rgba(59, 130, 246, 0.8)',
        'rgba(34, 197, 94, 0.8)',
        'rgba(251, 146, 60, 0.8)',
        'rgba(168, 85, 247, 0.8)'
      ]
    }]
  };

  const validationMetrics = {
    labels: ['Équilibre', 'Cohérence', 'Complétude', 'Conformité', 'Rapprochement'],
    datasets: [{
      label: 'Taux de conformité',
      data: [100, 98, 95, 97, 99],
      backgroundColor: 'rgba(34, 197, 94, 0.2)',
      borderColor: 'rgb(34, 197, 94)',
      pointBackgroundColor: 'rgb(34, 197, 94)',
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: 'rgb(34, 197, 94)'
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const
      }
    }
  };

  const toggleStepExpansion = (stepId: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileCheck className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">
              +12%
            </span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{stats.workflows.total}</h3>
          <p className="text-sm text-gray-500 mt-1">Workflows configurés</p>
          <div className="mt-4 flex items-center text-xs">
            <span className="text-gray-600">{stats.workflows.actifs} actifs</span>
            <span className="mx-2">•</span>
            <span className="text-gray-600">{stats.workflows.templates} templates</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded">
              En cours
            </span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{stats.executions.enCours}</h3>
          <p className="text-sm text-gray-500 mt-1">Clôtures actives</p>
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: '65%' }}></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">Progression moyenne: 65%</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
            <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-1 rounded">
              {stats.anomalies.critiques} critiques
            </span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{stats.anomalies.total}</h3>
          <p className="text-sm text-gray-500 mt-1">Anomalies détectées</p>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-gray-600">
              {stats.anomalies.resolues} résolues
            </span>
            <span className="text-xs text-orange-600 font-medium">
              {stats.anomalies.total - stats.anomalies.resolues} en attente
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">
              +5%
            </span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{stats.performance.tauxReussite}%</h3>
          <p className="text-sm text-gray-500 mt-1">Taux de réussite</p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-gray-500">Temps moy.</p>
              <p className="font-semibold">{stats.performance.tempsMovgen} min</p>
            </div>
            <div>
              <p className="text-gray-500">Conformité</p>
              <p className="font-semibold">{stats.performance.conformite}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Performance des clôtures</h3>
              <p className="text-sm text-gray-500">Évolution sur 6 mois</p>
            </div>
            <select className="text-sm border border-gray-200 rounded-lg px-3 py-1.5">
              <option>6 derniers mois</option>
              <option>12 derniers mois</option>
              <option>Année en cours</option>
            </select>
          </div>
          <div style={{ position: 'relative', height: '300px', width: '100%' }}>
            <Line 
              data={performanceData} 
              options={{
                ...chartOptions,
                scales: {
                  y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                      display: true,
                      text: 'Temps (min)'
                    }
                  },
                  y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                      display: true,
                      text: 'Anomalies'
                    },
                    grid: {
                      drawOnChartArea: false
                    }
                  }
                }
              }}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Répartition des clôtures</h3>
            <p className="text-sm text-gray-500">Par type de période</p>
          </div>
          <div style={{ position: 'relative', height: '300px', width: '100%' }}>
            <Doughnut data={workflowDistribution} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Clôtures en cours */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Clôtures en cours</h3>
              <p className="text-sm text-gray-500">Suivi en temps réel</p>
            </div>
            <button 
              onClick={() => setShowExecutionModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Nouvelle clôture
            </button>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {executions.filter(e => e.statut === 'en-cours').map((execution) => (
              <div key={execution.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-gray-900">{execution.periode}</h4>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                        {execution.statut}
                      </span>
                      {execution.anomalies.length > 0 && (
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {execution.anomalies.length} anomalies
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Responsable</p>
                        <p className="font-medium">{execution.responsable}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Début</p>
                        <p className="font-medium">{execution.dateDebut.toLocaleString('fr-FR')}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Étape actuelle</p>
                        <p className="font-medium">
                          {workflows[0].etapes.find(e => e.id === execution.etapeCourante)?.nom || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Progression</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${execution.progression}%` }}
                            />
                          </div>
                          <span className="font-medium">{execution.progression}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedExecution(execution)}
                    className="ml-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Métriques de validation */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Métriques de validation</h3>
          <p className="text-sm text-gray-500">Taux de conformité par type de contrôle</p>
        </div>
        <div style={{ position: 'relative', height: '300px', width: '100%' }}>
          <Radar data={validationMetrics} options={chartOptions} />
        </div>
      </div>
    </div>
  );

  const renderWorkflows = () => (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Workflows de clôture</h2>
          <p className="text-gray-500">Gérez vos processus de clôture automatisés</p>
        </div>
        <button
          onClick={() => setShowNewWorkflowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nouveau workflow
        </button>
      </div>

      {/* Liste des workflows */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {workflows.map((workflow) => (
          <div key={workflow.id} className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{workflow.nom}</h3>
                    {workflow.template && (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">
                        Template
                      </span>
                    )}
                    {workflow.actif ? (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                        Actif
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                        Inactif
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{workflow.description}</p>
                </div>
                <button
                  onClick={() => setSelectedWorkflow(workflow)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Settings className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                <div>
                  <p className="text-gray-500">Type</p>
                  <p className="font-medium capitalize">{workflow.type}</p>
                </div>
                <div>
                  <p className="text-gray-500">Durée estimée</p>
                  <p className="font-medium">{workflow.dureeEstimee} min</p>
                </div>
                <div>
                  <p className="text-gray-500">Étapes</p>
                  <p className="font-medium">{workflow.etapes.length}</p>
                </div>
              </div>

              {/* Étapes du workflow */}
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700">Étapes du processus</p>
                  <button
                    onClick={() => workflow.etapes.forEach(e => toggleStepExpansion(e.id))}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    {expandedSteps.size === 0 ? 'Tout développer' : 'Tout réduire'}
                  </button>
                </div>
                {workflow.etapes.map((etape, index) => (
                  <div key={etape.id} className="border border-gray-200 rounded-lg">
                    <button
                      onClick={() => toggleStepExpansion(etape.id)}
                      className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">
                          {etape.ordre}
                        </span>
                        <span className="text-sm font-medium">{etape.nom}</span>
                        {etape.automatique && (
                          <Zap className="w-3 h-3 text-yellow-500" />
                        )}
                        {etape.bloquant && (
                          <Lock className="w-3 h-3 text-red-500" />
                        )}
                      </div>
                      {expandedSteps.has(etape.id) ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                    {expandedSteps.has(etape.id) && (
                      <div className="px-3 py-2 border-t border-gray-100 bg-gray-50">
                        <p className="text-xs text-gray-600 mb-2">{etape.description}</p>
                        <div className="space-y-1">
                          {etape.actions.map((action) => (
                            <div key={action.id} className="flex items-center gap-2 text-xs">
                              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                              <span className="text-gray-700">{action.nom}</span>
                            </div>
                          ))}
                        </div>
                        {etape.responsable && (
                          <p className="text-xs text-gray-500 mt-2">
                            Responsable: {etape.responsable}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {workflow.dernierUsage && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    Dernière utilisation: {new Date(workflow.dernierUsage).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderValidations = () => (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Règles de validation</h2>
          <p className="text-gray-500">Configurez les contrôles et validations automatiques</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nouvelle règle
        </button>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
        <div className="flex flex-wrap items-center gap-4">
          <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
            <option>Tous les types</option>
            <option>Équilibre</option>
            <option>Cohérence</option>
            <option>Rapprochement</option>
            <option>Conformité</option>
          </select>
          <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
            <option>Tous les niveaux</option>
            <option>Compte</option>
            <option>Journal</option>
            <option>Global</option>
          </select>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="actives" className="rounded" defaultChecked />
            <label htmlFor="actives" className="text-sm">Actives uniquement</label>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="obligatoires" className="rounded" />
            <label htmlFor="obligatoires" className="text-sm">Obligatoires uniquement</label>
          </div>
        </div>
      </div>

      {/* Table des règles */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Règle</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Type</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Niveau</th>
              <th className="text-center px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Statut</th>
              <th className="text-center px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Obligatoire</th>
              <th className="text-center px-6 py-3 text-xs font-semibold text-gray-600 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {validationRules.map((rule) => (
              <tr key={rule.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium text-gray-900">{rule.nom}</p>
                    <p className="text-sm text-gray-500">{rule.description}</p>
                    {rule.formule && (
                      <code className="text-xs bg-gray-100 px-2 py-0.5 rounded mt-1 inline-block">
                        {rule.formule}
                      </code>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    rule.type === 'equilibre' ? 'bg-blue-100 text-blue-700' :
                    rule.type === 'coherence' ? 'bg-green-100 text-green-700' :
                    rule.type === 'rapprochement' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-purple-100 text-purple-700'
                  }`}>
                    {rule.type}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm capitalize">{rule.niveau}</span>
                </td>
                <td className="px-6 py-4 text-center">
                  {rule.actif ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                      <CheckCircle className="w-3 h-3" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                      <X className="w-3 h-3" />
                      Inactive
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  {rule.obligatoire ? (
                    <Lock className="w-4 h-4 text-red-500 mx-auto" />
                  ) : (
                    <span className="text-gray-300">-</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-1">
                    <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                      <Edit className="w-4 h-4 text-gray-500" />
                    </button>
                    <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                      <Eye className="w-4 h-4 text-gray-500" />
                    </button>
                    {!rule.obligatoire && (
                      <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                        <Trash2 className="w-4 h-4 text-gray-500" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Module de Clôtures</h1>
          <p className="text-gray-500 mt-2">Gestion complète des processus de clôture comptable</p>
        </div>

        {/* Navigation tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center p-1">
            {[
              { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
              { id: 'workflows', label: 'Workflows', icon: ListChecks },
              { id: 'executions', label: 'Exécutions', icon: Play },
              { id: 'validations', label: 'Validations', icon: ClipboardCheck },
              { id: 'archives', label: 'Archives', icon: Archive }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveView(tab.id as any)}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                    activeView === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        {activeView === 'dashboard' && renderDashboard()}
        {activeView === 'workflows' && renderWorkflows()}
        {activeView === 'validations' && renderValidations()}
        {/* Les autres vues peuvent être implémentées de manière similaire */}
      </div>
    </div>
  );
};

export default EnhancedClosuresModule;