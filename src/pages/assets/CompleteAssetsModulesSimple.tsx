import React, { useState } from 'react';
import { ModernCard, CardHeader, CardBody } from '../../components/ui/ModernCard';
import ModernButton from '../../components/ui/ModernButton';
import {
  Building, Package, Calendar, AlertTriangle, CheckCircle, Info,
  Search, Filter, QrCode, RefreshCw, Edit, Eye, Trash2,
  Plus, Upload, Download, Clock, Camera, X, Calculator
} from 'lucide-react';

interface Asset {
  id: string;
  code: string;
  designation: string;
  category: string;
  acquisitionValue: number;
  netValue: number;
  status: 'Actif' | 'Maintenance' | 'Inactif' | 'Inconnu';
  responsible: string;
}

export const CompleteAssetsModulesSimple: React.FC<{ activeModule: number }> = ({ activeModule }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showNewAssetModal, setShowNewAssetModal] = useState(false);
  const [activeFormSection, setActiveFormSection] = useState('general');

  const [assets, setAssets] = useState<Asset[]>([
    {
      id: '1',
      code: 'IMM001',
      designation: 'Bâtiment Siège Social',
      category: 'Immobilier',
      acquisitionValue: 1500000,
      netValue: 1350000,
      status: 'Inconnu',
      responsible: 'Amadou Diallo'
    },
    {
      id: '2',
      code: 'MAT001',
      designation: 'Serveur Dell PowerEdge',
      category: 'Informatique',
      acquisitionValue: 85000,
      netValue: 68000,
      status: 'Inconnu',
      responsible: 'Fatima Ndiaye'
    },
    {
      id: '3',
      code: 'VEH001',
      designation: 'Toyota Hilux',
      category: 'Véhicules',
      acquisitionValue: 18500000,
      netValue: 13500000,
      status: 'Maintenance',
      responsible: 'Moussa Seck'
    }
  ]);

  const getStatusColor = (status: Asset['status']) => {
    switch (status) {
      case 'Actif': return 'text-green-600 bg-green-100';
      case 'Maintenance': return 'text-yellow-600 bg-yellow-100';
      case 'Inactif': return 'text-red-600 bg-red-100';
      case 'Inconnu': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('fr-FR') + ' F CFA';
  };

  const getModuleContent = () => {
    switch (activeModule) {
      case 1:
        return (
          <div className="space-y-6">
            {/* Action Buttons */}
            <div className="flex gap-3">
              <ModernButton variant="primary" size="sm" onClick={() => setShowNewAssetModal(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Nouvel Actif
              </ModernButton>
              <ModernButton variant="outline" size="sm">
                <Upload className="w-4 h-4 mr-1" />
                Import Excel
              </ModernButton>
              <ModernButton variant="outline" size="sm">
                <Download className="w-4 h-4 mr-1" />
                Export Registre
              </ModernButton>
              <ModernButton variant="outline" size="sm">
                <QrCode className="w-4 h-4 mr-1" />
                Scanner QR
              </ModernButton>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-sm text-blue-600 mb-1">Total Actifs</div>
                <div className="text-2xl font-bold text-blue-800">{assets.length}</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-sm text-green-600 mb-1">Valeur Totale</div>
                <div className="text-2xl font-bold text-green-800">
                  {formatCurrency(assets.reduce((sum, asset) => sum + asset.netValue, 0))}
                </div>
              </div>
              <div className="p-4 bg-emerald-50 rounded-lg">
                <div className="text-sm text-emerald-600 mb-1">Actifs Actifs</div>
                <div className="text-2xl font-bold text-emerald-800">
                  {assets.filter(a => a.status === 'Actif').length}
                </div>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <div className="text-sm text-yellow-600 mb-1">En Maintenance</div>
                <div className="text-2xl font-bold text-yellow-800">
                  {assets.filter(a => a.status === 'Maintenance').length}
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <ModernCard>
              <CardHeader
                title="Activité Récente"
                subtitle="Dernières mises à jour"
                icon={Clock}
              />
              <CardBody>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg">
                    <div className="p-2 bg-blue-100 rounded">
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Nouvel actif ajouté</p>
                      <p className="text-sm text-gray-600">Serveur Dell PowerEdge</p>
                    </div>
                    <span className="text-sm text-gray-500">2h</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg">
                    <div className="p-2 bg-yellow-100 rounded">
                      <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Maintenance programmée</p>
                      <p className="text-sm text-gray-600">Toyota Hilux</p>
                    </div>
                    <span className="text-sm text-gray-500">4h</span>
                  </div>
                  <div className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg">
                    <div className="p-2 bg-green-100 rounded">
                      <Package className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Inventaire mis à jour</p>
                      <p className="text-sm text-gray-600">Bâtiment Siège</p>
                    </div>
                    <span className="text-sm text-gray-500">1j</span>
                  </div>
                </div>
              </CardBody>
            </ModernCard>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            {/* Header Section */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
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

            {/* Filters Section */}
            <div className="flex gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Rechercher par désignation, code ou responsable..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">Toutes catégories</option>
                <option value="Immobilier">Immobilier</option>
                <option value="Informatique">Informatique</option>
                <option value="Véhicules">Véhicules</option>
              </select>
              <select
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Tous statuts</option>
                <option value="Actif">Actif</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Inactif">Inactif</option>
                <option value="Inconnu">Inconnu</option>
              </select>
            </div>

            {/* Table Section */}
            <ModernCard>
              <CardBody>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Code</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Désignation</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Catégorie</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Valeur d'Acquisition</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Valeur Nette</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Statut</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Responsable</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assets.map((asset) => (
                        <tr key={asset.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 text-gray-900">{asset.code}</td>
                          <td className="py-3 px-4 text-gray-900">{asset.designation}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                              {asset.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-900">{formatCurrency(asset.acquisitionValue)}</td>
                          <td className="py-3 px-4 text-gray-900">{formatCurrency(asset.netValue)}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(asset.status)}`}>
                              {asset.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-900">{asset.responsible}</td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2">
                              <button className="p-1 hover:bg-gray-100 rounded">
                                <Eye className="w-4 h-4 text-gray-600" />
                              </button>
                              <button className="p-1 hover:bg-gray-100 rounded">
                                <Edit className="w-4 h-4 text-blue-600" />
                              </button>
                              <button className="p-1 hover:bg-gray-100 rounded">
                                <Trash2 className="w-4 h-4 text-red-600" />
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

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">Sections disponibles:</h4>
              <ul className="space-y-1 text-sm text-blue-800">
                <li>• Onglet Valeurs avec tableau Zone d'amortissement</li>
                <li>• Paramètres d'amortissement avec champs détaillés</li>
                <li>• Tableaux d'amortissement avec calculs financiers</li>
                <li>• Suivi des changements avec historique complet</li>
                <li>• Section Comptabilité analytique</li>
              </ul>
            </div>
          </div>
        );

      default:
        return (
          <ModernCard>
            <CardHeader
              title={`Module ${activeModule}`}
              subtitle="En cours de développement"
              icon={Info}
            />
            <CardBody>
              <p className="text-gray-600">
                Ce module est en cours de développement. Les fonctionnalités seront bientôt disponibles.
              </p>
            </CardBody>
          </ModernCard>
        );
    }
  };

  return (
    <div className="space-y-6">
      {getModuleContent()}

      {/* Asset Form Modal */}
      {showNewAssetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 99999, paddingTop: '64px' }}>
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Asset Master Data - Nouvel Actif</h2>
                <button
                  onClick={() => setShowNewAssetModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Asset Info Header */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 p-6">
              <div className="flex items-start space-x-6">
                {/* Photo Section */}
                <div className="flex-shrink-0">
                  <div className="w-32 h-32 bg-white border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-xs text-gray-500">Ajouter photo</p>
                    </div>
                  </div>
                </div>

                {/* Asset Information */}
                <div className="flex-1 grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Capital Appropriation Request Number</label>
                    <p className="text-sm font-semibold text-gray-900">CAR-2024-001</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Asset Number</label>
                    <p className="text-sm font-semibold text-blue-600">235377</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Status</label>
                    <p className="text-sm font-semibold text-green-700">En service</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">UoM Group</label>
                    <p className="text-sm font-semibold text-gray-900">Unité</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Asset Class</label>
                    <p className="text-sm font-semibold text-gray-900">24 - matériel, mobilier</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Asset Category</label>
                    <p className="text-sm font-semibold text-gray-900">Matériel technique</p>
                  </div>
                </div>

                {/* QR Code */}
                <div className="flex-shrink-0">
                  <div className="bg-white border border-gray-300 rounded-lg p-3 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center mx-auto mb-2">
                      <QrCode className="w-8 h-8 text-gray-600" />
                    </div>
                    <p className="text-xs font-medium text-gray-700">QR Code</p>
                    <p className="text-xs text-gray-500">235377</p>
                    <button className="mt-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
                      Générer
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Area with Sidebar */}
            <div className="flex flex-1 overflow-hidden">
              {/* Sidebar */}
              <div className="w-64 bg-gray-50 border-r border-gray-200 p-4">
                <div className="space-y-2">
                  <button
                    onClick={() => setActiveFormSection('general')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeFormSection === 'general'
                        ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-500'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Info className="w-4 h-4 inline mr-2" />
                    Information générale
                  </button>
                  <button
                    onClick={() => setActiveFormSection('acquisition')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeFormSection === 'acquisition'
                        ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-500'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Package className="w-4 h-4 inline mr-2" />
                    Informations acquisition
                  </button>
                  <button
                    onClick={() => setActiveFormSection('immobilisation')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeFormSection === 'immobilisation'
                        ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-500'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Building className="w-4 h-4 inline mr-2" />
                    Immobilisation
                  </button>
                  <button
                    onClick={() => setActiveFormSection('comptabilite')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeFormSection === 'comptabilite'
                        ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-500'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Calculator className="w-4 h-4 inline mr-2" />
                    Comptabilité
                  </button>
                  <button
                    onClick={() => setActiveFormSection('localisation')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeFormSection === 'localisation'
                        ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-500'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Package className="w-4 h-4 inline mr-2" />
                    Localisation
                  </button>
                </div>
              </div>

              {/* Main Content */}
              <div className="flex-1 flex flex-col">
                {/* Form Content - Scrollable */}
                <div className="flex-1 overflow-y-auto p-6">
                {activeFormSection === 'general' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Information générale</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium mb-1">Asset Number *</label>
                        <input
                          type="text"
                          defaultValue="235377"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Ex: 235377"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Description *</label>
                        <input
                          type="text"
                          defaultValue="ARIC TRAVAUX D'ASSAINISSEMENT"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Ex: ARIC TRAVAUX D'ASSAINISSEMENT"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Asset Class *</label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" defaultValue="24">
                          <option value="">-- Select --</option>
                          <option value="24">24 - matériel, mobilier</option>
                          <option value="21">21 - immobilisations corporelles</option>
                          <option value="22">22 - terrains</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Asset Category</label>
                        <input
                          type="text"
                          defaultValue="Matériel technique"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Ex: Matériel technique"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Asset Identification</label>
                        <input
                          type="text"
                          defaultValue="ID-00333"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Ex: ID-00333"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">UoM Group</label>
                        <input
                          type="text"
                          defaultValue="Unité"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Ex: Unité"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Serial Number</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Numéro de série"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Location</label>
                        <input
                          type="text"
                          defaultValue="EMPLACEMENT"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Emplacement"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Quantity</label>
                        <input
                          type="number"
                          defaultValue="1"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeFormSection === 'acquisition' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations acquisition</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium mb-1">Capital Appropriation Request Number</label>
                        <input
                          type="text"
                          defaultValue="CAR-2024-001"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Ex: CAR-2024-001"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Date d'acquisition</label>
                        <input
                          type="date"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Fournisseur</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Nom du fournisseur"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Valeur d'acquisition</label>
                        <input
                          type="number"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Montant en F CFA"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Devise</label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                          <option value="XOF">F CFA</option>
                          <option value="EUR">Euro</option>
                          <option value="USD">Dollar US</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Numéro de facture</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Référence facture"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeFormSection === 'immobilisation' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Immobilisation</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium mb-1">Date de mise en service</label>
                        <input
                          type="date"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Durée d'amortissement (années)</label>
                        <input
                          type="number"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Ex: 5"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Méthode d'amortissement</label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                          <option value="lineaire">Linéaire</option>
                          <option value="degressif">Dégressif</option>
                          <option value="variable">Variable</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Valeur résiduelle</label>
                        <input
                          type="number"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Valeur à la fin"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Centre de coût</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Code centre de coût"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Projet</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Code projet"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeFormSection === 'comptabilite' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Comptabilité</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium mb-1">Compte d'immobilisation</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Ex: 2154"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Compte d'amortissement</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Ex: 28154"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Compte de dotation</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Ex: 68154"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Plan comptable</label>
                        <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                          <option value="syscohada">SYSCOHADA</option>
                          <option value="pcg">PCG</option>
                          <option value="ifrs">IFRS</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Société</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Code société"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Affectation analytique</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Code analytique"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeFormSection === 'localisation' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Localisation</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium mb-1">Site</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Site principal"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Bâtiment</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Nom du bâtiment"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Étage</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Numéro d'étage"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Bureau/Salle</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Numéro de bureau"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Responsable</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Nom du responsable"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Service</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Service ou département"
                        />
                      </div>
                    </div>
                  </div>
                )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200">
                <div className="flex justify-between">
                  <div className="flex space-x-2">
                    {activeFormSection !== 'general' && (
                      <ModernButton variant="outline" onClick={() => {
                        const sections = ['general', 'acquisition', 'immobilisation', 'comptabilite', 'localisation'];
                        const currentIndex = sections.indexOf(activeFormSection);
                        if (currentIndex > 0) setActiveFormSection(sections[currentIndex - 1]);
                      }}>
                        Précédent
                      </ModernButton>
                    )}
                    {activeFormSection !== 'localisation' && (
                      <ModernButton variant="outline" onClick={() => {
                        const sections = ['general', 'acquisition', 'immobilisation', 'comptabilite', 'localisation'];
                        const currentIndex = sections.indexOf(activeFormSection);
                        if (currentIndex < sections.length - 1) setActiveFormSection(sections[currentIndex + 1]);
                      }}>
                        Suivant
                      </ModernButton>
                    )}
                  </div>
                  <div className="flex space-x-3">
                    <ModernButton variant="outline" onClick={() => setShowNewAssetModal(false)}>
                      Annuler
                    </ModernButton>
                    <ModernButton variant="primary" onClick={() => setShowNewAssetModal(false)}>
                      Créer l'actif
                    </ModernButton>
                  </div>
                </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};