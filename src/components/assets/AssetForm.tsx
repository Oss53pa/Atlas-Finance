import React, { useState } from 'react';
import {
  X, Camera, Info, Package, Shield, FileText, MapPin,
  Calendar, User, DollarSign, Building2, Tag, Hash,
  ChevronRight, AlertTriangle, CheckCircle
} from 'lucide-react';

interface AssetFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  mode: 'create' | 'edit';
  initialData?: any;
}

const AssetForm: React.FC<AssetFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  mode = 'create',
  initialData = {}
}) => {
  const [activeTab, setActiveTab] = useState('general');
  const [activeGeneralTab, setActiveGeneralTab] = useState('basic');
  const [formData, setFormData] = useState({
    // Basic Info
    description: '',
    asset_number: '',
    status: 'en_service',
    category: '',
    acquisition_cost: '',
    current_value: '',
    location: '',

    // Material Data
    material_data: '',
    additional_identifier: '',
    shipping_type: '',
    batch_numbers: '',
    managed_by: '',
    disposal_method: '',

    // Warranty
    warranty_period: '',
    warranty_unit: 'months',
    warranty_terms: '',
    warranty_start: '',
    warranty_end: '',
    warranty_provider: '',

    // Insurance
    insurance_provider: '',
    insurance_policy_number: '',
    insurance_coverage_amount: '',
    insurance_premium: '',
    insurance_expiration: '',
    policy_type: '',

    // Location
    building_name: '',
    floor: '',
    room: '',
    department: '',
    zoning: '',
    unit: '',
    gps_latitude: '',
    gps_longitude: '',
    location_address: '',

    ...initialData
  });

  const handleSubmit = () => {
    onSubmit(formData);
  };

  const generalTabs = [
    { id: 'basic', label: 'Actif Info', icon: Info },
    { id: 'material', label: 'Material Data', icon: Package },
    { id: 'warranty', label: 'Warranty', icon: Shield },
    { id: 'insurance', label: 'Insurance', icon: FileText },
    { id: 'location', label: 'Location', icon: MapPin }
  ];

  // Debug temporaire
  console.log('AssetForm render:', { isOpen, mode, activeGeneralTab });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-xl w-[90%] max-w-6xl h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gradient-to-r from-[#6A8A82] to-[#B87333] text-white rounded-t-xl">
          <h2 className="text-2xl font-bold">
            {mode === 'create' ? 'Nouvel Actif' : 'Modifier l\'Actif'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors" aria-label="Fermer">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Sidebar + Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 bg-gray-50 border-r p-4">
            <nav className="space-y-2">
              <button
                onClick={() => setActiveTab('general')}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 ${
                  activeTab === 'general'
                    ? 'bg-[#6A8A82] text-white'
                    : 'hover:bg-gray-200 text-gray-700'
                }`}
              >
                <Info className="w-5 h-5" />
                Information générale
              </button>
              <button
                onClick={() => setActiveTab('acquisition')}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 ${
                  activeTab === 'acquisition'
                    ? 'bg-[#6A8A82] text-white'
                    : 'hover:bg-gray-200 text-gray-700'
                }`}
              >
                <DollarSign className="w-5 h-5" />
                Informations acquisition
              </button>
              <button
                onClick={() => setActiveTab('immobilisation')}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center gap-3 ${
                  activeTab === 'immobilisation'
                    ? 'bg-[#6A8A82] text-white'
                    : 'hover:bg-gray-200 text-gray-700'
                }`}
              >
                <Building2 className="w-5 h-5" />
                Immobilisation
              </button>
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'general' && (
              <div className="space-y-6">
                {/* Horizontal Tabs */}
                <div className="border-b border-gray-200">
                  <nav className="flex space-x-8">
                    {generalTabs.map((tab) => {
                      const IconComponent = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => {
                            console.log('Clicking tab:', tab.id);
                            setActiveGeneralTab(tab.id);
                          }}
                          className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
                            activeGeneralTab === tab.id
                              ? 'border-[#6A8A82] text-[#6A8A82]'
                              : 'border-transparent text-gray-700 hover:text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          <IconComponent className="w-4 h-4" />
                          {tab.label}
                          {activeGeneralTab === tab.id && <span className="text-xs">✓</span>}
                        </button>
                      );
                    })}
                  </nav>
                </div>

                {/* Tab Content */}
                <div className="mt-6">
                  {/* Debug info - À retirer après test */}
                  <div className="text-sm text-gray-600 mb-2 p-2 bg-blue-50 border border-blue-200 rounded">
                    🔍 Debug: Onglet actif = "{activeGeneralTab}" | Les onglets Material Data, Warranty, Insurance et Location devraient s'afficher quand vous cliquez dessus
                  </div>

                  {/* Test simple pour vérifier le rendu */}
                  {activeGeneralTab === 'material' && (
                    <div className="p-4 bg-red-100 border-2 border-red-500">
                      <h1 className="text-2xl font-bold text-red-700">MATERIAL DATA TAB IS ACTIVE!</h1>
                    </div>
                  )}
                  {activeGeneralTab === 'warranty' && (
                    <div className="p-4 bg-blue-100 border-2 border-blue-500">
                      <h1 className="text-2xl font-bold text-blue-700">WARRANTY TAB IS ACTIVE!</h1>
                    </div>
                  )}
                  {activeGeneralTab === 'insurance' && (
                    <div className="p-4 bg-green-100 border-2 border-green-500">
                      <h1 className="text-2xl font-bold text-green-700">INSURANCE TAB IS ACTIVE!</h1>
                    </div>
                  )}
                  {activeGeneralTab === 'location' && (
                    <div className="p-4 bg-purple-100 border-2 border-purple-500">
                      <h1 className="text-2xl font-bold text-purple-700">LOCATION TAB IS ACTIVE!</h1>
                    </div>
                  )}

                  {/* Basic Info Tab */}
                  {activeGeneralTab === 'basic' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium mb-1">Description *</label>
                        <input
                          type="text"
                          value={formData.description}
                          onChange={(e) => setFormData({...formData, description: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                          placeholder="Description de l'actif"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Numéro d'actif</label>
                        <input
                          type="text"
                          value={formData.asset_number}
                          onChange={(e) => setFormData({...formData, asset_number: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                          placeholder="Ex: AST-2024-001"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Statut</label>
                        <select
                          value={formData.status}
                          onChange={(e) => setFormData({...formData, status: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                        >
                          <option value="en_service">En service</option>
                          <option value="maintenance">En maintenance</option>
                          <option value="hors_service">Hors service</option>
                          <option value="reforme">Réformé</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Material Data Tab */}
                  {activeGeneralTab === 'material' && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Package className="w-5 h-5 mr-2 text-[#6A8A82]" />
                        Material Data - Informations sur le matériel
                      </h3>
                      <p className="text-red-600 font-bold">CONTENU DE L'ONGLET MATERIAL DATA</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium mb-1">Material Data</label>
                          <input
                            type="text"
                            value={formData.material_data}
                            onChange={(e) => setFormData({...formData, material_data: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                            placeholder="Données matérielles"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Additional Identifier</label>
                          <input
                            type="text"
                            value={formData.additional_identifier}
                            onChange={(e) => setFormData({...formData, additional_identifier: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                            placeholder="Identifiant additionnel"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Shipping Type</label>
                          <select
                            value={formData.shipping_type}
                            onChange={(e) => setFormData({...formData, shipping_type: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                          >
                            <option value="">-- Sélectionnez --</option>
                            <option value="maritime">Maritime</option>
                            <option value="aerien">Aérien</option>
                            <option value="routier">Routier</option>
                            <option value="ferroviaire">Ferroviaire</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Batch Numbers</label>
                          <input
                            type="text"
                            value={formData.batch_numbers}
                            onChange={(e) => setFormData({...formData, batch_numbers: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                            placeholder="Numéros de lot"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Managed By</label>
                          <input
                            type="text"
                            value={formData.managed_by}
                            onChange={(e) => setFormData({...formData, managed_by: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                            placeholder="Géré par"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Disposal Method</label>
                          <select
                            value={formData.disposal_method}
                            onChange={(e) => setFormData({...formData, disposal_method: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                          >
                            <option value="">-- Sélectionnez --</option>
                            <option value="vente">Vente</option>
                            <option value="don">Don</option>
                            <option value="destruction">Destruction</option>
                            <option value="recyclage">Recyclage</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Warranty Tab */}
                  {activeGeneralTab === 'warranty' && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Shield className="w-5 h-5 mr-2 text-[#6A8A82]" />
                        Warranty Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium mb-1">Warranty Period</label>
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              value={formData.warranty_period}
                              onChange={(e) => setFormData({...formData, warranty_period: e.target.value})}
                              className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                              placeholder="12"
                            />
                            <select
                              value={formData.warranty_unit}
                              onChange={(e) => setFormData({...formData, warranty_unit: e.target.value})}
                              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                            >
                              <option value="days">Jours</option>
                              <option value="months">Mois</option>
                              <option value="years">Années</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Warranty Provider</label>
                          <input
                            type="text"
                            value={formData.warranty_provider}
                            onChange={(e) => setFormData({...formData, warranty_provider: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                            placeholder="Nom du fournisseur de garantie"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Start Date</label>
                          <input
                            type="date"
                            value={formData.warranty_start}
                            onChange={(e) => setFormData({...formData, warranty_start: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">End Date</label>
                          <input
                            type="date"
                            value={formData.warranty_end}
                            onChange={(e) => setFormData({...formData, warranty_end: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium mb-1">Terms & Conditions</label>
                          <textarea
                            value={formData.warranty_terms}
                            onChange={(e) => setFormData({...formData, warranty_terms: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                            rows={3}
                            placeholder="Conditions de garantie..."
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Insurance Tab */}
                  {activeGeneralTab === 'insurance' && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <FileText className="w-5 h-5 mr-2 text-[#6A8A82]" />
                        Insurance Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium mb-1">Insurance Provider</label>
                          <input
                            type="text"
                            value={formData.insurance_provider}
                            onChange={(e) => setFormData({...formData, insurance_provider: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                            placeholder="Nom de la compagnie d'assurance"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Policy Number</label>
                          <input
                            type="text"
                            value={formData.insurance_policy_number}
                            onChange={(e) => setFormData({...formData, insurance_policy_number: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                            placeholder="Numéro de police"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Coverage Amount</label>
                          <input
                            type="number"
                            value={formData.insurance_coverage_amount}
                            onChange={(e) => setFormData({...formData, insurance_coverage_amount: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                            placeholder="Montant de couverture"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Premium</label>
                          <input
                            type="number"
                            value={formData.insurance_premium}
                            onChange={(e) => setFormData({...formData, insurance_premium: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                            placeholder="Prime d'assurance"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Policy Type</label>
                          <select
                            value={formData.policy_type}
                            onChange={(e) => setFormData({...formData, policy_type: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                          >
                            <option value="">-- Sélectionnez --</option>
                            <option value="tous_risques">Tous risques</option>
                            <option value="responsabilite">Responsabilité</option>
                            <option value="dommages">Dommages</option>
                            <option value="vol">Vol</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Expiration Date</label>
                          <input
                            type="date"
                            value={formData.insurance_expiration}
                            onChange={(e) => setFormData({...formData, insurance_expiration: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Location Tab */}
                  {activeGeneralTab === 'location' && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <MapPin className="w-5 h-5 mr-2 text-[#6A8A82]" />
                        Location - Emplacement de l'actif
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium mb-1">Building/Location Name</label>
                          <input
                            type="text"
                            value={formData.building_name}
                            onChange={(e) => setFormData({...formData, building_name: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                            placeholder="Ex: Siège social"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Floor</label>
                          <input
                            type="text"
                            value={formData.floor}
                            onChange={(e) => setFormData({...formData, floor: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                            placeholder="Ex: 2ème étage"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Room/Office</label>
                          <input
                            type="text"
                            value={formData.room}
                            onChange={(e) => setFormData({...formData, room: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                            placeholder="Ex: Bureau 201"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Department</label>
                          <input
                            type="text"
                            value={formData.department}
                            onChange={(e) => setFormData({...formData, department: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                            placeholder="Ex: Comptabilité"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Zone/Unit</label>
                          <input
                            type="text"
                            value={formData.unit}
                            onChange={(e) => setFormData({...formData, unit: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                            placeholder="Ex: Zone A"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Zoning</label>
                          <input
                            type="text"
                            value={formData.zoning}
                            onChange={(e) => setFormData({...formData, zoning: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                            placeholder="Ex: Zone industrielle"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium mb-1">Address</label>
                          <textarea
                            value={formData.location_address}
                            onChange={(e) => setFormData({...formData, location_address: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                            rows={2}
                            placeholder="Adresse complète..."
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">GPS Latitude</label>
                          <input
                            type="text"
                            value={formData.gps_latitude}
                            onChange={(e) => setFormData({...formData, gps_latitude: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                            placeholder="Ex: 48.8566"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">GPS Longitude</label>
                          <input
                            type="text"
                            value={formData.gps_longitude}
                            onChange={(e) => setFormData({...formData, gps_longitude: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#6A8A82]"
                            placeholder="Ex: 2.3522"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#5A7A72] transition-colors flex items-center gap-2" aria-label="Valider">
            <CheckCircle className="w-5 h-5" />
            {mode === 'create' ? 'Créer l\'actif' : 'Enregistrer les modifications'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssetForm;