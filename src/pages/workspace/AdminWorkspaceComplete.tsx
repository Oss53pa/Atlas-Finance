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
  Cpu
} from 'lucide-react';

const AdminWorkspaceComplete: React.FC = () => {
  const [activeModule, setActiveModule] = useState('dashboard');
  const navigate = useNavigate();

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
              onClick={() => navigate('/')}
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
            {[
              { label: 'Paramètres système', icon: Settings, path: '/parameters' },
              { label: 'Sécurité', icon: Shield, path: '/security' },
              { label: 'Configuration', icon: Code, path: '/config' },
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

  return (
    <WorkspaceLayout
      workspaceTitle="Administration"
      workspaceIcon={Settings}
      sidebar={sidebar}
      userRole="admin"
      notifications={3}
    >
      {renderDashboard()}
    </WorkspaceLayout>
  );
};

export default AdminWorkspaceComplete;