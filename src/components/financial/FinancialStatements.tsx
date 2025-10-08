import React, { useState, useMemo, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  FileText, TrendingUp, Calculator, DollarSign, BarChart3,
  PieChart, Activity, AlertTriangle, CheckCircle, Download,
  Printer, Calendar, Filter, Search, Eye, Settings,
  RefreshCw, Info, ChevronRight, ChevronDown, Building,
  Wallet, TrendingDown, ArrowUpRight, ArrowDownRight,
  Shield, Target, Zap, Database, FileSpreadsheet, Clock
} from 'lucide-react';
import PeriodSelectorModal from '../shared/PeriodSelectorModal';

// Types pour les états financiers SYSCOHADA
interface BilanActif {
  immobilisationsIncorporelles: number;
  immobilisationsCorporelles: number;
  immobilisationsFinancieres: number;
  totalActifImmobilise: number;
  stocks: number;
  creancesClients: number;
  autresCreances: number;
  tresorerieActif: number;
  totalActifCirculant: number;
  totalActif: number;
}

interface BilanPassif {
  capitalSocial: number;
  reserves: number;
  resultatExercice: number;
  capitauxPropres: number;
  emprunts: number;
  dettesFinancieres: number;
  dettesFournisseurs: number;
  autresDettes: number;
  totalPassif: number;
}

interface CompteResultat {
  chiffreAffaires: number;
  productionVendue: number;
  productionStockee: number;
  productionImmobilisee: number;
  subventionsExploitation: number;
  autresProduitsExploitation: number;
  totalProduitsExploitation: number;
  achatsConsommes: number;
  servicesExterieurs: number;
  chargesPersonnel: number;
  dotationsAmortissements: number;
  autresChargesExploitation: number;
  totalChargesExploitation: number;
  resultatExploitation: number;
  produitsFinanciers: number;
  chargesFinancieres: number;
  resultatFinancier: number;
  resultatCourant: number;
  produitsExceptionnels: number;
  chargesExceptionnelles: number;
  resultatExceptionnel: number;
  impotsSocietes: number;
  resultatNet: number;
}

interface SIG {
  margeCommerciale: number;
  productionExercice: number;
  valeurAjoutee: number;
  excedentBrutExploitation: number;
  resultatExploitation: number;
  resultatCourant: number;
  resultatExceptionnel: number;
  resultatNet: number;
  capaciteAutofinancement: number;
}

interface RatiosFinanciers {
  // Ratios de structure
  autonomieFinanciere: number;
  endettement: number;
  couvertureEmplois: number;

  // Ratios de liquidité
  liquiditeGenerale: number;
  liquiditeReduite: number;
  liquiditeImmediate: number;

  // Ratios de rentabilité
  rentabiliteCommerciale: number;
  rentabiliteEconomique: number;
  rentabiliteFinanciere: number;
  roa: number;
  roe: number;

  // Ratios d'activité
  rotationStocks: number;
  delaiReglementClients: number;
  delaiReglementFournisseurs: number;
  rotationActifs: number;
}

