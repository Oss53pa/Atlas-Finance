// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { formatCurrency } from '../../utils/formatters';
import { themes } from '../../styles/theme';
import type { ThemeType } from '../../styles/theme';
import CompleteTasksModule from '../../components/tasks/CompleteTasksModule';
import CollaborationModule from '../../components/collaboration/CollaborationModule';
import { useFiscalUrgentAlerts } from '../../hooks/useFiscalAlerts';
import {
  Calculator, FileText, BookOpen, BarChart3, Users, Banknote, PieChart, TrendingUp,
  Clock, CheckCircle, Plus, DollarSign, Zap, ArrowUpRight, ArrowDownRight, ExternalLink,
  ArrowLeft, Bell, HelpCircle, User, Search, Menu, X, Settings, LogOut, ChevronDown,
  Shield, Mail, BookMarked, MessageCircle, FileQuestion, Video, Headphones,
  ListTodo, MessageSquare, LayoutDashboard, Briefcase
} from 'lucide-react';

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

const ComptableWorkspaceFinal: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();
  const { themeType, setTheme } = useTheme();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { adapter } = useData();
  const [comptaStats, setComptaStats] = useState({ entries: 0, drafts: 0, posted: 0, treasury: 0 });
  const [companyPhone, setCompanyPhone] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [workspaceSwitcherOpen, setWorkspaceSwitcherOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'workspace' | 'tasks' | 'chat' | 'profile' | 'settings' | 'help'>('workspace');

  const workspaceOptions = user?.role === 'admin' ? [
    { label: 'Espace Admin', path: '/workspace/admin', icon: Shield, color: '#ef4444', current: false },
    { label: 'Espace Manager', path: '/workspace/manager', icon: Briefcase, color: '#525252', current: false },
    { label: 'Espace Comptable', path: '/workspace/comptable', icon: Calculator, color: '#171717', current: true },
  ] : user?.role === 'manager' ? [
    { label: 'Espace Manager', path: '/workspace/manager', icon: Briefcase, color: '#525252', current: false },
    { label: 'Espace Comptable', path: '/workspace/comptable', icon: Calculator, color: '#171717', current: true },
  ] : [
    { label: 'Espace Comptable', path: '/workspace/comptable', icon: Calculator, color: '#171717', current: true },
  ];

  const atlasFinanceLinks = [
    { id: 'entries', label: "Saisie ecritures", icon: FileText, badge: comptaStats.drafts > 0 ? String(comptaStats.drafts) : undefined, path: '/accounting/entries' },
    { id: 'journals', label: t('navigation.journals'), icon: BookOpen, path: '/accounting/journals' },
    { id: 'ledger', label: 'Grand livre', icon: Calculator, path: '/accounting/general-ledger' },
    { id: 'balance', label: 'Balance', icon: PieChart, path: '/accounting/balance' },
    { id: 'statements', label: 'Etats financiers', icon: TrendingUp, path: '/accounting/financial-statements' },
    { id: 'thirds', label: 'Tiers', icon: Users, path: '/third-party' },
    { id: 'banking', label: 'Banque', icon: Banknote, path: '/treasury' },
  ];

  const handleLogout = () => { logout(); navigate('/'); };
  const userData = { name: user?.name || '', email: user?.email || '', role: user?.role || '', phone: user?.phone || '', department: user?.department || '', twoFactorEnabled: user?.twoFactorEnabled ?? false };

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [entries, accounts] = await Promise.all([
          adapter.getAll<any>('journalEntries'),
          adapter.getAll<any>('accounts'),
        ]);
        const drafts = entries.filter((e: any) => e.status === 'draft').length;
        const posted = entries.filter((e: any) => e.status === 'posted' || e.status === 'validated').length;
        let treasury = 0;
        for (const entry of entries) {
          if (!entry.lines) continue;
          for (const line of entry.lines) {
            const acc = accounts.find((a: any) => a.id === line.accountId || a.number === line.accountNumber);
            if (!acc) continue;
            if (String(acc.number || '').startsWith('5')) {
              treasury += (line.debit || 0) - (line.credit || 0);
            }
          }
        }
        setComptaStats({ entries: entries.length, drafts, posted, treasury });
        // Charger le téléphone de la société
        const companies = await adapter.getAll<any>('companies');
        if (companies.length > 0) {
          setCompanyPhone(companies[0].phone || companies[0].telephone || '');
        }
      } catch (err) {
        console.error('Erreur chargement stats comptable:', err);
      }
    };
    loadStats();
  }, [adapter]);

  const renderProfile = () => (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Mon Profil</h2>
        <button onClick={() => setActiveSection('workspace')} className="px-4 py-2 text-sm text-[#171717] hover:bg-[#171717]/10 rounded-lg">Retour</button>
      </div>
      <div className="bg-white rounded-xl p-6 border">
        <div className="flex items-start space-x-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-r from-[#171717] to-[#262626] flex items-center justify-center"><User className="w-12 h-12 text-white" /></div>
          <div><h3 className="text-lg font-bold">{userData.name}</h3><p className="text-[#171717]">{userData.role}</p><p className="text-sm text-gray-500">{userData.department}</p></div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border">
          <h4 className="font-semibold mb-4 flex items-center"><Mail className="w-5 h-5 mr-2 text-[#171717]" />Contact</h4>
          <p><span className="text-xs text-gray-500">Email:</span> {userData.email}</p>
          <p className="mt-2"><span className="text-xs text-gray-500">Tel:</span> {userData.phone}</p>
        </div>
        <div className="bg-white rounded-xl p-6 border">
          <h4 className="font-semibold mb-4 flex items-center"><Shield className="w-5 h-5 mr-2 text-[#171717]" />Securite</h4>
          <button className="w-full p-3 border rounded-lg text-sm hover:border-[#171717] mb-2">Changer mot de passe</button>
          <button className="w-full p-3 border rounded-lg text-sm hover:border-[#171717] flex justify-between"><span>2FA</span><span className={`text-xs px-2 py-1 rounded ${userData.twoFactorEnabled ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{userData.twoFactorEnabled ? 'Actif' : 'Off'}</span></button>
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Parametres</h2>
        <button onClick={() => setActiveSection('workspace')} className="px-4 py-2 text-sm text-[#171717] hover:bg-[#171717]/10 rounded-lg">Retour</button>
      </div>
      <div className="bg-white rounded-xl p-6 border">
        <h4 className="font-semibold mb-4">Affichage</h4>
        <div className="space-y-4">
          <div className="flex justify-between p-4 border rounded-lg"><div><p className="font-medium">Theme</p></div><select className="border rounded px-3 py-1" value={themeType} onChange={e => setTheme(e.target.value as ThemeType)}>{Object.keys(themes).map(key => (<option key={key} value={key}>{themeLabels[key] || key}</option>))}</select></div>
          <div className="flex justify-between p-4 border rounded-lg"><div><p className="font-medium">Langue</p></div><select className="border rounded px-3 py-1" value={language} onChange={e => setLanguage(e.target.value as 'fr' | 'en' | 'es')}>{Object.entries(languageLabels).map(([key, label]) => (<option key={key} value={key}>{label}</option>))}</select></div>
        </div>
      </div>
      <div className="bg-white rounded-xl p-6 border">
        <h4 className="font-semibold mb-4">Notifications</h4>
        <div className="space-y-3">
          {['Email', 'Push', 'Alertes'].map((n, i) => (
            <div key={i} className="flex justify-between p-3 border rounded-lg"><span>{n}</span>
              <label className="relative inline-flex cursor-pointer"><input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-checked:bg-[#171717] rounded-full after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:tranprimary-x-full"></div></label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderHelp = () => (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Aide</h2>
        <button onClick={() => setActiveSection('workspace')} className="px-4 py-2 text-sm text-[#171717] hover:bg-[#171717]/10 rounded-lg">Retour</button>
      </div>
      <div className="bg-gradient-to-r from-[#171717] to-[#262626] rounded-xl p-8 text-white">
        <h3 className="text-lg font-bold mb-4">Comment pouvons-nous vous aider?</h3>
        <div className="relative"><Search className="w-5 h-5 absolute left-4 top-1/2 -tranprimary-y-1/2 text-gray-400" /><input placeholder="Rechercher..." className="w-full pl-12 pr-4 py-3 rounded-lg text-black" /></div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[{icon: BookMarked, title: 'Documentation', color: '#171717'}, {icon: Video, title: 'Videos', color: '#525252'}, {icon: FileQuestion, title: 'FAQ', color: '#737373'}].map((c, i) => (
          <button key={i} className="bg-white rounded-xl p-6 border hover:border-[#171717] text-left">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4" style={{backgroundColor: c.color+'20'}}><c.icon className="w-6 h-6" style={{color: c.color}} /></div>
            <h4 className="font-semibold">{c.title}</h4>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-6 border"><h4 className="font-semibold mb-4 flex items-center"><MessageCircle className="w-5 h-5 mr-2 text-[#171717]" />Chat Support</h4><button className="w-full py-3 bg-[#171717] text-white rounded-lg">Demarrer</button></div>
        <div className="bg-white rounded-xl p-6 border"><h4 className="font-semibold mb-4 flex items-center"><Headphones className="w-5 h-5 mr-2 text-[#171717]" />Telephone</h4><p className="text-lg font-bold">{companyPhone || '—'}</p></div>
      </div>
    </div>
  );

  const renderWorkspace = () => (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {[{title:'Ecritures',value:String(comptaStats.entries),icon:FileText,color:'#171717',change:'',up:true},{title:'En attente',value:String(comptaStats.drafts),icon:Clock,color:'#525252',change:comptaStats.drafts > 0 ? `${comptaStats.drafts} brouillons` : '',up:comptaStats.drafts === 0},{title:'Validees',value:String(comptaStats.posted),icon:CheckCircle,color:'#737373',change:'',up:true},{title:'Tresorerie',value:formatCurrency(comptaStats.treasury),icon:DollarSign,color:'#171717',change:'',up:comptaStats.treasury >= 0}].map((m,i) => (
          <div key={i} className="bg-white rounded-lg p-4 border hover:shadow-md">
            <div className="flex justify-between mb-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{backgroundColor:m.color+'20'}}><m.icon className="w-5 h-5" style={{color:m.color}} /></div><span className={m.up?'text-green-600 text-xs':'text-red-600 text-xs'}>{m.change}</span></div>
            <h3 className="text-lg font-bold">{m.value}</h3><p className="text-sm text-gray-600">{m.title}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-lg p-6 border">
        <h2 className="text-lg font-semibold mb-4">Raccourcis Atlas Finance</h2>
        <div className="grid grid-cols-4 gap-3">
          {[{label:'Nouvelle écriture',icon:Plus,path:'/accounting/entries',color:'#171717'},{label:'Lettrage',icon:Zap,path:'/accounting/lettrage',color:'#525252'},{label:'Balance',icon:BarChart3,path:'/accounting/balance',color:'#737373'},{label:'SYSCOHADA',icon:TrendingUp,path:'/financial-statements',color:'#171717'}].map((a,i) => (
            <button key={i} onClick={() => navigate(a.path)} className="p-4 rounded-lg border hover:border-gray-400 hover:shadow-sm transition-all">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2" style={{backgroundColor:a.color+'15'}}><a.icon className="w-5 h-5" style={{color:a.color}} /></div>
              <span className="text-sm font-medium block text-center">{a.label}</span>
            </button>
          ))}
        </div>
      </div>
      {/* Apercu Taches */}
      <div className="bg-white rounded-lg p-6 border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold flex items-center"><ListTodo className="w-5 h-5 mr-2 text-[#171717]" />Mes Taches</h2>
          <button onClick={() => setActiveSection('tasks')} className="text-sm text-[#171717] hover:underline">Voir tout</button>
        </div>
        <div className="space-y-2">
          <div className="text-center py-4 text-gray-400 text-sm">Aucune tache en cours</div>
        </div>
      </div>
      {/* Alertes Fiscales */}
      <FiscalAlertsWidget navigate={navigate} />
      {/* Apercu Chat */}
      <div className="bg-white rounded-lg p-6 border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold flex items-center"><MessageSquare className="w-5 h-5 mr-2 text-[#171717]" />Messages recents</h2>
          <button onClick={() => setActiveSection('chat')} className="text-sm text-[#171717] hover:underline">Voir tout</button>
        </div>
        <div className="space-y-2">
          <div className="text-center py-4 text-gray-400 text-sm">Aucun message récent</div>
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
            <div className="flex items-center space-x-3"><div className="w-10 h-10 rounded-lg bg-gradient-to-r from-[#171717] to-[#262626] flex items-center justify-center"><BarChart3 className="w-5 h-5 text-white" /></div><div className="hidden sm:block"><h1 className="text-lg font-bold">Atlas Finance</h1><p className="text-xs text-gray-500">v{APP_VERSION}</p></div></div>
            <div className="hidden md:block relative">
              <button
                onClick={() => setWorkspaceSwitcherOpen(!workspaceSwitcherOpen)}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 transition-colors"
              >
                <Calculator className="w-4 h-4 text-[#171717]" />
                <span className="text-sm font-medium text-[#171717]">Espace Comptable</span>
                {workspaceOptions.length > 1 && <ChevronDown className={`w-3 h-3 text-[#171717] transition-transform ${workspaceSwitcherOpen ? 'rotate-180' : ''}`} />}
              </button>
              {workspaceSwitcherOpen && workspaceOptions.length > 1 && (
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
            <button onClick={() => navigate('/dashboard')} className="group px-6 py-2.5 bg-[#171717] hover:bg-[#262626] rounded-lg text-white font-semibold flex items-center space-x-2 transition-all shadow-sm hover:shadow-md"><LayoutDashboard className="w-5 h-5" /><span>Atlas Finance</span><ExternalLink className="w-4 h-4 opacity-60 group-hover:opacity-100 group-hover:tranprimary-x-0.5 transition-all" /></button>
            <button className="relative p-2 rounded-lg hover:bg-gray-100"><Bell className="w-5 h-5 text-gray-500" />{comptaStats.drafts > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 text-xs font-bold text-white bg-[#171717] rounded-full flex items-center justify-center">{comptaStats.drafts}</span>}</button>
            <button onClick={() => setActiveSection('help')} className="p-2 rounded-lg hover:bg-gray-100"><HelpCircle className="w-5 h-5 text-gray-500" /></button>
            <div className="relative">
              <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#171717] to-[#262626] flex items-center justify-center"><User className="w-4 h-4 text-white" /></div>
                <div className="hidden md:block text-left"><p className="text-sm font-medium">{userData.name}</p><p className="text-xs text-gray-500">{userData.role}</p></div>
                <ChevronDown className={`w-4 h-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border py-2 z-50">
                  <button onClick={() => { setActiveSection('profile'); setUserMenuOpen(false); }} className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50"><User className="w-5 h-5 text-[#171717]" /><span>Mon profil</span></button>
                  <button onClick={() => { setActiveSection('settings'); setUserMenuOpen(false); }} className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50"><Settings className="w-5 h-5 text-[#171717]" /><span>Parametres</span></button>
                  <button onClick={() => { setActiveSection('help'); setUserMenuOpen(false); }} className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50"><HelpCircle className="w-5 h-5 text-[#171717]" /><span>Aide</span></button>
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
                  {id:'tasks',label:'Mes taches',icon:ListTodo},
                  {id:'chat',label:'Chat equipe',icon:MessageSquare},
                  {id:'profile',label:'Mon profil',icon:User},
                  {id:'settings',label:'Parametres',icon:Settings},
                  {id:'help',label:'Aide',icon:HelpCircle}
                ].map(item => (
                  <button key={item.id} onClick={() => setActiveSection(item.id as typeof activeSection)} className={`${activeSection===item.id?'bg-[#171717]/10 text-[#171717]':'text-gray-600 hover:bg-gray-50'} w-full flex items-center justify-between px-3 py-2 rounded-lg`}>
                    <div className="flex items-center space-x-3"><item.icon className="w-4 h-4" /><span className="text-sm font-medium">{item.label}</span></div>
                    {item.badge && <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-600">{item.badge}</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Modules */}
            <div className="text-xs font-semibold text-gray-500 uppercase mb-3">Modules Comptables</div>
            <div className="space-y-1">
              {atlasFinanceLinks.map(item => (
                <button key={item.id} onClick={() => navigate(item.path)} className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-gray-600 hover:text-[#171717] hover:bg-gray-50">
                  <div className="flex items-center space-x-3"><item.icon className="w-4 h-4" /><span className="text-sm">{item.label}</span></div>
                  {item.badge && <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-600">{item.badge}</span>}
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
        </main>
      </div>
      {userMenuOpen && <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />}
    </div>
  );
};

// ============================================================================
// Fiscal Alerts Widget — Affiché dans le workspace comptable
// ============================================================================
const FiscalAlertsWidget: React.FC<{ navigate: (path: string) => void }> = ({ navigate }) => {
  const urgentAlerts = useFiscalUrgentAlerts();

  if (urgentAlerts.length === 0) return null;

  const overdueCount = urgentAlerts.filter(a => a.isOverdue).length;
  const urgentCount = urgentAlerts.filter(a => a.isUrgent && !a.isOverdue).length;

  return (
    <div className={`rounded-lg p-6 border ${overdueCount > 0 ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold flex items-center">
          <Bell className="w-5 h-5 mr-2 text-red-600" />
          Echéances Fiscales
          <span className={`ml-2 px-2 py-0.5 text-xs font-bold rounded-full ${overdueCount > 0 ? 'bg-red-600 text-white' : 'bg-orange-500 text-white'}`}>
            {urgentAlerts.length}
          </span>
        </h2>
        <button onClick={() => navigate('/taxation/echeances')} className="text-sm text-[#171717] hover:underline flex items-center gap-1">
          Calendrier fiscal <ExternalLink className="w-3 h-3" />
        </button>
      </div>
      <div className="space-y-2">
        {urgentAlerts.slice(0, 5).map(alert => (
          <div key={alert.id} className={`flex items-center justify-between p-3 rounded-lg ${
            alert.isOverdue ? 'bg-red-100' : 'bg-orange-100'
          }`}>
            <div className="flex items-center gap-3">
              {alert.isOverdue
                ? <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                : <Clock className="w-4 h-4 text-orange-600 flex-shrink-0" />
              }
              <div>
                <span className="font-medium text-sm">{alert.taxName}</span>
                <span className="text-xs text-gray-600 ml-2">{alert.periodLabel}</span>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-xs font-semibold ${alert.isOverdue ? 'text-red-700' : 'text-orange-700'}`}>
                {alert.isOverdue ? `${Math.abs(alert.daysUntil)}j de retard` : `Dans ${alert.daysUntil}j`}
              </div>
              <div className="text-xs text-gray-500">{alert.deadline}</div>
            </div>
          </div>
        ))}
        {urgentAlerts.length > 5 && (
          <button onClick={() => navigate('/taxation/echeances')} className="text-sm text-[#171717] font-medium hover:underline w-full text-center py-2">
            + {urgentAlerts.length - 5} autre(s) échéance(s)
          </button>
        )}
      </div>
    </div>
  );
};

export default ComptableWorkspaceFinal;
