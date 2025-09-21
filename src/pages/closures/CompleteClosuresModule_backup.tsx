import React, { useState } from 'react';
import { 
  Lock, Calendar, CheckCircle, AlertTriangle, Clock,
  FileText, BarChart3, RefreshCw, Settings, Play,
  Pause, RotateCcw, Shield, Key, Database, Archive,
  Download, Upload, Eye, Edit, Trash2, Search,
  ChevronRight, Info, AlertCircle, Check, X,
  TrendingUp, Activity, DollarSign, Users
} from 'lucide-react';
import { ModernCard, CardHeader, CardBody, StatCard } from '../../components/ui/ModernCard';
import ModernButton from '../../components/ui/ModernButton';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
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
  Title,
  Tooltip,
  Legend,
  Filler
);

// Types
interface ClosurePeriod {
  id: string;
  type: 'journaliere' | 'mensuelle' | 'trimestrielle' | 'annuelle';
  periode: string;
  dateDebut: string;
  dateFin: string;
  statut: 'ouverte' | 'en-cours' | 'en-validation' | 'cloturee' | 'archivee';
  etape: number;
  totalEtapes: number;
  progression: number;
  responsable: string;
  dateExecution?: string;
  dateCloture?: string;
  anomalies: number;
  ecritures: number;
  soldeDebit: number;
  soldeCredit: number;
  equilibre: boolean;
}

interface ClosureTask {
  id: string;
  closureId: string;
  ordre: number;
  libelle: string;
  description: string;
  type: 'controle' | 'validation' | 'calcul' | 'generation' | 'archivage';
  statut: 'en-attente' | 'en-cours' | 'complete' | 'erreur' | 'ignore';
  obligatoire: boolean;
  automatique: boolean;
  resultat?: string;
  erreurs?: string[];
  dateExecution?: string;
  executePar?: string;
}

interface ClosureControl {
  id: string;
  nom: string;
  description: string;
  type: 'equilibre' | 'coherence' | 'exhaustivite' | 'conformite';
  severite: 'bloquant' | 'critique' | 'majeur' | 'mineur';
  statut: 'passe' | 'echoue' | 'en-cours' | 'non-execute';
  resultat?: {
    attendu: any;
    obtenu: any;
    ecart: any;
  };
  corrections?: string[];
}

interface ExerciseInfo {
  id: string;
  annee: string;
  dateDebut: string;
  dateFin: string;
  statut: 'ouvert' | 'cloture' | 'archive';
  societe: string;
  devise: string;
  totalActif: number;
  totalPassif: number;
  resultatNet: number;
  nombreEcritures: number;
  nombreComptes: number;
  derniereCloture?: string;
}

interface ArchiveEntry {
  id: string;
  exercice: string;
  type: 'backup' | 'export' | 'archive';
  date: string;
  taille: string;
  fichier: string;
  statut: 'disponible' | 'en-cours' | 'erreur';
  responsable: string;
  description: string;
}

const CompleteClosuresModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedPeriod, setSelectedPeriod] = useState('current');
  const [showClosureModal, setShowClosureModal] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [selectedClosure, setSelectedClosure] = useState<ClosurePeriod | null>(null);

  // Données de démonstration
  const stats = {
    periodesOuvertes: 3,
    cloturesEnCours: 1,
    cloturesTerminees: 24,
    anomaliesDetectees: 5,
    tauxReussite: 96,
    prochaineCloture: '31/01/2024',
    derniereArchive: '15/01/2024',
    espaceArchive: '2.4 GB'
  };

  const closurePeriods: ClosurePeriod[] = [
    {
      id: '1',
      type: 'mensuelle',
      periode: 'Janvier 2024',
      dateDebut: '2024-01-01',
      dateFin: '2024-01-31',
      statut: 'en-cours',
      etape: 6,
      totalEtapes: 10,
      progression: 60,
      responsable: 'Ahmed Benali',
      anomalies: 3,
      ecritures: 1245,
      soldeDebit: 1542380,
      soldeCredit: 1542380,
      equilibre: true
    },
    {
      id: '2',
      type: 'mensuelle',
      periode: 'Décembre 2023',
      dateDebut: '2023-12-01',
      dateFin: '2023-12-31',
      statut: 'cloturee',
      etape: 10,
      totalEtapes: 10,
      progression: 100,
      responsable: 'Ahmed Benali',
      dateExecution: '2024-01-05',
      dateCloture: '2024-01-05',
      anomalies: 0,
      ecritures: 1389,
      soldeDebit: 1875420,
      soldeCredit: 1875420,
      equilibre: true
    },
    {
      id: '3',
      type: 'annuelle',
      periode: 'Exercice 2023',
      dateDebut: '2023-01-01',
      dateFin: '2023-12-31',
      statut: 'en-validation',
      etape: 8,
      totalEtapes: 12,
      progression: 67,
      responsable: 'Direction Financière',
      anomalies: 12,
      ecritures: 15678,
      soldeDebit: 18754200,
      soldeCredit: 18754200,
      equilibre: true
    },
    {
      id: '4',
      type: 'journaliere',
      periode: '15/01/2024',
      dateDebut: '2024-01-15',
      dateFin: '2024-01-15',
      statut: 'ouverte',
      etape: 0,
      totalEtapes: 5,
      progression: 0,
      responsable: 'Système',
      anomalies: 0,
      ecritures: 42,
      soldeDebit: 125000,
      soldeCredit: 125000,
      equilibre: true
    }
  ];

  const closureTasks: ClosureTask[] = [
    {
      id: '1',
      closureId: '1',
      ordre: 1,
      libelle: 'Vérification de l\'équilibre',
      description: 'Contrôle de l\'égalité débit/crédit',
      type: 'controle',
      statut: 'complete',
      obligatoire: true,
      automatique: true,
      resultat: 'Équilibre vérifié : Débit = Crédit = 1,542,380',
      dateExecution: '2024-01-15T10:00:00'
    },
    {
      id: '2',
      closureId: '1',
      ordre: 2,
      libelle: 'Lettrage des comptes',
      description: 'Lettrage automatique des comptes clients/fournisseurs',
      type: 'calcul',
      statut: 'complete',
      obligatoire: true,
      automatique: true,
      resultat: '234 comptes lettrés',
      dateExecution: '2024-01-15T10:05:00'
    },
    {
      id: '3',
      closureId: '1',
      ordre: 3,
      libelle: 'Rapprochement bancaire',
      description: 'Rapprochement des comptes bancaires',
      type: 'controle',
      statut: 'complete',
      obligatoire: true,
      automatique: false,
      resultat: '3 comptes bancaires rapprochés',
      dateExecution: '2024-01-15T10:30:00',
      executePar: 'Ahmed Benali'
    },
    {
      id: '4',
      closureId: '1',
      ordre: 4,
      libelle: 'Calcul des provisions',
      description: 'Calcul et comptabilisation des provisions',
      type: 'calcul',
      statut: 'complete',
      obligatoire: true,
      automatique: false,
      resultat: 'Provisions calculées : 45,000',
      dateExecution: '2024-01-15T11:00:00',
      executePar: 'Ahmed Benali'
    },
    {
      id: '5',
      closureId: '1',
      ordre: 5,
      libelle: 'Régularisations',
      description: 'Écritures de régularisation',
      type: 'calcul',
      statut: 'complete',
      obligatoire: true,
      automatique: false,
      resultat: '12 écritures de régularisation',
      dateExecution: '2024-01-15T11:30:00',
      executePar: 'Ahmed Benali'
    },
    {
      id: '6',
      closureId: '1',
      ordre: 6,
      libelle: 'Validation hiérarchique',
      description: 'Validation par le responsable comptable',
      type: 'validation',
      statut: 'en-cours',
      obligatoire: true,
      automatique: false
    },
    {
      id: '7',
      closureId: '1',
      ordre: 7,
      libelle: 'Génération des états',
      description: 'Génération automatique des états de clôture',
      type: 'generation',
      statut: 'en-attente',
      obligatoire: true,
      automatique: true
    },
    {
      id: '8',
      closureId: '1',
      ordre: 8,
      libelle: 'Archivage',
      description: 'Archivage des données de la période',
      type: 'archivage',
      statut: 'en-attente',
      obligatoire: true,
      automatique: true
    }
  ];

  const closureControls: ClosureControl[] = [
    {
      id: '1',
      nom: 'Équilibre général',
      description: 'Vérification de l\'équilibre débit/crédit',
      type: 'equilibre',
      severite: 'bloquant',
      statut: 'passe',
      resultat: {
        attendu: 0,
        obtenu: 0,
        ecart: 0
      }
    },
    {
      id: '2',
      nom: 'Cohérence des soldes',
      description: 'Vérification de la cohérence des soldes',
      type: 'coherence',
      severite: 'critique',
      statut: 'passe',
      resultat: {
        attendu: 'Soldes cohérents',
        obtenu: 'Soldes cohérents',
        ecart: 'Aucun'
      }
    },
    {
      id: '3',
      nom: 'Comptes d\'attente',
      description: 'Vérification des comptes d\'attente non soldés',
      type: 'exhaustivite',
      severite: 'majeur',
      statut: 'echoue',
      resultat: {
        attendu: 0,
        obtenu: 3,
        ecart: 3
      },
      corrections: [
        'Solder le compte 471000 : 12,500',
        'Solder le compte 472000 : 8,200',
        'Solder le compte 473000 : 3,100'
      ]
    },
    {
      id: '4',
      nom: 'TVA collectée/déductible',
      description: 'Cohérence TVA collectée vs TVA déductible',
      type: 'conformite',
      severite: 'majeur',
      statut: 'passe',
      resultat: {
        attendu: 'TVA équilibrée',
        obtenu: 'TVA équilibrée',
        ecart: 0
      }
    },
    {
      id: '5',
      nom: 'Écritures non validées',
      description: 'Présence d\'écritures en statut brouillon',
      type: 'exhaustivite',
      severite: 'critique',
      statut: 'echoue',
      resultat: {
        attendu: 0,
        obtenu: 8,
        ecart: 8
      },
      corrections: [
        'Valider les 8 écritures en attente'
      ]
    }
  ];

  const exerciseInfo: ExerciseInfo = {
    id: '1',
    annee: '2024',
    dateDebut: '2024-01-01',
    dateFin: '2024-12-31',
    statut: 'ouvert',
    societe: 'WiseBook Solutions SARL',
    devise: 'MAD',
    totalActif: 4300000,
    totalPassif: 4300000,
    resultatNet: 350000,
    nombreEcritures: 1245,
    nombreComptes: 156,
    derniereCloture: '2023-12-31'
  };

  const archives: ArchiveEntry[] = [
    {
      id: '1',
      exercice: '2023',
      type: 'archive',
      date: '2024-01-05',
      taille: '1.2 GB',
      fichier: 'ARCHIVE_2023_COMPLETE.zip',
      statut: 'disponible',
      responsable: 'Système',
      description: 'Archive complète exercice 2023'
    },
    {
      id: '2',
      exercice: '2023-12',
      type: 'backup',
      date: '2024-01-01',
      taille: '156 MB',
      fichier: 'BACKUP_2023_12.bak',
      statut: 'disponible',
      responsable: 'Système',
      description: 'Sauvegarde mensuelle Décembre 2023'
    },
    {
      id: '3',
      exercice: '2023',
      type: 'export',
      date: '2024-01-10',
      taille: '45 MB',
      fichier: 'EXPORT_FEC_2023.txt',
      statut: 'disponible',
      responsable: 'Ahmed Benali',
      description: 'Export FEC pour contrôle fiscal'
    }
  ];

  // Graphiques
  const progressionData = {
    labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'],
    datasets: [
      {
        label: 'Clôtures réussies',
        data: [100, 100, 95, 100, 100, 98, 100, 100, 96, 100, 100, 100],
        borderColor: 'rgba(34, 197, 94, 1)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true
      },
      {
        label: 'Anomalies détectées',
        data: [2, 0, 5, 1, 0, 3, 0, 1, 4, 0, 1, 0],
        borderColor: 'rgba(239, 68, 68, 1)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true
      }
    ]
  };

  const repartitionData = {
    labels: ['Journalières', 'Mensuelles', 'Trimestrielles', 'Annuelles'],
    datasets: [
      {
        data: [365, 12, 4, 1],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(139, 92, 246, 0.8)'
        ]
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 15,
          usePointStyle: true,
          font: { size: 11 }
        }
      }
    }
  };

  const getStatutBadge = (statut: string) => {
    const badges = {
      'ouverte': { bg: 'bg-green-100', text: 'text-green-700', icon: Play },
      'en-cours': { bg: 'bg-blue-100', text: 'text-blue-700', icon: Clock },
      'en-validation': { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: AlertTriangle },
      'cloturee': { bg: 'bg-gray-100', text: 'text-gray-700', icon: Lock },
      'archivee': { bg: 'bg-purple-100', text: 'text-purple-700', icon: Archive },
      'en-attente': { bg: 'bg-gray-100', text: 'text-gray-700', icon: Clock },
      'complete': { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
      'erreur': { bg: 'bg-red-100', text: 'text-red-700', icon: AlertCircle },
      'ignore': { bg: 'bg-gray-100', text: 'text-gray-700', icon: X },
      'passe': { bg: 'bg-green-100', text: 'text-green-700', icon: Check },
      'echoue': { bg: 'bg-red-100', text: 'text-red-700', icon: X },
      'non-execute': { bg: 'bg-gray-100', text: 'text-gray-700', icon: Clock },
      'disponible': { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
      'ouvert': { bg: 'bg-green-100', text: 'text-green-700', icon: Play },
      'cloture': { bg: 'bg-gray-100', text: 'text-gray-700', icon: Lock },
      'archive': { bg: 'bg-purple-100', text: 'text-purple-700', icon: Archive }
    };
    const badge = badges[statut as keyof typeof badges];
    const Icon = badge?.icon || Info;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${badge?.bg} ${badge?.text}`}>
        <Icon className="w-3 h-3" />
        {statut.replace('-', ' ')}
      </span>
    );
  };

  const getSeveriteBadge = (severite: string) => {
    const badges = {
      'bloquant': { bg: 'bg-red-100', text: 'text-red-700' },
      'critique': { bg: 'bg-orange-100', text: 'text-orange-700' },
      'majeur': { bg: 'bg-yellow-100', text: 'text-yellow-700' },
      'mineur': { bg: 'bg-blue-100', text: 'text-blue-700' }
    };
    const badge = badges[severite as keyof typeof badges];
    return (
      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${badge?.bg} ${badge?.text}`}>
        {severite}
      </span>
    );
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Périodes ouvertes"
          value={stats.periodesOuvertes.toString()}
          icon={Play}
          color="success"
          subtitle="En cours de traitement"
        />
        <StatCard
          title="Clôtures en cours"
          value={stats.cloturesEnCours.toString()}
          icon={Clock}
          color="warning"
          subtitle="À valider"
        />
        <StatCard
          title="Taux de réussite"
          value={`${stats.tauxReussite}%`}
          icon={CheckCircle}
          trend={{ value: 2.3, type: 'increase' }}
          color="primary"
        />
        <StatCard
          title="Anomalies"
          value={stats.anomaliesDetectees.toString()}
          icon={AlertTriangle}
          color="error"
          subtitle="À corriger"
        />
      </div>

      {/* Exercice en cours */}
      <ModernCard>
        <CardHeader
          title="Exercice en cours"
          subtitle={`${exerciseInfo.societe} - ${exerciseInfo.annee}`}
          icon={Calendar}
          action={
            <ModernButton size="sm" variant="outline">
              <Settings className="w-4 h-4 mr-1" />
              Paramètres
            </ModernButton>
          }
        />
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Période</p>
              <p className="text-sm font-medium mt-1">
                {new Date(exerciseInfo.dateDebut).toLocaleDateString('fr-FR')} - {new Date(exerciseInfo.dateFin).toLocaleDateString('fr-FR')}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Écritures</p>
              <p className="text-xl font-bold mt-1">{exerciseInfo.nombreEcritures.toLocaleString('fr-FR')}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Comptes actifs</p>
              <p className="text-xl font-bold mt-1">{exerciseInfo.nombreComptes}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Résultat net</p>
              <p className="text-xl font-bold mt-1 text-green-600">
                €{exerciseInfo.resultatNet.toLocaleString('fr-FR')}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Statut</p>
              <div className="mt-1">
                {getStatutBadge(exerciseInfo.statut)}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-3">
              <Info className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">Prochaine clôture mensuelle</p>
                <p className="text-xs text-blue-700">Prévue le {stats.prochaineCloture}</p>
              </div>
            </div>
            <ModernButton size="sm" variant="primary">
              <Play className="w-4 h-4 mr-1" />
              Lancer la clôture
            </ModernButton>
          </div>
        </CardBody>
      </ModernCard>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ModernCard>
          <CardHeader
            title="Historique des clôtures"
            subtitle="12 derniers mois"
            icon={BarChart3}
          />
          <CardBody>
            <div className="h-64">
              <Line data={progressionData} options={chartOptions} />
            </div>
          </CardBody>
        </ModernCard>

        <ModernCard>
          <CardHeader
            title="Répartition par type"
            subtitle="Total annuel"
            icon={Activity}
          />
          <CardBody>
            <div className="h-64">
              <Doughnut data={repartitionData} options={chartOptions} />
            </div>
          </CardBody>
        </ModernCard>
      </div>

      {/* Clôtures récentes */}
      <ModernCard>
        <CardHeader
          title="Clôtures récentes et en cours"
          icon={Clock}
          action={
            <ModernButton size="sm" variant="outline">
              <Eye className="w-4 h-4 mr-1" />
              Voir tout
            </ModernButton>
          }
        />
        <CardBody>
          <div className="space-y-3">
            {closurePeriods.slice(0, 4).map((closure) => (
              <div key={closure.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    closure.statut === 'cloturee' ? 'bg-gray-100' :
                    closure.statut === 'en-cours' ? 'bg-blue-100' :
                    closure.statut === 'en-validation' ? 'bg-yellow-100' :
                    'bg-green-100'
                  }`}>
                    <Calendar className={`w-6 h-6 ${
                      closure.statut === 'cloturee' ? 'text-gray-600' :
                      closure.statut === 'en-cours' ? 'text-blue-600' :
                      closure.statut === 'en-validation' ? 'text-yellow-600' :
                      'text-green-600'
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{closure.periode}</p>
                    <p className="text-xs text-gray-500">
                      {closure.ecritures} écritures • {closure.responsable}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {closure.statut === 'en-cours' || closure.statut === 'en-validation' ? (
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Progression</p>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              closure.progression === 100 ? 'bg-green-500' :
                              closure.progression >= 60 ? 'bg-blue-500' :
                              'bg-yellow-500'
                            }`}
                            style={{ width: `${closure.progression}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium">{closure.progression}%</span>
                      </div>
                    </div>
                  ) : null}
                  {closure.anomalies > 0 && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
                      <AlertTriangle className="w-3 h-3" />
                      {closure.anomalies}
                    </div>
                  )}
                  {getStatutBadge(closure.statut)}
                  <button 
                    onClick={() => setSelectedClosure(closure)}
                    className="p-2 hover:bg-gray-200 rounded transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </ModernCard>
    </div>
  );

  const renderClosures = () => (
    <div className="space-y-6">
      {/* Barre d'outils */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <select className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm">
            <option value="all">Tous les types</option>
            <option value="journaliere">Journalière</option>
            <option value="mensuelle">Mensuelle</option>
            <option value="trimestrielle">Trimestrielle</option>
            <option value="annuelle">Annuelle</option>
          </select>
          <select className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm">
            <option value="all">Tous les statuts</option>
            <option value="ouverte">Ouverte</option>
            <option value="en-cours">En cours</option>
            <option value="en-validation">En validation</option>
            <option value="cloturee">Clôturée</option>
            <option value="archivee">Archivée</option>
          </select>
        </div>
        <div className="flex items-center gap-3">
          <ModernButton variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-1" />
            Actualiser
          </ModernButton>
          <ModernButton variant="primary" size="sm" onClick={() => setShowClosureModal(true)}>
            <Play className="w-4 h-4 mr-1" />
            Nouvelle clôture
          </ModernButton>
        </div>
      </div>

      {/* Table des clôtures */}
      <ModernCard>
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Type</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Période</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Écritures</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Débit</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Crédit</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Équilibre</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Anomalies</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Progression</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Statut</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {closurePeriods.map((closure) => (
                  <tr key={closure.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                        closure.type === 'journaliere' ? 'bg-blue-100 text-blue-700' :
                        closure.type === 'mensuelle' ? 'bg-green-100 text-green-700' :
                        closure.type === 'trimestrielle' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {closure.type}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-sm font-medium">{closure.periode}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(closure.dateDebut).toLocaleDateString('fr-FR')} - {new Date(closure.dateFin).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center text-sm">{closure.ecritures.toLocaleString('fr-FR')}</td>
                    <td className="py-3 px-4 text-right text-sm">€{closure.soldeDebit.toLocaleString('fr-FR')}</td>
                    <td className="py-3 px-4 text-right text-sm">€{closure.soldeCredit.toLocaleString('fr-FR')}</td>
                    <td className="py-3 px-4 text-center">
                      {closure.equilibre ? (
                        <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-500 mx-auto" />
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {closure.anomalies > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">
                          <AlertTriangle className="w-3 h-3" />
                          {closure.anomalies}
                        </span>
                      ) : (
                        <span className="text-green-600 text-xs">Aucune</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              closure.progression === 100 ? 'bg-green-500' :
                              closure.progression >= 60 ? 'bg-blue-500' :
                              'bg-yellow-500'
                            }`}
                            style={{ width: `${closure.progression}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600">{closure.progression}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {getStatutBadge(closure.statut)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <button className="p-1 hover:bg-gray-100 rounded transition-colors" title="Voir">
                          <Eye className="w-4 h-4 text-gray-500" />
                        </button>
                        {closure.statut === 'en-cours' && (
                          <button className="p-1 hover:bg-gray-100 rounded transition-colors" title="Continuer">
                            <Play className="w-4 h-4 text-gray-500" />
                          </button>
                        )}
                        {closure.statut === 'ouverte' && (
                          <button className="p-1 hover:bg-gray-100 rounded transition-colors" title="Lancer">
                            <Play className="w-4 h-4 text-gray-500" />
                          </button>
                        )}
                        {closure.statut === 'en-validation' && (
                          <button className="p-1 hover:bg-gray-100 rounded transition-colors" title="Valider">
                            <CheckCircle className="w-4 h-4 text-gray-500" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </ModernCard>
    </div>
  );

  const renderTasks = () => (
    <div className="space-y-6">
      {selectedClosure ? (
        <>
          {/* En-tête de la clôture sélectionnée */}
          <ModernCard>
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{selectedClosure.periode}</h3>
                  <p className="text-sm text-gray-500">
                    {selectedClosure.ecritures} écritures • Responsable: {selectedClosure.responsable}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {getStatutBadge(selectedClosure.statut)}
                  <ModernButton variant="outline" size="sm" onClick={() => setSelectedClosure(null)}>
                    <X className="w-4 h-4 mr-1" />
                    Fermer
                  </ModernButton>
                </div>
              </div>

              {/* Barre de progression globale */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">Progression globale</p>
                  <p className="text-sm text-gray-500">
                    Étape {selectedClosure.etape} sur {selectedClosure.totalEtapes}
                  </p>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full ${
                      selectedClosure.progression === 100 ? 'bg-green-500' :
                      selectedClosure.progression >= 60 ? 'bg-blue-500' :
                      'bg-yellow-500'
                    }`}
                    style={{ width: `${selectedClosure.progression}%` }}
                  />
                </div>
              </div>
            </CardBody>
          </ModernCard>

          {/* Liste des tâches */}
          <ModernCard>
            <CardHeader
              title="Étapes de clôture"
              subtitle="Processus détaillé"
              icon={FileText}
              action={
                <div className="flex items-center gap-2">
                  <ModernButton size="sm" variant="outline">
                    <Pause className="w-4 h-4 mr-1" />
                    Suspendre
                  </ModernButton>
                  <ModernButton size="sm" variant="primary">
                    <Play className="w-4 h-4 mr-1" />
                    Continuer
                  </ModernButton>
                </div>
              }
            />
            <CardBody>
              <div className="space-y-3">
                {closureTasks
                  .filter(task => task.closureId === selectedClosure.id)
                  .map((task) => (
                    <div key={task.id} className={`p-4 border rounded-lg ${
                      task.statut === 'complete' ? 'border-green-200 bg-green-50' :
                      task.statut === 'en-cours' ? 'border-blue-200 bg-blue-50' :
                      task.statut === 'erreur' ? 'border-red-200 bg-red-50' :
                      'border-gray-200 bg-gray-50'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="mt-1">
                            {task.statut === 'complete' ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : task.statut === 'en-cours' ? (
                              <Clock className="w-5 h-5 text-blue-600 animate-pulse" />
                            ) : task.statut === 'erreur' ? (
                              <AlertCircle className="w-5 h-5 text-red-600" />
                            ) : (
                              <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">{task.ordre}. {task.libelle}</p>
                              {task.obligatoire && (
                                <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-700 rounded">
                                  Obligatoire
                                </span>
                              )}
                              {task.automatique && (
                                <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                                  Auto
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{task.description}</p>
                            {task.resultat && (
                              <div className="mt-2 p-2 bg-white rounded border border-gray-200">
                                <p className="text-xs text-gray-600">{task.resultat}</p>
                                {task.dateExecution && (
                                  <p className="text-xs text-gray-400 mt-1">
                                    {new Date(task.dateExecution).toLocaleString('fr-FR')}
                                    {task.executePar && ` par ${task.executePar}`}
                                  </p>
                                )}
                              </div>
                            )}
                            {task.erreurs && task.erreurs.length > 0 && (
                              <div className="mt-2 p-2 bg-red-50 rounded border border-red-200">
                                {task.erreurs.map((erreur, index) => (
                                  <p key={index} className="text-xs text-red-600">• {erreur}</p>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatutBadge(task.statut)}
                          {task.statut === 'en-attente' && !task.automatique && (
                            <ModernButton size="sm" variant="primary">
                              <Play className="w-3 h-3" />
                            </ModernButton>
                          )}
                          {task.statut === 'erreur' && (
                            <ModernButton size="sm" variant="outline">
                              <RotateCcw className="w-3 h-3" />
                            </ModernButton>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardBody>
          </ModernCard>
        </>
      ) : (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Sélectionnez une clôture pour voir les détails</p>
        </div>
      )}
    </div>
  );

  const renderControls = () => (
    <div className="space-y-6">
      {/* Contrôles obligatoires */}
      <ModernCard>
        <CardHeader
          title="Contrôles de clôture"
          subtitle="Vérifications automatiques"
          icon={Shield}
          action={
            <ModernButton size="sm" variant="primary">
              <RefreshCw className="w-4 h-4 mr-1" />
              Relancer les contrôles
            </ModernButton>
          }
        />
        <CardBody>
          <div className="space-y-4">
            {closureControls.map((control) => (
              <div key={control.id} className={`p-4 border rounded-lg ${
                control.statut === 'passe' ? 'border-green-200 bg-green-50' :
                control.statut === 'echoue' ? 'border-red-200 bg-red-50' :
                control.statut === 'en-cours' ? 'border-blue-200 bg-blue-50' :
                'border-gray-200 bg-gray-50'
              }`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm">{control.nom}</h4>
                      {getSeveriteBadge(control.severite)}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{control.description}</p>
                  </div>
                  {getStatutBadge(control.statut)}
                </div>

                {control.resultat && (
                  <div className="mt-3 p-3 bg-white rounded border border-gray-200">
                    <div className="grid grid-cols-3 gap-4 text-xs">
                      <div>
                        <p className="text-gray-500">Attendu</p>
                        <p className="font-medium">{control.resultat.attendu}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Obtenu</p>
                        <p className="font-medium">{control.resultat.obtenu}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Écart</p>
                        <p className={`font-medium ${
                          control.resultat.ecart === 0 || control.resultat.ecart === 'Aucun' 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {control.resultat.ecart}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {control.corrections && control.corrections.length > 0 && (
                  <div className="mt-3 p-3 bg-yellow-50 rounded border border-yellow-200">
                    <p className="text-xs font-medium text-yellow-800 mb-2">Actions correctives requises:</p>
                    {control.corrections.map((correction, index) => (
                      <div key={index} className="flex items-center gap-2 text-xs text-yellow-700">
                        <AlertTriangle className="w-3 h-3" />
                        <p>{correction}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardBody>
      </ModernCard>
    </div>
  );

  const renderArchives = () => (
    <div className="space-y-6">
      {/* Statistiques d'archivage */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ModernCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Espace utilisé</p>
              <p className="text-xl font-bold mt-1">{stats.espaceArchive}</p>
            </div>
            <Database className="w-8 h-8 text-blue-500" />
          </div>
        </ModernCard>
        <ModernCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Archives disponibles</p>
              <p className="text-xl font-bold mt-1">{archives.length}</p>
            </div>
            <Archive className="w-8 h-8 text-purple-500" />
          </div>
        </ModernCard>
        <ModernCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Dernière archive</p>
              <p className="text-sm font-medium mt-1">{stats.derniereArchive}</p>
            </div>
            <Clock className="w-8 h-8 text-green-500" />
          </div>
        </ModernCard>
        <ModernCard className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Prochaine sauvegarde</p>
              <p className="text-sm font-medium mt-1">Ce soir 22h00</p>
            </div>
            <RefreshCw className="w-8 h-8 text-orange-500" />
          </div>
        </ModernCard>
      </div>

      {/* Table des archives */}
      <ModernCard>
        <CardHeader
          title="Archives et sauvegardes"
          icon={Archive}
          action={
            <div className="flex items-center gap-2">
              <ModernButton size="sm" variant="outline">
                <Upload className="w-4 h-4 mr-1" />
                Restaurer
              </ModernButton>
              <ModernButton size="sm" variant="primary">
                <Database className="w-4 h-4 mr-1" />
                Nouvelle archive
              </ModernButton>
            </div>
          }
        />
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Type</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Exercice</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Fichier</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Taille</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Date</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Responsable</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Statut</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {archives.map((archive) => (
                  <tr key={archive.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                        archive.type === 'archive' ? 'bg-purple-100 text-purple-700' :
                        archive.type === 'backup' ? 'bg-blue-100 text-blue-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {archive.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm">{archive.exercice}</td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-sm font-mono">{archive.fichier}</p>
                        <p className="text-xs text-gray-500">{archive.description}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center text-sm">{archive.taille}</td>
                    <td className="py-3 px-4 text-center text-sm">
                      {new Date(archive.date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-3 px-4 text-sm">{archive.responsable}</td>
                    <td className="py-3 px-4 text-center">
                      {getStatutBadge(archive.statut)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <button className="p-1 hover:bg-gray-100 rounded transition-colors" title="Télécharger">
                          <Download className="w-4 h-4 text-gray-500" />
                        </button>
                        <button className="p-1 hover:bg-gray-100 rounded transition-colors" title="Restaurer">
                          <Upload className="w-4 h-4 text-gray-500" />
                        </button>
                        <button className="p-1 hover:bg-gray-100 rounded transition-colors" title="Supprimer">
                          <Trash2 className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </ModernCard>
    </div>
  );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            Clôtures et Archives
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Gestion des clôtures périodiques et archivage
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm">
            <option value="2024">Exercice 2024</option>
            <option value="2023">Exercice 2023</option>
            <option value="2022">Exercice 2022</option>
          </select>
          <ModernButton variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-1" />
            Paramètres
          </ModernButton>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'dashboard', label: 'Vue d\'ensemble', icon: BarChart3 },
            { id: 'closures', label: 'Clôtures', icon: Lock },
            { id: 'tasks', label: 'Processus', icon: FileText },
            { id: 'controls', label: 'Contrôles', icon: Shield },
            { id: 'archives', label: 'Archives', icon: Archive },
            { id: 'settings', label: 'Configuration', icon: Settings }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div>
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'closures' && renderClosures()}
        {activeTab === 'tasks' && renderTasks()}
        {activeTab === 'controls' && renderControls()}
        {activeTab === 'archives' && renderArchives()}
        {activeTab === 'settings' && <div>Configuration des clôtures en cours de développement...</div>}
      </div>
    </div>
  );
};

export default CompleteClosuresModule;