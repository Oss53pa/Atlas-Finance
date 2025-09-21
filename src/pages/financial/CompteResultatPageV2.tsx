import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, BarChart3, PieChart, Download, Filter, RefreshCw,
  DollarSign, ArrowUpRight, ArrowDownRight, Eye, ArrowLeft,
  Home, Target, Activity, Calculator, FileText
} from 'lucide-react';

const CompteResultatPageV2: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('synthese');
  const [periode, setPeriode] = useState('current');

  // Onglets du compte de résultat
  const tabs = [
    { id: 'synthese', label: 'Synthèse', icon: BarChart3 },
    { id: 'charges', label: 'Charges (Classe 6)', icon: TrendingUp },
    { id: 'produits', label: 'Produits (Classe 7)', icon: DollarSign },
    { id: 'analyse', label: 'Analyse & Ratios', icon: Target },
    { id: 'comparaison', label: 'Comparaison N/N-1', icon: Activity },
    { id: 'export', label: 'Export & Impression', icon: Download },
  ];

  // Données synthèse
  const syntheseData = {
    chiffreAffaires: 2450000,
    chargesExploitation: 1890000,
    resultatExploitation: 560000,
    resultatFinancier: -25000,
    resultatNet: 535000,
    evolution: {
      ca: 15.3,
      charges: 12.1,
      resultat: 25.8
    }
  };

  return (
    <div className="p-6 bg-[#ECECEC] min-h-screen font-['Sometype Mono']">
      {/* Header avec navigation */}
      <div className="bg-white rounded-lg p-4 border border-[#E8E8E8] shadow-sm mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => navigate('/dashboard/manager')}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-[#444444]" />
              <span className="text-sm font-semibold text-[#444444]">Manager</span>
            </button>
            
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-[#B87333] to-[#A86323] flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#191919]">Compte de Résultat SYSCOHADA</h1>
                <p className="text-sm text-[#767676]">Analyse de la performance financière</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <select 
              value={periode}
              onChange={(e) => setPeriode(e.target.value)}
              className="px-3 py-2 border border-[#D9D9D9] rounded-lg text-sm focus:ring-2 focus:ring-[#B87333]/20"
            >
              <option value="current">Septembre 2025</option>
              <option value="quarter">Q3 2025</option>
              <option value="year">Année 2025</option>
              <option value="comparison">Comparaison N/N-1</option>
            </select>
            
            <button className="p-2 border border-[#D9D9D9] rounded-lg hover:bg-gray-50">
              <RefreshCw className="w-4 h-4 text-[#767676]" />
            </button>
            
            <button className="px-4 py-2 bg-[#B87333] text-white rounded-lg hover:bg-[#A86323] transition-colors">
              <Download className="w-4 h-4 inline mr-2" />
              Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* Navigation par onglets */}
      <div className="bg-white rounded-lg border border-[#E8E8E8] shadow-sm">
        <div className="px-6 border-b border-[#E8E8E8]">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center space-x-2 py-4 border-b-2 font-medium text-sm transition-colors
                    ${activeTab === tab.id 
                      ? 'border-[#B87333] text-[#B87333]' 
                      : 'border-transparent text-[#767676] hover:text-[#444444]'
                    }
                  `}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Contenu des onglets */}
        <div className="p-6">
          {activeTab === 'synthese' && (
            <div className="space-y-6">
              {/* KPIs compacts */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { 
                    title: 'Chiffre d\'Affaires', 
                    value: `${(syntheseData.chiffreAffaires / 1000000).toFixed(2)}M€`,
                    change: `+${syntheseData.evolution.ca}%`,
                    trend: 'up',
                    color: '#B87333',
                    icon: DollarSign 
                  },
                  { 
                    title: 'Charges d\'Exploitation', 
                    value: `${(syntheseData.chargesExploitation / 1000000).toFixed(2)}M€`,
                    change: `+${syntheseData.evolution.charges}%`,
                    trend: 'up',
                    color: '#6A8A82',
                    icon: TrendingUp 
                  },
                  { 
                    title: 'Résultat d\'Exploitation', 
                    value: `${(syntheseData.resultatExploitation / 1000).toFixed(0)}K€`,
                    change: `+${syntheseData.evolution.resultat}%`,
                    trend: 'up',
                    color: '#7A99AC',
                    icon: Target 
                  },
                  { 
                    title: 'Résultat Net', 
                    value: `${(syntheseData.resultatNet / 1000).toFixed(0)}K€`,
                    change: '+18.5%',
                    trend: 'up',
                    color: '#B87333',
                    icon: Activity 
                  }
                ].map((metric, index) => {
                  const IconComponent = metric.icon;
                  return (
                    <div key={index} className="bg-white rounded-lg p-4 border border-[#E8E8E8] hover:shadow-md transition-all">
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
                      <h3 className="text-xl font-bold text-[#191919] mb-1">{metric.value}</h3>
                      <p className="text-sm text-[#444444]">{metric.title}</p>
                    </div>
                  );
                })}
              </div>

              {/* Structure SYSCOHADA organisée */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
                  <h3 className="font-semibold text-[#191919] mb-4">📊 Produits (Classe 7)</h3>
                  <div className="space-y-2">
                    {[
                      { code: '70', label: 'Ventes de marchandises', value: '1,250,000€', percent: 51 },
                      { code: '72', label: 'Production vendue', value: '890,000€', percent: 36 },
                      { code: '75', label: 'Autres produits', value: '310,000€', percent: 13 }
                    ].map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                        <div className="flex items-center space-x-3">
                          <span className="w-8 text-xs font-mono text-[#767676]">{item.code}</span>
                          <span className="text-sm text-[#444444]">{item.label}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-[#191919]">{item.value}</span>
                          <div className="w-16 h-1 bg-gray-200 rounded-full mt-1">
                            <div 
                              className="h-1 bg-[#B87333] rounded-full"
                              style={{width: `${item.percent}%`}}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
                  <h3 className="font-semibold text-[#191919] mb-4">📉 Charges (Classe 6)</h3>
                  <div className="space-y-2">
                    {[
                      { code: '60', label: 'Achats consommés', value: '780,000€', percent: 41 },
                      { code: '61', label: 'Transport', value: '125,000€', percent: 7 },
                      { code: '62', label: 'Services extérieurs', value: '340,000€', percent: 18 },
                      { code: '63', label: 'Impôts et taxes', value: '89,000€', percent: 5 },
                      { code: '64', label: 'Charges de personnel', value: '556,000€', percent: 29 }
                    ].map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded hover:bg-gray-50">
                        <div className="flex items-center space-x-3">
                          <span className="w-8 text-xs font-mono text-[#767676]">{item.code}</span>
                          <span className="text-sm text-[#444444]">{item.label}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-[#191919]">{item.value}</span>
                          <div className="w-16 h-1 bg-gray-200 rounded-full mt-1">
                            <div 
                              className="h-1 bg-[#6A8A82] rounded-full"
                              style={{width: `${item.percent}%`}}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'charges' && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                <h3 className="text-lg font-semibold text-[#191919] mb-4">Analyse Détaillée des Charges</h3>
                
                {/* Charges par nature - Compact */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { 
                      category: 'Charges Variables', 
                      amount: 1240000, 
                      evolution: '+12%', 
                      color: '#6A8A82',
                      accounts: ['607 - Achats marchandises', '611 - Transport', '622 - Publicité']
                    },
                    { 
                      category: 'Charges Fixes', 
                      amount: 450000, 
                      evolution: '+3%', 
                      color: '#B87333',
                      accounts: ['631 - Impôts et taxes', '641 - Rémunérations', '651 - Redevances']
                    },
                    { 
                      category: 'Charges Exceptionnelles', 
                      amount: 200000, 
                      evolution: '-8%', 
                      color: '#7A99AC',
                      accounts: ['671 - Charges exceptionnelles', '681 - Dotations']
                    }
                  ].map((cat, index) => (
                    <div key={index} className="p-4 rounded-lg border border-[#E8E8E8] hover:shadow-md transition-all">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-[#191919]" style={{color: cat.color}}>{cat.category}</h4>
                        <span className="text-xs font-medium text-green-600">{cat.evolution}</span>
                      </div>
                      <p className="text-xl font-bold text-[#191919] mb-2">
                        {(cat.amount / 1000000).toFixed(2)}M€
                      </p>
                      <div className="space-y-1">
                        {cat.accounts.map((acc, i) => (
                          <p key={i} className="text-xs text-[#767676]">• {acc}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'produits' && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                <h3 className="text-lg font-semibold text-[#191919] mb-4">Analyse Détaillée des Produits</h3>
                
                {/* Produits par nature */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-[#B87333] mb-3">Répartition des Ventes</h4>
                    <div className="space-y-3">
                      {[
                        { label: 'Ventes locales', amount: '1,890K€', percent: 77, color: '#B87333' },
                        { label: 'Ventes export', amount: '450K€', percent: 18, color: '#6A8A82' },
                        { label: 'Prestations services', amount: '110K€', percent: 5, color: '#7A99AC' }
                      ].map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                          <span className="text-sm text-[#444444]">{item.label}</span>
                          <div className="flex items-center space-x-3">
                            <span className="text-sm font-bold text-[#191919]">{item.amount}</span>
                            <div className="w-12 h-2 bg-gray-200 rounded-full">
                              <div 
                                className="h-2 rounded-full"
                                style={{backgroundColor: item.color, width: `${item.percent}%`}}
                              ></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-[#B87333] mb-3">Évolution Mensuelle</h4>
                    <div className="h-40 bg-gradient-to-br from-[#B87333]/10 to-[#6A8A82]/10 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <BarChart3 className="w-10 h-10 text-[#B87333] mx-auto mb-2" />
                        <p className="text-sm font-medium text-[#444444]">Graphique Évolution CA</p>
                        <p className="text-xs text-[#767676]">Tendance: +15.3% vs N-1</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analyse' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Ratios de performance */}
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h3 className="font-semibold text-[#191919] mb-4">📈 Ratios de Performance</h3>
                  <div className="space-y-4">
                    {[
                      { label: 'Marge Brute', value: '38.5%', target: '40%', performance: 96 },
                      { label: 'Marge d\'Exploitation', value: '22.9%', target: '20%', performance: 115 },
                      { label: 'Marge Nette', value: '21.8%', target: '15%', performance: 145 },
                      { label: 'Productivité', value: '156K€/ETP', target: '120K€', performance: 130 }
                    ].map((ratio, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-[#444444]">{ratio.label}</span>
                          <div className="text-right">
                            <span className="font-bold text-[#191919]">{ratio.value}</span>
                            <span className="text-xs text-[#767676] ml-2">/ {ratio.target}</span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full bg-[#B87333] transition-all duration-500"
                            style={{width: `${Math.min(ratio.performance, 100)}%`}}
                          ></div>
                        </div>
                        <div className="text-xs text-right" style={{color: ratio.performance > 100 ? '#6A8A82' : '#B87333'}}>
                          {ratio.performance}% de l'objectif
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Analyse sectorielle */}
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h3 className="font-semibold text-[#191919] mb-4">🎯 Benchmarks Sectoriels</h3>
                  <div className="space-y-3">
                    {[
                      { indicator: 'Marge brute', wisebook: '38.5%', secteur: '32%', status: 'excellent' },
                      { indicator: 'Rotation stocks', wisebook: '6.8x', secteur: '5.2x', status: 'bon' },
                      { indicator: 'Productivité', wisebook: '156K€', secteur: '128K€', status: 'excellent' },
                      { indicator: 'Charges personnel', wisebook: '22.7%', secteur: '28%', status: 'optimal' }
                    ].map((bench, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                        <div>
                          <p className="text-sm font-medium text-[#191919]">{bench.indicator}</p>
                          <p className="text-xs text-[#767676]">vs secteur</p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-bold text-[#B87333]">{bench.wisebook}</span>
                            <span className="text-xs text-[#767676]">/ {bench.secteur}</span>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            bench.status === 'excellent' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {bench.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                <h3 className="font-semibold text-[#191919] mb-4">📄 Export & Impression</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { format: 'PDF Standard', desc: 'Format SYSCOHADA officiel', icon: FileText },
                    { format: 'Excel Détaillé', desc: 'Données avec formules', icon: Calculator },
                    { format: 'Rapport Exécutif', desc: 'Synthèse pour direction', icon: BarChart3 }
                  ].map((export_opt, index) => {
                    const IconComponent = export_opt.icon;
                    return (
                      <button key={index} className="p-4 border-2 border-dashed border-[#B87333]/30 rounded-lg hover:border-[#B87333] hover:bg-[#B87333]/5 transition-all group">
                        <div className="text-center">
                          <IconComponent className="w-8 h-8 text-[#B87333] mx-auto mb-2" />
                          <h4 className="font-medium text-[#191919] text-sm mb-1">{export_opt.format}</h4>
                          <p className="text-xs text-[#767676]">{export_opt.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompteResultatPageV2;