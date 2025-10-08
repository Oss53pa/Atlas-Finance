import React, { useState } from 'react';
import WorkspaceLayout from '../../components/layout/WorkspaceLayout';
import { 
  Settings, 
  Users, 
  Building2,
  Shield, 
  Database,
  Activity,
  Server,
  Key,
  Globe,
  Palette,
  Code,
  Cpu,
  HardDrive,
  Wifi,
  Download,
  Upload,
  Eye,
  Edit,
  Trash2,
  UserPlus,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Monitor,
  Smartphone,
  Tablet
} from 'lucide-react';

const AdminWorkspace: React.FC = () => {
  const [activeModule, setActiveModule] = useState('dashboard');

  // Sidebar administrateur
  const sidebar = (
    <div className="p-4">
      <div className="space-y-6">
        {/* Section Entreprise */}
        <div>
          <h3 className="text-xs font-semibold text-[#767676] uppercase tracking-wide mb-2">Entreprise</h3>
          <div className="space-y-1">
            {[
              { id: 'dashboard', label: 'Vue d\'ensemble', icon: Monitor },
              { id: 'company', label: 'Informations légales', icon: Building2 },
              { id: 'landing', label: 'Page d\'accueil', icon: Globe },
              { id: 'branding', label: 'Identité visuelle', icon: Palette },
            ].map((item) => {
              const IconComponent = item.icon;
              const isActive = activeModule === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveModule(item.id)}
                  className={`
                    w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors
                    ${isActive 
                      ? 'text-white' 
                      : 'text-[#444444] hover:text-[#7A99AC] hover:bg-gray-50'
                    }
                  `}
                  style={{
                    background: isActive ? 'linear-gradient(135deg, #7A99AC 0%, #6A89AC 100%)' : undefined
                  }}
                >
                  <IconComponent className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section Utilisateurs */}
        <div>
          <h3 className="text-xs font-semibold text-[#767676] uppercase tracking-wide mb-2">Utilisateurs</h3>
          <div className="space-y-1">
            {[
              { id: 'users', label: 'Gestion utilisateurs', icon: Users, badge: '24' },
              { id: 'roles', label: 'Rôles & permissions', icon: Key },
              { id: 'sessions', label: 'Sessions actives', icon: Activity },
            ].map((item) => {
              const IconComponent = item.icon;
              const isActive = activeModule === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveModule(item.id)}
                  className={`
                    w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors
                    ${isActive 
                      ? 'text-white' 
                      : 'text-[#444444] hover:text-[#7A99AC] hover:bg-gray-50'
                    }
                  `}
                  style={{
                    background: isActive ? 'linear-gradient(135deg, #7A99AC 0%, #6A89AC 100%)' : undefined
                  }}
                >
                  <div className="flex items-center space-x-3">
                    <IconComponent className="w-4 h-4" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`
                      px-2 py-0.5 text-xs font-medium rounded-full
                      ${isActive ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-600'}
                    `}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section Système */}
        <div>
          <h3 className="text-xs font-semibold text-[#767676] uppercase tracking-wide mb-2">Système</h3>
          <div className="space-y-1">
            {[
              { id: 'system', label: 'Paramètres système', icon: Settings },
              { id: 'security', label: 'Sécurité', icon: Shield },
              { id: 'integrations', label: 'Intégrations', icon: Code },
              { id: 'backups', label: 'Sauvegardes', icon: Database },
            ].map((item) => {
              const IconComponent = item.icon;
              const isActive = activeModule === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveModule(item.id)}
                  className={`
                    w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors
                    ${isActive 
                      ? 'text-white' 
                      : 'text-[#444444] hover:text-[#7A99AC] hover:bg-gray-50'
                    }
                  `}
                  style={{
                    background: isActive ? 'linear-gradient(135deg, #7A99AC 0%, #6A89AC 100%)' : undefined
                  }}
                >
                  <IconComponent className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  // Dashboard administrateur
  const renderDashboard = () => (
    <div className="p-6 space-y-6">
      {/* Statut système */}
      <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[#191919]">Console d'Administration</h2>
          <div className="flex items-center space-x-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Système opérationnel</span>
          </div>
        </div>

        {/* Métriques système */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[
            { title: 'Utilisateurs actifs', value: '24', icon: Users, color: '#7A99AC', status: 'good' },
            { title: 'CPU', value: '23%', icon: Cpu, color: '#6A8A82', status: 'good' },
            { title: 'Stockage', value: '68%', icon: HardDrive, color: '#B87333', status: 'warning' },
            { title: 'Uptime', value: '99.9%', icon: Activity, color: '#6A8A82', status: 'good' }
          ].map((metric, index) => {
            const IconComponent = metric.icon;
            return (
              <div key={index} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <IconComponent className="w-5 h-5" style={{color: metric.color}} />
                  <div className={`w-2 h-2 rounded-full ${
                    metric.status === 'good' ? 'bg-green-500' :
                    metric.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                </div>
                <div className="text-2xl font-bold text-[#191919] mb-1">{metric.value}</div>
                <div className="text-sm text-[#444444]">{metric.title}</div>
              </div>
            );
          })}
        </div>

        {/* Monitoring temps réel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <h3 className="font-semibold text-[#191919] mb-3">Performance Serveur</h3>
            <div className="space-y-3">
              {[
                { label: 'CPU Usage', value: '23%', max: '100%', color: '#6A8A82' },
                { label: 'Mémoire RAM', value: '45%', max: '100%', color: '#B87333' },
                { label: 'Stockage SSD', value: '68%', max: '100%', color: '#7A99AC' },
                { label: 'Bande passante', value: '12%', max: '100%', color: '#6A8A82' },
              ].map((item, index) => (
                <div key={index}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[#444444]">{item.label}</span>
                    <span className="font-medium text-[#191919]">{item.value}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full transition-all duration-300"
                      style={{
                        backgroundColor: item.color,
                        width: item.value
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-[#191919] mb-3">Connexions Actives</h3>
            <div className="space-y-2">
              {[
                { device: 'Desktop', count: '18', icon: Monitor },
                { device: 'Mobile', count: '4', icon: Smartphone },
                { device: 'Tablet', count: '2', icon: Tablet }
              ].map((conn, index) => {
                const IconComponent = conn.icon;
                return (
                  <div key={index} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                    <div className="flex items-center space-x-2">
                      <IconComponent className="w-4 h-4 text-[#7A99AC]" />
                      <span className="text-sm text-[#444444]">{conn.device}</span>
                    </div>
                    <span className="text-sm font-medium text-[#191919]">{conn.count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Gestion des utilisateurs
  const renderUsers = () => (
    <div className="p-6">
      <div className="bg-white rounded-lg border border-[#E8E8E8]">
        <div className="p-6 border-b border-[#E8E8E8]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-[#191919]">Gestion des Utilisateurs</h2>
              <p className="text-sm text-[#767676]">24 utilisateurs actifs</p>
            </div>
            <button 
              className="px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors flex items-center space-x-2"
              style={{background: 'linear-gradient(135deg, #7A99AC 0%, #6A89AC 100%)'}}
            >
              <UserPlus className="w-4 h-4" />
              <span>Nouvel utilisateur</span>
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E8E8E8]">
                  <th className="text-left py-3 text-xs font-medium text-[#767676] uppercase">Utilisateur</th>
                  <th className="text-left py-3 text-xs font-medium text-[#767676] uppercase">Rôle</th>
                  <th className="text-left py-3 text-xs font-medium text-[#767676] uppercase">Statut</th>
                  <th className="text-left py-3 text-xs font-medium text-[#767676] uppercase">Dernière connexion</th>
                  <th className="text-center py-3 text-xs font-medium text-[#767676] uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { id: 1, name: 'Marie Dupont', email: 'marie@company.com', role: 'Comptable', status: 'active', lastLogin: '2h', avatar: 'MD' },
                  { id: 2, name: 'Jean Martin', email: 'jean@company.com', role: 'Manager', status: 'active', lastLogin: '1h', avatar: 'JM' },
                  { id: 3, name: 'Sophie Bernard', email: 'sophie@company.com', role: 'Comptable', status: 'inactive', lastLogin: '2j', avatar: 'SB' },
                  { id: 4, name: 'Pierre Durand', email: 'pierre@company.com', role: 'Admin', status: 'active', lastLogin: '30min', avatar: 'PD' },
                ].map((user) => (
                  <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                          style={{background: 'linear-gradient(135deg, #7A99AC 0%, #6A89AC 100%)'}}
                        >
                          {user.avatar}
                        </div>
                        <div>
                          <div className="font-medium text-[#191919] text-sm">{user.name}</div>
                          <div className="text-xs text-[#767676]">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        user.role === 'Admin' ? 'bg-purple-100 text-purple-800' :
                        user.role === 'Manager' ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        user.status === 'active' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.status === 'active' ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="py-4 text-sm text-[#767676]">
                      Il y a {user.lastLogin}
                    </td>
                    <td className="py-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button className="text-[#7A99AC] hover:text-[#6A89AC]" aria-label="Voir les détails">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="text-[#6A8A82] hover:text-[#5A7A72]">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="text-[#B85450] hover:text-[#A84440]" aria-label="Supprimer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  // Configuration entreprise
  const renderCompany = () => (
    <div className="p-6">
      <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
        <h2 className="text-xl font-bold text-[#191919] mb-6">Configuration Entreprise</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Informations légales */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[#191919] mb-4">Informations Légales</h3>
            
            <div>
              <label className="block text-sm font-medium text-[#444444] mb-2">Raison sociale</label>
              <input 
                type="text" 
                defaultValue="SARL DEMO WISEBOOK"
                className="w-full px-3 py-2 border border-[#D9D9D9] rounded-lg focus:ring-2 focus:ring-[#7A99AC]/20 focus:border-[#7A99AC]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#444444] mb-2">RCCM</label>
                <input 
                  type="text" 
                  defaultValue="CM-DLA-2024-B-12345"
                  className="w-full px-3 py-2 border border-[#D9D9D9] rounded-lg focus:ring-2 focus:ring-[#7A99AC]/20 focus:border-[#7A99AC]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#444444] mb-2">NIF</label>
                <input 
                  type="text" 
                  defaultValue="M092024123456A"
                  className="w-full px-3 py-2 border border-[#D9D9D9] rounded-lg focus:ring-2 focus:ring-[#7A99AC]/20 focus:border-[#7A99AC]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#444444] mb-2">Secteur d'activité</label>
              <select className="w-full px-3 py-2 border border-[#D9D9D9] rounded-lg focus:ring-2 focus:ring-[#7A99AC]/20 focus:border-[#7A99AC]">
                <option>Services aux entreprises</option>
                <option>Commerce de détail</option>
                <option>Industrie manufacturière</option>
                <option>Agriculture et élevage</option>
              </select>
            </div>
          </div>

          {/* Paramètres SYSCOHADA */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[#191919] mb-4">Paramètres SYSCOHADA</h3>
            
            <div>
              <label className="block text-sm font-medium text-[#444444] mb-2">Exercice comptable</label>
              <div className="grid grid-cols-2 gap-2">
                <input 
                  type="date" 
                  defaultValue="2025-01-01"
                  className="px-3 py-2 border border-[#D9D9D9] rounded-lg focus:ring-2 focus:ring-[#7A99AC]/20 focus:border-[#7A99AC]"
                />
                <input 
                  type="date" 
                  defaultValue="2025-12-31"
                  className="px-3 py-2 border border-[#D9D9D9] rounded-lg focus:ring-2 focus:ring-[#7A99AC]/20 focus:border-[#7A99AC]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#444444] mb-2">Devise principale</label>
              <select className="w-full px-3 py-2 border border-[#D9D9D9] rounded-lg focus:ring-2 focus:ring-[#7A99AC]/20 focus:border-[#7A99AC]">
                <option>XAF - Franc CFA (CEMAC)</option>
                <option>XOF - Franc CFA (UEMOA)</option>
                <option>EUR - Euro</option>
                <option>USD - Dollar US</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#444444] mb-2">Taux TVA par défaut</label>
              <input 
                type="number" 
                step="0.01"
                defaultValue="19.25"
                className="w-full px-3 py-2 border border-[#D9D9D9] rounded-lg focus:ring-2 focus:ring-[#7A99AC]/20 focus:border-[#7A99AC]"
              />
            </div>

            <div className="pt-4 border-t border-[#E8E8E8]">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#444444]">Multi-sociétés</span>
                <div className="relative inline-block w-10 h-6">
                  <div className="w-10 h-6 bg-[#6A8A82] rounded-full p-1">
                    <div className="w-4 h-4 bg-white rounded-full ml-4 transition-all"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-3 mt-8 pt-6 border-t border-[#E8E8E8]">
          <button 
            className="px-6 py-2 text-white font-medium rounded-lg transition-colors"
            style={{background: 'linear-gradient(135deg, #7A99AC 0%, #6A89AC 100%)'}}
          >
            Enregistrer les modifications
          </button>
          <button className="px-6 py-2 border border-[#D9D9D9] text-[#444444] font-medium rounded-lg hover:bg-gray-50 transition-colors">
            Annuler
          </button>
        </div>
      </div>
    </div>
  );

  // Personnalisation landing page
  const renderLanding = () => (
    <div className="p-6">
      <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
        <h2 className="text-xl font-bold text-[#191919] mb-6">Configuration Page d'Accueil</h2>
        
        <div className="space-y-6">
          {/* Aperçu */}
          <div>
            <h3 className="font-semibold text-[#191919] mb-3">Aperçu en Temps Réel</h3>
            <div className="border-2 border-dashed border-[#D9D9D9] rounded-lg p-8 text-center">
              <Globe className="w-12 h-12 text-[#7A99AC] mx-auto mb-3" />
              <p className="text-[#444444]">Aperçu de la landing page</p>
              <p className="text-xs text-[#767676] mt-1">Les modifications apparaîtront ici</p>
            </div>
          </div>

          {/* Configuration */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium text-[#191919]">Contenu Principal</h4>
              
              <div>
                <label className="block text-sm font-medium text-[#444444] mb-2">Titre principal</label>
                <input 
                  type="text" 
                  defaultValue="WiseBook ERP - Solution Comptable Professionnelle"
                  className="w-full px-3 py-2 border border-[#D9D9D9] rounded-lg focus:ring-2 focus:ring-[#7A99AC]/20 focus:border-[#7A99AC]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#444444] mb-2">Sous-titre</label>
                <textarea 
                  defaultValue="Interface personnalisée selon votre fonction. Accédez directement aux outils essentiels pour votre métier comptable."
                  rows={3}
                  className="w-full px-3 py-2 border border-[#D9D9D9] rounded-lg focus:ring-2 focus:ring-[#7A99AC]/20 focus:border-[#7A99AC]"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-[#191919]">Paramètres Visuels</h4>
              
              <div>
                <label className="block text-sm font-medium text-[#444444] mb-2">Logo entreprise</label>
                <div className="border-2 border-dashed border-[#D9D9D9] rounded-lg p-4 text-center">
                  <Upload className="w-8 h-8 text-[#767676] mx-auto mb-2" />
                  <p className="text-sm text-[#444444]">Glisser le logo ici</p>
                  <p className="text-xs text-[#767676]">PNG, JPG max 2MB</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#444444] mb-2">Couleur d'accent</label>
                <div className="flex items-center space-x-3">
                  <input 
                    type="color" 
                    defaultValue="#6A8A82"
                    className="w-12 h-8 rounded border border-[#D9D9D9]"
                  />
                  <span className="text-sm text-[#444444]">#6A8A82 (Vert WiseBook)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeModule) {
      case 'users':
        return renderUsers();
      case 'company':
        return renderCompany();
      case 'landing':
        return renderLanding();
      default:
        return renderDashboard();
    }
  };

  return (
    <WorkspaceLayout
      workspaceTitle="Administration"
      workspaceIcon={Settings}
      sidebar={sidebar}
      userRole="admin"
      notifications={3}
    >
      {renderContent()}
    </WorkspaceLayout>
  );
};

export default AdminWorkspace;