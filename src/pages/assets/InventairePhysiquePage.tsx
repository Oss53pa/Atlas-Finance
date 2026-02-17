import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Package,
  Search,
  Scan,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Eye,
  Edit,
  MapPin,
  Calendar,
  Users,
  BarChart3,
  Download,
  Upload,
  RefreshCw,
  Plus,
  Filter,
  Settings,
  FileText,
  Camera,
  QrCode,
  ClipboardList,
  Target
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Badge,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  LoadingSpinner,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Progress,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Label,
  Textarea
} from '../../components/ui';
import { formatCurrency, formatDate, formatPercentage } from '../../lib/utils';
import { toast } from 'react-hot-toast';

interface InventoryItem {
  id: string;
  numero_inventaire: string;
  nom: string;
  categorie: string;
  localisation_theorique: string;
  localisation_reelle?: string;
  responsable: string;
  statut_comptage: 'non_compte' | 'en_cours' | 'compte' | 'ecart' | 'valide';
  date_comptage?: string;
  compteur: string;
  observations?: string;
  valeur_nette_comptable: number;
  etat_physique: 'excellent' | 'bon' | 'moyen' | 'mauvais' | 'hors_service';
  code_barre?: string;
  qr_code?: string;
  photo_url?: string;
  derniere_maintenance?: string;
  prochaine_maintenance?: string;
}

interface InventorySession {
  id: string;
  nom: string;
  date_debut: string;
  date_fin_prevue: string;
  date_fin_reelle?: string;
  statut: 'planifie' | 'en_cours' | 'termine' | 'suspendu';
  responsable: string;
  equipes: string[];
  perimetre: string;
  nb_items_total: number;
  nb_items_comptes: number;
  nb_ecarts: number;
  taux_realisation: number;
}

interface InventoryDiscrepancy {
  id: string;
  session_id: string;
  item_id: string;
  type_ecart: 'manquant' | 'excedent' | 'localisation' | 'etat' | 'valeur';
  description: string;
  impact_financier: number;
  statut_resolution: 'ouvert' | 'en_cours' | 'resolu' | 'accepte';
  responsable_resolution?: string;
  date_resolution?: string;
  action_corrective?: string;
}

interface TeamMember {
  id: string;
  nom: string;
  role: 'responsable' | 'compteur' | 'verificateur';
  zone_affectee: string;
  nb_items_assignes: number;
  nb_items_comptes: number;
  taux_completion: number;
}

