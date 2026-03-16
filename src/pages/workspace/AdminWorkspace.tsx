// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { themes } from '../../styles/theme';
import type { ThemeType } from '../../styles/theme';

const APP_VERSION = __APP_VERSION__ || '3.0.0';

const themeLabels: Record<string, string> = {
  atlasFinance: 'Atlas Finance',
  oceanBlue: 'Ocean Blue',
  forestGreen: 'Forest Green',
  midnightDark: 'Mode Sombre',
  sahelGold: 'Sahel Gold',
  royalIndigo: 'Royal Indigo',
};

const languageLabels: Record<string, string> = {
  fr: 'Français',
  en: 'English',
  es: 'Español',
};
import CompleteTasksModule from '../../components/tasks/CompleteTasksModule';
import CollaborationModule from '../../components/collaboration/CollaborationModule';
import DataMigrationImport from '../../components/admin/DataMigrationImport';
import AdminUsers from '../../components/admin/sections/AdminUsers';
import AdminSecurity from '../../components/admin/sections/AdminSecurity';
import AdminCompany from '../../components/admin/sections/AdminCompany';
import AdminBackup from '../../components/admin/sections/AdminBackup';
import AdminImportExport from '../../components/admin/sections/AdminImportExport';
import AdminAuditTrail from '../../components/admin/sections/AdminAuditTrail';
import AdminAPI from '../../components/admin/sections/AdminAPI';
import AdminTaxRegistry from '../admin/sections/AdminTaxRegistry';
import {
  Shield, FileText, BarChart3, Users, Upload,
  CheckCircle, ExternalLink,
  ArrowLeft, Bell, HelpCircle, User, Search, Menu, X, Settings, LogOut, ChevronDown,
  Mail, BookMarked, MessageCircle, FileQuestion, Video, Headphones,
  Activity, FolderOpen, ListTodo, MessageSquare, LayoutDashboard,
  Server, Database, Lock, AlertTriangle, Cog, Briefcase
} from 'lucide-react';

