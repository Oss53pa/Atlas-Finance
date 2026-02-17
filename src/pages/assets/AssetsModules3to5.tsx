// Modules 3-5: Amortissements IA, Cycle de Vie, Inventaire Auto
import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  Brain, Calculator, Activity, Calendar, Camera, QrCode,
  Smartphone, CheckCircle, AlertTriangle, MapPin, Plus,
  Edit, Eye, Search, Filter, Download, Upload, Settings,
  TrendingUp, TrendingDown, DollarSign, Target, Zap,
  Clock, Users, Building, Package, Award, Star, Layers,
  BarChart3
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

// MODULE 3: AMORTISSEMENTS IA DÉTAILLÉ
export const renderAmortissementsIA = () => (
  <div className="space-y-6">
    {/* Dashboard IA Amortissements */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <StatCard
        title="Précision IA"
        value="94.2%"
        icon={Brain}
        trend={{ value: 3.2, type: 'increase' }}
        color="primary"
        subtitle="Prédictions validées"
      />
      <StatCard
        title="Économies Fiscales"
        value="€85,420"
        icon={DollarSign}
        trend={{ value: 18.7, type: 'increase' }}
        color="success"
        subtitle="Optimisation cette année"
      />
      <StatCard
        title="Recommandations"
        value="32"
        icon={Target}
        trend={{ value: 8.4, type: 'increase' }}
        color="warning"
        subtitle="Actions proposées"
      />
      <StatCard
        title="ROI Optimisation"
        value="285%"
        icon={TrendingUp}
        trend={{ value: 15.4, type: 'increase' }}
        color="info"
        subtitle="Retour sur investissement"
      />
    </div>

    {/* Moteur IA d'optimisation */}
    <ModernCard>
      <CardHeader
        title="Moteur IA d'Optimisation des Amortissements"
        subtitle="Analyse prédictive et recommandations intelligentes"
        icon={Brain}
        action={
          <div className="flex items-center gap-3">
            <ModernButton variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-1" />
              Paramètres IA
            </ModernButton>
            <ModernButton variant="primary" size="sm">
              <Zap className="w-4 h-4 mr-1" />
              Optimiser Tout
            </ModernButton>
          </div>
        }
      />
      <CardBody>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recommandations IA */}
          <div>
            <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-600" />
              Recommandations IA Prioritaires
            </h4>
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-green-900">Machine CNC - Extension durée</span>
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">Haute priorité</span>
                </div>
                <p className="text-sm text-green-700 mb-3">
                  L'IA recommande d'étendre la durée d'amortissement de 8 à 10 ans basé sur l'analyse d'usure IoT
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-xs text-green-600">Économie estimée</p>
                      <p className="text-lg font-bold text-green-900">€15,000</p>
                    </div>
                    <div>
                      <p className="text-xs text-green-600">Confiance</p>
                      <p className="text-lg font-bold text-green-900">94%</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <ModernButton size="sm" variant="primary">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Appliquer
                    </ModernButton>
                    <ModernButton size="sm" variant="outline">
                      <Eye className="w-4 h-4 mr-1" />
                      Détails
                    </ModernButton>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-900">Véhicules - Amortissement dégressif</span>
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">Moyenne priorité</span>
                </div>
                <p className="text-sm text-blue-700 mb-3">
                  Passage en amortissement dégressif recommandé pour 3 véhicules selon leur utilisation
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-xs text-blue-600">Économie estimée</p>
                      <p className="text-lg font-bold text-blue-900">€8,500</p>
                    </div>
                    <div>
                      <p className="text-xs text-blue-600">Confiance</p>
                      <p className="text-lg font-bold text-blue-900">88%</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <ModernButton size="sm" variant="primary">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Appliquer
                    </ModernButton>
                    <ModernButton size="sm" variant="outline">
                      <Eye className="w-4 h-4 mr-1" />
                      Détails
                    </ModernButton>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-yellow-900">Mobilier bureau - Regroupement</span>
                  <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full">Basse priorité</span>
                </div>
                <p className="text-sm text-yellow-700 mb-3">
                  Regrouper les amortissements de mobilier similaire pour optimiser la gestion
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-xs text-yellow-600">Économie estimée</p>
                      <p className="text-lg font-bold text-yellow-900">€2,100</p>
                    </div>
                    <div>
                      <p className="text-xs text-yellow-600">Confiance</p>
                      <p className="text-lg font-bold text-yellow-900">76%</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <ModernButton size="sm" variant="outline">
                      <Clock className="w-4 h-4 mr-1" />
                      Planifier
                    </ModernButton>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Simulation et calculs */}
          <div>
            <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-blue-600" />
              Simulateur IA d'Amortissements
            </h4>
            <div className="p-4 bg-gray-50 rounded-lg mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valeur d'acquisition</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    placeholder="€0"
                    defaultValue="50000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Durée initiale (années)</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    placeholder="5"
                    defaultValue="5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Méthode actuelle</label>
                  <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500">
                    <option value="lineaire">Linéaire</option>
                    <option value="degressif">Dégressif</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                  <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500">
                    <option value="materiel">Matériel</option>
                    <option value="informatique">Informatique</option>
                    <option value="vehicule">Véhicule</option>
                    <option value="mobilier">Mobilier</option>
                  </select>
                </div>
              </div>
              <ModernButton variant="primary" size="sm" className="w-full">
                <Brain className="w-4 h-4 mr-1" />
                Lancer Simulation IA
              </ModernButton>
            </div>

            {/* Résultats simulation */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h5 className="font-semibold text-blue-900 mb-3">Résultats de Simulation IA</h5>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-blue-700">Méthode recommandée:</span>
                  <span className="font-medium text-blue-900">Linéaire sur 7 ans</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-blue-700">Économie annuelle:</span>
                  <span className="font-medium text-green-600">+€2,857</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-blue-700">Économie totale:</span>
                  <span className="font-bold text-green-600">+€20,000</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-blue-700">Confiance IA:</span>
                  <span className="font-medium text-blue-900">91%</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-blue-200">
                <p className="text-xs text-blue-600 mb-2">Justification IA:</p>
                <p className="text-sm text-blue-700">
                  L'analyse IoT montre une usure plus lente que prévu. Extension de durée recommandée avec maintien de la valeur résiduelle.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Performance tracking */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-lg font-semibold mb-4">Performance du Moteur IA</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Award className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-lg font-bold text-green-900">94.2%</p>
                  <p className="text-sm text-green-700">Précision des prédictions</p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Star className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-lg font-bold text-blue-900">156</p>
                  <p className="text-sm text-blue-700">Optimisations appliquées</p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-lg font-bold text-purple-900">€245K</p>
                  <p className="text-sm text-purple-700">Économies totales générées</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardBody>
    </ModernCard>

    {/* Table des amortissements détaillée */}
    <ModernCard>
      <CardHeader
        title="Plan d'Amortissement Intelligent"
        subtitle="Calculs optimisés par IA avec suivi en temps réel"
        icon={Calculator}
        action={
          <div className="flex items-center gap-3">
            <ModernButton variant="outline" size="sm">
              <Download className="w-4 h-4 mr-1" />
              Exporter Plan
            </ModernButton>
            <ModernButton variant="primary" size="sm">
              <Calculator className="w-4 h-4 mr-1" />
              Recalculer Tout
            </ModernButton>
          </div>
        }
      />
      <CardBody>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Actif</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Méthode</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">IA Status</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Valeur Brute</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Amort. Cumul</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">VNC</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Dotation 2024</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Économie IA</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr className="hover:bg-gray-50">
                <td className="py-3 px-4">
                  <div>
                    <p className="text-sm font-medium">Serveur Dell R740</p>
                    <p className="text-xs text-gray-700">MAT-2021-001</p>
                  </div>
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">Linéaire</span>
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full flex items-center gap-1">
                    <Brain className="w-3 h-3" />
                    Optimisé
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-right">€45,000</td>
                <td className="py-3 px-4 text-sm text-right">€18,000</td>
                <td className="py-3 px-4 text-sm text-right font-medium">€27,000</td>
                <td className="py-3 px-4 text-sm text-right font-bold">€9,000</td>
                <td className="py-3 px-4 text-center">
                  <span className="text-sm font-bold text-green-600">+€1,200</span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-center gap-1">
                    <button className="p-1 hover:bg-gray-100 rounded" title="Voir détails" aria-label="Voir les détails">
                      <Eye className="w-4 h-4 text-gray-700" />
                    </button>
                    <button className="p-1 hover:bg-gray-100 rounded" title="Simuler">
                      <Calculator className="w-4 h-4 text-gray-700" />
                    </button>
                    <button className="p-1 hover:bg-gray-100 rounded" title="IA Recommandations">
                      <Brain className="w-4 h-4 text-purple-500" />
                    </button>
                  </div>
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="py-3 px-4">
                  <div>
                    <p className="text-sm font-medium">Toyota Hilux</p>
                    <p className="text-xs text-gray-700">VEH-2022-003</p>
                  </div>
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded-full">Dégressif</span>
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full flex items-center gap-1">
                    <Brain className="w-3 h-3" />
                    Analyse
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-right">€85,000</td>
                <td className="py-3 px-4 text-sm text-right">€25,500</td>
                <td className="py-3 px-4 text-sm text-right font-medium">€59,500</td>
                <td className="py-3 px-4 text-sm text-right font-bold">€17,000</td>
                <td className="py-3 px-4 text-center">
                  <span className="text-sm font-bold text-blue-600">Potentiel</span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-center gap-1">
                    <button className="p-1 hover:bg-gray-100 rounded" title="Voir détails" aria-label="Voir les détails">
                      <Eye className="w-4 h-4 text-gray-700" />
                    </button>
                    <button className="p-1 hover:bg-gray-100 rounded" title="Simuler">
                      <Calculator className="w-4 h-4 text-gray-700" />
                    </button>
                    <button className="p-1 hover:bg-gray-100 rounded" title="IA Recommandations">
                      <Brain className="w-4 h-4 text-purple-500" />
                    </button>
                  </div>
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="py-3 px-4">
                  <div>
                    <p className="text-sm font-medium">Machine CNC</p>
                    <p className="text-xs text-gray-700">MAT-2019-045</p>
                  </div>
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded-full">Dégressif</span>
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full flex items-center gap-1">
                    <Brain className="w-3 h-3" />
                    Optimisé
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-right">€250,000</td>
                <td className="py-3 px-4 text-sm text-right">€137,500</td>
                <td className="py-3 px-4 text-sm text-right font-medium">€112,500</td>
                <td className="py-3 px-4 text-sm text-right font-bold">€22,500</td>
                <td className="py-3 px-4 text-center">
                  <span className="text-sm font-bold text-green-600">+€15,000</span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-center gap-1">
                    <button className="p-1 hover:bg-gray-100 rounded" title="Voir détails" aria-label="Voir les détails">
                      <Eye className="w-4 h-4 text-gray-700" />
                    </button>
                    <button className="p-1 hover:bg-gray-100 rounded" title="Simuler">
                      <Calculator className="w-4 h-4 text-gray-700" />
                    </button>
                    <button className="p-1 hover:bg-gray-100 rounded" title="IA Recommandations">
                      <Brain className="w-4 h-4 text-purple-500" />
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

// MODULE 4: CYCLE DE VIE DÉTAILLÉ
export const renderCycleVie = () => (
  <div className="space-y-6">
    {/* KPI Cycle de vie */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <StatCard
        title="Actifs en Fin de Vie"
        value="23"
        icon={Clock}
        trend={{ value: -5.2, type: 'decrease' }}
        color="warning"
        subtitle="Dans les 12 mois"
      />
      <StatCard
        title="Renouvellements Planifiés"
        value="15"
        icon={Calendar}
        trend={{ value: 8.7, type: 'increase' }}
        color="info"
        subtitle="Budget alloué"
      />
      <StatCard
        title="Extensions de Durée"
        value="8"
        icon={TrendingUp}
        trend={{ value: 12.1, type: 'increase' }}
        color="success"
        subtitle="Optimisées par IA"
      />
      <StatCard
        title="Valeur Récupérée"
        value="€145K"
        icon={DollarSign}
        trend={{ value: 25.3, type: 'increase' }}
        color="primary"
        subtitle="Cessions 2024"
      />
    </div>

    {/* Timeline intelligente */}
    <ModernCard>
      <CardHeader
        title="Timeline Intelligente du Cycle de Vie"
        subtitle="Planification optimisée par IA des renouvellements"
        icon={Activity}
        action={
          <div className="flex items-center gap-3">
            <ModernButton variant="outline" size="sm">
              <Download className="w-4 h-4 mr-1" />
              Plan Investissement
            </ModernButton>
            <ModernButton variant="primary" size="sm">
              <Brain className="w-4 h-4 mr-1" />
              Optimiser Timeline
            </ModernButton>
          </div>
        }
      />
      <CardBody>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Timeline des actifs */}
          <div>
            <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Planning 2024-2026
            </h4>
            <div className="space-y-4">
              {/* Q1 2024 */}
              <div className="relative">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-900">Q1 2024 - Action Immédiate</span>
                </div>
                <div className="ml-6 space-y-2">
                  <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-red-900">3 Serveurs HP - Fin de support</p>
                        <p className="text-xs text-red-700">Risque sécurité critique</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-red-600">Budget requis</p>
                        <p className="text-sm font-bold text-red-900">€135K</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 bg-yellow-50 border-l-4 border-yellow-500 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-yellow-900">Machine découpe laser</p>
                        <p className="text-xs text-yellow-700">Maintenance préventive majeure</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-yellow-600">Coût estimé</p>
                        <p className="text-sm font-bold text-yellow-900">€25K</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Q2-Q3 2024 */}
              <div className="relative">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-900">Q2-Q3 2024 - Planifié</span>
                </div>
                <div className="ml-6 space-y-2">
                  <div className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-900">Flotte véhicules - Renouvellement partiel</p>
                        <p className="text-xs text-blue-700">5 véhicules sur 12</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-blue-600">Budget prévisionnel</p>
                        <p className="text-sm font-bold text-blue-900">€285K</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2025 */}
              <div className="relative">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-900">2025 - Optimisé IA</span>
                </div>
                <div className="ml-6 space-y-2">
                  <div className="p-3 bg-green-50 border-l-4 border-green-500 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-900">Extension durée amortissement</p>
                        <p className="text-xs text-green-700">8 actifs identifiés par IA</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-green-600">Économie générée</p>
                        <p className="text-sm font-bold text-green-900">€95K</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Analyse prédictive */}
          <div>
            <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-600" />
              Analyse Prédictive IA
            </h4>

            {/* Graphique de prédiction */}
            <div className="p-4 bg-gray-50 rounded-lg mb-4">
              <div className="h-48">
                <Line
                  data={{
                    labels: ['2024', '2025', '2026', '2027', '2028'],
                    datasets: [
                      {
                        label: 'Investissements Planifiés',
                        data: [450000, 320000, 280000, 380000, 420000],
                        borderColor: 'rgba(59, 130, 246, 1)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        fill: true
                      },
                      {
                        label: 'Optimisation IA',
                        data: [380000, 285000, 245000, 340000, 375000],
                        borderColor: 'rgba(34, 197, 94, 1)',
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        fill: true
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
                          text: 'Montant (€)'
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>

            {/* Recommandations stratégiques */}
            <div className="space-y-3">
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-900">Stratégie Recommandée</span>
                </div>
                <p className="text-sm text-purple-700 mb-2">
                  Étaler les investissements sur 2024-2025 pour optimiser les flux de trésorerie
                </p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-purple-600">Impact trésorerie: -25%</span>
                  <span className="text-purple-600">Confiance: 89%</span>
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Opportunité Fiscal</span>
                </div>
                <p className="text-sm text-blue-700 mb-2">
                  Regrouper les cessions en fin d'année pour optimiser la fiscalité
                </p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-blue-600">Économie fiscale: €45K</span>
                  <span className="text-blue-600">Confiance: 94%</span>
                </div>
              </div>

              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-900">Innovation Technologique</span>
                </div>
                <p className="text-sm text-orange-700 mb-2">
                  Anticiper l'arrivée de nouvelles technologies pour les serveurs
                </p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-orange-600">ROI amélioré: +35%</span>
                  <span className="text-orange-600">Horizon: 18 mois</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardBody>
    </ModernCard>

    {/* Table détaillée cycle de vie */}
    <ModernCard>
      <CardHeader
        title="Suivi Détaillé par Actif"
        subtitle="État du cycle de vie et recommandations"
        icon={Activity}
        action={
          <div className="flex items-center gap-3">
            <ModernButton variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-1" />
              Filtres
            </ModernButton>
            <ModernButton variant="outline" size="sm">
              <Download className="w-4 h-4 mr-1" />
              Export Excel
            </ModernButton>
          </div>
        }
      />
      <CardBody>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Actif</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Âge</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">État Cycle</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Fin de Vie</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Valeur Résiduelle</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Action IA</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Priorité</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr className="hover:bg-gray-50">
                <td className="py-3 px-4">
                  <div>
                    <p className="text-sm font-medium">Serveur Dell R740</p>
                    <p className="text-xs text-gray-700">MAT-2021-001</p>
                  </div>
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="text-sm">3 ans</span>
                </td>
                <td className="py-3 px-4 text-center">
                  <div className="flex items-center justify-center">
                    <div className="w-full bg-gray-200 rounded-full h-2 max-w-20">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '60%' }}></div>
                    </div>
                    <span className="ml-2 text-xs text-gray-600">60%</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="text-sm text-green-600">Mars 2026</span>
                </td>
                <td className="py-3 px-4 text-sm text-right">€18,000</td>
                <td className="py-3 px-4 text-center">
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">Extension</span>
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">Normale</span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-center gap-1">
                    <button className="p-1 hover:bg-gray-100 rounded" title="Détails cycle" aria-label="Voir les détails">
                      <Eye className="w-4 h-4 text-gray-700" />
                    </button>
                    <button className="p-1 hover:bg-gray-100 rounded" title="Planifier" aria-label="Calendrier">
                      <Calendar className="w-4 h-4 text-gray-700" />
                    </button>
                    <button className="p-1 hover:bg-gray-100 rounded" title="IA Recommandations">
                      <Brain className="w-4 h-4 text-purple-500" />
                    </button>
                  </div>
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="py-3 px-4">
                  <div>
                    <p className="text-sm font-medium">Machine CNC</p>
                    <p className="text-xs text-gray-700">MAT-2019-045</p>
                  </div>
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="text-sm">5 ans</span>
                </td>
                <td className="py-3 px-4 text-center">
                  <div className="flex items-center justify-center">
                    <div className="w-full bg-gray-200 rounded-full h-2 max-w-20">
                      <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '80%' }}></div>
                    </div>
                    <span className="ml-2 text-xs text-gray-600">80%</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="text-sm text-yellow-600">Sept 2025</span>
                </td>
                <td className="py-3 px-4 text-sm text-right">€75,000</td>
                <td className="py-3 px-4 text-center">
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">Maintenir</span>
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full">Surveillée</span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-center gap-1">
                    <button className="p-1 hover:bg-gray-100 rounded" title="Détails cycle" aria-label="Voir les détails">
                      <Eye className="w-4 h-4 text-gray-700" />
                    </button>
                    <button className="p-1 hover:bg-gray-100 rounded" title="Planifier" aria-label="Calendrier">
                      <Calendar className="w-4 h-4 text-gray-700" />
                    </button>
                    <button className="p-1 hover:bg-gray-100 rounded" title="IA Recommandations">
                      <Brain className="w-4 h-4 text-purple-500" />
                    </button>
                  </div>
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="py-3 px-4">
                  <div>
                    <p className="text-sm font-medium">Toyota Hilux</p>
                    <p className="text-xs text-gray-700">VEH-2022-003</p>
                  </div>
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="text-sm">2 ans</span>
                </td>
                <td className="py-3 px-4 text-center">
                  <div className="flex items-center justify-center">
                    <div className="w-full bg-gray-200 rounded-full h-2 max-w-20">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '40%' }}></div>
                    </div>
                    <span className="ml-2 text-xs text-gray-600">40%</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="text-sm text-green-600">Juin 2027</span>
                </td>
                <td className="py-3 px-4 text-sm text-right">€42,500</td>
                <td className="py-3 px-4 text-center">
                  <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full">Optimiser</span>
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">Normale</span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-center gap-1">
                    <button className="p-1 hover:bg-gray-100 rounded" title="Détails cycle" aria-label="Voir les détails">
                      <Eye className="w-4 h-4 text-gray-700" />
                    </button>
                    <button className="p-1 hover:bg-gray-100 rounded" title="Planifier" aria-label="Calendrier">
                      <Calendar className="w-4 h-4 text-gray-700" />
                    </button>
                    <button className="p-1 hover:bg-gray-100 rounded" title="IA Recommandations">
                      <Brain className="w-4 h-4 text-purple-500" />
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

