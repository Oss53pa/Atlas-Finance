import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { MySpacesDock } from '../../features/collaboration/components/MySpacesDock';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { formatCurrency } from '../../utils/formatters';
import { themes } from '../../styles/theme';
import type { ThemeType } from '../../styles/theme';
import CompleteTasksModule from '../../components/tasks/CompleteTasksModule';
import CollaborationModule from '../../components/collaboration/CollaborationModule';
import { useFiscalUrgentAlerts } from '../../hooks/useFiscalAlerts';
import SecurityActions from '../../components/security/SecurityActions';
import { toast } from 'sonner';
import {
  Calculator, FileText, BookOpen, BarChart3, Users, Banknote, PieChart, TrendingUp,
  Clock, CheckCircle, Plus, DollarSign, Zap, ArrowUpRight, ArrowDownRight, ExternalLink,
  ArrowLeft, Bell, HelpCircle, User, Search, Menu, X, Settings, LogOut, ChevronDown,
  Shield, Mail, BookMarked, MessageCircle, FileQuestion, Video, Headphones,
  ListTodo, MessageSquare, LayoutDashboard, Briefcase, AlertTriangle, Inbox
} from 'lucide-react';

// W3: APP_VERSION fallback '3.0.0' replaced by a build-time guard
const APP_VERSION: string =
  typeof __APP_VERSION__ !== 'undefined' && __APP_VERSION__
    ? __APP_VERSION__
    : 'dev';