const InventairePhysiquePage: React.FC = () => {
  const { t } = useLanguage();
  const [selectedSession, setSelectedSession] = useState<string>('current');
  const [selectedZone, setSelectedZone] = useState<string>('toutes');
  const [selectedStatus, setSelectedStatus] = useState<string>('tous');
  const [isScanning, setIsScanning] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('inventory');

  // États pour les modales
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [showItemDetailModal, setShowItemDetailModal] = useState(false);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [showQrCodeModal, setShowQrCodeModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  // Mock inventory sessions
  const mockSessions: InventorySession[] = [
    {
      id: 'current',
      nom: 'Inventaire Annuel 2024',
      date_debut: '2024-02-01',
      date_fin_prevue: '2024-02-15',
      statut: 'en_cours',
      responsable: 'Marie KOUASSI',
      equipes: ['Équipe A', 'Équipe B', 'Équipe C'],
      perimetre: 'Tous les sites - Abidjan',
      nb_items_total: 2847,
      nb_items_comptes: 1923,
      nb_ecarts: 47,
      taux_realisation: 0.675
    },
    {
      id: '2023',
      nom: 'Inventaire Annuel 2023',
      date_debut: '2023-02-01',
      date_fin_prevue: '2023-02-15',
      date_fin_reelle: '2023-02-18',
      statut: 'termine',
      responsable: 'Jean-Baptiste KONE',
      equipes: ['Équipe A', 'Équipe B'],
      perimetre: 'Siège social uniquement',
      nb_items_total: 2654,
      nb_items_comptes: 2654,
      nb_ecarts: 32,
      taux_realisation: 1.0
    }
  ];

  // Mock inventory items avec plus de données
  const mockInventoryItems: InventoryItem[] = [
    {
      id: '1',
      numero_inventaire: 'IT-2023-001',
      nom: 'Serveur Dell PowerEdge R750',
      categorie: 'Matériel Informatique',
      localisation_theorique: 'Salle Serveur - Étage 2',
      localisation_reelle: 'Salle Serveur - Étage 2',
      responsable: 'Service IT',
      statut_comptage: 'compte',
      date_comptage: '2024-02-05T14:30:00Z',
      compteur: 'Alain DIABATE',
      valeur_nette_comptable: 7225000,
      etat_physique: 'bon',
      code_barre: '1234567890123',
      qr_code: 'QR-IT-2023-001',
      derniere_maintenance: '2024-01-15'
    },
    {
      id: '2',
      numero_inventaire: 'VH-2022-003',
      nom: 'Véhicule Toyota Hilux',
      categorie: 'Matériel de Transport',
      localisation_theorique: 'Garage Principal',
      localisation_reelle: 'En mission extérieure',
      responsable: 'Service Logistique',
      statut_comptage: 'ecart',
      date_comptage: '2024-02-03T10:15:00Z',
      compteur: 'Fatou TRAORE',
      observations: 'Véhicule en mission à Bouaké - Retour prévu le 10/02',
      valeur_nette_comptable: 12950000,
      etat_physique: 'bon',
      code_barre: '2345678901234'
    },
    {
      id: '3',
      numero_inventaire: 'MO-2023-015',
      nom: 'Mobilier Bureau Direction',
      categorie: 'Mobilier',
      localisation_theorique: 'Bureau Direction - Étage 3',
      localisation_reelle: 'Bureau Direction - Étage 3',
      responsable: 'Direction Générale',
      statut_comptage: 'compte',
      date_comptage: '2024-02-04T16:45:00Z',
      compteur: 'Ibrahim SANOGO',
      valeur_nette_comptable: 2850000,
      etat_physique: 'excellent',
      code_barre: '3456789012345'
    },
    {
      id: '4',
      numero_inventaire: 'EQ-2021-007',
      nom: 'Imprimante HP LaserJet Pro',
      categorie: 'Équipement Bureau',
      localisation_theorique: 'Service Comptabilité',
      responsable: 'Service Comptabilité',
      statut_comptage: 'non_compte',
      valeur_nette_comptable: 450000,
      etat_physique: 'moyen',
      code_barre: '4567890123456'
    },
    {
      id: '5',
      numero_inventaire: 'IN-2023-022',
      nom: 'Ordinateur Portable Lenovo',
      categorie: 'Matériel Informatique',
      localisation_theorique: 'Service Commercial',
      localisation_reelle: 'Introuvable',
      responsable: 'Service Commercial',
      statut_comptage: 'ecart',
      date_comptage: '2024-02-06T09:20:00Z',
      compteur: 'Aminata BAMBA',
      observations: 'Matériel non localisé - Possible vol ou perte',
      valeur_nette_comptable: 1850000,
      etat_physique: 'bon',
      code_barre: '5678901234567'
    },
    {
      id: '6',
      numero_inventaire: 'IT-2023-045',
      nom: 'Ordinateur Desktop HP ProDesk',
      categorie: 'Matériel Informatique',
      localisation_theorique: 'Bureau Comptabilité',
      localisation_reelle: 'Bureau Comptabilité',
      responsable: 'Service Comptabilité',
      statut_comptage: 'compte',
      date_comptage: '2024-02-05T10:20:00Z',
      compteur: 'Alain DIABATE',
      valeur_nette_comptable: 850000,
      etat_physique: 'bon',
      code_barre: '6789012345678'
    },
    {
      id: '7',
      numero_inventaire: 'MO-2023-021',
      nom: 'Bureau Exécutif',
      categorie: 'Mobilier',
      localisation_theorique: 'Bureau DG',
      localisation_reelle: 'Bureau DG',
      responsable: 'Direction Générale',
      statut_comptage: 'compte',
      date_comptage: '2024-02-04T15:30:00Z',
      compteur: 'Ibrahim SANOGO',
      valeur_nette_comptable: 1250000,
      etat_physique: 'excellent',
      code_barre: '7890123456789'
    },
    {
      id: '8',
      numero_inventaire: 'CL-2022-010',
      nom: 'Climatiseur LG 2.5CV',
      categorie: 'Équipement Bureau',
      localisation_theorique: 'Salle de Réunion',
      localisation_reelle: 'Salle de Réunion',
      responsable: 'Services Généraux',
      statut_comptage: 'non_compte',
      valeur_nette_comptable: 425000,
      etat_physique: 'bon',
      code_barre: '8901234567890'
    },
    {
      id: '9',
      numero_inventaire: 'VH-2023-001',
      nom: 'Véhicule Peugeot 308',
      categorie: 'Matériel de Transport',
      localisation_theorique: 'Parking Principal',
      localisation_reelle: 'Parking Principal',
      responsable: 'Service Logistique',
      statut_comptage: 'compte',
      date_comptage: '2024-02-03T14:00:00Z',
      compteur: 'Fatou TRAORE',
      valeur_nette_comptable: 8500000,
      etat_physique: 'excellent',
      code_barre: '9012345678901'
    },
    {
      id: '10',
      numero_inventaire: 'IT-2023-089',
      nom: 'Switch Cisco 48 ports',
      categorie: 'Matériel Informatique',
      localisation_theorique: 'Salle Serveur',
      localisation_reelle: 'Salle Serveur',
      responsable: 'Service IT',
      statut_comptage: 'compte',
      date_comptage: '2024-02-05T11:45:00Z',
      compteur: 'Alain DIABATE',
      valeur_nette_comptable: 2150000,
      etat_physique: 'bon',
      code_barre: '0123456789012'
    }
  ];

  // Mock discrepancies avec plus de données
  const mockDiscrepancies: InventoryDiscrepancy[] = [
    {
      id: '1',
      session_id: 'current',
      item_id: '2',
      type_ecart: 'localisation',
      description: 'Véhicule en mission extérieure non disponible pour comptage',
      impact_financier: 0,
      statut_resolution: 'resolu',
      responsable_resolution: 'Chef Logistique',
      date_resolution: '2024-02-04',
      action_corrective: 'Comptage programmé au retour de mission'
    },
    {
      id: '2',
      session_id: 'current',
      item_id: '5',
      type_ecart: 'manquant',
      description: 'Ordinateur portable non retrouvé malgré les recherches',
      impact_financier: 1850000,
      statut_resolution: 'en_cours',
      responsable_resolution: 'Responsable Sécurité'
    },
    {
      id: '3',
      session_id: 'current',
      item_id: '8',
      type_ecart: 'etat',
      description: 'Climatiseur présente des signes de dysfonctionnement',
      impact_financier: 125000,
      statut_resolution: 'en_cours',
      responsable_resolution: 'Services Généraux',
      action_corrective: 'Maintenance préventive à planifier'
    },
    {
      id: '4',
      session_id: 'current',
      item_id: '3',
      type_ecart: 'valeur',
      description: 'Valeur comptable à réévaluer suite à amortissement',
      impact_financier: -285000,
      statut_resolution: 'accepte',
      responsable_resolution: 'Service Comptabilité',
      date_resolution: '2024-02-05',
      action_corrective: 'Mise à jour du plan d\'amortissement'
    },
    {
      id: '5',
      session_id: 'current',
      item_id: '6',
      type_ecart: 'excedent',
      description: 'Matériel non répertorié dans la base initiale',
      impact_financier: 850000,
      statut_resolution: 'resolu',
      responsable_resolution: 'Service IT',
      date_resolution: '2024-02-06',
      action_corrective: 'Ajouté à l\'inventaire avec numéro de série'
    }
  ];

  // Mock team members avec plus de données
  const mockTeamMembers: TeamMember[] = [
    {
      id: '1',
      nom: 'Alain DIABATE',
      role: 'responsable',
      zone_affectee: 'Matériel Informatique',
      nb_items_assignes: 156,
      nb_items_comptes: 142,
      taux_completion: 0.91
    },
    {
      id: '2',
      nom: 'Fatou TRAORE',
      role: 'compteur',
      zone_affectee: 'Matériel de Transport',
      nb_items_assignes: 28,
      nb_items_comptes: 25,
      taux_completion: 0.89
    },
    {
      id: '3',
      nom: 'Ibrahim SANOGO',
      role: 'compteur',
      zone_affectee: 'Mobilier et Équipements',
      nb_items_assignes: 234,
      nb_items_comptes: 198,
      taux_completion: 0.85
    },
    {
      id: '4',
      nom: 'Aminata BAMBA',
      role: 'verificateur',
      zone_affectee: 'Tous secteurs',
      nb_items_assignes: 2847,
      nb_items_comptes: 1923,
      taux_completion: 0.675
    },
    {
      id: '5',
      nom: 'Koffi KOUAME',
      role: 'compteur',
      zone_affectee: 'Services Généraux',
      nb_items_assignes: 87,
      nb_items_comptes: 65,
      taux_completion: 0.75
    },
    {
      id: '6',
      nom: 'Marie KOUASSI',
      role: 'responsable',
      zone_affectee: 'Coordination Générale',
      nb_items_assignes: 2847,
      nb_items_comptes: 1923,
      taux_completion: 0.675
    }
  ];

  const { data: sessions = mockSessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['inventory-sessions'],
    queryFn: () => Promise.resolve(mockSessions),
  });

  // Filtrer les articles en fonction des critères sélectionnés et du terme de recherche
  const filteredInventoryItems = mockInventoryItems.filter(item => {
    const matchesStatus = selectedStatus === 'tous' || selectedStatus === 'all' || item.statut_comptage === selectedStatus;
    const matchesZone = selectedZone === 'toutes' || selectedZone === 'all' || item.categorie === selectedZone;
    const matchesSearch = searchTerm === '' ||
      item.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.numero_inventaire.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesZone && matchesSearch;
  });

  const { data: inventoryItems = filteredInventoryItems, isLoading: itemsLoading } = useQuery({
    queryKey: ['inventory-items', selectedSession, selectedZone, selectedStatus, searchTerm],
    queryFn: () => Promise.resolve(filteredInventoryItems),
  });

  const { data: discrepancies = mockDiscrepancies } = useQuery({
    queryKey: ['inventory-discrepancies', selectedSession],
    queryFn: () => Promise.resolve(mockDiscrepancies),
  });

  const { data: teamMembers = mockTeamMembers } = useQuery({
    queryKey: ['team-members'],
    queryFn: () => Promise.resolve(mockTeamMembers),
  });

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'compte':
        return 'text-[#6A8A82] bg-[#6A8A82]/10';
      case 'en_cours':
        return 'text-[#B87333] bg-[#B87333]/10';
      case 'ecart':
        return 'text-red-600 bg-red-100';
      case 'valide':
        return 'text-[#7A99AC] bg-[#7A99AC]/10';
      case 'non_compte':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (statut: string) => {
    switch (statut) {
      case 'compte':
        return <CheckCircle className="h-4 w-4" />;
      case 'en_cours':
        return <RefreshCw className="h-4 w-4" />;
      case 'ecart':
        return <AlertTriangle className="h-4 w-4" />;
      case 'valide':
        return <CheckCircle className="h-4 w-4" />;
      case 'non_compte':
        return <XCircle className="h-4 w-4" />;
      default:
        return <XCircle className="h-4 w-4" />;
    }
  };

  const getPhysicalStateColor = (etat: string) => {
    switch (etat) {
      case 'excellent':
        return 'text-[#6A8A82] bg-[#6A8A82]/10';
      case 'bon':
        return 'text-[#7A99AC] bg-[#7A99AC]/10';
      case 'moyen':
        return 'text-[#B87333] bg-[#B87333]/10';
      case 'mauvais':
        return 'text-red-600 bg-red-100';
      case 'hors_service':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getDiscrepancyTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'manquant': 'bg-red-50 text-red-700',
      'excedent': 'bg-[#7A99AC]/10 text-[#7A99AC]',
      'localisation': 'bg-[#B87333]/10 text-[#B87333]',
      'etat': 'bg-[#B87333]/10 text-[#B87333]',
      'valeur': 'bg-[#E8D5C4]/20 text-[#B87333]'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      'responsable': 'bg-[#B87333]/10 text-[#B87333]',
      'compteur': 'bg-[#7A99AC]/10 text-[#7A99AC]',
      'verificateur': 'bg-[#6A8A82]/10 text-[#6A8A82]'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const handleStartScanning = () => {
    setIsScanning(true);
    toast.success('Scanner activé - Scannez les codes-barres');
    // Simulate scanning
    setTimeout(() => {
      setIsScanning(false);
      toast.success('Article scanné et comptabilisé!');
    }, 3000);
  };

  // Handlers pour les boutons d'action
  const handleNewSession = () => {
    setShowNewSessionModal(true);
  };

  const handleViewItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setShowItemDetailModal(true);
  };

  const handleEditItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setShowEditItemModal(true);
  };

  const handleQrCode = (item: InventoryItem) => {
    setSelectedItem(item);
    setShowQrCodeModal(true);
  };

  const currentSession = sessions.find(s => s.id === selectedSession) || sessions[0];
  const countedItems = mockInventoryItems.filter(item => item.statut_comptage === 'compte').length;
  const discrepanciesCount = mockInventoryItems.filter(item => item.statut_comptage === 'ecart').length;
  const totalValue = mockInventoryItems.reduce((sum, item) => sum + item.valeur_nette_comptable, 0);
  const completionRate = currentSession ? (currentSession.nb_items_comptes / currentSession.nb_items_total) : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="border-b border-gray-200 pb-2"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900 flex items-center">
              <ClipboardList className="mr-2 h-6 w-6 text-[#6A8A82]" />
              Inventaire Physique
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Gestion complète de l'inventaire physique avec comptage et contrôle des écarts
            </p>
          </div>
          <div className="flex space-x-3">
            <Button
              onClick={handleStartScanning}
              disabled={isScanning}
              className="bg-[#6A8A82] hover:bg-[#5A7A72]"
            >
              {isScanning ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Scan className="mr-2 h-4 w-4" />
              )}
              {isScanning ? 'Scan en cours...' : 'Scanner'}
            </Button>
            <Button
              onClick={handleNewSession}
              className="bg-[#6A8A82] hover:bg-[#5A7A72] text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle Session
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exporter
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Session Info */}
      {currentSession && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="bg-[#6A8A82]/5 border-[#6A8A82]/20">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-[#2C3E2F]">{currentSession.nom}</h2>
                  <p className="text-xs text-[#6A8A82]">
                    Du {formatDate(currentSession.date_debut)} au {formatDate(currentSession.date_fin_prevue)}
                  </p>
                  <p className="text-xs text-[#6A8A82]">
                    Responsable: {currentSession.responsable} | Périmètre: {currentSession.perimetre}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-3">
                    <div className="text-center">
                      <p className="text-base font-bold text-blue-900">{formatPercentage(completionRate)}</p>
                      <p className="text-xs text-blue-700">Progression</p>
                    </div>
                    <div className="w-24">
                      <Progress value={completionRate * 100} className="h-2" />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardContent className="flex items-center p-3">
              <div className="flex items-center space-x-3">
                <div className="p-1 bg-[#7A99AC]/10 rounded">
                  <Package className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600">Articles Total</p>
                  <p className="text-lg font-bold text-blue-700">
                    {currentSession?.nb_items_total || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card>
            <CardContent className="flex items-center p-3">
              <div className="flex items-center space-x-3">
                <div className="p-1 bg-[#6A8A82]/10 rounded">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600">Comptés</p>
                  <p className="text-lg font-bold text-green-700">{countedItems}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card>
            <CardContent className="flex items-center p-3">
              <div className="flex items-center space-x-3">
                <div className="p-1 bg-red-50 rounded">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600">Écarts</p>
                  <p className="text-lg font-bold text-red-700">{discrepanciesCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card>
            <CardContent className="flex items-center p-3">
              <div className="flex items-center space-x-3">
                <div className="p-1 bg-[#B87333]/10 rounded">
                  <Target className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600">Valeur Contrôlée</p>
                  <p className="text-sm font-bold text-purple-700">
                    {formatCurrency(totalValue)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <Card>
          <CardHeader className="py-2">
            <CardTitle className="flex items-center text-base">
              <Filter className="mr-2 h-4 w-4" />
              Filtres et Recherche
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="grid gap-3 md:grid-cols-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Session
                </label>
                <Select value={selectedSession} onValueChange={setSelectedSession}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.map(session => (
                      <SelectItem key={session.id} value={session.id}>
                        {session.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Zone/Catégorie
                </label>
                <Select value={selectedZone} onValueChange={setSelectedZone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="toutes">Toutes les zones</SelectItem>
                    <SelectItem value="Matériel Informatique">Matériel Informatique</SelectItem>
                    <SelectItem value="Matériel de Transport">Matériel de Transport</SelectItem>
                    <SelectItem value="Mobilier">Mobilier</SelectItem>
                    <SelectItem value="Équipement Bureau">Équipement Bureau</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Statut
                </label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Tous statuts</SelectItem>
                    <SelectItem value="non_compte">Non compté</SelectItem>
                    <SelectItem value="en_cours">{t('status.inProgress')}</SelectItem>
                    <SelectItem value="compte">Compté</SelectItem>
                    <SelectItem value="ecart">Écart</SelectItem>
                    <SelectItem value="valide">{t('accounting.validated')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recherche
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-700" />
                  <Input 
                    placeholder="N° inventaire, nom..." 
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="flex items-end">
                <Button 
                  onClick={handleStartScanning}
                  disabled={isScanning}
                  className="w-full bg-[#6A8A82] hover:bg-[#5A7A72]"
                >
                  <QrCode className="mr-2 h-4 w-4" />
                  Scanner QR/Code-barres
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
      >
        <Tabs defaultValue="inventory" value={activeTab} onValueChange={setActiveTab} className="space-y-3">
          <TabsList className="h-8">
            <TabsTrigger value="inventory" className="text-sm">Articles à Compter</TabsTrigger>
            <TabsTrigger value="discrepancies" className="text-sm">Écarts Détectés</TabsTrigger>
            <TabsTrigger value="teams" className="text-sm">Équipes</TabsTrigger>
            <TabsTrigger value="reports" className="text-sm">Rapports</TabsTrigger>
          </TabsList>

          <TabsContent value="inventory" className="space-y-2">
            <Card className="p-0">
              <CardHeader className="py-2 px-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>Articles à Compter</span>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="bg-[#7A99AC]/10 text-[#7A99AC]">
                      {inventoryItems.length} articles
                    </Badge>
                    <Badge variant={inventoryItems.filter(i => i.statut_comptage === 'compte').length > 0 ? 'default' : 'secondary'}>
                      {inventoryItems.filter(i => i.statut_comptage === 'compte').length} comptés
                    </Badge>
                    <Badge variant="destructive" className="bg-red-50 text-red-700">
                      {inventoryItems.filter(i => i.statut_comptage === 'ecart').length} écarts
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-2">
                {/* Filtres compacts */}
                <div className="flex flex-wrap gap-2 items-center mb-2">
                  <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-700 h-4 w-4" />
                      <Input
                        placeholder="Rechercher par N° inventaire, nom..."
                        className="pl-10 h-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="w-[120px] h-8">
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tous">Tous</SelectItem>
                      <SelectItem value="non_compte">Non compté</SelectItem>
                      <SelectItem value="compte">Compté</SelectItem>
                      <SelectItem value="ecart">Écart</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={selectedZone} onValueChange={setSelectedZone}>
                    <SelectTrigger className="w-[120px] h-8">
                      <SelectValue placeholder="Zone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="toutes">Toutes zones</SelectItem>
                      <SelectItem value="Matériel Informatique">Matériel Informatique</SelectItem>
                      <SelectItem value="Matériel de Transport">Matériel de Transport</SelectItem>
                      <SelectItem value="Mobilier">Mobilier</SelectItem>
                      <SelectItem value="Équipement Bureau">Équipement Bureau</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={() => setIsScanning(!isScanning)} size="sm" className="h-8">
                    <QrCode className="h-4 w-4 mr-1" />
                    Scanner
                  </Button>
                </div>

                {itemsLoading ? (
                  <div className="flex justify-center py-4">
                    <LoadingSpinner size="lg" text="Chargement de l'inventaire..." />
                  </div>
                ) : (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow className="h-8">
                          <TableHead className="text-xs font-medium py-1">Article</TableHead>
                          <TableHead className="text-xs font-medium py-1">Localisation</TableHead>
                          <TableHead className="text-xs font-medium py-1">Statut</TableHead>
                          <TableHead className="text-xs font-medium py-1">État</TableHead>
                          <TableHead className="text-xs font-medium text-right py-1">VNC</TableHead>
                          <TableHead className="text-xs font-medium py-1">Compteur</TableHead>
                          <TableHead className="text-xs font-medium py-1">{t('common.date')}</TableHead>
                          <TableHead className="text-xs font-medium text-center py-1">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inventoryItems.slice(0, 15).map((item) => (
                          <TableRow key={item.id} className="h-10 hover:bg-gray-50">
                            <TableCell className="py-1">
                              <div className="flex items-center space-x-2">
                                <div className="p-0.5 bg-[#7A99AC]/10 rounded">
                                  <Package className="h-3 w-3 text-blue-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900 text-xs">{item.nom}</p>
                                  <p className="text-xs text-gray-700 font-mono">{item.numero_inventaire}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="py-1">
                              <div>
                                <p className="text-xs font-medium text-gray-900">
                                  <MapPin className="inline h-3 w-3 mr-1" />
                                  {item.localisation_theorique}
                                </p>
                                {item.localisation_reelle && item.localisation_reelle !== item.localisation_theorique && (
                                  <p className="text-xs text-red-600">
                                    Réel: {item.localisation_reelle}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="py-1">
                              <Badge
                                className="text-xs px-2 py-0.5"
                                variant={item.statut_comptage === 'ecart' ? 'destructive' :
                                       item.statut_comptage === 'compte' ? 'default' : 'secondary'}
                              >
                                {item.statut_comptage === 'non_compte' ? 'Non compté' :
                                 item.statut_comptage === 'compte' ? 'Compté' :
                                 item.statut_comptage === 'ecart' ? 'Écart' : item.statut_comptage}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-1">
                              <Badge
                                className="text-xs px-2 py-0.5"
                                variant={item.etat_physique === 'excellent' ? 'default' :
                                       item.etat_physique === 'bon' ? 'secondary' : 'outline'}
                              >
                                {item.etat_physique === 'excellent' ? 'Excellent' :
                                 item.etat_physique === 'bon' ? 'Bon' :
                                 item.etat_physique === 'moyen' ? 'Moyen' :
                                 item.etat_physique === 'mauvais' ? 'Mauvais' : 'H.S.'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right py-2">
                              <span className="font-semibold text-[#6A8A82] text-xs">
                                {formatCurrency(item.valeur_nette_comptable)}
                              </span>
                            </TableCell>
                            <TableCell className="py-1">
                              {item.compteur && (
                                <div>
                                  <p className="text-xs font-medium">{item.compteur}</p>
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="py-1">
                              {item.date_comptage && (
                                <span className="text-xs text-gray-600">
                                  {formatDate(item.date_comptage)}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-center py-2">
                              <div className="flex justify-center space-x-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0 hover:bg-gray-100"
                                  onClick={() => handleViewItem(item)}
                                  title="Voir les détails"
                                >
                                  <Eye className="h-3 w-3 text-gray-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0 hover:bg-gray-100"
                                  onClick={() => handleEditItem(item)}
                                  title="Modifier"
                                >
                                  <Edit className="h-3 w-3 text-gray-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0 hover:bg-gray-100"
                                  onClick={() => handleQrCode(item)}
                                  title="Code QR"
                                >
                                  <QrCode className="h-3 w-3 text-gray-600" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Pagination info compacte */}
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span className="text-xs text-gray-700">
                    Affichage de 1-{Math.min(15, inventoryItems.length)} sur {inventoryItems.length} articles
                  </span>
                  <div className="flex space-x-1">
                    <Button variant="outline" size="sm" className="h-5 px-2 text-xs">Précédent</Button>
                    <Button variant="outline" size="sm" className="h-5 px-2 text-xs">Suivant</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="discrepancies" className="space-y-2">
            <Card className="p-0">
              <CardHeader className="py-2 px-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center">
                    <AlertTriangle className="mr-2 h-5 w-5 text-red-600" />
                    Écarts Détectés
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="destructive" className="bg-red-50 text-red-700">
                      {discrepancies.length} écarts
                    </Badge>
                    <Badge variant="secondary">
                      {discrepancies.filter(d => d.statut_resolution === 'en_cours').length} en cours
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-2">
                {/* Filtres pour les écarts */}
                <div className="flex flex-wrap gap-2 items-center mb-2">
                  <Select defaultValue="all">
                    <SelectTrigger className="w-[140px] h-8">
                      <SelectValue placeholder="Type d'écart" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous types</SelectItem>
                      <SelectItem value="manquant">Manquant</SelectItem>
                      <SelectItem value="excedent">Excédent</SelectItem>
                      <SelectItem value="localisation">Localisation</SelectItem>
                      <SelectItem value="etat">État</SelectItem>
                      <SelectItem value="valeur">Valeur</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-[120px] h-8">
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      <SelectItem value="en_cours">{t('status.inProgress')}</SelectItem>
                      <SelectItem value="resolu">Résolu</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" className="h-8">
                    <Plus className="h-4 w-4 mr-1" />
                    Nouveau
                  </Button>
                </div>

                <div className="space-y-1">
                  {discrepancies.map((discrepancy) => {
                    const item = inventoryItems.find(i => i.id === discrepancy.item_id);
                    return (
                      <div key={discrepancy.id} className="border rounded-lg p-2 hover:bg-gray-50">
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex items-center space-x-2">
                            <div className="p-1 bg-red-50 rounded">
                              <AlertTriangle className="h-4 w-4 text-red-600" />
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900">
                                {item?.nom || 'Article inconnu'}
                              </h4>
                              <p className="text-xs text-gray-600">{discrepancy.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Badge variant={discrepancy.type_ecart === 'manquant' ? 'destructive' : 'secondary'} className="text-xs px-2 py-0.5">
                              {discrepancy.type_ecart === 'manquant' ? 'Manquant' :
                               discrepancy.type_ecart === 'excedent' ? 'Excédent' :
                               discrepancy.type_ecart === 'localisation' ? 'Localisation' :
                               discrepancy.type_ecart === 'etat' ? 'État' : 'Valeur'}
                            </Badge>
                            <Badge variant={discrepancy.statut_resolution === 'resolu' ? 'default' : 'destructive'} className="text-xs px-2 py-0.5">
                              {discrepancy.statut_resolution === 'resolu' ? 'Résolu' : 'En cours'}
                            </Badge>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mb-1">
                          <div>
                            <p className="text-gray-700">N° Inventaire</p>
                            <p className="font-mono text-xs">{item?.numero_inventaire}</p>
                          </div>
                          <div>
                            <p className="text-gray-700">Impact Financier</p>
                            <p className={`font-semibold text-xs ${discrepancy.impact_financier > 0 ? 'text-red-700' : 'text-gray-700'}`}>
                              {discrepancy.impact_financier > 0 ? formatCurrency(discrepancy.impact_financier) : 'Aucun'}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-700">Responsable</p>
                            <p className="font-medium text-xs">{discrepancy.responsable_resolution || 'Non assigné'}</p>
                          </div>
                          <div>
                            <p className="text-gray-700">Date Résolution</p>
                            <p className="font-medium text-xs">
                              {discrepancy.date_resolution ? formatDate(discrepancy.date_resolution) : 'En attente'}
                            </p>
                          </div>
                        </div>

                        {discrepancy.action_corrective && (
                          <div className="bg-[#6A8A82]/5 border border-[#6A8A82]/20 rounded p-2 mb-2">
                            <p className="text-xs text-green-800">
                              <strong>Action:</strong> {discrepancy.action_corrective}
                            </p>
                          </div>
                        )}

                        <div className="flex justify-end space-x-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="mr-2 h-4 w-4" />
                            Détails
                          </Button>
                          {discrepancy.statut_resolution !== 'resolu' && (
                            <Button size="sm" className="bg-[#7A99AC] hover:bg-[#6A8A92]">
                              <Edit className="mr-2 h-4 w-4" />
                              Résoudre
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="teams" className="space-y-2">
            <Card className="p-0">
              <CardHeader className="py-2 px-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center">
                    <Users className="mr-2 h-5 w-5 text-purple-600" />
                    Équipes d'Inventaire
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="bg-[#B87333]/10 text-[#B87333]">
                      {teamMembers.length} membres
                    </Badge>
                    <Badge variant="default">
                      {teamMembers.length} actifs
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-2">
                {/* Actions rapides */}
                <div className="flex flex-wrap gap-2 items-center mb-2">
                  <Button size="sm" className="h-8">
                    <Plus className="h-4 w-4 mr-1" />
                    Ajouter Membre
                  </Button>
                  <Button size="sm" variant="outline" className="h-8">
                    <Users className="h-4 w-4 mr-1" />
                    Créer Équipe
                  </Button>
                  <Select defaultValue="all">
                    <SelectTrigger className="w-[120px] h-8">
                      <SelectValue placeholder="Zone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes zones</SelectItem>
                      <SelectItem value="bureau">Bureau</SelectItem>
                      <SelectItem value="entrepot">Entrepôt</SelectItem>
                      <SelectItem value="production">Production</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2 md:grid-cols-1 lg:grid-cols-2">
                  {teamMembers.map((member) => (
                    <div key={member.id} className="border rounded-lg p-2 hover:bg-gray-50">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          <div className="p-0.5 bg-[#B87333]/10 rounded">
                            <Users className="h-3 w-3 text-purple-600" />
                          </div>
                          <div>
                            <h4 className="text-xs font-semibold text-gray-900">{member.nom}</h4>
                            <Badge variant={member.role === 'responsable' ? 'default' : 'secondary'} className="text-xs px-1 py-0">
                              {member.role}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-purple-700">
                            {formatPercentage(member.taux_completion)}
                          </p>
                          <p className="text-xs text-gray-600">Progression</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mb-2 text-xs">
                        <div className="text-center">
                          <p className="text-gray-700">Zone</p>
                          <p className="font-medium">{member.zone_affectee}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-700">Assignés</p>
                          <p className="font-medium">{member.nb_items_assignes}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-700">Comptés</p>
                          <p className="font-medium text-green-700">{member.nb_items_comptes}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Progress value={member.taux_completion * 100} className="flex-1 h-1" />
                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                          <Eye className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-2">
            <Card className="p-0">
              <CardHeader className="py-2 px-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center">
                    <FileText className="mr-2 h-5 w-5 text-green-600" />
                    Rapports d'Inventaire
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="default" className="bg-[#6A8A82]/10 text-[#6A8A82]">
                      5 rapports disponibles
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-2">
                {/* Filtres rapides */}
                <div className="flex flex-wrap gap-2 items-center mb-2">
                  <Select defaultValue="all">
                    <SelectTrigger className="w-[140px] h-8">
                      <SelectValue placeholder="Type de rapport" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous types</SelectItem>
                      <SelectItem value="progression">Progression</SelectItem>
                      <SelectItem value="ecarts">Écarts</SelectItem>
                      <SelectItem value="equipes">Équipes</SelectItem>
                      <SelectItem value="financier">Financier</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select defaultValue="pdf">
                    <SelectTrigger className="w-[100px] h-8">
                      <SelectValue placeholder="Format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="excel">Excel</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" className="h-8">
                    <Download className="h-4 w-4 mr-1" />
                    Télécharger Tout
                  </Button>
                </div>

                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                  <div className="border rounded-lg p-2 hover:bg-gray-50 cursor-pointer">
                    <div className="flex items-center space-x-2 mb-1">
                      <div className="p-1 bg-[#7A99AC]/10 rounded">
                        <BarChart3 className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900">Progression Globale</h4>
                        <p className="text-xs text-gray-600">État par zone</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-700">Complété à</span>
                      <span className="text-sm font-bold text-blue-700">67.5%</span>
                    </div>
                    <Button variant="outline" size="sm" className="w-full h-5 text-xs">
                      <Download className="mr-1 h-3 w-3" />
                      PDF
                    </Button>
                  </div>

                  <div className="border rounded-lg p-2 hover:bg-gray-50 cursor-pointer">
                    <div className="flex items-center space-x-2 mb-1">
                      <div className="p-1 bg-red-50 rounded">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900">Écarts Détectés</h4>
                        <p className="text-xs text-gray-600">Analyse des écarts</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-700">Total écarts</span>
                      <span className="text-sm font-bold text-red-700">{discrepancies.length}</span>
                    </div>
                    <Button variant="outline" size="sm" className="w-full h-5 text-xs">
                      <Download className="mr-1 h-3 w-3" />
                      Excel
                    </Button>
                  </div>

                  <div className="border rounded-lg p-2 hover:bg-gray-50 cursor-pointer">
                    <div className="flex items-center space-x-2 mb-1">
                      <div className="p-1 bg-[#B87333]/10 rounded">
                        <Users className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900">Performance Équipes</h4>
                        <p className="text-xs text-gray-600">Analyse par équipe</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-700">Membres actifs</span>
                      <span className="text-sm font-bold text-purple-700">{teamMembers.length}</span>
                    </div>
                    <Button variant="outline" size="sm" className="w-full h-5 text-xs">
                      <Download className="mr-1 h-3 w-3" />
                      PDF
                    </Button>
                  </div>

                  <div className="border rounded-lg p-2 hover:bg-gray-50 cursor-pointer">
                    <div className="flex items-center space-x-2 mb-1">
                      <div className="p-1 bg-[#6A8A82]/10 rounded">
                        <Target className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900">Rapport Financier</h4>
                        <p className="text-xs text-gray-600">Impact valeur actifs</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-700">Valeur contrôlée</span>
                      <span className="text-sm font-bold text-green-700">25,3M XAF</span>
                    </div>
                    <Button variant="outline" size="sm" className="w-full h-5 text-xs">
                      <Download className="mr-1 h-3 w-3" />
                      CSV
                    </Button>
                  </div>

                  <div className="border rounded-lg p-2 hover:bg-gray-50 cursor-pointer">
                    <div className="flex items-center space-x-2 mb-1">
                      <div className="p-1 bg-[#E8D5C4]/20 rounded">
                        <Calendar className="h-4 w-4 text-yellow-600" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900">Rapport Synthèse</h4>
                        <p className="text-xs text-gray-600">Vue d'ensemble complète</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-700">Dernière mise à jour</span>
                      <span className="text-sm font-bold text-yellow-700">{t('common.today')}</span>
                    </div>
                    <Button variant="outline" size="sm" className="w-full h-5 text-xs">
                      <Download className="mr-1 h-3 w-3" />
                      PDF
                    </Button>
                  </div>

                  <div className="border rounded-lg p-6 hover:bg-gray-50">
                    <div className="flex items-center space-x-3 mb-4">
                      <Users className="h-5 w-5 text-purple-600" />
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">Rapport Équipes</h3>
                        <p className="text-xs text-gray-600">Performance par compteur</p>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full">
                      <Download className="mr-2 h-4 w-4" />
                      Générer Rapport RH
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Scanning Progress */}
      {isScanning && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-4 right-4 bg-white p-6 rounded-lg shadow-lg border z-50"
        >
          <div className="flex items-center space-x-4">
            <div className="animate-pulse">
              <QrCode className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Scanner actif</p>
              <p className="text-sm text-gray-600">Scannez un code-barres ou QR code</p>
              <Progress value={80} className="w-48 mt-2" />
            </div>
          </div>
        </motion.div>
      )}

      {/* Modal Nouvelle Session */}
      <Dialog open={showNewSessionModal} onOpenChange={setShowNewSessionModal}>
        <DialogContent className="max-w-2xl bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center text-[#2C3E2F]">
              <ClipboardList className="mr-2 h-5 w-5 text-[#6A8A82]" />
              Nouvelle Session d'Inventaire
            </DialogTitle>
            <DialogDescription>
              Créez une nouvelle session d'inventaire physique pour vérifier vos immobilisations.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="session-name">Nom de la session</Label>
                <Input id="session-name" placeholder="Ex: Inventaire Q1 2024" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="session-type">Type d'inventaire</Label>
                <Select defaultValue="complet">
                  <SelectTrigger id="session-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="complet">Complet</SelectItem>
                    <SelectItem value="partiel">Partiel</SelectItem>
                    <SelectItem value="cyclique">Cyclique</SelectItem>
                    <SelectItem value="surprise">Surprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Date de début</Label>
                <Input id="start-date" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">Date de fin prévue</Label>
                <Input id="end-date" type="date" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="locations">Sites concernés</Label>
              <Select>
                <SelectTrigger id="locations">
                  <SelectValue placeholder="Sélectionnez les sites" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les sites</SelectItem>
                  <SelectItem value="siege">Siège social</SelectItem>
                  <SelectItem value="entrepot">Entrepôt principal</SelectItem>
                  <SelectItem value="usine">Usine</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Objectifs et particularités de cette session..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewSessionModal(false)}>
              Annuler
            </Button>
            <Button
              className="bg-[#6A8A82] hover:bg-[#5A7A72]"
              onClick={() => {
                toast.success('Session d\'inventaire créée avec succès');
                setShowNewSessionModal(false);
              }}
            >
              Créer la session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Détails Article */}
      <Dialog open={showItemDetailModal} onOpenChange={setShowItemDetailModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center text-[#2C3E2F]">
              <Eye className="mr-2 h-5 w-5 text-[#6A8A82]" />
              Détails de l'Immobilisation
            </DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-700">Code article</p>
                    <p className="font-semibold text-[#2C3E2F]">{selectedItem.code}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">Désignation</p>
                    <p className="font-semibold text-[#2C3E2F]">{selectedItem.designation}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">Catégorie</p>
                    <p className="font-semibold text-[#6A8A82]">{selectedItem.categorie}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">Localisation</p>
                    <p className="font-semibold">{selectedItem.localisation}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-700">Valeur nette comptable</p>
                    <p className="font-semibold text-[#6A8A82] text-lg">
                      {formatCurrency(selectedItem.valeur_nette_comptable)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">État physique</p>
                    <Badge
                      className={selectedItem.etat_physique === 'excellent' ? 'bg-[#6A8A82]/10 text-[#6A8A82]' :
                               selectedItem.etat_physique === 'bon' ? 'bg-[#7A99AC]/10 text-[#7A99AC]' :
                               'bg-[#B87333]/10 text-[#B87333]'}
                    >
                      {selectedItem.etat_physique}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">Statut de comptage</p>
                    <Badge
                      variant={selectedItem.statut_comptage === 'compte' ? 'default' : 'secondary'}
                    >
                      {selectedItem.statut_comptage === 'compte' ? 'Compté' : 'Non compté'}
                    </Badge>
                  </div>
                  {selectedItem.date_comptage && (
                    <div>
                      <p className="text-sm text-gray-700">Date de comptage</p>
                      <p className="font-semibold">{formatDate(selectedItem.date_comptage)}</p>
                    </div>
                  )}
                </div>
              </div>

              {selectedItem.ecart && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3 text-red-600">Écart détecté</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-700">Type d'écart</p>
                      <Badge variant="destructive">{selectedItem.ecart.type}</Badge>
                    </div>
                    <div>
                      <p className="text-sm text-gray-700">Valeur de l'écart</p>
                      <p className="font-semibold text-red-600">
                        {formatCurrency(selectedItem.ecart.valeur)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-700">Description</p>
                      <p className="text-sm">{selectedItem.ecart.description}</p>
                    </div>
                  </div>
                </div>
              )}

              {selectedItem.compteur && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2 text-[#2C3E2F]">Compteur responsable</h3>
                  <p className="text-[#6A8A82]">{selectedItem.compteur}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowItemDetailModal(false)}>
              Fermer
            </Button>
            <Button
              className="bg-[#7A99AC] hover:bg-[#6A8A92]"
              onClick={() => {
                setShowItemDetailModal(false);
                setShowEditItemModal(true);
              }}
            >
              <Edit className="mr-2 h-4 w-4" />
              Modifier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Modification Article */}
      <Dialog open={showEditItemModal} onOpenChange={setShowEditItemModal}>
        <DialogContent className="max-w-2xl bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center text-[#2C3E2F]">
              <Edit className="mr-2 h-5 w-5 text-[#6A8A82]" />
              Modifier l'Immobilisation
            </DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-etat">État physique</Label>
                  <Select defaultValue={selectedItem.etat_physique}>
                    <SelectTrigger id="edit-etat">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excellent">Excellent</SelectItem>
                      <SelectItem value="bon">Bon</SelectItem>
                      <SelectItem value="moyen">Moyen</SelectItem>
                      <SelectItem value="mauvais">Mauvais</SelectItem>
                      <SelectItem value="hs">Hors service</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-localisation">Localisation</Label>
                  <Input
                    id="edit-localisation"
                    defaultValue={selectedItem.localisation}
                    placeholder="Ex: Bureau 201, Étage 2"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-statut">Statut de comptage</Label>
                <Select defaultValue={selectedItem.statut_comptage}>
                  <SelectTrigger id="edit-statut">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="non_compte">Non compté</SelectItem>
                    <SelectItem value="compte">Compté</SelectItem>
                    <SelectItem value="ecart">Écart</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-notes">Notes / Observations</Label>
                <Textarea
                  id="edit-notes"
                  placeholder="Ajoutez vos observations..."
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditItemModal(false)}>
              Annuler
            </Button>
            <Button
              className="bg-[#6A8A82] hover:bg-[#5A7A72]"
              onClick={() => {
                toast.success('Immobilisation modifiée avec succès');
                setShowEditItemModal(false);
              }}
            >
              Enregistrer les modifications
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal QR Code */}
      <Dialog open={showQrCodeModal} onOpenChange={setShowQrCodeModal}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center text-[#2C3E2F]">
              <QrCode className="mr-2 h-5 w-5 text-[#6A8A82]" />
              Code QR de l'Immobilisation
            </DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-gray-700 mb-2">Code article</p>
                <p className="font-bold text-lg text-[#2C3E2F]">{selectedItem.code}</p>
              </div>
              <div className="bg-white p-8 rounded-lg border-2 border-[#6A8A82]/20">
                <div className="aspect-square bg-gray-100 rounded flex items-center justify-center">
                  <QrCode className="h-32 w-32 text-[#6A8A82]" />
                </div>
              </div>
              <div className="text-center text-sm text-gray-600">
                <p>{selectedItem.designation}</p>
                <p className="text-xs mt-1">{selectedItem.localisation}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQrCodeModal(false)}>
              Fermer
            </Button>
            <Button className="bg-[#6A8A82] hover:bg-[#5A7A72]">
              <Download className="mr-2 h-4 w-4" />
              Télécharger
            </Button>
            <Button className="bg-[#7A99AC] hover:bg-[#6A8A92]">
              <Camera className="mr-2 h-4 w-4" />
              Imprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventairePhysiquePage;