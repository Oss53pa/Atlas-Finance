import React, { useState } from 'react';
import {
  Camera, QrCode, Info, DollarSign, Building, TrendingDown,
  Package, Wrench, FileText, Edit, MapPin, User, Tag,
  Calendar, Users, Calculator, Shield, Brain, Wifi
} from 'lucide-react';

interface AssetFormCompleteProps {
  onClose?: () => void;
  onSave?: (data: any) => void;
}

const AssetFormComplete: React.FC<AssetFormCompleteProps> = ({ onClose, onSave }) => {
  const [activeFormTab, setActiveFormTab] = useState('general');
  const [activeGeneralTab, setActiveGeneralTab] = useState('identification');
  const [activeImmobilisationTab, setActiveImmobilisationTab] = useState('financial');

  const [newAssetForm, setNewAssetForm] = useState({
    asset_number: '',
    description: '',
    asset_class: '',
    asset_category: '',
    asset_identification: '',
    uom_group: '',
    capital_appropriation_number: '',
    location: '',
    technician: '',
    employee: '',
    capitalization_date: '',
    acquisition_date: '',
    warranty_end: '',
    last_inventory: '',
    acquisition_cost: 0,
    historical_apc: 0,
    net_book_value: 0,
    salvage_value: 0,
    serial_number: '',
    vendor_name: '',
    vendor_contact: '',
    purchase_order_number: '',
    document_number: '',
    // Additional fields
    material_data: '',
    additional_identifier: '',
    shipping_type: '',
    batch_numbers: '',
    managed_by: '',
    disposal_method: '',
    asset_id: '',
    asset_description: '',
    acquisition_value: '',
    cumulated_depreciation: ''
  });

  const handleSave = () => {
    if (onSave) {
      onSave(newAssetForm);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header with Photo and Asset Info */}
      <div className="bg-gradient-to-r from-[#D5D0CD]/10 to-[#6A8A82]/10 border-b border-[#D5D0CD] p-6">
        <div className="flex items-start space-x-6">
          {/* Photo Section */}
          <div className="flex-shrink-0">
            <div className="w-32 h-32 bg-white border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center group hover:border-[#6A8A82]/40 transition-colors cursor-pointer">
              <div className="text-center">
                <Camera className="w-8 h-8 text-gray-700 mx-auto mb-2 group-hover:text-[#6A8A82]" />
                <p className="text-xs text-gray-700 group-hover:text-[#6A8A82]">Ajouter photo</p>
              </div>
            </div>
          </div>

          {/* Asset Information Grid */}
          <div className="flex-1">
            <div className="grid grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-3">
              <div>
                <label className="text-xs font-medium text-gray-700 uppercase tracking-wide">Capital Appropriation Request Number</label>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">
                  {newAssetForm.capital_appropriation_number || 'CAR-2024-001'}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 uppercase tracking-wide">Asset Number</label>
                <p className="text-sm font-semibold text-[#6A8A82] mt-0.5">
                  {newAssetForm.asset_number || '235377'}
                </p>
              </div>
              <div className="lg:col-span-3 flex items-start gap-4">
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-700 uppercase tracking-wide">Description</label>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5 leading-tight">
                    {newAssetForm.description || 'ARIC TRAVAUX D\'ASSAINISSEMENT'}
                  </p>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <div>
                    <label className="text-xs font-medium text-gray-700 uppercase tracking-wide">Status</label>
                    <p className="text-sm font-semibold text-green-700">En service</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* QR Code Section */}
          <div className="flex-shrink-0">
            <div className="bg-white border border-gray-300 rounded-lg p-3 text-center shadow-sm">
              <div className="w-16 h-16 bg-gray-100 border border-gray-200 rounded flex items-center justify-center mx-auto mb-2">
                <QrCode className="w-8 h-8 text-gray-600" />
              </div>
              <p className="text-xs font-medium text-gray-700">QR Code</p>
              <p className="text-xs text-gray-700 mt-1">{newAssetForm.asset_number || '235377'}</p>
              <button className="mt-1 text-xs text-[#6A8A82] hover:text-[#5A7A72] font-medium">
                Générer
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Layout avec Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <div className="w-64 bg-gray-50 border-r border-gray-200 overflow-y-auto">
          <nav className="p-4 space-y-2">
            {[
              { id: 'general', label: 'Information générale', icon: Info },
              { id: 'acquisition', label: 'Informations acquisition', icon: DollarSign },
              { id: 'immobilisation', label: 'Immobilisation', icon: Building },
              { id: 'vente', label: 'Données de vente', icon: TrendingDown },
              { id: 'composants', label: 'Composants', icon: Package },
              { id: 'maintenance', label: 'Données de maintenance', icon: Wrench },
              { id: 'attachements', label: 'Attachements', icon: FileText },
              { id: 'notes', label: 'Notes', icon: Edit }
            ].map((section) => {
              const IconComponent = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveFormTab(section.id)}
                  className={`w-full flex items-center px-3 py-2 text-left rounded-lg transition-colors ${
                    activeFormTab === section.id
                      ? 'bg-[#6A8A82]/20 text-[#5A7A72] font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <IconComponent className="w-5 h-5 mr-3 flex-shrink-0" />
                  <span className="text-sm">{section.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* General Information Tab */}
          {activeFormTab === 'general' && (
            <div className="space-y-8">
              {/* Sub-tabs for General Information */}
              <div className="flex space-x-6 border-b border-gray-200 pb-2">
                {[
                  { id: 'identification', label: 'Identification' },
                  { id: 'location', label: 'Location' },
                  { id: 'material', label: 'Material Data' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveGeneralTab(tab.id)}
                    className={`pb-2 px-1 text-sm font-medium transition-colors relative ${
                      activeGeneralTab === tab.id
                        ? 'text-[#6A8A82] border-b-2 border-[#6A8A82]'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Identification Tab */}
              {activeGeneralTab === 'identification' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Info className="w-5 h-5 mr-2 text-[#6A8A82]" />
                      Informations d'Identification
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium mb-1">Numéro de l'actif *</label>
                        <input
                          type="text"
                          value={newAssetForm.asset_number}
                          onChange={(e) => setNewAssetForm({...newAssetForm, asset_number: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="235377"
                        />
                      </div>
                      <div className="lg:col-span-2">
                        <label className="block text-sm font-medium mb-1">Description *</label>
                        <input
                          type="text"
                          value={newAssetForm.description}
                          onChange={(e) => setNewAssetForm({...newAssetForm, description: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Description de l'actif"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Classe d'actif *</label>
                        <select
                          value={newAssetForm.asset_class}
                          onChange={(e) => setNewAssetForm({...newAssetForm, asset_class: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">-- Sélectionnez --</option>
                          <option value="24 - matériel, mobilier">24 - matériel, mobilier</option>
                          <option value="21 - immobilisations corporelles">21 - immobilisations corporelles</option>
                          <option value="22 - immobilisations incorporelles">22 - immobilisations incorporelles</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Catégorie d'actif</label>
                        <select
                          value={newAssetForm.asset_category}
                          onChange={(e) => setNewAssetForm({...newAssetForm, asset_category: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">-- Sélectionnez --</option>
                          <option value="Matériel technique">Matériel technique</option>
                          <option value="Matériel informatique">Matériel informatique</option>
                          <option value="Mobilier de bureau">Mobilier de bureau</option>
                          <option value="Véhicules">Véhicules</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Identification de l'actif</label>
                        <input
                          type="text"
                          value={newAssetForm.asset_identification}
                          onChange={(e) => setNewAssetForm({...newAssetForm, asset_identification: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="ID-00333"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Location Tab */}
              {activeGeneralTab === 'location' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <MapPin className="w-5 h-5 mr-2 text-[#6A8A82]" />
                      Localisation et Assignation
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium mb-1">Emplacement *</label>
                        <input
                          type="text"
                          value={newAssetForm.location}
                          onChange={(e) => setNewAssetForm({...newAssetForm, location: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Localisation de l'actif"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Technicien responsable</label>
                        <select
                          value={newAssetForm.technician}
                          onChange={(e) => setNewAssetForm({...newAssetForm, technician: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">-- Sélectionnez --</option>
                          <option value="Jean Dupont">Jean Dupont</option>
                          <option value="Marie Martin">Marie Martin</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Employé assigné</label>
                        <select
                          value={newAssetForm.employee}
                          onChange={(e) => setNewAssetForm({...newAssetForm, employee: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">-- Sélectionnez --</option>
                          <option value="Paul Durand">Paul Durand</option>
                          <option value="Sophie Petit">Sophie Petit</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Material Data Tab */}
              {activeGeneralTab === 'material' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Package className="w-5 h-5 mr-2 text-[#6A8A82]" />
                      Material Data
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium mb-1">Material Data</label>
                        <input
                          type="text"
                          value={newAssetForm.material_data || ''}
                          onChange={(e) => setNewAssetForm({...newAssetForm, material_data: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Données matérielles"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Serial Number</label>
                        <input
                          type="text"
                          value={newAssetForm.serial_number}
                          onChange={(e) => setNewAssetForm({...newAssetForm, serial_number: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Numéro de série"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Batch Numbers</label>
                        <input
                          type="text"
                          value={newAssetForm.batch_numbers || ''}
                          onChange={(e) => setNewAssetForm({...newAssetForm, batch_numbers: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Numéros de lot"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Acquisition Information Tab */}
          {activeFormTab === 'acquisition' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Users className="w-5 h-5 mr-2 text-[#6A8A82]" />
                  Vendor/Supplier Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-1">Vendor Name *</label>
                    <input
                      type="text"
                      value={newAssetForm.vendor_name || ''}
                      onChange={(e) => setNewAssetForm({...newAssetForm, vendor_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Nom du fournisseur"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Purchase Order Number *</label>
                    <input
                      type="text"
                      value={newAssetForm.purchase_order_number || ''}
                      onChange={(e) => setNewAssetForm({...newAssetForm, purchase_order_number: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="N° bon de commande"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Acquisition Date *</label>
                    <input
                      type="date"
                      value={newAssetForm.acquisition_date || ''}
                      onChange={(e) => setNewAssetForm({...newAssetForm, acquisition_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Acquisition Cost *</label>
                    <div className="flex items-center">
                      <input
                        type="number"
                        value={newAssetForm.acquisition_cost || ''}
                        onChange={(e) => setNewAssetForm({...newAssetForm, acquisition_cost: Number(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="1000000"
                      />
                      <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg">XAF</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Immobilisation Tab */}
          {activeFormTab === 'immobilisation' && (
            <div className="space-y-8">
              {/* Sub-tabs for Immobilisation */}
              <div className="flex space-x-6 border-b border-gray-200 pb-2">
                {[
                  { id: 'financial', label: 'Financial Information' },
                  { id: 'depreciation', label: 'Depreciation Parameters' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveImmobilisationTab(tab.id)}
                    className={`pb-2 px-1 text-sm font-medium transition-colors relative ${
                      activeImmobilisationTab === tab.id
                        ? 'text-[#6A8A82] border-b-2 border-[#6A8A82]'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Financial Information */}
              {activeImmobilisationTab === 'financial' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Calculator className="w-5 h-5 mr-2 text-[#6A8A82]" />
                    Informations Financières
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium mb-1">Valeur d'acquisition</label>
                      <div className="flex items-center">
                        <input
                          type="number"
                          value={newAssetForm.acquisition_value || ''}
                          onChange={(e) => setNewAssetForm({...newAssetForm, acquisition_value: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="1000000"
                        />
                        <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg">XAF</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Valeur comptable nette</label>
                      <div className="flex items-center">
                        <input
                          type="number"
                          value={newAssetForm.net_book_value || ''}
                          onChange={(e) => setNewAssetForm({...newAssetForm, net_book_value: Number(e.target.value)})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="800000"
                        />
                        <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg">XAF</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Valeur résiduelle</label>
                      <div className="flex items-center">
                        <input
                          type="number"
                          value={newAssetForm.salvage_value || ''}
                          onChange={(e) => setNewAssetForm({...newAssetForm, salvage_value: Number(e.target.value)})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="100000"
                        />
                        <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg">XAF</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Depreciation Parameters */}
              {activeImmobilisationTab === 'depreciation' && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Paramètres de dépréciation</h3>
                  <p className="text-gray-600">Configuration des méthodes et taux d'amortissement.</p>
                </div>
              )}
            </div>
          )}

          {/* Other Tabs - Placeholder Content */}
          {activeFormTab === 'vente' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Données de vente</h3>
              <p className="text-gray-600">Informations relatives à la vente ou cession de l'actif.</p>
            </div>
          )}

          {activeFormTab === 'composants' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Composants</h3>
              <p className="text-gray-600">Liste des composants et pièces de l'actif.</p>
            </div>
          )}

          {activeFormTab === 'maintenance' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Données de maintenance</h3>
              <p className="text-gray-600">Historique et planification des maintenances.</p>
            </div>
          )}

          {activeFormTab === 'attachements' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Attachements</h3>
              <p className="text-gray-600">Documents et fichiers associés à l'actif.</p>
            </div>
          )}

          {activeFormTab === 'notes' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Notes</h3>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={6}
                placeholder="Notes et observations..."
              />
            </div>
          )}
        </div>
      </div>

      {/* Footer with Actions */}
      <div className="border-t border-gray-200 p-6 bg-gray-50">
        <div className="flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#5A7A72] transition-colors"
          >
            Créer l'actif
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssetFormComplete;