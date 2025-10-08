import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
  FileText, Download, Printer, Settings, Eye, Calendar, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle, BarChart3, PieChart as PieChartIcon, Activity,
  DollarSign, Building, CreditCard, Banknote, Target, Zap, Shield,
  Mail, FileSpreadsheet, RefreshCw, Filter, Search, ChevronDown
} from 'lucide-react';
import PrintableArea from '../ui/PrintableArea';
import { usePrintReport } from '../../hooks/usePrint';
import PeriodSelectorModal from '../shared/PeriodSelectorModal';

interface BilanData {
  actifImmobilise: {
    immobilisationsIncorporelles: number;
    immobilisationsCorporelles: number;
    immobilisationsFinancieres: number;
    amortissements: number;
  };
  actifCirculant: {
    stocks: number;
    creancesClients: number;
    autresCreances: number;
    disponibilites: number;
  };
  capitauxPropres: {
    capitalSocial: number;
    reserves: number;
    reportANouveau: number;
    resultatExercice: number;
  };
  dettes: {
    dettesFinancieres: number;
    dettesFournisseurs: number;
    dettesExploitation: number;
    autresDettes: number;
  };
}

interface CompteResultatData {
  produits: {
    chiffreAffaires: number;
    productionStockee: number;
    autresProduits: number;
    produitsFinanciers: number;
    produitsExceptionnels: number;
  };
  charges: {
    achatsConsommes: number;
    servicesExterieurs: number;
    personnel: number;
    amortissements: number;
    chargesFinancieres: number;
    chargesExceptionnelles: number;
    impotsSocietes: number;
  };
}

interface SIGData {
  margeCommerciale: number;
  valeurAjoutee: number;
  excedentBrutExploitation: number;
  resultatExploitation: number;
  resultatCourant: number;
  resultatNet: number;
  capaciteAutofinancement: number;
}

interface RatiosData {
  structure: {
    autonomieFinanciere: number;
    gearing: number;
    couvertureImmobilisations: number;
  };
  liquidite: {
    liquiditeGenerale: number;
    liquiditeReduite: number;
    liquiditeImmediate: number;
  };
  rentabilite: {
    roa: number;
    roe: number;
    margeNette: number;
    margeBrute: number;
  };
  activite: {
    rotationStocks: number;
    dso: number;
    dpo: number;
    rotationActif: number;
  };
}

interface AdvancedFinancialStatementsProps {
  defaultView?: 'dashboard' | 'bilan' | 'resultat' | 'flux' | 'ratios';
}

