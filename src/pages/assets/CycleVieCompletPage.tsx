import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useData } from '../../contexts/DataContext';
import { DBAsset } from '../../lib/db';
import { motion } from 'framer-motion';
import {
  Package,
  Calendar,
  TrendingDown,
  Settings,
  Eye,
  Edit,
  Trash2,
  Plus,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  PieChart,
  FileText,
  Wrench,
  DollarSign,
  Building,
  Truck,
  Monitor
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
  Progress
} from '../../components/ui';
import { formatCurrency, formatDate, formatPercentage } from '../../lib/utils';
import { toast } from 'react-hot-toast';

interface Asset {
  id: string;
  nom: string;
  numero_inventaire: string;
  categorie: string;
  type_immobilisation: 'corporelle' | 'incorporelle' | 'financiere';
  date_acquisition: string;
  date_mise_en_service: string;
  valeur_acquisition: number;
  valeur_nette_comptable: number;
  valeur_residuelle: number;
  duree_amortissement: number;
  methode_amortissement: 'lineaire' | 'degressif' | 'unite_oeuvre';
  statut: 'actif' | 'cede' | 'reforme' | 'maintenance';
  localisation: string;
  responsable: string;
  fournisseur: string;
  garantie_fin: string;
  derniere_maintenance: string;
  prochaine_maintenance: string;
  phase_cycle: 'acquisition' | 'exploitation' | 'maintenance' | 'renovation' | 'cession';
  niveau_usure: number;
}

interface MaintenanceEvent {
  id: string;
  asset_id: string;
  date: string;
  type: 'preventive' | 'corrective' | 'controle';
  description: string;
  cout: number;
  duree: number;
  statut: 'planifie' | 'en_cours' | 'termine' | 'reporte';
  technicien: string;
  pieces_changees?: string[];
}

interface DepreciationSchedule {
  annee: number;
  valeur_debut: number;
  dotation_annuelle: number;
  amortissements_cumules: number;
  valeur_nette_comptable: number;
  taux_amortissement: number;
}

