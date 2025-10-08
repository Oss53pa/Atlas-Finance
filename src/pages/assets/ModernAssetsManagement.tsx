/**
 * Module Immobilisations WiseBook - Gestion des Actifs IA
 * Interface moderne avec IoT, maintenance prédictive et intégration Wise FM
 * Conforme au cahier des charges - Technologies de pointe
 */
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Package, Cpu, MapPin, Wrench, BarChart3, Brain, Zap,
  QrCode, Radio, Eye, Edit, Plus, Download, Upload,
  AlertTriangle, CheckCircle, Clock, Target, Activity,
  Settings, TrendingUp, PieChart, LineChart, Smartphone,
  Camera, Drone, Shield, Globe, Cog
} from 'lucide-react';

// Types selon modèles Django
interface Asset {
  id: string;
  asset_number: string;
  name: string;
  description: string;
  category: string;
  status: 'IN_SERVICE' | 'UNDER_MAINTENANCE' | 'OUT_OF_ORDER' | 'DISPOSED';
  condition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';
  condition_score: number;
  acquisition_date: string;
  acquisition_cost: number;
  current_book_value: number;
  brand?: string;
  model?: string;
  serial_number?: string;
  location: {
    building?: string;
    floor?: string;
    room?: string;
    zone?: string;
  };
  iot_enabled: boolean;
  wisefm_integrated: boolean;
  maintenance_score: number;
  failure_probability: number;
  next_maintenance_prediction?: string;
  responsible_person?: string;
}

interface MaintenancePrediction {
  asset_id: string;
  asset_number: string;
  failure_probability_percent: number;
  risk_level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  predicted_failure_date?: string;
  days_to_failure?: number;
  maintenance_recommendations: Array<{
    priority: string;
    action: string;
    description: string;
    estimated_cost: number;
    wisefm_action: string;
  }>;
}

interface IoTSensor {
  sensor_id: string;
  sensor_type: string;
  last_reading: number;
  unit: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ERROR';
  alert_triggered: boolean;
}

const ModernAssetsManagement: React.FC = () => {
  const { t } = useLanguage();
  // État principal
  const [assets, setAssets] = useState<Asset[]>([]);
  const [predictions, setPredictions] = useState<MaintenancePrediction[]>([]);
  const [iotSensors, setIoTSensors] = useState<IoTSensor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtres
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Vue active
  const [activeTab, setActiveTab] = useState('dashboard');

  // Chargement initial
  useEffect(() => {
    chargerDonneesCompletes();
  }, []);

  const chargerDonneesCompletes = async () => {
    setLoading(true);
    try {
      await Promise.all([
        chargerAssets(),
        chargerPredictions(),
        chargerIoTSensors()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const chargerAssets = async () => {
    try {
      // Simulation - En production, appeler vraie API
      const mockAssets: Asset[] = [
        {
          id: '1',
          asset_number: 'EQ001',
          name: 'Serveur Principal',
          description: 'Serveur HP ProLiant DL380',
          category: 'IT_EQUIPMENT',
          status: 'IN_SERVICE',
          condition: 'GOOD',
          condition_score: 78,
          acquisition_date: '2022-01-15',
          acquisition_cost: 15000,
          current_book_value: 9000,
          brand: 'HP',
          model: 'ProLiant DL380',
          serial_number: 'HP2022001',
          location: {
            building: 'Siège',
            floor: '2',
            room: 'Salle serveur',
            zone: 'Rack A1'
          },
          iot_enabled: true,
          wisefm_integrated: true,
          maintenance_score: 85,
          failure_probability: 15.5,
          next_maintenance_prediction: '2025-10-15',
          responsible_person: 'Tech Lead'
        },
        {
          id: '2',
          asset_number: 'VH003',
          name: 'Véhicule Commercial',
          description: 'Toyota Hilux 4x4',
          category: 'VEHICLE',
          status: 'IN_SERVICE',
          condition: 'FAIR',
          condition_score: 65,
          acquisition_date: '2021-06-10',
          acquisition_cost: 35000,
          current_book_value: 18000,
          brand: 'Toyota',
          model: 'Hilux',
          serial_number: 'TY2021003',
          location: {
            building: 'Parking',
            zone: 'Zone A'
          },
          iot_enabled: true,
          wisefm_integrated: true,
          maintenance_score: 70,
          failure_probability: 25.0,
          next_maintenance_prediction: '2025-09-20',
          responsible_person: 'Chef Parc'
        }
      ];

      setAssets(mockAssets);
    } catch (error) {
      console.error('Erreur assets:', error);
    }
  };

  const chargerPredictions = async () => {
    try {
      // Simulation prédictions IA
      const mockPredictions: MaintenancePrediction[] = [
        {
          asset_id: '1',
          asset_number: 'EQ001',
          failure_probability_percent: 15.5,
          risk_level: 'LOW',
          days_to_failure: 120,
          maintenance_recommendations: [
            {
              priority: 'MEDIUM',
              action: 'PREVENTIVE_MAINTENANCE',
              description: 'Nettoyage et vérification composants',
              estimated_cost: 2000,
              wisefm_action: 'CREATE_PREVENTIVE_WO'
            }
          ]
        },
        {
          asset_id: '2',
          asset_number: 'VH003',
          failure_probability_percent: 35.2,
          risk_level: 'MEDIUM',
          predicted_failure_date: '2025-12-01',
          days_to_failure: 75,
          maintenance_recommendations: [
            {
              priority: 'HIGH',
              action: 'ENGINE_INSPECTION',
              description: 'Inspection moteur et transmission',
              estimated_cost: 5000,
              wisefm_action: 'CREATE_PREVENTIVE_WO'
            }
          ]
        }
      ];

      setPredictions(mockPredictions);
    } catch (error) {
      console.error('Erreur prédictions:', error);
    }
  };

  const chargerIoTSensors = async () => {
    try {
      // Simulation capteurs IoT
      const mockSensors: IoTSensor[] = [
        {
          sensor_id: 'TEMP_001',
          sensor_type: 'TEMPERATURE',
          last_reading: 42.5,
          unit: '°C',
          status: 'ACTIVE',
          alert_triggered: false
        },
        {
          sensor_id: 'VIB_001',
          sensor_type: 'VIBRATION',
          last_reading: 2.8,
          unit: 'mm/s',
          status: 'ACTIVE',
          alert_triggered: true
        }
      ];

      setIoTSensors(mockSensors);
    } catch (error) {
      console.error('Erreur capteurs:', error);
    }
  };

  // Formatage des montants
  const formaterMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
    }).format(montant);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'IN_SERVICE': 'bg-green-100 text-green-800',
      'UNDER_MAINTENANCE': 'bg-yellow-100 text-yellow-800',
      'OUT_OF_ORDER': 'bg-red-100 text-red-800',
      'DISPOSED': 'bg-gray-100 text-gray-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getConditionColor = (condition: string) => {
    const colors = {
      'EXCELLENT': 'text-green-600',
      'GOOD': 'text-blue-600',
      'FAIR': 'text-yellow-600',
      'POOR': 'text-orange-600',
      'CRITICAL': 'text-red-600',
    };
    return colors[condition as keyof typeof colors] || 'text-gray-600';
  };

  const getRiskColor = (risk: string) => {
    const colors = {
      'LOW': 'bg-green-100 text-green-800',
      'MEDIUM': 'bg-yellow-100 text-yellow-800',
      'HIGH': 'bg-orange-100 text-orange-800',
      'CRITICAL': 'bg-red-100 text-red-800',
    };
    return colors[risk as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  // Rendu du dashboard principal
  const renderDashboard = () => {
    const totalAssets = assets.length;
    const assetsInService = assets.filter(a => a.status === 'IN_SERVICE').length;
    const iotEnabledAssets = assets.filter(a => a.iot_enabled).length;
    const wisefmIntegratedAssets = assets.filter(a => a.wisefm_integrated).length;

    const totalValue = assets.reduce((sum, asset) => sum + asset.current_book_value, 0);
    const averageCondition = assets.reduce((sum, asset) => sum + asset.condition_score, 0) / totalAssets;

    return (
      <div className="space-y-6">
        {/* KPIs principaux */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Actifs</p>
                  <p className="text-3xl font-bold text-gray-900">{totalAssets}</p>
                </div>
                <Package className="h-8 w-8 text-blue-500" />
              </div>
              <div className="mt-4">
                <p className="text-sm text-green-600">{assetsInService} en service</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Valeur Comptable</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {formaterMontant(totalValue)}
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">IoT Connecté</p>
                  <p className="text-3xl font-bold text-blue-600">{iotEnabledAssets}</p>
                </div>
                <Cpu className="h-8 w-8 text-blue-500" />
              </div>
              <div className="mt-4">
                <Progress value={(iotEnabledAssets / totalAssets) * 100} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Wise FM Sync</p>
                  <p className="text-3xl font-bold text-purple-600">{wisefmIntegratedAssets}</p>
                </div>
                <Cog className="h-8 w-8 text-purple-500" />
              </div>
              <div className="mt-4">
                <p className="text-sm text-purple-600">Maintenance prédictive</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* État global */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              État Global du Parc
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Condition Moyenne</p>
                <div className="relative">
                  <Progress value={averageCondition} className="h-4" />
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                    {averageCondition.toFixed(0)}%
                  </span>
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Capteurs IoT</p>
                <div className="flex justify-center">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                    iotSensors.filter(s => s.status === 'ACTIVE').length === iotSensors.length ?
                    'bg-green-100' : 'bg-orange-100'
                  }`}>
                    <Cpu className={`h-8 w-8 ${
                      iotSensors.filter(s => s.status === 'ACTIVE').length === iotSensors.length ?
                      'text-green-600' : 'text-orange-600'
                    }`} />
                  </div>
                </div>
                <p className="text-sm mt-2">
                  {iotSensors.filter(s => s.status === 'ACTIVE').length}/{iotSensors.length} actifs
                </p>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Maintenance Prédictive</p>
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
                    <Brain className="h-8 w-8 text-purple-600" />
                  </div>
                </div>
                <p className="text-sm mt-2">IA Active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Prédictions IA */}
        {predictions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-500" />
                Prédictions Maintenance IA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {predictions.map((prediction) => (
                  <div key={prediction.asset_id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {prediction.asset_number} - Probabilité panne: {prediction.failure_probability_percent.toFixed(1)}%
                        </h4>
                        {prediction.predicted_failure_date && (
                          <p className="text-sm text-gray-600">
                            Panne prédite: {new Date(prediction.predicted_failure_date).toLocaleDateString('fr-FR')}
                            ({prediction.days_to_failure} jours)
                          </p>
                        )}
                      </div>
                      <Badge className={getRiskColor(prediction.risk_level)}>
                        {prediction.risk_level}
                      </Badge>
                    </div>

                    {/* Barre de risque */}
                    <div className="mb-4">
                      <Progress value={prediction.failure_probability_percent} className="h-3" />
                    </div>

                    {/* Recommandations */}
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Recommandations IA :</p>
                      <div className="space-y-2">
                        {prediction.maintenance_recommendations.map((rec, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-sm">
                            <Zap className="h-4 w-4 text-blue-500 mt-0.5" />
                            <div>
                              <span className="font-medium">{rec.action}:</span> {rec.description}
                              <span className="text-gray-700 ml-2">
                                (Coût estimé: {formaterMontant(rec.estimated_cost)})
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  // Rendu de la liste des actifs
  const renderAssetsList = () => {
    const assetsFiltrés = assets.filter(asset => {
      return (
        (!selectedCategory || asset.category === selectedCategory) &&
        (!selectedStatus || asset.status === selectedStatus) &&
        (!searchQuery ||
          asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          asset.asset_number.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    });

    if (assetsFiltrés.length === 0) {
      return (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-12 w-12 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-600">Aucun actif trouvé</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assetsFiltrés.map((asset) => (
          <Card key={asset.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg text-gray-900">{asset.name}</h3>
                  <p className="text-sm text-gray-700">{asset.asset_number}</p>
                  <p className="text-xs text-gray-700">{asset.brand} {asset.model}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge className={getStatusColor(asset.status)}>
                    {asset.status}
                  </Badge>
                  {asset.iot_enabled && (
                    <Badge variant="outline" className="text-blue-600">
                      <Cpu className="h-3 w-3 mr-1" />
                      IoT
                    </Badge>
                  )}
                  {asset.wisefm_integrated && (
                    <Badge variant="outline" className="text-purple-600">
                      <Cog className="h-3 w-3 mr-1" />
                      Wise FM
                    </Badge>
                  )}
                </div>
              </div>

              {/* Informations principales */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {asset.location.building} - {asset.location.floor} - {asset.location.room}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <QrCode className="h-4 w-4" />
                  <span>Série: {asset.serial_number}</span>
                </div>

                {asset.responsible_person && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Settings className="h-4 w-4" />
                    <span>Resp: {asset.responsible_person}</span>
                  </div>
                )}
              </div>

              {/* Métriques */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-700">Valeur Comptable</p>
                  <p className="font-semibold text-green-600">
                    {formaterMontant(asset.current_book_value)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-700">Condition</p>
                  <p className={`font-semibold ${getConditionColor(asset.condition)}`}>
                    {asset.condition_score}%
                  </p>
                </div>
              </div>

              {/* Maintenance prédictive */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600">Risque Panne</span>
                  <span className="text-sm font-bold text-red-600">
                    {asset.failure_probability.toFixed(1)}%
                  </span>
                </div>
                <Progress value={asset.failure_probability} className="h-2" />
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center">
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline">
                    <QrCode className="h-4 w-4" />
                  </Button>
                </div>
                {asset.next_maintenance_prediction && (
                  <p className="text-xs text-gray-700">
                    Maint: {new Date(asset.next_maintenance_prediction).toLocaleDateString('fr-FR')}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  // Rendu des capteurs IoT
  const renderIoTDashboard = () => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {iotSensors.map((sensor) => (
          <Card key={sensor.sensor_id} className={`border-l-4 ${
            sensor.alert_triggered ? 'border-l-red-500' : 'border-l-green-500'
          }`}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-semibold text-gray-900">{sensor.sensor_id}</h4>
                  <p className="text-sm text-gray-600">{sensor.sensor_type}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Radio className={`h-5 w-5 ${
                    sensor.status === 'ACTIVE' ? 'text-green-500' : 'text-red-500'
                  }`} />
                  {sensor.alert_triggered && (
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  )}
                </div>
              </div>

              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900">
                  {sensor.last_reading}
                </p>
                <p className="text-sm text-gray-600">{sensor.unit}</p>
              </div>

              {sensor.alert_triggered && (
                <Alert className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Seuil d'alerte dépassé
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Gestion des Immobilisations IA
          </h1>
          <p className="text-gray-600 mt-2">
            Assets management avec IoT, maintenance prédictive et intégration Wise FM
          </p>
        </div>

        <div className="flex gap-3">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nouvel Actif
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Rechercher actif..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Toutes</SelectItem>
                <SelectItem value="IT_EQUIPMENT">Équipement IT</SelectItem>
                <SelectItem value="VEHICLE">Véhicule</SelectItem>
                <SelectItem value="MACHINERY">Machines</SelectItem>
                <SelectItem value="FURNITURE">Mobilier</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder={t('common.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tous</SelectItem>
                <SelectItem value="IN_SERVICE">En service</SelectItem>
                <SelectItem value="UNDER_MAINTENANCE">En maintenance</SelectItem>
                <SelectItem value="OUT_OF_ORDER">Hors service</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={chargerDonneesCompletes}>
              <Activity className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Erreur */}
      {error && (
        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Onglets principaux */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard">{t('dashboard.title')}</TabsTrigger>
          <TabsTrigger value="assets">Actifs</TabsTrigger>
          <TabsTrigger value="depreciation">{t('assets.depreciation')}</TabsTrigger>
          <TabsTrigger value="iot">IoT Monitoring</TabsTrigger>
          <TabsTrigger value="inventory">{t('assets.inventory')}</TabsTrigger>
          <TabsTrigger value="wisefm">Wise FM</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          {renderDashboard()}
        </TabsContent>

        <TabsContent value="assets" className="mt-6">
          {renderAssetsList()}
        </TabsContent>

        <TabsContent value="depreciation" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Moteur d'Amortissement IA</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Cog className="h-12 w-12 mx-auto text-gray-700 mb-4" />
                <p className="text-gray-600">Module amortissements en développement</p>
                <p className="text-sm text-gray-700 mt-2">
                  Multi-méthodes, simulation what-if, ajustements IA
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="iot" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="h-5 w-5" />
                Monitoring IoT Temps Réel
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderIoTDashboard()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Inventaire Automatisé</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Drone className="h-12 w-12 mx-auto text-gray-700 mb-4" />
                <p className="text-gray-600">Module inventaire automatisé en développement</p>
                <p className="text-sm text-gray-700 mt-2">
                  Drones, RFID, Computer Vision, réconciliation IA
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wisefm" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cog className="h-5 w-5 text-purple-500" />
                Intégration Wise FM
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="text-center p-6 bg-purple-50 rounded-lg">
                  <Globe className="h-12 w-12 text-purple-500 mx-auto mb-4" />
                  <h3 className="font-semibold text-purple-900 mb-2">Synchronisation Active</h3>
                  <p className="text-sm text-purple-700">
                    {wisefmIntegratedAssets}/{assets.length} actifs synchronisés
                  </p>
                  <Progress
                    value={(wisefmIntegratedAssets / assets.length) * 100}
                    className="mt-3"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="text-sm font-medium">Work Orders Créés</span>
                    <span className="text-sm font-bold">24</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="text-sm font-medium">Prédictions Envoyées</span>
                    <span className="text-sm font-bold">156</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="text-sm font-medium">Interventions Terminées</span>
                    <span className="text-sm font-bold">89</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="text-sm font-medium">Économies Réalisées</span>
                    <span className="text-sm font-bold text-green-600">125,400 XOF</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span>Chargement des données d'actifs...</span>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ModernAssetsManagement;