const AdminWorkspace: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();
  const { themeType, setTheme } = useTheme();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { adapter } = useData();
  const [adminStats, setAdminStats] = useState({ entries: 0, accounts: 0, thirdParties: 0, drafts: 0 });
  const [companyPhone, setCompanyPhone] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [workspaceSwitcherOpen, setWorkspaceSwitcherOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('workspace');
  const [adminSubTab, setAdminSubTab] = useState(0);

  const changeSection = (section: string) => { setActiveSection(section); setAdminSubTab(0); };

  const workspaceOptions = [
    { label: 'Espace Admin', path: '/workspace/admin', icon: Shield, color: '#ef4444', current: true },
    { label: 'Espace Manager', path: '/workspace/manager', icon: Briefcase, color: '#171717', current: false },
    { label: 'Espace Comptable', path: '/workspace/comptable', icon: BarChart3, color: '#525252', current: false },
  ];

  const sidebarAdminLinks = [
    { id: 'users', label: 'Utilisateurs & Droits', icon: Users },
    { id: 'security', label: 'Securite & Roles', icon: Lock },
    { id: 'company', label: 'Societe & Comptabilite', icon: Briefcase },
    { id: 'backup', label: 'Sauvegardes', icon: Database },
    { id: 'import-export', label: 'Import / Export', icon: FolderOpen },
    { id: 'migration', label: 'Migration donnees', icon: Upload },
    { id: 'audit-trail', label: 'Piste d\'Audit', icon: FileText },
    { id: 'api', label: 'API & Integrations', icon: Server },
    { id: 'tax-registry', label: 'Registre Fiscal', icon: Cog },
  ];

  const handleLogout = () => { logout(); navigate('/'); };
  const userData = { name: user?.name || '', email: user?.email || '', role: user?.role || '', phone: user?.phone || '', department: user?.department || '', twoFactorEnabled: user?.twoFactorEnabled ?? false };

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [entries, accounts, thirdParties] = await Promise.all([
          adapter.getAll<any>('journalEntries'),
          adapter.getAll<any>('accounts'),
          adapter.getAll<any>('thirdParties'),
        ]);
        const drafts = entries.filter((e: any) => e.status === 'draft').length;
        setAdminStats({
          entries: entries.length,
          accounts: accounts.length,
          thirdParties: thirdParties.length,
          drafts,
        });
        // Charger le téléphone de la société
        const companies = await adapter.getAll<any>('companies');
        if (companies.length > 0) {
          setCompanyPhone(companies[0].phone || companies[0].telephone || '');
        }
      } catch (err) {
        console.error('Erreur chargement stats admin:', err);
      }
    };
    loadStats();
  }, [adapter]);

  const renderProfile = () => (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Mon Profil</h2>
        <button onClick={() => setActiveSection('workspace')} className="px-4 py-2 text-sm text-[#ef4444] hover:bg-[#ef4444]/10 rounded-lg">Retour</button>
      </div>
      <div className="bg-white rounded-xl p-6 border">
        <div className="flex items-start space-x-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-r from-[#ef4444] to-[#ef4444] flex items-center justify-center"><Shield className="w-12 h-12 text-white" /></div>
          <div><h3 className="text-lg font-bold">{userData.name}</h3><p className="text-[#ef4444]">{userData.role}</p><p className="text-sm text-gray-500">{userData.department}</p></div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border">
          <h4 className="font-semibold mb-4 flex items-center"><Mail className="w-5 h-5 mr-2 text-[#ef4444]" />Contact</h4>
          <p><span className="text-xs text-gray-500">Email:</span> {userData.email}</p>
          <p className="mt-2"><span className="text-xs text-gray-500">Tel:</span> {userData.phone}</p>
        </div>
        <div className="bg-white rounded-xl p-6 border">
          <h4 className="font-semibold mb-4 flex items-center"><Lock className="w-5 h-5 mr-2 text-[#ef4444]" />Securite</h4>
          <button className="w-full p-3 border rounded-lg text-sm hover:border-[#ef4444] mb-2">Changer mot de passe</button>
          <button className="w-full p-3 border rounded-lg text-sm hover:border-[#ef4444] flex justify-between"><span>2FA</span><span className={`text-xs px-2 py-1 rounded ${userData.twoFactorEnabled ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{userData.twoFactorEnabled ? 'Actif' : 'Off'}</span></button>
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Parametres Systeme</h2>
        <button onClick={() => setActiveSection('workspace')} className="px-4 py-2 text-sm text-[#ef4444] hover:bg-[#ef4444]/10 rounded-lg">Retour</button>
      </div>
      <div className="bg-white rounded-xl p-6 border">
        <h4 className="font-semibold mb-4">Affichage</h4>
        <div className="space-y-4">
          <div className="flex justify-between p-4 border rounded-lg"><div><p className="font-medium">Theme</p></div><select className="border rounded px-3 py-1" value={themeType} onChange={e => setTheme(e.target.value as ThemeType)}>{Object.keys(themes).map(key => (<option key={key} value={key}>{themeLabels[key] || key}</option>))}</select></div>
          <div className="flex justify-between p-4 border rounded-lg"><div><p className="font-medium">Langue</p></div><select className="border rounded px-3 py-1" value={language} onChange={e => setLanguage(e.target.value as 'fr' | 'en' | 'es')}>{Object.entries(languageLabels).map(([key, label]) => (<option key={key} value={key}>{label}</option>))}</select></div>
        </div>
      </div>
      <div className="bg-white rounded-xl p-6 border">
        <h4 className="font-semibold mb-4">Maintenance</h4>
        <div className="space-y-3">
          <button className="w-full p-4 border rounded-lg text-left hover:border-[#ef4444] flex justify-between items-center">
            <span>Sauvegarder la base</span><Database className="w-5 h-5 text-[#ef4444]" />
          </button>
          <button className="w-full p-4 border rounded-lg text-left hover:border-[#ef4444] flex justify-between items-center">
            <span>Vider le cache</span><Cog className="w-5 h-5 text-[#ef4444]" />
          </button>
          <button className="w-full p-4 border rounded-lg text-left hover:border-yellow-500 flex justify-between items-center text-yellow-600">
            <span>Mode maintenance</span><AlertTriangle className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );

  const renderHelp = () => (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Aide Admin</h2>
        <button onClick={() => setActiveSection('workspace')} className="px-4 py-2 text-sm text-[#ef4444] hover:bg-[#ef4444]/10 rounded-lg">Retour</button>
      </div>
      <div className="bg-gradient-to-r from-[#ef4444] to-[#ef4444] rounded-xl p-8 text-white">
        <h3 className="text-lg font-bold mb-4">Documentation Administrateur</h3>
        <div className="relative"><Search className="w-5 h-5 absolute left-4 top-1/2 -tranprimary-y-1/2 text-gray-400" /><input placeholder="Rechercher..." className="w-full pl-12 pr-4 py-3 rounded-lg text-black" /></div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[{icon: BookMarked, title: 'Documentation', color: '#ef4444'}, {icon: Video, title: 'Tutoriels', color: '#171717'}, {icon: FileQuestion, title: 'FAQ', color: '#737373'}].map((c, i) => (
          <button key={i} className="bg-white rounded-xl p-6 border hover:border-[#ef4444] text-left">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4" style={{backgroundColor: c.color+'20'}}><c.icon className="w-6 h-6" style={{color: c.color}} /></div>
            <h4 className="font-semibold">{c.title}</h4>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-6 border"><h4 className="font-semibold mb-4 flex items-center"><MessageCircle className="w-5 h-5 mr-2 text-[#ef4444]" />Support technique</h4><button className="w-full py-3 bg-[#ef4444] text-white rounded-lg">Contacter</button></div>
        <div className="bg-white rounded-xl p-6 border"><h4 className="font-semibold mb-4 flex items-center"><Headphones className="w-5 h-5 mr-2 text-[#ef4444]" />Hotline</h4><p className="text-lg font-bold">{companyPhone || '—'}</p></div>
      </div>
    </div>
  );

  const renderWorkspace = () => (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {[{title:'Ecritures',value:String(adminStats.entries),icon:FileText,color:'#ef4444',change:'',up:true},{title:'Plan comptable',value:String(adminStats.accounts),icon:BarChart3,color:'#171717',change:'',up:true},{title:'Tiers',value:String(adminStats.thirdParties),icon:Users,color:'#737373',change:'',up:true},{title:'Brouillons',value:String(adminStats.drafts),icon:AlertTriangle,color:'#F59E0B',change:adminStats.drafts > 0 ? `${adminStats.drafts} en attente` : '',up:adminStats.drafts === 0}].map((m,i) => (
          <div key={i} className="bg-white rounded-lg p-4 border hover:shadow-md">
            <div className="flex justify-between mb-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{backgroundColor:m.color+'20'}}><m.icon className="w-5 h-5" style={{color:m.color}} /></div><span className={m.up?'text-green-600 text-xs':'text-red-600 text-xs'}>{m.change}</span></div>
            <h3 className="text-lg font-bold">{m.value}</h3><p className="text-sm text-gray-600">{m.title}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-lg p-6 border">
        <h2 className="text-lg font-semibold mb-4">Raccourcis Administration</h2>
        <div className="grid grid-cols-4 gap-3">
          {[{label:'Utilisateurs',icon:Users,section:'users',color:'#ef4444'},{label:'Securite',icon:Lock,section:'security',color:'#171717'},{label:'Sauvegardes',icon:Database,section:'backup',color:'#737373'},{label:'Piste d\'Audit',icon:FileText,section:'audit-trail',color:'#ef4444'}].map((a,i) => (
            <button key={i} onClick={() => changeSection(a.section)} className="p-4 rounded-lg border-2 border-dashed border-[#ef4444]/50 hover:border-[#ef4444]">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2" style={{backgroundColor:a.color+'20'}}><a.icon className="w-5 h-5" style={{color:a.color}} /></div>
              <span className="text-sm font-medium block text-center">{a.label}</span>
            </button>
          ))}
        </div>
      </div>
      {/* Migration card */}
      <div className="bg-white rounded-lg p-6 border border-dashed border-[#ef4444]/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center"><Upload className="w-5 h-5 text-[#ef4444]" /></div>
            <div>
              <h3 className="font-semibold">Migration de donnees comptables</h3>
              <p className="text-xs text-gray-500">Importez vos donnees depuis Sage, Ciel, EBP, Odoo, Excel, FEC...</p>
            </div>
          </div>
          <button onClick={() => changeSection('migration')} className="px-4 py-2 bg-[#ef4444] text-white rounded-lg text-sm hover:bg-[#dc2626] flex items-center space-x-2">
            <Upload className="w-4 h-4" /><span>Lancer une migration</span>
          </button>
        </div>
      </div>
      {/* Apercu Taches */}
      <div className="bg-white rounded-lg p-6 border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold flex items-center"><ListTodo className="w-5 h-5 mr-2 text-[#ef4444]" />Taches Admin</h2>
          <button onClick={() => changeSection('tasks')} className="text-sm text-[#ef4444] hover:underline">Voir tout</button>
        </div>
        <div className="space-y-2">
          <div className="text-center py-4 text-gray-400 text-sm">Aucune tache en cours</div>
        </div>
      </div>
      {/* Apercu Chat */}
      <div className="bg-white rounded-lg p-6 border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold flex items-center"><MessageSquare className="w-5 h-5 mr-2 text-[#ef4444]" />Messages support</h2>
          <button onClick={() => changeSection('chat')} className="text-sm text-[#ef4444] hover:underline">Voir tout</button>
        </div>
        <div className="space-y-2">
          <div className="text-center py-4 text-gray-400 text-sm">Aucun message recent</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#e5e5e5]">
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center space-x-4">
            <button onClick={() => navigate('/')} className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 border-2 border-gray-300"><ArrowLeft className="w-5 h-5" /><span className="text-sm font-semibold">Accueil</span></button>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100">{sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</button>
            <div className="flex items-center space-x-3"><div className="w-10 h-10 rounded-lg bg-gradient-to-r from-[#ef4444] to-[#ef4444] flex items-center justify-center"><Shield className="w-5 h-5 text-white" /></div><div className="hidden sm:block"><h1 className="text-lg font-bold">Atlas Finance</h1><p className="text-xs text-gray-500">v{APP_VERSION}</p></div></div>
            <div className="hidden md:block relative">
              <button
                onClick={() => setWorkspaceSwitcherOpen(!workspaceSwitcherOpen)}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 transition-colors"
              >
                <Shield className="w-4 h-4 text-[#ef4444]" />
                <span className="text-sm font-medium text-[#ef4444]">Espace Admin</span>
                <ChevronDown className={`w-3 h-3 text-[#ef4444] transition-transform ${workspaceSwitcherOpen ? 'rotate-180' : ''}`} />
              </button>
              {workspaceSwitcherOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border z-50">
                  {workspaceOptions.map(ws => (
                    <button
                      key={ws.path}
                      onClick={() => { setWorkspaceSwitcherOpen(false); if (!ws.current) navigate(ws.path); }}
                      className={`w-full flex items-center space-x-3 px-4 py-3 text-left text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${ws.current ? 'bg-gray-50 font-semibold' : ''}`}
                    >
                      <ws.icon className="w-4 h-4" style={{ color: ws.color }} />
                      <span>{ws.label}</span>
                      {ws.current && <span className="ml-auto text-xs text-gray-400">actuel</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex-1 max-w-md mx-6 hidden md:block"><div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -tranprimary-y-1/2 text-gray-400" /><input placeholder="Recherche..." className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm" /></div></div>
          <div className="flex items-center space-x-3">
            <button onClick={() => navigate('/dashboard')} className="group px-6 py-2.5 bg-[#171717] hover:bg-[#262626] rounded-lg text-white font-semibold flex items-center space-x-2 transition-all shadow-sm hover:shadow-md">
              <LayoutDashboard className="w-5 h-5" />
              <span>Atlas Finance</span>
              <ExternalLink className="w-4 h-4 opacity-60 group-hover:opacity-100 group-hover:tranprimary-x-0.5 transition-all" />
            </button>
            <button className="relative p-2 rounded-lg hover:bg-gray-100"><Bell className="w-5 h-5 text-gray-500" />{adminStats.drafts > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 text-xs font-bold text-white bg-[#ef4444] rounded-full flex items-center justify-center">{adminStats.drafts}</span>}</button>
            <button onClick={() => changeSection('help')} className="p-2 rounded-lg hover:bg-gray-100"><HelpCircle className="w-5 h-5 text-gray-500" /></button>
            <div className="relative">
              <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#ef4444] to-[#ef4444] flex items-center justify-center"><Shield className="w-4 h-4 text-white" /></div>
                <div className="hidden md:block text-left"><p className="text-sm font-medium">{userData.name}</p><p className="text-xs text-gray-500">{userData.role}</p></div>
                <ChevronDown className={`w-4 h-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border py-2 z-50">
                  <button onClick={() => { changeSection('profile'); setUserMenuOpen(false); }} className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50"><User className="w-5 h-5 text-[#ef4444]" /><span>Mon profil</span></button>
                  <button onClick={() => { changeSection('settings'); setUserMenuOpen(false); }} className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50"><Settings className="w-5 h-5 text-[#ef4444]" /><span>Parametres</span></button>
                  <button onClick={() => { changeSection('help'); setUserMenuOpen(false); }} className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50"><HelpCircle className="w-5 h-5 text-[#ef4444]" /><span>Aide</span></button>
                  <div className="border-t my-2"></div>
                  <button onClick={handleLogout} className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-red-50 text-red-600"><LogOut className="w-5 h-5" /><span>Deconnexion</span></button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      <div className="flex">
        <aside className={`${sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'} lg:w-64 bg-white border-r min-h-[calc(100vh-73px)] transition-all`}>
          <div className="p-4">
            {/* Mon espace */}
            <div className="border-b mb-4 pb-4"><div className="text-xs font-semibold text-gray-500 uppercase mb-3">Mon espace</div>
              <div className="space-y-1">
                {[
                  {id:'workspace',label:'Tableau de bord',icon:LayoutDashboard},
                  {id:'tasks',label:'Taches admin',icon:ListTodo},
                  {id:'chat',label:'Support',icon:MessageSquare},
                  {id:'profile',label:'Mon profil',icon:User},
                  {id:'settings',label:'Parametres',icon:Settings},
                  {id:'help',label:'Aide',icon:HelpCircle}
                ].map(item => (
                  <button key={item.id} onClick={() => changeSection(item.id)} className={`${activeSection===item.id?'bg-[#ef4444]/10 text-[#ef4444]':'text-gray-600 hover:bg-gray-50'} w-full flex items-center justify-between px-3 py-2 rounded-lg`}>
                    <div className="flex items-center space-x-3"><item.icon className="w-4 h-4" /><span className="text-sm font-medium">{item.label}</span></div>
                    {'badge' in item && item.badge && <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-600">{item.badge}</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Modules Admin */}
            <div className="text-xs font-semibold text-gray-500 uppercase mb-3">Administration</div>
            <div className="space-y-1">
              {sidebarAdminLinks.map(item => (
                <button key={item.id} onClick={() => changeSection(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg hover:text-[#ef4444] hover:bg-gray-50 ${activeSection === item.id ? 'text-[#ef4444] bg-red-50 font-medium' : 'text-gray-600'}`}>
                  <div className="flex items-center space-x-3"><item.icon className="w-4 h-4" /><span className="text-sm">{item.label}</span></div>
                </button>
              ))}
            </div>
          </div>
        </aside>
        <main className="flex-1 min-h-[calc(100vh-73px)] overflow-auto">
          {activeSection === 'workspace' && renderWorkspace()}
          {activeSection === 'tasks' && <div className="p-4"><CompleteTasksModule /></div>}
          {activeSection === 'chat' && <div className="p-4"><CollaborationModule /></div>}
          {activeSection === 'profile' && renderProfile()}
          {activeSection === 'settings' && renderSettings()}
          {activeSection === 'help' && renderHelp()}
          {activeSection === 'users' && <AdminUsers subTab={adminSubTab} setSubTab={setAdminSubTab} />}
          {activeSection === 'security' && <AdminSecurity subTab={adminSubTab} setSubTab={setAdminSubTab} />}
          {activeSection === 'company' && <AdminCompany subTab={adminSubTab} setSubTab={setAdminSubTab} />}
          {activeSection === 'backup' && <AdminBackup subTab={adminSubTab} setSubTab={setAdminSubTab} />}
          {activeSection === 'import-export' && <AdminImportExport subTab={adminSubTab} setSubTab={setAdminSubTab} />}
          {activeSection === 'audit-trail' && <AdminAuditTrail subTab={adminSubTab} setSubTab={setAdminSubTab} />}
          {activeSection === 'api' && <AdminAPI subTab={adminSubTab} setSubTab={setAdminSubTab} />}
          {activeSection === 'tax-registry' && <AdminTaxRegistry />}
          {activeSection === 'migration' && <DataMigrationImport onBack={() => changeSection('workspace')} />}
        </main>
      </div>
      {userMenuOpen && <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />}
    </div>
  );
};

export default AdminWorkspace;