const CycleVieCompletPage: React.FC = () => {
  const { t } = useLanguage();
  const { adapter } = useData();
  const [selectedCategory, setSelectedCategory] = useState<string>('tous');
  const [selectedPhase, setSelectedPhase] = useState<string>('tous');
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);

  // Load assets via DataContext adapter
  const [dbAssets, setDbAssets] = useState<DBAsset[]>([]);

  useEffect(() => {
    const load = async () => {
      const assets = await adapter.getAll('assets');
      setDbAssets(assets as DBAsset[]);
    };
    load();
  }, [adapter]);

  // Map DBAsset to component Asset interface
  const allAssets: Asset[] = useMemo(() => {
    return dbAssets.map((a: DBAsset) => {
      const now = new Date();
      const acqDate = new Date(a.acquisitionDate);
      const ageYears = (now.getTime() - acqDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      const depreciableBase = a.acquisitionValue - a.residualValue;
      const annualDepreciation = a.usefulLifeYears > 0 ? depreciableBase / a.usefulLifeYears : 0;
      const totalDepreciation = Math.min(annualDepreciation * ageYears, depreciableBase);
      const vnc = a.acquisitionValue - totalDepreciation;
      const usure = a.usefulLifeYears > 0 ? Math.min(ageYears / a.usefulLifeYears, 1) : 0;

      // Determine phase based on status and usage
      let phase: Asset['phase_cycle'] = 'exploitation';
      if (a.status === 'disposed') phase = 'cession';
      else if (a.status === 'scrapped') phase = 'cession';
      else if (usure > 0.8) phase = 'renovation';
      else if (usure < 0.05) phase = 'acquisition';

      // Determine status mapping
      let statut: Asset['statut'] = 'actif';
      if (a.status === 'disposed') statut = 'cede';
      else if (a.status === 'scrapped') statut = 'reforme';

      // Determine type based on account code
      let typeImmo: Asset['type_immobilisation'] = 'corporelle';
      if (a.accountCode.startsWith('21')) typeImmo = 'incorporelle';
      else if (a.accountCode.startsWith('26') || a.accountCode.startsWith('27')) typeImmo = 'financiere';

      const acqDateStr = a.acquisitionDate.slice(0, 10);
      const miseDateStr = acqDate.toISOString().slice(0, 10);

      return {
        id: a.id,
        nom: a.name,
        numero_inventaire: a.code,
        categorie: a.category,
        type_immobilisation: typeImmo,
        date_acquisition: acqDateStr,
        date_mise_en_service: miseDateStr,
        valeur_acquisition: a.acquisitionValue,
        valeur_nette_comptable: Math.max(vnc, a.residualValue),
        valeur_residuelle: a.residualValue,
        duree_amortissement: a.usefulLifeYears,
        methode_amortissement: a.depreciationMethod === 'linear' ? 'lineaire' as const : 'degressif' as const,
        statut,
        localisation: a.category,
        responsable: a.category,
        fournisseur: '',
        garantie_fin: '',
        derniere_maintenance: '',
        prochaine_maintenance: '',
        phase_cycle: phase,
        niveau_usure: usure
      };
    });
  }, [dbAssets]);

  // Filter assets based on selected filters
  const assets: Asset[] = useMemo(() => {
    return allAssets.filter(asset =>
      (selectedCategory === 'tous' || asset.categorie === selectedCategory) &&
      (selectedPhase === 'tous' || asset.phase_cycle === selectedPhase)
    );
  }, [allAssets, selectedCategory, selectedPhase]);

  const isLoading = false; // data loaded via useEffect

  // Build maintenance events from assets
  const maintenanceEvents: MaintenanceEvent[] = useMemo(() => {
    return allAssets
      .filter(a => a.statut === 'actif')
      .slice(0, 5)
      .map((a, idx) => ({
        id: `maint-${a.id}`,
        asset_id: a.id,
        date: a.prochaine_maintenance || a.date_acquisition,
        type: (idx % 2 === 0 ? 'preventive' : 'corrective') as MaintenanceEvent['type'],
        description: `Maintenance ${idx % 2 === 0 ? 'préventive' : 'corrective'} - ${a.nom}`,
        cout: Math.round(a.valeur_acquisition * 0.02),
        duree: 4 + idx * 2,
        statut: (idx === 0 ? 'planifie' : idx === 1 ? 'en_cours' : 'termine') as MaintenanceEvent['statut'],
        technicien: 'Service Technique'
      }));
  }, [allAssets]);

  // Build depreciation schedule for selected asset
  const depreciationSchedule: DepreciationSchedule[] = useMemo(() => {
    if (!selectedAsset) return [];
    const asset = allAssets.find(a => a.id === selectedAsset);
    if (!asset) return [];

    const schedule: DepreciationSchedule[] = [];
    const depreciableBase = asset.valeur_acquisition - asset.valeur_residuelle;
    const annualRate = asset.duree_amortissement > 0 ? 1 / asset.duree_amortissement : 0;
    const annualDotation = asset.duree_amortissement > 0 ? depreciableBase / asset.duree_amortissement : 0;
    const startYear = new Date(asset.date_acquisition).getFullYear();

    let cumulatedDepreciation = 0;
    for (let i = 0; i < asset.duree_amortissement; i++) {
      const valeurDebut = asset.valeur_acquisition - cumulatedDepreciation;
      cumulatedDepreciation += annualDotation;
      const vnc = asset.valeur_acquisition - cumulatedDepreciation;
      schedule.push({
        annee: startYear + i,
        valeur_debut: valeurDebut,
        dotation_annuelle: annualDotation,
        amortissements_cumules: cumulatedDepreciation,
        valeur_nette_comptable: Math.max(vnc, asset.valeur_residuelle),
        taux_amortissement: annualRate
      });
    }
    return schedule;
  }, [allAssets, selectedAsset]);

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'actif':
        return 'text-green-600 bg-green-100';
      case 'maintenance':
        return 'text-orange-600 bg-orange-100';
      case 'cede':
        return 'text-gray-600 bg-gray-100';
      case 'reforme':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getPhaseColor = (phase: string) => {
    const colors: Record<string, string> = {
      'acquisition': 'bg-blue-100 text-blue-800',
      'exploitation': 'bg-green-100 text-green-800',
      'maintenance': 'bg-orange-100 text-orange-800',
      'renovation': 'bg-purple-100 text-purple-800',
      'cession': 'bg-red-100 text-red-800'
    };
    return colors[phase] || 'bg-gray-100 text-gray-800';
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'corporelle':
        return <Building className="h-4 w-4" />;
      case 'incorporelle':
        return <Monitor className="h-4 w-4" />;
      case 'financiere':
        return <DollarSign className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getMaintenanceStatusColor = (statut: string) => {
    switch (statut) {
      case 'termine':
        return 'text-green-600 bg-green-100';
      case 'en_cours':
        return 'text-orange-600 bg-orange-100';
      case 'planifie':
        return 'text-blue-600 bg-blue-100';
      case 'reporte':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getMaintenanceTypeIcon = (type: string) => {
    switch (type) {
      case 'preventive':
        return <Calendar className="h-4 w-4" />;
      case 'corrective':
        return <Wrench className="h-4 w-4" />;
      case 'controle':
        return <Eye className="h-4 w-4" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  const totalAssets = assets.length;
  const totalValue = assets.reduce((sum, asset) => sum + asset.valeur_nette_comptable, 0);
  const assetsInMaintenance = assets.filter(a => a.statut === 'maintenance').length;
  const averageAge = assets.reduce((sum, asset) => {
    const age = new Date().getFullYear() - new Date(asset.date_acquisition).getFullYear();
    return sum + age;
  }, 0) / assets.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="border-b border-gray-200 pb-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900 flex items-center">
              <Package className="mr-3 h-7 w-7 text-blue-600" />
              Cycle de Vie Complet des Actifs
            </h1>
            <p className="mt-2 text-gray-600">
              Gestion intégrée du patrimoine : acquisition, exploitation, maintenance et cession
            </p>
          </div>
          <div className="flex space-x-3">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              Nouvel Actif
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exporter
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-blue-100 rounded-full">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Actifs</p>
                  <p className="text-lg font-bold text-blue-700">{totalAssets}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-green-100 rounded-full">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Valeur Totale</p>
                  <p className="text-lg font-bold text-green-700">
                    {formatCurrency(totalValue)}
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
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-orange-100 rounded-full">
                  <Wrench className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">En Maintenance</p>
                  <p className="text-lg font-bold text-orange-700">{assetsInMaintenance}</p>
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
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-purple-100 rounded-full">
                  <Calendar className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Âge Moyen</p>
                  <p className="text-lg font-bold text-purple-700">
                    {averageAge.toFixed(1)} ans
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
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="mr-2 h-5 w-5" />
              Filtres et Recherche
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Catégorie
                </label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Toutes catégories</SelectItem>
                    <SelectItem value="Matériel Informatique">Matériel Informatique</SelectItem>
                    <SelectItem value="Matériel de Transport">Matériel de Transport</SelectItem>
                    <SelectItem value="Logiciels">Logiciels</SelectItem>
                    <SelectItem value="Immobilier">Immobilier</SelectItem>
                    <SelectItem value="Équipement Industriel">Équipement Industriel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phase du Cycle
                </label>
                <Select value={selectedPhase} onValueChange={setSelectedPhase}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Toutes phases</SelectItem>
                    <SelectItem value="acquisition">Acquisition</SelectItem>
                    <SelectItem value="exploitation">Exploitation</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="renovation">Rénovation</SelectItem>
                    <SelectItem value="cession">Cession</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recherche
                </label>
                <Input 
                  placeholder="Nom ou numéro inventaire..." 
                  className="w-full"
                />
              </div>

              <div className="flex items-end">
                <Button variant="outline" className="w-full">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Rapport Analytique
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
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <Tabs defaultValue="assets" className="space-y-4">
          <TabsList>
            <TabsTrigger value="assets">Inventaire des Actifs</TabsTrigger>
            <TabsTrigger value="maintenance">Plan de Maintenance</TabsTrigger>
            <TabsTrigger value="depreciation">{t('assets.depreciation')}</TabsTrigger>
            <TabsTrigger value="analytics">Analyses</TabsTrigger>
          </TabsList>

          <TabsContent value="assets" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Registre des Immobilisations</span>
                  <Badge variant="outline">
                    {assets.length} actif(s)
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner size="lg" text="Chargement des actifs..." />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Actif</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Phase</TableHead>
                          <TableHead className="text-right">Valeur d'Acquisition</TableHead>
                          <TableHead className="text-right">VNC</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead>Localisation</TableHead>
                          <TableHead>Usure</TableHead>
                          <TableHead className="text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assets.map((asset) => (
                          <TableRow key={asset.id} className="hover:bg-gray-50">
                            <TableCell>
                              <div className="flex items-center space-x-3">
                                <div className="p-2 bg-blue-100 rounded-full">
                                  {getTypeIcon(asset.type_immobilisation)}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">{asset.nom}</p>
                                  <p className="text-sm text-gray-700 font-mono">{asset.numero_inventaire}</p>
                                  <p className="text-xs text-gray-700">{asset.categorie}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {asset.type_immobilisation}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={getPhaseColor(asset.phase_cycle)}>
                                {asset.phase_cycle}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="font-semibold text-blue-700">
                                {formatCurrency(asset.valeur_acquisition)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="font-semibold text-green-700">
                                {formatCurrency(asset.valeur_nette_comptable)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(asset.statut)}`}>
                                <span className="capitalize">{asset.statut}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="text-sm text-gray-900">{asset.localisation}</p>
                                <p className="text-xs text-gray-700">{asset.responsable}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Progress value={asset.niveau_usure * 100} className="w-16" />
                                <span className="text-sm text-gray-600">
                                  {formatPercentage(asset.niveau_usure)}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex justify-center space-x-1">
                                <Button variant="ghost" size="sm" onClick={() => setSelectedAsset(asset.id)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <FileText className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="maintenance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Planification de la Maintenance</span>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Nouveau Planning
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {maintenanceEvents.map((event) => {
                    const asset = assets.find(a => a.id === event.asset_id);
                    return (
                      <div key={event.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-orange-100 rounded-full">
                              {getMaintenanceTypeIcon(event.type)}
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">
                                {asset?.nom}
                              </h3>
                              <p className="text-sm text-gray-600">{event.description}</p>
                            </div>
                          </div>
                          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getMaintenanceStatusColor(event.statut)}`}>
                            <span className="capitalize">{event.statut.replace('_', ' ')}</span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Date prévue</p>
                            <p className="font-medium">{formatDate(event.date)}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Type</p>
                            <Badge variant="outline" className="capitalize">
                              {event.type}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-gray-600">Coût estimé</p>
                            <p className="font-semibold text-red-700">{formatCurrency(event.cout)}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Durée</p>
                            <p className="font-medium">{event.duree}h</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-4 pt-3 border-t">
                          <div>
                            <p className="text-sm text-gray-600">Technicien: {event.technicien}</p>
                            {event.pieces_changees && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {event.pieces_changees.map((piece, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {piece}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex space-x-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="depreciation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingDown className="mr-2 h-5 w-5" />
                  Plan d'Amortissement
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedAsset ? (
                  <div>
                    <div className="mb-6 p-4 bg-blue-50 border rounded-lg">
                      <h3 className="text-lg font-semibold text-blue-900 mb-2">
                        {assets.find(a => a.id === selectedAsset)?.nom}
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-blue-700">Méthode</p>
                          <p className="font-medium capitalize">
                            {assets.find(a => a.id === selectedAsset)?.methode_amortissement}
                          </p>
                        </div>
                        <div>
                          <p className="text-blue-700">Durée</p>
                          <p className="font-medium">
                            {assets.find(a => a.id === selectedAsset)?.duree_amortissement} ans
                          </p>
                        </div>
                        <div>
                          <p className="text-blue-700">Valeur d'acquisition</p>
                          <p className="font-semibold">
                            {formatCurrency(assets.find(a => a.id === selectedAsset)?.valeur_acquisition || 0)}
                          </p>
                        </div>
                        <div>
                          <p className="text-blue-700">Valeur résiduelle</p>
                          <p className="font-semibold">
                            {formatCurrency(assets.find(a => a.id === selectedAsset)?.valeur_residuelle || 0)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Année</TableHead>
                            <TableHead className="text-right">Valeur Début</TableHead>
                            <TableHead className="text-right">Dotation Annuelle</TableHead>
                            <TableHead className="text-right">Amortissements Cumulés</TableHead>
                            <TableHead className="text-right">VNC</TableHead>
                            <TableHead className="text-right">Taux</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {depreciationSchedule.map((schedule) => (
                            <TableRow key={schedule.annee} className="hover:bg-gray-50">
                              <TableCell className="font-medium">{schedule.annee}</TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(schedule.valeur_debut)}
                              </TableCell>
                              <TableCell className="text-right">
                                <span className="font-semibold text-red-700">
                                  -{formatCurrency(schedule.dotation_annuelle)}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <span className="font-semibold text-orange-700">
                                  {formatCurrency(schedule.amortissements_cumules)}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <span className="font-bold text-green-700">
                                  {formatCurrency(schedule.valeur_nette_comptable)}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                {formatPercentage(schedule.taux_amortissement)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <TrendingDown className="h-12 w-12 text-gray-700 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Plan d'Amortissement</h3>
                    <p className="text-gray-700 mb-6">
                      Sélectionnez un actif dans l'inventaire pour voir son plan d'amortissement détaillé.
                    </p>
                    <Button variant="outline">
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Voir Synthèse Globale
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <PieChart className="mr-2 h-5 w-5" />
                    Répartition par Catégorie
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <PieChart className="h-12 w-12 text-gray-700 mx-auto mb-4" />
                    <p className="text-gray-700">Graphique de répartition par catégorie</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="mr-2 h-5 w-5" />
                    Évolution des Valeurs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <BarChart3 className="h-12 w-12 text-gray-700 mx-auto mb-4" />
                    <p className="text-gray-700">Graphique d'évolution des valeurs</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="mr-2 h-5 w-5" />
                    Prévisions de Renouvellement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {assets.slice(0, 3).map((asset) => {
                      const age = new Date().getFullYear() - new Date(asset.date_acquisition).getFullYear();
                      const remainingYears = asset.duree_amortissement - age;
                      return (
                        <div key={asset.id} className="flex items-center justify-between p-3 border rounded">
                          <div>
                            <p className="font-medium text-gray-900">{asset.nom}</p>
                            <p className="text-sm text-gray-700">
                              Renouvellement prévu dans {remainingYears} ans
                            </p>
                          </div>
                          <Badge variant={remainingYears <= 2 ? 'destructive' : 'outline'}>
                            {remainingYears} ans
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <DollarSign className="mr-2 h-5 w-5" />
                    Indicateurs Financiers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Taux de dépréciation moyen</span>
                      <span className="font-semibold">18.5%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">ROI moyen des actifs</span>
                      <span className="font-semibold text-green-600">12.3%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Coût maintenance/VNC</span>
                      <span className="font-semibold">4.2%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Durée de vie moyenne</span>
                      <span className="font-semibold">8.4 ans</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};

export default CycleVieCompletPage;