const AdvancedFinancialStatements: React.FC<AdvancedFinancialStatementsProps> = ({
  defaultView = 'dashboard'
}) => {
  const { t } = useLanguage();

  // États principaux
  const [activeView, setActiveView] = useState<'dashboard' | 'bilan' | 'resultat' | 'flux' | 'ratios'>(defaultView);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [showComparative, setShowComparative] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Configuration
  const [config, setConfig] = useState({
    norme: 'SYSCOHADA' as 'SYSCOHADA' | 'IFRS' | 'PCG',
    devise: 'XAF',
    format: 'A4' as 'A4' | 'A3',
    orientation: 'portrait' as 'portrait' | 'landscape',
    includeGraphics: true,
    includeRatios: true,
    showComparison: true
  });

  const { printRef, handlePrint } = usePrintReport({
    orientation: config.orientation,
    title: 'États Financiers'
  });

  // Données simulées
  const bilanData: BilanData = {
    actifImmobilise: {
      immobilisationsIncorporelles: 2500000,
      immobilisationsCorporelles: 45000000,
      immobilisationsFinancieres: 8500000,
      amortissements: -15000000
    },
    actifCirculant: {
      stocks: 12500000,
      creancesClients: 8900000,
      autresCreances: 2100000,
      disponibilites: 6800000
    },
    capitauxPropres: {
      capitalSocial: 25000000,
      reserves: 12000000,
      reportANouveau: 3500000,
      resultatExercice: 8200000
    },
    dettes: {
      dettesFinancieres: 18500000,
      dettesFournisseurs: 6900000,
      dettesExploitation: 4800000,
      autresDettes: 2100000
    }
  };

  const compteResultatData: CompteResultatData = {
    produits: {
      chiffreAffaires: 85000000,
      productionStockee: 2500000,
      autresProduits: 1200000,
      produitsFinanciers: 800000,
      produitsExceptionnels: 300000
    },
    charges: {
      achatsConsommes: 42000000,
      servicesExterieurs: 15000000,
      personnel: 18500000,
      amortissements: 5200000,
      chargesFinancieres: 2800000,
      chargesExceptionnelles: 500000,
      impotsSocietes: 2500000
    }
  };

  // Calculs des SIG
  const sigData: SIGData = useMemo(() => {
    const totalProduits = Object.values(compteResultatData.produits).reduce((sum, val) => sum + val, 0);
    const totalCharges = Object.values(compteResultatData.charges).reduce((sum, val) => sum + val, 0);
    
    const margeCommerciale = compteResultatData.produits.chiffreAffaires - compteResultatData.charges.achatsConsommes;
    const valeurAjoutee = margeCommerciale + compteResultatData.produits.productionStockee - compteResultatData.charges.servicesExterieurs;
    const excedentBrutExploitation = valeurAjoutee - compteResultatData.charges.personnel;
    const resultatExploitation = excedentBrutExploitation - compteResultatData.charges.amortissements;
    const resultatCourant = resultatExploitation - compteResultatData.charges.chargesFinancieres + compteResultatData.produits.produitsFinanciers;
    const resultatNet = totalProduits - totalCharges;
    const capaciteAutofinancement = resultatNet + compteResultatData.charges.amortissements;
    
    return {
      margeCommerciale,
      valeurAjoutee,
      excedentBrutExploitation,
      resultatExploitation,
      resultatCourant,
      resultatNet,
      capaciteAutofinancement
    };
  }, [compteResultatData]);

  // Calculs des ratios
  const ratiosData: RatiosData = useMemo(() => {
    const totalActif = Object.values(bilanData.actifImmobilise).reduce((sum, val) => sum + val, 0) + 
                      Object.values(bilanData.actifCirculant).reduce((sum, val) => sum + val, 0);
    const totalCapitaux = Object.values(bilanData.capitauxPropres).reduce((sum, val) => sum + val, 0);
    const totalDettes = Object.values(bilanData.dettes).reduce((sum, val) => sum + val, 0);
    
    return {
      structure: {
        autonomieFinanciere: (totalCapitaux / totalActif) * 100,
        gearing: (bilanData.dettes.dettesFinancieres / totalCapitaux) * 100,
        couvertureImmobilisations: (totalCapitaux / Math.abs(Object.values(bilanData.actifImmobilise).reduce((sum, val) => sum + val, 0))) * 100
      },
      liquidite: {
        liquiditeGenerale: (Object.values(bilanData.actifCirculant).reduce((sum, val) => sum + val, 0) / (bilanData.dettes.dettesFournisseurs + bilanData.dettes.dettesExploitation)),
        liquiditeReduite: ((bilanData.actifCirculant.creancesClients + bilanData.actifCirculant.disponibilites) / (bilanData.dettes.dettesFournisseurs + bilanData.dettes.dettesExploitation)),
        liquiditeImmediate: (bilanData.actifCirculant.disponibilites / (bilanData.dettes.dettesFournisseurs + bilanData.dettes.dettesExploitation))
      },
      rentabilite: {
        roa: (sigData.resultatNet / totalActif) * 100,
        roe: (sigData.resultatNet / totalCapitaux) * 100,
        margeNette: (sigData.resultatNet / compteResultatData.produits.chiffreAffaires) * 100,
        margeBrute: (sigData.margeCommerciale / compteResultatData.produits.chiffreAffaires) * 100
      },
      activite: {
        rotationStocks: compteResultatData.charges.achatsConsommes / bilanData.actifCirculant.stocks,
        dso: (bilanData.actifCirculant.creancesClients / compteResultatData.produits.chiffreAffaires) * 365,
        dpo: (bilanData.dettes.dettesFournisseurs / compteResultatData.charges.achatsConsommes) * 365,
        rotationActif: compteResultatData.produits.chiffreAffaires / totalActif
      }
    };
  }, [bilanData, compteResultatData, sigData]);

  const COLORS = ['#6A8A82', '#B87333', '#E8B4B8', '#A8C8EC', '#D4B5D4', '#FFD93D'];

  return (
    <div className="min-h-screen bg-gray-50">
      <PrintableArea
        ref={printRef}
        orientation={config.orientation}
        pageSize={config.format}
        showPrintButton={false}
        headerContent={
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold">États Financiers</h2>
            <div className="flex items-center gap-4">
              <p className="text-sm text-gray-600">Conforme {config.norme}</p>
              <button
                onClick={() => setShowPeriodModal(true)}
                className="flex items-center gap-2 px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <Calendar className="w-4 h-4" />
                {dateRange.startDate && dateRange.endDate
                  ? `${dateRange.startDate} - ${dateRange.endDate}`
                  : 'Sélectionner une période'
                }
              </button>
            </div>
          </div>
        }
      >
      {/* En-tête principal */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <FileText className="w-8 h-8 text-[#6A8A82]" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">États Financiers</h1>
              <p className="text-sm text-gray-600">Reporting financier complet - Conforme {config.norme}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <select 
              value={config.norme}
              onChange={(e) => setConfig({...config, norme: e.target.value as any})}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="SYSCOHADA">SYSCOHADA</option>
              <option value="IFRS">IFRS</option>
              <option value="PCG">PCG</option>
            </select>
            
            <select 
              value={dateRange.startDate || '2025'}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="2025">Exercice 2025</option>
              <option value="2024">Exercice 2024</option>
              <option value="Q4-2025">T4 2025</option>
              <option value="Q3-2025">T3 2025</option>
            </select>
            
            <button 
              onClick={() => setShowComparative(!showComparative)}
              className={`px-4 py-2 rounded-lg border transition-colors ${showComparative ? 'bg-[#6A8A82] text-white border-[#6A8A82]' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
            >
              <BarChart3 className="w-4 h-4 mr-2 inline" />
              Comparatif
            </button>
            
            <button 
              onClick={() => setShowPrintPreview(true)}
              className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Printer className="w-4 h-4 mr-2 inline" />
              Aperçu
            </button>
            
            <button className="px-4 py-2 bg-[#B87333] text-white rounded-lg hover:bg-[#A66B2A] transition-colors">
              <Download className="w-4 h-4 mr-2 inline" />
              Exporter
            </button>
          </div>
        </div>
        
        {/* Navigation des états */}
        <div className="flex space-x-1 mt-4">
          {[
            { id: 'dashboard', label: 'Tableau de Bord', icon: BarChart3 },
            { id: 'bilan', label: t('accounting.balanceSheet')}, icon: Building },
            { id: 'resultat', label: 'Compte de Résultat', icon: TrendingUp },
            { id: 'flux', label: 'Flux de Trésorerie', icon: Activity },
            { id: 'ratios', label: 'SIG & Ratios', icon: Target }
          ].map((view) => (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id as any)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeView === view.id 
                  ? 'bg-[#6A8A82] text-white' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <view.icon className="w-4 h-4 mr-2 inline" />
              {view.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tableau de bord financier */}
      {activeView === 'dashboard' && (
        <div className="p-6 space-y-6">
          
          {/* Indicateurs clés de performance */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Chiffre d'Affaires</p>
                  <p className="text-2xl font-bold text-[#6A8A82]">
                    {(compteResultatData.produits.chiffreAffaires / 1000000).toFixed(1)}M
                  </p>
                  <p className="text-xs text-gray-700">XAF</p>
                </div>
                <div className="w-12 h-12 bg-[#6A8A82]/10 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-[#6A8A82]" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Résultat Net</p>
                  <p className={`text-2xl font-bold ${sigData.resultatNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(sigData.resultatNet / 1000000).toFixed(1)}M
                  </p>
                  <p className="text-xs text-gray-700">
                    {sigData.resultatNet >= 0 ? 'Bénéfice' : 'Perte'}
                  </p>
                </div>
                <div className={`w-12 h-12 ${sigData.resultatNet >= 0 ? 'bg-green-100' : 'bg-red-100'} rounded-lg flex items-center justify-center`}>
                  {sigData.resultatNet >= 0 ? 
                    <TrendingUp className="w-6 h-6 text-green-600" /> :
                    <TrendingDown className="w-6 h-6 text-red-600" />
                  }
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Autonomie Financière</p>
                  <p className={`text-2xl font-bold ${ratiosData.structure.autonomieFinanciere > 30 ? 'text-green-600' : 'text-orange-600'}`}>
                    {ratiosData.structure.autonomieFinanciere.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-700">
                    {ratiosData.structure.autonomieFinanciere > 30 ? 'Solide' : 'Fragile'}
                  </p>
                </div>
                <div className={`w-12 h-12 ${ratiosData.structure.autonomieFinanciere > 30 ? 'bg-green-100' : 'bg-orange-100'} rounded-lg flex items-center justify-center`}>
                  <Shield className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Liquidité Générale</p>
                  <p className={`text-2xl font-bold ${ratiosData.liquidite.liquiditeGenerale > 1 ? 'text-green-600' : 'text-red-600'}`}>
                    {ratiosData.liquidite.liquiditeGenerale.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-700">
                    {ratiosData.liquidite.liquiditeGenerale > 1 ? 'Correct' : 'Risqué'}
                  </p>
                </div>
                <div className={`w-12 h-12 ${ratiosData.liquidite.liquiditeGenerale > 1 ? 'bg-green-100' : 'bg-red-100'} rounded-lg flex items-center justify-center`}>
                  <Activity className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Graphiques de synthèse */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Structure du bilan */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Structure du Bilan</h3>
                <button className="p-2 text-gray-700 hover:text-gray-600" aria-label="Voir les détails">
                  <Eye className="w-4 h-4" />
                </button>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { 
                        name: 'Actif Immobilisé', 
                        value: Math.abs(Object.values(bilanData.actifImmobilise).reduce((sum, val) => sum + val, 0))
                      },
                      { 
                        name: 'Actif Circulant', 
                        value: Object.values(bilanData.actifCirculant).reduce((sum, val) => sum + val, 0)
                      },
                      { 
                        name: 'Capitaux Propres', 
                        value: Object.values(bilanData.capitauxPropres).reduce((sum, val) => sum + val, 0)
                      },
                      { 
                        name: 'Dettes', 
                        value: Object.values(bilanData.dettes).reduce((sum, val) => sum + val, 0)
                      }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {Array.from({length: 4}).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${(value as number / 1000000).toFixed(1)}M XAF`, '']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Évolution des SIG */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Évolution des SIG</h3>
                <div className="flex items-center space-x-2">
                  <select className="px-3 py-1 border border-gray-300 rounded text-sm">
                    <option>6 derniers mois</option>
                    <option>12 derniers mois</option>
                    <option>3 dernières années</option>
                  </select>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={[
                  { periode: 'Jan', va: 25000000, ebe: 18000000, re: 12000000, rn: 8000000 },
                  { periode: 'Fév', va: 27000000, ebe: 19500000, re: 13200000, rn: 8500000 },
                  { periode: 'Mar', va: 29000000, ebe: 21000000, re: 14500000, rn: 9200000 },
                  { periode: 'Avr', va: 31000000, ebe: 22500000, re: 15800000, rn: 9800000 },
                  { periode: 'Mai', va: 28000000, ebe: 20000000, re: 13500000, rn: 8200000 },
                  { periode: 'Jun', va: 32000000, ebe: 24000000, re: 17000000, rn: 10500000 }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="periode" />
                  <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
                  <Tooltip formatter={(value) => [`${(value as number / 1000000).toFixed(1)}M XAF`, '']} />
                  <Legend />
                  <Area type="monotone" dataKey="va" stackId="1" stroke="#6A8A82" fill="#6A8A82" fillOpacity={0.6} name="Valeur Ajoutée" />
                  <Area type="monotone" dataKey="ebe" stackId="2" stroke="#B87333" fill="#B87333" fillOpacity={0.6} name="EBE" />
                  <Area type="monotone" dataKey="re" stackId="3" stroke="#E8B4B8" fill="#E8B4B8" fillOpacity={0.6} name="Rés. Exploitation" />
                  <Area type="monotone" dataKey="rn" stackId="4" stroke="#A8C8EC" fill="#A8C8EC" fillOpacity={0.6} name="Résultat Net" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Alertes et indicateurs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Alertes financières */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-semibold text-gray-900">Alertes Financières</h4>
                <AlertTriangle className="w-5 h-5 text-orange-500" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Liquidité faible</span>
                  <span className={`text-sm font-medium ${ratiosData.liquidite.liquiditeGenerale < 1 ? 'text-red-600' : 'text-green-600'}`}>
                    {ratiosData.liquidite.liquiditeGenerale < 1 ? 'Alerte' : 'OK'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Autonomie faible</span>
                  <span className={`text-sm font-medium ${ratiosData.structure.autonomieFinanciere < 30 ? 'text-red-600' : 'text-green-600'}`}>
                    {ratiosData.structure.autonomieFinanciere < 30 ? 'Alerte' : 'OK'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">ROE insuffisant</span>
                  <span className={`text-sm font-medium ${ratiosData.rentabilite.roe < 10 ? 'text-orange-600' : 'text-green-600'}`}>
                    {ratiosData.rentabilite.roe < 10 ? 'Attention' : 'Excellent'}
                  </span>
                </div>
              </div>
            </div>

            {/* Performance clé */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-semibold text-gray-900">Performance Clé</h4>
                <Zap className="w-5 h-5 text-blue-500" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">ROA</span>
                  <span className="text-sm font-medium text-blue-600">{ratiosData.rentabilite.roa.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">ROE</span>
                  <span className="text-sm font-medium text-green-600">{ratiosData.rentabilite.roe.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Marge Nette</span>
                  <span className="text-sm font-medium text-purple-600">{ratiosData.rentabilite.margeNette.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Synthèse financière */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-semibold text-gray-900">Synthèse Financière</h4>
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">CAF</span>
                  <span className="text-sm font-medium text-green-600">
                    {(sigData.capaciteAutofinancement / 1000000).toFixed(1)}M
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">EBE</span>
                  <span className="text-sm font-medium text-blue-600">
                    {(sigData.excedentBrutExploitation / 1000000).toFixed(1)}M
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{t('navigation.treasury')}</span>
                  <span className="text-sm font-medium text-[#6A8A82]">
                    {(bilanData.actifCirculant.disponibilites / 1000000).toFixed(1)}M
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Graphique de rentabilité */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Évolution de la Rentabilité</h3>
              <div className="flex items-center space-x-2">
                <button className="px-3 py-1 text-sm bg-[#6A8A82] text-white rounded">
                  Mensuel
                </button>
                <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
                  Trimestriel
                </button>
                <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50">
                  Annuel
                </button>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={[
                { mois: 'Jan', ca: 85000000, rn: 8000000, marge: 9.4 },
                { mois: 'Fév', ca: 78000000, rn: 7200000, marge: 9.2 },
                { mois: 'Mar', ca: 92000000, rn: 9800000, marge: 10.7 },
                { mois: 'Avr', ca: 88000000, rn: 8900000, marge: 10.1 },
                { mois: 'Mai', ca: 95000000, rn: 10200000, marge: 10.7 },
                { mois: 'Jun', ca: 103000000, rn: 11500000, marge: 11.2 }
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="mois" />
                <YAxis yAxisId="left" tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => `${value.toFixed(1)}%`} />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="ca" fill="#6A8A82" name="Chiffre d'Affaires (M XAF)" />
                <Bar yAxisId="left" dataKey="rn" fill="#B87333" name="Résultat Net (M XAF)" />
                <Line yAxisId="right" type="monotone" dataKey="marge" stroke="#e74c3c" strokeWidth={3} name="Marge Nette (%)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Bilan comptable et fonctionnel */}
      {activeView === 'bilan' && (
        <div className="p-6 space-y-6">
          
          {/* Sélecteur type de bilan */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-semibold text-gray-900">Type de Bilan</h3>
              <div className="flex space-x-2">
                <button className="px-4 py-2 bg-[#6A8A82] text-white rounded-lg">
                  Bilan Comptable
                </button>
                <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Bilan Fonctionnel
                </button>
              </div>
            </div>
          </div>

          {/* Bilan comptable */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* ACTIF */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200 bg-blue-50">
                <h3 className="text-lg font-semibold text-gray-900">ACTIF</h3>
              </div>
              
              <div className="p-6 space-y-4">
                
                {/* Actif immobilisé */}
                <div className="border-b border-gray-100 pb-4">
                  <h4 className="font-semibold text-gray-800 mb-3">ACTIF IMMOBILISÉ</h4>
                  <div className="space-y-2 ml-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Immobilisations incorporelles</span>
                      <span className="text-sm font-mono font-medium">
                        {bilanData.actifImmobilise.immobilisationsIncorporelles.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Immobilisations corporelles</span>
                      <span className="text-sm font-mono font-medium">
                        {bilanData.actifImmobilise.immobilisationsCorporelles.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Immobilisations financières</span>
                      <span className="text-sm font-mono font-medium">
                        {bilanData.actifImmobilise.immobilisationsFinancieres.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span className="text-sm">Amortissements</span>
                      <span className="text-sm font-mono font-medium">
                        ({Math.abs(bilanData.actifImmobilise.amortissements).toLocaleString()})
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span className="text-sm">Total Actif Immobilisé</span>
                      <span className="text-sm font-mono">
                        {Object.values(bilanData.actifImmobilise).reduce((sum, val) => sum + val, 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actif circulant */}
                <div className="border-b border-gray-100 pb-4">
                  <h4 className="font-semibold text-gray-800 mb-3">ACTIF CIRCULANT</h4>
                  <div className="space-y-2 ml-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Stocks et en-cours</span>
                      <span className="text-sm font-mono font-medium">
                        {bilanData.actifCirculant.stocks.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Créances clients</span>
                      <span className="text-sm font-mono font-medium">
                        {bilanData.actifCirculant.creancesClients.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Autres créances</span>
                      <span className="text-sm font-mono font-medium">
                        {bilanData.actifCirculant.autresCreances.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Disponibilités</span>
                      <span className="text-sm font-mono font-medium">
                        {bilanData.actifCirculant.disponibilites.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span className="text-sm">Total Actif Circulant</span>
                      <span className="text-sm font-mono">
                        {Object.values(bilanData.actifCirculant).reduce((sum, val) => sum + val, 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Total actif */}
                <div className="bg-blue-50 p-3 rounded">
                  <div className="flex justify-between font-bold text-lg">
                    <span>TOTAL ACTIF</span>
                    <span className="font-mono">
                      {(Object.values(bilanData.actifImmobilise).reduce((sum, val) => sum + val, 0) + 
                        Object.values(bilanData.actifCirculant).reduce((sum, val) => sum + val, 0)).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* PASSIF */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200 bg-green-50">
                <h3 className="text-lg font-semibold text-gray-900">PASSIF</h3>
              </div>
              
              <div className="p-6 space-y-4">
                
                {/* Capitaux propres */}
                <div className="border-b border-gray-100 pb-4">
                  <h4 className="font-semibold text-gray-800 mb-3">CAPITAUX PROPRES</h4>
                  <div className="space-y-2 ml-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Capital social</span>
                      <span className="text-sm font-mono font-medium">
                        {bilanData.capitauxPropres.capitalSocial.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Réserves</span>
                      <span className="text-sm font-mono font-medium">
                        {bilanData.capitauxPropres.reserves.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Report à nouveau</span>
                      <span className="text-sm font-mono font-medium">
                        {bilanData.capitauxPropres.reportANouveau.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Résultat de l'exercice</span>
                      <span className="text-sm font-mono font-medium">
                        {bilanData.capitauxPropres.resultatExercice.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span className="text-sm">Total Capitaux Propres</span>
                      <span className="text-sm font-mono">
                        {Object.values(bilanData.capitauxPropres).reduce((sum, val) => sum + val, 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Dettes */}
                <div className="border-b border-gray-100 pb-4">
                  <h4 className="font-semibold text-gray-800 mb-3">DETTES</h4>
                  <div className="space-y-2 ml-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Dettes financières</span>
                      <span className="text-sm font-mono font-medium">
                        {bilanData.dettes.dettesFinancieres.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Dettes fournisseurs</span>
                      <span className="text-sm font-mono font-medium">
                        {bilanData.dettes.dettesFournisseurs.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Dettes d'exploitation</span>
                      <span className="text-sm font-mono font-medium">
                        {bilanData.dettes.dettesExploitation.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Autres dettes</span>
                      <span className="text-sm font-mono font-medium">
                        {bilanData.dettes.autresDettes.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span className="text-sm">Total Dettes</span>
                      <span className="text-sm font-mono">
                        {Object.values(bilanData.dettes).reduce((sum, val) => sum + val, 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Total passif */}
                <div className="bg-green-50 p-3 rounded">
                  <div className="flex justify-between font-bold text-lg">
                    <span>TOTAL PASSIF</span>
                    <span className="font-mono">
                      {(Object.values(bilanData.capitauxPropres).reduce((sum, val) => sum + val, 0) + 
                        Object.values(bilanData.dettes).reduce((sum, val) => sum + val, 0)).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compte de résultat */}
      {activeView === 'resultat' && (
        <div className="p-6 space-y-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* PRODUITS */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200 bg-green-50">
                <h3 className="text-lg font-semibold text-gray-900">PRODUITS</h3>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Chiffre d'affaires</span>
                    <span className="text-sm font-mono font-medium">
                      {compteResultatData.produits.chiffreAffaires.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Production stockée</span>
                    <span className="text-sm font-mono font-medium">
                      {compteResultatData.produits.productionStockee.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Autres produits</span>
                    <span className="text-sm font-mono font-medium">
                      {compteResultatData.produits.autresProduits.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Produits financiers</span>
                    <span className="text-sm font-mono font-medium">
                      {compteResultatData.produits.produitsFinanciers.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Produits exceptionnels</span>
                    <span className="text-sm font-mono font-medium">
                      {compteResultatData.produits.produitsExceptionnels.toLocaleString()}
                    </span>
                  </div>
                </div>
                
                <div className="bg-green-50 p-3 rounded border-t-2 border-green-200">
                  <div className="flex justify-between font-bold text-lg">
                    <span>TOTAL PRODUITS</span>
                    <span className="font-mono text-green-600">
                      {Object.values(compteResultatData.produits).reduce((sum, val) => sum + val, 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* CHARGES */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200 bg-red-50">
                <h3 className="text-lg font-semibold text-gray-900">CHARGES</h3>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Achats consommés</span>
                    <span className="text-sm font-mono font-medium">
                      {compteResultatData.charges.achatsConsommes.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Services extérieurs</span>
                    <span className="text-sm font-mono font-medium">
                      {compteResultatData.charges.servicesExterieurs.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Charges de personnel</span>
                    <span className="text-sm font-mono font-medium">
                      {compteResultatData.charges.personnel.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Dotations amortissements</span>
                    <span className="text-sm font-mono font-medium">
                      {compteResultatData.charges.amortissements.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Charges financières</span>
                    <span className="text-sm font-mono font-medium">
                      {compteResultatData.charges.chargesFinancieres.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Charges exceptionnelles</span>
                    <span className="text-sm font-mono font-medium">
                      {compteResultatData.charges.chargesExceptionnelles.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Impôts sur les sociétés</span>
                    <span className="text-sm font-mono font-medium">
                      {compteResultatData.charges.impotsSocietes.toLocaleString()}
                    </span>
                  </div>
                </div>
                
                <div className="bg-red-50 p-3 rounded border-t-2 border-red-200">
                  <div className="flex justify-between font-bold text-lg">
                    <span>TOTAL CHARGES</span>
                    <span className="font-mono text-red-600">
                      {Object.values(compteResultatData.charges).reduce((sum, val) => sum + val, 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Résultat net */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">RÉSULTAT NET DE L'EXERCICE</h3>
              <div className={`text-4xl font-bold mb-2 ${sigData.resultatNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {sigData.resultatNet.toLocaleString()} XAF
              </div>
              <div className={`text-lg ${sigData.resultatNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {sigData.resultatNet >= 0 ? '📈 Bénéfice' : '📉 Perte'}
              </div>
              <div className="text-sm text-gray-700 mt-2">
                Marge nette: {ratiosData.rentabilite.margeNette.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tableau de flux de trésorerie */}
      {activeView === 'flux' && (
        <div className="p-6 space-y-6">
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Tableau de Flux de Trésorerie</h3>
              <p className="text-sm text-gray-600">Méthode directe - Conforme {config.norme}</p>
            </div>
            
            <div className="p-6 space-y-6">
              
              {/* Flux opérationnels */}
              <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                <h4 className="font-semibold text-blue-900 mb-4">💼 FLUX LIÉS AUX ACTIVITÉS OPÉRATIONNELLES</h4>
                <div className="space-y-3 ml-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700">Résultat net</span>
                    <span className="text-sm font-mono font-medium">{sigData.resultatNet.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700">+ Dotations amortissements</span>
                    <span className="text-sm font-mono font-medium">{compteResultatData.charges.amortissements.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700">- Variation stocks</span>
                    <span className="text-sm font-mono font-medium">-1 500 000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700">- Variation créances clients</span>
                    <span className="text-sm font-mono font-medium">-2 100 000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700">+ Variation dettes fournisseurs</span>
                    <span className="text-sm font-mono font-medium">1 800 000</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-2 text-blue-800">
                    <span>Flux nets opérationnels</span>
                    <span className="font-mono">{(sigData.capaciteAutofinancement - 1800000).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Flux d'investissement */}
              <div className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                <h4 className="font-semibold text-orange-900 mb-4">🏗️ FLUX LIÉS AUX ACTIVITÉS D'INVESTISSEMENT</h4>
                <div className="space-y-3 ml-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700">- Acquisitions immobilisations</span>
                    <span className="text-sm font-mono font-medium">-8 500 000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700">+ Cessions immobilisations</span>
                    <span className="text-sm font-mono font-medium">1 200 000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700">- Acquisitions financières</span>
                    <span className="text-sm font-mono font-medium">-2 000 000</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-2 text-orange-800">
                    <span>Flux nets d'investissement</span>
                    <span className="font-mono">-9 300 000</span>
                  </div>
                </div>
              </div>

              {/* Flux de financement */}
              <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
                <h4 className="font-semibold text-purple-900 mb-4">💰 FLUX LIÉS AUX ACTIVITÉS DE FINANCEMENT</h4>
                <div className="space-y-3 ml-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700">+ Augmentation capital</span>
                    <span className="text-sm font-mono font-medium">5 000 000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700">+ Nouveaux emprunts</span>
                    <span className="text-sm font-mono font-medium">12 000 000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700">- Remboursements emprunts</span>
                    <span className="text-sm font-mono font-medium">-4 500 000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-700">- Dividendes versés</span>
                    <span className="text-sm font-mono font-medium">-3 200 000</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-2 text-purple-800">
                    <span>Flux nets de financement</span>
                    <span className="font-mono">9 300 000</span>
                  </div>
                </div>
              </div>

              {/* Variation de trésorerie */}
              <div className="bg-gray-100 p-4 rounded-lg border-2 border-gray-300">
                <div className="text-center">
                  <h4 className="font-bold text-gray-900 mb-2">VARIATION DE TRÉSORERIE</h4>
                  <div className="text-2xl font-bold text-[#6A8A82]">+2 400 000 XAF</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Trésorerie début: 4 400 000 XAF → Trésorerie fin: 6 800 000 XAF
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SIG & Ratios */}
      {activeView === 'ratios' && (
        <div className="p-6 space-y-6">
          
          {/* Soldes Intermédiaires de Gestion */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Soldes Intermédiaires de Gestion (SIG)</h3>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  {[
                    { label: 'Marge Commerciale', value: sigData.margeCommerciale, color: 'blue' },
                    { label: 'Valeur Ajoutée', value: sigData.valeurAjoutee, color: 'green' },
                    { label: 'Excédent Brut d\'Exploitation', value: sigData.excedentBrutExploitation, color: 'purple' }
                  ].map((sig, index) => (
                    <div key={index} className={`p-4 rounded-lg border-l-4 border-${sig.color}-400 bg-${sig.color}-50`}>
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-900">{sig.label}</span>
                        <span className={`text-lg font-bold text-${sig.color}-600 font-mono`}>
                          {(sig.value / 1000000).toFixed(1)}M
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {((sig.value / compteResultatData.produits.chiffreAffaires) * 100).toFixed(1)}% du CA
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="space-y-4">
                  {[
                    { label: 'Résultat d\'Exploitation', value: sigData.resultatExploitation, color: 'indigo' },
                    { label: 'Résultat Courant', value: sigData.resultatCourant, color: 'orange' },
                    { label: 'Capacité d\'Autofinancement', value: sigData.capaciteAutofinancement, color: 'emerald' }
                  ].map((sig, index) => (
                    <div key={index} className={`p-4 rounded-lg border-l-4 border-${sig.color}-400 bg-${sig.color}-50`}>
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-900">{sig.label}</span>
                        <span className={`text-lg font-bold text-${sig.color}-600 font-mono`}>
                          {(sig.value / 1000000).toFixed(1)}M
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {((sig.value / compteResultatData.produits.chiffreAffaires) * 100).toFixed(1)}% du CA
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Ratios financiers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Ratios de structure et liquidité */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h4 className="text-md font-semibold text-gray-900">Ratios de Structure & Liquidité</h4>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="space-y-3">
                  <h5 className="font-medium text-gray-800">Structure Financière</h5>
                  {[
                    { label: 'Autonomie financière', value: ratiosData.structure.autonomieFinanciere, unit: '%', seuil: 30 },
                    { label: 'Gearing (Endettement)', value: ratiosData.structure.gearing, unit: '%', seuil: 100 },
                    { label: 'Couverture immobilisations', value: ratiosData.structure.couvertureImmobilisations, unit: '%', seuil: 100 }
                  ].map((ratio, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="text-sm text-gray-600">{ratio.label}</span>
                      <div className="text-right">
                        <span className={`text-sm font-bold ${ratio.value >= ratio.seuil ? 'text-green-600' : 'text-orange-600'}`}>
                          {ratio.value.toFixed(1)}{ratio.unit}
                        </span>
                        <div className={`text-xs ${ratio.value >= ratio.seuil ? 'text-green-500' : 'text-orange-500'}`}>
                          {ratio.value >= ratio.seuil ? '✓ Correct' : '⚠ Attention'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 border-t pt-4">
                  <h5 className="font-medium text-gray-800">Liquidité</h5>
                  {[
                    { label: 'Liquidité générale', value: ratiosData.liquidite.liquiditeGenerale, seuil: 1 },
                    { label: 'Liquidité réduite', value: ratiosData.liquidite.liquiditeReduite, seuil: 0.8 },
                    { label: 'Liquidité immédiate', value: ratiosData.liquidite.liquiditeImmediate, seuil: 0.2 }
                  ].map((ratio, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="text-sm text-gray-600">{ratio.label}</span>
                      <div className="text-right">
                        <span className={`text-sm font-bold ${ratio.value >= ratio.seuil ? 'text-green-600' : 'text-red-600'}`}>
                          {ratio.value.toFixed(2)}
                        </span>
                        <div className={`text-xs ${ratio.value >= ratio.seuil ? 'text-green-500' : 'text-red-500'}`}>
                          {ratio.value >= ratio.seuil ? '✓ Bon' : '✗ Risqué'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Ratios de rentabilité et activité */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h4 className="text-md font-semibold text-gray-900">Ratios de Rentabilité & Activité</h4>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="space-y-3">
                  <h5 className="font-medium text-gray-800">Rentabilité</h5>
                  {[
                    { label: 'ROA (Return on Assets)', value: ratiosData.rentabilite.roa, unit: '%', seuil: 5 },
                    { label: 'ROE (Return on Equity)', value: ratiosData.rentabilite.roe, unit: '%', seuil: 10 },
                    { label: 'Marge nette', value: ratiosData.rentabilite.margeNette, unit: '%', seuil: 5 },
                    { label: 'Marge brute', value: ratiosData.rentabilite.margeBrute, unit: '%', seuil: 20 }
                  ].map((ratio, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="text-sm text-gray-600">{ratio.label}</span>
                      <div className="text-right">
                        <span className={`text-sm font-bold ${ratio.value >= ratio.seuil ? 'text-green-600' : 'text-orange-600'}`}>
                          {ratio.value.toFixed(1)}{ratio.unit}
                        </span>
                        <div className={`text-xs ${ratio.value >= ratio.seuil ? 'text-green-500' : 'text-orange-500'}`}>
                          {ratio.value >= ratio.seuil ? '✓ Excellent' : '⚠ Faible'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 border-t pt-4">
                  <h5 className="font-medium text-gray-800">Activité</h5>
                  {[
                    { label: 'Rotation stocks', value: ratiosData.activite.rotationStocks, unit: 'x/an', seuil: 4 },
                    { label: 'DSO (Délai clients)', value: ratiosData.activite.dso, unit: 'jours', seuil: 45, inverse: true },
                    { label: 'DPO (Délai fournisseurs)', value: ratiosData.activite.dpo, unit: 'jours', seuil: 30 },
                    { label: 'Rotation actif', value: ratiosData.activite.rotationActif, unit: 'x/an', seuil: 1 }
                  ].map((ratio, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="text-sm text-gray-600">{ratio.label}</span>
                      <div className="text-right">
                        <span className={`text-sm font-bold ${
                          ratio.inverse ? 
                            (ratio.value <= ratio.seuil ? 'text-green-600' : 'text-orange-600') :
                            (ratio.value >= ratio.seuil ? 'text-green-600' : 'text-orange-600')
                        }`}>
                          {ratio.value.toFixed(ratio.unit === 'jours' ? 0 : 1)} {ratio.unit}
                        </span>
                        <div className={`text-xs ${
                          ratio.inverse ? 
                            (ratio.value <= ratio.seuil ? 'text-green-500' : 'text-orange-500') :
                            (ratio.value >= ratio.seuil ? 'text-green-500' : 'text-orange-500')
                        }`}>
                          {ratio.inverse ? 
                            (ratio.value <= ratio.seuil ? '✓ Optimal' : '⚠ Long') :
                            (ratio.value >= ratio.seuil ? '✓ Bon' : '⚠ Faible')
                          }
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Graphique évolution ratios */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Évolution des Ratios Clés</h3>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={[
                { periode: 'T1 2024', roa: 8.2, roe: 15.6, liquidite: 1.8, autonomie: 62 },
                { periode: 'T2 2024', roa: 9.1, roe: 16.8, liquidite: 1.9, autonomie: 64 },
                { periode: 'T3 2024', roa: 8.8, roe: 15.2, liquidite: 1.7, autonomie: 61 },
                { periode: 'T4 2024', roa: 9.5, roe: 17.1, liquidite: 2.1, autonomie: 66 },
                { periode: 'T1 2025', roa: 10.2, roe: 18.4, liquidite: 2.3, autonomie: 68 },
                { periode: 'T2 2025', roa: 9.8, roe: 17.8, liquidite: 2.0, autonomie: 65 }
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="periode" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="roa" stroke="#6A8A82" strokeWidth={2} name="ROA (%)" />
                <Line type="monotone" dataKey="roe" stroke="#B87333" strokeWidth={2} name="ROE (%)" />
                <Line type="monotone" dataKey="liquidite" stroke="#E8B4B8" strokeWidth={2} name="Liquidité Générale" />
                <Line type="monotone" dataKey="autonomie" stroke="#A8C8EC" strokeWidth={2} name="Autonomie Financière (%)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      </PrintableArea>

      {/* Modal Aperçu Avant Impression */}
      {showPrintPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Aperçu États Financiers</h3>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-600">Format:</label>
                    <select 
                      value={config.format}
                      onChange={(e) => setConfig({...config, format: e.target.value as any})}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="A4">A4</option>
                      <option value="A3">A3</option>
                    </select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-600">Orientation:</label>
                    <select 
                      value={config.orientation}
                      onChange={(e) => setConfig({...config, orientation: e.target.value as any})}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value="portrait">Portrait</option>
                      <option value="landscape">Paysage</option>
                    </select>
                  </div>
                  <button 
                    onClick={() => setShowPrintPreview(false)}
                    className="text-gray-700 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Options d'impression */}
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center space-x-6">
                <label className="flex items-center">
                  <input 
                    type="checkbox"
                    checked={config.includeGraphics}
                    onChange={(e) => setConfig({...config, includeGraphics: e.target.checked})}
                    className="rounded mr-2"
                  />
                  <span className="text-sm">Inclure les graphiques</span>
                </label>
                <label className="flex items-center">
                  <input 
                    type="checkbox"
                    checked={config.includeRatios}
                    onChange={(e) => setConfig({...config, includeRatios: e.target.checked})}
                    className="rounded mr-2"
                  />
                  <span className="text-sm">Inclure les ratios</span>
                </label>
                <label className="flex items-center">
                  <input 
                    type="checkbox"
                    checked={config.showComparison}
                    onChange={(e) => setConfig({...config, showComparison: e.target.checked})}
                    className="rounded mr-2"
                  />
                  <span className="text-sm">Comparaison N-1</span>
                </label>
              </div>
            </div>

            {/* Prévisualisation */}
            <div className={`p-8 bg-white ${config.format === 'A3' ? 'text-sm' : 'text-xs'} ${config.orientation === 'landscape' ? 'landscape-preview' : 'portrait-preview'}`}>
              
              {/* En-tête du rapport */}
              <div className="text-center mb-6">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                    <FileText className="w-8 h-8 text-gray-700" />
                  </div>
                </div>
                <h1 className="text-xl font-bold text-gray-900">ÉTATS FINANCIERS</h1>
                <p className="text-gray-600">Exercice {dateRange.startDate || '2025'} - Conforme {config.norme}</p>
                <p className="text-gray-700 text-sm">Généré le {new Date().toLocaleDateString('fr-FR')}</p>
              </div>

              {/* Résumé des indicateurs */}
              <div className="grid grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded">
                <div className="text-center">
                  <div className="text-xs text-gray-600">Chiffre d'Affaires</div>
                  <div className="font-bold text-[#6A8A82]">{(compteResultatData.produits.chiffreAffaires / 1000000).toFixed(1)}M XAF</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-600">Résultat Net</div>
                  <div className={`font-bold ${sigData.resultatNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(sigData.resultatNet / 1000000).toFixed(1)}M XAF
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-600">ROE</div>
                  <div className="font-bold text-blue-600">{ratiosData.rentabilite.roe.toFixed(1)}%</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-600">Autonomie</div>
                  <div className="font-bold text-purple-600">{ratiosData.structure.autonomieFinanciere.toFixed(1)}%</div>
                </div>
              </div>

              {/* Pied de page */}
              <div className="mt-8 pt-4 border-t border-gray-300 flex justify-between items-center text-xs text-gray-700">
                <div>
                  <p>WiseBook ERP - États Financiers</p>
                  <p>Système conforme {config.norme}</p>
                </div>
                <div className="text-right">
                  <p>Page 1 sur 1</p>
                  <p>Généré par: Jean Dupont</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex justify-between">
              <button 
                onClick={() => setShowPrintPreview(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Fermer
              </button>
              <div className="flex space-x-3">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <Mail className="w-4 h-4 mr-2 inline" />
                  Envoyer par email
                </button>
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  <FileSpreadsheet className="w-4 h-4 mr-2 inline" />
                  Exporter Excel
                </button>
                <button
                  onClick={() => {
                    setShowPrintPreview(false);
                    handlePrint();
                  }}
                  className="px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#5A7A72]"
                >
                  <Printer className="w-4 h-4 mr-2 inline" />
                  Imprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de sélection de période */}
      <PeriodSelectorModal
        isOpen={showPeriodModal}
        onClose={() => setShowPeriodModal(false)}
        onPeriodSelect={(period) => {
          setDateRange(period);
          setShowPeriodModal(false);
        }}
      />
    </div>
  );
};

export default AdvancedFinancialStatements;