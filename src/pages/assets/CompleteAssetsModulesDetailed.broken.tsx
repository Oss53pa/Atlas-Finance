// Module Immobilisations WiseBook - Développement détaillé complet
import React from 'react';
import {
  Brain, Wifi, Smartphone, Cloud, Database, Activity, Camera,
  QrCode, Plus, Edit, Trash2, Search, Download, Upload, Eye,
  Clock, DollarSign, Tag, MapPin, Wrench, AlertTriangle,
  CheckCircle, Calendar, Calculator, FileText, BarChart3,
  Monitor, Radio, Globe, Link, RefreshCw, ChevronRight,
  Info, Package, Building, Archive, Shield, Users, Settings,
  TrendingUp, TrendingDown, Zap, Target, Award, Layers,
  Filter, Save, Mic, Sparkles, Star, MessageSquare, Share,
  GitBranch, List, Hash, Cpu, PiggyBank, UserCheck
} from 'lucide-react';
import { ModernCard, CardHeader, CardBody, StatCard } from '../../components/ui/ModernCard';
import ModernButton from '../../components/ui/ModernButton';
import { Line, Bar, Doughnut, Pie } from 'react-chartjs-2';
import { evolutionData, repartitionData, chartOptions } from './assets-chart-data';

// Interfaces étendues pour tous les modules
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
  gpsCoordinates?: {
    latitude: number;
    longitude: number;
  };
  iotSensors?: string[];
  derniereMAJ: string;
}

interface IoTSensor {
  id: string;
  assetId: string;
  type: 'temperature' | 'vibration' | 'utilisation' | 'position' | 'etat' | 'pression' | 'humidite';
  valeur: number;
  unite: string;
  seuilMin: number;
  seuilMax: number;
  status: 'normal' | 'alerte' | 'critique';
  derniereMAJ: string;
  frequenceMesure: number;
  batterie?: number;
  signalQuality?: number;
}

interface AIPrediction {
  id: string;
  assetId: string;
  type: 'maintenance' | 'panne' | 'remplacement' | 'optimisation' | 'economie' | 'usage';
  probabilite: number;
  datePrevue: string;
  confiance: number;
  recommandation: string;
  coutEstime?: number;
  priorite: 'basse' | 'moyenne' | 'haute' | 'critique';
  actions: string[];
  impact: string;
}

interface MaintenanceSchedule {
  id: string;
  assetId: string;
  type: 'preventive' | 'corrective' | 'controle' | 'calibrage';
  description: string;
  dateDebut: string;
  dateFin?: string;
  dureeEstimee: number;
  cout: number;
  prestataire: string;
  statut: 'planifiee' | 'en-cours' | 'terminee' | 'reportee' | 'annulee';
  checklist: string[];
  pieces?: string[];
  documents?: string[];
}

interface InventorySession {
  id: string;
  date: string;
  type: 'complet' | 'partiel' | 'tournant' | 'aleatoire';
  statut: 'en-cours' | 'termine' | 'valide' | 'suspendu';
  nombreActifs: number;
  nombreVerifies: number;
  anomalies: number;
  responsable: string;
  equipe: string[];
  zones: string[];
  methode: 'qr' | 'nfc' | 'manuel' | 'hybride';
  progression: number;
}

interface WiseFMSync {
  id: string;
  assetId: string;
  dateSync: string;
  status: 'sync' | 'conflit' | 'erreur' | 'en-attente';
  donneesWiseFM: {
    valeurComptable: number;
    amortissement: number;
    statut: string;
    compteComptable: string;
  };
  donneesLocales: {
    valeurComptable: number;
    amortissement: number;
    statut: string;
    compteComptable: string;
  };
  conflits?: string[];
  resolution?: 'automatique' | 'manuelle';
}

interface AssetMovement {
  id: string;
  assetId: string;
  date: string;
  type: 'acquisition' | 'cession' | 'transfert' | 'mise-au-rebut' | 'reparation' | 'upgrade';
  ancienneLocalisation?: string;
  nouvelleLocalisation?: string;
  ancienResponsable?: string;
  nouveauResponsable?: string;
  motif: string;
  valeur?: number;
  documents: string[];
  validatedBy: string;
  notes?: string;
}