const FinancialStatements: React.FC = () => {
  const { t } = useLanguage();
  const [activeView, setActiveView] = useState<'etats-principaux' | 'analyses' | 'outils-pilotage'>('etats-principaux');
  const [activeSubView, setActiveSubView] = useState<string>('bilan');
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [comparePeriod, setComparePeriod] = useState('2023');
  const [showComparison, setShowComparison] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'actif-immobilise': false,
    'actif-circulant': false,
    'tresorerie-actif': false,
    'capitaux-propres': false,
    'dettes-financieres': false,
    'passif-circulant': false,
    'tresorerie-passif': false,
    // Bilan Fonctionnel sections
    'emplois-stables': false,
    'ace': false,
    'ache': false,
    'tresorerie-active': false,
    'ressources-stables': false,
    'pce': false,
    'pche': false,
    'tresorerie-passive': false,
    // Compte de Résultat sections
    'produits': false,
    'charges-exploitation': false,
    'charges-personnel': false,
    'charges-financieres': false,
    'charges-hao': false,
    'impots': false
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Données simulées du bilan
  const bilanActif: BilanActif = {
    immobilisationsIncorporelles: 500000,
    immobilisationsCorporelles: 15000000,
    immobilisationsFinancieres: 2000000,
    totalActifImmobilise: 17500000,
    stocks: 8000000,
    creancesClients: 12000000,
    autresCreances: 3000000,
    tresorerieActif: 5000000,
    totalActifCirculant: 28000000,
    totalActif: 45500000
  };

  const bilanPassif: BilanPassif = {
    capitalSocial: 10000000,
    reserves: 8000000,
    resultatExercice: 3500000,
    capitauxPropres: 21500000,
    emprunts: 10000000,
    dettesFinancieres: 5000000,
    dettesFournisseurs: 7000000,
    autresDettes: 2000000,
    totalPassif: 45500000
  };

  const compteResultat: CompteResultat = {
    chiffreAffaires: 85000000,
    productionVendue: 85000000,
    productionStockee: 2000000,
    productionImmobilisee: 0,
    subventionsExploitation: 500000,
    autresProduitsExploitation: 1500000,
    totalProduitsExploitation: 89000000,
    achatsConsommes: 45000000,
    servicesExterieurs: 12000000,
    chargesPersonnel: 18000000,
    dotationsAmortissements: 3000000,
    autresChargesExploitation: 2000000,
    totalChargesExploitation: 80000000,
    resultatExploitation: 9000000,
    produitsFinanciers: 500000,
    chargesFinancieres: 1500000,
    resultatFinancier: -1000000,
    resultatCourant: 8000000,
    produitsExceptionnels: 200000,
    chargesExceptionnelles: 700000,
    resultatExceptionnel: -500000,
    impotsSocietes: 4000000,
    resultatNet: 3500000
  };

  // Calcul des SIG
  const sig = useMemo<SIG>(() => ({
    margeCommerciale: compteResultat.chiffreAffaires - compteResultat.achatsConsommes,
    productionExercice: compteResultat.productionVendue + compteResultat.productionStockee + compteResultat.productionImmobilisee,
    valeurAjoutee: (compteResultat.chiffreAffaires - compteResultat.achatsConsommes) - compteResultat.servicesExterieurs,
    excedentBrutExploitation: (compteResultat.chiffreAffaires - compteResultat.achatsConsommes - compteResultat.servicesExterieurs) - compteResultat.chargesPersonnel,
    resultatExploitation: compteResultat.resultatExploitation,
    resultatCourant: compteResultat.resultatCourant,
    resultatExceptionnel: compteResultat.resultatExceptionnel,
    resultatNet: compteResultat.resultatNet,
    capaciteAutofinancement: compteResultat.resultatNet + compteResultat.dotationsAmortissements
  }), [compteResultat]);

  // Calcul des ratios
  const ratios = useMemo<RatiosFinanciers>(() => ({
    // Ratios de structure
    autonomieFinanciere: (bilanPassif.capitauxPropres / bilanPassif.totalPassif) * 100,
    endettement: ((bilanPassif.emprunts + bilanPassif.dettesFinancieres) / bilanPassif.capitauxPropres) * 100,
    couvertureEmplois: (bilanPassif.capitauxPropres / bilanActif.totalActifImmobilise) * 100,

    // Ratios de liquidité
    liquiditeGenerale: bilanActif.totalActifCirculant / (bilanPassif.dettesFournisseurs + bilanPassif.autresDettes),
    liquiditeReduite: (bilanActif.totalActifCirculant - bilanActif.stocks) / (bilanPassif.dettesFournisseurs + bilanPassif.autresDettes),
    liquiditeImmediate: bilanActif.tresorerieActif / (bilanPassif.dettesFournisseurs + bilanPassif.autresDettes),

    // Ratios de rentabilité
    rentabiliteCommerciale: (compteResultat.resultatNet / compteResultat.chiffreAffaires) * 100,
    rentabiliteEconomique: (compteResultat.resultatExploitation / bilanActif.totalActif) * 100,
    rentabiliteFinanciere: (compteResultat.resultatNet / bilanPassif.capitauxPropres) * 100,
    roa: (compteResultat.resultatNet / bilanActif.totalActif) * 100,
    roe: (compteResultat.resultatNet / bilanPassif.capitauxPropres) * 100,

    // Ratios d'activité
    rotationStocks: compteResultat.achatsConsommes / bilanActif.stocks,
    delaiReglementClients: (bilanActif.creancesClients / compteResultat.chiffreAffaires) * 360,
    delaiReglementFournisseurs: (bilanPassif.dettesFournisseurs / compteResultat.achatsConsommes) * 360,
    rotationActifs: compteResultat.chiffreAffaires / bilanActif.totalActif
  }), [bilanActif, bilanPassif, compteResultat]);

  // Calcul du Fonds de Roulement, BFR et Trésorerie Nette
  const bilanFonctionnel = useMemo(() => ({
    fondsRoulement: bilanPassif.capitauxPropres + bilanPassif.emprunts - bilanActif.totalActifImmobilise,
    bfr: bilanActif.stocks + bilanActif.creancesClients - bilanPassif.dettesFournisseurs,
    tresorerieNette: bilanActif.tresorerieActif - bilanPassif.dettesFinancieres
  }), [bilanActif, bilanPassif]);

  return (
    <div className="flex flex-col h-full bg-[#ECECEC]">
      {/* En-tête */}
      <div className="bg-[#F0F3F2] border-b border-[#ECECEC] p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <FileText className="w-8 h-8 text-[#6A8A82]" />
            <div>
              <h1 className="text-2xl font-bold text-[#191919]">États Financiers SYSCOHADA</h1>
              <p className="text-sm text-[#191919]/70">Bilan, Compte de Résultat et analyses conformes OHADA</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <select
              value={dateRange.startDate || '2024'}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 text-sm border border-[#ECECEC] rounded-lg"
            >
              <option value="2024">2024</option>
              <option value="2023">2023</option>
              <option value="2022">2022</option>
            </select>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={showComparison}
                onChange={(e) => setShowComparison(e.target.checked)}
                className="rounded border-[#ECECEC] text-[#6A8A82]"
              />
              <span className="text-sm text-[#191919]/70">Comparer avec N-1</span>
            </label>

            <button className="px-4 py-2 text-sm border border-[#ECECEC] rounded-lg hover:bg-[#ECECEC]">
              <Printer className="w-4 h-4 mr-2 inline" />
              Imprimer
            </button>

            <button className="px-4 py-2 text-sm bg-[#6A8A82] text-white rounded-lg hover:bg-[#5A7A72]">
              <Download className="w-4 h-4 mr-2 inline" />
              Exporter
            </button>
          </div>
        </div>

        {/* Navigation Principale - 3 Onglets */}
        <div className="flex space-x-2 mt-6 border-b border-[#ECECEC]">
          <button
            onClick={() => {
              setActiveView('etats-principaux');
              setActiveSubView('bilan');
            }}
            className={`px-6 py-3 text-sm font-medium transition-all ${
              activeView === 'etats-principaux'
                ? 'border-b-2 border-[#6A8A82] text-[#6A8A82]'
                : 'text-[#191919]/70 hover:text-[#191919]/90'
            }`}
          >
            <FileText className="w-4 h-4 mr-2 inline" />
            États Financiers Principaux
          </button>
          <button
            onClick={() => {
              setActiveView('analyses');
              setActiveSubView('sig');
            }}
            className={`px-6 py-3 text-sm font-medium transition-all ${
              activeView === 'analyses'
                ? 'border-b-2 border-[#6A8A82] text-[#6A8A82]'
                : 'text-[#191919]/70 hover:text-[#191919]/90'
            }`}
          >
            <Calculator className="w-4 h-4 mr-2 inline" />
            Analyses Financières
          </button>
          <button
            onClick={() => {
              setActiveView('outils-pilotage');
              setActiveSubView('caf');
            }}
            className={`px-6 py-3 text-sm font-medium transition-all ${
              activeView === 'outils-pilotage'
                ? 'border-b-2 border-[#6A8A82] text-[#6A8A82]'
                : 'text-[#191919]/70 hover:text-[#191919]/90'
            }`}
          >
            <BarChart3 className="w-4 h-4 mr-2 inline" />
            Outils de Pilotage
          </button>
        </div>

        {/* Sous-navigation selon l'onglet actif */}
        {activeView === 'etats-principaux' && (
          <div className="flex space-x-1 mt-4 px-2">
            <button
              onClick={() => setActiveSubView('bilan')}
              className={`px-4 py-2 text-sm rounded-lg transition-all ${
                activeSubView === 'bilan'
                  ? 'bg-[#ECECEC] text-[#191919]'
                  : 'text-[#191919]/70 hover:bg-[#ECECEC]'
              }`}
            >
              Bilan Comptable
            </button>
            <button
              onClick={() => setActiveSubView('bilan-fonctionnel')}
              className={`px-4 py-2 text-sm rounded-lg transition-all ${
                activeSubView === 'bilan-fonctionnel'
                  ? 'bg-[#ECECEC] text-[#191919]'
                  : 'text-[#191919]/70 hover:bg-[#ECECEC]'
              }`}
            >
              Bilan Fonctionnel
            </button>
            <button
              onClick={() => setActiveSubView('resultat')}
              className={`px-4 py-2 text-sm rounded-lg transition-all ${
                activeSubView === 'resultat'
                  ? 'bg-[#ECECEC] text-[#191919]'
                  : 'text-[#191919]/70 hover:bg-[#ECECEC]'
              }`}
            >
              Compte de Résultat
            </button>
            <button
              onClick={() => setActiveSubView('tft')}
              className={`px-4 py-2 text-sm rounded-lg transition-all ${
                activeSubView === 'tft'
                  ? 'bg-[#ECECEC] text-[#191919]'
                  : 'text-[#191919]/70 hover:bg-[#ECECEC]'
              }`}
            >
              TFT
            </button>
            <button
              onClick={() => setActiveSubView('tableau-financement')}
              className={`px-4 py-2 text-sm rounded-lg transition-all ${
                activeSubView === 'tableau-financement'
                  ? 'bg-[#ECECEC] text-[#191919]'
                  : 'text-[#191919]/70 hover:bg-[#ECECEC]'
              }`}
            >
              Tableau de Financement
            </button>
          </div>
        )}

        {activeView === 'analyses' && (
          <div className="flex space-x-1 mt-4 px-2">
            <button
              onClick={() => setActiveSubView('sig')}
              className={`px-4 py-2 text-sm rounded-lg transition-all ${
                activeSubView === 'sig'
                  ? 'bg-[#ECECEC] text-[#191919]'
                  : 'text-[#191919]/70 hover:bg-[#ECECEC]'
              }`}
            >
              A. SIG
            </button>
            <button
              onClick={() => setActiveSubView('ratios-structure')}
              className={`px-4 py-2 text-sm rounded-lg transition-all ${
                activeSubView === 'ratios-structure'
                  ? 'bg-[#ECECEC] text-[#191919]'
                  : 'text-[#191919]/70 hover:bg-[#ECECEC]'
              }`}
            >
              B. Structure Financière
            </button>
            <button
              onClick={() => setActiveSubView('ratios-liquidite')}
              className={`px-4 py-2 text-sm rounded-lg transition-all ${
                activeSubView === 'ratios-liquidite'
                  ? 'bg-[#ECECEC] text-[#191919]'
                  : 'text-[#191919]/70 hover:bg-[#ECECEC]'
              }`}
            >
              C. Liquidité & Solvabilité
            </button>
            <button
              onClick={() => setActiveSubView('ratios-rentabilite')}
              className={`px-4 py-2 text-sm rounded-lg transition-all ${
                activeSubView === 'ratios-rentabilite'
                  ? 'bg-[#ECECEC] text-[#191919]'
                  : 'text-[#191919]/70 hover:bg-[#ECECEC]'
              }`}
            >
              D. Rentabilité
            </button>
            <button
              onClick={() => setActiveSubView('ratios-activite')}
              className={`px-4 py-2 text-sm rounded-lg transition-all ${
                activeSubView === 'ratios-activite'
                  ? 'bg-[#ECECEC] text-[#191919]'
                  : 'text-[#191919]/70 hover:bg-[#ECECEC]'
              }`}
            >
              E. Activité (Rotation)
            </button>
          </div>
        )}

        {activeView === 'outils-pilotage' && (
          <div className="flex space-x-1 mt-4 px-2">
            <button
              onClick={() => setActiveSubView('caf')}
              className={`px-4 py-2 text-sm rounded-lg transition-all ${
                activeSubView === 'caf'
                  ? 'bg-[#ECECEC] text-[#191919]'
                  : 'text-[#191919]/70 hover:bg-[#ECECEC]'
              }`}
            >
              CAF
            </button>
            <button
              onClick={() => setActiveSubView('flux-tresorerie')}
              className={`px-4 py-2 text-sm rounded-lg transition-all ${
                activeSubView === 'flux-tresorerie'
                  ? 'bg-[#ECECEC] text-[#191919]'
                  : 'text-[#191919]/70 hover:bg-[#ECECEC]'
              }`}
            >
              Flux de Trésorerie
            </button>
            <button
              onClick={() => setActiveSubView('analyse-sectorielle')}
              className={`px-4 py-2 text-sm rounded-lg transition-all ${
                activeSubView === 'analyse-sectorielle'
                  ? 'bg-[#ECECEC] text-[#191919]'
                  : 'text-[#191919]/70 hover:bg-[#ECECEC]'
              }`}
            >
              Analyse Sectorielle
            </button>
            <button
              onClick={() => setActiveSubView('dashboard')}
              className={`px-4 py-2 text-sm rounded-lg transition-all ${
                activeSubView === 'dashboard'
                  ? 'bg-[#ECECEC] text-[#191919]'
                  : 'text-[#191919]/70 hover:bg-[#ECECEC]'
              }`}
            >
              Tableaux de Bord
            </button>
            <button
              onClick={() => setActiveSubView('alertes')}
              className={`px-4 py-2 text-sm rounded-lg transition-all ${
                activeSubView === 'alertes'
                  ? 'bg-[#ECECEC] text-[#191919]'
                  : 'text-[#191919]/70 hover:bg-[#ECECEC]'
              }`}
            >
              Alertes & Recommandations
            </button>
          </div>
        )}
      </div>

      {/* États Financiers Principaux */}
      {activeView === 'etats-principaux' && (
        <>
          {/* Bilan Comptable */}
      {/* Bilan Comptable SYSCOHADA */}
      {activeSubView === 'bilan' && (
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* En-tête du Bilan */}
          <div className="bg-[#F0F3F2] rounded-lg border border-[#ECECEC] p-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-[#191919]">BILAN AU 31 DÉCEMBRE 2024</h2>
              <p className="text-lg text-gray-700 mt-2">ENTREPRISE XYZ SARL</p>
              <p className="text-sm text-[#191919]/70">Exercice clos le 31/12/2024</p>
              <p className="text-sm text-gray-700 mt-1">(Montants en FCFA)</p>
            </div>

            {/* Tableau ACTIF */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-white bg-[#6A8A82] p-3 rounded-t-lg">ACTIF</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-[#ECECEC]">
                  <thead className="bg-[#ECECEC]">
                    <tr>
                      <th className="border border-[#ECECEC] px-2 py-2 text-center text-xs font-semibold text-gray-700 w-10"></th>
                      <th className="border border-[#ECECEC] px-4 py-2 text-left text-xs font-semibold text-gray-700">N° Compte</th>
                      <th className="border border-[#ECECEC] px-4 py-2 text-left text-xs font-semibold text-gray-700">LIBELLÉ</th>
                      <th className="border border-[#ECECEC] px-4 py-2 text-center text-xs font-semibold text-gray-700">Note</th>
                      <th className="border border-[#ECECEC] px-4 py-2 text-right text-xs font-semibold text-gray-700">Brut</th>
                      <th className="border border-[#ECECEC] px-4 py-2 text-right text-xs font-semibold text-gray-700">Amort/Prov</th>
                      <th className="border border-[#ECECEC] px-4 py-2 text-right text-xs font-semibold text-gray-700">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* ACTIF IMMOBILISÉ */}
                    <tr className="bg-[#6A8A82]/10">
                      <td className="border border-[#ECECEC] px-2 py-2 text-center">
                        <button
                          onClick={() => toggleSection('actif-immobilise')}
                          className="hover:bg-[#6A8A82]/20 rounded p-1"
                        >
                          {expandedSections['actif-immobilise'] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="border border-[#ECECEC] px-4 py-2 font-semibold">2</td>
                      <td className="border border-[#ECECEC] px-4 py-2 font-semibold" colSpan={5}>ACTIF IMMOBILISÉ</td>
                    </tr>
                    {expandedSections['actif-immobilise'] && (
                      <>
                        <tr>
                          <td className="border border-[#ECECEC] px-2 py-2"></td>
                          <td className="border border-[#ECECEC] px-4 py-2 text-[#191919]/70">21</td>
                          <td className="border border-[#ECECEC] px-4 py-2">Immobilisations incorporelles</td>
                          <td className="border border-[#ECECEC] px-4 py-2 text-center">3</td>
                          <td className="border border-[#ECECEC] px-4 py-2 text-right">5 000 000</td>
                          <td className="border border-[#ECECEC] px-4 py-2 text-right">1 000 000</td>
                          <td className="border border-[#ECECEC] px-4 py-2 text-right font-semibold">4 000 000</td>
                        </tr>
                        <tr className="bg-[#ECECEC]">
                          <td className="border border-[#ECECEC] px-2 py-1"></td>
                          <td className="border border-[#ECECEC] px-4 py-1 text-gray-700 pl-8">211</td>
                          <td className="border border-[#ECECEC] px-4 py-1 text-sm pl-8">Frais de recherche et développement</td>
                          <td className="border border-[#ECECEC] px-4 py-1 text-center"></td>
                          <td className="border border-[#ECECEC] px-4 py-1 text-right text-sm">2 000 000</td>
                          <td className="border border-[#ECECEC] px-4 py-1 text-right text-sm">400 000</td>
                          <td className="border border-[#ECECEC] px-4 py-1 text-right text-sm">1 600 000</td>
                        </tr>
                        <tr className="bg-[#ECECEC]">
                          <td className="border border-[#ECECEC] px-2 py-1"></td>
                          <td className="border border-[#ECECEC] px-4 py-1 text-gray-700 pl-8">212</td>
                          <td className="border border-[#ECECEC] px-4 py-1 text-sm pl-8">Brevets, licences</td>
                          <td className="border border-[#ECECEC] px-4 py-1 text-center"></td>
                          <td className="border border-[#ECECEC] px-4 py-1 text-right text-sm">3 000 000</td>
                          <td className="border border-[#ECECEC] px-4 py-1 text-right text-sm">600 000</td>
                          <td className="border border-[#ECECEC] px-4 py-1 text-right text-sm">2 400 000</td>
                        </tr>
                      </>
                    )}
                    {!expandedSections['actif-immobilise'] && (
                      <tr>
                        <td className="border border-[#ECECEC] px-2 py-2"></td>
                        <td className="border border-[#ECECEC] px-4 py-2">21</td>
                        <td className="border border-[#ECECEC] px-4 py-2">Immobilisations incorporelles</td>
                        <td className="border border-[#ECECEC] px-4 py-2 text-center">3</td>
                        <td className="border border-[#ECECEC] px-4 py-2 text-right">5 000 000</td>
                        <td className="border border-[#ECECEC] px-4 py-2 text-right">1 000 000</td>
                        <td className="border border-[#ECECEC] px-4 py-2 text-right font-semibold">4 000 000</td>
                      </tr>
                    )}
                    <tr>
                      <td className="border border-[#ECECEC] px-2 py-2"></td>
                      <td className="border border-[#ECECEC] px-4 py-2">22-24</td>
                      <td className="border border-[#ECECEC] px-4 py-2">Immobilisations corporelles</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-center">3</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right">45 000 000</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right">8 000 000</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right font-semibold">37 000 000</td>
                    </tr>
                    <tr>
                      <td className="border border-[#ECECEC] px-2 py-2"></td>
                      <td className="border border-[#ECECEC] px-4 py-2">26-27</td>
                      <td className="border border-[#ECECEC] px-4 py-2">Immobilisations financières</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-center">4</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right">3 000 000</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right">0</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right font-semibold">3 000 000</td>
                    </tr>
                    <tr className="bg-[#6A8A82]/20 font-semibold">
                      <td className="border border-[#ECECEC] px-2 py-2"></td>
                      <td className="border border-[#ECECEC] px-4 py-2">2</td>
                      <td className="border border-[#ECECEC] px-4 py-2">TOTAL ACTIF IMMOBILISÉ</td>
                      <td className="border border-[#ECECEC] px-4 py-2"></td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right">53 000 000</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right">9 000 000</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right text-[#6A8A82]">44 000 000</td>
                    </tr>

                    {/* ACTIF CIRCULANT */}
                    <tr className="bg-[#6A8A82]/10">
                      <td className="border border-[#ECECEC] px-2 py-2 text-center">
                        <button
                          onClick={() => toggleSection('actif-circulant')}
                          className="hover:bg-[#6A8A82]/20 rounded p-1"
                        >
                          {expandedSections['actif-circulant'] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="border border-[#ECECEC] px-4 py-2 font-semibold">3-4</td>
                      <td className="border border-[#ECECEC] px-4 py-2 font-semibold" colSpan={5}>ACTIF CIRCULANT</td>
                    </tr>
                    <tr>
                      <td className="border border-[#ECECEC] px-2 py-2"></td>
                      <td className="border border-[#ECECEC] px-4 py-2">48</td>
                      <td className="border border-[#ECECEC] px-4 py-2">Actif circulant HAO</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-center"></td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right">0</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right">0</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right font-semibold">0</td>
                    </tr>
                    <tr>
                      <td className="border border-[#ECECEC] px-2 py-2"></td>
                      <td className="border border-[#ECECEC] px-4 py-2">3</td>
                      <td className="border border-[#ECECEC] px-4 py-2">Stocks et encours</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-center">5</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right">23 500 000</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right">500 000</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right font-semibold">23 000 000</td>
                    </tr>
                    <tr>
                      <td className="border border-[#ECECEC] px-2 py-2"></td>
                      <td className="border border-[#ECECEC] px-4 py-2">4</td>
                      <td className="border border-[#ECECEC] px-4 py-2">Créances et emplois assimilés</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-center">6</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right">18 000 000</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right">1 000 000</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right font-semibold">17 000 000</td>
                    </tr>
                    <tr className="bg-[#6A8A82]/20 font-semibold">
                      <td className="border border-[#ECECEC] px-2 py-2"></td>
                      <td className="border border-[#ECECEC] px-4 py-2">3-4</td>
                      <td className="border border-[#ECECEC] px-4 py-2">TOTAL ACTIF CIRCULANT</td>
                      <td className="border border-[#ECECEC] px-4 py-2"></td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right">41 500 000</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right">1 500 000</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right text-[#6A8A82]">40 000 000</td>
                    </tr>

                    {/* TRÉSORERIE-ACTIF */}
                    <tr className="bg-[#6A8A82]/5">
                      <td className="border border-[#ECECEC] px-2 py-2 text-center">
                        <button
                          onClick={() => toggleSection('tresorerie-actif')}
                          className="hover:bg-[#6A8A82]/20 rounded p-1"
                        >
                          {expandedSections['tresorerie-actif'] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="border border-[#ECECEC] px-4 py-2 font-semibold">5</td>
                      <td className="border border-[#ECECEC] px-4 py-2 font-semibold" colSpan={5}>TRÉSORERIE-ACTIF</td>
                    </tr>
                    <tr>
                      <td className="border border-[#ECECEC] px-2 py-2"></td>
                      <td className="border border-[#ECECEC] px-4 py-2">50</td>
                      <td className="border border-[#ECECEC] px-4 py-2">Titres de placement</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-center"></td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right">2 000 000</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right">0</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right font-semibold">2 000 000</td>
                    </tr>
                    <tr>
                      <td className="border border-[#ECECEC] px-2 py-2"></td>
                      <td className="border border-[#ECECEC] px-4 py-2">51</td>
                      <td className="border border-[#ECECEC] px-4 py-2">Valeurs à encaisser</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-center"></td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right">1 500 000</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right">0</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right font-semibold">1 500 000</td>
                    </tr>
                    <tr>
                      <td className="border border-[#ECECEC] px-2 py-2"></td>
                      <td className="border border-[#ECECEC] px-4 py-2">52-57</td>
                      <td className="border border-[#ECECEC] px-4 py-2">Banques, chèques postaux, caisse</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-center">7</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right">6 500 000</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right">0</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right font-semibold">6 500 000</td>
                    </tr>
                    <tr className="bg-[#6A8A82]/15 font-semibold">
                      <td className="border border-[#ECECEC] px-2 py-2"></td>
                      <td className="border border-[#ECECEC] px-4 py-2">5</td>
                      <td className="border border-[#ECECEC] px-4 py-2">TOTAL TRÉSORERIE-ACTIF</td>
                      <td className="border border-[#ECECEC] px-4 py-2"></td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right">10 000 000</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right">0</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right text-[#6A8A82]">10 000 000</td>
                    </tr>

                    {/* Écart de conversion */}
                    <tr>
                      <td className="border border-[#ECECEC] px-2 py-2"></td>
                      <td className="border border-[#ECECEC] px-4 py-2">478</td>
                      <td className="border border-[#ECECEC] px-4 py-2">Écart de conversion-Actif</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-center">12</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right">0</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right">0</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right font-semibold">0</td>
                    </tr>

                    {/* TOTAL GÉNÉRAL ACTIF */}
                    <tr className="bg-gray-200 font-bold text-lg">
                      <td className="border border-[#ECECEC] px-2 py-3"></td>
                      <td className="border border-[#ECECEC] px-4 py-3"></td>
                      <td className="border border-[#ECECEC] px-4 py-3">TOTAL GÉNÉRAL ACTIF</td>
                      <td className="border border-[#ECECEC] px-4 py-3"></td>
                      <td className="border border-[#ECECEC] px-4 py-3 text-right">104 500 000</td>
                      <td className="border border-[#ECECEC] px-4 py-3 text-right">10 500 000</td>
                      <td className="border border-[#ECECEC] px-4 py-3 text-right text-[#6A8A82]">94 000 000</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tableau PASSIF */}
            <div>
              <h3 className="text-lg font-bold text-white bg-[#6A8A82] p-3 rounded-t-lg">PASSIF</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-[#ECECEC]">
                  <thead className="bg-[#ECECEC]">
                    <tr>
                      <th className="border border-[#ECECEC] px-2 py-2 text-center text-xs font-semibold text-gray-700 w-10"></th>
                      <th className="border border-[#ECECEC] px-4 py-2 text-left text-xs font-semibold text-gray-700">N° Compte</th>
                      <th className="border border-[#ECECEC] px-4 py-2 text-left text-xs font-semibold text-gray-700">LIBELLÉ</th>
                      <th className="border border-[#ECECEC] px-4 py-2 text-center text-xs font-semibold text-gray-700">Note</th>
                      <th className="border border-[#ECECEC] px-4 py-2 text-right text-xs font-semibold text-gray-700">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* CAPITAUX PROPRES */}
                    <tr className="bg-[#6A8A82]/10">
                      <td className="border border-[#ECECEC] px-2 py-2 text-center">
                        <button
                          onClick={() => toggleSection('capitaux-propres')}
                          className="hover:bg-[#6A8A82]/20 rounded p-1"
                        >
                          {expandedSections['capitaux-propres'] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="border border-[#ECECEC] px-4 py-2 font-semibold">1</td>
                      <td className="border border-[#ECECEC] px-4 py-2 font-semibold" colSpan={3}>CAPITAUX PROPRES ET RESSOURCES ASSIMILÉES</td>
                    </tr>
                    <tr>
                      <td className="border border-[#ECECEC] px-2 py-2"></td>
                      <td className="border border-[#ECECEC] px-4 py-2">10</td>
                      <td className="border border-[#ECECEC] px-4 py-2">Capital</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-center">10</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right font-semibold">50 000 000</td>
                    </tr>
                    <tr>
                      <td className="border border-[#ECECEC] px-2 py-2"></td>
                      <td className="border border-[#ECECEC] px-4 py-2">105</td>
                      <td className="border border-[#ECECEC] px-4 py-2">Primes liées au capital social</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-center"></td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right font-semibold">0</td>
                    </tr>
                    <tr>
                      <td className="border border-[#ECECEC] px-2 py-2"></td>
                      <td className="border border-[#ECECEC] px-4 py-2">106</td>
                      <td className="border border-[#ECECEC] px-4 py-2">Écarts de réévaluation</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-center"></td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right font-semibold">0</td>
                    </tr>
                    <tr>
                      <td className="border border-[#ECECEC] px-2 py-2"></td>
                      <td className="border border-[#ECECEC] px-4 py-2">11</td>
                      <td className="border border-[#ECECEC] px-4 py-2">Réserves indisponibles</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-center"></td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right font-semibold">5 000 000</td>
                    </tr>
                    <tr>
                      <td className="border border-[#ECECEC] px-2 py-2"></td>
                      <td className="border border-[#ECECEC] px-4 py-2">118</td>
                      <td className="border border-[#ECECEC] px-4 py-2">Réserves libres</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-center"></td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right font-semibold">3 000 000</td>
                    </tr>
                    <tr>
                      <td className="border border-[#ECECEC] px-2 py-2"></td>
                      <td className="border border-[#ECECEC] px-4 py-2">12</td>
                      <td className="border border-[#ECECEC] px-4 py-2">Report à nouveau</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-center"></td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right font-semibold">2 000 000</td>
                    </tr>
                    <tr>
                      <td className="border border-[#ECECEC] px-2 py-2"></td>
                      <td className="border border-[#ECECEC] px-4 py-2">13</td>
                      <td className="border border-[#ECECEC] px-4 py-2">Résultat net de l'exercice</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-center"></td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right font-semibold text-[#6A8A82]">8 500 000</td>
                    </tr>
                    <tr className="bg-[#6A8A82]/20 font-semibold">
                      <td className="border border-[#ECECEC] px-2 py-2"></td>
                      <td className="border border-[#ECECEC] px-4 py-2">1</td>
                      <td className="border border-[#ECECEC] px-4 py-2">TOTAL CAPITAUX PROPRES</td>
                      <td className="border border-[#ECECEC] px-4 py-2"></td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right text-[#6A8A82]">68 500 000</td>
                    </tr>

                    {/* DETTES FINANCIÈRES */}
                    <tr className="bg-[#6A8A82]/5">
                      <td className="border border-[#ECECEC] px-2 py-2 text-center">
                        <button
                          onClick={() => toggleSection('dettes-financieres')}
                          className="hover:bg-[#6A8A82]/20 rounded p-1"
                        >
                          {expandedSections['dettes-financieres'] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="border border-[#ECECEC] px-4 py-2 font-semibold">16-17</td>
                      <td className="border border-[#ECECEC] px-4 py-2 font-semibold" colSpan={3}>DETTES FINANCIÈRES ET RESSOURCES ASSIMILÉES</td>
                    </tr>
                    <tr>
                      <td className="border border-[#ECECEC] px-4 py-2">GA</td>
                      <td className="border border-[#ECECEC] px-4 py-2">Emprunts et dettes financières</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-center">11</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right font-semibold">13 000 000</td>
                    </tr>
                    <tr>
                      <td className="border border-[#ECECEC] px-4 py-2">GB</td>
                      <td className="border border-[#ECECEC] px-4 py-2">Dettes de crédit-bail</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-center"></td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right font-semibold">0</td>
                    </tr>
                    <tr>
                      <td className="border border-[#ECECEC] px-4 py-2">GC</td>
                      <td className="border border-[#ECECEC] px-4 py-2">Provisions financières pour risques et charges</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-center"></td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right font-semibold">500 000</td>
                    </tr>
                    <tr className="bg-[#6A8A82]/15 font-semibold">
                      <td className="border border-[#ECECEC] px-4 py-2">GZ</td>
                      <td className="border border-[#ECECEC] px-4 py-2">TOTAL DETTES FINANCIÈRES</td>
                      <td className="border border-[#ECECEC] px-4 py-2"></td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right text-[#6A8A82]">13 500 000</td>
                    </tr>

                    {/* PASSIF CIRCULANT */}
                    <tr className="bg-[#6A8A82]/5">
                      <td className="border border-[#ECECEC] px-2 py-2 text-center">
                        <button
                          onClick={() => toggleSection('passif-circulant')}
                          className="hover:bg-[#6A8A82]/20 rounded p-1"
                        >
                          {expandedSections['passif-circulant'] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="border border-[#ECECEC] px-4 py-2 font-semibold">4</td>
                      <td className="border border-[#ECECEC] px-4 py-2 font-semibold" colSpan={3}>PASSIF CIRCULANT</td>
                    </tr>
                    <tr>
                      <td className="border border-[#ECECEC] px-4 py-2">HA</td>
                      <td className="border border-[#ECECEC] px-4 py-2">Dettes circulantes HAO</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-center"></td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right font-semibold">0</td>
                    </tr>
                    <tr>
                      <td className="border border-[#ECECEC] px-4 py-2">HB</td>
                      <td className="border border-[#ECECEC] px-4 py-2">Clients, avances reçues</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-center"></td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right font-semibold">1 000 000</td>
                    </tr>
                    <tr>
                      <td className="border border-[#ECECEC] px-4 py-2">HC</td>
                      <td className="border border-[#ECECEC] px-4 py-2">Fournisseurs d'exploitation</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-center">8</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right font-semibold">7 000 000</td>
                    </tr>
                    <tr>
                      <td className="border border-[#ECECEC] px-4 py-2">HD</td>
                      <td className="border border-[#ECECEC] px-4 py-2">Dettes fiscales et sociales</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-center">9</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right font-semibold">4 000 000</td>
                    </tr>
                    <tr className="bg-[#6A8A82]/15 font-semibold">
                      <td className="border border-[#ECECEC] px-4 py-2">HZ</td>
                      <td className="border border-[#ECECEC] px-4 py-2">TOTAL PASSIF CIRCULANT</td>
                      <td className="border border-[#ECECEC] px-4 py-2"></td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right text-[#6A8A82]">12 000 000</td>
                    </tr>

                    {/* TRÉSORERIE-PASSIF */}
                    <tr className="bg-[#6A8A82]/5">
                      <td className="border border-[#ECECEC] px-2 py-2 text-center">
                        <button
                          onClick={() => toggleSection('tresorerie-passif')}
                          className="hover:bg-[#6A8A82]/20 rounded p-1"
                        >
                          {expandedSections['tresorerie-passif'] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="border border-[#ECECEC] px-4 py-2 font-semibold">52</td>
                      <td className="border border-[#ECECEC] px-4 py-2 font-semibold" colSpan={3}>TRÉSORERIE-PASSIF</td>
                    </tr>
                    <tr>
                      <td className="border border-[#ECECEC] px-4 py-2">IA</td>
                      <td className="border border-[#ECECEC] px-4 py-2">Banques, crédits d'escompte</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-center"></td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right font-semibold">0</td>
                    </tr>
                    <tr>
                      <td className="border border-[#ECECEC] px-4 py-2">IB</td>
                      <td className="border border-[#ECECEC] px-4 py-2">Banques, établissements financiers et crédits de trésorerie</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-center"></td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right font-semibold">0</td>
                    </tr>
                    <tr className="bg-[#6A8A82]/15 font-semibold">
                      <td className="border border-[#ECECEC] px-4 py-2">IZ</td>
                      <td className="border border-[#ECECEC] px-4 py-2">TOTAL TRÉSORERIE-PASSIF</td>
                      <td className="border border-[#ECECEC] px-4 py-2"></td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right text-[#6A8A82]">0</td>
                    </tr>

                    {/* Écart de conversion */}
                    <tr>
                      <td className="border border-[#ECECEC] px-4 py-2">J</td>
                      <td className="border border-[#ECECEC] px-4 py-2">Écart de conversion-Passif</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-center">12</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right font-semibold">0</td>
                    </tr>

                    {/* TOTAL GÉNÉRAL PASSIF */}
                    <tr className="bg-gray-200 font-bold text-lg">
                      <td className="border border-[#ECECEC] px-4 py-3">K</td>
                      <td className="border border-[#ECECEC] px-4 py-3">TOTAL GÉNÉRAL PASSIF</td>
                      <td className="border border-[#ECECEC] px-4 py-3"></td>
                      <td className="border border-[#ECECEC] px-4 py-3 text-right text-[#6A8A82]">94 000 000</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bilan Fonctionnel SYSCOHADA */}
      {activeSubView === 'bilan-fonctionnel' && (
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* En-tête du Bilan Fonctionnel */}
          <div className="bg-[#F0F3F2] rounded-lg border border-[#ECECEC] p-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-[#191919]">BILAN FONCTIONNEL</h2>
              <p className="text-lg text-gray-700 mt-2">ENTREPRISE XYZ SARL</p>
              <p className="text-sm text-[#191919]/70">Au 31 décembre 2024</p>
              <p className="text-sm text-gray-700 mt-1">(Montants en milliers de FCFA)</p>

              {/* Boutons pour déplier/replier tous les éléments */}
              <div className="flex justify-center gap-4 mt-4">
                <button
                  onClick={() => {
                    const allExpanded = {
                      'emplois-stables': true,
                      'ace': true,
                      'ache': true,
                      'tresorerie-active': true,
                      'ressources-stables': true,
                      'pce': true,
                      'pche': true,
                      'tresorerie-passive': true
                    };
                    setExpandedSections(prev => ({ ...prev, ...allExpanded }));
                  }}
                  className="px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#5A7A72] transition-colors text-sm flex items-center gap-2"
                >
                  <ChevronDown className="w-4 h-4" />
                  Déplier tout
                </button>
                <button
                  onClick={() => {
                    const allCollapsed = {
                      'emplois-stables': false,
                      'ace': false,
                      'ache': false,
                      'tresorerie-active': false,
                      'ressources-stables': false,
                      'pce': false,
                      'pche': false,
                      'tresorerie-passive': false
                    };
                    setExpandedSections(prev => ({ ...prev, ...allCollapsed }));
                  }}
                  className="px-4 py-2 border border-[#6A8A82] text-[#6A8A82] rounded-lg hover:bg-[#6A8A82]/10 transition-colors text-sm flex items-center gap-2"
                >
                  <ChevronRight className="w-4 h-4" />
                  Replier tout
                </button>
              </div>
            </div>

            {/* Tableau EMPLOIS */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-white bg-[#6A8A82] p-3 rounded-t-lg">EMPLOIS</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-[#ECECEC]">
                  <thead className="bg-[#ECECEC]">
                    <tr>
                      <th className="border border-[#ECECEC] px-4 py-2 text-left text-xs font-semibold text-gray-700">LIBELLÉ</th>
                      <th className="border border-[#ECECEC] px-4 py-2 text-right text-xs font-semibold text-gray-700">Montant</th>
                      <th className="border border-[#ECECEC] px-4 py-2 text-right text-xs font-semibold text-gray-700">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* EMPLOIS STABLES */}
                    <tr
                      role="button"
                      tabIndex={0}
                      className="bg-[#6A8A82]/10 cursor-pointer hover:bg-[#6A8A82]/20"
                      onClick={() => toggleSection('emplois-stables')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleSection('emplois-stables');
                        }
                      }}
                      aria-label="Afficher ou masquer la section Emplois Stables"
                      aria-expanded={expandedSections['emplois-stables']}
                    >
                      <td className="border border-[#ECECEC] px-4 py-2 font-semibold flex items-center">
                        {expandedSections['emplois-stables'] ? (
                          <ChevronDown className="w-4 h-4 mr-2" />
                        ) : (
                          <ChevronRight className="w-4 h-4 mr-2" />
                        )}
                        EMPLOIS STABLES
                      </td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right"></td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right"></td>
                    </tr>
                    {expandedSections['emplois-stables'] && (
                      <>
                        <tr>
                          <td className="border border-[#ECECEC] px-4 py-2 pl-8">Immobilisations incorporelles brutes</td>
                          <td className="border border-[#ECECEC] px-4 py-2 text-right">5 000</td>
                          <td className="border border-[#ECECEC] px-4 py-2 text-right">4.3%</td>
                        </tr>
                        <tr>
                          <td className="border border-[#ECECEC] px-4 py-2 pl-8">Immobilisations corporelles brutes</td>
                          <td className="border border-[#ECECEC] px-4 py-2 text-right">45 000</td>
                          <td className="border border-[#ECECEC] px-4 py-2 text-right">38.5%</td>
                        </tr>
                        <tr>
                          <td className="border border-[#ECECEC] px-4 py-2 pl-8">Immobilisations financières</td>
                          <td className="border border-[#ECECEC] px-4 py-2 text-right">3 000</td>
                          <td className="border border-[#ECECEC] px-4 py-2 text-right">2.6%</td>
                        </tr>
                      </>
                    )}
                    <tr className="bg-[#6A8A82]/20 font-semibold">
                      <td className="border border-[#ECECEC] px-4 py-2">Total Emplois Stables</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right text-[#6A8A82]">53 000</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right">45.3%</td>
                    </tr>

                    {/* ACTIF CIRCULANT D'EXPLOITATION */}
                    <tr
                      role="button"
                      tabIndex={0}
                      className="bg-[#6A8A82]/10 cursor-pointer hover:bg-[#6A8A82]/20"
                      onClick={() => toggleSection('ace')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleSection('ace');
                        }
                      }}
                      aria-label="Afficher ou masquer la section Actif Circulant d'Exploitation"
                      aria-expanded={expandedSections['ace']}
                    >
                      <td className="border border-[#ECECEC] px-4 py-2 font-semibold flex items-center">
                        {expandedSections['ace'] ? (
                          <ChevronDown className="w-4 h-4 mr-2" />
                        ) : (
                          <ChevronRight className="w-4 h-4 mr-2" />
                        )}
                        ACTIF CIRCULANT D'EXPLOITATION (ACE)
                      </td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right"></td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right"></td>
                    </tr>
                    {expandedSections['ace'] && (
                      <>
                        <tr>
                          <td className="border border-[#ECECEC] px-4 py-2 pl-8">Stocks et encours</td>
                          <td className="border border-[#ECECEC] px-4 py-2 text-right">23 500</td>
                          <td className="border border-[#ECECEC] px-4 py-2 text-right">20.1%</td>
                        </tr>
                        <tr>
                          <td className="border border-[#ECECEC] px-4 py-2 pl-8">Créances clients</td>
                          <td className="border border-[#ECECEC] px-4 py-2 text-right">15 000</td>
                          <td className="border border-[#ECECEC] px-4 py-2 text-right">12.8%</td>
                        </tr>
                        <tr>
                          <td className="border border-[#ECECEC] px-4 py-2 pl-8">Autres créances d'exploitation</td>
                          <td className="border border-[#ECECEC] px-4 py-2 text-right">2 000</td>
                          <td className="border border-[#ECECEC] px-4 py-2 text-right">1.7%</td>
                        </tr>
                      </>
                    )}
                    <tr className="bg-[#6A8A82]/20 font-semibold">
                      <td className="border border-[#ECECEC] px-4 py-2">Total ACE</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right text-[#6A8A82]">40 500</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right">34.6%</td>
                    </tr>

                    {/* ACTIF CIRCULANT HORS EXPLOITATION */}
                    <tr
                      role="button"
                      tabIndex={0}
                      className="bg-[#6A8A82]/10 cursor-pointer hover:bg-[#6A8A82]/20"
                      onClick={() => toggleSection('ache')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleSection('ache');
                        }
                      }}
                      aria-label="Afficher ou masquer la section Actif Circulant Hors Exploitation"
                      aria-expanded={expandedSections['ache']}
                    >
                      <td className="border border-[#ECECEC] px-4 py-2 font-semibold flex items-center">
                        {expandedSections['ache'] ? (
                          <ChevronDown className="w-4 h-4 mr-2" />
                        ) : (
                          <ChevronRight className="w-4 h-4 mr-2" />
                        )}
                        ACTIF CIRCULANT HORS EXPLOITATION (ACHE)
                      </td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right"></td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right"></td>
                    </tr>
                    {expandedSections['ache'] && (
                      <>
                        <tr>
                          <td className="border border-[#ECECEC] px-4 py-2 pl-8">Créances diverses</td>
                          <td className="border border-[#ECECEC] px-4 py-2 text-right">1 000</td>
                          <td className="border border-[#ECECEC] px-4 py-2 text-right">0.9%</td>
                        </tr>
                        <tr>
                          <td className="border border-[#ECECEC] px-4 py-2 pl-8">Valeurs mobilières de placement</td>
                          <td className="border border-[#ECECEC] px-4 py-2 text-right">2 000</td>
                          <td className="border border-[#ECECEC] px-4 py-2 text-right">1.7%</td>
                        </tr>
                      </>
                    )}
                    <tr className="bg-[#6A8A82]/20 font-semibold">
                      <td className="border border-[#ECECEC] px-4 py-2">Total ACHE</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right text-[#6A8A82]">3 000</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right">2.6%</td>
                    </tr>

                    {/* TRÉSORERIE ACTIVE */}
                    <tr
                      role="button"
                      tabIndex={0}
                      className="bg-[#6A8A82]/10 cursor-pointer hover:bg-[#6A8A82]/20"
                      onClick={() => toggleSection('tresorerie-active')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleSection('tresorerie-active');
                        }
                      }}
                      aria-label="Afficher ou masquer la section Trésorerie Active"
                      aria-expanded={expandedSections['tresorerie-active']}
                    >
                      <td className="border border-[#ECECEC] px-4 py-2 font-semibold flex items-center">
                        {expandedSections['tresorerie-active'] ? (
                          <ChevronDown className="w-4 h-4 mr-2" />
                        ) : (
                          <ChevronRight className="w-4 h-4 mr-2" />
                        )}
                        TRÉSORERIE ACTIVE
                      </td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right"></td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right"></td>
                    </tr>
                    {expandedSections['tresorerie-active'] && (
                      <>
                        <tr>
                          <td className="border border-[#ECECEC] px-4 py-2 pl-8">Banques et caisses</td>
                          <td className="border border-[#ECECEC] px-4 py-2 text-right">6 500</td>
                          <td className="border border-[#ECECEC] px-4 py-2 text-right">5.6%</td>
                        </tr>
                        <tr>
                          <td className="border border-[#ECECEC] px-4 py-2 pl-8">Valeurs à encaisser</td>
                          <td className="border border-[#ECECEC] px-4 py-2 text-right">1 500</td>
                          <td className="border border-[#ECECEC] px-4 py-2 text-right">1.3%</td>
                        </tr>
                      </>
                    )}
                    <tr className="bg-[#6A8A82]/20 font-semibold">
                      <td className="border border-[#ECECEC] px-4 py-2">Total Trésorerie Active</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right text-[#6A8A82]">8 000</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right">6.8%</td>
                    </tr>

                    {/* TOTAL EMPLOIS */}
                    <tr className="bg-gray-200 font-bold text-lg">
                      <td className="border border-[#ECECEC] px-4 py-3">TOTAL EMPLOIS</td>
                      <td className="border border-[#ECECEC] px-4 py-3 text-right text-[#6A8A82]">104 500</td>
                      <td className="border border-[#ECECEC] px-4 py-3 text-right">100%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tableau RESSOURCES */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-white bg-[#6A8A82] p-3 rounded-t-lg">RESSOURCES</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-[#ECECEC]">
                  <thead className="bg-[#ECECEC]">
                    <tr>
                      <th className="border border-[#ECECEC] px-4 py-2 text-left text-xs font-semibold text-gray-700">LIBELLÉ</th>
                      <th className="border border-[#ECECEC] px-4 py-2 text-right text-xs font-semibold text-gray-700">Montant</th>
                      <th className="border border-[#ECECEC] px-4 py-2 text-right text-xs font-semibold text-gray-700">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* RESSOURCES STABLES */}
                    <tr
                      role="button"
                      tabIndex={0}
                      className="bg-[#6A8A82]/10 cursor-pointer hover:bg-[#6A8A82]/20"
                      onClick={() => toggleSection('ressources-stables')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleSection('ressources-stables');
                        }
                      }}
                      aria-label="Afficher ou masquer la section Ressources Stables"
                      aria-expanded={expandedSections['ressources-stables']}
                    >
                      <td className="border border-[#ECECEC] px-4 py-2 font-semibold flex items-center">
                        {expandedSections['ressources-stables'] ? (
                          <ChevronDown className="w-4 h-4 mr-2" />
                        ) : (
                          <ChevronRight className="w-4 h-4 mr-2" />
                        )}
                        RESSOURCES STABLES
                      </td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right"></td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right"></td>
                    </tr>
                    {expandedSections['ressources-stables'] && (
                      <>
                        <tr>
                          <td className="border border-[#ECECEC] px-4 py-2 pl-8">Capitaux propres</td>
                          <td className="border border-[#ECECEC] px-4 py-2 text-right">68 500</td>
                          <td className="border border-[#ECECEC] px-4 py-2 text-right">65.6%</td>
                        </tr>
                        <tr>
                          <td className="border border-[#ECECEC] px-4 py-2 pl-8">Amortissements et provisions</td>
                          <td className="border border-[#ECECEC] px-4 py-2 text-right">10 500</td>
                          <td className="border border-[#ECECEC] px-4 py-2 text-right">10.0%</td>
                        </tr>
                        <tr>
                          <td className="border border-[#ECECEC] px-4 py-2 pl-8">Dettes financières</td>
                          <td className="border border-[#ECECEC] px-4 py-2 text-right">13 000</td>
                          <td className="border border-[#ECECEC] px-4 py-2 text-right">12.4%</td>
                        </tr>
                      </>
                    )}
                    <tr className="bg-[#6A8A82]/20 font-semibold">
                      <td className="border border-[#ECECEC] px-4 py-2">Total Ressources Stables</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right text-[#6A8A82]">92 000</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right">88.0%</td>
                    </tr>

                    {/* PASSIF CIRCULANT D'EXPLOITATION */}
                    <tr
                      role="button"
                      tabIndex={0}
                      className="bg-[#6A8A82]/10 cursor-pointer hover:bg-[#6A8A82]/20"
                      onClick={() => toggleSection('pce')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleSection('pce');
                        }
                      }}
                      aria-label="Afficher ou masquer la section Passif Circulant d'Exploitation"
                      aria-expanded={expandedSections['pce']}
                    >
                      <td className="border border-[#ECECEC] px-4 py-2 font-semibold flex items-center">
                        {expandedSections['pce'] ? (
                          <ChevronDown className="w-4 h-4 mr-2" />
                        ) : (
                          <ChevronRight className="w-4 h-4 mr-2" />
                        )}
                        PASSIF CIRCULANT D'EXPLOITATION (PCE)
                      </td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right"></td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right"></td>
                    </tr>
                    {expandedSections['pce'] && (
                      <>
                        <tr>
                          <td className="border border-[#ECECEC] px-4 py-2 pl-8">Fournisseurs d'exploitation</td>
                          <td className="border border-[#ECECEC] px-4 py-2 text-right">7 000</td>
                          <td className="border border-[#ECECEC] px-4 py-2 text-right">6.7%</td>
                        </tr>
                        <tr>
                          <td className="border border-[#ECECEC] px-4 py-2 pl-8">Dettes sociales</td>
                          <td className="border border-[#ECECEC] px-4 py-2 text-right">2 000</td>
                          <td className="border border-[#ECECEC] px-4 py-2 text-right">1.9%</td>
                        </tr>
                        <tr>
                          <td className="border border-[#ECECEC] px-4 py-2 pl-8">Dettes fiscales (exploitation)</td>
                          <td className="border border-[#ECECEC] px-4 py-2 text-right">2 000</td>
                          <td className="border border-[#ECECEC] px-4 py-2 text-right">1.9%</td>
                        </tr>
                        <tr>
                          <td className="border border-[#ECECEC] px-4 py-2 pl-8">Autres dettes d'exploitation</td>
                          <td className="border border-[#ECECEC] px-4 py-2 text-right">1 000</td>
                          <td className="border border-[#ECECEC] px-4 py-2 text-right">1.0%</td>
                        </tr>
                      </>
                    )}
                    <tr className="bg-[#6A8A82]/20 font-semibold">
                      <td className="border border-[#ECECEC] px-4 py-2">Total PCE</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right text-[#6A8A82]">12 000</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right">11.5%</td>
                    </tr>

                    {/* PASSIF CIRCULANT HORS EXPLOITATION */}
                    <tr
                      role="button"
                      tabIndex={0}
                      className="bg-[#6A8A82]/10 cursor-pointer hover:bg-[#6A8A82]/20"
                      onClick={() => toggleSection('pche')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleSection('pche');
                        }
                      }}
                      aria-label="Afficher ou masquer la section Passif Circulant Hors Exploitation"
                      aria-expanded={expandedSections['pche']}
                    >
                      <td className="border border-[#ECECEC] px-4 py-2 font-semibold flex items-center">
                        {expandedSections['pche'] ? (
                          <ChevronDown className="w-4 h-4 mr-2" />
                        ) : (
                          <ChevronRight className="w-4 h-4 mr-2" />
                        )}
                        PASSIF CIRCULANT HORS EXPLOITATION (PCHE)
                      </td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right"></td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right"></td>
                    </tr>
                    {expandedSections['pche'] && (
                      <tr>
                        <td className="border border-[#ECECEC] px-4 py-2 pl-8">Dettes diverses</td>
                        <td className="border border-[#ECECEC] px-4 py-2 text-right">500</td>
                        <td className="border border-[#ECECEC] px-4 py-2 text-right">0.5%</td>
                      </tr>
                    )}
                    <tr className="bg-[#6A8A82]/20 font-semibold">
                      <td className="border border-[#ECECEC] px-4 py-2">Total PCHE</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right text-[#6A8A82]">500</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right">0.5%</td>
                    </tr>

                    {/* TRÉSORERIE PASSIVE */}
                    <tr
                      role="button"
                      tabIndex={0}
                      className="bg-[#6A8A82]/10 cursor-pointer hover:bg-[#6A8A82]/20"
                      onClick={() => toggleSection('tresorerie-passive')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleSection('tresorerie-passive');
                        }
                      }}
                      aria-label="Afficher ou masquer la section Trésorerie Passive"
                      aria-expanded={expandedSections['tresorerie-passive']}
                    >
                      <td className="border border-[#ECECEC] px-4 py-2 font-semibold flex items-center">
                        {expandedSections['tresorerie-passive'] ? (
                          <ChevronDown className="w-4 h-4 mr-2" />
                        ) : (
                          <ChevronRight className="w-4 h-4 mr-2" />
                        )}
                        TRÉSORERIE PASSIVE
                      </td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right"></td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right"></td>
                    </tr>
                    {expandedSections['tresorerie-passive'] && (
                      <tr>
                        <td className="border border-[#ECECEC] px-4 py-2 pl-8">Concours bancaires courants</td>
                        <td className="border border-[#ECECEC] px-4 py-2 text-right">0</td>
                        <td className="border border-[#ECECEC] px-4 py-2 text-right">0.0%</td>
                      </tr>
                    )}
                    <tr className="bg-[#6A8A82]/20 font-semibold">
                      <td className="border border-[#ECECEC] px-4 py-2">Total Trésorerie Passive</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right text-[#6A8A82]">0</td>
                      <td className="border border-[#ECECEC] px-4 py-2 text-right">0.0%</td>
                    </tr>

                    {/* TOTAL RESSOURCES */}
                    <tr className="bg-gray-200 font-bold text-lg">
                      <td className="border border-[#ECECEC] px-4 py-3">TOTAL RESSOURCES</td>
                      <td className="border border-[#ECECEC] px-4 py-3 text-right text-[#6A8A82]">104 500</td>
                      <td className="border border-[#ECECEC] px-4 py-3 text-right">100%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* INDICATEURS D'ÉQUILIBRE FINANCIER */}
            <div className="bg-[#6A8A82]/5 rounded-lg p-6 mb-8">
              <h3 className="text-lg font-bold text-[#191919] mb-4">INDICATEURS D'ÉQUILIBRE FINANCIER</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-[#F0F3F2] rounded-lg p-4 border border-[#6A8A82]/20">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-700">Fonds de Roulement Net Global (FRNG)</span>
                    <span className="text-xl font-bold text-[#6A8A82]">39 000</span>
                  </div>
                  <div className="text-sm text-[#191919]/70">
                    Ressources Stables - Emplois Stables
                  </div>
                  <div className="text-sm text-gray-700 mt-1">
                    92 000 - 53 000
                  </div>
                </div>

                <div className="bg-[#F0F3F2] rounded-lg p-4 border border-[#6A8A82]/20">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-700">Besoin en Fonds de Roulement d'Exploitation (BFRE)</span>
                    <span className="text-xl font-bold text-[#6A8A82]">28 500</span>
                  </div>
                  <div className="text-sm text-[#191919]/70">
                    ACE - PCE
                  </div>
                  <div className="text-sm text-gray-700 mt-1">
                    40 500 - 12 000
                  </div>
                </div>

                <div className="bg-[#F0F3F2] rounded-lg p-4 border border-[#6A8A82]/20">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-700">Besoin en Fonds de Roulement Hors Exploitation (BFRHE)</span>
                    <span className="text-xl font-bold text-[#6A8A82]">2 500</span>
                  </div>
                  <div className="text-sm text-[#191919]/70">
                    ACHE - PCHE
                  </div>
                  <div className="text-sm text-gray-700 mt-1">
                    3 000 - 500
                  </div>
                </div>

                <div className="bg-[#F0F3F2] rounded-lg p-4 border border-[#6A8A82]/20">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-700">Besoin en Fonds de Roulement Total (BFR)</span>
                    <span className="text-xl font-bold text-[#6A8A82]">31 000</span>
                  </div>
                  <div className="text-sm text-[#191919]/70">
                    BFRE + BFRHE
                  </div>
                  <div className="text-sm text-gray-700 mt-1">
                    28 500 + 2 500
                  </div>
                </div>

                <div className="bg-[#F0F3F2] rounded-lg p-4 border border-[#6A8A82]/20">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-700">Trésorerie Nette</span>
                    <span className="text-xl font-bold text-[#6A8A82]">8 000</span>
                  </div>
                  <div className="text-sm text-[#191919]/70">
                    Trésorerie Active - Trésorerie Passive
                  </div>
                  <div className="text-sm text-gray-700 mt-1">
                    8 000 - 0
                  </div>
                </div>

                <div className="bg-[#6A8A82]/10 rounded-lg p-4 border-2 border-[#6A8A82]">
                  <div className="flex items-center mb-2">
                    <CheckCircle className="w-5 h-5 text-[#6A8A82] mr-2" />
                    <span className="font-semibold text-gray-700">Vérification</span>
                  </div>
                  <div className="text-sm text-[#191919]/70">
                    FRNG - BFR = TN
                  </div>
                  <div className="text-sm font-bold text-[#6A8A82] mt-1">
                    39 000 - 31 000 = 8 000 ✓
                  </div>
                </div>
              </div>

              {/* SCHÉMA DE L'ÉQUILIBRE FINANCIER */}
              <div className="bg-[#F0F3F2] rounded-lg p-4 border border-[#6A8A82]/20">
                <h4 className="font-semibold text-gray-700 mb-3">SCHÉMA DE L'ÉQUILIBRE FINANCIER</h4>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="bg-[#6A8A82]/10 px-3 py-2 rounded">
                      <span className="text-sm">Ressources Stables</span>
                      <div className="font-bold text-[#6A8A82]">92 000</div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-700" />
                    <div className="bg-[#6A8A82]/10 px-3 py-2 rounded">
                      <span className="text-sm">Emplois Stables</span>
                      <div className="font-bold text-[#6A8A82]">53 000</div>
                    </div>
                    <span className="text-2xl font-bold text-gray-700">=</span>
                    <div className="bg-[#6A8A82]/20 px-3 py-2 rounded border border-[#6A8A82]">
                      <span className="text-sm font-semibold">FRNG</span>
                      <div className="font-bold text-[#6A8A82]">39 000</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center space-x-4 pt-3 border-t">
                    <div className="bg-[#6A8A82]/20 px-3 py-2 rounded">
                      <span className="text-sm font-semibold">FRNG</span>
                      <div className="font-bold text-[#6A8A82]">39 000</div>
                    </div>
                    <span className="text-2xl font-bold text-gray-700">-</span>
                    <div className="bg-orange-50 px-3 py-2 rounded border border-orange-200">
                      <span className="text-sm font-semibold">BFR</span>
                      <div className="font-bold text-orange-600">31 000</div>
                    </div>
                    <span className="text-2xl font-bold text-gray-700">=</span>
                    <div className="bg-green-50 px-3 py-2 rounded border-2 border-green-500">
                      <span className="text-sm font-semibold">Trésorerie Nette</span>
                      <div className="font-bold text-green-600">8 000</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vue Compte de Résultat SYSCOHADA */}
      {activeSubView === 'resultat' && (
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* En-tête du Compte de Résultat */}
          <div className="bg-[#F0F3F2] rounded-lg border border-[#ECECEC] p-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-[#191919]">COMPTE DE RÉSULTAT</h2>
              <p className="text-lg text-gray-700 mt-2">ENTREPRISE XYZ SARL</p>
              <p className="text-sm text-[#191919]/70">Exercice du 01/01/2024 au 31/12/2024</p>
              <p className="text-sm text-gray-700 mt-1">(Montants en FCFA)</p>

              {/* Boutons pour déplier/replier tous les éléments */}
              <div className="flex justify-center gap-4 mt-4">
                <button
                  onClick={() => {
                    const allExpanded = {
                      'produits': true,
                      'charges-exploitation': true,
                      'charges-personnel': true,
                      'charges-financieres': true,
                      'charges-hao': true,
                      'impots': true
                    };
                    setExpandedSections(prev => ({ ...prev, ...allExpanded }));
                  }}
                  className="px-4 py-2 bg-[#6A8A82] text-white rounded-lg hover:bg-[#5A7A72] transition-colors text-sm flex items-center gap-2"
                >
                  <ChevronDown className="w-4 h-4" />
                  Déplier tout
                </button>
                <button
                  onClick={() => {
                    const allCollapsed = {
                      'produits': false,
                      'charges-exploitation': false,
                      'charges-personnel': false,
                      'charges-financieres': false,
                      'charges-hao': false,
                      'impots': false
                    };
                    setExpandedSections(prev => ({ ...prev, ...allCollapsed }));
                  }}
                  className="px-4 py-2 border border-[#6A8A82] text-[#6A8A82] rounded-lg hover:bg-[#6A8A82]/10 transition-colors text-sm flex items-center gap-2"
                >
                  <ChevronRight className="w-4 h-4" />
                  Replier tout
                </button>
              </div>
            </div>

            {/* Tableau COMPTE DE RÉSULTAT */}
            <div className="overflow-x-auto">
              <table className="min-w-full border border-[#ECECEC]">
                <thead className="bg-[#ECECEC]">
                  <tr>
                    <th className="border border-[#ECECEC] px-4 py-2 text-left text-xs font-semibold text-gray-700 w-16">Réf</th>
                    <th className="border border-[#ECECEC] px-4 py-2 text-left text-xs font-semibold text-gray-700">LIBELLÉS</th>
                    <th className="border border-[#ECECEC] px-4 py-2 text-center text-xs font-semibold text-gray-700 w-16">Note</th>
                    <th className="border border-[#ECECEC] px-4 py-2 text-right text-xs font-semibold text-gray-700">Exercice N</th>
                    <th className="border border-[#ECECEC] px-4 py-2 text-right text-xs font-semibold text-gray-700">Exercice N-1</th>
                  </tr>
                </thead>
                <tbody>
                  {/* SECTION PRODUITS */}
                  <tr className="bg-[#6A8A82]/10 font-bold text-lg">
                    <td className="border border-[#ECECEC] px-4 py-3" colSpan={5}>PRODUITS</td>
                  </tr>

                  <tr>
                    <td className="border border-[#ECECEC] px-4 py-2 font-semibold">TA</td>
                    <td className="border border-[#ECECEC] px-4 py-2">VENTES DE MARCHANDISES</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-center">21</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right font-medium">65 000 000</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right">58 000 000</td>
                  </tr>
                  <tr>
                    <td className="border border-[#ECECEC] px-4 py-2 font-semibold text-[#6A8A82]">RA</td>
                    <td className="border border-[#ECECEC] px-4 py-2">ACHATS DE MARCHANDISES</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-center">22</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right font-medium text-[#6A8A82]">-35 000 000</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right text-[#6A8A82]">-31 000 000</td>
                  </tr>
                  <tr>
                    <td className="border border-[#ECECEC] px-4 py-2 font-semibold text-[#6A8A82]">RB</td>
                    <td className="border border-[#ECECEC] px-4 py-2">Variation de stocks de marchandises</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-center">6</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right font-medium text-[#6A8A82]">-2 000 000</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right">1 500 000</td>
                  </tr>
                  <tr className="bg-[#6A8A82]/20 font-bold">
                    <td className="border border-[#ECECEC] px-4 py-3 text-[#6A8A82]">XA</td>
                    <td className="border border-[#ECECEC] px-4 py-3">MARGE COMMERCIALE (Somme TA à RB)</td>
                    <td className="border border-[#ECECEC] px-4 py-3"></td>
                    <td className="border border-[#ECECEC] px-4 py-3 text-right text-[#6A8A82] font-bold">28 000 000</td>
                    <td className="border border-[#ECECEC] px-4 py-3 text-right font-semibold">28 500 000</td>
                  </tr>

                  <tr>
                    <td className="border border-[#ECECEC] px-4 py-2 font-semibold">TB</td>
                    <td className="border border-[#ECECEC] px-4 py-2">VENTES DE PRODUITS FABRIQUÉS</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-center">21</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right font-medium">0</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right">0</td>
                  </tr>
                  <tr>
                    <td className="border border-[#ECECEC] px-4 py-2 font-semibold">TC</td>
                    <td className="border border-[#ECECEC] px-4 py-2">TRAVAUX, SERVICES VENDUS</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-center">21</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right font-medium">12 000 000</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right">10 000 000</td>
                  </tr>
                  <tr>
                    <td className="border border-[#ECECEC] px-4 py-2 font-semibold">TD</td>
                    <td className="border border-[#ECECEC] px-4 py-2">PRODUCTION STOCKÉE (OU DÉSTOCKAGE)</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-center">6</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right font-medium">0</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right">0</td>
                  </tr>
                  <tr>
                    <td className="border border-[#ECECEC] px-4 py-2 font-semibold">TE</td>
                    <td className="border border-[#ECECEC] px-4 py-2">PRODUCTION IMMOBILISÉE</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-center">21</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right font-medium">0</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right">0</td>
                  </tr>
                  <tr className="bg-[#6A8A82]/20 font-bold">
                    <td className="border border-[#ECECEC] px-4 py-3 text-[#6A8A82]">XB</td>
                    <td className="border border-[#ECECEC] px-4 py-3">PRODUCTION DE L'EXERCICE (TB+TC+TD+TE)</td>
                    <td className="border border-[#ECECEC] px-4 py-3"></td>
                    <td className="border border-[#ECECEC] px-4 py-3 text-right text-[#6A8A82] font-bold">12 000 000</td>
                    <td className="border border-[#ECECEC] px-4 py-3 text-right font-semibold">10 000 000</td>
                  </tr>

                  <tr>
                    <td className="border border-[#ECECEC] px-4 py-2 font-semibold text-[#6A8A82]">RC</td>
                    <td className="border border-[#ECECEC] px-4 py-2">ACHATS DE MATIÈRES PREMIÈRES ET FOURNITURES</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-center">22</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right font-medium text-[#6A8A82]">-3 000 000</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right text-[#6A8A82]">-2 800 000</td>
                  </tr>
                  <tr>
                    <td className="border border-[#ECECEC] px-4 py-2 font-semibold text-[#6A8A82]">RD</td>
                    <td className="border border-[#ECECEC] px-4 py-2">Variation de stocks de matières premières</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-center">6</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right font-medium text-[#6A8A82]">-500 000</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right">200 000</td>
                  </tr>
                  <tr>
                    <td className="border border-[#ECECEC] px-4 py-2 font-semibold text-[#6A8A82]">RE</td>
                    <td className="border border-[#ECECEC] px-4 py-2">AUTRES ACHATS</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-center">22</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right font-medium text-[#6A8A82]">-2 000 000</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right text-[#6A8A82]">-1 800 000</td>
                  </tr>
                  <tr>
                    <td className="border border-[#ECECEC] px-4 py-2 font-semibold text-[#6A8A82]">RF</td>
                    <td className="border border-[#ECECEC] px-4 py-2">Variation de stocks d'autres approvisionnements</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-center">6</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right font-medium">0</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right">0</td>
                  </tr>
                  <tr>
                    <td className="border border-[#ECECEC] px-4 py-2 font-semibold text-[#6A8A82]">RG</td>
                    <td className="border border-[#ECECEC] px-4 py-2">TRANSPORTS</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-center">23</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right font-medium text-[#6A8A82]">-1 500 000</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right text-[#6A8A82]">-1 400 000</td>
                  </tr>
                  <tr>
                    <td className="border border-[#ECECEC] px-4 py-2 font-semibold text-[#6A8A82]">RH</td>
                    <td className="border border-[#ECECEC] px-4 py-2">SERVICES EXTÉRIEURS</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-center">24</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right font-medium text-[#6A8A82]">-3 500 000</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right text-[#6A8A82]">-3 200 000</td>
                  </tr>
                  <tr>
                    <td className="border border-[#ECECEC] px-4 py-2 font-semibold text-[#6A8A82]">RI</td>
                    <td className="border border-[#ECECEC] px-4 py-2">IMPÔTS ET TAXES</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-center">25</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right font-medium text-[#6A8A82]">-1 200 000</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right text-[#6A8A82]">-1 000 000</td>
                  </tr>
                  <tr>
                    <td className="border border-[#ECECEC] px-4 py-2 font-semibold text-[#6A8A82]">RJ</td>
                    <td className="border border-[#ECECEC] px-4 py-2">AUTRES CHARGES</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-center">26</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right font-medium text-[#6A8A82]">-800 000</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right text-[#6A8A82]">-700 000</td>
                  </tr>
                  <tr className="bg-[#6A8A82]/20 font-bold">
                    <td className="border border-[#ECECEC] px-4 py-3 text-[#6A8A82]">XC</td>
                    <td className="border border-[#ECECEC] px-4 py-3">VALEUR AJOUTÉE (XA+XB+RC à RJ)</td>
                    <td className="border border-[#ECECEC] px-4 py-3"></td>
                    <td className="border border-[#ECECEC] px-4 py-3 text-right text-[#6A8A82] font-bold">26 500 000</td>
                    <td className="border border-[#ECECEC] px-4 py-3 text-right font-semibold">27 800 000</td>
                  </tr>

                  <tr>
                    <td className="border border-[#ECECEC] px-4 py-2 font-semibold text-[#6A8A82]">RK</td>
                    <td className="border border-[#ECECEC] px-4 py-2">CHARGES DE PERSONNEL</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-center">27</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right font-medium text-[#6A8A82]">-16 000 000</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right text-[#6A8A82]">-15 000 000</td>
                  </tr>
                  <tr className="bg-[#6A8A82]/20 font-bold">
                    <td className="border border-[#ECECEC] px-4 py-3 text-[#6A8A82]">XD</td>
                    <td className="border border-[#ECECEC] px-4 py-3">EXCÉDENT BRUT D'EXPLOITATION (XC+RK)</td>
                    <td className="border border-[#ECECEC] px-4 py-3"></td>
                    <td className="border border-[#ECECEC] px-4 py-3 text-right text-[#6A8A82] font-bold">10 500 000</td>
                    <td className="border border-[#ECECEC] px-4 py-3 text-right font-semibold">12 800 000</td>
                  </tr>

                  <tr>
                    <td className="border border-[#ECECEC] px-4 py-2 font-semibold">TF</td>
                    <td className="border border-[#ECECEC] px-4 py-2">REPRISES DE PROVISIONS D'EXPLOITATION</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-center">28</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right font-medium">500 000</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right">300 000</td>
                  </tr>
                  <tr>
                    <td className="border border-[#ECECEC] px-4 py-2 font-semibold text-[#6A8A82]">RL</td>
                    <td className="border border-[#ECECEC] px-4 py-2">DOTATIONS AUX AMORTISSEMENTS ET PROVISIONS</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-center">28</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right font-medium text-[#6A8A82]">-2 500 000</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right text-[#6A8A82]">-2 300 000</td>
                  </tr>
                  <tr className="bg-[#6A8A82]/20 font-bold">
                    <td className="border border-[#ECECEC] px-4 py-3 text-[#6A8A82]">XE</td>
                    <td className="border border-[#ECECEC] px-4 py-3">RÉSULTAT D'EXPLOITATION (XD+TF+RL)</td>
                    <td className="border border-[#ECECEC] px-4 py-3"></td>
                    <td className="border border-[#ECECEC] px-4 py-3 text-right text-[#6A8A82] font-bold">8 500 000</td>
                    <td className="border border-[#ECECEC] px-4 py-3 text-right font-semibold">10 800 000</td>
                  </tr>

                  <tr>
                    <td className="border border-[#ECECEC] px-4 py-2 font-semibold">TG</td>
                    <td className="border border-[#ECECEC] px-4 py-2">REVENUS FINANCIERS</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-center">29</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right font-medium">800 000</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right">600 000</td>
                  </tr>
                  <tr>
                    <td className="border border-[#ECECEC] px-4 py-2 font-semibold">TH</td>
                    <td className="border border-[#ECECEC] px-4 py-2">REPRISES DE PROVISIONS FINANCIÈRES</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-center">29</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right font-medium">0</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right">0</td>
                  </tr>
                  <tr>
                    <td className="border border-[#ECECEC] px-4 py-2 font-semibold text-[#6A8A82]">RO</td>
                    <td className="border border-[#ECECEC] px-4 py-2">FRAIS FINANCIERS</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-center">29</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right font-medium text-[#6A8A82]">-1 200 000</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right text-[#6A8A82]">-1 500 000</td>
                  </tr>
                  <tr>
                    <td className="border border-[#ECECEC] px-4 py-2 font-semibold text-[#6A8A82]">RP</td>
                    <td className="border border-[#ECECEC] px-4 py-2">DOTATIONS AUX PROVISIONS FINANCIÈRES</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-center">29</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right font-medium text-[#6A8A82]">-100 000</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right text-[#6A8A82]">-200 000</td>
                  </tr>
                  <tr className="bg-[#6A8A82]/20 font-bold">
                    <td className="border border-[#ECECEC] px-4 py-3 text-[#6A8A82]">XF</td>
                    <td className="border border-[#ECECEC] px-4 py-3">RÉSULTAT FINANCIER (TG+TH+RO+RP)</td>
                    <td className="border border-[#ECECEC] px-4 py-3"></td>
                    <td className="border border-[#ECECEC] px-4 py-3 text-right text-[#6A8A82] font-bold">-500 000</td>
                    <td className="border border-[#ECECEC] px-4 py-3 text-right text-[#6A8A82] font-semibold">-1 100 000</td>
                  </tr>

                  <tr className="bg-[#6A8A82]/20 font-bold">
                    <td className="border border-[#ECECEC] px-4 py-3 text-[#6A8A82]">XG</td>
                    <td className="border border-[#ECECEC] px-4 py-3">RÉSULTAT DES ACTIVITÉS ORDINAIRES (XE+XF)</td>
                    <td className="border border-[#ECECEC] px-4 py-3"></td>
                    <td className="border border-[#ECECEC] px-4 py-3 text-right text-[#6A8A82] font-bold">8 000 000</td>
                    <td className="border border-[#ECECEC] px-4 py-3 text-right font-semibold">9 700 000</td>
                  </tr>

                  <tr>
                    <td className="border border-[#ECECEC] px-4 py-2 font-semibold">TI</td>
                    <td className="border border-[#ECECEC] px-4 py-2">PRODUITS DES CESSIONS D'IMMOBILISATIONS</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-center">30</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right font-medium">2 000 000</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right">0</td>
                  </tr>
                  <tr>
                    <td className="border border-[#ECECEC] px-4 py-2 font-semibold">TJ</td>
                    <td className="border border-[#ECECEC] px-4 py-2">AUTRES PRODUITS HAO</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-center">30</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right font-medium">0</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right">500 000</td>
                  </tr>
                  <tr>
                    <td className="border border-[#ECECEC] px-4 py-2 font-semibold text-[#6A8A82]">RS</td>
                    <td className="border border-[#ECECEC] px-4 py-2">VALEURS COMPTABLES DES CESSIONS D'IMMOBILISATIONS</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-center">31</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right font-medium text-[#6A8A82]">-1 000 000</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right">0</td>
                  </tr>
                  <tr>
                    <td className="border border-[#ECECEC] px-4 py-2 font-semibold text-[#6A8A82]">RT</td>
                    <td className="border border-[#ECECEC] px-4 py-2">AUTRES CHARGES HAO</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-center">31</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right font-medium text-[#6A8A82]">-200 000</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right text-[#6A8A82]">-100 000</td>
                  </tr>
                  <tr className="bg-[#6A8A82]/20 font-bold">
                    <td className="border border-[#ECECEC] px-4 py-3 text-[#6A8A82]">XH</td>
                    <td className="border border-[#ECECEC] px-4 py-3">RÉSULTAT HORS ACTIVITÉS ORDINAIRES</td>
                    <td className="border border-[#ECECEC] px-4 py-3"></td>
                    <td className="border border-[#ECECEC] px-4 py-3 text-right text-[#6A8A82] font-bold">800 000</td>
                    <td className="border border-[#ECECEC] px-4 py-3 text-right font-semibold">400 000</td>
                  </tr>

                  <tr className="bg-[#6A8A82]/20 font-bold">
                    <td className="border border-[#ECECEC] px-4 py-3 text-[#6A8A82]">XI</td>
                    <td className="border border-[#ECECEC] px-4 py-3">RÉSULTAT AVANT IMPÔTS (XG+XH)</td>
                    <td className="border border-[#ECECEC] px-4 py-3"></td>
                    <td className="border border-[#ECECEC] px-4 py-3 text-right text-[#6A8A82] font-bold">8 800 000</td>
                    <td className="border border-[#ECECEC] px-4 py-3 text-right font-semibold">10 100 000</td>
                  </tr>

                  <tr>
                    <td className="border border-[#ECECEC] px-4 py-2 font-semibold text-[#6A8A82]">RW</td>
                    <td className="border border-[#ECECEC] px-4 py-2">IMPÔTS SUR LE RÉSULTAT</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-center">32</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right font-medium text-[#6A8A82]">-300 000</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right text-[#6A8A82]">-350 000</td>
                  </tr>

                  {/* RÉSULTAT NET FINAL */}
                  <tr className="bg-gray-200 font-bold text-lg">
                    <td className="border border-[#ECECEC] px-4 py-4 text-[#6A8A82]">XL</td>
                    <td className="border border-[#ECECEC] px-4 py-4">RÉSULTAT NET (XI+RW)</td>
                    <td className="border border-[#ECECEC] px-4 py-4"></td>
                    <td className="border border-[#ECECEC] px-4 py-4 text-right text-[#6A8A82] font-bold text-xl">8 500 000</td>
                    <td className="border border-[#ECECEC] px-4 py-4 text-right font-bold">9 750 000</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Vue SIG */}
      {activeView === 'sig' && (
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          <div className="bg-[#F0F3F2] rounded-lg border border-[#ECECEC] p-6">
            <h3 className="text-lg font-semibold text-[#191919] mb-6">Soldes Intermédiaires de Gestion (SIG)</h3>

            <div className="space-y-4">
              {/* Marge commerciale */}
              <div className="p-4 bg-[#ECECEC] rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">1. Marge Commerciale</span>
                  <span className="text-lg font-bold text-[#6A8A82]">
                    {(sig.margeCommerciale / 1000000).toFixed(1)}M FCFA
                  </span>
                </div>
                <p className="text-xs text-[#191919]/70">
                  Ventes de marchandises - Coût d'achat des marchandises vendues
                </p>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-[#6A8A82]/100 h-2 rounded-full" style={{ width: '60%' }}></div>
                </div>
              </div>

              {/* Production de l'exercice */}
              <div className="p-4 bg-[#ECECEC] rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">2. Production de l'Exercice</span>
                  <span className="text-lg font-bold text-[#6A8A82]">
                    {(sig.productionExercice / 1000000).toFixed(1)}M FCFA
                  </span>
                </div>
                <p className="text-xs text-[#191919]/70">
                  Production vendue + Production stockée + Production immobilisée
                </p>
              </div>

              {/* Valeur ajoutée */}
              <div className="p-4 bg-[#6A8A82]/10 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">3. Valeur Ajoutée</span>
                  <span className="text-lg font-bold text-[#6A8A82]">
                    {(sig.valeurAjoutee / 1000000).toFixed(1)}M FCFA
                  </span>
                </div>
                <p className="text-xs text-[#191919]/70">
                  Marge commerciale + Production - Consommations intermédiaires
                </p>
                <div className="mt-2 text-xs text-[#6A8A82]">
                  Taux de VA: {((sig.valeurAjoutee / compteResultat.chiffreAffaires) * 100).toFixed(1)}%
                </div>
              </div>

              {/* EBE */}
              <div className="p-4 bg-[#6A8A82]/10 rounded-lg border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">4. Excédent Brut d'Exploitation (EBE)</span>
                  <span className="text-lg font-bold text-[#6A8A82]">
                    {(sig.excedentBrutExploitation / 1000000).toFixed(1)}M FCFA
                  </span>
                </div>
                <p className="text-xs text-[#191919]/70">
                  Valeur ajoutée + Subventions - Charges de personnel - Impôts et taxes
                </p>
                <div className="mt-2 text-xs text-[#6A8A82]">
                  Taux d'EBE: {((sig.excedentBrutExploitation / compteResultat.chiffreAffaires) * 100).toFixed(1)}%
                </div>
              </div>

              {/* Résultat d'exploitation */}
              <div className="p-4 bg-[#ECECEC] rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">5. Résultat d'Exploitation</span>
                  <span className="text-lg font-bold text-[#6A8A82]">
                    {(sig.resultatExploitation / 1000000).toFixed(1)}M FCFA
                  </span>
                </div>
                <p className="text-xs text-[#191919]/70">
                  EBE + Reprises - Dotations aux amortissements et provisions
                </p>
              </div>

              {/* Résultat courant */}
              <div className="p-4 bg-[#ECECEC] rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">6. Résultat Courant avant Impôt</span>
                  <span className="text-lg font-bold text-[#6A8A82]">
                    {(sig.resultatCourant / 1000000).toFixed(1)}M FCFA
                  </span>
                </div>
                <p className="text-xs text-[#191919]/70">
                  Résultat d'exploitation + Résultat financier
                </p>
              </div>

              {/* Résultat exceptionnel */}
              <div className="p-4 bg-[#ECECEC] rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700">7. Résultat Exceptionnel</span>
                  <span className="text-lg font-bold text-[#6A8A82]">
                    {(sig.resultatExceptionnel / 1000000).toFixed(1)}M FCFA
                  </span>
                </div>
                <p className="text-xs text-[#191919]/70">
                  Produits exceptionnels - Charges exceptionnelles
                </p>
              </div>

              {/* Résultat net */}
              <div className="p-4 bg-[#6A8A82]/20 rounded-lg border-2 border-green-300">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-base font-bold text-[#191919]/90">8. Résultat Net</span>
                  <span className="text-xl font-bold text-[#6A8A82]">
                    {(sig.resultatNet / 1000000).toFixed(1)}M FCFA
                  </span>
                </div>
                <p className="text-xs text-[#191919]/70">
                  Résultat courant + Résultat exceptionnel - Impôt sur les sociétés
                </p>
                <div className="mt-2 text-xs text-[#6A8A82]">
                  Marge nette: {((sig.resultatNet / compteResultat.chiffreAffaires) * 100).toFixed(1)}%
                </div>
              </div>

              {/* CAF */}
              <div className="p-4 bg-[#6A8A82]/15 rounded-lg border-2 border-purple-300">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-base font-bold text-[#191919]/90">9. Capacité d'Autofinancement (CAF)</span>
                  <span className="text-xl font-bold text-[#6A8A82]">
                    {(sig.capaciteAutofinancement / 1000000).toFixed(1)}M FCFA
                  </span>
                </div>
                <p className="text-xs text-[#191919]/70">
                  Résultat net + Dotations aux amortissements et provisions - Reprises
                </p>
                <div className="mt-2 text-xs text-[#6A8A82]">
                  Taux de CAF: {((sig.capaciteAutofinancement / compteResultat.chiffreAffaires) * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* Analyses Financières */}
      {activeView === 'analyses' && (
        <>
          {/* A. Soldes Intermédiaires de Gestion (SIG) */}
          {activeSubView === 'sig' && (
            <div className="flex-1 p-6 space-y-6 overflow-y-auto">
              <div className="bg-[#F0F3F2] rounded-lg border border-[#ECECEC] p-6">
                <h3 className="text-lg font-semibold text-[#191919] mb-4">A. Soldes Intermédiaires de Gestion (SIG)</h3>
                <div className="mb-6 p-4 bg-[#ECECEC] rounded-lg">
                  <p className="text-sm text-gray-700">Les SIG permettent d'analyser la formation du résultat à chaque étape de l'activité.</p>
                  <p className="text-sm text-[#191919]/70 mt-2"><strong>Utilité :</strong> mesurer la performance économique, évaluer la capacité à financer les investissements et comparer avec le secteur.</p>
                </div>

                <div className="space-y-4">
                  {/* 1. Marge commerciale */}
                  <div className="p-4 bg-[#ECECEC] rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700">1. Marge Commerciale</span>
                      <span className="text-lg font-bold text-[#6A8A82]">
                        {(sig.margeCommerciale / 1000000).toFixed(1)}M FCFA
                      </span>
                    </div>
                    <p className="text-xs text-[#191919]/70">Chiffre d'affaires – coût d'achat des marchandises vendues</p>
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-[#6A8A82] h-2 rounded-full" style={{ width: '60%' }}></div>
                    </div>
                  </div>

                  {/* 2. Production de l'exercice */}
                  <div className="p-4 bg-[#ECECEC] rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700">2. Production de l'Exercice</span>
                      <span className="text-lg font-bold text-[#6A8A82]">
                        {(sig.productionExercice / 1000000).toFixed(1)}M FCFA
                      </span>
                    </div>
                    <p className="text-xs text-[#191919]/70">Production vendue + production stockée + production immobilisée</p>
                  </div>

                  {/* 3. Valeur ajoutée */}
                  <div className="p-4 bg-[#6A8A82]/10 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700">3. Valeur Ajoutée (VA)</span>
                      <span className="text-lg font-bold text-[#6A8A82]">
                        {(sig.valeurAjoutee / 1000000).toFixed(1)}M FCFA
                      </span>
                    </div>
                    <p className="text-xs text-[#191919]/70">Marge commerciale + production – consommations externes</p>
                    <div className="mt-2 text-xs text-[#6A8A82]">
                      Taux de VA: {((sig.valeurAjoutee / compteResultat.chiffreAffaires) * 100).toFixed(1)}%
                    </div>
                  </div>

                  {/* 4. EBE */}
                  <div className="p-4 bg-[#6A8A82]/10 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700">4. Excédent Brut d'Exploitation (EBE)</span>
                      <span className="text-lg font-bold text-[#6A8A82]">
                        {(sig.excedentBrutExploitation / 1000000).toFixed(1)}M FCFA
                      </span>
                    </div>
                    <p className="text-xs text-[#191919]/70">VA – charges de personnel – impôts et taxes</p>
                    <div className="mt-2 text-xs text-[#6A8A82]">
                      Taux d'EBE: {((sig.excedentBrutExploitation / compteResultat.chiffreAffaires) * 100).toFixed(1)}%
                    </div>
                  </div>

                  {/* 5. Résultat d'exploitation */}
                  <div className="p-4 bg-[#ECECEC] rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700">5. Résultat d'Exploitation</span>
                      <span className="text-lg font-bold text-[#6A8A82]">
                        {(sig.resultatExploitation / 1000000).toFixed(1)}M FCFA
                      </span>
                    </div>
                    <p className="text-xs text-[#191919]/70">EBE – dotations aux amortissements et provisions + reprises</p>
                  </div>

                  {/* 6. Résultat courant */}
                  <div className="p-4 bg-[#ECECEC] rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700">6. Résultat Courant avant Impôt</span>
                      <span className="text-lg font-bold text-[#6A8A82]">
                        {(sig.resultatCourant / 1000000).toFixed(1)}M FCFA
                      </span>
                    </div>
                    <p className="text-xs text-[#191919]/70">Résultat d'exploitation + résultat financier</p>
                  </div>

                  {/* 7. Résultat net */}
                  <div className="p-4 bg-[#6A8A82]/20 rounded-lg border-2 border-green-300">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-base font-bold text-[#191919]/90">7. Résultat Net</span>
                      <span className="text-xl font-bold text-[#6A8A82]">
                        {(sig.resultatNet / 1000000).toFixed(1)}M FCFA
                      </span>
                    </div>
                    <p className="text-xs text-[#191919]/70">Résultat courant – impôt sur les bénéfices + résultat exceptionnel</p>
                    <div className="mt-2 text-xs text-[#6A8A82]">
                      Marge nette: {((sig.resultatNet / compteResultat.chiffreAffaires) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* B. Ratios de structure financière */}
          {activeSubView === 'ratios-structure' && (
            <div className="flex-1 p-6 space-y-6 overflow-y-auto">
              <div className="bg-[#F0F3F2] rounded-lg border border-[#ECECEC] p-6">
                <h3 className="text-lg font-semibold text-[#191919] mb-4">B. Ratios de Structure Financière</h3>
                <div className="mb-6 p-4 bg-[#ECECEC] rounded-lg">
                  <p className="text-sm text-gray-700"><strong>Objectif :</strong> apprécier l'équilibre entre ressources stables et besoins de financement.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-6 border border-[#ECECEC] rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-gray-700">Ratio d'autonomie financière</span>
                      <Shield className="w-5 h-5 text-[#6A8A82]" />
                    </div>
                    <p className="text-3xl font-bold text-[#6A8A82] mb-2">{ratios.autonomieFinanciere.toFixed(1)}%</p>
                    <p className="text-xs text-[#191919]/70 mb-3">Capitaux propres / Total du passif</p>
                    <p className="text-sm text-gray-700">Indique la capacité à se financer sans dettes.</p>
                    <div className="mt-3 text-xs">
                      {ratios.autonomieFinanciere > 50 ? (
                        <span className="text-[#6A8A82] font-semibold">✓ Excellent</span>
                      ) : ratios.autonomieFinanciere > 30 ? (
                        <span className="text-orange-600 font-semibold">⚠ Acceptable</span>
                      ) : (
                        <span className="text-red-600 font-semibold">✗ Insuffisant</span>
                      )}
                    </div>
                  </div>

                  <div className="p-6 border border-[#ECECEC] rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-gray-700">Ratio d'endettement</span>
                      <TrendingDown className="w-5 h-5 text-[#6A8A82]" />
                    </div>
                    <p className="text-3xl font-bold text-[#6A8A82] mb-2">{ratios.endettement.toFixed(1)}%</p>
                    <p className="text-xs text-[#191919]/70 mb-3">Dettes financières / Capitaux propres</p>
                    <p className="text-sm text-gray-700">Mesure le poids de la dette par rapport aux fonds propres.</p>
                    <div className="mt-3 text-xs">
                      {ratios.endettement < 50 ? (
                        <span className="text-[#6A8A82] font-semibold">✓ Faible</span>
                      ) : ratios.endettement < 100 ? (
                        <span className="text-orange-600 font-semibold">⚠ Modéré</span>
                      ) : (
                        <span className="text-red-600 font-semibold">✗ Élevé</span>
                      )}
                    </div>
                  </div>

                  <div className="p-6 border border-[#ECECEC] rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-gray-700">Couverture des immobilisations</span>
                      <Database className="w-5 h-5 text-[#6A8A82]" />
                    </div>
                    <p className="text-3xl font-bold text-[#6A8A82] mb-2">{ratios.couvertureEmplois.toFixed(1)}%</p>
                    <p className="text-xs text-[#191919]/70 mb-3">Ressources stables / Actifs immobilisés</p>
                    <p className="text-sm text-gray-700">Vérifie si les immobilisations sont financées par des capitaux permanents.</p>
                    <div className="mt-3 text-xs">
                      {ratios.couvertureEmplois > 100 ? (
                        <span className="text-[#6A8A82] font-semibold">✓ Bon équilibre</span>
                      ) : (
                        <span className="text-red-600 font-semibold">✗ Déséquilibre</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* C. Ratios de liquidité et de solvabilité */}
          {activeSubView === 'ratios-liquidite' && (
            <div className="flex-1 p-6 space-y-6 overflow-y-auto">
              <div className="bg-[#F0F3F2] rounded-lg border border-[#ECECEC] p-6">
                <h3 className="text-lg font-semibold text-[#191919] mb-4">C. Ratios de Liquidité et de Solvabilité</h3>
                <div className="mb-6 p-4 bg-[#ECECEC] rounded-lg">
                  <p className="text-sm text-gray-700"><strong>Objectif :</strong> évaluer la capacité de l'entreprise à faire face à ses obligations à court et long terme.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Liquidité générale */}
                  <div className="p-6 border border-[#ECECEC] rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-gray-700">Liquidité générale</span>
                      <Activity className="w-5 h-5 text-[#6A8A82]" />
                    </div>
                    <p className="text-3xl font-bold text-[#6A8A82] mb-2">{ratios.liquiditeGenerale.toFixed(2)}</p>
                    <p className="text-xs text-[#191919]/70 mb-3">Actif circulant / Passif circulant</p>
                    <p className="text-sm text-gray-700 mb-3">Mesure la capacité à honorer les dettes à court terme avec l'actif circulant.</p>
                    <div className="mt-3 text-xs">
                      {ratios.liquiditeGenerale > 1.5 ? (
                        <span className="text-[#6A8A82] font-semibold">✓ Très bonne</span>
                      ) : ratios.liquiditeGenerale > 1 ? (
                        <span className="text-orange-600 font-semibold">⚠ Acceptable</span>
                      ) : (
                        <span className="text-red-600 font-semibold">✗ Insuffisante</span>
                      )}
                    </div>
                  </div>

                  {/* Liquidité réduite */}
                  <div className="p-6 border border-[#ECECEC] rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-gray-700">Liquidité réduite (Quick ratio)</span>
                      <Zap className="w-5 h-5 text-[#6A8A82]" />
                    </div>
                    <p className="text-3xl font-bold text-[#6A8A82] mb-2">{ratios.liquiditeReduite.toFixed(2)}</p>
                    <p className="text-xs text-[#191919]/70 mb-3">(Actif circulant – Stocks) / Passif circulant</p>
                    <p className="text-sm text-gray-700 mb-3">Mesure la liquidité en excluant les stocks (moins liquides).</p>
                    <div className="mt-3 text-xs">
                      {ratios.liquiditeReduite > 1 ? (
                        <span className="text-[#6A8A82] font-semibold">✓ Satisfaisante</span>
                      ) : ratios.liquiditeReduite > 0.7 ? (
                        <span className="text-orange-600 font-semibold">⚠ Limite</span>
                      ) : (
                        <span className="text-red-600 font-semibold">✗ Faible</span>
                      )}
                    </div>
                  </div>

                  {/* Trésorerie nette */}
                  <div className="p-6 border border-[#ECECEC] rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-gray-700">Trésorerie nette</span>
                      <Wallet className="w-5 h-5 text-[#6A8A82]" />
                    </div>
                    <p className="text-3xl font-bold text-[#6A8A82] mb-2">{((8000000) / 1000000).toFixed(1)}M FCFA</p>
                    <p className="text-xs text-[#191919]/70 mb-3">Trésorerie active – Trésorerie passive</p>
                    <p className="text-sm text-gray-700 mb-3">Indique la liquidité immédiatement disponible.</p>
                    <div className="mt-3 text-xs">
                      {8000000 > 5000000 ? (
                        <span className="text-[#6A8A82] font-semibold">✓ Trésorerie positive</span>
                      ) : 8000000 > 0 ? (
                        <span className="text-orange-600 font-semibold">⚠ Trésorerie faible</span>
                      ) : (
                        <span className="text-red-600 font-semibold">✗ Trésorerie négative</span>
                      )}
                    </div>
                  </div>

                  {/* Solvabilité générale */}
                  <div className="p-6 border border-[#ECECEC] rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-gray-700">Solvabilité générale</span>
                      <Shield className="w-5 h-5 text-[#6A8A82]" />
                    </div>
                    <p className="text-3xl font-bold text-[#6A8A82] mb-2">{((104500000 / 36000000)).toFixed(2)}</p>
                    <p className="text-xs text-[#191919]/70 mb-3">Total de l'actif / Total des dettes</p>
                    <p className="text-sm text-gray-700 mb-3">Mesure la capacité à rembourser toutes les dettes avec les actifs.</p>
                    <div className="mt-3 text-xs">
                      {((104500000 / 36000000)) > 2 ? (
                        <span className="text-[#6A8A82] font-semibold">✓ Très solvable</span>
                      ) : ((104500000 / 36000000)) > 1.5 ? (
                        <span className="text-orange-600 font-semibold">⚠ Solvable</span>
                      ) : (
                        <span className="text-red-600 font-semibold">✗ Risque solvabilité</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* D. Ratios de rentabilité */}
          {activeSubView === 'ratios-rentabilite' && (
            <div className="flex-1 p-6 space-y-6 overflow-y-auto">
              <div className="bg-[#F0F3F2] rounded-lg border border-[#ECECEC] p-6">
                <h3 className="text-lg font-semibold text-[#191919] mb-4">D. Ratios de Rentabilité</h3>
                <div className="mb-6 p-4 bg-[#ECECEC] rounded-lg">
                  <p className="text-sm text-gray-700">Mesurent la capacité de l'entreprise à générer des bénéfices à partir de ses ressources.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* ROA */}
                  <div className="p-6 border border-[#ECECEC] rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-gray-700">ROA (Return on Assets)</span>
                      <Target className="w-5 h-5 text-[#6A8A82]" />
                    </div>
                    <p className="text-3xl font-bold text-[#6A8A82] mb-2">{ratios.roa.toFixed(1)}%</p>
                    <p className="text-xs text-[#191919]/70 mb-3">Résultat net / Total actif</p>
                    <p className="text-sm text-gray-700 mb-3">Mesure l'efficacité de l'utilisation des actifs.</p>
                    <div className="mt-3 text-xs">
                      {ratios.roa > 10 ? (
                        <span className="text-[#6A8A82] font-semibold">✓ Excellente</span>
                      ) : ratios.roa > 5 ? (
                        <span className="text-orange-600 font-semibold">⚠ Bonne</span>
                      ) : (
                        <span className="text-red-600 font-semibold">✗ Faible</span>
                      )}
                    </div>
                  </div>

                  {/* ROE */}
                  <div className="p-6 border border-[#ECECEC] rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-gray-700">ROE (Return on Equity)</span>
                      <TrendingUp className="w-5 h-5 text-[#6A8A82]" />
                    </div>
                    <p className="text-3xl font-bold text-[#6A8A82] mb-2">{ratios.roe.toFixed(1)}%</p>
                    <p className="text-xs text-[#191919]/70 mb-3">Résultat net / Capitaux propres</p>
                    <p className="text-sm text-gray-700 mb-3">Évalue la rentabilité pour les actionnaires.</p>
                    <div className="mt-3 text-xs">
                      {ratios.roe > 15 ? (
                        <span className="text-[#6A8A82] font-semibold">✓ Très attractive</span>
                      ) : ratios.roe > 10 ? (
                        <span className="text-orange-600 font-semibold">⚠ Attractive</span>
                      ) : (
                        <span className="text-red-600 font-semibold">✗ Peu attractive</span>
                      )}
                    </div>
                  </div>

                  {/* Marge nette */}
                  <div className="p-6 border border-[#ECECEC] rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-gray-700">Marge nette</span>
                      <DollarSign className="w-5 h-5 text-[#6A8A82]" />
                    </div>
                    <p className="text-3xl font-bold text-[#6A8A82] mb-2">{ratios.rentabiliteCommerciale.toFixed(1)}%</p>
                    <p className="text-xs text-[#191919]/70 mb-3">Résultat net / Chiffre d'affaires</p>
                    <p className="text-sm text-gray-700 mb-3">Indique la capacité à convertir les ventes en profit net.</p>
                    <div className="mt-3 text-xs">
                      {ratios.rentabiliteCommerciale > 10 ? (
                        <span className="text-[#6A8A82] font-semibold">✓ Excellente marge</span>
                      ) : ratios.rentabiliteCommerciale > 5 ? (
                        <span className="text-orange-600 font-semibold">⚠ Marge correcte</span>
                      ) : (
                        <span className="text-red-600 font-semibold">✗ Marge faible</span>
                      )}
                    </div>
                  </div>

                  {/* Rentabilité économique */}
                  <div className="p-6 border border-[#ECECEC] rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-gray-700">Rentabilité économique</span>
                      <BarChart3 className="w-5 h-5 text-[#6A8A82]" />
                    </div>
                    <p className="text-3xl font-bold text-[#6A8A82] mb-2">{ratios.rentabiliteEconomique.toFixed(1)}%</p>
                    <p className="text-xs text-[#191919]/70 mb-3">Résultat d'exploitation / Total actif</p>
                    <p className="text-sm text-gray-700 mb-3">Mesure la performance opérationnelle indépendamment du financement.</p>
                    <div className="mt-3 text-xs">
                      {ratios.rentabiliteEconomique > 12 ? (
                        <span className="text-[#6A8A82] font-semibold">✓ Très performante</span>
                      ) : ratios.rentabiliteEconomique > 8 ? (
                        <span className="text-orange-600 font-semibold">⚠ Performante</span>
                      ) : (
                        <span className="text-red-600 font-semibold">✗ Performance limitée</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* E. Ratios d'activité (rotation) */}
          {activeSubView === 'ratios-activite' && (
            <div className="flex-1 p-6 space-y-6 overflow-y-auto">
              <div className="bg-[#F0F3F2] rounded-lg border border-[#ECECEC] p-6">
                <h3 className="text-lg font-semibold text-[#191919] mb-4">E. Ratios d'Activité (Rotation)</h3>
                <div className="mb-6 p-4 bg-[#ECECEC] rounded-lg">
                  <p className="text-sm text-gray-700"><strong>Objectif :</strong> mesurer l'efficacité de la gestion des actifs et cycles d'exploitation.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Rotation des stocks */}
                  <div className="p-6 border border-[#ECECEC] rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-gray-700">Rotation des stocks</span>
                      <BarChart3 className="w-5 h-5 text-[#6A8A82]" />
                    </div>
                    <p className="text-3xl font-bold text-[#6A8A82] mb-2">{ratios.rotationStocks.toFixed(1)}</p>
                    <p className="text-xs text-[#191919]/70 mb-3">Coût des ventes / Stock moyen</p>
                    <p className="text-sm text-gray-700">Indique le nombre de fois où les stocks sont renouvelés dans l'année.</p>
                    <div className="mt-3 text-xs">
                      {ratios.rotationStocks > 8 ? (
                        <span className="text-[#6A8A82] font-semibold">✓ Excellent</span>
                      ) : ratios.rotationStocks > 4 ? (
                        <span className="text-orange-600 font-semibold">⚠ Acceptable</span>
                      ) : (
                        <span className="text-red-600 font-semibold">✗ Insuffisant</span>
                      )}
                    </div>
                  </div>

                  {/* Délai moyen de recouvrement des créances */}
                  <div className="p-6 border border-[#ECECEC] rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-gray-700">Délai clients</span>
                      <Clock className="w-5 h-5 text-[#6A8A82]" />
                    </div>
                    <p className="text-3xl font-bold text-[#6A8A82] mb-2">{Math.round(ratios.delaiReglementClients)}</p>
                    <p className="text-xs text-[#191919]/70 mb-3">(Créances clients × 360) / CA TTC</p>
                    <p className="text-sm text-gray-700">Temps moyen de recouvrement des créances clients en jours.</p>
                    <div className="mt-3 text-xs">
                      {ratios.delaiReglementClients < 30 ? (
                        <span className="text-[#6A8A82] font-semibold">✓ Excellent</span>
                      ) : ratios.delaiReglementClients < 60 ? (
                        <span className="text-orange-600 font-semibold">⚠ Acceptable</span>
                      ) : (
                        <span className="text-red-600 font-semibold">✗ Trop long</span>
                      )}
                    </div>
                  </div>

                  {/* Délai moyen de paiement fournisseurs */}
                  <div className="p-6 border border-[#ECECEC] rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-gray-700">Délai fournisseurs</span>
                      <Calendar className="w-5 h-5 text-[#6A8A82]" />
                    </div>
                    <p className="text-3xl font-bold text-[#6A8A82] mb-2">{Math.round(ratios.delaiReglementFournisseurs)}</p>
                    <p className="text-xs text-[#191919]/70 mb-3">(Dettes fournisseurs × 360) / Achats TTC</p>
                    <p className="text-sm text-gray-700">Délai moyen de paiement des fournisseurs en jours.</p>
                    <div className="mt-3 text-xs">
                      {ratios.delaiReglementFournisseurs > 60 ? (
                        <span className="text-[#6A8A82] font-semibold">✓ Bon crédit</span>
                      ) : ratios.delaiReglementFournisseurs > 30 ? (
                        <span className="text-orange-600 font-semibold">⚠ Moyen</span>
                      ) : (
                        <span className="text-red-600 font-semibold">✗ Crédit court</span>
                      )}
                    </div>
                  </div>

                  {/* Rotation de l'actif */}
                  <div className="p-6 border border-[#ECECEC] rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-gray-700">Rotation de l'actif</span>
                      <RefreshCw className="w-5 h-5 text-[#6A8A82]" />
                    </div>
                    <p className="text-3xl font-bold text-[#6A8A82] mb-2">{ratios.rotationActifs.toFixed(2)}</p>
                    <p className="text-xs text-[#191919]/70 mb-3">Chiffre d'affaires / Total actif</p>
                    <p className="text-sm text-gray-700">Efficacité d'utilisation des actifs pour générer du CA.</p>
                    <div className="mt-3 text-xs">
                      {ratios.rotationActifs > 2 ? (
                        <span className="text-[#6A8A82] font-semibold">✓ Très efficace</span>
                      ) : ratios.rotationActifs > 1 ? (
                        <span className="text-orange-600 font-semibold">⚠ Acceptable</span>
                      ) : (
                        <span className="text-red-600 font-semibold">✗ Peu efficace</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Vue TFT (Tableau des Flux de Trésorerie) */}
      {activeSubView === 'tft' && (
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* En-tête du TFT */}
          <div className="bg-[#F0F3F2] rounded-lg border border-[#ECECEC] p-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-[#191919]">TABLEAU DE FLUX DE TRÉSORERIE</h2>
              <p className="text-lg text-gray-700 mt-2">ENTREPRISE XYZ SARL</p>
              <p className="text-sm text-[#191919]/70">Exercice clos le 31 décembre 2024</p>
              <p className="text-sm text-gray-700 mt-1">(Montants en milliers de FCFA)</p>
            </div>

            {/* Tableau TFT */}
            <div className="overflow-x-auto">
              <table className="min-w-full border border-[#ECECEC]">
                <thead className="bg-[#ECECEC]">
                  <tr>
                    <th className="border border-[#ECECEC] px-4 py-2 text-left text-xs font-semibold text-gray-700 w-16">Réf</th>
                    <th className="border border-[#ECECEC] px-4 py-2 text-left text-xs font-semibold text-gray-700">LIBELLÉS</th>
                    <th className="border border-[#ECECEC] px-4 py-2 text-right text-xs font-semibold text-gray-700">Exercice N</th>
                    <th className="border border-[#ECECEC] px-4 py-2 text-right text-xs font-semibold text-gray-700">Exercice N-1</th>
                  </tr>
                </thead>
                <tbody>
                  {/* FLUX DE TRÉSORERIE PROVENANT DES ACTIVITÉS OPÉRATIONNELLES */}
                  <tr className="bg-[#6A8A82]/10 font-bold">
                    <td className="border border-[#ECECEC] px-4 py-3 text-[#6A8A82]">ZA</td>
                    <td className="border border-[#ECECEC] px-4 py-3">FLUX DE TRÉSORERIE PROVENANT DES ACTIVITÉS OPÉRATIONNELLES</td>
                    <td className="border border-[#ECECEC] px-4 py-3"></td>
                    <td className="border border-[#ECECEC] px-4 py-3"></td>
                  </tr>
                  <tr>
                    <td className="border border-[#ECECEC] px-4 py-2"></td>
                    <td className="border border-[#ECECEC] px-4 py-2">Résultat net</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right font-medium">8 500</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right">9 750</td>
                  </tr>
                  <tr>
                    <td className="border border-[#ECECEC] px-4 py-2"></td>
                    <td className="border border-[#ECECEC] px-4 py-2 font-semibold">Ajustements pour :</td>
                    <td className="border border-[#ECECEC] px-4 py-2"></td>
                    <td className="border border-[#ECECEC] px-4 py-2"></td>
                  </tr>
                  <tr>
                    <td className="border border-[#ECECEC] px-4 py-2"></td>
                    <td className="border border-[#ECECEC] px-4 py-2 pl-6">• Dotations aux amortissements et provisions</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right">2 500</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right">2 300</td>
                  </tr>
                  <tr>
                    <td className="border border-[#ECECEC] px-4 py-2"></td>
                    <td className="border border-[#ECECEC] px-4 py-2 pl-6">• Reprises sur amortissements et provisions</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right text-[#6A8A82]">-500</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right text-[#6A8A82]">-300</td>
                  </tr>
                  <tr>
                    <td className="border border-[#ECECEC] px-4 py-2"></td>
                    <td className="border border-[#ECECEC] px-4 py-2 pl-6">• Variation des provisions financières</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right">100</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right">200</td>
                  </tr>
                  <tr>
                    <td className="border border-[#ECECEC] px-4 py-2"></td>
                    <td className="border border-[#ECECEC] px-4 py-2 pl-6">• Plus ou moins-values de cession</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right text-[#6A8A82]">-1 000</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right">0</td>
                  </tr>
                  <tr className="bg-[#6A8A82]/20 font-semibold">
                    <td className="border border-[#ECECEC] px-4 py-3"></td>
                    <td className="border border-[#ECECEC] px-4 py-3">Capacité d'autofinancement (CAF)</td>
                    <td className="border border-[#ECECEC] px-4 py-3 text-right text-[#6A8A82] font-bold">9 600</td>
                    <td className="border border-[#ECECEC] px-4 py-3 text-right font-semibold">11 950</td>
                  </tr>
                  <tr>
                    <td className="border border-[#ECECEC] px-4 py-2"></td>
                    <td className="border border-[#ECECEC] px-4 py-2 font-semibold">Variation du BFR lié à l'activité :</td>
                    <td className="border border-[#ECECEC] px-4 py-2"></td>
                    <td className="border border-[#ECECEC] px-4 py-2"></td>
                  </tr>
                  <tr>
                    <td className="border border-[#ECECEC] px-4 py-2"></td>
                    <td className="border border-[#ECECEC] px-4 py-2 pl-6">• Variation des stocks</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right text-[#6A8A82]">-2 500</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right">1 000</td>
                  </tr>
                  <tr>
                    <td className="border border-[#ECECEC] px-4 py-2"></td>
                    <td className="border border-[#ECECEC] px-4 py-2 pl-6">• Variation des créances clients</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right text-[#6A8A82]">-3 000</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right text-[#6A8A82]">-2 000</td>
                  </tr>
                  <tr>
                    <td className="border border-[#ECECEC] px-4 py-2"></td>
                    <td className="border border-[#ECECEC] px-4 py-2 pl-6">• Variation des autres créances d'exploitation</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right text-[#6A8A82]">-500</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right">200</td>
                  </tr>
                  <tr>
                    <td className="border border-[#ECECEC] px-4 py-2"></td>
                    <td className="border border-[#ECECEC] px-4 py-2 pl-6">• Variation des dettes fournisseurs</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right">1 500</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right">2 000</td>
                  </tr>
                  <tr>
                    <td className="border border-[#ECECEC] px-4 py-2"></td>
                    <td className="border border-[#ECECEC] px-4 py-2 pl-6">• Variation des dettes fiscales et sociales</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right">800</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right">500</td>
                  </tr>
                  <tr>
                    <td className="border border-[#ECECEC] px-4 py-2"></td>
                    <td className="border border-[#ECECEC] px-4 py-2 pl-6">• Variation des autres dettes d'exploitation</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right">200</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right text-[#6A8A82]">-100</td>
                  </tr>
                  <tr className="bg-[#6A8A82]/20 font-bold">
                    <td className="border border-[#ECECEC] px-4 py-3 text-[#6A8A82]">ZB</td>
                    <td className="border border-[#ECECEC] px-4 py-3">Flux net de trésorerie provenant des activités opérationnelles (A)</td>
                    <td className="border border-[#ECECEC] px-4 py-3 text-right text-[#6A8A82] font-bold">6 100</td>
                    <td className="border border-[#ECECEC] px-4 py-3 text-right font-semibold">13 550</td>
                  </tr>

                  {/* FLUX DE TRÉSORERIE PROVENANT DES ACTIVITÉS D'INVESTISSEMENT */}
                  <tr className="bg-[#6A8A82]/10 font-bold">
                    <td className="border border-[#ECECEC] px-4 py-3 text-[#6A8A82]">ZC</td>
                    <td className="border border-[#ECECEC] px-4 py-3">FLUX DE TRÉSORERIE PROVENANT DES ACTIVITÉS D'INVESTISSEMENT</td>
                    <td className="border border-[#ECECEC] px-4 py-3"></td>
                    <td className="border border-[#ECECEC] px-4 py-3"></td>
                  </tr>
                  <tr>
                    <td className="border border-[#ECECEC] px-4 py-2"></td>
                    <td className="border border-[#ECECEC] px-4 py-2">Acquisitions d'immobilisations incorporelles</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right text-[#6A8A82]">-1 000</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right text-[#6A8A82]">-500</td>
                  </tr>
                  <tr>
                    <td className="border border-[#ECECEC] px-4 py-2"></td>
                    <td className="border border-[#ECECEC] px-4 py-2">Acquisitions d'immobilisations corporelles</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right text-[#6A8A82]">-8 000</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right text-[#6A8A82]">-5 000</td>
                  </tr>
                  <tr>
                    <td className="border border-[#ECECEC] px-4 py-2"></td>
                    <td className="border border-[#ECECEC] px-4 py-2">Acquisitions d'immobilisations financières</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right text-[#6A8A82]">-500</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right">0</td>
                  </tr>
                  <tr>
                    <td className="border border-[#ECECEC] px-4 py-2"></td>
                    <td className="border border-[#ECECEC] px-4 py-2">Cessions d'immobilisations</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right">2 000</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right">0</td>
                  </tr>
                  <tr>
                    <td className="border border-[#ECECEC] px-4 py-2"></td>
                    <td className="border border-[#ECECEC] px-4 py-2">Variation des créances sur cessions</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right">0</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right">0</td>
                  </tr>
                  <tr className="bg-[#6A8A82]/20 font-bold">
                    <td className="border border-[#ECECEC] px-4 py-3 text-[#6A8A82]">ZD</td>
                    <td className="border border-[#ECECEC] px-4 py-3">Flux net de trésorerie provenant des activités d'investissement (B)</td>
                    <td className="border border-[#ECECEC] px-4 py-3 text-right text-[#6A8A82] font-bold">-7 500</td>
                    <td className="border border-[#ECECEC] px-4 py-3 text-right text-[#6A8A82] font-semibold">-5 500</td>
                  </tr>

                  {/* FLUX DE TRÉSORERIE PROVENANT DES ACTIVITÉS DE FINANCEMENT */}
                  <tr className="bg-[#6A8A82]/10 font-bold">
                    <td className="border border-[#ECECEC] px-4 py-3 text-[#6A8A82]">ZE</td>
                    <td className="border border-[#ECECEC] px-4 py-3">FLUX DE TRÉSORERIE PROVENANT DES ACTIVITÉS DE FINANCEMENT</td>
                    <td className="border border-[#ECECEC] px-4 py-3"></td>
                    <td className="border border-[#ECECEC] px-4 py-3"></td>
                  </tr>
                  <tr>
                    <td className="border border-[#ECECEC] px-4 py-2"></td>
                    <td className="border border-[#ECECEC] px-4 py-2">Augmentations de capital</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right">0</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right">5 000</td>
                  </tr>
                  <tr>
                    <td className="border border-[#ECECEC] px-4 py-2"></td>
                    <td className="border border-[#ECECEC] px-4 py-2">Dividendes versés</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right text-[#6A8A82]">-3 000</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right text-[#6A8A82]">-2 500</td>
                  </tr>
                  <tr>
                    <td className="border border-[#ECECEC] px-4 py-2"></td>
                    <td className="border border-[#ECECEC] px-4 py-2">Nouveaux emprunts</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right">5 000</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right">2 000</td>
                  </tr>
                  <tr>
                    <td className="border border-[#ECECEC] px-4 py-2"></td>
                    <td className="border border-[#ECECEC] px-4 py-2">Remboursements d'emprunts</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right text-[#6A8A82]">-2 000</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right text-[#6A8A82]">-1 500</td>
                  </tr>
                  <tr>
                    <td className="border border-[#ECECEC] px-4 py-2"></td>
                    <td className="border border-[#ECECEC] px-4 py-2">Variation des dettes de crédit-bail</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right">0</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right">0</td>
                  </tr>
                  <tr className="bg-[#6A8A82]/20 font-bold">
                    <td className="border border-[#ECECEC] px-4 py-3 text-[#6A8A82]">ZF</td>
                    <td className="border border-[#ECECEC] px-4 py-3">Flux net de trésorerie provenant des activités de financement (C)</td>
                    <td className="border border-[#ECECEC] px-4 py-3 text-right text-[#6A8A82] font-bold">0</td>
                    <td className="border border-[#ECECEC] px-4 py-3 text-right font-semibold">3 000</td>
                  </tr>

                  {/* VARIATIONS DE TRÉSORERIE */}
                  <tr className="bg-[#6A8A82]/20 font-bold">
                    <td className="border border-[#ECECEC] px-4 py-3 text-[#6A8A82]">ZG</td>
                    <td className="border border-[#ECECEC] px-4 py-3">VARIATION DE TRÉSORERIE NETTE DE LA PÉRIODE (A+B+C)</td>
                    <td className="border border-[#ECECEC] px-4 py-3 text-right text-[#6A8A82] font-bold">-1 400</td>
                    <td className="border border-[#ECECEC] px-4 py-3 text-right font-semibold">11 050</td>
                  </tr>
                  <tr>
                    <td className="border border-[#ECECEC] px-4 py-2 text-[#6A8A82]">ZH</td>
                    <td className="border border-[#ECECEC] px-4 py-2">Trésorerie à l'ouverture</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right font-medium">9 400</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right text-[#6A8A82]">-1 650</td>
                  </tr>
                  <tr>
                    <td className="border border-[#ECECEC] px-4 py-2 text-[#6A8A82]">ZI</td>
                    <td className="border border-[#ECECEC] px-4 py-2">Incidence des variations de change</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right">0</td>
                    <td className="border border-[#ECECEC] px-4 py-2 text-right">0</td>
                  </tr>

                  {/* TRÉSORERIE FINALE */}
                  <tr className="bg-gray-200 font-bold text-lg">
                    <td className="border border-[#ECECEC] px-4 py-4 text-[#6A8A82]">ZJ</td>
                    <td className="border border-[#ECECEC] px-4 py-4">TRÉSORERIE À LA CLÔTURE</td>
                    <td className="border border-[#ECECEC] px-4 py-4 text-right text-[#6A8A82] font-bold text-xl">8 000</td>
                    <td className="border border-[#ECECEC] px-4 py-4 text-right font-bold">9 400</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Vue Tableau de Financement */}
      {activeSubView === 'tableau-financement' && (
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* En-tête du Tableau de Financement */}
          <div className="bg-[#F0F3F2] rounded-lg border border-[#ECECEC] p-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-[#191919]">TABLEAU DE FINANCEMENT (TAFIRE)</h2>
              <p className="text-lg text-gray-700 mt-2">ENTREPRISE XYZ SARL</p>
              <p className="text-sm text-[#191919]/70">Exercice clos le 31 décembre 2024</p>
              <p className="text-sm text-gray-700 mt-1">(Montants en milliers de FCFA)</p>
            </div>

            {/* I - DÉTERMINATION DES SOLDES FINANCIERS DE L'EXERCICE N */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-white bg-[#6A8A82] p-3 rounded-t-lg">I - DÉTERMINATION DES SOLDES FINANCIERS DE L'EXERCICE N</h3>

              {/* 1. Capacité d'Autofinancement Globale */}
              <div className="border border-[#ECECEC] border-t-0 p-4">
                <h4 className="font-semibold text-gray-700 mb-3">1 - Capacité d'Autofinancement Globale (CAFG)</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <tbody>
                      <tr>
                        <td className="py-2 text-left">EBE (Excédent brut d'exploitation)</td>
                        <td className="py-2 text-right font-medium">10 500</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-left">+ Produits encaissables (sauf cessions)</td>
                        <td className="py-2 text-right">800</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-left">- Charges décaissables</td>
                        <td className="py-2 text-right text-[#6A8A82]">-1 700</td>
                      </tr>
                      <tr className="border-t border-[#ECECEC] bg-[#6A8A82]/10">
                        <td className="py-3 text-left font-bold">= CAFG</td>
                        <td className="py-3 text-right font-bold text-[#6A8A82]">9 600</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 2. Autofinancement */}
              <div className="border border-[#ECECEC] border-t-0 p-4">
                <h4 className="font-semibold text-gray-700 mb-3">2 - Autofinancement (AF)</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <tbody>
                      <tr>
                        <td className="py-2 text-left">CAFG</td>
                        <td className="py-2 text-right">9 600</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-left">- Dividendes versés</td>
                        <td className="py-2 text-right text-[#6A8A82]">-3 000</td>
                      </tr>
                      <tr className="border-t border-[#ECECEC] bg-[#6A8A82]/10">
                        <td className="py-3 text-left font-bold">= Autofinancement</td>
                        <td className="py-3 text-right font-bold text-[#6A8A82]">6 600</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3. Variation du BFE */}
              <div className="border border-[#ECECEC] border-t-0 p-4">
                <h4 className="font-semibold text-gray-700 mb-3">3 - Variation du BFE</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <tbody>
                      <tr>
                        <td className="py-2 text-left">Variation des stocks</td>
                        <td className="py-2 text-right text-[#6A8A82]">-2 500</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-left">Variation des créances</td>
                        <td className="py-2 text-right text-[#6A8A82]">-3 500</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-left">Variation des dettes circulantes</td>
                        <td className="py-2 text-right">+2 500</td>
                      </tr>
                      <tr className="border-t border-[#ECECEC] bg-[#6A8A82]/10">
                        <td className="py-3 text-left font-bold">= Variation du BFE (besoins en moins)</td>
                        <td className="py-3 text-right font-bold text-[#6A8A82]">-3 500</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 4. Excédent de Trésorerie d'Exploitation */}
              <div className="border border-[#ECECEC] border-t-0 p-4">
                <h4 className="font-semibold text-gray-700 mb-3">4 - Excédent de Trésorerie d'Exploitation (ETE)</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <tbody>
                      <tr>
                        <td className="py-2 text-left">EBE</td>
                        <td className="py-2 text-right">10 500</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-left">- Variation BFE</td>
                        <td className="py-2 text-right text-[#6A8A82]">-3 500</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-left">- Production immobilisée</td>
                        <td className="py-2 text-right">0</td>
                      </tr>
                      <tr className="border-t border-[#ECECEC] bg-[#6A8A82]/10">
                        <td className="py-3 text-left font-bold">= ETE</td>
                        <td className="py-3 text-right font-bold text-[#6A8A82]">7 000</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* II - TABLEAU DES EMPLOIS ET RESSOURCES */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-white bg-[#6A8A82] p-3 rounded-t-lg">II - TABLEAU DES EMPLOIS ET RESSOURCES</h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4 border border-[#ECECEC] border-t-0">
                {/* EMPLOIS */}
                <div>
                  <h4 className="text-lg font-bold text-[#191919] mb-4 text-center bg-[#ECECEC] p-2 rounded">EMPLOIS</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border border-[#ECECEC]">
                      <thead className="bg-[#ECECEC]">
                        <tr>
                          <th className="border border-[#ECECEC] px-4 py-2 text-left text-xs font-semibold text-gray-700">Réf</th>
                          <th className="border border-[#ECECEC] px-4 py-2 text-left text-xs font-semibold text-gray-700">{t('accounting.label')}</th>
                          <th className="border border-[#ECECEC] px-4 py-2 text-right text-xs font-semibold text-gray-700">Montant</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="bg-[#6A8A82]/10">
                          <td className="border border-[#ECECEC] px-4 py-2 font-semibold">EA</td>
                          <td className="border border-[#ECECEC] px-4 py-2 font-semibold">EMPLOIS ÉCONOMIQUES</td>
                          <td className="border border-[#ECECEC] px-4 py-2"></td>
                        </tr>
                        <tr>
                          <td className="border border-[#ECECEC] px-4 py-2"></td>
                          <td className="border border-[#ECECEC] px-4 py-2">Investissements incorporels</td>
                          <td className="border border-[#ECECEC] px-4 py-2 text-right">1 000</td>
                        </tr>
                        <tr>
                          <td className="border border-[#ECECEC] px-4 py-2"></td>
                          <td className="border border-[#ECECEC] px-4 py-2">Investissements corporels</td>
                          <td className="border border-[#ECECEC] px-4 py-2 text-right">8 000</td>
                        </tr>
                        <tr>
                          <td className="border border-[#ECECEC] px-4 py-2"></td>
                          <td className="border border-[#ECECEC] px-4 py-2">Investissements financiers</td>
                          <td className="border border-[#ECECEC] px-4 py-2 text-right">500</td>
                        </tr>
                        <tr className="bg-[#6A8A82]/20">
                          <td className="border border-[#ECECEC] px-4 py-2"></td>
                          <td className="border border-[#ECECEC] px-4 py-2 font-semibold">Sous-total</td>
                          <td className="border border-[#ECECEC] px-4 py-2 text-right font-bold text-[#6A8A82]">9 500</td>
                        </tr>
                        <tr className="bg-[#6A8A82]/10">
                          <td className="border border-[#ECECEC] px-4 py-2 font-semibold">EB</td>
                          <td className="border border-[#ECECEC] px-4 py-2 font-semibold">EMPLOIS FINANCIERS</td>
                          <td className="border border-[#ECECEC] px-4 py-2"></td>
                        </tr>
                        <tr>
                          <td className="border border-[#ECECEC] px-4 py-2"></td>
                          <td className="border border-[#ECECEC] px-4 py-2">Remboursements d'emprunts</td>
                          <td className="border border-[#ECECEC] px-4 py-2 text-right">2 000</td>
                        </tr>
                        <tr className="bg-[#6A8A82]/10">
                          <td className="border border-[#ECECEC] px-4 py-2 font-semibold">EC</td>
                          <td className="border border-[#ECECEC] px-4 py-2 font-semibold">EMPLOIS EN HAO</td>
                          <td className="border border-[#ECECEC] px-4 py-2"></td>
                        </tr>
                        <tr>
                          <td className="border border-[#ECECEC] px-4 py-2"></td>
                          <td className="border border-[#ECECEC] px-4 py-2">Charges HAO décaissables</td>
                          <td className="border border-[#ECECEC] px-4 py-2 text-right">200</td>
                        </tr>
                        <tr className="bg-[#6A8A82]/10">
                          <td className="border border-[#ECECEC] px-4 py-2 font-semibold">ED</td>
                          <td className="border border-[#ECECEC] px-4 py-2 font-semibold">EMPLOIS TOTAUX</td>
                          <td className="border border-[#ECECEC] px-4 py-2"></td>
                        </tr>
                        <tr>
                          <td className="border border-[#ECECEC] px-4 py-2"></td>
                          <td className="border border-[#ECECEC] px-4 py-2">Dividendes versés</td>
                          <td className="border border-[#ECECEC] px-4 py-2 text-right">3 000</td>
                        </tr>
                        <tr className="bg-gray-200">
                          <td className="border border-[#ECECEC] px-4 py-3 font-bold">ET</td>
                          <td className="border border-[#ECECEC] px-4 py-3 font-bold">TOTAL EMPLOIS</td>
                          <td className="border border-[#ECECEC] px-4 py-3 text-right font-bold text-[#6A8A82]">14 700</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* RESSOURCES */}
                <div>
                  <h4 className="text-lg font-bold text-[#191919] mb-4 text-center bg-[#ECECEC] p-2 rounded">RESSOURCES</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border border-[#ECECEC]">
                      <thead className="bg-[#ECECEC]">
                        <tr>
                          <th className="border border-[#ECECEC] px-4 py-2 text-left text-xs font-semibold text-gray-700">Réf</th>
                          <th className="border border-[#ECECEC] px-4 py-2 text-left text-xs font-semibold text-gray-700">{t('accounting.label')}</th>
                          <th className="border border-[#ECECEC] px-4 py-2 text-right text-xs font-semibold text-gray-700">Montant</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="bg-[#6A8A82]/10">
                          <td className="border border-[#ECECEC] px-4 py-2 font-semibold">RA</td>
                          <td className="border border-[#ECECEC] px-4 py-2 font-semibold">RESSOURCES ÉCONOMIQUES</td>
                          <td className="border border-[#ECECEC] px-4 py-2"></td>
                        </tr>
                        <tr>
                          <td className="border border-[#ECECEC] px-4 py-2"></td>
                          <td className="border border-[#ECECEC] px-4 py-2">CAFG</td>
                          <td className="border border-[#ECECEC] px-4 py-2 text-right">9 600</td>
                        </tr>
                        <tr>
                          <td className="border border-[#ECECEC] px-4 py-2"></td>
                          <td className="border border-[#ECECEC] px-4 py-2">Cessions d'immobilisations</td>
                          <td className="border border-[#ECECEC] px-4 py-2 text-right">2 000</td>
                        </tr>
                        <tr>
                          <td className="border border-[#ECECEC] px-4 py-2"></td>
                          <td className="border border-[#ECECEC] px-4 py-2">Réductions d'immobilisations financières</td>
                          <td className="border border-[#ECECEC] px-4 py-2 text-right">0</td>
                        </tr>
                        <tr className="bg-[#6A8A82]/20">
                          <td className="border border-[#ECECEC] px-4 py-2"></td>
                          <td className="border border-[#ECECEC] px-4 py-2 font-semibold">Sous-total</td>
                          <td className="border border-[#ECECEC] px-4 py-2 text-right font-bold text-[#6A8A82]">11 600</td>
                        </tr>
                        <tr className="bg-[#6A8A82]/10">
                          <td className="border border-[#ECECEC] px-4 py-2 font-semibold">RB</td>
                          <td className="border border-[#ECECEC] px-4 py-2 font-semibold">RESSOURCES FINANCIÈRES</td>
                          <td className="border border-[#ECECEC] px-4 py-2"></td>
                        </tr>
                        <tr>
                          <td className="border border-[#ECECEC] px-4 py-2"></td>
                          <td className="border border-[#ECECEC] px-4 py-2">Augmentation de capital</td>
                          <td className="border border-[#ECECEC] px-4 py-2 text-right">0</td>
                        </tr>
                        <tr>
                          <td className="border border-[#ECECEC] px-4 py-2"></td>
                          <td className="border border-[#ECECEC] px-4 py-2">Emprunts nouveaux</td>
                          <td className="border border-[#ECECEC] px-4 py-2 text-right">5 000</td>
                        </tr>
                        <tr>
                          <td className="border border-[#ECECEC] px-4 py-2"></td>
                          <td className="border border-[#ECECEC] px-4 py-2">Subventions d'investissement</td>
                          <td className="border border-[#ECECEC] px-4 py-2 text-right">0</td>
                        </tr>
                        <tr className="bg-[#6A8A82]/20">
                          <td className="border border-[#ECECEC] px-4 py-2"></td>
                          <td className="border border-[#ECECEC] px-4 py-2 font-semibold">Sous-total</td>
                          <td className="border border-[#ECECEC] px-4 py-2 text-right font-bold text-[#6A8A82]">5 000</td>
                        </tr>
                        <tr className="bg-[#6A8A82]/10">
                          <td className="border border-[#ECECEC] px-4 py-2 font-semibold">RC</td>
                          <td className="border border-[#ECECEC] px-4 py-2 font-semibold">RESSOURCES EN HAO</td>
                          <td className="border border-[#ECECEC] px-4 py-2"></td>
                        </tr>
                        <tr>
                          <td className="border border-[#ECECEC] px-4 py-2"></td>
                          <td className="border border-[#ECECEC] px-4 py-2">Produits HAO encaissables</td>
                          <td className="border border-[#ECECEC] px-4 py-2 text-right">0</td>
                        </tr>
                        <tr className="bg-gray-200">
                          <td className="border border-[#ECECEC] px-4 py-3 font-bold">RT</td>
                          <td className="border border-[#ECECEC] px-4 py-3 font-bold">TOTAL RESSOURCES</td>
                          <td className="border border-[#ECECEC] px-4 py-3 text-right font-bold text-[#6A8A82]">16 600</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* VARIATION DU FONDS DE ROULEMENT */}
              <div className="p-4 border border-[#ECECEC] border-t-0 bg-[#6A8A82]/5">
                <h4 className="text-lg font-bold text-[#191919] mb-4 text-center">VARIATION DU FONDS DE ROULEMENT</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-[#191919]/70">Total Ressources</p>
                    <p className="text-2xl font-bold text-[#6A8A82]">16 600</p>
                  </div>
                  <div>
                    <p className="text-sm text-[#191919]/70">Total Emplois</p>
                    <p className="text-2xl font-bold text-[#6A8A82]">14 700</p>
                  </div>
                  <div className="bg-[#6A8A82]/20 p-4 rounded">
                    <p className="text-sm text-[#191919]/70">Variation FDR</p>
                    <p className="text-2xl font-bold text-[#6A8A82]">+1 900</p>
                    <p className="text-xs text-gray-700 mt-1">FDR ↑</p>
                  </div>
                </div>
              </div>
            </div>

            {/* III - VARIATION DU BESOIN DE FINANCEMENT GLOBAL ET DE LA TRÉSORERIE */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-white bg-[#6A8A82] p-3 rounded-t-lg">III - VARIATION DU BESOIN DE FINANCEMENT GLOBAL (BFG) ET DE LA TRÉSORERIE</h3>

              <div className="border border-[#ECECEC] border-t-0 p-4">
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-[#ECECEC]">
                    <thead className="bg-[#ECECEC]">
                      <tr>
                        <th className="border border-[#ECECEC] px-4 py-2 text-left text-xs font-semibold text-gray-700">ÉLÉMENTS</th>
                        <th className="border border-[#ECECEC] px-4 py-2 text-right text-xs font-semibold text-gray-700">N-1</th>
                        <th className="border border-[#ECECEC] px-4 py-2 text-right text-xs font-semibold text-gray-700">N</th>
                        <th className="border border-[#ECECEC] px-4 py-2 text-right text-xs font-semibold text-gray-700">Variation</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-[#6A8A82]/10">
                        <td className="border border-[#ECECEC] px-4 py-3 font-bold" colSpan={4}>A. VARIATION DU BFE</td>
                      </tr>
                      <tr>
                        <td className="border border-[#ECECEC] px-4 py-2">Stocks</td>
                        <td className="border border-[#ECECEC] px-4 py-2 text-right">21 000</td>
                        <td className="border border-[#ECECEC] px-4 py-2 text-right">23 500</td>
                        <td className="border border-[#ECECEC] px-4 py-2 text-right text-[#6A8A82]">-2 500</td>
                      </tr>
                      <tr>
                        <td className="border border-[#ECECEC] px-4 py-2">Créances d'exploitation</td>
                        <td className="border border-[#ECECEC] px-4 py-2 text-right">13 500</td>
                        <td className="border border-[#ECECEC] px-4 py-2 text-right">17 000</td>
                        <td className="border border-[#ECECEC] px-4 py-2 text-right text-[#6A8A82]">-3 500</td>
                      </tr>
                      <tr>
                        <td className="border border-[#ECECEC] px-4 py-2">Dettes d'exploitation</td>
                        <td className="border border-[#ECECEC] px-4 py-2 text-right">9 500</td>
                        <td className="border border-[#ECECEC] px-4 py-2 text-right">12 000</td>
                        <td className="border border-[#ECECEC] px-4 py-2 text-right">+2 500</td>
                      </tr>
                      <tr className="bg-[#6A8A82]/20">
                        <td className="border border-[#ECECEC] px-4 py-3 font-semibold">Variation BFE</td>
                        <td className="border border-[#ECECEC] px-4 py-3 text-right font-semibold">25 000</td>
                        <td className="border border-[#ECECEC] px-4 py-3 text-right font-semibold">28 500</td>
                        <td className="border border-[#ECECEC] px-4 py-3 text-right font-bold text-[#6A8A82]">-3 500</td>
                      </tr>

                      <tr className="bg-[#6A8A82]/10">
                        <td className="border border-[#ECECEC] px-4 py-3 font-bold" colSpan={4}>B. VARIATION DU BFHAO</td>
                      </tr>
                      <tr>
                        <td className="border border-[#ECECEC] px-4 py-2">Créances HAO</td>
                        <td className="border border-[#ECECEC] px-4 py-2 text-right">2 500</td>
                        <td className="border border-[#ECECEC] px-4 py-2 text-right">3 000</td>
                        <td className="border border-[#ECECEC] px-4 py-2 text-right text-[#6A8A82]">-500</td>
                      </tr>
                      <tr>
                        <td className="border border-[#ECECEC] px-4 py-2">Dettes HAO</td>
                        <td className="border border-[#ECECEC] px-4 py-2 text-right">500</td>
                        <td className="border border-[#ECECEC] px-4 py-2 text-right">500</td>
                        <td className="border border-[#ECECEC] px-4 py-2 text-right">0</td>
                      </tr>
                      <tr className="bg-[#6A8A82]/20">
                        <td className="border border-[#ECECEC] px-4 py-3 font-semibold">Variation BFHAO</td>
                        <td className="border border-[#ECECEC] px-4 py-3 text-right font-semibold">2 000</td>
                        <td className="border border-[#ECECEC] px-4 py-3 text-right font-semibold">2 500</td>
                        <td className="border border-[#ECECEC] px-4 py-3 text-right font-bold text-[#6A8A82]">-500</td>
                      </tr>

                      <tr className="bg-gray-200">
                        <td className="border border-[#ECECEC] px-4 py-3 font-bold">VARIATION BFG (A+B)</td>
                        <td className="border border-[#ECECEC] px-4 py-3 text-right font-bold">27 000</td>
                        <td className="border border-[#ECECEC] px-4 py-3 text-right font-bold">31 000</td>
                        <td className="border border-[#ECECEC] px-4 py-3 text-right font-bold text-[#6A8A82]">-4 000</td>
                      </tr>

                      <tr className="bg-[#6A8A82]/10">
                        <td className="border border-[#ECECEC] px-4 py-3 font-bold" colSpan={4}>C. VARIATION DE LA TRÉSORERIE</td>
                      </tr>
                      <tr>
                        <td className="border border-[#ECECEC] px-4 py-2">Trésorerie-Actif</td>
                        <td className="border border-[#ECECEC] px-4 py-2 text-right">9 400</td>
                        <td className="border border-[#ECECEC] px-4 py-2 text-right">8 000</td>
                        <td className="border border-[#ECECEC] px-4 py-2 text-right text-[#6A8A82]">-1 400</td>
                      </tr>
                      <tr>
                        <td className="border border-[#ECECEC] px-4 py-2">Trésorerie-Passif</td>
                        <td className="border border-[#ECECEC] px-4 py-2 text-right">0</td>
                        <td className="border border-[#ECECEC] px-4 py-2 text-right">0</td>
                        <td className="border border-[#ECECEC] px-4 py-2 text-right">0</td>
                      </tr>
                      <tr className="bg-[#6A8A82]/20">
                        <td className="border border-[#ECECEC] px-4 py-3 font-semibold">Variation Trésorerie Nette</td>
                        <td className="border border-[#ECECEC] px-4 py-3 text-right font-semibold">9 400</td>
                        <td className="border border-[#ECECEC] px-4 py-3 text-right font-semibold">8 000</td>
                        <td className="border border-[#ECECEC] px-4 py-3 text-right font-bold text-[#6A8A82]">-1 400</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* CONTRÔLE */}
                <div className="mt-6 p-4 bg-[#6A8A82]/10 rounded-lg">
                  <h4 className="text-lg font-bold text-[#191919] mb-4 text-center">CONTRÔLE : VARIATION FDR - VARIATION BFG = VARIATION TN</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-sm text-[#191919]/70">Variation du FDR</p>
                      <p className="text-xl font-bold text-[#6A8A82]">+1 900</p>
                    </div>
                    <div>
                      <p className="text-sm text-[#191919]/70">Variation du BFG</p>
                      <p className="text-xl font-bold text-[#6A8A82]">-4 000</p>
                    </div>
                    <div>
                      <p className="text-sm text-[#191919]/70">=</p>
                      <p className="text-xl font-bold text-[#191919]">=</p>
                    </div>
                    <div className="bg-[#6A8A82]/20 p-3 rounded">
                      <p className="text-sm text-[#191919]/70">Variation de la Trésorerie</p>
                      <p className="text-xl font-bold text-[#6A8A82]">-1 400 ✓</p>
                    </div>
                  </div>
                  <p className="text-center text-sm text-[#191919]/70 mt-2">+1 900 - 4 000 = -1 400</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vue CAF & Trésorerie */}
      {activeView === 'caf' && (
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* CAF */}
          <div className="bg-[#F0F3F2] rounded-lg border border-[#ECECEC] p-6">
            <h3 className="text-lg font-semibold text-[#191919] mb-4">Capacité d'Autofinancement (CAF)</h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Méthode Soustractive</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#191919]/70">EBE</span>
                    <span className="font-medium">{(sig.excedentBrutExploitation / 1000000).toFixed(1)}M</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#191919]/70">+ Autres produits encaissables</span>
                    <span className="font-medium">0.5M</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#191919]/70">- Autres charges décaissables</span>
                    <span className="font-medium text-[#6A8A82]">-0.3M</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#191919]/70">+ Produits financiers</span>
                    <span className="font-medium">0.5M</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#191919]/70">- Charges financières</span>
                    <span className="font-medium text-[#6A8A82]">-1.5M</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#191919]/70">- Impôt sur les sociétés</span>
                    <span className="font-medium text-[#6A8A82]">-4.0M</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold pt-2 border-t">
                    <span>CAF</span>
                    <span className="text-[#6A8A82]">{(sig.capaciteAutofinancement / 1000000).toFixed(1)}M FCFA</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Méthode Additive</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#191919]/70">Résultat net</span>
                    <span className="font-medium">{(compteResultat.resultatNet / 1000000).toFixed(1)}M</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#191919]/70">+ Dotations aux amortissements</span>
                    <span className="font-medium">{(compteResultat.dotationsAmortissements / 1000000).toFixed(1)}M</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#191919]/70">+ Dotations aux provisions</span>
                    <span className="font-medium">0.5M</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#191919]/70">- Reprises sur amortissements</span>
                    <span className="font-medium text-[#6A8A82]">0M</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#191919]/70">- Reprises sur provisions</span>
                    <span className="font-medium text-[#6A8A82]">-0.5M</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold pt-2 border-t">
                    <span>CAF</span>
                    <span className="text-[#6A8A82]">{(sig.capaciteAutofinancement / 1000000).toFixed(1)}M FCFA</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-[#6A8A82]/10 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#191919]/70">Taux de CAF</p>
                  <p className="text-2xl font-bold text-[#6A8A82]">
                    {((sig.capaciteAutofinancement / compteResultat.chiffreAffaires) * 100).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[#191919]/70">Autofinancement</p>
                  <p className="text-2xl font-bold text-[#6A8A82]">
                    {((sig.capaciteAutofinancement - 2000000) / 1000000).toFixed(1)}M FCFA
                  </p>
                  <p className="text-xs text-gray-700">CAF - Dividendes</p>
                </div>
              </div>
            </div>
          </div>

          {/* Flux de trésorerie prévisionnels */}
          <div className="bg-[#F0F3F2] rounded-lg border border-[#ECECEC] p-6">
            <h3 className="text-lg font-semibold text-[#191919] mb-4">Flux de Trésorerie Prévisionnels</h3>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Mois</th>
                    <th className="text-right py-2">Encaissements</th>
                    <th className="text-right py-2">Décaissements</th>
                    <th className="text-right py-2">Flux Net</th>
                    <th className="text-right py-2">Trésorerie Cumul</th>
                  </tr>
                </thead>
                <tbody>
                  {['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin'].map((mois, index) => (
                    <tr key={mois} className="border-b">
                      <td className="py-2">{mois}</td>
                      <td className="text-right">{((7000000 + index * 500000) / 1000000).toFixed(1)}M</td>
                      <td className="text-right text-[#6A8A82]">{((6500000 + index * 300000) / 1000000).toFixed(1)}M</td>
                      <td className="text-right font-medium">
                        {((500000 + index * 200000) / 1000000).toFixed(1)}M
                      </td>
                      <td className="text-right font-bold text-[#6A8A82]">
                        {((5000000 + index * 700000) / 1000000).toFixed(1)}M
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

export default FinancialStatements;