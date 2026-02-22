import React, { useState } from 'react';
import {
  Wifi,
  WifiOff,
  Wrench,
  RefreshCw,
  FileText,
  Download,
  Filter,
  Calendar,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Clock,
  Settings,
  TrendingUp,
  Database,
  Send,
  Eye,
  Edit3,
  Trash2,
  Plus,
  Search,
  Bell,
  Activity,
  Zap,
  Thermometer,
  Gauge,
  Camera,
  Users,
  Target,
  BarChart3,
  PieChart,
  LineChart
} from 'lucide-react';
import { ModernCard } from '../../components/ui/ModernCard';
import { StatCard } from '../../components/ui/ModernCard';
import ModernButton from '../../components/ui/ModernButton';
import PeriodSelectorModal from '../../components/shared/PeriodSelectorModal';
import { Line, Bar, Doughnut, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);
// Interfaces étendues pour modules 6-9
interface IoTDevice {
  id: string;
  assetId: string;
  type: 'temperature' | 'humidity' | 'vibration' | 'pressure' | 'location' | 'energy' | 'security';
  name: string;
  status: 'online' | 'offline' | 'error' | 'maintenance';
  lastReading: {
    value: number;
    unit: string;
    timestamp: string;
  };
  batteryLevel?: number;
  signalStrength: number;
  threshold: {
    min: number;
    max: number;
    critical: number;
  };
  location: string;
  installationDate: string;
  nextMaintenance: string;
}
interface MaintenanceTask {
  id: string;
  assetId: string;
  type: 'preventive' | 'corrective' | 'predictive' | 'emergency';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  scheduledDate: string;
  estimatedDuration: number;
  assignedTo: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  parts?: { name: string; quantity: number; cost: number; }[];
  laborCost: number;
  aiRecommendation?: {
    confidence: number;
    reason: string;
    suggestedAction: string;
  };
  photos?: string[];
  notes?: string;
}
interface WiseFMSyncRecord {
  id: string;
  assetId: string;
  syncType: 'create' | 'update' | 'delete' | 'sync';
  status: 'pending' | 'success' | 'error' | 'partial';
  lastSync: string;
  nextSync: string;
  dataFields: string[];
  errorMessage?: string;
  retryCount: number;
  wiseFMId?: string;
  mapping: { [key: string]: string };
}
interface ReportTemplate {
  id: string;
  name: string;
  type: 'inventory' | 'depreciation' | 'maintenance' | 'compliance' | 'financial' | 'iot' | 'ai';
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'on-demand';
  format: 'pdf' | 'excel' | 'csv' | 'json';
  parameters: { [key: string]: unknown };
  recipients: string[];
  isActive: boolean;
  lastGenerated?: string;
  nextGeneration?: string;
}
interface AssetsModules6to9Props {
  activeModule?: number;
}
export const AssetsModules6to9: React.FC<AssetsModules6to9Props> = ({ activeModule: initialModule = 6 }) => {
  const [activeModule, setActiveModule] = useState<number>(initialModule);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  // Mock data pour Module 6 - IoT Monitoring
  const iotDevices: IoTDevice[] = [
    {
      id: 'iot-001',
      assetId: 'asset-001',
      type: 'temperature',
      name: 'Capteur Température - Serveur Principal',
      status: 'online',
      lastReading: { value: 24.5, unit: '°C', timestamp: '2024-01-15T10:30:00Z' },
      batteryLevel: 85,
      signalStrength: 95,
      threshold: { min: 15, max: 30, critical: 35 },
      location: 'Salle Serveur',
      installationDate: '2023-12-01',
      nextMaintenance: '2024-06-01'
    },
    {
      id: 'iot-002',
      assetId: 'asset-002',
      type: 'vibration',
      name: 'Capteur Vibration - Machine Production',
      status: 'error',
      lastReading: { value: 8.2, unit: 'mm/s', timestamp: '2024-01-15T10:25:00Z' },
      batteryLevel: 15,
      signalStrength: 78,
      threshold: { min: 0, max: 5, critical: 10 },
      location: 'Atelier A',
      installationDate: '2023-11-15',
      nextMaintenance: '2024-05-15'
    }
  ];
  // Mock data pour Module 7 - Maintenance IA
  const maintenanceTasks: MaintenanceTask[] = [
    {
      id: 'maint-001',
      assetId: 'asset-001',
      type: 'predictive',
      priority: 'high',
      title: 'Remplacement préventif filtres ventilation',
      description: 'L\'IA prévoit une défaillance des filtres dans 2 semaines',
      scheduledDate: '2024-01-20',
      estimatedDuration: 120,
      assignedTo: 'Jean Dupont',
      status: 'pending',
      parts: [
        { name: 'Filtre HEPA', quantity: 2, cost: 150 },
        { name: 'Joint étanchéité', quantity: 4, cost: 25 }
      ],
      laborCost: 200,
      aiRecommendation: {
        confidence: 87,
        reason: 'Analyse des données de capteurs - dégradation progressive détectée',
        suggestedAction: 'Remplacer avant le 25/01 pour éviter arrêt production'
      }
    },
    {
      id: 'maint-002',
      assetId: 'asset-002',
      type: 'corrective',
      priority: 'critical',
      title: 'Réparation urgente pompe hydraulique',
      description: 'Fuite détectée par capteur IoT - intervention immédiate requise',
      scheduledDate: '2024-01-16',
      estimatedDuration: 240,
      assignedTo: 'Marie Martin',
      status: 'in-progress',
      laborCost: 450,
      aiRecommendation: {
        confidence: 95,
        reason: 'Corrélation entre vibrations anormales et fuite hydraulique',
        suggestedAction: 'Arrêt machine immédiat - risque de dommages étendus'
      }
    }
  ];
  // Mock data pour Module 8 - Wise FM Sync
  const syncRecords: WiseFMSyncRecord[] = [
    {
      id: 'sync-001',
      assetId: 'asset-001',
      syncType: 'update',
      status: 'success',
      lastSync: '2024-01-15T08:30:00Z',
      nextSync: '2024-01-15T20:30:00Z',
      dataFields: ['valeurNetteComptable', 'localisation', 'statut'],
      retryCount: 0,
      wiseFMId: 'WFMASS001',
      mapping: {
        'code': 'asset_code',
        'designation': 'asset_name',
        'valeurNetteComptable': 'book_value'
      }
    },
    {
      id: 'sync-002',
      assetId: 'asset-002',
      syncType: 'create',
      status: 'error',
      lastSync: '2024-01-15T08:45:00Z',
      nextSync: '2024-01-15T09:00:00Z',
      dataFields: ['all'],
      errorMessage: 'Validation failed: Invalid category mapping',
      retryCount: 3,
      mapping: {
        'code': 'asset_code',
        'designation': 'asset_name'
      }
    }
  ];
  // Mock data pour Module 9 - Rapports
  const reportTemplates: ReportTemplate[] = [
    {
      id: 'rpt-001',
      name: 'Rapport Inventaire Mensuel',
      type: 'inventory',
      description: 'Inventaire complet avec valorisation et mouvements',
      frequency: 'monthly',
      format: 'pdf',
      parameters: { includePhotos: true, detailLevel: 'high' },
      recipients: ['direction@company.com', 'comptabilite@company.com'],
      isActive: true,
      lastGenerated: '2024-01-01T00:00:00Z',
      nextGeneration: '2024-02-01T00:00:00Z'
    },
    {
      id: 'rpt-002',
      name: 'Analyse Prédictive IA',
      type: 'ai',
      description: 'Rapport des prédictions IA et recommandations',
      frequency: 'weekly',
      format: 'excel',
      parameters: { confidenceThreshold: 80, includeCharts: true },
      recipients: ['maintenance@company.com'],
      isActive: true,
      lastGenerated: '2024-01-08T00:00:00Z',
      nextGeneration: '2024-01-15T00:00:00Z'
    }
  ];
  // Module 6: IoT Monitoring
  const renderIoTMonitoring = () => (
    <div className="space-y-6">
      {/* En-tête avec KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Capteurs Actifs"
          value="24"
          icon={Wifi}
          trend={{ value: 8, isPositive: true }}
          color="blue"
        />
        <StatCard
          title="Alertes Actives"
          value="3"
          icon={AlertTriangle}
          trend={{ value: 2, isPositive: false }}
          color="red"
        />
        <StatCard
          title="Couverture IoT"
          value="87%"
          icon={Activity}
          trend={{ value: 5, isPositive: true }}
          color="green"
        />
        <StatCard
          title="Économies Générées"
          value="€15,240"
          icon={TrendingUp}
          trend={{ value: 12, isPositive: true }}
          color="green"
        />
      </div>
      {/* Monitoring en temps réel */}
      <ModernCard title="Monitoring Temps Réel" icon={Activity}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Graphique des lectures */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Évolution des Capteurs (24h)</h4>
            <div className="h-64">
              <Line
                data={{
                  labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'],
                  datasets: [
                    {
                      label: 'Température (°C)',
                      data: [22, 21, 23, 25, 27, 26, 24],
                      borderColor: 'rgb(59, 130, 246)',
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      tension: 0.4
                    },
                    {
                      label: 'Vibration (mm/s)',
                      data: [2.1, 2.3, 4.2, 6.1, 8.2, 7.5, 5.8],
                      borderColor: 'rgb(239, 68, 68)',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      tension: 0.4
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: 'top' } },
                  scales: { y: { beginAtZero: true } }
                }}
              />
            </div>
          </div>
          {/* Statut des capteurs */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Statut des Capteurs</h4>
            <div className="space-y-3">
              {iotDevices.map((device) => (
                <div key={device.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      device.status === 'online' ? 'bg-green-500' :
                      device.status === 'offline' ? 'bg-gray-400' : 'bg-red-500'
                    }`} />
                    <div>
                      <p className="font-medium text-sm">{device.name}</p>
                      <p className="text-xs text-gray-700">{device.location}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm">{device.lastReading.value} {device.lastReading.unit}</p>
                    <div className="flex items-center space-x-2 text-xs text-gray-700">
                      <Wifi className="w-3 h-3" />
                      <span>{device.signalStrength}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Configuration des alertes */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="font-medium text-gray-900 mb-3">Configuration des Alertes</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <p className="font-medium text-sm">Température Critique</p>
                  <p className="text-xs text-gray-700">Seuil: &gt; 35°C</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Bell className="w-4 h-4 text-red-500" />
                  <span className="text-xs font-medium text-red-600">ACTIF</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div>
                  <p className="font-medium text-sm">Vibration Anormale</p>
                  <p className="text-xs text-gray-700">Seuil: &gt; 10 mm/s</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Bell className="w-4 h-4 text-orange-500" />
                  <span className="text-xs font-medium text-orange-600">ACTIF</span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <ModernButton variant="primary" size="sm" className="w-full">
                <Settings className="w-4 h-4 mr-1" />
                Configurer Alertes
              </ModernButton>
              <ModernButton variant="secondary" size="sm" className="w-full">
                <Download className="w-4 h-4 mr-1" />
                Exporter Données IoT
              </ModernButton>
            </div>
          </div>
        </div>
      </ModernCard>
    </div>
  );
  // Module 7: Maintenance IA
  const renderMaintenanceIA = () => (
    <div className="space-y-6">
      {/* KPIs Maintenance */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Prédictions IA"
          value="12"
          icon={Target}
          trend={{ value: 3, isPositive: true }}
          color="blue"
        />
        <StatCard
          title="Tâches Urgentes"
          value="4"
          icon={AlertTriangle}
          trend={{ value: 1, isPositive: false }}
          color="red"
        />
        <StatCard
          title="Précision IA"
          value="94%"
          icon={CheckCircle}
          trend={{ value: 2, isPositive: true }}
          color="green"
        />
        <StatCard
          title="Économies Réalisées"
          value="€28,340"
          icon={TrendingUp}
          trend={{ value: 15, isPositive: true }}
          color="green"
        />
      </div>
      {/* Dashboard IA */}
      <ModernCard title="Intelligence Artificielle - Maintenance Prédictive" icon={Target}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Prédictions en temps réel */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Prédictions Actives</h4>
            <div className="space-y-3">
              {maintenanceTasks.filter(t => t.aiRecommendation).map((task) => (
                <div key={task.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{task.title}</p>
                      <p className="text-xs text-gray-700 mt-1">{task.description}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      task.priority === 'critical' ? 'bg-red-100 text-red-800' :
                      task.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {task.priority}
                    </span>
                  </div>
                  {task.aiRecommendation && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <Zap className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">Recommandation IA</span>
                        <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">
                          {task.aiRecommendation.confidence}% confiance
                        </span>
                      </div>
                      <p className="text-xs text-blue-800 mb-2">{task.aiRecommendation.reason}</p>
                      <p className="text-xs font-medium text-blue-900">{task.aiRecommendation.suggestedAction}</p>
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center space-x-3 text-xs text-gray-700">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(task.scheduledDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{task.estimatedDuration}min</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <ModernButton variant="primary" size="xs">
                        <Eye className="w-3 h-3" />
                      </ModernButton>
                      <ModernButton variant="secondary" size="xs">
                        <Edit3 className="w-3 h-3" />
                      </ModernButton>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Analyses et tendances */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Analyses Prédictives</h4>
            <div className="h-64 mb-4">
              <Bar
                data={{
                  labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun'],
                  datasets: [
                    {
                      label: 'Maintenance Préventive',
                      data: [8, 12, 6, 15, 9, 11],
                      backgroundColor: 'rgba(34, 197, 94, 0.8)'
                    },
                    {
                      label: 'Maintenance Corrective',
                      data: [15, 8, 12, 6, 10, 7],
                      backgroundColor: 'rgba(239, 68, 68, 0.8)'
                    },
                    {
                      label: 'Prédictions IA',
                      data: [5, 8, 12, 18, 14, 16],
                      backgroundColor: 'rgba(59, 130, 246, 0.8)'
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: 'top' } }
                }}
              />
            </div>
            {/* Indicateurs de performance IA */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-900">Prédictions Exactes</span>
                </div>
                <span className="text-sm font-bold text-green-900">94%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Réduction Pannes</span>
                </div>
                <span className="text-sm font-bold text-blue-900">67%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Database className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-900">Données Analysées</span>
                </div>
                <span className="text-sm font-bold text-purple-900">2.4M pts</span>
              </div>
            </div>
          </div>
        </div>
        {/* Actions rapides */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            <ModernButton variant="primary" size="sm">
              <Target className="w-4 h-4 mr-1" />
              Nouvelle Prédiction
            </ModernButton>
            <ModernButton variant="secondary" size="sm">
              <Settings className="w-4 h-4 mr-1" />
              Paramètres IA
            </ModernButton>
            <ModernButton variant="secondary" size="sm">
              <BarChart3 className="w-4 h-4 mr-1" />
              Rapport Performance
            </ModernButton>
            <ModernButton variant="secondary" size="sm">
              <Download className="w-4 h-4 mr-1" />
              Exporter Données
            </ModernButton>
          </div>
        </div>
      </ModernCard>
    </div>
  );
  // Module 8: Wise FM Sync
  const renderWiseFMSync = () => (
    <div className="space-y-6">
      {/* KPIs Synchronisation */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Sync Réussies"
          value="1,847"
          icon={CheckCircle}
          trend={{ value: 12, isPositive: true }}
          color="green"
        />
        <StatCard
          title="En Attente"
          value="23"
          icon={Clock}
          trend={{ value: 5, isPositive: false }}
          color="orange"
        />
        <StatCard
          title="Erreurs"
          value="7"
          icon={AlertTriangle}
          trend={{ value: 2, isPositive: false }}
          color="red"
        />
        <StatCard
          title="Dernière Sync"
          value="2min"
          icon={RefreshCw}
          trend={{ value: 0, isPositive: true }}
          color="blue"
        />
      </div>
      {/* Configuration Synchronisation */}
      <ModernCard title="Synchronisation Wise FM" icon={RefreshCw}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Configuration */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Configuration</h4>
            <div className="space-y-4">
              <div className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-medium text-sm">Synchronisation Automatique</h5>
                  <div className="w-12 h-6 bg-green-500 rounded-full flex items-center justify-end px-1">
                    <div className="w-4 h-4 bg-white rounded-full"></div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs text-gray-700">
                  <div>
                    <span className="block">Fréquence:</span>
                    <span className="font-medium text-gray-900">Toutes les 12h</span>
                  </div>
                  <div>
                    <span className="block">Prochaine sync:</span>
                    <span className="font-medium text-gray-900">20:30</span>
                  </div>
                </div>
              </div>
              <div className="p-4 border border-gray-200 rounded-lg">
                <h5 className="font-medium text-sm mb-3">Champs Synchronisés</h5>
                <div className="space-y-2">
                  {[
                    { field: 'Code Asset', mapped: 'asset_code', status: 'active' },
                    { field: 'Désignation', mapped: 'asset_name', status: 'active' },
                    { field: 'Valeur Nette', mapped: 'book_value', status: 'active' },
                    { field: 'Localisation', mapped: 'location', status: 'inactive' },
                    { field: 'Statut', mapped: 'status', status: 'active' }
                  ].map((mapping, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                      <span className="font-medium">{mapping.field}</span>
                      <span className="text-gray-700">→ {mapping.mapped}</span>
                      <span className={`px-2 py-1 rounded ${
                        mapping.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {mapping.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex space-x-2">
                <ModernButton variant="primary" size="sm" className="flex-1">
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Sync Manuelle
                </ModernButton>
                <ModernButton variant="secondary" size="sm">
                  <Settings className="w-4 h-4" />
                </ModernButton>
              </div>
            </div>
          </div>
          {/* Historique et statut */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Historique Synchronisation</h4>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {syncRecords.map((record) => (
                <div key={record.id} className="p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className={`w-2 h-2 rounded-full ${
                        record.status === 'success' ? 'bg-green-500' :
                        record.status === 'error' ? 'bg-red-500' :
                        record.status === 'pending' ? 'bg-yellow-500' :
                        'bg-orange-500'
                      }`} />
                      <span className="text-sm font-medium">
                        {record.syncType.charAt(0).toUpperCase() + record.syncType.slice(1)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-700">
                      {new Date(record.lastSync).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 mb-2">
                    Asset: {record.assetId}
                    {record.wiseFMId && (
                      <span className="ml-2 text-blue-600">→ {record.wiseFMId}</span>
                    )}
                  </div>
                  {record.errorMessage && (
                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded mt-2">
                      {record.errorMessage}
                      <div className="mt-1">Tentatives: {record.retryCount}/3</div>
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center space-x-2 text-xs text-gray-700">
                      <span>{record.dataFields.length} champs</span>
                      {record.status === 'success' && (
                        <CheckCircle className="w-3 h-3 text-green-500" />
                      )}
                    </div>
                    <div className="flex space-x-1">
                      <ModernButton variant="secondary" size="xs">
                        <Eye className="w-3 h-3" />
                      </ModernButton>
                      {record.status === 'error' && (
                        <ModernButton variant="primary" size="xs">
                          <RefreshCw className="w-3 h-3" />
                        </ModernButton>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Statistiques de sync */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="font-medium text-gray-900 mb-3">Statistiques (30 derniers jours)</h4>
          <div className="h-32">
            <Line
              data={{
                labels: Array.from({length: 30}, (_, i) => `J-${29-i}`),
                datasets: [
                  {
                    label: 'Synchronisations réussies',
                    data: Array.from({length: 30}, () => 0),
                    borderColor: 'rgb(34, 197, 94)',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    tension: 0.4
                  },
                  {
                    label: 'Erreurs',
                    data: Array.from({length: 30}, () => 0),
                    borderColor: 'rgb(239, 68, 68)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4
                  }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'top' } },
                scales: { y: { beginAtZero: true } }
              }}
            />
          </div>
        </div>
      </ModernCard>
    </div>
  );
  // Module 9: Rapports
  const renderRapports = () => (
    <div className="space-y-6">
      {/* KPIs Rapports */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Rapports Générés"
          value="156"
          icon={FileText}
          trend={{ value: 23, isPositive: true }}
          color="blue"
        />
        <StatCard
          title="Programmés"
          value="12"
          icon={Calendar}
          trend={{ value: 2, isPositive: true }}
          color="green"
        />
        <StatCard
          title="En Attente"
          value="3"
          icon={Clock}
          trend={{ value: 0, isPositive: true }}
          color="orange"
        />
        <StatCard
          title="Destinataires"
          value="28"
          icon={Users}
          trend={{ value: 4, isPositive: true }}
          color="purple"
        />
      </div>
      {/* Génération de rapports */}
      <ModernCard title="Générateur de Rapports" icon={FileText}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Templates disponibles */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Modèles de Rapports</h4>
            <div className="space-y-3">
              {reportTemplates.map((template) => (
                <div key={template.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h5 className="font-medium text-sm">{template.name}</h5>
                      <p className="text-xs text-gray-700 mt-1">{template.description}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        template.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {template.isActive ? 'Actif' : 'Inactif'}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        template.type === 'inventory' ? 'bg-blue-100 text-blue-800' :
                        template.type === 'ai' ? 'bg-purple-100 text-purple-800' :
                        template.type === 'maintenance' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {template.type}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs text-gray-700 mb-3">
                    <div>
                      <span className="block">Fréquence:</span>
                      <span className="font-medium text-gray-900">{template.frequency}</span>
                    </div>
                    <div>
                      <span className="block">Format:</span>
                      <span className="font-medium text-gray-900">{template.format.toUpperCase()}</span>
                    </div>
                  </div>
                  {template.lastGenerated && (
                    <div className="text-xs text-gray-700 mb-3">
                      Dernière génération: {new Date(template.lastGenerated).toLocaleDateString()}
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1 text-xs text-gray-700">
                      <Users className="w-3 h-3" />
                      <span>{template.recipients.length} destinataires</span>
                    </div>
                    <div className="flex space-x-1">
                      <ModernButton variant="primary" size="xs">
                        <Send className="w-3 h-3 mr-1" />
                        Générer
                      </ModernButton>
                      <ModernButton variant="secondary" size="xs">
                        <Edit3 className="w-3 h-3" />
                      </ModernButton>
                      <ModernButton variant="secondary" size="xs">
                        <Eye className="w-3 h-3" />
                      </ModernButton>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <ModernButton variant="primary" size="sm" className="w-full mt-3">
              <Plus className="w-4 h-4 mr-1" />
              Nouveau Modèle
            </ModernButton>
          </div>
          {/* Générateur rapide */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Génération Rapide</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type de Rapport</label>
                <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                  <option value="inventory">Inventaire</option>
                  <option value="depreciation">Amortissements</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="ai">Analyse IA</option>
                  <option value="iot">Données IoT</option>
                  <option value="compliance">Conformité</option>
                  <option value="financial">Financier</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Période</label>
                <ModernButton
                  variant="outline"
                  onClick={() => setShowPeriodModal(true)}
                  className="flex items-center gap-2 w-full"
                >
                  <Calendar className="w-4 h-4" />
                  Sélectionner période
                </ModernButton>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catégories</label>
                <div className="space-y-2">
                  {['Matériel', 'Immobilier', 'Véhicules', 'Mobilier', 'Informatique'].map((cat) => (
                    <label key={cat} className="flex items-center space-x-2">
                      <input type="checkbox" className="rounded border-gray-300" defaultChecked />
                      <span className="text-sm text-gray-700">{cat}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center space-x-2 p-2 border border-gray-200 rounded-lg cursor-pointer">
                    <input type="radio" name="format" value="pdf" className="text-blue-600" defaultChecked />
                    <span className="text-sm">PDF</span>
                  </label>
                  <label className="flex items-center space-x-2 p-2 border border-gray-200 rounded-lg cursor-pointer">
                    <input type="radio" name="format" value="excel" className="text-blue-600" />
                    <span className="text-sm">Excel</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Options</label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded border-gray-300" />
                    <span className="text-sm text-gray-700">Inclure photos</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded border-gray-300" defaultChecked />
                    <span className="text-sm text-gray-700">Inclure graphiques</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded border-gray-300" />
                    <span className="text-sm text-gray-700">Données IoT</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded border-gray-300" />
                    <span className="text-sm text-gray-700">Prédictions IA</span>
                  </label>
                </div>
              </div>
              <ModernButton variant="primary" size="sm" className="w-full">
                <FileText className="w-4 h-4 mr-1" />
                Générer Rapport
              </ModernButton>
            </div>
          </div>
        </div>
        {/* Historique des rapports */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="font-medium text-gray-900 mb-3">Rapports Récents</h4>
          <div className="space-y-2">
            {[
              { name: 'Inventaire_Janvier_2024.pdf', date: '2024-01-15', size: '2.4 MB', status: 'completed' },
              { name: 'Analyse_IA_Semaine_02.xlsx', date: '2024-01-14', size: '856 KB', status: 'completed' },
              { name: 'Maintenance_Q4_2023.pdf', date: '2024-01-13', size: '1.8 MB', status: 'completed' },
              { name: 'IoT_Monitoring_Daily.csv', date: '2024-01-15', size: '124 KB', status: 'processing' }
            ].map((report, index) => (
              <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <FileText className="w-4 h-4 text-gray-700" />
                  <div>
                    <p className="font-medium text-sm">{report.name}</p>
                    <p className="text-xs text-gray-700">{report.size} • {new Date(report.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    report.status === 'completed' ? 'bg-green-100 text-green-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {report.status === 'completed' ? 'Terminé' : 'En cours'}
                  </span>
                  {report.status === 'completed' && (
                    <ModernButton variant="secondary" size="xs">
                      <Download className="w-3 h-3" />
                    </ModernButton>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </ModernCard>
      {/* Analytics des rapports */}
      <ModernCard title="Analytics et Performance" icon={BarChart3}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Rapports par Type (Ce mois)</h4>
            <div className="h-64">
              <Doughnut
                data={{
                  labels: ['Inventaire', 'Maintenance', 'IA/Prédictif', 'IoT', 'Financier', 'Conformité'],
                  datasets: [{
                    data: [35, 28, 15, 12, 7, 3],
                    backgroundColor: [
                      'rgba(59, 130, 246, 0.8)',
                      'rgba(34, 197, 94, 0.8)',
                      'rgba(168, 85, 247, 0.8)',
                      'rgba(249, 115, 22, 0.8)',
                      'rgba(239, 68, 68, 0.8)',
                      'rgba(107, 114, 128, 0.8)'
                    ]
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: 'bottom' } }
                }}
              />
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Évolution Mensuelle</h4>
            <div className="h-64">
              <Bar
                data={{
                  labels: ['Oct', 'Nov', 'Déc', 'Jan'],
                  datasets: [
                    {
                      label: 'Rapports Automatiques',
                      data: [45, 52, 48, 61],
                      backgroundColor: 'rgba(34, 197, 94, 0.8)'
                    },
                    {
                      label: 'Rapports Manuels',
                      data: [23, 28, 31, 27],
                      backgroundColor: 'rgba(59, 130, 246, 0.8)'
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { position: 'top' } }
                }}
              />
            </div>
          </div>
        </div>
      </ModernCard>
    </div>
  );
  return (
    <div className="space-y-6">
      {/* Navigation modules */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 6, name: 'IoT Monitoring', icon: Wifi },
          { id: 7, name: 'Maintenance IA', icon: Wrench },
          { id: 8, name: 'Wise FM Sync', icon: RefreshCw },
          { id: 9, name: 'Rapports', icon: FileText }
        ].map((module) => (
          <ModernButton
            key={module.id}
            variant={activeModule === module.id ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setActiveModule(module.id)}
          >
            <module.icon className="w-4 h-4 mr-1" />
            {module.name}
          </ModernButton>
        ))}
      </div>
      {/* Contenu du module actif */}
      {activeModule === 6 && renderIoTMonitoring()}
      {activeModule === 7 && renderMaintenanceIA()}
      {activeModule === 8 && renderWiseFMSync()}
      {activeModule === 9 && renderRapports()}

      {/* Modal de sélection de période */}
      <PeriodSelectorModal
        isOpen={showPeriodModal}
        onClose={() => setShowPeriodModal(false)}
        onApply={(newDateRange) => {
          setDateRange(newDateRange);
          // Update any existing filter logic here
        }}
        initialDateRange={dateRange}
      />
    </div>
  );
};
export default AssetsModules6to9;