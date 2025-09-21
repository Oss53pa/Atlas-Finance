import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  Target, BarChart3, TrendingUp, DollarSign, Calendar, ArrowLeft,
  Home, Plus, Download, RefreshCw, CheckCircle, AlertTriangle,
  Eye, Edit, PieChart, Activity, Users, Building2, Search,
  ChevronDown, ChevronRight, Save, Upload, FileDown,
  TrendingDown, Clock, Bell, Calculator, Filter
} from 'lucide-react';

const CompleteBudgetingModule: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('synthese');

  // Détection automatique de l'onglet selon l'URL
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['synthese', 'budgets', 'suivi', 'previsions', 'alertes', 'rapports'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // États pour la saisie budgétaire
  const [selectedDepartment, setSelectedDepartment] = useState('COMMERCIAL');
  const [selectedYear, setSelectedYear] = useState('2025');
  const [selectedMonth, setSelectedMonth] = useState('JANVIER');
  const [expandedAccounts, setExpandedAccounts] = useState<Record<string, boolean>>({});
  const [budgetData, setBudgetData] = useState<Record<string, any>>({});

  // Onglets budget
  const tabs = [
    { id: 'synthese', label: 'Synthèse', icon: BarChart3 },
    { id: 'budgets', label: 'Budgets', icon: Target },
    { id: 'suivi', label: 'Suivi Réel/Budget', icon: TrendingUp },
    { id: 'previsions', label: 'Prévisions', icon: DollarSign },
    { id: 'alertes', label: 'Alertes', icon: AlertTriangle },
    { id: 'rapports', label: 'Rapports', icon: PieChart },
  ];

  // Données mock pour les comptes comptables
  const comptes = [
    {
      code: '601000',
      libelle: 'Achats de marchandises',
      sousComptes: [
        { code: '601100', libelle: 'Achats France', budget: 301000, reel: 285000, nMoins1: 295000 },
        { code: '601200', libelle: 'Achats UE', budget: 173000, reel: 168000, nMoins1: 165000 },
        { code: '601300', libelle: 'Achats Hors UE', budget: 120000, reel: 95000, nMoins1: 110000 }
      ],
      budget: 594000,
      reel: 548000,
      nMoins1: 570000
    },
    {
      code: '602000',
      libelle: 'Services extérieurs',
      sousComptes: [
        { code: '602100', libelle: 'Loyers', budget: 180000, reel: 180000, nMoins1: 175000 },
        { code: '602600', libelle: 'Honoraires', budget: 95000, reel: 87000, nMoins1: 92000 }
      ],
      budget: 275000,
      reel: 267000,
      nMoins1: 267000
    },
    {
      code: '606000',
      libelle: 'Autres charges externes',
      sousComptes: [
        { code: '606100', libelle: 'Carburants', budget: 45000, reel: 42000, nMoins1: 39000 },
        { code: '606200', libelle: 'Télécommunications', budget: 25000, reel: 23000, nMoins1: 24000 }
      ],
      budget: 70000,
      reel: 65000,
      nMoins1: 63000
    }
  ];

  // Données pour les alertes
  const alertes = [
    {
      id: 1,
      type: 'DEPASSEMENT',
      compte: '601200',
      libelle: 'Achats UE - Dépassement prévu',
      departement: 'COMMERCIAL',
      ecart: 15.2,
      niveau: 'CRITIQUE',
      date: '2025-01-15'
    },
    {
      id: 2,
      type: 'SOUS_CONSOMMATION',
      compte: '601300',
      libelle: 'Achats Hors UE - Sous-consommation',
      departement: 'COMMERCIAL',
      ecart: -20.8,
      niveau: 'INFO',
      date: '2025-01-14'
    },
    {
      id: 3,
      type: 'TENDANCE',
      compte: '606100',
      libelle: 'Carburants - Tendance haussière',
      departement: 'LOGISTIQUE',
      ecart: 8.5,
      niveau: 'ATTENTION',
      date: '2025-01-13'
    }
  ];

  // Départements disponibles
  const departements = ['COMMERCIAL', 'PRODUCTION', 'ADMINISTRATION', 'R&D', 'LOGISTIQUE'];

  // Mois de l'année
  const mois = ['JANVIER', 'FEVRIER', 'MARS', 'AVRIL', 'MAI', 'JUIN',
                'JUILLET', 'AOUT', 'SEPTEMBRE', 'OCTOBRE', 'NOVEMBRE', 'DECEMBRE'];

  // Fonctions utilitaires
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getVarianceColor = (variance: number) => {
    if (Math.abs(variance) <= 5) return 'text-green-600';
    if (Math.abs(variance) <= 10) return 'text-orange-600';
    return 'text-red-600';
  };

  const toggleAccountExpansion = (accountCode: string) => {
    setExpandedAccounts(prev => ({
      ...prev,
      [accountCode]: !prev[accountCode]
    }));
  };

  return (
    <div className="p-6 bg-[#ECECEC] min-h-screen font-['Sometype Mono']">
      {/* Header */}
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
                <Target className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#191919]">Contrôle Budgétaire</h1>
                <p className="text-sm text-[#767676]">Gestion des budgets et prévisions</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button 
              onClick={() => navigate('/executive')}
              className="px-4 py-2 bg-[#B87333] text-white rounded-lg hover:bg-[#A86323] transition-colors flex items-center space-x-2"
            >
              <Home className="w-4 h-4" />
              <span className="text-sm">Executive</span>
            </button>
            
            <button className="px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#5A7A72] transition-colors flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span className="text-sm">Nouveau budget</span>
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
                  onClick={() => {
                    setActiveTab(tab.id);
                    navigate(`/budgeting/budgets?tab=${tab.id}`);
                  }}
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

        {/* Contenu organisé */}
        <div className="p-6">
          {/* Onglet Synthèse */}
          {activeTab === 'synthese' && (
            <div className="space-y-6">
              {/* KPIs Budget */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { title: 'Budget Total 2025', value: '3.2M€', color: '#B87333', icon: Target },
                  { title: 'Consommé', value: '2.1M€', color: '#6A8A82', icon: TrendingUp },
                  { title: 'Restant', value: '1.1M€', color: '#7A99AC', icon: DollarSign },
                  { title: 'Performance', value: '94%', color: '#6A8A82', icon: Activity }
                ].map((kpi, index) => {
                  const IconComponent = kpi.icon;
                  return (
                    <div key={index} className="bg-white rounded-lg p-4 border border-[#E8E8E8]">
                      <div className="flex items-center justify-between mb-2">
                        <IconComponent className="w-5 h-5" style={{color: kpi.color}} />
                      </div>
                      <h3 className="text-xl font-bold text-[#191919] mb-1">{kpi.value}</h3>
                      <p className="text-sm text-[#444444]">{kpi.title}</p>
                    </div>
                  );
                })}
              </div>

              {/* Budgets par département */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h3 className="font-semibold text-[#191919] mb-4">📊 Budgets par Département</h3>
                  <div className="space-y-3">
                    {[
                      { dept: 'Commercial', budget: 800000, consomme: 645000, pourcentage: 81 },
                      { dept: 'Production', budget: 950000, consomme: 892000, pourcentage: 94 },
                      { dept: 'Administration', budget: 450000, consomme: 267000, pourcentage: 59 },
                      { dept: 'R&D', budget: 320000, consomme: 298000, pourcentage: 93 }
                    ].map((dept, index) => (
                      <div key={index} className="p-3 rounded-lg bg-gray-50">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-[#191919]">{dept.dept}</span>
                          <span className="text-sm text-[#767676]">{dept.pourcentage}%</span>
                        </div>
                        <div className="flex justify-between text-xs mb-2">
                          <span className="text-[#444444]">Consommé: {(dept.consomme / 1000).toFixed(0)}K€</span>
                          <span className="text-[#444444]">Budget: {(dept.budget / 1000).toFixed(0)}K€</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              dept.pourcentage > 90 ? 'bg-red-500' :
                              dept.pourcentage > 75 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{width: `${dept.pourcentage}%`}}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h3 className="font-semibold text-[#191919] mb-4">🎯 Alertes Budgétaires</h3>
                  <div className="space-y-2">
                    {[
                      { alerte: 'Production proche du seuil', dept: 'Production', niveau: 'attention' },
                      { alerte: 'R&D dépassement prévu', dept: 'R&D', niveau: 'critique' },
                      { alerte: 'Commercial sous-consommé', dept: 'Commercial', niveau: 'info' }
                    ].map((alerte, index) => (
                      <div key={index} className={`p-3 rounded-lg border-l-4 ${
                        alerte.niveau === 'critique' ? 'bg-red-50 border-red-400' :
                        alerte.niveau === 'attention' ? 'bg-yellow-50 border-yellow-400' :
                        'bg-blue-50 border-blue-400'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-[#191919]">{alerte.alerte}</p>
                            <p className="text-xs text-[#767676]">{alerte.dept}</p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            alerte.niveau === 'critique' ? 'bg-red-100 text-red-700' :
                            alerte.niveau === 'attention' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {alerte.niveau}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Onglet Budgets - Saisie Matricielle Détaillée */}
          {activeTab === 'budgets' && (
            <div className="space-y-6">
              {/* Filtres de saisie */}
              <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-[#191919]">📊 Saisie Budgétaire Détaillée</h3>
                  <div className="flex items-center space-x-3">
                    <button className="flex items-center space-x-2 px-3 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#5A7A72] transition-colors">
                      <Upload className="w-4 h-4" />
                      <span className="text-sm">Importer Excel</span>
                    </button>
                    <button className="flex items-center space-x-2 px-3 py-2 bg-[#B87333] text-white rounded-lg hover:bg-[#A86323] transition-colors">
                      <Save className="w-4 h-4" />
                      <span className="text-sm">Enregistrer</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#444444] mb-2">Département</label>
                    <select
                      value={selectedDepartment}
                      onChange={(e) => setSelectedDepartment(e.target.value)}
                      className="w-full border border-[#E8E8E8] rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#B87333] focus:border-transparent"
                    >
                      {departements.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#444444] mb-2">Année</label>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="w-full border border-[#E8E8E8] rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#B87333] focus:border-transparent"
                    >
                      <option value="2024">2024</option>
                      <option value="2025">2025</option>
                      <option value="2026">2026</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#444444] mb-2">Mois</label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="w-full border border-[#E8E8E8] rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#B87333] focus:border-transparent"
                    >
                      {mois.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#444444] mb-2">Actions</label>
                    <button className="w-full flex items-center justify-center space-x-2 px-3 py-2 border border-[#E8E8E8] rounded-lg hover:bg-gray-50 transition-colors">
                      <Calculator className="w-4 h-4" />
                      <span className="text-sm">Calculer</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Grille de saisie matricielle */}
              <div className="bg-white rounded-lg border border-[#E8E8E8] overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-[#E8E8E8]">
                  <h4 className="font-medium text-[#191919]">
                    Saisie {selectedDepartment} - {selectedMonth} {selectedYear}
                  </h4>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#444444] uppercase tracking-wider w-20"></th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#444444] uppercase tracking-wider">Compte</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#444444] uppercase tracking-wider">Libellé</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-[#444444] uppercase tracking-wider">Budget</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-[#444444] uppercase tracking-wider">Réel</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-[#444444] uppercase tracking-wider">N-1</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-[#444444] uppercase tracking-wider">Var %</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-[#444444] uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {comptes.map((compte) => (
                        <React.Fragment key={compte.code}>
                          {/* Ligne principale du compte */}
                          <tr className="bg-blue-50">
                            <td className="px-4 py-3">
                              <button
                                onClick={() => toggleAccountExpansion(compte.code)}
                                className="flex items-center justify-center w-6 h-6 rounded hover:bg-blue-100 transition-colors"
                              >
                                {expandedAccounts[compte.code] ?
                                  <ChevronDown className="w-4 h-4 text-blue-600" /> :
                                  <ChevronRight className="w-4 h-4 text-blue-600" />
                                }
                              </button>
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-blue-900">{compte.code}</td>
                            <td className="px-4 py-3 text-sm font-medium text-blue-900">{compte.libelle}</td>
                            <td className="px-4 py-3 text-sm text-right font-medium text-blue-900">
                              {formatCurrency(compte.budget)}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-[#444444]">
                              {formatCurrency(compte.reel)}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-[#767676]">
                              {formatCurrency(compte.nMoins1)}
                            </td>
                            <td className={`px-4 py-3 text-sm text-right font-medium ${getVarianceColor(((compte.reel / compte.budget) - 1) * 100)}`}>
                              {(((compte.reel / compte.budget) - 1) * 100).toFixed(1)}%
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button className="text-blue-600 hover:text-blue-800 transition-colors">
                                <Eye className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>

                          {/* Sous-comptes (expandable) */}
                          {expandedAccounts[compte.code] && compte.sousComptes.map((sousCompte) => (
                            <tr key={sousCompte.code} className="bg-gray-50">
                              <td className="px-4 py-2"></td>
                              <td className="px-4 py-2 pl-8 text-sm text-[#444444]">{sousCompte.code}</td>
                              <td className="px-4 py-2 text-sm text-[#444444]">{sousCompte.libelle}</td>
                              <td className="px-4 py-2 text-sm text-right">
                                <input
                                  type="number"
                                  defaultValue={sousCompte.budget}
                                  className="w-20 px-2 py-1 text-right border border-gray-300 rounded focus:ring-1 focus:ring-[#B87333] focus:border-transparent text-xs"
                                />
                              </td>
                              <td className="px-4 py-2 text-sm text-right text-[#444444]">
                                {formatCurrency(sousCompte.reel)}
                              </td>
                              <td className="px-4 py-2 text-sm text-right text-[#767676]">
                                {formatCurrency(sousCompte.nMoins1)}
                              </td>
                              <td className={`px-4 py-2 text-sm text-right ${getVarianceColor(((sousCompte.reel / sousCompte.budget) - 1) * 100)}`}>
                                {(((sousCompte.reel / sousCompte.budget) - 1) * 100).toFixed(1)}%
                              </td>
                              <td className="px-4 py-2 text-center">
                                <button className="text-gray-400 hover:text-[#B87333] transition-colors">
                                  <Edit className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totaux */}
                <div className="p-4 bg-gray-50 border-t border-[#E8E8E8]">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-[#444444]">Total {selectedDepartment}:</span>
                    <div className="flex space-x-6 text-sm font-medium">
                      <span className="text-blue-900">
                        Budget: {formatCurrency(comptes.reduce((sum, c) => sum + c.budget, 0))}
                      </span>
                      <span className="text-[#444444]">
                        Réel: {formatCurrency(comptes.reduce((sum, c) => sum + c.reel, 0))}
                      </span>
                      <span className="text-[#767676]">
                        N-1: {formatCurrency(comptes.reduce((sum, c) => sum + c.nMoins1, 0))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Onglet Suivi Réel/Budget - Comparaisons Détaillées */}
          {activeTab === 'suivi' && (
            <div className="space-y-6">
              {/* Dashboard comparatif principal */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Vue d'ensemble YTD */}
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h3 className="font-semibold text-[#191919] mb-4">📊 Performance YTD</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#444444]">Budget YTD</span>
                      <span className="font-medium text-blue-900">2,850K€</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#444444]">Réel YTD</span>
                      <span className="font-medium text-[#444444]">2,680K€</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#444444]">Écart</span>
                      <span className="font-medium text-green-600">-170K€ (-6.0%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 mt-4">
                      <div className="bg-[#6A8A82] h-3 rounded-full" style={{width: '94%'}}></div>
                    </div>
                    <p className="text-xs text-center text-[#767676]">94% de réalisation</p>
                  </div>
                </div>

                {/* Comparaison N-1 */}
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h3 className="font-semibold text-[#191919] mb-4">📈 Comparaison N-1</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#444444]">Réel 2024</span>
                      <span className="font-medium text-[#767676]">2,550K€</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#444444]">Réel 2025</span>
                      <span className="font-medium text-[#444444]">2,680K€</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[#444444]">Croissance</span>
                      <span className="font-medium text-[#6A8A82]">+130K€ (+5.1%)</span>
                    </div>
                    <div className="bg-gradient-to-r from-[#767676] to-[#6A8A82] h-3 rounded-full mt-4"></div>
                    <p className="text-xs text-center text-[#767676]">Tendance positive</p>
                  </div>
                </div>

                {/* Alertes actives */}
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h3 className="font-semibold text-[#191919] mb-4">🚨 Alertes Actives</h3>
                  <div className="space-y-3">
                    {alertes.slice(0, 3).map((alerte) => (
                      <div key={alerte.id} className={`p-3 rounded-lg border-l-4 ${
                        alerte.niveau === 'CRITIQUE' ? 'bg-red-50 border-red-400' :
                        alerte.niveau === 'ATTENTION' ? 'bg-yellow-50 border-yellow-400' :
                        'bg-blue-50 border-blue-400'
                      }`}>
                        <p className="text-xs font-medium">{alerte.compte}</p>
                        <p className="text-xs text-[#767676]">{alerte.ecart > 0 ? '+' : ''}{alerte.ecart}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Graphique comparatif mensuel */}
              <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-[#191919]">📊 Évolution Mensuelle - Budget vs Réel</h3>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-xs text-[#444444]">Budget</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-[#6A8A82] rounded-full"></div>
                      <span className="text-xs text-[#444444]">Réel</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-[#767676] rounded-full"></div>
                      <span className="text-xs text-[#444444]">N-1</span>
                    </div>
                  </div>
                </div>

                {/* Simulation graphique simple avec CSS */}
                <div className="h-64 border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="h-full flex items-end justify-between space-x-2">
                    {['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep'].map((mois, index) => {
                      const budgetHeight = Math.random() * 60 + 20;
                      const reelHeight = budgetHeight * (0.85 + Math.random() * 0.3);
                      const n1Height = budgetHeight * (0.8 + Math.random() * 0.4);

                      return (
                        <div key={mois} className="flex-1 flex flex-col items-center space-y-1">
                          <div className="flex items-end justify-center space-x-1 w-full h-48">
                            <div
                              className="w-2 bg-blue-500 rounded-t"
                              style={{height: `${budgetHeight}%`}}
                              title={`Budget ${mois}`}
                            ></div>
                            <div
                              className="w-2 bg-[#6A8A82] rounded-t"
                              style={{height: `${reelHeight}%`}}
                              title={`Réel ${mois}`}
                            ></div>
                            <div
                              className="w-2 bg-[#767676] rounded-t"
                              style={{height: `${n1Height}%`}}
                              title={`N-1 ${mois}`}
                            ></div>
                          </div>
                          <span className="text-xs text-[#767676] transform -rotate-45">{mois}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Analyse détaillée par compte */}
              <div className="bg-white rounded-lg border border-[#E8E8E8] overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-[#E8E8E8]">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-[#191919]">📋 Analyse Détaillée par Compte</h4>
                    <div className="flex items-center space-x-2">
                      <button className="flex items-center space-x-1 px-3 py-1 text-xs border border-[#E8E8E8] rounded-lg hover:bg-gray-100 transition-colors">
                        <Filter className="w-3 h-3" />
                        <span>Filtrer</span>
                      </button>
                      <button className="flex items-center space-x-1 px-3 py-1 text-xs bg-[#6A8A82] text-white rounded-lg hover:bg-[#5A7A72] transition-colors">
                        <FileDown className="w-3 h-3" />
                        <span>Export</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#444444] uppercase tracking-wider">Compte</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#444444] uppercase tracking-wider">Libellé</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-[#444444] uppercase tracking-wider">Budget</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-[#444444] uppercase tracking-wider">Réel</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-[#444444] uppercase tracking-wider">Écart €</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-[#444444] uppercase tracking-wider">Écart %</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-[#444444] uppercase tracking-wider">N-1</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-[#444444] uppercase tracking-wider">Evol N-1</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-[#444444] uppercase tracking-wider">Tendance</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {comptes.map((compte) => {
                        const ecartEur = compte.reel - compte.budget;
                        const ecartPct = ((compte.reel / compte.budget) - 1) * 100;
                        const evolN1 = ((compte.reel / compte.nMoins1) - 1) * 100;

                        return (
                          <tr key={compte.code} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-blue-900">{compte.code}</td>
                            <td className="px-4 py-3 text-sm text-[#444444]">{compte.libelle}</td>
                            <td className="px-4 py-3 text-sm text-right text-blue-900">
                              {formatCurrency(compte.budget)}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-[#444444]">
                              {formatCurrency(compte.reel)}
                            </td>
                            <td className={`px-4 py-3 text-sm text-right font-medium ${ecartEur >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {ecartEur >= 0 ? '+' : ''}{formatCurrency(ecartEur)}
                            </td>
                            <td className={`px-4 py-3 text-sm text-right font-medium ${getVarianceColor(ecartPct)}`}>
                              {ecartPct >= 0 ? '+' : ''}{ecartPct.toFixed(1)}%
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-[#767676]">
                              {formatCurrency(compte.nMoins1)}
                            </td>
                            <td className={`px-4 py-3 text-sm text-right font-medium ${evolN1 >= 0 ? 'text-[#6A8A82]' : 'text-red-600'}`}>
                              {evolN1 >= 0 ? '+' : ''}{evolN1.toFixed(1)}%
                            </td>
                            <td className="px-4 py-3 text-center">
                              {Math.abs(ecartPct) <= 5 ? (
                                <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                              ) : Math.abs(ecartPct) <= 10 ? (
                                <Clock className="w-4 h-4 text-yellow-500 mx-auto" />
                              ) : (
                                <AlertTriangle className="w-4 h-4 text-red-500 mx-auto" />
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Résumé par département */}
                <div className="p-4 bg-gray-50 border-t border-[#E8E8E8]">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-xs text-[#767676]">Total Budget</p>
                      <p className="font-medium text-blue-900">
                        {formatCurrency(comptes.reduce((sum, c) => sum + c.budget, 0))}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-[#767676]">Total Réel</p>
                      <p className="font-medium text-[#444444]">
                        {formatCurrency(comptes.reduce((sum, c) => sum + c.reel, 0))}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-[#767676]">Écart Total</p>
                      <p className={`font-medium ${
                        comptes.reduce((sum, c) => sum + c.reel, 0) < comptes.reduce((sum, c) => sum + c.budget, 0)
                        ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(comptes.reduce((sum, c) => sum + c.reel, 0) - comptes.reduce((sum, c) => sum + c.budget, 0))}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-[#767676]">Taux Réalisation</p>
                      <p className="font-medium text-[#6A8A82]">
                        {((comptes.reduce((sum, c) => sum + c.reel, 0) / comptes.reduce((sum, c) => sum + c.budget, 0)) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Onglet Prévisions - Système Intelligent */}
          {activeTab === 'previsions' && (
            <div className="space-y-6">
              {/* Assistant de prévision intelligent */}
              <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-[#191919]">🤖 Assistant de Prévision Intelligent</h3>
                  <div className="flex items-center space-x-3">
                    <button className="flex items-center space-x-2 px-3 py-2 bg-[#B87333] text-white rounded-lg hover:bg-[#A86323] transition-colors">
                      <Calculator className="w-4 h-4" />
                      <span className="text-sm">Recalculer</span>
                    </button>
                    <button className="flex items-center space-x-2 px-3 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#5A7A72] transition-colors">
                      <Save className="w-4 h-4" />
                      <span className="text-sm">Sauvegarder</span>
                    </button>
                  </div>
                </div>

                {/* Paramètres de prévision */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-[#444444] mb-2">Méthode de calcul</label>
                    <select className="w-full border border-[#E8E8E8] rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#B87333] focus:border-transparent">
                      <option value="historique">Historique + Inflation</option>
                      <option value="contrat">Basé sur contrats</option>
                      <option value="ml">Machine Learning</option>
                      <option value="mixte">Méthode mixte</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#444444] mb-2">Inflation prévue</label>
                    <div className="relative">
                      <input
                        type="number"
                        defaultValue="2.5"
                        step="0.1"
                        className="w-full border border-[#E8E8E8] rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-[#B87333] focus:border-transparent"
                      />
                      <span className="absolute right-3 top-2 text-sm text-[#767676]">%</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#444444] mb-2">Croissance activité</label>
                    <div className="relative">
                      <input
                        type="number"
                        defaultValue="5.0"
                        step="0.1"
                        className="w-full border border-[#E8E8E8] rounded-lg px-3 py-2 pr-8 focus:ring-2 focus:ring-[#B87333] focus:border-transparent"
                      />
                      <span className="absolute right-3 top-2 text-sm text-[#767676]">%</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#444444] mb-2">Saisonnalité</label>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        defaultChecked
                        className="mr-2 rounded focus:ring-[#B87333]"
                      />
                      <span className="text-sm text-[#444444]">Appliquer profil historique</span>
                    </div>
                  </div>
                </div>

                {/* Simulation graphique des scénarios */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-[#191919] mb-4">📊 Simulation des Scénarios</h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 bg-white rounded-lg border">
                      <p className="text-xs text-[#767676]">Scénario Optimiste</p>
                      <p className="text-lg font-bold text-[#6A8A82]">3.8M€</p>
                      <p className="text-xs text-[#6A8A82]">+18.5%</p>
                    </div>
                    <div className="text-center p-3 bg-[#B87333] text-white rounded-lg border">
                      <p className="text-xs opacity-90">Scénario Réaliste</p>
                      <p className="text-lg font-bold">3.2M€</p>
                      <p className="text-xs opacity-90">Base</p>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg border">
                      <p className="text-xs text-[#767676]">Scénario Pessimiste</p>
                      <p className="text-lg font-bold text-red-600">2.7M€</p>
                      <p className="text-xs text-red-600">-15.6%</p>
                    </div>
                  </div>

                  {/* Graphique de projection */}
                  <div className="h-48 border border-gray-200 rounded-lg p-4 bg-white">
                    <div className="h-full flex items-end justify-between space-x-1">
                      {['Q1', 'Q2', 'Q3', 'Q4'].map((trimestre, index) => {
                        const optimiste = 70 + index * 10 + Math.random() * 15;
                        const realiste = 60 + index * 8 + Math.random() * 10;
                        const pessimiste = 50 + index * 6 + Math.random() * 8;

                        return (
                          <div key={trimestre} className="flex-1 flex flex-col items-center space-y-2">
                            <div className="flex items-end justify-center space-x-1 w-full h-36">
                              <div
                                className="w-3 bg-[#6A8A82] rounded-t opacity-50"
                                style={{height: `${optimiste}%`}}
                                title={`Optimiste ${trimestre}`}
                              ></div>
                              <div
                                className="w-3 bg-[#B87333] rounded-t"
                                style={{height: `${realiste}%`}}
                                title={`Réaliste ${trimestre}`}
                              ></div>
                              <div
                                className="w-3 bg-red-500 rounded-t opacity-70"
                                style={{height: `${pessimiste}%`}}
                                title={`Pessimiste ${trimestre}`}
                              ></div>
                            </div>
                            <span className="text-xs text-[#767676]">{trimestre}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Prévisions détaillées par compte */}
              <div className="bg-white rounded-lg border border-[#E8E8E8] overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-[#E8E8E8]">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-[#191919]">🔮 Prévisions Détaillées par Compte</h4>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-[#767676]">Confiance moyenne:</span>
                      <span className="text-xs font-medium text-[#6A8A82]">84%</span>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#444444] uppercase tracking-wider">Compte</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#444444] uppercase tracking-wider">Libellé</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-[#444444] uppercase tracking-wider">Base N-1</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-[#444444] uppercase tracking-wider">Ajustements</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-[#444444] uppercase tracking-wider">Prévision 2025</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-[#444444] uppercase tracking-wider">Confiance</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-[#444444] uppercase tracking-wider">Méthode</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {comptes.map((compte) => {
                        const base = compte.nMoins1;
                        const ajustement = base * 0.075; // 7.5% d'ajustement moyen
                        const prevision = base + ajustement;
                        const confiance = 75 + Math.random() * 20; // Entre 75% et 95%

                        return (
                          <tr key={compte.code} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-blue-900">{compte.code}</td>
                            <td className="px-4 py-3 text-sm text-[#444444]">{compte.libelle}</td>
                            <td className="px-4 py-3 text-sm text-right text-[#767676]">
                              {formatCurrency(base)}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-[#6A8A82]">
                              +{formatCurrency(ajustement)}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-medium text-[#191919]">
                              {formatCurrency(prevision)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center space-x-2">
                                <div className="w-16 bg-gray-200 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full ${
                                      confiance > 85 ? 'bg-[#6A8A82]' :
                                      confiance > 70 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                    style={{width: `${confiance}%`}}
                                  ></div>
                                </div>
                                <span className="text-xs text-[#444444]">{confiance.toFixed(0)}%</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                                Historique
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Résumé des prévisions */}
                <div className="p-4 bg-gray-50 border-t border-[#E8E8E8]">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-xs text-[#767676]">Total Prévu 2025</p>
                      <p className="font-medium text-[#191919]">
                        {formatCurrency(comptes.reduce((sum, c) => sum + c.nMoins1 * 1.075, 0))}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-[#767676]">Croissance vs N-1</p>
                      <p className="font-medium text-[#6A8A82]">+7.5%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-[#767676]">Confiance Moyenne</p>
                      <p className="font-medium text-[#6A8A82]">84%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-[#767676]">Dernière MAJ</p>
                      <p className="font-medium text-[#444444]">Aujourd'hui</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Analyse de sensibilité */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h4 className="font-medium text-[#191919] mb-4">🎯 Analyse de Sensibilité</h4>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-[#444444]">Inflation +1%</span>
                        <span className="text-sm font-medium text-red-600">+45K€</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-red-500 h-2 rounded-full" style={{width: '15%'}}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-[#444444]">Volume +10%</span>
                        <span className="text-sm font-medium text-[#6A8A82]">+285K€</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-[#6A8A82] h-2 rounded-full" style={{width: '90%'}}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-[#444444]">Taux de change +5%</span>
                        <span className="text-sm font-medium text-yellow-600">+28K€</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-yellow-500 h-2 rounded-full" style={{width: '10%'}}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-[#444444]">Efficacité +3%</span>
                        <span className="text-sm font-medium text-[#6A8A82]">-95K€</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-[#6A8A82] h-2 rounded-full" style={{width: '30%'}}></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h4 className="font-medium text-[#191919] mb-4">⚠️ Risques Identifiés</h4>

                  <div className="space-y-3">
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-red-900">Hausse matières premières</p>
                          <p className="text-xs text-red-700">Impact potentiel: +8% sur achats</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <Clock className="w-4 h-4 text-yellow-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-yellow-900">Négociation contrats</p>
                          <p className="text-xs text-yellow-700">Renouvellement Q2 - économie possible</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <TrendingUp className="w-4 h-4 text-blue-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-blue-900">Opportunité digitalisation</p>
                          <p className="text-xs text-blue-700">Réduction 5% coûts administratifs</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Onglet Alertes - Système de Notifications */}
          {activeTab === 'alertes' && (
            <div className="space-y-6">
              {/* Configuration des alertes */}
              <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-[#191919]">🔔 Configuration des Alertes</h3>
                  <div className="flex items-center space-x-3">
                    <button className="flex items-center space-x-2 px-3 py-2 border border-[#E8E8E8] rounded-lg hover:bg-gray-50 transition-colors">
                      <Plus className="w-4 h-4" />
                      <span className="text-sm">Nouvelle règle</span>
                    </button>
                    <button className="flex items-center space-x-2 px-3 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#5A7A72] transition-colors">
                      <Save className="w-4 h-4" />
                      <span className="text-sm">Sauvegarder</span>
                    </button>
                  </div>
                </div>

                {/* Règles d'alerte */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-4 border border-[#E8E8E8] rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-[#191919]">Niveau 1 - Information</h4>
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[#767676]">Seuil d'écart:</span>
                        <span className="font-medium">±5%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#767676]">Notification:</span>
                        <span className="font-medium">Dashboard</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#767676]">Fréquence:</span>
                        <span className="font-medium">Temps réel</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border border-[#E8E8E8] rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-[#191919]">Niveau 2 - Attention</h4>
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[#767676]">Seuil d'écart:</span>
                        <span className="font-medium">±10%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#767676]">Notification:</span>
                        <span className="font-medium">Email + Dashboard</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#767676]">Fréquence:</span>
                        <span className="font-medium">Quotidien</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border border-[#E8E8E8] rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-[#191919]">Niveau 3 - Critique</h4>
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[#767676]">Seuil d'écart:</span>
                        <span className="font-medium">±15%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#767676]">Notification:</span>
                        <span className="font-medium">Email + SMS + Dashboard</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#767676]">Fréquence:</span>
                        <span className="font-medium">Immédiat</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Alertes actives */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg border border-[#E8E8E8] overflow-hidden">
                  <div className="p-4 bg-gray-50 border-b border-[#E8E8E8]">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-[#191919]">🚨 Alertes Actives ({alertes.length})</h4>
                      <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">
                        {alertes.filter(a => a.niveau === 'CRITIQUE').length} Critiques
                      </span>
                    </div>
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    <div className="divide-y divide-gray-200">
                      {alertes.map((alerte) => (
                        <div key={alerte.id} className="p-4 hover:bg-gray-50">
                          <div className="flex items-start space-x-3">
                            <div className={`mt-1 w-2 h-2 rounded-full ${
                              alerte.niveau === 'CRITIQUE' ? 'bg-red-500' :
                              alerte.niveau === 'ATTENTION' ? 'bg-yellow-500' : 'bg-blue-500'
                            }`}></div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-[#191919] truncate">
                                  {alerte.libelle}
                                </p>
                                <span className={`text-xs font-medium ${
                                  alerte.ecart > 0 ? 'text-red-600' : 'text-green-600'
                                }`}>
                                  {alerte.ecart > 0 ? '+' : ''}{alerte.ecart}%
                                </span>
                              </div>
                              <div className="mt-1 flex items-center justify-between">
                                <p className="text-xs text-[#767676]">
                                  {alerte.compte} • {alerte.departement}
                                </p>
                                <p className="text-xs text-[#767676]">{alerte.date}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-1">
                              <button className="p-1 text-[#767676] hover:text-[#B87333] transition-colors">
                                <Eye className="w-4 h-4" />
                              </button>
                              <button className="p-1 text-[#767676] hover:text-red-600 transition-colors">
                                <AlertTriangle className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Statistiques d'alertes */}
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h4 className="font-medium text-[#191919] mb-4">📊 Statistiques des Alertes</h4>

                  <div className="space-y-4">
                    {/* Par niveau */}
                    <div>
                      <h5 className="text-sm font-medium text-[#444444] mb-3">Répartition par niveau</h5>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                            <span className="text-sm text-[#444444]">Critiques</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div className="bg-red-500 h-2 rounded-full" style={{width: '33%'}}></div>
                            </div>
                            <span className="text-sm font-medium w-6 text-right">1</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                            <span className="text-sm text-[#444444]">Attention</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div className="bg-yellow-500 h-2 rounded-full" style={{width: '33%'}}></div>
                            </div>
                            <span className="text-sm font-medium w-6 text-right">1</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <span className="text-sm text-[#444444]">Information</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div className="bg-blue-500 h-2 rounded-full" style={{width: '33%'}}></div>
                            </div>
                            <span className="text-sm font-medium w-6 text-right">1</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Par département */}
                    <div>
                      <h5 className="text-sm font-medium text-[#444444] mb-3">Par département</h5>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-[#444444]">COMMERCIAL</span>
                          <span className="text-sm font-medium">2</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-[#444444]">LOGISTIQUE</span>
                          <span className="text-sm font-medium">1</span>
                        </div>
                      </div>
                    </div>

                    {/* Évolution */}
                    <div>
                      <h5 className="text-sm font-medium text-[#444444] mb-3">Évolution 7 derniers jours</h5>
                      <div className="h-16 flex items-end justify-between space-x-1">
                        {[2, 1, 3, 1, 0, 2, 3].map((count, index) => (
                          <div key={index} className="flex-1 flex flex-col items-center">
                            <div
                              className="w-full bg-[#6A8A82] rounded-t"
                              style={{height: `${(count / 3) * 100}%`, minHeight: count > 0 ? '8px' : '2px'}}
                            ></div>
                            <span className="text-xs text-[#767676] mt-1">
                              {['L', 'M', 'M', 'J', 'V', 'S', 'D'][index]}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions recommandées */}
              <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                <h4 className="font-medium text-[#191919] mb-4">💡 Actions Recommandées</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 border border-[#E8E8E8] rounded-lg">
                    <div className="flex items-start space-x-3">
                      <div className="mt-1 p-2 bg-red-100 rounded-lg">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <h5 className="text-sm font-medium text-[#191919]">Revoir budget Achats UE</h5>
                        <p className="text-xs text-[#767676] mt-1">
                          Dépassement de 15.2% détecté. Analyser les causes et ajuster les prévisions.
                        </p>
                        <button className="mt-2 text-xs text-[#B87333] hover:text-[#A86323] font-medium">
                          Voir détails →
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border border-[#E8E8E8] rounded-lg">
                    <div className="flex items-start space-x-3">
                      <div className="mt-1 p-2 bg-blue-100 rounded-lg">
                        <TrendingDown className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h5 className="text-sm font-medium text-[#191919]">Optimiser Achats Hors UE</h5>
                        <p className="text-xs text-[#767676] mt-1">
                          Sous-consommation de -20.8%. Opportunité de renégociation ou réaffectation.
                        </p>
                        <button className="mt-2 text-xs text-[#B87333] hover:text-[#A86323] font-medium">
                          Analyser →
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border border-[#E8E8E8] rounded-lg">
                    <div className="flex items-start space-x-3">
                      <div className="mt-1 p-2 bg-yellow-100 rounded-lg">
                        <Clock className="w-4 h-4 text-yellow-600" />
                      </div>
                      <div className="flex-1">
                        <h5 className="text-sm font-medium text-[#191919]">Surveiller Carburants</h5>
                        <p className="text-xs text-[#767676] mt-1">
                          Tendance haussière de +8.5%. Mettre en place un suivi renforcé.
                        </p>
                        <button className="mt-2 text-xs text-[#B87333] hover:text-[#A86323] font-medium">
                          Configurer →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notifications automatiques */}
              <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                <h4 className="font-medium text-[#191919] mb-4">📧 Configuration des Notifications</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h5 className="text-sm font-medium text-[#444444] mb-3">Destinataires par niveau</h5>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 border border-[#E8E8E8] rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <span className="text-sm">Information</span>
                        </div>
                        <span className="text-xs text-[#767676]">Contrôleur de gestion</span>
                      </div>

                      <div className="flex items-center justify-between p-3 border border-[#E8E8E8] rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                          <span className="text-sm">Attention</span>
                        </div>
                        <span className="text-xs text-[#767676]">Manager + Contrôleur</span>
                      </div>

                      <div className="flex items-center justify-between p-3 border border-[#E8E8E8] rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <span className="text-sm">Critique</span>
                        </div>
                        <span className="text-xs text-[#767676]">Direction + Manager</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h5 className="text-sm font-medium text-[#444444] mb-3">Canaux de notification</h5>
                    <div className="space-y-3">
                      <label className="flex items-center space-x-3">
                        <input type="checkbox" defaultChecked className="rounded" />
                        <span className="text-sm text-[#444444]">Notifications dans l'application</span>
                      </label>

                      <label className="flex items-center space-x-3">
                        <input type="checkbox" defaultChecked className="rounded" />
                        <span className="text-sm text-[#444444]">Emails automatiques</span>
                      </label>

                      <label className="flex items-center space-x-3">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm text-[#444444]">SMS pour alertes critiques</span>
                      </label>

                      <label className="flex items-center space-x-3">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm text-[#444444]">Intégration Slack/Teams</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Onglet Rapports - Exports Détaillés */}
          {activeTab === 'rapports' && (
            <div className="space-y-6">
              {/* Génération de rapports */}
              <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-[#191919]">📊 Génération de Rapports</h3>
                  <div className="flex items-center space-x-3">
                    <button className="flex items-center space-x-2 px-3 py-2 border border-[#E8E8E8] rounded-lg hover:bg-gray-50 transition-colors">
                      <RefreshCw className="w-4 h-4" />
                      <span className="text-sm">Actualiser</span>
                    </button>
                    <button className="flex items-center space-x-2 px-3 py-2 bg-[#B87333] text-white rounded-lg hover:bg-[#A86323] transition-colors">
                      <Download className="w-4 h-4" />
                      <span className="text-sm">Générer Tout</span>
                    </button>
                  </div>
                </div>

                {/* Types de rapports */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 border border-[#E8E8E8] rounded-lg hover:border-[#B87333] transition-colors cursor-pointer">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <BarChart3 className="w-5 h-5 text-blue-600" />
                      </div>
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">Standard</span>
                    </div>
                    <h4 className="font-medium text-[#191919] mb-2">Rapport Mensuel</h4>
                    <p className="text-xs text-[#767676] mb-3">Synthèse complète Budget vs Réel avec analyses d'écarts</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#767676]">Dernière génération: Hier</span>
                      <button className="text-xs text-[#B87333] hover:text-[#A86323] font-medium">
                        Générer →
                      </button>
                    </div>
                  </div>

                  <div className="p-4 border border-[#E8E8E8] rounded-lg hover:border-[#B87333] transition-colors cursor-pointer">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 bg-[#6A8A82] bg-opacity-20 rounded-lg">
                        <TrendingUp className="w-5 h-5 text-[#6A8A82]" />
                      </div>
                      <span className="text-xs px-2 py-1 bg-[#6A8A82] bg-opacity-20 text-[#6A8A82] rounded-full">Avancé</span>
                    </div>
                    <h4 className="font-medium text-[#191919] mb-2">Analyse Comparative</h4>
                    <p className="text-xs text-[#767676] mb-3">Comparaisons multi-périodes avec projections et tendances</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#767676]">Programmé: Hebdomadaire</span>
                      <button className="text-xs text-[#B87333] hover:text-[#A86323] font-medium">
                        Générer →
                      </button>
                    </div>
                  </div>

                  <div className="p-4 border border-[#E8E8E8] rounded-lg hover:border-[#B87333] transition-colors cursor-pointer">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <PieChart className="w-5 h-5 text-purple-600" />
                      </div>
                      <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">Exécutif</span>
                    </div>
                    <h4 className="font-medium text-[#191919] mb-2">Dashboard Exécutif</h4>
                    <p className="text-xs text-[#767676] mb-3">Vue d'ensemble pour la direction avec KPIs principaux</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#767676]">Format: PowerPoint</span>
                      <button className="text-xs text-[#B87333] hover:text-[#A86323] font-medium">
                        Générer →
                      </button>
                    </div>
                  </div>

                  <div className="p-4 border border-[#E8E8E8] rounded-lg hover:border-[#B87333] transition-colors cursor-pointer">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <FileDown className="w-5 h-5 text-yellow-600" />
                      </div>
                      <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">Détaillé</span>
                    </div>
                    <h4 className="font-medium text-[#191919] mb-2">Export Complet</h4>
                    <p className="text-xs text-[#767676] mb-3">Données brutes avec drill-down par compte et département</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#767676]">Format: Excel</span>
                      <button className="text-xs text-[#B87333] hover:text-[#A86323] font-medium">
                        Générer →
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Configuration des exports */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                  <h4 className="font-medium text-[#191919] mb-4">⚙️ Configuration des Exports</h4>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[#444444] mb-2">Période d'analyse</label>
                      <select className="w-full border border-[#E8E8E8] rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#B87333] focus:border-transparent">
                        <option value="mensuel">Mensuel (Janvier 2025)</option>
                        <option value="trimestriel">Trimestriel (Q1 2025)</option>
                        <option value="ytd">Year-to-Date (2025)</option>
                        <option value="annuel">Annuel (2024)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#444444] mb-2">Départements</label>
                      <div className="space-y-2">
                        {departements.map(dept => (
                          <label key={dept} className="flex items-center space-x-2">
                            <input type="checkbox" defaultChecked className="rounded" />
                            <span className="text-sm text-[#444444]">{dept}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#444444] mb-2">Format de sortie</label>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="flex items-center space-x-2">
                          <input type="radio" name="format" value="excel" defaultChecked />
                          <span className="text-sm text-[#444444]">Excel (.xlsx)</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input type="radio" name="format" value="pdf" />
                          <span className="text-sm text-[#444444]">PDF</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input type="radio" name="format" value="powerbi" />
                          <span className="text-sm text-[#444444]">Power BI</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input type="radio" name="format" value="csv" />
                          <span className="text-sm text-[#444444]">CSV</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#444444] mb-2">Options avancées</label>
                      <div className="space-y-2">
                        <label className="flex items-center space-x-2">
                          <input type="checkbox" defaultChecked className="rounded" />
                          <span className="text-sm text-[#444444]">Inclure graphiques</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input type="checkbox" defaultChecked className="rounded" />
                          <span className="text-sm text-[#444444]">Données de comparaison N-1</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input type="checkbox" className="rounded" />
                          <span className="text-sm text-[#444444]">Détail par sous-compte</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input type="checkbox" className="rounded" />
                          <span className="text-sm text-[#444444]">Commentaires d'analyse</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Historique des rapports */}
                <div className="bg-white rounded-lg border border-[#E8E8E8] overflow-hidden">
                  <div className="p-4 bg-gray-50 border-b border-[#E8E8E8]">
                    <h4 className="font-medium text-[#191919]">📁 Historique des Rapports</h4>
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    <div className="divide-y divide-gray-200">
                      {[
                        { nom: 'Rapport Mensuel - Janvier 2025', type: 'Mensuel', date: '2025-01-15', taille: '2.4 MB', format: 'Excel' },
                        { nom: 'Dashboard Exécutif - Q4 2024', type: 'Exécutif', date: '2025-01-08', taille: '850 KB', format: 'PDF' },
                        { nom: 'Analyse Comparative - Décembre', type: 'Avancé', date: '2025-01-02', taille: '4.1 MB', format: 'Excel' },
                        { nom: 'Export Complet - 2024', type: 'Détaillé', date: '2024-12-31', taille: '12.8 MB', format: 'Excel' },
                        { nom: 'Rapport Mensuel - Décembre 2024', type: 'Mensuel', date: '2024-12-15', taille: '2.2 MB', format: 'Excel' }
                      ].map((rapport, index) => (
                        <div key={index} className="p-4 hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[#191919] truncate">{rapport.nom}</p>
                              <div className="mt-1 flex items-center space-x-4 text-xs text-[#767676]">
                                <span>{rapport.type}</span>
                                <span>{rapport.date}</span>
                                <span>{rapport.taille}</span>
                                <span>{rapport.format}</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 ml-4">
                              <button className="p-1 text-[#767676] hover:text-[#B87333] transition-colors" title="Télécharger">
                                <Download className="w-4 h-4" />
                              </button>
                              <button className="p-1 text-[#767676] hover:text-[#6A8A82] transition-colors" title="Voir">
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Programmation automatique */}
              <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                <h4 className="font-medium text-[#191919] mb-4">🕒 Programmation Automatique</h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-4 border border-[#E8E8E8] rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="text-sm font-medium text-[#191919]">Rapport Mensuel</h5>
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-[#6A8A82] rounded-full mr-2"></div>
                        <span className="text-xs text-[#6A8A82]">Actif</span>
                      </div>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-[#767676]">Fréquence:</span>
                        <span className="font-medium">Chaque 15 du mois</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#767676]">Destinataires:</span>
                        <span className="font-medium">3 personnes</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#767676]">Prochaine:</span>
                        <span className="font-medium">15/02/2025</span>
                      </div>
                    </div>
                    <button className="mt-3 w-full text-xs text-[#B87333] hover:text-[#A86323] font-medium border border-[#B87333] rounded py-1">
                      Modifier
                    </button>
                  </div>

                  <div className="p-4 border border-[#E8E8E8] rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="text-sm font-medium text-[#191919]">Dashboard Exécutif</h5>
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                        <span className="text-xs text-yellow-600">En pause</span>
                      </div>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-[#767676]">Fréquence:</span>
                        <span className="font-medium">Hebdomadaire</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#767676]">Destinataires:</span>
                        <span className="font-medium">Direction</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#767676]">Format:</span>
                        <span className="font-medium">PDF</span>
                      </div>
                    </div>
                    <button className="mt-3 w-full text-xs text-[#6A8A82] hover:text-[#5A7A72] font-medium border border-[#6A8A82] rounded py-1">
                      Réactiver
                    </button>
                  </div>

                  <div className="p-4 border-2 border-dashed border-[#E8E8E8] rounded-lg flex flex-col items-center justify-center">
                    <Plus className="w-8 h-8 text-[#767676] mb-2" />
                    <p className="text-sm font-medium text-[#444444] mb-1">Nouvelle programmation</p>
                    <p className="text-xs text-[#767676] text-center mb-3">Automatiser la génération et l'envoi de rapports</p>
                    <button className="text-xs text-[#B87333] hover:text-[#A86323] font-medium">
                      Configurer →
                    </button>
                  </div>
                </div>
              </div>

              {/* Templates personnalisés */}
              <div className="bg-white rounded-lg p-6 border border-[#E8E8E8]">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-[#191919]">🎨 Templates Personnalisés</h4>
                  <button className="flex items-center space-x-2 px-3 py-2 border border-[#E8E8E8] rounded-lg hover:bg-gray-50 transition-colors">
                    <Plus className="w-4 h-4" />
                    <span className="text-sm">Nouveau template</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[
                    { nom: 'Template Corporate', description: 'Charte graphique entreprise', utilisation: '12 fois', statut: 'Actif' },
                    { nom: 'Analyse Financière', description: 'Focus ratios et tendances', utilisation: '8 fois', statut: 'Actif' },
                    { nom: 'Suivi Projets', description: 'Budget par projet', utilisation: '5 fois', statut: 'Brouillon' },
                    { nom: 'Rapport Audit', description: 'Format audit externe', utilisation: '3 fois', statut: 'Archivé' }
                  ].map((template, index) => (
                    <div key={index} className="p-4 border border-[#E8E8E8] rounded-lg hover:border-[#B87333] transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="text-sm font-medium text-[#191919]">{template.nom}</h5>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          template.statut === 'Actif' ? 'bg-[#6A8A82] bg-opacity-20 text-[#6A8A82]' :
                          template.statut === 'Brouillon' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {template.statut}
                        </span>
                      </div>
                      <p className="text-xs text-[#767676] mb-2">{template.description}</p>
                      <p className="text-xs text-[#767676] mb-3">Utilisé {template.utilisation}</p>
                      <div className="flex space-x-2">
                        <button className="flex-1 text-xs text-[#B87333] hover:text-[#A86323] font-medium">
                          Utiliser
                        </button>
                        <button className="text-xs text-[#767676] hover:text-[#444444]">
                          <Edit className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompleteBudgetingModule;