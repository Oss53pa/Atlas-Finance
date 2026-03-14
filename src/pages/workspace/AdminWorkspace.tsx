import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import CompleteTasksModule from '../../components/tasks/CompleteTasksModule';
import CollaborationModule from '../../components/collaboration/CollaborationModule';
import DataMigrationImport from '../../components/admin/DataMigrationImport';
import {
  Shield, FileText, BarChart3, Users, PieChart, TrendingUp, Briefcase,
  Clock, CheckCircle, DollarSign, Zap, ArrowUpRight, ArrowDownRight, ExternalLink,
  Home, ArrowLeft, Bell, HelpCircle, User, Search, Menu, X, Settings, LogOut, ChevronDown,
  Mail, Calendar, Award, BookMarked, MessageCircle, FileQuestion, Video, Headphones,
  Target, Activity, Layers, FolderOpen, ListTodo, MessageSquare, LayoutDashboard,
  Server, Database, Lock, AlertTriangle, Cog, Upload
} from 'lucide-react';

const AdminWorkspace: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [workspaceSwitcherOpen, setWorkspaceSwitcherOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('workspace');
  const [adminSubTab, setAdminSubTab] = useState(0);

  const workspaceOptions = [
    { label: 'Espace Admin', path: '/workspace/admin', icon: Shield, color: '#ef4444', current: true },
    { label: 'Espace Manager', path: '/workspace/manager', icon: Briefcase, color: '#171717', current: false },
    { label: 'Espace Comptable', path: '/workspace/comptable', icon: BarChart3, color: '#525252', current: false },
  ];

  const atlasFinanceLinks = [
    { id: 'workspace', label: 'Tableau de bord Admin', icon: LayoutDashboard, section: 'workspace' },
    { id: 'users', label: 'Utilisateurs & Droits', icon: Users, badge: '12', section: 'users' },
    { id: 'security', label: 'Securite & Roles', icon: Lock, section: 'security' },
    { id: 'settings', label: 'Parametres Systeme', icon: Settings, section: 'settings' },
    { id: 'company', label: 'Configuration & Comptabilite', icon: Briefcase, section: 'company' },
    { id: 'backup', label: 'Sauvegardes', icon: Database, section: 'backup' },
    { id: 'import-export', label: 'Import/Export', icon: FolderOpen, section: 'import-export' },
    { id: 'audit-trail', label: 'Piste d\'Audit', icon: FileText, section: 'audit-trail' },
    { id: 'api', label: 'API & Integrations', icon: Server, section: 'api' },
  ];

  const handleLogout = () => { logout(); navigate('/login'); };
  const userData = { name: user?.name || 'Admin System', email: user?.email || 'admin@atlasfinance.com', role: user?.role || 'Administrateur', phone: '+225 07 00 00 00', department: 'IT' };

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
          <button className="w-full p-3 border rounded-lg text-sm hover:border-[#ef4444] flex justify-between"><span>2FA</span><span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Actif</span></button>
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
          <div className="flex justify-between p-4 border rounded-lg"><div><p className="font-medium">Theme</p></div><select className="border rounded px-3 py-1"><option>Clair</option><option>Sombre</option></select></div>
          <div className="flex justify-between p-4 border rounded-lg"><div><p className="font-medium">Langue</p></div><select className="border rounded px-3 py-1"><option>Francais</option><option>English</option></select></div>
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
        <div className="relative"><Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" /><input placeholder="Rechercher..." className="w-full pl-12 pr-4 py-3 rounded-lg text-black" /></div>
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
        <div className="bg-white rounded-xl p-6 border"><h4 className="font-semibold mb-4 flex items-center"><Headphones className="w-5 h-5 mr-2 text-[#ef4444]" />Hotline</h4><p className="text-lg font-bold">+225 27 00 00 00</p></div>
      </div>
    </div>
  );

  const renderWorkspace = () => (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {[{title:'Utilisateurs',value:'156',icon:Users,color:'#ef4444',change:'+8',up:true},{title:'Sessions actives',value:'42',icon:Activity,color:'#171717',change:'+12',up:true},{title:'Uptime',value:'99.9%',icon:Server,color:'#737373',change:'+0.1%',up:true},{title:'Alertes',value:'3',icon:AlertTriangle,color:'#F59E0B',change:'-2',up:false}].map((m,i) => (
          <div key={i} className="bg-white rounded-lg p-4 border hover:shadow-md">
            <div className="flex justify-between mb-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{backgroundColor:m.color+'20'}}><m.icon className="w-5 h-5" style={{color:m.color}} /></div><span className={m.up?'text-green-600 text-xs':'text-red-600 text-xs'}>{m.change}</span></div>
            <h3 className="text-lg font-bold">{m.value}</h3><p className="text-sm text-gray-600">{m.title}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-lg p-6 border-2 border-[#ef4444]">
        <div className="flex justify-between mb-4"><h2 className="text-lg font-semibold">Administration Atlas Finance</h2><button onClick={() => navigate('/executive')} className="px-4 py-2 bg-[#ef4444] text-white rounded-lg flex items-center space-x-2"><Home className="w-4 h-4" /><span>ATLAS FINANCE</span></button></div>
        <div className="grid grid-cols-4 gap-3">
          {[{label:'Utilisateurs',icon:Users,section:'users',color:'#ef4444'},{label:'Securite',icon:Lock,section:'security',color:'#171717'},{label:'Sauvegardes',icon:Database,section:'backup',color:'#737373'},{label:'Piste d\'Audit',icon:FileText,section:'audit-trail',color:'#ef4444'}].map((a,i) => (
            <button key={i} onClick={() => setActiveSection(a.section)} className="p-4 rounded-lg border-2 border-dashed border-[#ef4444]/50 hover:border-[#ef4444]">
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
          <button onClick={() => setActiveSection('migration')} className="px-4 py-2 bg-[#ef4444] text-white rounded-lg text-sm hover:bg-[#dc2626] flex items-center space-x-2">
            <Upload className="w-4 h-4" /><span>Lancer une migration</span>
          </button>
        </div>
      </div>
      {/* Apercu Taches */}
      <div className="bg-white rounded-lg p-6 border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold flex items-center"><ListTodo className="w-5 h-5 mr-2 text-[#ef4444]" />Taches Admin</h2>
          <button onClick={() => setActiveSection('tasks')} className="text-sm text-[#ef4444] hover:underline">Voir tout</button>
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
          <h2 className="text-lg font-semibold flex items-center"><MessageSquare className="w-5 h-5 mr-2 text-[#ef4444]" />Messages support</h2>
          <button onClick={() => setActiveSection('chat')} className="text-sm text-[#ef4444] hover:underline">Voir tout</button>
        </div>
        <div className="space-y-2">
          {[{name:'Support L1', msg:'Ticket #234 escalade', time:'10:30'},{name:'DevOps', msg:'Deploiement planifie', time:'09:15'}].map((m, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-[#ef4444] flex items-center justify-center text-white text-xs">{m.name[0]}</div>
                <div><p className="text-sm font-medium">{m.name}</p><p className="text-xs text-gray-500">{m.msg}</p></div>
              </div>
              <span className="text-xs text-gray-500">{m.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderAdminSection = (title: string, description: string, Icon: any, items: { label: string; desc: string; action?: string }[]) => {
    const idx = adminSubTab < items.length ? adminSubTab : 0;
    return (
      <div className="p-6 space-y-0">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center"><Icon className="w-5 h-5 text-[#ef4444]" /></div>
          <div><h2 className="text-lg font-bold">{title}</h2><p className="text-sm text-gray-500">{description}</p></div>
        </div>
        <div className="border-b border-gray-200 mb-6 overflow-x-auto">
          <nav className="flex space-x-1 -mb-px">
            {items.map((item, i) => (
              <button key={i} onClick={() => setAdminSubTab(i)}
                className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${idx === i ? 'border-[#ef4444] text-[#ef4444]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                {item.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="bg-white rounded-xl p-6 border">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{items[idx].label}</h3>
          <p className="text-sm text-gray-500 mb-6">{items[idx].desc}</p>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nom</label><input className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Saisir..." /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Valeur</label><input className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Saisir..." /></div>
            </div>
            <div className="flex justify-end space-x-3">
              <button className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Annuler</button>
              <button className="px-4 py-2 text-sm bg-[#ef4444] text-white rounded-lg hover:bg-[#dc2626]">{items[idx].action || 'Enregistrer'}</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderUsers = () => renderAdminSection('Utilisateurs & Droits', 'Gestion des comptes et permissions', Users, [
    { label: 'Liste des utilisateurs', desc: 'Creer, modifier, desactiver des comptes utilisateurs' },
    { label: 'Attribution des roles', desc: 'Admin, Manager, Comptable, Lecteur — definir le role de chaque utilisateur' },
    { label: 'Permissions par module', desc: 'Definir les acces par module et par action (lecture/ecriture/suppression)' },
    { label: 'Sessions actives', desc: 'Voir les utilisateurs connectes et forcer la deconnexion si necessaire', action: 'Voir les sessions' },
    { label: 'Historique connexions', desc: 'Journal des connexions avec IP, navigateur et duree', action: 'Consulter' },
  ]);

  const renderSecurity = () => renderAdminSection('Securite & Roles', 'Politiques de securite et controle d\'acces', Lock, [
    { label: 'Roles & Permissions', desc: 'Configurer les roles (Admin, Manager, Comptable, Lecteur) et leurs droits' },
    { label: 'Politique mots de passe', desc: 'Longueur minimale, complexite, expiration, historique' },
    { label: 'Authentification 2FA', desc: 'Activer/desactiver la double authentification par utilisateur', action: 'Configurer' },
    { label: 'Adresses IP autorisees', desc: 'Restreindre l\'acces a des plages IP specifiques' },
    { label: 'Journal de securite', desc: 'Tentatives de connexion echouees, changements de droits', action: 'Consulter' },
  ]);

  const renderCompany = () => renderAdminSection('Configuration Societe & Comptabilite', 'Parametres de la societe, plan comptable et fiscalite', Briefcase, [
    { label: 'Informations legales', desc: 'Raison sociale, NIF, RCCM, regime fiscal, adresse du siege' },
    { label: 'Logo & En-tete', desc: 'Logo de la societe pour les documents PDF et les etats financiers' },
    { label: 'Exercice comptable', desc: 'Dates de debut/fin, periode en cours, historique des exercices' },
    { label: 'Devise & Localisation', desc: 'Devise principale (FCFA), pays OHADA, fuseau horaire' },
    { label: 'Multi-societes', desc: 'Gerer plusieurs entites juridiques et leurs relations', action: 'Configurer' },
    { label: 'Plan Comptable SYSCOHADA', desc: 'Classes 1-9, comptes et sous-comptes conformes OHADA revise 2017', action: 'Configurer' },
    { label: 'TVA & Taxes', desc: 'Taux de TVA (18%, 9%, 0%), retenues a la source, patente', action: 'Configurer' },
    { label: 'Categories immobilisations', desc: 'Durees, taux, comptes de dotation et d\'amortissement par categorie', action: 'Configurer' },
  ]);

  const renderBackup = () => renderAdminSection('Sauvegardes & Restauration', 'Protection et recuperation des donnees', Database, [
    { label: 'Sauvegarde manuelle', desc: 'Creer une sauvegarde complete de la base de donnees maintenant', action: 'Sauvegarder' },
    { label: 'Sauvegardes automatiques', desc: 'Planification : quotidienne, hebdomadaire, mensuelle', action: 'Configurer' },
    { label: 'Historique des sauvegardes', desc: 'Liste des sauvegardes avec date, taille et statut', action: 'Consulter' },
    { label: 'Restauration', desc: 'Restaurer la base depuis une sauvegarde precedente', action: 'Restaurer' },
    { label: 'Export complet', desc: 'Exporter toutes les donnees au format FEC, CSV ou JSON', action: 'Exporter' },
  ]);

  const renderImportExport = () => renderAdminSection('Import / Export', 'Echange de donnees avec l\'exterieur', FolderOpen, [
    { label: 'Import Plan Comptable', desc: 'Importer un plan comptable SYSCOHADA depuis un fichier Excel/CSV' },
    { label: 'Import Ecritures', desc: 'Importer des ecritures comptables (FEC, CSV, Sage, Ciel)' },
    { label: 'Import Tiers', desc: 'Importer la base clients/fournisseurs depuis un fichier' },
    { label: 'Export FEC', desc: 'Fichier des Ecritures Comptables — format legal pour l\'administration fiscale', action: 'Generer' },
    { label: 'Export Grand Livre', desc: 'Export complet du grand livre en Excel ou PDF', action: 'Exporter' },
  ]);

  const renderAuditTrail = () => renderAdminSection('Piste d\'Audit', 'Tracabilite complete des operations', FileText, [
    { label: 'Journal des ecritures', desc: 'Creation, modification, validation, suppression de chaque ecriture', action: 'Consulter' },
    { label: 'Journal des clotures', desc: 'Clotures mensuelles et annuelles avec checklist et resultat', action: 'Consulter' },
    { label: 'Journal des connexions', desc: 'Connexions, deconnexions, tentatives echouees par utilisateur', action: 'Consulter' },
    { label: 'Journal des modifications', desc: 'Tout changement de parametre, role ou configuration', action: 'Consulter' },
    { label: 'Export piste d\'audit', desc: 'Generer un PDF certifie de la piste d\'audit pour le CAC', action: 'Exporter PDF' },
  ]);

  const renderAPI = () => renderAdminSection('API & Integrations', 'Connexions avec les systemes externes', Server, [
    { label: 'Cles API', desc: 'Generer et gerer les cles d\'acces pour les integrations tierces' },
    { label: 'Webhooks', desc: 'Configurer des notifications automatiques vers des systemes externes' },
    { label: 'Integration bancaire', desc: 'Connexion EBICS / SWIFT pour les releves automatiques', action: 'Configurer' },
    { label: 'Integration paie', desc: 'Connexion avec le logiciel de paie pour import automatique des OD' },
    { label: 'Logs API', desc: 'Historique des appels API avec codes de reponse et durees', action: 'Consulter' },
  ]);

  return (
    <div className="min-h-screen bg-[#e5e5e5]">
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center space-x-4">
            <button onClick={() => navigate('/')} className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 border-2 border-gray-300"><ArrowLeft className="w-5 h-5" /><span className="text-sm font-semibold">Accueil</span></button>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100">{sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</button>
            <div className="flex items-center space-x-3"><div className="w-10 h-10 rounded-lg bg-gradient-to-r from-[#ef4444] to-[#ef4444] flex items-center justify-center"><Shield className="w-5 h-5 text-white" /></div><div className="hidden sm:block"><h1 className="text-lg font-bold">Atlas Finance</h1><p className="text-xs text-gray-500">v3.0</p></div></div>
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
          <div className="flex-1 max-w-md mx-6 hidden md:block"><div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input placeholder="Recherche..." className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm" /></div></div>
          <div className="flex items-center space-x-3">
            <button onClick={() => navigate('/dashboard')} className="group px-6 py-2.5 bg-[#171717] hover:bg-[#262626] rounded-lg text-white font-semibold flex items-center space-x-2 transition-all shadow-sm hover:shadow-md">
              <LayoutDashboard className="w-5 h-5" />
              <span>Atlas Finance</span>
              <ExternalLink className="w-4 h-4 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </button>
            <button className="relative p-2 rounded-lg hover:bg-gray-100"><Bell className="w-5 h-5 text-gray-500" /><span className="absolute -top-1 -right-1 w-5 h-5 text-xs font-bold text-white bg-[#ef4444] rounded-full flex items-center justify-center">7</span></button>
            <button onClick={() => setActiveSection('help')} className="p-2 rounded-lg hover:bg-gray-100"><HelpCircle className="w-5 h-5 text-gray-500" /></button>
            <div className="relative">
              <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#ef4444] to-[#ef4444] flex items-center justify-center"><Shield className="w-4 h-4 text-white" /></div>
                <div className="hidden md:block text-left"><p className="text-sm font-medium">{userData.name}</p><p className="text-xs text-gray-500">{userData.role}</p></div>
                <ChevronDown className={`w-4 h-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border py-2 z-50">
                  <button onClick={() => { setActiveSection('profile'); setUserMenuOpen(false); }} className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50"><User className="w-5 h-5 text-[#ef4444]" /><span>Mon profil</span></button>
                  <button onClick={() => { setActiveSection('settings'); setUserMenuOpen(false); }} className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50"><Settings className="w-5 h-5 text-[#ef4444]" /><span>Parametres</span></button>
                  <button onClick={() => { setActiveSection('help'); setUserMenuOpen(false); }} className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50"><HelpCircle className="w-5 h-5 text-[#ef4444]" /><span>Aide</span></button>
                  <div className="border-t my-2"></div>
                  <button onClick={handleLogout} className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-red-50 text-red-600"><LogOut className="w-5 h-5" /><span>Deconnexion</span></button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      <div className={`flex ${activeSection === 'migration' ? 'hidden' : ''}`}>
        <aside className={`${sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'} lg:w-64 bg-white border-r min-h-[calc(100vh-73px)] transition-all`}>
          <div className="p-4">
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
                  <button key={item.id} onClick={() => setActiveSection(item.id)} className={`${activeSection===item.id?'bg-[#ef4444]/10 text-[#ef4444]':'text-gray-600 hover:bg-gray-50'} w-full flex items-center justify-between px-3 py-2 rounded-lg`}>
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
                <button key={item.id} onClick={() => setActiveSection(item.section)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg hover:text-[#ef4444] hover:bg-gray-50 ${activeSection === item.section ? 'text-[#ef4444] bg-red-50 font-medium' : 'text-gray-600'}`}>
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
          {activeSection === 'users' && renderUsers()}
          {activeSection === 'security' && renderSecurity()}
          {activeSection === 'company' && renderCompany()}
          {activeSection === 'backup' && renderBackup()}
          {activeSection === 'import-export' && renderImportExport()}
          {activeSection === 'audit-trail' && renderAuditTrail()}
          {activeSection === 'api' && renderAPI()}
        </main>
      </div>
      {activeSection === 'migration' && (
        <div className="min-h-[calc(100vh-73px)] overflow-auto bg-white">
          <DataMigrationImport onBack={() => setActiveSection('workspace')} />
        </div>
      )}
      {userMenuOpen && <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />}
    </div>
  );
};

export default AdminWorkspace;
