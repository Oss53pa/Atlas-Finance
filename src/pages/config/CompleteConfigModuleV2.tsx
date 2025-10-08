import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { 
  Settings, Building2, Users, Shield, Database, Globe, Palette,
  ArrowLeft, Home, Save, RefreshCw, Eye, Edit, Check, X,
  Key, Mail, Smartphone, Calendar, DollarSign, Calculator,
  FileText, BarChart3, Upload, Download, Code, Server
} from 'lucide-react';

const CompleteConfigModuleV2: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('entreprise');
  const [configSaved, setConfigSaved] = useState(false);

  // Onglets configuration
  const tabs = [
    { id: 'entreprise', label: 'Entreprise', icon: Building2 },
    { id: 'utilisateurs', label: 'Utilisateurs', icon: Users, badge: '24' },
    { id: 'securite', label: 'Sécurité', icon: Shield },
    { id: 'comptable', label: 'Plan Comptable', icon: Calculator },
    { id: 'fiscal', label: 'Paramètres Fiscaux', icon: FileText },
    { id: 'import', label: 'Import/Export', icon: Database },
    { id: 'systeme', label: 'Système', icon: Server },
    { id: 'integrations', label: 'Intégrations', icon: Code },
  ];

  const handleSave = () => {
    setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 3000);
  };

  return (
    <div className="p-6 bg-[#ECECEC] min-h-screen font-['Sometype Mono']">
      {/* Header */}
      <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => navigate('/dashboard/admin')}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-[#444444]" />
              <span className="text-sm font-semibold text-[#444444]">Admin</span>
            </button>
            
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-[#7A99AC] to-[#6A89AC] flex items-center justify-center">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#191919]">Centre de Configuration</h1>
                <p className="text-sm text-[#767676]">Paramétrage complet du système</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {configSaved && (
              <div className="flex items-center space-x-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                <Check className="w-4 h-4" />
                <span>Configuration sauvegardée</span>
              </div>
            )}
            
            <button 
              onClick={() => navigate('/executive')}
              className="px-4 py-2 bg-[#7A99AC] text-white rounded-lg hover:bg-[#6A89AC] transition-colors flex items-center space-x-2"
            >
              <Home className="w-4 h-4" />
              <span className="text-sm">Executive</span>
            </button>
            
            <button className="p-2 border border-[#D9D9D9] rounded-lg hover:bg-gray-50" aria-label="Actualiser">
              <RefreshCw className="w-4 h-4 text-[#767676]" />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation par onglets */}
      <div className="bg-white rounded-lg border border-[#E8E8E8] shadow-sm">
        <div className="px-6 border-b border-[#E8E8E8]">
          <nav className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap
                    ${activeTab === tab.id 
                      ? 'border-[#7A99AC] text-[#7A99AC]' 
                      : 'border-transparent text-[#767676] hover:text-[#444444]'
                    }
                  `}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className={`
                      px-2 py-0.5 text-xs font-medium rounded-full
                      ${activeTab === tab.id ? 'bg-[#7A99AC] text-white' : 'bg-blue-100 text-blue-600'}
                    `}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Contenu organisé */}
        <div className="p-6">
          {activeTab === 'entreprise' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Informations légales */}
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h3 className="font-semibold text-[#191919] mb-4">🏢 Informations Légales</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[#444444] mb-2">Raison sociale</label>
                      <input 
                        type="text" 
                        defaultValue="SARL DEMO WISEBOOK"
                        className="w-full px-3 py-2 border border-[#D9D9D9] rounded-lg focus:ring-2 focus:ring-[#7A99AC]/20"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[#444444] mb-2">RCCM</label>
                        <input 
                          type="text" 
                          defaultValue="CM-DLA-2024-B-12345"
                          className="w-full px-3 py-2 border border-[#D9D9D9] rounded-lg focus:ring-2 focus:ring-[#7A99AC]/20"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#444444] mb-2">NIF</label>
                        <input 
                          type="text" 
                          defaultValue="M092024123456A"
                          className="w-full px-3 py-2 border border-[#D9D9D9] rounded-lg focus:ring-2 focus:ring-[#7A99AC]/20"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#444444] mb-2">Secteur d'activité</label>
                      <select className="w-full px-3 py-2 border border-[#D9D9D9] rounded-lg focus:ring-2 focus:ring-[#7A99AC]/20">
                        <option>Services aux entreprises</option>
                        <option>Commerce de détail</option>
                        <option>Industrie manufacturière</option>
                        <option>Agriculture et élevage</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Paramètres comptables */}
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h3 className="font-semibold text-[#191919] mb-4">📊 Paramètres Comptables</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[#444444] mb-2">Exercice comptable</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="date" defaultValue="2025-01-01" className="px-3 py-2 border border-[#D9D9D9] rounded-lg focus:ring-2 focus:ring-[#7A99AC]/20" />
                        <input type="date" defaultValue="2025-12-31" className="px-3 py-2 border border-[#D9D9D9] rounded-lg focus:ring-2 focus:ring-[#7A99AC]/20" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#444444] mb-2">Devise principale</label>
                      <select className="w-full px-3 py-2 border border-[#D9D9D9] rounded-lg focus:ring-2 focus:ring-[#7A99AC]/20">
                        <option>XAF - Franc CFA (CEMAC)</option>
                        <option>XOF - Franc CFA (UEMOA)</option>
                        <option>EUR - Euro</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#444444] mb-2">Taux TVA par défaut</label>
                      <input 
                        type="number" 
                        step="0.01"
                        defaultValue="19.25"
                        className="w-full px-3 py-2 border border-[#D9D9D9] rounded-lg focus:ring-2 focus:ring-[#7A99AC]/20"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'utilisateurs' && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-[#191919]">👥 Gestion des Utilisateurs</h3>
                  <button className="px-4 py-2 bg-[#7A99AC] text-white rounded-lg hover:bg-[#6A89AC] transition-colors flex items-center space-x-2">
                    <Users className="w-4 h-4" />
                    <span className="text-sm">Module complet</span>
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  {[
                    { role: 'Comptables', count: 8, color: '#6A8A82', icon: Calculator },
                    { role: 'Managers', count: 4, color: '#B87333', icon: BarChart3 },
                    { role: 'Admins', count: 2, color: '#7A99AC', icon: Shield },
                    { role: 'Consultants', count: 10, color: '#6A8A82', icon: Eye }
                  ].map((group, index) => {
                    const IconComponent = group.icon;
                    return (
                      <div key={index} className="text-center p-4 rounded-lg bg-gray-50">
                        <IconComponent className="w-6 h-6 mx-auto mb-2" style={{color: group.color}} />
                        <p className="text-xl font-bold text-[#191919]">{group.count}</p>
                        <p className="text-sm text-[#444444]">{group.role}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Utilisateurs récents */}
                <div className="space-y-2">
                  {[
                    { nom: 'Marie Dupont', email: 'marie@company.com', role: 'Comptable', statut: 'actif', derniere: '2h' },
                    { nom: 'Jean Martin', email: 'jean@company.com', role: 'Manager', statut: 'actif', derniere: '1h' },
                    { nom: 'Sophie Bernard', email: 'sophie@company.com', role: 'Comptable', statut: 'inactif', derniere: '2j' }
                  ].map((user, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-[#E8E8E8] hover:bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-[#7A99AC] text-white flex items-center justify-center text-sm font-bold">
                          {user.nom.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#191919]">{user.nom}</p>
                          <p className="text-xs text-[#767676]">{user.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                          user.statut === 'actif' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {user.statut}
                        </span>
                        <p className="text-xs text-[#767676] mt-1">Il y a {user.derniere}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'securite' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Paramètres sécurité */}
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h3 className="font-semibold text-[#191919] mb-4">🔒 Paramètres de Sécurité</h3>
                  <div className="space-y-4">
                    {[
                      { param: 'Authentification 2FA', active: true, description: 'Code SMS/Email requis' },
                      { param: 'Sessions automatiques', active: true, description: 'Déconnexion après 30min' },
                      { param: 'Logs détaillés', active: true, description: 'Audit trail complet' },
                      { param: 'Restrictions IP', active: false, description: 'Accès par géolocalisation' }
                    ].map((param, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                        <div>
                          <p className="text-sm font-medium text-[#191919]">{param.param}</p>
                          <p className="text-xs text-[#767676]">{param.description}</p>
                        </div>
                        <div className="relative inline-block w-10 h-6">
                          <div className={`w-10 h-6 rounded-full p-1 transition-colors ${
                            param.active ? 'bg-[#6A8A82]' : 'bg-gray-300'
                          }`}>
                            <div className={`w-4 h-4 bg-white rounded-full transition-all ${
                              param.active ? 'ml-4' : 'ml-0'
                            }`}></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Journal de sécurité */}
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h3 className="font-semibold text-[#191919] mb-4">🛡️ Journal de Sécurité</h3>
                  <div className="space-y-2">
                    {[
                      { heure: '14:30', evenement: 'Connexion réussie', user: 'marie@company.com', type: 'success' },
                      { heure: '12:15', evenement: 'Modification permissions', user: 'admin@company.com', type: 'info' },
                      { heure: '09:45', evenement: 'Tentative connexion échouée', user: 'unknown', type: 'warning' }
                    ].map((log, index) => (
                      <div key={index} className={`p-2 rounded border-l-4 ${
                        log.type === 'success' ? 'bg-green-50 border-green-400' :
                        log.type === 'warning' ? 'bg-yellow-50 border-yellow-400' :
                        'bg-blue-50 border-blue-400'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-[#191919]">{log.evenement}</p>
                            <p className="text-xs text-[#767676]">{log.user}</p>
                          </div>
                          <span className="text-xs text-[#767676]">{log.heure}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'comptable' && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-[#191919]">🧮 Plan Comptable SYSCOHADA</h3>
                  <button 
                    onClick={() => navigate('/config/accounts')}
                    className="px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#5A7A72] transition-colors text-sm"
                  >
                    Module complet
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  {[
                    { classe: '1', nom: 'Ressources', comptes: 45, color: '#6A8A82' },
                    { classe: '2', nom: 'Actif Immobilisé', comptes: 67, color: '#B87333' },
                    { classe: '3', nom: 'Stocks', comptes: 23, color: '#7A99AC' },
                    { classe: '4', nom: 'Tiers', comptes: 89, color: '#6A8A82' }
                  ].map((classe, index) => (
                    <div key={index} className="text-center p-4 rounded-lg bg-gray-50">
                      <div 
                        className="w-12 h-12 rounded-lg text-white text-xl font-bold flex items-center justify-center mx-auto mb-2"
                        style={{backgroundColor: classe.color}}
                      >
                        {classe.classe}
                      </div>
                      <p className="font-medium text-[#191919] text-sm">{classe.nom}</p>
                      <p className="text-xs text-[#767676]">{classe.comptes} comptes</p>
                    </div>
                  ))}
                </div>

                {/* Configuration rapide */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { param: 'Auto-complétion', active: true },
                    { param: 'Validation SYSCOHADA', active: true },
                    { param: 'Comptes analytiques', active: false },
                    { param: 'Multi-devises', active: true }
                  ].map((config, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-[#E8E8E8]">
                      <span className="text-sm text-[#444444]">{config.param}</span>
                      <div className="relative inline-block w-8 h-5">
                        <div className={`w-8 h-5 rounded-full p-0.5 transition-colors ${
                          config.active ? 'bg-[#6A8A82]' : 'bg-gray-300'
                        }`}>
                          <div className={`w-3 h-3 bg-white rounded-full transition-all ${
                            config.active ? 'ml-3' : 'ml-0'
                          }`}></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'systeme' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Performance système */}
                <div className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
                  <h4 className="font-semibold text-[#191919] mb-3">⚡ Performance</h4>
                  <div className="space-y-3">
                    {[
                      { metric: 'CPU', valeur: '23%', status: 'optimal' },
                      { metric: 'RAM', valeur: '45%', status: 'normal' },
                      { metric: 'Stockage', valeur: '68%', status: 'attention' }
                    ].map((perf, index) => (
                      <div key={index} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-[#444444]">{perf.metric}</span>
                          <span className="font-medium text-[#191919]">{perf.valeur}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1">
                          <div 
                            className={`h-1 rounded-full ${
                              perf.status === 'optimal' ? 'bg-green-500' :
                              perf.status === 'normal' ? 'bg-blue-500' : 'bg-yellow-500'
                            }`}
                            style={{width: perf.valeur}}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sauvegardes */}
                <div className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
                  <h4 className="font-semibold text-[#191919] mb-3">💾 Sauvegardes</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#444444]">Dernière sauvegarde</span>
                      <span className="text-[#6A8A82] font-medium">Il y a 2h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#444444]">Fréquence</span>
                      <span className="text-[#191919]">Toutes les 4h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#444444]">Rétention</span>
                      <span className="text-[#191919]">30 jours</span>
                    </div>
                  </div>
                  <button className="w-full mt-3 px-3 py-2 bg-[#7A99AC] text-white rounded-lg hover:bg-[#6A89AC] transition-colors text-sm">
                    Sauvegarder maintenant
                  </button>
                </div>

                {/* Maintenance */}
                <div className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
                  <h4 className="font-semibold text-[#191919] mb-3">🔧 Maintenance</h4>
                  <div className="space-y-2">
                    {[
                      { tache: 'Optimisation DB', statut: 'planifiée', heure: 'Dimanche 03:00' },
                      { tache: 'Mise à jour sécurité', statut: 'en_cours', heure: 'Maintenant' },
                      { tache: 'Nettoyage logs', statut: 'terminée', heure: 'Hier 22:00' }
                    ].map((maintenance, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="text-[#444444]">{maintenance.tache}</span>
                        <div className="text-right">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            maintenance.statut === 'terminée' ? 'bg-green-100 text-green-700' :
                            maintenance.statut === 'en_cours' ? 'bg-blue-100 text-blue-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {maintenance.statut}
                          </span>
                          <p className="text-xs text-[#767676] mt-1">{maintenance.heure}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions globales */}
        <div className="px-6 py-4 border-t border-[#E8E8E8] bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-[#767676]">
              Dernière modification: Il y a 2h par Pierre Durand
            </div>
            <div className="flex items-center space-x-3">
              <button className="px-4 py-2 border border-[#D9D9D9] text-[#444444] rounded-lg hover:bg-gray-100 transition-colors">
                Annuler
              </button>
              <button 
                onClick={handleSave}
                className="px-6 py-2 bg-[#7A99AC] text-white rounded-lg hover:bg-[#6A89AC] transition-colors flex items-center space-x-2" aria-label="Enregistrer">
                <Save className="w-4 h-4" />
                <span>{t('actions.save')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompleteConfigModuleV2;