// MODULE 5: INVENTAIRE AUTOMATISÉ DÉTAILLÉ
export const renderInventaireAuto = () => {
  const [inventoryMode, setInventoryMode] = useState('dashboard');

  return (
    <div className="space-y-6">
      {/* KPI Inventaire */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Progression"
          value="87%"
          icon={Activity}
          trend={{ value: 12.3, type: 'increase' }}
          color="primary"
          subtitle="298/342 vérifiés"
        />
        <StatCard
          title="QR Scannés"
          value="285"
          icon={QrCode}
          trend={{ value: 15.7, type: 'increase' }}
          color="success"
          subtitle="Scan automatique"
        />
        <StatCard
          title="Anomalies"
          value="5"
          icon={AlertTriangle}
          trend={{ value: -25.0, type: 'decrease' }}
          color="warning"
          subtitle="À résoudre"
        />
        <StatCard
          title="Géolocalisation"
          value="95%"
          icon={MapPin}
          trend={{ value: 8.2, type: 'increase' }}
          color="info"
          subtitle="GPS précis"
        />
      </div>

      {/* Mode selector */}
      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
        <span className="text-sm font-medium text-gray-700">Mode d'inventaire:</span>
        <div className="flex gap-2">
          {[
            { id: 'dashboard', label: 'Vue d\'ensemble', icon: BarChart3 },
            { id: 'mobile', label: 'Scanner Mobile', icon: Smartphone },
            { id: 'bulk', label: 'Import Masse', icon: Upload },
            { id: 'analytics', label: 'Analytics', icon: Activity }
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => setInventoryMode(mode.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                inventoryMode === mode.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              <mode.icon className="w-4 h-4" />
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenu selon le mode */}
      {inventoryMode === 'dashboard' && (
        <>
          {/* Session d'inventaire en cours */}
          <ModernCard>
            <CardHeader
              title="Session d'Inventaire en Cours"
              subtitle="Inventaire complet 2024 - Suivi temps réel"
              icon={Camera}
              action={
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-green-600">{t('status.inProgress')}</span>
                  </div>
                  <ModernButton variant="outline" size="sm">
                    <Settings className="w-4 h-4 mr-1" />
                    Configurer
                  </ModernButton>
                  <ModernButton variant="primary" size="sm">
                    <QrCode className="w-4 h-4 mr-1" />
                    Scanner
                  </ModernButton>
                </div>
              }
            />
            <CardBody>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Progression détaillée */}
                <div className="lg:col-span-2">
                  <h4 className="text-lg font-semibold mb-4">Progression par Zone</h4>
                  <div className="space-y-4">
                    {[
                      { zone: 'Étage 1 - Bureaux', total: 45, verified: 45, anomalies: 0, status: 'completed' },
                      { zone: 'Étage 2 - Salle serveur', total: 23, verified: 23, anomalies: 0, status: 'completed' },
                      { zone: 'Étage 3 - Direction', total: 18, verified: 16, anomalies: 1, status: 'in-progress' },
                      { zone: 'Atelier - Production', total: 156, verified: 142, anomalies: 3, status: 'in-progress' },
                      { zone: 'Parking - Véhicules', total: 12, verified: 11, anomalies: 1, status: 'in-progress' },
                      { zone: 'Extérieur - Équipements', total: 88, verified: 61, anomalies: 0, status: 'pending' }
                    ].map((zone, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="font-medium text-gray-900">{zone.zone}</p>
                            <p className="text-sm text-gray-700">
                              {zone.verified}/{zone.total} actifs • {zone.anomalies} anomalies
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              zone.status === 'completed' ? 'bg-green-100 text-green-700' :
                              zone.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {zone.status === 'completed' ? 'Terminé' :
                               zone.status === 'in-progress' ? 'En cours' : 'En attente'}
                            </span>
                            {zone.anomalies > 0 && (
                              <AlertTriangle className="w-4 h-4 text-yellow-500" />
                            )}
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              zone.status === 'completed' ? 'bg-green-500' :
                              zone.status === 'in-progress' ? 'bg-blue-500' :
                              'bg-gray-400'
                            }`}
                            style={{ width: `${(zone.verified / zone.total) * 100}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-gray-700 mt-1">
                          <span>{Math.round((zone.verified / zone.total) * 100)}% complété</span>
                          <span>MAJ: il y a {Math.floor(Math.random() * 60)} min</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Équipe et outils */}
                <div>
                  <h4 className="text-lg font-semibold mb-4">Équipe & Outils</h4>
                  <div className="space-y-4">
                    {/* Membres actifs */}
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h5 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Équipe Active (4)
                      </h5>
                      <div className="space-y-2">
                        {[
                          { name: 'Marie Dubois', zone: 'Atelier', status: 'scanning', lastScan: '2 min' },
                          { name: 'Jean Martin', zone: 'Parking', status: 'verifying', lastScan: '5 min' },
                          { name: 'Paul Durand', zone: 'Étage 3', status: 'break', lastScan: '25 min' },
                          { name: 'Sophie Leclerc', zone: 'Extérieur', status: 'scanning', lastScan: '1 min' }
                        ].map((member, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${
                                member.status === 'scanning' ? 'bg-green-500' :
                                member.status === 'verifying' ? 'bg-blue-500' :
                                'bg-yellow-500'
                              }`}></div>
                              <span className="font-medium text-blue-900">{member.name}</span>
                            </div>
                            <div className="text-right">
                              <p className="text-blue-700">{member.zone}</p>
                              <p className="text-xs text-blue-600">Il y a {member.lastScan}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Outils de scan */}
                    <div className="p-4 bg-green-50 rounded-lg">
                      <h5 className="font-medium text-green-900 mb-3 flex items-center gap-2">
                        <Smartphone className="w-4 h-4" />
                        Outils Connectés
                      </h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-green-700">Scanners QR:</span>
                          <span className="font-medium text-green-900">4/4 actifs</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-green-700">Lecteurs NFC:</span>
                          <span className="font-medium text-green-900">2/2 actifs</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-green-700">GPS Précision:</span>
                          <span className="font-medium text-green-900">±2m</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-green-700">App Mobile:</span>
                          <span className="font-medium text-green-900">v2.1.5</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions rapides */}
                    <div className="space-y-2">
                      <ModernButton variant="primary" size="sm" className="w-full">
                        <Download className="w-4 h-4 mr-2" />
                        Rapport Intermédiaire
                      </ModernButton>
                      <ModernButton variant="outline" size="sm" className="w-full">
                        <Eye className="w-4 h-4 mr-2" />
                        Vue Cartographique
                      </ModernButton>
                      <ModernButton variant="outline" size="sm" className="w-full">
                        <Settings className="w-4 h-4 mr-2" />
                        Paramètres Session
                      </ModernButton>
                    </div>
                  </div>
                </div>
              </div>
            </CardBody>
          </ModernCard>

          {/* Anomalies et résolutions */}
          <ModernCard>
            <CardHeader
              title="Anomalies Détectées"
              subtitle="Écarts inventaire et actions correctives"
              icon={AlertTriangle}
              action={
                <ModernButton variant="primary" size="sm">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Résoudre Tout
                </ModernButton>
              }
            />
            <CardBody>
              <div className="space-y-4">
                {[
                  {
                    id: 1,
                    type: 'missing',
                    asset: 'Ordinateur portable HP EliteBook',
                    code: 'INF-2023-045',
                    expected: 'Bureau 205 - Étage 2',
                    found: 'Introuvable',
                    severity: 'high',
                    assignee: 'Marie Dubois',
                    notes: 'Dernière localisation confirmée il y a 3 mois'
                  },
                  {
                    id: 2,
                    type: 'location',
                    asset: 'Imprimante Canon ImageRunner',
                    code: 'INF-2022-012',
                    expected: 'Étage 2 - Salle reprographie',
                    found: 'Étage 1 - Accueil',
                    severity: 'medium',
                    assignee: 'Jean Martin',
                    notes: 'Déplacée sans notification officielle'
                  },
                  {
                    id: 3,
                    type: 'condition',
                    asset: 'Machine CNC Haas',
                    code: 'MAT-2019-045',
                    expected: 'État fonctionnel',
                    found: 'QR Code endommagé',
                    severity: 'low',
                    assignee: 'Paul Durand',
                    notes: 'QR Code illisible, nécessite remplacement'
                  },
                  {
                    id: 4,
                    type: 'data',
                    asset: 'Véhicule Renault Master',
                    code: 'VEH-2021-008',
                    expected: 'Plaque: AB-123-CD',
                    found: 'Plaque: AB-124-CD',
                    severity: 'medium',
                    assignee: 'Sophie Leclerc',
                    notes: 'Discordance numéro plaque dans base de données'
                  },
                  {
                    id: 5,
                    type: 'access',
                    asset: 'Coffre-fort Fichet',
                    code: 'MOB-2020-033',
                    expected: 'Bureau direction',
                    found: 'Zone accès restreint',
                    severity: 'low',
                    assignee: 'Marie Dubois',
                    notes: 'Nécessite autorisation spéciale pour vérification'
                  }
                ].map((anomaly) => (
                  <div key={anomaly.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          anomaly.severity === 'high' ? 'bg-red-100 text-red-600' :
                          anomaly.severity === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                          'bg-blue-100 text-blue-600'
                        }`}>
                          {anomaly.type === 'missing' ? <AlertTriangle className="w-5 h-5" /> :
                           anomaly.type === 'location' ? <MapPin className="w-5 h-5" /> :
                           anomaly.type === 'condition' ? <QrCode className="w-5 h-5" /> :
                           anomaly.type === 'data' ? <Edit className="w-5 h-5" /> :
                           <Users className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-gray-900">{anomaly.asset}</p>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                              anomaly.severity === 'high' ? 'bg-red-100 text-red-700' :
                              anomaly.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {anomaly.severity === 'high' ? 'Critique' :
                               anomaly.severity === 'medium' ? 'Moyenne' : 'Faible'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 font-mono">{anomaly.code}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-700">Assigné à</p>
                        <p className="text-sm font-medium text-gray-900">{anomaly.assignee}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-gray-700 mb-1">Attendu:</p>
                        <p className="text-sm text-gray-900">{anomaly.expected}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-700 mb-1">Constaté:</p>
                        <p className="text-sm text-gray-900">{anomaly.found}</p>
                      </div>
                    </div>

                    <div className="mb-3">
                      <p className="text-xs text-gray-700 mb-1">Notes:</p>
                      <p className="text-sm text-gray-700">{anomaly.notes}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <ModernButton size="sm" variant="primary">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Résoudre
                      </ModernButton>
                      <ModernButton size="sm" variant="outline">
                        <Edit className="w-4 h-4 mr-1" />
                        Modifier
                      </ModernButton>
                      <ModernButton size="sm" variant="outline">
                        <Eye className="w-4 h-4 mr-1" />
                        Détails
                      </ModernButton>
                      <ModernButton size="sm" variant="ghost">
                        <Users className="w-4 h-4 mr-1" />
                        Réassigner
                      </ModernButton>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </ModernCard>
        </>
      )}

      {inventoryMode === 'mobile' && (
        <ModernCard>
          <CardHeader
            title="Interface Scanner Mobile"
            subtitle="Application mobile pour scan QR/NFC et géolocalisation"
            icon={Smartphone}
          />
          <CardBody>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Interface de scan */}
              <div className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border-2 border-dashed border-blue-300">
                <div className="text-center mb-6">
                  <QrCode className="w-20 h-20 text-blue-600 mx-auto mb-4" />
                  <p className="text-lg font-semibold text-blue-900 mb-2">Scanner QR Code</p>
                  <p className="text-sm text-blue-700 mb-4">Positionnez le QR code dans le cadre</p>
                  <div className="w-48 h-48 mx-auto border-2 border-blue-400 rounded-lg flex items-center justify-center bg-black bg-opacity-10">
                    <div className="w-32 h-32 border border-blue-500 rounded">
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="w-16 h-16 border-2 border-blue-600 animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <ModernButton variant="primary" size="lg" className="w-full">
                    <Camera className="w-5 h-5 mr-2" />
                    Activer Caméra
                  </ModernButton>
                  <ModernButton variant="outline" size="lg" className="w-full">
                    <MapPin className="w-5 h-5 mr-2" />
                    GPS Localisation
                  </ModernButton>
                  <ModernButton variant="outline" size="lg" className="w-full">
                    <Edit className="w-5 h-5 mr-2" />
                    Saisie Manuelle
                  </ModernButton>
                </div>
              </div>

              {/* Historique des scans */}
              <div>
                <h4 className="text-lg font-semibold mb-4">Derniers Scans</h4>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {[
                    { asset: 'Serveur Dell R740', code: 'MAT-2021-001', time: '2 min', status: 'success', location: 'Salle serveur', gps: '48.8566, 2.3522' },
                    { asset: 'Toyota Hilux', code: 'VEH-2022-003', time: '5 min', status: 'success', location: 'Parking', gps: '48.8556, 2.3512' },
                    { asset: 'Bureau direction', code: 'MOB-2023-015', time: '8 min', status: 'warning', location: 'Étage 3', gps: '48.8576, 2.3532' },
                    { asset: 'Machine CNC', code: 'MAT-2019-045', time: '12 min', status: 'success', location: 'Atelier', gps: '48.8546, 2.3502' },
                    { asset: 'Imprimante Canon', code: 'INF-2022-012', time: '15 min', status: 'error', location: 'Étage 1', gps: '48.8586, 2.3542' },
                    { asset: 'Ordinateur HP', code: 'INF-2023-045', time: '18 min', status: 'success', location: 'Bureau 205', gps: '48.8596, 2.3552' }
                  ].map((scan, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          scan.status === 'success' ? 'bg-green-100 text-green-600' :
                          scan.status === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                          'bg-red-100 text-red-600'
                        }`}>
                          {scan.status === 'success' ? <CheckCircle className="w-4 h-4" /> :
                           scan.status === 'warning' ? <AlertTriangle className="w-4 h-4" /> :
                           <AlertTriangle className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{scan.asset}</p>
                          <p className="text-xs text-gray-700 font-mono">{scan.code}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <MapPin className="w-3 h-3 text-gray-700" />
                            <span className="text-xs text-gray-700">{scan.location}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-700">Il y a {scan.time}</p>
                        <p className="text-xs text-gray-700 font-mono">{scan.gps}</p>
                        <div className="mt-1">
                          <button className="text-xs text-blue-600 hover:underline">Détails</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardBody>
        </ModernCard>
      )}

      {inventoryMode === 'bulk' && (
        <ModernCard>
          <CardHeader
            title="Import en Masse"
            subtitle="Traitement automatisé des inventaires par lots"
            icon={Upload}
          />
          <CardBody>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Zone d'upload */}
              <div>
                <h4 className="text-lg font-semibold mb-4">Importer Données d'Inventaire</h4>
                <div className="p-8 border-2 border-dashed border-gray-300 rounded-lg text-center hover:border-blue-400 transition-colors cursor-pointer">
                  <Upload className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-900 mb-2">Glisser-déposer ou cliquer</p>
                  <p className="text-sm text-gray-700 mb-4">Formats supportés: Excel (.xlsx), CSV (.csv)</p>
                  <ModernButton variant="primary" size="sm">
                    <Upload className="w-4 h-4 mr-2" />
                    Sélectionner Fichier
                  </ModernButton>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h5 className="font-medium text-blue-900 mb-2">Format Attendu</h5>
                    <div className="text-sm text-blue-700 space-y-1">
                      <p>• Code actif (obligatoire)</p>
                      <p>• Statut inventaire (Présent/Absent/Endommagé)</p>
                      <p>• Localisation GPS (optionnel)</p>
                      <p>• Responsable scan (optionnel)</p>
                      <p>• Notes/Commentaires (optionnel)</p>
                    </div>
                  </div>

                  <ModernButton variant="outline" size="sm" className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Télécharger Modèle Excel
                  </ModernButton>
                </div>
              </div>

              {/* Historique et validation */}
              <div>
                <h4 className="text-lg font-semibold mb-4">Historique des Imports</h4>
                <div className="space-y-3">
                  {[
                    { file: 'inventaire_etage1_2024.xlsx', date: '15 Jan 2024 14:30', records: 45, success: 45, errors: 0, status: 'completed' },
                    { file: 'scan_parking_mobile.csv', date: '15 Jan 2024 12:15', records: 12, success: 11, errors: 1, status: 'completed' },
                    { file: 'inventaire_atelier_batch.xlsx', date: '14 Jan 2024 16:45', records: 156, success: 142, errors: 14, status: 'processing' },
                    { file: 'correction_anomalies.csv', date: '13 Jan 2024 09:20', records: 8, success: 8, errors: 0, status: 'completed' }
                  ].map((import_record, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium text-gray-900">{import_record.file}</p>
                          <p className="text-xs text-gray-700">{import_record.date}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          import_record.status === 'completed' ? 'bg-green-100 text-green-700' :
                          import_record.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {import_record.status === 'completed' ? 'Terminé' :
                           import_record.status === 'processing' ? 'En cours' : 'Erreur'}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-gray-700">Total:</span>
                          <span className="font-medium text-gray-900"> {import_record.records}</span>
                        </div>
                        <div>
                          <span className="text-gray-700">Succès:</span>
                          <span className="font-medium text-green-600"> {import_record.success}</span>
                        </div>
                        <div>
                          <span className="text-gray-700">Erreurs:</span>
                          <span className="font-medium text-red-600"> {import_record.errors}</span>
                        </div>
                      </div>
                      {import_record.errors > 0 && (
                        <div className="mt-2">
                          <ModernButton size="sm" variant="outline">
                            <Eye className="w-3 h-3 mr-1" />
                            Voir Erreurs
                          </ModernButton>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardBody>
        </ModernCard>
      )}

      {inventoryMode === 'analytics' && (
        <ModernCard>
          <CardHeader
            title="Analytics Inventaire"
            subtitle="Analyse des performances et tendances"
            icon={Activity}
          />
          <CardBody>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Graphique performance */}
              <div>
                <h4 className="text-lg font-semibold mb-4">Performance des Sessions</h4>
                <div className="h-64">
                  <Bar
                    data={{
                      labels: ['Déc 2023', 'Jan 2024', 'Fév 2024', 'Mar 2024'],
                      datasets: [
                        {
                          label: 'Actifs Vérifiés',
                          data: [298, 325, 342, 338],
                          backgroundColor: 'rgba(59, 130, 246, 0.6)',
                        },
                        {
                          label: 'Anomalies',
                          data: [12, 8, 5, 3],
                          backgroundColor: 'rgba(239, 68, 68, 0.6)',
                        }
                      ]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true
                        }
                      }
                    }}
                  />
                </div>
              </div>

              {/* Métriques qualité */}
              <div>
                <h4 className="text-lg font-semibold mb-4">Qualité des Inventaires</h4>
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-green-900">Taux de Précision</span>
                      <span className="text-lg font-bold text-green-900">98.5%</span>
                    </div>
                    <div className="w-full bg-green-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: '98.5%' }}></div>
                    </div>
                    <p className="text-xs text-green-700 mt-1">+2.1% vs période précédente</p>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-900">Couverture GPS</span>
                      <span className="text-lg font-bold text-blue-900">95.2%</span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: '95.2%' }}></div>
                    </div>
                    <p className="text-xs text-blue-700 mt-1">+8.3% vs période précédente</p>
                  </div>

                  <div className="p-4 bg-purple-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-purple-900">Temps Moyen/Actif</span>
                      <span className="text-lg font-bold text-purple-900">2.3min</span>
                    </div>
                    <div className="w-full bg-purple-200 rounded-full h-2">
                      <div className="bg-purple-600 h-2 rounded-full" style={{ width: '77%' }}></div>
                    </div>
                    <p className="text-xs text-purple-700 mt-1">-15% vs période précédente</p>
                  </div>

                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-yellow-900">Productivité Équipe</span>
                      <span className="text-lg font-bold text-yellow-900">142%</span>
                    </div>
                    <div className="w-full bg-yellow-200 rounded-full h-2">
                      <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '100%' }}></div>
                    </div>
                    <p className="text-xs text-yellow-700 mt-1">+42% vs objectif initial</p>
                  </div>
                </div>
              </div>
            </div>
          </CardBody>
        </ModernCard>
      )}
    </div>
  );
};

// Composant principal exportable
interface AssetsModules3to5Props {
  activeModule?: number;
}

export const AssetsModules3to5: React.FC<AssetsModules3to5Props> = ({ activeModule = 3 }) => {
  const { t } = useLanguage();
  if (activeModule === 3) {
    return renderAmortissementsIA();
  } else if (activeModule === 4) {
    return renderCycleVie();
  } else if (activeModule === 5) {
    return renderInventaireAuto();
  }
  return <div>Module non disponible</div>;
};

export default AssetsModules3to5;