interface Report {
  id: string;
  nom: string;
  type: 'financier' | 'operationnel' | 'ia' | 'iot' | 'maintenance' | 'inventaire';
  description: string;
  format: 'pdf' | 'excel' | 'csv' | 'json';
  frequence: 'quotidien' | 'hebdomadaire' | 'mensuel' | 'trimestriel' | 'annuel' | 'sur-demande';
  parametres: any;
  dernierExecution?: string;
  prochainExecution?: string;
  recipients: string[];
}

// Données de démonstration étendues
const extendedAssets: Asset[] = [
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
    },
    qrCode: 'QR-MAT-2021-001',
    gpsCoordinates: {
      latitude: 48.8566,
      longitude: 2.3522
    },
    iotSensors: ['TEMP-001', 'VIB-001'],
    derniereMAJ: '2024-01-15T10:30:00Z'
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
    numeroSerie: 'VIN-JTEGD2022XX',
    fournisseur: 'Toyota Motor',
    qrCode: 'QR-VEH-2022-003',
    gpsCoordinates: {
      latitude: 48.8556,
      longitude: 2.3512
    },
    iotSensors: ['GPS-002', 'FUEL-002'],
    derniereMAJ: '2024-01-15T09:15:00Z'
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
    statut: 'actif',
    qrCode: 'QR-IMM-2020-001',
    gpsCoordinates: {
      latitude: 48.8576,
      longitude: 2.3532
    },
    derniereMAJ: '2024-01-15T08:00:00Z'
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
    statut: 'actif',
    fournisseur: 'Mobilier Pro SARL',
    qrCode: 'QR-MOB-2023-015',
    derniereMAJ: '2024-01-15T07:45:00Z'
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
    numeroSerie: 'CNC-2019-XR450',
    fournisseur: 'TechMachines Europe',
    qrCode: 'QR-MAT-2019-045',
    gpsCoordinates: {
      latitude: 48.8546,
      longitude: 2.3502
    },
    iotSensors: ['VIB-003', 'TEMP-003', 'PERF-003'],
    derniereMAJ: '2024-01-15T11:20:00Z'
  }
];

const extendedIoTSensors: IoTSensor[] = [
  {
    id: 'TEMP-001',
    assetId: '1',
    type: 'temperature',
    valeur: 42,
    unite: '°C',
    seuilMin: 15,
    seuilMax: 45,
    status: 'normal',
    derniereMAJ: '2024-01-15T10:30:00Z',
    frequenceMesure: 300,
    batterie: 85,
    signalQuality: 95
  },
  {
    id: 'VIB-003',
    assetId: '5',
    type: 'vibration',
    valeur: 8.5,
    unite: 'mm/s',
    seuilMin: 0,
    seuilMax: 10,
    status: 'alerte',
    derniereMAJ: '2024-01-15T10:25:00Z',
    frequenceMesure: 60,
    batterie: 92,
    signalQuality: 88
  },
  {
    id: 'TEMP-003',
    assetId: '5',
    type: 'temperature',
    valeur: 78,
    unite: '°C',
    seuilMin: 20,
    seuilMax: 75,
    status: 'critique',
    derniereMAJ: '2024-01-15T10:22:00Z',
    frequenceMesure: 30,
    batterie: 78,
    signalQuality: 91
  },
  {
    id: 'GPS-002',
    assetId: '2',
    type: 'position',
    valeur: 1,
    unite: 'status',
    seuilMin: 0,
    seuilMax: 1,
    status: 'normal',
    derniereMAJ: '2024-01-15T10:15:00Z',
    frequenceMesure: 600,
    batterie: 98,
    signalQuality: 99
  }
];

const extendedAIPredictions: AIPrediction[] = [
  {
    id: '1',
    assetId: '5',
    type: 'maintenance',
    probabilite: 85,
    datePrevue: '2024-02-28',
    confiance: 92,
    recommandation: 'Maintenance préventive recommandée pour éviter une panne majeure',
    coutEstime: 15000,
    priorite: 'haute',
    actions: ['Contrôler les roulements', 'Vérifier l\'alignement', 'Changer les fluides'],
    impact: 'Risque d\'arrêt de production de 3 jours si non traité'
  },
  {
    id: '2',
    assetId: '2',
    type: 'optimisation',
    probabilite: 78,
    datePrevue: '2024-03-15',
    confiance: 88,
    recommandation: 'Optimisation du planning d\'utilisation pour réduire l\'usure',
    coutEstime: 5000,
    priorite: 'moyenne',
    actions: ['Réviser le planning', 'Former les conducteurs', 'Optimiser les trajets'],
    impact: 'Économie de carburant de 15% et prolongation de vie de 2 ans'
  },
  {
    id: '3',
    assetId: '1',
    type: 'remplacement',
    probabilite: 45,
    datePrevue: '2024-12-31',
    confiance: 76,
    recommandation: 'Planifier le remplacement du serveur pour maintenir les performances',
    coutEstime: 50000,
    priorite: 'basse',
    actions: ['Évaluer les besoins', 'Préparer le budget', 'Planifier la migration'],
    impact: 'Maintien des performances et de la sécurité informatique'
  },
  {
    id: '4',
    assetId: '3',
    type: 'economie',
    probabilite: 92,
    datePrevue: '2024-06-01',
    confiance: 95,
    recommandation: 'Installation de panneaux solaires pour réduire les coûts énergétiques',
    coutEstime: -120000,
    priorite: 'haute',
    actions: ['Étude de faisabilité', 'Installation panneaux', 'Raccordement réseau'],
    impact: 'Économie annuelle de 25,000€ sur la facture électrique'
  }
];

const maintenanceSchedules: MaintenanceSchedule[] = [
  {
    id: '1',
    assetId: '1',
    type: 'preventive',
    description: 'Maintenance préventive serveur - Nettoyage et mise à jour firmware',
    dateDebut: '2024-02-15T09:00:00Z',
    dateFin: '2024-02-15T17:00:00Z',
    dureeEstimee: 8,
    cout: 1500,
    prestataire: 'Dell Support',
    statut: 'planifiee',
    checklist: [
      'Nettoyage physique du serveur',
      'Mise à jour du firmware BIOS',
      'Vérification des ventilateurs',
      'Test des alimentations',
      'Contrôle des disques durs',
      'Mise à jour des drivers'
    ],
    pieces: ['Ventilateur de rechange', 'Pâte thermique'],
    documents: ['Rapport de maintenance', 'Certificat de conformité']
  },
  {
    id: '2',
    assetId: '2',
    type: 'preventive',
    description: 'Révision 30000 km - Contrôle complet véhicule',
    dateDebut: '2024-03-01T08:00:00Z',
    dureeEstimee: 6,
    cout: 2500,
    prestataire: 'Toyota Service',
    statut: 'planifiee',
    checklist: [
      'Vidange moteur et filtres',
      'Contrôle freins et plaquettes',
      'Vérification suspension',
      'Test éclairage',
      'Contrôle pneumatiques',
      'Diagnostic électronique'
    ],
    pieces: ['Huile moteur 5L', 'Filtre à huile', 'Filtre à air'],
    documents: ['Carnet d\'entretien', 'Certificat de contrôle technique']
  },
  {
    id: '3',
    assetId: '5',
    type: 'corrective',
    description: 'Remplacement courroie et calibrage machine CNC',
    dateDebut: '2024-01-20T06:00:00Z',
    dateFin: '2024-01-20T18:00:00Z',
    dureeEstimee: 12,
    cout: 8500,
    prestataire: 'TechMaint SARL',
    statut: 'terminee',
    checklist: [
      'Arrêt sécurisé de la machine',
      'Démontage courroie usagée',
      'Installation nouvelle courroie',
      'Calibrage précision ±0.01mm',
      'Test de fonctionnement',
      'Validation qualité'
    ],
    pieces: ['Courroie crantée XL', 'Roulements étanchés'],
    documents: ['Rapport d\'intervention', 'Certificat de calibrage']
  }
];

const inventorySessions: InventorySession[] = [
  {
    id: '1',
    date: '2024-01-15',
    type: 'complet',
    statut: 'en-cours',
    nombreActifs: 342,
    nombreVerifies: 298,
    anomalies: 5,
    responsable: 'Marie Dubois',
    equipe: ['Jean Martin', 'Paul Durand', 'Sophie Leclerc'],
    zones: ['Étage 1', 'Étage 2', 'Étage 3', 'Parking', 'Atelier'],
    methode: 'hybride',
    progression: 87
  },
  {
    id: '2',
    date: '2023-12-10',
    type: 'partiel',
    statut: 'termine',
    nombreActifs: 45,
    nombreVerifies: 45,
    anomalies: 0,
    responsable: 'Pierre Moreau',
    equipe: ['Lucie Bernard'],
    zones: ['Salle serveur'],
    methode: 'qr',
    progression: 100
  }
];

const wiseFMSyncs: WiseFMSync[] = [
  {
    id: '1',
    assetId: '1',
    dateSync: '2024-01-15T09:00:00Z',
    status: 'sync',
    donneesWiseFM: {
      valeurComptable: 27000,
      amortissement: 18000,
      statut: 'actif',
      compteComptable: '2154000'
    },
    donneesLocales: {
      valeurComptable: 27000,
      amortissement: 18000,
      statut: 'actif',
      compteComptable: '2154000'
    },
    resolution: 'automatique'
  },
  {
    id: '2',
    assetId: '2',
    dateSync: '2024-01-15T09:05:00Z',
    status: 'conflit',
    donneesWiseFM: {
      valeurComptable: 59500,
      amortissement: 25500,
      statut: 'actif',
      compteComptable: '2182000'
    },
    donneesLocales: {
      valeurComptable: 58000,
      amortissement: 27000,
      statut: 'actif',
      compteComptable: '2182000'
    },
    conflits: ['Valeur comptable différente', 'Amortissement divergent'],
    resolution: 'manuelle'
  }
];

const assetMovements: AssetMovement[] = [
  {
    id: '1',
    assetId: '4',
    date: '2024-01-10T14:30:00Z',
    type: 'transfert',
    ancienneLocalisation: 'Bureau RH - Étage 2',
    nouvelleLocalisation: 'Bureau Direction - Étage 3',
    ancienResponsable: 'Service RH',
    nouveauResponsable: 'Direction Générale',
    motif: 'Réorganisation des bureaux',
    documents: ['Bon de transfert', 'Procès-verbal de remise'],
    validatedBy: 'Marie Dubois',
    notes: 'Déménagement effectué avec précaution'
  },
  {
    id: '2',
    assetId: '1',
    date: '2024-01-05T10:15:00Z',
    type: 'upgrade',
    motif: 'Ajout de RAM et stockage SSD',
    valeur: 5000,
    documents: ['Facture upgrade', 'Bon de commande'],
    validatedBy: 'Responsable IT',
    notes: 'Upgrade RAM 64GB vers 128GB, SSD 2TB ajouté'
  }
];

const reports: Report[] = [
  {
    id: '1',
    nom: 'État des immobilisations mensuel',
    type: 'financier',
    description: 'Rapport détaillé des valeurs brutes et nettes par catégorie',
    format: 'pdf',
    frequence: 'mensuel',
    parametres: {
      categories: ['all'],
      includeGraphiques: true,
      detailAmortissements: true
    },
    dernierExecution: '2024-01-01T00:00:00Z',
    prochainExecution: '2024-02-01T00:00:00Z',
    recipients: ['directeur.financier@wisebook.com', 'comptable@wisebook.com']
  },
  {
    id: '2',
    nom: 'Dashboard IoT temps réel',
    type: 'iot',
    description: 'Surveillance continue des capteurs et alertes',
    format: 'json',
    frequence: 'quotidien',
    parametres: {
      seuilsPersonnalises: true,
      notifications: true,
      historique: 30
    },
    recipients: ['maintenance@wisebook.com', 'it@wisebook.com']
  },
  {
    id: '3',
    nom: 'Prédictions IA maintenance',
    type: 'ia',
    description: 'Rapport des prédictions et recommandations IA',
    format: 'excel',
    frequence: 'hebdomadaire',
    parametres: {
      niveauConfiance: 80,
      prioriteMinimale: 'moyenne',
      includeActions: true
    },
    dernierExecution: '2024-01-08T00:00:00Z',
    prochainExecution: '2024-01-15T00:00:00Z',
    recipients: ['maintenance@wisebook.com', 'production@wisebook.com']
  }
];

