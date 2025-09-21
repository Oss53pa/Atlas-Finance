// Extensions du module Immobilisations - Nouveaux modules IA et IoT
import React from 'react';
import {
  Brain, Wifi, Smartphone, Cloud, Database, Activity, Camera,
  QrCode, Plus, Edit, Trash2, Search, Download, Upload, Eye,
  Clock, DollarSign, Tag, MapPin, Wrench, AlertTriangle,
  CheckCircle, Calendar, Calculator, FileText, BarChart3,
  Monitor, Radio, Globe, Link, RefreshCw, ChevronRight,
  Info, Package, Building, Archive, Shield, Users
} from 'lucide-react';
import { ModernCard, CardHeader, CardBody, StatCard } from '../../components/ui/ModernCard';
import ModernButton from '../../components/ui/ModernButton';

// Nouvelles interfaces pour les modules avancés
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

// Module 2: Registre Central
export const renderRegistreCentral = () => (
  <div className="space-y-6">
    <ModernCard>
      <CardHeader
        title="Registre Central des Immobilisations"
        subtitle="Base de données complète avec QR codes et géolocalisation"
        icon={Database}
        action={
          <div className="flex items-center gap-3">
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
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
          <h4 className="font-semibold text-blue-900 mb-2">Fonctionnalités avancées du registre</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-blue-800">QR Codes automatiques</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-blue-800">Géolocalisation GPS</span>
            </div>
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-blue-800">Photos haute résolution</span>
            </div>
          </div>
        </div>

        {/* Table des actifs enrichie */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">QR Code</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Actif</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Localisation GPS</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">État IoT</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {/* Données d'exemple */}
              <tr className="hover:bg-gray-50">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-6 h-6 text-blue-600" />
                    <span className="text-xs font-mono">QR-2024-001</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div>
                    <p className="text-sm font-medium">Serveur Dell PowerEdge R740</p>
                    <p className="text-xs text-gray-500">MAT-2021-001</p>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-green-600" />
                    <div>
                      <p className="text-sm">Salle serveur - Étage 2</p>
                      <p className="text-xs text-gray-500">GPS: 48.8566, 2.3522</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-green-600">Optimal</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-center gap-1">
                    <button className="p-1 hover:bg-gray-100 rounded transition-colors" title="Scanner QR">
                      <QrCode className="w-4 h-4 text-gray-500" />
                    </button>
                    <button className="p-1 hover:bg-gray-100 rounded transition-colors" title="Localiser">
                      <MapPin className="w-4 h-4 text-gray-500" />
                    </button>
                    <button className="p-1 hover:bg-gray-100 rounded transition-colors" title="Photos">
                      <Camera className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardBody>
    </ModernCard>
  </div>
);

// Module 3: Amortissements IA
export const renderAmortissementsIA = () => (
  <div className="space-y-6">
    <ModernCard>
      <CardHeader
        title="Calcul d'Amortissements avec IA"
        subtitle="Optimisation automatique des méthodes et durées"
        icon={Brain}
        action={
          <div className="flex items-center gap-3">
            <ModernButton variant="outline" size="sm">
              <Brain className="w-4 h-4 mr-1" />
              Optimiser IA
            </ModernButton>
            <ModernButton variant="primary" size="sm">
              <Calculator className="w-4 h-4 mr-1" />
              Recalculer
            </ModernButton>
          </div>
        }
      />
      <CardBody>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <Brain className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-lg font-bold text-purple-900">94.2%</p>
                <p className="text-sm text-purple-700">Précision IA</p>
              </div>
            </div>
            <p className="text-xs text-purple-600">Prédictions d'amortissement validées</p>
          </div>
          <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-lg font-bold text-green-900">€85,420</p>
                <p className="text-sm text-green-700">Économies</p>
              </div>
            </div>
            <p className="text-xs text-green-600">Optimisation fiscale cette année</p>
          </div>
          <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <Activity className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-lg font-bold text-blue-900">32</p>
                <p className="text-sm text-blue-700">Recommandations</p>
              </div>
            </div>
            <p className="text-xs text-blue-600">Optimisations proposées par l'IA</p>
          </div>
        </div>

        {/* Recommandations IA */}
        <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg mb-6">
          <h4 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Recommandations IA pour l'optimisation fiscale
          </h4>
          <div className="space-y-3">
            <div className="p-3 bg-white rounded-lg border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-purple-900">Machine CNC - Extension durée</span>
                <span className="text-xs text-green-600 font-medium">Économie: €15,000</span>
              </div>
              <p className="text-xs text-purple-700">L'IA recommande d'étendre la durée d'amortissement de 8 à 10 ans basé sur l'analyse d'usure IoT</p>
            </div>
            <div className="p-3 bg-white rounded-lg border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-purple-900">Véhicules - Amortissement dégressif</span>
                <span className="text-xs text-green-600 font-medium">Économie: €8,500</span>
              </div>
              <p className="text-xs text-purple-700">Passage en amortissement dégressif recommandé pour 3 véhicules selon leur utilisation</p>
            </div>
          </div>
        </div>
      </CardBody>
    </ModernCard>
  </div>
);

// Module 5: Inventaire Automatisé
export const renderInventaireAuto = () => (
  <div className="space-y-6">
    <ModernCard>
      <CardHeader
        title="Inventaire Automatisé"
        subtitle="QR codes, NFC et géolocalisation"
        icon={Camera}
        action={
          <div className="flex items-center gap-3">
            <ModernButton variant="outline" size="sm">
              <Smartphone className="w-4 h-4 mr-1" />
              App Mobile
            </ModernButton>
            <ModernButton variant="primary" size="sm">
              <QrCode className="w-4 h-4 mr-1" />
              Scanner
            </ModernButton>
          </div>
        }
      />
      <CardBody>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-900">298</p>
                <p className="text-sm text-green-700">Actifs scannés</p>
              </div>
              <QrCode className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-900">342</p>
                <p className="text-sm text-blue-700">Total actifs</p>
              </div>
              <Database className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="p-4 bg-red-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-red-900">5</p>
                <p className="text-sm text-red-700">Anomalies</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-purple-900">87%</p>
                <p className="text-sm text-purple-700">Progression</p>
              </div>
              <Activity className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Interface mobile de scan */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Interface mobile de scan
            </h4>
            <div className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border-2 border-dashed border-blue-300">
              <div className="text-center">
                <QrCode className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <p className="text-lg font-semibold text-blue-900 mb-2">Scanner QR Code</p>
                <p className="text-sm text-blue-700 mb-4">Positionnez le QR code dans le cadre</p>
                <div className="space-y-2">
                  <ModernButton variant="primary" size="sm" className="w-full">
                    <Camera className="w-4 h-4 mr-2" />
                    Activer caméra
                  </ModernButton>
                  <ModernButton variant="outline" size="sm" className="w-full">
                    <MapPin className="w-4 h-4 mr-2" />
                    Localisation GPS
                  </ModernButton>
                </div>
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-lg font-semibold mb-4">Derniers scans</h4>
            <div className="space-y-3">
              {[
                { asset: 'Serveur Dell R740', code: 'MAT-2021-001', time: '2 min', status: 'ok' },
                { asset: 'Toyota Hilux', code: 'VEH-2022-003', time: '5 min', status: 'ok' },
                { asset: 'Bureau direction', code: 'MOB-2023-015', time: '8 min', status: 'warning' },
                { asset: 'Machine CNC', code: 'MAT-2019-045', time: '12 min', status: 'ok' }
              ].map((scan, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      scan.status === 'ok' ? 'bg-green-100 text-green-600' :
                      scan.status === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                      'bg-red-100 text-red-600'
                    }`}>
                      {scan.status === 'ok' ? <CheckCircle className="w-4 h-4" /> :
                       scan.status === 'warning' ? <AlertTriangle className="w-4 h-4" /> :
                       <AlertTriangle className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{scan.asset}</p>
                      <p className="text-xs text-gray-500">{scan.code}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Il y a {scan.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardBody>
    </ModernCard>
  </div>
);

// Export par défaut
export default {
  renderRegistreCentral,
  renderAmortissementsIA,
  renderInventaireAuto
};