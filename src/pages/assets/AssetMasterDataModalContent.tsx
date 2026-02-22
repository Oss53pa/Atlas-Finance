              {/* Header with Photo and Asset Info */}
              <div className="bg-gradient-to-r from-[#e5e5e5]/10 to-[#171717]/10 border-b border-[#e5e5e5] p-6">
                <div className="flex items-start space-x-6">
                  {/* Photo Section */}
                  <div className="flex-shrink-0">
                    <div className="w-32 h-32 bg-white border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center group hover:border-[#171717]/40 transition-colors cursor-pointer">
                      <div className="text-center">
                        <Camera className="w-8 h-8 text-gray-700 mx-auto mb-2 group-hover:text-[#171717]" />
                        <p className="text-xs text-gray-700 group-hover:text-[#171717]">Ajouter photo</p>
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
                        <p className="text-sm font-semibold text-[#171717] mt-0.5">
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
                      <button className="mt-1 text-xs text-[#171717] hover:text-[#262626] font-medium">
                        Générer
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Layout avec Sidebar */}
              <div className="flex h-[60vh]">
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
                              ? 'bg-[#171717]/20 text-[#262626] font-medium'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <IconComponent className="w-4 h-4 mr-3" />
                          <span className="text-sm">{section.label}</span>
                        </button>
                      );
                    })}
                  </nav>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6">
                  {/* Onglet General Information */}
                  {activeFormTab === 'general' && (
                    <div className="space-y-6">
                      {/* Horizontal Tabs for General Information */}
                      <div className="border-b border-gray-200">
                        <nav className="flex space-x-8">
                          {[
                            { id: 'basic', label: 'Actif Info', icon: Info },
                            { id: 'material', label: 'Material Data', icon: Package },
                            { id: 'warranty', label: 'Warranty', icon: Shield },
                            { id: 'insurance', label: 'Insurance', icon: FileText },
                            { id: 'location', label: 'Location', icon: MapPin }
                          ].map((tab) => {
                            const IconComponent = tab.icon;
                            return (
                              <button
                                key={tab.id}
                                onClick={() => setActiveGeneralTab(tab.id)}
                                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                                  activeGeneralTab === tab.id
                                    ? 'border-[#171717] text-[#171717]'
                                    : 'border-transparent text-gray-700 hover:text-gray-700 hover:border-gray-300'
                                }`}
                              >
                                <IconComponent className="w-4 h-4 mr-2" />
                                {tab.label}
                              </button>
                            );
                          })}
                        </nav>
                      </div>

                      {/* Tab Content */}
                      <div className="mt-6">
                        {/* Basic Info Tab */}
                        {activeGeneralTab === 'basic' && (
                          <div className="space-y-8">
                            {/* Section principale */}
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <Info className="w-5 h-5 mr-2 text-[#171717]" />
                                Informations de base
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div>
                                  <label className="block text-sm font-medium mb-1">Asset Number *</label>
                                  <input
                                    type="text"
                                    value={newAssetForm.asset_number}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, asset_number: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="Ex: 235377"
                                  />
                                </div>
                                <div className="lg:col-span-2">
                                  <label className="block text-sm font-medium mb-1">Description *</label>
                                  <input
                                    type="text"
                                    value={newAssetForm.description}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, description: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="Ex: ARIC TRAVAUX D'ASSAINISSEMENT"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                                    Asset Class *
                                    {capitationData && (
                                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center gap-1">
                                        <Brain className="w-3 h-3" />
                                        Auto-rempli
                                      </span>
                                    )}
                                  </label>
                                  <select
                                    value={newAssetForm.asset_class}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, asset_class: e.target.value})}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                                      capitationData?.asset_class ? 'border-green-300 bg-green-50' : 'border-gray-300'
                                    }`}
                                    disabled={!!capitationData?.asset_class}
                                  >
                                    <option value="">-- Select --</option>
                                    <option value="21 - équipement informatique">21 - équipement informatique</option>
                                    <option value="22 - équipement médical">22 - équipement médical</option>
                                    <option value="23 - véhicules">23 - véhicules</option>
                                    <option value="24 - matériel, mobilier">24 - matériel, mobilier</option>
                                    <option value="25 - immobilisations incorporelles">25 - immobilisations incorporelles</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium mb-1">Asset Category</label>
                                  <select
                                    value={newAssetForm.asset_category}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, asset_category: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="">-- Sélectionnez --</option>
                                    <option value="Matériel technique">Matériel technique</option>
                                    <option value="Équipement bureau">Équipement bureau</option>
                                    <option value="Véhicule léger">Véhicule léger</option>
                                    <option value="Matériel industriel">Matériel industriel</option>
                                  </select>
                                </div>

                                {/* Tax liable */}
                                <div>
                                  <label className="block text-sm font-medium mb-1">Tax Liable</label>
                                  <select
                                    value={newAssetForm.tax_liable || 'yes'}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, tax_liable: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="yes">Oui - Assujetti</option>
                                    <option value="no">Non - Exonéré</option>
                                    <option value="partial">Partiellement</option>
                                  </select>
                                </div>

                                {/* Filter by */}
                                <div>
                                  <label className="block text-sm font-medium mb-1">Filter By</label>
                                  <select
                                    value={newAssetForm.filter_by || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, filter_by: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="">-- Tous --</option>
                                    <option value="department">Par département</option>
                                    <option value="location">Par localisation</option>
                                    <option value="category">Par catégorie</option>
                                    <option value="status">Par statut</option>
                                  </select>
                                </div>

                                {/* Active Status */}
                                <div>
                                  <label className="block text-sm font-medium mb-1">Statut Actif</label>
                                  <div className="flex items-center space-x-4 mt-2">
                                    <label className="flex items-center">
                                      <input
                                        type="radio"
                                        name="active_status"
                                        value="active"
                                        checked={newAssetForm.active_status === 'active'}
                                        onChange={(e) => setNewAssetForm({...newAssetForm, active_status: e.target.value})}
                                        className="mr-2 text-[#171717] focus:ring-blue-500"
                                      />
                                      <span className="flex items-center">
                                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                                        Actif
                                      </span>
                                    </label>
                                    <label className="flex items-center">
                                      <input
                                        type="radio"
                                        name="active_status"
                                        value="inactive"
                                        checked={newAssetForm.active_status === 'inactive'}
                                        onChange={(e) => setNewAssetForm({...newAssetForm, active_status: e.target.value})}
                                        className="mr-2 text-[#171717] focus:ring-blue-500"
                                      />
                                      <span className="flex items-center">
                                        <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                                        Inactif
                                      </span>
                                    </label>
                                  </div>
                                </div>
                              </div>
                            </div>

                          </div>
                        )}

                        {/* Warranty Tab */}
                        {activeGeneralTab === 'warranty' && (
                          <div className="space-y-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                              <Shield className="w-5 h-5 mr-2 text-[#171717]" />
                              Warranty Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <label className="block text-sm font-medium mb-1">Warranty Period</label>
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="number"
                                    value={newAssetForm.warranty_period || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, warranty_period: e.target.value})}
                                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="12"
                                  />
                                  <select
                                    value={newAssetForm.warranty_unit || 'months'}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, warranty_unit: e.target.value})}
                                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="days">Jours</option>
                                    <option value="months">Mois</option>
                                    <option value="years">Années</option>
                                  </select>
                                </div>
                              </div>

                              <div>
                                <label className="block text-sm font-medium mb-1">Terms and Conditions</label>
                                <textarea
                                  value={newAssetForm.warranty_terms || ''}
                                  onChange={(e) => setNewAssetForm({...newAssetForm, warranty_terms: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  rows={3}
                                  placeholder="Conditions de garantie..."
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium mb-1">Warranty Start Date</label>
                                <input
                                  type="date"
                                  value={newAssetForm.warranty_start || ''}
                                  onChange={(e) => setNewAssetForm({...newAssetForm, warranty_start: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium mb-1">Warranty End Date</label>
                                <input
                                  type="date"
                                  value={newAssetForm.warranty_end || ''}
                                  onChange={(e) => setNewAssetForm({...newAssetForm, warranty_end: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                              </div>

                              <div className="md:col-span-2">
                                <label className="block text-sm font-medium mb-1">Warranty Provider</label>
                                <input
                                  type="text"
                                  value={newAssetForm.warranty_provider || ''}
                                  onChange={(e) => setNewAssetForm({...newAssetForm, warranty_provider: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="Nom du fournisseur de garantie"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Insurance Tab */}
                        {activeGeneralTab === 'insurance' && (
                          <div className="space-y-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                              <FileText className="w-5 h-5 mr-2 text-[#171717]" />
                              Insurance Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <label className="block text-sm font-medium mb-1">Insurance Provider</label>
                                <input
                                  type="text"
                                  value={newAssetForm.insurance_provider || ''}
                                  onChange={(e) => setNewAssetForm({...newAssetForm, insurance_provider: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="Nom de la compagnie d'assurance"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium mb-1">Policy Details</label>
                                <input
                                  type="text"
                                  value={newAssetForm.policy_details || ''}
                                  onChange={(e) => setNewAssetForm({...newAssetForm, policy_details: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="Numéro de police"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium mb-1">Coverage Amount</label>
                                <div className="flex items-center">
                                  <input
                                    type="number"
                                    value={newAssetForm.coverage_amount || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, coverage_amount: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="1000000"
                                  />
                                  <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg">
                                    XAF
                                  </span>
                                </div>
                              </div>

                              <div>
                                <label className="block text-sm font-medium mb-1">Expiration Date</label>
                                <input
                                  type="date"
                                  value={newAssetForm.insurance_expiration || ''}
                                  onChange={(e) => setNewAssetForm({...newAssetForm, insurance_expiration: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="jj/mm/aaaa"
                                />
                              </div>

                              <div className="md:col-span-2">
                                <label className="block text-sm font-medium mb-1">Policy Type</label>
                                <select
                                  value={newAssetForm.policy_type || ''}
                                  onChange={(e) => setNewAssetForm({...newAssetForm, policy_type: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="">-- Sélectionnez --</option>
                                  <option value="tous_risques">Tous risques</option>
                                  <option value="responsabilite">Responsabilité civile</option>
                                  <option value="dommages">Dommages matériels</option>
                                  <option value="vol">Vol et vandalisme</option>
                                  <option value="incendie">Incendie</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Location Tab */}
                        {activeGeneralTab === 'location' && (
                          <div className="space-y-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                              <MapPin className="w-5 h-5 mr-2 text-[#171717]" />
                              Current Location
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <label className="block text-sm font-medium mb-1">Building/Location Name</label>
                                <input
                                  type="text"
                                  value={newAssetForm.building_name || ''}
                                  onChange={(e) => setNewAssetForm({...newAssetForm, building_name: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="Ex: Siège social"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium mb-1">Floor</label>
                                <select
                                  value={newAssetForm.floor || ''}
                                  onChange={(e) => setNewAssetForm({...newAssetForm, floor: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="">-- Sélectionnez --</option>
                                  <option value="sous-sol">Sous-sol</option>
                                  <option value="rdc">Rez-de-chaussée</option>
                                  {[...Array(10)].map((_, i) => (
                                    <option key={i} value={`${i + 1}`}>{i + 1}er étage</option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-sm font-medium mb-1">Zoning</label>
                                <select
                                  value={newAssetForm.zoning || ''}
                                  onChange={(e) => setNewAssetForm({...newAssetForm, zoning: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="">Sélectionnez...</option>
                                  <option value="zone-a">Zone A</option>
                                  <option value="zone-b">Zone B</option>
                                  <option value="zone-c">Zone C</option>
                                  <option value="zone-d">Zone D</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-sm font-medium mb-1">Unit</label>
                                <select
                                  value={newAssetForm.unit || ''}
                                  onChange={(e) => setNewAssetForm({...newAssetForm, unit: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="">Sélectionnez...</option>
                                  <option value="unit-1">Unité 1</option>
                                  <option value="unit-2">Unité 2</option>
                                  <option value="unit-3">Unité 3</option>
                                  <option value="unit-4">Unité 4</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-sm font-medium mb-1">Room</label>
                                <select
                                  value={newAssetForm.room || ''}
                                  onChange={(e) => setNewAssetForm({...newAssetForm, room: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="">Sélectionnez...</option>
                                  <option value="bureau">Bureau</option>
                                  <option value="salle-reunion">Salle de réunion</option>
                                  <option value="atelier">Atelier</option>
                                  <option value="entrepot">Entrepôt</option>
                                  <option value="reception">Réception</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-sm font-medium mb-1">GPS Coordinates</label>
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="text"
                                    value={newAssetForm.gps_latitude || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, gps_latitude: e.target.value})}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="Latitude"
                                  />
                                  <input
                                    type="text"
                                    value={newAssetForm.gps_longitude || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, gps_longitude: e.target.value})}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="Longitude"
                                  />
                                  <button
                                    type="button"
                                    className="px-3 py-2 bg-[#171717]/50 text-[#171717] border border-[#171717]/30 rounded-lg hover:bg-[#171717]/20"
                                    title="Obtenir la position actuelle"
                                  >
                                    <MapPin className="w-5 h-5" />
                                  </button>
                                </div>
                              </div>

                              <div className="md:col-span-2">
                                <label className="block text-sm font-medium mb-1">Address</label>
                                <textarea
                                  value={newAssetForm.location_address || ''}
                                  onChange={(e) => setNewAssetForm({...newAssetForm, location_address: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  rows={2}
                                  placeholder="Adresse complète de localisation"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Material Data Tab */}
                        {activeGeneralTab === 'material' && (
                          <div className="space-y-6">
                            {/* Material Data Section */}
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <Package className="w-5 h-5 mr-2 text-[#171717]" />
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
                                  <label className="block text-sm font-medium mb-1">Additional Identifier</label>
                                  <input
                                    type="text"
                                    value={newAssetForm.additional_identifier || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, additional_identifier: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="Identifiant additionnel"
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium mb-1">Shipping Type</label>
                                  <select
                                    value={newAssetForm.shipping_type || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, shipping_type: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="">-- Sélectionnez --</option>
                                    <option value="maritime">Maritime</option>
                                    <option value="aerien">Aérien</option>
                                    <option value="routier">Routier</option>
                                    <option value="ferroviaire">Ferroviaire</option>
                                    <option value="local">Local</option>
                                  </select>
                                </div>
                              </div>
                            </div>

                            {/* Serial & Batch Numbers Section */}
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <Tag className="w-5 h-5 mr-2 text-[#171717]" />
                                Numéros de série et lots
                              </h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                                    placeholder="Numéros de lot (séparés par des virgules)"
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium mb-1">Managed Items By</label>
                                  <select
                                    value={newAssetForm.managed_by || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, managed_by: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="">-- Sélectionnez --</option>
                                    <option value="serial">Par numéro de série</option>
                                    <option value="batch">Par lot</option>
                                    <option value="both">Les deux</option>
                                    <option value="none">Aucun</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-sm font-medium mb-1">Disposal Method</label>
                                  <select
                                    value={newAssetForm.disposal_method || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, disposal_method: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="">-- Sélectionnez --</option>
                                    <option value="sale">Vente</option>
                                    <option value="donation">Don</option>
                                    <option value="destruction">Destruction</option>
                                    <option value="recycling">Recyclage</option>
                                    <option value="transfer">Transfert</option>
                                  </select>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Acquisition Information Tab */}
                  {activeFormTab === 'acquisition' && (
                    <div className="space-y-8">
                      {/* Vendor/Supplier Information Section */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <Users className="w-5 h-5 mr-2 text-[#171717]" />
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
                            <label className="block text-sm font-medium mb-1">Vendor Contact Information</label>
                            <input
                              type="text"
                              value={newAssetForm.vendor_contact || ''}
                              onChange={(e) => setNewAssetForm({...newAssetForm, vendor_contact: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              placeholder="Téléphone / Email du contact"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-1">Document Number</label>
                            <input
                              type="text"
                              value={newAssetForm.document_number || ''}
                              onChange={(e) => setNewAssetForm({...newAssetForm, document_number: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              placeholder="Numéro de document"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Purchase Order Details Section */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <FileText className="w-5 h-5 mr-2 text-[#171717]" />
                          Purchase Order Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                              value={newAssetForm.acquisition_date || '2024-01-01'}
                              onChange={(e) => setNewAssetForm({...newAssetForm, acquisition_date: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              placeholder="01/01/2024"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-1">Acquisition Cost</label>
                            <div className="flex items-center">
                              <input
                                type="number"
                                value={newAssetForm.acquisition_cost || ''}
                                onChange={(e) => setNewAssetForm({...newAssetForm, acquisition_cost: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Montant"
                              />
                              <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg">
                                XAF
                              </span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-1">Purchase Amount</label>
                            <div className="flex items-center">
                              <input
                                type="number"
                                value={newAssetForm.purchase_amount || ''}
                                onChange={(e) => setNewAssetForm({...newAssetForm, purchase_amount: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Montant d'achat"
                              />
                              <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg">
                                XAF
                              </span>
                            </div>
                          </div>

                          <div className="lg:col-span-2">
                            <label className="block text-sm font-medium mb-1">Payment Terms</label>
                            <select
                              value={newAssetForm.payment_terms || ''}
                              onChange={(e) => setNewAssetForm({...newAssetForm, payment_terms: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">-- Sélectionnez --</option>
                              <option value="comptant">Comptant</option>
                              <option value="30_jours">30 jours</option>
                              <option value="60_jours">60 jours</option>
                              <option value="90_jours">90 jours</option>
                              <option value="echelonne">Paiement échelonné</option>
                              <option value="leasing">Leasing</option>
                              <option value="credit_bail">Crédit-bail</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Asset Address and Ownership Section */}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <MapPin className="w-5 h-5 mr-2 text-[#171717]" />
                          Asset Address and Ownership
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-1">Delivery Address</label>
                            <textarea
                              value={newAssetForm.delivery_address || ''}
                              onChange={(e) => setNewAssetForm({...newAssetForm, delivery_address: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              rows={3}
                              placeholder="Adresse de livraison complète"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-1">Owner</label>
                            <input
                              type="text"
                              value={newAssetForm.owner || ''}
                              onChange={(e) => setNewAssetForm({...newAssetForm, owner: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              placeholder="Propriétaire de l'actif"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-1">Ownership Type</label>
                            <select
                              value={newAssetForm.ownership_type || ''}
                              onChange={(e) => setNewAssetForm({...newAssetForm, ownership_type: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">-- Sélectionnez --</option>
                              <option value="propriete">Propriété</option>
                              <option value="location">Location</option>
                              <option value="leasing">Leasing</option>
                              <option value="pret">Prêt</option>
                              <option value="consignation">Consignation</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Immobilisation Tab */}
                  {activeFormTab === 'immobilisation' && (
                    <div className="space-y-6">
                      {/* Horizontal Tabs for Immobilisation */}
                      <div className="border-b border-gray-200">
                        <nav className="flex flex-wrap space-x-6">
                          {[
                            { id: 'overview', label: 'Overview', icon: Eye },
                            { id: 'values', label: 'Values', icon: DollarSign },
                            { id: 'depreciation', label: "Paramètres d'amortissement", icon: TrendingDown },
                            { id: 'table', label: "Table d'amortissement", icon: BarChart3 },
                            { id: 'accounting', label: t('accounting.title'), icon: Calculator },
                            { id: 'history', label: 'Historique des changements', icon: History }
                          ].map((tab) => {
                            const IconComponent = tab.icon;
                            return (
                              <button
                                key={tab.id}
                                onClick={() => setActiveImmobilisationTab(tab.id)}
                                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                                  activeImmobilisationTab === tab.id
                                    ? 'border-[#171717] text-[#171717]'
                                    : 'border-transparent text-gray-700 hover:text-gray-700 hover:border-gray-300'
                                }`}
                              >
                                <IconComponent className="w-4 h-4 mr-2" />
                                {tab.label}
                              </button>
                            );
                          })}
                        </nav>
                      </div>

                      {/* Tab Content */}
                      <div className="mt-6">
                        {/* Overview Tab */}
                        {activeImmobilisationTab === 'overview' && (
                          <div className="space-y-6">
                            <div className="bg-[#171717]/50 border border-[#171717]/20 rounded-lg p-6">
                              <h4 className="text-lg font-semibold text-[#404040] mb-4">Vue d'ensemble de l'immobilisation</h4>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                  <label className="text-sm text-[#262626]">Code immobilisation</label>
                                  <p className="text-lg font-bold text-[#404040]">{newAssetForm.asset_number || 'IMM-2024-001'}</p>
                                </div>
                                <div>
                                  <label className="text-sm text-[#262626]">Catégorie</label>
                                  <p className="text-lg font-bold text-[#404040]">{newAssetForm.asset_category || 'Non défini'}</p>
                                </div>
                                <div>
                                  <label className="text-sm text-[#262626]">Statut</label>
                                  <p className="text-lg font-bold text-green-700">En service</p>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                              <div>
                                <label className="block text-sm font-medium mb-1">Date de mise en service</label>
                                <input
                                  type="date"
                                  value={newAssetForm.capitalization_date || ''}
                                  onChange={(e) => setNewAssetForm({...newAssetForm, capitalization_date: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">Durée de vie utile (années)</label>
                                <input
                                  type="number"
                                  value={newAssetForm.useful_life || ''}
                                  onChange={(e) => setNewAssetForm({...newAssetForm, useful_life: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="5"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">Valeur résiduelle (%)</label>
                                <input
                                  type="number"
                                  value={newAssetForm.residual_value_percent || '10'}
                                  onChange={(e) => setNewAssetForm({...newAssetForm, residual_value_percent: e.target.value})}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="10"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Values Tab */}
                        {activeImmobilisationTab === 'values' && (
                          <div className="space-y-6">
                            <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                              <DollarSign className="w-5 h-5 mr-2 text-[#171717]" />
                              Valeurs de l'immobilisation
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                    onChange={(e) => setNewAssetForm({...newAssetForm, net_book_value: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="800000"
                                  />
                                  <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg">XAF</span>
                                </div>
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">Amortissement cumulé</label>
                                <div className="flex items-center">
                                  <input
                                    type="number"
                                    value={newAssetForm.cumulated_depreciation || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, cumulated_depreciation: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="200000"
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
                                    onChange={(e) => setNewAssetForm({...newAssetForm, salvage_value: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="100000"
                                  />
                                  <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg">XAF</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Depreciation Parameters Tab */}
                        {activeImmobilisationTab === 'depreciation' && (
                          <div className="space-y-8">
                            {/* Asset Information Section */}
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <Info className="w-5 h-5 mr-2 text-[#171717]" />
                                Asset Information
                              </h4>
                              <div className="bg-[#171717]/50 border border-[#171717]/20 rounded-lg p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Asset ID (Unique identifier)
                                    </label>
                                    <input
                                      type="text"
                                      value={newAssetForm.asset_id || 'ID-00333'}
                                      onChange={(e) => setNewAssetForm({...newAssetForm, asset_id: e.target.value})}
                                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                      placeholder="ID-00333"
                                    />
                                  </div>

                                  <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Asset name/Description
                                    </label>
                                    <input
                                      type="text"
                                      value={newAssetForm.asset_description || 'ARIC TRAVAUX D\'ASSAINISSEMENT'}
                                      onChange={(e) => setNewAssetForm({...newAssetForm, asset_description: e.target.value})}
                                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                      placeholder="ARIC TRAVAUX D'ASSAINISSEMENT"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Asset category
                                    </label>
                                    <select
                                      value={newAssetForm.asset_category || ''}
                                      onChange={(e) => setNewAssetForm({...newAssetForm, asset_category: e.target.value})}
                                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                      <option value="">Sélectionnez...</option>
                                      <option value="building">Bâtiments et constructions</option>
                                      <option value="equipment">Équipements et matériels</option>
                                      <option value="vehicle">Véhicules</option>
                                      <option value="furniture">Mobilier</option>
                                      <option value="it">Matériel informatique</option>
                                      <option value="intangible">Immobilisations incorporelles</option>
                                    </select>
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Original cost
                                    </label>
                                    <div className="flex items-center">
                                      <input
                                        type="text"
                                        value={newAssetForm.original_cost || '59160515,00'}
                                        onChange={(e) => setNewAssetForm({...newAssetForm, original_cost: e.target.value})}
                                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 text-right font-semibold"
                                        placeholder="59160515,00"
                                      />
                                      <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg">
                                        XAF
                                      </span>
                                    </div>
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Additional costs
                                    </label>
                                    <div className="flex items-center">
                                      <input
                                        type="text"
                                        value={newAssetForm.additional_costs || '0,00'}
                                        onChange={(e) => setNewAssetForm({...newAssetForm, additional_costs: e.target.value})}
                                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 text-right"
                                        placeholder="0,00"
                                      />
                                      <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg">
                                        XAF
                                      </span>
                                    </div>
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                      Total capitalized cost
                                    </label>
                                    <div className="flex items-center">
                                      <input
                                        type="text"
                                        value={newAssetForm.total_capitalized_cost || '59160515,00'}
                                        onChange={(e) => setNewAssetForm({...newAssetForm, total_capitalized_cost: e.target.value})}
                                        className="w-full px-3 py-2 bg-[#171717]/20 border border-[#171717]/30 rounded-l-lg font-bold text-right text-[#404040]"
                                        placeholder="59160515,00"
                                        readOnly
                                      />
                                      <span className="px-3 py-2 bg-[#171717]/20 border border-l-0 border-[#171717]/30 rounded-r-lg text-[#404040] font-semibold">
                                        XAF
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Depreciation Details Section */}
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <TrendingDown className="w-5 h-5 mr-2 text-[#171717]" />
                                Depreciation Details
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Depreciation method
                                  </label>
                                  <select
                                    value={newAssetForm.depreciation_method || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, depreciation_method: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="">-- Select --</option>
                                    <option value="straight_line">Straight Line</option>
                                    <option value="declining_balance">Declining Balance</option>
                                    <option value="sum_of_years">Sum of Years Digits</option>
                                    <option value="units_of_production">Units of Production</option>
                                    <option value="custom">Custom</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Depreciation start date
                                  </label>
                                  <input
                                    type="date"
                                    value={newAssetForm.depreciation_start_date || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, depreciation_start_date: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="jj/mm/aaaa"
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Depreciation end date
                                  </label>
                                  <input
                                    type="date"
                                    value={newAssetForm.depreciation_end_date || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, depreciation_end_date: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="jj/mm/aaaa"
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Useful life (Months)
                                  </label>
                                  <input
                                    type="number"
                                    value={newAssetForm.useful_life_months || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, useful_life_months: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="60"
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Life time in years
                                  </label>
                                  <input
                                    type="number"
                                    value={newAssetForm.lifetime_years || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, lifetime_years: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="5"
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Remaining life
                                  </label>
                                  <input
                                    type="number"
                                    value={newAssetForm.remaining_life || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, remaining_life: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="48"
                                  />
                                </div>

                                <div className="md:col-span-3">
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Depreciation type
                                  </label>
                                  <select
                                    value={newAssetForm.depreciation_type || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, depreciation_type: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="">-- Select --</option>
                                    <option value="fiscal">Fiscal</option>
                                    <option value="accounting">Accounting</option>
                                    <option value="both">Both (Fiscal & Accounting)</option>
                                    <option value="economic">Economic</option>
                                  </select>
                                </div>
                              </div>
                            </div>

                            {/* Reporting and Verification Section */}
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <FileText className="w-5 h-5 mr-2 text-[#171717]" />
                                Reporting and Verification
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Reporting frequency
                                  </label>
                                  <select
                                    value={newAssetForm.reporting_frequency || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, reporting_frequency: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="">-- Select --</option>
                                    <option value="monthly">Monthly</option>
                                    <option value="quarterly">Quarterly</option>
                                    <option value="semi_annual">Semi-Annual</option>
                                    <option value="annual">Annual</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Verification date
                                  </label>
                                  <input
                                    type="date"
                                    value={newAssetForm.verification_date || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, verification_date: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="jj/mm/aaaa"
                                  />
                                </div>

                                <div className="md:col-span-2">
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Verification process
                                  </label>
                                  <textarea
                                    value={newAssetForm.verification_process || ''}
                                    onChange={(e) => setNewAssetForm({...newAssetForm, verification_process: e.target.value})}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    rows={3}
                                    placeholder="Describe the verification process..."
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Depreciation Table Tab */}
                        {activeImmobilisationTab === 'table' && (
                          <div className="space-y-6">
                            <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                              <BarChart3 className="w-5 h-5 mr-2 text-[#171717]" />
                              Table d'amortissement
                            </h4>
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Année</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Valeur début</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Dotation</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Cumul</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">VNC</th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {[...Array(5)].map((_, i) => (
                                    <tr key={i}>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {2024 + i}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {formatCurrency(1000000 - (i * 200000))}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {formatCurrency(200000)}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {formatCurrency((i + 1) * 200000)}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {formatCurrency(1000000 - ((i + 1) * 200000))}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Accounting Tab */}
                        {activeImmobilisationTab === 'accounting' && (
                          <div className="space-y-8">
                            {/* Cost Accounting Section - Assets List */}
                            <div className="space-y-4">
                              <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                                <Database className="w-5 h-5 mr-2 text-[#171717]" />
                                Cost Accounting - Assets List
                              </h4>

                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-4">
                                  <h5 className="text-sm font-semibold text-gray-700">Assets List</h5>
                                  <div className="flex space-x-2">
                                    <button className="px-3 py-1 bg-[#171717]/50 text-[#171717] text-xs font-medium rounded hover:bg-[#171717]/20">
                                      Export CSV
                                    </button>
                                    <button className="px-3 py-1 bg-green-50 text-green-600 text-xs font-medium rounded hover:bg-green-100">
                                      Add Asset
                                    </button>
                                  </div>
                                </div>

                                <div className="overflow-x-auto">
                                  <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-white">
                                      <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                          Asset ID
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                          Asset name/Description
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                          Asset category
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                          Location
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                          Acquisition date
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                      {[
                                        {
                                          id: 'FA001',
                                          name: 'Office furniture',
                                          category: 'Furniture',
                                          location: 'Office building 1',
                                          date: '15/01/2022'
                                        },
                                        {
                                          id: 'FA002',
                                          name: 'Laptop Dell XPS',
                                          category: 'IT Equipment',
                                          location: 'Office building 2',
                                          date: '20/03/2022'
                                        },
                                        {
                                          id: 'FA003',
                                          name: 'Toyota Hilux',
                                          category: 'Vehicle',
                                          location: 'Parking A',
                                          date: '10/06/2022'
                                        },
                                        {
                                          id: 'FA004',
                                          name: 'Air Conditioner',
                                          category: 'Equipment',
                                          location: 'Office building 1',
                                          date: '05/08/2022'
                                        },
                                        {
                                          id: 'FA005',
                                          name: 'Conference Table',
                                          category: 'Furniture',
                                          location: 'Meeting Room A',
                                          date: '12/09/2022'
                                        }
                                      ].map((asset, index) => (
                                        <tr key={index} className="hover:bg-gray-50">
                                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {asset.id}
                                          </td>
                                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                            {asset.name}
                                          </td>
                                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                            <span className="px-2 py-1 text-xs font-medium bg-[#171717]/20 text-[#262626] rounded">
                                              {asset.category}
                                            </span>
                                          </td>
                                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                            {asset.location}
                                          </td>
                                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                            {asset.date}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>

                                <div className="mt-4 flex items-center justify-between text-xs text-gray-600">
                                  <span>Showing 5 of 150 assets</span>
                                  <div className="flex space-x-1">
                                    <button className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50">Previous</button>
                                    <button className="px-2 py-1 bg-[#171717] text-white rounded">1</button>
                                    <button className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50">2</button>
                                    <button className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50">3</button>
                                    <button className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50">Next</button>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Cost Accounting - Maintenance */}
                            <div className="space-y-4">
                              <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                                <Wrench className="w-5 h-5 mr-2 text-[#171717]" />
                                Cost Accounting - Maintenance
                              </h4>

                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-4">
                                  <h5 className="text-sm font-semibold text-gray-700">Maintenance History</h5>
                                  <div className="flex space-x-2">
                                    <button className="px-3 py-1 bg-[#171717]/50 text-[#171717] text-xs font-medium rounded hover:bg-[#171717]/20">
                                      Export PDF
                                    </button>
                                    <button className="px-3 py-1 bg-green-50 text-green-600 text-xs font-medium rounded hover:bg-green-100">
                                      Add Maintenance
                                    </button>
                                  </div>
                                </div>

                                <div className="overflow-x-auto">
                                  <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-white">
                                      <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                          Maintenance Date
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                          Vendor
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                          Component
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                          Description
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                          GRSE
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                          Invoice
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                                          Amount
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                                          Status
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                      {[
                                        {
                                          date: '15/01/2024',
                                          vendor: 'Tech Services SA',
                                          component: 'Air Filter',
                                          description: 'Remplacement filtre climatisation',
                                          grse: 'GR-2024-001',
                                          invoice: 'INV-2024-456',
                                          amount: 300000,
                                          status: 'Paid'
                                        },
                                        {
                                          date: '20/02/2024',
                                          vendor: 'Auto Maintenance Ltd',
                                          component: 'Engine Oil',
                                          description: 'Vidange moteur véhicule',
                                          grse: 'GR-2024-002',
                                          invoice: 'INV-2024-789',
                                          amount: 300000,
                                          status: 'Paid'
                                        },
                                        {
                                          date: '10/03/2024',
                                          vendor: 'Building Services',
                                          component: 'Electrical System',
                                          description: 'Réparation système électrique',
                                          grse: 'GR-2024-003',
                                          invoice: 'INV-2024-123',
                                          amount: 300000,
                                          status: 'Pending'
                                        }
                                      ].map((maintenance, index) => (
                                        <tr key={index} className="hover:bg-gray-50">
                                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                            {maintenance.date}
                                          </td>
                                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                            {maintenance.vendor}
                                          </td>
                                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                            {maintenance.component}
                                          </td>
                                          <td className="px-4 py-3 text-sm text-gray-600">
                                            {maintenance.description}
                                          </td>
                                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                            <span className="text-[#171717] hover:underline cursor-pointer">
                                              {maintenance.grse}
                                            </span>
                                          </td>
                                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                            <span className="text-[#171717] hover:underline cursor-pointer">
                                              {maintenance.invoice}
                                            </span>
                                          </td>
                                          <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                                            {maintenance.amount.toLocaleString()} XAF
                                          </td>
                                          <td className="px-4 py-3 whitespace-nowrap text-center">
                                            <span className={`px-2 py-1 text-xs font-medium rounded ${
                                              maintenance.status === 'Paid'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-yellow-100 text-yellow-700'
                                            }`}>
                                              {maintenance.status}
                                            </span>
                                          </td>
                                        </tr>
                                      ))}
                                      {/* Total Row */}
                                      <tr className="bg-gray-100 font-semibold">
                                        <td colSpan={6} className="px-4 py-3 text-sm text-gray-900 text-right">
                                          Total:
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right text-gray-900">
                                          900,000 XAF
                                        </td>
                                        <td className="px-4 py-3"></td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>

                                <div className="mt-4 flex items-center justify-between text-xs text-gray-600">
                                  <span>Showing 3 maintenance records</span>
                                  <div className="flex items-center space-x-4">
                                    <div className="flex items-center">
                                      <span className="w-3 h-3 bg-green-100 rounded-full mr-2"></span>
                                      <span>Paid: 2</span>
                                    </div>
                                    <div className="flex items-center">
                                      <span className="w-3 h-3 bg-yellow-100 rounded-full mr-2"></span>
                                      <span>Pending: 1</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* History Tab */}
                        {activeImmobilisationTab === 'history' && (
                          <div className="space-y-6">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                                <History className="w-5 h-5 mr-2 text-[#171717]" />
                                Historique des changements
                              </h4>
                              <div className="flex space-x-2">
                                <button className="px-3 py-1 bg-[#171717]/50 text-[#171717] text-xs font-medium rounded hover:bg-[#171717]/20 flex items-center">
                                  <Download className="w-3 h-3 mr-1" />
                                  Export
                                </button>
                                <button className="px-3 py-1 bg-gray-50 text-gray-600 text-xs font-medium rounded hover:bg-gray-100 flex items-center">
                                  <Filter className="w-3 h-3 mr-1" />
                                  Filter
                                </button>
                              </div>
                            </div>

                            <div className="overflow-x-auto shadow-sm border border-gray-200 rounded-lg">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                                      Date<br/>du changement
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                                      Numéro<br/>de l'actif
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                                      Description<br/>de l'actif
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                                      Type de<br/>changement
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                                      Ancienne<br/>valeur
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                                      Nouvelle<br/>valeur
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                                      Ancien<br/>centre de coût
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                                      Nouveau<br/>centre de coût
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                                      Ancienne<br/>méthode de<br/>dépréciation
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                                      Nouvelle<br/>méthode de<br/>dépréciation
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                                      Ancienne<br/>durée de vie<br/>estimée
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                                      Nouvelle<br/>durée de vie<br/>estimée
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                                      Ancienne<br/>Valeur<br/>résiduelle
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                                      Nouvelle<br/>Valeur<br/>résiduelle
                                    </th>
                                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                                      Responsable<br/>du changement
                                    </th>
                                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                                      Commentaires
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {[
                                    {
                                      date: '20/08/2024',
                                      assetNumber: '12345',
                                      description: 'Ordinateur portable',
                                      changeType: 'Réévaluation',
                                      oldValue: '999 999 999',
                                      newValue: '999 999 999',
                                      oldCostCenter: 'Centre A',
                                      newCostCenter: 'Centre B',
                                      oldDepMethod: 'Linéaire',
                                      newDepMethod: 'Dégressif',
                                      oldLifespan: '5 ans',
                                      newLifespan: '4 ans',
                                      oldResidual: '999 999 999',
                                      newResidual: '999 999 999',
                                      responsible: 'Pamela Atokouna',
                                      hasComment: true
                                    },
                                    {
                                      date: '15/07/2024',
                                      assetNumber: '12346',
                                      description: 'Véhicule Toyota',
                                      changeType: 'Changement localisation',
                                      oldValue: '15 000 000',
                                      newValue: '15 000 000',
                                      oldCostCenter: 'Centre B',
                                      newCostCenter: 'Centre C',
                                      oldDepMethod: 'Dégressif',
                                      newDepMethod: 'Dégressif',
                                      oldLifespan: '7 ans',
                                      newLifespan: '7 ans',
                                      oldResidual: '2 000 000',
                                      newResidual: '2 000 000',
                                      responsible: 'Jean Dupont',
                                      hasComment: true
                                    },
                                    {
                                      date: '10/06/2024',
                                      assetNumber: '12347',
                                      description: 'Mobilier de bureau',
                                      changeType: 'Mise à jour valeur',
                                      oldValue: '5 000 000',
                                      newValue: '4 500 000',
                                      oldCostCenter: 'Centre A',
                                      newCostCenter: 'Centre A',
                                      oldDepMethod: 'Linéaire',
                                      newDepMethod: 'Linéaire',
                                      oldLifespan: '10 ans',
                                      newLifespan: '10 ans',
                                      oldResidual: '500 000',
                                      newResidual: '450 000',
                                      responsible: 'Marie Kouam',
                                      hasComment: false
                                    }
                                  ].map((item, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                                        {item.date}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-[#171717]">
                                        {item.assetNumber}
                                      </td>
                                      <td className="px-3 py-2 text-xs text-gray-700 max-w-[150px] truncate">
                                        {item.description}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap">
                                        <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
                                          {item.changeType}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600 text-right">
                                        {item.oldValue}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 font-medium text-right">
                                        {item.newValue}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">
                                        {item.oldCostCenter}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 font-medium">
                                        {item.newCostCenter}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">
                                        {item.oldDepMethod}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 font-medium">
                                        {item.newDepMethod}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600 text-center">
                                        {item.oldLifespan}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 font-medium text-center">
                                        {item.newLifespan}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600 text-right">
                                        {item.oldResidual}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 font-medium text-right">
                                        {item.newResidual}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-700">
                                        {item.responsible}
                                      </td>
                                      <td className="px-3 py-2 whitespace-nowrap text-center">
                                        {item.hasComment ? (
                                          <button
                                            className="text-[#171717] hover:text-[#262626]"
                                            title="Voir les commentaires"
                                          >
                                            <FileText className="w-4 h-4" />
                                          </button>
                                        ) : (
                                          <span className="text-gray-700">-</span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* Pagination */}
                            <div className="flex items-center justify-between text-xs text-gray-600 mt-4">
                              <span>Affichage de 3 sur 150 changements</span>
                              <div className="flex space-x-1">
                                <button className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50">Précédent</button>
                                <button className="px-2 py-1 bg-[#171717] text-white rounded">1</button>
                                <button className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50">2</button>
                                <button className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50">3</button>
                                <button className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-50">Suivant</button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Sales Tab */}
                  {activeFormTab === 'vente' && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                        <TrendingUp className="w-5 h-5 mr-2 text-[#171717]" />
                        Données de vente
                      </h3>

                      {/* Sales Table */}
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h5 className="text-sm font-semibold text-gray-700">Historique des ventes</h5>
                          <div className="flex space-x-2">
                            <button className="px-3 py-1 bg-[#171717]/50 text-[#171717] text-xs font-medium rounded hover:bg-[#171717]/20">
                              Export Excel
                            </button>
                            <button className="px-3 py-1 bg-green-50 text-green-600 text-xs font-medium rounded hover:bg-green-100">
                              Ajouter une vente
                            </button>
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-white">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                  Sale Date
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                  Buyer/Recipient
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                                  Book Value
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                                  Selling Price
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                  Sales Invoice/Receipt
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {[
                                {
                                  date: '15/09/2023',
                                  buyer: 'XYZ Corporation',
                                  bookValue: '',
                                  sellingPrice: 1500000,
                                  invoice: 'INV2023-001'
                                },
                                {
                                  date: '15/09/2023',
                                  buyer: 'XYZ Corporation',
                                  bookValue: '',
                                  sellingPrice: 1500000,
                                  invoice: 'INV2023-001'
                                },
                                {
                                  date: '15/09/2023',
                                  buyer: 'XYZ Corporation',
                                  bookValue: '',
                                  sellingPrice: 1500000,
                                  invoice: 'INV2023-001'
                                }
                              ].map((sale, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                    {sale.date}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">
                                    {sale.buyer}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-600">
                                    {sale.bookValue || '-'}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                                    {sale.sellingPrice.toLocaleString()} XAF
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                    <span className="text-[#171717] hover:underline cursor-pointer">
                                      {sale.invoice}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-center">
                                    <div className="flex items-center justify-center space-x-2">
                                      <button className="text-[#171717] hover:text-[#262626]" aria-label="Voir les détails">
                                        <Eye className="w-4 h-4" />
                                      </button>
                                      <button className="text-gray-600 hover:text-gray-800">
                                        <Edit className="w-4 h-4" />
                                      </button>
                                      <button className="text-red-600 hover:text-red-800" aria-label="Supprimer">
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="mt-4 flex items-center justify-between text-xs text-gray-600">
                          <span>Affichage de 3 ventes</span>
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center">
                              <span className="text-sm font-medium text-gray-700 mr-2">Total ventes:</span>
                              <span className="text-sm font-bold text-green-600">4,500,000 XAF</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Additional Sale Information */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <h5 className="text-sm font-semibold text-gray-700 mb-3">Informations de la dernière vente</h5>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Date de vente:</span>
                              <span className="text-sm font-medium text-gray-900">15/09/2023</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Acheteur:</span>
                              <span className="text-sm font-medium text-gray-900">XYZ Corporation</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Prix de vente:</span>
                              <span className="text-sm font-medium text-green-600">1,500,000 XAF</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Plus/Moins-value:</span>
                              <span className="text-sm font-medium text-green-600">+500,000 XAF</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <h5 className="text-sm font-semibold text-gray-700 mb-3">Documents de vente</h5>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div className="flex items-center">
                                <FileText className="w-4 h-4 text-[#171717] mr-2" />
                                <span className="text-sm text-gray-700">Facture de vente</span>
                              </div>
                              <button className="text-[#171717] hover:text-[#262626] text-sm">
                                Télécharger
                              </button>
                            </div>
                            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div className="flex items-center">
                                <FileText className="w-4 h-4 text-[#171717] mr-2" />
                                <span className="text-sm text-gray-700">Contrat de cession</span>
                              </div>
                              <button className="text-[#171717] hover:text-[#262626] text-sm">
                                Télécharger
                              </button>
                            </div>
                            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div className="flex items-center">
                                <FileText className="w-4 h-4 text-[#171717] mr-2" />
                                <span className="text-sm text-gray-700">Certificat de transfert</span>
                              </div>
                              <button className="text-[#171717] hover:text-[#262626] text-sm">
                                Télécharger
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Section Composants */}
                  {activeFormTab === 'composants' && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                        <Package className="w-5 h-5 mr-2 text-[#171717]" />
                        Composants de l'actif
                      </h3>

                      {/* Composants Table */}
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h5 className="text-sm font-semibold text-gray-700">Liste des composants</h5>
                          <div className="flex space-x-2">
                            <button className="px-3 py-1 bg-[#171717]/50 text-[#171717] text-xs font-medium rounded hover:bg-[#171717]/20">
                              Export Excel
                            </button>
                            <button className="px-3 py-1 bg-green-50 text-green-600 text-xs font-medium rounded hover:bg-green-100">
                              Ajouter un composant
                            </button>
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-white">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                  Code
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                  Name
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                  Description
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                  État
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                  Catégorie
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                  Date d'installation
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                  Localisation
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {[
                                {
                                  code: 'COMP-001',
                                  name: 'Moteur principal',
                                  description: 'Moteur diesel 4 cylindres',
                                  etat: 'Bon',
                                  categorie: 'Mécanique',
                                  dateInstallation: '15/01/2023',
                                  localisation: 'Bloc moteur'
                                },
                                {
                                  code: 'COMP-002',
                                  name: 'Système de freinage',
                                  description: 'Freins à disque ventilés',
                                  etat: 'Usagé',
                                  categorie: 'Mécanique',
                                  dateInstallation: '15/01/2023',
                                  localisation: 'Trains avant/arrière'
                                },
                                {
                                  code: 'COMP-003',
                                  name: 'Tableau de bord',
                                  description: 'Système d\'affichage numérique',
                                  etat: 'Neuf',
                                  categorie: 'Électronique',
                                  dateInstallation: '20/06/2024',
                                  localisation: 'Habitacle'
                                }
                              ].map((composant, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-[#171717]">
                                    {composant.code}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {composant.name}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600">
                                    {composant.description}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                                      composant.etat === 'Neuf' ? 'bg-green-100 text-green-700' :
                                      composant.etat === 'Bon' ? 'bg-[#171717]/20 text-[#262626]' :
                                      composant.etat === 'Usagé' ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-red-100 text-red-700'
                                    }`}>
                                      {composant.etat}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                    {composant.categorie}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                    {composant.dateInstallation}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                    {composant.localisation}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-center">
                                    <div className="flex items-center justify-center space-x-2">
                                      <button className="text-[#171717] hover:text-[#262626]" aria-label="Voir les détails">
                                        <Eye className="w-4 h-4" />
                                      </button>
                                      <button className="text-gray-600 hover:text-gray-800">
                                        <Edit className="w-4 h-4" />
                                      </button>
                                      <button className="text-red-600 hover:text-red-800" aria-label="Supprimer">
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="mt-4 flex items-center justify-between text-xs text-gray-600">
                          <span>Affichage de 3 composants</span>
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center">
                              <span className="w-3 h-3 bg-green-100 rounded-full mr-2"></span>
                              <span>Neuf: 1</span>
                            </div>
                            <div className="flex items-center">
                              <span className="w-3 h-3 bg-[#171717]/20 rounded-full mr-2"></span>
                              <span>Bon: 1</span>
                            </div>
                            <div className="flex items-center">
                              <span className="w-3 h-3 bg-yellow-100 rounded-full mr-2"></span>
                              <span>Usagé: 1</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Section Données de maintenance */}
                  {activeFormTab === 'maintenance' && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                        <Wrench className="w-5 h-5 mr-2 text-[#171717]" />
                        Données de maintenance
                      </h3>

                      {/* Sub-tabs for Maintenance */}
                      <div className="border-b border-gray-200">
                        <nav className="flex space-x-8">
                          {[
                            { id: 'contract', label: 'Contrat de maintenance', icon: FileText },
                            { id: 'history', label: 'Historique de maintenance', icon: History }
                          ].map((tab) => {
                            const IconComponent = tab.icon;
                            return (
                              <button
                                key={tab.id}
                                onClick={() => setActiveMaintenanceTab(tab.id)}
                                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                                  (activeMaintenanceTab || 'contract') === tab.id
                                    ? 'border-[#171717] text-[#171717]'
                                    : 'border-transparent text-gray-700 hover:text-gray-700 hover:border-gray-300'
                                }`}
                              >
                                <IconComponent className="w-4 h-4 mr-2" />
                                {tab.label}
                              </button>
                            );
                          })}
                        </nav>
                      </div>

                      {/* Contract Tab */}
                      {(activeMaintenanceTab || 'contract') === 'contract' && (
                        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
                        <h4 className="text-md font-semibold text-gray-800 border-b pb-2">
                          Maintenance Service Contract
                        </h4>

                        {/* Basic contract information */}
                        <div>
                          <h5 className="text-sm font-semibold text-gray-700 mb-4">Basic contract information</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Contract name</label>
                              <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Contract name"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Vendor</label>
                              <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Vendor"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">EDTCI</label>
                              <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="EDTCI"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Parent site reference</label>
                              <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Parent site reference"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Contract type</label>
                              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                <option>-- Sélectionnez --</option>
                                <option>Service complet</option>
                                <option>Préventif</option>
                                <option>À la demande</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Contract object</label>
                              <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Contract object"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Vendor #</label>
                              <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Vendor number"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">GLA (m²)</label>
                              <input
                                type="number"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Code contract</label>
                              <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Code contract"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Contracted parties information */}
                        <div>
                          <h5 className="text-sm font-semibold text-gray-700 mb-4">Contracted parties information</h5>

                          {/* Structure Information */}
                          <div className="mb-4">
                            <h6 className="text-xs font-semibold text-gray-600 uppercase mb-3">Structure</h6>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Legal signatory</label>
                                <input
                                  type="text"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="Legal signatory"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">EDTCI</label>
                                <input
                                  type="text"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="EDTCI"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Structure address</label>
                                <input
                                  type="text"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="Structure address"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Phone number</label>
                                <input
                                  type="tel"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="Phone number"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Email address</label>
                                <input
                                  type="email"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="Email address"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">ID/Reg</label>
                                <input
                                  type="text"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="ID/Reg"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Vendor Information */}
                          <div>
                            <h6 className="text-xs font-semibold text-gray-600 uppercase mb-3">Vendor</h6>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Vendor name</label>
                                <input
                                  type="text"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="Vendor name"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Address</label>
                                <input
                                  type="text"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="Vendor address"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Phone number</label>
                                <input
                                  type="tel"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="Phone number"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">Email address</label>
                                <input
                                  type="email"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="Email address"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">ID/Reg</label>
                                <input
                                  type="text"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="ID/Reg"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Creation informations */}
                        <div>
                          <h5 className="text-sm font-semibold text-gray-700 mb-4">Creation informations</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Created by</label>
                              <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Created by"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Creation date</label>
                              <input
                                type="date"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="jj/mm/aaaa"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Price & payment terms */}
                        <div>
                          <h5 className="text-sm font-semibold text-gray-700 mb-4">Price & payment terms</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Contract obligation</label>
                              <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Contract obligation"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Tax rate</label>
                              <input
                                type="number"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="0%"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Payment term</label>
                              <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Payment term"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">P. method</label>
                              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                <option>Virement</option>
                                <option>Chèque</option>
                                <option>Espèces</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Price list summary excluding VAT */}
                        <div>
                          <h5 className="text-sm font-semibold text-gray-700 mb-4">Price list summary excluding VAT</h5>
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Year</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Item</th>
                                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Amount</th>
                                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                <tr>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm">1</td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm">Maintenance préventive</td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-right">15,000,000</td>
                                  <td className="px-4 py-3 whitespace-nowrap text-center">
                                    <button className="text-[#171717] hover:text-[#262626]">
                                      <Edit className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                                {[...Array(5)].map((_, index) => (
                                  <tr key={index}>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm">-</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm">-</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right">-</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-center">-</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot className="bg-gray-100">
                                <tr>
                                  <td colSpan={2} className="px-4 py-3 text-sm font-semibold">Total</td>
                                  <td className="px-4 py-3 text-sm font-semibold text-right">15,000,000</td>
                                  <td></td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>

                        {/* Contract key dates */}
                        <div>
                          <h5 className="text-sm font-semibold text-gray-700 mb-4">Contract key dates</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Contract start date</label>
                              <input
                                type="date"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="jj/mm/aaaa"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Contract end date</label>
                              <input
                                type="date"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="jj/mm/aaaa"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Contract duration</label>
                              <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="Duration"
                                readOnly
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Commencement date</label>
                              <input
                                type="date"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="jj/mm/aaaa"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-600 mb-1">Contract expiry date</label>
                              <input
                                type="date"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="jj/mm/aaaa"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      )}

                      {activeMaintenanceTab === 'history' && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-4">
                            <h5 className="text-sm font-semibold text-gray-700">Maintenance History</h5>
                            <div className="flex space-x-2">
                              <button className="px-3 py-1 bg-[#171717]/50 text-[#171717] text-xs font-medium rounded hover:bg-[#171717]/20">
                                Export Excel
                              </button>
                              <button className="px-3 py-1 bg-green-50 text-green-600 text-xs font-medium rounded hover:bg-green-100">
                                Add Maintenance
                              </button>
                            </div>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-white">
                                <tr>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">{t('common.date')}</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Type</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Description</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Technician</th>
                                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Cost</th>
                                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {[
                                  {
                                    date: '20/02/2024',
                                    type: 'Préventive',
                                    description: 'Vidange moteur véhicule',
                                    technician: 'Auto Maintenance Ltd',
                                    cost: 250000,
                                    status: 'Completed'
                                  },
                                  {
                                    date: '15/05/2024',
                                    type: 'Corrective',
                                    description: 'Remplacement plaquettes de frein',
                                    technician: 'Tech Services SA',
                                    cost: 350000,
                                    status: 'Completed'
                                  },
                                  {
                                    date: '01/08/2024',
                                    type: 'Préventive',
                                    description: 'Révision générale',
                                    technician: 'Maintenance Plus',
                                    cost: 500000,
                                    status: 'Pending'
                                  }
                                ].map((maintenance, index) => (
                                  <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{maintenance.date}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                                        maintenance.type === 'Préventive' ? 'bg-[#171717]/20 text-[#262626]' : 'bg-orange-100 text-orange-700'
                                      }`}>
                                        {maintenance.type}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{maintenance.description}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{maintenance.technician}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                                      {maintenance.cost.toLocaleString()} XAF
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-center">
                                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                                        maintenance.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                      }`}>
                                        {maintenance.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Statistics */}
                          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white border border-gray-200 rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Total maintenances</span>
                                <span className="text-lg font-semibold text-[#171717]">12</span>
                              </div>
                            </div>
                            <div className="bg-white border border-gray-200 rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Coût total</span>
                                <span className="text-lg font-semibold text-green-600">2,850,000 XAF</span>
                              </div>
                            </div>
                            <div className="bg-white border border-gray-200 rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Prochaine maintenance</span>
                                <span className="text-lg font-semibold text-orange-600">Dans 15 jours</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Section Attachements */}
                  {activeFormTab === 'attachements' && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                        <Paperclip className="w-5 h-5 mr-2 text-[#171717]" />
                        Attachements
                      </h3>

                      {/* Upload Area */}
                      <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-[#171717]/40 transition-colors">
                        <div className="text-center">
                          <Upload className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">
                            Glissez-déposez vos fichiers ici
                          </h4>
                          <p className="text-xs text-gray-700 mb-4">
                            ou cliquez pour parcourir
                          </p>
                          <button className="px-4 py-2 bg-[#171717] text-white text-sm rounded-lg hover:bg-[#262626] transition-colors">
                            Sélectionner des fichiers
                          </button>
                          <p className="text-xs text-gray-700 mt-2">
                            Formats acceptés: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (Max 10MB)
                          </p>
                        </div>
                      </div>

                      {/* File Categories */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                          { name: 'Documents administratifs', count: 5, icon: FileText, color: 'blue' },
                          { name: 'Photos', count: 12, icon: Camera, color: 'green' },
                          { name: 'Contrats', count: 3, icon: Shield, color: 'purple' },
                          { name: 'Rapports techniques', count: 8, icon: Wrench, color: 'orange' }
                        ].map((category, index) => {
                          const IconComponent = category.icon;
                          return (
                            <div key={index} className={`bg-${category.color}-50 border border-${category.color}-200 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow`}>
                              <div className="flex items-center justify-between mb-2">
                                <IconComponent className={`w-6 h-6 text-${category.color}-600`} />
                                <span className={`text-sm font-semibold text-${category.color}-700`}>{category.count}</span>
                              </div>
                              <p className="text-sm text-gray-700 font-medium">{category.name}</p>
                            </div>
                          );
                        })}
                      </div>

                      {/* Attachments Table */}
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h5 className="text-sm font-semibold text-gray-700">Documents attachés</h5>
                          <div className="flex space-x-2">
                            <button className="px-3 py-1 bg-[#171717]/50 text-[#171717] text-xs font-medium rounded hover:bg-[#171717]/20 flex items-center">
                              <Filter className="w-3 h-3 mr-1" />
                              Filtrer
                            </button>
                            <button className="px-3 py-1 bg-green-50 text-green-600 text-xs font-medium rounded hover:bg-green-100 flex items-center">
                              <Download className="w-3 h-3 mr-1" />
                              Tout télécharger
                            </button>
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-white">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                  Type
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                  Nom du fichier
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                  Description
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                  Catégorie
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                  Date d'ajout
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                  Taille
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                  Ajouté par
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {[
                                {
                                  type: 'PDF',
                                  name: 'Facture_achat_2024.pdf',
                                  description: 'Facture d\'acquisition du véhicule',
                                  category: 'Administratif',
                                  date: '15/01/2024',
                                  size: '2.5 MB',
                                  addedBy: 'Jean Dupont',
                                  color: 'red'
                                },
                                {
                                  type: 'DOCX',
                                  name: 'Contrat_maintenance.docx',
                                  description: 'Contrat de maintenance annuelle',
                                  category: 'Contrat',
                                  date: '20/01/2024',
                                  size: '1.2 MB',
                                  addedBy: 'Marie Martin',
                                  color: 'blue'
                                },
                                {
                                  type: 'JPG',
                                  name: 'Photo_asset_001.jpg',
                                  description: 'Photo de l\'état actuel',
                                  category: 'Photo',
                                  date: '10/02/2024',
                                  size: '3.8 MB',
                                  addedBy: 'Paul Dubois',
                                  color: 'green'
                                },
                                {
                                  type: 'XLSX',
                                  name: 'Rapport_maintenance.xlsx',
                                  description: 'Historique des maintenances',
                                  category: 'Technique',
                                  date: '05/03/2024',
                                  size: '850 KB',
                                  addedBy: 'Sophie Lambert',
                                  color: 'orange'
                                }
                              ].map((file, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <span className={`px-2 py-1 text-xs font-medium bg-${file.color}-100 text-${file.color}-700 rounded`}>
                                      {file.type}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-[#171717] hover:underline cursor-pointer">
                                    {file.name}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600">
                                    {file.description}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                    {file.category}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                    {file.date}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                    {file.size}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                    {file.addedBy}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-center">
                                    <div className="flex items-center justify-center space-x-2">
                                      <button className="text-[#171717] hover:text-[#262626]" title="Voir" aria-label="Voir les détails">
                                        <Eye className="w-4 h-4" />
                                      </button>
                                      <button className="text-green-600 hover:text-green-800" title={t('actions.download')} aria-label="Télécharger">
                                        <Download className="w-4 h-4" />
                                      </button>
                                      <button className="text-red-600 hover:text-red-800" title={t('common.delete')} aria-label="Supprimer">
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="mt-4 flex items-center justify-between text-xs text-gray-600">
                          <span>4 documents attachés</span>
                          <span>Taille totale: 8.35 MB</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Section Notes */}
                  {activeFormTab === 'notes' && (
                    <div className="space-y-6">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center mb-4">
                        <Edit className="w-5 h-5 mr-2 text-[#171717]" />
                        Notes
                      </h3>

                      {/* Add New Note */}
                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-[#171717]/20 rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-[#171717]" />
                            </div>
                          </div>
                          <div className="flex-1">
                            <textarea
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                              rows={3}
                              placeholder="Ajouter une note..."
                            />
                            <div className="mt-2 flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <select className="px-3 py-1 border border-gray-300 rounded text-sm">
                                  <option>Général</option>
                                  <option>Technique</option>
                                  <option>Maintenance</option>
                                  <option>Important</option>
                                  <option>Rappel</option>
                                </select>
                                <select className="px-3 py-1 border border-gray-300 rounded text-sm">
                                  <option>Normale</option>
                                  <option>Haute</option>
                                  <option>Urgente</option>
                                </select>
                              </div>
                              <button className="px-4 py-2 bg-[#171717] text-white text-sm rounded-lg hover:bg-[#262626] transition-colors">
                                Ajouter la note
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Notes Filter */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <button className="px-3 py-1 bg-[#171717] text-white text-xs font-medium rounded">
                            Toutes (8)
                          </button>
                          <button className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded hover:bg-gray-200">
                            Général (3)
                          </button>
                          <button className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded hover:bg-gray-200">
                            Technique (2)
                          </button>
                          <button className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded hover:bg-gray-200">
                            Maintenance (2)
                          </button>
                          <button className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded hover:bg-gray-200">
                            Important (1)
                          </button>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            placeholder="Rechercher..."
                            className="px-3 py-1 border border-gray-300 rounded text-sm"
                          />
                          <select className="px-3 py-1 border border-gray-300 rounded text-sm">
                            <option>Plus récentes</option>
                            <option>Plus anciennes</option>
                            <option>Priorité haute</option>
                          </select>
                        </div>
                      </div>

                      {/* Notes List */}
                      <div className="space-y-4">
                        {[
                          {
                            id: 1,
                            type: 'Important',
                            priority: 'Haute',
                            subject: 'Maintenance urgente requise',
                            content: 'Le véhicule nécessite une révision complète avant la fin du mois. Les freins montrent des signes d\'usure avancée et doivent être vérifiés immédiatement.',
                            author: 'Jean Dupont',
                            date: '20/03/2024 14:30',
                            replies: 2,
                            hasAction: true,
                            actionDueDate: '30/03/2024',
                            assignedTo: 'Service Technique',
                            typeColor: 'red',
                            priorityColor: 'red'
                          },
                          {
                            id: 2,
                            type: 'Maintenance',
                            priority: 'Normale',
                            subject: 'Vidange effectuée',
                            content: 'Vidange moteur effectuée le 15/03/2024. Prochaine vidange prévue dans 10,000 km ou 6 mois.',
                            author: 'Tech Services',
                            date: '15/03/2024 10:15',
                            replies: 0,
                            hasAction: false,
                            typeColor: 'orange',
                            priorityColor: 'gray'
                          },
                          {
                            id: 3,
                            type: 'Général',
                            priority: 'Normale',
                            subject: 'Changement d\'affectation',
                            content: 'L\'actif a été transféré du département Commercial vers le département Logistique.',
                            author: 'Marie Martin',
                            date: '10/03/2024 09:00',
                            replies: 1,
                            hasAction: false,
                            typeColor: 'blue',
                            priorityColor: 'gray'
                          },
                          {
                            id: 4,
                            type: 'Technique',
                            priority: 'Normale',
                            subject: 'Mise à jour firmware',
                            content: 'Le système embarqué a été mis à jour vers la version 2.4.1. Amélioration de la consommation et correction de bugs mineurs.',
                            author: 'Paul Tech',
                            date: '05/03/2024 16:45',
                            replies: 0,
                            hasAction: false,
                            typeColor: 'green',
                            priorityColor: 'gray'
                          }
                        ].map((note) => (
                          <div key={note.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0">
                                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                    <User className="w-5 h-5 text-gray-600" />
                                  </div>
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <span className={`px-2 py-1 text-xs font-medium bg-${note.typeColor}-100 text-${note.typeColor}-700 rounded`}>
                                      {note.type}
                                    </span>
                                    <span className={`px-2 py-1 text-xs font-medium bg-${note.priorityColor}-100 text-${note.priorityColor}-700 rounded`}>
                                      {note.priority}
                                    </span>
                                    {note.hasAction && (
                                      <span className="px-2 py-1 text-xs font-medium bg-[#525252]/10 text-purple-700 rounded flex items-center">
                                        <Clock className="w-3 h-3 mr-1" />
                                        Action requise
                                      </span>
                                    )}
                                  </div>
                                  <h5 className="text-sm font-semibold text-gray-900 mb-1">{note.subject}</h5>
                                  <p className="text-sm text-gray-600 mb-2">{note.content}</p>

                                  {note.hasAction && (
                                    <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-2">
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="text-yellow-700">
                                          <strong>Action:</strong> Assignée à {note.assignedTo}
                                        </span>
                                        <span className="text-yellow-700">
                                          <strong>Échéance:</strong> {note.actionDueDate}
                                        </span>
                                      </div>
                                    </div>
                                  )}

                                  <div className="flex items-center justify-between text-xs text-gray-700">
                                    <div className="flex items-center space-x-3">
                                      <span>{note.author}</span>
                                      <span>{note.date}</span>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                      {note.replies > 0 && (
                                        <button className="flex items-center text-[#171717] hover:text-[#262626]">
                                          <FileText className="w-3 h-3 mr-1" />
                                          {note.replies} réponse{note.replies > 1 ? 's' : ''}
                                        </button>
                                      )}
                                      <button className="text-gray-600 hover:text-gray-800">
                                        <Edit className="w-3 h-3" />
                                      </button>
                                      <button className="text-red-600 hover:text-red-800" aria-label="Supprimer">
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Load More */}
                      <div className="text-center">
                        <button className="px-4 py-2 text-sm text-[#171717] hover:text-[#262626] font-medium">
                          Charger plus de notes...
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 text-sm text-gray-700">
                    <Wifi className="w-4 h-4" />
                    <span>Services intégrés actifs</span>
                  </div>
                  {capitationData && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      Capitation connecté
                    </span>
                  )}
                  {wiseFMData && (
                    <span className="text-xs bg-[#171717]/20 text-[#262626] px-2 py-1 rounded-full">
                      WiseFM connecté
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  <ElegantButton variant="outline" onClick={() => setShowNewAssetModal(false)}>
                    Annuler
                  </ElegantButton>
                  <ElegantButton variant="primary" onClick={handleSaveAsset}>
                    Créer l'actif
                  </ElegantButton>
                </div>
              </div>
