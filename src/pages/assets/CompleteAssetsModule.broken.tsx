import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Building, Package, TrendingDown, Calendar, AlertTriangle,
  CheckCircle, Calculator, FileText, BarChart3, Settings,
  Plus, Edit, Trash2, Search, Filter, Download, Upload,
  Eye, Clock, DollarSign, Activity, Tag, MapPin, Wrench,
  Archive, RefreshCw, ChevronRight, Info, Camera, QrCode,
  Brain, Wifi, Smartphone, Cloud, Zap, Users, Shield,
  Database, Cpu, Radio, Monitor, Globe, Link
} from 'lucide-react';
import { CompleteAssetsModulesDetailed } from './CompleteAssetsModulesDetailed';
import { AssetsModules3to5 } from './AssetsModules3to5';
import { AssetsModules6to9 } from './AssetsModules6to9';
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
import { evolutionData, repartitionData, chartOptions } from './assets-chart-data';
import { getChartData } from './chart-data-fallback';

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
interface Asset {
  id: string;
  code: string;
  designation: string;
  categorie: 'materiel' | 'immobilier' | 'vehicule' | 'mobilier' | 'informatique' | 'autre';
  dateAcquisition: string;
  valeurAcquisition: number;
  dureeAmortissement: number;
  tauxAmortissement: number;
  methodeAmortissement: 'lineaire' | 'degressif';
  valeurNetteComptable: number;
  amortissementCumule: number;
  localisation: string;
  responsable: string;
  statut: 'actif' | 'amorti' | 'cede' | 'reforme' | 'en-maintenance';
  numeroSerie?: string;
  fournisseur?: string;
  garantie?: {
    dateDebut: string;
    dateFin: string;
    type: string;
  };
  qrCode?: string;
  photos?: string[];
}

interface Depreciation {
  id: string;
  assetId: string;
  exercice: string;
  dotation: number;
  valeurDebut: number;
  valeurFin: number;
  dateCalcul: string;
  statut: 'provisoire' | 'valide' | 'comptabilise';
}

interface Maintenance {
  id: string;
  assetId: string;
  date: string;
  type: 'preventive' | 'corrective' | 'controle';
  description: string;
  cout: number;
  prestataire: string;
  prochaine?: string;
  statut: 'planifiee' | 'en-cours' | 'terminee';
}

interface Inventory {
  id: string;
  date: string;
  type: 'complet' | 'partiel' | 'tournant';
  statut: 'en-cours' | 'termine' | 'valide';
  nombreActifs: number;
  nombreVerifies: number;
  anomalies: number;
  responsable: string;
}

interface Movement {
  id: string;
  assetId: string;
  date: string;
  type: 'acquisition' | 'cession' | 'transfert' | 'mise-au-rebut';
  ancienneLocalisation?: string;
  nouvelleLocalisation?: string;
  motif: string;
  valeur?: number;
  responsable: string;
}

interface IoTSensor {
  id: string;
  assetId: string;
  type: 'temperature' | 'vibration' | 'utilisation' | 'position' | 'etat';
  valeur: number;
  unite: string;
  seuilMin: number;
  seuilMax: number;
  status: 'normal' | 'alerte' | 'critique';
  derniereMAJ: string;
}

interface AIPrediction {
  id: string;
  assetId: string;
  type: 'maintenance' | 'panne' | 'remplacement' | 'optimisation';
  probabilite: number;
  datePrevue: string;
  confiance: number;
  recommandation: string;
  coutEstime?: number;
}

interface WiseFMSync {
  id: string;
  assetId: string;
  dateSync: string;
  status: 'sync' | 'conflit' | 'erreur';
  donneesWiseFM: {
    valeurComptable: number;
    amortissement: number;
    statut: string;
  };
  donneesLocales: {
    valeurComptable: number;
    amortissement: number;
    statut: string;
  };
}

const CompleteAssetsModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState('synthese');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['synthese', 'registre', 'amortissements-ia', 'cycle-vie', 'inventaire-auto', 'iot-monitoring', 'maintenance-ia', 'wise-fm-sync', 'rapports'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showDepreciationModal, setShowDepreciationModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Données de démonstration étendues avec IA et IoT
  const stats = {
    totalAssets: 342,
    valeurBrute: 2450000,
    valeurNette: 1680000,
    amortissementCumule: 770000,
    nouveauxActifs: 12,
    actifsCedes: 3,
    tauxUtilisation: 87,
    maintenancesPrevues: 8,
    capteursIoT: 245,
    alertesIA: 15,
    predictionsMaintenances: 32,
    syncWiseFM: 98.5,
    economiesIA: 125000,
    tauxPrecisionIA: 94.2
  };

  const assets: Asset[] = [
    {
      id: '1',
      code: 'MAT-2021-001',
      designation: 'Serveur Dell PowerEdge R740',
      categorie: 'informatique',
      dateAcquisition: '2021-03-15',
      valeurAcquisition: 45000,
      dureeAmortissement: 5,
      tauxAmortissement: 20,
      methodeAmortissement: 'lineaire',
      valeurNetteComptable: 27000,
      amortissementCumule: 18000,
      localisation: 'Salle serveur - Étage 2',
      responsable: 'Service IT',
      statut: 'actif',
      numeroSerie: 'DL-R740-2021-001',
      fournisseur: 'Dell Technologies',
      garantie: {
        dateDebut: '2021-03-15',
        dateFin: '2024-03-15',
        type: 'ProSupport Plus'
      }
    },
    {
      id: '2',
      code: 'VEH-2022-003',
      designation: 'Toyota Hilux Double Cabine',
      categorie: 'vehicule',
      dateAcquisition: '2022-06-01',
      valeurAcquisition: 85000,
      dureeAmortissement: 5,
      tauxAmortissement: 20,
      methodeAmortissement: 'lineaire',
      valeurNetteComptable: 59500,
      amortissementCumule: 25500,
      localisation: 'Parking principal',
      responsable: 'Service Logistique',
      statut: 'actif',
      numeroSerie: 'VIN-JTEGD2022XX'
    },
    {
      id: '3',
      code: 'IMM-2020-001',
      designation: 'Bâtiment administratif - Siège social',
      categorie: 'immobilier',
      dateAcquisition: '2020-01-15',
      valeurAcquisition: 1500000,
      dureeAmortissement: 25,
      tauxAmortissement: 4,
      methodeAmortissement: 'lineaire',
      valeurNetteComptable: 1260000,
      amortissementCumule: 240000,
      localisation: 'Zone industrielle - Lot 45',
      responsable: 'Direction Générale',
      statut: 'actif'
    },
    {
      id: '4',
      code: 'MOB-2023-015',
      designation: 'Bureau direction avec rangements',
      categorie: 'mobilier',
      dateAcquisition: '2023-02-20',
      valeurAcquisition: 12000,
      dureeAmortissement: 10,
      tauxAmortissement: 10,
      methodeAmortissement: 'lineaire',
      valeurNetteComptable: 10200,
      amortissementCumule: 1800,
      localisation: 'Bureau Direction - Étage 3',
      responsable: 'Services Généraux',
      statut: 'actif'
    },
    {
      id: '5',
      code: 'MAT-2019-045',
      designation: 'Machine de production CNC',
      categorie: 'materiel',
      dateAcquisition: '2019-09-10',
      valeurAcquisition: 250000,
      dureeAmortissement: 10,
      tauxAmortissement: 10,
      methodeAmortissement: 'degressif',
      valeurNetteComptable: 112500,
      amortissementCumule: 137500,
      localisation: 'Atelier production - Zone A',
      responsable: 'Production',
      statut: 'actif',
      numeroSerie: 'CNC-2019-XR450'
    }
  ];

  const depreciations: Depreciation[] = [
    {
      id: '1',
      assetId: '1',
      exercice: '2024',
      dotation: 9000,
      valeurDebut: 36000,
      valeurFin: 27000,
      dateCalcul: '2024-01-01',
      statut: 'comptabilise'
    },
    {
      id: '2',
      assetId: '2',
      exercice: '2024',
      dotation: 17000,
      valeurDebut: 76500,
      valeurFin: 59500,
      dateCalcul: '2024-01-01',
      statut: 'comptabilise'
    },
    {
      id: '3',
      assetId: '3',
      exercice: '2024',
      dotation: 60000,
      valeurDebut: 1320000,
      valeurFin: 1260000,
      dateCalcul: '2024-01-01',
      statut: 'comptabilise'
    }
  ];

  const maintenances: Maintenance[] = [
    {
      id: '1',
      assetId: '1',
      date: '2024-02-15',
      type: 'preventive',
      description: 'Maintenance préventive serveur - Nettoyage et mise à jour firmware',
      cout: 1500,
      prestataire: 'Dell Support',
      prochaine: '2024-08-15',
      statut: 'terminee'
    },
    {
      id: '2',
      assetId: '2',
      date: '2024-03-01',
      type: 'preventive',
      description: 'Révision 30000 km',
      cout: 2500,
      prestataire: 'Toyota Service',
      prochaine: '2024-09-01',
      statut: 'planifiee'
    },
    {
      id: '3',
      assetId: '5',
      date: '2024-01-20',
      type: 'corrective',
      description: 'Remplacement courroie et calibrage',
      cout: 8500,
      prestataire: 'TechMaint SARL',
      statut: 'terminee'
    }
  ];

  const inventory: Inventory = {
    id: '1',
    date: '2024-01-15',
    type: 'complet',
    statut: 'en-cours',
    nombreActifs: 342,
    nombreVerifies: 298,
    anomalies: 5,
    responsable: 'Équipe inventaire'
  };

  // Graphiques
  const getStatutBadge = (statut: string) => {
    const badges = {
      'actif': { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
      'amorti': { bg: 'bg-gray-100', text: 'text-gray-700', icon: Archive },
      'cede': { bg: 'bg-blue-100', text: 'text-blue-700', icon: Package },
      'reforme': { bg: 'bg-red-100', text: 'text-red-700', icon: Trash2 },
      'en-maintenance': { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Wrench },
      'en-cours': { bg: 'bg-blue-100', text: 'text-blue-700', icon: Clock },
      'termine': { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
      'valide': { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
      'comptabilise': { bg: 'bg-purple-100', text: 'text-purple-700', icon: Calculator },
      'provisoire': { bg: 'bg-gray-100', text: 'text-gray-700', icon: Clock },
      'planifiee': { bg: 'bg-blue-100', text: 'text-blue-700', icon: Calendar },
      'terminee': { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle }
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

  const getCategoryIcon = (category: string) => {
    const icons = {
      'materiel': Wrench,
      'immobilier': Building,
      'vehicule': Package,
      'mobilier': Archive,
      'informatique': Activity,
      'autre': Tag
    };
    return icons[category as keyof typeof icons] || Package;
  };

  // Nouvelles données pour l'IA et IoT
  const iotSensors: IoTSensor[] = [
    {
      id: '1',
      assetId: '1',
      type: 'temperature',
      valeur: 42,
      unite: '°C',
      seuilMin: 15,
      seuilMax: 45,
      status: 'normal',
      derniereMAJ: '2024-01-15T10:30:00Z'
    },
    {
      id: '2',
      assetId: '5',
      type: 'vibration',
      valeur: 8.5,
      unite: 'mm/s',
      seuilMin: 0,
      seuilMax: 10,
      status: 'alerte',
      derniereMAJ: '2024-01-15T10:25:00Z'
    }
  ];

  const aiPredictions: AIPrediction[] = [
    {
      id: '1',
      assetId: '5',
      type: 'maintenance',
      probabilite: 85,
      datePrevue: '2024-02-28',
      confiance: 92,
      recommandation: 'Maintenance préventive recommandée pour éviter une panne majeure',
      coutEstime: 15000
    },
    {
      id: '2',
      assetId: '2',
      type: 'optimisation',
      probabilite: 78,
      datePrevue: '2024-03-15',
      confiance: 88,
      recommandation: 'Optimisation du planning d\'utilisation pour réduire l\'usure',
      coutEstime: 5000
    }
  ];

  const wiseFMSync: WiseFMSync[] = [
    {
      id: '1',
      assetId: '1',
      dateSync: '2024-01-15T09:00:00Z',
      status: 'sync',
      donneesWiseFM: {
        valeurComptable: 27000,
        amortissement: 18000,
        statut: 'actif'
      },
      donneesLocales: {
        valeurComptable: 27000,
        amortissement: 18000,
        statut: 'actif'
      }
    }
  ];

  };

  const renderAssets = () => (
    <div className="space-y-6">
      {/* Barre d'outils */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher un actif..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[var(--color-primary)] w-64"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm"
          >
            <option value="all">Toutes catégories</option>
            <option value="materiel">Matériel</option>
            <option value="immobilier">Immobilier</option>
            <option value="vehicule">Véhicules</option>
            <option value="mobilier">Mobilier</option>
            <option value="informatique">Informatique</option>
          </select>
          <select className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm">
            <option value="all">Tous les statuts</option>
            <option value="actif">Actif</option>
            <option value="amorti">Amorti</option>
            <option value="cede">Cédé</option>
            <option value="reforme">Réformé</option>
          </select>
        </div>
        <div className="flex items-center gap-3">
          <ModernButton variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-1" />
            Importer
          </ModernButton>
          <ModernButton variant="outline" size="sm">
            <Download className="w-4 h-4 mr-1" />
            Exporter
          </ModernButton>
          <ModernButton variant="primary" size="sm" onClick={() => setShowAssetModal(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Nouvel actif
          </ModernButton>
        </div>
      </div>

      {/* Table des actifs */}
      <ModernCard>
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Code</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Désignation</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Catégorie</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Valeur acq.</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">VNC</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Amort. %</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Localisation</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Statut</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {assets
                  .filter(asset => selectedCategory === 'all' || asset.categorie === selectedCategory)
                  .filter(asset => 
                    searchQuery === '' || 
                    asset.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    asset.code.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((asset) => {
                    const Icon = getCategoryIcon(asset.categorie);
                    const amortPct = Math.round((asset.amortissementCumule / asset.valeurAcquisition) * 100);
                    return (
                      <tr key={asset.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm font-mono font-medium">{asset.code}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium">{asset.designation}</p>
                              {asset.numeroSerie && (
                                <p className="text-xs text-gray-500">S/N: {asset.numeroSerie}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                            asset.categorie === 'informatique' ? 'bg-blue-100 text-blue-700' :
                            asset.categorie === 'vehicule' ? 'bg-green-100 text-green-700' :
                            asset.categorie === 'immobilier' ? 'bg-purple-100 text-purple-700' :
                            asset.categorie === 'materiel' ? 'bg-orange-100 text-orange-700' :
                            asset.categorie === 'mobilier' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {asset.categorie}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-right">
                          €{asset.valeurAcquisition.toLocaleString('fr-FR')}
                        </td>
                        <td className="py-3 px-4 text-sm text-right font-medium">
                          €{asset.valeurNetteComptable.toLocaleString('fr-FR')}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  amortPct >= 80 ? 'bg-red-500' :
                                  amortPct >= 60 ? 'bg-yellow-500' :
                                  'bg-green-500'
                                }`}
                                style={{ width: `${amortPct}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-600">{amortPct}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-gray-400" />
                            <span className="text-sm">{asset.localisation}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {getStatutBadge(asset.statut)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1">
                            <button className="p-1 hover:bg-gray-100 rounded transition-colors" title="Voir">
                              <Eye className="w-4 h-4 text-gray-500" />
                            </button>
                            <button className="p-1 hover:bg-gray-100 rounded transition-colors" title="Modifier">
                              <Edit className="w-4 h-4 text-gray-500" />
                            </button>
                            <button className="p-1 hover:bg-gray-100 rounded transition-colors" title="QR Code">
                              <QrCode className="w-4 h-4 text-gray-500" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </CardBody>
      </ModernCard>
    </div>
  );

  const renderDepreciation = () => (
    <div className="space-y-6">
      {/* Calcul des amortissements */}
      <ModernCard>
        <CardHeader
          title="Calcul des amortissements"
          subtitle="Exercice 2024"
          icon={Calculator}
          action={
            <div className="flex items-center gap-3">
              <ModernButton variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-1" />
                Recalculer
              </ModernButton>
              <ModernButton variant="primary" size="sm">
                <FileText className="w-4 h-4 mr-1" />
                Comptabiliser
              </ModernButton>
            </div>
          }
        />
        <CardBody>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Dotation annuelle</p>
              <p className="text-xl font-bold mt-1">€154,000</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Dotation mensuelle</p>
              <p className="text-xl font-bold mt-1">€12,833</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Cumul exercice</p>
              <p className="text-xl font-bold mt-1">€770,000</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Taux moyen</p>
              <p className="text-xl font-bold mt-1">31.4%</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Actif</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Méthode</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Valeur début</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Dotation</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Valeur fin</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {depreciations.map((depreciation) => {
                  const asset = assets.find(a => a.id === depreciation.assetId);
                  return (
                    <tr key={depreciation.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-sm font-medium">{asset?.designation}</p>
                          <p className="text-xs text-gray-500">{asset?.code}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center text-sm">
                        {asset?.methodeAmortissement}
                      </td>
                      <td className="py-3 px-4 text-sm text-right">
                        €{depreciation.valeurDebut.toLocaleString('fr-FR')}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-medium text-red-600">
                        -€{depreciation.dotation.toLocaleString('fr-FR')}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-medium">
                        €{depreciation.valeurFin.toLocaleString('fr-FR')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {getStatutBadge(depreciation.statut)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardBody>
      </ModernCard>

      {/* Simulation */}
      <ModernCard>
        <CardHeader
          title="Simulation d'amortissement"
          subtitle="Calculer l'impact d'une acquisition"
          icon={Calculator}
        />
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valeur d'acquisition
              </label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[var(--color-primary)]"
                placeholder="€0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Durée (années)
              </label>
              <input
                type="number"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[var(--color-primary)]"
                placeholder="5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Méthode
              </label>
              <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[var(--color-primary)]">
                <option value="lineaire">Linéaire</option>
                <option value="degressif">Dégressif</option>
              </select>
            </div>
          </div>
          <div className="mt-4">
            <ModernButton variant="primary" size="sm">
              <Calculator className="w-4 h-4 mr-1" />
              Calculer
            </ModernButton>
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
            Gestion des Immobilisations
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Actifs, amortissements et inventaire physique
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ModernButton variant="outline" size="sm">
            <QrCode className="w-4 h-4 mr-1" />
            Scanner QR
          </ModernButton>
          <ModernButton variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-1" />
            Actualiser
          </ModernButton>
        </div>
      </div>

      {/* Tabs - 9 modules selon cahier des charges */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-6 overflow-x-auto">
          {[
            { id: 'synthese', label: 'Synthèse', icon: BarChart3 },
            { id: 'registre', label: 'Registre Central', icon: Database },
            { id: 'amortissements-ia', label: 'Amortissements IA', icon: Brain },
            { id: 'cycle-vie', label: 'Cycle de Vie', icon: Activity },
            { id: 'inventaire-auto', label: 'Inventaire Auto', icon: Camera },
            { id: 'iot-monitoring', label: 'Monitoring IoT', icon: Wifi },
            { id: 'maintenance-ia', label: 'Maintenance IA', icon: Wrench },
            { id: 'wise-fm-sync', label: 'Wise FM Sync', icon: Cloud },
            { id: 'rapports', label: 'Rapports', icon: FileText }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                navigate(`/assets/management?tab=${tab.id}`);
              }}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 transition-colors whitespace-nowrap ${
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

      {/* Content - 9 modules complets */}
      <div>
        {activeTab === 'synthese' && <CompleteAssetsModulesDetailed activeModule={1} />}
        {activeTab === 'registre' && <CompleteAssetsModulesDetailed activeModule={2} />}
        {activeTab === 'amortissements-ia' && <AssetsModules3to5 activeModule={3} />}
        {activeTab === 'cycle-vie' && <AssetsModules3to5 activeModule={4} />}
        {activeTab === 'inventaire-auto' && <AssetsModules3to5 activeModule={5} />}
        {activeTab === 'iot-monitoring' && <AssetsModules6to9 activeModule={6} />}
        {activeTab === 'maintenance-ia' && <AssetsModules6to9 activeModule={7} />}
        {activeTab === 'wise-fm-sync' && <AssetsModules6to9 activeModule={8} />}
        {activeTab === 'rapports' && <AssetsModules6to9 activeModule={9} />}
      </div>
    </div>
  );
};

export default CompleteAssetsModule;