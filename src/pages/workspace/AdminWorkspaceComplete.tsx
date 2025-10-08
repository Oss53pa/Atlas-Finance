import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import WorkspaceLayout from '../../components/layout/WorkspaceLayout';
import {
  Settings,
  Users,
  Building2,
  Shield,
  Database,
  Activity,
  Key,
  Globe,
  Palette,
  Code,
  Monitor,
  ExternalLink,
  Home,
  UserPlus,
  RefreshCw,
  CheckCircle,
  Server,
  Wifi,
  HardDrive,
  Cpu,
  ArrowLeft,
  Brain,
  BarChart3,
  Eye,
  X,
  Download,
  Calculator,
  FileText
} from 'lucide-react';

const AdminWorkspaceComplete: React.FC = () => {
  const [activeModule, setActiveModule] = useState('dashboard');
  const [activeConfigTab, setActiveConfigTab] = useState('entreprise');
  const [configSaved, setConfigSaved] = useState(false);
  const [showAlgoModal, setShowAlgoModal] = useState(false);
  const [selectedAlgo, setSelectedAlgo] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleViewAlgorithm = (algoName: string) => {
    setSelectedAlgo(algoName);
    setShowAlgoModal(true);
  };

  // Liens Admin vers WiseBook
  const adminLinks = [
    { id: 'company', label: 'Configuration entreprise', icon: Building2, path: '/setup' },
    { id: 'users', label: 'Gestion utilisateurs', icon: Users, path: '/security/users', badge: '24' },
    { id: 'roles', label: 'Rôles & permissions', icon: Key, path: '/security/roles' },
    { id: 'system', label: 'Paramètres système', icon: Settings, path: '/parameters' },
    { id: 'integrations', label: 'Intégrations', icon: Code, path: '/config' },
    { id: 'backups', label: 'Sauvegardes', icon: Database, path: '/config' },
  ];

  // Sidebar administrateur
  const sidebar = (
    <div className="p-4">
      {/* Bouton accès direct WiseBook admin */}
      <div className="mb-6">
        <button 
          onClick={() => navigate('/parameters')}
          className="w-full p-4 bg-gradient-to-r from-[#7A99AC] to-[#6A89AC] rounded-lg text-white hover:shadow-lg transition-all group"
        >
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Home className="w-5 h-5" />
            <ExternalLink className="w-4 h-4 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-sm font-semibold">WiseBook Admin</div>
          <div className="text-xs opacity-90">Console d'administration complète</div>
        </button>
      </div>

      {/* Sections organisées */}
      <div className="space-y-6">
        {/* Entreprise */}
        <div>
          <h3 className="text-xs font-semibold text-[#767676] uppercase tracking-wide mb-2">Entreprise</h3>
          <div className="space-y-1">
            <button
              onClick={() => setActiveModule('dashboard')}
              className={`
                w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors
                ${activeModule === 'dashboard'
                  ? 'bg-gradient-to-r from-[#7A99AC] to-[#6A89AC] text-white' 
                  : 'text-[#444444] hover:text-[#7A99AC] hover:bg-gray-50'
                }
              `}
            >
              <Monitor className="w-4 h-4" />
              <span className="text-sm font-medium">Vue d'ensemble</span>
            </button>
            
            <button
              onClick={() => navigate('/setup')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-[#444444] hover:text-[#7A99AC] hover:bg-gray-50 transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <Building2 className="w-4 h-4" />
                <span className="text-sm font-medium">Configuration entreprise</span>
              </div>
              <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-[#444444] hover:text-[#7A99AC] hover:bg-gray-50 transition-colors group"
            >
              <div className="flex items-center space-x-3">
                <Globe className="w-4 h-4" />
                <span className="text-sm font-medium">Page d'accueil</span>
              </div>
              <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        </div>

        {/* Utilisateurs */}
        <div>
          <h3 className="text-xs font-semibold text-[#767676] uppercase tracking-wide mb-2">Utilisateurs</h3>
          <div className="space-y-1">
            {[
              { label: 'Gestion utilisateurs', icon: Users, path: '/security/users', badge: '24' },
              { label: 'Rôles & permissions', icon: Key, path: '/security/roles' },
              { label: 'Sessions actives', icon: Activity, path: '/security' },
            ].map((item) => {
              const IconComponent = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={() => navigate(item.path)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-[#444444] hover:text-[#7A99AC] hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    <IconComponent className="w-4 h-4" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    {item.badge && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-600">
                        {item.badge}
                      </span>
                    )}
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Système */}
        <div>
          <h3 className="text-xs font-semibold text-[#767676] uppercase tracking-wide mb-2">Système</h3>
          <div className="space-y-1">
            <button
              onClick={() => setActiveModule('configuration')}
              className={`
                w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors
                ${activeModule === 'configuration'
                  ? 'bg-gradient-to-r from-[#7A99AC] to-[#6A89AC] text-white'
                  : 'text-[#444444] hover:text-[#7A99AC] hover:bg-gray-50'
                }
              `}
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm font-medium">Centre de Configuration</span>
            </button>

            {[
              { label: 'Paramètres système', icon: Code, path: '/parameters' },
              { label: 'Sécurité', icon: Shield, path: '/security' },
            ].map((item) => {
              const IconComponent = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={() => navigate(item.path)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-[#444444] hover:text-[#7A99AC] hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center space-x-3">
                    <IconComponent className="w-4 h-4" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  // Dashboard admin avec liens
  const renderDashboard = () => (
    <div className="p-6 space-y-6">
      <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-[#191919]">Console d'Administration</h2>
            <p className="text-sm text-[#767676]">Liens directs vers les modules WiseBook</p>
          </div>
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => navigate('/parameters')}
              className="px-4 py-2 bg-[#7A99AC] text-white rounded-lg hover:bg-[#6A89AC] transition-colors flex items-center space-x-2"
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm">Paramètres WiseBook</span>
            </button>
            <div className="flex items-center space-x-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Système en ligne</span>
            </div>
          </div>
        </div>

        {/* Métriques système */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[
            { title: 'Utilisateurs actifs', value: '24', icon: Users, color: '#7A99AC', path: '/security/users' },
            { title: 'Performance', value: '98%', icon: Cpu, color: '#6A8A82', path: '/parameters' },
            { title: 'Stockage', value: '68%', icon: HardDrive, color: '#B87333', path: '/config' },
            { title: 'Sécurité', value: '100%', icon: Shield, color: '#6A8A82', path: '/security' }
          ].map((metric, index) => {
            const IconComponent = metric.icon;
            return (
              <div 
                key={index} 
                className="bg-gray-50 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer group"
                onClick={() => navigate(metric.path)}
              >
                <div className="flex items-center justify-between mb-2">
                  <IconComponent className="w-5 h-5" style={{color: metric.color}} />
                  <ExternalLink className="w-3 h-3 text-[#767676] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-2xl font-bold text-[#191919] mb-1">{metric.value}</div>
                <div className="text-sm text-[#444444]">{metric.title}</div>
                <div className="text-xs text-[#7A99AC] mt-1">Gérer dans WiseBook →</div>
              </div>
            );
          })}
        </div>

        {/* Liens rapides administration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-[#191919] mb-3">Configuration WiseBook</h3>
            <div className="space-y-2">
              {[
                { label: 'Plan comptable SYSCOHADA', path: '/config/accounts' },
                { label: 'Multi-sociétés', path: '/multi-company' },
                { label: 'Paramètres fiscaux', path: '/config/vat-taxes' },
                { label: 'Import/Export', path: '/config/import-export' },
              ].map((config, index) => (
                <button
                  key={index}
                  onClick={() => navigate(config.path)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left border border-[#E8E8E8] hover:border-[#7A99AC] hover:bg-[#7A99AC]/5 transition-colors group"
                >
                  <span className="text-sm text-[#444444]">{config.label}</span>
                  <ExternalLink className="w-3 h-3 text-[#767676] opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-[#191919] mb-3">Gestion Système</h3>
            <div className="space-y-2">
              {[
                { label: 'Utilisateurs et rôles', path: '/security/users' },
                { label: 'Audit et logs', path: '/security' },
                { label: 'Intégrations API', path: '/config' },
                { label: 'Sauvegardes', path: '/parameters' },
              ].map((sys, index) => (
                <button
                  key={index}
                  onClick={() => navigate(sys.path)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left border border-[#E8E8E8] hover:border-[#7A99AC] hover:bg-[#7A99AC]/5 transition-colors group"
                >
                  <span className="text-sm text-[#444444]">{sys.label}</span>
                  <ExternalLink className="w-3 h-3 text-[#767676] opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Module Centre de Configuration
  const renderConfiguration = () => {
    const configTabs = [
      { id: 'entreprise', label: 'Entreprise', icon: Building2 },
      { id: 'utilisateurs', label: 'Utilisateurs', icon: Users, badge: '24' },
      { id: 'securite', label: 'Sécurité', icon: Shield },
      { id: 'system', label: 'Système', icon: Server },
      { id: 'integrations', label: 'Intégrations', icon: Code },
      { id: 'ia', label: 'Algorithme IA', icon: Monitor, badge: '4' },
    ];

    return (
      <div className="p-6 space-y-6">
        {/* Header du module de configuration */}
        <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setActiveModule('dashboard')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-[#444444]" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-[#7A99AC] to-[#6A89AC] flex items-center justify-center">
                  <Settings className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[#191919]">Centre de Configuration</h2>
                  <p className="text-sm text-[#767676]">Paramétrage complet du système WiseBook</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {configSaved && (
                <div className="flex items-center space-x-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                  <CheckCircle className="w-4 h-4" />
                  <span>Configuration sauvegardée</span>
                </div>
              )}
              <button
                onClick={() => { setConfigSaved(true); setTimeout(() => setConfigSaved(false), 3000); }}
                className="px-4 py-2 bg-[#7A99AC] text-white rounded-lg hover:bg-[#6A89AC] transition-colors flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Sauvegarder</span>
              </button>
            </div>
          </div>

          {/* Navigation par onglets */}
          <div className="border-b border-[#E8E8E8]">
            <nav className="flex space-x-8 overflow-x-auto -mb-px">
              {configTabs.map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveConfigTab(tab.id)}
                    className={`
                      flex items-center space-x-2 py-3 border-b-2 font-medium text-sm transition-colors whitespace-nowrap
                      ${activeConfigTab === tab.id
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
                        ${activeConfigTab === tab.id ? 'bg-[#7A99AC] text-white' : 'bg-blue-100 text-blue-600'}
                      `}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Contenu de configuration */}
        <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#E8E8E8]">
              <div>
                <h3 className="text-lg font-bold text-[#191919]">
                  {configTabs.find(t => t.id === activeConfigTab)?.label}
                </h3>
                <p className="text-sm text-[#767676] mt-1">
                  Configurez les paramètres de {configTabs.find(t => t.id === activeConfigTab)?.label.toLowerCase()}
                </p>
              </div>
              <button
                onClick={() => navigate('/config')}
                className="flex items-center space-x-2 px-4 py-2 border border-[#7A99AC] text-[#7A99AC] rounded-lg hover:bg-[#7A99AC]/5 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="text-sm">Mode avancé</span>
              </button>
            </div>

            {/* Rendu conditionnel selon l'onglet */}
            {activeConfigTab === 'ia' ? (
              // Contenu complet de l'onglet IA
              <div className="space-y-6">
                {/* Statistiques IA */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-purple-900">🧠 Modèles Actifs</h4>
                      <Brain className="w-8 h-8 text-purple-600" />
                    </div>
                    <p className="text-3xl font-bold text-purple-900">4/6</p>
                    <p className="text-sm text-purple-700 mt-2">Modèles opérationnels</p>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-green-900">📊 Précision Moyenne</h4>
                      <BarChart3 className="w-8 h-8 text-green-600" />
                    </div>
                    <p className="text-3xl font-bold text-green-900">92.4%</p>
                    <p className="text-sm text-green-700 mt-2">Sur tous les modèles</p>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-blue-900">⚡ Prédictions/Jour</h4>
                      <Server className="w-8 h-8 text-blue-600" />
                    </div>
                    <p className="text-3xl font-bold text-blue-900">1,247</p>
                    <p className="text-sm text-blue-700 mt-2">Calculs effectués</p>
                  </div>
                </div>

                {/* Liste des modèles IA */}
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-[#191919] flex items-center">
                    <Brain className="w-5 h-5 mr-2 text-purple-600" />
                    Modèles d'Intelligence Artificielle
                  </h3>

                  {/* Modèle 1: Prédiction Trésorerie */}
                  <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <BarChart3 className="w-6 h-6 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-[#191919]">Prédiction de Trésorerie</h4>
                          <p className="text-sm text-[#767676] mt-1">
                            Analyse prédictive des flux de trésorerie basée sur l'historique
                          </p>
                          <div className="flex items-center gap-4 mt-3">
                            <span className="text-xs text-[#444444]">Précision: <span className="font-bold text-green-600">94.2%</span></span>
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Actif</span>
                            <span className="text-xs text-[#767676]">Dernière formation: Il y a 2 jours</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => handleViewAlgorithm('Prédiction de Trésorerie')} className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2 text-sm">
                          <Eye className="w-4 h-4" />
                          <span>Voir Algorithme</span>
                        </button>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" defaultChecked />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Modèle 2: Détection Anomalies */}
                  <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="p-2 bg-red-100 rounded-lg">
                          <Shield className="w-6 h-6 text-red-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-[#191919]">Détection d'Anomalies</h4>
                          <p className="text-sm text-[#767676] mt-1">
                            Identification automatique des transactions inhabituelles
                          </p>
                          <div className="flex items-center gap-4 mt-3">
                            <span className="text-xs text-[#444444]">Précision: <span className="font-bold text-green-600">89.7%</span></span>
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Actif</span>
                            <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">3 alertes aujourd'hui</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => handleViewAlgorithm('Détection d\'Anomalies')} className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2 text-sm">
                          <Eye className="w-4 h-4" />
                          <span>Voir Algorithme</span>
                        </button>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" defaultChecked />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Modèle 3: Recommandations Comptables */}
                  <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Brain className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-[#191919]">Recommandations Comptables</h4>
                          <p className="text-sm text-[#767676] mt-1">
                            Suggestions intelligentes de comptes et d'écritures
                          </p>
                          <div className="flex items-center gap-4 mt-3">
                            <span className="text-xs text-[#444444]">Précision: <span className="font-bold text-green-600">96.1%</span></span>
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Actif</span>
                            <span className="text-xs text-[#767676]">87% des suggestions utilisées</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => handleViewAlgorithm('Recommandations Comptables')} className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2 text-sm">
                          <Eye className="w-4 h-4" />
                          <span>Voir Algorithme</span>
                        </button>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" defaultChecked />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Modèle 4: Analyse Risques Clients */}
                  <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="p-2 bg-orange-100 rounded-lg">
                          <Users className="w-6 h-6 text-orange-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-[#191919]">Analyse de Risques Clients</h4>
                          <p className="text-sm text-[#767676] mt-1">
                            Évaluation du risque de défaut de paiement
                          </p>
                          <div className="flex items-center gap-4 mt-3">
                            <span className="text-xs text-[#444444]">Précision: <span className="font-bold text-green-600">91.3%</span></span>
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Actif</span>
                            <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">12 clients à risque</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => handleViewAlgorithm('Analyse de Risques Clients')} className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2 text-sm">
                          <Eye className="w-4 h-4" />
                          <span>Voir Algorithme</span>
                        </button>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" defaultChecked />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Modèles inactifs */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="p-2 bg-gray-200 rounded-lg">
                          <Calculator className="w-6 h-6 text-gray-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-700">Optimisation Budgétaire</h4>
                          <p className="text-sm text-gray-700 mt-1">
                            Suggestions d'optimisation des dépenses (En formation)
                          </p>
                          <div className="flex items-center gap-4 mt-3">
                            <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded-full">Inactif</span>
                            <span className="text-xs text-gray-700">Formation en cours</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button className="px-3 py-1.5 bg-gray-400 text-white rounded-lg cursor-not-allowed flex items-center space-x-2 text-sm" disabled>
                          <Eye className="w-4 h-4" />
                          <span>Voir Algorithme</span>
                        </button>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="p-2 bg-gray-200 rounded-lg">
                          <BarChart3 className="w-6 h-6 text-gray-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-700">Prévision des Ventes</h4>
                          <p className="text-sm text-gray-700 mt-1">
                            Prédiction des ventes futures (Données insuffisantes)
                          </p>
                          <div className="flex items-center gap-4 mt-3">
                            <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded-full">Inactif</span>
                            <span className="text-xs text-gray-700">Nécessite plus de données</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button className="px-3 py-1.5 bg-gray-400 text-white rounded-lg cursor-not-allowed flex items-center space-x-2 text-sm" disabled>
                          <Eye className="w-4 h-4" />
                          <span>Voir Algorithme</span>
                        </button>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions IA */}
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-900 font-medium">🤖 Les modèles IA apprennent continuellement</p>
                      <p className="text-xs text-purple-700 mt-1">Dernière mise à jour automatique: il y a 3 heures</p>
                    </div>
                    <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2">
                      <RefreshCw className="w-4 h-4" />
                      <span className="text-sm">Réentraîner Tous</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              // Grille de paramètres rapides pour les autres onglets
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg border border-[#E8E8E8] hover:border-[#7A99AC] transition-colors cursor-pointer">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Building2 className="w-5 h-5 text-[#7A99AC]" />
                        <h4 className="font-semibold text-[#191919]">Informations entreprise</h4>
                      </div>
                      <ExternalLink className="w-4 h-4 text-[#767676]" />
                    </div>
                    <p className="text-sm text-[#767676]">Nom, adresse, SIRET, logo</p>
                    <button
                      onClick={() => navigate('/setup')}
                      className="mt-3 text-sm text-[#7A99AC] hover:underline"
                    >
                      Modifier →
                    </button>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg border border-[#E8E8E8] hover:border-[#7A99AC] transition-colors cursor-pointer">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Users className="w-5 h-5 text-[#7A99AC]" />
                        <h4 className="font-semibold text-[#191919]">Gestion utilisateurs</h4>
                      </div>
                      <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded-full font-medium">24</span>
                    </div>
                    <p className="text-sm text-[#767676]">Comptes, rôles, permissions</p>
                    <button
                      onClick={() => navigate('/security/users')}
                      className="mt-3 text-sm text-[#7A99AC] hover:underline"
                    >
                      Gérer →
                    </button>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg border border-[#E8E8E8] hover:border-[#7A99AC] transition-colors cursor-pointer">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Database className="w-5 h-5 text-[#7A99AC]" />
                        <h4 className="font-semibold text-[#191919]">Plan comptable SYSCOHADA</h4>
                      </div>
                      <ExternalLink className="w-4 h-4 text-[#767676]" />
                    </div>
                    <p className="text-sm text-[#767676]">Configuration des comptes</p>
                    <button
                      onClick={() => navigate('/config/accounts')}
                      className="mt-3 text-sm text-[#7A99AC] hover:underline"
                    >
                      Configurer →
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg border border-[#E8E8E8] hover:border-[#7A99AC] transition-colors cursor-pointer">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Shield className="w-5 h-5 text-[#7A99AC]" />
                        <h4 className="font-semibold text-[#191919]">Sécurité & accès</h4>
                      </div>
                      <ExternalLink className="w-4 h-4 text-[#767676]" />
                    </div>
                    <p className="text-sm text-[#767676]">MFA, sessions, audit logs</p>
                    <button
                      onClick={() => navigate('/security')}
                      className="mt-3 text-sm text-[#7A99AC] hover:underline"
                    >
                      Configurer →
                    </button>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg border border-[#E8E8E8] hover:border-[#7A99AC] transition-colors cursor-pointer">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Code className="w-5 h-5 text-[#7A99AC]" />
                        <h4 className="font-semibold text-[#191919]">Intégrations API</h4>
                      </div>
                      <span className="px-2 py-1 bg-green-100 text-green-600 text-xs rounded-full font-medium">3</span>
                    </div>
                    <p className="text-sm text-[#767676]">API externes, webhooks</p>
                    <button
                      onClick={() => navigate('/config')}
                      className="mt-3 text-sm text-[#7A99AC] hover:underline"
                    >
                      Gérer →
                    </button>
                  </div>

                  <div
                    role="button"
                    tabIndex={0}
                    className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200 hover:border-purple-300 transition-colors cursor-pointer"
                    onClick={() => setActiveConfigTab('ia')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setActiveConfigTab('ia');
                      }
                    }}
                    aria-label="Accéder aux algorithmes IA"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Monitor className="w-5 h-5 text-purple-600" />
                        <h4 className="font-semibold text-[#191919]">Algorithmes IA</h4>
                      </div>
                      <span className="px-2 py-1 bg-purple-600 text-white text-xs rounded-full font-medium">4</span>
                    </div>
                    <p className="text-sm text-purple-700">Prédictions, détection anomalies</p>
                    <button
                      className="mt-3 text-sm text-purple-600 hover:underline font-medium"
                    >
                      Voir algorithmes →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Liens rapides supplémentaires */}
            <div className="border-t border-[#E8E8E8] pt-6">
              <h4 className="font-semibold text-[#191919] mb-4">Accès rapide</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'TVA & Taxes', path: '/config/vat-taxes' },
                  { label: 'Multi-sociétés', path: '/multi-company' },
                  { label: 'Import/Export', path: '/config/import-export' },
                  { label: 'Sauvegardes', path: '/parameters' },
                ].map((link, index) => (
                  <button
                    key={index}
                    onClick={() => navigate(link.path)}
                    className="px-4 py-2 border border-[#E8E8E8] rounded-lg hover:border-[#7A99AC] hover:bg-[#7A99AC]/5 transition-colors text-sm text-[#444444] hover:text-[#7A99AC]"
                  >
                    {link.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Modal Algorithme IA */}
      {showAlgoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowAlgoModal(false)}>
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Brain className="w-8 h-8" />
                  <div>
                    <h2 className="text-2xl font-bold">{selectedAlgo}</h2>
                    <p className="text-purple-100 text-sm mt-1">Détails de l'algorithme d'intelligence artificielle</p>
                  </div>
                </div>
                <button onClick={() => setShowAlgoModal(false)} className="p-2 hover:bg-purple-700 rounded-lg transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {selectedAlgo === 'Prédiction de Trésorerie' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <p className="text-sm text-purple-700 font-medium">Type d'algorithme</p>
                      <p className="text-lg font-bold text-purple-900 mt-1">LSTM Neural Network</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <p className="text-sm text-green-700 font-medium">Précision actuelle</p>
                      <p className="text-lg font-bold text-green-900 mt-1">94.2%</p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-700 font-medium">Données d'entraînement</p>
                      <p className="text-lg font-bold text-blue-900 mt-1">24,567 transactions</p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-bold text-lg text-[#191919] mb-3">Description</h3>
                    <p className="text-[#444444] leading-relaxed">Ce modèle utilise un réseau de neurones LSTM (Long Short-Term Memory) pour analyser les flux de trésorerie historiques et prédire les mouvements futurs avec une haute précision. L'algorithme prend en compte les tendances saisonnières, les cycles de paiement clients, et les patterns de dépenses.</p>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-bold text-lg text-[#191919] mb-3">Paramètres du modèle</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-[#767676]">Couches cachées</p>
                        <p className="font-semibold text-[#191919]">3 couches (128, 64, 32 neurones)</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-[#767676]">Taux d'apprentissage</p>
                        <p className="font-semibold text-[#191919]">0.001</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-[#767676]">Fenêtre temporelle</p>
                        <p className="font-semibold text-[#191919]">90 jours</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-[#767676]">Dropout</p>
                        <p className="font-semibold text-[#191919]">0.2</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-bold text-lg text-[#191919] mb-3">Variables d'entrée</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-[#444444]">Soldes bancaires historiques</span>
                        <span className="text-sm font-semibold text-purple-600">Importance: 32%</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-[#444444]">Factures clients en attente</span>
                        <span className="text-sm font-semibold text-purple-600">Importance: 28%</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-[#444444]">Échéances fournisseurs</span>
                        <span className="text-sm font-semibold text-purple-600">Importance: 24%</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-[#444444]">Tendances saisonnières</span>
                        <span className="text-sm font-semibold text-purple-600">Importance: 16%</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {selectedAlgo === 'Détection d\'Anomalies' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                      <p className="text-sm text-red-700 font-medium">Type d'algorithme</p>
                      <p className="text-lg font-bold text-red-900 mt-1">Isolation Forest</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <p className="text-sm text-green-700 font-medium">Précision actuelle</p>
                      <p className="text-lg font-bold text-green-900 mt-1">89.7%</p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-700 font-medium">Anomalies détectées</p>
                      <p className="text-lg font-bold text-blue-900 mt-1">147 ce mois</p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-bold text-lg text-[#191919] mb-3">Description</h3>
                    <p className="text-[#444444] leading-relaxed">Cet algorithme utilise la méthode Isolation Forest pour détecter les transactions inhabituelles qui pourraient indiquer des erreurs, des fraudes ou des comportements anormaux. Il apprend continuellement des patterns normaux pour mieux identifier les anomalies.</p>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-bold text-lg text-[#191919] mb-3">Critères de détection</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-[#444444]">Montant inhabituel</span>
                        <span className="text-sm font-semibold text-red-600">Seuil: ±3σ</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-[#444444]">Fréquence anormale</span>
                        <span className="text-sm font-semibold text-red-600">Seuil: ±2.5σ</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-[#444444]">Bénéficiaire inhabituel</span>
                        <span className="text-sm font-semibold text-red-600">Score &lt; 0.3</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-[#444444]">Timing suspect</span>
                        <span className="text-sm font-semibold text-red-600">Hors heures: 22h-6h</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {selectedAlgo === 'Recommandations Comptables' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-700 font-medium">Type d'algorithme</p>
                      <p className="text-lg font-bold text-blue-900 mt-1">Random Forest</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <p className="text-sm text-green-700 font-medium">Précision actuelle</p>
                      <p className="text-lg font-bold text-green-900 mt-1">96.1%</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <p className="text-sm text-purple-700 font-medium">Taux d'adoption</p>
                      <p className="text-lg font-bold text-purple-900 mt-1">87%</p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-bold text-lg text-[#191919] mb-3">Description</h3>
                    <p className="text-[#444444] leading-relaxed">Ce modèle utilise un ensemble d'arbres de décision (Random Forest) pour suggérer les comptes comptables appropriés et proposer des écritures automatiques basées sur l'analyse de milliers de transactions similaires passées.</p>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-bold text-lg text-[#191919] mb-3">Paramètres du modèle</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-[#767676]">Nombre d'arbres</p>
                        <p className="font-semibold text-[#191919]">500 arbres</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-[#767676]">Profondeur maximale</p>
                        <p className="font-semibold text-[#191919]">15 niveaux</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-[#767676]">Variables par split</p>
                        <p className="font-semibold text-[#191919]">√n features</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-[#767676]">Min samples leaf</p>
                        <p className="font-semibold text-[#191919]">10 échantillons</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-bold text-lg text-[#191919] mb-3">Features principales</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-[#444444]">Libellé de la transaction</span>
                        <span className="text-sm font-semibold text-blue-600">Importance: 38%</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-[#444444]">Montant et devise</span>
                        <span className="text-sm font-semibold text-blue-600">Importance: 22%</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-[#444444]">Tiers (client/fournisseur)</span>
                        <span className="text-sm font-semibold text-blue-600">Importance: 25%</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-[#444444]">Historique des comptes utilisés</span>
                        <span className="text-sm font-semibold text-blue-600">Importance: 15%</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {selectedAlgo === 'Analyse de Risques Clients' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <p className="text-sm text-orange-700 font-medium">Type d'algorithme</p>
                      <p className="text-lg font-bold text-orange-900 mt-1">Gradient Boosting</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <p className="text-sm text-green-700 font-medium">Précision actuelle</p>
                      <p className="text-lg font-bold text-green-900 mt-1">91.3%</p>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                      <p className="text-sm text-red-700 font-medium">Clients à risque</p>
                      <p className="text-lg font-bold text-red-900 mt-1">12 actuellement</p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-bold text-lg text-[#191919] mb-3">Description</h3>
                    <p className="text-[#444444] leading-relaxed">Cet algorithme de Gradient Boosting analyse le comportement de paiement des clients pour prédire le risque de défaut. Il combine plusieurs modèles faibles pour créer une prédiction robuste et fiable du risque client.</p>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-bold text-lg text-[#191919] mb-3">Indicateurs de risque</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-[#444444]">Historique de retards</span>
                        <span className="text-sm font-semibold text-orange-600">Importance: 35%</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-[#444444]">Montant des créances</span>
                        <span className="text-sm font-semibold text-orange-600">Importance: 28%</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-[#444444]">Secteur d'activité</span>
                        <span className="text-sm font-semibold text-orange-600">Importance: 18%</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-[#444444]">Santé financière</span>
                        <span className="text-sm font-semibold text-orange-600">Importance: 19%</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-bold text-lg text-[#191919] mb-3">Niveaux de risque</h3>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <div className="flex-1">
                          <p className="font-semibold text-green-900">Risque faible (&lt; 20%)</p>
                          <p className="text-sm text-green-700">Client fiable, paiements réguliers</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                        <div className="flex-1">
                          <p className="font-semibold text-orange-900">Risque moyen (20-60%)</p>
                          <p className="text-sm text-orange-700">Surveillance recommandée</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <div className="flex-1">
                          <p className="font-semibold text-red-900">Risque élevé (&gt; 60%)</p>
                          <p className="text-sm text-red-700">Action immédiate requise</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 p-4 rounded-b-xl border-t flex items-center justify-end space-x-3">
              <button onClick={() => setShowAlgoModal(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
                Fermer
              </button>
              <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2">
                <Download className="w-4 h-4" />
                <span>Exporter les détails</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <WorkspaceLayout
        workspaceTitle="Administration"
      workspaceIcon={Settings}
      sidebar={sidebar}
      userRole="admin"
      notifications={3}
    >
      {activeModule === 'dashboard' ? renderDashboard() : renderConfiguration()}
    </WorkspaceLayout>
    </>
  );
};

export default AdminWorkspaceComplete;