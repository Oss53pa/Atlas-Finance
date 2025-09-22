import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calculator,
  FileText,
  BookOpen,
  BarChart3,
  Users,
  Banknote,
  PieChart,
  TrendingUp,
  Clock,
  CheckCircle,
  Plus,
  DollarSign,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  Home,
  ArrowLeft,
  Bell,
  HelpCircle,
  User,
  Search,
  Menu,
  X,
  Target,
  AlertCircle,
  MessageSquare,
  CheckSquare
} from 'lucide-react';

const ComptableWorkspaceFinal: React.FC = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Liens directs vers WiseBook
  const wiseBookLinks = [
    { id: 'entries', label: 'Saisie d\'écritures', icon: FileText, badge: '5', path: '/accounting/entries' },
    { id: 'journals', label: 'Journaux', icon: BookOpen, path: '/accounting/journals' },
    { id: 'ledger', label: 'Grand livre', icon: Calculator, path: '/accounting/general-ledger' },
    { id: 'balance', label: 'Balance générale', icon: PieChart, path: '/accounting/balance' },
    { id: 'statements', label: 'États financiers', icon: TrendingUp, path: '/accounting/financial-statements' },
    { id: 'thirds', label: 'Gestion tiers', icon: Users, path: '/third-party' },
    { id: 'banking', label: 'Banque', icon: Banknote, path: '/treasury' },
    // Les modules Tâches et Collaboration sont maintenant intégrés directement dans le workspace
  ];

  return (
    <div className="min-h-screen bg-[#ECECEC] font-['Sometype Mono']">
      {/* Barre de navigation supérieure avec retour et WiseBook */}
      <header className="bg-white border-b border-[#D9D9D9] sticky top-0 z-50">
        <div className="flex items-center justify-between px-6 py-3">
          {/* Navigation et logo */}
          <div className="flex items-center space-x-4">
            {/* BOUTON RETOUR BIEN VISIBLE */}
            <button 
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors border-2 border-gray-300"
            >
              <ArrowLeft className="w-5 h-5 text-[#444444]" />
              <span className="text-sm font-semibold text-[#444444]">Retour</span>
            </button>

            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-[#6A8A82] to-[#5A7A72] flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-[#191919]">WiseBook ERP</h1>
                <p className="text-xs text-[#767676]">v3.0 Professional</p>
              </div>
            </div>

            <div className="hidden md:flex items-center space-x-2 px-3 py-1 rounded-lg bg-gray-50">
              <Calculator className="w-4 h-4 text-[#6A8A82]" />
              <span className="text-sm font-medium text-[#444444]">Espace Comptable</span>
            </div>
          </div>

          {/* Recherche */}
          <div className="flex-1 max-w-md mx-6 hidden md:block">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-[#767676]" />
              <input
                type="text"
                placeholder="Recherche globale... (Ctrl+K)"
                className="w-full pl-10 pr-4 py-2 border border-[#D9D9D9] rounded-lg focus:ring-2 focus:ring-[#6A8A82]/20 focus:border-[#6A8A82] text-sm"
              />
            </div>
          </div>

          {/* Actions utilisateur */}
          <div className="flex items-center space-x-3">
            {/* BOUTON WISEBOOK COMPLET TRÈS VISIBLE */}
            <button 
              onClick={() => navigate('/executive')}
              className="px-6 py-2 bg-gradient-to-r from-[#6A8A82] to-[#5A7A72] rounded-lg text-white font-bold transition-all hover:shadow-lg hover:scale-105 flex items-center space-x-2 border-2 border-[#6A8A82]"
            >
              <Home className="w-5 h-5" />
              <span className="text-sm">WISEBOOK</span>
              <ExternalLink className="w-4 h-4" />
            </button>

            {/* Notifications */}
            <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <Bell className="w-5 h-5 text-[#767676]" />
              <span className="absolute -top-1 -right-1 w-5 h-5 text-xs font-bold text-white bg-[#6A8A82] rounded-full flex items-center justify-center">
                5
              </span>
            </button>

            {/* Aide */}
            <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <HelpCircle className="w-5 h-5 text-[#767676]" />
            </button>

            {/* Utilisateur */}
            <div className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#6A8A82] to-[#5A7A72] flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-[#191919]">Marie Dupont</p>
                <p className="text-xs text-[#767676]">Comptable</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Layout principal */}
      <div className="flex">
        {/* Sidebar */}
        <aside className={`
          ${sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'} 
          lg:w-64 bg-white border-r border-[#D9D9D9] min-h-[calc(100vh-73px)] transition-all duration-300
        `}>
          <div className="p-4">
            {/* Bouton WiseBook complet dans sidebar aussi */}
            <div className="mb-6">
              <button 
                onClick={() => navigate('/executive')}
                className="w-full p-4 bg-gradient-to-r from-[#6A8A82] to-[#5A7A72] rounded-lg text-white hover:shadow-lg transition-all group"
              >
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <Home className="w-5 h-5" />
                  <ExternalLink className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </div>
                <div className="text-sm font-semibold">WiseBook Complet</div>
                <div className="text-xs opacity-90">Accès intégral à tous les modules</div>
              </button>
            </div>

            {/* Séparateur */}
            <div className="border-b border-[#E8E8E8] mb-4 pb-4">
              <div className="text-xs font-semibold text-[#767676] uppercase tracking-wide">Modules Comptables</div>
            </div>

            {/* Liens rapides vers WiseBook */}
            <div className="space-y-1">
              {wiseBookLinks.map((item) => {
                const IconComponent = item.icon;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.path)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-[#444444] hover:text-[#6A8A82] hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-center space-x-3">
                      <IconComponent className="w-4 h-4" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      {item.badge && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-600">
                          {item.badge}
                        </span>
                      )}
                      <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Raccourcis rapides */}
            <div className="mt-6 pt-4 border-t border-[#E8E8E8]">
              <div className="text-xs font-semibold text-[#767676] uppercase tracking-wide mb-3">Raccourcis Rapides</div>
              <div className="space-y-2">
                <button 
                  onClick={() => navigate('/accounting/lettrage')}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-[#444444] hover:text-[#6A8A82] hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center space-x-2">
                    <Zap className="w-4 h-4" />
                    <span className="text-sm">Lettrage automatique</span>
                  </div>
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
                
                <button 
                  onClick={() => navigate('/financial-statements')}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-[#444444] hover:text-[#6A8A82] hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-center space-x-2">
                    <PieChart className="w-4 h-4" />
                    <span className="text-sm">États SYSCOHADA</span>
                  </div>
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Zone de contenu principal */}
        <main className="flex-1 min-h-[calc(100vh-73px)] overflow-auto">
          <div className="p-6 space-y-6">
            {/* Métriques rapides */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { title: 'Écritures du jour', value: '47', icon: FileText, color: '#6A8A82', change: '+12%', trend: 'up' },
                { title: 'En attente validation', value: '8', icon: Clock, color: '#B87333', change: '-3%', trend: 'down' },
                { title: 'Lettrage automatique', value: '156', icon: CheckCircle, color: '#7A99AC', change: '+23%', trend: 'up' },
                { title: 'Solde trésorerie', value: '2.4M€', icon: DollarSign, color: '#6A8A82', change: '+8.5%', trend: 'up' }
              ].map((metric, index) => {
                const IconComponent = metric.icon;
                return (
                  <div key={index} className="bg-white rounded-lg p-4 border border-[#E8E8E8] hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{backgroundColor: `${metric.color}20`}}
                      >
                        <IconComponent className="w-5 h-5" style={{color: metric.color}} />
                      </div>
                      <div className={`text-xs font-medium flex items-center space-x-1 ${
                        metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {metric.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        <span>{metric.change}</span>
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-[#191919] mb-1">{metric.value}</h3>
                    <p className="text-sm text-[#444444]">{metric.title}</p>
                  </div>
                );
              })}
            </div>

            {/* Actions rapides WiseBook TRÈS VISIBLES */}
            <div className="bg-white rounded-lg p-6 border-2 border-[#6A8A82] bg-gradient-to-r from-[#6A8A82]/5 to-[#5A7A72]/5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[#191919]">🚀 Accès Direct WiseBook</h2>
                <button 
                  onClick={() => navigate('/executive')}
                  className="px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#5A7A72] transition-colors flex items-center space-x-2 font-bold"
                >
                  <Home className="w-4 h-4" />
                  <span>WISEBOOK COMPLET</span>
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Nouvelle écriture', icon: Plus, path: '/accounting/entries', color: '#6A8A82' },
                  { label: 'Lettrage auto', icon: Zap, path: '/accounting/lettrage', color: '#B87333' },
                  { label: 'Balance du jour', icon: BarChart3, path: '/accounting/balance', color: '#7A99AC' },
                  { label: 'États SYSCOHADA', icon: TrendingUp, path: '/financial-statements', color: '#6A8A82' }
                ].map((action, index) => {
                  const IconComponent = action.icon;
                  return (
                    <button 
                      key={index}
                      onClick={() => navigate(action.path)}
                      className="p-4 rounded-lg border-2 border-dashed border-[#6A8A82]/50 hover:border-[#6A8A82] hover:bg-white transition-all group"
                    >
                      <div className="text-center">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2 transition-colors"
                          style={{backgroundColor: `${action.color}20`}}
                        >
                          <IconComponent className="w-5 h-5" style={{color: action.color}} />
                        </div>
                        <span className="text-sm font-medium text-[#444444] block">{action.label}</span>
                        <div className="flex items-center justify-center space-x-1 mt-1">
                          <span className="text-xs text-[#6A8A82]">WiseBook</span>
                          <ExternalLink className="w-3 h-3 text-[#767676] opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Liens modules avec flèches visibles */}
            <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
              <h2 className="text-lg font-semibold text-[#191919] mb-4">📋 Modules Comptables WiseBook</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {wiseBookLinks.map((item) => {
                  const IconComponent = item.icon;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => navigate(item.path)}
                      className="flex items-center justify-between p-4 border-2 border-[#E8E8E8] hover:border-[#6A8A82] hover:bg-[#6A8A82]/5 rounded-lg transition-all group"
                    >
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{backgroundColor: '#6A8A8220'}}
                        >
                          <IconComponent className="w-4 h-4 text-[#6A8A82]" />
                        </div>
                        <div className="text-left">
                          <span className="text-sm font-medium text-[#191919] block">{item.label}</span>
                          {item.badge && (
                            <span className="text-xs text-red-600 font-medium">{item.badge} en attente</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <ArrowLeft className="w-4 h-4 text-[#6A8A82] transform rotate-180 group-hover:translate-x-1 transition-transform" />
                        <span className="text-xs text-[#767676] group-hover:text-[#6A8A82]">WiseBook</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ComptableWorkspaceFinal;