const themeLabels: Record<string, string> = {
  atlasFinance: 'Atlas FnA',
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

  // W4 / W2: state distinguishes null (not yet loaded) from 0 (réellement zéro)
  const [comptaStats, setComptaStats] = useState<{
    entries: number; drafts: number; posted: number; treasury: number;
  } | null>(null);
  const [statsLoading, setStatsLoading] = useState(true); // W2: loading state

  const [companyPhone, setCompanyPhone] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [workspaceSwitcherOpen, setWorkspaceSwitcherOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'workspace' | 'tasks' | 'chat' | 'profile' | 'settings' | 'help'>('workspace');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  // W27: notifPrefs chargées depuis l'adapter au montage (voir useEffect ci-dessous)
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({ Email: true, Push: true, Alertes: true });
  const [notifPrefsLoaded, setNotifPrefsLoaded] = useState(false);

  const [headerSearch, setHeaderSearch] = useState('');
  const [helpSearch, setHelpSearch] = useState('');

  const workspaceOptions = user?.role === 'admin' ? [
    { label: 'Espace Admin', path: '/workspace/admin', icon: Shield, color: '#C0322B', current: false },
    { label: 'Espace Manager', path: '/workspace/manager', icon: Briefcase, color: 'var(--color-secondary)', current: false },
    { label: 'Espace Comptable', path: '/workspace/comptable', icon: Calculator, color: 'var(--color-primary)', current: true },
  ] : user?.role === 'manager' ? [
    { label: 'Espace Manager', path: '/workspace/manager', icon: Briefcase, color: 'var(--color-secondary)', current: false },
    { label: 'Espace Comptable', path: '/workspace/comptable', icon: Calculator, color: 'var(--color-primary)', current: true },
  ] : [
    { label: 'Espace Comptable', path: '/workspace/comptable', icon: Calculator, color: 'var(--color-primary)', current: true },
  ];

  // Derived values (safe defaults while loading)
  const stats = comptaStats ?? { entries: 0, drafts: 0, posted: 0, treasury: 0 };

  const atlasFinanceLinks = [
    { id: 'bannette', label: 'Bannette (à valider)', icon: Inbox, path: '/bannette' },
    { id: 'entries', label: "Saisie ecritures", icon: FileText, badge: stats.drafts > 0 ? String(stats.drafts) : undefined, path: '/accounting/entries' },
    { id: 'journals', label: t('navigation.journals'), icon: BookOpen, path: '/accounting/journals' },
    { id: 'ledger', label: 'Grand livre', icon: Calculator, path: '/accounting/general-ledger' },
    { id: 'balance', label: 'Balance', icon: PieChart, path: '/accounting/balance' },
    { id: 'statements', label: 'Etats financiers', icon: TrendingUp, path: '/accounting/financial-statements' },
    { id: 'thirds', label: 'Tiers', icon: Users, path: '/third-party' },
    { id: 'banking', label: 'Banque', icon: Banknote, path: '/treasury' },
  ];

  const handleLogout = () => { logout(); navigate('/'); };
  const userData = { name: user?.name || '', email: user?.email || '', role: user?.role || '', phone: user?.phone || '', department: user?.department || '', twoFactorEnabled: user?.twoFactorEnabled ?? false };

  // W1 / W2: loadStats avec isLoading + console.error + toast.error
  useEffect(() => {
    const loadStats = async () => {
      setStatsLoading(true);
      try {
        const entries = await adapter.getAll<any>('journalEntries');
        const drafts = entries.filter((e: any) => e.status === 'draft').length;
        const posted = entries.filter((e: any) => e.status === 'posted' || e.status === 'validated').length;
        // Trésorerie = solde des comptes classe 5, lu directement sur le code de
        // compte de la ligne (les lignes portent accountCode, pas accountId).
        let treasury = 0;
        for (const entry of entries) {
          if (!entry.lines) continue;
          if (entry.status === 'draft') continue; // trésorerie = mouvements validés uniquement (aligné sur positionService)
          for (const line of entry.lines) {
            const accNum = String(line.accountCode || '');
            // Disponibilités classe 5, HORS 58 (virements internes en transit)
            if (accNum.startsWith('5') && !accNum.startsWith('58')) {
              treasury += (line.debit || 0) - (line.credit || 0);
            }
          }
        }
        setComptaStats({ entries: entries.length, drafts, posted, treasury });
        // Téléphone entreprise : source canonique settings.admin_company_legal (companies peut être vide/diverger)
        try {
          const legalRow = await adapter.getById<any>('settings', 'admin_company_legal');
          const legal = legalRow?.value ? JSON.parse(legalRow.value) : null;
          if (legal?.telephone) {
            setCompanyPhone(legal.telephone);
          } else {
            const companies = await adapter.getAll<any>('companies');
            if (companies.length > 0) setCompanyPhone(companies[0].telephone || companies[0].phone || '');
          }
        } catch { /* téléphone optionnel */ }
      } catch (err) {
        console.error('[ComptableWorkspace] Erreur chargement stats:', err);
        toast.error('Impossible de charger les statistiques du workspace');
      } finally {
        setStatsLoading(false);
      }
    };
    loadStats();
  }, [adapter]);

  // W27: charger les préférences de notifications depuis l'adapter au montage
  useEffect(() => {
    if (notifPrefsLoaded) return;
    const loadNotifPrefs = async () => {
      try {
        const keys = ['Email', 'Push', 'Alertes'] as const;
        const loaded: Record<string, boolean> = { Email: true, Push: true, Alertes: true };
        const rows = await adapter.getAll<any>('settings' as any);
        for (const key of keys) {
          const row = rows.find((r: any) => r.key === `notif_comptable_${key}`);
          if (row) loaded[key] = row.value === 'true';
        }
        setNotifPrefs(loaded);
      } catch (err) {
        console.error('[ComptableWorkspace] Erreur chargement préférences notifs:', err);
      } finally {
        setNotifPrefsLoaded(true);
      }
    };
    loadNotifPrefs();
  }, [adapter, notifPrefsLoaded]);

  const renderProfile = () => (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Mon Profil</h2>
        <button onClick={() => setActiveSection('workspace')} className="px-4 py-2 text-sm text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded-lg">Retour</button>
      </div>
      <div className="bg-white rounded-xl p-6 border">
        <div className="flex items-start space-x-6">
          <div className="w-24 h-24 rounded-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-hover)] flex items-center justify-center"><User className="w-12 h-12 text-white" /></div>
          <div><h3 className="text-lg font-bold">{userData.name}</h3><p className="text-[var(--color-primary)]">{userData.role}</p><p className="text-sm text-gray-500">{userData.department}</p></div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border">
          <h4 className="font-semibold mb-4 flex items-center"><Mail className="w-5 h-5 mr-2 text-[var(--color-primary)]" />Contact</h4>
          <p><span className="text-xs text-gray-500">Email:</span> {userData.email}</p>
          <p className="mt-2"><span className="text-xs text-gray-500">Tel:</span> {userData.phone}</p>
        </div>
        <SecurityActions email={userData.email} accentVar="var(--color-primary)" />
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Parametres</h2>
        <button onClick={() => setActiveSection('workspace')} className="px-4 py-2 text-sm text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded-lg">Retour</button>
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
          {(['Email', 'Push', 'Alertes'] as const).map((n) => (
            <div key={n} className="flex justify-between p-3 border rounded-lg"><span>{n}</span>
              <label className="relative inline-flex cursor-pointer"><input type="checkbox" checked={!!notifPrefs[n]} onChange={async e => {
                const next = { ...notifPrefs, [n]: e.target.checked };
                setNotifPrefs(next);
                // W7: log + toast si la persistance échoue
                try {
                  await (adapter as { upsert?: (table: any, data: any) => Promise<any> }).upsert?.('settings' as any, { key: `notif_comptable_${n}`, value: String(e.target.checked), updatedAt: new Date().toISOString() });
                } catch (err) {
                  console.error('[ComptableWorkspace] Erreur persistance préférence notif:', err);
                  toast.error('Impossible de sauvegarder la préférence de notification');
                }
              }} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-checked:bg-[var(--color-primary)] rounded-full after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div></label>
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
        <button onClick={() => setActiveSection('workspace')} className="px-4 py-2 text-sm text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded-lg">Retour</button>
      </div>
      <div className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-hover)] rounded-xl p-8 text-white">
        <h3 className="text-lg font-bold mb-4">Comment pouvons-nous vous aider?</h3>
        <div className="relative"><Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" /><input placeholder="Rechercher..." value={helpSearch} onChange={e => setHelpSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && helpSearch.trim()) window.open('https://docs.atlas-studio.org/search?q='+encodeURIComponent(helpSearch.trim()), '_blank'); }} className="w-full pl-12 pr-4 py-3 rounded-lg text-black" /></div>
      </div>
      {/* W12: clés stables basées sur url/titre au lieu de l'index */}
      <div className="grid grid-cols-3 gap-4">
        {[{icon: BookMarked, title: 'Documentation', color: 'var(--color-primary)', url: 'https://docs.atlas-studio.org'}, {icon: Video, title: 'Videos', color: 'var(--color-secondary)', url: 'https://docs.atlas-studio.org/tutoriels'}, {icon: FileQuestion, title: 'FAQ', color: 'var(--color-text-tertiary)', url: 'https://docs.atlas-studio.org/faq'}].map((c) => (
          <button key={c.url} onClick={() => window.open(c.url, '_blank')} className="bg-white rounded-xl p-6 border hover:border-[var(--color-primary)] text-left">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4 opacity-80" style={{backgroundColor: `color-mix(in srgb, ${c.color} 12%, transparent)`}}><c.icon className="w-6 h-6" style={{color: c.color}} /></div>
            <h4 className="font-semibold">{c.title}</h4>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-6 border"><h4 className="font-semibold mb-4 flex items-center"><MessageCircle className="w-5 h-5 mr-2 text-[var(--color-primary)]" />Chat Support</h4><button onClick={() => { setActiveSection('chat'); }} className="w-full py-3 bg-[var(--color-primary)] text-white rounded-lg">Demarrer</button></div>
        <div className="bg-white rounded-xl p-6 border"><h4 className="font-semibold mb-4 flex items-center"><Headphones className="w-5 h-5 mr-2 text-[var(--color-primary)]" />Telephone</h4><p className="text-lg font-bold">{companyPhone || '—'}</p></div>
      </div>
    </div>
  );

  const renderWorkspace = () => (
    <div className="p-6 space-y-6">
      {/* W2: skeleton pendant le chargement */}
      <div className="grid grid-cols-4 gap-4">
        {statsLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg p-4 border animate-pulse">
                <div className="w-10 h-10 rounded-lg bg-gray-200 mb-3" />
                <div className="h-6 bg-gray-200 rounded w-2/3 mb-2" />
                <div className="h-4 bg-gray-100 rounded w-1/2" />
              </div>
            ))
          /* W12: clés stables basées sur le titre */
          : [{title:'Ecritures',value:String(stats.entries),icon:FileText,color:'var(--color-primary)',change:'',up:true},{title:'En attente',value:String(stats.drafts),icon:Clock,color:'var(--color-secondary)',change:stats.drafts > 0 ? `${stats.drafts} brouillons` : '',up:stats.drafts === 0},{title:'Validees',value:String(stats.posted),icon:CheckCircle,color:'var(--color-text-tertiary)',change:'',up:true},{title:'Tresorerie',value:formatCurrency(stats.treasury),icon:DollarSign,color:'var(--color-primary)',change:'',up:stats.treasury >= 0}].map((m) => (
            <div key={m.title} className="bg-white rounded-lg p-4 border hover:shadow-md">
              <div className="flex justify-between mb-3"><div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{backgroundColor:`color-mix(in srgb, ${m.color} 12%, transparent)`}}><m.icon className="w-5 h-5" style={{color:m.color}} /></div><span className={m.up?'text-green-600 text-xs':'text-red-600 text-xs'}>{m.change}</span></div>
              <h3 className="text-lg font-bold">{m.value}</h3><p className="text-sm text-gray-600">{m.title}</p>
            </div>
          ))
        }
      </div>
      <div className="bg-white rounded-lg p-6 border">
        <h2 className="text-lg font-semibold mb-4">Raccourcis Atlas FnA</h2>
        {/* W12: clés stables basées sur le path */}
        <div className="grid grid-cols-4 gap-3">
          {[{label:'Nouvelle écriture',icon:Plus,path:'/accounting/entries',color:'var(--color-primary)'},{label:'Lettrage',icon:Zap,path:'/accounting/lettrage',color:'var(--color-secondary)'},{label:'Balance',icon:BarChart3,path:'/accounting/balance',color:'var(--color-text-tertiary)'},{label:'SYSCOHADA',icon:TrendingUp,path:'/financial-statements',color:'var(--color-primary)'}].map((a) => (
            <button key={a.path} onClick={() => navigate(a.path)} className="p-4 rounded-lg border hover:border-gray-400 hover:shadow-sm transition-all">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2" style={{backgroundColor:`color-mix(in srgb, ${a.color} 8%, transparent)`}}><a.icon className="w-5 h-5" style={{color:a.color}} /></div>
              <span className="text-sm font-medium block text-center">{a.label}</span>
            </button>
          ))}
        </div>
      </div>
      {/* W8: Tâches — délégué à CompleteTasksModule en aperçu */}
      <div className="bg-white rounded-lg p-6 border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold flex items-center"><ListTodo className="w-5 h-5 mr-2 text-[var(--color-primary)]" />Mes Taches</h2>
          <button onClick={() => setActiveSection('tasks')} className="text-sm text-[var(--color-primary)] hover:underline">Voir tout</button>
        </div>
        <div className="text-center py-4 text-gray-400 text-sm">
          Accédez à la section <button onClick={() => setActiveSection('tasks')} className="underline text-[var(--color-primary)]">Mes taches</button> pour voir et gérer vos tâches.
        </div>
      </div>
      {/* Alertes Fiscales */}
      <FiscalAlertsWidget navigate={navigate} />
      {/* W9: Messages — délégué au module Collaboration */}
      <div className="bg-white rounded-lg p-6 border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold flex items-center"><MessageSquare className="w-5 h-5 mr-2 text-[var(--color-primary)]" />Messages recents</h2>
          <button onClick={() => setActiveSection('chat')} className="text-sm text-[var(--color-primary)] hover:underline">Voir tout</button>
        </div>
        <div className="text-center py-4 text-gray-400 text-sm">
          Accédez à la section <button onClick={() => setActiveSection('chat')} className="underline text-[var(--color-primary)]">Chat équipe</button> pour consulter vos messages.
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--color-border)]">
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center space-x-4">
            <button onClick={() => navigate('/')} className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 border-2 border-gray-300"><ArrowLeft className="w-5 h-5" /><span className="text-sm font-semibold">Accueil</span></button>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 rounded-lg hover:bg-gray-100">{sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</button>
            <div className="hidden sm:flex items-baseline gap-2">
              <span className="atlas-brand" style={{ fontSize: '1.5rem', color: 'var(--color-text-primary)' }}>Atlas FnA</span>
              <span className="text-xs num-tabular" style={{ color: 'var(--color-text-quaternary)' }}>v{APP_VERSION}</span>
            </div>
            <div className="hidden md:block relative">
              <button
                onClick={() => setWorkspaceSwitcherOpen(!workspaceSwitcherOpen)}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 transition-colors"
              >
                <Calculator className="w-4 h-4 text-[var(--color-primary)]" />
                <span className="text-sm font-medium text-[var(--color-primary)]">Espace Comptable</span>
                {/* W — condition déjà correcte ici : ChevronDown conditionnel */}
                {workspaceOptions.length > 1 && <ChevronDown className={`w-3 h-3 text-[var(--color-primary)] transition-transform ${workspaceSwitcherOpen ? 'rotate-180' : ''}`} />}
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
          <div className="flex-1 max-w-md mx-6 hidden md:block"><div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input placeholder="Recherche..." value={headerSearch} onChange={e => setHeaderSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && headerSearch.trim()) navigate(`/accounting/entries?search=${encodeURIComponent(headerSearch.trim())}`); }} className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm" /></div></div>
          <div className="flex items-center space-x-3">
            <button onClick={() => navigate('/dashboard')} className="group px-6 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] rounded-lg text-white font-semibold flex items-center space-x-2 transition-all shadow-sm hover:shadow-md"><LayoutDashboard className="w-5 h-5" /><span>Atlas Fna</span><ExternalLink className="w-4 h-4 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" /></button>
            {/* W10: bouton Bell avec onClick → section alertes/fiscal */}
            <button
              onClick={() => navigate('/taxation/echeances')}
              className="relative p-2 rounded-lg hover:bg-gray-100"
              title="Voir les échéances fiscales"
            >
              <Bell className="w-5 h-5 text-gray-500" />
              {stats.drafts > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 text-xs font-bold text-white bg-[var(--color-primary)] rounded-full flex items-center justify-center">
                  {stats.drafts}
                </span>
              )}
            </button>
            <button onClick={() => setActiveSection('help')} className="p-2 rounded-lg hover:bg-gray-100"><HelpCircle className="w-5 h-5 text-gray-500" /></button>
            <div className="relative">
              <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-hover)] flex items-center justify-center"><User className="w-4 h-4 text-white" /></div>
                <div className="hidden md:block text-left"><p className="text-sm font-medium">{userData.name}</p><p className="text-xs text-gray-500">{userData.role}</p></div>
                <ChevronDown className={`w-4 h-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border py-2 z-50">
                  <button onClick={() => { setActiveSection('profile'); setUserMenuOpen(false); }} className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50"><User className="w-5 h-5 text-[var(--color-primary)]" /><span>Mon profil</span></button>
                  <button onClick={() => { setActiveSection('settings'); setUserMenuOpen(false); }} className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50"><Settings className="w-5 h-5 text-[var(--color-primary)]" /><span>Parametres</span></button>
                  <button onClick={() => { setActiveSection('help'); setUserMenuOpen(false); }} className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50"><HelpCircle className="w-5 h-5 text-[var(--color-primary)]" /><span>Aide</span></button>
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
            {/* W11: badge ajouté sur l'item 'tasks' pour montrer le nombre de brouillons */}
            <div className="border-b mb-4 pb-4"><div className="text-xs font-semibold text-gray-500 uppercase mb-3">Mon espace</div>
              <div className="space-y-1">
                {[
                  {id:'workspace',label:'Accueil',icon:LayoutDashboard,badge: undefined as string | undefined},
                  {id:'tasks',label:'Mes taches',icon:ListTodo,badge: undefined as string | undefined},
                  {id:'chat',label:'Chat equipe',icon:MessageSquare,badge: undefined as string | undefined},
                  {id:'profile',label:'Mon profil',icon:User,badge: undefined as string | undefined},
                  {id:'settings',label:'Parametres',icon:Settings,badge: undefined as string | undefined},
                  {id:'help',label:'Aide',icon:HelpCircle,badge: undefined as string | undefined}
                ].map(item => (
                  <button key={item.id} onClick={() => setActiveSection(item.id as typeof activeSection)} className={`${activeSection===item.id?'bg-[var(--color-primary)]/10 text-[var(--color-primary)]':'text-gray-600 hover:bg-gray-50'} w-full flex items-center justify-between px-3 py-2 rounded-lg`}>
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
                <button key={item.id} onClick={() => navigate(item.path)} className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-gray-600 hover:text-[var(--color-primary)] hover:bg-gray-50">
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
        <button onClick={() => navigate('/taxation/echeances')} className="text-sm text-[var(--color-primary)] hover:underline flex items-center gap-1">
          Calendrier fiscal <ExternalLink className="w-3 h-3" />
        </button>
      </div>
      <div className="space-y-2">
        {urgentAlerts.slice(0, 5).map(alert => (
          <div key={alert.id} className={`flex items-center justify-between p-3 rounded-lg ${
            alert.isOverdue ? 'bg-red-100' : 'bg-orange-100'
          }`}>
            <div className="flex items-center gap-3">
              {/* W28 already correct here: icons present */}
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
          <button onClick={() => navigate('/taxation/echeances')} className="text-sm text-[var(--color-primary)] font-medium hover:underline w-full text-center py-2">
            + {urgentAlerts.length - 5} autre(s) échéance(s)
          </button>
        )}
      </div>
      <MySpacesDock />
    </div>
  );
};

export default ComptableWorkspaceFinal;
