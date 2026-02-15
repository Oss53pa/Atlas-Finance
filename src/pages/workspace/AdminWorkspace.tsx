import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import CompleteTasksModule from '../../components/tasks/CompleteTasksModule';
import CollaborationModule from '../../components/collaboration/CollaborationModule';
import {
  Shield, FileText, BarChart3, Users, PieChart, TrendingUp,
  Clock, CheckCircle, DollarSign, Zap, ArrowUpRight, ArrowDownRight, ExternalLink,
  Home, ArrowLeft, Bell, HelpCircle, User, Search, Menu, X, Settings, LogOut, ChevronDown,
  Mail, Calendar, Award, BookMarked, MessageCircle, FileQuestion, Video, Headphones,
  Target, Activity, Layers, FolderOpen, ListTodo, MessageSquare, LayoutDashboard,
  Server, Database, Lock, AlertTriangle, Cog
} from 'lucide-react';

const AdminWorkspace: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'workspace' | 'tasks' | 'chat' | 'profile' | 'settings' | 'help'>('workspace');

  const atlasFinanceLinks = [
    { id: 'dashboard', label: "Tableau de bord", icon: BarChart3, path: '/dashboard' },
    { id: 'users', label: 'Utilisateurs', icon: Users, badge: '12', path: '/security/users' },
    { id: 'security', label: 'Securite', icon: Lock, path: '/security' },
    { id: 'system', label: 'Systeme', icon: Server, path: '/admin/system' },
    { id: 'database', label: 'Base de donnees', icon: Database, path: '/admin/database' },
    { id: 'logs', label: 'Journaux', icon: FileText, path: '/admin/logs' },
  ];

  const handleLogout = () => { logout(); navigate('/login'); };
  const userData = { name: user?.name || 'Admin System', email: user?.email || 'admin@atlasfinance.com', role: user?.role || 'Administrateur', phone: '+225 07 00 00 00', department: 'IT' };

  const renderProfile = () => (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Mon Profil</h2>
        <button onClick={() => setActiveSection('workspace')} className="px-4 py-2 text-sm text-[#DC2626] hover:bg-[#DC2626]/10 rounded-lg">Retour</button>
      </div>
      <div className="bg-white rounded-xl p-6 border">
        <div className="flex items-start space-x-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-r from-[#DC2626] to-[#B91C1C] flex items-center justify-center"><Shield className="w-12 h-12 text-white" /></div>
          <div><h3 className="text-lg font-bold">{userData.name}</h3><p className="text-[#DC2626]">{userData.role}</p><p className="text-sm text-gray-500">{userData.department}</p></div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border">
          <h4 className="font-semibold mb-4 flex items-center"><Mail className="w-5 h-5 mr-2 text-[#DC2626]" />Contact</h4>
          <p><span className="text-xs text-gray-500">Email:</span> {userData.email}</p>
          <p className="mt-2"><span className="text-xs text-gray-500">Tel:</span> {userData.phone}</p>
        </div>
        <div className="bg-white rounded-xl p-6 border">
          <h4 className="font-semibold mb-4 flex items-center"><Lock className="w-5 h-5 mr-2 text-[#DC2626]" />Securite</h4>
          <button className="w-full p-3 border rounded-lg text-sm hover:border-[#DC2626] mb-2">Changer mot de passe</button>
          <button className="w-full p-3 border rounded-lg text-sm hover:border-[#DC2626] flex justify-between"><span>2FA</span><span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Actif</span></button>
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Parametres Systeme</h2>
        <button onClick={() => setActiveSection('workspace')} className="px-4 py-2 text-sm text-[#DC2626] hover:bg-[#DC2626]/10 rounded-lg">Retour</button>
      </div>
      <div className="bg-white rounded-xl p-6 border">
        <h4 className="font-semibold mb-4">Affichage</h4>
        <div className="space-y-4">
          <div className="flex justify-between p-4 border rounded-lg"><div><p className="font-medium">Theme</p></div><select className="border rounded px-3 py-1"><option>Clair</option><option>Sombre</option></select></div>
          <div className="flex justify-between p-4 border rounded-lg"><div><p className="font-medium">Langue</p></div><select className="border rounded px-3 py-1"><option>Francais</option><option>English</option></select></div>
        </div>
      </div>
      <div className="bg-white rounded-xl p-6 border">
        <h4 className="font-semibold mb-4">Maintenance</h4>
        <div className="space-y-3">
          <button className="w-full p-4 border rounded-lg text-left hover:border-[#DC2626] flex justify-between items-center">
            <span>Sauvegarder la base</span><Database className="w-5 h-5 text-[#DC2626]" />
          </button>
          <button className="w-full p-4 border rounded-lg text-left hover:border-[#DC2626] flex justify-between items-center">
            <span>Vider le cache</span><Cog className="w-5 h-5 text-[#DC2626]" />
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
        <button onClick={() => setActiveSection('workspace')} className="px-4 py-2 text-sm text-[#DC2626] hover:bg-[#DC2626]/10 rounded-lg">Retour</button>
      </div>
      <div className="bg-gradient-to-r from-[#DC2626] to-[#B91C1C] rounded-xl p-8 text-white">
        <h3 className="text-lg font-bold mb-4">Documentation Administrateur</h3>
        <div className="relative"><Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" /><input placeholder="Rechercher..." className="w-full pl-12 pr-4 py-3 rounded-lg text-black" /></div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[{icon: BookMarked, title: 'Documentation', color: '#DC2626'}, {icon: Video, title: 'Tutoriels', color: '#6A8A82'}, {icon: FileQuestion, title: 'FAQ', color: '#7A99AC'}].map((c, i) => (
          <button key={i} className="bg-white rounded-xl p-6 border hover:border-[#DC2626] text-left">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4" style={{backgroundColor: c.color+'20'}}><c.icon className="w-6 h-6" style={{color: c.color}} /></div>
            <h4 className="font-semibold">{c.title}</h4>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-6 border"><h4 className="font-semibold mb-4 flex items-center"><MessageCircle className="w-5 h-5 mr-2 text-[#DC2626]" />Support technique</h4><button className="w-full py-3 bg-[#DC2626] text-white rounded-lg">Contacter</button></div>
        <div className="bg-white rounded-xl p-6 border"><h4 className="font-semibold mb-4 flex items-center"><Headphones className="w-5 h-5 mr-2 text-[#DC2626]" />Hotline</h4><p className="text-lg font-bold">+225 27 00 00 00</p></div>
      </div>
    </div>
  );

  const renderWorkspace = () => (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {[{title:'Utilisateurs',value:'156',icon:Users,color:'#DC2626',change:'+8',up:true},{title:'Sessions actives',value:'42',icon:Activity,color:'#6A8A82',change:'+12',up:true},{title:'Uptime',value:'99.9%',icon:Server,color:'#7A99AC',change:'+0.1%',up:true},{title:'Alertes',value:'3',icon:AlertTriangle,color:'#F59E0B',change:'-2',up:false}].map((m,i) => (
          <div key={i} className="bg-white rounded-lg p-4 border hover:shadow-md">
            <div className="flex justify-between mb-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{backgroundColor:m.color+'20'}}><m.icon className="w-5 h-5" style={{color:m.color}} /></div><span className={m.up?'text-green-600 text-xs':'text-red-600 text-xs'}>{m.change}</span></div>
            <h3 className="text-lg font-bold">{m.value}</h3><p className="text-sm text-gray-600">{m.title}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-lg p-6 border-2 border-[#DC2626]">
        <div className="flex justify-between mb-4"><h2 className="text-lg font-semibold">Administration Atlas Finance</h2><button onClick={() => navigate('/executive')} className="px-4 py-2 bg-[#DC2626] text-white rounded-lg flex items-center space-x-2"><Home className="w-4 h-4" /><span>ATLAS FINANCE</span></button></div>
        <div className="grid grid-cols-4 gap-3">
          {[{label:'Utilisateurs',icon:Users,path:'/security/users',color:'#DC2626'},{label:'Securite',icon:Lock,path:'/security',color:'#6A8A82'},{label:'Systeme',icon:Server,path:'/admin/system',color:'#7A99AC'},{label:'Logs',icon:FileText,path:'/admin/logs',color:'#DC2626'}].map((a,i) => (
            <button key={i} onClick={() => navigate(a.path)} className="p-4 rounded-lg border-2 border-dashed border-[#DC2626]/50 hover:border-[#DC2626]">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2" style={{backgroundColor:a.color+'20'}}><a.icon className="w-5 h-5" style={{color:a.color}} /></div>
              <span className="text-sm font-medium block text-center">{a.label}</span>
            </button>
          ))}
        </div>
      </div>
      {/* Apercu Taches */}
      <div className="bg-white rounded-lg p-6 border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold flex items-center"><ListTodo className="w-5 h-5 mr-2 text-[#DC2626]" />Taches Admin</h2>
          <button onClick={() => setActiveSection('tasks')} className="text-sm text-[#DC2626] hover:underline">Voir tout</button>
        </div>
        <div className="space-y-2">
          {['Mettre a jour certificats SSL', 'Reviser politiques securite', 'Audit des acces'].map((t, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3"><CheckCircle className="w-5 h-5 text-gray-300" /><span className="text-sm">{t}</span></div>
              <span className="text-xs text-gray-500">Urgent</span>
            </div>
          ))}
        </div>
      </div>
      {/* Apercu Chat */}
      <div className="bg-white rounded-lg p-6 border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold flex items-center"><MessageSquare className="w-5 h-5 mr-2 text-[#DC2626]" />Messages support</h2>
          <button onClick={() => setActiveSection('chat')} className="text-sm text-[#DC2626] hover:underline">Voir tout</button>
        </div>
        <div className="space-y-2">
          {[{name:'Support L1', msg:'Ticket #234 escalade', time:'10:30'},{name:'DevOps', msg:'Deploiement planifie', time:'09:15'}].map((m, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-[#DC2626] flex items-center justify-center text-white text-xs">{m.name[0]}</div>
                <div><p className="text-sm font-medium">{m.name}</p><p className="text-xs text-gray-500">{m.msg}</p></div>
              </div>
              <span className="text-xs text-gray-500">{m.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#ECECEC]">
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center space-x-4">
            <button onClick={() => navigate('/login')} className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 border-2 border-gray-300"><ArrowLeft className="w-5 h-5" /><span className="text-sm font-semibold">Retour</span></button>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100">{sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</button>
            <div className="flex items-center space-x-3"><div className="w-10 h-10 rounded-lg bg-gradient-to-r from-[#DC2626] to-[#B91C1C] flex items-center justify-center"><Shield className="w-5 h-5 text-white" /></div><div className="hidden sm:block"><h1 className="text-lg font-bold">Atlas Finance</h1><p className="text-xs text-gray-500">v3.0</p></div></div>
            <div className="hidden md:flex items-center space-x-2 px-3 py-1 rounded-lg bg-red-50"><Shield className="w-4 h-4 text-[#DC2626]" /><span className="text-sm font-medium text-[#DC2626]">Espace Admin</span></div>
          </div>
          <div className="flex-1 max-w-md mx-6 hidden md:block"><div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input placeholder="Recherche..." className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm" /></div></div>
          <div className="flex items-center space-x-3">
            <button onClick={() => navigate('/executive')} className="px-6 py-2 bg-gradient-to-r from-[#DC2626] to-[#B91C1C] rounded-lg text-white font-bold flex items-center space-x-2"><Home className="w-5 h-5" /><span>ATLAS FINANCE</span><ExternalLink className="w-4 h-4" /></button>
            <button className="relative p-2 rounded-lg hover:bg-gray-100"><Bell className="w-5 h-5 text-gray-500" /><span className="absolute -top-1 -right-1 w-5 h-5 text-xs font-bold text-white bg-[#DC2626] rounded-full flex items-center justify-center">7</span></button>
            <button onClick={() => setActiveSection('help')} className="p-2 rounded-lg hover:bg-gray-100"><HelpCircle className="w-5 h-5 text-gray-500" /></button>
            <div className="relative">
              <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#DC2626] to-[#B91C1C] flex items-center justify-center"><Shield className="w-4 h-4 text-white" /></div>
                <div className="hidden md:block text-left"><p className="text-sm font-medium">{userData.name}</p><p className="text-xs text-gray-500">{userData.role}</p></div>
                <ChevronDown className={`w-4 h-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border py-2 z-50">
                  <button onClick={() => { setActiveSection('profile'); setUserMenuOpen(false); }} className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50"><User className="w-5 h-5 text-[#DC2626]" /><span>Mon profil</span></button>
                  <button onClick={() => { setActiveSection('settings'); setUserMenuOpen(false); }} className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50"><Settings className="w-5 h-5 text-[#DC2626]" /><span>Parametres</span></button>
                  <button onClick={() => { setActiveSection('help'); setUserMenuOpen(false); }} className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50"><HelpCircle className="w-5 h-5 text-[#DC2626]" /><span>Aide</span></button>
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
            <button onClick={() => navigate('/executive')} className="w-full p-4 bg-gradient-to-r from-[#DC2626] to-[#B91C1C] rounded-lg text-white mb-6"><div className="flex items-center justify-center space-x-2 mb-2"><Home className="w-5 h-5" /><ExternalLink className="w-4 h-4" /></div><div className="text-sm font-semibold">Atlas Finance Complet</div></button>

            {/* Mon espace */}
            <div className="border-b mb-4 pb-4"><div className="text-xs font-semibold text-gray-500 uppercase mb-3">Mon espace</div>
              <div className="space-y-1">
                {[
                  {id:'workspace',label:'Tableau de bord',icon:LayoutDashboard},
                  {id:'tasks',label:'Taches admin',icon:ListTodo,badge:'5'},
                  {id:'chat',label:'Support',icon:MessageSquare,badge:'3'},
                  {id:'profile',label:'Mon profil',icon:User},
                  {id:'settings',label:'Parametres',icon:Settings},
                  {id:'help',label:'Aide',icon:HelpCircle}
                ].map(item => (
                  <button key={item.id} onClick={() => setActiveSection(item.id as any)} className={`${activeSection===item.id?'bg-[#DC2626]/10 text-[#DC2626]':'text-gray-600 hover:bg-gray-50'} w-full flex items-center justify-between px-3 py-2 rounded-lg`}>
                    <div className="flex items-center space-x-3"><item.icon className="w-4 h-4" /><span className="text-sm font-medium">{item.label}</span></div>
                    {item.badge && <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-600">{item.badge}</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Modules Admin */}
            <div className="text-xs font-semibold text-gray-500 uppercase mb-3">Administration</div>
            <div className="space-y-1">
              {atlasFinanceLinks.map(item => (
                <button key={item.id} onClick={() => navigate(item.path)} className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-gray-600 hover:text-[#DC2626] hover:bg-gray-50">
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

export default AdminWorkspace;