// MODULE 1: SYNTHÈSE AVANCÉE
export const renderSynthese = () => (
  <div className="space-y-6">
    {/* KPI Dashboard avec IA */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Total Actifs"
        value="342"
        icon={Package}
        trend={{ value: 3.5, type: 'increase' }}
        color="primary"
        subtitle="Tous secteurs"
      />
      <StatCard
        title="Capteurs IoT"
        value="245"
        icon={Wifi}
        trend={{ value: 12.3, type: 'increase' }}
        color="info"
        subtitle="98.7% uptime"
      />
      <StatCard
        title="Prédictions IA"
        value="32"
        icon={Brain}
        trend={{ value: 8.4, type: 'increase' }}
        color="warning"
        subtitle="94.2% précision"
      />
      <StatCard
        title="Sync Wise FM"
        value="98.5%"
        icon={Cloud}
        trend={{ value: 2.1, type: 'increase' }}
        color="success"
        subtitle="Temps réel"
      />
    </div>

    {/* Deuxième ligne KPI financiers */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Valeur Brute"
        value="€2.45M"
        icon={DollarSign}
        trend={{ value: 5.2, type: 'increase' }}
        color="success"
        subtitle="Acquisition totale"
      />
      <StatCard
        title="Valeur Nette"
        value="€1.68M"
        icon={TrendingDown}
        trend={{ value: -8.3, type: 'decrease' }}
        color="info"
        subtitle="Après amortissement"
      />
      <StatCard
        title="Économies IA"
        value="€125K"
        icon={Zap}
        trend={{ value: 18.7, type: 'increase' }}
        color="success"
        subtitle="Cette année"
      />
      <StatCard
        title="ROI Maintenance"
        value="285%"
        icon={Target}
        trend={{ value: 15.4, type: 'increase' }}
        color="primary"
        subtitle="Prédictive vs corrective"
      />
    </div>

    {/* Alertes temps réel */}
    <ModernCard>
      <CardHeader
        title="Centre de Contrôle IA & IoT"
        subtitle="Surveillance temps réel et alertes intelligentes"
        icon={Monitor}
        action={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-600">Live</span>
            </div>
            <ModernButton size="sm" variant="primary">
              <Settings className="w-4 h-4 mr-1" />
              Configurer
            </ModernButton>
          </div>
        }
      />
      <CardBody>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Alertes critiques */}
          <div>
            <h4 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Alertes Critiques (3)
            </h4>
            <div className="space-y-3">
              <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-red-900">Machine CNC - Température</span>
                  <span className="text-xs text-red-600">Il y a 2 min</span>
                </div>
                <p className="text-xs text-red-700">Température: 78°C (seuil: 75°C)</p>
                <div className="flex items-center gap-2 mt-2">
                  <ModernButton size="sm" variant="outline" className="text-xs">
                    <Wrench className="w-3 h-3 mr-1" />
                    Intervention
                  </ModernButton>
                  <ModernButton size="sm" variant="ghost" className="text-xs">
                    <Eye className="w-3 h-3 mr-1" />
                    Détails
                  </ModernButton>
                </div>
              </div>
              <div className="p-3 bg-yellow-50 border-l-4 border-yellow-500 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-yellow-900">Serveur Dell - Vibrations</span>
                  <span className="text-xs text-yellow-600">Il y a 5 min</span>
                </div>
                <p className="text-xs text-yellow-700">Vibrations anormales détectées: 8.5 mm/s</p>
              </div>
            </div>
          </div>

          {/* Prédictions IA */}
          <div>
            <h4 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-600" />
              Prédictions IA Prioritaires
            </h4>
            <div className="space-y-3">
              {extendedAIPredictions.slice(0, 3).map((prediction) => {
                const asset = extendedAssets.find(a => a.id === prediction.assetId);
                return (
                  <div key={prediction.id} className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-purple-900">{asset?.designation}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        prediction.priorite === 'critique' ? 'bg-red-100 text-red-700' :
                        prediction.priorite === 'haute' ? 'bg-orange-100 text-orange-700' :
                        prediction.priorite === 'moyenne' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {prediction.priorite}
                      </span>
                    </div>
                    <p className="text-xs text-purple-700 mb-2">{prediction.recommandation}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-purple-600">Confiance: {prediction.confiance}%</span>
                      <span className="text-purple-600">Prob: {prediction.probabilite}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Synchronisation Wise FM */}
          <div>
            <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <Cloud className="w-5 h-5 text-blue-600" />
              Synchronisation Wise FM
            </h4>
            <div className="space-y-3">
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-green-900">Statut Général</span>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-green-600">Synchronisés:</span>
                    <span className="font-medium text-green-900"> 337/342</span>
                  </div>
                  <div>
                    <span className="text-green-600">Taux:</span>
                    <span className="font-medium text-green-900"> 98.5%</span>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-yellow-900">Conflits à résoudre</span>
                  <span className="text-xs text-yellow-600">5 actifs</span>
                </div>
                <p className="text-xs text-yellow-700">Différences de valorisation détectées</p>
                <ModernButton size="sm" variant="outline" className="text-xs mt-2">
                  <Settings className="w-3 h-3 mr-1" />
                  Résoudre
                </ModernButton>
              </div>
            </div>
          </div>
        </div>
      </CardBody>
    </ModernCard>

    {/* Graphiques avancés */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ModernCard>
        <CardHeader
          title="Performance IA vs Traditionnelle"
          subtitle="Comparaison des méthodes de gestion"
          icon={BarChart3}
        />
        <CardBody>
          <div className="h-64">
            <Bar
              data={{
                labels: ['Coûts Maintenance', 'Temps d\'Arrêt', 'Précision Prév.', 'Économies'],
                datasets: [
                  {
                    label: 'Méthode Traditionnelle',
                    data: [100, 100, 100, 100],
                    backgroundColor: 'rgba(107, 114, 128, 0.6)',
                  },
                  {
                    label: 'Méthode IA + IoT',
                    data: [65, 45, 180, 250],
                    backgroundColor: 'rgba(59, 130, 246, 0.6)',
                  }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true,
                    title: {
                      display: true,
                      text: 'Performance relative (%)'
                    }
                  }
                }
              }}
            />
          </div>
        </CardBody>
      </ModernCard>

      <ModernCard>
        <CardHeader
          title="Répartition Valeur par Secteur"
          subtitle="Analyse de la répartition des actifs"
          icon={Pie}
        />
        <CardBody>
          <div className="h-64">
            <Doughnut
              data={{
                labels: ['Immobilier', 'Matériel Production', 'Véhicules', 'Informatique', 'Mobilier'],
                datasets: [{
                  data: [1260000, 362500, 144500, 72000, 61000],
                  backgroundColor: [
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(34, 197, 94, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(139, 92, 246, 0.8)'
                  ]
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom'
                  }
                }
              }}
            />
          </div>
        </CardBody>
      </ModernCard>
    </div>
  </div>
);

// MODULE 2: REGISTRE CENTRAL DÉTAILLÉ
export const renderRegistreCentral = () => (
  <div className="space-y-6">
    {/* Barre d'outils avancée */}
    <ModernCard>
      <CardHeader
        title="Registre Central des Immobilisations"
        subtitle="Base de données complète avec géolocalisation et IoT"
        icon={Database}
        action={
          <div className="flex items-center gap-3">
            <ModernButton variant="outline" size="sm">
              <Upload className="w-4 h-4 mr-1" />
              Import Excel
            </ModernButton>
            <ModernButton variant="outline" size="sm">
              <QrCode className="w-4 h-4 mr-1" />
              Générer QR
            </ModernButton>
            <ModernButton variant="primary" size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Nouvel Actif
            </ModernButton>
          </div>
        }
      />
      <CardBody>
        {/* Filtres avancés */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Recherche globale</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Code, désignation, série..."
                className="pl-10 pr-4 py-2 w-full bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
            <select className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500">
              <option value="">Toutes catégories</option>
              <option value="materiel">Matériel</option>
              <option value="immobilier">Immobilier</option>
              <option value="vehicule">Véhicules</option>
              <option value="informatique">Informatique</option>
              <option value="mobilier">Mobilier</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
            <select className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500">
              <option value="">Tous statuts</option>
              <option value="actif">Actif</option>
              <option value="amorti">Amorti</option>
              <option value="en-maintenance">En maintenance</option>
              <option value="cede">Cédé</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Localisation</label>
            <select className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500">
              <option value="">Toutes localisations</option>
              <option value="etage1">Étage 1</option>
              <option value="etage2">Étage 2</option>
              <option value="etage3">Étage 3</option>
              <option value="atelier">Atelier</option>
              <option value="parking">Parking</option>
            </select>
          </div>
        </div>

        {/* Statistiques rapides */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-lg font-bold text-blue-900">342</p>
                <p className="text-xs text-blue-700">Total actifs</p>
              </div>
            </div>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-lg font-bold text-green-900">340</p>
                <p className="text-xs text-green-700">QR générés</p>
              </div>
            </div>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-lg font-bold text-purple-900">325</p>
                <p className="text-xs text-purple-700">Géolocalisés</p>
              </div>
            </div>
          </div>
          <div className="p-3 bg-orange-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Wifi className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-lg font-bold text-orange-900">125</p>
                <p className="text-xs text-orange-700">IoT connectés</p>
              </div>
            </div>
          </div>
          <div className="p-3 bg-red-50 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-lg font-bold text-red-900">3</p>
                <p className="text-xs text-red-700">Alertes</p>
              </div>
            </div>
          </div>
        </div>

        {/* Table des actifs avec colonnes étendues */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">QR/ID</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Actif</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Catégorie</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Valeur Acq.</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">VNC</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">IoT</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Localisation</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Statut</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {extendedAssets.map((asset) => (
                <tr key={asset.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <QrCode className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-sm font-mono font-medium">{asset.code}</p>
                        <p className="text-xs text-gray-500">{asset.qrCode}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div>
                      <p className="text-sm font-medium">{asset.designation}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {asset.numeroSerie && (
                          <span className="text-xs text-gray-500">S/N: {asset.numeroSerie}</span>
                        )}
                        {asset.fournisseur && (
                          <span className="text-xs text-blue-600">{asset.fournisseur}</span>
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
                  <td className="py-3 px-4 text-sm text-right font-medium">
                    €{asset.valeurAcquisition.toLocaleString('fr-FR')}
                  </td>
                  <td className="py-3 px-4 text-sm text-right font-bold">
                    €{asset.valeurNetteComptable.toLocaleString('fr-FR')}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {asset.iotSensors && asset.iotSensors.length > 0 ? (
                        <>
                          <Wifi className="w-4 h-4 text-green-600" />
                          <span className="text-xs text-green-600">{asset.iotSensors.length}</span>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400">Non</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-gray-400" />
                      <div>
                        <p className="text-sm">{asset.localisation}</p>
                        {asset.gpsCoordinates && (
                          <p className="text-xs text-gray-500">
                            GPS: {asset.gpsCoordinates.latitude.toFixed(4)}, {asset.gpsCoordinates.longitude.toFixed(4)}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${
                      asset.statut === 'actif' ? 'bg-green-100 text-green-700' :
                      asset.statut === 'en-maintenance' ? 'bg-yellow-100 text-yellow-700' :
                      asset.statut === 'amorti' ? 'bg-gray-100 text-gray-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      <CheckCircle className="w-3 h-3" />
                      {asset.statut}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-1">
                      <button className="p-1 hover:bg-gray-100 rounded transition-colors" title="Voir détails">
                        <Eye className="w-4 h-4 text-gray-500" />
                      </button>
                      <button className="p-1 hover:bg-gray-100 rounded transition-colors" title="Modifier">
                        <Edit className="w-4 h-4 text-gray-500" />
                      </button>
                      <button className="p-1 hover:bg-gray-100 rounded transition-colors" title="QR Code">
                        <QrCode className="w-4 h-4 text-gray-500" />
                      </button>
                      <button className="p-1 hover:bg-gray-100 rounded transition-colors" title="Localiser">
                        <MapPin className="w-4 h-4 text-gray-500" />
                      </button>
                      <button className="p-1 hover:bg-gray-100 rounded transition-colors" title="IoT">
                        <Wifi className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-700">
            Affichage de <span className="font-medium">1</span> à <span className="font-medium">5</span> sur <span className="font-medium">342</span> résultats
          </p>
          <div className="flex items-center gap-2">
            <ModernButton size="sm" variant="outline">Précédent</ModernButton>
            <ModernButton size="sm" variant="primary">1</ModernButton>
            <ModernButton size="sm" variant="outline">2</ModernButton>
            <ModernButton size="sm" variant="outline">3</ModernButton>
            <ModernButton size="sm" variant="outline">Suivant</ModernButton>
          </div>
        </div>
      </CardBody>
    </ModernCard>
  </div>
);

// Composant principal exportable
interface CompleteAssetsModulesDetailedProps {
  activeModule?: number;
}

export const CompleteAssetsModulesDetailed: React.FC<CompleteAssetsModulesDetailedProps> = ({ activeModule = 1 }) => {
  if (activeModule === 1) {
    return renderSynthese();
  } else if (activeModule === 2) {
    return renderRegistreCentral();
  }
  return <div>Module non disponible</div>;
};

export default CompleteAssetsModulesDetailed;