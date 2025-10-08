import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Link } from 'react-router-dom';

const WiseBookHome: React.FC = () => {
  const { t } = useLanguage();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Sidebar moderne */}
      <div className={`bg-slate-900 text-white transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-16'}`}>
        {/* Header */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center justify-between">
            {sidebarOpen && (
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">W</span>
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">WiseBook</h1>
                  <p className="text-xs text-slate-300">ERP SYSCOHADA</p>
                </div>
              </div>
            )}
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded hover:bg-slate-700 text-white"
            >
              {sidebarOpen ? '←' : '→'}
            </button>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {[
            { icon: '📊', label: 'Dashboard Executive', href: '/executive' },
            { icon: '📝', label: t('accounting.title'), href: '/accounting' },
            { icon: '👥', label: 'Clients Avancé', href: '/customers-advanced', badge: 3 },
            { icon: '🚛', label: t('navigation.suppliers'), href: '/suppliers-advanced' },
            { icon: '💰', label: t('navigation.treasury'), href: '/treasury-advanced', badge: 1 },
            { icon: '📈', label: 'Analyse Financière', href: '/financial-analysis-advanced' },
            { icon: '🏢', label: t('navigation.assets'), href: '/assets' },
            { icon: '💼', label: t('navigation.budget'), href: '/budgeting' },
          ].map((item, index) => (
            <Link
              key={index}
              to={item.href}
              className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-slate-700 transition-colors text-white no-underline"
              style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}
            >
              <span style={{ fontSize: '18px' }}>{item.icon}</span>
              {sidebarOpen && (
                <div className="flex items-center justify-between w-full">
                  <span className="font-medium text-sm">{item.label}</span>
                  {item.badge && (
                    <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </Link>
          ))}
        </nav>
      </div>
      
      {/* Contenu principal */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">WiseBook Dashboard</h1>
              <p className="text-gray-600 mt-1">Interface moderne sans scroll • {new Date().toLocaleDateString('fr-FR')}</p>
            </div>
            <div className="flex items-center space-x-4">
              <button className="relative p-2 text-gray-700 hover:text-gray-600">
                🔔
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
              </button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">A</span>
                </div>
                <span className="font-medium text-gray-900">Admin</span>
              </div>
            </div>
          </div>
        </header>
        
        {/* Contenu dashboard - PAS DE SCROLL */}
        <main className="flex-1 p-6" style={{ height: 'calc(100vh - 120px)' }}>
          <div className="grid grid-cols-12 gap-6 h-full">
            {/* Zone principale - 8 colonnes */}
            <div className="col-span-8 space-y-6">
              {/* KPIs compacts */}
              <div className="grid grid-cols-4 gap-4">
                {[
                  { title: 'CA Mensuel', value: '12.45M', change: '+12%', color: 'bg-emerald-500' },
                  { title: 'Position Tréso', value: '3.85M', change: '+420K', color: 'bg-blue-500' },
                  { title: 'Créances', value: '2.24M', change: 'DSO: 42j', color: 'bg-amber-500' },
                  { title: 'Dettes', value: '1.68M', change: 'DPO: 38j', color: 'bg-purple-500' }
                ].map((kpi, i) => (
                  <div key={i} className="bg-white rounded-lg shadow-sm border-l-4 border-l-gray-200 p-4" 
                       style={{ borderLeftColor: kpi.color.replace('bg-', '').replace('-500', '') === 'emerald' ? '#6A8A82' :
                                                    kpi.color.replace('bg-', '').replace('-500', '') === 'blue' ? '#7A99AC' :
                                                    kpi.color.replace('bg-', '').replace('-500', '') === 'amber' ? '#B87333' : '#7A99AC' }}>
                    <p className="text-sm font-medium text-gray-600">{kpi.title}</p>
                    <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
                    <p className="text-sm text-gray-700">{kpi.change}</p>
                  </div>
                ))}
              </div>
              
              {/* Actions rapides accessibles */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">🚀 Accès Direct aux Dashboards Développés</h2>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { title: '📊 Executive Dashboard', desc: 'Vue consolidée tous modules', href: '/executive' },
                    { title: '👥 Clients Avancé', desc: 'Balance âgée + Recouvrement IA', href: '/customers-advanced' },
                    { title: '🚛 Fournisseurs Pro', desc: 'Optimisation paiements + DPO', href: '/suppliers-advanced' },
                    { title: '💰 Trésorerie Temps Réel', desc: 'Position + Appels fonds', href: '/treasury-advanced' },
                    { title: '📈 Analyse Financière', desc: 'TAFIRE + SIG + Ratios', href: '/financial-analysis-advanced' },
                    { title: '📝 Saisie Écriture', desc: 'Comptabilité SYSCOHADA', href: '/accounting/entries' }
                  ].map((action, i) => (
                    <Link
                      key={i}
                      to={action.href}
                      className="block p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group no-underline"
                      style={{ textDecoration: 'none' }}
                    >
                      <h3 className="font-bold text-gray-900 mb-2">{action.title}</h3>
                      <p className="text-sm text-gray-600">{action.desc}</p>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Sidebar droite - Activités */}
            <div className="col-span-4">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">⚡ Activité Récente</h2>
                </div>
                <div className="p-4 space-y-3">
                  {[
                    { type: '✅ Écriture validée', desc: 'VTE-001 Client ABC SARL', amount: '+850K', time: '15 min' },
                    { type: '💸 Paiement exécuté', desc: 'Virement fournisseur XYZ', amount: '-420K', time: '1h' },
                    { type: '🤖 Lettrage IA', desc: '47 lignes rapprochées (98%)', amount: null, time: '2h' },
                    { type: '⚠️ Alerte DSO', desc: 'Client DEF > 50 jours', amount: '125K', time: '3h' },
                    { type: '📊 TAFIRE généré', desc: 'États financiers Q3', amount: null, time: t('time.yesterday') }
                  ].map((activity, i) => (
                    <div key={i} className="p-3 rounded-lg hover:bg-gray-50 border border-gray-100">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 text-sm">{activity.type}</p>
                          <p className="text-xs text-gray-600 mt-1">{activity.desc}</p>
                        </div>
                        <div className="text-right">
                          {activity.amount && (
                            <p className={`text-sm font-bold ${activity.amount.startsWith('+') ? 'text-emerald-600' : 'text-red-600'}`}>
                              {activity.amount}
                            </p>
                          )}
                          <p className="text-xs text-gray-700">{activity.time}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default WiseBookHome;